'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { prototypesRepository } from '@/lib/db/repositories/supabase/prototypes';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import type { Prototype, PrototypeChatMessage } from '@/types';

// ─── Query key factory ────────────────────────────────────────────────────────

export const prototypeKeys = {
  all: ['prototypes'] as const,
  lists: () => [...prototypeKeys.all, 'list'] as const,
  list: (workspaceId?: string) => [...prototypeKeys.lists(), workspaceId] as const,
  details: () => [...prototypeKeys.all, 'detail'] as const,
  detail: (id: string) => [...prototypeKeys.details(), id] as const,
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

/** List all prototypes in the current workspace */
export function usePrototypes() {
  const { currentWorkspace } = useWorkspaceStore();
  const workspaceId = currentWorkspace?.id;

  return useQuery({
    queryKey: prototypeKeys.list(workspaceId),
    queryFn: () =>
      workspaceId
        ? prototypesRepository.getAll(workspaceId)
        : Promise.resolve([]),
    enabled: !!workspaceId,
    staleTime: 30_000,
  });
}

/** Get a single prototype by ID */
export function usePrototype(id: string | undefined) {
  return useQuery({
    queryKey: prototypeKeys.detail(id ?? ''),
    queryFn: () => prototypesRepository.getById(id!),
    enabled: !!id && id !== 'new',
    staleTime: 15_000,
  });
}

/** Create a new prototype */
export function useCreatePrototype() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspaceStore();

  return useMutation({
    mutationFn: (params: {
      name: string;
      libraryId?: string;
      prdId?: string;
      projectId?: string;
      codeContent?: string;
      chatHistory?: PrototypeChatMessage[];
    }) => {
      if (!currentWorkspace?.id) throw new Error('No workspace selected');
      return prototypesRepository.create({ ...params, workspaceId: currentWorkspace.id });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: prototypeKeys.list(currentWorkspace?.id) });
    },
  });
}

/** Update code content and/or chat history for a prototype */
export function useUpdatePrototype() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspaceStore();

  return useMutation({
    mutationFn: ({
      id,
      ...updates
    }: {
      id: string;
      name?: string;
      codeContent?: string;
      chatHistory?: PrototypeChatMessage[];
      libraryId?: string;
      prdId?: string;
    }) => prototypesRepository.update(id, updates),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: prototypeKeys.detail(id) });
      qc.invalidateQueries({ queryKey: prototypeKeys.list(currentWorkspace?.id) });
    },
  });
}

/** Delete a prototype */
export function useDeletePrototype() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspaceStore();

  return useMutation({
    mutationFn: (id: string) => prototypesRepository.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: prototypeKeys.list(currentWorkspace?.id) });
    },
  });
}
