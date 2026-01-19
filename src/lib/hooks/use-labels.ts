import { useQuery } from '@tanstack/react-query';
import { db } from '@/lib/db/dexie';

// Default labels from Figma design
const DEFAULT_LABELS = ['Internal', 'Marketing', 'Urgent', 'Report', 'Event', 'Document'];

export function useLabels() {
    return useQuery({
        queryKey: ['labels'],
        queryFn: async () => {
            const tasks = await db.tasks.toArray();
            const existingLabels = new Set<string>();

            // Add default labels first
            DEFAULT_LABELS.forEach(label => existingLabels.add(label));

            // Add labels from existing tasks
            tasks.forEach(task => {
                task.labels.forEach(label => existingLabels.add(label));
            });

            return Array.from(existingLabels).sort();
        },
    });
}
