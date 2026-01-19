'use client';

import { NoteCard, NoteCardSkeleton } from './note-card';
import type { Note } from '@/types';
import { StickyNote, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface NoteGridProps {
  notes: Note[];
  isLoading?: boolean;
  projectId?: string;
  projectsMap?: Map<string, string>;
}

export function NoteGrid({ notes, isLoading, projectId, projectsMap }: NoteGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <NoteCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          {projectId ? (
            <FolderOpen className="h-8 w-8 text-muted-foreground" />
          ) : (
            <StickyNote className="h-8 w-8 text-muted-foreground" />
          )}
        </div>
        <h3 className="font-semibold text-lg mb-2">
          {projectId ? 'No notes in this project' : 'No notes yet'}
        </h3>
        <p className="text-muted-foreground mb-4 max-w-sm">
          {projectId 
            ? 'Create your first note in this project to get started.'
            : 'Create your first note to get started. Use the AI features to help you write faster.'
          }
        </p>
        <Button asChild>
          <Link href={projectId ? `/notes/new?project=${projectId}` : '/notes/new'}>
            Create your first note
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {notes.map((note) => (
        <NoteCard 
          key={note.id} 
          note={note} 
          projectName={note.projectId ? projectsMap?.get(note.projectId) : undefined}
        />
      ))}
    </div>
  );
}

