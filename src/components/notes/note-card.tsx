'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TagBadge, getTagColor } from '@/components/shared/tag-badge';
import { UserAvatar } from '@/components/shared/user-avatar';
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
import { MoveToProjectDialog } from './move-to-project-dialog';
import type { Note } from '@/types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { FolderOpen, MoreHorizontal, Pencil, Copy, Trash2, FolderInput } from 'lucide-react';
import { useDeleteNote, useDuplicateNote } from '@/lib/hooks/use-notes';
import { toast } from 'sonner';

interface NoteCardProps {
  note: Note;
  projectName?: string;
  className?: string;
  draggable?: boolean;
}

interface TiptapNode {
  type?: string;
  text?: string;
  content?: TiptapNode[];
}

function extractPreview(content: string): { text: string; items: string[] } {
  try {
    const parsed = JSON.parse(content);
    let text = '';
    const items: string[] = [];

    function traverse(node: TiptapNode) {
      if (!node) return;

      if (node.type === 'paragraph' && node.content) {
        const paragraphText = node.content
          .filter((n): n is TiptapNode & { text: string } => n.type === 'text' && !!n.text)
          .map((n) => n.text)
          .join('');
        if (paragraphText && !text) {
          text = paragraphText;
        }
      }

      if ((node.type === 'bulletList' || node.type === 'orderedList' || node.type === 'taskList') && node.content) {
        node.content.forEach((listItem) => {
          if (listItem.content) {
            listItem.content.forEach((child) => {
              if (child.type === 'paragraph' && child.content) {
                const itemText = child.content
                  .filter((n): n is TiptapNode & { text: string } => n.type === 'text' && !!n.text)
                  .map((n) => n.text)
                  .join('');
                if (itemText && items.length < 2) {
                  items.push(itemText);
                }
              }
            });
          }
        });
      }

      if (node.content && Array.isArray(node.content)) {
        node.content.forEach((child) => traverse(child));
      }
    }

    traverse(parsed);
    return { text, items };
  } catch {
    return { text: content.slice(0, 100), items: [] };
  }
}

export function NoteCard({ note, projectName, className, draggable = true }: NoteCardProps) {
  const router = useRouter();
  const preview = extractPreview(note.content);
  const formattedDate = format(new Date(note.createdAt), 'MMM d HH:mm');
  const [isDragging, setIsDragging] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const deleteNote = useDeleteNote();
  const duplicateNote = useDuplicateNote();

  const handleDragStart = (e: React.DragEvent<HTMLAnchorElement>) => {
    e.dataTransfer.setData('application/note-id', note.id);
    e.dataTransfer.setData('text/plain', note.title);
    e.dataTransfer.effectAllowed = 'move';
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleMoveClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowMoveDialog(true);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/notes/${note.id}`);
  };

  const handleDuplicate = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    duplicateNote.mutate(note.id, {
      onSuccess: () => {
        toast.success('Note duplicated');
      },
      onError: () => {
        toast.error('Failed to duplicate note');
      },
    });
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = () => {
    deleteNote.mutate(note.id, {
      onSuccess: () => {
        toast.success('Note deleted');
        setShowDeleteDialog(false);
      },
      onError: () => {
        toast.error('Failed to delete note');
      },
    });
  };

  return (
    <>
      <Link
        href={`/notes/${note.id}`}
        className="block h-full"
        draggable={draggable}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <Card
          className={cn(
            'group cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/20 py-0 flex flex-col h-[200px] min-[1440px]:h-[216px]',
            isDragging && 'opacity-50 ring-2 ring-primary',
            className
          )}
        >
          <CardContent className="py-4 px-6 flex flex-col h-full">
            {/* Tags */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {note.tags.map((tag) => (
                <TagBadge key={tag} name={tag} color={getTagColor(tag)} />
              ))}
            </div>

            {/* Title */}
            <h3 className="font-semibold text-base mb-2 line-clamp-1 group-hover:text-primary transition-colors">
              {note.title}
            </h3>

            {/* Preview content */}
            <div className="text-sm text-muted-foreground mb-4 min-h-0 flex-1 overflow-hidden">
              {preview.text && (
                <p className="line-clamp-2 mb-1">{preview.text}</p>
              )}
              {preview.items.length > 0 && (
                <ul className="list-disc list-inside space-y-0.5">
                  {preview.items.map((item, i) => (
                    <li key={i} className="line-clamp-1 text-xs">
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Footer: Author, project, date and menu */}
            <div className="flex items-center justify-between pt-3 border-t mt-auto">
              <div className="flex items-center gap-3">
                <UserAvatar
                  name={note.authorName}
                  avatar={note.authorAvatar}
                  size="sm"
                  showName
                />
                {projectName && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <FolderOpen className="h-3 w-3" />
                    {projectName}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">{formattedDate}</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem onClick={handleMoveClick}>
                      <FolderInput className="h-4 w-4 mr-2" />
                      Move to
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleEditClick}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDuplicate}>
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleDeleteClick}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* Move to Project Dialog */}
      <MoveToProjectDialog
        open={showMoveDialog}
        onOpenChange={setShowMoveDialog}
        noteId={note.id}
        noteTitle={note.title}
        currentProjectId={note.projectId}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{note.title || 'Untitled'}&quot;?
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
    </>
  );
}

// Skeleton for loading state
export function NoteCardSkeleton() {
  return (
    <Card className="py-0">
      <CardContent className="py-4 px-6">
        <div className="flex gap-1.5 mb-3">
          <div className="h-5 w-14 rounded-md bg-muted animate-pulse" />
          <div className="h-5 w-16 rounded-md bg-muted animate-pulse" />
        </div>
        <div className="h-5 w-3/4 rounded bg-muted animate-pulse mb-2" />
        <div className="space-y-2 mb-4">
          <div className="h-4 w-full rounded bg-muted animate-pulse" />
          <div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
        </div>
        <div className="flex items-center justify-between pt-3 border-t">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-muted animate-pulse" />
            <div className="h-4 w-24 rounded bg-muted animate-pulse" />
          </div>
          <div className="h-4 w-16 rounded bg-muted animate-pulse" />
        </div>
      </CardContent>
    </Card>
  );
}

