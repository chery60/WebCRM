'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pipelinesRepository } from '@/lib/db/repositories/pipelines';
import { roadmapsRepository } from '@/lib/db/repositories/roadmaps';
import { featureRequestsRepository } from '@/lib/db/repositories/feature-requests';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import type { Pipeline } from '@/types';

// Query keys - now include workspaceId for proper cache isolation
export const pipelineKeys = {
  all: ['pipelines'] as const,
  lists: (workspaceId?: string) => [...pipelineKeys.all, 'list', { workspaceId }] as const,
  detail: (id: string) => [...pipelineKeys.all, 'detail', id] as const,
};

// Get all pipelines (filtered by current workspace)
export function usePipelines() {
  const { currentWorkspace } = useWorkspaceStore();
  const workspaceId = currentWorkspace?.id;

  return useQuery({
    queryKey: pipelineKeys.lists(workspaceId),
    queryFn: () => pipelinesRepository.getAll(workspaceId),
  });
}

// Get a single pipeline
export function usePipeline(id: string | undefined) {
  return useQuery({
    queryKey: pipelineKeys.detail(id || ''),
    queryFn: () => (id ? pipelinesRepository.getById(id) : Promise.resolve(undefined)),
    enabled: !!id,
  });
}

// Create pipeline
export function useCreatePipeline() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspaceStore();

  return useMutation({
    mutationFn: (data: { name: string; description?: string; icon?: string; color?: string }) => {
      // Automatically inject workspaceId if not provided
      const pipelineData = {
        ...data,
        workspaceId: currentWorkspace?.id,
      };
      return pipelinesRepository.create(pipelineData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pipelineKeys.lists(currentWorkspace?.id) });
    },
  });
}

// Update pipeline
export function useUpdatePipeline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Pipeline> }) =>
      pipelinesRepository.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: pipelineKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: pipelineKeys.lists() });
    },
  });
}

// Delete pipeline (also deletes associated roadmaps and feature requests)
export function useDeletePipeline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      try {
        // Repository now handles cascading delete via RPC
        const result = await pipelinesRepository.delete(id);
        if (!result) {
          throw new Error('Failed to delete pipeline');
        }
        return result;
      } catch (error) {
        console.error('Error in delete pipeline mutation:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pipelineKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ['roadmaps'] });
      queryClient.invalidateQueries({ queryKey: ['featureRequests'] });
    },
  });
}
