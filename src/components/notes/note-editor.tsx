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
import { AIGenerationPanel, type GenerationMode } from './ai-generation-panel';
import { PRDTemplateSelector } from './prd-template-selector';
import { PRDChatDrawer } from './prd-chat-drawer';
import { SectionChatDrawer } from './section-chat-drawer';
import { ExcalidrawExtension, setInlineCanvasAIContext } from './extensions/excalidraw-extension';
import { MermaidExtension } from './extensions/mermaid-extension';
import { SelectionBubbleMenu } from './selection-bubble-menu';
import { AIRewriteDrawer } from './ai-rewrite-drawer';
import type { GeneratedFeature, GeneratedTask, CustomPRDTemplate } from '@/types';
import { canvasGenerator } from '@/lib/ai/services/canvas-generator';
import type { CanvasGenerationType, GeneratedCanvasContent } from '@/components/canvas/excalidraw-embed';
import { useAISettingsStore } from '@/lib/stores/ai-settings-store';
import { toast } from 'sonner';
import { markdownToTipTap } from '@/lib/utils/markdown-to-tiptap';

interface NoteEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  /** Previously saved features (for task generation) */
  savedFeatures?: GeneratedFeature[];
  /** Project-specific instructions for PRD generation */
  projectInstructions?: string;
  /** Callback when features are generated */
  onFeaturesGenerated?: (features: GeneratedFeature[]) => void;
  /** Callback when tasks are generated */
  onTasksGenerated?: (tasks: GeneratedTask[]) => void;
}

export function NoteEditor({
  content,
  onChange,
  placeholder = 'Start typing, or press "/" for commands...',
  autoFocus = false,
  className,
  savedFeatures = [],
  projectInstructions,
  onFeaturesGenerated,
  onTasksGenerated,
}: NoteEditorProps) {
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const [slashPosition, setSlashPosition] = useState<{ top: number; left: number } | null>(null);
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const slashMenuRef = useRef<SlashMenuHandle>(null);
  const slashStartPosRef = useRef<number | null>(null);
  const { generateContent } = useAIService();
  
  // AI Generation Panel state
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [aiPanelMode, setAIPanelMode] = useState<GenerationMode>('generate-prd');
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  
  // PRD Chat Drawer state (conversational PRD generation)
  const [showPRDChatDrawer, setShowPRDChatDrawer] = useState(false);
  
  // Section Chat Drawer state (conversational section generation)
  const [showSectionChatDrawer, setShowSectionChatDrawer] = useState(false);
  
  // AI Rewrite Drawer state
  const [showRewriteDrawer, setShowRewriteDrawer] = useState(false);
  const [selectedTextForRewrite, setSelectedTextForRewrite] = useState('');
  
  // Canvas AI generation state
  const [isCanvasGenerating, setIsCanvasGenerating] = useState(false);
  const [canvasGeneratingType, setCanvasGeneratingType] = useState<CanvasGenerationType | null>(null);
  const { activeProvider } = useAISettingsStore();
  
  // Track if editor has been initialized with content
  const isInitialContentSet = useRef(false);
  
  // Ref to track editor instance for context
  const editorRef = useRef<ReturnType<typeof useEditor>>(null);

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
        case 'canvas':
          // Insert an Excalidraw canvas
          editor.chain().focus().insertExcalidraw().run();
          break;
        case 'mermaid':
          // Insert a Mermaid diagram with default flowchart
          editor.chain().focus().insertMermaid({
            code: `flowchart TD
    A[Start] --> B[Process]
    B --> C{Decision}
    C -->|Yes| D[Action 1]
    C -->|No| E[Action 2]
    D --> F[End]
    E --> F`,
            title: 'Flow Diagram',
          }).run();
          break;

        // PRD-specific commands - open conversational PRD chat drawer
        case 'generate-prd':
          setShowPRDChatDrawer(true);
          break;
        case 'prd-template':
          setShowPRDChatDrawer(true); // Now uses chat drawer with template selection
          break;
        case 'generate-features':
          setAIPanelMode('generate-features');
          setShowAIPanel(true);
          break;
        case 'generate-tasks':
          setAIPanelMode('generate-tasks');
          setShowAIPanel(true);
          break;
        case 'improve-prd':
          setAIPanelMode('improve-prd');
          setShowAIPanel(true);
          break;
        case 'generate-section':
          setShowSectionChatDrawer(true);
          break;

        // AI commands
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
              type: command.command as 'continue' | 'grammar' | 'professional',
            });

            if (result.content) {
              // Convert markdown to TipTap JSON format for proper rendering
              const tiptapDoc = markdownToTipTap(result.content);
              if (tiptapDoc.content && tiptapDoc.content.length > 0) {
                if (selectedText) {
                  // Replace selection with converted content
                  editor.chain().focus().insertContent(tiptapDoc.content).run();
                } else {
                  // Insert at cursor
                  editor.chain().focus().insertContent(tiptapDoc.content).run();
                }
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
      ExcalidrawExtension.configure({
        defaultMinHeight: 400,
      }),
      MermaidExtension,
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

  // Sync editor content when the content prop changes from external source (e.g., database load)
  // This ensures the editor updates when navigating to an existing note
  useEffect(() => {
    if (!editor) return;
    
    // Skip if content is empty (new note) or if we've already set the initial content
    if (!content) {
      isInitialContentSet.current = false;
      return;
    }
    
    // Only set content if it's the first time we're receiving content from the database
    // This prevents overwriting user edits when debounced saves trigger re-renders
    if (!isInitialContentSet.current) {
      try {
        const parsedContent = JSON.parse(content);
        const currentContent = editor.getJSON();
        
        // Only update if the content is actually different
        if (JSON.stringify(currentContent) !== JSON.stringify(parsedContent)) {
          editor.commands.setContent(parsedContent);
        }
        isInitialContentSet.current = true;
      } catch (e) {
        // If parsing fails, content might be plain text or invalid
        console.warn('Failed to parse note content:', e);
      }
    }
  }, [editor, content]);

  // Reset initialization flag when editor is destroyed/recreated
  useEffect(() => {
    return () => {
      isInitialContentSet.current = false;
    };
  }, []);

  // Canvas AI generation handler - receives existingElements from inline canvas for positioning
  const handleCanvasGenerate = useCallback(
    async (type: CanvasGenerationType, existingElements: any[] = []): Promise<GeneratedCanvasContent | null> => {
      // Get current PRD content from editor
      const prdContent = editor?.state.doc.textContent || '';
      
      if (!prdContent.trim()) {
        toast.error('Please add some PRD content before generating diagrams');
        return null;
      }

      setIsCanvasGenerating(true);
      setCanvasGeneratingType(type);

      try {
        // Build enhanced context with existing elements info
        let enhancedPrdContent = prdContent;
        
        if (existingElements && existingElements.length > 0) {
          const existingContext = summarizeCanvasElements(existingElements);
          if (existingContext) {
            enhancedPrdContent = `${prdContent}\n\n[Existing Canvas: ${existingContext}]`;
          }
        }

        const result = await canvasGenerator.generateDiagram({
          type,
          prdContent: enhancedPrdContent,
          productDescription: prdContent.substring(0, 500), // Use first 500 chars as description
          provider: activeProvider || undefined,
          existingElements, // Pass for offset calculation to avoid overlapping
        });

        if (!result.success || !result.content) {
          toast.error(result.error || 'Failed to generate diagram');
          return null;
        }

        toast.success(`${result.content.title} generated successfully`);
        return result.content;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        toast.error(`Generation failed: ${errorMessage}`);
        return null;
      } finally {
        setIsCanvasGenerating(false);
        setCanvasGeneratingType(null);
      }
    },
    [editor, activeProvider]
  );

  // Set up AI context for inline canvases
  useEffect(() => {
    const context = {
      getPrdContent: () => editor?.state.doc.textContent || '',
      getProductDescription: () => (editor?.state.doc.textContent || '').substring(0, 500),
      generateContent: handleCanvasGenerate,
      isGenerating: isCanvasGenerating,
      generatingType: canvasGeneratingType,
    };
    
    setInlineCanvasAIContext(context);
    
    // Cleanup on unmount
    return () => {
      setInlineCanvasAIContext(null);
    };
  }, [editor, handleCanvasGenerate, isCanvasGenerating, canvasGeneratingType]);

  // Helper function to summarize canvas elements for AI context
  function summarizeCanvasElements(elements: any[]): string {
    if (!elements || elements.length === 0) return '';

    const typeCounts: Record<string, number> = {};
    const textContents: string[] = [];
    
    for (const el of elements) {
      if (el.isDeleted) continue;
      
      const type = el.type || 'unknown';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
      
      if (el.text && typeof el.text === 'string' && el.text.trim()) {
        textContents.push(el.text.trim().substring(0, 30));
      }
    }

    const parts: string[] = [];
    
    const typeDescriptions = Object.entries(typeCounts)
      .map(([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`)
      .join(', ');
    
    if (typeDescriptions) {
      parts.push(typeDescriptions);
    }
    
    if (textContents.length > 0) {
      const sampleTexts = textContents.slice(0, 5).join(', ');
      parts.push(`labels: ${sampleTexts}${textContents.length > 5 ? '...' : ''}`);
    }

    return parts.join('; ');
  }

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

  // Handle PRD content generated from AI panel or PRD chat drawer
  // Converts markdown to TipTap JSON format for proper rendering
  // Supports both overwrite and append modes
  const handlePRDGenerated = useCallback((generatedContent: string, mode: 'overwrite' | 'append' = 'append') => {
    if (!editor || !generatedContent) {
      console.warn('Cannot apply PRD content: editor or content is missing');
      return;
    }

    try {
      // Convert markdown to TipTap JSON format
      const tiptapDoc = markdownToTipTap(generatedContent);

      if (tiptapDoc.content && tiptapDoc.content.length > 0) {
        if (mode === 'overwrite') {
          // Clear existing content and set new content
          // Use setContent for overwrite to ensure clean replacement
          editor.commands.setContent(tiptapDoc);
        } else {
          // Append: Move to end of document and insert content
          // First, move cursor to the end of the document
          const endPos = editor.state.doc.content.size;
          editor
            .chain()
            .focus()
            .setTextSelection(endPos)
            .insertContent(tiptapDoc.content)
            .run();
        }
      }
    } catch (error) {
      console.error('Failed to apply PRD content:', error);
      toast.error('Failed to add content to note');
    }
  }, [editor]);

  // Handle template selection
  const handleTemplateSelect = useCallback((_templateId: string, _template: CustomPRDTemplate) => {
    setShowTemplateSelector(false);
    setAIPanelMode('prd-template');
    setShowAIPanel(true);
  }, []);

  // Handle AI rewrite from bubble menu
  const handleAIRewrite = useCallback((selectedText: string) => {
    setSelectedTextForRewrite(selectedText);
    setShowRewriteDrawer(true);
  }, []);

  // Handle applying rewritten text
  const handleApplyRewrite = useCallback((newText: string) => {
    if (!editor) return;
    
    // Replace the current selection with the new text
    editor.chain().focus().insertContent(newText).run();
  }, [editor]);

  return (
    <div className={cn('relative', className)}>
      <div className="relative bg-white">
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

      {/* AI Generation Panel */}
      <AIGenerationPanel
        open={showAIPanel}
        onClose={() => setShowAIPanel(false)}
        mode={aiPanelMode}
        currentContent={editor?.state.doc.textContent || ''}
        savedFeatures={savedFeatures}
        projectInstructions={projectInstructions}
        onPRDGenerated={handlePRDGenerated}
        onFeaturesGenerated={onFeaturesGenerated}
        onTasksGenerated={onTasksGenerated}
        onInsertCanvas={() => {
          // Insert an inline Excalidraw canvas after PRD content
          if (editor) {
            editor.chain().focus().insertExcalidraw().run();
          }
        }}
      />

      {/* PRD Template Selector */}
      <PRDTemplateSelector
        open={showTemplateSelector}
        onClose={() => setShowTemplateSelector(false)}
        onSelect={handleTemplateSelect}
      />

      {/* PRD Chat Drawer (Conversational PRD Generation) */}
      <PRDChatDrawer
        open={showPRDChatDrawer}
        onOpenChange={setShowPRDChatDrawer}
        noteContent={editor?.state.doc.textContent || ''}
        onApplyContent={handlePRDGenerated}
        onGenerateFeatures={(content) => {
          // Close chat drawer and open features panel
          setShowPRDChatDrawer(false);
          setAIPanelMode('generate-features');
          setShowAIPanel(true);
        }}
        onGenerateTasks={(content) => {
          // Close chat drawer and open tasks panel
          setShowPRDChatDrawer(false);
          setAIPanelMode('generate-tasks');
          setShowAIPanel(true);
        }}
      />

      {/* Section Chat Drawer (Conversational Section Generation) */}
      <SectionChatDrawer
        open={showSectionChatDrawer}
        onOpenChange={setShowSectionChatDrawer}
        noteContent={editor?.state.doc.textContent || ''}
        onApplyContent={handlePRDGenerated}
      />

      {/* Selection Bubble Menu */}
      <SelectionBubbleMenu 
        editor={editor} 
        onAIRewrite={handleAIRewrite} 
      />

      {/* AI Rewrite Drawer */}
      <AIRewriteDrawer
        open={showRewriteDrawer}
        onClose={() => setShowRewriteDrawer(false)}
        selectedText={selectedTextForRewrite}
        onApply={handleApplyRewrite}
      />
    </div>
  );
}

