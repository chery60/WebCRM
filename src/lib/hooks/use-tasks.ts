'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getTasks,
    getTaskById,
    getTasksByStatus,
    createTask,
    updateTask,
    updateTaskStatus,
    deleteTask,
    duplicateTask,
    reorderTasks,
} from '@/lib/db/repositories/tasks';
import type { Task, TaskFormData, TasksFilter, TasksSort, TaskStatus } from '@/types';

const TASKS_KEY = 'tasks';
const TASK_KEY = 'task';

// Get all tasks with optional filtering and sorting
export function useTasks(filter?: TasksFilter, sort?: TasksSort) {
    return useQuery({
        queryKey: [TASKS_KEY, filter, sort],
        queryFn: () => getTasks(filter, sort),
        staleTime: 1000 * 60, // 1 minute
    });
}

// Get tasks grouped by status (for List and Kanban views)
export function useTasksByStatus() {
    return useQuery({
        queryKey: [TASKS_KEY, 'byStatus'],
        queryFn: () => getTasksByStatus(),
        staleTime: 1000 * 60,
    });
}

// Get a single task by ID
export function useTask(id: string | null) {
    return useQuery({
        queryKey: [TASK_KEY, id],
        queryFn: () => (id ? getTaskById(id) : undefined),
        enabled: !!id,
        staleTime: 1000 * 60,
    });
}

// Create a new task
export function useCreateTask() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: TaskFormData) => createTask(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [TASKS_KEY] });
        },
    });
}

// Update an existing task
export function useUpdateTask() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: Partial<TaskFormData> }) =>
            updateTask(id, updates),
        onSuccess: (task) => {
            queryClient.invalidateQueries({ queryKey: [TASKS_KEY] });
            if (task) {
                queryClient.setQueryData([TASK_KEY, task.id], task);
            }
        },
    });
}

// Update task status (used for drag-and-drop in Kanban)
export function useUpdateTaskStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, status }: { id: string; status: TaskStatus }) =>
            updateTaskStatus(id, status),
        onSuccess: (task) => {
            queryClient.invalidateQueries({ queryKey: [TASKS_KEY] });
            if (task) {
                queryClient.setQueryData([TASK_KEY, task.id], task);
            }
        },
    });
}

// Delete a task
export function useDeleteTask() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => deleteTask(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [TASKS_KEY] });
        },
    });
}

// Duplicate a task
export function useDuplicateTask() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => duplicateTask(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [TASKS_KEY] });
        },
    });
}

// Reorder tasks
export function useReorderTasks() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (items: { id: string; order: number; status: TaskStatus }[]) =>
            reorderTasks(items),
        onSuccess: () => {
            // Optimistically update or just invalidate
            queryClient.invalidateQueries({ queryKey: [TASKS_KEY] });
        },
    });
}
