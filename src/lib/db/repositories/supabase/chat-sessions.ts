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
// REPOSITORY
// ============================================================================

export const chatSessionsRepository = {
  /**
   * Get a chat session by note ID and type
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

    if (error || !data) {
      // Not finding a session is not an error, just return null
      if (error?.code !== 'PGRST116') {
        console.warn('Error fetching chat session:', error);
      }
      return null;
    }

    return rowToChatSession(data);
  },

  /**
   * Create or update a chat session (upsert)
   */
  async upsert(
    noteId: string,
    sessionType: ChatSessionType,
    sessionData: ChatSessionData,
    userId: string
  ): Promise<ChatSession | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('chat_sessions')
      .upsert(
        {
          note_id: noteId,
          session_type: sessionType,
          session_data: sessionData,
          user_id: userId,
        },
        {
          onConflict: 'note_id,session_type,user_id',
        }
      )
      .select()
      .single();

    if (error || !data) {
      console.error('Error upserting chat session:', error);
      return null;
    }

    return rowToChatSession(data);
  },

  /**
   * Delete a chat session
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
      console.error('Error deleting chat session:', error);
      return false;
    }

    return true;
  },

  /**
   * Get all chat sessions for a user
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
      console.error('Error fetching chat sessions:', error);
      return [];
    }

    return (data || []).map(rowToChatSession);
  },

  /**
   * Delete all chat sessions for a note (useful when deleting a note)
   */
  async deleteAllForNote(noteId: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const { error } = await supabase
      .from('chat_sessions')
      .delete()
      .eq('note_id', noteId);

    if (error) {
      console.error('Error deleting chat sessions for note:', error);
      return false;
    }

    return true;
  },
};

export default chatSessionsRepository;
