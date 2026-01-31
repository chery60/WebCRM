'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ChevronDown,
  ChevronUp,
  Lightbulb,
  ListTodo,
  Sparkles,
  Trash2,
  Plus,
  Wand2,
} from 'lucide-react';
import { FeaturePreviewCard } from './feature-preview-card';
import { TaskPreviewCard } from './task-preview-card';
import { NotesGeneratedBulkActionBar } from './notes-generated-bulk-action-bar';
import { DeleteConfirmationDialog } from './delete-confirmation-dialog';
import type { GeneratedFeature, GeneratedTask } from '@/types';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface GeneratedItemsSectionProps {
  features: GeneratedFeature[];
  tasks: GeneratedTask[];
  onFeaturesChange: (features: GeneratedFeature[]) => void;
  onTasksChange: (tasks: GeneratedTask[]) => void;
  // Props for Add dropdown actions
  onOpenCreateTaskDrawer: () => void;
  onOpenCreateFeatureDrawer: () => void;
  onOpenAITaskGeneration: () => void;
  onOpenAIFeatureGeneration: () => void;
  // Bulk action props - open modal dialogs
  onOpenBulkTaskDialog: () => void;
  onOpenBulkFeatureDialog: () => void;
  /** Always show the section, even when empty (shows empty state with Add button) */
  alwaysShow?: boolean;
  className?: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function GeneratedItemsSection({
  features,
  tasks,
  onFeaturesChange,
  onTasksChange,
  onOpenCreateTaskDrawer,
  onOpenCreateFeatureDrawer,
  onOpenAITaskGeneration,
  onOpenAIFeatureGeneration,
  onOpenBulkTaskDialog,
  onOpenBulkFeatureDialog,
  alwaysShow = false,
  className,
}: GeneratedItemsSectionProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'features' | 'tasks'>(
    features.length > 0 ? 'features' : 'tasks'
  );

  // Delete confirmation dialog states
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteDialogType, setDeleteDialogType] = useState<'single-feature' | 'single-task' | 'clear-features' | 'clear-tasks' | 'bulk'>('bulk');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const selectedFeaturesCount = features.filter(f => f.isSelected).length;
  const selectedTasksCount = tasks.filter(t => t.isSelected).length;
  const totalCount = features.length + tasks.length;

  // Clear all selections
  const clearAllSelections = () => {
    onFeaturesChange(features.map(f => ({ ...f, isSelected: false })));
    onTasksChange(tasks.map(t => ({ ...t, isSelected: false })));
  };

  // No items to show - hide unless alwaysShow is true
  if (totalCount === 0 && !alwaysShow) {
    return null;
  }

  // Toggle feature selection
  const toggleFeatureSelection = (id: string) => {
    onFeaturesChange(
      features.map(f => f.id === id ? { ...f, isSelected: !f.isSelected } : f)
    );
  };

  // Toggle task selection
  const toggleTaskSelection = (id: string) => {
    onTasksChange(
      tasks.map(t => t.id === id ? { ...t, isSelected: !t.isSelected } : t)
    );
  };

  // Request delete feature (opens confirmation dialog)
  const requestDeleteFeature = (id: string) => {
    setPendingDeleteId(id);
    setDeleteDialogType('single-feature');
    setShowDeleteDialog(true);
  };

  // Request delete task (opens confirmation dialog)
  const requestDeleteTask = (id: string) => {
    setPendingDeleteId(id);
    setDeleteDialogType('single-task');
    setShowDeleteDialog(true);
  };

  // Select all features
  const selectAllFeatures = () => {
    onFeaturesChange(features.map(f => ({ ...f, isSelected: true })));
  };

  // Select all tasks
  const selectAllTasks = () => {
    onTasksChange(tasks.map(t => ({ ...t, isSelected: true })));
  };

  // Request clear all features (opens confirmation dialog)
  const requestClearAllFeatures = () => {
    setDeleteDialogType('clear-features');
    setShowDeleteDialog(true);
  };

  // Request clear all tasks (opens confirmation dialog)
  const requestClearAllTasks = () => {
    setDeleteDialogType('clear-tasks');
    setShowDeleteDialog(true);
  };

  // Request bulk delete (opens confirmation dialog)
  const requestBulkDelete = () => {
    setDeleteDialogType('bulk');
    setShowDeleteDialog(true);
  };

  // Handle confirmed delete
  const handleConfirmDelete = () => {
    switch (deleteDialogType) {
      case 'single-feature':
        if (pendingDeleteId) {
          onFeaturesChange(features.filter(f => f.id !== pendingDeleteId));
        }
        break;
      case 'single-task':
        if (pendingDeleteId) {
          onTasksChange(tasks.filter(t => t.id !== pendingDeleteId));
        }
        break;
      case 'clear-features':
        onFeaturesChange([]);
        break;
      case 'clear-tasks':
        onTasksChange([]);
        break;
      case 'bulk':
        onFeaturesChange(features.filter(f => !f.isSelected));
        onTasksChange(tasks.filter(t => !t.isSelected));
        break;
    }
    setShowDeleteDialog(false);
    setPendingDeleteId(null);
  };

  // Get delete dialog content
  const getDeleteDialogContent = () => {
    switch (deleteDialogType) {
      case 'single-feature':
        const feature = features.find(f => f.id === pendingDeleteId);
        return {
          title: 'Delete Feature',
          description: `Are you sure you want to delete "${feature?.title || 'this feature'}"? This action cannot be undone.`,
        };
      case 'single-task':
        const task = tasks.find(t => t.id === pendingDeleteId);
        return {
          title: 'Delete Task',
          description: `Are you sure you want to delete "${task?.title || 'this task'}"? This action cannot be undone.`,
        };
      case 'clear-features':
        return {
          title: 'Clear All Features',
          description: `Are you sure you want to delete all ${features.length} features? This action cannot be undone.`,
        };
      case 'clear-tasks':
        return {
          title: 'Clear All Tasks',
          description: `Are you sure you want to delete all ${tasks.length} tasks? This action cannot be undone.`,
        };
      case 'bulk':
        const totalSelected = selectedFeaturesCount + selectedTasksCount;
        return {
          title: 'Delete Selected Items',
          description: `Are you sure you want to delete ${totalSelected} selected item${totalSelected > 1 ? 's' : ''}? This action cannot be undone.`,
        };
      default:
        return { title: 'Delete', description: 'Are you sure?' };
    }
  };

  // Empty state when alwaysShow is true but no items
  if (totalCount === 0 && alwaysShow) {
    return (
      <div className={cn('rounded-2xl border bg-white shadow-sm', className)}>
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-note-text-muted" />
            <h2 className="text-sm font-medium">Tasks & Features</h2>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <Plus className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={onOpenCreateTaskDrawer}>
                <ListTodo className="h-4 w-4 mr-2" />
                Create a Task
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onOpenCreateFeatureDrawer}>
                <Lightbulb className="h-4 w-4 mr-2" />
                Create a Feature
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onOpenAITaskGeneration}>
                <Wand2 className="h-4 w-4 mr-2" />
                Create Task using AI
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onOpenAIFeatureGeneration}>
                <Wand2 className="h-4 w-4 mr-2" />
                Create Feature using AI
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Separator className="opacity-15" />
        <div className="py-2">
          <div className="px-6 py-12 text-center border-2 border-dashed mx-6 mb-6 rounded-xl bg-slate-50/50">
            <Sparkles className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-20" />
            <p className="text-sm font-medium text-muted-foreground">No tasks or features yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Start by generating items using AI or add them manually</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('rounded-2xl border bg-white shadow-sm', className)}>
      <div className="flex items-center justify-between px-6 pt-6 pb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-note-text-muted" />
          <h2 className="text-sm font-medium">Tasks & Features</h2>
          <Badge variant="secondary" className="text-xs ml-1">
            {totalCount}
          </Badge>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <Plus className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onClick={onOpenCreateTaskDrawer}>
              <ListTodo className="h-4 w-4 mr-2" />
              Create a Task
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenCreateFeatureDrawer}>
              <Lightbulb className="h-4 w-4 mr-2" />
              Create a Feature
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenAITaskGeneration}>
              <Wand2 className="h-4 w-4 mr-2" />
              Create Task using AI
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenAIFeatureGeneration}>
              <Wand2 className="h-4 w-4 mr-2" />
              Create Feature using AI
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <Separator className="opacity-15" />

      <div className="px-4 pb-4 pt-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'features' | 'tasks')}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto">
              <TabsList className="grid grid-cols-2 w-full sm:w-auto">
                <TabsTrigger value="features" className="gap-2 text-xs sm:text-sm">
                  <Lightbulb className="h-3.5 w-3.5" />
                  Features
                  {features.length > 0 && (
                    <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 h-4 min-w-[18px] flex items-center justify-center">
                      {features.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="tasks" className="gap-2 text-xs sm:text-sm">
                  <ListTodo className="h-3.5 w-3.5" />
                  Tasks
                  {tasks.length > 0 && (
                    <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 h-4 min-w-[18px] flex items-center justify-center">
                      {tasks.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Actions for current tab */}
            <div className="flex items-center justify-end gap-1 sm:gap-2 w-full sm:w-auto">
              {activeTab === 'features' && features.length > 0 && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={selectAllFeatures}
                    className="text-xs h-8 px-2 sm:px-3"
                  >
                    Select All
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={requestClearAllFeatures}
                    className="text-xs h-8 px-2 sm:px-3 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                    Clear
                  </Button>
                </>
              )}
              {activeTab === 'tasks' && tasks.length > 0 && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={selectAllTasks}
                    className="text-xs h-8 px-2 sm:px-3"
                  >
                    Select All
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={requestClearAllTasks}
                    className="text-xs h-8 px-2 sm:px-3 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                    Clear
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Features Tab */}
          <TabsContent value="features" className="mt-0 outline-none">
            {features.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed rounded-xl bg-slate-50/50 text-note-text-muted">
                <Lightbulb className="h-8 w-8 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">No features generated yet</p>
                <p className="text-xs mt-1 opacity-60 max-w-[240px] mx-auto">
                  Use the "/" command and select "Generate Features" from your PRD content.
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[450px] -mr-4 pr-4">
                <div className="space-y-3 pb-4">
                  {features.map((feature) => (
                    <FeaturePreviewCard
                      key={feature.id}
                      feature={feature}
                      isSelected={feature.isSelected}
                      onToggleSelect={() => toggleFeatureSelection(feature.id)}
                      onDelete={() => requestDeleteFeature(feature.id)}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="mt-0 outline-none">
            {tasks.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed rounded-xl bg-slate-50/50 text-note-text-muted">
                <ListTodo className="h-8 w-8 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">No tasks generated yet</p>
                <p className="text-xs mt-1 opacity-60 max-w-[240px] mx-auto">
                  Use the "/" command and select "Generate Tasks" from your features.
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[450px] -mr-4 pr-4">
                <div className="space-y-3 pb-4">
                  {tasks.map((task) => (
                    <TaskPreviewCard
                      key={task.id}
                      task={task}
                      isSelected={task.isSelected}
                      onToggleSelect={() => toggleTaskSelection(task.id)}
                      onDelete={() => requestDeleteTask(task.id)}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Bulk Action Bar */}
      <NotesGeneratedBulkActionBar
        selectedTasksCount={selectedTasksCount}
        selectedFeaturesCount={selectedFeaturesCount}
        onClearSelection={clearAllSelections}
        onOpenTaskDialog={onOpenBulkTaskDialog}
        onOpenFeatureDialog={onOpenBulkFeatureDialog}
        onDelete={requestBulkDelete}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title={getDeleteDialogContent().title}
        description={getDeleteDialogContent().description}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

export default GeneratedItemsSection;
