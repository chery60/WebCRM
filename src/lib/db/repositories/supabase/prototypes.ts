'use client';

import { getSupabaseClient } from '@/lib/supabase/client';
import type { Prototype, PrototypeChatMessage } from '@/types';

// ─── Row mapper ───────────────────────────────────────────────────────────────

function rowToPrototype(row: any): Prototype {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    projectId: row.project_id ?? undefined,
    prdId: row.prd_id ?? undefined,
    libraryId: row.library_id ?? undefined,
    name: row.name,
    codeContent: row.code_content ?? undefined,
    chatHistory: (row.chat_history as PrototypeChatMessage[]) ?? [],
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

// ─── Repository ───────────────────────────────────────────────────────────────

export const prototypesRepository = {
  /** List all prototypes in a workspace, newest first */
  async getAll(workspaceId: string): Promise<Prototype[]> {
    const supabase = getSupabaseClient();
    if (!supabase || !workspaceId) return [];

    try {
      const { data, error } = await supabase
        .from('prototypes')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('updated_at', { ascending: false });

      if (error) {
        if (error.code === '42P01') {
          console.warn('[Prototypes] Table not found — run migration 035_prototyping_schema.sql');
          return [];
        }
        console.error('[Prototypes] Error fetching:', error.message);
        return [];
      }

      return (data ?? []).map(rowToPrototype);
    } catch (err: any) {
      console.error('[Prototypes] Unexpected error:', err?.message ?? err);
      return [];
    }
  },

  /** Get a single prototype by ID */
  async getById(id: string): Promise<Prototype | undefined> {
    const supabase = getSupabaseClient();
    if (!supabase || !id) return undefined;

    try {
      const { data, error } = await supabase
        .from('prototypes')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        console.error('[Prototypes] Error fetching by id:', error?.message);
        return undefined;
      }

      return rowToPrototype(data);
    } catch (err: any) {
      console.error('[Prototypes] Unexpected error:', err?.message ?? err);
      return undefined;
    }
  },

  /** Create a new prototype record */
  async create(params: {
    workspaceId: string;
    name: string;
    libraryId?: string;
    prdId?: string;
    projectId?: string;
    codeContent?: string;
    chatHistory?: PrototypeChatMessage[];
  }): Promise<Prototype> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client not available');

    const { data, error } = await supabase
      .from('prototypes')
      .insert({
        workspace_id: params.workspaceId,
        name: params.name,
        library_id: params.libraryId ?? null,
        prd_id: params.prdId ?? null,
        project_id: params.projectId ?? null,
        code_content: params.codeContent ?? '',
        chat_history: params.chatHistory ?? [],
      })
      .select()
      .single();

    if (error || !data) {
      if (error?.code === '42P01') {
        throw new Error('Prototypes table not set up yet. Please run migration 036_fix_prototypes_rls.sql in Supabase SQL Editor.');
      }
      if (error?.code === '42501' || error?.message?.includes('row-level security')) {
        throw new Error('Permission denied. Ensure you are a member of this workspace and the RLS policies are set up correctly.');
      }
      throw new Error(error?.message ?? 'Failed to create prototype');
    }

    return rowToPrototype(data);
  },

  /** Update code and/or chat history */
  async update(
    id: string,
    updates: {
      name?: string;
      codeContent?: string;
      chatHistory?: PrototypeChatMessage[];
      libraryId?: string;
      prdId?: string;
    }
  ): Promise<Prototype | undefined> {
    const supabase = getSupabaseClient();
    if (!supabase) return undefined;

    const row: Record<string, any> = {};
    if (updates.name !== undefined) row.name = updates.name;
    if (updates.codeContent !== undefined) row.code_content = updates.codeContent;
    if (updates.chatHistory !== undefined) row.chat_history = updates.chatHistory;
    if (updates.libraryId !== undefined) row.library_id = updates.libraryId ?? null;
    if (updates.prdId !== undefined) row.prd_id = updates.prdId ?? null;

    if (Object.keys(row).length === 0) return this.getById(id);

    const { data, error } = await supabase
      .from('prototypes')
      .update(row)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      console.error('[Prototypes] Error updating:', error?.message);
      return undefined;
    }

    return rowToPrototype(data);
  },

  /** Delete a prototype permanently */
  async delete(id: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const { error } = await supabase
      .from('prototypes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Prototypes] Error deleting:', error.message);
      return false;
    }
    return true;
  },
};
