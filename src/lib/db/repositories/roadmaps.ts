import { db } from '../dexie';
import type { Roadmap } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { USE_SUPABASE } from '../database';
import { roadmapsRepository as supabaseRoadmapsRepository } from './supabase/roadmaps';

const dexieRoadmapsRepository = {
  // Get all roadmaps
  async getAll(pipelineId?: string): Promise<Roadmap[]> {
    let roadmaps = await db.roadmaps
      .filter((r) => !r.isDeleted)
      .toArray();
    
    if (pipelineId) {
      roadmaps = roadmaps.filter((r) => r.pipelineId === pipelineId);
    }
    
    return roadmaps.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  // Get roadmaps by pipeline ID
  async getByPipelineId(pipelineId: string): Promise<Roadmap[]> {
    return this.getAll(pipelineId);
  },

  // Get a single roadmap by ID
  async getById(id: string): Promise<Roadmap | undefined> {
    const roadmap = await db.roadmaps.get(id);
    return roadmap?.isDeleted ? undefined : roadmap;
  },

  // Create a new roadmap
  async create(data: Omit<Roadmap, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>): Promise<Roadmap> {
    const now = new Date();
    const roadmap: Roadmap = {
      id: uuidv4(),
      ...data,
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
    };
    await db.roadmaps.add(roadmap);
    return roadmap;
  },

  // Update a roadmap
  async update(id: string, data: Partial<Omit<Roadmap, 'id' | 'createdAt'>>): Promise<Roadmap | undefined> {
    const roadmap = await db.roadmaps.get(id);
    if (!roadmap || roadmap.isDeleted) return undefined;

    const updatedRoadmap: Roadmap = {
      ...roadmap,
      ...data,
      updatedAt: new Date(),
    };
    await db.roadmaps.put(updatedRoadmap);
    return updatedRoadmap;
  },

  // Soft delete a roadmap
  async delete(id: string): Promise<boolean> {
    const roadmap = await db.roadmaps.get(id);
    if (!roadmap) return false;

    await db.roadmaps.update(id, { isDeleted: true, updatedAt: new Date() });
    return true;
  },

  // Delete all roadmaps for a pipeline (when pipeline is deleted)
  async deleteByPipelineId(pipelineId: string): Promise<void> {
    const roadmaps = await this.getByPipelineId(pipelineId);
    await Promise.all(roadmaps.map((r) => this.delete(r.id)));
  },

  // Count roadmaps
  async count(pipelineId?: string): Promise<number> {
    const roadmaps = await this.getAll(pipelineId);
    return roadmaps.length;
  },
};

// Export the appropriate repository based on the database backend
export const roadmapsRepository = USE_SUPABASE ? supabaseRoadmapsRepository : dexieRoadmapsRepository;
