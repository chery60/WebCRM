'use client';

import { X, Trash2, FolderInput, Copy, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { motion, AnimatePresence } from 'framer-motion';
import { useProjects } from '@/lib/hooks/use-projects';
import { useTags } from '@/lib/hooks/use-tags';

interface NoteBulkActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onMoveToProject: (projectId: string | undefined) => void;
  onDuplicate: () => void;
  onAddTags: (tags: string[]) => void;
  onDelete: () => void;
  currentTags?: string[];
}

export function NoteBulkActionBar({
  selectedCount,
  onClearSelection,
  onMoveToProject,
  onDuplicate,
  onAddTags,
  onDelete,
  currentTags = [],
}: NoteBulkActionBarProps) {
  const { data: projects = [] } = useProjects();
  const { data: tags = [] } = useTags();

  if (selectedCount === 0) return null;

  const handleTagToggle = (tagName: string) => {
    const newTags = currentTags.includes(tagName)
      ? currentTags.filter((t) => t !== tagName)
      : [...currentTags, tagName];
    onAddTags(newTags);
  };

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
            {selectedCount} selected
          </span>
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
          {/* Move to Project */}
          <Select onValueChange={(val) => onMoveToProject(val === 'none' ? undefined : val)}>
            <SelectTrigger className="h-8 border-none bg-transparent hover:bg-accent hover:text-accent-foreground w-[140px] rounded-full focus:ring-0">
              <FolderInput className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Move to..." />
            </SelectTrigger>
            <SelectContent align="center">
              <SelectItem value="none">All Notes</SelectItem>
              <Separator className="my-1" />
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Add Tags */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-2 rounded-full"
              >
                <Tag className="h-4 w-4" />
                <span className="hidden sm:inline">Tags</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-48">
              <DropdownMenuLabel>Add Tags</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {tags.map((tag) => (
                <DropdownMenuCheckboxItem
                  key={tag.id}
                  checked={currentTags.includes(tag.name)}
                  onCheckedChange={() => handleTagToggle(tag.name)}
                >
                  {tag.name}
                </DropdownMenuCheckboxItem>
              ))}
              {tags.length === 0 && (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  No tags available
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Duplicate */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-2 rounded-full"
            onClick={onDuplicate}
          >
            <Copy className="h-4 w-4" />
            <span className="hidden sm:inline">Duplicate</span>
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
