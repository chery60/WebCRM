import { db } from '../dexie';
import type { CalendarEvent, EventFormData } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { USE_SUPABASE } from '../database';
import { eventsRepository as supabaseEventsRepository } from './supabase/events';

// Helper to ensure a value is a Date object
function toDate(value: Date | string | number): Date {
    if (value instanceof Date) return value;
    return new Date(value);
}

// Helper to normalize event dates from database
function normalizeEventDates(event: CalendarEvent): CalendarEvent {
    return {
        ...event,
        startTime: toDate(event.startTime),
        endTime: toDate(event.endTime),
        createdAt: toDate(event.createdAt),
        updatedAt: toDate(event.updatedAt),
    };
}

const dexieEventsRepository = {
    async getAll(): Promise<CalendarEvent[]> {
        const events = await db.events.filter(e => !e.isDeleted).toArray();
        return events.map(normalizeEventDates);
    },

    async getById(id: string): Promise<CalendarEvent | undefined> {
        const event = await db.events.get(id);
        return event ? normalizeEventDates(event) : undefined;
    },

    async getEventsInRange(start: Date, end: Date): Promise<CalendarEvent[]> {
        const startTime = start.getTime();
        const endTime = end.getTime();

        const events = await db.events
            .filter(e => {
                if (e.isDeleted) return false;
                const eventStartTime = toDate(e.startTime).getTime();
                const eventEndTime = toDate(e.endTime).getTime();
                // Check for overlap: event starts before range ends AND event ends after range starts
                return eventStartTime < endTime && eventEndTime > startTime;
            })
            .toArray();

        return events.map(normalizeEventDates);
    },

    async create(data: EventFormData): Promise<CalendarEvent> {
        const now = new Date();
        const event: CalendarEvent = {
            id: uuidv4(),
            title: data.title,
            description: data.description,
            startTime: data.startTime,
            endTime: data.endTime,
            isAllDay: data.isAllDay,
            repeat: data.repeat,
            color: data.color,
            guests: data.guests,
            notifyBefore: data.notifyBefore,
            location: data.location,
            attachments: data.attachments || [],
            source: 'local',
            createdAt: now,
            updatedAt: now,
            isDeleted: false,
        };
        await db.events.add(event);
        return event;
    },

    async update(id: string, updates: Partial<CalendarEvent>): Promise<void> {
        await db.events.update(id, {
            ...updates,
            updatedAt: new Date(),
        });
    },

    async delete(id: string): Promise<void> {
        await db.events.update(id, {
            isDeleted: true,
            updatedAt: new Date(),
        });
    },
};

// Export the appropriate repository based on the database backend
export const eventsRepository = USE_SUPABASE ? supabaseEventsRepository : dexieEventsRepository;
