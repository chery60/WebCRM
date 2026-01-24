/**
 * Canvas Collaboration Store
 * 
 * Manages real-time collaboration state for the PRD Canvas.
 * This store handles:
 * - Active collaborators presence
 * - Cursor positions
 * - Selection states
 * - Real-time sync status
 * 
 * Note: This is a client-side implementation. For production,
 * integrate with a real-time backend like Supabase Realtime,
 * Socket.io, or Liveblocks.
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

// ============================================================================
// TYPES
// ============================================================================

export interface Collaborator {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  color: string;
  cursor?: {
    x: number;
    y: number;
  };
  selectedElementIds?: string[];
  lastActiveAt: Date;
  isOnline: boolean;
}

export interface CollaborationEvent {
  id: string;
  type: 'join' | 'leave' | 'cursor_move' | 'element_select' | 'element_change' | 'comment_add';
  userId: string;
  userName: string;
  timestamp: Date;
  data?: any;
}

export interface CanvasCollaborationState {
  // Current user
  currentUserId: string | null;
  currentUserName: string | null;
  
  // Collaborators
  collaborators: Map<string, Collaborator>;
  
  // Connection state
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  
  // Recent activity
  recentEvents: CollaborationEvent[];
  
  // Actions
  setCurrentUser: (id: string, name: string) => void;
  addCollaborator: (collaborator: Collaborator) => void;
  removeCollaborator: (id: string) => void;
  updateCollaboratorCursor: (id: string, x: number, y: number) => void;
  updateCollaboratorSelection: (id: string, elementIds: string[]) => void;
  setConnectionStatus: (status: CanvasCollaborationState['connectionStatus']) => void;
  addEvent: (event: Omit<CollaborationEvent, 'id' | 'timestamp'>) => void;
  clearEvents: () => void;
  
  // Computed
  getActiveCollaborators: () => Collaborator[];
  getCollaboratorCount: () => number;
}

// ============================================================================
// COLLABORATOR COLORS
// ============================================================================

const COLLABORATOR_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#f43f5e', // rose
  '#14b8a6', // teal
];

const getRandomColor = () => {
  return COLLABORATOR_COLORS[Math.floor(Math.random() * COLLABORATOR_COLORS.length)];
};

// ============================================================================
// STORE
// ============================================================================

export const useCanvasCollaborationStore = create<CanvasCollaborationState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    currentUserId: null,
    currentUserName: null,
    collaborators: new Map(),
    isConnected: false,
    connectionStatus: 'disconnected',
    recentEvents: [],
    
    // Actions
    setCurrentUser: (id, name) => {
      set({ currentUserId: id, currentUserName: name });
    },
    
    addCollaborator: (collaborator) => {
      set((state) => {
        const newCollaborators = new Map(state.collaborators);
        newCollaborators.set(collaborator.id, {
          ...collaborator,
          color: collaborator.color || getRandomColor(),
          lastActiveAt: new Date(),
          isOnline: true,
        });
        return { collaborators: newCollaborators };
      });
    },
    
    removeCollaborator: (id) => {
      set((state) => {
        const newCollaborators = new Map(state.collaborators);
        newCollaborators.delete(id);
        return { collaborators: newCollaborators };
      });
    },
    
    updateCollaboratorCursor: (id, x, y) => {
      set((state) => {
        const newCollaborators = new Map(state.collaborators);
        const collaborator = newCollaborators.get(id);
        if (collaborator) {
          newCollaborators.set(id, {
            ...collaborator,
            cursor: { x, y },
            lastActiveAt: new Date(),
          });
        }
        return { collaborators: newCollaborators };
      });
    },
    
    updateCollaboratorSelection: (id, elementIds) => {
      set((state) => {
        const newCollaborators = new Map(state.collaborators);
        const collaborator = newCollaborators.get(id);
        if (collaborator) {
          newCollaborators.set(id, {
            ...collaborator,
            selectedElementIds: elementIds,
            lastActiveAt: new Date(),
          });
        }
        return { collaborators: newCollaborators };
      });
    },
    
    setConnectionStatus: (status) => {
      set({
        connectionStatus: status,
        isConnected: status === 'connected',
      });
    },
    
    addEvent: (event) => {
      set((state) => ({
        recentEvents: [
          {
            ...event,
            id: `event-${Date.now()}`,
            timestamp: new Date(),
          },
          ...state.recentEvents.slice(0, 49), // Keep last 50 events
        ],
      }));
    },
    
    clearEvents: () => {
      set({ recentEvents: [] });
    },
    
    // Computed
    getActiveCollaborators: () => {
      const { collaborators, currentUserId } = get();
      const now = new Date();
      const activeThreshold = 5 * 60 * 1000; // 5 minutes
      
      return Array.from(collaborators.values()).filter(
        (c) =>
          c.id !== currentUserId &&
          c.isOnline &&
          now.getTime() - new Date(c.lastActiveAt).getTime() < activeThreshold
      );
    },
    
    getCollaboratorCount: () => {
      return get().getActiveCollaborators().length;
    },
  }))
);

// ============================================================================
// MOCK COLLABORATION HOOK
// ============================================================================

/**
 * Hook for simulating real-time collaboration
 * In production, replace this with actual WebSocket/Realtime integration
 */
export function useCanvasCollaboration(canvasId: string, userId: string, userName: string) {
  const store = useCanvasCollaborationStore();
  
  // Initialize current user
  const initializeUser = () => {
    store.setCurrentUser(userId, userName);
    store.setConnectionStatus('connected');
    
    // Add self as collaborator
    store.addCollaborator({
      id: userId,
      name: userName,
      color: getRandomColor(),
      lastActiveAt: new Date(),
      isOnline: true,
    });
    
    // Log join event
    store.addEvent({
      type: 'join',
      userId,
      userName,
    });
  };
  
  // Broadcast cursor position
  const broadcastCursor = (x: number, y: number) => {
    store.updateCollaboratorCursor(userId, x, y);
    // In production: send to WebSocket
  };
  
  // Broadcast selection
  const broadcastSelection = (elementIds: string[]) => {
    store.updateCollaboratorSelection(userId, elementIds);
    // In production: send to WebSocket
  };
  
  // Disconnect
  const disconnect = () => {
    store.removeCollaborator(userId);
    store.setConnectionStatus('disconnected');
    store.addEvent({
      type: 'leave',
      userId,
      userName,
    });
  };
  
  return {
    ...store,
    initializeUser,
    broadcastCursor,
    broadcastSelection,
    disconnect,
  };
}

export default useCanvasCollaborationStore;
