'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { PRDChatMessage, PRDChatSession } from '@/types';
import type { AIProviderType } from './ai-settings-store';

// ============================================================================
// TYPES
// ============================================================================

// Serializable version of message for storage (timestamp as string)
interface SerializablePRDChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string; // ISO string instead of Date
  generatedContent?: string;
  noteSnapshot?: string;
  templateUsed?: string;
  providerUsed?: string;
  isGenerating?: boolean;
  error?: string;
}

// Serializable version of session for storage
interface SerializablePRDChatSession {
  id: string;
  messages: SerializablePRDChatMessage[];
  noteId?: string;
  createdAt: string;
  updatedAt: string;
}

// Sessions stored by noteId for persistence
interface StoredSessions {
  [noteId: string]: SerializablePRDChatSession;
}

export interface PRDChatState {
  // Current chat session
  session: PRDChatSession | null;
  
  // All sessions keyed by noteId (for persistence)
  sessions: StoredSessions;
  
  // Selected AI model/provider
  selectedProvider: AIProviderType | null;
  
  // Selected template ID (from templates store)
  selectedTemplate: string;
  
  // Current note content (for version history)
  currentNoteContent: string;
  
  // Version history - maps message id to note content snapshot (per session)
  versionHistory: Record<string, string>;
  
  // Is drawer open
  isOpen: boolean;
  
  // Current noteId being edited
  currentNoteId: string | null;
  
  // Actions
  openDrawer: () => void;
  closeDrawer: () => void;
  
  // Session management
  loadOrCreateSession: (noteId: string) => void;
  startNewSession: (noteId?: string) => void;
  clearSession: () => void;
  
  // Message management
  addUserMessage: (content: string, noteSnapshot: string) => PRDChatMessage;
  addAssistantMessage: (content: string, generatedContent?: string) => PRDChatMessage;
  updateAssistantMessage: (messageId: string, updates: Partial<PRDChatMessage>) => void;
  setMessageGenerating: (messageId: string, isGenerating: boolean) => void;
  setMessageError: (messageId: string, error: string) => void;
  
  // Version history
  saveVersionSnapshot: (messageId: string, noteContent: string) => void;
  getVersionSnapshot: (messageId: string) => string | undefined;
  revertToVersion: (messageId: string) => string | undefined;
  
  // Settings
  setSelectedProvider: (provider: AIProviderType | null) => void;
  setSelectedTemplate: (template: string) => void;
  setCurrentNoteContent: (content: string) => void;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Convert serializable session to runtime session (with Date objects)
function deserializeSession(stored: SerializablePRDChatSession): PRDChatSession {
  return {
    id: stored.id,
    noteId: stored.noteId,
    createdAt: new Date(stored.createdAt),
    updatedAt: new Date(stored.updatedAt),
    messages: stored.messages.map(msg => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      timestamp: new Date(msg.timestamp),
      generatedContent: msg.generatedContent,
      noteSnapshot: msg.noteSnapshot,
      templateUsed: msg.templateUsed,
      providerUsed: msg.providerUsed,
      isGenerating: msg.isGenerating,
      error: msg.error,
    })),
  };
}

// Convert runtime session to serializable format
function serializeSession(session: PRDChatSession): SerializablePRDChatSession {
  return {
    id: session.id,
    noteId: session.noteId,
    createdAt: session.createdAt instanceof Date ? session.createdAt.toISOString() : session.createdAt,
    updatedAt: session.updatedAt instanceof Date ? session.updatedAt.toISOString() : session.updatedAt,
    messages: session.messages.map(msg => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp instanceof Date ? msg.timestamp.toISOString() : String(msg.timestamp),
      generatedContent: msg.generatedContent,
      noteSnapshot: msg.noteSnapshot,
      templateUsed: msg.templateUsed,
      providerUsed: msg.providerUsed,
      isGenerating: msg.isGenerating,
      error: msg.error,
    })),
  };
}

// ============================================================================
// STORE
// ============================================================================

export const usePRDChatStore = create<PRDChatState>()(
  persist(
    (set, get) => ({
      session: null,
      sessions: {},
      selectedProvider: null,
      selectedTemplate: '', // Will be set from templates store on first load
      currentNoteContent: '',
      versionHistory: {},
      isOpen: false,
      currentNoteId: null,

      openDrawer: () => {
        set({ isOpen: true });
      },

      closeDrawer: () => {
        set({ isOpen: false });
      },

      loadOrCreateSession: (noteId: string) => {
        const { sessions, currentNoteId, session } = get();
        
        // If we're already on this note with a session, don't reload
        if (currentNoteId === noteId && session && session.noteId === noteId) {
          return;
        }
        
        // Check if we have an existing session for this note
        const existingSession = sessions[noteId];
        
        if (existingSession) {
          // Load existing session
          const deserializedSession = deserializeSession(existingSession);
          set({
            session: deserializedSession,
            currentNoteId: noteId,
            // Load version history for this session (stored with session key prefix)
            versionHistory: get().versionHistory,
          });
        } else {
          // Create new session for this note
          const newSession: PRDChatSession = {
            id: generateSessionId(),
            messages: [],
            noteId,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          
          // Save to sessions storage
          const serializedSession = serializeSession(newSession);
          set({
            session: newSession,
            currentNoteId: noteId,
            sessions: {
              ...sessions,
              [noteId]: serializedSession,
            },
            versionHistory: {},
          });
        }
      },

      startNewSession: (noteId?: string) => {
        const { sessions, currentNoteId } = get();
        const targetNoteId = noteId || currentNoteId;
        
        const newSession: PRDChatSession = {
          id: generateSessionId(),
          messages: [],
          noteId: targetNoteId || undefined,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        // If we have a noteId, save to sessions storage
        if (targetNoteId) {
          const serializedSession = serializeSession(newSession);
          set({
            session: newSession,
            currentNoteId: targetNoteId,
            sessions: {
              ...sessions,
              [targetNoteId]: serializedSession,
            },
            versionHistory: {},
          });
        } else {
          set({ 
            session: newSession,
            versionHistory: {},
          });
        }
      },

      clearSession: () => {
        const { currentNoteId, sessions } = get();
        
        // Remove session from storage if we have a noteId
        if (currentNoteId) {
          const newSessions = { ...sessions };
          delete newSessions[currentNoteId];
          set({ 
            session: null,
            sessions: newSessions,
            versionHistory: {},
          });
        } else {
          set({ 
            session: null,
            versionHistory: {},
          });
        }
      },

      addUserMessage: (content: string, noteSnapshot: string) => {
        const { session, selectedTemplate, selectedProvider, sessions, currentNoteId } = get();
        
        const message: PRDChatMessage = {
          id: generateId(),
          role: 'user',
          content,
          timestamp: new Date(),
          noteSnapshot,
          templateUsed: selectedTemplate,
          providerUsed: selectedProvider || undefined,
        };

        if (session) {
          const updatedSession = {
            ...session,
            messages: [...session.messages, message],
            updatedAt: new Date(),
          };
          
          // Update current session and persist to sessions storage
          const newState: Partial<PRDChatState> = {
            session: updatedSession,
          };
          
          if (currentNoteId) {
            newState.sessions = {
              ...sessions,
              [currentNoteId]: serializeSession(updatedSession),
            };
          }
          
          set(newState as PRDChatState);
        }

        // Save version snapshot
        get().saveVersionSnapshot(message.id, noteSnapshot);

        return message;
      },

      addAssistantMessage: (content: string, generatedContent?: string) => {
        const { session, selectedProvider, sessions, currentNoteId } = get();
        
        const message: PRDChatMessage = {
          id: generateId(),
          role: 'assistant',
          content,
          timestamp: new Date(),
          generatedContent,
          providerUsed: selectedProvider || undefined,
          isGenerating: false,
        };

        if (session) {
          const updatedSession = {
            ...session,
            messages: [...session.messages, message],
            updatedAt: new Date(),
          };
          
          // Update current session and persist to sessions storage
          const newState: Partial<PRDChatState> = {
            session: updatedSession,
          };
          
          if (currentNoteId) {
            newState.sessions = {
              ...sessions,
              [currentNoteId]: serializeSession(updatedSession),
            };
          }
          
          set(newState as PRDChatState);
        }

        return message;
      },

      updateAssistantMessage: (messageId: string, updates: Partial<PRDChatMessage>) => {
        const { session, sessions, currentNoteId } = get();
        if (!session) return;

        const updatedSession = {
          ...session,
          messages: session.messages.map((msg) =>
            msg.id === messageId ? { ...msg, ...updates } : msg
          ),
          updatedAt: new Date(),
        };

        // Update current session and persist to sessions storage
        const newState: Partial<PRDChatState> = {
          session: updatedSession,
        };
        
        if (currentNoteId) {
          newState.sessions = {
            ...sessions,
            [currentNoteId]: serializeSession(updatedSession),
          };
        }
        
        set(newState as PRDChatState);
      },

      setMessageGenerating: (messageId: string, isGenerating: boolean) => {
        get().updateAssistantMessage(messageId, { isGenerating });
      },

      setMessageError: (messageId: string, error: string) => {
        get().updateAssistantMessage(messageId, { error, isGenerating: false });
      },

      saveVersionSnapshot: (messageId: string, noteContent: string) => {
        const { versionHistory } = get();
        set({ 
          versionHistory: {
            ...versionHistory,
            [messageId]: noteContent,
          }
        });
      },

      getVersionSnapshot: (messageId: string) => {
        return get().versionHistory[messageId];
      },

      revertToVersion: (messageId: string) => {
        const snapshot = get().versionHistory[messageId];
        if (snapshot !== undefined) {
          set({ currentNoteContent: snapshot });
        }
        return snapshot;
      },

      setSelectedProvider: (provider: AIProviderType | null) => {
        set({ selectedProvider: provider });
      },

      setSelectedTemplate: (template: string) => {
        set({ selectedTemplate: template });
      },

      setCurrentNoteContent: (content: string) => {
        set({ currentNoteContent: content });
      },
    }),
    {
      name: 'venture-prd-chat-sessions',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Only persist sessions and settings, not runtime state
      partialize: (state) => ({
        sessions: state.sessions,
        selectedProvider: state.selectedProvider,
        selectedTemplate: state.selectedTemplate,
        versionHistory: state.versionHistory,
      }),
    }
  )
);

export default usePRDChatStore;
