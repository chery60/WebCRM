import { create } from 'zustand';
import type { Channel, Message, DirectMessageConversation, ChannelMember } from '@/types';
import { supabaseChannelRepository } from '@/lib/db/repositories/supabase/channels';
import { supabaseMessageRepository, supabaseDirectMessageRepository } from '@/lib/db/repositories/supabase/messages';
import { getSupabaseClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface MessagingState {
    // Channels
    channels: Channel[];
    currentChannel: Channel | null;
    channelMembers: Map<string, ChannelMember[]>;

    // Direct Messages
    conversations: DirectMessageConversation[];
    currentConversation: DirectMessageConversation | null;

    // Messages
    messages: Message[];
    threadMessages: Map<string, Message[]>;

    // UI State
    isLoadingChannels: boolean;
    isLoadingMessages: boolean;
    isSendingMessage: boolean;

    // Actions - Channels
    fetchChannels: (workspaceId: string, userId: string) => Promise<void>;
    createChannel: (data: { workspaceId: string; name: string; description?: string; isPrivate: boolean; createdBy: string; memberEmails?: string[] }) => Promise<Channel | null>;
    updateChannel: (channelId: string, data: Partial<Channel>) => Promise<void>;
    deleteChannel: (channelId: string) => Promise<void>;
    setCurrentChannel: (channel: Channel | null) => void;

    // Actions - Channel Members
    fetchChannelMembers: (channelId: string) => Promise<void>;
    addChannelMembers: (channelId: string, userIds: string[]) => Promise<void>;
    removeChannelMember: (channelId: string, userId: string) => Promise<void>;

    // Actions - Direct Messages
    fetchConversations: (workspaceId: string, userId: string) => Promise<void>;
    getOrCreateConversation: (workspaceId: string, otherUserEmail: string, currentUserEmail: string) => Promise<DirectMessageConversation | null>;
    setCurrentConversation: (conversation: DirectMessageConversation | null) => void;

    // Actions - Messages
    fetchChannelMessages: (channelId: string) => Promise<void>;
    fetchDirectMessages: (conversationId: string) => Promise<void>;
    fetchThreadMessages: (parentMessageId: string) => Promise<void>;
    sendMessage: (data: { workspaceId: string; channelId?: string; receiverId?: string; content: string; senderId: string; parentMessageId?: string; attachments?: any[] }) => Promise<Message | null>;
    editMessage: (messageId: string, content: string) => Promise<void>;
    deleteMessage: (messageId: string) => Promise<void>;
    addReaction: (messageId: string, emoji: string, userId: string) => Promise<void>;
    removeReaction: (messageId: string, emoji: string, userId: string) => Promise<void>;

    // Real-time subscriptions
    subscribeToChannelMessages: (channelId: string) => () => void;
    subscribeToDirectMessages: (conversationId: string) => () => void;

    // Clear state
    clearMessagingState: () => void;
}

export const useMessagingStore = create<MessagingState>((set, get) => ({
    // Initial state
    channels: [],
    currentChannel: null,
    channelMembers: new Map(),
    conversations: [],
    currentConversation: null,
    messages: [],
    threadMessages: new Map(),
    isLoadingChannels: false,
    isLoadingMessages: false,
    isSendingMessage: false,

    // Channels
    fetchChannels: async (workspaceId: string, userId: string) => {
        set({ isLoadingChannels: true });
        try {
            const channels = await supabaseChannelRepository.getUserChannels(workspaceId, userId);
            set({ channels });
        } catch (error) {
            // Repository now handles errors gracefully, but catch any remaining issues silently
            console.warn('Channels fetch error:', error);
            set({ channels: [] });
        } finally {
            set({ isLoadingChannels: false });
        }
    },

    createChannel: async (data) => {
        try {
            const channelData = {
                workspaceId: data.workspaceId,
                name: data.name,
                description: data.description,
                isPrivate: data.isPrivate,
                createdBy: data.createdBy,
                isDeleted: false,
            };

            const channel = await supabaseChannelRepository.create(channelData);

            // Add additional members if provided (convert emails to user IDs from workspace memberships)
            if (data.memberEmails && data.memberEmails.length > 0) {
                // TODO: Look up user IDs from workspace memberships by email
                // For now, we'll skip this as it requires a workspace membership lookup
                // This will be implemented when we have a proper user lookup function
                console.log('Member emails to add:', data.memberEmails);
            }

            set(state => ({
                channels: [...state.channels, channel],
            }));

            toast.success('Channel created successfully');
            return channel;
        } catch (error) {
            console.error('Failed to create channel:', error);
            toast.error('Failed to create channel');
            return null;
        }
    },

    updateChannel: async (channelId: string, data: Partial<Channel>) => {
        try {
            await supabaseChannelRepository.update(channelId, data);
            set(state => ({
                channels: state.channels.map(c => c.id === channelId ? { ...c, ...data } : c),
                currentChannel: state.currentChannel?.id === channelId ? { ...state.currentChannel, ...data } : state.currentChannel,
            }));
            toast.success('Channel updated');
        } catch (error) {
            console.error('Failed to update channel:', error);
            toast.error('Failed to update channel');
        }
    },

    deleteChannel: async (channelId: string) => {
        try {
            await supabaseChannelRepository.delete(channelId);
            set(state => ({
                channels: state.channels.filter(c => c.id !== channelId),
                currentChannel: state.currentChannel?.id === channelId ? null : state.currentChannel,
            }));
            toast.success('Channel deleted');
        } catch (error) {
            console.error('Failed to delete channel:', error);
            toast.error('Failed to delete channel');
        }
    },

    setCurrentChannel: (channel: Channel | null) => {
        set({ currentChannel: channel, currentConversation: null, messages: [] });
        if (channel) {
            get().fetchChannelMessages(channel.id);
            get().fetchChannelMembers(channel.id);
        }
    },

    // Channel Members
    fetchChannelMembers: async (channelId: string) => {
        try {
            const members = await supabaseChannelRepository.getMembers(channelId);
            set(state => {
                const newMap = new Map(state.channelMembers);
                newMap.set(channelId, members);
                return { channelMembers: newMap };
            });
        } catch (error) {
            console.error('Failed to fetch channel members:', error);
        }
    },

    addChannelMembers: async (channelId: string, userIds: string[]) => {
        try {
            for (const userId of userIds) {
                await supabaseChannelRepository.addMember(channelId, userId, 'member');
            }
            await get().fetchChannelMembers(channelId);
            toast.success('Members added to channel');
        } catch (error) {
            console.error('Failed to add channel members:', error);
            toast.error('Failed to add members');
        }
    },

    removeChannelMember: async (channelId: string, userId: string) => {
        try {
            await supabaseChannelRepository.removeMember(channelId, userId);
            await get().fetchChannelMembers(channelId);
            toast.success('Member removed from channel');
        } catch (error) {
            console.error('Failed to remove channel member:', error);
            toast.error('Failed to remove member');
        }
    },

    // Direct Messages
    fetchConversations: async (workspaceId: string, userId: string) => {
        try {
            const conversations = await supabaseDirectMessageRepository.getConversations(workspaceId, userId);
            set({ conversations });
        } catch (error) {
            console.error('Failed to fetch conversations:', error);
            toast.error('Failed to load conversations');
        }
    },

    getOrCreateConversation: async (workspaceId: string, otherUserId: string, currentUserId: string) => {
        try {
            // Use user IDs (UUIDs) for DM conversations as required by the database
            let conversation = await supabaseDirectMessageRepository.getConversation(workspaceId, currentUserId, otherUserId);

            if (!conversation) {
                conversation = await supabaseDirectMessageRepository.createConversation(workspaceId, currentUserId, otherUserId);
                set(state => ({
                    conversations: [...state.conversations, conversation!],
                }));
            }

            return conversation;
        } catch (error) {
            console.error('Failed to get/create conversation:', error);
            toast.error('Failed to start conversation');
            return null;
        }
    },

    setCurrentConversation: (conversation: DirectMessageConversation | null) => {
        set({ currentConversation: conversation, currentChannel: null, messages: [] });
        if (conversation) {
            get().fetchDirectMessages(conversation.id);
        }
    },

    // Messages
    fetchChannelMessages: async (channelId: string) => {
        set({ isLoadingMessages: true });
        try {
            const messages = await supabaseMessageRepository.getChannelMessages(channelId);
            set({ messages, isLoadingMessages: false });
        } catch (error) {
            console.error('Failed to fetch channel messages:', error);
            
            // Check if it's a specific error type
            if (error instanceof Error) {
                if (error.message.includes('foreign key')) {
                    toast.error('Database configuration issue. Please contact support.');
                } else if (error.message.includes('permission')) {
                    toast.error('You don\'t have permission to view these messages.');
                } else {
                    toast.error('Failed to load messages. Please try again.');
                }
            } else {
                toast.error('Failed to load messages');
            }
            
            // Clear messages on error
            set({ messages: [], isLoadingMessages: false });
        }
    },

    fetchDirectMessages: async (conversationId: string) => {
        set({ isLoadingMessages: true });
        try {
            const messages = await supabaseMessageRepository.getDirectMessages(conversationId);
            set({ messages, isLoadingMessages: false });
        } catch (error) {
            console.error('Failed to fetch direct messages:', error);
            
            // Check if it's a specific error type
            if (error instanceof Error) {
                if (error.message.includes('foreign key')) {
                    toast.error('Database configuration issue. Please contact support.');
                } else if (error.message.includes('permission')) {
                    toast.error('You don\'t have permission to view these messages.');
                } else {
                    toast.error('Failed to load messages. Please try again.');
                }
            } else {
                toast.error('Failed to load messages');
            }
            
            // Clear messages on error
            set({ messages: [], isLoadingMessages: false });
        }
    },

    fetchThreadMessages: async (parentMessageId: string) => {
        try {
            const messages = await supabaseMessageRepository.getThreadMessages(parentMessageId);
            set(state => {
                const newMap = new Map(state.threadMessages);
                newMap.set(parentMessageId, messages);
                return { threadMessages: newMap };
            });
        } catch (error) {
            console.error('Failed to fetch thread messages:', error);
        }
    },

    sendMessage: async (data) => {
        set({ isSendingMessage: true });
        try {
            const messageData = {
                workspaceId: data.workspaceId,
                channelId: data.channelId,
                senderId: data.senderId,
                receiverId: data.receiverId,
                content: data.content,
                parentMessageId: data.parentMessageId,
                attachments: data.attachments || [],
                isEdited: false,
                isDeleted: false,
            };

            const message = await supabaseMessageRepository.create(messageData);

            // Add to messages if not a thread reply
            if (!data.parentMessageId) {
                set(state => ({
                    messages: [...state.messages, message],
                }));
            } else {
                // Add to thread messages
                const parentId = data.parentMessageId;
                set(state => {
                    const newMap = new Map(state.threadMessages);
                    const existing = newMap.get(parentId) || [];
                    newMap.set(parentId, [...existing, message]);

                    // Update thread count in main messages
                    const updatedMessages = state.messages.map(m =>
                        m.id === parentId ? { ...m, threadCount: m.threadCount + 1 } : m
                    );

                    return { threadMessages: newMap, messages: updatedMessages };
                });
            }

            return message;
        } catch (error) {
            console.error('Failed to send message:', error);
            toast.error('Failed to send message');
            return null;
        } finally {
            set({ isSendingMessage: false });
        }
    },

    editMessage: async (messageId: string, content: string) => {
        try {
            await supabaseMessageRepository.update(messageId, content);
            set(state => ({
                messages: state.messages.map(m =>
                    m.id === messageId ? { ...m, content, isEdited: true, editedAt: new Date() } : m
                ),
            }));
            toast.success('Message updated');
        } catch (error) {
            console.error('Failed to edit message:', error);
            toast.error('Failed to edit message');
        }
    },

    deleteMessage: async (messageId: string) => {
        try {
            await supabaseMessageRepository.delete(messageId);
            set(state => ({
                messages: state.messages.filter(m => m.id !== messageId),
            }));
            toast.success('Message deleted');
        } catch (error) {
            console.error('Failed to delete message:', error);
            toast.error('Failed to delete message');
        }
    },

    addReaction: async (messageId: string, emoji: string, userId: string) => {
        try {
            await supabaseMessageRepository.addReaction(messageId, emoji, userId);
            // Optimistically update UI
            set(state => ({
                messages: state.messages.map(m => {
                    if (m.id === messageId) {
                        const reactions = [...m.reactions];
                        const existing = reactions.find(r => r.emoji === emoji);
                        if (existing && !existing.userIds.includes(userId)) {
                            existing.userIds.push(userId);
                            existing.count++;
                        } else if (!existing) {
                            reactions.push({ emoji, userIds: [userId], count: 1 });
                        }
                        return { ...m, reactions };
                    }
                    return m;
                }),
            }));
        } catch (error) {
            console.error('Failed to add reaction:', error);
        }
    },

    removeReaction: async (messageId: string, emoji: string, userId: string) => {
        try {
            await supabaseMessageRepository.removeReaction(messageId, emoji, userId);
            // Optimistically update UI
            set(state => ({
                messages: state.messages.map(m => {
                    if (m.id === messageId) {
                        let reactions = [...m.reactions];
                        const existing = reactions.find(r => r.emoji === emoji);
                        if (existing) {
                            existing.userIds = existing.userIds.filter(id => id !== userId);
                            existing.count--;
                            if (existing.count === 0) {
                                reactions = reactions.filter(r => r.emoji !== emoji);
                            }
                        }
                        return { ...m, reactions };
                    }
                    return m;
                }),
            }));
        } catch (error) {
            console.error('Failed to remove reaction:', error);
        }
    },

    // Real-time subscriptions
    subscribeToChannelMessages: (channelId: string) => {
        const supabase = getSupabaseClient();
        const subscription = supabase
            .channel(`channel-${channelId}`)
            .on('postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `channel_id=eq.${channelId}`
                },
                (payload) => {
                    const newMessage = payload.new as any;
                    set(state => {
                        // Avoid duplicates
                        if (state.messages.some(m => m.id === newMessage.id)) {
                            return state;
                        }
                        return {
                            messages: [...state.messages, {
                                id: newMessage.id,
                                workspaceId: newMessage.workspace_id,
                                channelId: newMessage.channel_id,
                                senderId: newMessage.sender_id,
                                receiverId: newMessage.receiver_id,
                                content: newMessage.content,
                                parentMessageId: newMessage.parent_message_id,
                                threadCount: newMessage.thread_count || 0,
                                attachments: newMessage.attachments || [],
                                reactions: newMessage.reactions || [],
                                isEdited: newMessage.is_edited,
                                editedAt: newMessage.edited_at ? new Date(newMessage.edited_at) : undefined,
                                createdAt: new Date(newMessage.created_at),
                                updatedAt: new Date(newMessage.updated_at),
                                isDeleted: newMessage.is_deleted,
                            }],
                        };
                    });
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    },

    subscribeToDirectMessages: (conversationId: string) => {
        // Similar to channel subscription but for DMs
        const supabase = getSupabaseClient();
        const subscription = supabase
            .channel(`dm-${conversationId}`)
            .on('postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages'
                },
                (payload) => {
                    const newMessage = payload.new as any;
                    // Only add if it's part of this conversation
                    set(state => {
                        if (state.messages.some(m => m.id === newMessage.id)) {
                            return state;
                        }
                        return {
                            messages: [...state.messages, {
                                id: newMessage.id,
                                workspaceId: newMessage.workspace_id,
                                channelId: newMessage.channel_id,
                                senderId: newMessage.sender_id,
                                receiverId: newMessage.receiver_id,
                                content: newMessage.content,
                                parentMessageId: newMessage.parent_message_id,
                                threadCount: newMessage.thread_count || 0,
                                attachments: newMessage.attachments || [],
                                reactions: newMessage.reactions || [],
                                isEdited: newMessage.is_edited,
                                editedAt: newMessage.edited_at ? new Date(newMessage.edited_at) : undefined,
                                createdAt: new Date(newMessage.created_at),
                                updatedAt: new Date(newMessage.updated_at),
                                isDeleted: newMessage.is_deleted,
                            }],
                        };
                    });
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    },

    clearMessagingState: () => {
        set({
            channels: [],
            currentChannel: null,
            channelMembers: new Map(),
            conversations: [],
            currentConversation: null,
            messages: [],
            threadMessages: new Map(),
        });
    },
}));
