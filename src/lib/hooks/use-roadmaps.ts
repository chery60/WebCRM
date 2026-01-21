'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { roadmapsRepository } from '@/lib/db/repositories/roadmaps';
import { featureRequestsRepository } from '@/lib/db/repositories/feature-requests';
import type { Roadmap } from '@/types';

// Query keys
export const roadmapKeys = {
  all: ['roadmaps'] as const,
  lists: () => [...roadmapKeys.all, 'list'] as const,
  byPipeline: (pipelineId: string) => [...roadmapKeys.all, 'pipeline', pipelineId] as const,
  detail: (id: string) => [...roadmapKeys.all, 'detail', id] as const,
};

// Get all roadmaps (optionally filtered by pipeline)
export function useRoadmaps(pipelineId?: string) {
  return useQuery({
    queryKey: pipelineId ? roadmapKeys.byPipeline(pipelineId) : roadmapKeys.lists(),
    queryFn: () => roadmapsRepository.getAll(pipelineId),
  });
}

// Get roadmaps by pipeline
export function useRoadmapsByPipeline(pipelineId: string | undefined) {
  return useQuery({
    queryKey: roadmapKeys.byPipeline(pipelineId || ''),
    queryFn: () => (pipelineId ? roadmapsRepository.getByPipelineId(pipelineId) : Promise.resolve([])),
    enabled: !!pipelineId,
  });
}

// Get a single roadmap
export function useRoadmap(id: string | undefined) {
  return useQuery({
    queryKey: roadmapKeys.detail(id || ''),
    queryFn: () => (id ? roadmapsRepository.getById(id) : Promise.resolve(undefined)),
    enabled: !!id,
  });
}

// Create roadmap
export function useCreateRoadmap() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { pipelineId: string; name: string; description?: string }) =>
      roadmapsRepository.create(data),
    onSuccess: (roadmap) => {
      queryClient.invalidateQueries({ queryKey: roadmapKeys.lists() });
      queryClient.invalidateQueries({ queryKey: roadmapKeys.byPipeline(roadmap.pipelineId) });
    },
  });
}

// Update roadmap
export function useUpdateRoadmap() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Roadmap> }) =>
      roadmapsRepository.update(id, data),
    onSuccess: async (roadmap, { id }) => {
      queryClient.invalidateQueries({ queryKey: roadmapKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: roadmapKeys.lists() });
      if (roadmap) {
        queryClient.invalidateQueries({ queryKey: roadmapKeys.byPipeline(roadmap.pipelineId) });
      }
    },
  });
}

// Delete roadmap (also deletes associated feature requests)
export function useDeleteRoadmap() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const roadmap = await roadmapsRepository.getById(id);
      // Delete all feature requests first
      await featureRequestsRepository.deleteByRoadmapId(id);
      // Then delete the roadmap
      await roadmapsRepository.delete(id);
      return roadmap;
    },
    onSuccess: (roadmap) => {
      queryClient.invalidateQueries({ queryKey: roadmapKeys.lists() });
      if (roadmap) {
        queryClient.invalidateQueries({ queryKey: roadmapKeys.byPipeline(roadmap.pipelineId) });
      }
      queryClient.invalidateQueries({ queryKey: ['featureRequests'] });
    },
  });
}
