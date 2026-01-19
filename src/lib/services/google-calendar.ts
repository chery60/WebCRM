import { google, calendar_v3 } from 'googleapis';
import type { CalendarEvent, EventColor, EventRepeat } from '@/types';
import { v4 as uuidv4 } from 'uuid';

// Color mapping from Google Calendar to our app
const googleColorToAppColor: Record<string, EventColor> = {
    '1': 'blue',    // Lavender -> blue
    '2': 'green',   // Sage -> green
    '3': 'purple',  // Grape -> purple
    '4': 'pink',    // Flamingo -> pink
    '5': 'yellow',  // Banana -> yellow
    '6': 'yellow',  // Tangerine -> yellow
    '7': 'blue',    // Peacock -> blue
    '8': 'purple',  // Graphite -> purple
    '9': 'blue',    // Blueberry -> blue
    '10': 'green',  // Basil -> green
    '11': 'pink',   // Tomato -> pink
};

const appColorToGoogleColor: Record<EventColor, string> = {
    'blue': '9',
    'green': '10',
    'purple': '3',
    'pink': '4',
    'yellow': '5',
};

// Map Google recurrence to our repeat type
function parseRecurrence(recurrence: string[] | undefined): EventRepeat {
    if (!recurrence || recurrence.length === 0) return 'none';
    
    const rule = recurrence[0];
    if (rule.includes('DAILY')) return 'daily';
    if (rule.includes('WEEKLY')) return 'weekly';
    if (rule.includes('MONTHLY')) return 'monthly';
    if (rule.includes('YEARLY')) return 'yearly';
    return 'none';
}

// Create recurrence rule for Google Calendar
function createRecurrenceRule(repeat: EventRepeat): string[] | undefined {
    switch (repeat) {
        case 'daily':
            return ['RRULE:FREQ=DAILY'];
        case 'weekly':
            return ['RRULE:FREQ=WEEKLY'];
        case 'monthly':
            return ['RRULE:FREQ=MONTHLY'];
        case 'yearly':
            return ['RRULE:FREQ=YEARLY'];
        default:
            return undefined;
    }
}

// Convert Google Calendar event to our CalendarEvent type
export function googleEventToCalendarEvent(event: calendar_v3.Schema$Event): CalendarEvent | null {
    if (!event.id || !event.summary) return null;

    const startTime = event.start?.dateTime || event.start?.date;
    const endTime = event.end?.dateTime || event.end?.date;

    if (!startTime || !endTime) return null;

    const isAllDay = !event.start?.dateTime;

    return {
        id: event.id,
        title: event.summary,
        description: event.description || '',
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        isAllDay,
        location: event.location || null,
        color: googleColorToAppColor[event.colorId || '9'] || 'blue',
        repeat: parseRecurrence(event.recurrence as string[] | undefined),
        source: 'google',
        guests: [],
        notifyBefore: null,
        attachments: [],
        externalId: event.id,
        createdAt: event.created ? new Date(event.created) : new Date(),
        updatedAt: event.updated ? new Date(event.updated) : new Date(),
        isDeleted: false,
    };
}

// Convert our CalendarEvent to Google Calendar event format
export function calendarEventToGoogleEvent(event: Partial<CalendarEvent>): calendar_v3.Schema$Event {
    const googleEvent: calendar_v3.Schema$Event = {
        summary: event.title,
        description: event.description,
        location: event.location,
        colorId: event.color ? appColorToGoogleColor[event.color] : '9',
    };

    if (event.isAllDay) {
        googleEvent.start = {
            date: event.startTime ? new Date(event.startTime).toISOString().split('T')[0] : undefined,
        };
        googleEvent.end = {
            date: event.endTime ? new Date(event.endTime).toISOString().split('T')[0] : undefined,
        };
    } else {
        googleEvent.start = {
            dateTime: event.startTime ? new Date(event.startTime).toISOString() : undefined,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        };
        googleEvent.end = {
            dateTime: event.endTime ? new Date(event.endTime).toISOString() : undefined,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        };
    }

    if (event.repeat && event.repeat !== 'none') {
        googleEvent.recurrence = createRecurrenceRule(event.repeat);
    }

    return googleEvent;
}

// Create OAuth2 client with access token
export function createOAuth2Client(accessToken: string) {
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
    );
    oauth2Client.setCredentials({ access_token: accessToken });
    return oauth2Client;
}

// Google Calendar Service class
export class GoogleCalendarService {
    private calendar: calendar_v3.Calendar;

    constructor(accessToken: string) {
        const auth = createOAuth2Client(accessToken);
        this.calendar = google.calendar({ version: 'v3', auth });
    }

    // List all events from primary calendar
    async listEvents(timeMin?: Date, timeMax?: Date, maxResults: number = 250): Promise<CalendarEvent[]> {
        try {
            const response = await this.calendar.events.list({
                calendarId: 'primary',
                timeMin: timeMin?.toISOString() || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Default: 30 days ago
                timeMax: timeMax?.toISOString() || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // Default: 90 days ahead
                maxResults,
                singleEvents: true,
                orderBy: 'startTime',
            });

            const events = response.data.items || [];
            return events
                .map(googleEventToCalendarEvent)
                .filter((e): e is CalendarEvent => e !== null);
        } catch (error) {
            console.error('Error fetching Google Calendar events:', error);
            throw error;
        }
    }

    // Get a single event
    async getEvent(eventId: string): Promise<CalendarEvent | null> {
        try {
            const response = await this.calendar.events.get({
                calendarId: 'primary',
                eventId,
            });
            return googleEventToCalendarEvent(response.data);
        } catch (error) {
            console.error('Error fetching Google Calendar event:', error);
            throw error;
        }
    }

    // Create a new event
    async createEvent(event: Partial<CalendarEvent>): Promise<CalendarEvent | null> {
        try {
            const googleEvent = calendarEventToGoogleEvent(event);
            const response = await this.calendar.events.insert({
                calendarId: 'primary',
                requestBody: googleEvent,
            });
            return googleEventToCalendarEvent(response.data);
        } catch (error) {
            console.error('Error creating Google Calendar event:', error);
            throw error;
        }
    }

    // Update an existing event
    async updateEvent(eventId: string, event: Partial<CalendarEvent>): Promise<CalendarEvent | null> {
        try {
            const googleEvent = calendarEventToGoogleEvent(event);
            const response = await this.calendar.events.update({
                calendarId: 'primary',
                eventId,
                requestBody: googleEvent,
            });
            return googleEventToCalendarEvent(response.data);
        } catch (error) {
            console.error('Error updating Google Calendar event:', error);
            throw error;
        }
    }

    // Delete an event
    async deleteEvent(eventId: string): Promise<boolean> {
        try {
            await this.calendar.events.delete({
                calendarId: 'primary',
                eventId,
            });
            return true;
        } catch (error) {
            console.error('Error deleting Google Calendar event:', error);
            throw error;
        }
    }

    // Get calendar info
    async getCalendarInfo(): Promise<{ id: string; summary: string; timeZone: string } | null> {
        try {
            const response = await this.calendar.calendars.get({
                calendarId: 'primary',
            });
            return {
                id: response.data.id || 'primary',
                summary: response.data.summary || 'Primary Calendar',
                timeZone: response.data.timeZone || 'UTC',
            };
        } catch (error) {
            console.error('Error fetching calendar info:', error);
            throw error;
        }
    }
}
