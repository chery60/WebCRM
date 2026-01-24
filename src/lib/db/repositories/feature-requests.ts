import { db } from '../dexie';
import type { FeatureRequest, FeatureRequestFilter, FeatureRequestSort, FeatureActivity, FeatureAttachment } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { USE_SUPABASE } from '../database';
import { featureRequestsRepository as supabaseFeatureRequestsRepository } from './supabase/feature-requests';

const dexieFeatureRequestsRepository = {
  // Get all feature requests with optional filtering and sorting
  async getAll(
    roadmapId?: string,
    filter?: FeatureRequestFilter,
    sort?: FeatureRequestSort
  ): Promise<FeatureRequest[]> {
    let features = await db.featureRequests
      .filter((f) => !f.isDeleted)
      .toArray();

    // Filter by roadmap
    if (roadmapId) {
      features = features.filter((f) => f.roadmapId === roadmapId);
    }

    // Apply filters
    if (filter) {
      if (filter.status && filter.status.length > 0) {
        features = features.filter((f) => filter.status!.includes(f.status));
      }
      if (filter.priority && filter.priority.length > 0) {
        features = features.filter((f) => filter.priority!.includes(f.priority));
      }
      if (filter.phase && filter.phase.length > 0) {
        features = features.filter((f) => f.phase && filter.phase!.includes(f.phase));
      }
      if (filter.assignees && filter.assignees.length > 0) {
        features = features.filter((f) =>
          f.assignees.some((a) => filter.assignees!.includes(a))
        );
      }
      if (filter.tags && filter.tags.length > 0) {
        features = features.filter((f) =>
          f.tags.some((t) => filter.tags!.includes(t))
        );
      }
      if (filter.search) {
        const searchLower = filter.search.toLowerCase();
        features = features.filter(
          (f) =>
            f.title.toLowerCase().includes(searchLower) ||
            f.description?.toLowerCase().includes(searchLower) ||
            f.problemStatement?.toLowerCase().includes(searchLower)
        );
      }
    }

    // Apply sorting
    if (sort) {
      features.sort((a, b) => {
        let comparison = 0;
        switch (sort.field) {
          case 'title':
            comparison = a.title.localeCompare(b.title);
            break;
          case 'priority': {
            const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
            comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
            break;
          }
          case 'status': {
            comparison = a.status.localeCompare(b.status);
            break;
          }
          case 'dueDate':
            if (!a.dueDate && !b.dueDate) comparison = 0;
            else if (!a.dueDate) comparison = 1;
            else if (!b.dueDate) comparison = -1;
            else comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
            break;
          case 'order':
            comparison = a.order - b.order;
            break;
          case 'updatedAt':
            comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
            break;
          case 'createdAt':
          default:
            comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        return sort.direction === 'desc' ? -comparison : comparison;
      });
    } else {
      // Default sort by order, then by createdAt
      features.sort((a, b) => a.order - b.order || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }

    return features;
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

  // Get feature requests grouped by status (for Kanban view)
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
    const feature = await db.featureRequests.get(id);
    return feature?.isDeleted ? undefined : feature;
  },

  // Create a new feature request
  async create(
    data: Omit<FeatureRequest, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'activities' | 'attachments' | 'order'> & {
      activities?: FeatureActivity[];
      attachments?: FeatureAttachment[];
    }
  ): Promise<FeatureRequest> {
    const now = new Date();
    
    // Get max order for the roadmap
    const existingFeatures = await this.getAll(data.roadmapId);
    const maxOrder = existingFeatures.length > 0 
      ? Math.max(...existingFeatures.map((f) => f.order)) 
      : 0;

    const feature: FeatureRequest = {
      id: uuidv4(),
      ...data,
      activities: data.activities || [],
      attachments: data.attachments || [],
      order: maxOrder + 1,
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
    };
    await db.featureRequests.add(feature);
    return feature;
  },

  // Update a feature request
  async update(
    id: string,
    data: Partial<Omit<FeatureRequest, 'id' | 'createdAt'>>
  ): Promise<FeatureRequest | undefined> {
    const feature = await db.featureRequests.get(id);
    if (!feature || feature.isDeleted) return undefined;

    const updatedFeature: FeatureRequest = {
      ...feature,
      ...data,
      updatedAt: new Date(),
    };
    await db.featureRequests.put(updatedFeature);
    return updatedFeature;
  },

  // Add activity to a feature request
  async addActivity(id: string, activity: Omit<FeatureActivity, 'id' | 'createdAt'>): Promise<FeatureRequest | undefined> {
    const feature = await db.featureRequests.get(id);
    if (!feature || feature.isDeleted) return undefined;

    const newActivity: FeatureActivity = {
      ...activity,
      id: uuidv4(),
      createdAt: new Date(),
    };

    const updatedFeature: FeatureRequest = {
      ...feature,
      activities: [...feature.activities, newActivity],
      updatedAt: new Date(),
    };
    await db.featureRequests.put(updatedFeature);
    return updatedFeature;
  },

  // Add attachment to a feature request
  async addAttachment(id: string, attachment: Omit<FeatureAttachment, 'id' | 'uploadedAt'>): Promise<FeatureRequest | undefined> {
    const feature = await db.featureRequests.get(id);
    if (!feature || feature.isDeleted) return undefined;

    const newAttachment: FeatureAttachment = {
      ...attachment,
      id: uuidv4(),
      uploadedAt: new Date(),
    };

    const updatedFeature: FeatureRequest = {
      ...feature,
      attachments: [...feature.attachments, newAttachment],
      updatedAt: new Date(),
    };
    await db.featureRequests.put(updatedFeature);
    return updatedFeature;
  },

  // Remove attachment from a feature request
  async removeAttachment(id: string, attachmentId: string): Promise<FeatureRequest | undefined> {
    const feature = await db.featureRequests.get(id);
    if (!feature || feature.isDeleted) return undefined;

    const updatedFeature: FeatureRequest = {
      ...feature,
      attachments: feature.attachments.filter((a) => a.id !== attachmentId),
      updatedAt: new Date(),
    };
    await db.featureRequests.put(updatedFeature);
    return updatedFeature;
  },

  // Reorder feature requests
  async reorder(roadmapId: string, orderedIds: string[]): Promise<void> {
    const features = await this.getAll(roadmapId);
    
    await Promise.all(
      orderedIds.map((id, index) => {
        const feature = features.find((f) => f.id === id);
        if (feature) {
          return this.update(id, { order: index });
        }
        return Promise.resolve();
      })
    );
  },

  // Soft delete a feature request
  async delete(id: string): Promise<boolean> {
    const feature = await db.featureRequests.get(id);
    if (!feature) return false;

    await db.featureRequests.update(id, { isDeleted: true, updatedAt: new Date() });
    return true;
  },

  // Delete all feature requests for a roadmap
  async deleteByRoadmapId(roadmapId: string): Promise<void> {
    const features = await this.getAll(roadmapId);
    await Promise.all(features.map((f) => this.delete(f.id)));
  },

  // Duplicate a feature request
  async duplicate(id: string): Promise<FeatureRequest | undefined> {
    const feature = await db.featureRequests.get(id);
    if (!feature || feature.isDeleted) return undefined;

    const now = new Date();
    const duplicated: FeatureRequest = {
      ...feature,
      id: uuidv4(),
      title: `${feature.title} (Copy)`,
      activities: [],
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
    };

    // Get new order
    const existingFeatures = await this.getAll(feature.roadmapId);
    duplicated.order = existingFeatures.length > 0 
      ? Math.max(...existingFeatures.map((f) => f.order)) + 1 
      : 0;

    await db.featureRequests.add(duplicated);
    return duplicated;
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

// Export the appropriate repository based on the database backend
export const featureRequestsRepository = USE_SUPABASE ? supabaseFeatureRequestsRepository : dexieFeatureRequestsRepository;
