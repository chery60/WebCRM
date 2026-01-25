'use client';

import { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Type,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Code,
  Table,
  Minus,
  Image,
  Wand2,
  MessageSquare,
  CheckCircle,
  Briefcase,
  FileTextIcon,
  LayoutTemplate,
  Lightbulb,
  ListTodo,
  Zap,
  Target,
  PenTool,
} from 'lucide-react';

export interface SlashCommand {
  id: string;
  name: string;
  description: string;
  category: 'ai-prd' | 'ai-action' | 'format' | 'widget';
  icon: React.ReactNode;
  command: string;
}

const commands: SlashCommand[] = [
  // AI PRD Commands (New - Prioritized at top)
  {
    id: 'generate-prd',
    name: 'Generate PRD',
    description: 'Create a full PRD from your idea',
    category: 'ai-prd',
    icon: <FileTextIcon className="h-4 w-4" />,
    command: 'generate-prd',
  },
  {
    id: 'prd-template',
    name: 'PRD from Template',
    description: 'Start with a structured PRD template',
    category: 'ai-prd',
    icon: <LayoutTemplate className="h-4 w-4" />,
    command: 'prd-template',
  },
  {
    id: 'generate-features',
    name: 'Generate Features',
    description: 'Extract features from this PRD',
    category: 'ai-prd',
    icon: <Lightbulb className="h-4 w-4" />,
    command: 'generate-features',
  },
  {
    id: 'generate-tasks',
    name: 'Generate Tasks',
    description: 'Create tasks from features',
    category: 'ai-prd',
    icon: <ListTodo className="h-4 w-4" />,
    command: 'generate-tasks',
  },
  {
    id: 'improve-prd',
    name: 'Improve PRD',
    description: 'Enhance and fill gaps in PRD',
    category: 'ai-prd',
    icon: <Zap className="h-4 w-4" />,
    command: 'improve-prd',
  },
  {
    id: 'generate-section',
    name: 'Generate Section',
    description: 'Generate a specific PRD section',
    category: 'ai-prd',
    icon: <Target className="h-4 w-4" />,
    command: 'generate-section',
  },
  // AI Actions
  {
    id: 'continue',
    name: 'Continue Writing',
    description: 'AI continues from cursor',
    category: 'ai-action',
    icon: <Wand2 className="h-4 w-4" />,
    command: 'continue',
  },
  {
    id: 'grammar',
    name: 'Fix Grammar',
    description: 'Fix grammar and spelling',
    category: 'ai-action',
    icon: <CheckCircle className="h-4 w-4" />,
    command: 'grammar',
  },
  {
    id: 'professional',
    name: 'Make Professional',
    description: 'Make text more formal',
    category: 'ai-action',
    icon: <Briefcase className="h-4 w-4" />,
    command: 'professional',
  },
  {
    id: 'ask-ai',
    name: 'Ask AI',
    description: 'Ask AI anything',
    category: 'ai-action',
    icon: <MessageSquare className="h-4 w-4" />,
    command: 'ask',
  },
  // Format
  {
    id: 'text',
    name: 'Text',
    description: 'Plain text paragraph',
    category: 'format',
    icon: <Type className="h-4 w-4" />,
    command: 'text',
  },
  {
    id: 'h1',
    name: 'Heading 1',
    description: 'Large section heading',
    category: 'format',
    icon: <Heading1 className="h-4 w-4" />,
    command: 'h1',
  },
  {
    id: 'h2',
    name: 'Heading 2',
    description: 'Medium section heading',
    category: 'format',
    icon: <Heading2 className="h-4 w-4" />,
    command: 'h2',
  },
  {
    id: 'h3',
    name: 'Heading 3',
    description: 'Small section heading',
    category: 'format',
    icon: <Heading3 className="h-4 w-4" />,
    command: 'h3',
  },
  {
    id: 'bullet',
    name: 'Bullet List',
    description: 'Unordered list',
    category: 'format',
    icon: <List className="h-4 w-4" />,
    command: 'bullet',
  },
  {
    id: 'numbered',
    name: 'Numbered List',
    description: 'Ordered list',
    category: 'format',
    icon: <ListOrdered className="h-4 w-4" />,
    command: 'numbered',
  },
  {
    id: 'todo',
    name: 'To-do List',
    description: 'Checkbox list',
    category: 'format',
    icon: <CheckSquare className="h-4 w-4" />,
    command: 'todo',
  },
  {
    id: 'quote',
    name: 'Quote',
    description: 'Blockquote',
    category: 'format',
    icon: <Quote className="h-4 w-4" />,
    command: 'quote',
  },
  // Widgets
  {
    id: 'code',
    name: 'Code Block',
    description: 'Syntax highlighted code',
    category: 'widget',
    icon: <Code className="h-4 w-4" />,
    command: 'code',
  },
  {
    id: 'table',
    name: 'Table',
    description: 'Insert a table',
    category: 'widget',
    icon: <Table className="h-4 w-4" />,
    command: 'table',
  },
  {
    id: 'divider',
    name: 'Divider',
    description: 'Horizontal rule',
    category: 'widget',
    icon: <Minus className="h-4 w-4" />,
    command: 'divider',
  },
  {
    id: 'image',
    name: 'Image',
    description: 'Insert an image',
    category: 'widget',
    icon: <Image className="h-4 w-4" />,
    command: 'image',
  },
  {
    id: 'canvas',
    name: 'Canvas',
    description: 'Insert an Excalidraw whiteboard',
    category: 'widget',
    icon: <PenTool className="h-4 w-4" />,
    command: 'canvas',
  },
];

const categoryLabels: Record<string, string> = {
  'ai-prd': '✨ PRD & Product',
  'ai-action': 'AI Actions',
  format: 'Format',
  widget: 'Widgets',
};

// Order for category display
const categoryOrder = ['ai-prd', 'ai-action', 'format', 'widget'];

interface SlashMenuProps {
  query: string;
  onSelect: (command: SlashCommand) => void;
  onClose: () => void;
}

export interface SlashMenuHandle {
  onKeyDown: (event: KeyboardEvent) => boolean;
}

export const SlashMenu = forwardRef<SlashMenuHandle, SlashMenuProps>(
  ({ query, onSelect, onClose }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    // Filter commands based on query
    const filteredCommands = commands.filter((cmd) =>
      cmd.name.toLowerCase().includes(query.toLowerCase()) ||
      cmd.command.toLowerCase().includes(query.toLowerCase()) ||
      cmd.description.toLowerCase().includes(query.toLowerCase())
    );

    // Group commands by category
    const groupedCommands = filteredCommands.reduce<Record<string, SlashCommand[]>>(
      (acc, cmd) => {
        if (!acc[cmd.category]) {
          acc[cmd.category] = [];
        }
        acc[cmd.category].push(cmd);
        return acc;
      },
      {}
    );

    // Reset selection when query changes
    useEffect(() => {
      setSelectedIndex(0);
    }, [query]);

    // Handle keyboard navigation
    const handleKeyDown = useCallback(
      (event: KeyboardEvent) => {
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredCommands.length - 1 ? prev + 1 : 0
          );
          return true;
        }

        if (event.key === 'ArrowUp') {
          event.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredCommands.length - 1
          );
          return true;
        }

        if (event.key === 'Enter') {
          event.preventDefault();
          if (filteredCommands[selectedIndex]) {
            onSelect(filteredCommands[selectedIndex]);
          }
          return true;
        }

        if (event.key === 'Escape') {
          event.preventDefault();
          onClose();
          return true;
        }

        return false;
      },
      [filteredCommands, selectedIndex, onSelect, onClose]
    );

    useImperativeHandle(ref, () => ({
      onKeyDown: handleKeyDown,
    }));

    if (filteredCommands.length === 0) {
      return (
        <div className="slash-command-menu">
          <div className="px-3 py-4 text-center text-sm text-muted-foreground">
            No commands found
          </div>
        </div>
      );
    }

    let globalIndex = 0;

    // Sort categories by defined order
    const sortedCategories = Object.keys(groupedCommands).sort(
      (a, b) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b)
    );

    return (
      <div className="slash-command-menu">
        <ScrollArea className="max-h-[320px]">
          {sortedCategories.map((category) => {
            const cmds = groupedCommands[category];
            return (
            <div key={category}>
              <div className="slash-command-category">
                {categoryLabels[category] || category}
              </div>
              {cmds.map((cmd) => {
                const currentIndex = globalIndex++;
                const isSelected = currentIndex === selectedIndex;

                return (
                  <button
                    key={cmd.id}
                    className={cn(
                      'slash-command-item w-full text-left',
                      isSelected && 'is-selected'
                    )}
                    onClick={() => onSelect(cmd)}
                    onMouseEnter={() => setSelectedIndex(currentIndex)}
                  >
                    <div className="slash-command-item-icon">
                      {cmd.icon}
                    </div>
                    <div className="slash-command-item-content">
                      <div className="slash-command-item-title">{cmd.name}</div>
                      <div className="slash-command-item-description">
                        {cmd.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            );
          })}
        </ScrollArea>
      </div>
    );
  }
);

SlashMenu.displayName = 'SlashMenu';

export { commands };

