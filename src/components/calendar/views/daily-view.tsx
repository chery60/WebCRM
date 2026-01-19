'use client';

import { format, isSameDay, isToday, getHours, getMinutes, differenceInMinutes } from 'date-fns';
import { cn } from '@/lib/utils';
import { EventBlock } from '../event-block';
import type { CalendarEvent } from '@/types';

interface DailyViewProps {
    currentDate: Date;
    events: CalendarEvent[];
    onEventClick: (event: CalendarEvent) => void;
}

const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => i); // 0:00 to 23:00
const SLOT_HEIGHT = 60; // pixels per hour

export function DailyView({ currentDate, events, onEventClick }: DailyViewProps) {
    const dayEvents = events.filter(event => {
        const eventStart = new Date(event.startTime);
        const eventEnd = new Date(event.endTime);
        const dayStart = new Date(currentDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(currentDate);
        dayEnd.setHours(23, 59, 59, 999);

        // Check for overlap: event starts before day ends AND event ends after day starts
        const matches = eventStart < dayEnd && eventEnd > dayStart;
        return matches;
    });

    // Sort events by start time
    const sortedEvents = [...dayEvents].sort((a, b) => {
        return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    });

    const isTodayView = isToday(currentDate);

    // Layout algorithm for overlapping events
    const layoutEvents = () => {
        const layout: { event: CalendarEvent; style: any }[] = [];
        const columns: CalendarEvent[][] = [];

        sortedEvents.forEach(event => {
            const start = new Date(event.startTime);
            const end = new Date(event.endTime);
            const startMin = getHours(start) * 60 + getMinutes(start);
            const endMin = getHours(end) * 60 + getMinutes(end);

            // Find first column where event fits
            let colIndex = 0;
            while (true) {
                const col = columns[colIndex] || [];
                const hasOverlap = col.some(placedEvent => {
                    const placeStart = new Date(placedEvent.startTime);
                    const placeEnd = new Date(placedEvent.endTime);
                    const placeStartMin = getHours(placeStart) * 60 + getMinutes(placeStart);
                    const placeEndMin = getHours(placeEnd) * 60 + getMinutes(placeEnd);
                    return startMin < placeEndMin && endMin > placeStartMin;
                });

                if (!hasOverlap) {
                    if (!columns[colIndex]) columns[colIndex] = [];
                    columns[colIndex].push(event);

                    // Calculate position
                    const duration = differenceInMinutes(end, start);
                    const top = startMin * (SLOT_HEIGHT / 60);
                    const height = Math.max(duration * (SLOT_HEIGHT / 60), SLOT_HEIGHT / 2);

                    layout.push({
                        event,
                        style: {
                            top: `${top}px`,
                            height: `${height}px`,
                            left: `${(colIndex / (columns.length + 1)) * 100}%`, // Temporary width calc
                            width: `${100}%`, // Will be adjusted later
                            colIndex
                        }
                    });
                    return;
                }
                colIndex++;
            }
        });

        // Adjust widths based on total columns in each overlap group would be complex.
        // For distinct visualization, we can just use simple column division.
        // A better approach: 
        // 1. Calculate max columns for the whole day? No, local max.
        // 2. Simple approach: width = 100 / (max_col_index + 1). 
        // But this shrinks everything if one busy hour exists.

        // Revised Simple Approach:
        // Use the columns array we built. The width of an event is 100% / columns.length ? No.
        // Let's stick to a simpler visual: Events overlapping share space.
        // If event is in col 0, left 0. If in col 1, left 50%...

        const maxCols = columns.length || 1;
        return layout.map(item => ({
            ...item,
            style: {
                ...item.style,
                width: `${100 / maxCols}%`,
                left: `${(item.style.colIndex / maxCols) * 100}%`
            }
        }));
    };

    const positionedEvents = layoutEvents();

    // Find current time position
    const now = new Date();
    const currentTimeTop = (getHours(now) * 60 + getMinutes(now)) * (SLOT_HEIGHT / 60);

    return (
        <div className="border rounded-lg overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 200px)' }}>
            {/* Header with day name */}
            <div className="grid grid-cols-[80px_1fr] bg-muted/50 border-b flex-shrink-0">
                <div className="px-4 py-3 border-r" /> {/* Time column header */}
                <div className={cn(
                    'px-4 py-3 text-center',
                    isTodayView && 'bg-primary/5'
                )}>
                    <div className="text-sm font-medium">
                        {format(currentDate, 'EEE d')}
                    </div>
                </div>
            </div>

            {/* Scrollable time grid */}
            <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-[80px_1fr] relative" style={{ minHeight: TIME_SLOTS.length * SLOT_HEIGHT }}>
                    {/* Time labels column */}
                    <div className="border-r w-20" style={{ height: TIME_SLOTS.length * SLOT_HEIGHT }}>
                        {TIME_SLOTS.map((hour) => (
                            <div key={hour} className="h-[60px] border-b last:border-b-0 relative">
                                <span className="absolute top-0 left-2 text-xs text-muted-foreground">
                                    {format(new Date(new Date().setHours(hour, 0, 0, 0)), 'HH:mm')}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Day column */}
                    <div className="relative" style={{ height: TIME_SLOTS.length * SLOT_HEIGHT }}>
                        {/* Time slot backgrounds */}
                        <div className="absolute inset-0">
                            {TIME_SLOTS.map((hour) => (
                                <div key={hour} className="h-[60px] border-b last:border-b-0" />
                            ))}
                        </div>

                        {/* Current time indicator */}
                        {isTodayView && currentTimeTop >= 0 && currentTimeTop <= TIME_SLOTS.length * SLOT_HEIGHT && (
                            <div
                                className="absolute left-0 right-0 flex items-center z-20 pointer-events-none"
                                style={{ top: currentTimeTop }}
                            >
                                <div className="w-2 h-2 rounded-full bg-red-500" />
                                <div className="flex-1 h-0.5 bg-red-500" />
                            </div>
                        )}

                        {/* Events */}
                        <div className="absolute inset-0 z-10 pointer-events-none overflow-visible">
                            {positionedEvents.map(({ event, style }) => {
                                // Skip events outside view (simplistic check, can be improved)
                                if (parseFloat(style.top) < 0 || parseFloat(style.top) > TIME_SLOTS.length * SLOT_HEIGHT) return null;

                                return (
                                    <div
                                        key={event.id}
                                        className="absolute pointer-events-auto border-l-2 border-background/20"
                                        style={style}
                                    >
                                        <EventBlock
                                            event={event}
                                            className="h-full"
                                            onClick={() => onEventClick(event)}
                                            showTime
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
