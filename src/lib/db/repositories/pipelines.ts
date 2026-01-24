import { db } from '../dexie';
import type { Pipeline } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { USE_SUPABASE } from '../database';
import { pipelinesRepository as supabasePipelinesRepository } from './supabase/pipelines';

const dexiePipelinesRepository = {
  // Get all pipelines
  async getAll(): Promise<Pipeline[]> {
    const pipelines = await db.pipelines
      .filter((p) => !p.isDeleted)
      .toArray();
    return pipelines.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  // Get a single pipeline by ID
  async getById(id: string): Promise<Pipeline | undefined> {
    const pipeline = await db.pipelines.get(id);
    return pipeline?.isDeleted ? undefined : pipeline;
  },

  // Create a new pipeline
  async create(data: Omit<Pipeline, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>): Promise<Pipeline> {
    const now = new Date();
    const pipeline: Pipeline = {
      id: uuidv4(),
      ...data,
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
    };
    await db.pipelines.add(pipeline);
    return pipeline;
  },

  // Update a pipeline
  async update(id: string, data: Partial<Omit<Pipeline, 'id' | 'createdAt'>>): Promise<Pipeline | undefined> {
    const pipeline = await db.pipelines.get(id);
    if (!pipeline || pipeline.isDeleted) return undefined;

    const updatedPipeline: Pipeline = {
      ...pipeline,
      ...data,
      updatedAt: new Date(),
    };
    await db.pipelines.put(updatedPipeline);
    return updatedPipeline;
  },

  // Soft delete a pipeline
  async delete(id: string): Promise<boolean> {
    const pipeline = await db.pipelines.get(id);
    if (!pipeline) return false;

    await db.pipelines.update(id, { isDeleted: true, updatedAt: new Date() });
    return true;
  },

  // Hard delete (for testing)
  async hardDelete(id: string): Promise<boolean> {
    await db.pipelines.delete(id);
    return true;
  },

  // Count pipelines
  async count(): Promise<number> {
    return await db.pipelines.filter((p) => !p.isDeleted).count();
  },
};

// Export the appropriate repository based on the database backend
export const pipelinesRepository = USE_SUPABASE ? supabasePipelinesRepository : dexiePipelinesRepository;
