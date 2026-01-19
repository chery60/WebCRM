'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useProjects } from '@/lib/hooks/use-projects';
import { useMoveNoteToProject } from '@/lib/hooks/use-notes';
import { FolderOpen, StickyNote, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Project } from '@/types';

interface MoveToProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  noteId: string;
  noteTitle: string;
  currentProjectId?: string;
}

export function MoveToProjectDialog({
  open,
  onOpenChange,
  noteId,
  noteTitle,
  currentProjectId,
}: MoveToProjectDialogProps) {
  const { data: projects = [] } = useProjects();
  const moveNote = useMoveNoteToProject();
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(currentProjectId);

  const handleMove = async () => {
    if (selectedProjectId === currentProjectId) {
      onOpenChange(false);
      return;
    }

    moveNote.mutate(
      { noteId, projectId: selectedProjectId },
      {
        onSuccess: () => {
          const targetName = selectedProjectId
            ? projects.find((p) => p.id === selectedProjectId)?.name || 'project'
            : 'All Notes';
          toast.success(`Note moved to ${targetName}`);
          onOpenChange(false);
        },
        onError: () => {
          toast.error('Failed to move note');
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Move to Project</DialogTitle>
          <DialogDescription>
            Select a project to move &quot;{noteTitle}&quot; to.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[300px] pr-4 -mr-4">
          <div className="space-y-1 py-2">
            {/* All Notes option (no project) */}
            <button
              onClick={() => setSelectedProjectId(undefined)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left',
                selectedProjectId === undefined
                  ? 'bg-primary/10 text-primary'
                  : 'hover:bg-muted'
              )}
            >
              <StickyNote className="h-4 w-4 shrink-0" />
              <span className="flex-1">All Notes</span>
              {selectedProjectId === undefined && (
                <Check className="h-4 w-4 shrink-0" />
              )}
              {currentProjectId === undefined && selectedProjectId === undefined && (
                <span className="text-xs text-muted-foreground">(current)</span>
              )}
            </button>

            {/* Project list */}
            {projects.map((project: Project) => (
              <button
                key={project.id}
                onClick={() => setSelectedProjectId(project.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left',
                  selectedProjectId === project.id
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-muted'
                )}
              >
                <FolderOpen className="h-4 w-4 shrink-0" />
                <span className="flex-1 truncate">{project.name}</span>
                {selectedProjectId === project.id && (
                  <Check className="h-4 w-4 shrink-0" />
                )}
                {currentProjectId === project.id && (
                  <span className="text-xs text-muted-foreground">(current)</span>
                )}
              </button>
            ))}

            {projects.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No projects yet. Create a project from the sidebar.
              </p>
            )}
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleMove}
            disabled={moveNote.isPending || selectedProjectId === currentProjectId}
          >
            {moveNote.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Moving...
              </>
            ) : (
              'Move'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
