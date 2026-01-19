'use client';

/**
 * Unified Tasks Repository
 * 
 * This module exports a single tasks repository that uses either
 * Dexie or Supabase based on the USE_SUPABASE feature flag.
 */

import { USE_SUPABASE } from '../database';

// Dynamically import based on feature flag
let tasksModule: typeof import('./tasks') | typeof import('./supabase/tasks');

if (USE_SUPABASE) {
    tasksModule = require('./supabase/tasks');
} else {
    tasksModule = require('./tasks');
}

// Re-export all functions from the selected module
export const {
    getTasks,
    getTasksByStatus,
    getTaskById,
    createTask,
    updateTask,
    updateTaskStatus,
    deleteTask,
    duplicateTask,
    reorderTasks,
    updateTaskOrder,
} = tasksModule;
