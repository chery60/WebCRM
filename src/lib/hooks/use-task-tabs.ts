'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { USE_SUPABASE } from '@/lib/db/database';
import { taskTabsRepository } from '@/lib/db/repositories/supabase/task-tabs';
import { useTaskTabStore } from '@/lib/stores/task-tab-store';
import type { TaskTab } from '@/types';

// Query keys
export const taskTabKeys = {
  all: ['taskTabs'] as const,
  lists: () => [...taskTabKeys.all, 'list'] as const,
  detail: (id: string) => [...taskTabKeys.all, 'detail', id] as const,
};

// Hook to get all task tabs
export function useTaskTabs() {
  const localStore = useTaskTabStore();

  const query = useQuery({
    queryKey: taskTabKeys.lists(),
    queryFn: () => taskTabsRepository.getAll(),
    enabled: USE_SUPABASE,
  });

  // Return Supabase data if enabled, otherwise return local store data
  if (USE_SUPABASE) {
    return {
      ...query,
      data: query.data || [],
    };
  }

  return {
    data: localStore.tabs,
    isLoading: false,
    error: null,
  };
}

// Hook to create a task tab
export function useCreateTaskTab() {
  const queryClient = useQueryClient();
  const localStore = useTaskTabStore();

  const mutation = useMutation({
    mutationFn: (data: { name: string; color?: string }) =>
      taskTabsRepository.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskTabKeys.lists() });
    },
  });

  if (USE_SUPABASE) {
    return mutation;
  }

  // For local storage, wrap the store method in a mutation-like interface
  return {
    mutate: (data: { name: string; color?: string }) => {
      localStore.addTab(data.name, data.color);
    },
    mutateAsync: async (data: { name: string; color?: string }) => {
      return localStore.addTab(data.name, data.color);
    },
    isPending: false,
    isError: false,
    error: null,
  };
}

// Hook to update a task tab
export function useUpdateTaskTab() {
  const queryClient = useQueryClient();
  const localStore = useTaskTabStore();

  const mutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Pick<TaskTab, 'name' | 'color' | 'icon'>> }) =>
      taskTabsRepository.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskTabKeys.lists() });
    },
  });

  if (USE_SUPABASE) {
    return mutation;
  }

  return {
    mutate: ({ id, data }: { id: string; data: Partial<Pick<TaskTab, 'name' | 'color' | 'icon'>> }) => {
      localStore.updateTab(id, data);
    },
    mutateAsync: async ({ id, data }: { id: string; data: Partial<Pick<TaskTab, 'name' | 'color' | 'icon'>> }) => {
      localStore.updateTab(id, data);
    },
    isPending: false,
    isError: false,
    error: null,
  };
}

// Hook to delete a task tab
export function useDeleteTaskTab() {
  const queryClient = useQueryClient();
  const localStore = useTaskTabStore();

  const mutation = useMutation({
    mutationFn: (id: string) => taskTabsRepository.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskTabKeys.lists() });
    },
  });

  if (USE_SUPABASE) {
    return mutation;
  }

  return {
    mutate: (id: string) => {
      localStore.deleteTab(id);
    },
    mutateAsync: async (id: string) => {
      localStore.deleteTab(id);
      return true;
    },
    isPending: false,
    isError: false,
    error: null,
  };
}

// Combined hook for task tab management (similar to the original store interface)
export function useTaskTabsManager() {
  const { data: tabs = [], isLoading } = useTaskTabs();
  const createTab = useCreateTaskTab();
  const updateTab = useUpdateTaskTab();
  const deleteTab = useDeleteTaskTab();
  const localStore = useTaskTabStore();

  return {
    tabs,
    isLoading,
    activeTabId: localStore.activeTabId, // Active tab is always stored locally
    setActiveTab: localStore.setActiveTab,
    addTab: async (name: string, color?: string): Promise<TaskTab> => {
      if (USE_SUPABASE) {
        const result = await createTab.mutateAsync({ name, color });
        return result;
      }
      return localStore.addTab(name, color);
    },
    updateTab: (id: string, updates: Partial<Pick<TaskTab, 'name' | 'color' | 'icon'>>) => {
      if (USE_SUPABASE) {
        updateTab.mutate({ id, data: updates });
      } else {
        localStore.updateTab(id, updates);
      }
    },
    deleteTab: (id: string) => {
      if (USE_SUPABASE) {
        deleteTab.mutate(id);
      } else {
        localStore.deleteTab(id);
      }
    },
  };
}
