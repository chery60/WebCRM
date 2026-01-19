'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCreateNote } from '@/lib/hooks/use-notes';
import { useTags } from '@/lib/hooks/use-tags';
import { useProject, useProjects } from '@/lib/hooks/use-projects';
import { NoteEditor } from '@/components/notes/note-editor';
import { TagBadge, getTagColor } from '@/components/shared/tag-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Eye, MoreVertical, Plus, FolderOpen } from 'lucide-react';
import Link from 'next/link';
import { useState, useCallback, useEffect, Suspense } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';

function NewNoteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialProjectId = searchParams?.get('project') || undefined;
  
  const { data: allTags = [] } = useTags();
  const { data: projects = [] } = useProjects();
  const createNote = useCreateNote();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(initialProjectId);
  const [showTagPopover, setShowTagPopover] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const selectedProject = projects.find(p => p.id === selectedProjectId);

  const handleAddTag = useCallback((tagName: string) => {
    if (!tags.includes(tagName)) {
      setTags([...tags, tagName]);
    }
    setShowTagPopover(false);
  }, [tags]);

  const handleRemoveTag = useCallback((tagName: string) => {
    setTags(tags.filter((t) => t !== tagName));
  }, [tags]);

  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      toast.error('Please add a title');
      return;
    }

    setIsSaving(true);
    try {
      const newNote = await createNote.mutateAsync({
        data: {
          title: title.trim(),
          content,
          tags,
          projectId: selectedProjectId,
        },
        authorId: 'user-1', // Default user
        authorName: 'Brian F.',
        authorAvatar: '/avatars/brian.jpg',
      });

      toast.success('Note created');
      router.push(`/notes/${newNote.id}`);
    } catch (error) {
      toast.error('Failed to create note');
    } finally {
      setIsSaving(false);
    }
  }, [title, content, tags, selectedProjectId, createNote, router]);

  // Auto-save when leaving the page with content
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (title.trim() || content) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [title, content]);

  const backUrl = selectedProjectId ? `/notes?project=${selectedProjectId}` : '/notes';

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href={backUrl}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Notes
            </Link>
          </Button>
          {/* Project Selector */}
          <Select
            value={selectedProjectId || 'none'}
            onValueChange={(val) => setSelectedProjectId(val === 'none' ? undefined : val)}
          >
            <SelectTrigger className="w-[180px] h-8">
              <FolderOpen className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Select project" />
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
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Note'}
        </Button>
      </div>

      {/* Title and meta */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Add Title Here"
            className="text-2xl font-semibold border-0 p-0 h-auto focus-visible:ring-0 bg-transparent"
            autoFocus
          />
          <p className="text-sm text-muted-foreground mt-1">
            {format(new Date(), 'MMM d, yyyy HH:mm')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Tags */}
          <div className="flex items-center gap-1.5">
            {tags.map((tag) => (
              <TagBadge
                key={tag}
                name={tag}
                color={getTagColor(tag)}
                removable
                onRemove={() => handleRemoveTag(tag)}
              />
            ))}
            <Popover open={showTagPopover} onOpenChange={setShowTagPopover}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-6 px-2">
                  <Plus className="h-3 w-3" />
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
          </div>

          {/* View button */}
          <Button variant="outline" size="icon" className="h-8 w-8">
            <Eye className="h-4 w-4" />
          </Button>

          {/* More options */}
          <Button variant="outline" size="icon" className="h-8 w-8">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Editor */}
      <NoteEditor
        content={content}
        onChange={setContent}
        placeholder="Start typing, or press '/' for commands..."
        autoFocus={false}
      />
    </div>
  );
}

export default function NewNotePage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <NewNoteContent />
    </Suspense>
  );
}

