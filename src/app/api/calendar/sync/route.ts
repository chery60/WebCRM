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
        message: error?.message || 'Failed to sync calendar',
        status: 500
    };
}

// POST - Sync calendar (fetch all events and return calendar info)
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

        const calendarService = new GoogleCalendarService(session.accessToken);
        
        // Get calendar info and events in parallel
        const [calendarInfo, events] = await Promise.all([
            calendarService.getCalendarInfo(),
            calendarService.listEvents(),
        ]);

        return NextResponse.json({
            success: true,
            calendar: calendarInfo,
            events,
            syncedAt: new Date().toISOString(),
            eventCount: events.length,
        });
    } catch (error: any) {
        console.error('Error syncing calendar:', error);
        const parsedError = parseGoogleApiError(error);
        return NextResponse.json(
            { 
                error: parsedError.message,
                code: 'SYNC_FAILED'
            },
            { status: parsedError.status }
        );
    }
}

// GET - Get sync status / calendar info
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session) {
            return NextResponse.json({
                connected: false,
                error: 'Not signed in',
                code: 'NOT_SIGNED_IN'
            });
        }
        
        if (!session.accessToken) {
            return NextResponse.json({
                connected: false,
                error: 'No access token. Please sign in with Google again.',
                code: 'NO_ACCESS_TOKEN'
            });
        }

        const calendarService = new GoogleCalendarService(session.accessToken);
        const calendarInfo = await calendarService.getCalendarInfo();

        return NextResponse.json({
            connected: true,
            calendar: calendarInfo,
            email: session.user?.email,
        });
    } catch (error: any) {
        console.error('Error getting sync status:', error);
        const parsedError = parseGoogleApiError(error);
        return NextResponse.json({
            connected: false,
            error: parsedError.message,
            code: 'CONNECTION_CHECK_FAILED'
        });
    }
}
