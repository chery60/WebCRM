'use client';

import { useParams, useRouter } from 'next/navigation';
import { useNote, useUpdateNote, useDeleteNote } from '@/lib/hooks/use-notes';
import { useTags } from '@/lib/hooks/use-tags';
import { NoteEditor } from '@/components/notes/note-editor';
import { TagBadge, getTagColor } from '@/components/shared/tag-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, MoreVertical, Trash2, Plus, Tag, FolderInput, FolderOpen } from 'lucide-react';
import { MoveToProjectDialog } from '@/components/notes/move-to-project-dialog';
import { useProjects } from '@/lib/hooks/use-projects';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Link from 'next/link';
import { useState, useEffect, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useDebounce } from '@/lib/hooks/use-debounce';

export default function NoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const noteId = params.id as string;

  const { data: note, isLoading } = useNote(noteId);
  const { data: allTags = [] } = useTags();
  const { data: projects = [] } = useProjects();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [projectId, setProjectId] = useState<string | undefined>(undefined);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showTagPopover, setShowTagPopover] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState(false);

  // Track if we've initialized and last saved values to prevent save loops
  const isInitialized = useRef(false);
  const lastSaved = useRef({ title: '', content: '', tags: '', projectId: '' });

  // Initialize state when note loads
  useEffect(() => {
    if (note && !isInitialized.current) {
      setTitle(note.title);
      setContent(note.content);
      setTags(note.tags);
      setProjectId(note.projectId);
      // Store initial values as last saved
      lastSaved.current = {
        title: note.title,
        content: note.content,
        tags: JSON.stringify(note.tags),
        projectId: note.projectId || '',
      };
      isInitialized.current = true;
    }
  }, [note]);

  // Reset initialization when noteId changes
  useEffect(() => {
    isInitialized.current = false;
  }, [noteId]);

  // Debounce content changes for auto-save
  const debouncedContent = useDebounce(content, 1500);
  const debouncedTitle = useDebounce(title, 1500);
  const debouncedTags = useDebounce(tags, 500);
  const debouncedProjectId = useDebounce(projectId, 500);

  // Auto-save
  useEffect(() => {
    if (!isInitialized.current || isLoading) return;

    const currentTagsStr = JSON.stringify(debouncedTags);
    const currentProjectId = debouncedProjectId || '';
    const hasChanges =
      debouncedTitle !== lastSaved.current.title ||
      debouncedContent !== lastSaved.current.content ||
      currentTagsStr !== lastSaved.current.tags ||
      currentProjectId !== lastSaved.current.projectId;

    if (hasChanges) {
      // Update last saved values immediately to prevent duplicate saves
      lastSaved.current = {
        title: debouncedTitle,
        content: debouncedContent,
        tags: currentTagsStr,
        projectId: currentProjectId,
      };

      updateNote.mutate(
        { id: noteId, data: { title: debouncedTitle, content: debouncedContent, tags: debouncedTags, projectId: debouncedProjectId } },
        {
          onSuccess: () => {
            toast.success('Note saved', { duration: 1500 });
          },
        }
      );
    }
  }, [debouncedTitle, debouncedContent, debouncedTags, debouncedProjectId, noteId, isLoading, updateNote]);

  const handleDelete = useCallback(() => {
    deleteNote.mutate(noteId, {
      onSuccess: () => {
        toast.success('Note deleted');
        router.push('/notes');
      },
    });
  }, [deleteNote, noteId, router]);

  const handleAddTag = useCallback((tagName: string) => {
    if (!tags.includes(tagName)) {
      setTags([...tags, tagName]);
    }
    setShowTagPopover(false);
  }, [tags]);

  const handleRemoveTag = useCallback((tagName: string) => {
    setTags(tags.filter((t) => t !== tagName));
  }, [tags]);

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Skeleton className="h-6 w-6" />
          <Skeleton className="h-6 w-20" />
        </div>
        <Skeleton className="h-8 w-1/2 mb-2" />
        <Skeleton className="h-4 w-32 mb-6" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!note) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-semibold mb-2">Note not found</h2>
        <p className="text-muted-foreground mb-4">This note may have been deleted.</p>
        <Button asChild>
          <Link href="/notes">Back to Notes</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Section Header */}
      <div className="flex h-[69px] items-center justify-between px-8 border-b border-border bg-background flex-shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="h-8 w-8 -ml-2" asChild>
            <Link href="/notes">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-2xl font-medium">Notes</h1>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto w-full">
          {/* Title and Meta Block */}
          <div className="flex items-start justify-between px-8 py-6 border-b border-border gap-6">
            <div className="flex-1 flex flex-col gap-1">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Product Team Meeting"
                className="text-xl md:text-xl font-medium border-0 p-0 h-auto focus-visible:ring-0 bg-transparent placeholder:text-muted-foreground/50"
              />
              <p className="text-[14px] leading-[150%] text-muted-foreground">
                {format(new Date(note.createdAt), 'MMM d, yyyy HH:mm')}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Project Selector */}
              <Select
                value={projectId || 'none'}
                onValueChange={(val) => setProjectId(val === 'none' ? undefined : val)}
              >
                <SelectTrigger className="w-[160px] h-8">
                  <FolderOpen className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="No Project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Project</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Tags */}
              <div className="flex items-center gap-2">
                {tags.map((tag) => (
                  <TagBadge
                    key={tag}
                    name={tag}
                    color={getTagColor(tag)}
                  />
                ))}
              </div>

              {/* Add Tag Button */}
              <Popover open={showTagPopover} onOpenChange={setShowTagPopover}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon" className="h-8 w-8 rounded-full">
                    <Tag className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-2" align="end">
                  <div className="space-y-1">
                    {allTags
                      .filter((t) => !tags.includes(t.name))
                      .map((tag) => (
                        <button
                          key={tag.id}
                          onClick={() => handleAddTag(tag.name)}
                          className="w-full text-left px-2 py-1.5 rounded-md text-sm hover:bg-muted transition-colors"
                        >
                          <TagBadge name={tag.name} color={tag.color} />
                        </button>
                      ))}
                    {allTags.filter((t) => !tags.includes(t.name)).length === 0 && (
                      <p className="text-xs text-muted-foreground px-2 py-1">
                        All tags added
                      </p>
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              {/* More options */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setShowMoveDialog(true)}>
                    <FolderInput className="h-4 w-4 mr-2" />
                    Move to
                  </DropdownMenuItem>
                  <DropdownMenuItem>Duplicate</DropdownMenuItem>
                  <DropdownMenuItem>Export</DropdownMenuItem>
                  <DropdownMenuItem>Share</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Editor */}
          <div className="px-8 py-6">
            <NoteEditor
              content={content}
              onChange={setContent}
              placeholder="Start typing, or press '/' for commands..."
              className="min-h-[500px]"
            />
          </div>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this note? This action can be undone from the trash.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Move to project dialog */}
      <MoveToProjectDialog
        open={showMoveDialog}
        onOpenChange={setShowMoveDialog}
        noteId={noteId}
        noteTitle={title || note.title}
        currentProjectId={note.projectId}
      />
    </div>
  );
}
