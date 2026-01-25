import { db } from '../dexie';
import type { Note, NotesFilter, NotesSort, NoteFormData } from '@/types';
import { v4 as uuidv4 } from 'uuid';

// Repository pattern for easy Supabase migration
export const notesRepository = {
  // Get all notes with optional filtering and sorting
  async getAll(
    filter?: NotesFilter,
    sort?: NotesSort
  ): Promise<Note[]> {
    // Get all notes and filter out deleted ones
    let notes = await db.notes.toArray();
    notes = notes.filter(note => !note.isDeleted);

    // Apply filters
    if (filter?.tags && filter.tags.length > 0) {
      notes = notes.filter(note => 
        filter.tags!.some(tag => note.tags.includes(tag))
      );
    }

    if (filter?.search) {
      const searchLower = filter.search.toLowerCase();
      notes = notes.filter(note =>
        note.title.toLowerCase().includes(searchLower) ||
        note.content.toLowerCase().includes(searchLower)
      );
    }

    if (filter?.authorId) {
      notes = notes.filter(note => note.authorId === filter.authorId);
    }

    // Filter by project: if projectId provided, show PRDs for that project
    // If includeAllProjects is true, return all PRDs (for sidebar)
    // If no projectId and not includeAllProjects, show only unassigned PRDs
    if (filter?.projectId) {
      notes = notes.filter(note => note.projectId === filter.projectId);
    } else if (!filter?.includeAllProjects) {
      notes = notes.filter(note => !note.projectId);
    }

    // Apply sorting
    if (sort) {
      notes.sort((a, b) => {
        const aVal = a[sort.field];
        const bVal = b[sort.field];
        
        if (aVal instanceof Date && bVal instanceof Date) {
          return sort.direction === 'asc' 
            ? aVal.getTime() - bVal.getTime()
            : bVal.getTime() - aVal.getTime();
        }
        
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sort.direction === 'asc'
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }
        
        return 0;
      });
    } else {
      // Default sort by updatedAt desc
      notes.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    }

    return notes;
  },

  // Get a single note by ID
  async getById(id: string): Promise<Note | undefined> {
    return db.notes.get(id);
  },

  // Create a new note
  async create(data: NoteFormData, authorId: string, authorName: string, authorAvatar?: string): Promise<Note> {
    const now = new Date();
    const note: Note = {
      id: uuidv4(),
      title: data.title,
      content: data.content,
      tags: data.tags,
      projectId: data.projectId,
      generatedFeatures: data.generatedFeatures,
      generatedTasks: data.generatedTasks,
      authorId,
      authorName,
      authorAvatar,
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
    };

    await db.notes.add(note);
    return note;
  },

  // Update an existing note
  async update(id: string, data: Partial<NoteFormData>): Promise<Note | undefined> {
    const updates: Partial<Note> = {
      ...data,
      updatedAt: new Date(),
    };

    await db.notes.update(id, updates);
    return db.notes.get(id);
  },

  // Soft delete a note
  async delete(id: string): Promise<void> {
    await db.notes.update(id, { 
      isDeleted: true,
      updatedAt: new Date()
    });
  },

  // Hard delete a note (permanent)
  async hardDelete(id: string): Promise<void> {
    await db.notes.delete(id);
  },

  // Restore a soft-deleted note
  async restore(id: string): Promise<void> {
    await db.notes.update(id, {
      isDeleted: false,
      updatedAt: new Date()
    });
  },

  // Get deleted notes
  async getDeleted(): Promise<Note[]> {
    const notes = await db.notes.toArray();
    return notes.filter(note => note.isDeleted);
  },

  // Duplicate a note
  async duplicate(id: string): Promise<Note | undefined> {
    const note = await db.notes.get(id);
    if (!note) return undefined;

    const now = new Date();
    const duplicatedNote: Note = {
      ...note,
      id: uuidv4(),
      title: `${note.title} (Copy)`,
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
    };

    await db.notes.add(duplicatedNote);
    return duplicatedNote;
  },

  // Count notes
  async count(filter?: NotesFilter): Promise<number> {
    const notes = await this.getAll(filter);
    return notes.length;
  }
};

