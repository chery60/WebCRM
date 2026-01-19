'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notesRepository } from '@/lib/db/repositories/notes';
import type { Note, NotesFilter, NotesSort, NoteFormData } from '@/types';

// Query keys
export const noteKeys = {
  all: ['notes'] as const,
  lists: () => [...noteKeys.all, 'list'] as const,
  list: (filter?: NotesFilter, sort?: NotesSort) => [...noteKeys.lists(), { filter, sort }] as const,
  details: () => [...noteKeys.all, 'detail'] as const,
  detail: (id: string) => [...noteKeys.details(), id] as const,
};

// Get all notes
export function useNotes(filter?: NotesFilter, sort?: NotesSort) {
  return useQuery({
    queryKey: noteKeys.list(filter, sort),
    queryFn: () => notesRepository.getAll(filter, sort),
  });
}

// Get single note
export function useNote(id: string) {
  return useQuery({
    queryKey: noteKeys.detail(id),
    queryFn: () => notesRepository.getById(id),
    enabled: !!id,
  });
}

// Create note
export function useCreateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      data, 
      authorId, 
      authorName, 
      authorAvatar 
    }: { 
      data: NoteFormData; 
      authorId: string; 
      authorName: string; 
      authorAvatar?: string;
    }) => {
      return notesRepository.create(data, authorId, authorName, authorAvatar);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
    },
  });
}

// Update note
export function useUpdateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<NoteFormData> }) => {
      return notesRepository.update(id, data);
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: noteKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
    },
  });
}

// Delete note (soft delete)
export function useDeleteNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return notesRepository.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
    },
  });
}

// Restore note
export function useRestoreNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return notesRepository.restore(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
    },
  });
}

// Move note to project
export function useMoveNoteToProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ noteId, projectId }: { noteId: string; projectId: string | undefined }) => {
      return notesRepository.update(noteId, { projectId });
    },
    onSuccess: (_, { noteId }) => {
      queryClient.invalidateQueries({ queryKey: noteKeys.detail(noteId) });
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

// Duplicate note
export function useDuplicateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return notesRepository.duplicate(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
    },
  });
}

// Optimistic update helper
export function useOptimisticNoteUpdate() {
  const queryClient = useQueryClient();

  return {
    updateNoteInCache: (id: string, updates: Partial<Note>) => {
      queryClient.setQueryData<Note | undefined>(
        noteKeys.detail(id),
        (old) => old ? { ...old, ...updates } : undefined
      );
    },
    invalidate: () => {
      queryClient.invalidateQueries({ queryKey: noteKeys.all });
    },
  };
}

