'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tagsRepository } from '@/lib/db/repositories/tags';
import type { Tag, TagColor } from '@/types';

// Query keys
export const tagKeys = {
  all: ['tags'] as const,
  lists: () => [...tagKeys.all, 'list'] as const,
  list: (category?: Tag['category']) => [...tagKeys.lists(), { category }] as const,
  detail: (id: string) => [...tagKeys.all, 'detail', id] as const,
};

// Get all tags
export function useTags(category?: Tag['category']) {
  return useQuery({
    queryKey: tagKeys.list(category),
    queryFn: () => category ? tagsRepository.getByCategory(category) : tagsRepository.getAll(),
  });
}

// Get single tag
export function useTag(id: string) {
  return useQuery({
    queryKey: tagKeys.detail(id),
    queryFn: () => tagsRepository.getById(id),
    enabled: !!id,
  });
}

// Create tag
export function useCreateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      name, 
      color, 
      category 
    }: { 
      name: string; 
      color: TagColor; 
      category?: Tag['category'];
    }) => {
      return tagsRepository.create(name, color, category);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.lists() });
    },
  });
}

// Update tag
export function useUpdateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Omit<Tag, 'id'>> }) => {
      return tagsRepository.update(id, data);
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: tagKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: tagKeys.lists() });
    },
  });
}

// Delete tag
export function useDeleteTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return tagsRepository.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.lists() });
    },
  });
}

