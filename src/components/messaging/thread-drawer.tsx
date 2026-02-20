'use client';

import { useEffect } from 'react';
import { useMessagingStore } from '@/lib/stores/messaging-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import type { Message } from '@/types';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageInput } from './message-input';
import { format } from 'date-fns';

interface ThreadDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    parentMessage: Message;
}

export function ThreadDrawer({ open, onOpenChange, parentMessage }: ThreadDrawerProps) {
    const { threadMessages, fetchThreadMessages } = useMessagingStore();
    const { currentUser } = useAuthStore();
    
    const replies = threadMessages.get(parentMessage.id) || [];

    useEffect(() => {
        if (open && parentMessage) {
            fetchThreadMessages(parentMessage.id);
        }
    }, [open, parentMessage, fetchThreadMessages]);

    const senderName = parentMessage.sender?.name || parentMessage.sender?.email || 'Unknown User';
    const senderInitials = senderName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-xl flex flex-col p-0">
                <SheetHeader className="px-6 py-4 border-b">
                    <SheetTitle>Thread</SheetTitle>
                    <SheetDescription>
                        {parentMessage.threadCount} {parentMessage.threadCount === 1 ? 'reply' : 'replies'}
                    </SheetDescription>
                </SheetHeader>

                <ScrollArea className="flex-1 px-6">
                    {/* Parent Message */}
                    <div className="py-4 border-b">
                        <div className="flex gap-3">
                            <Avatar className="h-10 w-10 flex-shrink-0">
                                <AvatarImage src={parentMessage.sender?.avatar} alt={senderName} />
                                <AvatarFallback>{senderInitials}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-2 mb-1">
                                    <span className="font-semibold text-sm">{senderName}</span>
                                    <span className="text-xs text-muted-foreground">
                                        {format(new Date(parentMessage.createdAt), 'MMM d, h:mm a')}
                                    </span>
                                </div>
                                <p className="text-sm whitespace-pre-wrap break-words">
                                    {parentMessage.content}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Replies */}
                    <div className="py-4 space-y-4">
                        {replies.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-8">
                                No replies yet. Be the first to respond!
                            </p>
                        ) : (
                            replies.map((reply) => {
                                const replyName = reply.sender?.name || reply.sender?.email || 'Unknown User';
                                const replyInitials = replyName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

                                return (
                                    <div key={reply.id} className="flex gap-3">
                                        <Avatar className="h-8 w-8 flex-shrink-0">
                                            <AvatarImage src={reply.sender?.avatar} alt={replyName} />
                                            <AvatarFallback className="text-xs">{replyInitials}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-baseline gap-2 mb-1">
                                                <span className="font-semibold text-sm">{replyName}</span>
                                                <span className="text-xs text-muted-foreground">
                                                    {format(new Date(reply.createdAt), 'h:mm a')}
                                                </span>
                                            </div>
                                            <p className="text-sm whitespace-pre-wrap break-words">
                                                {reply.content}
                                                {reply.isEdited && (
                                                    <span className="text-xs text-muted-foreground ml-1">(edited)</span>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </ScrollArea>

                <div className="border-t">
                    <MessageInput 
                        parentMessageId={parentMessage.id}
                        placeholder="Reply to thread..."
                    />
                </div>
            </SheetContent>
        </Sheet>
    );
}
