'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { Calendar, MoreHorizontal, Pencil, Copy, Trash2, FolderInput, FolderOpen } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { TagBadge, getTagColor } from '@/components/shared/tag-badge';
import { UserAvatar } from '@/components/shared/user-avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Note } from '@/types';

interface NoteRowProps {
  note: Note;
  projectName?: string;
  isSelected?: boolean;
  onToggleSelect?: (id: string, selected: boolean) => void;
  onClick?: () => void;
  onEdit?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onMoveTo?: () => void;
  draggable?: boolean;
}

export function NoteRow({
  note,
  projectName,
  isSelected = false,
  onToggleSelect,
  onClick,
  onEdit,
  onDuplicate,
  onDelete,
  onMoveTo,
  draggable = true,
}: NoteRowProps) {
  const formattedDate = format(new Date(note.updatedAt), 'MMM d, yyyy');

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/note-id', note.id);
    e.dataTransfer.setData('text/plain', note.title);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      className={cn(
        'group flex items-center gap-4 px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors border-b border-border/50',
        isSelected && 'bg-muted'
      )}
      onClick={onClick}
      draggable={draggable}
      onDragStart={handleDragStart}
    >
      {/* Checkbox for Selection */}
      <Checkbox
        checked={isSelected}
        onCheckedChange={(checked) => {
          onToggleSelect?.(note.id, checked as boolean);
        }}
        onClick={(e) => e.stopPropagation()}
        className="shrink-0"
      />

      {/* Title */}
      <span className="flex-1 text-sm font-medium truncate">
        {note.title || 'Untitled'}
      </span>

      {/* Project */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground shrink-0 min-w-[100px]">
        <FolderOpen className="h-3.5 w-3.5" />
        <span className="truncate">{projectName || 'No Project'}</span>
      </div>

      {/* Tags */}
      <div className="flex items-center justify-end gap-1.5 shrink-0 min-w-[180px]">
        {note.tags.slice(0, 3).map((tag) => (
          <TagBadge key={tag} name={tag} color={getTagColor(tag)} />
        ))}
        {note.tags.length > 3 && (
          <span className="text-xs text-muted-foreground">+{note.tags.length - 3}</span>
        )}
      </div>

      {/* Updated Date */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground shrink-0 min-w-[120px]">
        <Calendar className="h-4 w-4" />
        <span>{formattedDate}</span>
      </div>

      {/* Author */}
      <div className="flex items-center gap-2 shrink-0 min-w-[100px]">
        <UserAvatar
          name={note.authorName}
          avatar={note.authorAvatar}
          size="sm"
        />
        <span className="text-sm text-muted-foreground truncate max-w-[80px]">
          {note.authorName.split(' ')[0]}
        </span>
      </div>

      {/* Actions Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onMoveTo?.(); }}>
            <FolderInput className="h-4 w-4 mr-2" />
            Move to
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit?.(); }}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate?.(); }}>
            <Copy className="h-4 w-4 mr-2" />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
