'use client';

import { cn } from '@/lib/utils';

// Task label colors matching Figma design
const labelColors: Record<string, { bg: string; text: string }> = {
    Internal: { bg: 'bg-red-100', text: 'text-red-600' },
    Marketing: { bg: 'bg-pink-100', text: 'text-pink-600' },
    Urgent: { bg: 'bg-yellow-100', text: 'text-yellow-600' },
    Report: { bg: 'bg-red-100', text: 'text-red-600' },
    Event: { bg: 'bg-amber-100', text: 'text-amber-600' },
    Document: { bg: 'bg-blue-100', text: 'text-blue-600' },
};

interface TaskLabelBadgeProps {
    label: string;
    className?: string;
}

export function TaskLabelBadge({ label, className }: TaskLabelBadgeProps) {
    const colors = labelColors[label] || { bg: 'bg-gray-100', text: 'text-gray-600' };

    return (
        <span
            className={cn(
                'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
                colors.bg,
                colors.text,
                className
            )}
        >
            {label}
        </span>
    );
}
