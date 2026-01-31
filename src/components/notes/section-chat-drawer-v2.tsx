'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { 
  Target, 
  X,
  RotateCcw,
  Plus,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { StreamingMessage, type Message } from '@/components/ai/streaming-message';
import { PRDChatInputV2 } from './prd-chat-input-v2';
import { useSectionChatStore } from '@/lib/stores/section-chat-store';
import { useAIChat } from '@/lib/ai/use-ai-chat';
import { type AIProviderType } from '@/lib/stores/ai-settings-store';
import type { ThinkingStep } from '@/components/ai/chain-of-thought';

// ============================================================================
// TYPES
// ============================================================================

export interface SectionChatDrawerV2Props {
  isOpen: boolean;
  onClose: () => void;
  onAddToNote: (content: string) => void;
  sectionTitle?: string;
  sectionContext?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function convertUIMessageToMessage(uiMessage: any): Message {
  // Extract text content from parts
  let content = '';
  if (uiMessage.parts && Array.isArray(uiMessage.parts)) {
    for (const part of uiMessage.parts) {
      if (part.type === 'text' && part.text) {
        content += part.text;
      }
    }
  }
  
  return {
    id: uiMessage.id,
    role: uiMessage.role,
    content: content,
    createdAt: new Date(),
  };
}

function extractThinkingSteps(content: string): ThinkingStep[] {
  const steps: ThinkingStep[] = [];
  const thinkingRegex = /<thinking>([\s\S]*?)<\/thinking>/g;
  let match;
  let index = 0;
  
  while ((match = thinkingRegex.exec(content)) !== null) {
    const thinkingContent = match[1].trim();
    steps.push({
      id: `step-${index++}`,
      type: 'reasoning',
      content: thinkingContent,
      status: 'completed',
      timestamp: new Date(),
    });
  }
  
  return steps;
}

function cleanContentFromThinking(content: string): string {
  return content.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function SectionChatDrawerV2({
  isOpen,
  onClose,
  onAddToNote,
  sectionTitle = '',
  sectionContext = '',
}: SectionChatDrawerV2Props) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState('');
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [messageActions, setMessageActions] = useState<Record<string, React.ReactNode>>({});

  // Store hooks
  const {
    selectedProvider,
    setSelectedProvider,
  } = useSectionChatStore();

  // AI SDK hook for chat
  const chat = useAIChat({
    provider: selectedProvider || undefined,
    type: 'generate-prd-section',
    temperature: 0.5,
    onFinish: (message) => {
      console.log('Section generation finished:', message);
    },
    onError: (error) => {
      console.error('Section generation error:', error);
    },
  });

  const { messages, error, status } = chat;
  const isLoading = status === 'submitted' || status === 'streaming';

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (message: string) => {
    if (!message.trim() || isLoading) return;

    // Build contextual message
    let contextualMessage = '';
    if (sectionTitle) {
      contextualMessage += `Section: ${sectionTitle}\n\n`;
    }
    if (sectionContext) {
      contextualMessage += `Context from PRD:\n${sectionContext}\n\n`;
    }
    contextualMessage += `User request: ${message}`;

    // Send message using AI SDK
    chat.sendMessage({ role: 'user', parts: [{ type: 'text', text: contextualMessage }] });

    // Clear input
    setInputValue('');
  };

  const handleClearChat = () => {
    setShowClearDialog(true);
  };

  const confirmClearChat = () => {
    window.location.reload();
    setShowClearDialog(false);
  };

  const handleAddToNote = (messageId: string, content: string) => {
    const cleanedContent = cleanContentFromThinking(content);
    onAddToNote(cleanedContent);
  };

  // Convert UI messages to our Message format
  const convertedMessages: Message[] = messages.map(convertUIMessageToMessage);

  // Generate actions for each assistant message
  useEffect(() => {
    const actions: Record<string, React.ReactNode> = {};
    
    convertedMessages.forEach((message, index) => {
      if (message.role === 'assistant' && index === convertedMessages.length - 1 && !isLoading) {
        const cleanedContent = cleanContentFromThinking(message.content);
        actions[message.id] = (
          <>
            <Button
              variant="default"
              size="sm"
              className="h-8 text-xs"
              onClick={() => handleAddToNote(message.id, cleanedContent)}
            >
              <Plus className="w-3 h-3 mr-1.5" />
              Add to Note
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => chat.regenerate && chat.regenerate()}
            >
              <RotateCcw className="w-3 h-3 mr-1.5" />
              Regenerate
            </Button>
          </>
        );
      }
    });

    setMessageActions(actions);
  }, [convertedMessages, isLoading]);

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent 
          side="right" 
          className="w-full sm:max-w-2xl p-0 flex flex-col"
        >
          {/* Header */}
          <SheetHeader className="p-6 pb-4 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Target className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <SheetTitle className="text-left">
                    {sectionTitle || 'Section Assistant'}
                  </SheetTitle>
                  <SheetDescription className="text-left">
                    Generate and refine this section
                  </SheetDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {convertedMessages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4 py-12">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Target className="w-8 h-8 text-primary" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Generate Section Content</h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Describe what you want to include in this section, and I'll help you create detailed content.
                  </p>
                </div>
              </div>
            )}

            {convertedMessages.map((message, index) => {
              const isLastMessage = index === convertedMessages.length - 1;
              const isStreaming = isLastMessage && isLoading;
              const thinkingSteps = extractThinkingSteps(message.content);

              return (
                <StreamingMessage
                  key={message.id}
                  message={message}
                  isStreaming={isStreaming}
                  showChainOfThought={true}
                  thinkingSteps={thinkingSteps}
                  actions={messageActions[message.id]}
                />
              );
            })}

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-sm text-destructive">
                <strong>Error:</strong> {error.message}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <PRDChatInputV2
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleSubmit}
            onStop={() => chat.stop && chat.stop()}
            onOpenTemplateModal={() => {}}
            onOpenEditTemplatesModal={() => {}}
            selectedProvider={selectedProvider}
            onProviderChange={setSelectedProvider}
            selectedTemplate=""
            onTemplateChange={() => {}}
            disabled={false}
            isStreaming={isLoading}
            placeholder="Describe what to include in this section..."
          />
        </SheetContent>
      </Sheet>

      {/* Clear Chat Confirmation */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear chat history?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all messages from the current conversation. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmClearChat}>
              Clear Chat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default SectionChatDrawerV2;
