'use client';

import { getSupabaseClient } from '@/lib/supabase/client';
import type { Workspace, WorkspaceMembership, WorkspaceInvitation } from '@/types';
import { nanoid } from 'nanoid';

// Helper to convert database row to Workspace type
function rowToWorkspace(row: any): Workspace {
    return {
        id: row.id,
        name: row.name,
        description: row.description || undefined,
        icon: row.icon || undefined,
        ownerId: row.owner_id,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        isDeleted: row.is_deleted || false,
    };
}

// Helper to convert database row to WorkspaceMembership type
function rowToMembership(row: any): WorkspaceMembership {
    return {
        id: row.id,
        workspaceId: row.workspace_id,
        userId: row.user_id,
        role: row.role,
        joinedAt: new Date(row.joined_at),
        invitedBy: row.invited_by || undefined,
        status: row.status,
    };
}

// Helper to convert database row to WorkspaceInvitation type
function rowToInvitation(row: any): WorkspaceInvitation {
    return {
        id: row.id,
        workspaceId: row.workspace_id,
        email: row.email,
        token: row.token,
        invitedBy: row.invited_by,
        role: row.role,
        expiresAt: new Date(row.expires_at),
        status: row.status,
        createdAt: new Date(row.created_at),
    };
}

export const supabaseWorkspacesRepository = {
    // Get all workspaces for a user
    async getUserWorkspaces(userId: string): Promise<Workspace[]> {
        const supabase = getSupabaseClient();
        if (!supabase) return [];

        // Get workspace IDs from memberships
        const { data: memberships, error: membershipError } = await supabase
            .from('workspace_memberships')
            .select('workspace_id')
            .eq('user_id', userId)
            .eq('status', 'active');

        if (membershipError || !memberships?.length) {
            console.error('Error fetching workspace memberships:', membershipError);
            return [];
        }

        const workspaceIds = memberships.map(m => m.workspace_id);

        // Get workspaces
        const { data: workspaces, error } = await supabase
            .from('workspaces')
            .select('*')
            .in('id', workspaceIds)
            .eq('is_deleted', false);

        if (error) {
            console.error('Error fetching workspaces:', error);
            return [];
        }

        return (workspaces || []).map(rowToWorkspace);
    },

    // Get a single workspace by ID
    async getById(id: string): Promise<Workspace | undefined> {
        const supabase = getSupabaseClient();
        if (!supabase) return undefined;

        const { data, error } = await supabase
            .from('workspaces')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !data) {
            console.error('Error fetching workspace:', error);
            return undefined;
        }

        return rowToWorkspace(data);
    },

    // Create a new workspace
    async create(
        name: string,
        ownerId: string,
        description?: string,
        icon?: string
    ): Promise<Workspace | null> {
        const supabase = getSupabaseClient();
        if (!supabase) return null;

        const workspaceData = {
            name,
            description: description || null,
            icon: icon || null,
            owner_id: ownerId,
            is_deleted: false,
        };

        const { data: workspace, error } = await supabase
            .from('workspaces')
            .insert(workspaceData)
            .select()
            .single();

        if (error || !workspace) {
            console.error('Error creating workspace:', {
                message: error?.message,
                code: error?.code,
                details: error?.details,
            });
            throw new Error(error?.message || 'Failed to create workspace');
        }

        // Add owner as a member with 'owner' role
        const membershipData = {
            workspace_id: workspace.id,
            user_id: ownerId,
            role: 'owner',
            joined_at: new Date().toISOString(),
            status: 'active',
        };

        const { error: membershipError } = await supabase
            .from('workspace_memberships')
            .insert(membershipData);

        if (membershipError) {
            console.error('Error creating workspace membership:', {
                message: membershipError?.message,
                code: membershipError?.code,
                details: membershipError?.details,
            });
            // Don't throw here, workspace was created successfully
        }

        return rowToWorkspace(workspace);
    },

    // Update a workspace
    async update(id: string, updates: Partial<Workspace>): Promise<Workspace | undefined> {
        const supabase = getSupabaseClient();
        if (!supabase) return undefined;

        const updateData: Record<string, any> = {};
        if (updates.name !== undefined) updateData.name = updates.name;
        if (updates.description !== undefined) updateData.description = updates.description;
        if (updates.icon !== undefined) updateData.icon = updates.icon;

        const { data, error } = await supabase
            .from('workspaces')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error || !data) {
            console.error('Error updating workspace:', error);
            return undefined;
        }

        return rowToWorkspace(data);
    },

    // Soft delete a workspace
    async delete(id: string): Promise<void> {
        const supabase = getSupabaseClient();
        if (!supabase) return;

        const { error } = await supabase
            .from('workspaces')
            .update({ is_deleted: true })
            .eq('id', id);

        if (error) {
            console.error('Error deleting workspace:', error);
        }
    },

    // Get user memberships
    async getUserMemberships(userId: string): Promise<WorkspaceMembership[]> {
        const supabase = getSupabaseClient();
        if (!supabase) return [];

        const { data, error } = await supabase
            .from('workspace_memberships')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'active');

        if (error) {
            console.error('Error fetching memberships:', error);
            return [];
        }

        return (data || []).map(rowToMembership);
    },

    // Add a member to workspace
    async addMember(
        workspaceId: string,
        userId: string,
        role: 'owner' | 'admin' | 'member' | 'viewer',
        invitedBy?: string
    ): Promise<WorkspaceMembership | null> {
        const supabase = getSupabaseClient();
        if (!supabase) return null;

        const membershipData = {
            workspace_id: workspaceId,
            user_id: userId,
            role,
            joined_at: new Date().toISOString(),
            invited_by: invitedBy || null,
            status: 'active',
        };

        const { data, error } = await supabase
            .from('workspace_memberships')
            .insert(membershipData)
            .select()
            .single();

        if (error || !data) {
            console.error('Error adding member:', {
                message: error?.message,
                code: error?.code,
            });
            return null;
        }

        return rowToMembership(data);
    },

    // Remove a member
    async removeMember(membershipId: string): Promise<void> {
        const supabase = getSupabaseClient();
        if (!supabase) return;

        const { error } = await supabase
            .from('workspace_memberships')
            .delete()
            .eq('id', membershipId);

        if (error) {
            console.error('Error removing member:', error);
        }
    },

    // Update member role
    async updateMemberRole(
        membershipId: string,
        role: 'admin' | 'member' | 'viewer'
    ): Promise<void> {
        const supabase = getSupabaseClient();
        if (!supabase) return;

        const { error } = await supabase
            .from('workspace_memberships')
            .update({ role })
            .eq('id', membershipId);

        if (error) {
            console.error('Error updating member role:', error);
        }
    },

    // Create invitation
    async createInvitation(
        workspaceId: string,
        email: string,
        role: 'admin' | 'member' | 'viewer',
        invitedBy: string
    ): Promise<WorkspaceInvitation | null> {
        const supabase = getSupabaseClient();
        if (!supabase) return null;

        const invitationData = {
            workspace_id: workspaceId,
            email,
            token: nanoid(32),
            invited_by: invitedBy,
            role,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
            status: 'pending',
        };

        const { data, error } = await supabase
            .from('workspace_invitations')
            .insert(invitationData)
            .select()
            .single();

        if (error || !data) {
            console.error('Error creating invitation:', error);
            return null;
        }

        return rowToInvitation(data);
    },

    // Accept invitation
    async acceptInvitation(token: string, userId: string): Promise<WorkspaceMembership | null> {
        const supabase = getSupabaseClient();
        if (!supabase) return null;

        // Get invitation by token
        const { data: invitation, error: invError } = await supabase
            .from('workspace_invitations')
            .select('*')
            .eq('token', token)
            .eq('status', 'pending')
            .single();

        if (invError || !invitation) {
            console.error('Error finding invitation:', invError);
            return null;
        }

        // Check expiration
        if (new Date(invitation.expires_at) < new Date()) {
            await supabase
                .from('workspace_invitations')
                .update({ status: 'expired' })
                .eq('id', invitation.id);
            return null;
        }

        // Create membership
        const membership = await this.addMember(
            invitation.workspace_id,
            userId,
            invitation.role,
            invitation.invited_by
        );

        if (!membership) return null;

        // Update invitation status
        await supabase
            .from('workspace_invitations')
            .update({ status: 'accepted' })
            .eq('id', invitation.id);

        return membership;
    },

    // Cancel invitation
    async cancelInvitation(invitationId: string): Promise<void> {
        const supabase = getSupabaseClient();
        if (!supabase) return;

        const { error } = await supabase
            .from('workspace_invitations')
            .update({ status: 'cancelled' })
            .eq('id', invitationId);

        if (error) {
            console.error('Error cancelling invitation:', error);
        }
    },
};
