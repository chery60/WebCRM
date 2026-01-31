'use client';

import { getSupabaseClient } from '@/lib/supabase/client';
import type { Project } from '@/types';

// Helper to convert database row to Project type
function rowToProject(row: any): Project {
  return {
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    instructions: row.instructions || undefined,
    icon: row.icon || undefined,
    color: row.color || undefined,
    workspaceId: row.workspace_id || undefined,
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

export const projectsRepository = {
  // Get all projects for current user, optionally filtered by workspace
  async getAll(workspaceId?: string): Promise<Project[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    let query = supabase
      .from('projects')
      .select('*')
      .eq('is_deleted', false);

    // Filter by workspace - STRICT: only show projects in the specified workspace
    if (workspaceId) {
      query = query.eq('workspace_id', workspaceId);
    } else {
      // If no workspace is provided, don't return any projects
      // This prevents leaking data between workspaces
      query = query.eq('workspace_id', '00000000-0000-0000-0000-000000000000'); // Non-existent UUID
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      // 42P01 = table doesn't exist - silently return empty array
      if (error.code !== '42P01') {
        console.error('Error fetching projects:', error);
      }
      return [];
    }

    return (data || []).map(rowToProject);
  },

  // Get a single project by ID
  async getById(id: string): Promise<Project | undefined> {
    const supabase = getSupabaseClient();
    if (!supabase) return undefined;

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .eq('is_deleted', false)
      .single();

    if (error || !data) {
      console.error('Error fetching project:', error);
      return undefined;
    }

    return rowToProject(data);
  },

  // Create a new project
  async create(data: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>): Promise<Project> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client not available');

    const userId = await getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    // SECURITY: workspace_id is REQUIRED - prevent data leaks
    if (!data.workspaceId) {
      throw new Error('Workspace ID is required to create a project. Please ensure you have a workspace selected.');
    }

    const { data: insertedData, error } = await supabase
      .from('projects')
      .insert({
        name: data.name,
        description: data.description || null,
        instructions: data.instructions || null,
        icon: data.icon || null,
        color: data.color || null,
        workspace_id: data.workspaceId,
        user_id: userId,
        is_deleted: false,
      })
      .select()
      .single();

    if (error || !insertedData) {
      console.error('Error creating project:', error);
      throw new Error(error?.message || 'Failed to create project');
    }

    return rowToProject(insertedData);
  },

  // Update a project
  async update(id: string, data: Partial<Omit<Project, 'id' | 'createdAt'>>): Promise<Project | undefined> {
    const supabase = getSupabaseClient();
    if (!supabase) return undefined;

    const updateData: Record<string, any> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.instructions !== undefined) updateData.instructions = data.instructions;
    if (data.icon !== undefined) updateData.icon = data.icon;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.isDeleted !== undefined) updateData.is_deleted = data.isDeleted;

    // Don't make an update call if there's nothing to update
    if (Object.keys(updateData).length === 0) {
      return this.getById(id);
    }

    const { data: updatedData, error } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !updatedData) {
      console.error('Error updating project:', error?.message || error?.code || JSON.stringify(error));
      return undefined;
    }

    return rowToProject(updatedData);
  },

  // Soft delete a project
  async delete(id: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    // Move notes from this project to no project
    await supabase
      .from('notes')
      .update({ project_id: null })
      .eq('project_id', id);

    // Soft delete the project
    const { error } = await supabase
      .from('projects')
      .update({ is_deleted: true })
      .eq('id', id);

    if (error) {
      console.error('Error deleting project:', error);
      return false;
    }

    return true;
  },

  // Get note count for a project
  async getNoteCount(projectId: string): Promise<number> {
    const supabase = getSupabaseClient();
    if (!supabase) return 0;

    const { count, error } = await supabase
      .from('notes')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .eq('is_deleted', false);

    if (error) {
      console.error('Error counting notes:', error);
      return 0;
    }

    return count || 0;
  },

  // Get note counts for all projects (returns map of projectId -> count)
  async getAllNoteCounts(): Promise<Map<string, number>> {
    const supabase = getSupabaseClient();
    if (!supabase) return new Map();

    // Use a raw query to get counts grouped by project_id
    const { data, error } = await supabase
      .from('notes')
      .select('project_id')
      .eq('is_deleted', false)
      .not('project_id', 'is', null);

    if (error) {
      console.error('Error fetching note counts:', error);
      return new Map();
    }

    // Count notes per project
    const counts = new Map<string, number>();
    (data || []).forEach((row: { project_id: string }) => {
      const current = counts.get(row.project_id) || 0;
      counts.set(row.project_id, current + 1);
    });

    return counts;
  },
};
