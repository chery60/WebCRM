import { db } from '../dexie';
import type { Tag, TagColor } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { USE_SUPABASE } from '../database';
import { tagsRepository as supabaseTagsRepository } from './supabase/tags';

const dexieTagsRepository = {
  // Get all tags
  async getAll(): Promise<Tag[]> {
    return db.tags.toArray();
  },

  // Get tags by category
  async getByCategory(category: Tag['category']): Promise<Tag[]> {
    return db.tags.where('category').equals(category).toArray();
  },

  // Get a single tag by ID
  async getById(id: string): Promise<Tag | undefined> {
    return db.tags.get(id);
  },

  // Get tag by name
  async getByName(name: string): Promise<Tag | undefined> {
    return db.tags.where('name').equalsIgnoreCase(name).first();
  },

  // Create a new tag
  async create(name: string, color: TagColor, category: Tag['category'] = 'custom'): Promise<Tag> {
    const tag: Tag = {
      id: uuidv4(),
      name,
      color,
      category,
    };

    await db.tags.add(tag);
    return tag;
  },

  // Update an existing tag
  async update(id: string, data: Partial<Omit<Tag, 'id'>>): Promise<Tag | undefined> {
    await db.tags.update(id, data);
    return db.tags.get(id);
  },

  // Delete a tag
  async delete(id: string): Promise<void> {
    await db.tags.delete(id);
  },

  // Check if tag exists
  async exists(name: string): Promise<boolean> {
    const tag = await this.getByName(name);
    return !!tag;
  }
};

// Export the appropriate repository based on the database backend
export const tagsRepository = USE_SUPABASE ? supabaseTagsRepository : dexieTagsRepository;

