'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { NoteRow } from '../note-row';
import { MoveToProjectDialog } from '../move-to-project-dialog';
import { NoteBulkActionBar } from '../note-bulk-action-bar';
import { useDeleteNote, useDuplicateNote, useMoveNoteToProject, useUpdateNote } from '@/lib/hooks/use-notes';
import { useProjects } from '@/lib/hooks/use-projects';
import { toast } from 'sonner';
import type { Note } from '@/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface NoteListViewProps {
  notes: Note[];
  isLoading?: boolean;
  projectId?: string;
  projectsMap?: Map<string, string>;
}

export function NoteListView({ notes, isLoading, projectId, projectsMap }: NoteListViewProps) {
  const router = useRouter();
  const deleteNote = useDeleteNote();
  const duplicateNote = useDuplicateNote();
  const moveNote = useMoveNoteToProject();
  const updateNote = useUpdateNote();
  const { data: projects = [] } = useProjects();
  
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [noteToMove, setNoteToMove] = useState<Note | null>(null);
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);

  const handleToggleSelect = (id: string, selected: boolean) => {
    const newSelected = new Set(selectedNoteIds);
    if (selected) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedNoteIds(newSelected);
  };

  const handleNoteClick = (note: Note) => {
    router.push(`/notes/${note.id}`);
  };

  const handleEdit = (note: Note) => {
    router.push(`/notes/${note.id}`);
  };

  const handleDuplicate = (note: Note) => {
    duplicateNote.mutate(note.id, {
      onSuccess: () => {
        toast.success('Note duplicated');
      },
      onError: () => {
        toast.error('Failed to duplicate note');
      },
    });
  };

  const handleMoveClick = (note: Note) => {
    setNoteToMove(note);
    setShowMoveDialog(true);
  };

  const handleDeleteClick = (note: Note) => {
    setNoteToDelete(note);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = () => {
    if (noteToDelete) {
      deleteNote.mutate(noteToDelete.id, {
        onSuccess: () => {
          toast.success('Note deleted');
          setShowDeleteDialog(false);
          setNoteToDelete(null);
        },
        onError: () => {
          toast.error('Failed to delete note');
        },
      });
    }
  };

  // Bulk action handlers
  const handleClearSelection = () => {
    setSelectedNoteIds(new Set());
  };

  const handleBulkMoveToProject = (targetProjectId: string | undefined) => {
    const selectedIds = Array.from(selectedNoteIds);
    const targetName = targetProjectId
      ? projects.find((p) => p.id === targetProjectId)?.name || 'project'
      : 'All Notes';

    Promise.all(
      selectedIds.map((noteId) =>
        moveNote.mutateAsync({ noteId, projectId: targetProjectId })
      )
    )
      .then(() => {
        toast.success(`${selectedIds.length} note(s) moved to ${targetName}`);
        setSelectedNoteIds(new Set());
      })
      .catch(() => {
        toast.error('Failed to move some notes');
      });
  };

  const handleBulkDuplicate = () => {
    const selectedIds = Array.from(selectedNoteIds);
    
    Promise.all(selectedIds.map((id) => duplicateNote.mutateAsync(id)))
      .then(() => {
        toast.success(`${selectedIds.length} note(s) duplicated`);
        setSelectedNoteIds(new Set());
      })
      .catch(() => {
        toast.error('Failed to duplicate some notes');
      });
  };

  const handleBulkAddTags = (tags: string[]) => {
    const selectedIds = Array.from(selectedNoteIds);
    
    Promise.all(
      selectedIds.map((id) => {
        const note = notes.find((n) => n.id === id);
        if (note) {
          const mergedTags = Array.from(new Set([...note.tags, ...tags]));
          return updateNote.mutateAsync({ id, data: { tags: mergedTags } });
        }
        return Promise.resolve();
      })
    )
      .then(() => {
        toast.success(`Tags updated for ${selectedIds.length} note(s)`);
      })
      .catch(() => {
        toast.error('Failed to update tags for some notes');
      });
  };

  const handleBulkDeleteClick = () => {
    setShowBulkDeleteDialog(true);
  };

  const handleConfirmBulkDelete = () => {
    const selectedIds = Array.from(selectedNoteIds);
    
    Promise.all(selectedIds.map((id) => deleteNote.mutateAsync(id)))
      .then(() => {
        toast.success(`${selectedIds.length} note(s) deleted`);
        setSelectedNoteIds(new Set());
        setShowBulkDeleteDialog(false);
      })
      .catch(() => {
        toast.error('Failed to delete some notes');
      });
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-muted-foreground">No notes found</p>
        <p className="text-sm text-muted-foreground mt-1">
          Create a new note to get started
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="border rounded-lg overflow-hidden">
        {notes.map((note) => (
          <NoteRow
            key={note.id}
            note={note}
            projectName={note.projectId ? projectsMap?.get(note.projectId) : undefined}
            isSelected={selectedNoteIds.has(note.id)}
            onToggleSelect={handleToggleSelect}
            onClick={() => handleNoteClick(note)}
            onEdit={() => handleEdit(note)}
            onDuplicate={() => handleDuplicate(note)}
            onMoveTo={() => handleMoveClick(note)}
            onDelete={() => handleDeleteClick(note)}
          />
        ))}
      </div>

      {/* Move to Project Dialog */}
      {noteToMove && (
        <MoveToProjectDialog
          open={showMoveDialog}
          onOpenChange={setShowMoveDialog}
          noteId={noteToMove.id}
          noteTitle={noteToMove.title}
          currentProjectId={noteToMove.projectId}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{noteToDelete?.title || 'Untitled'}&quot;? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedNoteIds.size} Notes</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedNoteIds.size} selected note(s)? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete {selectedNoteIds.size} Notes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Action Bar */}
      <NoteBulkActionBar
        selectedCount={selectedNoteIds.size}
        onClearSelection={handleClearSelection}
        onMoveToProject={handleBulkMoveToProject}
        onDuplicate={handleBulkDuplicate}
        onAddTags={handleBulkAddTags}
        onDelete={handleBulkDeleteClick}
      />
    </>
  );
}
