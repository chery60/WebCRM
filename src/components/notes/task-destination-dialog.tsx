'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  FolderKanban,
  Loader2,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTaskTabsManager } from '@/lib/hooks/use-task-tabs';
import type { GeneratedTask, TaskTab } from '@/types';

// ============================================================================
// TYPES
// ============================================================================

interface TaskDestinationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tasks: GeneratedTask[];
  mode: 'single' | 'bulk';
  onConfirm: (projectId: string | null, projectName?: string) => Promise<void>;
  isCreating?: boolean;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function TaskDestinationDialog({
  open,
  onOpenChange,
  tasks,
  mode,
  onConfirm,
  isCreating = false,
}: TaskDestinationDialogProps) {
  const { tabs, isLoading: tabsLoading } = useTaskTabsManager();
  const [selectedOption, setSelectedOption] = useState<'all' | 'existing' | 'new'>('all');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [newProjectName, setNewProjectName] = useState('');
  const [error, setError] = useState('');

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedOption('all');
      setSelectedProjectId('');
      setNewProjectName('');
      setError('');
    }
  }, [open]);

  const taskCount = mode === 'single' ? 1 : tasks.length;
  const taskLabel = taskCount === 1 ? 'task' : 'tasks';

  const handleConfirm = async () => {
    setError('');

    if (selectedOption === 'existing' && !selectedProjectId) {
      setError('Please select a project');
      return;
    }

    if (selectedOption === 'new' && !newProjectName.trim()) {
      setError('Please enter a project name');
      return;
    }

    // Check for duplicate project name
    if (selectedOption === 'new') {
      const exists = tabs.some(
        (tab) => tab.name.toLowerCase() === newProjectName.trim().toLowerCase()
      );
      if (exists) {
        setError('A project with this name already exists');
        return;
      }
    }

    try {
      if (selectedOption === 'all') {
        await onConfirm(null);
      } else if (selectedOption === 'existing') {
        await onConfirm(selectedProjectId);
      } else {
        await onConfirm(null, newProjectName.trim());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tasks');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5 text-primary" />
            Choose Destination
          </DialogTitle>
          <DialogDescription>
            Select where to create {taskCount} {taskLabel}. You can add them to
            an existing project or create a new one.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <RadioGroup
            value={selectedOption}
            onValueChange={(value) => {
              setSelectedOption(value as 'all' | 'existing' | 'new');
              setError('');
            }}
            className="space-y-3"
          >
            {/* All Tasks Option */}
            <div
              className={cn(
                'flex items-start space-x-3 p-3 rounded-lg border transition-colors cursor-pointer',
                selectedOption === 'all'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-muted-foreground/30'
              )}
              onClick={() => setSelectedOption('all')}
            >
              <RadioGroupItem value="all" id="all" className="mt-0.5" />
              <div className="flex-1">
                <Label
                  htmlFor="all"
                  className="font-medium cursor-pointer flex items-center gap-2"
                >
                  <Layers className="h-4 w-4 text-muted-foreground" />
                  All Tasks
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Add to the default task list without a specific project
                </p>
              </div>
            </div>

            {/* Existing Project Option */}
            <div
              className={cn(
                'flex items-start space-x-3 p-3 rounded-lg border transition-colors cursor-pointer',
                selectedOption === 'existing'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-muted-foreground/30'
              )}
              onClick={() => setSelectedOption('existing')}
            >
              <RadioGroupItem value="existing" id="existing" className="mt-0.5" />
              <div className="flex-1">
                <Label
                  htmlFor="existing"
                  className="font-medium cursor-pointer flex items-center gap-2"
                >
                  <FolderKanban className="h-4 w-4 text-muted-foreground" />
                  Existing Project
                  {tabs.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {tabs.length}
                    </Badge>
                  )}
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Add to an existing project tab
                </p>

                {/* Project Selection */}
                {selectedOption === 'existing' && (
                  <div className="mt-3">
                    {tabs.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">
                        No projects yet. Create one below.
                      </p>
                    ) : (
                      <ScrollArea className="h-[140px] rounded-md border">
                        <div className="p-2 space-y-1">
                          {tabs.map((tab) => (
                            <button
                              key={tab.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedProjectId(tab.id);
                              }}
                              className={cn(
                                'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors text-left',
                                selectedProjectId === tab.id
                                  ? 'bg-primary text-primary-foreground'
                                  : 'hover:bg-muted'
                              )}
                            >
                              <div
                                className="w-3 h-3 rounded-full shrink-0"
                                style={{ backgroundColor: tab.color || '#6366f1' }}
                              />
                              <span className="flex-1 truncate">{tab.name}</span>
                              {selectedProjectId === tab.id && (
                                <CheckCircle2 className="h-4 w-4 shrink-0" />
                              )}
                            </button>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* New Project Option */}
            <div
              className={cn(
                'flex items-start space-x-3 p-3 rounded-lg border transition-colors cursor-pointer',
                selectedOption === 'new'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-muted-foreground/30'
              )}
              onClick={() => setSelectedOption('new')}
            >
              <RadioGroupItem value="new" id="new" className="mt-0.5" />
              <div className="flex-1">
                <Label
                  htmlFor="new"
                  className="font-medium cursor-pointer flex items-center gap-2"
                >
                  <Plus className="h-4 w-4 text-muted-foreground" />
                  Create New Project
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Create a new project tab for these tasks
                </p>

                {/* New Project Input */}
                {selectedOption === 'new' && (
                  <div className="mt-3">
                    <Input
                      placeholder="Enter project name..."
                      value={newProjectName}
                      onChange={(e) => {
                        setNewProjectName(e.target.value);
                        setError('');
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="h-9"
                      autoFocus
                    />
                  </div>
                )}
              </div>
            </div>
          </RadioGroup>

          {/* Error Message */}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isCreating}>
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                Create {taskCount} {taskLabel}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default TaskDestinationDialog;
