'use client';

import { useState, useCallback, useRef, useEffect, forwardRef, useImperativeHandle, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Maximize2,
  Minimize2,
  Download,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Loader2,
  LayoutGrid,
  GitBranch,
  AlertTriangle,
  BarChart3,
  Table,
  Layers,
  Monitor,
  Target,
  Users,
  Shield,
  Kanban,
  Code,
  Calendar,
  UserCircle,
  Trash2,
  FileText,
  FolderOpen,
  Keyboard,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { CANVAS_TEMPLATES, type CanvasTemplateType } from '@/lib/ai/canvas-templates';
import { CanvasAnnotations, type CanvasAnnotation, type AnnotationReply } from './canvas-annotations';
import { CanvasPresence, CollaboratorCursors } from './canvas-presence';
// Dialog no longer used - fullscreen uses CSS fixed positioning instead
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';

// Use generic types for Excalidraw to avoid import issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExcalidrawElement = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AppState = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BinaryFiles = any;

// Load Excalidraw CSS on client side
if (typeof window !== 'undefined' && !document.getElementById('excalidraw-css')) {
  const link = document.createElement('link');
  link.id = 'excalidraw-css';
  link.rel = 'stylesheet';
  link.href = '/excalidraw.css';
  document.head.appendChild(link);
}

// Dynamically import Excalidraw to avoid SSR issues
const Excalidraw = dynamic(
  async () => {
    const mod = await import('@excalidraw/excalidraw');
    return mod.Excalidraw;
  },
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    ),
  }
);

// ============================================================================
// TYPES
// ============================================================================

export type CanvasGenerationType =
  | 'information-architecture'
  | 'user-flow'
  | 'edge-cases'
  | 'competitive-analysis'
  | 'system-architecture'
  | 'data-model'
  | 'journey-map'
  | 'wireframe'
  | 'feature-priority'
  | 'stakeholder-map'
  | 'risk-matrix'
  | 'sprint-planning'
  | 'api-design'
  | 'release-timeline'
  | 'persona';

export interface CanvasData {
  elements: ExcalidrawElement[];
  appState?: Partial<AppState>;
  files?: BinaryFiles;
  annotations?: CanvasAnnotation[];
}

export interface GeneratedCanvasContent {
  type: CanvasGenerationType;
  elements: ExcalidrawElement[];
  title: string;
  description: string;
}

export interface PRDCanvasProps {
  /** Initial canvas data */
  initialData?: CanvasData;
  /** Callback when canvas changes */
  onChange?: (data: CanvasData) => void;
  /** PRD content for AI generation context */
  prdContent?: string;
  /** Product description for context */
  productDescription?: string;
  /** Whether the canvas is in read-only mode */
  readOnly?: boolean;
  /** Whether to show the mini view by default */
  defaultCollapsed?: boolean;
  /** Callback for AI generation - receives type and existing elements for positioning */
  onGenerateContent?: (type: CanvasGenerationType, existingElements: any[]) => Promise<GeneratedCanvasContent | null>;
  /** Whether AI generation is in progress */
  isGenerating?: boolean;
  /** Current generation type */
  generatingType?: CanvasGenerationType | null;
}

export interface PRDCanvasRef {
  getCanvasData: () => CanvasData | null;
  setCanvasData: (data: CanvasData) => void;
  addElements: (elements: ExcalidrawElement[]) => void;
  clearCanvas: () => void;
  exportToSVG: () => Promise<string | null>;
  exportToPNG: () => Promise<Blob | null>;
}

// Generation option categories for organized dropdown
type GenerationCategory = 'planning' | 'technical' | 'analysis' | 'agile';

interface GenerationOption {
  type: CanvasGenerationType;
  label: string;
  description: string;
  icon: React.ReactNode;
  category: GenerationCategory;
}

// Generation options with icons and descriptions
const GENERATION_OPTIONS: GenerationOption[] = [
  // Planning & Design
  {
    type: 'information-architecture',
    label: 'Information Architecture',
    description: 'Generate sitemap and content hierarchy',
    icon: <LayoutGrid className="h-4 w-4" />,
    category: 'planning',
  },
  {
    type: 'user-flow',
    label: 'User Flow',
    description: 'Create user journey and interaction flows',
    icon: <GitBranch className="h-4 w-4" />,
    category: 'planning',
  },
  {
    type: 'journey-map',
    label: 'User Journey Map',
    description: 'Timeline-based user experience map',
    icon: <FileText className="h-4 w-4" />,
    category: 'planning',
  },
  {
    type: 'wireframe',
    label: 'Wireframe',
    description: 'Screen layout wireframe',
    icon: <Monitor className="h-4 w-4" />,
    category: 'planning',
  },
  {
    type: 'persona',
    label: 'User Persona',
    description: 'User persona visualization',
    icon: <UserCircle className="h-4 w-4" />,
    category: 'planning',
  },
  // Technical
  {
    type: 'system-architecture',
    label: 'System Architecture',
    description: 'Technical architecture diagram',
    icon: <Layers className="h-4 w-4" />,
    category: 'technical',
  },
  {
    type: 'data-model',
    label: 'Data Model',
    description: 'Entity relationship diagram',
    icon: <Table className="h-4 w-4" />,
    category: 'technical',
  },
  {
    type: 'api-design',
    label: 'API Design',
    description: 'API endpoint visualization',
    icon: <Code className="h-4 w-4" />,
    category: 'technical',
  },
  // Analysis & Strategy
  {
    type: 'competitive-analysis',
    label: 'Competitive Analysis',
    description: 'Visual comparison with competitors',
    icon: <BarChart3 className="h-4 w-4" />,
    category: 'analysis',
  },
  {
    type: 'edge-cases',
    label: 'Edge Cases & Error States',
    description: 'Map out edge cases and error handling',
    icon: <AlertTriangle className="h-4 w-4" />,
    category: 'analysis',
  },
  {
    type: 'risk-matrix',
    label: 'Risk Matrix',
    description: 'Risk assessment visualization',
    icon: <Shield className="h-4 w-4" />,
    category: 'analysis',
  },
  {
    type: 'stakeholder-map',
    label: 'Stakeholder Map',
    description: 'Stakeholder relationship diagram',
    icon: <Users className="h-4 w-4" />,
    category: 'analysis',
  },
  {
    type: 'feature-priority',
    label: 'Feature Priority Matrix',
    description: 'Impact vs effort quadrant',
    icon: <Target className="h-4 w-4" />,
    category: 'analysis',
  },
  // Agile & Project Management
  {
    type: 'sprint-planning',
    label: 'Sprint Planning',
    description: 'Sprint board visualization',
    icon: <Kanban className="h-4 w-4" />,
    category: 'agile',
  },
  {
    type: 'release-timeline',
    label: 'Release Timeline',
    description: 'Roadmap and milestones',
    icon: <Calendar className="h-4 w-4" />,
    category: 'agile',
  },
];

// Group options by category
const CATEGORY_LABELS: Record<GenerationCategory, string> = {
  planning: '📐 Planning & Design',
  technical: '⚙️ Technical',
  analysis: '📊 Analysis & Strategy',
  agile: '🚀 Agile & PM',
};

// Keyboard shortcuts configuration
const KEYBOARD_SHORTCUTS = [
  { key: '⌘/Ctrl + Shift + F', action: 'Toggle fullscreen' },
  { key: '⌘/Ctrl + Shift + E', action: 'Export as PNG' },
  { key: '⌘/Ctrl + Shift + S', action: 'Export as SVG' },
  { key: '⌘/Ctrl + Shift + C', action: 'Clear canvas' },
  { key: 'Escape', action: 'Collapse/Exit fullscreen' },
];

// Keyboard shortcuts help popover
const KeyboardShortcutsHelp = () => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Keyboard className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="w-64 p-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2 font-medium text-sm border-b pb-2 mb-2">
            <Keyboard className="h-4 w-4" />
            Keyboard Shortcuts
          </div>
          {KEYBOARD_SHORTCUTS.map((shortcut, i) => (
            <div key={i} className="flex justify-between text-xs">
              <span className="text-muted-foreground">{shortcut.action}</span>
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">
                {shortcut.key}
              </kbd>
            </div>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

// Get options grouped by category
const getOptionsByCategory = (category: GenerationCategory) =>
  GENERATION_OPTIONS.filter(opt => opt.category === category);

// Render categorized menu items component
const CategorizedMenuItems = ({
  onGenerate,
  isGenerating,
  generatingType,
}: {
  onGenerate: (type: CanvasGenerationType) => void;
  isGenerating: boolean;
  generatingType: CanvasGenerationType | null;
}) => {
  const categories: GenerationCategory[] = ['planning', 'technical', 'analysis', 'agile'];

  return (
    <>
      {categories.map((category, catIndex) => (
        <div key={category}>
          {catIndex > 0 && <DropdownMenuSeparator />}
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            {CATEGORY_LABELS[category]}
          </DropdownMenuLabel>
          {getOptionsByCategory(category).map((option) => (
            <DropdownMenuItem
              key={option.type}
              onClick={() => onGenerate(option.type)}
              disabled={isGenerating}
              className="flex items-start gap-3 py-2"
            >
              <span className="mt-0.5 text-muted-foreground">{option.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{option.label}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {option.description}
                </div>
              </div>
              {generatingType === option.type && (
                <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
              )}
            </DropdownMenuItem>
          ))}
        </div>
      ))}
    </>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const PRDCanvas = forwardRef<PRDCanvasRef, PRDCanvasProps>(function PRDCanvas(
  {
    initialData,
    onChange,
    prdContent,
    productDescription,
    readOnly = false,
    defaultCollapsed = true,
    onGenerateContent,
    isGenerating = false,
    generatingType = null,
  },
  ref
) {
  // When defaultCollapsed is false, never allow collapsing - always show the canvas
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  // Track if collapsing is allowed (only when defaultCollapsed is true)
  const allowCollapse = defaultCollapsed;
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const [annotations, setAnnotations] = useState<CanvasAnnotation[]>(initialData?.annotations || []);
  const containerRef = useRef<HTMLDivElement>(null);

  // Use ref for excalidrawAPI to avoid re-renders when it changes
  const excalidrawAPIRef = useRef<any>(null);
  
  // Store pending elements to add when Excalidraw mounts (for when generation happens while collapsed)
  const pendingElementsRef = useRef<ExcalidrawElement[] | null>(null);

  // Use ref for annotations to avoid infinite loops in onChange callback
  const annotationsRef = useRef<CanvasAnnotation[]>(annotations);
  useEffect(() => {
    annotationsRef.current = annotations;
  }, [annotations]);

  // Current user for annotations (default fallback)
  const currentUser = 'Current User';

  // Track if we have content
  useEffect(() => {
    if (initialData?.elements && initialData.elements.length > 0) {
      setHasContent(true);
    }
  }, [initialData]);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    getCanvasData: () => {
      if (!excalidrawAPIRef.current) return null;
      return {
        elements: excalidrawAPIRef.current.getSceneElements(),
        appState: excalidrawAPIRef.current.getAppState(),
        files: excalidrawAPIRef.current.getFiles(),
      };
    },
    setCanvasData: (data: CanvasData) => {
      if (!excalidrawAPIRef.current) return;
      excalidrawAPIRef.current.updateScene({
        elements: data.elements,
        appState: data.appState,
      });
      if (data.files) {
        excalidrawAPIRef.current.addFiles(Object.values(data.files));
      }
      setHasContent(data.elements.length > 0);
    },
    addElements: (elements: ExcalidrawElement[]) => {
      if (!excalidrawAPIRef.current) return;
      const currentElements = excalidrawAPIRef.current.getSceneElements();
      excalidrawAPIRef.current.updateScene({
        elements: [...currentElements, ...elements],
      });
      setHasContent(true);
    },
    clearCanvas: () => {
      if (!excalidrawAPIRef.current) return;
      excalidrawAPIRef.current.updateScene({ elements: [] });
      setHasContent(false);
    },
    exportToSVG: async () => {
      if (!excalidrawAPIRef.current) return null;
      const { exportToSvg } = await import('@excalidraw/excalidraw');
      const svg = await exportToSvg({
        elements: excalidrawAPIRef.current.getSceneElements(),
        appState: excalidrawAPIRef.current.getAppState(),
        files: excalidrawAPIRef.current.getFiles(),
      });
      return svg.outerHTML;
    },
    exportToPNG: async () => {
      if (!excalidrawAPIRef.current) return null;
      const { exportToBlob } = await import('@excalidraw/excalidraw');
      return exportToBlob({
        elements: excalidrawAPIRef.current.getSceneElements(),
        appState: excalidrawAPIRef.current.getAppState(),
        files: excalidrawAPIRef.current.getFiles(),
        mimeType: 'image/png',
      });
    },
  }));

  // Stable callback for excalidraw API
  const handleExcalidrawAPI = useCallback((api: any) => {
    excalidrawAPIRef.current = api;
    
    // Apply any pending elements that were generated while collapsed
    if (api && pendingElementsRef.current && pendingElementsRef.current.length > 0) {
      const pendingCount = pendingElementsRef.current.length;
      
      // Small delay to ensure Excalidraw is fully initialized
      setTimeout(() => {
        if (excalidrawAPIRef.current && pendingElementsRef.current) {
          const currentElements = excalidrawAPIRef.current.getSceneElements();
          const newElements = [...currentElements, ...pendingElementsRef.current];
          
          excalidrawAPIRef.current.updateScene({
            elements: newElements,
            commitToHistory: true,
          });
          
          // Scroll to content
          setTimeout(() => {
            if (excalidrawAPIRef.current) {
              excalidrawAPIRef.current.scrollToContent();
            }
          }, 50);
          
          // Clear pending elements
          pendingElementsRef.current = null;
          
          // Trigger onChange
          onChange?.({
            elements: newElements,
            appState: excalidrawAPIRef.current.getAppState(),
            files: excalidrawAPIRef.current.getFiles(),
            annotations: annotationsRef.current,
          });
          
          if (process.env.NODE_ENV === 'development') {
            console.log(`[PRDCanvas] Applied ${pendingCount} pending elements`);
          }
        }
      }, 100);
    }
  }, [onChange]);

  // Stable UI options
  const uiOptions = useMemo(() => ({
    canvasActions: {
      loadScene: false,
      export: false as const,
      saveToActiveFile: false,
    },
  }), []);

  // Use ref to track hasContent to avoid triggering re-renders in handleChange
  const hasContentRef = useRef(hasContent);
  useEffect(() => {
    hasContentRef.current = hasContent;
  }, [hasContent]);

  // Handle canvas changes - use refs to avoid infinite loops and unnecessary re-renders
  const handleChange = useCallback(
    (elements: readonly ExcalidrawElement[], appState: AppState, files: BinaryFiles) => {
      // Only update hasContent if it actually changes - use ref to check current value
      const currentHasContent = hasContentRef.current;
      if (elements.length > 0 && !currentHasContent) {
        setHasContent(true);
      } else if (elements.length === 0 && currentHasContent) {
        setHasContent(false);
      }

      onChange?.({
        elements: elements as ExcalidrawElement[],
        appState,
        files,
        annotations: annotationsRef.current,
      });
    },
    [onChange] // Removed hasContent from dependencies
  );

  // Annotation handlers
  const handleAddAnnotation = useCallback((annotation: Omit<CanvasAnnotation, 'id' | 'createdAt'>) => {
    const newAnnotation: CanvasAnnotation = {
      ...annotation,
      id: `ann-${Date.now()}`,
      createdAt: new Date(),
    };
    setAnnotations(prev => {
      const updated = [...prev, newAnnotation];
      // Trigger onChange with updated annotations
      if (excalidrawAPIRef.current) {
        onChange?.({
          elements: excalidrawAPIRef.current.getSceneElements(),
          appState: excalidrawAPIRef.current.getAppState(),
          files: excalidrawAPIRef.current.getFiles(),
          annotations: updated,
        });
      }
      return updated;
    });
  }, [onChange]);

  const handleUpdateAnnotation = useCallback((id: string, updates: Partial<CanvasAnnotation>) => {
    setAnnotations(prev => {
      const updated = prev.map(a => a.id === id ? { ...a, ...updates } : a);
      if (excalidrawAPIRef.current) {
        onChange?.({
          elements: excalidrawAPIRef.current.getSceneElements(),
          appState: excalidrawAPIRef.current.getAppState(),
          files: excalidrawAPIRef.current.getFiles(),
          annotations: updated,
        });
      }
      return updated;
    });
  }, [onChange]);

  const handleDeleteAnnotation = useCallback((id: string) => {
    setAnnotations(prev => {
      const updated = prev.filter(a => a.id !== id);
      if (excalidrawAPIRef.current) {
        onChange?.({
          elements: excalidrawAPIRef.current.getSceneElements(),
          appState: excalidrawAPIRef.current.getAppState(),
          files: excalidrawAPIRef.current.getFiles(),
          annotations: updated,
        });
      }
      return updated;
    });
  }, [onChange]);

  const handleAddReply = useCallback((annotationId: string, reply: Omit<AnnotationReply, 'id' | 'createdAt'>) => {
    const newReply: AnnotationReply = {
      ...reply,
      id: `reply-${Date.now()}`,
      createdAt: new Date(),
    };
    setAnnotations(prev => {
      const updated = prev.map(a =>
        a.id === annotationId
          ? { ...a, replies: [...(a.replies || []), newReply] }
          : a
      );
      if (excalidrawAPIRef.current) {
        onChange?.({
          elements: excalidrawAPIRef.current.getSceneElements(),
          appState: excalidrawAPIRef.current.getAppState(),
          files: excalidrawAPIRef.current.getFiles(),
          annotations: updated,
        });
      }
      return updated;
    });
  }, [onChange]);

  // Handle generation with robust error handling
  const handleGenerate = async (type: CanvasGenerationType) => {
    if (!onGenerateContent) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[PRDCanvas] onGenerateContent callback not provided');
      }
      return;
    }

    try {
      // Get existing elements to pass to generator for proper positioning
      const existingElements = excalidrawAPIRef.current 
        ? excalidrawAPIRef.current.getSceneElements() 
        : (initialData?.elements || []);
      
      const result = await onGenerateContent(type, existingElements);

      // Validate result
      if (!result) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[PRDCanvas] Generation returned null result');
        }
        return;
      }

      if (!result.elements || !Array.isArray(result.elements)) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[PRDCanvas] Generation returned invalid elements:', result);
        }
        return;
      }

      if (result.elements.length === 0) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[PRDCanvas] Generation returned empty elements array');
        }
        return;
      }

      // Filter out any invalid elements before adding to canvas
      const validElements = result.elements.filter((el: any) => 
        el && typeof el === 'object' && el.type && el.id
      );

      if (validElements.length === 0) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[PRDCanvas] No valid elements after filtering');
        }
        return;
      }

      setHasContent(true);
      
      if (excalidrawAPIRef.current) {
        // Excalidraw is mounted - add elements directly
        const currentElements = excalidrawAPIRef.current.getSceneElements();
        const newElements = [...currentElements, ...validElements];

        // Update scene with history commit to ensure undo works and UI updates
        excalidrawAPIRef.current.updateScene({
          elements: newElements,
          commitToHistory: true,
        });

        // Force a scroll to content after a small delay to ensure scene is updated
        setTimeout(() => {
          if (excalidrawAPIRef.current) {
            excalidrawAPIRef.current.scrollToContent();
          }
        }, 100);

        setIsCollapsed(false); // Expand to show generated content

        // Explicitly trigger onChange to ensure persistence
        onChange?.({
          elements: newElements,
          appState: excalidrawAPIRef.current.getAppState(),
          files: excalidrawAPIRef.current.getFiles(),
          annotations: annotationsRef.current,
        });

        if (process.env.NODE_ENV === 'development') {
          console.log(`[PRDCanvas] Added ${validElements.length} elements to canvas`);
        }
      } else {
        // Excalidraw not mounted (collapsed view) - store elements as pending
        pendingElementsRef.current = validElements;
        
        // Expand to mount Excalidraw - the handleExcalidrawAPI callback will apply the pending elements
        setIsCollapsed(false);

        if (process.env.NODE_ENV === 'development') {
          console.log(`[PRDCanvas] Stored ${validElements.length} elements as pending (canvas collapsed)`);
        }
      }
    } catch (error) {
      // Log error in development, but don't crash in production
      console.error('[PRDCanvas] Error during generation:', error instanceof Error ? error.message : error);
      
      // Could emit an event or call an error callback here for user notification
      // For now, we silently fail and let the parent component handle loading state
    }
  };

  // Handle template selection
  const handleLoadTemplate = (templateId: CanvasTemplateType) => {
    const template = CANVAS_TEMPLATES.find(t => t.id === templateId);
    if (!template || !excalidrawAPIRef.current) return;

    if (templateId === 'blank') {
      // Clear canvas for blank template
      excalidrawAPIRef.current.updateScene({ elements: [] });
      setHasContent(false);
    } else {
      // Load template elements
      const currentElements = excalidrawAPIRef.current.getSceneElements();
      // Add offset if there are existing elements
      const offsetX = currentElements.length > 0 ? 700 : 0;
      const offsetElements = template.elements.map((el: any) => ({
        ...el,
        id: `${el.id}-${Date.now()}`, // Unique IDs
        x: (el.x || 0) + offsetX,
      }));
      excalidrawAPIRef.current.updateScene({
        elements: [...currentElements, ...offsetElements],
      });
      excalidrawAPIRef.current.scrollToContent();
      setHasContent(true);
    }
    setIsCollapsed(false);
  };

  // Clear canvas
  const handleClearCanvas = useCallback(() => {
    if (!excalidrawAPIRef.current) return;
    excalidrawAPIRef.current.updateScene({ elements: [] });
    setHasContent(false);
  }, []);

  // Export handlers
  const handleExportPNG = useCallback(async () => {
    if (!excalidrawAPIRef.current) return;
    const { exportToBlob } = await import('@excalidraw/excalidraw');
    const blob = await exportToBlob({
      elements: excalidrawAPIRef.current.getSceneElements(),
      appState: excalidrawAPIRef.current.getAppState(),
      files: excalidrawAPIRef.current.getFiles(),
      mimeType: 'image/png',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'prd-canvas.png';
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleExportSVG = useCallback(async () => {
    if (!excalidrawAPIRef.current) return;
    const { exportToSvg } = await import('@excalidraw/excalidraw');
    const svg = await exportToSvg({
      elements: excalidrawAPIRef.current.getSceneElements(),
      appState: excalidrawAPIRef.current.getAppState(),
      files: excalidrawAPIRef.current.getFiles(),
    });
    const blob = new Blob([svg.outerHTML], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'prd-canvas.svg';
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts when canvas is expanded or in fullscreen
      if (isCollapsed) return;

      // Check if we're in an input field
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      // Cmd/Ctrl + Shift + F: Toggle fullscreen
      if (cmdOrCtrl && e.shiftKey && e.key === 'f') {
        e.preventDefault();
        setIsFullscreen(prev => !prev);
        return;
      }

      // Cmd/Ctrl + Shift + E: Export PNG
      if (cmdOrCtrl && e.shiftKey && e.key === 'e') {
        e.preventDefault();
        handleExportPNG();
        return;
      }

      // Cmd/Ctrl + Shift + S: Export SVG
      if (cmdOrCtrl && e.shiftKey && e.key === 's') {
        e.preventDefault();
        handleExportSVG();
        return;
      }

      // Cmd/Ctrl + Shift + C: Clear canvas
      if (cmdOrCtrl && e.shiftKey && e.key === 'c') {
        e.preventDefault();
        if (confirm('Are you sure you want to clear the canvas?')) {
          handleClearCanvas();
        }
        return;
      }

      // Escape: Exit fullscreen, or collapse canvas (only if allowed)
      if (e.key === 'Escape') {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else if (allowCollapse) {
          setIsCollapsed(true);
        }
        return;
      }

      // Cmd/Ctrl + Enter: Expand canvas (when collapsed)
      if (cmdOrCtrl && e.key === 'Enter' && isCollapsed) {
        e.preventDefault();
        setIsCollapsed(false);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCollapsed, isFullscreen, allowCollapse, handleExportPNG, handleExportSVG, handleClearCanvas]);

  // Memoize initial data for Excalidraw to prevent re-initialization on every render
  // We only want to update this when the component mounts or when we explicitly want to reset
  // Since 'initialData' from props changes on every edit (due to parent state update),
  // passing it directly to Excalidraw can cause issues.
  // However, Excalidraw generally ignores initialData after mount. 
  // The critical part is preventing CanvasContent from being re-created unnecessarily.
  const excalidrawInitialData = useMemo(() => {
    // CRITICAL: Excalidraw requires collaborators to be a Map, not undefined or plain object
    // This prevents the "props.appState.collaborators.forEach is not a function" error
    const baseAppState = {
      viewBackgroundColor: '#ffffff',
      collaborators: new Map(),
    };
    
    if (!initialData) {
      return {
        elements: [],
        appState: baseAppState,
      };
    }
    
    return {
      elements: initialData.elements || [],
      appState: {
        ...baseAppState,
        ...initialData.appState,
        // Ensure collaborators is always a Map even if initialData.appState has it as something else
        collaborators: new Map(),
      },
      files: initialData.files,
    };
    // We intentionally exclude initialData from dependencies to prevent re-creation 
    // on every keystroke/edit echo from parent. 
    // We only rely on it for the FIRST render when Excalidraw mounts.
    // Use a key on the component if you need to force reset.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Use refs for callbacks to prevent Excalidraw remounting
  const onChangeRef = useRef(handleChange);
  useEffect(() => {
    onChangeRef.current = handleChange;
  }, [handleChange]);

  // Stable onChange handler that uses ref
  const stableOnChange = useCallback(
    (elements: readonly ExcalidrawElement[], appState: AppState, files: BinaryFiles) => {
      onChangeRef.current(elements, appState, files);
    },
    [] // No dependencies - always stable
  );

  // Canvas content component - memoized with minimal dependencies to prevent remounting
  // CRITICAL: Excalidraw should only remount when absolutely necessary (e.g., readOnly changes)
  // Using refs for callbacks ensures the component doesn't remount on every state change
  const CanvasContent = useMemo(() => (
    <div className="h-full w-full">
      <Excalidraw
        excalidrawAPI={handleExcalidrawAPI}
        initialData={excalidrawInitialData}
        onChange={stableOnChange}
        viewModeEnabled={readOnly}
        zenModeEnabled={false}
        gridModeEnabled={false}
        theme="light"
        UIOptions={uiOptions}
      />
    </div>
  ), [handleExcalidrawAPI, excalidrawInitialData, stableOnChange, readOnly, uiOptions]);

  // Collapsed mini view - Don't render Excalidraw here to avoid infinite loops
  // Only show collapsed view if collapsing is allowed AND currently collapsed
  if (allowCollapse && isCollapsed) {
    return (
      <div
        ref={containerRef}
        className="border rounded-lg bg-card overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">PRD Canvas</span>
            {hasContent && (
              <Badge variant="secondary" className="text-xs">
                Has content
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* AI Generate Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isGenerating}
                  className="gap-2"
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {isGenerating ? 'Generating...' : 'AI Generate'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72 max-h-[70vh] overflow-y-auto">
                <CategorizedMenuItems
                  onGenerate={handleGenerate}
                  isGenerating={isGenerating}
                  generatingType={generatingType}
                />
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(false)}
              className="gap-1"
            >
              <ChevronDown className="h-4 w-4" />
              Expand
            </Button>
          </div>
        </div>

        {/* Mini Preview - Static placeholder instead of rendering Excalidraw */}
        <div
          className="h-32 bg-muted/10 cursor-pointer relative overflow-hidden"
          onClick={() => setIsCollapsed(false)}
        >
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Layers className="h-8 w-8 mx-auto mb-2 opacity-50" />
              {hasContent ? (
                <>
                  <p className="text-sm">Canvas has content</p>
                  <p className="text-xs">Click to expand and view</p>
                </>
              ) : (
                <>
                  <p className="text-sm">Click to expand canvas</p>
                  <p className="text-xs">Use AI to generate diagrams</p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Header component - reused in both views
  const CanvasHeader = ({ inFullscreen = false }: { inFullscreen?: boolean }) => (
    <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30 flex-shrink-0">
      <div className="flex items-center gap-2">
        <Layers className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium text-sm">
          PRD Canvas{inFullscreen ? ' - Fullscreen' : ''}
        </span>
      </div>
      <div className="flex items-center gap-1">
        {/* AI Generate Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={isGenerating}
              className="gap-2"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {isGenerating ? 'Generating...' : 'AI Generate'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72 max-h-[70vh] overflow-y-auto">
            <CategorizedMenuItems
              onGenerate={handleGenerate}
              isGenerating={isGenerating}
              generatingType={generatingType}
            />
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Templates Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <FolderOpen className="h-4 w-4" />
              Templates
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Quick Start Templates</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {CANVAS_TEMPLATES.filter(t => t.id !== 'blank').map((template) => (
              <DropdownMenuItem
                key={template.id}
                onClick={() => handleLoadTemplate(template.id)}
                className="flex items-center gap-3"
              >
                <span className="text-lg">{template.thumbnail}</span>
                <div>
                  <div className="font-medium text-sm">{template.name}</div>
                  <div className="text-xs text-muted-foreground">{template.description}</div>
                </div>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleClearCanvas} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Canvas
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Comments/Annotations */}
        <CanvasAnnotations
          annotations={annotations}
          onAddAnnotation={handleAddAnnotation}
          onUpdateAnnotation={handleUpdateAnnotation}
          onDeleteAnnotation={handleDeleteAnnotation}
          onAddReply={handleAddReply}
          currentUser={currentUser}
        />

        {/* Collaboration Presence */}
        <CanvasPresence />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Download className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleExportPNG}>
              Export as PNG
              <kbd className="ml-auto text-xs text-muted-foreground">⇧⌘E</kbd>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportSVG}>
              Export as SVG
              <kbd className="ml-auto text-xs text-muted-foreground">⇧⌘S</kbd>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <KeyboardShortcutsHelp />

        {inFullscreen ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setIsFullscreen(false)}
                >
                  <Minimize2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <span>Exit Fullscreen</span>
                <kbd className="ml-2 text-xs">Esc</kbd>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setIsFullscreen(true)}
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <span>Fullscreen</span>
                  <kbd className="ml-2 text-xs">⇧⌘F</kbd>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {allowCollapse && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setIsCollapsed(true)}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <span>Collapse</span>
                    <kbd className="ml-2 text-xs">Esc</kbd>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </>
        )}
      </div>
    </div>
  );

  // Expanded view - SINGLE container that changes style based on fullscreen
  // This ensures Excalidraw component stays mounted and doesn't lose state
  return (
    <div
      ref={containerRef}
      className={
        isFullscreen
          ? 'fixed inset-0 z-50 bg-background flex flex-col'
          : 'border rounded-lg bg-card overflow-hidden isolate'
      }
      style={isFullscreen ? undefined : { contain: 'layout paint' }}
      data-prd-canvas
    >
      {/* Header - always rendered, just with different props */}
      <CanvasHeader inFullscreen={isFullscreen} />

      {/* Canvas container - height changes based on fullscreen */}
      <div 
        className={isFullscreen ? 'flex-1 relative' : 'h-[400px] relative'}
        style={{ isolation: 'isolate' }}
      >
        {CanvasContent}
        <CollaboratorCursors />
      </div>
    </div>
  );
});

export default PRDCanvas;
