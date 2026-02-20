'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMessagingStore } from '@/lib/stores/messaging-store';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Hash, Lock, ChevronDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface ChannelsSectionProps {
    onCreateChannel: () => void;
}

export function ChannelsSection({ onCreateChannel }: ChannelsSectionProps) {
    const router = useRouter();
    const [isExpanded, setIsExpanded] = useState(false);
    const { channels, currentChannel, setCurrentChannel, fetchChannels, isLoadingChannels } = useMessagingStore();
    const { currentWorkspace } = useWorkspaceStore();
    const { currentUser } = useAuthStore();

    useEffect(() => {
        if (currentWorkspace && currentUser) {
            fetchChannels(currentWorkspace.id, currentUser.id).catch(() => {
                // Error is already logged in the store, silently handle here
            });
        }
    }, [currentWorkspace, currentUser, fetchChannels]);

    const handleChannelClick = (channel: typeof channels[0]) => {
        setCurrentChannel(channel);
        router.push('/messages');
    };

    return (
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
                        <span className="flex-1">Channels</span>
                        <ChevronDown className={cn('h-4 w-4 transition-transform shrink-0', isExpanded && 'rotate-180')} />
                    </div>
                </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="flex flex-col w-full max-w-full overflow-hidden min-w-0" style={{ gap: '8px', paddingLeft: '28px', paddingTop: '8px', minWidth: 0, maxWidth: '100%' }}>
                {channels.map((channel) => (
                    <button
                        key={channel.id}
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
                        }}
                    >
                        {channel.isPrivate ? (
                            <Lock className="h-4 w-4 shrink-0" style={{ width: '16px', height: '16px' }} />
                        ) : (
                            <Hash className="h-4 w-4 shrink-0" style={{ width: '16px', height: '16px' }} />
                        )}
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0, textAlign: 'left' }}>{channel.name}</span>
                    </button>
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
                    <Plus className="h-4 w-4" style={{ width: '16px', height: '16px' }} />
                    <span>Add Channel</span>
                </button>
            </CollapsibleContent>
        </Collapsible>
    );
}
