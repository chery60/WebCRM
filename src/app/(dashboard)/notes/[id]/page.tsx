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
import { ArrowLeft, MoreVertical, Trash2, Tag, FolderInput, FolderOpen, Loader2, Check, X, Plus } from 'lucide-react';
import { MoveToProjectDialog } from '@/components/notes/move-to-project-dialog';
import { useProjects, useCreateProject } from '@/lib/hooks/use-projects';
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
import { PRDCanvas, type PRDCanvasRef, type CanvasGenerationType, type CanvasData } from '@/components/canvas/prd-canvas';
import { useCanvasGeneration } from '@/lib/hooks/use-canvas-generation';
import type { GeneratedFeature, GeneratedTask } from '@/types';
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showTagPopover, setShowTagPopover] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [showCreateProjectDialog, setShowCreateProjectDialog] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // AI Generated items state
  const [generatedFeatures, setGeneratedFeatures] = useState<GeneratedFeature[]>([]);
  const [generatedTasks, setGeneratedTasks] = useState<GeneratedTask[]>([]);
  
  // Canvas state - use ref for the actual data to avoid re-render loops
  // Only the initial load data goes to state, updates go to ref
  const [initialCanvasData, setInitialCanvasData] = useState<CanvasData | undefined>(undefined);
  const canvasDataRef = useRef<CanvasData | undefined>(undefined);
  const canvasRef = useRef<PRDCanvasRef>(null);
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

  // Handle canvas data changes - use ref to avoid re-render loops
  // The canvas manages its own state internally, we just track it for saving
  const handleCanvasChange = useCallback((data: CanvasData) => {
    // Store the canvas data in the ref for persistence
    canvasDataRef.current = data;
    
    // Also update currentValues ref immediately so unmount save has latest data
    if (currentValues.current) {
      currentValues.current.canvasData = data;
    }
    
    // Trigger a debounced save by incrementing the counter
    // Each increment ensures the debounced value changes and triggers a save
    setCanvasChangeCount(prev => {
      const newCount = prev + 1;
      if (process.env.NODE_ENV === 'development') {
        console.log('[Note] handleCanvasChange called:', {
          newCount,
          hasElements: data?.elements?.length || 0,
          elementTypes: data?.elements?.slice(0, 3).map((e: any) => e.type) || [],
        });
      }
      return newCount;
    });
  }, []);

  // Track if we've initialized and last saved values to prevent save loops
  const isInitialized = useRef(false);
  const [isNoteLoaded, setIsNoteLoaded] = useState(false); // State to trigger re-render when note loads
  const lastSaved = useRef({ title: '', content: '', tags: '', projectId: '', generatedFeatures: '[]', generatedTasks: '[]', canvasData: '' });

  // Keep refs for current state to access in unmount cleanup
  const currentValues = useRef({ title, content, tags, projectId, generatedFeatures, generatedTasks, canvasData: canvasDataRef.current });
  useEffect(() => {
    currentValues.current = { title, content, tags, projectId, generatedFeatures, generatedTasks, canvasData: canvasDataRef.current };
  }, [title, content, tags, projectId, generatedFeatures, generatedTasks, canvasChangeCount]); // Added canvasChangeCount to ensure canvasData ref is captured

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
      // Load saved canvas data
      if (note.canvasData) {
        try {
          const parsedCanvasData = JSON.parse(note.canvasData);
          // Normalize elements to fix any malformed linear elements (arrows, lines)
          // This prevents "Linear element is not normalized" errors from Excalidraw
          if (parsedCanvasData.elements) {
            parsedCanvasData.elements = normalizeCanvasElements(parsedCanvasData.elements);
          }
          // CRITICAL: Ensure appState.collaborators is a Map, not a plain object
          // JSON.stringify converts Map to {}, which breaks Excalidraw's forEach calls
          if (parsedCanvasData.appState) {
            parsedCanvasData.appState.collaborators = new Map();
          }
          setInitialCanvasData(parsedCanvasData);
          canvasDataRef.current = parsedCanvasData;
        } catch (e) {
          console.warn('Failed to parse canvas data:', e);
        }
      }
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
      setIsNoteLoaded(true); // Trigger re-render so PRDCanvas mounts with correct initialData
    }
  }, [note]);

  // Reset initialization when noteId changes
  useEffect(() => {
    isInitialized.current = false;
    setIsNoteLoaded(false); // Reset so PRDCanvas remounts with new note's data
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
    // Get canvas data from ref (not state) to avoid re-render loops
    const currentCanvasStr = canvasDataRef.current ? JSON.stringify(canvasDataRef.current) : '';
    
    const canvasChanged = currentCanvasStr !== lastSaved.current.canvasData;
    const hasChanges =
      debouncedTitle !== lastSaved.current.title ||
      debouncedContent !== lastSaved.current.content ||
      currentTagsStr !== lastSaved.current.tags ||
      currentProjectId !== lastSaved.current.projectId ||
      currentFeaturesStr !== lastSaved.current.generatedFeatures ||
      currentTasksStr !== lastSaved.current.generatedTasks ||
      canvasChanged;

    // Debug logging for canvas save
    if (process.env.NODE_ENV === 'development' && debouncedCanvasChangeCount > 0) {
      console.log('[Note Auto-Save] Canvas check:', {
        canvasChangeCount: debouncedCanvasChangeCount,
        canvasChanged,
        currentCanvasLength: currentCanvasStr.length,
        lastSavedCanvasLength: lastSaved.current.canvasData.length,
        hasElements: canvasDataRef.current?.elements?.length || 0,
      });
    }

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

      // Debug logging for canvas save
      if (process.env.NODE_ENV === 'development' && canvasChanged) {
        console.log('[Note Auto-Save] Saving canvas data:', {
          canvasDataLength: currentCanvasStr.length,
          hasElements: canvasDataRef.current?.elements?.length || 0,
        });
      }

      // Ensure canvasData is passed correctly - use empty string check
      // An empty canvas still has valid JSON structure, so we should save it
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
            if (process.env.NODE_ENV === 'development' && canvasChanged) {
              console.log('[Note Auto-Save] Canvas saved successfully!', {
                savedCanvasLength: canvasDataToSave?.length || 0,
              });
            }
          },
          onError: (error) => {
            if (process.env.NODE_ENV === 'development') {
              console.error('[Note Auto-Save] Failed to save:', error);
            }
          },
        }
      );
    }
  }, [debouncedTitle, debouncedContent, debouncedTags, debouncedProjectId, debouncedGeneratedFeatures, debouncedGeneratedTasks, debouncedCanvasChangeCount, noteId, isLoading, updateNote]);

  // Save on unmount / navigation
  useEffect(() => {
    return () => {
      if (!isInitialized.current) return;

      const { title, content, tags, projectId, generatedFeatures, generatedTasks, canvasData } = currentValues.current;
      const currentTagsStr = JSON.stringify(tags);
      const currentProjectId = projectId || '';
      const currentFeaturesStr = JSON.stringify(generatedFeatures);
      const currentTasksStr = JSON.stringify(generatedTasks);
      const currentCanvasStr = canvasData ? JSON.stringify(canvasData) : '';

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
        // We use the mutation directly without optimistic updates to ensure the request fires
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
  // This handles both features AND tasks being added to a roadmap/pipeline
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
        // Handle both selected features AND selected tasks
        const selectedFeatures = generatedFeatures.filter(f => f.isSelected);
        const selectedTasks = generatedTasks.filter(t => t.isSelected);
        
        let totalCreated = 0;
        let totalFailed = 0;
        
        // Create features in pipeline
        if (selectedFeatures.length > 0) {
          const featureResult = await createFeaturesFromGenerated(selectedFeatures, featureOptions);
          totalCreated += featureResult.totalCreated;
          totalFailed += featureResult.totalFailed;
          if (featureResult.totalCreated > 0) {
            setGeneratedFeatures(prev => prev.filter(f => !f.isSelected));
          }
        }
        
        // Convert tasks to features and add to pipeline
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
  // This handles both tasks AND features being added as tasks
  const handleConfirmTaskCreation = useCallback(async (projectId: string | null, newProjectName?: string) => {
    setIsCreating(true);
    try {
      // Create new project if needed
      let targetProjectId = projectId;
      if (newProjectName) {
        const newTab = await addTab(newProjectName);
        targetProjectId = newTab.id;
        // Set the newly created tab as active so it shows when navigating to Tasks
        setActiveTab(newTab.id);
        toast.success(`Project "${newProjectName}" created`);
      } else if (projectId) {
        // Set the selected project as active tab
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
        // Handle both selected tasks AND selected features
        const selectedTasks = generatedTasks.filter(t => t.isSelected);
        const selectedFeatures = generatedFeatures.filter(f => f.isSelected);
        
        let totalCreated = 0;
        let totalFailed = 0;
        
        // Create tasks
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
        
        // Convert features to tasks and create
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
      // Add to generated tasks list for display
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
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {isSaving ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Saving...</span>
            </div>
          ) : lastSavedAt ? (
            <div className="flex items-center gap-1.5 text-muted-foreground/80">
              <Check className="h-3.5 w-3.5" />
              <span>Saved</span>
            </div>
          ) : null}
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
                onValueChange={(val) => {
                  if (val === 'create-new') {
                    setShowCreateProjectDialog(true);
                  } else {
                    setProjectId(val === 'none' ? undefined : val);
                  }
                }}
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
                  <SelectItem value="create-new" className="text-primary">
                    <span className="flex items-center gap-2">
                      <Plus className="h-3.5 w-3.5" />
                      Create New Project
                    </span>
                  </SelectItem>
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
              savedFeatures={generatedFeatures}
              onFeaturesGenerated={handleFeaturesGenerated}
              onTasksGenerated={handleTasksGenerated}
            />
          </div>

          {/* PRD Canvas - Whiteboard for visual planning */}
          {/* IMPORTANT: Only render PRDCanvas after note is loaded to ensure initialData is available
              The PRDCanvas component memoizes initialData on first render, so we must wait for note data */}
          <div className="px-8 pb-6">
            {isNoteLoaded ? (
              <PRDCanvas
                key={`canvas-${noteId}`} // Force remount if noteId changes
                ref={canvasRef}
                initialData={initialCanvasData}
                onChange={handleCanvasChange}
                prdContent={prdPlainText}
                productDescription={title}
                defaultCollapsed={false}
                onGenerateContent={handleGenerateCanvasContent}
                isGenerating={isCanvasGenerating}
                generatingType={canvasGeneratingType}
              />
            ) : (
              <div className="border rounded-lg bg-card overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
                <div className="h-[400px] flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>

          {/* Generated Items Section */}
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
