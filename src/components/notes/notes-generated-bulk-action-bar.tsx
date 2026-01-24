'use client';

import { X, Trash2, ListTodo, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { motion, AnimatePresence } from 'framer-motion';

interface NotesGeneratedBulkActionBarProps {
  selectedTasksCount: number;
  selectedFeaturesCount: number;
  onClearSelection: () => void;
  onOpenTaskDialog: () => void;
  onOpenFeatureDialog: () => void;
  onDelete: () => void;
}

export function NotesGeneratedBulkActionBar({
  selectedTasksCount,
  selectedFeaturesCount,
  onClearSelection,
  onOpenTaskDialog,
  onOpenFeatureDialog,
  onDelete,
}: NotesGeneratedBulkActionBarProps) {
  const totalSelected = selectedTasksCount + selectedFeaturesCount;

  if (totalSelected === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 p-2 bg-background border shadow-xl rounded-full"
      >
        <div className="flex items-center gap-2 pl-4 pr-2">
          <span className="text-sm font-medium whitespace-nowrap">
            {totalSelected} selected
          </span>
          {selectedTasksCount > 0 && selectedFeaturesCount > 0 && (
            <span className="text-xs text-muted-foreground">
              ({selectedTasksCount} tasks, {selectedFeaturesCount} features)
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:bg-muted rounded-full"
            onClick={onClearSelection}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-6" />

        <div className="flex items-center gap-1">
          {/* Add to Tasks - always show, works for both tasks and features */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-2 rounded-full"
            onClick={onOpenTaskDialog}
          >
            <ListTodo className="h-4 w-4" />
            <span className="hidden sm:inline">Add to Tasks</span>
          </Button>

          {/* Add to Pipeline - always show, works for both tasks and features */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-2 rounded-full"
            onClick={onOpenFeatureDialog}
          >
            <Lightbulb className="h-4 w-4" />
            <span className="hidden sm:inline">Add to Pipeline</span>
          </Button>

          <Separator orientation="vertical" className="h-6 mx-1" />

          {/* Delete */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">Delete</span>
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
