'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AIProviderType } from './ai-settings-store';

// ============================================================================
// TYPES
// ============================================================================

export interface SectionChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  // For AI messages - the generated section content
  generatedContent?: string;
  // For version history - snapshot of note content at this point
  noteSnapshot?: string;
  // Template used for this generation
  templateUsed?: string;
  // Section being generated
  sectionUsed?: string;
  // Provider used for generation
  providerUsed?: string;
  // Is the AI currently generating this message
  isGenerating?: boolean;
  // Error message if generation failed
  error?: string;
}

export interface SectionChatSession {
  id: string;
  messages: SectionChatMessage[];
  noteId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Serializable version of message for storage (timestamp as string)
interface SerializableSectionChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string; // ISO string instead of Date
  generatedContent?: string;
  noteSnapshot?: string;
  templateUsed?: string;
  sectionUsed?: string;
  providerUsed?: string;
  isGenerating?: boolean;
  error?: string;
}

// Serializable version of session for storage
interface SerializableSectionChatSession {
  id: string;
  messages: SerializableSectionChatMessage[];
  noteId?: string;
  createdAt: string;
  updatedAt: string;
}

// Sessions stored by noteId for persistence
interface StoredSessions {
  [noteId: string]: SerializableSectionChatSession;
}

export interface SectionChatState {
  // Current chat session
  session: SectionChatSession | null;
  
  // All sessions keyed by noteId (for persistence)
  sessions: StoredSessions;
  
  // Selected AI model/provider
  selectedProvider: AIProviderType | null;
  
  // Selected template ID (from templates store)
  selectedTemplate: string;
  
  // Selected section ID
  selectedSection: string;
  
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
  addUserMessage: (content: string, noteSnapshot: string) => SectionChatMessage;
  addAssistantMessage: (content: string, generatedContent?: string) => SectionChatMessage;
  updateAssistantMessage: (messageId: string, updates: Partial<SectionChatMessage>) => void;
  setMessageGenerating: (messageId: string, isGenerating: boolean) => void;
  setMessageError: (messageId: string, error: string) => void;
  
  // Version history
  saveVersionSnapshot: (messageId: string, noteContent: string) => void;
  getVersionSnapshot: (messageId: string) => string | undefined;
  revertToVersion: (messageId: string) => string | undefined;
  
  // Settings
  setSelectedProvider: (provider: AIProviderType | null) => void;
  setSelectedTemplate: (template: string) => void;
  setSelectedSection: (section: string) => void;
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
function deserializeSession(stored: SerializableSectionChatSession): SectionChatSession {
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
      sectionUsed: msg.sectionUsed,
      providerUsed: msg.providerUsed,
      isGenerating: msg.isGenerating,
      error: msg.error,
    })),
  };
}

// Convert runtime session to serializable format
function serializeSession(session: SectionChatSession): SerializableSectionChatSession {
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
      sectionUsed: msg.sectionUsed,
      providerUsed: msg.providerUsed,
      isGenerating: msg.isGenerating,
      error: msg.error,
    })),
  };
}

// ============================================================================
// STORE
// ============================================================================

export const useSectionChatStore = create<SectionChatState>()(
  persist(
    (set, get) => ({
      session: null,
      sessions: {},
      selectedProvider: null,
      selectedTemplate: '', // Will be set from templates store on first load
      selectedSection: '', // Will be set based on selected template
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
          const newSession: SectionChatSession = {
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
        
        const newSession: SectionChatSession = {
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
        const { session, selectedTemplate, selectedSection, selectedProvider, sessions, currentNoteId } = get();
        
        const message: SectionChatMessage = {
          id: generateId(),
          role: 'user',
          content,
          timestamp: new Date(),
          noteSnapshot,
          templateUsed: selectedTemplate,
          sectionUsed: selectedSection,
          providerUsed: selectedProvider || undefined,
        };

        if (session) {
          const updatedSession = {
            ...session,
            messages: [...session.messages, message],
            updatedAt: new Date(),
          };
          
          // Update current session and persist to sessions storage
          const newState: Partial<SectionChatState> = {
            session: updatedSession,
          };
          
          if (currentNoteId) {
            newState.sessions = {
              ...sessions,
              [currentNoteId]: serializeSession(updatedSession),
            };
          }
          
          set(newState as SectionChatState);
        }

        // Save version snapshot
        get().saveVersionSnapshot(message.id, noteSnapshot);

        return message;
      },

      addAssistantMessage: (content: string, generatedContent?: string) => {
        const { session, selectedProvider, sessions, currentNoteId } = get();
        
        const message: SectionChatMessage = {
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
          const newState: Partial<SectionChatState> = {
            session: updatedSession,
          };
          
          if (currentNoteId) {
            newState.sessions = {
              ...sessions,
              [currentNoteId]: serializeSession(updatedSession),
            };
          }
          
          set(newState as SectionChatState);
        }

        return message;
      },

      updateAssistantMessage: (messageId: string, updates: Partial<SectionChatMessage>) => {
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
        const newState: Partial<SectionChatState> = {
          session: updatedSession,
        };
        
        if (currentNoteId) {
          newState.sessions = {
            ...sessions,
            [currentNoteId]: serializeSession(updatedSession),
          };
        }
        
        set(newState as SectionChatState);
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

      setSelectedSection: (section: string) => {
        set({ selectedSection: section });
      },

      setCurrentNoteContent: (content: string) => {
        set({ currentNoteContent: content });
      },
    }),
    {
      name: 'venture-section-chat-sessions',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Only persist sessions and settings, not runtime state
      partialize: (state) => ({
        sessions: state.sessions,
        selectedProvider: state.selectedProvider,
        selectedTemplate: state.selectedTemplate,
        selectedSection: state.selectedSection,
        versionHistory: state.versionHistory,
      }),
    }
  )
);

export default useSectionChatStore;
