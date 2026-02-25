'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { componentLibrariesRepository } from '@/lib/db/repositories/supabase/component-libraries';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import type { ComponentLibrary, ComponentLibraryFormData, LibraryComponent } from '@/types';

// Query key factory
export const libraryKeys = {
  all: ['component-libraries'] as const,
  lists: () => [...libraryKeys.all, 'list'] as const,
  list: (workspaceId?: string) => [...libraryKeys.lists(), workspaceId] as const,
  details: () => [...libraryKeys.all, 'detail'] as const,
  detail: (id: string) => [...libraryKeys.details(), id] as const,
  components: (libraryId: string) => [...libraryKeys.all, 'components', libraryId] as const,
};

/** List all libraries in the current workspace */
export function useComponentLibraries() {
  const { currentWorkspace } = useWorkspaceStore();
  const workspaceId = currentWorkspace?.id;

  return useQuery({
    queryKey: libraryKeys.list(workspaceId),
    queryFn: () =>
      workspaceId
        ? componentLibrariesRepository.getAll(workspaceId)
        : Promise.resolve([]),
    enabled: !!workspaceId,
    staleTime: 30_000,
  });
}

/** Get a single library by ID */
export function useComponentLibrary(id: string | undefined) {
  return useQuery({
    queryKey: libraryKeys.detail(id ?? ''),
    queryFn: () => componentLibrariesRepository.getById(id!),
    enabled: !!id,
    staleTime: 30_000,
  });
}

/** Get all components for a library */
export function useLibraryComponents(libraryId: string | undefined) {
  return useQuery({
    queryKey: libraryKeys.components(libraryId ?? ''),
    queryFn: () => componentLibrariesRepository.getComponents(libraryId!),
    enabled: !!libraryId,
    staleTime: 60_000,
  });
}

/** Create a new library */
export function useCreateComponentLibrary() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspaceStore();

  return useMutation({
    mutationFn: (formData: ComponentLibraryFormData) =>
      componentLibrariesRepository.create(formData),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: libraryKeys.list(currentWorkspace?.id) });
    },
  });
}

/** Update library metadata */
export function useUpdateComponentLibrary() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspaceStore();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<ComponentLibraryFormData> }) =>
      componentLibrariesRepository.update(id, updates),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: libraryKeys.detail(id) });
      qc.invalidateQueries({ queryKey: libraryKeys.list(currentWorkspace?.id) });
    },
  });
}

/** Delete a library and all its components */
export function useDeleteComponentLibrary() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspaceStore();

  return useMutation({
    mutationFn: (id: string) => componentLibrariesRepository.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: libraryKeys.list(currentWorkspace?.id) });
    },
  });
}

/** Bulk-insert components into a library (used after import) */
export function useBulkInsertComponents() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      libraryId,
      components,
    }: {
      libraryId: string;
      components: Omit<LibraryComponent, 'id' | 'libraryId' | 'createdAt' | 'updatedAt'>[];
    }) => componentLibrariesRepository.bulkInsertComponents(libraryId, components),
    onSuccess: (_, { libraryId }) => {
      qc.invalidateQueries({ queryKey: libraryKeys.components(libraryId) });
      qc.invalidateQueries({ queryKey: libraryKeys.details() });
    },
  });
}

/** Re-sync (delete + re-insert) components for a library */
export function useResyncComponents() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      libraryId,
      components,
    }: {
      libraryId: string;
      components: Omit<LibraryComponent, 'id' | 'libraryId' | 'createdAt' | 'updatedAt'>[];
    }) => {
      await componentLibrariesRepository.deleteAllComponents(libraryId);
      return componentLibrariesRepository.bulkInsertComponents(libraryId, components);
    },
    onSuccess: (_, { libraryId }) => {
      qc.invalidateQueries({ queryKey: libraryKeys.components(libraryId) });
      qc.invalidateQueries({ queryKey: libraryKeys.details() });
    },
  });
}
