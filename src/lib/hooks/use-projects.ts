'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsRepository } from '@/lib/db/repositories/projects';
import type { Project } from '@/types';

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsRepository.getAll(),
  });
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: ['projects', id],
    queryFn: () => (id ? projectsRepository.getById(id) : undefined),
    enabled: !!id,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>) =>
      projectsRepository.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Omit<Project, 'id' | 'createdAt'>> }) =>
      projectsRepository.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['projects', id] });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => projectsRepository.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useProjectNoteCount(projectId: string | undefined) {
  return useQuery({
    queryKey: ['projects', projectId, 'noteCount'],
    queryFn: () => (projectId ? projectsRepository.getNoteCount(projectId) : 0),
    enabled: !!projectId,
  });
}

export function useAllProjectNoteCounts() {
  return useQuery({
    queryKey: ['projects', 'allNoteCounts'],
    queryFn: () => projectsRepository.getAllNoteCounts(),
  });
}
