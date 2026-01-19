import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  // Sidebar
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;

  // Notes view
  notesView: 'grid' | 'list' | 'table';
  setNotesView: (view: 'grid' | 'list' | 'table') => void;

  // Current workspace
  currentWorkspaceId: string | null;
  setCurrentWorkspaceId: (id: string | null) => void;

  // Theme
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // Sidebar
      sidebarCollapsed: false,
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      // Notes view
      notesView: 'grid',
      setNotesView: (view) => set({ notesView: view }),

      // Current workspace
      currentWorkspaceId: null,
      setCurrentWorkspaceId: (id) => set({ currentWorkspaceId: id }),

      // Theme
      theme: 'light',
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'venture-crm-ui',
    }
  )
);

// Notes filter/sort state (not persisted)
interface NotesState {
  filter: {
    tags: string[];
    search: string;
    authorId?: string;
  };
  sort: {
    field: 'createdAt' | 'updatedAt' | 'title';
    direction: 'asc' | 'desc';
  };
  setFilter: (filter: Partial<NotesState['filter']>) => void;
  setSort: (sort: NotesState['sort']) => void;
  clearFilter: () => void;
}

export const useNotesStore = create<NotesState>((set) => ({
  filter: {
    tags: [],
    search: '',
  },
  sort: {
    field: 'updatedAt',
    direction: 'desc',
  },
  setFilter: (filter) =>
    set((state) => ({
      filter: { ...state.filter, ...filter },
    })),
  setSort: (sort) => set({ sort }),
  clearFilter: () =>
    set({
      filter: {
        tags: [],
        search: '',
      },
    }),
}));

