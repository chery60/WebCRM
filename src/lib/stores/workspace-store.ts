import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { db } from '@/lib/db/dexie';
import { USE_SUPABASE } from '@/lib/db/database';
import { supabaseWorkspacesRepository } from '@/lib/db/repositories/supabase/workspaces';
import type { Workspace, WorkspaceMembership, WorkspaceInvitation } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { nanoid } from 'nanoid';

interface WorkspaceStore {
    currentWorkspace: Workspace | null;
    userWorkspaces: Workspace[];
    memberships: WorkspaceMembership[];

    // Actions
    setCurrentWorkspace: (workspace: Workspace) => void;
    fetchUserWorkspaces: (userId: string) => Promise<void>;
    switchWorkspace: (workspaceId: string) => Promise<void>;
    createWorkspace: (name: string, ownerId: string, description?: string, icon?: string) => Promise<Workspace>;
    updateWorkspace: (workspaceId: string, updates: Partial<Workspace>) => Promise<void>;
    deleteWorkspace: (workspaceId: string) => Promise<void>;

    // Invitation actions
    inviteUser: (workspaceId: string, email: string, role: 'admin' | 'member' | 'viewer', invitedBy: string) => Promise<WorkspaceInvitation>;
    acceptInvitation: (token: string, userId: string) => Promise<WorkspaceMembership | null>;
    cancelInvitation: (invitationId: string) => Promise<void>;

    // Membership actions
    addMember: (workspaceId: string, userId: string, role: 'owner' | 'admin' | 'member' | 'viewer', invitedBy?: string) => Promise<WorkspaceMembership>;
    removeMember: (membershipId: string) => Promise<void>;
    updateMemberRole: (membershipId: string, role: 'admin' | 'member' | 'viewer') => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceStore>()(
    persist(
        (set, get) => ({
            currentWorkspace: null,
            userWorkspaces: [],
            memberships: [],

            setCurrentWorkspace: (workspace) => {
                set({ currentWorkspace: workspace });
            },

            fetchUserWorkspaces: async (userId: string) => {
                try {
                    if (USE_SUPABASE) {
                        // Use Supabase repository
                        const workspaces = await supabaseWorkspacesRepository.getUserWorkspaces(userId);
                        const memberships = await supabaseWorkspacesRepository.getUserMemberships(userId);

                        set({ userWorkspaces: workspaces, memberships });

                        // Set current workspace if not set
                        if (!get().currentWorkspace && workspaces.length > 0) {
                            set({ currentWorkspace: workspaces[0] });
                        }
                    } else {
                        // Use Dexie (local storage)
                        const memberships = await db.workspaceMemberships
                            .where('userId')
                            .equals(userId)
                            .and(m => m.status === 'active')
                            .toArray();

                        const workspaceIds = memberships.map(m => m.workspaceId);
                        const workspaces = await db.workspaces
                            .where('id')
                            .anyOf(workspaceIds)
                            .and(w => !w.isDeleted)
                            .toArray();

                        set({ userWorkspaces: workspaces, memberships });

                        if (!get().currentWorkspace && workspaces.length > 0) {
                            set({ currentWorkspace: workspaces[0] });
                        }
                    }
                } catch (error) {
                    console.error('Failed to fetch user workspaces:', error);
                }
            },

            switchWorkspace: async (workspaceId: string) => {
                try {
                    if (USE_SUPABASE) {
                        const workspace = await supabaseWorkspacesRepository.getById(workspaceId);
                        if (workspace && !workspace.isDeleted) {
                            set({ currentWorkspace: workspace });
                        }
                    } else {
                        const workspace = await db.workspaces.get(workspaceId);
                        if (workspace && !workspace.isDeleted) {
                            set({ currentWorkspace: workspace });
                        }
                    }
                } catch (error) {
                    console.error('Failed to switch workspace:', error);
                }
            },

            createWorkspace: async (name, ownerId, description, icon) => {
                try {
                    if (USE_SUPABASE) {
                        // Use Supabase repository
                        const workspace = await supabaseWorkspacesRepository.create(name, ownerId, description, icon);
                        if (!workspace) {
                            throw new Error('Failed to create workspace');
                        }

                        // Fetch fresh memberships
                        const memberships = await supabaseWorkspacesRepository.getUserMemberships(ownerId);

                        // Update state
                        set(state => ({
                            userWorkspaces: [...state.userWorkspaces, workspace],
                            memberships,
                            currentWorkspace: workspace,
                        }));

                        return workspace;
                    } else {
                        // Use Dexie (local storage)
                        const workspace: Workspace = {
                            id: uuidv4(),
                            name,
                            description,
                            icon,
                            ownerId,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                            isDeleted: false,
                        };

                        await db.workspaces.add(workspace);

                        // Add owner as member
                        const membership: WorkspaceMembership = {
                            id: uuidv4(),
                            workspaceId: workspace.id,
                            userId: ownerId,
                            role: 'owner',
                            joinedAt: new Date(),
                            status: 'active',
                        };
                        await db.workspaceMemberships.add(membership);

                        // Update state
                        set(state => ({
                            userWorkspaces: [...state.userWorkspaces, workspace],
                            memberships: [...state.memberships, membership],
                            currentWorkspace: workspace,
                        }));

                        return workspace;
                    }
                } catch (error) {
                    console.error('Failed to create workspace:', error);
                    throw error;
                }
            },

            updateWorkspace: async (workspaceId, updates) => {
                try {
                    if (USE_SUPABASE) {
                        await supabaseWorkspacesRepository.update(workspaceId, updates);
                    } else {
                        await db.workspaces.update(workspaceId, {
                            ...updates,
                            updatedAt: new Date(),
                        });
                    }

                    // Update state
                    set(state => ({
                        userWorkspaces: state.userWorkspaces.map(w =>
                            w.id === workspaceId ? { ...w, ...updates, updatedAt: new Date() } : w
                        ),
                        currentWorkspace: state.currentWorkspace?.id === workspaceId
                            ? { ...state.currentWorkspace, ...updates, updatedAt: new Date() }
                            : state.currentWorkspace,
                    }));
                } catch (error) {
                    console.error('Failed to update workspace:', error);
                    throw error;
                }
            },

            deleteWorkspace: async (workspaceId) => {
                try {
                    if (USE_SUPABASE) {
                        await supabaseWorkspacesRepository.delete(workspaceId);
                    } else {
                        await db.workspaces.update(workspaceId, {
                            isDeleted: true,
                            updatedAt: new Date(),
                        });
                    }

                    // Update state
                    set(state => ({
                        userWorkspaces: state.userWorkspaces.filter(w => w.id !== workspaceId),
                        currentWorkspace: state.currentWorkspace?.id === workspaceId
                            ? state.userWorkspaces.find(w => w.id !== workspaceId) || null
                            : state.currentWorkspace,
                    }));
                } catch (error) {
                    console.error('Failed to delete workspace:', error);
                    throw error;
                }
            },

            inviteUser: async (workspaceId, email, role, invitedBy) => {
                try {
                    if (USE_SUPABASE) {
                        const invitation = await supabaseWorkspacesRepository.createInvitation(workspaceId, email, role, invitedBy);
                        if (!invitation) {
                            throw new Error('Failed to create invitation');
                        }
                        return invitation;
                    } else {
                        const invitation: WorkspaceInvitation = {
                            id: uuidv4(),
                            workspaceId,
                            email,
                            token: nanoid(32),
                            invitedBy,
                            role,
                            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                            status: 'pending',
                            createdAt: new Date(),
                        };

                        await db.workspaceInvitations.add(invitation);
                        return invitation;
                    }
                } catch (error) {
                    console.error('Failed to invite user:', error);
                    throw error;
                }
            },

            acceptInvitation: async (token, userId) => {
                try {
                    if (USE_SUPABASE) {
                        const membership = await supabaseWorkspacesRepository.acceptInvitation(token, userId);
                        if (membership) {
                            await get().fetchUserWorkspaces(userId);
                        }
                        return membership;
                    } else {
                        const invitation = await db.workspaceInvitations
                            .where('token')
                            .equals(token)
                            .first();

                        if (!invitation || invitation.status !== 'pending') {
                            return null;
                        }

                        if (invitation.expiresAt < new Date()) {
                            await db.workspaceInvitations.update(invitation.id, { status: 'expired' });
                            return null;
                        }

                        const membership: WorkspaceMembership = {
                            id: uuidv4(),
                            workspaceId: invitation.workspaceId,
                            userId,
                            role: invitation.role,
                            joinedAt: new Date(),
                            invitedBy: invitation.invitedBy,
                            status: 'active',
                        };

                        await db.workspaceMemberships.add(membership);
                        await db.workspaceInvitations.update(invitation.id, { status: 'accepted' });
                        await get().fetchUserWorkspaces(userId);

                        return membership;
                    }
                } catch (error) {
                    console.error('Failed to accept invitation:', error);
                    return null;
                }
            },

            cancelInvitation: async (invitationId) => {
                try {
                    if (USE_SUPABASE) {
                        await supabaseWorkspacesRepository.cancelInvitation(invitationId);
                    } else {
                        await db.workspaceInvitations.update(invitationId, { status: 'cancelled' });
                    }
                } catch (error) {
                    console.error('Failed to cancel invitation:', error);
                    throw error;
                }
            },

            addMember: async (workspaceId, userId, role, invitedBy) => {
                try {
                    if (USE_SUPABASE) {
                        const membership = await supabaseWorkspacesRepository.addMember(workspaceId, userId, role, invitedBy);
                        if (!membership) {
                            throw new Error('Failed to add member');
                        }
                        set(state => ({
                            memberships: [...state.memberships, membership],
                        }));
                        return membership;
                    } else {
                        const membership: WorkspaceMembership = {
                            id: uuidv4(),
                            workspaceId,
                            userId,
                            role,
                            joinedAt: new Date(),
                            invitedBy,
                            status: 'active',
                        };

                        await db.workspaceMemberships.add(membership);
                        set(state => ({
                            memberships: [...state.memberships, membership],
                        }));
                        return membership;
                    }
                } catch (error) {
                    console.error('Failed to add member:', error);
                    throw error;
                }
            },

            removeMember: async (membershipId) => {
                try {
                    if (USE_SUPABASE) {
                        await supabaseWorkspacesRepository.removeMember(membershipId);
                    } else {
                        await db.workspaceMemberships.delete(membershipId);
                    }
                    set(state => ({
                        memberships: state.memberships.filter(m => m.id !== membershipId),
                    }));
                } catch (error) {
                    console.error('Failed to remove member:', error);
                    throw error;
                }
            },

            updateMemberRole: async (membershipId, role) => {
                try {
                    if (USE_SUPABASE) {
                        await supabaseWorkspacesRepository.updateMemberRole(membershipId, role);
                    } else {
                        await db.workspaceMemberships.update(membershipId, { role });
                    }
                    set(state => ({
                        memberships: state.memberships.map(m =>
                            m.id === membershipId ? { ...m, role } : m
                        ),
                    }));
                } catch (error) {
                    console.error('Failed to update member role:', error);
                    throw error;
                }
            },
        }),
        {
            name: 'workspace-storage',
            partialize: (state) => ({
                currentWorkspace: state.currentWorkspace,
            }),
        }
    )
);
