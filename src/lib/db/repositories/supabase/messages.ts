import { getSupabaseClient } from '@/lib/supabase/client';
import type { Message, DirectMessageConversation } from '@/types';

const supabase = getSupabaseClient();

export interface MessageRepository {
    getChannelMessages(channelId: string, limit?: number): Promise<Message[]>;
    getDirectMessages(conversationId: string, limit?: number): Promise<Message[]>;
    getThreadMessages(parentMessageId: string): Promise<Message[]>;
    getById(messageId: string): Promise<Message | null>;
    create(data: Omit<Message, 'id' | 'createdAt' | 'updatedAt' | 'threadCount' | 'reactions'>): Promise<Message>;
    update(messageId: string, content: string): Promise<void>;
    delete(messageId: string): Promise<void>;
    addReaction(messageId: string, emoji: string, userId: string): Promise<void>;
    removeReaction(messageId: string, emoji: string, userId: string): Promise<void>;
}

export interface DirectMessageRepository {
    getConversations(workspaceId: string, userId: string): Promise<DirectMessageConversation[]>;
    getConversation(workspaceId: string, user1Id: string, user2Id: string): Promise<DirectMessageConversation | null>;
    createConversation(workspaceId: string, user1Id: string, user2Id: string): Promise<DirectMessageConversation>;
}

class SupabaseMessageRepository implements MessageRepository {
    async getChannelMessages(channelId: string, limit: number = 100): Promise<Message[]> {
        const { data, error } = await supabase
            .from('messages')
            .select(`
                *,
                sender:users!messages_sender_id_fkey(id, email, name, avatar)
            `)
            .eq('channel_id', channelId)
            .eq('is_deleted', false)
            .is('parent_message_id', null)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error fetching channel messages:', error?.message || error?.message || error);
            throw error;
        }

        return (data || []).reverse().map(this.rowToMessage);
    }

    async getDirectMessages(conversationId: string, limit: number = 100): Promise<Message[]> {
        // First get the conversation to find user IDs
        const { data: conversation, error: convError } = await supabase
            .from('direct_message_conversations')
            .select('*')
            .eq('id', conversationId)
            .single();

        if (convError) {
            console.error('Error fetching conversation:', convError?.message || convError?.message || convError);
            throw convError;
        }

        const { data, error } = await supabase
            .from('messages')
            .select(`
                *,
                sender:users!messages_sender_id_fkey(id, email, name, avatar)
            `)
            .eq('workspace_id', conversation.workspace_id)
            .is('channel_id', null)
            .or(`and(sender_id.eq.${conversation.user1_id},receiver_id.eq.${conversation.user2_id}),and(sender_id.eq.${conversation.user2_id},receiver_id.eq.${conversation.user1_id})`)
            .eq('is_deleted', false)
            .is('parent_message_id', null)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error fetching direct messages:', error?.message || error?.message || error);
            throw error;
        }

        return (data || []).reverse().map(this.rowToMessage);
    }

    async getThreadMessages(parentMessageId: string): Promise<Message[]> {
        const { data, error } = await supabase
            .from('messages')
            .select(`
                *,
                sender:users!messages_sender_id_fkey(id, email, name, avatar)
            `)
            .eq('parent_message_id', parentMessageId)
            .eq('is_deleted', false)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching thread messages:', error?.message || error?.message || error);
            throw error;
        }

        return (data || []).map(this.rowToMessage);
    }

    async getById(messageId: string): Promise<Message | null> {
        const { data, error } = await supabase
            .from('messages')
            .select(`
                *,
                sender:users!messages_sender_id_fkey(id, email, name, avatar)
            `)
            .eq('id', messageId)
            .eq('is_deleted', false)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            console.error('Error fetching message:', error?.message || error?.message || error);
            throw error;
        }

        return this.rowToMessage(data);
    }

    async create(data: Omit<Message, 'id' | 'createdAt' | 'updatedAt' | 'threadCount' | 'reactions'>): Promise<Message> {
        const { data: message, error } = await supabase
            .from('messages')
            .insert({
                workspace_id: data.workspaceId,
                channel_id: data.channelId,
                sender_id: data.senderId,
                receiver_id: data.receiverId,
                content: data.content,
                parent_message_id: data.parentMessageId,
                attachments: data.attachments || [],
            })
            .select(`
                *,
                sender:users!messages_sender_id_fkey(id, email, name, avatar)
            `)
            .single();

        if (error) {
            console.error('Error creating message:', error?.message || error?.message || error);
            throw error;
        }

        return this.rowToMessage(message);
    }

    async update(messageId: string, content: string): Promise<void> {
        const { error } = await supabase
            .from('messages')
            .update({
                content,
                is_edited: true,
                edited_at: new Date().toISOString()
            })
            .eq('id', messageId);

        if (error) {
            console.error('Error updating message:', error?.message || error?.message || error);
            throw error;
        }
    }

    async delete(messageId: string): Promise<void> {
        const { error } = await supabase
            .from('messages')
            .update({ is_deleted: true })
            .eq('id', messageId);

        if (error) {
            console.error('Error deleting message:', error?.message || error?.message || error);
            throw error;
        }
    }

    async addReaction(messageId: string, emoji: string, userId: string): Promise<void> {
        // Get current reactions
        const { data: message, error: fetchError } = await supabase
            .from('messages')
            .select('reactions')
            .eq('id', messageId)
            .single();

        if (fetchError) {
            console.error('Error fetching message reactions:', fetchError?.message || fetchError?.message || fetchError);
            throw fetchError;
        }

        const reactions = (message.reactions || []) as any[];
        const existingReaction = reactions.find((r: any) => r.emoji === emoji);

        if (existingReaction) {
            if (!existingReaction.userIds.includes(userId)) {
                existingReaction.userIds.push(userId);
                existingReaction.count = existingReaction.userIds.length;
            }
        } else {
            reactions.push({
                emoji,
                userIds: [userId],
                count: 1,
            });
        }

        const { error } = await supabase
            .from('messages')
            .update({ reactions })
            .eq('id', messageId);

        if (error) {
            console.error('Error adding reaction:', error?.message || error?.message || error);
            throw error;
        }
    }

    async removeReaction(messageId: string, emoji: string, userId: string): Promise<void> {
        // Get current reactions
        const { data: message, error: fetchError } = await supabase
            .from('messages')
            .select('reactions')
            .eq('id', messageId)
            .single();

        if (fetchError) {
            console.error('Error fetching message reactions:', fetchError?.message || fetchError?.message || fetchError);
            throw fetchError;
        }

        let reactions = (message.reactions || []) as any[];
        const existingReaction = reactions.find((r: any) => r.emoji === emoji);

        if (existingReaction) {
            existingReaction.userIds = existingReaction.userIds.filter((id: string) => id !== userId);
            existingReaction.count = existingReaction.userIds.length;

            if (existingReaction.count === 0) {
                reactions = reactions.filter((r: any) => r.emoji !== emoji);
            }
        }

        const { error } = await supabase
            .from('messages')
            .update({ reactions })
            .eq('id', messageId);

        if (error) {
            console.error('Error removing reaction:', error?.message || error?.message || error);
            throw error;
        }
    }

    private rowToMessage(row: any): Message {
        return {
            id: row.id,
            workspaceId: row.workspace_id,
            channelId: row.channel_id,
            senderId: row.sender_id,
            receiverId: row.receiver_id,
            content: row.content,
            parentMessageId: row.parent_message_id,
            threadCount: row.thread_count || 0,
            attachments: row.attachments || [],
            reactions: row.reactions || [],
            isEdited: row.is_edited,
            editedAt: row.edited_at ? new Date(row.edited_at) : undefined,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
            isDeleted: row.is_deleted,
            sender: row.sender ? {
                id: row.sender.id,
                email: row.sender.email,
                name: row.sender.name || row.sender.email,
                avatar: row.sender.avatar,
                role: row.sender.role || 'member',
            } : undefined,
        };
    }
}

class SupabaseDirectMessageRepository implements DirectMessageRepository {
    async getConversations(workspaceId: string, userId: string): Promise<DirectMessageConversation[]> {
        const { data, error } = await supabase
            .from('direct_message_conversations')
            .select('*')
            .eq('workspace_id', workspaceId)
            .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
            .order('last_message_at', { ascending: false, nullsFirst: false });

        if (error) {
            console.error('Error fetching DM conversations:', error?.message || error?.message || error);
            throw error;
        }

        return (data || []).map(this.rowToConversation);
    }

    async getConversation(workspaceId: string, user1Id: string, user2Id: string): Promise<DirectMessageConversation | null> {
        // Ensure user1Id < user2Id for consistency
        const [sortedUser1, sortedUser2] = [user1Id, user2Id].sort();

        const { data, error } = await supabase
            .from('direct_message_conversations')
            .select('*')
            .eq('workspace_id', workspaceId)
            .eq('user1_id', sortedUser1)
            .eq('user2_id', sortedUser2)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            console.error('Error fetching conversation:', error?.message || error?.message || error);
            throw error;
        }

        return this.rowToConversation(data);
    }

    async createConversation(workspaceId: string, user1Id: string, user2Id: string): Promise<DirectMessageConversation> {
        // Ensure user1Id < user2Id for consistency
        const [sortedUser1, sortedUser2] = [user1Id, user2Id].sort();

        const { data, error } = await supabase
            .from('direct_message_conversations')
            .insert({
                workspace_id: workspaceId,
                user1_id: sortedUser1,
                user2_id: sortedUser2,
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating conversation:', error?.message || error?.message || error);
            throw error;
        }

        return this.rowToConversation(data);
    }

    private rowToConversation(row: any): DirectMessageConversation {
        return {
            id: row.id,
            workspaceId: row.workspace_id,
            user1Id: row.user1_id,
            user2Id: row.user2_id,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
            lastMessageAt: row.last_message_at ? new Date(row.last_message_at) : undefined,
        };
    }
}

export const supabaseMessageRepository = new SupabaseMessageRepository();
export const supabaseDirectMessageRepository = new SupabaseDirectMessageRepository();
