import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { GoogleCalendarService } from '@/lib/services/google-calendar';

type RouteParams = { params: Promise<{ eventId: string }> };

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
        
        if (googleError.code === 404 || googleError.status === 'NOT_FOUND') {
            return {
                message: 'Event not found. It may have been deleted from Google Calendar.',
                status: 404
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

// GET - Get a single event
export async function GET(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const { eventId } = await params;
        
        if (!eventId) {
            return NextResponse.json(
                { 
                    error: 'Event ID is required.',
                    code: 'MISSING_EVENT_ID'
                },
                { status: 400 }
            );
        }
        
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

        const calendarService = new GoogleCalendarService(session.accessToken);
        const event = await calendarService.getEvent(eventId);

        if (!event) {
            return NextResponse.json(
                { 
                    error: 'Event not found. It may have been deleted from Google Calendar.',
                    code: 'EVENT_NOT_FOUND'
                },
                { status: 404 }
            );
        }

        return NextResponse.json({ event });
    } catch (error: any) {
        console.error('Error fetching event:', error);
        const parsedError = parseGoogleApiError(error);
        return NextResponse.json(
            { 
                error: parsedError.message,
                code: 'FETCH_EVENT_FAILED'
            },
            { status: parsedError.status }
        );
    }
}

// PUT - Update an event
export async function PUT(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const { eventId } = await params;
        
        if (!eventId) {
            return NextResponse.json(
                { 
                    error: 'Event ID is required.',
                    code: 'MISSING_EVENT_ID'
                },
                { status: 400 }
            );
        }
        
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
        const calendarService = new GoogleCalendarService(session.accessToken);
        const updatedEvent = await calendarService.updateEvent(eventId, eventData);

        return NextResponse.json({ 
            event: updatedEvent,
            success: true
        });
    } catch (error: any) {
        console.error('Error updating event:', error);
        const parsedError = parseGoogleApiError(error);
        return NextResponse.json(
            { 
                error: parsedError.message,
                code: 'UPDATE_EVENT_FAILED'
            },
            { status: parsedError.status }
        );
    }
}

// DELETE - Delete an event
export async function DELETE(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const { eventId } = await params;
        
        if (!eventId) {
            return NextResponse.json(
                { 
                    error: 'Event ID is required.',
                    code: 'MISSING_EVENT_ID'
                },
                { status: 400 }
            );
        }
        
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

        const calendarService = new GoogleCalendarService(session.accessToken);
        await calendarService.deleteEvent(eventId);

        return NextResponse.json({ 
            success: true,
            message: 'Event deleted successfully'
        });
    } catch (error: any) {
        console.error('Error deleting event:', error);
        const parsedError = parseGoogleApiError(error);
        return NextResponse.json(
            { 
                error: parsedError.message,
                code: 'DELETE_EVENT_FAILED'
            },
            { status: parsedError.status }
        );
    }
}
