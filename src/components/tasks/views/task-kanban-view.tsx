'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TaskCard } from '../task-card';
import { TaskStatusBadge } from '../task-status-badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    DndContext,
    DragOverlay,
    useSensor,
    useSensors,
    MouseSensor,
    TouchSensor,
    closestCorners,
    DragStartEvent,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task, TaskStatus } from '@/types';
import { cn } from '@/lib/utils';
import { createPortal } from 'react-dom';

interface TaskKanbanViewProps {
    tasksByStatus: Record<TaskStatus, Task[]>;
    users: { id: string; name: string; avatar?: string }[];
    onTaskClick: (task: Task) => void;
    onCreateTask: (status: TaskStatus) => void;
    onEditTask: (task: Task) => void;
    onDuplicateTask: (id: string) => void;
    onDeleteTask: (id: string) => void;
    onUpdateTaskStatus?: (taskId: string, newStatus: TaskStatus) => void;
}

interface SortableTaskCardProps {
    task: Task;
    users: { id: string; name: string; avatar?: string }[];
    onTaskClick: (task: Task) => void;
    onEditTask: (task: Task) => void;
    onDuplicateTask: (id: string) => void;
    onDeleteTask: (id: string) => void;
}

function SortableTaskCard({
    task,
    users,
    onTaskClick,
    onEditTask,
    onDuplicateTask,
    onDeleteTask,
}: SortableTaskCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: task.id,
        data: {
            type: 'Task',
            task,
        },
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    if (isDragging) {
        return (
            <div
                ref={setNodeRef}
                style={style}
                className="opacity-30 p-4 border-2 border-primary/20 border-dashed rounded-lg h-[150px]"
            />
        );
    }

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            <TaskCard
                task={task}
                assignees={users}
                onClick={() => onTaskClick(task)}
                onEdit={() => onEditTask(task)}
                onDuplicate={() => onDuplicateTask(task.id)}
                onDelete={() => onDeleteTask(task.id)}
            />
        </div>
    );
}

interface KanbanColumnProps {
    status: TaskStatus;
    tasks: Task[];
    users: { id: string; name: string; avatar?: string }[];
    onTaskClick: (task: Task) => void;
    onCreateTask: () => void;
    onEditTask: (task: Task) => void;
    onDuplicateTask: (id: string) => void;
    onDeleteTask: (id: string) => void;
}

function KanbanColumn({
    status,
    tasks,
    users,
    onTaskClick,
    onCreateTask,
    onEditTask,
    onDuplicateTask,
    onDeleteTask,
}: KanbanColumnProps) {
    const { setNodeRef } = useSortable({
        id: status,
        data: {
            type: 'Column',
            status,
        },
    });

    const taskCountText = status === 'completed' ? `${tasks.length} completed tasks` : `${tasks.length} open tasks`;

    return (
        <div className="flex-1 flex flex-col min-w-[350px] bg-muted/30 rounded-lg border border-border/50 h-full">
            {/* Column Header - Sticky */}
            <div className="sticky top-0 z-10 flex items-center gap-2 p-4 border-b border-border/50 bg-background/50 rounded-t-lg shrink-0">
                <TaskStatusBadge status={status} />
                <span className="text-sm text-muted-foreground">{taskCountText}</span>
            </div>

            {/* Create Task Button - Sticky */}
            <div className="sticky top-[57px] z-10 bg-muted/30 px-3 pt-3 pb-0 shrink-0">
                <Button
                    variant="ghost"
                    className="w-full justify-center gap-2 border border-dashed border-border hover:border-primary/50 hover:bg-background"
                    onClick={onCreateTask}
                >
                    <Plus className="h-4 w-4" />
                    Create Task
                </Button>
            </div>

            {/* Droppable Area - Scrollable */}
            <div ref={setNodeRef} className="flex-1 overflow-y-auto scrollbar-thin p-3 min-h-0">
                <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-3">
                        {tasks.map((task) => (
                            <SortableTaskCard
                                key={task.id}
                                task={task}
                                users={users}
                                onTaskClick={onTaskClick}
                                onEditTask={onEditTask}
                                onDuplicateTask={onDuplicateTask}
                                onDeleteTask={onDeleteTask}
                            />
                        ))}
                    </div>
                </SortableContext>
            </div>
        </div>
    );
}

export function TaskKanbanView({
    tasksByStatus,
    users,
    onTaskClick,
    onCreateTask,
    onEditTask,
    onDuplicateTask,
    onDeleteTask,
    onUpdateTaskStatus,
}: TaskKanbanViewProps) {
    const [activeTask, setActiveTask] = useState<Task | null>(null);

    const sensors = useSensors(
        useSensor(MouseSensor, {
            activationConstraint: {
                distance: 10,
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 250,
                tolerance: 5,
            },
        })
    );

    function onDragStart(event: DragStartEvent) {
        if (event.active.data.current?.type === 'Task') {
            setActiveTask(event.active.data.current.task);
        }
    }

    function onDragEnd(event: DragEndEvent) {
        const { active, over } = event;

        if (!over) {
            setActiveTask(null);
            return;
        }

        const activeId = active.id as string;
        // If dropped on a column, over.id is the status (e.g., 'planned')
        // If dropped on a card, inspect over.data.current to find status or handle reordering

        // Find the destination status
        let newStatus: TaskStatus | undefined;

        if (over.data.current?.type === 'Column') {
            newStatus = over.data.current.status as TaskStatus;
        } else if (over.data.current?.type === 'Task') {
            newStatus = over.data.current.task.status as TaskStatus;
        }

        // Only update if status changed
        if (newStatus && activeTask && activeTask.status !== newStatus) {
            onUpdateTaskStatus?.(activeId, newStatus);
        }

        setActiveTask(null);
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
        >
            <div className="flex gap-6 h-[calc(100vh-12rem)] overflow-x-auto pb-4">
                <KanbanColumn
                    status="planned"
                    tasks={tasksByStatus.planned}
                    users={users}
                    onTaskClick={onTaskClick}
                    onCreateTask={() => onCreateTask('planned')}
                    onEditTask={onEditTask}
                    onDuplicateTask={onDuplicateTask}
                    onDeleteTask={onDeleteTask}
                />
                <KanbanColumn
                    status="upcoming"
                    tasks={tasksByStatus.upcoming}
                    users={users}
                    onTaskClick={onTaskClick}
                    onCreateTask={() => onCreateTask('upcoming')}
                    onEditTask={onEditTask}
                    onDuplicateTask={onDuplicateTask}
                    onDeleteTask={onDeleteTask}
                />
                <KanbanColumn
                    status="completed"
                    tasks={tasksByStatus.completed}
                    users={users}
                    onTaskClick={onTaskClick}
                    onCreateTask={() => onCreateTask('completed')}
                    onEditTask={onEditTask}
                    onDuplicateTask={onDuplicateTask}
                    onDeleteTask={onDeleteTask}
                />
            </div>

            {createPortal(
                <DragOverlay>
                    {activeTask && (
                        <div className="rotate-2 cursor-grabbing">
                            <TaskCard
                                task={activeTask}
                                assignees={users}
                            />
                        </div>
                    )}
                </DragOverlay>,
                document.body
            )}
        </DndContext>
    );
}
