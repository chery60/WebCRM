'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays } from 'date-fns';
import { useSession } from 'next-auth/react';
import { useQueryClient } from '@tanstack/react-query';
import { CalendarHeader, type CalendarViewType } from '@/components/calendar/calendar-header';
import { MonthlyView } from '@/components/calendar/views/monthly-view';
import { WeeklyView } from '@/components/calendar/views/weekly-view';
import { DailyView } from '@/components/calendar/views/daily-view';
import { CreateEventDrawer } from '@/components/calendar/create-event-drawer';
import { EventViewEditDrawer } from '@/components/calendar/event-view-edit-drawer';
import { useEvents, useCreateEvent, useUpdateEvent, useDeleteEvent } from '@/lib/hooks/use-events';
import { useCalendarStore } from '@/lib/stores/calendar-store';
import { toast } from 'sonner';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { CalendarEvent, EventFormData } from '@/types';

export default function CalendarPage() {
    const { data: session } = useSession();
    const queryClient = useQueryClient();
    const { syncGoogleCalendar, isSyncing, lastSyncedAt, setGoogleConnected } = useCalendarStore();
    const hasAutoSynced = useRef(false);
    
    const [currentDate, setCurrentDate] = useState(new Date()); // Always show current month/year
    const [view, setView] = useState<CalendarViewType>('monthly');
    const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>();
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
    const [eventToDelete, setEventToDelete] = useState<string | null>(null);

    // Helper function to sync and invalidate cache
    const syncAndRefresh = useCallback(async () => {
        const events = await syncGoogleCalendar();
        if (events.length > 0) {
            // Invalidate React Query cache to refresh the UI
            queryClient.invalidateQueries({ queryKey: ['events'] });
        }
        return events;
    }, [syncGoogleCalendar, queryClient]);

    // Auto-sync Google Calendar on page load if connected
    useEffect(() => {
        if (session?.accessToken && !hasAutoSynced.current && !isSyncing) {
            hasAutoSynced.current = true;
            setGoogleConnected(true);
            
            // Only auto-sync if last sync was more than 5 minutes ago
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
            if (!lastSyncedAt || new Date(lastSyncedAt) < fiveMinutesAgo) {
                syncAndRefresh();
            }
        }
    }, [session, syncAndRefresh, isSyncing, lastSyncedAt, setGoogleConnected]);

    // Periodic background sync every 5 minutes
    useEffect(() => {
        if (!session?.accessToken) return;

        const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes
        
        const intervalId = setInterval(() => {
            if (!isSyncing) {
                console.log('Background sync: Syncing Google Calendar...');
                syncAndRefresh();
            }
        }, SYNC_INTERVAL);

        return () => clearInterval(intervalId);
    }, [session, syncAndRefresh, isSyncing]);

    // Keyboard shortcuts
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        // Don't trigger shortcuts when typing in input fields
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
            return;
        }

        switch (e.key.toLowerCase()) {
            case 'c':
                // Create new event
                if (!e.metaKey && !e.ctrlKey) {
                    e.preventDefault();
                    setSelectedDate(new Date());
                    setIsCreateEventOpen(true);
                }
                break;
            case 't':
                // Go to today
                if (!e.metaKey && !e.ctrlKey) {
                    e.preventDefault();
                    setCurrentDate(new Date());
                    toast.info('Jumped to today');
                }
                break;
            case 'm':
                // Monthly view
                if (!e.metaKey && !e.ctrlKey) {
                    e.preventDefault();
                    setView('monthly');
                }
                break;
            case 'w':
                // Weekly view
                if (!e.metaKey && !e.ctrlKey) {
                    e.preventDefault();
                    setView('weekly');
                }
                break;
            case 'd':
                // Daily view
                if (!e.metaKey && !e.ctrlKey) {
                    e.preventDefault();
                    setView('daily');
                }
                break;
            case 'arrowleft':
                // Previous period
                e.preventDefault();
                switch (view) {
                    case 'monthly':
                        setCurrentDate(prev => subMonths(prev, 1));
                        break;
                    case 'weekly':
                        setCurrentDate(prev => subWeeks(prev, 1));
                        break;
                    case 'daily':
                        setCurrentDate(prev => subDays(prev, 1));
                        break;
                }
                break;
            case 'arrowright':
                // Next period
                e.preventDefault();
                switch (view) {
                    case 'monthly':
                        setCurrentDate(prev => addMonths(prev, 1));
                        break;
                    case 'weekly':
                        setCurrentDate(prev => addWeeks(prev, 1));
                        break;
                    case 'daily':
                        setCurrentDate(prev => addDays(prev, 1));
                        break;
                }
                break;
            case '?':
                // Show keyboard shortcuts help
                toast.info(
                    'Keyboard shortcuts: C = Create event, T = Today, M = Monthly, W = Weekly, D = Daily, ← → = Navigate',
                    { duration: 5000 }
                );
                break;
        }
    }, [view]);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    // Calculate date range based on current view
    const dateRange = useMemo(() => {
        switch (view) {
            case 'monthly': {
                const monthStart = startOfMonth(currentDate);
                const monthEnd = endOfMonth(currentDate);
                return {
                    start: startOfWeek(monthStart, { weekStartsOn: 0 }),
                    end: endOfWeek(monthEnd, { weekStartsOn: 0 }),
                };
            }
            case 'weekly': {
                return {
                    start: startOfWeek(currentDate, { weekStartsOn: 0 }),
                    end: endOfWeek(currentDate, { weekStartsOn: 0 }),
                };
            }
            case 'daily': {
                const dayStart = new Date(currentDate);
                dayStart.setHours(0, 0, 0, 0);
                const dayEnd = new Date(currentDate);
                dayEnd.setHours(23, 59, 59, 999);
                return { start: dayStart, end: dayEnd };
            }
        }
    }, [currentDate, view]);

    const { data: events = [], isLoading } = useEvents(dateRange);
    const createEvent = useCreateEvent();
    const deleteEvent = useDeleteEvent();
    const updateEvent = useUpdateEvent();

    const handleAddEvent = () => {
        setSelectedDate(undefined);
        setIsCreateEventOpen(true);
    };

    const handleDayClick = (date: Date) => {
        setSelectedDate(date);
        setIsCreateEventOpen(true);
    };

    const handleEventClick = (event: CalendarEvent) => {
        setSelectedEvent(event);
    };

    const handleDeleteEvent = (id: string) => {
        setEventToDelete(id);
    };

    const confirmDelete = async () => {
        if (eventToDelete) {
            // Find the event to check if it's from Google
            const event = events.find(e => e.id === eventToDelete);
            
            // Delete locally
            await deleteEvent.mutateAsync(eventToDelete);
            
            // If this is a Google event, also delete from Google Calendar
            if (session?.accessToken && event?.source === 'google') {
                try {
                    const response = await fetch(`/api/calendar/events/${eventToDelete}`, {
                        method: 'DELETE',
                    });
                    
                    if (response.ok) {
                        toast.success('Event deleted from Google Calendar');
                    }
                } catch (error) {
                    console.error('Failed to delete from Google:', error);
                    // Don't show error - local delete was successful
                }
            }
            
            setSelectedEvent(null);
            setEventToDelete(null);
        }
    };

    const handleSaveEvent = async (data: EventFormData) => {
        // Create event locally first
        const localEvent = await createEvent.mutateAsync(data);
        
        // If connected to Google, also create in Google Calendar
        if (session?.accessToken && localEvent) {
            try {
                const response = await fetch('/api/calendar/events', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                });
                
                if (response.ok) {
                    toast.success('Event synced to Google Calendar');
                }
            } catch (error) {
                console.error('Failed to sync to Google:', error);
                // Don't show error - local event was created successfully
            }
        }
    };

    const handleUpdateEvent = async (id: string, data: EventFormData) => {
        // Find the original event
        const originalEvent = events.find(e => e.id === id);
        
        // Update locally
        await updateEvent.mutateAsync({
            id,
            updates: {
                title: data.title,
                description: data.description,
                startTime: data.startTime,
                endTime: data.endTime,
                isAllDay: data.isAllDay,
                repeat: data.repeat,
                color: data.color,
                location: data.location,
                notifyBefore: data.notifyBefore,
                attachments: data.attachments,
            },
        });

        // If this is a Google event, also update in Google Calendar
        if (session?.accessToken && originalEvent?.source === 'google') {
            try {
                const response = await fetch(`/api/calendar/events/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                });
                
                if (response.ok) {
                    toast.success('Event updated and synced to Google Calendar');
                } else {
                    toast.success('Event updated locally');
                }
            } catch (error) {
                console.error('Failed to sync update to Google:', error);
                toast.success('Event updated locally');
            }
        } else {
            toast.success('Event updated successfully');
        }
        
        setSelectedEvent(null);
    };

    const handleEventReschedule = async (eventId: string, newStartTime: Date) => {
        // Find the event to calculate duration
        const event = events.find(e => e.id === eventId);
        if (!event) return;

        // Calculate the duration of the event
        const originalStart = new Date(event.startTime);
        const originalEnd = new Date(event.endTime);
        const duration = originalEnd.getTime() - originalStart.getTime();

        // Calculate new end time maintaining the same duration
        const newEndTime = new Date(newStartTime.getTime() + duration);

        // Update locally
        await updateEvent.mutateAsync({
            id: eventId,
            updates: {
                startTime: newStartTime,
                endTime: newEndTime,
            },
        });

        // If this is a Google event, also update in Google Calendar
        if (session?.accessToken && event.source === 'google') {
            try {
                const response = await fetch(`/api/calendar/events/${eventId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ...event,
                        startTime: newStartTime,
                        endTime: newEndTime,
                    }),
                });
                
                if (response.ok) {
                    toast.success('Event rescheduled and synced to Google');
                } else {
                    toast.success('Event rescheduled locally');
                }
            } catch (error) {
                console.error('Failed to sync reschedule to Google:', error);
                toast.success('Event rescheduled locally');
            }
        } else {
            toast.success('Event rescheduled successfully');
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        );
    }

    return (
        <div className="p-6">
            <CalendarHeader
                currentDate={currentDate}
                view={view}
                onDateChange={setCurrentDate}
                onViewChange={setView}
                onAddEvent={handleAddEvent}
            />

            {view === 'monthly' && (
                <MonthlyView
                    currentDate={currentDate}
                    events={events}
                    onEventClick={handleEventClick}
                    onDayClick={handleDayClick}
                    onEventReschedule={handleEventReschedule}
                />
            )}

            {view === 'weekly' && (
                <WeeklyView
                    currentDate={currentDate}
                    events={events}
                    onEventClick={handleEventClick}
                />
            )}

            {view === 'daily' && (
                <DailyView
                    currentDate={currentDate}
                    events={events}
                    onEventClick={handleEventClick}
                />
            )}

            <CreateEventDrawer
                open={isCreateEventOpen}
                onOpenChange={setIsCreateEventOpen}
                onSave={handleSaveEvent}
                initialDate={selectedDate}
            />

            <EventViewEditDrawer
                open={!!selectedEvent}
                onOpenChange={(open) => !open && setSelectedEvent(null)}
                event={selectedEvent}
                onSave={handleUpdateEvent}
                onDelete={handleDeleteEvent}
            />

            <AlertDialog open={!!eventToDelete} onOpenChange={(open) => !open && setEventToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Event</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this event? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
