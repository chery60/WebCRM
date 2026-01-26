'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { 
  RotateCcw, 
  User, 
  Bot, 
  ChevronDown, 
  ChevronRight,
  Copy,
  Check,
  Plus,
  Loader2
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { SectionChatMessage } from '@/lib/stores/section-chat-store';

// ============================================================================
// TYPES
// ============================================================================

interface SectionChatMessageProps {
  message: SectionChatMessage;
  isLastAssistantMessage?: boolean;
  onRevert?: (messageId: string) => void;
  onAddToNote?: (content: string) => void;
  onCopy?: (content: string) => void;
}

// ============================================================================
// USER MESSAGE COMPONENT
// ============================================================================

function UserMessage({ 
  message, 
  onRevert 
}: { 
  message: SectionChatMessage; 
  onRevert?: (messageId: string) => void;
}) {
  return (
    <div className="flex flex-col items-end gap-2 max-w-[85%] ml-auto">
      <div className="flex items-start gap-2">
        <div className="bg-muted rounded-2xl rounded-br-sm px-4 py-3">
          <p className="text-sm text-foreground whitespace-pre-wrap">{message.content}</p>
        </div>
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <User className="w-4 h-4 text-primary" />
        </div>
      </div>
      {onRevert && (
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground hover:text-foreground h-7 px-2"
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
// ASSISTANT MESSAGE COMPONENT
// ============================================================================

function AssistantMessage({ 
  message,
  isLastAssistantMessage,
  onAddToNote,
  onCopy,
}: { 
  message: SectionChatMessage;
  isLastAssistantMessage?: boolean;
  onAddToNote?: (content: string) => void;
  onCopy?: (content: string) => void;
}) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    const contentToCopy = message.generatedContent || message.content;
    navigator.clipboard.writeText(contentToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopy?.(contentToCopy);
  };

  // Show loading state
  if (message.isGenerating) {
    return (
      <div className="flex items-start gap-3 max-w-[90%]">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Bot className="w-4 h-4 text-primary" />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground min-h-[32px]">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Generating section...</span>
        </div>
      </div>
    );
  }

  // Show error state
  if (message.error) {
    return (
      <div className="flex items-start gap-3 max-w-[90%]">
        <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
          <Bot className="w-4 h-4 text-destructive" />
        </div>
        <div className="flex-1">
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="p-4">
              <p className="text-sm text-destructive">{message.error}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const generatedContent = message.generatedContent || message.content;

  return (
    <div className="flex items-start gap-3 max-w-[90%]">
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Bot className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 space-y-3">
        {/* Thinking/reasoning section (collapsible) */}
        {message.content && message.generatedContent && message.content !== message.generatedContent && (
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors py-1">
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
                <span>Thought process</span>
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-1">
              <p className="text-sm text-muted-foreground pl-5">
                {message.content}
              </p>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Generated Section Content */}
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <div 
                className="text-sm whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ 
                  __html: formatSectionContent(generatedContent) 
                }} 
              />
            </div>
          </CardContent>
          
          {/* Action buttons - shown at the end of the last AI message */}
          {isLastAssistantMessage && (
            <CardFooter className="p-3 pt-0 flex flex-wrap gap-2 border-t border-border/50">
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
                  onClick={() => onAddToNote(generatedContent)}
                >
                  <Plus className="w-3 h-3 mr-1.5" />
                  Add to Note
                </Button>
              )}
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatSectionContent(content: string): string {
  // Simple markdown-like formatting
  return content
    // Headers
    .replace(/^### (.*$)/gim, '<h3 class="text-base font-semibold mt-4 mb-2">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-lg font-semibold mt-4 mb-2">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-xl font-bold mt-4 mb-2">$1</h1>')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Code
    .replace(/`(.*?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-sm">$1</code>')
    // Lists
    .replace(/^\s*[-*] (.*$)/gim, '<li class="ml-4">$1</li>')
    // Line breaks
    .replace(/\n/g, '<br />');
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function SectionChatMessageComponent({
  message,
  isLastAssistantMessage = false,
  onRevert,
  onAddToNote,
  onCopy,
}: SectionChatMessageProps) {
  if (message.role === 'user') {
    return <UserMessage message={message} onRevert={onRevert} />;
  }

  return (
    <AssistantMessage
      message={message}
      isLastAssistantMessage={isLastAssistantMessage}
      onAddToNote={onAddToNote}
      onCopy={onCopy}
    />
  );
}

export default SectionChatMessageComponent;
