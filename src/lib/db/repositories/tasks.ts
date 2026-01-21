'use client';

import { db } from '../dexie';
import type { Task, TaskFormData, TasksFilter, TasksSort, TaskStatus } from '@/types';
import { v4 as uuidv4 } from 'uuid';

// Get all tasks with optional filtering and sorting
export async function getTasks(
    filter?: TasksFilter,
    sort?: TasksSort
): Promise<Task[]> {
    let query = db.tasks.filter((task) => !task.isDeleted);

    // Apply filters
    if (filter?.status?.length) {
        const originalQuery = query;
        query = originalQuery.and((task) => filter.status!.includes(task.status));
    }

    if (filter?.labels?.length) {
        const originalQuery = query;
        query = originalQuery.and((task) =>
            task.labels.some((label) => filter.labels!.includes(label))
        );
    }

    if (filter?.assignees?.length) {
        const originalQuery = query;
        query = originalQuery.and((task) =>
            task.assignees.some((assignee) => filter.assignees!.includes(assignee))
        );
    }

    if (filter?.projectId !== undefined) {
        const originalQuery = query;
        query = originalQuery.and((task) => task.projectId === filter.projectId);
    }

    if (filter?.search) {
        const searchLower = filter.search.toLowerCase();
        const originalQuery = query;
        query = originalQuery.and(
            (task) =>
                task.title.toLowerCase().includes(searchLower) ||
                task.description.toLowerCase().includes(searchLower)
        );
    }

    let tasks = await query.toArray();

    // Apply sorting
    if (sort) {
        tasks = tasks.sort((a, b) => {
            let aVal: unknown = a[sort.field];
            let bVal: unknown = b[sort.field];

            // Handle null dates
            if (sort.field === 'dueDate') {
                aVal = aVal ? new Date(aVal as Date).getTime() : Infinity;
                bVal = bVal ? new Date(bVal as Date).getTime() : Infinity;
            } else if (aVal instanceof Date) {
                aVal = aVal.getTime();
                bVal = (bVal as Date).getTime();
            }

            if (typeof aVal === 'string') {
                return sort.direction === 'asc'
                    ? aVal.localeCompare(bVal as string)
                    : (bVal as string).localeCompare(aVal);
            }

            return sort.direction === 'asc'
                ? (aVal as number) - (bVal as number)
                : (bVal as number) - (aVal as number);
        });
    } else {
        // Default sort by order asc, then specific business logic if needed
        tasks = tasks.sort((a, b) => (a.order || 0) - (b.order || 0));
    }

    return tasks;
}

// Get tasks grouped by status
export async function getTasksByStatus(filter?: TasksFilter): Promise<Record<TaskStatus, Task[]>> {
    const allTasks = await getTasks(filter);

    return {
        planned: allTasks.filter((t) => t.status === 'planned'),
        upcoming: allTasks.filter((t) => t.status === 'upcoming'),
        completed: allTasks.filter((t) => t.status === 'completed'),
    };
}

// Get a single task by ID
export async function getTaskById(id: string): Promise<Task | undefined> {
    return db.tasks.get(id);
}

// Create a new task
export async function createTask(data: TaskFormData): Promise<Task> {
    const now = new Date();

    // Get highest order for the status
    const existingTasks = await db.tasks
        .where('status')
        .equals(data.status)
        .toArray();

    const maxOrder = existingTasks.reduce((max, t) => Math.max(max, t.order || 0), -1);

    const task: Task = {
        id: uuidv4(),
        title: data.title,
        description: data.description,
        status: data.status,
        order: maxOrder + 1,
        dueDate: data.dueDate,
        labels: data.labels,
        assignees: data.assignees,
        projectId: data.projectId,
        checklists: data.checklists,
        attachments: [],
        activities: [],
        subtaskProgress: calculateSubtaskProgress(data.checklists),
        commentCount: 0,
        createdAt: now,
        updatedAt: now,
        isDeleted: false,
    };

    await db.tasks.add(task);
    return task;
}

// Update an existing task
export async function updateTask(
    id: string,
    updates: Partial<TaskFormData>
): Promise<Task | undefined> {
    const task = await db.tasks.get(id);
    if (!task) return undefined;

    const updatedTask: Task = {
        ...task,
        ...updates,
        subtaskProgress: updates.checklists
            ? calculateSubtaskProgress(updates.checklists)
            : task.subtaskProgress,
        updatedAt: new Date(),
    };

    await db.tasks.put(updatedTask);
    return updatedTask;
}

// Update task status
export async function updateTaskStatus(
    id: string,
    status: TaskStatus
): Promise<Task | undefined> {
    const task = await db.tasks.get(id);
    if (!task) return undefined;

    const updatedTask: Task = {
        ...task,
        status,
        updatedAt: new Date(),
    };

    await db.tasks.put(updatedTask);
    return updatedTask;
}

// Soft delete a task
export async function deleteTask(id: string): Promise<boolean> {
    const task = await db.tasks.get(id);
    if (!task) return false;

    await db.tasks.put({
        ...task,
        isDeleted: true,
        updatedAt: new Date(),
    });

    return true;
}

// Duplicate a task
export async function duplicateTask(id: string): Promise<Task | undefined> {
    const task = await db.tasks.get(id);
    if (!task) return undefined;

    const now = new Date();
    const duplicatedTask: Task = {
        ...task,
        id: uuidv4(),
        title: `${task.title} (Copy)`,
        createdAt: now,
        updatedAt: now,
        isDeleted: false,
    };

    await db.tasks.add(duplicatedTask);
    return duplicatedTask;
}

// Helper to calculate subtask progress from checklists
function calculateSubtaskProgress(
    checklists: Task['checklists']
): Task['subtaskProgress'] {
    const allItems = checklists.flatMap((c) => c.items);
    const total = allItems.length;
    const completed = allItems.filter((item) => item.completed).length;
    return { completed, total };
}

// Reorder tasks
export async function updateTaskOrder(
    activeId: string,
    overId: string
): Promise<void> {
    // This is a naive implementation; for drag-and-drop libraries, usually we just want to
    // update the one task's index or swap.
    // However, with dnd-kit sortable, we usually get a new ordered list of IDs.
    // Let's implement a batch update if we receive a list of IDs, or a swap?
    // Given the previous requirement was likely "move this here", let's assume we handle single moves in the UI state
    // and just save the `order` property for the affected task? 

    // Better approach for dnd-kit: The UI calculates the new order.
    // We just need a way to update strict order values.

    // Wait, the hook `useUpdateTaskStatus` or similar should handle this.
    // Let's create `updateTaskOrders` that takes an array of { id, order, status }.
    return;
}

export async function reorderTasks(items: { id: string; order: number; status: TaskStatus }[]) {
    await db.transaction('rw', db.tasks, async () => {
        for (const item of items) {
            await db.tasks.update(item.id, {
                order: item.order,
                status: item.status,
                updatedAt: new Date()
            });
        }
    });
}
