'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pipelinesRepository } from '@/lib/db/repositories/pipelines';
import { roadmapsRepository } from '@/lib/db/repositories/roadmaps';
import { featureRequestsRepository } from '@/lib/db/repositories/feature-requests';
import type { Pipeline } from '@/types';

// Query keys
export const pipelineKeys = {
  all: ['pipelines'] as const,
  lists: () => [...pipelineKeys.all, 'list'] as const,
  detail: (id: string) => [...pipelineKeys.all, 'detail', id] as const,
};

// Get all pipelines
export function usePipelines() {
  return useQuery({
    queryKey: pipelineKeys.lists(),
    queryFn: () => pipelinesRepository.getAll(),
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

  return useMutation({
    mutationFn: (data: { name: string; description?: string; icon?: string; color?: string }) =>
      pipelinesRepository.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pipelineKeys.lists() });
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
      // First delete all roadmaps (which will cascade to feature requests)
      const roadmaps = await roadmapsRepository.getByPipelineId(id);
      for (const roadmap of roadmaps) {
        await featureRequestsRepository.deleteByRoadmapId(roadmap.id);
        await roadmapsRepository.delete(roadmap.id);
      }
      // Then delete the pipeline
      return pipelinesRepository.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pipelineKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ['roadmaps'] });
      queryClient.invalidateQueries({ queryKey: ['featureRequests'] });
    },
  });
}
