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
    async create(name: string, color: Tag['color'], category: Tag['category'] = 'custom'): Promise<Tag | null> {
        const supabase = getSupabaseClient();
        if (!supabase) return null;

        const { data, error } = await supabase
            .from('tags')
            .insert({
                name,
                color,
                category,
            })
            .select()
            .single();

        if (error || !data) {
            console.error('Error creating tag:', error);
            return null;
        }

        return rowToTag(data);
    },

    // Get tag by name
    async getByName(name: string): Promise<Tag | undefined> {
        const supabase = getSupabaseClient();
        if (!supabase) return undefined;

        const { data, error } = await supabase
            .from('tags')
            .select('*')
            .ilike('name', name)
            .single();

        if (error || !data) {
            return undefined;
        }

        return rowToTag(data);
    },

    // Check if tag exists
    async exists(name: string): Promise<boolean> {
        const tag = await this.getByName(name);
        return !!tag;
    },

    // Update a tag
    async update(id: string, updates: Partial<Tag>): Promise<Tag | undefined> {
        const supabase = getSupabaseClient();
        if (!supabase) return undefined;

        const row: Record<string, any> = {};
        if (updates.name !== undefined) row.name = updates.name;
        if (updates.color !== undefined) row.color = updates.color;
        if (updates.category !== undefined) row.category = updates.category;

        // Don't make an update call if there's nothing to update
        if (Object.keys(row).length === 0) {
            return this.getById(id);
        }

        const { data, error } = await supabase
            .from('tags')
            .update(row)
            .eq('id', id)
            .select()
            .single();

        if (error || !data) {
            console.error('Error updating tag:', error?.message || error?.code || JSON.stringify(error));
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
