'use client';

import { getSupabaseClient } from '@/lib/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

export type ChatSessionType = 'prd' | 'section';

export interface ChatSessionData {
  id: string;
  messages: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    generatedContent?: string;
    noteSnapshot?: string;
    templateUsed?: string;
    sectionUsed?: string;
    providerUsed?: string;
    isGenerating?: boolean;
    error?: string;
  }>;
  noteId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatSession {
  id: string;
  noteId: string;
  sessionType: ChatSessionType;
  sessionData: ChatSessionData;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Helper to convert database row to ChatSession type
function rowToChatSession(row: any): ChatSession {
  return {
    id: row.id,
    noteId: row.note_id,
    sessionType: row.session_type,
    sessionData: row.session_data,
    userId: row.user_id,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

// ============================================================================
// ERROR HANDLING UTILITIES
// ============================================================================

/**
 * Check if an error is due to the table not existing
 * PGRST205 = "Could not find the table in the schema cache"
 * This is a schema/migration issue, not a user error
 */
function isTableNotFoundError(error: any): boolean {
  return error?.code === 'PGRST205' || error?.code === '42P01';
}

/**
 * Check if an error is a "not found" error (no rows returned)
 * This is expected behavior when querying for non-existent data
 */
function isNotFoundError(error: any): boolean {
  return error?.code === 'PGRST116';
}

/**
 * Track if we've already warned about the table missing
 * Only log once per session to avoid console spam
 */
let hasWarnedAboutMissingTable = false;

function logTableMissingOnce() {
  if (!hasWarnedAboutMissingTable) {
    console.debug(
      '[Chat Sessions] Table not found - chat history persistence is unavailable. ' +
      'Run migration 008_chat_sessions.sql to enable this feature.'
    );
    hasWarnedAboutMissingTable = true;
  }
}

// ============================================================================
// REPOSITORY
// ============================================================================

export const chatSessionsRepository = {
  /**
   * Get a chat session by note ID and type
   * Returns null silently if table doesn't exist or session not found
   */
  async getByNoteId(
    noteId: string,
    sessionType: ChatSessionType,
    userId: string
  ): Promise<ChatSession | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('note_id', noteId)
      .eq('session_type', sessionType)
      .eq('user_id', userId)
      .single();

    if (error) {
      // Table doesn't exist - this is a schema issue, not user error
      if (isTableNotFoundError(error)) {
        logTableMissingOnce();
        return null;
      }
      // Not finding a session is expected, not an error
      if (isNotFoundError(error)) {
        return null;
      }
      // Log other errors at debug level
      console.debug('[Chat Sessions] Fetch error:', error.code);
      return null;
    }

    return data ? rowToChatSession(data) : null;
  },

  /**
   * Create or update a chat session (upsert)
   * Returns null silently if table doesn't exist - feature degrades gracefully
   */
  async upsert(
    noteId: string,
    sessionType: ChatSessionType,
    sessionData: ChatSessionData,
    userId: string
  ): Promise<ChatSession | null> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      console.debug('[Chat Sessions] Supabase client not available');
      return null;
    }

    try {
      // First, try to get the existing session
      const { data: existing, error: fetchError } = await supabase
        .from('chat_sessions')
        .select('id')
        .eq('note_id', noteId)
        .eq('session_type', sessionType)
        .eq('user_id', userId)
        .maybeSingle();

      // If table doesn't exist, degrade gracefully
      if (fetchError && isTableNotFoundError(fetchError)) {
        logTableMissingOnce();
        return null;
      }

      // Prepare the data
      const payload = {
        note_id: noteId,
        session_type: sessionType,
        session_data: sessionData,
        user_id: userId,
      };

      let result;
      if (existing) {
        // Update existing session
        result = await supabase
          .from('chat_sessions')
          .update({
            session_data: sessionData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();
      } else {
        // Insert new session
        result = await supabase
          .from('chat_sessions')
          .insert(payload)
          .select()
          .single();
      }

      const { data, error } = result;

      if (error) {
        // Table doesn't exist - silent failure
        if (isTableNotFoundError(error)) {
          logTableMissingOnce();
          return null;
        }
        // Other errors - log at debug level only
        console.debug('[Chat Sessions] Save skipped:', error.code);
        return null;
      }

      if (!data) {
        return null;
      }

      return rowToChatSession(data);
    } catch (err) {
      // Unexpected errors - log at debug level
      console.debug('[Chat Sessions] Unexpected error during save');
      return null;
    }
  },

  /**
   * Delete a chat session
   * Returns false silently if table doesn't exist
   */
  async delete(
    noteId: string,
    sessionType: ChatSessionType,
    userId: string
  ): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const { error } = await supabase
      .from('chat_sessions')
      .delete()
      .eq('note_id', noteId)
      .eq('session_type', sessionType)
      .eq('user_id', userId);

    if (error) {
      if (isTableNotFoundError(error)) {
        logTableMissingOnce();
        return false;
      }
      console.debug('[Chat Sessions] Delete skipped:', error.code);
      return false;
    }

    return true;
  },

  /**
   * Get all chat sessions for a user
   * Returns empty array if table doesn't exist
   */
  async getAllForUser(userId: string): Promise<ChatSession[]> {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      if (isTableNotFoundError(error)) {
        logTableMissingOnce();
        return [];
      }
      console.debug('[Chat Sessions] List skipped:', error.code);
      return [];
    }

    return (data || []).map(rowToChatSession);
  },

  /**
   * Delete all chat sessions for a note (useful when deleting a note)
   * Returns false silently if table doesn't exist
   */
  async deleteAllForNote(noteId: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const { error } = await supabase
      .from('chat_sessions')
      .delete()
      .eq('note_id', noteId);

    if (error) {
      if (isTableNotFoundError(error)) {
        logTableMissingOnce();
        return false;
      }
      console.debug('[Chat Sessions] Delete all skipped:', error.code);
      return false;
    }

    return true;
  },
};

export default chatSessionsRepository;
