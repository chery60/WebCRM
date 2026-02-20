'use client';

import { useState } from 'react';
import { useMessagingStore } from '@/lib/stores/messaging-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import type { Message } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MessageSquare, MoreVertical, Pencil, Trash2, Smile } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ThreadDrawer } from './thread-drawer';

interface MessageItemProps {
    message: Message;
    showAvatar: boolean;
    isOwnMessage: boolean;
}

export function MessageItem({ message, showAvatar, isOwnMessage }: MessageItemProps) {
    const [showThread, setShowThread] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(message.content);
    
    const { editMessage, deleteMessage, addReaction, removeReaction } = useMessagingStore();
    const { currentUser } = useAuthStore();

    const handleEdit = async () => {
        if (editContent.trim() && editContent !== message.content) {
            await editMessage(message.id, editContent.trim());
        }
        setIsEditing(false);
    };

    const handleDelete = async () => {
        if (confirm('Are you sure you want to delete this message?')) {
            await deleteMessage(message.id);
        }
    };

    const handleReaction = async (emoji: string) => {
        if (!currentUser) return;
        
        const userReacted = message.reactions.some(r => 
            r.emoji === emoji && r.userIds.includes(currentUser.id)
        );

        if (userReacted) {
            await removeReaction(message.id, emoji, currentUser.id);
        } else {
            await addReaction(message.id, emoji, currentUser.id);
        }
    };

    const senderName = message.sender?.name || message.sender?.email || 'Unknown User';
    const senderInitials = senderName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    return (
        <>
            <div className="group relative hover:bg-accent/50 -mx-2 px-2 py-1 rounded">
                <div className="flex gap-3">
                    {showAvatar ? (
                        <Avatar className="h-10 w-10 flex-shrink-0">
                            <AvatarImage src={message.sender?.avatar} alt={senderName} />
                            <AvatarFallback>{senderInitials}</AvatarFallback>
                        </Avatar>
                    ) : (
                        <div className="w-10 flex-shrink-0" />
                    )}

                    <div className="flex-1 min-w-0">
                        {showAvatar && (
                            <div className="flex items-baseline gap-2 mb-1">
                                <span className="font-semibold text-sm">{senderName}</span>
                                <span className="text-xs text-muted-foreground">
                                    {format(new Date(message.createdAt), 'h:mm a')}
                                </span>
                            </div>
                        )}

                        {isEditing ? (
                            <div className="space-y-2">
                                <textarea
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    className="w-full min-h-[60px] p-2 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleEdit();
                                        }
                                        if (e.key === 'Escape') {
                                            setIsEditing(false);
                                            setEditContent(message.content);
                                        }
                                    }}
                                />
                                <div className="flex gap-2">
                                    <Button size="sm" onClick={handleEdit}>Save</Button>
                                    <Button size="sm" variant="outline" onClick={() => {
                                        setIsEditing(false);
                                        setEditContent(message.content);
                                    }}>Cancel</Button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <p className="text-sm whitespace-pre-wrap break-words">
                                    {message.content}
                                    {message.isEdited && (
                                        <span className="text-xs text-muted-foreground ml-1">(edited)</span>
                                    )}
                                </p>

                                {/* Reactions */}
                                {message.reactions && message.reactions.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {message.reactions.map((reaction) => (
                                            <button
                                                key={reaction.emoji}
                                                onClick={() => handleReaction(reaction.emoji)}
                                                className={cn(
                                                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors",
                                                    currentUser && reaction.userIds.includes(currentUser.id)
                                                        ? "bg-primary/10 border-primary"
                                                        : "bg-muted hover:bg-muted/80"
                                                )}
                                            >
                                                <span>{reaction.emoji}</span>
                                                <span>{reaction.count}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Thread count */}
                                {message.threadCount > 0 && (
                                    <button
                                        onClick={() => setShowThread(true)}
                                        className="flex items-center gap-1 mt-2 text-xs text-primary hover:underline"
                                    >
                                        <MessageSquare className="h-3 w-3" />
                                        {message.threadCount} {message.threadCount === 1 ? 'reply' : 'replies'}
                                    </button>
                                )}
                            </>
                        )}
                    </div>

                    {/* Actions menu */}
                    {!isEditing && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => setShowThread(true)}>
                                        <MessageSquare className="h-4 w-4 mr-2" />
                                        Reply in thread
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleReaction('👍')}>
                                        <Smile className="h-4 w-4 mr-2" />
                                        Add reaction
                                    </DropdownMenuItem>
                                    {isOwnMessage && (
                                        <>
                                            <DropdownMenuItem onClick={() => setIsEditing(true)}>
                                                <Pencil className="h-4 w-4 mr-2" />
                                                Edit message
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Delete message
                                            </DropdownMenuItem>
                                        </>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    )}
                </div>
            </div>

            <ThreadDrawer
                open={showThread}
                onOpenChange={setShowThread}
                parentMessage={message}
            />
        </>
    );
}
