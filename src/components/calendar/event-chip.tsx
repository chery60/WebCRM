'use client';

import { cn } from '@/lib/utils';
import type { EventColor, EventSource } from '@/types';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

interface EventChipProps {
    title: string;
    color: EventColor;
    source?: EventSource;
    repeat?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
    className?: string;
    onClick?: (e?: React.MouseEvent<HTMLDivElement>) => void;
}

const colorStyles: Record<EventColor, string> = {
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    green: 'bg-green-100 text-green-800 border-green-200',
    pink: 'bg-pink-100 text-pink-800 border-pink-200',
    purple: 'bg-purple-100 text-purple-800 border-purple-200',
    blue: 'bg-blue-100 text-blue-800 border-blue-200',
};

const sourceIndicators: Record<EventSource, { icon: string; label: string }> = {
    local: { icon: '📅', label: 'Local' },
    google: { icon: '🔵', label: 'Google Calendar' },
    outlook: { icon: '🟣', label: 'Outlook' },
    apple: { icon: '🍎', label: 'Apple Calendar' },
    notion: { icon: '📝', label: 'Notion' },
};

export function EventChip({ title, color, source = 'local', repeat = 'none', className, onClick }: EventChipProps) {
    const sourceInfo = sourceIndicators[source];
    const showSourceIndicator = source !== 'local';
    const isRecurring = repeat !== 'none';

    const repeatLabels: Record<string, string> = {
        daily: 'Repeats daily',
        weekly: 'Repeats weekly',
        monthly: 'Repeats monthly',
        yearly: 'Repeats yearly',
    };

    return (
        <TooltipProvider delayDuration={300}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div
                        className={cn(
                            'px-2 py-0.5 rounded text-xs font-medium truncate cursor-pointer border flex items-center gap-1',
                            colorStyles[color],
                            className
                        )}
                        onClick={onClick}
                    >
                        {showSourceIndicator && (
                            <span className="text-[10px] shrink-0">{sourceInfo.icon}</span>
                        )}
                        {isRecurring && (
                            <span className="text-[10px] shrink-0">🔄</span>
                        )}
                        <span className="truncate">{title}</span>
                    </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                    <div className="font-medium">{title}</div>
                    {showSourceIndicator && (
                        <div className="text-muted-foreground">
                            From {sourceInfo.label}
                        </div>
                    )}
                    {isRecurring && (
                        <div className="text-muted-foreground">
                            {repeatLabels[repeat]}
                        </div>
                    )}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
