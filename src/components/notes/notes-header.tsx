'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CreateProjectDialog } from '@/components/projects/create-project-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNotesStore, useUIStore } from '@/lib/stores/ui-store';
import { useTags } from '@/lib/hooks/use-tags';
import { useCreateNote } from '@/lib/hooks/use-notes';
import { useCreateProject } from '@/lib/hooks/use-projects';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { ArrowUpDown, Filter, Plus, Check, FolderOpen, FolderPlus, FileText, LayoutGrid, List, Table as TableIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type NotesViewType = 'grid' | 'list' | 'table';

interface NotesHeaderProps {
  projectId?: string;
  projectName?: string;
  isEmpty?: boolean;
}

export function NotesHeader({ projectId, projectName, isEmpty = false }: NotesHeaderProps) {
  const router = useRouter();
  const { filter, sort, setFilter, setSort, clearFilter } = useNotesStore();
  const { notesView, setNotesView } = useUIStore();
  const { data: tags = [] } = useTags();
  const { currentUser } = useAuthStore();
  const { currentWorkspace } = useWorkspaceStore();
  const createNote = useCreateNote();
  const createProject = useCreateProject();
  const [isCreating, setIsCreating] = useState(false);
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);

  // Create a new PRD immediately and redirect to it
  const handleCreatePRD = async () => {
    if (!currentUser) {
      toast.error('Please sign in to create notes');
      return;
    }

    if (!currentWorkspace) {
      toast.error('Please select a workspace first');
      return;
    }

    setIsCreating(true);
    try {
      const newNote = await createNote.mutateAsync({
        data: {
          title: 'Untitled PRD',
          content: JSON.stringify({
            type: 'doc',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Start writing your PRD here...' }]
              }
            ]
          }),
          tags: [],
          projectId: projectId,
          workspaceId: currentWorkspace.id,
        },
        authorId: currentUser.id,
        authorName: currentUser.name || currentUser.email,
        authorAvatar: currentUser.avatar,
      });

      if (newNote) {
        router.push(`/notes/${newNote.id}`);
        toast.success('PRD created successfully');
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to create PRD');
      setIsCreating(false);
    }
  };

  const sortOptions = [
    { label: 'Last Updated', field: 'updatedAt' as const, direction: 'desc' as const },
    { label: 'Oldest Updated', field: 'updatedAt' as const, direction: 'asc' as const },
    { label: 'Newest Created', field: 'createdAt' as const, direction: 'desc' as const },
    { label: 'Oldest Created', field: 'createdAt' as const, direction: 'asc' as const },
    { label: 'Title A-Z', field: 'title' as const, direction: 'asc' as const },
    { label: 'Title Z-A', field: 'title' as const, direction: 'desc' as const },
  ];

  const currentSort = sortOptions.find(
    (opt) => opt.field === sort.field && opt.direction === sort.direction
  );

  const handleTagToggle = (tagName: string) => {
    const currentTags = filter.tags || [];
    const newTags = currentTags.includes(tagName)
      ? currentTags.filter((t) => t !== tagName)
      : [...currentTags, tagName];
    setFilter({ tags: newTags });
  };

  const activeFilters = (filter.tags?.length || 0) + (filter.search ? 1 : 0);

  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        {projectName ? (
          <>
            <FolderOpen className="h-6 w-6 text-muted-foreground" />
            <h1 className="text-2xl font-semibold">{projectName}</h1>
          </>
        ) : (
          <h1 className="text-2xl font-semibold">PRDs</h1>
        )}

        {/* View Switcher */}
        <Tabs value={notesView} onValueChange={(value) => setNotesView(value as NotesViewType)}>
          <TabsList className="h-9">
            <TabsTrigger value="grid" className="gap-1.5 px-3">
              <LayoutGrid className="h-4 w-4" />
              Grid
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-1.5 px-3">
              <List className="h-4 w-4" />
              List
            </TabsTrigger>
            <TabsTrigger value="table" className="gap-1.5 px-3">
              <TableIcon className="h-4 w-4" />
              Table
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex items-center gap-2">
        {/* Sort dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowUpDown className="h-4 w-4" />
              Sort By
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Sort by</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {sortOptions.map((option) => (
              <DropdownMenuItem
                key={`${option.field}-${option.direction}`}
                onClick={() => setSort({ field: option.field, direction: option.direction })}
                className="justify-between"
              >
                {option.label}
                {currentSort?.field === option.field && currentSort?.direction === option.direction && (
                  <Check className="h-4 w-4" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Filter dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              Filter
              {activeFilters > 0 && (
                <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                  {activeFilters}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Filter by tag</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {tags.map((tag) => (
              <DropdownMenuCheckboxItem
                key={tag.id}
                checked={filter.tags?.includes(tag.name)}
                onCheckedChange={() => handleTagToggle(tag.name)}
              >
                {tag.name}
              </DropdownMenuCheckboxItem>
            ))}
            {activeFilters > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={clearFilter} className="text-destructive">
                  Clear all filters
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Add button with dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              className="gap-2"
              disabled={isCreating}
            >
              {isCreating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {isCreating ? 'Creating...' : 'Create'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onClick={handleCreatePRD}
              className="gap-2 cursor-pointer"
              disabled={isCreating}
            >
              <FileText className="h-4 w-4" />
              <span>New PRD</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setIsProjectDialogOpen(true)}
              className="gap-2 cursor-pointer"
            >
              <FolderPlus className="h-4 w-4" />
              <span>New Project</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Create Project Dialog */}
      <CreateProjectDialog
        open={isProjectDialogOpen}
        onOpenChange={setIsProjectDialogOpen}
      />
    </div>
  );
}

