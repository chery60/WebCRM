'use client';

import { format } from 'date-fns';
import { Calendar, MessageSquare, LayoutList, MoreHorizontal, Paperclip } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TaskLabelBadge } from './task-label-badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Pencil, Copy, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Task } from '@/types';

interface TaskCardProps {
    task: Task;
    assignees?: { id: string; name: string; avatar?: string }[];
    onClick?: () => void;
    onEdit?: () => void;
    onDuplicate?: () => void;
    onDelete?: () => void;
}

export function TaskCard({
    task,
    assignees = [],
    onClick,
    onEdit,
    onDuplicate,
    onDelete,
}: TaskCardProps) {
    const taskAssignees = assignees.filter((a) => task.assignees.includes(a.id));
    const progress = task.subtaskProgress;
    const attachmentCount = task.attachments?.length ?? 0;
    const activityCommentCount = task.activities?.filter((a) => a.type === 'comment').length ?? 0;
    const commentCount = Math.max(task.commentCount ?? 0, activityCommentCount);

    return (
        <Card
            className="group cursor-pointer hover:shadow-md transition-shadow bg-background border-border py-0 gap-0"
            onClick={onClick}
        >
            <CardContent className="p-4 space-y-3">
                {/* Header: Labels + Actions */}
                <div className="flex items-start justify-between">
                    <div className="flex flex-wrap gap-1.5">
                        {task.labels.length > 0 ? (
                            task.labels.slice(0, 3).map((label) => (
                                <TaskLabelBadge key={label} label={label} />
                            ))
                        ) : (
                            <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium text-muted-foreground/50 border-transparent bg-muted/50">
                                No Label
                            </span>
                        )}
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity -mt-1 -mr-1 text-muted-foreground hover:text-foreground"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit?.(); }}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate?.(); }}>
                                <Copy className="mr-2 h-4 w-4" />
                                Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
                                className="text-destructive focus:text-destructive"
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Title */}
                <h3 className="text-sm font-medium leading-snug line-clamp-2">
                    {task.title}
                </h3>

                {/* Due Date + Progress */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                    {task.dueDate ? (
                        <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>Due Date {format(new Date(task.dueDate), 'dd MMM yyyy')}</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 opacity-50">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>No Due Date</span>
                        </div>
                    )}
                    {progress && progress.total > 0 && (
                        <div className="flex items-center gap-1.5 font-medium">
                            <LayoutList className="h-3.5 w-3.5" />
                            <span>{progress.completed}/{progress.total}</span>
                        </div>
                    )}
                </div>

                {/* Footer: Avatars + Metadata */}
                <div className="flex items-center justify-between pt-1 border-t border-border/50 mt-1">
                    {/* Assignees */}
                    <div className="flex items-center -space-x-2">
                        {taskAssignees.length > 0 ? (
                            taskAssignees.slice(0, 4).map((assignee) => (
                                <Avatar key={assignee.id} className="h-6 w-6 border-2 border-background ring-1 ring-background">
                                    <AvatarImage src={assignee.avatar} alt={assignee.name} />
                                    <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">
                                        {assignee.name
                                            .split(' ')
                                            .map((n) => n[0])
                                            .join('')}
                                    </AvatarFallback>
                                </Avatar>
                            ))
                        ) : (
                            <div className="h-6 w-6 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center bg-muted/30" title="Unassigned">
                                <span className="text-[10px] text-muted-foreground">?</span>
                            </div>
                        )}
                    </div>

                    {/* Stats (Attachments & Comments) */}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {attachmentCount > 0 && (
                            <span className="flex items-center gap-1">
                                <Paperclip className="h-3.5 w-3.5" />
                                {attachmentCount}
                            </span>
                        )}
                        {commentCount > 0 && (
                            <span className="flex items-center gap-1">
                                <MessageSquare className="h-3.5 w-3.5" />
                                {commentCount}
                            </span>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
