'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { type Editor } from '@tiptap/react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Bold,
  Italic,
  Underline,
  Type,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Indent,
  Outdent,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SelectionBubbleMenuProps {
  editor: Editor | null;
  onAIRewrite: (selectedText: string) => void;
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  tooltip: string;
  children: React.ReactNode;
  className?: string;
}

function ToolbarButton({
  onClick,
  isActive,
  disabled,
  tooltip,
  children,
  className,
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
            isActive && 'bg-accent text-accent-foreground',
            className
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

export function SelectionBubbleMenu({ editor, onAIRewrite }: SelectionBubbleMenuProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [showTextMenu, setShowTextMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Calculate position based on selection
  const updatePosition = useCallback(() => {
    if (!editor) return;

    const { from, to, empty } = editor.state.selection;
    
    // Don't show if no selection or selection is empty
    if (empty || from === to) {
      setIsVisible(false);
      return;
    }

    // Get the selection coordinates
    const view = editor.view;
    const start = view.coordsAtPos(from);
    const end = view.coordsAtPos(to);

    // Calculate center position above the selection
    const left = (start.left + end.left) / 2;
    const top = start.top - 10; // Position above the selection

    setPosition({ top, left });
    setIsVisible(true);
  }, [editor]);

  // Listen for selection changes
  useEffect(() => {
    if (!editor) return;

    const handleSelectionUpdate = () => {
      // Small delay to ensure selection is complete
      setTimeout(() => {
        updatePosition();
      }, 10);
    };

    const handleBlur = () => {
      // Delay hiding to allow button clicks to register
      setTimeout(() => {
        // Check if focus moved to the bubble menu
        if (!menuRef.current?.contains(document.activeElement)) {
          setIsVisible(false);
          setShowTextMenu(false);
        }
      }, 150);
    };

    editor.on('selectionUpdate', handleSelectionUpdate);
    editor.on('blur', handleBlur);

    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate);
      editor.off('blur', handleBlur);
    };
  }, [editor, updatePosition]);

  // Handle clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowTextMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get current text type for display
  const getCurrentTextType = useCallback(() => {
    if (!editor) return 'Paragraph';
    if (editor.isActive('heading', { level: 1 })) return 'Heading 1';
    if (editor.isActive('heading', { level: 2 })) return 'Heading 2';
    if (editor.isActive('heading', { level: 3 })) return 'Heading 3';
    return 'Paragraph';
  }, [editor]);

  // Handle AI rewrite click
  const handleAIRewrite = useCallback(() => {
    if (!editor) return;
    
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, ' ');
    
    if (selectedText.trim()) {
      onAIRewrite(selectedText);
      setIsVisible(false);
    }
  }, [editor, onAIRewrite]);

  if (!editor || !isVisible) return null;

  return (
    <TooltipProvider delayDuration={0}>
      <div
        ref={menuRef}
        className="fixed z-50 animate-in fade-in-0 zoom-in-95 duration-100"
        style={{
          top: position.top,
          left: position.left,
          transform: 'translate(-50%, -100%)',
        }}
      >
        <div className="flex items-center gap-0.5 rounded-lg border bg-popover p-1 shadow-lg">
          {/* Text Type Dropdown */}
          <Popover open={showTextMenu} onOpenChange={setShowTextMenu}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1 px-2 text-sm font-normal"
                onClick={(e) => {
                  e.preventDefault();
                  setShowTextMenu(!showTextMenu);
                }}
              >
                <Type className="h-4 w-4" />
                <span className="hidden sm:inline">{getCurrentTextType()}</span>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              className="w-48 p-2" 
              align="start" 
              sideOffset={8}
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <div className="space-y-1">
                <p className="px-2 py-1 text-xs font-medium text-muted-foreground">Text</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'w-full justify-start gap-2 h-8',
                    !editor.isActive('heading') && 'bg-accent'
                  )}
                  onClick={() => {
                    editor.chain().focus().setParagraph().run();
                    setShowTextMenu(false);
                  }}
                >
                  <Type className="h-4 w-4" />
                  Paragraph
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'w-full justify-start gap-2 h-8',
                    editor.isActive('heading', { level: 1 }) && 'bg-accent'
                  )}
                  onClick={() => {
                    editor.chain().focus().toggleHeading({ level: 1 }).run();
                    setShowTextMenu(false);
                  }}
                >
                  <Heading1 className="h-4 w-4" />
                  Heading 1
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'w-full justify-start gap-2 h-8',
                    editor.isActive('heading', { level: 2 }) && 'bg-accent'
                  )}
                  onClick={() => {
                    editor.chain().focus().toggleHeading({ level: 2 }).run();
                    setShowTextMenu(false);
                  }}
                >
                  <Heading2 className="h-4 w-4" />
                  Heading 2
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'w-full justify-start gap-2 h-8',
                    editor.isActive('heading', { level: 3 }) && 'bg-accent'
                  )}
                  onClick={() => {
                    editor.chain().focus().toggleHeading({ level: 3 }).run();
                    setShowTextMenu(false);
                  }}
                >
                  <Heading3 className="h-4 w-4" />
                  Heading 3
                </Button>

                <Separator className="my-2" />

                <p className="px-2 py-1 text-xs font-medium text-muted-foreground">Lists</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'w-full justify-start gap-2 h-8',
                    editor.isActive('bulletList') && 'bg-accent'
                  )}
                  onClick={() => {
                    editor.chain().focus().toggleBulletList().run();
                    setShowTextMenu(false);
                  }}
                >
                  <List className="h-4 w-4" />
                  Bullet List
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'w-full justify-start gap-2 h-8',
                    editor.isActive('orderedList') && 'bg-accent'
                  )}
                  onClick={() => {
                    editor.chain().focus().toggleOrderedList().run();
                    setShowTextMenu(false);
                  }}
                >
                  <ListOrdered className="h-4 w-4" />
                  Numbered List
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'w-full justify-start gap-2 h-8',
                    editor.isActive('taskList') && 'bg-accent'
                  )}
                  onClick={() => {
                    editor.chain().focus().toggleTaskList().run();
                    setShowTextMenu(false);
                  }}
                >
                  <CheckSquare className="h-4 w-4" />
                  Task List
                </Button>

                <Separator className="my-2" />

                <p className="px-2 py-1 text-xs font-medium text-muted-foreground">Quote</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'w-full justify-start gap-2 h-8',
                    editor.isActive('blockquote') && 'bg-accent'
                  )}
                  onClick={() => {
                    editor.chain().focus().toggleBlockquote().run();
                    setShowTextMenu(false);
                  }}
                >
                  <Quote className="h-4 w-4" />
                  Blockquote
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <Separator orientation="vertical" className="mx-1 h-6" />

          {/* Bold */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
            tooltip="Bold (⌘B)"
          >
            <Bold className="h-4 w-4" />
          </ToolbarButton>

          {/* Italic */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
            tooltip="Italic (⌘I)"
          >
            <Italic className="h-4 w-4" />
          </ToolbarButton>

          {/* Underline */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            isActive={editor.isActive('underline')}
            tooltip="Underline (⌘U)"
          >
            <Underline className="h-4 w-4" />
          </ToolbarButton>

          <Separator orientation="vertical" className="mx-1 h-6" />

          {/* Indent/Outdent */}
          <ToolbarButton
            onClick={() => editor.chain().focus().liftListItem('listItem').run()}
            tooltip="Decrease indent"
          >
            <Outdent className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().sinkListItem('listItem').run()}
            tooltip="Increase indent"
          >
            <Indent className="h-4 w-4" />
          </ToolbarButton>

          <Separator orientation="vertical" className="mx-1 h-6" />

          {/* AI Rewrite Button */}
          <ToolbarButton
            onClick={handleAIRewrite}
            tooltip="Rewrite with AI"
            className="text-primary hover:text-primary"
          >
            <Sparkles className="h-4 w-4" />
          </ToolbarButton>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default SelectionBubbleMenu;
