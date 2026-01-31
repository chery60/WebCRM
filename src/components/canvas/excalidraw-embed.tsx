'use client';

import { useState, useCallback, useRef, useEffect, memo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Maximize2,
  Minimize2,
  GripVertical,
  Trash2,
  Loader2,
  Sparkles,
  Download,
  FolderOpen,
  Keyboard,
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
  FileText,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { CANVAS_TEMPLATES, type CanvasTemplateType } from '@/lib/ai/canvas-templates';

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

export interface ExcalidrawEmbedData {
  elements: any[];
  appState?: any;
  files?: any;
  canvasName?: string;
  canvasId?: string;
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
  { key: 'Escape', action: 'Exit fullscreen' },
];

// Get options grouped by category
const getOptionsByCategory = (category: GenerationCategory) =>
  GENERATION_OPTIONS.filter(opt => opt.category === category);

// Keyboard shortcuts help component
const KeyboardShortcutsHelp = () => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7">
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

// Categorized menu items component
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

export interface GeneratedCanvasContent {
  type: CanvasGenerationType;
  elements: any[];
  title: string;
  description: string;
}

export interface ExcalidrawEmbedProps {
  /** Initial canvas data */
  data?: ExcalidrawEmbedData;
  /** Callback when canvas changes */
  onChange?: (data: ExcalidrawEmbedData) => void;
  /** Callback to delete the embed */
  onDelete?: () => void;
  /** Whether the embed is selected in the editor */
  selected?: boolean;
  /** Minimum height for the embed */
  minHeight?: number;
  /** Whether in read-only mode */
  readOnly?: boolean;
  /** Callback for AI generation */
  onGenerateContent?: (type: CanvasGenerationType) => Promise<GeneratedCanvasContent | null>;
  /** Whether AI generation is in progress */
  isGenerating?: boolean;
  /** Current generation type */
  generatingType?: CanvasGenerationType | null;
  /** Canvas identification and management */
  canvasId?: string;
  canvasName?: string;
  onCanvasNameChange?: (name: string) => void;
  onExpand?: () => void;
}

// ============================================================================
// EXCALIDRAW WRAPPER - Handles dynamic import and rendering
// ============================================================================

interface ExcalidrawWrapperProps {
  initialData?: ExcalidrawEmbedData;
  onChange?: (elements: any[], appState: any, files: any) => void;
  viewModeEnabled?: boolean;
  excalidrawAPI?: (api: any) => void;
  /** Unique identifier for this canvas instance */
  instanceId?: string;
}

function ExcalidrawWrapper({
  initialData,
  onChange,
  viewModeEnabled = false,
  excalidrawAPI,
  instanceId = 'inline-canvas'
}: ExcalidrawWrapperProps) {
  const [Excalidraw, setExcalidraw] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Defer mounting to avoid flushSync conflict with TipTap's ReactNodeViewRenderer
  // This ensures Excalidraw mounts outside of React's render cycle
  const [isMountReady, setIsMountReady] = useState(false);

  // Defer mounting to next frame to avoid flushSync conflict with TipTap
  useEffect(() => {
    // Use requestAnimationFrame to move out of TipTap's React render cycle
    // This prevents "flushSync was called from inside a lifecycle method" error
    const animationFrame = requestAnimationFrame(() => {
      setIsMountReady(true);
    });
    return () => cancelAnimationFrame(animationFrame);
  }, []);

  useEffect(() => {
    // Don't load until mount is ready
    if (!isMountReady) return;

    let mounted = true;

    // Load Excalidraw CSS from public folder
    const loadCSS = () => {
      if (typeof window !== 'undefined' && !document.getElementById('excalidraw-css')) {
        const link = document.createElement('link');
        link.id = 'excalidraw-css';
        link.rel = 'stylesheet';
        link.href = '/excalidraw.css';
        document.head.appendChild(link);
      }
    };

    const loadExcalidraw = async () => {
      try {
        // Load CSS first
        loadCSS();

        // Dynamically import Excalidraw
        const excalidrawModule = await import('@excalidraw/excalidraw');

        if (mounted) {
          setExcalidraw(() => excalidrawModule.Excalidraw);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Failed to load Excalidraw:', error);
        setIsLoading(false);
      }
    };

    loadExcalidraw();

    return () => {
      mounted = false;
    };
  }, [isMountReady]);

  if (!isMountReady || isLoading || !Excalidraw) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-muted/20">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading canvas...</span>
        </div>
      </div>
    );
  }

  // CRITICAL: Excalidraw requires collaborators to be a Map, not undefined or plain object
  // This prevents the "props.appState.collaborators.forEach is not a function" error
  const baseAppState = {
    viewBackgroundColor: '#ffffff',
    currentItemFontFamily: 1,
    collaborators: new Map(),
  };

  const excalidrawInitialData = initialData ? {
    elements: initialData.elements || [],
    appState: {
      ...baseAppState,
      ...initialData.appState,
      // Ensure collaborators is always a Map
      collaborators: new Map(),
    },
    files: initialData.files || {},
  } : {
    elements: [],
    appState: baseAppState,
  };

  return (
    <Excalidraw
      excalidrawAPI={excalidrawAPI}
      initialData={excalidrawInitialData}
      onChange={onChange}
      viewModeEnabled={viewModeEnabled}
      zenModeEnabled={false}
      gridModeEnabled={false}
      theme="light"
      name={`Canvas-${instanceId}`}
      UIOptions={{
        canvasActions: {
          loadScene: true,
          export: { saveFileToDisk: true },
          saveToActiveFile: false,
          clearCanvas: true,
          changeViewBackgroundColor: true,
          toggleTheme: true,
        },
        tools: {
          image: true,
        },
      }}
      langCode="en"
    />
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const ExcalidrawEmbed = memo(function ExcalidrawEmbed({
  data,
  onChange,
  onDelete,
  selected = false,
  minHeight = 400,
  readOnly = false,
  onGenerateContent,
  isGenerating = false,
  generatingType = null,
  canvasId,
  canvasName = 'Untitled Canvas',
  onCanvasNameChange,
  onExpand,
}: ExcalidrawEmbedProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [height, setHeight] = useState(minHeight);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const excalidrawAPIRef = useRef<any>(null);
  const resizeStartY = useRef<number>(0);
  const resizeStartHeight = useRef<number>(0);

  // Controlled dropdown states - needed because TipTap NodeView interferes with Radix triggers
  const [aiDropdownOpen, setAiDropdownOpen] = useState(false);
  const [templatesDropdownOpen, setTemplatesDropdownOpen] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);

  // Generate a stable unique ID for this canvas instance
  const instanceIdRef = useRef<string>(`embed-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

  // Track the last known elements count for detecting external data changes
  const lastDataHashRef = useRef<string>('');
  // Flag to prevent onChange from firing when we're applying external updates
  const isApplyingExternalUpdateRef = useRef(false);

  // Handle Excalidraw API
  const handleExcalidrawAPI = useCallback((api: any) => {
    excalidrawAPIRef.current = api;
    // Store initial data hash when API is ready
    if (api && data?.elements) {
      lastDataHashRef.current = JSON.stringify(data.elements.map((e: any) => e.id).sort());
    }
  }, [data?.elements]);

  // Handle external data changes (e.g., from expanded view sync)
  // Excalidraw ignores initialData changes after mount, so we need to use updateScene
  useEffect(() => {
    if (!excalidrawAPIRef.current || !data?.elements || isApplyingExternalUpdateRef.current) return;

    // Create a hash of element IDs to detect if data actually changed
    const newDataHash = JSON.stringify(data.elements.map((e: any) => e.id).sort());

    // Only update if the data actually changed (different elements)
    if (newDataHash !== lastDataHashRef.current) {
      // Check if the change is from external source (more elements than current)
      const currentElements = excalidrawAPIRef.current.getSceneElements();
      const currentHash = JSON.stringify(currentElements.map((e: any) => e.id).sort());

      // If the new data has different elements than what's in Excalidraw, apply the update
      if (newDataHash !== currentHash) {
        isApplyingExternalUpdateRef.current = true;

        excalidrawAPIRef.current.updateScene({
          elements: data.elements,
          appState: data.appState ? {
            ...data.appState,
            collaborators: new Map(),
          } : undefined,
          commitToHistory: true,
        });

        // Scroll to content after update
        setTimeout(() => {
          excalidrawAPIRef.current?.scrollToContent();
          isApplyingExternalUpdateRef.current = false;
        }, 100);

        lastDataHashRef.current = newDataHash;
      }
    }
  }, [data?.elements, data?.appState]);

  // Handle AI generation
  const handleGenerate = useCallback(async (type: CanvasGenerationType) => {
    if (!onGenerateContent) return;

    try {
      const result = await onGenerateContent(type);
      if (!result || !result.elements || result.elements.length === 0) return;

      if (excalidrawAPIRef.current) {
        const currentElements = excalidrawAPIRef.current.getSceneElements();
        const newElements = [...currentElements, ...result.elements];
        excalidrawAPIRef.current.updateScene({
          elements: newElements,
          commitToHistory: true,
        });
        setTimeout(() => {
          excalidrawAPIRef.current?.scrollToContent();
        }, 100);

        // Trigger onChange
        onChange?.({
          elements: newElements,
          appState: excalidrawAPIRef.current.getAppState(),
          files: excalidrawAPIRef.current.getFiles(),
        });
      }
    } catch (error) {
      console.error('[ExcalidrawEmbed] Generation error:', error);
    }
  }, [onGenerateContent, onChange]);

  // Handle template loading
  const handleLoadTemplate = useCallback((templateId: CanvasTemplateType) => {
    const template = CANVAS_TEMPLATES.find(t => t.id === templateId);
    if (!template || !excalidrawAPIRef.current) return;

    let newElements: any[];

    if (templateId === 'blank') {
      newElements = [];
      excalidrawAPIRef.current.updateScene({ elements: [], commitToHistory: true });
    } else {
      const currentElements = excalidrawAPIRef.current.getSceneElements();
      const offsetX = currentElements.length > 0 ? 700 : 0;
      const offsetElements = template.elements.map((el: any) => ({
        ...el,
        id: `${el.id}-${Date.now()}`,
        x: (el.x || 0) + offsetX,
      }));
      newElements = [...currentElements, ...offsetElements];
      excalidrawAPIRef.current.updateScene({
        elements: newElements,
        commitToHistory: true,
      });
      excalidrawAPIRef.current.scrollToContent();
    }

    // Trigger onChange to persist template changes
    onChange?.({
      elements: newElements,
      appState: excalidrawAPIRef.current.getAppState(),
      files: excalidrawAPIRef.current.getFiles(),
    });
  }, [onChange]);

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
    a.download = 'canvas.png';
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
    a.download = 'canvas.svg';
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // Handle canvas changes - debounced to avoid too many updates
  const handleChange = useCallback(
    (elements: readonly any[], appState: any, files: any) => {
      // Skip onChange when we're applying external updates to avoid feedback loops
      if (!onChange || isApplyingExternalUpdateRef.current) return;

      // Update the hash to track current state
      const newHash = JSON.stringify([...elements].map((e: any) => e.id).sort());
      lastDataHashRef.current = newHash;

      // Filter out sensitive/unnecessary appState properties
      const filteredAppState = {
        viewBackgroundColor: appState.viewBackgroundColor,
        currentItemFontFamily: appState.currentItemFontFamily,
        currentItemFillStyle: appState.currentItemFillStyle,
        currentItemStrokeColor: appState.currentItemStrokeColor,
        currentItemBackgroundColor: appState.currentItemBackgroundColor,
        currentItemStrokeWidth: appState.currentItemStrokeWidth,
        currentItemStrokeStyle: appState.currentItemStrokeStyle,
        currentItemRoughness: appState.currentItemRoughness,
        currentItemOpacity: appState.currentItemOpacity,
        currentItemEndArrowhead: appState.currentItemEndArrowhead,
        currentItemStartArrowhead: appState.currentItemStartArrowhead,
        scrollX: appState.scrollX,
        scrollY: appState.scrollY,
        zoom: appState.zoom,
      };

      onChange({
        elements: [...elements] as any[],
        appState: filteredAppState,
        files: files || {},
      });
    },
    [onChange]
  );

  // Handle resize
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizeStartY.current = e.clientY;
    resizeStartHeight.current = height;
  }, [height]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientY - resizeStartY.current;
      const newHeight = Math.max(minHeight, Math.min(1200, resizeStartHeight.current + delta));
      setHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, minHeight]);

  // Handle escape key for fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Helper to handle button clicks inside TipTap NodeView
  // We need to stop propagation AND prevent default to stop TipTap from interfering
  const handleDropdownTriggerClick = (
    e: React.MouseEvent,
    setOpen: React.Dispatch<React.SetStateAction<boolean>>,
    currentOpen: boolean
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(!currentOpen);
  };

  // State for inline editing of canvas name
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(canvasName);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update local state when canvasName prop changes
  useEffect(() => {
    setEditName(canvasName);
  }, [canvasName]);

  // Focus input when editing starts - use timeout to handle TipTap re-render timing
  useEffect(() => {
    if (isEditingName) {
      // Use timeout to ensure DOM has updated after React render
      const focusTimer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        } else {
        }
      }, 50);
      return () => clearTimeout(focusTimer);
    }
  }, [isEditingName]);

  // Handle name save
  const handleSaveName = useCallback(() => {
    if (editName.trim() && onCanvasNameChange) {
      onCanvasNameChange(editName.trim());
    }
    setIsEditingName(false);
  }, [editName, onCanvasNameChange]);

  // Handle name key down
  const handleNameKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveName();
    } else if (e.key === 'Escape') {
      setEditName(canvasName);
      setIsEditingName(false);
    }
  }, [handleSaveName, canvasName]);

  // Canvas Header component - reused in both views
  const CanvasHeader = ({ inFullscreen = false }: { inFullscreen?: boolean }) => (
    <div
      className="flex items-center justify-between px-4 py-2.5 border-b bg-white dark:bg-zinc-900 shrink-0 z-50"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Layers className="h-4 w-4 text-muted-foreground shrink-0" />
        {isEditingName ? (
          <input
            ref={inputRef}
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleSaveName}
            onKeyDown={handleNameKeyDown}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onFocus={(e) => e.stopPropagation()}
            data-canvas-name-input="true"
            className="font-medium text-sm bg-transparent focus:outline-none min-w-0 flex-1 px-1 border border-transparent focus:border-primary/30 rounded"
          />
        ) : (
          <span
            className={cn(
              "font-medium text-sm truncate cursor-text",
              onCanvasNameChange && "hover:bg-muted/30 rounded px-1 py-0.5 -mx-1 -my-0.5 transition-colors"
            )}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              if (onCanvasNameChange) {
                setIsEditingName(true);
              }
            }}
            title={canvasName}
          >
            {canvasName}{inFullscreen ? ' - Fullscreen' : ''}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {/* AI Generate Dropdown */}
        {onGenerateContent && (
          <DropdownMenu
            modal={true}
            open={aiDropdownOpen}
            onOpenChange={setAiDropdownOpen}
          >
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={isGenerating}
                className="gap-2 h-7"
                onClick={(e) => handleDropdownTriggerClick(e, setAiDropdownOpen, aiDropdownOpen)}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                {isGenerating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                {isGenerating ? 'Generating...' : 'AI Generate'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 max-h-[70vh] overflow-y-auto">
              <CategorizedMenuItems
                onGenerate={(type) => {
                  handleGenerate(type);
                  setAiDropdownOpen(false);
                }}
                isGenerating={isGenerating}
                generatingType={generatingType}
              />
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Templates Dropdown */}
        <DropdownMenu
          modal={true}
          open={templatesDropdownOpen}
          onOpenChange={setTemplatesDropdownOpen}
        >
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 h-7"
              onClick={(e) => handleDropdownTriggerClick(e, setTemplatesDropdownOpen, templatesDropdownOpen)}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <FolderOpen className="h-3.5 w-3.5" />
              Templates
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Quick Start Templates</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {CANVAS_TEMPLATES.filter(t => t.id !== 'blank').map((template) => (
              <DropdownMenuItem
                key={template.id}
                onClick={() => {
                  handleLoadTemplate(template.id);
                  setTemplatesDropdownOpen(false);
                }}
                className="flex items-center gap-3"
              >
                <span className="text-lg">{template.thumbnail}</span>
                <div>
                  <div className="font-medium text-sm">{template.name}</div>
                  <div className="text-xs text-muted-foreground">{template.description}</div>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Export Dropdown */}
        <DropdownMenu
          modal={true}
          open={exportDropdownOpen}
          onOpenChange={setExportDropdownOpen}
        >
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => handleDropdownTriggerClick(e, setExportDropdownOpen, exportDropdownOpen)}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <Download className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => {
              handleExportPNG();
              setExportDropdownOpen(false);
            }}>
              Export as PNG
              <kbd className="ml-auto text-xs text-muted-foreground">⇧⌘E</kbd>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              handleExportSVG();
              setExportDropdownOpen(false);
            }}>
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
                  className="h-7 w-7"
                  onClick={() => setIsFullscreen(false)}
                >
                  <Minimize2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Exit Fullscreen (Esc)</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <>
            {/* Expand button - opens in dialog/widget */}
            {onExpand && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        onExpand();
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Expand</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {!onExpand && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setIsFullscreen(true)}
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Fullscreen (⇧⌘F)</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {onDelete && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={onDelete}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Delete canvas</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </>
        )}
      </div>
    </div>
  );

  // Fullscreen mode
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col">
        <CanvasHeader inFullscreen={true} />

        {/* Fullscreen Canvas */}
        <div className="flex-1 w-full">
          <ExcalidrawWrapper
            initialData={data}
            onChange={handleChange}
            viewModeEnabled={readOnly}
            excalidrawAPI={handleExcalidrawAPI}
            instanceId={instanceIdRef.current}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'excalidraw-embed-container relative rounded-lg border-2 transition-all my-4 overflow-hidden',
        selected ? 'border-primary ring-2 ring-primary/20' : 'border-border',
        isHovered && !selected && 'border-muted-foreground/50',
        isResizing && 'select-none',
        // Isolation to prevent canvas interference with other Excalidraw instances
        'isolate'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ height: `${height}px`, contain: 'layout paint' }}
      data-excalidraw-embed
    >
      {/* Drag handle indicator - top center */}
      {(isHovered || selected) && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100]">
          <div className="flex items-center gap-1 bg-background border rounded-full px-2 py-0.5 shadow-sm cursor-grab active:cursor-grabbing">
            <GripVertical className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground font-medium">Canvas</span>
          </div>
        </div>
      )}

      {/* Canvas Header - Fixed at top as application header */}
      <div className="absolute top-0 left-0 right-0 z-50 rounded-t-lg overflow-hidden">
        <CanvasHeader inFullscreen={false} />
      </div>

      {/* Canvas Area - Positioned below header with proper offset */}
      <div
        className="absolute inset-0 rounded-b-lg overflow-hidden"
        style={{
          top: '42px', // Height of header (py-2.5 = 10px top + 10px bottom + 22px content ≈ 42px)
          isolation: 'isolate',
        }}
      >
        <ExcalidrawWrapper
          initialData={data}
          onChange={handleChange}
          viewModeEnabled={readOnly}
          excalidrawAPI={handleExcalidrawAPI}
          instanceId={instanceIdRef.current}
        />
      </div>

      {/* Resize Handle */}
      {!readOnly && (
        <div
          className={cn(
            'absolute bottom-0 left-0 right-0 h-4 cursor-ns-resize flex items-center justify-center z-[100]',
            'hover:bg-muted/50 transition-colors rounded-b-lg',
            isResizing && 'bg-primary/20'
          )}
          onMouseDown={handleResizeStart}
        >
          <div className="w-16 h-1 rounded-full bg-muted-foreground/40" />
        </div>
      )}
    </div>
  );
});

export default ExcalidrawEmbed;
