import { create } from 'zustand';
import type { Channel, Message, DirectMessageConversation, ChannelMember } from '@/types';
import { supabaseChannelRepository } from '@/lib/db/repositories/supabase/channels';
import { supabaseMessageRepository, supabaseDirectMessageRepository } from '@/lib/db/repositories/supabase/messages';
import { getSupabaseClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface MessagingState {
    // Channels
    channels: Channel[];
    currentChannel: Channel | null;
    channelMembers: Map<string, ChannelMember[]>;

    // Direct Messages
    conversations: DirectMessageConversation[];
    currentConversation: DirectMessageConversation | null;

    // Messages
    messages: Message[];
    threadMessages: Map<string, Message[]>;

    // Unread counts: keyed by conversationId or channelId → unread message count
    unreadCounts: Map<string, number>;

    // UI State
    isLoadingChannels: boolean;
    isLoadingMessages: boolean;
    isSendingMessage: boolean;

    // Actions - Channels
    fetchChannels: (workspaceId: string, userId: string) => Promise<void>;
    createChannel: (data: { workspaceId: string; name: string; description?: string; isPrivate: boolean; createdBy: string; memberEmails?: string[] }) => Promise<Channel | null>;
    updateChannel: (channelId: string, data: Partial<Channel>) => Promise<void>;
    deleteChannel: (channelId: string) => Promise<void>;
    setCurrentChannel: (channel: Channel | null) => void;

    // Actions - Channel Members
    fetchChannelMembers: (channelId: string) => Promise<void>;
    addChannelMembers: (channelId: string, userIds: string[]) => Promise<void>;
    removeChannelMember: (channelId: string, userId: string) => Promise<void>;

    // Actions - Direct Messages
    fetchConversations: (workspaceId: string, userId: string) => Promise<void>;
    getOrCreateConversation: (workspaceId: string, otherUserId: string, currentUserId: string) => Promise<DirectMessageConversation | null>;
    setCurrentConversation: (conversation: DirectMessageConversation | null) => void;

    // Real-time subscription for new DM conversations (for recipient's sidebar)
    subscribeToNewConversations: (workspaceId: string, userId: string) => () => void;

    // Actions - Messages
    fetchChannelMessages: (channelId: string) => Promise<void>;
    fetchDirectMessages: (conversationId: string) => Promise<void>;
    fetchThreadMessages: (parentMessageId: string) => Promise<void>;
    sendMessage: (data: { workspaceId: string; channelId?: string; receiverId?: string; content: string; senderId: string; parentMessageId?: string; attachments?: any[] }) => Promise<Message | null>;
    editMessage: (messageId: string, content: string) => Promise<void>;
    deleteMessage: (messageId: string) => Promise<void>;
    addReaction: (messageId: string, emoji: string, userId: string) => Promise<void>;
    removeReaction: (messageId: string, emoji: string, userId: string) => Promise<void>;

    // Unread count actions
    markConversationAsRead: (conversationId: string) => void;
    markChannelAsRead: (channelId: string, userId: string) => void;

    // Real-time subscriptions
    subscribeToChannelMessages: (channelId: string) => () => void;
    subscribeToDirectMessages: (conversationId: string) => () => void;

    // Clear state
    clearMessagingState: () => void;
}

export const useMessagingStore = create<MessagingState>((set, get) => ({
    // Initial state
    channels: [],
    currentChannel: null,
    channelMembers: new Map(),
    conversations: [],
    currentConversation: null,
    messages: [],
    threadMessages: new Map(),
    unreadCounts: new Map(),
    isLoadingChannels: false,
    isLoadingMessages: false,
    isSendingMessage: false,

    // Channels
    fetchChannels: async (workspaceId: string, userId: string) => {
        set({ isLoadingChannels: true });
        try {
            const channels = await supabaseChannelRepository.getUserChannels(workspaceId, userId);
            set({ channels });
        } catch (error) {
            // Repository now handles errors gracefully, but catch any remaining issues silently
            console.warn('Channels fetch error:', error);
            set({ channels: [] });
        } finally {
            set({ isLoadingChannels: false });
        }
    },

    createChannel: async (data) => {
        try {
            const channelData = {
                workspaceId: data.workspaceId,
                name: data.name,
                description: data.description,
                isPrivate: data.isPrivate,
                createdBy: data.createdBy,
                isDeleted: false,
            };

            const channel = await supabaseChannelRepository.create(channelData);

            // Add additional members if provided (convert emails to user IDs from workspace memberships)
            if (data.memberEmails && data.memberEmails.length > 0) {
                // TODO: Look up user IDs from workspace memberships by email
                // For now, we'll skip this as it requires a workspace membership lookup
                // This will be implemented when we have a proper user lookup function
                console.log('Member emails to add:', data.memberEmails);
            }

            set(state => ({
                channels: [...state.channels, channel],
            }));

            toast.success('Channel created successfully');
            return channel;
        } catch (error) {
            console.error('Failed to create channel:', error);
            toast.error('Failed to create channel');
            return null;
        }
    },

    updateChannel: async (channelId: string, data: Partial<Channel>) => {
        try {
            await supabaseChannelRepository.update(channelId, data);
            set(state => ({
                channels: state.channels.map(c => c.id === channelId ? { ...c, ...data } : c),
                currentChannel: state.currentChannel?.id === channelId ? { ...state.currentChannel, ...data } : state.currentChannel,
            }));
            toast.success('Channel updated');
        } catch (error) {
            console.error('Failed to update channel:', error);
            toast.error('Failed to update channel');
        }
    },

    deleteChannel: async (channelId: string) => {
        try {
            await supabaseChannelRepository.delete(channelId);
            set(state => ({
                channels: state.channels.filter(c => c.id !== channelId),
                currentChannel: state.currentChannel?.id === channelId ? null : state.currentChannel,
            }));
            toast.success('Channel deleted');
        } catch (error) {
            console.error('Failed to delete channel:', error);
            toast.error('Failed to delete channel');
        }
    },

    setCurrentChannel: (channel: Channel | null) => {
        set(state => {
            // Clear unread count for this channel
            const newCounts = new Map(state.unreadCounts);
            if (channel) newCounts.set(channel.id, 0);
            return { currentChannel: channel, currentConversation: null, messages: [], unreadCounts: newCounts };
        });
        if (channel) {
            get().fetchChannelMessages(channel.id);
            get().fetchChannelMembers(channel.id);
            // Update last_read_at in DB so count is persisted across sessions
            const { currentUser } = get() as any;
            if (currentUser) {
                supabaseChannelRepository.updateLastRead(channel.id, currentUser.id).catch(() => {});
            }
        }
    },

    // Channel Members
    fetchChannelMembers: async (channelId: string) => {
        try {
            const members = await supabaseChannelRepository.getMembers(channelId);
            set(state => {
                const newMap = new Map(state.channelMembers);
                newMap.set(channelId, members);
                return { channelMembers: newMap };
            });
        } catch (error) {
            console.error('Failed to fetch channel members:', error);
        }
    },

    addChannelMembers: async (channelId: string, userIds: string[]) => {
        try {
            for (const userId of userIds) {
                await supabaseChannelRepository.addMember(channelId, userId, 'member');
            }
            await get().fetchChannelMembers(channelId);
            toast.success('Members added to channel');
        } catch (error) {
            console.error('Failed to add channel members:', error);
            toast.error('Failed to add members');
        }
    },

    removeChannelMember: async (channelId: string, userId: string) => {
        try {
            await supabaseChannelRepository.removeMember(channelId, userId);
            await get().fetchChannelMembers(channelId);
            toast.success('Member removed from channel');
        } catch (error) {
            console.error('Failed to remove channel member:', error);
            toast.error('Failed to remove member');
        }
    },

    // Direct Messages
    fetchConversations: async (workspaceId: string, userId: string) => {
        try {
            const conversations = await supabaseDirectMessageRepository.getConversations(workspaceId, userId);
            set({ conversations });
        } catch (error) {
            console.error('Failed to fetch conversations:', error);
            toast.error('Failed to load conversations');
        }
    },

    getOrCreateConversation: async (workspaceId: string, otherUserId: string, currentUserId: string) => {
        try {
            // Use user IDs (UUIDs) for DM conversations as required by the database
            let conversation = await supabaseDirectMessageRepository.getConversation(workspaceId, currentUserId, otherUserId);

            if (!conversation) {
                conversation = await supabaseDirectMessageRepository.createConversation(workspaceId, currentUserId, otherUserId);
                set(state => ({
                    conversations: [...state.conversations, conversation!],
                }));
            }

            return conversation;
        } catch (error) {
            console.error('Failed to get/create conversation:', error);
            toast.error('Failed to start conversation');
            return null;
        }
    },

    setCurrentConversation: (conversation: DirectMessageConversation | null) => {
        set(state => {
            // Clear unread count for this conversation
            const newCounts = new Map(state.unreadCounts);
            if (conversation) newCounts.set(conversation.id, 0);
            return { currentConversation: conversation, currentChannel: null, messages: [], unreadCounts: newCounts };
        });
        if (conversation) {
            get().fetchDirectMessages(conversation.id);
        }
    },

    markConversationAsRead: (conversationId: string) => {
        set(state => {
            const newCounts = new Map(state.unreadCounts);
            newCounts.set(conversationId, 0);
            return { unreadCounts: newCounts };
        });
    },

    markChannelAsRead: (channelId: string, userId: string) => {
        set(state => {
            const newCounts = new Map(state.unreadCounts);
            newCounts.set(channelId, 0);
            return { unreadCounts: newCounts };
        });
        // Persist last_read_at to DB
        supabaseChannelRepository.updateLastRead(channelId, userId).catch(() => {});
    },

    // Messages
    fetchChannelMessages: async (channelId: string) => {
        set({ isLoadingMessages: true });
        try {
            const messages = await supabaseMessageRepository.getChannelMessages(channelId);
            set({ messages, isLoadingMessages: false });
        } catch (error) {
            console.error('Failed to fetch channel messages:', error);
            
            // Check if it's a specific error type
            if (error instanceof Error) {
                if (error.message.includes('foreign key')) {
                    toast.error('Database configuration issue. Please contact support.');
                } else if (error.message.includes('permission')) {
                    toast.error('You don\'t have permission to view these messages.');
                } else {
                    toast.error('Failed to load messages. Please try again.');
                }
            } else {
                toast.error('Failed to load messages');
            }
            
            // Clear messages on error
            set({ messages: [], isLoadingMessages: false });
        }
    },

    fetchDirectMessages: async (conversationId: string) => {
        set({ isLoadingMessages: true });
        try {
            const messages = await supabaseMessageRepository.getDirectMessages(conversationId);
            set({ messages, isLoadingMessages: false });
        } catch (error) {
            console.error('Failed to fetch direct messages:', error);
            
            // Check if it's a specific error type
            if (error instanceof Error) {
                if (error.message.includes('foreign key')) {
                    toast.error('Database configuration issue. Please contact support.');
                } else if (error.message.includes('permission')) {
                    toast.error('You don\'t have permission to view these messages.');
                } else {
                    toast.error('Failed to load messages. Please try again.');
                }
            } else {
                toast.error('Failed to load messages');
            }
            
            // Clear messages on error
            set({ messages: [], isLoadingMessages: false });
        }
    },

    fetchThreadMessages: async (parentMessageId: string) => {
        try {
            const messages = await supabaseMessageRepository.getThreadMessages(parentMessageId);
            set(state => {
                const newMap = new Map(state.threadMessages);
                newMap.set(parentMessageId, messages);
                return { threadMessages: newMap };
            });
        } catch (error) {
            console.error('Failed to fetch thread messages:', error);
        }
    },

    sendMessage: async (data) => {
        set({ isSendingMessage: true });
        try {
            const messageData = {
                workspaceId: data.workspaceId,
                channelId: data.channelId,
                senderId: data.senderId,
                receiverId: data.receiverId,
                content: data.content,
                parentMessageId: data.parentMessageId,
                attachments: data.attachments || [],
                isEdited: false,
                isDeleted: false,
            };

            const message = await supabaseMessageRepository.create(messageData);

            // Add to messages if not a thread reply
            if (!data.parentMessageId) {
                set(state => {
                    const updatedState: Partial<MessagingState> = {
                        messages: [...state.messages, message],
                    };

                    // If this is a DM, optimistically update the conversation's lastMessageAt
                    // so it floats to the top of the list without waiting for realtime
                    if (data.receiverId) {
                        const now = new Date();
                        updatedState.conversations = state.conversations.map(c => {
                            const isThisConv =
                                (c.user1Id === data.senderId && c.user2Id === data.receiverId) ||
                                (c.user1Id === data.receiverId && c.user2Id === data.senderId);
                            return isThisConv ? { ...c, lastMessageAt: now } : c;
                        });
                    }

                    return updatedState;
                });
            } else {
                // Add to thread messages
                const parentId = data.parentMessageId;
                set(state => {
                    const newMap = new Map(state.threadMessages);
                    const existing = newMap.get(parentId) || [];
                    newMap.set(parentId, [...existing, message]);

                    // Update thread count in main messages
                    const updatedMessages = state.messages.map(m =>
                        m.id === parentId ? { ...m, threadCount: m.threadCount + 1 } : m
                    );

                    return { threadMessages: newMap, messages: updatedMessages };
                });
            }

            return message;
        } catch (error) {
            console.error('Failed to send message:', error);
            toast.error('Failed to send message');
            return null;
        } finally {
            set({ isSendingMessage: false });
        }
    },

    editMessage: async (messageId: string, content: string) => {
        try {
            await supabaseMessageRepository.update(messageId, content);
            set(state => ({
                messages: state.messages.map(m =>
                    m.id === messageId ? { ...m, content, isEdited: true, editedAt: new Date() } : m
                ),
            }));
            toast.success('Message updated');
        } catch (error) {
            console.error('Failed to edit message:', error);
            toast.error('Failed to edit message');
        }
    },

    deleteMessage: async (messageId: string) => {
        try {
            await supabaseMessageRepository.delete(messageId);
            set(state => ({
                messages: state.messages.filter(m => m.id !== messageId),
            }));
            toast.success('Message deleted');
        } catch (error) {
            console.error('Failed to delete message:', error);
            toast.error('Failed to delete message');
        }
    },

    addReaction: async (messageId: string, emoji: string, userId: string) => {
        try {
            await supabaseMessageRepository.addReaction(messageId, emoji, userId);
            // Optimistically update UI
            set(state => ({
                messages: state.messages.map(m => {
                    if (m.id === messageId) {
                        const reactions = [...m.reactions];
                        const existing = reactions.find(r => r.emoji === emoji);
                        if (existing && !existing.userIds.includes(userId)) {
                            existing.userIds.push(userId);
                            existing.count++;
                        } else if (!existing) {
                            reactions.push({ emoji, userIds: [userId], count: 1 });
                        }
                        return { ...m, reactions };
                    }
                    return m;
                }),
            }));
        } catch (error) {
            console.error('Failed to add reaction:', error);
        }
    },

    removeReaction: async (messageId: string, emoji: string, userId: string) => {
        try {
            await supabaseMessageRepository.removeReaction(messageId, emoji, userId);
            // Optimistically update UI
            set(state => ({
                messages: state.messages.map(m => {
                    if (m.id === messageId) {
                        let reactions = [...m.reactions];
                        const existing = reactions.find(r => r.emoji === emoji);
                        if (existing) {
                            existing.userIds = existing.userIds.filter(id => id !== userId);
                            existing.count--;
                            if (existing.count === 0) {
                                reactions = reactions.filter(r => r.emoji !== emoji);
                            }
                        }
                        return { ...m, reactions };
                    }
                    return m;
                }),
            }));
        } catch (error) {
            console.error('Failed to remove reaction:', error);
        }
    },

    // Real-time subscriptions
    subscribeToChannelMessages: (channelId: string) => {
        const supabase = getSupabaseClient();
        const subscription = supabase
            .channel(`channel-${channelId}`)
            .on('postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `channel_id=eq.${channelId}`
                },
                (payload) => {
                    const newMessage = payload.new as any;
                    set(state => {
                        // Avoid duplicates
                        if (state.messages.some(m => m.id === newMessage.id)) {
                            return state;
                        }

                        const isCurrentChannel = state.currentChannel?.id === channelId;
                        const newCounts = new Map(state.unreadCounts);

                        if (!isCurrentChannel) {
                            // Increment unread count — user is not viewing this channel
                            newCounts.set(channelId, (newCounts.get(channelId) || 0) + 1);
                            return { unreadCounts: newCounts };
                        }

                        // User is viewing this channel — add message but no badge
                        return {
                            messages: [...state.messages, {
                                id: newMessage.id,
                                workspaceId: newMessage.workspace_id,
                                channelId: newMessage.channel_id,
                                senderId: newMessage.sender_id,
                                receiverId: newMessage.receiver_id,
                                content: newMessage.content,
                                parentMessageId: newMessage.parent_message_id,
                                threadCount: newMessage.thread_count || 0,
                                attachments: newMessage.attachments || [],
                                reactions: newMessage.reactions || [],
                                isEdited: newMessage.is_edited,
                                editedAt: newMessage.edited_at ? new Date(newMessage.edited_at) : undefined,
                                createdAt: new Date(newMessage.created_at),
                                updatedAt: new Date(newMessage.updated_at),
                                isDeleted: newMessage.is_deleted,
                            }],
                        };
                    });
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    },

    subscribeToDirectMessages: (conversationId: string) => {
        // Subscribe to DMs for this specific conversation.
        // We filter by the conversation's sender_id/receiver_id pair obtained from
        // the current conversation state so only relevant messages are appended.
        const supabase = getSupabaseClient();

        // Get conversation details from state to build proper filters
        const conversation = get().conversations.find(c => c.id === conversationId)
            || get().currentConversation;

        if (!conversation) {
            // Fallback: subscribe broadly and filter in handler
            const subscription = supabase
                .channel(`dm-${conversationId}`)
                .on('postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'messages' },
                    (payload) => {
                        const newMessage = payload.new as any;
                        if (newMessage.channel_id !== null) return; // Skip channel messages
                        set(state => {
                            if (state.messages.some(m => m.id === newMessage.id)) return state;
                            const conv = state.currentConversation;
                            if (!conv) return state;
                            // Only add if it belongs to this conversation
                            const belongs =
                                (newMessage.sender_id === conv.user1Id && newMessage.receiver_id === conv.user2Id) ||
                                (newMessage.sender_id === conv.user2Id && newMessage.receiver_id === conv.user1Id);
                            if (!belongs) return state;

                            const isCurrentConv = state.currentConversation?.id === conversationId;
                            const newCounts = new Map(state.unreadCounts);
                            if (!isCurrentConv) {
                                newCounts.set(conversationId, (newCounts.get(conversationId) || 0) + 1);
                                return { unreadCounts: newCounts };
                            }
                            return {
                                messages: [...state.messages, {
                                    id: newMessage.id,
                                    workspaceId: newMessage.workspace_id,
                                    channelId: newMessage.channel_id,
                                    senderId: newMessage.sender_id,
                                    receiverId: newMessage.receiver_id,
                                    content: newMessage.content,
                                    parentMessageId: newMessage.parent_message_id,
                                    threadCount: newMessage.thread_count || 0,
                                    attachments: newMessage.attachments || [],
                                    reactions: newMessage.reactions || [],
                                    isEdited: newMessage.is_edited,
                                    editedAt: newMessage.edited_at ? new Date(newMessage.edited_at) : undefined,
                                    createdAt: new Date(newMessage.created_at),
                                    updatedAt: new Date(newMessage.updated_at),
                                    isDeleted: newMessage.is_deleted,
                                }],
                            };
                        });
                    }
                )
                .subscribe();
            return () => { subscription.unsubscribe(); };
        }

        // Subscribe with sender/receiver filters so only messages for this conversation arrive.
        // Supabase realtime supports a single `filter` per subscription, so we create two
        // subscriptions — one per direction — and merge results.
        const user1 = conversation.user1Id;
        const user2 = conversation.user2Id;

        const handleNewMessage = (payload: any) => {
            const newMessage = payload.new as any;
            if (newMessage.channel_id !== null) return;
            set(state => {
                if (state.messages.some(m => m.id === newMessage.id)) return state;

                const isCurrentConv = state.currentConversation?.id === conversationId;
                const newCounts = new Map(state.unreadCounts);

                if (!isCurrentConv) {
                    // Increment unread count — user is not viewing this conversation
                    newCounts.set(conversationId, (newCounts.get(conversationId) || 0) + 1);
                    return { unreadCounts: newCounts };
                }

                // User is viewing this conversation — append message, no badge
                return {
                    messages: [...state.messages, {
                        id: newMessage.id,
                        workspaceId: newMessage.workspace_id,
                        channelId: newMessage.channel_id,
                        senderId: newMessage.sender_id,
                        receiverId: newMessage.receiver_id,
                        content: newMessage.content,
                        parentMessageId: newMessage.parent_message_id,
                        threadCount: newMessage.thread_count || 0,
                        attachments: newMessage.attachments || [],
                        reactions: newMessage.reactions || [],
                        isEdited: newMessage.is_edited,
                        editedAt: newMessage.edited_at ? new Date(newMessage.edited_at) : undefined,
                        createdAt: new Date(newMessage.created_at),
                        updatedAt: new Date(newMessage.updated_at),
                        isDeleted: newMessage.is_deleted,
                    }],
                };
            });
        };

        // Direction 1: user1 → user2
        const sub1 = supabase
            .channel(`dm-${conversationId}-fwd`)
            .on('postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `sender_id=eq.${user1}`,
                },
                (payload) => {
                    const msg = payload.new as any;
                    if (msg.receiver_id === user2) handleNewMessage(payload);
                }
            )
            .subscribe();

        // Direction 2: user2 → user1
        const sub2 = supabase
            .channel(`dm-${conversationId}-rev`)
            .on('postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `sender_id=eq.${user2}`,
                },
                (payload) => {
                    const msg = payload.new as any;
                    if (msg.receiver_id === user1) handleNewMessage(payload);
                }
            )
            .subscribe();

        return () => {
            sub1.unsubscribe();
            sub2.unsubscribe();
        };
    },

    // Subscribe to new DM conversations so the recipient's sidebar updates in real-time
    subscribeToNewConversations: (workspaceId: string, userId: string) => {
        const supabase = getSupabaseClient();

        const handleNewConversation = (payload: any) => {
            const row = payload.new as any;
            // Only handle conversations in this workspace involving this user
            if (row.workspace_id !== workspaceId) return;
            if (row.user1_id !== userId && row.user2_id !== userId) return;

            const newConversation: DirectMessageConversation = {
                id: row.id,
                workspaceId: row.workspace_id,
                user1Id: row.user1_id,
                user2Id: row.user2_id,
                createdAt: new Date(row.created_at),
                updatedAt: new Date(row.updated_at),
                lastMessageAt: row.last_message_at ? new Date(row.last_message_at) : undefined,
            };

            set(state => {
                // Avoid duplicates
                if (state.conversations.some(c => c.id === newConversation.id)) return state;
                // If this user did NOT create the conversation, set unread count to 1
                // so they know someone reached out to them
                const newCounts = new Map(state.unreadCounts);
                const isInitiator = row.user1_id === userId || row.user2_id === userId;
                // We mark as unread only if the current user is the recipient (not initiator).
                // Since we can't know who pressed "New Message" from the DB row alone,
                // we set 1 unread as a notification signal — it clears when they open the chat.
                newCounts.set(newConversation.id, 1);
                return { conversations: [newConversation, ...state.conversations], unreadCounts: newCounts };
            });
        };

        const handleUpdatedConversation = (payload: any) => {
            const row = payload.new as any;
            if (row.workspace_id !== workspaceId) return;
            if (row.user1_id !== userId && row.user2_id !== userId) return;

            set(state => ({
                conversations: state.conversations.map(c =>
                    c.id === row.id
                        ? { ...c, lastMessageAt: row.last_message_at ? new Date(row.last_message_at) : c.lastMessageAt, updatedAt: new Date(row.updated_at) }
                        : c
                ),
            }));
        };

        const subscription = supabase
            .channel(`new-dm-conversations-${userId}`)
            .on('postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'direct_message_conversations',
                    filter: `workspace_id=eq.${workspaceId}`,
                },
                handleNewConversation
            )
            .on('postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'direct_message_conversations',
                    filter: `workspace_id=eq.${workspaceId}`,
                },
                handleUpdatedConversation
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    },

    clearMessagingState: () => {
        set({
            channels: [],
            currentChannel: null,
            channelMembers: new Map(),
            conversations: [],
            currentConversation: null,
            messages: [],
            threadMessages: new Map(),
            unreadCounts: new Map(),
        });
    },
}));
