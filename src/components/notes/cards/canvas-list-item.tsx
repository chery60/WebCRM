'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Maximize2, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import type { CanvasItem } from '@/types';

interface CanvasListItemProps {
  canvas: CanvasItem;
  onExpand: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}

export function CanvasListItem({
  canvas,
  onExpand,
  onRename,
  onDelete,
}: CanvasListItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(canvas.name);

  const handleStartEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setEditName(canvas.name);
    setIsEditing(true);
  }, [canvas.name]);

  const handleSaveEdit = useCallback(() => {
    if (editName.trim()) {
      onRename(editName.trim());
    }
    setIsEditing(false);
  }, [editName, onRename]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditName(canvas.name);
    }
  }, [handleSaveEdit, canvas.name]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
  }, [onDelete]);

  return (
    <div className="w-full px-6 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {isEditing ? (
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleSaveEdit}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            className="h-7 text-sm"
            autoFocus
          />
        ) : (
          <span className="text-sm font-medium truncate">{canvas.name}</span>
        )}
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={onExpand}
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleStartEdit}>
              <Pencil className="h-4 w-4 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
