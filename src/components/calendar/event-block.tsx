'use client';

import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { EventColor, CalendarEvent } from '@/types';

interface EventBlockProps {
    event: CalendarEvent;
    className?: string;
    onClick?: () => void;
    showTime?: boolean;
}

const colorStyles: Record<EventColor, string> = {
    yellow: 'bg-yellow-100 border-l-yellow-500 text-yellow-900',
    green: 'bg-green-100 border-l-green-500 text-green-900',
    pink: 'bg-pink-100 border-l-pink-500 text-pink-900',
    purple: 'bg-purple-100 border-l-purple-500 text-purple-900',
    blue: 'bg-blue-100 border-l-blue-500 text-blue-900',
};

export function EventBlock({ event, className, onClick, showTime = true }: EventBlockProps) {
    return (
        <div
            className={cn(
                'px-2 py-1 rounded-r border-l-4 cursor-pointer hover:opacity-80 transition-opacity overflow-hidden',
                colorStyles[event.color],
                className
            )}
            onClick={onClick}
        >
            <div className="text-xs font-medium truncate">{event.title}</div>
            {showTime && (
                <div className="text-[10px] opacity-75">
                    {format(new Date(event.startTime), 'HH:mm')} - {format(new Date(event.endTime), 'HH:mm')}
                </div>
            )}
        </div>
    );
}
