'use client';

import { getSupabaseClient } from '@/lib/supabase/client';
import type { Tag } from '@/types';

// Helper to convert database row to Tag type
function rowToTag(row: any): Tag {
    return {
        id: row.id,
        name: row.name,
        color: row.color,
        category: row.category,
    };
}

export const tagsRepository = {
    // Get all tags
    async getAll(): Promise<Tag[]> {
        const supabase = getSupabaseClient();
        if (!supabase) return [];

        const { data, error } = await supabase
            .from('tags')
            .select('*')
            .order('name');

        if (error) {
            console.error('Error fetching tags:', error);
            return [];
        }

        return (data || []).map(rowToTag);
    },

    // Get tag by ID
    async getById(id: string): Promise<Tag | undefined> {
        const supabase = getSupabaseClient();
        if (!supabase) return undefined;

        const { data, error } = await supabase
            .from('tags')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !data) {
            console.error('Error fetching tag:', error);
            return undefined;
        }

        return rowToTag(data);
    },

    // Get tags by category
    async getByCategory(category: string): Promise<Tag[]> {
        const supabase = getSupabaseClient();
        if (!supabase) return [];

        const { data, error } = await supabase
            .from('tags')
            .select('*')
            .eq('category', category)
            .order('name');

        if (error) {
            console.error('Error fetching tags by category:', error);
            return [];
        }

        return (data || []).map(rowToTag);
    },

    // Create a new tag
    async create(tag: Omit<Tag, 'id'>): Promise<Tag | null> {
        const supabase = getSupabaseClient();
        if (!supabase) return null;

        const { data, error } = await supabase
            .from('tags')
            .insert({
                name: tag.name,
                color: tag.color,
                category: tag.category,
            })
            .select()
            .single();

        if (error || !data) {
            console.error('Error creating tag:', error);
            return null;
        }

        return rowToTag(data);
    },

    // Update a tag
    async update(id: string, updates: Partial<Tag>): Promise<Tag | undefined> {
        const supabase = getSupabaseClient();
        if (!supabase) return undefined;

        const row: Record<string, any> = {};
        if (updates.name !== undefined) row.name = updates.name;
        if (updates.color !== undefined) row.color = updates.color;
        if (updates.category !== undefined) row.category = updates.category;

        const { data, error } = await supabase
            .from('tags')
            .update(row)
            .eq('id', id)
            .select()
            .single();

        if (error || !data) {
            console.error('Error updating tag:', error);
            return undefined;
        }

        return rowToTag(data);
    },

    // Delete a tag
    async delete(id: string): Promise<boolean> {
        const supabase = getSupabaseClient();
        if (!supabase) return false;

        const { error } = await supabase
            .from('tags')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting tag:', error);
            return false;
        }

        return true;
    },
};
