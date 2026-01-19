'use client';

import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { useNotes } from '@/lib/hooks/use-notes';
import { useNotesStore, useUIStore } from '@/lib/stores/ui-store';
import { useProject, useProjects } from '@/lib/hooks/use-projects';
import { NoteGrid } from '@/components/notes/note-grid';
import { NoteListView } from '@/components/notes/views/note-list-view';
import { NoteTableView } from '@/components/notes/views/note-table-view';
import { NotesHeader } from '@/components/notes/notes-header';
import { Suspense } from 'react';

function NotesContent() {
  const searchParams = useSearchParams();
  const projectId = searchParams?.get('project') || undefined;
  const { filter, sort } = useNotesStore();
  const { notesView } = useUIStore();
  
  const { data: project } = useProject(projectId);
  const { data: projects = [] } = useProjects();
  
  // Create a map of projectId -> projectName for efficient lookup
  const projectsMap = useMemo(() => {
    const map = new Map<string, string>();
    projects.forEach((p) => map.set(p.id, p.name));
    return map;
  }, [projects]);
  
  const notesFilter = {
    tags: filter.tags.length > 0 ? filter.tags : undefined,
    search: filter.search || undefined,
    projectId,
  };
  
  const { data: notes = [], isLoading } = useNotes(notesFilter, sort);

  const renderView = () => {
    switch (notesView) {
      case 'list':
        return <NoteListView notes={notes} isLoading={isLoading} projectId={projectId} projectsMap={projectsMap} />;
      case 'table':
        return <NoteTableView notes={notes} isLoading={isLoading} projectId={projectId} projectsMap={projectsMap} />;
      case 'grid':
      default:
        return <NoteGrid notes={notes} isLoading={isLoading} projectId={projectId} projectsMap={projectsMap} />;
    }
  };

  return (
    <div className="p-6">
      <NotesHeader 
        projectId={projectId} 
        projectName={project?.name} 
      />
      {renderView()}
    </div>
  );
}

export default function NotesPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <NotesContent />
    </Suspense>
  );
}

