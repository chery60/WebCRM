'use client';

import { getSupabaseClient } from '@/lib/supabase/client';
import type { CalendarEvent, EventFormData } from '@/types';

// Helper to get current user ID
async function getCurrentUserId(): Promise<string | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
}

// Helper to convert database row to CalendarEvent type
function rowToEvent(row: any): CalendarEvent {
    return {
        id: row.id,
        title: row.title,
        description: row.description || '',
        startTime: new Date(row.start_time),
        endTime: new Date(row.end_time),
        isAllDay: row.is_all_day,
        repeat: row.repeat,
        color: row.color,
        guests: row.guests || [],
        notifyBefore: row.notify_before,
        location: row.location,
        attachments: row.attachments || [],
        source: row.source,
        externalId: row.external_id,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        isDeleted: row.is_deleted,
    };
}

export const eventsRepository = {
    async getAll(): Promise<CalendarEvent[]> {
        const supabase = getSupabaseClient();
        if (!supabase) return [];

        const { data, error } = await supabase
            .from('calendar_events')
            .select('*')
            .eq('is_deleted', false);

        if (error) {
            console.error('Error fetching events:', error);
            return [];
        }

        return (data || []).map(rowToEvent);
    },

    async getById(id: string): Promise<CalendarEvent | undefined> {
        const supabase = getSupabaseClient();
        if (!supabase) return undefined;

        const { data, error } = await supabase
            .from('calendar_events')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !data) {
            console.error('Error fetching event:', error);
            return undefined;
        }

        return rowToEvent(data);
    },

    async getEventsInRange(start: Date, end: Date): Promise<CalendarEvent[]> {
        const supabase = getSupabaseClient();
        if (!supabase) return [];

        console.log('[EventsRepo] getEventsInRange called:', {
            start: start.toISOString(),
            end: end.toISOString(),
        });

        const { data, error } = await supabase
            .from('calendar_events')
            .select('*')
            .eq('is_deleted', false)
            .lt('start_time', end.toISOString())
            .gt('end_time', start.toISOString());

        if (error) {
            console.error('Error fetching events in range:', error);
            return [];
        }

        console.log('[EventsRepo] Filtered events count:', data?.length);

        return (data || []).map(rowToEvent);
    },

    async create(data: EventFormData): Promise<CalendarEvent | null> {
        const supabase = getSupabaseClient();
        if (!supabase) return null;

        const userId = await getCurrentUserId();
        if (!userId) {
            console.error('User not authenticated');
            return null;
        }

        const eventData = {
            title: data.title,
            description: data.description,
            start_time: data.startTime.toISOString(),
            end_time: data.endTime.toISOString(),
            is_all_day: data.isAllDay,
            repeat: data.repeat,
            color: data.color,
            guests: data.guests,
            notify_before: data.notifyBefore,
            location: data.location,
            attachments: data.attachments || [],
            source: 'local',
            user_id: userId,
            is_deleted: false,
        };

        const { data: insertedData, error } = await supabase
            .from('calendar_events')
            .insert(eventData)
            .select()
            .single();

        if (error || !insertedData) {
            console.error('Error creating event:', error);
            return null;
        }

        return rowToEvent(insertedData);
    },

    async update(id: string, updates: Partial<CalendarEvent>): Promise<void> {
        const supabase = getSupabaseClient();
        if (!supabase) return;

        const row: Record<string, any> = {};

        if (updates.title !== undefined) row.title = updates.title;
        if (updates.description !== undefined) row.description = updates.description;
        if (updates.startTime !== undefined) row.start_time = updates.startTime.toISOString();
        if (updates.endTime !== undefined) row.end_time = updates.endTime.toISOString();
        if (updates.isAllDay !== undefined) row.is_all_day = updates.isAllDay;
        if (updates.repeat !== undefined) row.repeat = updates.repeat;
        if (updates.color !== undefined) row.color = updates.color;
        if (updates.guests !== undefined) row.guests = updates.guests;
        if (updates.notifyBefore !== undefined) row.notify_before = updates.notifyBefore;
        if (updates.location !== undefined) row.location = updates.location;
        if (updates.attachments !== undefined) row.attachments = updates.attachments;

        // Don't make an update call if there's nothing to update
        if (Object.keys(row).length === 0) {
            return;
        }

        const { error } = await supabase
            .from('calendar_events')
            .update(row)
            .eq('id', id);

        if (error) {
            console.error('Error updating event:', error?.message || error?.code || JSON.stringify(error));
        }
    },

    async delete(id: string): Promise<void> {
        const supabase = getSupabaseClient();
        if (!supabase) return;

        const { error } = await supabase
            .from('calendar_events')
            .update({ is_deleted: true })
            .eq('id', id);

        if (error) {
            console.error('Error deleting event:', error);
        }
    },

    // Bulk operations for Google Calendar sync
    async bulkUpsert(events: CalendarEvent[]): Promise<void> {
        const supabase = getSupabaseClient();
        if (!supabase) return;

        const rows = events.map(event => ({
            id: event.id,
            title: event.title,
            description: event.description,
            start_time: event.startTime.toISOString(),
            end_time: event.endTime.toISOString(),
            is_all_day: event.isAllDay,
            repeat: event.repeat,
            color: event.color,
            guests: event.guests,
            notify_before: event.notifyBefore,
            location: event.location,
            attachments: event.attachments,
            source: event.source,
            external_id: event.externalId,
            is_deleted: event.isDeleted,
        }));

        const { error } = await supabase
            .from('calendar_events')
            .upsert(rows, { onConflict: 'id' });

        if (error) {
            console.error('Error bulk upserting events:', JSON.stringify(error, null, 2));
        }
    },

    // Get events by source (for sync)
    async getBySource(source: string): Promise<CalendarEvent[]> {
        const supabase = getSupabaseClient();
        if (!supabase) return [];

        const { data, error } = await supabase
            .from('calendar_events')
            .select('*')
            .eq('source', source)
            .eq('is_deleted', false);

        if (error) {
            console.error('Error fetching events by source:', error);
            return [];
        }

        return (data || []).map(rowToEvent);
    },
};
