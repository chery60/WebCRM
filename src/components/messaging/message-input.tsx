'use client';

import { useState, useRef } from 'react';
import { useMessagingStore } from '@/lib/stores/messaging-store';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Smile, Paperclip } from 'lucide-react';
import { toast } from 'sonner';

interface MessageInputProps {
    parentMessageId?: string;
    placeholder?: string;
}

export function MessageInput({ parentMessageId, placeholder = 'Type a message...' }: MessageInputProps) {
    const [content, setContent] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    
    const { sendMessage, currentChannel, currentConversation, isSendingMessage } = useMessagingStore();
    const { currentWorkspace } = useWorkspaceStore();
    const { currentUser } = useAuthStore();

    const handleSend = async () => {
        if (!content.trim() || !currentWorkspace || !currentUser) return;

        if (!currentChannel && !currentConversation) {
            toast.error('No conversation selected');
            return;
        }

        const messageData = {
            workspaceId: currentWorkspace.id,
            channelId: currentChannel?.id,
            receiverId: currentConversation ? (
                currentConversation.user1Id === currentUser.id 
                    ? currentConversation.user2Id 
                    : currentConversation.user1Id
            ) : undefined,
            content: content.trim(),
            senderId: currentUser.id,
            parentMessageId,
            attachments: [],
        };

        const message = await sendMessage(messageData);
        
        if (message) {
            setContent('');
            // Reset textarea height
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setContent(e.target.value);
        
        // Auto-resize textarea
        e.target.style.height = 'auto';
        e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
    };

    return (
        <div className="border-t p-4">
            <div className="flex gap-2">
                <div className="flex-1 relative">
                    <Textarea
                        ref={textareaRef}
                        value={content}
                        onChange={handleInput}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                        className="min-h-[44px] max-h-[200px] resize-none pr-24"
                        disabled={isSendingMessage || (!currentChannel && !currentConversation)}
                    />
                    <div className="absolute right-2 bottom-2 flex gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            type="button"
                            disabled={isSendingMessage}
                        >
                            <Paperclip className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            type="button"
                            disabled={isSendingMessage}
                        >
                            <Smile className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
                <Button
                    onClick={handleSend}
                    disabled={!content.trim() || isSendingMessage || (!currentChannel && !currentConversation)}
                    className="self-end"
                >
                    <Send className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
