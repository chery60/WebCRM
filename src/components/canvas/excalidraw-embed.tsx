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

  useEffect(() => {
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
  }, []);

  if (isLoading || !Excalidraw) {
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
}: ExcalidrawEmbedProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [height, setHeight] = useState(minHeight);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const excalidrawAPIRef = useRef<any>(null);
  const resizeStartY = useRef<number>(0);
  const resizeStartHeight = useRef<number>(0);
  
  // Generate a stable unique ID for this canvas instance
  const instanceIdRef = useRef<string>(`embed-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

  // Handle Excalidraw API
  const handleExcalidrawAPI = useCallback((api: any) => {
    excalidrawAPIRef.current = api;
  }, []);

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

    if (templateId === 'blank') {
      excalidrawAPIRef.current.updateScene({ elements: [] });
    } else {
      const currentElements = excalidrawAPIRef.current.getSceneElements();
      const offsetX = currentElements.length > 0 ? 700 : 0;
      const offsetElements = template.elements.map((el: any) => ({
        ...el,
        id: `${el.id}-${Date.now()}`,
        x: (el.x || 0) + offsetX,
      }));
      excalidrawAPIRef.current.updateScene({
        elements: [...currentElements, ...offsetElements],
      });
      excalidrawAPIRef.current.scrollToContent();
    }
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
      if (!onChange) return;
      
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

  // Canvas Header component - reused in both views
  const CanvasHeader = ({ inFullscreen = false }: { inFullscreen?: boolean }) => (
    <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30 shrink-0">
      <div className="flex items-center gap-2">
        <Layers className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium text-sm">
          Canvas{inFullscreen ? ' - Fullscreen' : ''}
        </span>
      </div>
      <div className="flex items-center gap-1">
        {/* AI Generate Dropdown */}
        {onGenerateContent && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={isGenerating}
                className="gap-2 h-7"
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
                onGenerate={handleGenerate}
                isGenerating={isGenerating}
                generatingType={generatingType}
              />
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Templates Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 h-7">
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
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Export Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Download className="h-3.5 w-3.5" />
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
        'excalidraw-embed-container relative rounded-lg border-2 transition-all my-4 flex flex-col',
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
      {/* Canvas Header with all options */}
      <CanvasHeader inFullscreen={false} />

      {/* Drag handle indicator - top center */}
      {(isHovered || selected) && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100]">
          <div className="flex items-center gap-1 bg-background border rounded-full px-2 py-0.5 shadow-sm cursor-grab active:cursor-grabbing">
            <GripVertical className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground font-medium">Canvas</span>
          </div>
        </div>
      )}

      {/* Canvas Area - IMPORTANT: Must have explicit dimensions and isolation */}
      <div 
        className="flex-1 relative rounded-b-lg overflow-hidden"
        style={{ isolation: 'isolate', zIndex: 1 }}
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
