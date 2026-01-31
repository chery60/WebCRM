'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import {
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Plus,
  Sparkles,
  ListTodo,
  Brain,
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { PRDChatMessage } from '@/types';
import {
  ThinkingIndicator,
  createDefaultGenerationSteps,
  type GenerationStep
} from './thinking-indicator';

// ============================================================================
// TYPES
// ============================================================================

interface PRDChatMessageProps {
  message: PRDChatMessage;
  isLastAssistantMessage?: boolean;
  onRevert?: (messageId: string) => void;
  onAddToNote?: (content: string) => void;
  onGenerateFeatures?: (content: string) => void;
  onGenerateTasks?: (content: string) => void;
  onCopy?: (content: string) => void;
  generationSteps?: GenerationStep[];
}

// ============================================================================
// SHIMMER EFFECT (AI SDK Elements pattern)
// ============================================================================

function Shimmer({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-3 animate-pulse", className)}>
      <div className="h-4 bg-muted rounded w-3/4"></div>
      <div className="h-4 bg-muted rounded w-full"></div>
      <div className="h-4 bg-muted rounded w-5/6"></div>
      <div className="h-4 bg-muted rounded w-2/3"></div>
    </div>
  );
}

// ============================================================================
// USER MESSAGE COMPONENT (No avatar, right-aligned bubble)
// ============================================================================

function UserMessage({
  message,
  onRevert
}: {
  message: PRDChatMessage;
  onRevert?: (messageId: string) => void;
}) {
  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-4 py-2.5 max-w-[85%]">
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
      </div>
      {onRevert && (
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground hover:text-foreground h-6 px-2"
          onClick={() => onRevert(message.id)}
        >
          <RotateCcw className="w-3 h-3 mr-1" />
          Revert to this version
        </Button>
      )}
    </div>
  );
}

// ============================================================================
// ASSISTANT MESSAGE COMPONENT (No avatar, left-aligned, clean design)
// ============================================================================

function AssistantMessage({
  message,
  isLastAssistantMessage,
  onAddToNote,
  onGenerateFeatures,
  onGenerateTasks,
  onCopy,
  generationSteps,
}: {
  message: PRDChatMessage;
  isLastAssistantMessage?: boolean;
  onAddToNote?: (content: string) => void;
  onGenerateFeatures?: (content: string) => void;
  onGenerateTasks?: (content: string) => void;
  onCopy?: (content: string) => void;
  generationSteps?: GenerationStep[];
}) {
  const [isReasoningExpanded, setIsReasoningExpanded] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  // Get clean content (without thinking tags)
  const cleanContent = React.useMemo(() => {
    const content = message.generatedContent || message.content;
    return stripThinkingContent(content);
  }, [message.generatedContent, message.content]);

  // Extract thinking content for display
  const thinkingContent = React.useMemo(() => {
    const content = message.generatedContent || message.content;
    return extractThinkingContent(content);
  }, [message.generatedContent, message.content]);

  const handleCopy = () => {
    navigator.clipboard.writeText(cleanContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopy?.(cleanContent);
  };

  // Show generation progress with ThinkingIndicator
  if (message.isGenerating) {
    const steps = generationSteps || createDefaultGenerationSteps();
    return (
      <div className="space-y-3">
        <ThinkingIndicator
          steps={steps}
          thinkingContent={thinkingContent || undefined}
          isComplete={false}
        />
        <Shimmer className="pl-2" />
      </div>
    );
  }

  // Show error state
  if (message.error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4">
        <p className="text-sm text-destructive">{message.error}</p>
      </div>
    );
  }

  // Check if we have actual PRD content or just placeholder
  // Lowered threshold from 100 to 20 - even short valid responses should be shown
  const hasFullContent = cleanContent && cleanContent.length > 20;

  return (
    <div className="space-y-3">
      {/* Reasoning section (AI SDK Elements "Chain of Thought" pattern) */}
      {thinkingContent && (
        <Collapsible open={isReasoningExpanded} onOpenChange={setIsReasoningExpanded}>
          <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group">
            <div className="flex items-center justify-center w-5 h-5 rounded bg-muted/50 group-hover:bg-muted transition-colors">
              <Brain className="w-3 h-3" />
            </div>
            {isReasoningExpanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
            <span className="font-medium">Thought process</span>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <div className="text-sm text-muted-foreground bg-muted/30 border border-border/50 rounded-lg p-3 max-h-48 overflow-y-auto">
              <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed">{thinkingContent}</pre>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Main content card */}
      <Card className="border-border/50 shadow-sm overflow-hidden">
        <CardContent className="p-4">
          {hasFullContent ? (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <div
                className="text-sm"
                dangerouslySetInnerHTML={{
                  __html: formatPRDContent(cleanContent)
                }}
              />
            </div>
          ) : cleanContent ? (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <div
                className="text-sm"
                dangerouslySetInnerHTML={{
                  __html: formatPRDContent(cleanContent)
                }}
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              Content generation complete. If no content is shown, please try again.
            </p>
          )}
        </CardContent>

        {/* Action buttons */}
        {isLastAssistantMessage && hasFullContent && (
          <CardFooter className="px-4 py-3 bg-muted/30 border-t border-border/50 flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 mr-1.5" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 mr-1.5" />
                  Copy
                </>
              )}
            </Button>

            {onAddToNote && (
              <Button
                variant="default"
                size="sm"
                className="h-8 text-xs"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onAddToNote(cleanContent);
                }}
              >
                <Plus className="w-3 h-3 mr-1.5" />
                Add to Note
              </Button>
            )}

            {onGenerateFeatures && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => onGenerateFeatures(cleanContent)}
              >
                <Sparkles className="w-3 h-3 mr-1.5" />
                Generate Features
              </Button>
            )}

            {onGenerateTasks && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => onGenerateTasks(cleanContent)}
              >
                <ListTodo className="w-3 h-3 mr-1.5" />
                Generate Tasks
              </Button>
            )}
          </CardFooter>
        )}
      </Card>
    </div>
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract content from <thinking> tags
 */
function extractThinkingContent(content: string): string | null {
  const thinkingMatch = content.match(/<thinking>([\s\S]*?)<\/thinking>/i);
  if (thinkingMatch) {
    return thinkingMatch[1].trim();
  }
  return null;
}

/**
 * Remove <thinking> tags and their content from the main content
 */
function stripThinkingContent(content: string): string {
  // Remove <thinking>...</thinking> blocks
  let cleaned = content.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');

  // Also handle cases where thinking might not be properly closed
  cleaned = cleaned.replace(/<thinking>[\s\S]*/gi, '');

  // Clean up any resulting double newlines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  return cleaned.trim();
}

function formatPRDContent(content: string): string {
  // Simple markdown-like formatting
  return content
    // Headers
    .replace(/^### (.*$)/gim, '<h3 class="text-base font-semibold mt-4 mb-2">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-lg font-semibold mt-5 mb-2 pb-1 border-b border-border/50">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-xl font-bold mt-5 mb-3">$1</h1>')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Code blocks (preserve mermaid)
    .replace(/```mermaid([\s\S]*?)```/g, '<pre class="bg-muted p-3 rounded-md text-xs overflow-x-auto my-3"><code class="language-mermaid">$1</code></pre>')
    // Inline code
    .replace(/`(.*?)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">$1</code>')
    // Lists
    .replace(/^\s*[-*] (.*$)/gim, '<li class="ml-4 my-0.5">$1</li>')
    // Line breaks (but not within list items)
    .replace(/\n(?!<li)/g, '<br />');
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PRDChatMessageComponent({
  message,
  isLastAssistantMessage = false,
  onRevert,
  onAddToNote,
  onGenerateFeatures,
  onGenerateTasks,
  onCopy,
  generationSteps,
}: PRDChatMessageProps) {
  if (message.role === 'user') {
    return <UserMessage message={message} onRevert={onRevert} />;
  }

  return (
    <AssistantMessage
      message={message}
      isLastAssistantMessage={isLastAssistantMessage}
      onAddToNote={onAddToNote}
      onGenerateFeatures={onGenerateFeatures}
      onGenerateTasks={onGenerateTasks}
      onCopy={onCopy}
      generationSteps={generationSteps}
    />
  );
}

export default PRDChatMessageComponent;
