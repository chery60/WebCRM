'use client';

import { format } from 'date-fns';
import { Calendar } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { TaskLabelBadge } from './task-label-badge';
import { TaskActionsMenu } from './task-actions-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import type { Task, TaskStatus } from '@/types';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface TaskRowProps {
    task: Task;
    assignees?: { id: string; name: string; avatar?: string }[];
    isSelected?: boolean;
    onToggleSelect?: (id: string, selected: boolean) => void;
    onStatusChange?: (id: string, status: TaskStatus) => void;
    onClick?: () => void;
    onEdit?: () => void;
    onDuplicate?: () => void;
    onDelete?: () => void;
}

export function TaskRow({
    task,
    assignees = [],
    isSelected = false,
    onToggleSelect,
    onStatusChange,
    onClick,
    onEdit,
    onDuplicate,
    onDelete,
}: TaskRowProps) {
    const isCompleted = task.status === 'completed';

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: task.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    // Get assignee details for avatars
    const taskAssignees = assignees.filter((a) => task.assignees.includes(a.id));

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={cn(
                'group flex items-center gap-4 px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors border-b border-border/50',
                isSelected && 'bg-muted'
            )}
            onClick={onClick}
        >
            {/* Checkbox for Selection */}
            <Checkbox
                checked={isSelected}
                onCheckedChange={(checked) => {
                    onToggleSelect?.(task.id, checked as boolean);
                }}
                onClick={(e) => e.stopPropagation()}
                className="shrink-0"
            />

            {/* Title - No strikethrough */}
            <span
                className={cn(
                    'flex-1 text-sm font-medium truncate',
                    isCompleted && 'text-muted-foreground'
                )}
            >
                {task.title}
            </span>

            {/* Due Date */}
            {task.dueDate && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground shrink-0">
                    <Calendar className="h-4 w-4" />
                    <span>Due Date {format(new Date(task.dueDate), 'dd MMM yyyy')}</span>
                </div>
            )}

            {/* Labels */}
            <div className="flex items-center gap-1.5 shrink-0">
                {task.labels.slice(0, 3).map((label) => (
                    <TaskLabelBadge key={label} label={label} />
                ))}
            </div>

            {/* Assignees */}
            <div className="flex items-center -space-x-2 shrink-0">
                {taskAssignees.slice(0, 3).map((assignee) => (
                    <Avatar key={assignee.id} className="h-7 w-7 border-2 border-background">
                        <AvatarImage src={assignee.avatar} alt={assignee.name} />
                        <AvatarFallback className="text-xs">
                            {assignee.name
                                .split(' ')
                                .map((n) => n[0])
                                .join('')}
                        </AvatarFallback>
                    </Avatar>
                ))}
                {taskAssignees.length > 3 && (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-muted text-xs">
                        +{taskAssignees.length - 3}
                    </div>
                )}
            </div>

            {/* Status Dropdown */}
            <div onClick={(e) => e.stopPropagation()}>
                <Select
                    value={task.status}
                    onValueChange={(value) => onStatusChange?.(task.id, value as TaskStatus)}
                >
                    <SelectTrigger className="h-8 w-[110px] text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="planned">Planned</SelectItem>
                        <SelectItem value="upcoming">Ongoing</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Actions Menu */}
            <TaskActionsMenu
                onEdit={onEdit || (() => { })}
                onDuplicate={onDuplicate || (() => { })}
                onDelete={onDelete || (() => { })}
            />
        </div>
    );
}
