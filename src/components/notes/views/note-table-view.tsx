'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Calendar, Plus, ArrowUpDown, MoreHorizontal, Pencil, Copy, Trash2, FolderInput, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { TagBadge, getTagColor } from '@/components/shared/tag-badge';
import { UserAvatar } from '@/components/shared/user-avatar';
import { MoveToProjectDialog } from '../move-to-project-dialog';
import { NoteBulkActionBar } from '../note-bulk-action-bar';
import { useDeleteNote, useDuplicateNote, useMoveNoteToProject, useUpdateNote } from '@/lib/hooks/use-notes';
import { useProjects } from '@/lib/hooks/use-projects';
import { useNotesStore } from '@/lib/stores/ui-store';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Note, NoteSortField, SortDirection } from '@/types';
import Link from 'next/link';

interface Project {
  id: string;
  name: string;
}

interface NoteTableViewProps {
  notes: Note[];
  isLoading?: boolean;
  projectId?: string;
  projectsMap?: Map<string, string>; // Map of projectId to projectName
}

export function NoteTableView({ notes, isLoading, projectId, projectsMap }: NoteTableViewProps) {
  const router = useRouter();
  const { sort, setSort } = useNotesStore();
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

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedNoteIds(new Set(notes.map(n => n.id)));
    } else {
      setSelectedNoteIds(new Set());
    }
  };

  const handleSort = (field: NoteSortField) => {
    const newDirection: SortDirection = 
      sort.field === field && sort.direction === 'asc' ? 'desc' : 'asc';
    setSort({ field, direction: newDirection });
  };

  const handleNoteClick = (note: Note) => {
    router.push(`/notes/${note.id}`);
  };

  const handleDragStart = (e: React.DragEvent, note: Note) => {
    e.dataTransfer.setData('application/note-id', note.id);
    e.dataTransfer.setData('text/plain', note.title);
    e.dataTransfer.effectAllowed = 'move';
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

  const SortableHeader = ({ field, children }: { field: NoteSortField; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 data-[state=open]:bg-accent"
      onClick={() => handleSort(field)}
    >
      {children}
      <ArrowUpDown className={cn(
        "ml-2 h-4 w-4",
        sort.field === field && "text-primary"
      )} />
    </Button>
  );

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

  const allSelected = notes.length > 0 && selectedNoteIds.size === notes.length;
  const someSelected = selectedNoteIds.size > 0 && selectedNoteIds.size < notes.length;

  return (
    <>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  ref={(el) => {
                    if (el) {
                      (el as HTMLButtonElement & { indeterminate: boolean }).indeterminate = someSelected;
                    }
                  }}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>
                <SortableHeader field="title">Note Title</SortableHeader>
              </TableHead>
              <TableHead>Project</TableHead>
              <TableHead>
                <SortableHeader field="updatedAt">Last Updated</SortableHeader>
              </TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Author</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {notes.map((note) => (
              <TableRow
                key={note.id}
                className="cursor-pointer"
                onClick={() => handleNoteClick(note)}
                draggable
                onDragStart={(e) => handleDragStart(e, note)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedNoteIds.has(note.id)}
                    onCheckedChange={(checked) => handleToggleSelect(note.id, checked as boolean)}
                  />
                </TableCell>
                <TableCell className="font-medium">
                  {note.title || 'Untitled'}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <FolderOpen className="h-3.5 w-3.5" />
                    <span className="truncate max-w-[120px]">
                      {note.projectId && projectsMap?.get(note.projectId) || 'No Project'}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(note.updatedAt), 'MMM d, yyyy')}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    {note.tags.slice(0, 2).map((tag) => (
                      <TagBadge key={tag} name={tag} color={getTagColor(tag)} />
                    ))}
                    {note.tags.length > 2 && (
                      <span className="text-xs text-muted-foreground">+{note.tags.length - 2}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <UserAvatar
                      name={note.authorName}
                      avatar={note.authorAvatar}
                      size="sm"
                    />
                    <span className="text-sm truncate max-w-[100px]">
                      {note.authorName.split(' ')[0]}
                    </span>
                  </div>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem onClick={() => handleMoveClick(note)}>
                        <FolderInput className="h-4 w-4 mr-2" />
                        Move to
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push(`/notes/${note.id}`)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicate(note)}>
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDeleteClick(note)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {/* Add new note row */}
            <TableRow className="hover:bg-muted/50">
              <TableCell colSpan={7}>
                <Link
                  href={projectId ? `/notes/new?project=${projectId}` : '/notes/new'}
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors py-1"
                >
                  <Plus className="h-4 w-4" />
                  <span>New Note</span>
                </Link>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
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
