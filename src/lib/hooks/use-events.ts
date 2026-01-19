'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventsRepository } from '@/lib/db/repositories/events';
import type { CalendarEvent, EventFormData } from '@/types';

export function useEvents(range?: { start: Date; end: Date }) {
    return useQuery({
        queryKey: ['events', range?.start?.toISOString(), range?.end?.toISOString()],
        queryFn: async () => {
            if (range) {
                return eventsRepository.getEventsInRange(range.start, range.end);
            }
            return eventsRepository.getAll();
        },
    });
}

export function useEvent(id: string) {
    return useQuery({
        queryKey: ['event', id],
        queryFn: () => eventsRepository.getById(id),
        enabled: !!id,
    });
}

export function useCreateEvent() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: EventFormData) => eventsRepository.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['events'] });
        },
    });
}

export function useUpdateEvent() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: Partial<CalendarEvent> }) =>
            eventsRepository.update(id, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['events'] });
        },
    });
}

export function useDeleteEvent() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => eventsRepository.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['events'] });
        },
    });
}
