import { db } from '../dexie';
import type { Project } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { USE_SUPABASE } from '../database';
import { projectsRepository as supabaseProjectsRepository } from './supabase/projects';

const dexieProjectsRepository = {
  async getAll(): Promise<Project[]> {
    return db.projects
      .filter(p => !p.isDeleted)
      .toArray();
  },

  async getById(id: string): Promise<Project | undefined> {
    const project = await db.projects.get(id);
    return project?.isDeleted ? undefined : project;
  },

  async create(data: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>): Promise<Project> {
    const now = new Date();
    const project: Project = {
      ...data,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
    };
    await db.projects.add(project);
    return project;
  },

  async update(id: string, data: Partial<Omit<Project, 'id' | 'createdAt'>>): Promise<Project | undefined> {
    const existing = await db.projects.get(id);
    if (!existing || existing.isDeleted) return undefined;

    const updated: Project = {
      ...existing,
      ...data,
      updatedAt: new Date(),
    };
    await db.projects.put(updated);
    return updated;
  },

  async delete(id: string): Promise<boolean> {
    const existing = await db.projects.get(id);
    if (!existing) return false;

    // Move notes from this project to "All Notes" (unset projectId)
    const notesInProject = await db.notes
      .filter(n => !n.isDeleted && n.projectId === id)
      .toArray();
    
    for (const note of notesInProject) {
      await db.notes.update(note.id, {
        projectId: undefined,
        updatedAt: new Date(),
      });
    }

    // Soft delete the project
    await db.projects.update(id, {
      isDeleted: true,
      updatedAt: new Date(),
    });
    return true;
  },

  async getNoteCount(projectId: string): Promise<number> {
    return db.notes
      .filter(n => !n.isDeleted && n.projectId === projectId)
      .count();
  },

  async getAllNoteCounts(): Promise<Map<string, number>> {
    const notes = await db.notes
      .filter(n => !n.isDeleted && n.projectId !== undefined)
      .toArray();

    const counts = new Map<string, number>();
    notes.forEach(note => {
      if (note.projectId) {
        const current = counts.get(note.projectId) || 0;
        counts.set(note.projectId, current + 1);
      }
    });

    return counts;
  },
};

// Export the appropriate repository based on the database backend
export const projectsRepository = USE_SUPABASE ? supabaseProjectsRepository : dexieProjectsRepository;
