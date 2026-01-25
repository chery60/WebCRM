'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCreateNote } from '@/lib/hooks/use-notes';
import { useAuthStore } from '@/lib/stores/auth-store';
import { Loader2 } from 'lucide-react';
import { useEffect, useRef, Suspense } from 'react';
import { toast } from 'sonner';

function NewNoteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialProjectId = searchParams?.get('project') || undefined;
  
  const { currentUser } = useAuthStore();
  const createNote = useCreateNote();
  const hasCreated = useRef(false);

  useEffect(() => {
    // Prevent double creation in strict mode
    if (hasCreated.current) return;
    
    const createNewNote = async () => {
      if (!currentUser) {
        toast.error('Please sign in to create notes');
        router.push('/notes');
        return;
      }

      hasCreated.current = true;

      try {
        const newNote = await createNote.mutateAsync({
          data: {
            title: 'Untitled Note',
            content: '',
            tags: [],
            projectId: initialProjectId,
          },
          authorId: currentUser.id,
          authorName: currentUser.name || currentUser.email,
          authorAvatar: currentUser.avatar,
        });

        if (newNote) {
          // Replace the current history entry so back button goes to notes list
          router.replace(`/notes/${newNote.id}`);
        } else {
          toast.error('Failed to create note');
          router.push('/notes');
        }
      } catch (error) {
        toast.error('Failed to create note');
        router.push('/notes');
      }
    };

    createNewNote();
  }, [currentUser, createNote, router, initialProjectId]);

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Creating new note...</p>
      </div>
    </div>
  );
}

export default function NewNotePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <NewNoteContent />
    </Suspense>
  );
}
