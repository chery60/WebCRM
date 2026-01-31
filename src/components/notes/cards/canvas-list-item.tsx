'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
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
import { 
  registerCanvasNameSync, 
  unregisterCanvasNameSync, 
  notifyCanvasNameChange,
  type CanvasNameChangeCallback 
} from '../extensions/excalidraw-extension';

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
  // Track displayed name separately to allow updates from registry
  const [displayName, setDisplayName] = useState(canvas.name);

  // Update local state when canvas name changes externally (from parent state)
  useEffect(() => {
    setEditName(canvas.name);
    setDisplayName(canvas.name);
  }, [canvas.name]);

  // Store callback reference for proper cleanup
  const nameChangeCallbackRef = useRef<CanvasNameChangeCallback | null>(null);
  // Store onRename in a ref to avoid dependency issues
  const onRenameRef = useRef(onRename);
  useEffect(() => {
    onRenameRef.current = onRename;
  }, [onRename]);

  // Subscribe to name changes from other views (inline canvas, dialog)
  useEffect(() => {
    if (!canvas.id) return;

    // Create and store callback reference
    const handleNameChange: CanvasNameChangeCallback = (newName: string) => {
      setEditName(newName);
      setDisplayName(newName);
      // Also trigger the parent to update - this ensures the parent state is synced
      // even if the content update hasn't propagated yet
      onRenameRef.current(newName);
    };

    // Store the callback reference for cleanup
    nameChangeCallbackRef.current = handleNameChange;

    // Register the callback
    registerCanvasNameSync(canvas.id, handleNameChange);

    return () => {
      // Unregister this specific callback, not all callbacks for the canvasId
      if (nameChangeCallbackRef.current) {
        unregisterCanvasNameSync(canvas.id, nameChangeCallbackRef.current);
        nameChangeCallbackRef.current = null;
      }
    };
  }, [canvas.id]); // Removed onRename from deps - using ref instead

  const handleStartEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setEditName(displayName);
    setIsEditing(true);
  }, [displayName]);

  const handleSaveEdit = useCallback(() => {
    if (editName.trim()) {
      onRename(editName.trim());
      setDisplayName(editName.trim());
      // Notify other views (inline canvas, dialog) of the name change
      if (canvas.id) {
        notifyCanvasNameChange(canvas.id, editName.trim());
      }
    }
    setIsEditing(false);
  }, [editName, onRename, canvas.id]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditName(displayName);
    }
  }, [handleSaveEdit, displayName]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
  }, [onDelete]);

  return (
    <div
      className="w-full px-6 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors cursor-pointer"
      onClick={onExpand}
    >
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
          <span className="text-sm font-medium truncate">{displayName}</span>
        )}
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onExpand();
          }}
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
