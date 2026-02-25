'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useMessagingStore } from '@/lib/stores/messaging-store';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { getSupabaseClient } from '@/lib/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageCircle, ChevronDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import type { DirectMessageConversation, User } from '@/types';

interface DirectMessagesSectionProps {
    onStartDM: () => void;
}

export function DirectMessagesSection({ onStartDM }: DirectMessagesSectionProps) {
    const router = useRouter();
    const [isExpanded, setIsExpanded] = useState(false);
    const [userCache, setUserCache] = useState<Record<string, User>>({});
    const { conversations, currentConversation, setCurrentConversation, fetchConversations, subscribeToNewConversations, unreadCounts } = useMessagingStore();
    const { currentWorkspace } = useWorkspaceStore();
    const { currentUser } = useAuthStore();
    const prevConversationCount = useRef(conversations.length);

    // Initial fetch of conversations
    useEffect(() => {
        if (currentWorkspace && currentUser) {
            fetchConversations(currentWorkspace.id, currentUser.id).catch(() => {
                // Error is already logged in the store, silently handle here
            });
        }
    }, [currentWorkspace, currentUser, fetchConversations]);

    // Subscribe to new DM conversations in real-time so the sidebar
    // updates immediately when someone starts a conversation with this user
    useEffect(() => {
        if (!currentWorkspace || !currentUser) return;

        const unsubscribe = subscribeToNewConversations(currentWorkspace.id, currentUser.id);
        return unsubscribe;
    }, [currentWorkspace, currentUser, subscribeToNewConversations]);

    // Auto-expand the DM section when a new conversation arrives
    useEffect(() => {
        if (conversations.length > prevConversationCount.current) {
            setIsExpanded(true);
        }
        prevConversationCount.current = conversations.length;
    }, [conversations.length]);

    // Fetch user info for conversations
    useEffect(() => {
        const fetchUserInfo = async () => {
            if (!currentUser || conversations.length === 0) return;

            const supabase = getSupabaseClient();
            if (!supabase) return;

            // Get all unique other user IDs that are not yet in the cache
            const otherUserIds = conversations.map(conv =>
                conv.user1Id === currentUser.id ? conv.user2Id : conv.user1Id
            ).filter(id => id && !userCache[id]);

            if (otherUserIds.length === 0) return;

            // Fetch user info for missing users
            const { data, error } = await supabase
                .from('users')
                .select('id, name, email, avatar')
                .in('id', otherUserIds);

            if (error) {
                console.warn('Error fetching user info:', error);
                return;
            }

            // Update cache
            const newCache = { ...userCache };
            data?.forEach(user => {
                newCache[user.id] = {
                    id: user.id,
                    name: user.name || user.email?.split('@')[0] || 'User',
                    email: user.email,
                    avatar: user.avatar,
                    role: 'member',
                };
            });
            setUserCache(newCache);
        };

        fetchUserInfo();
    }, [conversations, currentUser]); // removed userCache from deps to avoid infinite loop

    // Get the other user in a conversation
    const getOtherUser = (conversation: DirectMessageConversation) => {
        if (!currentUser) return null;
        const otherUserId = conversation.user1Id === currentUser.id ? conversation.user2Id : conversation.user1Id;
        return userCache[otherUserId] || null;
    };

    // Total unread across all DM conversations (shown on the header when collapsed)
    const totalDMUnread = conversations.reduce((sum, c) => sum + (unreadCounts.get(c.id) || 0), 0);

    return (
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
                <button className="w-full text-left">
                    <div
                        className={cn(
                            'flex items-center transition-colors w-full',
                            currentConversation ? 'font-medium' : ''
                        )}
                        style={{
                            height: '24px',
                            fontSize: '16px',
                            color: currentConversation
                                ? 'var(--sidebar-text-primary)'
                                : 'var(--sidebar-text-secondary)',
                            gap: '8px',
                        }}
                    >
                        <MessageCircle className="h-5 w-5 shrink-0" style={{ width: '20px', height: '20px' }} />
                        <span className="flex-1 truncate">Direct Messages</span>
                        {/* Total unread badge on header — visible when section is collapsed */}
                        {!isExpanded && totalDMUnread > 0 && (
                            <span
                                className="inline-flex items-center justify-center rounded-full bg-red-500 text-white font-semibold shrink-0"
                                style={{ minWidth: '18px', height: '18px', fontSize: '10px', padding: '0 4px' }}
                            >
                                {totalDMUnread > 99 ? '99+' : totalDMUnread}
                            </span>
                        )}
                        <ChevronDown className={cn('h-4 w-4 transition-transform shrink-0', isExpanded && 'rotate-180')} />
                    </div>
                </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="flex flex-col w-full max-w-full overflow-hidden min-w-0" style={{ gap: '8px', paddingLeft: '28px', paddingTop: '8px', minWidth: 0, maxWidth: '100%' }}>
                {conversations.map((conversation) => {
                    const otherUser = getOtherUser(conversation);
                    // Show a placeholder while user info is being fetched
                    const displayName = otherUser?.name || 'Loading...';
                    const initials = otherUser?.name?.substring(0, 2).toUpperCase() || '...';
                    const unread = unreadCounts.get(conversation.id) || 0;

                    return (
                        <button
                            key={conversation.id}
                            onClick={() => {
                                setCurrentConversation(conversation);
                                router.push('/messages');
                            }}
                            className={cn(
                                'flex items-center transition-colors w-full',
                                currentConversation?.id === conversation.id ? 'font-medium' : ''
                            )}
                            style={{
                                height: '24px',
                                fontSize: '14px',
                                color: currentConversation?.id === conversation.id
                                    ? 'var(--sidebar-text-primary)'
                                    : unread > 0
                                        ? 'var(--sidebar-text-primary)'
                                        : 'var(--sidebar-text-secondary)',
                                gap: '8px',
                                fontWeight: unread > 0 ? 600 : undefined,
                            }}
                        >
                            <Avatar className="h-4 w-4 shrink-0" style={{ width: '16px', height: '16px' }}>
                                <AvatarImage src={otherUser?.avatar} alt={displayName} />
                                <AvatarFallback className="text-[8px]">{initials}</AvatarFallback>
                            </Avatar>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0, textAlign: 'left' }}>{displayName}</span>
                            {/* Per-conversation unread badge */}
                            {unread > 0 && (
                                <span
                                    className="inline-flex items-center justify-center rounded-full bg-red-500 text-white font-semibold shrink-0"
                                    style={{ minWidth: '16px', height: '16px', fontSize: '9px', padding: '0 3px' }}
                                >
                                    {unread > 99 ? '99+' : unread}
                                </span>
                            )}
                        </button>
                    );
                })}

                {conversations.length === 0 && (
                    <div
                        style={{
                            height: '24px',
                            fontSize: '14px',
                            color: 'var(--sidebar-text-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                        }}
                    >
                        No conversations yet
                    </div>
                )}

                {/* Start DM button */}
                <button
                    onClick={onStartDM}
                    className="flex items-center transition-colors w-full"
                    style={{
                        height: '24px',
                        fontSize: '14px',
                        color: 'var(--sidebar-text-secondary)',
                        gap: '8px',
                    }}
                >
                    <Plus className="h-4 w-4" style={{ width: '16px', height: '16px' }} />
                    <span>New Message</span>
                </button>
            </CollapsibleContent>
        </Collapsible>
    );
}
