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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Trash2, Tag, FolderInput, FolderOpen, Loader2, Check, X, Plus, Code, Eye } from 'lucide-react';
import { MoveToProjectDialog } from '@/components/notes/move-to-project-dialog';
import { useProjects, useProject, useCreateProject } from '@/lib/hooks/use-projects';
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
import { GeneratedItemsSection } from '@/components/notes/generated-items-section';
import { type CanvasGenerationType } from '@/components/canvas/prd-canvas';
import { useCanvasGeneration } from '@/lib/hooks/use-canvas-generation';
import type { GeneratedFeature, GeneratedTask, CanvasItem } from '@/types';
import {
  createFeatureFromGenerated,
  createFeaturesFromGenerated,
  createTaskFromGenerated,
  createTasksFromGenerated
} from '@/lib/services/bulk-creation';
import { TaskDestinationDialog } from '@/components/notes/task-destination-dialog';
import { FeatureDestinationDialog } from '@/components/notes/feature-destination-dialog';
import { useTaskTabsManager } from '@/lib/hooks/use-task-tabs';
import { useAuthStore } from '@/lib/stores/auth-store';
import { CreateTaskDrawer } from '@/components/tasks/create-task-drawer';
import { FeatureRequestDrawer } from '@/components/pipelines/feature-request-drawer';
import { AIGenerationPanel } from '@/components/notes/ai-generation-panel';
import { useRoadmaps } from '@/lib/hooks/use-roadmaps';
import type { TaskFormData } from '@/types';
import { createTask as createTaskInDb } from '@/lib/db/repositories/supabase/tasks';
import { tipTapToMarkdown, markdownToTipTap } from '@/lib/utils/markdown-to-tiptap';
import { CanvasCard } from '@/components/notes/cards/canvas-card';
import { ResourcesCard } from '@/components/notes/cards/resources-card';

// View mode type for toggle between markup (raw markdown) and preview (rendered)
type NoteViewMode = 'preview' | 'markup';

/**
 * Normalizes Excalidraw elements loaded from storage.
 * Fixes issues with linear elements (arrows, lines) that may be missing required properties.
 * This prevents the "Linear element is not normalized" error from Excalidraw.
 */
function normalizeCanvasElements(elements: any[]): any[] {
  if (!Array.isArray(elements)) return [];

  // Filter out invalid elements first, then normalize
  return elements
    .filter(el => el && typeof el === 'object' && el.type && el.id)
    .map(el => {
      // Only process linear elements (arrow, line)
      if (el.type === 'arrow' || el.type === 'line') {
        // Ensure points is a valid array
        let points = el.points;
        if (!Array.isArray(points) || points.length < 2) {
          points = [[0, 0], [100, 0]];
        } else {
          // Ensure each point is a valid [x, y] tuple with numbers
          points = points.map((p: any) => {
            if (Array.isArray(p) && p.length >= 2) {
              return [Number(p[0]) || 0, Number(p[1]) || 0];
            }
            return [0, 0];
          });
        }

        // Ensure lastCommittedPoint exists (required for normalization)
        const lastCommittedPoint = points[points.length - 1];

        // Calculate proper width/height from points
        const minX = Math.min(...points.map((p: number[]) => p[0]));
        const maxX = Math.max(...points.map((p: number[]) => p[0]));
        const minY = Math.min(...points.map((p: number[]) => p[1]));
        const maxY = Math.max(...points.map((p: number[]) => p[1]));

        return {
          ...el,
          points,
          lastCommittedPoint,
          width: Math.max(Math.abs(maxX - minX), 1),
          height: Math.max(Math.abs(maxY - minY), 1),
          x: Number(el.x) || 0,
          y: Number(el.y) || 0,
        };
      }

      // For non-linear elements, ensure basic numeric properties
      return {
        ...el,
        x: Number(el.x) || 0,
        y: Number(el.y) || 0,
        width: el.width ? Number(el.width) : undefined,
        height: el.height ? Number(el.height) : undefined,
      };
    });
}

/**
 * Serialize canvases for storage - strips runtime-only properties like Map
 */
function serializeCanvasesForStorage(canvases: CanvasItem[]): string {
  if (canvases.length === 0) return '';

  // Deep clone and remove non-serializable properties
  const serializable = canvases.map(canvas => ({
    ...canvas,
    data: {
      ...canvas.data,
      appState: canvas.data.appState ? {
        ...canvas.data.appState,
        collaborators: undefined, // Remove Map - can't be serialized
      } : undefined,
    },
  }));

  return JSON.stringify(serializable);
}

/**
 * Migrate legacy single canvas to array format
 */
function migrateCanvasData(canvasDataStr: string | undefined): CanvasItem[] {
  if (!canvasDataStr) return [];

  try {
    const parsed = JSON.parse(canvasDataStr);

    // Check if it's already an array of CanvasItems
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].id && parsed[0].name && parsed[0].data) {
      // Already in new format - normalize elements in each canvas
      return parsed.map((item: CanvasItem) => ({
        ...item,
        data: {
          ...item.data,
          elements: normalizeCanvasElements(item.data.elements as any[]),
          appState: item.data.appState ? {
            ...item.data.appState,
            collaborators: new Map(),
          } : { viewBackgroundColor: '#ffffff', collaborators: new Map() },
        },
      }));
    }

    // Legacy format - single canvas data object with elements, appState, files
    if (parsed.elements || parsed.appState) {
      const normalizedElements = normalizeCanvasElements(parsed.elements || []);
      const appState = parsed.appState ? {
        ...parsed.appState,
        collaborators: new Map(),
      } : { viewBackgroundColor: '#ffffff', collaborators: new Map() };

      return [{
        id: 'canvas-legacy',
        name: 'Canvas 1',
        data: {
          elements: normalizedElements,
          appState,
          files: parsed.files || {},
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }];
    }

    return [];
  } catch (e) {
    console.warn('Failed to parse canvas data:', e);
    return [];
  }
}

export default function NoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const noteId = params.id as string;

  const { data: note, isLoading } = useNote(noteId);
  const { data: allTags = [] } = useTags();
  const { data: projects = [] } = useProjects();
  const { mutate: updateNote, isPending: isSaving } = useUpdateNote();
  const deleteNote = useDeleteNote();
  const createProject = useCreateProject();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [projectId, setProjectId] = useState<string | undefined>(undefined);

  // Fetch project instructions when projectId changes
  const { data: currentProject } = useProject(projectId);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showTagPopover, setShowTagPopover] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [showCreateProjectDialog, setShowCreateProjectDialog] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // AI Generated items state
  const [generatedFeatures, setGeneratedFeatures] = useState<GeneratedFeature[]>([]);
  const [generatedTasks, setGeneratedTasks] = useState<GeneratedTask[]>([]);

  // Canvas state - array of canvases
  const [canvases, setCanvases] = useState<CanvasItem[]>([]);
  // Use ref for canvases to avoid re-render loops in auto-save
  const canvasesRef = useRef<CanvasItem[]>([]);
  // Use a counter instead of boolean to ensure each change triggers debounce
  const [canvasChangeCount, setCanvasChangeCount] = useState(0);

  // Destination dialogs state
  const [showFeatureDialog, setShowFeatureDialog] = useState(false);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [pendingFeatureAction, setPendingFeatureAction] = useState<'single' | 'bulk'>('single');
  const [pendingFeature, setPendingFeature] = useState<GeneratedFeature | null>(null);
  const [pendingTaskAction, setPendingTaskAction] = useState<'single' | 'bulk'>('single');
  const [pendingTask, setPendingTask] = useState<GeneratedTask | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Task tabs manager for creating new projects
  const { addTab, setActiveTab, tabs: taskTabs } = useTaskTabsManager();

  // Get current authenticated user
  const { currentUser } = useAuthStore();

  // Get roadmaps for feature creation
  const { data: roadmaps = [] } = useRoadmaps();

  // New drawer states for Add dropdown
  const [showCreateTaskDrawer, setShowCreateTaskDrawer] = useState(false);
  const [showCreateFeatureDrawer, setShowCreateFeatureDrawer] = useState(false);
  const [showAIGenerationPanel, setShowAIGenerationPanel] = useState(false);
  const [aiGenerationMode, setAIGenerationMode] = useState<'tasks' | 'features'>('tasks');

  // View mode state: 'preview' shows rendered content, 'markup' shows raw markdown
  const [viewMode, setViewMode] = useState<NoteViewMode>('preview');
  // Store the markdown version when in markup mode for proper conversion back
  const [markupContent, setMarkupContent] = useState<string>('');

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

  // Handle canvas generation - receives existing elements for proper positioning
  const handleGenerateCanvasContent = useCallback(
    async (type: CanvasGenerationType, existingElements: any[]) => {
      const result = await generateDiagram(type, existingElements);
      return result;
    },
    [generateDiagram]
  );

  // Handle canvas array changes
  const handleCanvasesChange = useCallback((newCanvases: CanvasItem[]) => {
    setCanvases(newCanvases);
    // Update ref immediately for auto-save to access
    canvasesRef.current = newCanvases;
    // Also update currentValues ref immediately so unmount save has latest data
    if (currentValues.current) {
      currentValues.current.canvases = newCanvases;
    }
    // Trigger a debounced save by incrementing the counter
    setCanvasChangeCount(prev => prev + 1);
  }, []);

  // Track if we've initialized and last saved values to prevent save loops
  const isInitialized = useRef(false);
  const [isNoteLoaded, setIsNoteLoaded] = useState(false); // State to trigger re-render when note loads
  const lastSaved = useRef({ title: '', content: '', tags: '', projectId: '', generatedFeatures: '[]', generatedTasks: '[]', canvasData: '' });

  // Keep refs for current state to access in unmount cleanup
  const currentValues = useRef({ title, content, tags, projectId, generatedFeatures, generatedTasks, canvases });
  useEffect(() => {
    currentValues.current = { title, content, tags, projectId, generatedFeatures, generatedTasks, canvases };
  }, [title, content, tags, projectId, generatedFeatures, generatedTasks, canvases]);

  // Initialize state when note loads
  useEffect(() => {
    if (note && !isInitialized.current) {
      setTitle(note.title);
      setContent(note.content);
      setTags(note.tags);
      setProjectId(note.projectId);
      // Load saved generated features and tasks
      if (note.generatedFeatures && note.generatedFeatures.length > 0) {
        setGeneratedFeatures(note.generatedFeatures);
      }
      if (note.generatedTasks && note.generatedTasks.length > 0) {
        setGeneratedTasks(note.generatedTasks);
      }
      // Load and migrate canvas data
      const migratedCanvases = migrateCanvasData(note.canvasData);
      setCanvases(migratedCanvases);
      canvasesRef.current = migratedCanvases;

      // Store initial values as last saved
      lastSaved.current = {
        title: note.title,
        content: note.content,
        tags: JSON.stringify(note.tags),
        projectId: note.projectId || '',
        generatedFeatures: JSON.stringify(note.generatedFeatures || []),
        generatedTasks: JSON.stringify(note.generatedTasks || []),
        canvasData: note.canvasData || '',
      };
      isInitialized.current = true;
      setIsNoteLoaded(true);
    }
  }, [note]);

  // Reset initialization when noteId changes
  useEffect(() => {
    isInitialized.current = false;
    setIsNoteLoaded(false);
  }, [noteId]);

  // Debounce content changes for auto-save
  const debouncedContent = useDebounce(content, 800);
  const debouncedTitle = useDebounce(title, 800);
  const debouncedTags = useDebounce(tags, 500);
  const debouncedProjectId = useDebounce(projectId, 500);
  const debouncedGeneratedFeatures = useDebounce(generatedFeatures, 500);
  const debouncedGeneratedTasks = useDebounce(generatedTasks, 500);
  const debouncedCanvasChangeCount = useDebounce(canvasChangeCount, 1000); // Longer debounce for canvas

  // Auto-save
  useEffect(() => {
    if (!isInitialized.current || isLoading) return;

    const currentTagsStr = JSON.stringify(debouncedTags);
    const currentProjectId = debouncedProjectId || '';
    const currentFeaturesStr = JSON.stringify(debouncedGeneratedFeatures);
    const currentTasksStr = JSON.stringify(debouncedGeneratedTasks);
    // Serialize canvases for storage - use ref to avoid dependency on canvases state
    const currentCanvasStr = serializeCanvasesForStorage(canvasesRef.current);

    const canvasChanged = currentCanvasStr !== lastSaved.current.canvasData;
    const hasChanges =
      debouncedTitle !== lastSaved.current.title ||
      debouncedContent !== lastSaved.current.content ||
      currentTagsStr !== lastSaved.current.tags ||
      currentProjectId !== lastSaved.current.projectId ||
      currentFeaturesStr !== lastSaved.current.generatedFeatures ||
      currentTasksStr !== lastSaved.current.generatedTasks ||
      canvasChanged;

    if (hasChanges) {
      // Update last saved values immediately to prevent duplicate saves
      lastSaved.current = {
        title: debouncedTitle,
        content: debouncedContent,
        tags: currentTagsStr,
        projectId: currentProjectId,
        generatedFeatures: currentFeaturesStr,
        generatedTasks: currentTasksStr,
        canvasData: currentCanvasStr,
      };

      // Ensure canvasData is passed correctly
      const canvasDataToSave = currentCanvasStr.length > 0 ? currentCanvasStr : undefined;

      updateNote(
        {
          id: noteId,
          data: {
            title: debouncedTitle,
            content: debouncedContent,
            tags: debouncedTags,
            projectId: debouncedProjectId,
            generatedFeatures: debouncedGeneratedFeatures,
            generatedTasks: debouncedGeneratedTasks,
            canvasData: canvasDataToSave,
          }
        },
        {
          onSuccess: () => {
            setLastSavedAt(new Date());
          },
        }
      );
    }
  }, [debouncedTitle, debouncedContent, debouncedTags, debouncedProjectId, debouncedGeneratedFeatures, debouncedGeneratedTasks, debouncedCanvasChangeCount, noteId, isLoading, updateNote]);

  // Save on unmount / navigation
  useEffect(() => {
    return () => {
      if (!isInitialized.current) return;

      const { title, content, tags, projectId, generatedFeatures, generatedTasks, canvases } = currentValues.current;
      const currentTagsStr = JSON.stringify(tags);
      const currentProjectId = projectId || '';
      const currentFeaturesStr = JSON.stringify(generatedFeatures);
      const currentTasksStr = JSON.stringify(generatedTasks);
      const currentCanvasStr = serializeCanvasesForStorage(canvases);

      const hasChanges =
        title !== lastSaved.current.title ||
        content !== lastSaved.current.content ||
        currentTagsStr !== lastSaved.current.tags ||
        currentProjectId !== lastSaved.current.projectId ||
        currentFeaturesStr !== lastSaved.current.generatedFeatures ||
        currentTasksStr !== lastSaved.current.generatedTasks ||
        currentCanvasStr !== lastSaved.current.canvasData;

      if (hasChanges) {
        // Force immediate save on unmount
        updateNote({
          id: noteId,
          data: { title, content, tags, projectId, generatedFeatures, generatedTasks, canvasData: currentCanvasStr || undefined }
        });
      }
    };
  }, [noteId, updateNote]);

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

  // Handle creating a new project from the dropdown
  const handleCreateProject = useCallback(async () => {
    if (!newProjectName.trim()) return;
    try {
      const newProject = await createProject.mutateAsync({ name: newProjectName.trim() });
      setProjectId(newProject.id);
      setNewProjectName('');
      setShowCreateProjectDialog(false);
      toast.success('Project created');
    } catch (error) {
      toast.error('Failed to create project');
    }
  }, [newProjectName, createProject]);

  // Handle features generated from AI - ensure isSelected is false by default
  const handleFeaturesGenerated = useCallback((features: GeneratedFeature[]) => {
    const featuresWithSelection = features.map(f => ({ ...f, isSelected: false }));
    setGeneratedFeatures(prev => [...prev, ...featuresWithSelection]);
    toast.success(`${features.length} features generated`);
  }, []);

  // Handle tasks generated from AI - ensure isSelected is false by default
  const handleTasksGenerated = useCallback((tasks: GeneratedTask[]) => {
    const tasksWithSelection = tasks.map(t => ({ ...t, isSelected: false }));
    setGeneratedTasks(prev => [...prev, ...tasksWithSelection]);
    toast.success(`${tasks.length} tasks generated`);
  }, []);

  // Create a single feature in the pipeline
  const handleCreateFeature = useCallback((feature: GeneratedFeature) => {
    setPendingFeature(feature);
    setPendingFeatureAction('single');
    setShowFeatureDialog(true);
  }, []);

  // Create a single task
  const handleCreateTask = useCallback((task: GeneratedTask) => {
    setPendingTask(task);
    setPendingTaskAction('single');
    setShowTaskDialog(true);
  }, []);

  // Create all selected features
  const handleCreateAllFeatures = useCallback(() => {
    const selectedFeatures = generatedFeatures.filter(f => f.isSelected);
    if (selectedFeatures.length === 0) {
      toast.error('No features selected');
      return;
    }
    setPendingFeatureAction('bulk');
    setShowFeatureDialog(true);
  }, [generatedFeatures]);

  // Create all selected tasks
  const handleCreateAllTasks = useCallback(() => {
    const selectedTasks = generatedTasks.filter(t => t.isSelected);
    if (selectedTasks.length === 0) {
      toast.error('No tasks selected');
      return;
    }
    setPendingTaskAction('bulk');
    setShowTaskDialog(true);
  }, [generatedTasks]);

  // Confirm feature/pipeline creation with selected roadmap
  const handleConfirmFeatureCreation = useCallback(async (roadmapId: string) => {
    if (!currentUser) {
      toast.error('Please sign in to create features');
      return;
    }

    setIsCreating(true);
    try {
      const featureOptions = {
        roadmapId,
        userId: currentUser.id,
        userName: currentUser.name || currentUser.email,
        userAvatar: currentUser.avatar,
      };

      if (pendingFeatureAction === 'single' && pendingFeature) {
        await createFeatureFromGenerated(pendingFeature, featureOptions);
        toast.success(`Feature "${pendingFeature.title}" created in pipeline`);
        setGeneratedFeatures(prev => prev.filter(f => f.id !== pendingFeature.id));
      } else if (pendingFeatureAction === 'bulk') {
        const selectedFeatures = generatedFeatures.filter(f => f.isSelected);
        const selectedTasks = generatedTasks.filter(t => t.isSelected);

        let totalCreated = 0;
        let totalFailed = 0;

        if (selectedFeatures.length > 0) {
          const featureResult = await createFeaturesFromGenerated(selectedFeatures, featureOptions);
          totalCreated += featureResult.totalCreated;
          totalFailed += featureResult.totalFailed;
          if (featureResult.totalCreated > 0) {
            setGeneratedFeatures(prev => prev.filter(f => !f.isSelected));
          }
        }

        if (selectedTasks.length > 0) {
          const tasksAsFeatures: GeneratedFeature[] = selectedTasks.map(task => ({
            id: task.id,
            title: task.title,
            description: task.description,
            priority: task.priority === 'high' ? 'high' : task.priority === 'low' ? 'low' : 'medium',
            phase: 'Phase 1',
            estimatedEffort: `${task.estimatedHours}h`,
            acceptanceCriteria: [],
            userStories: [],
            isSelected: true,
          }));
          const taskResult = await createFeaturesFromGenerated(tasksAsFeatures, featureOptions);
          totalCreated += taskResult.totalCreated;
          totalFailed += taskResult.totalFailed;
          if (taskResult.totalCreated > 0) {
            setGeneratedTasks(prev => prev.filter(t => !t.isSelected));
          }
        }

        if (totalCreated > 0) {
          toast.success(`${totalCreated} items added to pipeline`);
        }
        if (totalFailed > 0) {
          toast.error(`${totalFailed} items failed to create`);
        }
      }
    } catch (error) {
      toast.error(`Failed to create items: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCreating(false);
      setShowFeatureDialog(false);
      setPendingFeature(null);
    }
  }, [pendingFeatureAction, pendingFeature, generatedFeatures, generatedTasks, currentUser]);

  // Confirm task creation with selected project
  const handleConfirmTaskCreation = useCallback(async (projectId: string | null, newProjectName?: string) => {
    setIsCreating(true);
    try {
      let targetProjectId = projectId;
      if (newProjectName) {
        const newTab = await addTab(newProjectName);
        targetProjectId = newTab.id;
        setActiveTab(newTab.id);
        toast.success(`Project "${newProjectName}" created`);
      } else if (projectId) {
        setActiveTab(projectId);
      }

      if (pendingTaskAction === 'single' && pendingTask) {
        await createTaskFromGenerated(pendingTask, {
          defaultStatus: 'planned',
          projectId: targetProjectId || undefined
        });
        toast.success(`Task "${pendingTask.title}" created`);
        setGeneratedTasks(prev => prev.filter(t => t.id !== pendingTask.id));
      } else if (pendingTaskAction === 'bulk') {
        const selectedTasks = generatedTasks.filter(t => t.isSelected);
        const selectedFeatures = generatedFeatures.filter(f => f.isSelected);

        let totalCreated = 0;
        let totalFailed = 0;

        if (selectedTasks.length > 0) {
          const taskResult = await createTasksFromGenerated(selectedTasks, {
            defaultStatus: 'planned',
            projectId: targetProjectId || undefined
          });
          totalCreated += taskResult.totalCreated;
          totalFailed += taskResult.totalFailed;
          if (taskResult.totalCreated > 0) {
            setGeneratedTasks(prev => prev.filter(t => !t.isSelected));
          }
        }

        if (selectedFeatures.length > 0) {
          const featuresAsTasks: GeneratedTask[] = selectedFeatures.map(feature => ({
            id: feature.id,
            title: feature.title,
            description: feature.description,
            priority: feature.priority === 'urgent' ? 'high' : feature.priority,
            estimatedHours: feature.estimatedEffort ? parseInt(feature.estimatedEffort) || 8 : 8,
            role: 'Product',
            dependencies: [],
            isSelected: true,
          }));
          const featureResult = await createTasksFromGenerated(featuresAsTasks, {
            defaultStatus: 'planned',
            projectId: targetProjectId || undefined
          });
          totalCreated += featureResult.totalCreated;
          totalFailed += featureResult.totalFailed;
          if (featureResult.totalCreated > 0) {
            setGeneratedFeatures(prev => prev.filter(f => !f.isSelected));
          }
        }

        if (totalCreated > 0) {
          toast.success(`${totalCreated} items added to Tasks`);
        }
        if (totalFailed > 0) {
          toast.error(`${totalFailed} items failed to create`);
        }
      }
    } catch (error) {
      toast.error(`Failed to create items: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCreating(false);
      setShowTaskDialog(false);
      setPendingTask(null);
    }
  }, [pendingTaskAction, pendingTask, generatedTasks, generatedFeatures, addTab, setActiveTab]);

  // Handler for creating a manual task from the drawer
  const handleCreateManualTask = useCallback(async (taskData: TaskFormData) => {
    try {
      await createTaskInDb(taskData);
      toast.success(`Task "${taskData.title}" created`);
      const newTask: GeneratedTask = {
        id: crypto.randomUUID(),
        title: taskData.title,
        description: taskData.description,
        priority: 'medium',
        estimatedHours: 4,
        role: 'Product',
        dependencies: [],
        isSelected: false,
      };
      setGeneratedTasks(prev => [...prev, newTask]);
    } catch (error) {
      toast.error(`Failed to create task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, []);

  // Handlers for Add dropdown
  const handleOpenCreateTaskDrawer = useCallback(() => {
    setShowCreateTaskDrawer(true);
  }, []);

  const handleOpenCreateFeatureDrawer = useCallback(() => {
    setShowCreateFeatureDrawer(true);
  }, []);

  const handleOpenAITaskGeneration = useCallback(() => {
    setAIGenerationMode('tasks');
    setShowAIGenerationPanel(true);
  }, []);

  const handleOpenAIFeatureGeneration = useCallback(() => {
    setAIGenerationMode('features');
    setShowAIGenerationPanel(true);
  }, []);

  // Toggle to markup view: convert current TipTap content to markdown
  const handleViewMarkup = useCallback(() => {
    if (content) {
      try {
        const parsedContent = JSON.parse(content);
        const markdown = tipTapToMarkdown(parsedContent);
        setMarkupContent(markdown);
        setViewMode('markup');
      } catch (e) {
        console.warn('Failed to convert content to markdown:', e);
        toast.error('Failed to convert to markup view');
      }
    }
  }, [content]);

  // Toggle to preview view: convert markdown back to TipTap format
  const handleViewPreview = useCallback(() => {
    if (markupContent) {
      try {
        const tiptapDoc = markdownToTipTap(markupContent);
        setContent(JSON.stringify(tiptapDoc));
        setViewMode('preview');
      } catch (e) {
        console.warn('Failed to convert markdown to preview:', e);
        toast.error('Failed to convert to preview');
      }
    } else {
      setViewMode('preview');
    }
  }, [markupContent]);

  // Handle markup content changes in markup mode
  const handleMarkupChange = useCallback((newMarkup: string) => {
    setMarkupContent(newMarkup);
  }, []);

  // Bulk action handlers - open modals instead of direct action
  const handleOpenBulkTaskDialog = useCallback(() => {
    const selectedTasks = generatedTasks.filter(t => t.isSelected);
    const selectedFeatures = generatedFeatures.filter(f => f.isSelected);
    if (selectedTasks.length === 0 && selectedFeatures.length === 0) {
      toast.error('No items selected');
      return;
    }
    setPendingTaskAction('bulk');
    setShowTaskDialog(true);
  }, [generatedTasks, generatedFeatures]);

  const handleOpenBulkFeatureDialog = useCallback(() => {
    const selectedTasks = generatedTasks.filter(t => t.isSelected);
    const selectedFeatures = generatedFeatures.filter(f => f.isSelected);
    if (selectedTasks.length === 0 && selectedFeatures.length === 0) {
      toast.error('No items selected');
      return;
    }
    setPendingFeatureAction('bulk');
    setShowFeatureDialog(true);
  }, [generatedTasks, generatedFeatures]);

  const handleBulkDelete = useCallback(() => {
    const remainingFeatures = generatedFeatures.filter(f => !f.isSelected);
    const remainingTasks = generatedTasks.filter(t => !t.isSelected);
    const deletedCount = (generatedFeatures.length - remainingFeatures.length) + (generatedTasks.length - remainingTasks.length);

    setGeneratedFeatures(remainingFeatures);
    setGeneratedTasks(remainingTasks);
    toast.success(`${deletedCount} items deleted`);
  }, [generatedFeatures, generatedTasks]);

  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-white">
        <div className="flex-1 overflow-auto">
          <div className="max-w-[1280px] mx-auto px-8 py-6">
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-7">
                <Skeleton className="h-4 w-24 mb-8" />
                <Skeleton className="h-[52px] w-2/3 mb-8" />
                <Skeleton className="h-4 w-48 mb-8" />
                <Skeleton className="h-[350px] w-full" />
              </div>
              <div className="col-span-5 pl-12">
                <Skeleton className="h-[200px] w-full mb-6" />
                <Skeleton className="h-[150px] w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="flex flex-col h-full bg-white items-center justify-center">
        <h2 className="text-xl font-semibold mb-2 text-note-text">Note not found</h2>
        <p className="text-note-text-muted mb-4">This note may have been deleted.</p>
        <Button asChild className="bg-note-text text-white hover:bg-note-text/90">
          <Link href="/notes">Back to Notes</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white text-note-text">
      <div className="flex-1 overflow-auto">
        <div className="max-w-[1280px] mx-auto px-8 py-6">
          {/* 12-column grid layout */}
          <div className="grid grid-cols-12 gap-6">
            {/* Left Content Area - col-span-7 */}
            <div className="col-span-7 flex flex-col gap-4">
              {/* Back Navigation */}
              <div className="flex items-center justify-between">
                <Link
                  href="/notes"
                  className="inline-flex items-center gap-1 text-sm font-medium text-note-text-muted hover:text-note-text transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>All notes</span>
                </Link>
                <div className="flex items-center gap-2 text-xs text-note-text-muted">
                  {isSaving ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Saving...</span>
                    </div>
                  ) : lastSavedAt ? (
                    <div className="flex items-center gap-1.5">
                      <Check className="h-3.5 w-3.5" />
                      <span>Saved</span>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Title and Meta Block */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 flex flex-col gap-0.5">
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Untitled Note"
                    className="text-[42px] font-bold border-0 p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent text-note-text placeholder:text-note-text-muted leading-[52px] tracking-[-0.462px] shadow-none"
                  />
                </div>

                {/* Close/More button */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-note-text-muted hover:text-note-text hover:bg-note-border rounded-md">
                      <X className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    {/* View mode toggle - conditional based on current mode */}
                    {viewMode === 'preview' ? (
                      <DropdownMenuItem onClick={handleViewMarkup}>
                        <Code className="h-4 w-4 mr-2" />
                        View Markup
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={handleViewPreview}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Preview
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
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

              {/* Metadata row */}
              <div className="flex flex-wrap items-center gap-2 text-sm text-note-text-muted">
                <span>{format(new Date(note.createdAt), 'MMM d, yyyy')}</span>
                <span>•</span>
                <span>{format(new Date(note.updatedAt), 'h:mm a')}</span>
                {/* Project Selector */}
                <Select
                  value={projectId || 'none'}
                  onValueChange={(val) => {
                    if (val === 'create-new') {
                      setShowCreateProjectDialog(true);
                    } else {
                      setProjectId(val === 'none' ? undefined : val);
                    }
                  }}
                >
                  <SelectTrigger className="h-auto py-0.5 px-2 text-xs font-medium bg-transparent border-0 shadow-none focus:ring-0 focus:ring-offset-0 text-note-text-muted hover:text-note-text data-[state=open]:text-note-text inline-flex items-center gap-1">
                    <FolderOpen className="h-3 w-3" />
                    <SelectValue placeholder="No Project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Project</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="create-new" className="text-primary">
                      <span className="flex items-center gap-2">
                        <Plus className="h-3 w-3" />
                        Create New
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {tags.length > 0 && (
                  <>
                    <span>•</span>
                    <div className="flex items-center gap-1.5">
                      {tags.map((tag) => (
                        <TagBadge
                          key={tag}
                          name={tag}
                          color={getTagColor(tag)}
                        />
                      ))}
                    </div>
                  </>
                )}
                {/* Add Tag Button */}
                <Popover open={showTagPopover} onOpenChange={setShowTagPopover}>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-auto py-0 px-2 text-xs bg-transparent text-note-text-muted hover:text-note-text">
                      <Tag className="h-3 w-3 mr-1" />
                      Add Tag
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48 p-2" align="start">
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

              {/* Editor - conditionally render based on view mode */}
              <div className="mb-8">
                {viewMode === 'preview' ? (
                  <NoteEditor
                    content={content}
                    onChange={setContent}
                    placeholder="Start typing, or press '/' for commands..."
                    className="min-h-[400px] bg-white"
                    savedFeatures={generatedFeatures}
                    projectInstructions={currentProject?.instructions}
                    onFeaturesGenerated={handleFeaturesGenerated}
                    onTasksGenerated={handleTasksGenerated}
                  />
                ) : (
                  /* Markup mode - show raw markdown in a textarea */
                  <div className="relative bg-transparent min-h-[400px] overflow-hidden">
                    <div className="flex items-center justify-between px-0 py-2 mb-4">
                      <div className="flex items-center gap-2 text-xs text-note-text-muted">
                        <Code className="h-3.5 w-3.5" />
                        <span>Markup View</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleViewPreview}
                        className="h-6 text-xs px-2 text-note-text-muted hover:text-note-text"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Preview
                      </Button>
                    </div>
                    <textarea
                      value={markupContent}
                      onChange={(e) => handleMarkupChange(e.target.value)}
                      placeholder="# Heading 1&#10;## Heading 2&#10;### Heading 3&#10;&#10;Regular paragraph text with **bold** and *italic*.&#10;&#10;* Bullet point 1&#10;* Bullet point 2&#10;&#10;1. Numbered item 1&#10;2. Numbered item 2"
                      className="w-full min-h-[352px] p-4 bg-transparent resize-none focus:outline-none font-mono text-xs leading-relaxed text-note-text"
                      spellCheck={false}
                    />
                  </div>
                )}
              </div>

              {/* Generated Items Section */}
              <div className="mb-8">
                <GeneratedItemsSection
                  features={generatedFeatures}
                  tasks={generatedTasks}
                  onFeaturesChange={setGeneratedFeatures}
                  onTasksChange={setGeneratedTasks}
                  onOpenCreateTaskDrawer={handleOpenCreateTaskDrawer}
                  onOpenCreateFeatureDrawer={handleOpenCreateFeatureDrawer}
                  onOpenAITaskGeneration={handleOpenAITaskGeneration}
                  onOpenAIFeatureGeneration={handleOpenAIFeatureGeneration}
                  onOpenBulkTaskDialog={handleOpenBulkTaskDialog}
                  onOpenBulkFeatureDialog={handleOpenBulkFeatureDialog}
                  alwaysShow={true}
                />
              </div>
            </div>

            {/* Right Sidebar - col-span-5 */}
            <div className="col-span-5 pl-12">
              <div className="space-y-6">
                {/* Canvas Card */}
                {isNoteLoaded && (
                  <CanvasCard
                    canvases={canvases}
                    onCanvasesChange={handleCanvasesChange}
                    prdContent={prdPlainText}
                    productDescription={title}
                    onGenerateContent={handleGenerateCanvasContent}
                    isGenerating={isCanvasGenerating}
                    generatingType={canvasGeneratingType}
                  />
                )}

                {/* Resources Card - only shows if there are mermaid diagrams */}
                <ResourcesCard content={content} />
              </div>
            </div>
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

      {/* Create Project Dialog */}
      <Dialog open={showCreateProjectDialog} onOpenChange={setShowCreateProjectDialog}>
        <DialogContent className="w-[400px] h-[320px] p-6 flex flex-col">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-lg">Create New Project</DialogTitle>
          </DialogHeader>
          <div className="flex-1 space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="newProjectName" className="text-sm font-medium">Project Name</Label>
              <Input
                id="newProjectName"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Enter project name"
                className="h-10"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateProject();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter className="pt-6 gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowCreateProjectDialog(false)} className="px-4">
              Cancel
            </Button>
            <Button
              onClick={handleCreateProject}
              disabled={!newProjectName.trim() || createProject.isPending}
              className="px-4"
            >
              {createProject.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Feature destination dialog */}
      <FeatureDestinationDialog
        open={showFeatureDialog}
        onOpenChange={setShowFeatureDialog}
        features={pendingFeatureAction === 'single' && pendingFeature
          ? [pendingFeature]
          : generatedFeatures.filter(f => f.isSelected)}
        mode={pendingFeatureAction}
        onConfirm={handleConfirmFeatureCreation}
        isCreating={isCreating}
      />

      {/* Task destination dialog */}
      <TaskDestinationDialog
        open={showTaskDialog}
        onOpenChange={setShowTaskDialog}
        tasks={pendingTaskAction === 'single' && pendingTask
          ? [pendingTask]
          : generatedTasks.filter(t => t.isSelected)}
        mode={pendingTaskAction}
        onConfirm={handleConfirmTaskCreation}
        isCreating={isCreating}
      />

      {/* Create Task Drawer */}
      <CreateTaskDrawer
        open={showCreateTaskDrawer}
        onClose={() => setShowCreateTaskDrawer(false)}
        onCreate={handleCreateManualTask}
        defaultStatus="planned"
        users={[]}
        availableLabels={['Design', 'Frontend', 'Backend', 'QA', 'Documentation']}
        tabs={taskTabs}
      />

      {/* Create Feature Drawer */}
      <FeatureRequestDrawer
        open={showCreateFeatureDrawer}
        feature={null}
        onClose={() => setShowCreateFeatureDrawer(false)}
        mode="create"
        roadmapId={roadmaps[0]?.id}
        defaultStatus="backlog"
      />

      {/* AI Generation Panel for Tasks */}
      <AIGenerationPanel
        open={showAIGenerationPanel && aiGenerationMode === 'tasks'}
        onClose={() => setShowAIGenerationPanel(false)}
        mode="generate-tasks"
        currentContent={prdPlainText}
        savedFeatures={generatedFeatures}
        onTasksGenerated={(tasks) => {
          handleTasksGenerated(tasks);
          setShowAIGenerationPanel(false);
        }}
      />

      {/* AI Generation Panel for Features */}
      <AIGenerationPanel
        open={showAIGenerationPanel && aiGenerationMode === 'features'}
        onClose={() => setShowAIGenerationPanel(false)}
        mode="generate-features"
        currentContent={prdPlainText}
        savedFeatures={generatedFeatures}
        onFeaturesGenerated={(features) => {
          handleFeaturesGenerated(features);
          setShowAIGenerationPanel(false);
        }}
      />
    </div>
  );
}
