'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { featureRequestsRepository } from '@/lib/db/repositories/feature-requests';
import type { FeatureRequest, FeatureRequestFilter, FeatureRequestSort, FeatureActivity, FeatureAttachment } from '@/types';

// Query keys
export const featureRequestKeys = {
  all: ['featureRequests'] as const,
  lists: () => [...featureRequestKeys.all, 'list'] as const,
  byRoadmap: (roadmapId: string) => [...featureRequestKeys.all, 'roadmap', roadmapId] as const,
  byRoadmapFiltered: (roadmapId: string, filter?: FeatureRequestFilter, sort?: FeatureRequestSort) =>
    [...featureRequestKeys.all, 'roadmap', roadmapId, { filter, sort }] as const,
  groupedByPhase: (roadmapId: string) => [...featureRequestKeys.all, 'roadmap', roadmapId, 'byPhase'] as const,
  groupedByStatus: (roadmapId: string) => [...featureRequestKeys.all, 'roadmap', roadmapId, 'byStatus'] as const,
  detail: (id: string) => [...featureRequestKeys.all, 'detail', id] as const,
  phases: (roadmapId: string) => [...featureRequestKeys.all, 'phases', roadmapId] as const,
};

// Get feature requests for a roadmap
export function useFeatureRequests(
  roadmapId: string | undefined,
  filter?: FeatureRequestFilter,
  sort?: FeatureRequestSort
) {
  return useQuery({
    queryKey: featureRequestKeys.byRoadmapFiltered(roadmapId || '', filter, sort),
    queryFn: () => (roadmapId ? featureRequestsRepository.getAll(roadmapId, filter, sort) : Promise.resolve([])),
    enabled: !!roadmapId,
  });
}

// Get feature requests grouped by phase
export function useFeatureRequestsByPhase(roadmapId: string | undefined) {
  return useQuery({
    queryKey: featureRequestKeys.groupedByPhase(roadmapId || ''),
    queryFn: async () => {
      if (!roadmapId) return new Map<string, FeatureRequest[]>();
      return featureRequestsRepository.getGroupedByPhase(roadmapId);
    },
    enabled: !!roadmapId,
  });
}

// Get feature requests grouped by status (for Kanban)
export function useFeatureRequestsByStatus(roadmapId: string | undefined) {
  return useQuery({
    queryKey: featureRequestKeys.groupedByStatus(roadmapId || ''),
    queryFn: async () => {
      if (!roadmapId) return new Map<string, FeatureRequest[]>();
      return featureRequestsRepository.getGroupedByStatus(roadmapId);
    },
    enabled: !!roadmapId,
  });
}

// Get a single feature request
export function useFeatureRequest(id: string | undefined) {
  return useQuery({
    queryKey: featureRequestKeys.detail(id || ''),
    queryFn: () => (id ? featureRequestsRepository.getById(id) : Promise.resolve(undefined)),
    enabled: !!id,
  });
}

// Get unique phases for a roadmap
export function useFeatureRequestPhases(roadmapId: string | undefined) {
  return useQuery({
    queryKey: featureRequestKeys.phases(roadmapId || ''),
    queryFn: () => (roadmapId ? featureRequestsRepository.getPhases(roadmapId) : Promise.resolve([])),
    enabled: !!roadmapId,
  });
}

// Create feature request
export function useCreateFeatureRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      data: Omit<FeatureRequest, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'activities' | 'attachments' | 'order'>
    ) => featureRequestsRepository.create(data),
    onSuccess: (feature) => {
      queryClient.invalidateQueries({ queryKey: featureRequestKeys.byRoadmap(feature.roadmapId) });
      queryClient.invalidateQueries({ queryKey: featureRequestKeys.groupedByPhase(feature.roadmapId) });
      queryClient.invalidateQueries({ queryKey: featureRequestKeys.groupedByStatus(feature.roadmapId) });
      queryClient.invalidateQueries({ queryKey: featureRequestKeys.phases(feature.roadmapId) });
    },
  });
}

// Update feature request
export function useUpdateFeatureRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FeatureRequest> }) =>
      featureRequestsRepository.update(id, data),
    onSuccess: async (feature, { id }) => {
      queryClient.invalidateQueries({ queryKey: featureRequestKeys.detail(id) });
      if (feature) {
        queryClient.invalidateQueries({ queryKey: featureRequestKeys.byRoadmap(feature.roadmapId) });
        queryClient.invalidateQueries({ queryKey: featureRequestKeys.groupedByPhase(feature.roadmapId) });
        queryClient.invalidateQueries({ queryKey: featureRequestKeys.groupedByStatus(feature.roadmapId) });
        queryClient.invalidateQueries({ queryKey: featureRequestKeys.phases(feature.roadmapId) });
      }
    },
  });
}

// Delete feature request
export function useDeleteFeatureRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const feature = await featureRequestsRepository.getById(id);
      await featureRequestsRepository.delete(id);
      return feature;
    },
    onSuccess: (feature) => {
      if (feature) {
        queryClient.invalidateQueries({ queryKey: featureRequestKeys.byRoadmap(feature.roadmapId) });
        queryClient.invalidateQueries({ queryKey: featureRequestKeys.groupedByPhase(feature.roadmapId) });
        queryClient.invalidateQueries({ queryKey: featureRequestKeys.groupedByStatus(feature.roadmapId) });
      }
    },
  });
}

// Duplicate feature request
export function useDuplicateFeatureRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => featureRequestsRepository.duplicate(id),
    onSuccess: (feature) => {
      if (feature) {
        queryClient.invalidateQueries({ queryKey: featureRequestKeys.byRoadmap(feature.roadmapId) });
        queryClient.invalidateQueries({ queryKey: featureRequestKeys.groupedByPhase(feature.roadmapId) });
        queryClient.invalidateQueries({ queryKey: featureRequestKeys.groupedByStatus(feature.roadmapId) });
      }
    },
  });
}

// Add activity (comment) to feature request
export function useAddFeatureActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      activity,
    }: {
      id: string;
      activity: Omit<FeatureActivity, 'id' | 'createdAt'>;
    }) => featureRequestsRepository.addActivity(id, activity),
    onSuccess: (feature, { id }) => {
      queryClient.invalidateQueries({ queryKey: featureRequestKeys.detail(id) });
    },
  });
}

// Add attachment to feature request
export function useAddFeatureAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      attachment,
    }: {
      id: string;
      attachment: Omit<FeatureAttachment, 'id' | 'uploadedAt'>;
    }) => featureRequestsRepository.addAttachment(id, attachment),
    onSuccess: (feature, { id }) => {
      queryClient.invalidateQueries({ queryKey: featureRequestKeys.detail(id) });
    },
  });
}

// Remove attachment from feature request
export function useRemoveFeatureAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, attachmentId }: { id: string; attachmentId: string }) =>
      featureRequestsRepository.removeAttachment(id, attachmentId),
    onSuccess: (feature, { id }) => {
      queryClient.invalidateQueries({ queryKey: featureRequestKeys.detail(id) });
    },
  });
}

// Reorder feature requests
export function useReorderFeatureRequests() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ roadmapId, orderedIds }: { roadmapId: string; orderedIds: string[] }) =>
      featureRequestsRepository.reorder(roadmapId, orderedIds),
    onSuccess: (_, { roadmapId }) => {
      queryClient.invalidateQueries({ queryKey: featureRequestKeys.byRoadmap(roadmapId) });
      queryClient.invalidateQueries({ queryKey: featureRequestKeys.groupedByPhase(roadmapId) });
      queryClient.invalidateQueries({ queryKey: featureRequestKeys.groupedByStatus(roadmapId) });
    },
  });
}
