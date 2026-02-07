'use client';

import { useState, useEffect } from 'react';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useQueryClient } from '@tanstack/react-query';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronsUpDown, Check, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface WorkspaceSwitcherProps {
    collapsed?: boolean;
}

export function WorkspaceSwitcher({ collapsed = false }: WorkspaceSwitcherProps) {
    const { currentUser } = useAuthStore();
    const {
        currentWorkspace,
        userWorkspaces,
        fetchUserWorkspaces,
        switchWorkspace,
        createWorkspace,
    } = useWorkspaceStore();
    const queryClient = useQueryClient();

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newWorkspaceName, setNewWorkspaceName] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Fetch workspaces on mount
    useEffect(() => {
        if (currentUser?.id) {
            fetchUserWorkspaces(currentUser.id);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser?.id]);

    const handleCreateWorkspace = async () => {
        if (!newWorkspaceName.trim() || !currentUser?.id) {
            toast.error('Please enter a workspace name');
            return;
        }

        setIsLoading(true);
        try {
            await createWorkspace(newWorkspaceName.trim(), currentUser.id, undefined, undefined);
            // Invalidate ALL workspace-scoped queries
            queryClient.invalidateQueries({ queryKey: ['notes'] });
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            queryClient.invalidateQueries({ queryKey: ['pipelines'] });
            queryClient.invalidateQueries({ queryKey: ['roadmaps'] });
            queryClient.invalidateQueries({ queryKey: ['featureRequests'] });
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            queryClient.invalidateQueries({ queryKey: ['employees'] });
            toast.success('Workspace created successfully');
            setIsCreateOpen(false);
            setNewWorkspaceName('');
        } catch (error) {
            toast.error('Failed to create workspace');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSwitchWorkspace = async (workspaceId: string) => {
        try {
            await switchWorkspace(workspaceId);
            // Invalidate ALL workspace-scoped queries to refresh data
            queryClient.invalidateQueries({ queryKey: ['notes'] });
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            queryClient.invalidateQueries({ queryKey: ['pipelines'] });
            queryClient.invalidateQueries({ queryKey: ['roadmaps'] });
            queryClient.invalidateQueries({ queryKey: ['featureRequests'] });
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            queryClient.invalidateQueries({ queryKey: ['employees'] });
            toast.success('Switched workspace');
        } catch (error) {
            toast.error('Failed to switch workspace');
            console.error(error);
        }
    };

    const workspaceInitials = currentWorkspace?.name
        ?.split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'W';

    if (collapsed) {
        return (
            <div className="border-t" style={{ borderColor: 'var(--sidebar-separator)', backgroundColor: 'white' }}>
                <div className="p-3" style={{ paddingLeft: '24px', paddingRight: '24px' }}>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="flex w-full items-center justify-center rounded-lg p-2 hover:bg-sidebar-accent">
                                <Avatar className="h-8 w-8 rounded-lg">
                                    <AvatarImage src={currentWorkspace?.icon} />
                                    <AvatarFallback className="rounded-lg bg-primary text-primary-foreground text-sm">
                                        {workspaceInitials}
                                    </AvatarFallback>
                                </Avatar>
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent side="right" align="end" className="w-56">
                            <WorkspaceSwitcherContent
                                currentWorkspace={currentWorkspace}
                                userWorkspaces={userWorkspaces}
                                onSwitch={handleSwitchWorkspace}
                                onCreateClick={() => setIsCreateOpen(true)}
                            />
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <CreateWorkspaceDialog
                        open={isCreateOpen}
                        onOpenChange={setIsCreateOpen}
                        workspaceName={newWorkspaceName}
                        setWorkspaceName={setNewWorkspaceName}
                        onSubmit={handleCreateWorkspace}
                        isLoading={isLoading}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="border-t" style={{ borderColor: 'var(--sidebar-separator)', backgroundColor: 'white' }}>
            <div className="p-3" style={{ paddingLeft: '24px', paddingRight: '24px' }}>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            className="flex w-full items-center transition-colors"
                            style={{
                                height: '24px',
                                fontSize: '14px',
                                color: 'var(--sidebar-text-secondary)',
                                gap: '8px',
                            }}
                        >
                            <Avatar className="h-6 w-6 rounded-lg" style={{ width: '24px', height: '24px' }}>
                                <AvatarImage src={currentWorkspace?.icon} />
                                <AvatarFallback className="rounded-lg bg-primary text-primary-foreground text-xs">
                                    {workspaceInitials}
                                </AvatarFallback>
                            </Avatar>
                            <span className="flex-1 truncate text-left">
                                {currentWorkspace?.name || 'Select Workspace'}
                            </span>
                            <ChevronsUpDown className="h-4 w-4 shrink-0" style={{ width: '16px', height: '16px' }} />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="top" align="start" className="w-56">
                        <WorkspaceSwitcherContent
                            currentWorkspace={currentWorkspace}
                            userWorkspaces={userWorkspaces}
                            onSwitch={handleSwitchWorkspace}
                            onCreateClick={() => setIsCreateOpen(true)}
                        />
                    </DropdownMenuContent>
                </DropdownMenu>

                <CreateWorkspaceDialog
                    open={isCreateOpen}
                    onOpenChange={setIsCreateOpen}
                    workspaceName={newWorkspaceName}
                    setWorkspaceName={setNewWorkspaceName}
                    onSubmit={handleCreateWorkspace}
                    isLoading={isLoading}
                />
            </div>
        </div>
    );
}

function WorkspaceSwitcherContent({
    currentWorkspace,
    userWorkspaces,
    onSwitch,
    onCreateClick,
}: {
    currentWorkspace: any;
    userWorkspaces: any[];
    onSwitch: (id: string) => void;
    onCreateClick: () => void;
}) {
    return (
        <>
            <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {userWorkspaces.map((workspace) => {
                const workspaceInitials = workspace.name
                    ?.split(' ')
                    .map((n: string) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);

                return (
                    <DropdownMenuItem
                        key={workspace.id}
                        onClick={() => onSwitch(workspace.id)}
                        className="gap-2"
                    >
                        <Avatar className="h-6 w-6 rounded-md">
                            <AvatarImage src={workspace.icon} />
                            <AvatarFallback className="rounded-md bg-primary/10 text-xs">
                                {workspaceInitials}
                            </AvatarFallback>
                        </Avatar>
                        <span className="flex-1 truncate">{workspace.name}</span>
                        {currentWorkspace?.id === workspace.id && (
                            <Check className="h-4 w-4" />
                        )}
                    </DropdownMenuItem>
                );
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onCreateClick} className="gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md border-2 border-dashed">
                    <Plus className="h-4 w-4" />
                </div>
                <span>Create Workspace</span>
            </DropdownMenuItem>
        </>
    );
}

function CreateWorkspaceDialog({
    open,
    onOpenChange,
    workspaceName,
    setWorkspaceName,
    onSubmit,
    isLoading,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workspaceName: string;
    setWorkspaceName: (name: string) => void;
    onSubmit: () => void;
    isLoading: boolean;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create Workspace</DialogTitle>
                    <DialogDescription>
                        Create a new workspace to organize your team's work.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="workspace-name">Workspace Name</Label>
                        <Input
                            id="workspace-name"
                            placeholder="Enter workspace name"
                            value={workspaceName}
                            onChange={(e) => setWorkspaceName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !isLoading) {
                                    onSubmit();
                                }
                            }}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button onClick={onSubmit} disabled={isLoading || !workspaceName.trim()}>
                        {isLoading ? 'Creating...' : 'Create Workspace'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
