'use client';

import { create } from 'zustand';
import { v4 as uuidv4, v5 as uuidv5 } from 'uuid';
import { db } from '@/lib/db/dexie';
import { USE_SUPABASE } from '@/lib/db/database';
import { eventsRepository } from '@/lib/db/repositories/supabase/events';
import { getSupabaseClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { CalendarAccount, CalendarProvider, EventColor, CalendarEvent } from '@/types';

interface CalendarStore {
    accounts: CalendarAccount[];
    isLoading: boolean;
    isSyncing: boolean;
    isSyncDialogOpen: boolean;
    lastSyncedAt: Date | null;
    googleConnected: boolean;

    // Actions
    fetchAccounts: () => Promise<void>;
    connectAccount: (provider: CalendarProvider, email: string, name?: string) => Promise<CalendarAccount | null>;
    disconnectAccount: (accountId: string) => Promise<boolean>;
    toggleAccountVisibility: (accountId: string) => Promise<boolean>;
    updateAccountColor: (accountId: string, color: EventColor) => Promise<boolean>;
    syncAccount: (accountId: string) => Promise<boolean>;
    setSyncDialogOpen: (open: boolean) => void;

    // Google Calendar specific
    setGoogleConnected: (connected: boolean) => void;
    syncGoogleCalendar: () => Promise<CalendarEvent[]>;
    checkGoogleConnection: () => Promise<boolean>;

    // Getters
    getVisibleAccounts: () => CalendarAccount[];
    getAccountByProvider: (provider: CalendarProvider) => CalendarAccount | undefined;
}

// Provider display info
export const calendarProviders: Record<CalendarProvider, { name: string; icon: string; color: EventColor }> = {
    google: { name: 'Google Calendar', icon: 'google', color: 'blue' },
    outlook: { name: 'Outlook Calendar', icon: 'outlook', color: 'purple' },
    apple: { name: 'Apple Calendar', icon: 'apple', color: 'pink' },
    notion: { name: 'Notion Calendar', icon: 'notion', color: 'yellow' },
};

export const useCalendarStore = create<CalendarStore>((set, get) => ({
    accounts: [],
    isLoading: false,
    isSyncing: false,
    isSyncDialogOpen: false,
    lastSyncedAt: null,
    googleConnected: false,

    fetchAccounts: async () => {
        set({ isLoading: true });
        try {
            let accounts: CalendarAccount[];

            if (USE_SUPABASE) {
                const supabase = getSupabaseClient();
                if (supabase) {
                    const { data, error } = await supabase
                        .from('calendar_accounts')
                        .select('*');

                    if (error) {
                        console.error('Error fetching calendar accounts:', error);
                        accounts = [];
                    } else {
                        accounts = (data || []).map((row: any) => ({
                            id: row.id,
                            provider: row.provider,
                            email: row.email,
                            name: row.name,
                            color: row.color,
                            isConnected: row.is_connected,
                            isVisible: row.is_visible,
                            lastSyncedAt: row.last_synced_at ? new Date(row.last_synced_at) : null,
                            accessToken: row.access_token,
                            refreshToken: row.refresh_token,
                            createdAt: new Date(row.created_at),
                            updatedAt: new Date(row.updated_at),
                        }));
                    }
                } else {
                    accounts = [];
                }
            } else {
                accounts = await db.calendarAccounts.toArray();
            }

            set({ accounts, isLoading: false });
        } catch (error) {
            console.error('Error fetching calendar accounts:', error);
            set({ isLoading: false });
        }
    },

    connectAccount: async (provider, email, name) => {
        set({ isLoading: true });
        try {
            // Check if already connected
            const existing = await db.calendarAccounts.where('provider').equals(provider).first();
            if (existing) {
                toast.error(`${calendarProviders[provider].name} is already connected`);
                set({ isLoading: false });
                return null;
            }

            // Simulate OAuth flow delay
            await new Promise(resolve => setTimeout(resolve, 1500));

            const now = new Date();
            const newAccount: CalendarAccount = {
                id: uuidv4(),
                provider,
                email,
                name: name || `${calendarProviders[provider].name}`,
                color: calendarProviders[provider].color,
                isConnected: true,
                isVisible: true,
                lastSyncedAt: now,
                accessToken: `mock_token_${uuidv4()}`,
                refreshToken: `mock_refresh_${uuidv4()}`,
                createdAt: now,
                updatedAt: now,
            };

            await db.calendarAccounts.add(newAccount);

            set(state => ({
                accounts: [...state.accounts, newAccount],
                isLoading: false,
            }));

            toast.success(`Connected to ${calendarProviders[provider].name}`);
            return newAccount;
        } catch (error) {
            console.error('Error connecting calendar account:', error);
            toast.error('Failed to connect calendar');
            set({ isLoading: false });
            return null;
        }
    },

    disconnectAccount: async (accountId) => {
        try {
            const account = await db.calendarAccounts.get(accountId);
            if (!account) return false;

            await db.calendarAccounts.delete(accountId);

            set(state => ({
                accounts: state.accounts.filter(a => a.id !== accountId),
            }));

            toast.success(`Disconnected from ${calendarProviders[account.provider].name}`);
            return true;
        } catch (error) {
            console.error('Error disconnecting calendar account:', error);
            toast.error('Failed to disconnect calendar');
            return false;
        }
    },

    toggleAccountVisibility: async (accountId) => {
        try {
            const account = await db.calendarAccounts.get(accountId);
            if (!account) return false;

            const newVisibility = !account.isVisible;
            await db.calendarAccounts.update(accountId, {
                isVisible: newVisibility,
                updatedAt: new Date(),
            });

            set(state => ({
                accounts: state.accounts.map(a =>
                    a.id === accountId ? { ...a, isVisible: newVisibility } : a
                ),
            }));

            return true;
        } catch (error) {
            console.error('Error toggling calendar visibility:', error);
            return false;
        }
    },

    updateAccountColor: async (accountId, color) => {
        try {
            await db.calendarAccounts.update(accountId, {
                color,
                updatedAt: new Date(),
            });

            set(state => ({
                accounts: state.accounts.map(a =>
                    a.id === accountId ? { ...a, color } : a
                ),
            }));

            return true;
        } catch (error) {
            console.error('Error updating calendar color:', error);
            return false;
        }
    },

    syncAccount: async (accountId) => {
        try {
            const account = await db.calendarAccounts.get(accountId);
            if (!account || !account.isConnected) return false;

            // Simulate sync delay
            toast.loading(`Syncing ${calendarProviders[account.provider].name}...`, { id: 'sync' });
            await new Promise(resolve => setTimeout(resolve, 2000));

            const now = new Date();
            await db.calendarAccounts.update(accountId, {
                lastSyncedAt: now,
                updatedAt: now,
            });

            set(state => ({
                accounts: state.accounts.map(a =>
                    a.id === accountId ? { ...a, lastSyncedAt: now } : a
                ),
            }));

            toast.success(`${calendarProviders[account.provider].name} synced successfully`, { id: 'sync' });
            return true;
        } catch (error) {
            console.error('Error syncing calendar:', error);
            toast.error('Failed to sync calendar', { id: 'sync' });
            return false;
        }
    },

    setSyncDialogOpen: (open) => {
        set({ isSyncDialogOpen: open });
    },

    getVisibleAccounts: () => {
        return get().accounts.filter(a => a.isVisible && a.isConnected);
    },

    getAccountByProvider: (provider) => {
        return get().accounts.find(a => a.provider === provider);
    },

    // Google Calendar specific actions
    setGoogleConnected: (connected) => {
        set({ googleConnected: connected });
    },

    checkGoogleConnection: async () => {
        try {
            const response = await fetch('/api/calendar/sync');
            const data = await response.json();
            set({ googleConnected: data.connected });
            return data.connected;
        } catch (error) {
            console.error('Error checking Google connection:', error);
            set({ googleConnected: false });
            return false;
        }
    },

    syncGoogleCalendar: async () => {
        set({ isSyncing: true });

        try {
            const response = await fetch('/api/calendar/sync', {
                method: 'POST',
            });

            if (!response.ok) {
                if (response.status === 401) {
                    set({ googleConnected: false, isSyncing: false });
                    toast.error("Google Calendar session expired. Please sign in again to reconnect.");
                    return [];
                }
                const error = await response.json();
                throw new Error(error.error || 'Failed to sync');
            }

            const data = await response.json();
            const rawEvents = data.events || [];

            // Convert date strings to Date objects before storing
            // AND generate deterministic UUIDs for Supabase (which requires UUID type)
            // using the Google ID as seed.
            // This ensures we can upsert correctly without creating duplicates.
            const GOOGLE_EVENT_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'; // URL namespace UUID

            const events: CalendarEvent[] = rawEvents.map((event: any) => ({
                id: uuidv5(event.id, GOOGLE_EVENT_NAMESPACE), // Deterministic UUID
                title: event.title,
                description: event.description,
                startTime: new Date(event.startTime),
                endTime: new Date(event.endTime),
                isAllDay: event.isAllDay,
                location: event.location,
                status: event.status,
                htmlLink: event.htmlLink,
                source: 'google',
                externalId: event.id, // Store original Google ID here
                createdAt: event.createdAt ? new Date(event.createdAt) : new Date(),
                updatedAt: event.updatedAt ? new Date(event.updatedAt) : new Date(),
                isDeleted: false,
                color: 'blue', // Default color for Google events
                repeat: 'none',
                guests: [],
                notifyBefore: 15, // Default 15 min
                attachments: []
            }));

            // Store synced events using appropriate repository
            if (USE_SUPABASE) {
                // Use Supabase bulk upsert
                await eventsRepository.bulkUpsert(events);
            } else {
                // Use Dexie bulk operations
                const existingIds = new Set(
                    (await db.events.where('source').equals('google').toArray()).map(e => e.id)
                );

                const eventsToAdd: CalendarEvent[] = [];
                const eventsToUpdate: CalendarEvent[] = [];

                for (const event of events) {
                    if (existingIds.has(event.id)) {
                        eventsToUpdate.push(event);
                    } else {
                        eventsToAdd.push(event);
                    }
                }

                if (eventsToAdd.length > 0) {
                    await db.events.bulkAdd(eventsToAdd);
                }

                if (eventsToUpdate.length > 0) {
                    await db.events.bulkPut(eventsToUpdate);
                }
            }

            set({
                isSyncing: false,
                lastSyncedAt: new Date(),
                googleConnected: true,
            });

            toast.success(`Synced ${events.length} events from Google Calendar`);
            return events;
        } catch (error: any) {
            console.error('Error syncing Google Calendar:', error);
            set({ isSyncing: false });
            toast.error(error.message || 'Failed to sync Google Calendar');
            return [];
        }
    },
}));
