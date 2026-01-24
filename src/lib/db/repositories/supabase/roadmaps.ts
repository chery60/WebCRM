'use client';

import { getSupabaseClient } from '@/lib/supabase/client';
import type { Roadmap } from '@/types';

// Helper to convert database row to Roadmap type
function rowToRoadmap(row: any): Roadmap {
  return {
    id: row.id,
    pipelineId: row.pipeline_id,
    name: row.name,
    description: row.description || undefined,
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

export const roadmapsRepository = {
  // Get all roadmaps, optionally filtered by pipeline
  async getAll(pipelineId?: string): Promise<Roadmap[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    let query = supabase
      .from('roadmaps')
      .select('*')
      .eq('is_deleted', false);

    if (pipelineId) {
      query = query.eq('pipeline_id', pipelineId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      // 42P01 = table doesn't exist - silently return empty array
      if (error.code !== '42P01') {
        console.error('Error fetching roadmaps:', error);
      }
      return [];
    }

    return (data || []).map(rowToRoadmap);
  },

  // Get roadmaps by pipeline ID
  async getByPipelineId(pipelineId: string): Promise<Roadmap[]> {
    return this.getAll(pipelineId);
  },

  // Get a single roadmap by ID
  async getById(id: string): Promise<Roadmap | undefined> {
    const supabase = getSupabaseClient();
    if (!supabase) return undefined;

    const { data, error } = await supabase
      .from('roadmaps')
      .select('*')
      .eq('id', id)
      .eq('is_deleted', false)
      .single();

    if (error || !data) {
      console.error('Error fetching roadmap:', error);
      return undefined;
    }

    return rowToRoadmap(data);
  },

  // Create a new roadmap
  async create(data: { pipelineId: string; name: string; description?: string }): Promise<Roadmap> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client not available');

    const userId = await getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    const { data: insertedData, error } = await supabase
      .from('roadmaps')
      .insert({
        pipeline_id: data.pipelineId,
        name: data.name,
        description: data.description || null,
        user_id: userId,
        is_deleted: false,
      })
      .select()
      .single();

    if (error || !insertedData) {
      console.error('Error creating roadmap:', error);
      throw new Error(error?.message || 'Failed to create roadmap');
    }

    return rowToRoadmap(insertedData);
  },

  // Update a roadmap
  async update(id: string, data: Partial<Omit<Roadmap, 'id' | 'createdAt'>>): Promise<Roadmap | undefined> {
    const supabase = getSupabaseClient();
    if (!supabase) return undefined;

    const updateData: Record<string, any> = {};
    if (data.pipelineId !== undefined) updateData.pipeline_id = data.pipelineId;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.isDeleted !== undefined) updateData.is_deleted = data.isDeleted;

    // Don't make an update call if there's nothing to update
    if (Object.keys(updateData).length === 0) {
      return this.getById(id);
    }

    const { data: updatedData, error } = await supabase
      .from('roadmaps')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !updatedData) {
      console.error('Error updating roadmap:', error?.message || error?.code || JSON.stringify(error));
      return undefined;
    }

    return rowToRoadmap(updatedData);
  },

  // Soft delete a roadmap
  async delete(id: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const { error } = await supabase
      .from('roadmaps')
      .update({ is_deleted: true })
      .eq('id', id);

    if (error) {
      console.error('Error deleting roadmap:', error);
      return false;
    }

    return true;
  },

  // Delete all roadmaps for a pipeline
  async deleteByPipelineId(pipelineId: string): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const { error } = await supabase
      .from('roadmaps')
      .update({ is_deleted: true })
      .eq('pipeline_id', pipelineId);

    if (error) {
      console.error('Error deleting roadmaps by pipeline:', error);
    }
  },

  // Count roadmaps
  async count(pipelineId?: string): Promise<number> {
    const supabase = getSupabaseClient();
    if (!supabase) return 0;

    let query = supabase
      .from('roadmaps')
      .select('*', { count: 'exact', head: true })
      .eq('is_deleted', false);

    if (pipelineId) {
      query = query.eq('pipeline_id', pipelineId);
    }

    const { count, error } = await query;

    if (error) {
      console.error('Error counting roadmaps:', error);
      return 0;
    }

    return count || 0;
  },
};
