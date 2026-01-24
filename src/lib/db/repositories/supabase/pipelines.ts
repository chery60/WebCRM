'use client';

import { getSupabaseClient } from '@/lib/supabase/client';
import type { Pipeline } from '@/types';

// Helper to convert database row to Pipeline type
function rowToPipeline(row: any): Pipeline {
  return {
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    icon: row.icon || undefined,
    color: row.color || undefined,
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

export const pipelinesRepository = {
  // Get all pipelines for current user
  async getAll(): Promise<Pipeline[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('pipelines')
      .select('*')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error) {
      // 42P01 = table doesn't exist - silently return empty array
      if (error.code !== '42P01') {
        console.error('Error fetching pipelines:', error);
      }
      return [];
    }

    return (data || []).map(rowToPipeline);
  },

  // Get a single pipeline by ID
  async getById(id: string): Promise<Pipeline | undefined> {
    const supabase = getSupabaseClient();
    if (!supabase) return undefined;

    const { data, error } = await supabase
      .from('pipelines')
      .select('*')
      .eq('id', id)
      .eq('is_deleted', false)
      .single();

    if (error || !data) {
      console.error('Error fetching pipeline:', error);
      return undefined;
    }

    return rowToPipeline(data);
  },

  // Create a new pipeline
  async create(data: { name: string; description?: string; icon?: string; color?: string }): Promise<Pipeline> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client not available');

    const userId = await getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    const { data: insertedData, error } = await supabase
      .from('pipelines')
      .insert({
        name: data.name,
        description: data.description || null,
        icon: data.icon || null,
        color: data.color || null,
        user_id: userId,
        is_deleted: false,
      })
      .select()
      .single();

    if (error || !insertedData) {
      console.error('Error creating pipeline:', error);
      throw new Error(error?.message || 'Failed to create pipeline');
    }

    return rowToPipeline(insertedData);
  },

  // Update a pipeline
  async update(id: string, data: Partial<Omit<Pipeline, 'id' | 'createdAt'>>): Promise<Pipeline | undefined> {
    const supabase = getSupabaseClient();
    if (!supabase) return undefined;

    const updateData: Record<string, any> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.icon !== undefined) updateData.icon = data.icon;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.isDeleted !== undefined) updateData.is_deleted = data.isDeleted;

    // Don't make an update call if there's nothing to update
    if (Object.keys(updateData).length === 0) {
      return this.getById(id);
    }

    const { data: updatedData, error } = await supabase
      .from('pipelines')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !updatedData) {
      console.error('Error updating pipeline:', error?.message || error?.code || JSON.stringify(error));
      return undefined;
    }

    return rowToPipeline(updatedData);
  },

  // Soft delete a pipeline
  async delete(id: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const { error } = await supabase
      .from('pipelines')
      .update({ is_deleted: true })
      .eq('id', id);

    if (error) {
      console.error('Error deleting pipeline:', error);
      return false;
    }

    return true;
  },

  // Count pipelines
  async count(): Promise<number> {
    const supabase = getSupabaseClient();
    if (!supabase) return 0;

    const { count, error } = await supabase
      .from('pipelines')
      .select('*', { count: 'exact', head: true })
      .eq('is_deleted', false);

    if (error) {
      console.error('Error counting pipelines:', error);
      return 0;
    }

    return count || 0;
  },
};
