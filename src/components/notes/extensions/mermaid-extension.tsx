'use client';

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { useState, useCallback } from 'react';
import { MermaidDiagram } from '@/components/charts/mermaid-diagram';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  Pencil, 
  Check, 
  X, 
  ChevronDown, 
  ChevronUp,
  GitBranch,
  Database,
  Calendar,
  PieChart,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// MERMAID NODE COMPONENT
// ============================================================================

interface MermaidNodeViewProps {
  node: {
    attrs: {
      code: string;
      title?: string;
    };
  };
  updateAttributes: (attrs: { code?: string; title?: string }) => void;
  selected: boolean;
}

function MermaidNodeView({ node, updateAttributes, selected }: MermaidNodeViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editCode, setEditCode] = useState(node.attrs.code);
  const [showCode, setShowCode] = useState(false);
  const [hasError, setHasError] = useState(false);

  const { code, title } = node.attrs;

  // Update editCode when node.attrs.code changes (external updates)
  const [prevCode, setPrevCode] = useState(code);
  if (prevCode !== code && !isEditing) {
    setPrevCode(code);
    setEditCode(code);
  }

  const handleSave = useCallback(() => {
    // Validate before saving
    import('@/lib/utils/mermaid-validator').then(({ validateMermaidDiagram }) => {
      const validation = validateMermaidDiagram(editCode);
      
      if (!validation.valid) {
        // Show error but still allow saving (user may want to fix later)
        console.warn('Mermaid validation warning:', validation.error);
        // Could show a toast here if desired
      }
      
      // Use sanitized code if available, otherwise use original
      const codeToSave = validation.sanitizedCode || editCode;
      updateAttributes({ code: codeToSave });
      setIsEditing(false);
    });
  }, [editCode, updateAttributes]);

  const handleCancel = useCallback(() => {
    setEditCode(code);
    setIsEditing(false);
  }, [code]);

  const handleError = useCallback((error: Error) => {
    setHasError(true);
    console.error('Mermaid render error:', error);
  }, []);

  const handleRender = useCallback(() => {
    setHasError(false);
  }, []);

  // Detect diagram type for icon
  const getDiagramIcon = () => {
    const lowerCode = code.toLowerCase();
    if (lowerCode.startsWith('erdiagram')) return <Database className="h-4 w-4" />;
    if (lowerCode.startsWith('gantt')) return <Calendar className="h-4 w-4" />;
    if (lowerCode.startsWith('pie')) return <PieChart className="h-4 w-4" />;
    return <GitBranch className="h-4 w-4" />;
  };

  // Detect diagram type for title
  const getDefaultTitle = () => {
    const lowerCode = code.toLowerCase();
    if (lowerCode.startsWith('flowchart') || lowerCode.startsWith('graph')) return 'Flow Diagram';
    if (lowerCode.startsWith('sequencediagram')) return 'Sequence Diagram';
    if (lowerCode.startsWith('erdiagram')) return 'Entity Relationship';
    if (lowerCode.startsWith('gantt')) return 'Timeline';
    if (lowerCode.startsWith('statediagram')) return 'State Diagram';
    if (lowerCode.startsWith('journey')) return 'User Journey';
    if (lowerCode.startsWith('pie')) return 'Distribution';
    return 'Diagram';
  };

  return (
    <NodeViewWrapper className="mermaid-node-wrapper my-4">
      <div
        className={cn(
          'rounded-lg border bg-card overflow-hidden transition-all',
          selected && 'ring-2 ring-ring',
          hasError && 'border-destructive/50'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b">
          <div className="flex items-center gap-2">
            {getDiagramIcon()}
            <span className="text-sm font-medium text-foreground">
              {title || getDefaultTitle()}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {isEditing ? (
              <>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={handleSave}
                >
                  <Check className="h-4 w-4 text-green-600" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={handleCancel}
                >
                  <X className="h-4 w-4 text-destructive" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => setIsEditing(true)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => setShowCode(!showCode)}
                >
                  {showCode ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Edit Mode */}
        {isEditing ? (
          <div className="p-4">
            <Textarea
              value={editCode}
              onChange={(e) => setEditCode(e.target.value)}
              placeholder="Enter Mermaid diagram code..."
              className="font-mono text-sm min-h-[200px] resize-y"
              autoFocus
            />
            <p className="text-xs text-muted-foreground mt-2">
              Edit the Mermaid diagram code above. Changes will be saved when you click the checkmark.
            </p>
          </div>
        ) : (
          <>
            {/* Diagram Preview */}
            <div className="p-4 min-h-[100px]">
              <MermaidDiagram
                chart={code}
                className="mermaid-preview"
                onError={handleError}
                onRender={handleRender}
              />
            </div>

            {/* Code View (collapsed by default) */}
            {showCode && (
              <div className="border-t bg-muted/30">
                <pre className="p-4 text-xs font-mono overflow-auto max-h-[200px]">
                  {code}
                </pre>
              </div>
            )}
          </>
        )}
      </div>
    </NodeViewWrapper>
  );
}

// ============================================================================
// TIPTAP MERMAID EXTENSION
// ============================================================================

export interface MermaidOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mermaid: {
      /**
       * Insert a Mermaid diagram
       */
      insertMermaid: (options: { code: string; title?: string }) => ReturnType;
    };
  }
}

export const MermaidExtension = Node.create<MermaidOptions>({
  name: 'mermaid',

  group: 'block',

  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      code: {
        default: `flowchart TD
    A[Start] --> B[Process]
    B --> C{Decision}
    C -->|Yes| D[Action 1]
    C -->|No| E[Action 2]
    D --> F[End]
    E --> F`,
        parseHTML: (element) => element.getAttribute('data-code'),
        renderHTML: (attributes) => ({
          'data-code': attributes.code,
        }),
      },
      title: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-title'),
        renderHTML: (attributes) => {
          if (!attributes.title) return {};
          return { 'data-title': attributes.title };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="mermaid"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(
        { 'data-type': 'mermaid' },
        this.options.HTMLAttributes,
        HTMLAttributes
      ),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MermaidNodeView as any);
  },

  addCommands() {
    return {
      insertMermaid:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },
});

export default MermaidExtension;

