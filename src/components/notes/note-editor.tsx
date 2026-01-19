'use client';

import { cn } from '@/lib/utils';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import Image from '@tiptap/extension-image';
import { useCallback, useRef, useState, useEffect } from 'react';
import { EditorToolbar } from './editor-toolbar';
import { SlashMenu, type SlashCommand, type SlashMenuHandle } from './slash-command/slash-menu';
import { useAIService } from '@/lib/ai/use-ai-service';
import { Loader2 } from 'lucide-react';

interface NoteEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}

export function NoteEditor({
  content,
  onChange,
  placeholder = 'Start typing, or press "/" for commands...',
  autoFocus = false,
  className,
}: NoteEditorProps) {
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const [slashPosition, setSlashPosition] = useState<{ top: number; left: number } | null>(null);
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const slashMenuRef = useRef<SlashMenuHandle>(null);
  const slashStartPosRef = useRef<number | null>(null);
  const { generateContent } = useAIService();

  const executeCommand = useCallback(
    async (command: SlashCommand, editor: ReturnType<typeof useEditor>) => {
      if (!editor) return;

      // Handle format commands
      switch (command.command) {
        case 'text':
          editor.chain().focus().setParagraph().run();
          break;
        case 'h1':
          editor.chain().focus().toggleHeading({ level: 1 }).run();
          break;
        case 'h2':
          editor.chain().focus().toggleHeading({ level: 2 }).run();
          break;
        case 'h3':
          editor.chain().focus().toggleHeading({ level: 3 }).run();
          break;
        case 'bullet':
          editor.chain().focus().toggleBulletList().run();
          break;
        case 'numbered':
          editor.chain().focus().toggleOrderedList().run();
          break;
        case 'todo':
          editor.chain().focus().toggleTaskList().run();
          break;
        case 'quote':
          editor.chain().focus().toggleBlockquote().run();
          break;
        case 'code':
          editor.chain().focus().toggleCodeBlock().run();
          break;
        case 'divider':
          editor.chain().focus().setHorizontalRule().run();
          break;
        case 'table':
          editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
          break;
        case 'image':
          // For now, just insert a placeholder
          editor.chain().focus().setImage({ src: 'https://placehold.co/600x400?text=Image' }).run();
          break;

        // AI commands
        case 'summarize':
        case 'expand':
        case 'rewrite':
        case 'translate':
        case 'continue':
        case 'grammar':
        case 'professional':
        case 'ask':
          setIsAIProcessing(true);
          try {
            const selectedText = editor.state.doc.textBetween(
              editor.state.selection.from,
              editor.state.selection.to,
              ' '
            );

            // Get context from the document
            const fullText = editor.state.doc.textContent;

            const result = await generateContent({
              prompt: selectedText || fullText.slice(-500),
              context: fullText,
              type: command.command as 'summarize' | 'expand' | 'rewrite' | 'translate' | 'continue' | 'grammar' | 'professional',
            });

            if (result.content) {
              if (selectedText) {
                // Replace selection
                editor.chain().focus().insertContent(result.content).run();
              } else {
                // Insert at cursor
                editor.chain().focus().insertContent(result.content).run();
              }
            }
          } catch (error) {
            console.error('AI command failed:', error);
          } finally {
            setIsAIProcessing(false);
          }
          break;
      }
    },
    [generateContent]
  );

  const editor = useEditor({
    immediatelyRender: false, // Prevent SSR hydration mismatch
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableCell,
      TableHeader,
      Image,
    ],
    content: content ? JSON.parse(content) : undefined,
    autofocus: autoFocus ? 'end' : false,
    editorProps: {
      attributes: {
        class: 'tiptap focus:outline-none min-h-[300px] px-4 py-3',
      },
      handleKeyDown: (view, event) => {
        // Handle slash menu keyboard navigation
        if (showSlashMenu && slashMenuRef.current) {
          const handled = slashMenuRef.current.onKeyDown(event);
          if (handled) {
            return true;
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      const json = JSON.stringify(editor.getJSON());
      onChange(json);

      // Check for slash command trigger
      const { state } = editor;
      const { from } = state.selection;
      const textBefore = state.doc.textBetween(
        Math.max(0, from - 50),
        from,
        ''
      );

      const slashMatch = textBefore.match(/\/([a-zA-Z]*)$/);

      if (slashMatch) {
        // Get cursor position for menu placement
        const coords = editor.view.coordsAtPos(from);
        setSlashPosition({
          top: coords.bottom + 5,
          left: coords.left,
        });
        setSlashQuery(slashMatch[1]);
        setShowSlashMenu(true);
        slashStartPosRef.current = from - slashMatch[0].length;
      } else {
        setShowSlashMenu(false);
        setSlashQuery('');
        slashStartPosRef.current = null;
      }
    },
  });

  const handleSlashSelect = useCallback(
    (command: SlashCommand) => {
      if (!editor || slashStartPosRef.current === null) return;

      // Delete the slash command text
      const from = slashStartPosRef.current;
      const to = editor.state.selection.from;
      editor.chain().focus().deleteRange({ from, to }).run();

      // Close menu
      setShowSlashMenu(false);
      setSlashQuery('');
      slashStartPosRef.current = null;

      // Execute command
      executeCommand(command, editor);
    },
    [editor, executeCommand]
  );

  const handleSlashClose = useCallback(() => {
    setShowSlashMenu(false);
    setSlashQuery('');
    slashStartPosRef.current = null;
  }, []);

  return (
    <div className={cn('relative border rounded-lg bg-card', className)}>
      <EditorToolbar editor={editor} />
      <div className="relative">
        <EditorContent editor={editor} />

        {/* AI Processing Overlay */}
        {isAIProcessing && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-b-lg">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              AI is thinking...
            </div>
          </div>
        )}
      </div>

      {/* Slash Command Menu */}
      {showSlashMenu && slashPosition && (
        <div
          className="fixed z-50"
          style={{
            top: slashPosition.top,
            left: slashPosition.left,
          }}
        >
          <SlashMenu
            ref={slashMenuRef}
            query={slashQuery}
            onSelect={handleSlashSelect}
            onClose={handleSlashClose}
          />
        </div>
      )}
    </div>
  );
}

