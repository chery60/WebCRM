'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { type Editor } from '@tiptap/react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Plus,
  Minus,
  Trash2,
  Rows,
  Columns,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TableBubbleMenuProps {
  editor: Editor | null;
}

interface ToolbarButtonProps {
  onClick: () => void;
  disabled?: boolean;
  tooltip: string;
  children: React.ReactNode;
  variant?: 'default' | 'destructive';
}

function ToolbarButton({
  onClick,
  disabled,
  tooltip,
  children,
  variant = 'default',
}: ToolbarButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            'h-8 w-8 p-0',
            variant === 'destructive' && 'text-destructive hover:text-destructive hover:bg-destructive/10'
          )}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClick();
          }}
          disabled={disabled}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={5}>
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

export function TableBubbleMenu({ editor }: TableBubbleMenuProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  // Check if cursor is inside a table and calculate position
  const updateVisibility = useCallback(() => {
    if (!editor) {
      setIsVisible(false);
      return;
    }

    const isInTable = editor.isActive('table');
    
    if (!isInTable) {
      setIsVisible(false);
      return;
    }

    // Find the table element in the DOM
    const { state } = editor;
    const { from } = state.selection;
    
    // Get the resolved position and find the table node
    const $pos = state.doc.resolve(from);
    let tableDepth = -1;
    
    for (let d = $pos.depth; d > 0; d--) {
      if ($pos.node(d).type.name === 'table') {
        tableDepth = d;
        break;
      }
    }
    
    if (tableDepth === -1) {
      setIsVisible(false);
      return;
    }

    // Get DOM element for the table
    const tableStart = $pos.start(tableDepth);
    const domNode = editor.view.nodeDOM(tableStart - 1);
    
    if (domNode && domNode instanceof HTMLElement) {
      const tableRect = domNode.getBoundingClientRect();
      
      // Position the menu 4px above the table, aligned to the left edge
      setPosition({
        top: tableRect.top - 4 - 40, // 4px gap above the table (40px is approx menu height)
        left: tableRect.left, // Aligned to the left edge of the table
      });
      setIsVisible(true);
    } else {
      // Fallback: use cursor position
      const coords = editor.view.coordsAtPos(from);
      setPosition({
        top: coords.top - 4 - 40,
        left: coords.left,
      });
      setIsVisible(true);
    }
  }, [editor]);

  // Listen for selection changes and updates
  useEffect(() => {
    if (!editor) return;

    const handleUpdate = () => {
      // Small delay to ensure DOM is updated
      requestAnimationFrame(() => {
        updateVisibility();
      });
    };

    editor.on('selectionUpdate', handleUpdate);
    editor.on('update', handleUpdate);
    editor.on('focus', handleUpdate);

    return () => {
      editor.off('selectionUpdate', handleUpdate);
      editor.off('update', handleUpdate);
      editor.off('focus', handleUpdate);
    };
  }, [editor, updateVisibility]);

  // Hide menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        // Don't hide if clicking inside the editor
        if (editor?.view.dom.contains(event.target as Node)) {
          return;
        }
        setIsVisible(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [editor]);

  if (!editor || !isVisible) {
    return null;
  }

  const canDeleteRow = () => {
    // Check if table has more than 1 row (excluding header)
    return editor.can().deleteRow();
  };

  const canDeleteColumn = () => {
    // Check if table has more than 1 column
    return editor.can().deleteColumn();
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div
        ref={menuRef}
        className="fixed z-50 flex items-center gap-0.5 rounded-lg border bg-background p-1 shadow-lg"
        style={{
          top: position.top,
          left: position.left,
        }}
      >
        {/* Row operations */}
        <div className="flex items-center">
          <ToolbarButton
            onClick={() => editor.chain().focus().addRowBefore().run()}
            tooltip="Add row above"
          >
            <div className="relative">
              <Rows className="h-4 w-4" />
              <Plus className="h-2 w-2 absolute -top-0.5 -right-0.5" />
            </div>
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().addRowAfter().run()}
            tooltip="Add row below"
          >
            <div className="relative">
              <Rows className="h-4 w-4" />
              <Plus className="h-2 w-2 absolute -bottom-0.5 -right-0.5" />
            </div>
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().deleteRow().run()}
            disabled={!canDeleteRow()}
            tooltip="Delete row"
          >
            <div className="relative">
              <Rows className="h-4 w-4" />
              <Minus className="h-2 w-2 absolute -top-0.5 -right-0.5" />
            </div>
          </ToolbarButton>
        </div>

        <div className="mx-1.5 h-6 w-px bg-border" />

        {/* Column operations */}
        <div className="flex items-center">
          <ToolbarButton
            onClick={() => editor.chain().focus().addColumnBefore().run()}
            tooltip="Add column left"
          >
            <div className="relative">
              <Columns className="h-4 w-4" />
              <Plus className="h-2 w-2 absolute -top-0.5 -left-0.5" />
            </div>
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().addColumnAfter().run()}
            tooltip="Add column right"
          >
            <div className="relative">
              <Columns className="h-4 w-4" />
              <Plus className="h-2 w-2 absolute -top-0.5 -right-0.5" />
            </div>
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().deleteColumn().run()}
            disabled={!canDeleteColumn()}
            tooltip="Delete column"
          >
            <div className="relative">
              <Columns className="h-4 w-4" />
              <Minus className="h-2 w-2 absolute -top-0.5 -right-0.5" />
            </div>
          </ToolbarButton>
        </div>

        <div className="mx-1.5 h-6 w-px bg-border" />

        {/* Delete table */}
        <ToolbarButton
          onClick={() => editor.chain().focus().deleteTable().run()}
          tooltip="Delete table"
          variant="destructive"
        >
          <Trash2 className="h-4 w-4" />
        </ToolbarButton>
      </div>
    </TooltipProvider>
  );
}

export default TableBubbleMenu;
