'use client';

import { getSupabaseClient } from '@/lib/supabase/client';
import type { Task, TaskFormData, TasksFilter, TasksSort, TaskStatus, TaskChecklist } from '@/types';

// Helper to convert database row to Task type
function rowToTask(row: any): Task {
    return {
        id: row.id,
        title: row.title,
        description: row.description || '',
        status: row.status,
        order: row.order,
        dueDate: row.due_date ? new Date(row.due_date) : null,
        labels: row.labels || [],
        assignees: row.assignees || [],
        checklists: row.checklists || [],
        attachments: row.attachments || [],
        activities: row.activities || [],
        subtaskProgress: row.subtask_progress,
        commentCount: row.comment_count || 0,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        isDeleted: row.is_deleted,
    };
}

// Helper to convert Task to database row
function taskToRow(task: Partial<Task>) {
    const row: Record<string, any> = {};

    if (task.title !== undefined) row.title = task.title;
    if (task.description !== undefined) row.description = task.description;
    if (task.status !== undefined) row.status = task.status;
    if (task.order !== undefined) row.order = task.order;
    if (task.dueDate !== undefined) row.due_date = task.dueDate?.toISOString() || null;
    if (task.labels !== undefined) row.labels = task.labels;
    if (task.assignees !== undefined) row.assignees = task.assignees;
    if (task.checklists !== undefined) row.checklists = task.checklists;
    if (task.attachments !== undefined) row.attachments = task.attachments;
    if (task.activities !== undefined) row.activities = task.activities;
    if (task.subtaskProgress !== undefined) row.subtask_progress = task.subtaskProgress;
    if (task.commentCount !== undefined) row.comment_count = task.commentCount;
    if (task.isDeleted !== undefined) row.is_deleted = task.isDeleted;

    return row;
}

// Get all tasks with optional filtering and sorting
export async function getTasks(
    filter?: TasksFilter,
    sort?: TasksSort
): Promise<Task[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    let query = supabase
        .from('tasks')
        .select('*')
        .eq('is_deleted', false);

    // Apply filters
    if (filter?.status?.length) {
        query = query.in('status', filter.status);
    }

    if (filter?.labels?.length) {
        query = query.overlaps('labels', filter.labels);
    }

    if (filter?.assignees?.length) {
        query = query.overlaps('assignees', filter.assignees);
    }

    if (filter?.search) {
        query = query.or(`title.ilike.%${filter.search}%,description.ilike.%${filter.search}%`);
    }

    // Apply sorting
    if (sort) {
        const column = sort.field === 'dueDate' ? 'due_date' :
            sort.field === 'createdAt' ? 'created_at' :
                sort.field === 'updatedAt' ? 'updated_at' : sort.field;
        query = query.order(column, { ascending: sort.direction === 'asc' });
    } else {
        query = query.order('order', { ascending: true });
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching tasks:', error);
        return [];
    }

    return (data || []).map(rowToTask);
}

// Get tasks grouped by status
export async function getTasksByStatus(): Promise<Record<TaskStatus, Task[]>> {
    const allTasks = await getTasks();

    return {
        planned: allTasks.filter((t) => t.status === 'planned'),
        upcoming: allTasks.filter((t) => t.status === 'upcoming'),
        completed: allTasks.filter((t) => t.status === 'completed'),
    };
}

// Get a single task by ID
export async function getTaskById(id: string): Promise<Task | undefined> {
    const supabase = getSupabaseClient();
    if (!supabase) return undefined;

    const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !data) {
        console.error('Error fetching task:', error);
        return undefined;
    }

    return rowToTask(data);
}

// Helper to calculate subtask progress from checklists
function calculateSubtaskProgress(
    checklists: TaskChecklist[]
): Task['subtaskProgress'] {
    const allItems = checklists.flatMap((c) => c.items);
    const total = allItems.length;
    const completed = allItems.filter((item) => item.completed).length;
    return { completed, total };
}

// Create a new task
export async function createTask(data: TaskFormData): Promise<Task | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    // Get highest order for the status
    const { data: existingTasks } = await supabase
        .from('tasks')
        .select('order')
        .eq('status', data.status)
        .order('order', { ascending: false })
        .limit(1);

    const maxOrder = existingTasks?.[0]?.order ?? -1;

    const taskData = {
        title: data.title,
        description: data.description,
        status: data.status,
        order: maxOrder + 1,
        due_date: data.dueDate?.toISOString() || null,
        labels: data.labels,
        assignees: data.assignees,
        checklists: data.checklists,
        attachments: [],
        activities: [],
        subtask_progress: calculateSubtaskProgress(data.checklists),
        comment_count: 0,
        is_deleted: false,
    };

    const { data: insertedData, error } = await supabase
        .from('tasks')
        .insert(taskData)
        .select()
        .single();

    if (error || !insertedData) {
        console.error('Error creating task:', error);
        return null;
    }

    return rowToTask(insertedData);
}

// Update an existing task
export async function updateTask(
    id: string,
    updates: Partial<TaskFormData>
): Promise<Task | undefined> {
    const supabase = getSupabaseClient();
    if (!supabase) return undefined;

    const row = taskToRow(updates as Partial<Task>);

    if (updates.checklists) {
        row.subtask_progress = calculateSubtaskProgress(updates.checklists);
    }

    const { data, error } = await supabase
        .from('tasks')
        .update(row)
        .eq('id', id)
        .select()
        .single();

    if (error || !data) {
        console.error('Error updating task:', error);
        return undefined;
    }

    return rowToTask(data);
}

// Update task status
export async function updateTaskStatus(
    id: string,
    status: TaskStatus
): Promise<Task | undefined> {
    const supabase = getSupabaseClient();
    if (!supabase) return undefined;

    const { data, error } = await supabase
        .from('tasks')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

    if (error || !data) {
        console.error('Error updating task status:', error);
        return undefined;
    }

    return rowToTask(data);
}

// Soft delete a task
export async function deleteTask(id: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const { error } = await supabase
        .from('tasks')
        .update({ is_deleted: true })
        .eq('id', id);

    if (error) {
        console.error('Error deleting task:', error);
        return false;
    }

    return true;
}

// Duplicate a task
export async function duplicateTask(id: string): Promise<Task | undefined> {
    const supabase = getSupabaseClient();
    if (!supabase) return undefined;

    const task = await getTaskById(id);
    if (!task) return undefined;

    const { data, error } = await supabase
        .from('tasks')
        .insert({
            title: `${task.title} (Copy)`,
            description: task.description,
            status: task.status,
            order: task.order + 1,
            due_date: task.dueDate?.toISOString() || null,
            labels: task.labels,
            assignees: task.assignees,
            checklists: task.checklists,
            attachments: [],
            activities: [],
            subtask_progress: task.subtaskProgress,
            comment_count: 0,
            is_deleted: false,
        })
        .select()
        .single();

    if (error || !data) {
        console.error('Error duplicating task:', error);
        return undefined;
    }

    return rowToTask(data);
}

// Reorder tasks
export async function reorderTasks(items: { id: string; order: number; status: TaskStatus }[]) {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    // Supabase doesn't have batch update, so we do individual updates
    const updates = items.map(item =>
        supabase
            .from('tasks')
            .update({ order: item.order, status: item.status })
            .eq('id', item.id)
    );

    await Promise.all(updates);
}

// Update task order (legacy function for compatibility)
export async function updateTaskOrder(
    activeId: string,
    overId: string
): Promise<void> {
    // This is handled by reorderTasks in the UI
    return;
}
