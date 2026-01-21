'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TaskTab } from '@/types';
import { v4 as uuidv4 } from 'uuid';

interface TaskTabState {
  tabs: TaskTab[];
  activeTabId: string | null; // null means "All Tasks"
  
  // Actions
  addTab: (name: string, color?: string) => TaskTab;
  updateTab: (id: string, updates: Partial<Pick<TaskTab, 'name' | 'color' | 'icon'>>) => void;
  deleteTab: (id: string) => void;
  reorderTabs: (tabs: TaskTab[]) => void;
  setActiveTab: (tabId: string | null) => void;
}

export const useTaskTabStore = create<TaskTabState>()(
  persist(
    (set, get) => ({
      tabs: [],
      activeTabId: null,

      addTab: (name: string, color?: string) => {
        const now = new Date();
        const tabs = get().tabs;
        const maxOrder = tabs.length > 0 ? Math.max(...tabs.map(t => t.order)) : -1;
        
        const newTab: TaskTab = {
          id: uuidv4(),
          name,
          color: color || '#6366f1', // Default indigo color
          order: maxOrder + 1,
          createdAt: now,
          updatedAt: now,
        };

        set({ tabs: [...tabs, newTab] });
        return newTab;
      },

      updateTab: (id: string, updates: Partial<Pick<TaskTab, 'name' | 'color' | 'icon'>>) => {
        set({
          tabs: get().tabs.map(tab =>
            tab.id === id
              ? { ...tab, ...updates, updatedAt: new Date() }
              : tab
          ),
        });
      },

      deleteTab: (id: string) => {
        const { tabs, activeTabId } = get();
        set({
          tabs: tabs.filter(tab => tab.id !== id),
          // If the deleted tab was active, switch to "All Tasks"
          activeTabId: activeTabId === id ? null : activeTabId,
        });
      },

      reorderTabs: (tabs: TaskTab[]) => {
        set({ tabs });
      },

      setActiveTab: (tabId: string | null) => {
        set({ activeTabId: tabId });
      },
    }),
    {
      name: 'task-tabs-storage',
    }
  )
);
