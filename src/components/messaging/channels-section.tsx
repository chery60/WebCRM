'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMessagingStore } from '@/lib/stores/messaging-store';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Hash, Lock, ChevronDown, Plus, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { Channel } from '@/types';

interface ChannelsSectionProps {
    onCreateChannel: () => void;
}

export function ChannelsSection({ onCreateChannel }: ChannelsSectionProps) {
    const router = useRouter();
    const [isExpanded, setIsExpanded] = useState(false);
    const { channels, currentChannel, setCurrentChannel, fetchChannels, updateChannel, deleteChannel, isLoadingChannels } = useMessagingStore();
    const { currentWorkspace } = useWorkspaceStore();
    const { currentUser } = useAuthStore();

    // Rename dialog state
    const [showRenameDialog, setShowRenameDialog] = useState(false);
    const [channelToRename, setChannelToRename] = useState<Channel | null>(null);
    const [renameValue, setRenameValue] = useState('');

    // Delete dialog state
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [channelToDelete, setChannelToDelete] = useState<Channel | null>(null);

    useEffect(() => {
        if (currentWorkspace && currentUser) {
            fetchChannels(currentWorkspace.id, currentUser.id).catch(() => {
                // Error is already logged in the store, silently handle here
            });
        }
    }, [currentWorkspace, currentUser, fetchChannels]);

    const handleChannelClick = (channel: Channel) => {
        setCurrentChannel(channel);
        router.push('/messages');
    };

    const handleRenameClick = (e: React.MouseEvent, channel: Channel) => {
        e.stopPropagation();
        setChannelToRename(channel);
        setRenameValue(channel.name);
        setShowRenameDialog(true);
    };

    const handleRenameChannel = async () => {
        if (!channelToRename || !renameValue.trim()) return;
        try {
            await updateChannel(channelToRename.id, { name: renameValue.trim() });
            setShowRenameDialog(false);
            setChannelToRename(null);
            setRenameValue('');
            toast.success('Channel renamed');
        } catch {
            toast.error('Failed to rename channel');
        }
    };

    const handleDeleteClick = (e: React.MouseEvent, channel: Channel) => {
        e.stopPropagation();
        setChannelToDelete(channel);
        setShowDeleteDialog(true);
    };

    const handleDeleteChannel = async () => {
        if (!channelToDelete) return;
        try {
            await deleteChannel(channelToDelete.id);
            setShowDeleteDialog(false);
            setChannelToDelete(null);
        } catch {
            toast.error('Failed to delete channel');
        }
    };

    return (
        <>
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
                <CollapsibleTrigger asChild>
                    <button className="w-full text-left">
                        <div
                            className={cn(
                                'flex items-center transition-colors w-full',
                                currentChannel ? 'font-medium' : ''
                            )}
                            style={{
                                height: '24px',
                                fontSize: '16px',
                                color: currentChannel
                                    ? 'var(--sidebar-text-primary)'
                                    : 'var(--sidebar-text-secondary)',
                                gap: '8px',
                            }}
                        >
                            <Hash className="h-5 w-5 shrink-0" style={{ width: '20px', height: '20px' }} />
                            <span className="flex-1 truncate">Channels</span>
                            <ChevronDown className={cn('h-4 w-4 transition-transform shrink-0', isExpanded && 'rotate-180')} />
                        </div>
                    </button>
                </CollapsibleTrigger>
                <CollapsibleContent
                    className="flex flex-col w-full overflow-hidden"
                    style={{ gap: '8px', paddingLeft: '28px', paddingTop: '8px' }}
                >
                    {channels.map((channel) => (
                        <ContextMenu key={channel.id}>
                            <ContextMenuTrigger asChild>
                                <div
                                    className="group relative w-full overflow-hidden"
                                    style={{ minWidth: 0 }}
                                >
                                    <button
                                        onClick={() => handleChannelClick(channel)}
                                        className={cn(
                                            'flex items-center transition-colors w-full',
                                            currentChannel?.id === channel.id ? 'font-medium' : ''
                                        )}
                                        style={{
                                            height: '24px',
                                            fontSize: '14px',
                                            color: currentChannel?.id === channel.id
                                                ? 'var(--sidebar-text-primary)'
                                                : 'var(--sidebar-text-secondary)',
                                            gap: '8px',
                                            paddingRight: '28px',
                                            width: '100%',
                                            overflow: 'hidden',
                                        }}
                                    >
                                        {channel.isPrivate ? (
                                            <Lock className="h-4 w-4 shrink-0" style={{ width: '16px', height: '16px', flexShrink: 0 }} />
                                        ) : (
                                            <Hash className="h-4 w-4 shrink-0" style={{ width: '16px', height: '16px', flexShrink: 0 }} />
                                        )}
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0, textAlign: 'left' }}>
                                            {channel.name}
                                        </span>
                                    </button>

                                    {/* More options button (visible on hover) */}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button
                                                className="absolute right-0 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-sidebar-accent transition-opacity"
                                                style={{ zIndex: 10 }}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <MoreHorizontal className="h-3.5 w-3.5" />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-40">
                                            <DropdownMenuItem onClick={(e) => handleRenameClick(e, channel)}>
                                                <Pencil className="h-4 w-4 mr-2" />
                                                Rename
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                onClick={(e) => handleDeleteClick(e, channel)}
                                                className="text-destructive focus:text-destructive"
                                            >
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </ContextMenuTrigger>
                            <ContextMenuContent className="w-40">
                                <ContextMenuItem onClick={(e) => handleRenameClick(e, channel)}>
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Rename
                                </ContextMenuItem>
                                <ContextMenuSeparator />
                                <ContextMenuItem
                                    onClick={(e) => handleDeleteClick(e, channel)}
                                    className="text-destructive focus:text-destructive"
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                </ContextMenuItem>
                            </ContextMenuContent>
                        </ContextMenu>
                    ))}

                    {channels.length === 0 && !isLoadingChannels && (
                        <div
                            style={{
                                height: '24px',
                                fontSize: '14px',
                                color: 'var(--sidebar-text-secondary)',
                                display: 'flex',
                                alignItems: 'center',
                            }}
                        >
                            No channels yet
                        </div>
                    )}

                    {/* Add Channel button */}
                    <button
                        onClick={onCreateChannel}
                        className="flex items-center transition-colors w-full"
                        style={{
                            height: '24px',
                            fontSize: '14px',
                            color: 'var(--sidebar-text-secondary)',
                            gap: '8px',
                        }}
                    >
                        <Plus className="h-4 w-4 shrink-0" style={{ width: '16px', height: '16px' }} />
                        <span>Add Channel</span>
                    </button>
                </CollapsibleContent>
            </Collapsible>

            {/* Rename Channel Dialog */}
            <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>Rename Channel</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="renameChannel">Channel Name</Label>
                        <Input
                            id="renameChannel"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            placeholder="Enter channel name"
                            className="mt-2"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRenameChannel();
                            }}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleRenameChannel} disabled={!renameValue.trim()}>
                            Rename
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Channel Confirmation Dialog */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>Delete Channel</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete &quot;{channelToDelete?.name}&quot;?
                            All messages in this channel will be permanently deleted.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4">
                        <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteChannel}>
                            Delete Channel
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
