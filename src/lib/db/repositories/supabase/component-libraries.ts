'use client';

import { getSupabaseClient } from '@/lib/supabase/client';
import type { ComponentLibrary, LibraryComponent, ComponentLibraryFormData } from '@/types';

function rowToLibrary(row: any, componentCount?: number): ComponentLibrary {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    description: row.description || undefined,
    packageName: row.package_name || undefined,
    packageVersion: row.package_version || undefined,
    repoUrl: row.repo_url || undefined,
    storybookUrl: row.storybook_url || undefined,
    importSource: row.import_source || 'manual',
    isPublic: row.is_public ?? false,
    componentCount: componentCount ?? row.component_count ?? 0,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function rowToComponent(row: any): LibraryComponent {
  return {
    id: row.id,
    libraryId: row.library_id,
    name: row.name,
    filePath: row.file_path,
    codeContent: row.code_content,
    category: row.category || undefined,
    description: row.description || undefined,
    propsSchema: row.props_schema || undefined,
    exampleUsage: row.example_usage || undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export const componentLibrariesRepository = {
  async getAll(workspaceId: string): Promise<ComponentLibrary[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    if (!workspaceId) {
      console.warn('[ComponentLibraries] No workspace provided');
      return [];
    }

    try {
      // First try with component count
      const { data, error } = await supabase
        .from('component_libraries')
        .select('*, library_components(count)')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (error) {
        // If the join fails (e.g. table not fully migrated), try without count
        if (error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('relation')) {
          console.warn('[ComponentLibraries] Table not found - migration may not have been applied yet.');
          return [];
        }
        // Try simpler query without the join
        const { data: simpleData, error: simpleError } = await supabase
          .from('component_libraries')
          .select('*')
          .eq('workspace_id', workspaceId)
          .order('created_at', { ascending: false });

        if (simpleError) {
          console.error('[ComponentLibraries] Error fetching libraries:', simpleError.message || simpleError);
          return [];
        }
        return (simpleData || []).map((row: any) => rowToLibrary(row, 0));
      }

      return (data || []).map((row: any) => {
        const count = row.library_components?.[0]?.count ?? 0;
        return rowToLibrary(row, typeof count === 'string' ? parseInt(count, 10) : count);
      });
    } catch (err: any) {
      console.error('[ComponentLibraries] Unexpected error fetching libraries:', err?.message || err);
      return [];
    }
  },

  async getById(id: string): Promise<ComponentLibrary | undefined> {
    const supabase = getSupabaseClient();
    if (!supabase) return undefined;

    try {
      const { data, error } = await supabase
        .from('component_libraries')
        .select('*, library_components(count)')
        .eq('id', id)
        .single();

      if (error || !data) {
        // Try without join on error
        const { data: simple, error: simpleErr } = await supabase
          .from('component_libraries')
          .select('*')
          .eq('id', id)
          .single();
        if (simpleErr || !simple) {
          console.error('[ComponentLibraries] Error fetching library:', simpleErr?.message || simpleErr);
          return undefined;
        }
        return rowToLibrary(simple, 0);
      }

      const count = data.library_components?.[0]?.count ?? 0;
      return rowToLibrary(data, typeof count === 'string' ? parseInt(count, 10) : count);
    } catch (err: any) {
      console.error('[ComponentLibraries] Unexpected error fetching library:', err?.message || err);
      return undefined;
    }
  },

  async create(formData: ComponentLibraryFormData): Promise<ComponentLibrary> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client not available');

    const { data, error } = await supabase
      .from('component_libraries')
      .insert({
        workspace_id: formData.workspaceId,
        name: formData.name,
        description: formData.description || null,
        package_name: formData.packageName || null,
        package_version: formData.packageVersion || null,
        repo_url: formData.repoUrl || null,
        storybook_url: formData.storybookUrl || null,
        import_source: formData.importSource,
        is_public: false,
      })
      .select()
      .single();

    if (error || !data) {
      console.error('[ComponentLibraries] Error creating library:', error?.message || error?.message || error);
      if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
        throw new Error('Database tables not set up yet. Please run the migration (035_prototyping_schema.sql) in your Supabase SQL editor first.');
      }
      throw new Error(error?.message || 'Failed to create component library');
    }

    return rowToLibrary(data, 0);
  },

  async update(id: string, updates: Partial<ComponentLibraryFormData>): Promise<ComponentLibrary | undefined> {
    const supabase = getSupabaseClient();
    if (!supabase) return undefined;

    const updateData: Record<string, any> = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.packageName !== undefined) updateData.package_name = updates.packageName;
    if (updates.packageVersion !== undefined) updateData.package_version = updates.packageVersion;
    if (updates.repoUrl !== undefined) updateData.repo_url = updates.repoUrl;
    if (updates.storybookUrl !== undefined) updateData.storybook_url = updates.storybookUrl;

    const { data, error } = await supabase
      .from('component_libraries')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      console.error('[ComponentLibraries] Error updating library:', error?.message || error);
      return undefined;
    }

    return rowToLibrary(data);
  },

  async delete(id: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const { error } = await supabase
      .from('component_libraries')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[ComponentLibraries] Error deleting library:', error?.message || error);
      return false;
    }
    return true;
  },

  // ── Components ──────────────────────────────────────────────────────────────

  async getComponents(libraryId: string): Promise<LibraryComponent[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('library_components')
      .select('*')
      .eq('library_id', libraryId)
      .order('name', { ascending: true });

    if (error) {
      console.error('[ComponentLibraries] Error fetching components:', error?.message || error);
      return [];
    }

    return (data || []).map(rowToComponent);
  },

  async bulkInsertComponents(
    libraryId: string,
    components: Omit<LibraryComponent, 'id' | 'libraryId' | 'createdAt' | 'updatedAt'>[]
  ): Promise<LibraryComponent[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const rows = components.map((c) => ({
      library_id: libraryId,
      name: c.name,
      file_path: c.filePath,
      code_content: c.codeContent,
      category: c.category || null,
      description: c.description || null,
      props_schema: c.propsSchema || null,
      example_usage: c.exampleUsage || null,
    }));

    const { data, error } = await supabase
      .from('library_components')
      .upsert(rows, { onConflict: 'library_id,name' })
      .select();

    if (error) {
      console.error('[ComponentLibraries] Error inserting components:', error?.message || error);
      return [];
    }

    return (data || []).map(rowToComponent);
  },

  async deleteAllComponents(libraryId: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const { error } = await supabase
      .from('library_components')
      .delete()
      .eq('library_id', libraryId);

    if (error) {
      console.error('[ComponentLibraries] Error deleting components:', error?.message || error);
      return false;
    }
    return true;
  },
};
