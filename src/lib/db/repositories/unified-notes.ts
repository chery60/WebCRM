'use client';

/**
 * Unified Notes Repository
 * 
 * This module exports a single notes repository that uses either
 * Dexie or Supabase based on the USE_SUPABASE feature flag.
 */

import { USE_SUPABASE } from '../database';
import type { Note, NotesFilter, NotesSort, NoteFormData } from '@/types';

// Import both repository implementations
import { notesRepository as dexieNotesRepo } from './notes';
import { notesRepository as supabaseNotesRepo } from './supabase/notes';

// Select the appropriate repository based on feature flag
const repo = USE_SUPABASE ? supabaseNotesRepo : dexieNotesRepo;

export const notesRepository = {
    getAll: (filter?: NotesFilter, sort?: NotesSort): Promise<Note[]> => repo.getAll(filter, sort),
    getById: (id: string): Promise<Note | undefined> => repo.getById(id),
    create: (data: NoteFormData, authorId: string, authorName: string, authorAvatar?: string): Promise<Note | null> =>
        repo.create(data, authorId, authorName, authorAvatar),
    update: (id: string, data: Partial<NoteFormData>): Promise<Note | undefined> => repo.update(id, data),
    delete: (id: string): Promise<void> => repo.delete(id),
    hardDelete: (id: string): Promise<void> => repo.hardDelete(id),
    restore: (id: string): Promise<void> => repo.restore(id),
    getDeleted: (): Promise<Note[]> => repo.getDeleted(),
    count: (filter?: NotesFilter): Promise<number> => repo.count(filter),
};
