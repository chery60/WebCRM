'use client';

import { getSupabaseClient } from '@/lib/supabase/client';
import type { 
  FeatureRequest, 
  FeatureRequestFilter, 
  FeatureRequestSort, 
  FeatureActivity, 
  FeatureAttachment,
  FeatureRequestStatus,
  FeatureRequestPriority 
} from '@/types';

// Helper to convert database row to FeatureRequest type
function rowToFeatureRequest(row: any): FeatureRequest {
  return {
    id: row.id,
    roadmapId: row.roadmap_id,
    title: row.title,
    description: row.description || undefined,
    status: row.status as FeatureRequestStatus,
    priority: row.priority as FeatureRequestPriority,
    phase: row.phase || undefined,
    assignees: row.assignees || [],
    tags: row.tags || [],
    dueDate: row.due_date ? new Date(row.due_date) : undefined,
    startDate: row.start_date ? new Date(row.start_date) : undefined,
    problemStatement: row.problem_statement || undefined,
    proposedSolution: row.proposed_solution || undefined,
    acceptanceCriteria: row.acceptance_criteria || [],
    userStories: row.user_stories || [],
    technicalNotes: row.technical_notes || undefined,
    dependencies: row.dependencies || [],
    estimatedEffort: row.estimated_effort || undefined,
    businessValue: row.business_value || undefined,
    activities: row.activities || [],
    attachments: row.attachments || [],
    order: row.order || 0,
    createdBy: row.created_by,
    createdByName: row.created_by_name,
    createdByAvatar: row.created_by_avatar || undefined,
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

export const featureRequestsRepository = {
  // Get all feature requests with optional filtering and sorting
  async getAll(
    roadmapId?: string,
    filter?: FeatureRequestFilter,
    sort?: FeatureRequestSort
  ): Promise<FeatureRequest[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    let query = supabase
      .from('feature_requests')
      .select('*')
      .eq('is_deleted', false);

    // Filter by roadmap
    if (roadmapId) {
      query = query.eq('roadmap_id', roadmapId);
    }

    // Apply filters
    if (filter?.status?.length) {
      query = query.in('status', filter.status);
    }
    if (filter?.priority?.length) {
      query = query.in('priority', filter.priority);
    }
    if (filter?.phase?.length) {
      query = query.in('phase', filter.phase);
    }
    if (filter?.search) {
      query = query.or(`title.ilike.%${filter.search}%,description.ilike.%${filter.search}%`);
    }

    // Apply sorting
    if (sort) {
      const columnMap: Record<string, string> = {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        dueDate: 'due_date',
      };
      const column = columnMap[sort.field] || sort.field;
      query = query.order(column, { ascending: sort.direction === 'asc' });
    } else {
      query = query.order('order', { ascending: true });
    }

    const { data, error } = await query;

    if (error) {
      // 42P01 = table doesn't exist - silently return empty array
      if (error.code !== '42P01') {
        console.error('Error fetching feature requests:', error);
      }
      return [];
    }

    return (data || []).map(rowToFeatureRequest);
  },

  // Get feature requests grouped by phase
  async getGroupedByPhase(roadmapId: string): Promise<Map<string, FeatureRequest[]>> {
    const features = await this.getAll(roadmapId);
    const grouped = new Map<string, FeatureRequest[]>();
    
    features.forEach((feature) => {
      const phase = feature.phase || 'Unassigned';
      if (!grouped.has(phase)) {
        grouped.set(phase, []);
      }
      grouped.get(phase)!.push(feature);
    });
    
    return grouped;
  },

  // Get feature requests grouped by status
  async getGroupedByStatus(roadmapId: string): Promise<Map<string, FeatureRequest[]>> {
    const features = await this.getAll(roadmapId);
    const grouped = new Map<string, FeatureRequest[]>();
    
    features.forEach((feature) => {
      if (!grouped.has(feature.status)) {
        grouped.set(feature.status, []);
      }
      grouped.get(feature.status)!.push(feature);
    });
    
    return grouped;
  },

  // Get a single feature request by ID
  async getById(id: string): Promise<FeatureRequest | undefined> {
    const supabase = getSupabaseClient();
    if (!supabase) return undefined;

    const { data, error } = await supabase
      .from('feature_requests')
      .select('*')
      .eq('id', id)
      .eq('is_deleted', false)
      .single();

    if (error || !data) {
      console.error('Error fetching feature request:', error);
      return undefined;
    }

    return rowToFeatureRequest(data);
  },

  // Create a new feature request
  async create(
    data: Omit<FeatureRequest, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'activities' | 'attachments' | 'order'>
  ): Promise<FeatureRequest> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client not available');

    const userId = await getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    // Get max order for the roadmap
    const { data: existingFeatures } = await supabase
      .from('feature_requests')
      .select('order')
      .eq('roadmap_id', data.roadmapId)
      .eq('is_deleted', false)
      .order('order', { ascending: false })
      .limit(1);

    const maxOrder = existingFeatures?.[0]?.order ?? -1;

    const { data: insertedData, error } = await supabase
      .from('feature_requests')
      .insert({
        roadmap_id: data.roadmapId,
        title: data.title,
        description: data.description || null,
        status: data.status || 'backlog',
        priority: data.priority || 'medium',
        phase: data.phase || null,
        assignees: data.assignees || [],
        tags: data.tags || [],
        due_date: data.dueDate?.toISOString() || null,
        start_date: data.startDate?.toISOString() || null,
        problem_statement: data.problemStatement || null,
        proposed_solution: data.proposedSolution || null,
        acceptance_criteria: data.acceptanceCriteria || [],
        user_stories: data.userStories || [],
        technical_notes: data.technicalNotes || null,
        dependencies: data.dependencies || [],
        estimated_effort: data.estimatedEffort || null,
        business_value: data.businessValue || null,
        activities: [],
        attachments: [],
        order: maxOrder + 1,
        created_by: data.createdBy || userId,
        created_by_name: data.createdByName || 'User',
        created_by_avatar: data.createdByAvatar || null,
        user_id: userId,
        is_deleted: false,
      })
      .select()
      .single();

    if (error || !insertedData) {
      console.error('Error creating feature request:', error);
      throw new Error(error?.message || 'Failed to create feature request');
    }

    return rowToFeatureRequest(insertedData);
  },

  // Update a feature request
  async update(
    id: string,
    data: Partial<Omit<FeatureRequest, 'id' | 'createdAt'>>
  ): Promise<FeatureRequest | undefined> {
    const supabase = getSupabaseClient();
    if (!supabase) return undefined;

    const updateData: Record<string, any> = {};
    if (data.roadmapId !== undefined) updateData.roadmap_id = data.roadmapId;
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.phase !== undefined) updateData.phase = data.phase;
    if (data.assignees !== undefined) updateData.assignees = data.assignees;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.dueDate !== undefined) updateData.due_date = data.dueDate?.toISOString() || null;
    if (data.startDate !== undefined) updateData.start_date = data.startDate?.toISOString() || null;
    if (data.problemStatement !== undefined) updateData.problem_statement = data.problemStatement;
    if (data.proposedSolution !== undefined) updateData.proposed_solution = data.proposedSolution;
    if (data.acceptanceCriteria !== undefined) updateData.acceptance_criteria = data.acceptanceCriteria;
    if (data.userStories !== undefined) updateData.user_stories = data.userStories;
    if (data.technicalNotes !== undefined) updateData.technical_notes = data.technicalNotes;
    if (data.dependencies !== undefined) updateData.dependencies = data.dependencies;
    if (data.estimatedEffort !== undefined) updateData.estimated_effort = data.estimatedEffort;
    if (data.businessValue !== undefined) updateData.business_value = data.businessValue;
    if (data.activities !== undefined) updateData.activities = data.activities;
    if (data.attachments !== undefined) updateData.attachments = data.attachments;
    if (data.order !== undefined) updateData.order = data.order;
    if (data.isDeleted !== undefined) updateData.is_deleted = data.isDeleted;

    // Don't make an update call if there's nothing to update
    if (Object.keys(updateData).length === 0) {
      return this.getById(id);
    }

    const { data: updatedData, error } = await supabase
      .from('feature_requests')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !updatedData) {
      console.error('Error updating feature request:', error?.message || error?.code || JSON.stringify(error));
      return undefined;
    }

    return rowToFeatureRequest(updatedData);
  },

  // Add activity to a feature request
  async addActivity(id: string, activity: Omit<FeatureActivity, 'id' | 'createdAt'>): Promise<FeatureRequest | undefined> {
    const feature = await this.getById(id);
    if (!feature) return undefined;

    const newActivity: FeatureActivity = {
      ...activity,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };

    return this.update(id, {
      activities: [...feature.activities, newActivity],
    });
  },

  // Add attachment to a feature request
  async addAttachment(id: string, attachment: Omit<FeatureAttachment, 'id' | 'uploadedAt'>): Promise<FeatureRequest | undefined> {
    const feature = await this.getById(id);
    if (!feature) return undefined;

    const newAttachment: FeatureAttachment = {
      ...attachment,
      id: crypto.randomUUID(),
      uploadedAt: new Date(),
    };

    return this.update(id, {
      attachments: [...feature.attachments, newAttachment],
    });
  },

  // Remove attachment from a feature request
  async removeAttachment(id: string, attachmentId: string): Promise<FeatureRequest | undefined> {
    const feature = await this.getById(id);
    if (!feature) return undefined;

    return this.update(id, {
      attachments: feature.attachments.filter((a) => a.id !== attachmentId),
    });
  },

  // Reorder feature requests
  async reorder(roadmapId: string, orderedIds: string[]): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    // Update each feature's order
    const updates = orderedIds.map((id, index) =>
      supabase
        .from('feature_requests')
        .update({ order: index })
        .eq('id', id)
    );

    await Promise.all(updates);
  },

  // Soft delete a feature request
  async delete(id: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const { error } = await supabase
      .from('feature_requests')
      .update({ is_deleted: true })
      .eq('id', id);

    if (error) {
      console.error('Error deleting feature request:', error);
      return false;
    }

    return true;
  },

  // Delete all feature requests for a roadmap
  async deleteByRoadmapId(roadmapId: string): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const { error } = await supabase
      .from('feature_requests')
      .update({ is_deleted: true })
      .eq('roadmap_id', roadmapId);

    if (error) {
      console.error('Error deleting feature requests by roadmap:', error);
    }
  },

  // Duplicate a feature request
  async duplicate(id: string): Promise<FeatureRequest | undefined> {
    const feature = await this.getById(id);
    if (!feature) return undefined;

    const { id: _, createdAt, updatedAt, isDeleted, activities, ...featureData } = feature;

    return this.create({
      ...featureData,
      title: `${featureData.title} (Copy)`,
    });
  },

  // Count feature requests
  async count(roadmapId?: string, filter?: FeatureRequestFilter): Promise<number> {
    const features = await this.getAll(roadmapId, filter);
    return features.length;
  },

  // Get unique phases for a roadmap
  async getPhases(roadmapId: string): Promise<string[]> {
    const features = await this.getAll(roadmapId);
    const phases = new Set<string>();
    features.forEach((f) => {
      if (f.phase) phases.add(f.phase);
    });
    return Array.from(phases).sort();
  },
};
