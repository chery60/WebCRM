'use client';

import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { useNotes, useWorkspaceNotes } from '@/lib/hooks/use-notes';
import { useNotesStore, useUIStore } from '@/lib/stores/ui-store';
import { useProject, useWorkspaceProjects } from '@/lib/hooks/use-projects';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { NoteGrid } from '@/components/notes/note-grid';
import { NoteListView } from '@/components/notes/views/note-list-view';
import { NoteTableView } from '@/components/notes/views/note-table-view';
import { NotesHeader } from '@/components/notes/notes-header';
import { NotesEmptyState } from '@/components/notes/notes-empty-state';
import { Suspense } from 'react';

function NotesContent() {
  const searchParams = useSearchParams();
  const projectId = searchParams?.get('project') || undefined;
  const { filter, sort } = useNotesStore();
  const { notesView } = useUIStore();
  const { currentWorkspace } = useWorkspaceStore();

  const { data: project } = useProject(projectId);
  const { data: projects = [] } = useWorkspaceProjects();

  // Create a map of projectId -> projectName for efficient lookup
  const projectsMap = useMemo(() => {
    const map = new Map<string, string>();
    projects.forEach((p) => map.set(p.id, p.name));
    return map;
  }, [projects]);

  // Build workspace-aware filter
  // If workspace is loaded, filter by it. If not loaded yet but user has workspaces, wait.
  // If no workspaces exist (legacy user), show all notes for the user.
  const notesFilter = useMemo(() => ({
    tags: filter.tags.length > 0 ? filter.tags : undefined,
    search: filter.search || undefined,
    projectId,
    workspaceId: currentWorkspace?.id,
    // When no projectId is specified (All PRDs page), include all projects
    // Otherwise, only show PRDs for the specific project
    includeAllProjects: !projectId,
  }), [filter.tags, filter.search, projectId, currentWorkspace?.id]);

  const { data: notes = [], isLoading } = useNotes(notesFilter, sort);

  // Show empty state when no notes exist and not loading
  const showEmptyState = !isLoading && notes.length === 0 && !filter.search && filter.tags.length === 0;

  const renderView = () => {
    if (showEmptyState) {
      return <NotesEmptyState />;
    }

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
        isEmpty={showEmptyState}
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
