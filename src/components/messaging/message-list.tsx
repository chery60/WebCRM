'use client';

import { useEffect, useRef } from 'react';
import { useMessagingStore } from '@/lib/stores/messaging-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageItem } from './message-item';
import { Skeleton } from '@/components/ui/skeleton';

export function MessageList() {
    const { messages, isLoadingMessages, currentChannel, currentConversation } = useMessagingStore();
    const { currentUser } = useAuthStore();
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    if (isLoadingMessages) {
        return (
            <div className="flex-1 p-4 space-y-4">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex gap-3">
                        <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-16 w-full" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (!currentChannel && !currentConversation) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center space-y-2">
                    <h3 className="text-lg font-semibold text-muted-foreground">No conversation selected</h3>
                    <p className="text-sm text-muted-foreground">
                        Choose a channel or start a direct message to begin
                    </p>
                </div>
            </div>
        );
    }

    return (
        <ScrollArea className="flex-1" ref={scrollRef}>
            <div className="p-4 space-y-4">
                {messages.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-sm text-muted-foreground">
                            No messages yet. Start the conversation!
                        </p>
                    </div>
                ) : (
                    messages.map((message, index) => {
                        const prevMessage = index > 0 ? messages[index - 1] : null;
                        const showAvatar = !prevMessage || prevMessage.senderId !== message.senderId;

                        return (
                            <MessageItem
                                key={message.id}
                                message={message}
                                showAvatar={showAvatar}
                                isOwnMessage={message.senderId === currentUser?.id}
                            />
                        );
                    })
                )}
            </div>
        </ScrollArea>
    );
}
