'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  ChevronDown,
  ChevronUp,
  Lightbulb,
  ListTodo,
  Sparkles,
  Trash2,
  Plus,
  CheckCircle,
} from 'lucide-react';
import { FeaturePreviewCard } from './feature-preview-card';
import { TaskPreviewCard } from './task-preview-card';
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
  onCreateFeature: (feature: GeneratedFeature) => void;
  onCreateTask: (task: GeneratedTask) => void;
  onCreateAllFeatures: () => void;
  onCreateAllTasks: () => void;
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
  onCreateFeature,
  onCreateTask,
  onCreateAllFeatures,
  onCreateAllTasks,
  className,
}: GeneratedItemsSectionProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'features' | 'tasks'>(
    features.length > 0 ? 'features' : 'tasks'
  );

  const selectedFeaturesCount = features.filter(f => f.isSelected).length;
  const selectedTasksCount = tasks.filter(t => t.isSelected).length;
  const totalCount = features.length + tasks.length;

  // No items to show
  if (totalCount === 0) {
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

  // Remove feature
  const removeFeature = (id: string) => {
    onFeaturesChange(features.filter(f => f.id !== id));
  };

  // Remove task
  const removeTask = (id: string) => {
    onTasksChange(tasks.filter(t => t.id !== id));
  };

  // Select all features
  const selectAllFeatures = () => {
    onFeaturesChange(features.map(f => ({ ...f, isSelected: true })));
  };

  // Select all tasks
  const selectAllTasks = () => {
    onTasksChange(tasks.map(t => ({ ...t, isSelected: true })));
  };

  // Clear all features
  const clearAllFeatures = () => {
    onFeaturesChange([]);
  };

  // Clear all tasks
  const clearAllTasks = () => {
    onTasksChange([]);
  };

  return (
    <div className={cn('border-t bg-muted/30', className)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        {/* Header */}
        <CollapsibleTrigger asChild>
          <button className="flex items-center justify-between w-full px-4 py-3 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="font-medium">AI Generated Items</span>
              <Badge variant="secondary" className="text-xs">
                {totalCount} items
              </Badge>
            </div>
            {isOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'features' | 'tasks')}>
              <div className="flex items-center justify-between mb-3">
                <TabsList>
                  <TabsTrigger value="features" className="gap-2">
                    <Lightbulb className="h-4 w-4" />
                    Features
                    {features.length > 0 && (
                      <Badge variant="secondary" className="ml-1 text-xs">
                        {features.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="tasks" className="gap-2">
                    <ListTodo className="h-4 w-4" />
                    Tasks
                    {tasks.length > 0 && (
                      <Badge variant="secondary" className="ml-1 text-xs">
                        {tasks.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                {/* Actions for current tab */}
                <div className="flex items-center gap-2">
                  {activeTab === 'features' && features.length > 0 && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={selectAllFeatures}
                        className="text-xs"
                      >
                        Select All
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearAllFeatures}
                        className="text-xs text-muted-foreground"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Clear
                      </Button>
                      <Button
                        size="sm"
                        onClick={onCreateAllFeatures}
                        disabled={selectedFeaturesCount === 0}
                        className="gap-1"
                      >
                        <Plus className="h-4 w-4" />
                        Create {selectedFeaturesCount > 0 ? `(${selectedFeaturesCount})` : 'Selected'}
                      </Button>
                    </>
                  )}
                  {activeTab === 'tasks' && tasks.length > 0 && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={selectAllTasks}
                        className="text-xs"
                      >
                        Select All
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearAllTasks}
                        className="text-xs text-muted-foreground"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Clear
                      </Button>
                      <Button
                        size="sm"
                        onClick={onCreateAllTasks}
                        disabled={selectedTasksCount === 0}
                        className="gap-1"
                      >
                        <Plus className="h-4 w-4" />
                        Create {selectedTasksCount > 0 ? `(${selectedTasksCount})` : 'Selected'}
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Features Tab */}
              <TabsContent value="features" className="mt-0">
                {features.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No features generated yet.</p>
                    <p className="text-xs mt-1">
                      Use the "/" command and select "Generate Features" from your PRD content.
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="max-h-[400px]">
                    <div className="space-y-2 pr-4">
                      {features.map((feature) => (
                        <FeaturePreviewCard
                          key={feature.id}
                          feature={feature}
                          isSelected={feature.isSelected}
                          onToggleSelect={() => toggleFeatureSelection(feature.id)}
                          onRemove={() => removeFeature(feature.id)}
                          onCreate={() => onCreateFeature(feature)}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>

              {/* Tasks Tab */}
              <TabsContent value="tasks" className="mt-0">
                {tasks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ListTodo className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No tasks generated yet.</p>
                    <p className="text-xs mt-1">
                      Use the "/" command and select "Generate Tasks" from your features.
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="max-h-[400px]">
                    <div className="space-y-2 pr-4">
                      {tasks.map((task) => (
                        <TaskPreviewCard
                          key={task.id}
                          task={task}
                          isSelected={task.isSelected}
                          onToggleSelect={() => toggleTaskSelection(task.id)}
                          onRemove={() => removeTask(task.id)}
                          onCreate={() => onCreateTask(task)}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

export default GeneratedItemsSection;
