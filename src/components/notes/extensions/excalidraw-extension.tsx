'use client';

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { ExcalidrawEmbed, type ExcalidrawEmbedData, type CanvasGenerationType, type GeneratedCanvasContent } from '@/components/canvas/excalidraw-embed';
import { useCallback, useEffect, useState, useRef } from 'react';

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
  /** Handle expand canvas - open in dialog */
  onExpand?: (canvasId: string) => void;
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
// CANVAS NAME SYNC REGISTRY
// ============================================================================

export type CanvasNameChangeCallback = (newName: string) => void;

// Registry now stores a Set of callbacks per canvasId to support multiple subscribers
const canvasNameSyncRegistry = new Map<string, Set<CanvasNameChangeCallback>>();

/**
 * Register a callback to receive name changes for a specific canvas.
 * Multiple components can register callbacks for the same canvas ID.
 * Called by inline canvas components and widget list items to subscribe to name updates.
 */
export function registerCanvasNameSync(canvasId: string, callback: CanvasNameChangeCallback) {
  const callbacks = canvasNameSyncRegistry.get(canvasId) || new Set();
  callbacks.add(callback);
  canvasNameSyncRegistry.set(canvasId, callbacks);
}

/**
 * Unregister a canvas name sync callback.
 * If a specific callback is provided, only that callback is removed.
 * If no callback is provided, all callbacks for the canvasId are removed.
 */
export function unregisterCanvasNameSync(canvasId: string, callback?: CanvasNameChangeCallback) {
  if (callback) {
    const callbacks = canvasNameSyncRegistry.get(canvasId);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        canvasNameSyncRegistry.delete(canvasId);
      }
    }
  } else {
    canvasNameSyncRegistry.delete(canvasId);
  }
}

/**
 * Notify all subscribers that a canvas name has changed (from dialog or widget).
 * Called by NoteEditor, CanvasDialog, or CanvasListItem when canvas name is updated.
 */
export function notifyCanvasNameChange(canvasId: string, newName: string) {
  const callbacks = canvasNameSyncRegistry.get(canvasId);
  if (callbacks) {
    callbacks.forEach(callback => callback(newName));
  }
}

// ============================================================================
// CANVAS DATA SYNC REGISTRY (bidirectional sync between inline and expanded views)
// ============================================================================

export type CanvasDataChangeCallback = (data: ExcalidrawEmbedData) => void;

// Registry stores callbacks per canvasId for data sync
const canvasDataSyncRegistry = new Map<string, Set<CanvasDataChangeCallback>>();

/**
 * Register a callback to receive data changes for a specific canvas.
 * Used by inline canvas to receive updates from expanded view (dialog).
 */
export function registerCanvasDataSync(canvasId: string, callback: CanvasDataChangeCallback) {
  const callbacks = canvasDataSyncRegistry.get(canvasId) || new Set();
  callbacks.add(callback);
  canvasDataSyncRegistry.set(canvasId, callbacks);
}

/**
 * Unregister a canvas data sync callback.
 */
export function unregisterCanvasDataSync(canvasId: string, callback?: CanvasDataChangeCallback) {
  if (callback) {
    const callbacks = canvasDataSyncRegistry.get(canvasId);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        canvasDataSyncRegistry.delete(canvasId);
      }
    }
  } else {
    canvasDataSyncRegistry.delete(canvasId);
  }
}

/**
 * Notify all subscribers that canvas data has changed.
 * Called by CanvasDialog/PRDCanvas when canvas is modified (generation, deletion, etc.).
 */
export function notifyCanvasDataChange(canvasId: string, data: ExcalidrawEmbedData) {
  const callbacks = canvasDataSyncRegistry.get(canvasId);
  if (callbacks) {
    callbacks.forEach(callback => callback(data));
  }
}

// ============================================================================
// CANVAS DELETION SYNC REGISTRY
// ============================================================================

export type CanvasDeletionCallback = (canvasId: string) => void;

// Registry stores a Set of callbacks per canvasId to support multiple subscribers
const canvasDeletionSyncRegistry = new Map<string, Set<CanvasDeletionCallback>>();

/**
 * Register a callback to receive deletion notifications for a specific canvas.
 * Multiple components can register callbacks for the same canvas ID.
 * Called by page components to react when an inline canvas is deleted.
 */
export function registerCanvasDeletionSync(canvasId: string, callback: CanvasDeletionCallback) {
  const callbacks = canvasDeletionSyncRegistry.get(canvasId) || new Set();
  callbacks.add(callback);
  canvasDeletionSyncRegistry.set(canvasId, callbacks);
}

/**
 * Unregister a canvas deletion sync callback.
 * If a specific callback is provided, only that callback is removed.
 * If no callback is provided, all callbacks for the canvasId are removed.
 */
export function unregisterCanvasDeletionSync(canvasId: string, callback?: CanvasDeletionCallback) {
  if (callback) {
    const callbacks = canvasDeletionSyncRegistry.get(canvasId);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        canvasDeletionSyncRegistry.delete(canvasId);
      }
    }
  } else {
    canvasDeletionSyncRegistry.delete(canvasId);
  }
}

/**
 * Notify all subscribers that a canvas has been deleted.
 * Called by ExcalidrawNodeView when inline canvas is deleted,
 * allowing the sidebar widget to remove it from its list.
 */
export function notifyCanvasDeletion(canvasId: string) {
  const callbacks = canvasDeletionSyncRegistry.get(canvasId);
  if (callbacks) {
    callbacks.forEach(callback => callback(canvasId));
  }
  // Clean up the registry entry after notification
  canvasDeletionSyncRegistry.delete(canvasId);
  // Also clean up name sync registry for this canvas
  canvasNameSyncRegistry.delete(canvasId);
}

// ============================================================================
// CANVAS EXTERNAL DELETION REGISTRY (for widget → inline canvas deletion)
// ============================================================================

export type CanvasExternalDeletionCallback = () => void;

// Registry stores callbacks per canvasId - the inline canvas node uses this to delete itself
const canvasExternalDeletionRegistry = new Map<string, CanvasExternalDeletionCallback>();

/**
 * Register a callback for external deletion requests.
 * Called by ExcalidrawNodeView to allow external components (widget) to delete the inline canvas.
 */
export function registerCanvasExternalDeletion(canvasId: string, callback: CanvasExternalDeletionCallback) {
  canvasExternalDeletionRegistry.set(canvasId, callback);
}

/**
 * Unregister a canvas external deletion callback.
 */
export function unregisterCanvasExternalDeletion(canvasId: string) {
  canvasExternalDeletionRegistry.delete(canvasId);
}

/**
 * Request deletion of an inline canvas from external source (widget).
 * This will trigger the inline canvas node to delete itself using TipTap's deleteNode().
 */
export function requestCanvasExternalDeletion(canvasId: string) {
  const callback = canvasExternalDeletionRegistry.get(canvasId);
  if (callback) {
    callback();
    // Clean up after deletion
    canvasExternalDeletionRegistry.delete(canvasId);
  }
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

  // State for canvas name - stored in node attrs
  const [canvasName, setCanvasName] = useState(node.attrs.data?.canvasName || 'Untitled Canvas');

  // Refs to avoid stale closures in registry callback
  const nodeDataRef = useRef(node.attrs.data);
  const updateAttributesRef = useRef(updateAttributes);

  // Keep refs up to date
  useEffect(() => {
    nodeDataRef.current = node.attrs.data;
    updateAttributesRef.current = updateAttributes;
  });

  // Ensure canvasId exists on mount (fallback for existing canvases without IDs)
  // This is critical for expand and deletion sync to work properly
  useEffect(() => {
    if (!node.attrs.data?.canvasId) {
      const newCanvasId = `inline-canvas-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      updateAttributes({
        data: {
          elements: node.attrs.data?.elements || [],
          appState: node.attrs.data?.appState || { viewBackgroundColor: '#ffffff' },
          files: node.attrs.data?.files || {},
          canvasName: node.attrs.data?.canvasName || 'Untitled Canvas',
          canvasId: newCanvasId,
        },
      });
    }
  }, []); // Only run once on mount

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

  // Update canvas name when node attrs change
  useEffect(() => {
    if (node.attrs.data?.canvasName) {
      setCanvasName(node.attrs.data.canvasName);
    }
  }, [node.attrs.data?.canvasName]);

  // Store callback reference for proper cleanup
  const nameChangeCallbackRef = useRef<CanvasNameChangeCallback | null>(null);
  const dataChangeCallbackRef = useRef<CanvasDataChangeCallback | null>(null);

  // Register for external deletion requests (from widget)
  // This allows the widget to delete the inline canvas node
  useEffect(() => {
    const canvasId = node.attrs.data?.canvasId;
    if (!canvasId) return;

    // Register callback that will delete this node when called
    // Note: We do NOT call notifyCanvasDeletion here because the widget already knows
    // (it initiated the deletion). We only need to delete the TipTap node.
    const handleExternalDeletion = () => {
      // Clean up registries for this canvas
      unregisterCanvasNameSync(canvasId);
      unregisterCanvasDataSync(canvasId);
      unregisterCanvasDeletionSync(canvasId);
      // Delete the TipTap node
      deleteNode();
    };

    registerCanvasExternalDeletion(canvasId, handleExternalDeletion);

    return () => {
      unregisterCanvasExternalDeletion(canvasId);
    };
  }, [node.attrs.data?.canvasId, deleteNode]);

  // Register for external name sync (from dialog/widget)
  useEffect(() => {
    const canvasId = node.attrs.data?.canvasId;
    if (!canvasId) return;

    // Create and store callback reference to receive name changes from dialog/widget
    // Use refs to avoid stale closures
    const handleNameChange: CanvasNameChangeCallback = (newName: string) => {
      setCanvasName(newName);
      // Also update the node attributes to persist the change
      updateAttributesRef.current({
        data: {
          elements: [],
          ...nodeDataRef.current,
          canvasName: newName,
          canvasId,
        },
      });
    };

    // Store the callback reference for cleanup
    nameChangeCallbackRef.current = handleNameChange;

    // Register the callback
    registerCanvasNameSync(canvasId, handleNameChange);

    return () => {
      // Unregister this specific callback, not all callbacks for the canvasId
      if (nameChangeCallbackRef.current) {
        unregisterCanvasNameSync(canvasId, nameChangeCallbackRef.current);
        nameChangeCallbackRef.current = null;
      }
    };
  }, [node.attrs.data?.canvasId]); // Only re-register when canvasId changes, not when data changes

  // Register for external data sync (from dialog/expanded view)
  // This allows the expanded view to push data changes back to the inline canvas
  useEffect(() => {
    const canvasId = node.attrs.data?.canvasId;
    if (!canvasId) return;

    // Create callback to receive data changes from expanded view
    const handleDataChange: CanvasDataChangeCallback = (newData: ExcalidrawEmbedData) => {
      // Update the node attributes with the new data from expanded view
      updateAttributesRef.current({
        data: {
          ...newData,
          canvasId,
          canvasName: newData.canvasName || nodeDataRef.current?.canvasName || 'Untitled Canvas',
        },
      });
    };

    // Store and register the callback
    dataChangeCallbackRef.current = handleDataChange;
    registerCanvasDataSync(canvasId, handleDataChange);

    return () => {
      if (dataChangeCallbackRef.current) {
        unregisterCanvasDataSync(canvasId, dataChangeCallbackRef.current);
        dataChangeCallbackRef.current = null;
      }
    };
  }, [node.attrs.data?.canvasId]);

  const handleChange = useCallback(
    (data: ExcalidrawEmbedData) => {
      // Ensure canvasId is preserved or generated
      const canvasId = data.canvasId || node.attrs.data?.canvasId || `inline-canvas-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      updateAttributes({
        data: {
          ...data,
          canvasId,
        }
      });
    },
    [updateAttributes, node.attrs.data?.canvasId]
  );

  const handleCanvasNameChange = useCallback(
    (newName: string) => {
      setCanvasName(newName);
      // Ensure canvasId is set when renaming
      const canvasId = node.attrs.data?.canvasId || `inline-canvas-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      // Update the canvas data with the new name
      updateAttributes({
        data: {
          elements: [],
          ...node.attrs.data,
          canvasName: newName,
          canvasId,
        },
      });

      // Notify other components (widget, dialog) that the name has changed
      notifyCanvasNameChange(canvasId, newName);
    },
    [updateAttributes, node.attrs.data]
  );

  const handleDelete = useCallback(() => {
    // Notify other components (sidebar widget) that this canvas is being deleted
    const canvasId = node.attrs.data?.canvasId;
    if (canvasId) {
      notifyCanvasDeletion(canvasId);
    }
    deleteNode();
  }, [deleteNode, node.attrs.data?.canvasId]);

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

  // Handle expand - pass canvas ID to parent handler
  const handleExpand = useCallback(() => {
    if (aiContext?.onExpand && node.attrs.data?.canvasId) {
      aiContext.onExpand(node.attrs.data.canvasId);
    }
  }, [aiContext, node.attrs.data?.canvasId]);

  return (
    <NodeViewWrapper
      className="excalidraw-node-wrapper"
      data-type="excalidraw"
      contentEditable={false}
      as="div"
    >
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
        canvasName={canvasName}
        onCanvasNameChange={handleCanvasNameChange}
        onExpand={aiContext?.onExpand ? handleExpand : undefined}
        canvasId={node.attrs.data?.canvasId}
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
            // Always generate a canvasId for new canvases to ensure expand and deletion sync work
            const canvasId = options.data?.canvasId || `inline-canvas-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const canvasName = options.data?.canvasName || 'Untitled Canvas';
            
            return commands.insertContent({
              type: this.name,
              attrs: {
                data: {
                  elements: options.data?.elements || [],
                  appState: options.data?.appState || { viewBackgroundColor: '#ffffff' },
                  files: options.data?.files || {},
                  canvasId,
                  canvasName,
                },
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
