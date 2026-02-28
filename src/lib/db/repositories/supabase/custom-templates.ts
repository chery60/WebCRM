/**
 * Supabase repository for custom PRD templates
 */

import { getSupabaseClient } from '@/lib/supabase/client';
import type {
  CustomPRDTemplate,
  TemplateSection,
  TemplateCategory,
  TemplateVersion
} from '@/types';

export interface CustomTemplateRow {
  id: string;
  name: string;
  description: string | null;
  sections: TemplateSection[];
  is_starter_template: boolean;
  context_prompt: string | null;
  icon: string | null;
  color: string | null;
  use_cases: string[] | null;
  category: TemplateCategory;
  version: number;
  version_history: TemplateVersion[];
  user_id: string | null;
  workspace_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomCategoryRow {
  id: string;
  name: string;
  label: string;
  icon: string | null;
  color: string | null;
  user_id: string;
  workspace_id: string | null;
  created_at: string;
}

function mapRowToTemplate(row: CustomTemplateRow): CustomPRDTemplate {
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    sections: row.sections,
    isStarterTemplate: row.is_starter_template,
    contextPrompt: row.context_prompt || undefined,
    icon: row.icon || undefined,
    color: row.color || undefined,
    useCases: row.use_cases || undefined,
    category: row.category,
    version: row.version,
    versionHistory: row.version_history,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function mapTemplateToRow(template: Omit<CustomPRDTemplate, 'createdAt' | 'updatedAt'>): Partial<CustomTemplateRow> {
  return {
    id: template.id,
    name: template.name,
    description: template.description,
    sections: template.sections,
    is_starter_template: template.isStarterTemplate || false,
    context_prompt: template.contextPrompt || null,
    icon: template.icon || null,
    color: template.color || null,
    use_cases: template.useCases || null,
    category: template.category || 'custom',
    version: template.version || 1,
    version_history: template.versionHistory || [],
  };
}

export async function getCustomTemplates(userId?: string): Promise<CustomPRDTemplate[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('custom_prd_templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[custom-templates] Fetch error:', error.code, error.message, error.details);
      return [];
    }

    return (data as CustomTemplateRow[]).map(mapRowToTemplate);
  } catch (e) {
    // Silently fail - table may not exist
    return [];
  }
}

export async function getCustomTemplateById(id: string): Promise<CustomPRDTemplate | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('custom_prd_templates')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching custom template:', error?.message || error?.message || error);
    return null;
  }

  return mapRowToTemplate(data as CustomTemplateRow);
}

export async function createCustomTemplate(
  template: Omit<CustomPRDTemplate, 'createdAt' | 'updatedAt'>,
  userId: string
): Promise<CustomPRDTemplate | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const row = mapTemplateToRow(template);

    // If the id is not a valid UUID (e.g. starter template ids like 'starter-b2b-saas'),
    // omit it so Supabase auto-generates a proper UUID for the new row.
    const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(row.id || '');
    if (!isValidUUID) {
      delete row.id;
    }

    const { data, error } = await supabase
      .from('custom_prd_templates')
      .insert({
        ...row,
        user_id: userId,
      })
      .select()
      .single();

    if (error) {
      console.error('[custom-templates] Create error:', error.code, error.message, error.details, error.hint);
      return null;
    }

    return mapRowToTemplate(data as CustomTemplateRow);
  } catch (e) {
    return null;
  }
}

export async function updateCustomTemplate(
  id: string,
  updates: Partial<Omit<CustomPRDTemplate, 'id' | 'createdAt' | 'updatedAt'>>,
  userId: string
): Promise<CustomPRDTemplate | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const updateData: Partial<CustomTemplateRow> = {};

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.sections !== undefined) updateData.sections = updates.sections;
    if (updates.contextPrompt !== undefined) updateData.context_prompt = updates.contextPrompt;
    if (updates.icon !== undefined) updateData.icon = updates.icon;
    if (updates.color !== undefined) updateData.color = updates.color;
    if (updates.useCases !== undefined) updateData.use_cases = updates.useCases;
    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.version !== undefined) updateData.version = updates.version;
    if (updates.versionHistory !== undefined) updateData.version_history = updates.versionHistory;

    const { data, error } = await supabase
      .from('custom_prd_templates')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('[custom-templates] Update error:', error.code, error.message, error.details, error.hint);
      return null;
    }

    return mapRowToTemplate(data as CustomTemplateRow);
  } catch (e) {
    console.error('[custom-templates] Update exception:', e);
    return null;
  }
}

export async function deleteCustomTemplate(id: string, userId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('custom_prd_templates')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('[custom-templates] Delete error:', error.code, error.message, error.details, error.hint);
      return false;
    }

    return true;
  } catch (e) {
    return false;
  }
}

export async function getCustomTemplatesByCategory(
  category: TemplateCategory,
  userId?: string
): Promise<CustomPRDTemplate[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('custom_prd_templates')
    .select('*')
    .eq('category', category)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching templates by category:', error?.message || error?.message || error);
    return [];
  }

  return (data as CustomTemplateRow[]).map(mapRowToTemplate);
}

// Custom categories management
export async function getCustomCategories(userId: string): Promise<CustomCategoryRow[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('custom_template_categories')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching custom categories:', error?.message || error?.message || error);
    return [];
  }

  return data as CustomCategoryRow[];
}

export async function createCustomCategory(
  category: { name: string; label: string; icon?: string; color?: string },
  userId: string
): Promise<CustomCategoryRow | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('custom_template_categories')
    .insert({
      name: category.name,
      label: category.label,
      icon: category.icon || null,
      color: category.color || null,
      user_id: userId,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating custom category:', error?.message || error?.message || error);
    return null;
  }

  return data as CustomCategoryRow;
}
