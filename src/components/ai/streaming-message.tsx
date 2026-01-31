'use client';

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Bot, User, Loader2 } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { ChainOfThought, ThinkingIndicator, type ThinkingStep } from './chain-of-thought';
import { ToolInvocationsList, type ToolInvocation } from './tool-invocation';
// ============================================================================
// TYPES
// ============================================================================

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt?: Date;
}

interface StreamingMessageProps {
  message: Message;
  isStreaming?: boolean;
  showChainOfThought?: boolean;
  thinkingSteps?: ThinkingStep[];
  toolInvocations?: ToolInvocation[];
  actions?: React.ReactNode;
  className?: string;
}

// ============================================================================
// USER MESSAGE
// ============================================================================

function UserMessageDisplay({ message }: { message: Message }) {
  return (
    <div className="flex flex-col items-end gap-2 max-w-[85%] ml-auto">
      <div className="flex items-start gap-2">
        <div className="bg-primary/10 rounded-2xl rounded-br-sm px-4 py-3">
          <p className="text-sm text-foreground whitespace-pre-wrap">
            {message.content}
          </p>
        </div>
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
          <User className="w-4 h-4 text-primary" />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ASSISTANT MESSAGE
// ============================================================================

function AssistantMessageDisplay({ 
  message,
  isStreaming,
  showChainOfThought,
  thinkingSteps = [],
  toolInvocations = [],
  actions,
}: Omit<StreamingMessageProps, 'className'>) {
  const hasContent = message.content && message.content.length > 0;
  const isGenerating = isStreaming && !hasContent;

  // Parse content for markdown-like formatting
  const formattedContent = useMemo(() => {
    if (!hasContent) return '';
    
    return message.content
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
  }, [message.content, hasContent]);

  return (
    <div className="flex items-start gap-3 max-w-[90%]">
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Bot className="w-4 h-4 text-primary" />
      </div>
      
      <div className="flex-1 space-y-3">
        {/* Chain of Thought */}
        {showChainOfThought && (thinkingSteps.length > 0 || isStreaming) && (
          <ChainOfThought 
            steps={thinkingSteps} 
            isStreaming={isStreaming}
            defaultExpanded={isStreaming}
          />
        )}

        {/* Tool Invocations */}
        {toolInvocations.length > 0 && (
          <ToolInvocationsList invocations={toolInvocations} />
        )}

        {/* Loading State */}
        {isGenerating && (
          <ThinkingIndicator currentStep="Generating response..." />
        )}

        {/* Message Content */}
        {hasContent && (
          <Card className="border-border/50 shadow-sm">
            <CardContent className="p-4">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <div 
                  className="text-sm whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: formattedContent }} 
                />
              </div>
              {isStreaming && (
                <div className="mt-2 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">Generating...</span>
                </div>
              )}
            </CardContent>
            
            {/* Actions */}
            {actions && !isStreaming && (
              <CardFooter className="p-3 pt-0 flex flex-wrap gap-2 border-t border-border/50">
                {actions}
              </CardFooter>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function StreamingMessage({
  message,
  isStreaming = false,
  showChainOfThought = true,
  thinkingSteps = [],
  toolInvocations = [],
  actions,
  className,
}: StreamingMessageProps) {
  if (message.role === 'user') {
    return (
      <div className={className}>
        <UserMessageDisplay message={message} />
      </div>
    );
  }

  return (
    <div className={className}>
      <AssistantMessageDisplay
        message={message}
        isStreaming={isStreaming}
        showChainOfThought={showChainOfThought}
        thinkingSteps={thinkingSteps}
        toolInvocations={toolInvocations}
        actions={actions}
      />
    </div>
  );
}

export default StreamingMessage;
