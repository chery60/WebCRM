'use client';

import { useState } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday, setHours, setMinutes } from 'date-fns';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, useDraggable, useDroppable, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { EventChip } from '../event-chip';
import type { CalendarEvent } from '@/types';

interface MonthlyViewProps {
    currentDate: Date;
    events: CalendarEvent[];
    onEventClick: (event: CalendarEvent) => void;
    onDayClick: (date: Date) => void;
    onEventReschedule?: (eventId: string, newDate: Date) => void;
}

// Draggable Event Component
function DraggableEvent({ event, onEventClick }: { event: CalendarEvent; onEventClick: (event: CalendarEvent) => void }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: event.id,
        data: { event },
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: isDragging ? 1000 : undefined,
        opacity: isDragging ? 0.5 : 1,
    } : undefined;

    return (
        <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
            <EventChip
                title={event.title}
                color={event.color}
                source={event.source}
                repeat={event.repeat}
                className={cn(isDragging && 'ring-2 ring-primary')}
                onClick={(e) => {
                    e?.stopPropagation();
                    onEventClick(event);
                }}
            />
        </div>
    );
}

// Droppable Day Cell Component
function DroppableDay({ 
    day, 
    dayEvents, 
    isCurrentMonth, 
    isCurrentDay, 
    index,
    onDayClick,
    onEventClick,
}: { 
    day: Date; 
    dayEvents: CalendarEvent[]; 
    isCurrentMonth: boolean; 
    isCurrentDay: boolean;
    index: number;
    onDayClick: (date: Date) => void;
    onEventClick: (event: CalendarEvent) => void;
}) {
    const { setNodeRef, isOver } = useDroppable({
        id: day.toISOString(),
        data: { date: day },
    });

    return (
        <div
            ref={setNodeRef}
            className={cn(
                'min-h-[120px] p-2 border-b border-r cursor-pointer transition-colors',
                !isCurrentMonth && 'bg-muted/10',
                index % 7 === 6 && 'border-r-0',
                isOver ? 'bg-primary/10 ring-2 ring-primary ring-inset' : 'hover:bg-muted/30'
            )}
            onClick={() => onDayClick(day)}
        >
            <div className={cn(
                'text-sm font-medium mb-1',
                !isCurrentMonth && 'text-muted-foreground',
                isCurrentDay && 'w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center'
            )}>
                {format(day, 'd')}
            </div>
            <div className="space-y-1">
                {dayEvents.slice(0, 3).map((event) => (
                    <DraggableEvent 
                        key={event.id} 
                        event={event} 
                        onEventClick={onEventClick}
                    />
                ))}
                {dayEvents.length > 3 && (
                    <div className="text-xs text-muted-foreground px-2">
                        +{dayEvents.length - 3} more
                    </div>
                )}
            </div>
        </div>
    );
}

export function MonthlyView({ currentDate, events, onEventClick, onDayClick, onEventReschedule }: MonthlyViewProps) {
    const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null);
    
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const getEventsForDay = (day: Date) => {
        return events.filter(event => isSameDay(new Date(event.startTime), day));
    };

    // Configure sensors for better drag experience
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Minimum drag distance before activation
            },
        })
    );

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        const draggedEvent = active.data.current?.event as CalendarEvent;
        setActiveEvent(draggedEvent);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveEvent(null);

        if (!over || !onEventReschedule) return;

        const draggedEvent = active.data.current?.event as CalendarEvent;
        const targetDate = over.data.current?.date as Date;

        if (!draggedEvent || !targetDate) return;

        // Check if dropped on a different day
        const originalDate = new Date(draggedEvent.startTime);
        if (!isSameDay(originalDate, targetDate)) {
            // Preserve the original time, just change the date
            const newStartTime = setMinutes(
                setHours(targetDate, originalDate.getHours()),
                originalDate.getMinutes()
            );
            onEventReschedule(draggedEvent.id, newStartTime);
        }
    };

    return (
        <DndContext 
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="border rounded-lg overflow-hidden">
                {/* Header row with weekday names */}
                <div className="grid grid-cols-7 bg-muted/50">
                    {weekDays.map((day) => (
                        <div key={day} className="px-4 py-3 text-sm font-medium text-muted-foreground text-center border-b">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7">
                    {days.map((day, index) => {
                        const dayEvents = getEventsForDay(day);
                        const isCurrentMonth = isSameMonth(day, currentDate);
                        const isCurrentDay = isToday(day);

                        return (
                            <DroppableDay
                                key={day.toISOString()}
                                day={day}
                                dayEvents={dayEvents}
                                isCurrentMonth={isCurrentMonth}
                                isCurrentDay={isCurrentDay}
                                index={index}
                                onDayClick={onDayClick}
                                onEventClick={onEventClick}
                            />
                        );
                    })}
                </div>
            </div>

            {/* Drag Overlay */}
            <DragOverlay>
                {activeEvent && (
                    <EventChip
                        title={activeEvent.title}
                        color={activeEvent.color}
                        source={activeEvent.source}
                        className="shadow-lg ring-2 ring-primary cursor-grabbing"
                    />
                )}
            </DragOverlay>
        </DndContext>
    );
}
