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
import { useState, useCallback, useEffect, useRef, Suspense } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useAuthStore } from '@/lib/stores/auth-store';
import { PRDCanvas, type PRDCanvasRef, type CanvasGenerationType, type CanvasData } from '@/components/canvas/prd-canvas';
import { useCanvasGeneration } from '@/lib/hooks/use-canvas-generation';

// localStorage key for draft note data
const DRAFT_NOTE_STORAGE_KEY = 'venture_draft_note';

interface DraftNoteData {
  title: string;
  content: string;
  tags: string[];
  projectId?: string;
  canvasData?: CanvasData;
  lastSaved: number;
}

function NewNoteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialProjectId = searchParams?.get('project') || undefined;
  
  const { currentUser } = useAuthStore();
  const { data: allTags = [] } = useTags();
  const { data: projects = [] } = useProjects();
  const createNote = useCreateNote();

  // Load draft from localStorage on mount
  const loadDraft = useCallback((): DraftNoteData | null => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem(DRAFT_NOTE_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load draft from localStorage:', e);
    }
    return null;
  }, []);

  // Initialize state from localStorage draft or defaults
  const [title, setTitle] = useState(() => {
    const draft = typeof window !== 'undefined' ? loadDraft() : null;
    return draft?.title || '';
  });
  const [content, setContent] = useState(() => {
    const draft = typeof window !== 'undefined' ? loadDraft() : null;
    return draft?.content || '';
  });
  const [tags, setTags] = useState<string[]>(() => {
    const draft = typeof window !== 'undefined' ? loadDraft() : null;
    return draft?.tags || [];
  });
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(() => {
    const draft = typeof window !== 'undefined' ? loadDraft() : null;
    return draft?.projectId || initialProjectId;
  });
  const [showTagPopover, setShowTagPopover] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Canvas state - initialize from localStorage draft
  const [canvasData, setCanvasData] = useState<CanvasData | undefined>(() => {
    const draft = typeof window !== 'undefined' ? loadDraft() : null;
    return draft?.canvasData;
  });
  const canvasRef = useRef<PRDCanvasRef>(null);

  // Save draft to localStorage whenever data changes
  const saveDraft = useCallback((data: Partial<DraftNoteData>) => {
    if (typeof window === 'undefined') return;
    try {
      const currentDraft = loadDraft() || { title: '', content: '', tags: [], lastSaved: Date.now() };
      const updatedDraft: DraftNoteData = {
        ...currentDraft,
        ...data,
        lastSaved: Date.now(),
      };
      localStorage.setItem(DRAFT_NOTE_STORAGE_KEY, JSON.stringify(updatedDraft));
    } catch (e) {
      console.error('Failed to save draft to localStorage:', e);
    }
  }, [loadDraft]);

  // Clear draft from localStorage
  const clearDraft = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(DRAFT_NOTE_STORAGE_KEY);
    } catch (e) {
      console.error('Failed to clear draft from localStorage:', e);
    }
  }, []);
  
  const selectedProject = projects.find(p => p.id === selectedProjectId);

  // Extract plain text from content for AI context
  const [prdPlainText, setPrdPlainText] = useState('');
  useEffect(() => {
    try {
      if (content) {
        const parsed = JSON.parse(content);
        const extractText = (node: any): string => {
          if (typeof node === 'string') return node;
          if (node.text) return node.text;
          if (node.content) {
            return node.content.map(extractText).join(' ');
          }
          return '';
        };
        setPrdPlainText(extractText(parsed));
      }
    } catch {
      setPrdPlainText('');
    }
  }, [content]);

  // Canvas generation hook
  const {
    isGenerating: isCanvasGenerating,
    generatingType: canvasGeneratingType,
    generateDiagram,
  } = useCanvasGeneration({
    prdContent: prdPlainText,
    productDescription: title,
  });

  // Handle canvas generation
  const handleGenerateCanvasContent = useCallback(
    async (type: CanvasGenerationType) => {
      const result = await generateDiagram(type);
      return result;
    },
    [generateDiagram]
  );

  // Handle canvas data changes - also save to localStorage
  const handleCanvasChange = useCallback((data: CanvasData) => {
    setCanvasData(data);
    saveDraft({ canvasData: data });
  }, [saveDraft]);

  const handleAddTag = useCallback((tagName: string) => {
    if (!tags.includes(tagName)) {
      const newTags = [...tags, tagName];
      setTags(newTags);
      saveDraft({ tags: newTags });
    }
    setShowTagPopover(false);
  }, [tags, saveDraft]);

  const handleRemoveTag = useCallback((tagName: string) => {
    const newTags = tags.filter((t) => t !== tagName);
    setTags(newTags);
    saveDraft({ tags: newTags });
  }, [tags, saveDraft]);

  // Handle title change - also save to localStorage
  const handleTitleChange = useCallback((value: string) => {
    setTitle(value);
    saveDraft({ title: value });
  }, [saveDraft]);

  // Handle content change - also save to localStorage
  const handleContentChange = useCallback((value: string) => {
    setContent(value);
    saveDraft({ content: value });
  }, [saveDraft]);

  // Handle project change - also save to localStorage
  const handleProjectChange = useCallback((value: string) => {
    const projectId = value === 'none' ? undefined : value;
    setSelectedProjectId(projectId);
    saveDraft({ projectId });
  }, [saveDraft]);

  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      toast.error('Please add a title');
      return;
    }

    if (!currentUser) {
      toast.error('Please sign in to create notes');
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
          canvasData: canvasData ? JSON.stringify(canvasData) : undefined,
        },
        authorId: currentUser.id,
        authorName: currentUser.name || currentUser.email,
        authorAvatar: currentUser.avatar,
      });

      // Clear the draft from localStorage after successful save
      clearDraft();
      
      toast.success('Note created');
      if (newNote) {
        router.push(`/notes/${newNote.id}`);
      }
    } catch (error) {
      toast.error('Failed to create note');
    } finally {
      setIsSaving(false);
    }
  }, [title, content, tags, selectedProjectId, canvasData, createNote, router, currentUser, clearDraft]);

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
            onValueChange={handleProjectChange}
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
            onChange={(e) => handleTitleChange(e.target.value)}
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
        onChange={handleContentChange}
        placeholder="Start typing, or press '/' for commands..."
        autoFocus={false}
      />

      {/* PRD Canvas - Whiteboard for visual planning */}
      <div className="mt-6">
        <PRDCanvas
          ref={canvasRef}
          initialData={canvasData}
          onChange={handleCanvasChange}
          prdContent={prdPlainText}
          productDescription={title}
          defaultCollapsed={false}
          onGenerateContent={handleGenerateCanvasContent}
          isGenerating={isCanvasGenerating}
          generatingType={canvasGeneratingType}
        />
      </div>
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

