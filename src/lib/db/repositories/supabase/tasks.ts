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
        projectId: row.project_id || undefined,
        workspaceId: row.workspace_id || undefined,
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

// Helper to get current user ID
async function getCurrentUserId(): Promise<string | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
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
    if (task.projectId !== undefined) row.project_id = task.projectId || null;
    if (task.workspaceId !== undefined) row.workspace_id = task.workspaceId || null;
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

    // Filter by workspace - STRICT: only show tasks in the specified workspace
    if (filter?.workspaceId) {
        query = query.eq('workspace_id', filter.workspaceId);
    } else {
        // If no workspace is provided, don't return any tasks
        // This prevents leaking data between workspaces
        console.warn('[Tasks Repository] No workspace provided - returning empty list to prevent data leaks');
        query = query.eq('workspace_id', '00000000-0000-0000-0000-000000000000'); // Non-existent UUID
    }

    // Apply other filters
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
        console.error('[Tasks Repository] Error fetching tasks:', error);
        return [];
    }

    const tasks = (data || []).map(rowToTask);
    console.log(`[Tasks Repository] Fetched ${tasks.length} tasks for workspace: ${filter?.workspaceId}`);
    return tasks;
}

// Get tasks grouped by status (filtered by workspace)
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

    const userId = await getCurrentUserId();
    if (!userId) {
        console.error('[Tasks Repository] User not authenticated');
        return null;
    }

    // SECURITY: workspace_id is REQUIRED - prevent data leaks
    if (!data.workspaceId) {
        console.error('[Tasks Repository] Attempted to create task without workspace_id:', { title: data.title, userId });
        throw new Error('Workspace ID is required to create a task. Please ensure you have a workspace selected.');
    }

    console.log(`[Tasks Repository] Creating task "${data.title}" in workspace: ${data.workspaceId}`);

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
        project_id: data.projectId || null,
        workspace_id: data.workspaceId,
        checklists: data.checklists,
        attachments: [],
        activities: [],
        subtask_progress: calculateSubtaskProgress(data.checklists),
        comment_count: 0,
        user_id: userId,
        is_deleted: false,
    };

    const { data: insertedData, error } = await supabase
        .from('tasks')
        .insert(taskData)
        .select()
        .single();

    if (error || !insertedData) {
        console.error('[Tasks Repository] Error creating task:', error);
        return null;
    }

    console.log(`[Tasks Repository] Successfully created task: ${insertedData.id}`);
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

    // Don't make an update call if there's nothing to update
    if (Object.keys(row).length === 0) {
        return getTaskById(id);
    }

    const { data, error } = await supabase
        .from('tasks')
        .update(row)
        .eq('id', id)
        .select()
        .single();

    if (error || !data) {
        console.error('Error updating task:', error?.message || error?.code || JSON.stringify(error));
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
