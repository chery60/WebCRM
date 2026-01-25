'use client';

import { create } from 'zustand';
import type { PRDChatMessage, PRDChatSession, PRDTemplateType } from '@/types';
import type { AIProviderType } from './ai-settings-store';

// ============================================================================
// TYPES
// ============================================================================

export interface PRDChatState {
  // Current chat session
  session: PRDChatSession | null;
  
  // Selected AI model/provider
  selectedProvider: AIProviderType | null;
  
  // Selected template (built-in or custom)
  selectedTemplate: PRDTemplateType | string;
  
  // Current note content (for version history)
  currentNoteContent: string;
  
  // Version history - maps message id to note content snapshot
  versionHistory: Map<string, string>;
  
  // Is drawer open
  isOpen: boolean;
  
  // Actions
  openDrawer: () => void;
  closeDrawer: () => void;
  
  // Session management
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
  setSelectedTemplate: (template: PRDTemplateType | string) => void;
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

// ============================================================================
// STORE
// ============================================================================

export const usePRDChatStore = create<PRDChatState>((set, get) => ({
  session: null,
  selectedProvider: null,
  selectedTemplate: 'custom', // Default template
  currentNoteContent: '',
  versionHistory: new Map(),
  isOpen: false,

  openDrawer: () => {
    set({ isOpen: true });
    // Start a new session if none exists
    const { session, startNewSession } = get();
    if (!session) {
      startNewSession();
    }
  },

  closeDrawer: () => {
    set({ isOpen: false });
  },

  startNewSession: (noteId?: string) => {
    const newSession: PRDChatSession = {
      id: generateSessionId(),
      messages: [],
      noteId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    set({ 
      session: newSession,
      versionHistory: new Map(),
    });
  },

  clearSession: () => {
    set({ 
      session: null,
      versionHistory: new Map(),
    });
  },

  addUserMessage: (content: string, noteSnapshot: string) => {
    const { session, selectedTemplate, selectedProvider } = get();
    
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
      set({
        session: {
          ...session,
          messages: [...session.messages, message],
          updatedAt: new Date(),
        },
      });
    }

    // Save version snapshot
    get().saveVersionSnapshot(message.id, noteSnapshot);

    return message;
  },

  addAssistantMessage: (content: string, generatedContent?: string) => {
    const { session, selectedProvider } = get();
    
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
      set({
        session: {
          ...session,
          messages: [...session.messages, message],
          updatedAt: new Date(),
        },
      });
    }

    return message;
  },

  updateAssistantMessage: (messageId: string, updates: Partial<PRDChatMessage>) => {
    const { session } = get();
    if (!session) return;

    set({
      session: {
        ...session,
        messages: session.messages.map((msg) =>
          msg.id === messageId ? { ...msg, ...updates } : msg
        ),
        updatedAt: new Date(),
      },
    });
  },

  setMessageGenerating: (messageId: string, isGenerating: boolean) => {
    get().updateAssistantMessage(messageId, { isGenerating });
  },

  setMessageError: (messageId: string, error: string) => {
    get().updateAssistantMessage(messageId, { error, isGenerating: false });
  },

  saveVersionSnapshot: (messageId: string, noteContent: string) => {
    const { versionHistory } = get();
    const newHistory = new Map(versionHistory);
    newHistory.set(messageId, noteContent);
    set({ versionHistory: newHistory });
  },

  getVersionSnapshot: (messageId: string) => {
    return get().versionHistory.get(messageId);
  },

  revertToVersion: (messageId: string) => {
    const snapshot = get().versionHistory.get(messageId);
    if (snapshot !== undefined) {
      set({ currentNoteContent: snapshot });
    }
    return snapshot;
  },

  setSelectedProvider: (provider: AIProviderType | null) => {
    set({ selectedProvider: provider });
  },

  setSelectedTemplate: (template: PRDTemplateType | string) => {
    set({ selectedTemplate: template });
  },

  setCurrentNoteContent: (content: string) => {
    set({ currentNoteContent: content });
  },
}));

export default usePRDChatStore;
