'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TaskRow } from '../task-row';
import { TaskStatusBadge } from '../task-status-badge';
import { BulkActionBar } from '../bulk-action-bar';
import { cn } from '@/lib/utils';
import type { Task, TaskStatus, TaskTab } from '@/types';
import {
    DndContext,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects,
    type DropAnimation,
    type DragEndEvent,
    type DragStartEvent,
    type DragOverEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    arrayMove,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { createPortal } from 'react-dom';

interface TaskListViewProps {
    tasksByStatus: Record<TaskStatus, Task[]>;
    users: { id: string; name: string; avatar?: string }[];
    tabs?: TaskTab[];
    onTaskClick: (task: Task) => void;
    onCreateTask: (status: TaskStatus) => void;
    onToggleComplete: (id: string, completed: boolean) => void;
    onStatusChange: (id: string, status: TaskStatus) => void;
    onProjectChange?: (id: string, projectId: string | undefined) => void;
    onEditTask: (task: Task) => void;
    onDuplicateTask: (id: string) => void;
    onDeleteTask: (id: string) => void;
    onReorderTasks: (items: { id: string; order: number; status: TaskStatus }[]) => void;
}

interface StatusSectionProps {
    status: TaskStatus;
    tasks: Task[];
    users: { id: string; name: string; avatar?: string }[];
    tabs?: TaskTab[];
    selectedTaskIds: Set<string>;
    onTaskClick: (task: Task) => void;
    onCreateTask: () => void;
    onToggleSelect: (id: string, selected: boolean) => void;
    onStatusChange: (id: string, status: TaskStatus) => void;
    onProjectChange?: (id: string, projectId: string | undefined) => void;
    onEditTask: (task: Task) => void;
    onDuplicateTask: (id: string) => void;
    onDeleteTask: (id: string) => void;
}

function StatusSection({
    status,
    tasks,
    users,
    tabs,
    selectedTaskIds,
    onTaskClick,
    onCreateTask,
    onToggleSelect,
    onStatusChange,
    onProjectChange,
    onEditTask,
    onDuplicateTask,
    onDeleteTask,
}: StatusSectionProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const { setNodeRef } = useDroppable({
        id: status,
    });

    const taskCountText = status === 'completed' ? `${tasks.length} completed tasks` : `${tasks.length} open tasks`;

    return (
        <div className="space-y-0">
            {/* Section Header */}
            <div
                className="flex items-center gap-3 py-3 px-4 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => setIsCollapsed(!isCollapsed)}
            >
                <button className="shrink-0">
                    {isCollapsed ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    )}
                </button>
                <TaskStatusBadge status={status} />
                <span className="text-sm text-muted-foreground">{taskCountText}</span>
            </div>

            {/* Create Task Button */}
            {!isCollapsed && (
                <Button
                    variant="ghost"
                    className="w-full justify-center gap-2 py-2 text-muted-foreground hover:text-foreground border-y border-dashed border-border"
                    onClick={onCreateTask}
                >
                    <Plus className="h-4 w-4" />
                    Create Task
                </Button>
            )}

            {/* Task Rows */}
            {!isCollapsed && (
                <div ref={setNodeRef} className={cn("min-h-[100px] transition-colors rounded-lg", tasks.length === 0 && "bg-muted/10 border-2 border-dashed border-muted/50")}>
                    <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                        <div className="divide-y divide-border/50">
                            {tasks.map((task) => (
                                <TaskRow
                                    key={task.id}
                                    task={task}
                                    assignees={users}
                                    tabs={tabs}
                                    isSelected={selectedTaskIds.has(task.id)}
                                    onToggleSelect={onToggleSelect}
                                    onClick={() => onTaskClick(task)}
                                    onStatusChange={onStatusChange}
                                    onProjectChange={onProjectChange}
                                    onEdit={() => onEditTask(task)}
                                    onDuplicate={() => onDuplicateTask(task.id)}
                                    onDelete={() => onDeleteTask(task.id)}
                                />
                            ))}
                        </div>
                    </SortableContext>
                    {tasks.length === 0 && (
                        <div className="h-full w-full flex items-center justify-center p-4 text-xs text-muted-foreground">
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
        styles: {
            active: {
                opacity: '0.5',
            },
        },
    }),
};

export function TaskListView({
    tasksByStatus,
    users,
    tabs,
    onTaskClick,
    onCreateTask,
    onToggleComplete,
    onStatusChange,
    onProjectChange,
    onEditTask,
    onDuplicateTask,
    onDeleteTask,
    onReorderTasks,
}: TaskListViewProps) {
    const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
    const [activeId, setActiveId] = useState<string | null>(null);

    // Local state for optimistic updates during drag
    const [optimisticTasks, setOptimisticTasks] = useState(tasksByStatus);

    // Sync optimistic state when props change (unless dragging)
    useEffect(() => {
        if (!activeId) {
            setOptimisticTasks(tasksByStatus);
        }
    }, [tasksByStatus, activeId]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleToggleSelect = (id: string, selected: boolean) => {
        const newSelected = new Set(selectedTaskIds);
        if (selected) {
            newSelected.add(id);
        } else {
            newSelected.delete(id);
        }
        setSelectedTaskIds(newSelected);
    };

    const handleClearSelection = () => {
        setSelectedTaskIds(new Set());
    };

    const handleBulkMarkComplete = () => {
        selectedTaskIds.forEach(id => {
            onToggleComplete(id, true);
        });
        handleClearSelection();
    };

    const handleBulkDelete = () => {
        selectedTaskIds.forEach(id => {
            onDeleteTask(id);
        });
        handleClearSelection();
    };

    const handleBulkStatusChange = (status: TaskStatus) => {
        selectedTaskIds.forEach(id => {
            onStatusChange(id, status);
        });
        handleClearSelection();
    };

    const findContainer = (id: string): TaskStatus | undefined => {
        if (id in optimisticTasks) return id as TaskStatus;
        return Object.keys(optimisticTasks).find((key) =>
            optimisticTasks[key as TaskStatus].find((t) => t.id === id)
        ) as TaskStatus | undefined;
    };

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        const activeContainer = findContainer(activeId);
        const overContainer = findContainer(overId);

        if (!activeContainer || !overContainer || activeContainer === overContainer) {
            return;
        }

        setOptimisticTasks((prev) => {
            const activeItems = prev[activeContainer];
            const overItems = prev[overContainer];
            const activeIndex = activeItems.findIndex((t) => t.id === activeId);
            const overIndex = overItems.findIndex((t) => t.id === overId);

            let newIndex;
            if (overId in prev) {
                // Determine if we're moving to an empty container or dropping on a specific status
                newIndex = overItems.length + 1;
            } else {
                const isBelowOverItem =
                    over &&
                    active.rect.current.translated &&
                    active.rect.current.translated.top > over.rect.top + over.rect.height;

                const modifier = isBelowOverItem ? 1 : 0;
                newIndex = overIndex >= 0 ? overIndex + modifier : overItems.length + 1;
            }

            return {
                ...prev,
                [activeContainer]: [
                    ...prev[activeContainer].filter((item) => item.id !== activeId),
                ],
                [overContainer]: [
                    ...prev[overContainer].slice(0, newIndex),
                    activeItems[activeIndex], // Move the entire task object
                    ...prev[overContainer].slice(newIndex, prev[overContainer].length),
                ],
            };
        });
    };


    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const id = active.id as string;
        const overId = over.id as string;

        // CRITICAL: Use original tasksByStatus to find where the task started,
        // not optimisticTasks which may have been modified by handleDragOver
        const findOriginalContainer = (taskId: string): TaskStatus | undefined => {
            if (tasksByStatus.planned.find(t => t.id === taskId)) return 'planned';
            if (tasksByStatus.upcoming.find(t => t.id === taskId)) return 'upcoming';
            if (tasksByStatus.completed.find(t => t.id === taskId)) return 'completed';
            return undefined;
        };

        const activeContainer = findOriginalContainer(id);
        const overContainer = findContainer(overId);

        if (!activeContainer || !overContainer) return;

        // Get the final state from optimisticTasks
        const newTasksState = { ...optimisticTasks };

        // Generate updates based on the final order
        const updates: { id: string; order: number; status: TaskStatus }[] = [];

        if (activeContainer === overContainer) {
            // Same container reordering
            const activeIndex = newTasksState[activeContainer].findIndex((t) => t.id === id);
            const overIndex = newTasksState[overContainer].findIndex((t) => t.id === overId);

            if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
                newTasksState[activeContainer] = arrayMove(
                    newTasksState[activeContainer],
                    activeIndex,
                    overIndex
                );

                // Update all tasks in this container with new order
                newTasksState[activeContainer].forEach((task, index) => {
                    updates.push({ id: task.id, order: index, status: activeContainer });
                });
            }
        } else {
            // Cross-container move - DragOver already updated optimisticTasks
            // Just persist the changes
            newTasksState[activeContainer].forEach((task, index) => {
                updates.push({ id: task.id, order: index, status: activeContainer });
            });

            newTasksState[overContainer].forEach((task, index) => {
                updates.push({ id: task.id, order: index, status: overContainer });
            });
        }

        if (updates.length > 0) {
            onReorderTasks(updates);
        }
    };

    const activeTask = activeId
        ? Object.values(tasksByStatus).flat().find(t => t.id === activeId)
        : null;

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <div className="divide-y divide-border pb-24">
                {(['planned', 'upcoming', 'completed'] as TaskStatus[]).map((status) => (

                    <StatusSection
                        key={status}
                        status={status}
                        tasks={optimisticTasks[status]}
                        users={users}
                        tabs={tabs}
                        selectedTaskIds={selectedTaskIds}
                        onTaskClick={onTaskClick}
                        onCreateTask={() => onCreateTask(status)}
                        onToggleSelect={handleToggleSelect}
                        onStatusChange={onStatusChange}
                        onProjectChange={onProjectChange}
                        onEditTask={onEditTask}
                        onDuplicateTask={onDuplicateTask}
                        onDeleteTask={onDeleteTask}
                    />
                ))}
            </div>

            <BulkActionBar
                selectedCount={selectedTaskIds.size}
                onClearSelection={handleClearSelection}
                onMarkComplete={handleBulkMarkComplete}
                onDelete={handleBulkDelete}
                onStatusChange={handleBulkStatusChange}
            />

            {createPortal(
                <DragOverlay dropAnimation={dropAnimation}>
                    {activeTask ? (
                        <div className="bg-background border border-border shadow-lg rounded-md opacity-90">
                            <TaskRow
                                task={activeTask}
                                assignees={users}
                                isSelected={selectedTaskIds.has(activeTask.id)}
                            />
                        </div>
                    ) : null}
                </DragOverlay>,
                document.body
            )}
        </DndContext>
    );
}
