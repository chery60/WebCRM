'use client';

import { getSupabaseClient } from '@/lib/supabase/client';
import type { TaskTab } from '@/types';

// Helper to convert database row to TaskTab type
function rowToTaskTab(row: any): TaskTab {
  return {
    id: row.id,
    name: row.name,
    color: row.color || '#6366f1',
    icon: row.icon || undefined,
    order: row.order || 0,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

// Helper to get current user ID
async function getCurrentUserId(): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}

export const taskTabsRepository = {
  // Get all task tabs for current user
  async getAll(): Promise<TaskTab[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('task_tabs')
      .select('*')
      .order('order', { ascending: true });

    if (error) {
      // 42P01 = table doesn't exist - silently return empty array
      if (error.code !== '42P01') {
        console.error('Error fetching task tabs:', error);
      }
      return [];
    }

    return (data || []).map(rowToTaskTab);
  },

  // Get a single task tab by ID
  async getById(id: string): Promise<TaskTab | undefined> {
    const supabase = getSupabaseClient();
    if (!supabase) return undefined;

    const { data, error } = await supabase
      .from('task_tabs')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      console.error('Error fetching task tab:', error);
      return undefined;
    }

    return rowToTaskTab(data);
  },

  // Create a new task tab
  async create(data: { name: string; color?: string; icon?: string }): Promise<TaskTab> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client not available');

    const userId = await getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    // Get max order
    const { data: existingTabs } = await supabase
      .from('task_tabs')
      .select('order')
      .order('order', { ascending: false })
      .limit(1);

    const maxOrder = existingTabs?.[0]?.order ?? -1;

    const { data: insertedData, error } = await supabase
      .from('task_tabs')
      .insert({
        name: data.name,
        color: data.color || '#6366f1',
        icon: data.icon || null,
        order: maxOrder + 1,
        user_id: userId,
      })
      .select()
      .single();

    if (error || !insertedData) {
      console.error('Error creating task tab:', error);
      throw new Error(error?.message || 'Failed to create task tab');
    }

    return rowToTaskTab(insertedData);
  },

  // Update a task tab
  async update(id: string, data: Partial<Pick<TaskTab, 'name' | 'color' | 'icon' | 'order'>>): Promise<TaskTab | undefined> {
    const supabase = getSupabaseClient();
    if (!supabase) return undefined;

    const updateData: Record<string, any> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.icon !== undefined) updateData.icon = data.icon;
    if (data.order !== undefined) updateData.order = data.order;

    // Don't make an update call if there's nothing to update
    if (Object.keys(updateData).length === 0) {
      return this.getById(id);
    }

    const { data: updatedData, error } = await supabase
      .from('task_tabs')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !updatedData) {
      console.error('Error updating task tab:', error?.message || error?.code || JSON.stringify(error));
      return undefined;
    }

    return rowToTaskTab(updatedData);
  },

  // Delete a task tab
  async delete(id: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    // Remove project_id from tasks that belong to this tab
    await supabase
      .from('tasks')
      .update({ project_id: null })
      .eq('project_id', id);

    const { error } = await supabase
      .from('task_tabs')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting task tab:', error);
      return false;
    }

    return true;
  },

  // Reorder task tabs
  async reorder(tabs: TaskTab[]): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const updates = tabs.map((tab, index) =>
      supabase
        .from('task_tabs')
        .update({ order: index })
        .eq('id', tab.id)
    );

    await Promise.all(updates);
  },
};
