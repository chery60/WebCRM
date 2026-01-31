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
  Sparkles, 
  X,
  MessageSquare,
  RotateCcw,
  Replace,
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
import { CustomTemplateModal } from './custom-template-modal';
import { EditTemplatesModal } from './edit-templates-modal';
import { usePRDChatStore } from '@/lib/stores/prd-chat-store';
import { useCustomTemplatesStore } from '@/lib/stores/custom-templates-store';
import { useAIPRDChat } from '@/lib/ai/use-ai-chat';
import { type AIProviderType } from '@/lib/stores/ai-settings-store';
import type { ThinkingStep } from '@/components/ai/chain-of-thought';
import type { ToolInvocation } from '@/components/ai/tool-invocation';

// ============================================================================
// TYPES
// ============================================================================

export interface PRDChatDrawerV2Props {
  isOpen: boolean;
  onClose: () => void;
  onAddToNote: (content: string) => void;
  currentNoteContent?: string;
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
  
  // Also handle direct content property (for backward compatibility)
  if (!content && uiMessage.content) {
    content = uiMessage.content;
  }
  
  return {
    id: uiMessage.id,
    role: uiMessage.role,
    content: content,
    createdAt: new Date(),
  };
}

function extractToolInvocations(uiMessage: any): ToolInvocation[] {
  const toolInvocations: ToolInvocation[] = [];
  
  if (uiMessage.parts && Array.isArray(uiMessage.parts)) {
    for (const part of uiMessage.parts) {
      if (part.type === 'tool-call' || part.type === 'tool-invocation') {
        toolInvocations.push({
          id: part.toolCallId || part.id || `tool-${Math.random()}`,
          toolName: part.toolName || part.name || 'unknown',
          args: part.args || part.arguments || {},
          result: part.result,
          state: part.state || (part.result ? 'completed' : 'pending'),
          error: part.error,
          startedAt: new Date(),
          completedAt: part.result ? new Date() : undefined,
        });
      }
    }
  }
  
  return toolInvocations;
}

function extractThinkingSteps(content: string): ThinkingStep[] {
  // Parse thinking steps from special markers in the content
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
  // Remove thinking tags from content
  return content.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PRDChatDrawerV2({
  isOpen,
  onClose,
  onAddToNote,
  currentNoteContent = '',
}: PRDChatDrawerV2Props) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState('');
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showEditTemplatesModal, setShowEditTemplatesModal] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [messageActions, setMessageActions] = useState<Record<string, React.ReactNode>>({});

  // Store hooks
  const {
    selectedProvider,
    setSelectedProvider,
    selectedTemplate,
    setSelectedTemplate,
  } = usePRDChatStore();

  const { templates: customTemplates } = useCustomTemplatesStore();

  // Get template for full context
  const template = customTemplates.find(t => t.id === selectedTemplate);
  const templateSections = template?.sections || [];

  // AI SDK hook for chat with full template context
  const chat = useAIPRDChat({
    provider: selectedProvider || undefined,
    templateName: template?.name,
    templateDescription: template?.description,
    templateContextPrompt: template?.contextPrompt,
    templateSections: templateSections.map(s => ({
      id: s.id,
      title: s.title,
      order: s.order,
      description: s.description,
    })),
    onFinish: (message) => {
      console.log('PRD generation finished:', message);
    },
    onError: (error) => {
      console.error('PRD generation error:', error);
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

    // Add context about template if selected
    let contextualMessage = message;
    if (template) {
      contextualMessage = `Using template: ${template.name}\n\n${message}`;
    }

    // Send message using AI SDK
    chat.sendMessage({ role: 'user', parts: [{ type: 'text', text: contextualMessage }] });

    // Clear input
    setInputValue('');
  };

  const handleClearChat = () => {
    setShowClearDialog(true);
  };

  const confirmClearChat = () => {
    // Clear messages by reloading the page or resetting state
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
              onClick={() => {
                // Regenerate last response
                if (chat.regenerate) {
                  chat.regenerate();
                }
              }}
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
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <SheetTitle className="text-left">PRD Assistant</SheetTitle>
                  <SheetDescription className="text-left">
                    Generate and refine your PRD through conversation
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

            {/* Action buttons */}
            <div className="flex items-center gap-2 pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearChat}
                disabled={messages.length === 0}
                className="h-8 text-xs"
              >
                <MessageSquare className="w-3 h-3 mr-1.5" />
                Clear Chat
              </Button>
            </div>
          </SheetHeader>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {convertedMessages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4 py-12">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Start a Conversation</h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Describe your product or feature, and I'll help you create a comprehensive PRD.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center max-w-md">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setInputValue('Create a PRD for a task management feature')}
                    className="text-xs"
                  >
                    Task Management Feature
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setInputValue('Create a PRD for a user authentication system')}
                    className="text-xs"
                  >
                    User Authentication
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setInputValue('Create a PRD for a notification center')}
                    className="text-xs"
                  >
                    Notification Center
                  </Button>
                </div>
              </div>
            )}

            {convertedMessages.map((message, index) => {
              const isLastMessage = index === convertedMessages.length - 1;
              const isStreaming = isLastMessage && isLoading;
              const thinkingSteps = extractThinkingSteps(message.content);
              const toolInvocations = extractToolInvocations(messages[index]);

              return (
                <StreamingMessage
                  key={message.id}
                  message={message}
                  isStreaming={isStreaming}
                  showChainOfThought={true}
                  thinkingSteps={thinkingSteps}
                  toolInvocations={toolInvocations}
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
            onOpenTemplateModal={() => setShowTemplateModal(true)}
            onOpenEditTemplatesModal={() => setShowEditTemplatesModal(true)}
            selectedProvider={selectedProvider}
            onProviderChange={setSelectedProvider}
            selectedTemplate={selectedTemplate}
            onTemplateChange={setSelectedTemplate}
            disabled={false}
            isStreaming={isLoading}
            placeholder="Describe your product or feature..."
          />
        </SheetContent>
      </Sheet>

      {/* Template Modal */}
      <CustomTemplateModal
        open={showTemplateModal}
        onOpenChange={setShowTemplateModal}
      />

      {/* Edit Templates Modal */}
      <EditTemplatesModal
        open={showEditTemplatesModal}
        onOpenChange={setShowEditTemplatesModal}
      />

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

export default PRDChatDrawerV2;
