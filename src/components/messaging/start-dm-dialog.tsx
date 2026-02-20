'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMessagingStore } from '@/lib/stores/messaging-store';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { getSupabaseClient } from '@/lib/supabase/client';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface WorkspaceMember {
    id: string;
    name: string;
    email: string;
    avatar?: string;
}

interface StartDMDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function StartDMDialog({ open, onOpenChange }: StartDMDialogProps) {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [members, setMembers] = useState<WorkspaceMember[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    const { getOrCreateConversation, setCurrentConversation } = useMessagingStore();
    const { currentWorkspace } = useWorkspaceStore();
    const { currentUser } = useAuthStore();

    // Fetch workspace members (actual registered users) when dialog opens
    useEffect(() => {
        if (!open || !currentWorkspace) return;

        const fetchMembers = async () => {
            setIsLoading(true);
            try {
                const supabase = getSupabaseClient();
                if (!supabase) return;

                // Get workspace members with their user info
                // This fetches users who have actually joined the workspace
                const { data, error } = await supabase
                    .from('workspace_memberships')
                    .select(`
                        user_id,
                        users!workspace_memberships_user_id_fkey (
                            id,
                            name,
                            email,
                            avatar
                        )
                    `)
                    .eq('workspace_id', currentWorkspace.id)
                    .eq('status', 'active');

                if (error) {
                    console.error('Error fetching workspace members:', error);
                    // Fallback: try without the FK hint
                    const { data: fallbackData, error: fallbackError } = await supabase
                        .from('workspace_memberships')
                        .select('user_id')
                        .eq('workspace_id', currentWorkspace.id)
                        .eq('status', 'active');

                    if (fallbackError) {
                        console.error('Fallback also failed:', fallbackError);
                        return;
                    }

                    // Fetch user details separately
                    if (fallbackData && fallbackData.length > 0) {
                        const userIds = fallbackData.map(m => m.user_id);
                        const { data: usersData, error: usersError } = await supabase
                            .from('users')
                            .select('id, name, email, avatar')
                            .in('id', userIds);

                        if (!usersError && usersData) {
                            const membersList: WorkspaceMember[] = usersData
                                .filter(u => u.id !== currentUser?.id)
                                .map(u => ({
                                    id: u.id,
                                    name: u.name || u.email?.split('@')[0] || 'User',
                                    email: u.email,
                                    avatar: u.avatar,
                                }));
                            setMembers(membersList);
                        }
                    }
                    return;
                }

                // Map the joined data
                const membersList: WorkspaceMember[] = (data || [])
                    .filter(m => m.users && typeof m.users === 'object')
                    .map(m => {
                        const user = m.users as any;
                        return {
                            id: user.id,
                            name: user.name || user.email?.split('@')[0] || 'User',
                            email: user.email,
                            avatar: user.avatar,
                        };
                    })
                    .filter(m => m.id !== currentUser?.id); // Exclude current user

                setMembers(membersList);
            } catch (err) {
                console.error('Failed to fetch members:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchMembers();
    }, [open, currentWorkspace, currentUser?.id]);

    // Filter members by search query
    const filteredMembers = members.filter(member => {
        if (!searchQuery) return true;
        return member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            member.email.toLowerCase().includes(searchQuery.toLowerCase());
    });

    const handleSelectMember = async (member: WorkspaceMember) => {
        if (!currentWorkspace || !currentUser || isCreating) return;

        setIsCreating(true);
        try {
            // Create conversation using user IDs (both are from users table)
            const conversation = await getOrCreateConversation(
                currentWorkspace.id,
                member.id, // This is now a valid user ID
                currentUser.id
            );

            if (conversation) {
                setCurrentConversation(conversation);
                router.push('/messages');
                onOpenChange(false);
                setSearchQuery('');
            }
        } catch (error) {
            console.error('Error creating DM:', error);
            toast.error('Failed to start conversation');
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Start a direct message</DialogTitle>
                    <DialogDescription>
                        Choose a workspace member to start a conversation with
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by name or email"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                            autoFocus
                        />
                    </div>

                    <ScrollArea className="h-[300px]">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-full">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : filteredMembers.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-sm text-muted-foreground text-center px-4">
                                {searchQuery ? (
                                    'No members found'
                                ) : (
                                    <>
                                        <p>No other workspace members yet</p>
                                        <p className="text-xs mt-1">Invite team members to your workspace to message them</p>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {filteredMembers.map((member) => {
                                    const initials = member.name.substring(0, 2).toUpperCase();

                                    return (
                                        <button
                                            key={member.id}
                                            onClick={() => handleSelectMember(member)}
                                            disabled={isCreating}
                                            className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-accent transition-colors text-left disabled:opacity-50"
                                        >
                                            <Avatar className="h-9 w-9">
                                                <AvatarImage src={member.avatar} alt={member.name} />
                                                <AvatarFallback className="text-xs">
                                                    {initials}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">{member.name}</p>
                                                <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                                            </div>
                                            {isCreating && (
                                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </ScrollArea>
                </div>
            </DialogContent>
        </Dialog>
    );
}
