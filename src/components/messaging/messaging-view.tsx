'use client';

import { useEffect, useState } from 'react';
import { useMessagingStore } from '@/lib/stores/messaging-store';
import { MessageList } from './message-list';
import { MessageInput } from './message-input';
import { Button } from '@/components/ui/button';
import { Hash, Lock, User, Settings } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useEmployeeStore } from '@/lib/stores/employee-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { Employee } from '@/types';

export function MessagingView() {
    const { currentChannel, currentConversation, subscribeToChannelMessages, subscribeToDirectMessages } = useMessagingStore();
    const { employees } = useEmployeeStore();
    const { currentUser } = useAuthStore();
    const [otherUser, setOtherUser] = useState<Employee | null>(null);

    // Subscribe to real-time updates
    useEffect(() => {
        if (currentChannel) {
            const unsubscribe = subscribeToChannelMessages(currentChannel.id);
            return unsubscribe;
        }
    }, [currentChannel, subscribeToChannelMessages]);

    useEffect(() => {
        if (currentConversation) {
            const unsubscribe = subscribeToDirectMessages(currentConversation.id);
            return unsubscribe;
        }
    }, [currentConversation, subscribeToDirectMessages]);

    // Get other user for DM conversation
    useEffect(() => {
        const fetchOtherUser = async () => {
            if (!currentConversation || !currentUser) {
                setOtherUser(null);
                return;
            }
            
            const otherUserId = currentConversation.user1Id === currentUser.id 
                ? currentConversation.user2Id 
                : currentConversation.user1Id;
            
            // The migration syncs employees to users table, so we need to lookup by email
            const supabase = getSupabaseClient();
            if (!supabase) {
                setOtherUser(null);
                return;
            }
            
            // Get the user's email from users table
            const { data: userData, error } = await supabase
                .from('users')
                .select('email')
                .eq('id', otherUserId)
                .single();
            
            if (error || !userData) {
                console.error('Error fetching user for DM:', error);
                setOtherUser(null);
                return;
            }
            
            // Find employee by email
            const employee = employees.find(emp => emp.email === userData.email);
            setOtherUser(employee || null);
        };

        fetchOtherUser();
    }, [currentConversation, currentUser, employees]);

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="border-b px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {currentChannel ? (
                        <>
                            {currentChannel.isPrivate ? (
                                <Lock className="h-5 w-5 text-muted-foreground" />
                            ) : (
                                <Hash className="h-5 w-5 text-muted-foreground" />
                            )}
                            <div>
                                <h2 className="font-semibold">{currentChannel.name}</h2>
                                {currentChannel.description && (
                                    <p className="text-xs text-muted-foreground">{currentChannel.description}</p>
                                )}
                            </div>
                        </>
                    ) : currentConversation && otherUser ? (
                        <>
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={otherUser.avatar} alt={`${otherUser.firstName} ${otherUser.lastName}`} />
                                <AvatarFallback>
                                    {`${otherUser.firstName?.[0] || ''}${otherUser.lastName?.[0] || ''}`.toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <h2 className="font-semibold">{otherUser.firstName} {otherUser.lastName}</h2>
                                <p className="text-xs text-muted-foreground">{otherUser.email}</p>
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center gap-2">
                            <User className="h-5 w-5 text-muted-foreground" />
                            <h2 className="font-semibold text-muted-foreground">Select a conversation</h2>
                        </div>
                    )}
                </div>
                {(currentChannel || currentConversation) && (
                    <Button variant="ghost" size="icon">
                        <Settings className="h-5 w-5" />
                    </Button>
                )}
            </div>

            {/* Messages */}
            <MessageList />

            {/* Input */}
            <MessageInput />
        </div>
    );
}
