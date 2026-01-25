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
        projectId: row.project_id || undefined,
        authorId: row.author_id,
        authorName: row.author_name,
        authorAvatar: row.author_avatar,
        generatedFeatures: row.generated_features || [],
        generatedTasks: row.generated_tasks || [],
        canvasData: row.canvas_data || undefined,
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

        // Filter by project: if projectId provided, show PRDs for that project
        // If includeAllProjects is true, return all PRDs (for sidebar)
        // If no projectId and not includeAllProjects, show only unassigned PRDs
        if (filter?.projectId) {
            query = query.eq('project_id', filter.projectId);
        } else if (!filter?.includeAllProjects) {
            query = query.is('project_id', null);
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
            project_id: data.projectId || null,
            author_id: authorId,
            author_name: authorName,
            author_avatar: authorAvatar || null,
            generated_features: data.generatedFeatures || [],
            generated_tasks: data.generatedTasks || [],
            canvas_data: data.canvasData || null,
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
        if (data.projectId !== undefined) row.project_id = data.projectId || null;
        if (data.generatedFeatures !== undefined) row.generated_features = data.generatedFeatures;
        if (data.generatedTasks !== undefined) row.generated_tasks = data.generatedTasks;
        if (data.canvasData !== undefined) row.canvas_data = data.canvasData || null;

        // Don't make an update call if there's nothing to update
        if (Object.keys(row).length === 0) {
            // Return current note data instead of making an empty update
            return this.getById(id);
        }

        const { data: updatedData, error } = await supabase
            .from('notes')
            .update(row)
            .eq('id', id)
            .select()
            .single();

        if (error || !updatedData) {
            console.error('Error updating note:', error?.message || error?.code || JSON.stringify(error));
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
    },

    // Duplicate a note
    async duplicate(id: string): Promise<Note | undefined> {
        const note = await this.getById(id);
        if (!note) return undefined;

        const supabase = getSupabaseClient();
        if (!supabase) return undefined;

        const noteData = {
            title: `${note.title} (Copy)`,
            content: note.content,
            tags: note.tags,
            project_id: note.projectId || null,
            author_id: note.authorId,
            author_name: note.authorName,
            author_avatar: note.authorAvatar || null,
            generated_features: note.generatedFeatures || [],
            generated_tasks: note.generatedTasks || [],
            canvas_data: note.canvasData || null,
            is_deleted: false,
        };

        const { data: insertedData, error } = await supabase
            .from('notes')
            .insert(noteData)
            .select()
            .single();

        if (error || !insertedData) {
            console.error('Error duplicating note:', error);
            return undefined;
        }

        return rowToNote(insertedData);
    }
};
