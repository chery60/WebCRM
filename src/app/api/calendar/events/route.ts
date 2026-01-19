import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { GoogleCalendarService } from '@/lib/services/google-calendar';

// Helper function to parse Google API errors
function parseGoogleApiError(error: any): { message: string; status: number } {
    // Check for Google API specific errors
    if (error?.response?.data?.error) {
        const googleError = error.response.data.error;
        
        if (googleError.code === 401 || googleError.status === 'UNAUTHENTICATED') {
            return {
                message: 'Your Google Calendar session has expired. Please sign out and sign in again.',
                status: 401
            };
        }
        
        if (googleError.code === 403 || googleError.status === 'PERMISSION_DENIED') {
            return {
                message: 'Permission denied. Please ensure you have granted calendar access permissions.',
                status: 403
            };
        }
        
        if (googleError.code === 429 || googleError.status === 'RESOURCE_EXHAUSTED') {
            return {
                message: 'Too many requests. Please wait a moment and try again.',
                status: 429
            };
        }

        return {
            message: googleError.message || 'An error occurred with Google Calendar',
            status: googleError.code || 500
        };
    }
    
    // Check for network errors
    if (error?.code === 'ENOTFOUND' || error?.code === 'ECONNREFUSED') {
        return {
            message: 'Unable to connect to Google Calendar. Please check your internet connection.',
            status: 503
        };
    }
    
    // Check for token expiration
    if (error?.message?.toLowerCase().includes('token') || 
        error?.message?.toLowerCase().includes('expired') ||
        error?.message?.toLowerCase().includes('invalid_grant')) {
        return {
            message: 'Your Google Calendar session has expired. Please sign out and sign in again.',
            status: 401
        };
    }

    return {
        message: error?.message || 'An unexpected error occurred',
        status: 500
    };
}

// GET - List all events from Google Calendar
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session) {
            return NextResponse.json(
                { 
                    error: 'Not signed in. Please sign in with your Google account first.',
                    code: 'NOT_SIGNED_IN'
                },
                { status: 401 }
            );
        }
        
        if (!session.accessToken) {
            return NextResponse.json(
                { 
                    error: 'No Google Calendar access token found. Please sign out and sign in again with Google.',
                    code: 'NO_ACCESS_TOKEN'
                },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const timeMin = searchParams.get('timeMin');
        const timeMax = searchParams.get('timeMax');

        const calendarService = new GoogleCalendarService(session.accessToken);
        const events = await calendarService.listEvents(
            timeMin ? new Date(timeMin) : undefined,
            timeMax ? new Date(timeMax) : undefined
        );

        return NextResponse.json({ 
            events,
            count: events.length
        });
    } catch (error: any) {
        console.error('Error fetching calendar events:', error);
        const parsedError = parseGoogleApiError(error);
        return NextResponse.json(
            { 
                error: parsedError.message,
                code: 'FETCH_EVENTS_FAILED'
            },
            { status: parsedError.status }
        );
    }
}

// POST - Create a new event in Google Calendar
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session) {
            return NextResponse.json(
                { 
                    error: 'Not signed in. Please sign in with your Google account first.',
                    code: 'NOT_SIGNED_IN'
                },
                { status: 401 }
            );
        }
        
        if (!session.accessToken) {
            return NextResponse.json(
                { 
                    error: 'No Google Calendar access token found. Please sign out and sign in again with Google.',
                    code: 'NO_ACCESS_TOKEN'
                },
                { status: 401 }
            );
        }

        const eventData = await request.json();
        
        // Validate required fields
        if (!eventData.title || !eventData.startTime || !eventData.endTime) {
            return NextResponse.json(
                { 
                    error: 'Missing required fields: title, startTime, and endTime are required.',
                    code: 'INVALID_EVENT_DATA'
                },
                { status: 400 }
            );
        }

        const calendarService = new GoogleCalendarService(session.accessToken);
        const createdEvent = await calendarService.createEvent(eventData);

        return NextResponse.json({ 
            event: createdEvent,
            success: true
        });
    } catch (error: any) {
        console.error('Error creating calendar event:', error);
        const parsedError = parseGoogleApiError(error);
        return NextResponse.json(
            { 
                error: parsedError.message,
                code: 'CREATE_EVENT_FAILED'
            },
            { status: parsedError.status }
        );
    }
}
