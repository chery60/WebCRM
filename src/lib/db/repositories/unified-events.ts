'use client';

/**
 * Unified Events Repository
 * 
 * This module exports a single events repository that uses either
 * Dexie or Supabase based on the USE_SUPABASE feature flag.
 */

import { USE_SUPABASE } from '../database';
import type { CalendarEvent, EventFormData } from '@/types';

// Import both repository implementations
import { eventsRepository as dexieEventsRepo } from './events';
import { eventsRepository as supabaseEventsRepo } from './supabase/events';

// Select the appropriate repository based on feature flag
const repo = USE_SUPABASE ? supabaseEventsRepo : dexieEventsRepo;

export const eventsRepository = {
    getAll: (): Promise<CalendarEvent[]> => repo.getAll(),
    getById: (id: string): Promise<CalendarEvent | undefined> => repo.getById(id),
    getEventsInRange: (start: Date, end: Date): Promise<CalendarEvent[]> => repo.getEventsInRange(start, end),
    create: (data: EventFormData): Promise<CalendarEvent | null> => repo.create(data),
    update: (id: string, updates: Partial<CalendarEvent>): Promise<void> => repo.update(id, updates),
    delete: (id: string): Promise<void> => repo.delete(id),

    // Supabase-specific methods (no-op for Dexie)
    bulkUpsert: async (events: CalendarEvent[]): Promise<void> => {
        if (USE_SUPABASE && 'bulkUpsert' in repo) {
            return (repo as typeof supabaseEventsRepo).bulkUpsert(events);
        }
        // Dexie fallback: use bulkPut which handles both insert and update
        const { db } = await import('../dexie');
        await db.events.bulkPut(events);
    },

    getBySource: async (source: string): Promise<CalendarEvent[]> => {
        if (USE_SUPABASE && 'getBySource' in repo) {
            return (repo as typeof supabaseEventsRepo).getBySource(source);
        }
        // Dexie fallback
        const all = await repo.getAll();
        return all.filter(e => e.source === source);
    },
};
