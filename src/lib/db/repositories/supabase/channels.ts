import { getSupabaseClient } from '@/lib/supabase/client';
import type { Channel, ChannelMember } from '@/types';

const supabase = getSupabaseClient();

export interface ChannelRepository {
    getAll(workspaceId: string): Promise<Channel[]>;
    getById(channelId: string): Promise<Channel | null>;
    getUserChannels(workspaceId: string, userId: string): Promise<Channel[]>;
    create(data: Omit<Channel, 'id' | 'createdAt' | 'updatedAt'>): Promise<Channel>;
    update(channelId: string, data: Partial<Channel>): Promise<void>;
    delete(channelId: string): Promise<void>;
    addMember(channelId: string, userId: string, role?: 'owner' | 'admin' | 'member'): Promise<void>;
    removeMember(channelId: string, userId: string): Promise<void>;
    getMembers(channelId: string): Promise<ChannelMember[]>;
    updateMemberRole(membershipId: string, role: 'owner' | 'admin' | 'member'): Promise<void>;
    updateLastRead(channelId: string, userId: string): Promise<void>;
}

class SupabaseChannelRepository implements ChannelRepository {
    async getAll(workspaceId: string): Promise<Channel[]> {
        const { data, error } = await supabase
            .from('channels')
            .select('*')
            .eq('workspace_id', workspaceId)
            .eq('is_deleted', false)
            .order('name');

        if (error) {
            console.error('Error fetching channels:', error);
            throw error;
        }

        return (data || []).map(this.rowToChannel);
    }

    async getById(channelId: string): Promise<Channel | null> {
        const { data, error } = await supabase
            .from('channels')
            .select('*')
            .eq('id', channelId)
            .eq('is_deleted', false)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            console.error('Error fetching channel:', error);
            throw error;
        }

        return this.rowToChannel(data);
    }

    async getUserChannels(workspaceId: string, userId: string): Promise<Channel[]> {
        try {
            const { data, error } = await supabase
                .from('channels')
                .select(`
                    *,
                    channel_members!inner(user_id)
                `)
                .eq('workspace_id', workspaceId)
                .eq('channel_members.user_id', userId)
                .eq('is_deleted', false)
                .order('name');

            if (error) {
                // Log but don't throw - table might not exist or RLS may block access
                console.warn('Could not fetch user channels:', error.message || error.code);
                return [];
            }

            return (data || []).map(this.rowToChannel);
        } catch (err) {
            // Catch any unexpected errors and return empty array
            console.warn('Unexpected error fetching channels:', err);
            return [];
        }
    }

    async create(data: Omit<Channel, 'id' | 'createdAt' | 'updatedAt'>): Promise<Channel> {
        const { data: channel, error } = await supabase
            .from('channels')
            .insert({
                workspace_id: data.workspaceId,
                name: data.name,
                description: data.description,
                is_private: data.isPrivate,
                created_by: data.createdBy,
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating channel:', error);
            throw error;
        }

        // Add creator as owner
        await this.addMember(channel.id, data.createdBy, 'owner');

        return this.rowToChannel(channel);
    }

    async update(channelId: string, data: Partial<Channel>): Promise<void> {
        const updateData: any = {};

        if (data.name !== undefined) updateData.name = data.name;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.isPrivate !== undefined) updateData.is_private = data.isPrivate;

        const { error } = await supabase
            .from('channels')
            .update(updateData)
            .eq('id', channelId);

        if (error) {
            console.error('Error updating channel:', error);
            throw error;
        }
    }

    async delete(channelId: string): Promise<void> {
        const { error } = await supabase
            .from('channels')
            .update({ is_deleted: true })
            .eq('id', channelId);

        if (error) {
            console.error('Error deleting channel:', error);
            throw error;
        }
    }

    async addMember(channelId: string, userId: string, role: 'owner' | 'admin' | 'member' = 'member'): Promise<void> {
        const { error } = await supabase
            .from('channel_members')
            .insert({
                channel_id: channelId,
                user_id: userId,
                role,
            });

        if (error) {
            console.error('Error adding channel member:', error);
            throw error;
        }
    }

    async removeMember(channelId: string, userId: string): Promise<void> {
        const { error } = await supabase
            .from('channel_members')
            .delete()
            .eq('channel_id', channelId)
            .eq('user_id', userId);

        if (error) {
            console.error('Error removing channel member:', error);
            throw error;
        }
    }

    async getMembers(channelId: string): Promise<ChannelMember[]> {
        const { data, error } = await supabase
            .from('channel_members')
            .select('*')
            .eq('channel_id', channelId);

        if (error) {
            console.error('Error fetching channel members:', error);
            throw error;
        }

        return (data || []).map(this.rowToChannelMember);
    }

    async updateMemberRole(membershipId: string, role: 'owner' | 'admin' | 'member'): Promise<void> {
        const { error } = await supabase
            .from('channel_members')
            .update({ role })
            .eq('id', membershipId);

        if (error) {
            console.error('Error updating member role:', error);
            throw error;
        }
    }

    async updateLastRead(channelId: string, userId: string): Promise<void> {
        const { error } = await supabase
            .from('channel_members')
            .update({ last_read_at: new Date().toISOString() })
            .eq('channel_id', channelId)
            .eq('user_id', userId);

        if (error) {
            console.error('Error updating last read:', error);
            throw error;
        }
    }

    private rowToChannel(row: any): Channel {
        return {
            id: row.id,
            workspaceId: row.workspace_id,
            name: row.name,
            description: row.description,
            isPrivate: row.is_private,
            createdBy: row.created_by,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
            isDeleted: row.is_deleted,
        };
    }

    private rowToChannelMember(row: any): ChannelMember {
        return {
            id: row.id,
            channelId: row.channel_id,
            userId: row.user_id,
            role: row.role,
            joinedAt: new Date(row.joined_at),
            lastReadAt: new Date(row.last_read_at),
        };
    }
}

export const supabaseChannelRepository = new SupabaseChannelRepository();
