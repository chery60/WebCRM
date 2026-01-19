'use client';

import { cn } from '@/lib/utils';
import type { TaskStatus } from '@/types';

interface TaskStatusBadgeProps {
    status: TaskStatus;
    showText?: boolean;
    className?: string;
}

const statusConfig: Record<TaskStatus, { color: string; bgColor: string; label: string }> = {
    planned: {
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-500',
        label: 'Planned',
    },
    upcoming: {
        color: 'text-blue-600',
        bgColor: 'bg-blue-500',
        label: 'Upcoming',
    },
    completed: {
        color: 'text-green-600',
        bgColor: 'bg-green-500',
        label: 'Completed',
    },
};

export function TaskStatusBadge({
    status,
    showText = true,
    className,
}: TaskStatusBadgeProps) {
    const config = statusConfig[status];

    return (
        <div className={cn('flex items-center gap-2', className)}>
            <div className={cn('h-2 w-2 rounded-full', config.bgColor)} />
            {showText && (
                <span className={cn('text-sm font-medium', config.color)}>
                    {config.label}
                </span>
            )}
        </div>
    );
}
