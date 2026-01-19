'use client';

import { getSupabaseClient } from '@/lib/supabase/client';
import type { Note, NotesFilter, NotesSort, NoteFormData } from '@/types';

// Helper to convert database row to Note type
function rowToNote(row: any): Note {
    return {
        id: row.id,
        title: row.title,
        content: typeof row.content === 'string' ? row.content : JSON.stringify(row.content),
        tags: row.tags || [],
        authorId: row.author_id,
        authorName: row.author_name,
        authorAvatar: row.author_avatar,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        isDeleted: row.is_deleted,
    };
}

export const notesRepository = {
    // Get all notes with optional filtering and sorting
    async getAll(
        filter?: NotesFilter,
        sort?: NotesSort
    ): Promise<Note[]> {
        const supabase = getSupabaseClient();
        if (!supabase) return [];

        let query = supabase
            .from('notes')
            .select('*')
            .eq('is_deleted', false);

        // Apply filters
        if (filter?.tags && filter.tags.length > 0) {
            query = query.overlaps('tags', filter.tags);
        }

        if (filter?.authorId) {
            query = query.eq('author_id', filter.authorId);
        }

        if (filter?.search) {
            query = query.or(`title.ilike.%${filter.search}%,content::text.ilike.%${filter.search}%`);
        }

        // Apply sorting
        if (sort) {
            const column = sort.field === 'createdAt' ? 'created_at' :
                sort.field === 'updatedAt' ? 'updated_at' : sort.field;
            query = query.order(column, { ascending: sort.direction === 'asc' });
        } else {
            query = query.order('updated_at', { ascending: false });
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching notes:', error);
            return [];
        }

        return (data || []).map(rowToNote);
    },

    // Get a single note by ID
    async getById(id: string): Promise<Note | undefined> {
        const supabase = getSupabaseClient();
        if (!supabase) return undefined;

        const { data, error } = await supabase
            .from('notes')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !data) {
            console.error('Error fetching note:', error);
            return undefined;
        }

        return rowToNote(data);
    },

    // Create a new note
    async create(data: NoteFormData, authorId: string, authorName: string, authorAvatar?: string): Promise<Note | null> {
        const supabase = getSupabaseClient();
        if (!supabase) return null;

        const noteData = {
            title: data.title,
            content: data.content,
            tags: data.tags,
            author_id: authorId,
            author_name: authorName,
            author_avatar: authorAvatar || null,
            is_deleted: false,
        };

        const { data: insertedData, error } = await supabase
            .from('notes')
            .insert(noteData)
            .select()
            .single();

        if (error || !insertedData) {
            console.error('Error creating note:', error);
            return null;
        }

        return rowToNote(insertedData);
    },

    // Update an existing note
    async update(id: string, data: Partial<NoteFormData>): Promise<Note | undefined> {
        const supabase = getSupabaseClient();
        if (!supabase) return undefined;

        const row: Record<string, any> = {};

        if (data.title !== undefined) row.title = data.title;
        if (data.content !== undefined) row.content = data.content;
        if (data.tags !== undefined) row.tags = data.tags;

        const { data: updatedData, error } = await supabase
            .from('notes')
            .update(row)
            .eq('id', id)
            .select()
            .single();

        if (error || !updatedData) {
            console.error('Error updating note:', error);
            return undefined;
        }

        return rowToNote(updatedData);
    },

    // Soft delete a note
    async delete(id: string): Promise<void> {
        const supabase = getSupabaseClient();
        if (!supabase) return;

        const { error } = await supabase
            .from('notes')
            .update({ is_deleted: true })
            .eq('id', id);

        if (error) {
            console.error('Error deleting note:', error);
        }
    },

    // Hard delete a note (permanent)
    async hardDelete(id: string): Promise<void> {
        const supabase = getSupabaseClient();
        if (!supabase) return;

        const { error } = await supabase
            .from('notes')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error hard deleting note:', error);
        }
    },

    // Restore a soft-deleted note
    async restore(id: string): Promise<void> {
        const supabase = getSupabaseClient();
        if (!supabase) return;

        const { error } = await supabase
            .from('notes')
            .update({ is_deleted: false })
            .eq('id', id);

        if (error) {
            console.error('Error restoring note:', error);
        }
    },

    // Get deleted notes
    async getDeleted(): Promise<Note[]> {
        const supabase = getSupabaseClient();
        if (!supabase) return [];

        const { data, error } = await supabase
            .from('notes')
            .select('*')
            .eq('is_deleted', true);

        if (error) {
            console.error('Error fetching deleted notes:', error);
            return [];
        }

        return (data || []).map(rowToNote);
    },

    // Count notes
    async count(filter?: NotesFilter): Promise<number> {
        const notes = await this.getAll(filter);
        return notes.length;
    }
};
