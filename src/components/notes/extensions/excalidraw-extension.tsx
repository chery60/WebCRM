'use client';

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { ExcalidrawEmbed, type ExcalidrawEmbedData, type CanvasGenerationType, type GeneratedCanvasContent } from '@/components/canvas/excalidraw-embed';
import { useCallback, useEffect, useState } from 'react';

// ============================================================================
// TYPES FOR AI GENERATION CONTEXT
// ============================================================================

export interface InlineCanvasAIContext {
  /** Get current PRD content for AI context */
  getPrdContent: () => string;
  /** Get product description */
  getProductDescription: () => string;
  /** Generate content for the canvas */
  generateContent: (type: CanvasGenerationType, existingElements: any[]) => Promise<GeneratedCanvasContent | null>;
  /** Whether generation is in progress */
  isGenerating: boolean;
  /** Current generation type */
  generatingType: CanvasGenerationType | null;
}

// Global context that can be set by the NoteEditor
let globalCanvasAIContext: InlineCanvasAIContext | null = null;

/**
 * Set the global AI context for inline canvases.
 * Called by NoteEditor to provide AI generation capabilities.
 */
export function setInlineCanvasAIContext(context: InlineCanvasAIContext | null) {
  globalCanvasAIContext = context;
}

/**
 * Get the current AI context for inline canvases.
 */
export function getInlineCanvasAIContext(): InlineCanvasAIContext | null {
  return globalCanvasAIContext;
}

// ============================================================================
// NODE VIEW COMPONENT
// ============================================================================

interface ExcalidrawNodeViewProps {
  node: {
    attrs: {
      data: ExcalidrawEmbedData | null;
      minHeight: number;
    };
  };
  updateAttributes: (attrs: Partial<{ data: ExcalidrawEmbedData | null; minHeight: number }>) => void;
  deleteNode: () => void;
  selected: boolean;
  editor: {
    isEditable: boolean;
  };
}

function ExcalidrawNodeView({
  node,
  updateAttributes,
  deleteNode,
  selected,
  editor,
}: ExcalidrawNodeViewProps) {
  // Track AI context state
  const [aiContext, setAiContext] = useState<InlineCanvasAIContext | null>(globalCanvasAIContext);
  
  // Update context when it changes
  useEffect(() => {
    // Check for context updates periodically (simple polling approach)
    const checkContext = () => {
      const currentContext = getInlineCanvasAIContext();
      if (currentContext !== aiContext) {
        setAiContext(currentContext);
      }
    };
    
    // Initial check
    checkContext();
    
    // Set up interval to check for context updates
    const interval = setInterval(checkContext, 500);
    return () => clearInterval(interval);
  }, [aiContext]);

  const handleChange = useCallback(
    (data: ExcalidrawEmbedData) => {
      updateAttributes({ data });
    },
    [updateAttributes]
  );

  const handleDelete = useCallback(() => {
    deleteNode();
  }, [deleteNode]);

  // Handle AI generation with context
  const handleGenerateContent = useCallback(
    async (type: CanvasGenerationType): Promise<GeneratedCanvasContent | null> => {
      if (!aiContext) {
        console.warn('[ExcalidrawNodeView] No AI context available');
        return null;
      }
      
      // Get existing elements from current canvas data
      const existingElements = node.attrs.data?.elements || [];
      
      // Call the generation function with existing elements for context
      return aiContext.generateContent(type, existingElements);
    },
    [aiContext, node.attrs.data?.elements]
  );

  return (
    <NodeViewWrapper className="excalidraw-node-wrapper" data-type="excalidraw">
      <ExcalidrawEmbed
        data={node.attrs.data || undefined}
        onChange={handleChange}
        onDelete={handleDelete}
        selected={selected}
        minHeight={node.attrs.minHeight}
        readOnly={!editor.isEditable}
        onGenerateContent={aiContext ? handleGenerateContent : undefined}
        isGenerating={aiContext?.isGenerating || false}
        generatingType={aiContext?.generatingType || null}
      />
    </NodeViewWrapper>
  );
}

// ============================================================================
// TIPTAP EXTENSION
// ============================================================================

export interface ExcalidrawOptions {
  HTMLAttributes: Record<string, any>;
  defaultMinHeight: number;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    excalidraw: {
      /**
       * Insert an Excalidraw canvas
       */
      insertExcalidraw: (options?: { data?: ExcalidrawEmbedData; minHeight?: number }) => ReturnType;
    };
  }
}

export const ExcalidrawExtension = Node.create<ExcalidrawOptions>({
  name: 'excalidraw',

  group: 'block',

  atom: true, // Cannot have content inside

  draggable: true, // Can be dragged around

  selectable: true, // Can be selected

  addOptions() {
    return {
      HTMLAttributes: {},
      defaultMinHeight: 400,
    };
  },

  addAttributes() {
    return {
      data: {
        default: null,
        parseHTML: (element) => {
          const dataAttr = element.getAttribute('data-excalidraw-data');
          if (dataAttr) {
            try {
              return JSON.parse(dataAttr);
            } catch {
              return null;
            }
          }
          return null;
        },
        renderHTML: (attributes) => {
          if (!attributes.data) return {};
          return {
            'data-excalidraw-data': JSON.stringify(attributes.data),
          };
        },
      },
      minHeight: {
        default: 400,
        parseHTML: (element) => {
          const height = element.getAttribute('data-min-height');
          return height ? parseInt(height, 10) : 400;
        },
        renderHTML: (attributes) => {
          return {
            'data-min-height': attributes.minHeight,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="excalidraw"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'excalidraw',
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ExcalidrawNodeView as any);
  },

  addCommands() {
    return {
      insertExcalidraw:
        (options = {}) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              data: options.data || null,
              minHeight: options.minHeight || this.options.defaultMinHeight,
            },
          });
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      // Optional: Add keyboard shortcut to insert canvas
      'Mod-Shift-c': () => this.editor.commands.insertExcalidraw(),
    };
  },
});

export default ExcalidrawExtension;
