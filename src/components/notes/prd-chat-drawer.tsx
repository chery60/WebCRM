'use client';

import React, { useRef, useEffect, useCallback } from 'react';
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
import { PRDChatMessageComponent } from './prd-chat-message';
import { PRDChatInput } from './prd-chat-input';
import { CustomTemplateModal } from './custom-template-modal';
import { usePRDChatStore } from '@/lib/stores/prd-chat-store';
import { useCustomTemplatesStore } from '@/lib/stores/custom-templates-store';
import { useAISettingsStore, type AIProviderType } from '@/lib/stores/ai-settings-store';
import { PRD_TEMPLATES } from '@/lib/ai/prompts/prd-templates';
import { prdGenerator } from '@/lib/ai/services/prd-generator';
import type { PRDTemplateType, PRDChatMessage, CustomPRDTemplate } from '@/types';

// ============================================================================
// TYPES
// ============================================================================

interface PRDChatDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  noteContent: string;
  onApplyContent: (content: string, mode: 'overwrite' | 'append') => void;
  onGenerateFeatures?: (content: string) => void;
  onGenerateTasks?: (content: string) => void;
  noteId?: string;
}

// ============================================================================
// AI GENERATION FUNCTION
// ============================================================================

async function generatePRDWithAI(
  prompt: string,
  template: PRDTemplateType | string,
  provider: AIProviderType | null,
  customTemplates: CustomPRDTemplate[],
  existingContent?: string
): Promise<{ content: string; thinking?: string }> {
  // Check if using a built-in template
  const isBuiltInTemplate = template in PRD_TEMPLATES;
  
  // Get custom template sections if applicable
  let customSections: string[] | undefined;
  if (!isBuiltInTemplate) {
    const customTemplate = customTemplates.find(t => t.id === template);
    if (customTemplate) {
      customSections = customTemplate.sections
        .sort((a, b) => a.order - b.order)
        .map(s => s.title);
    }
  }

  // Determine if this is an improvement request (has existing content)
  if (existingContent && existingContent.trim().length > 100) {
    // Improve existing PRD
    const result = await prdGenerator.improvePRD({
      currentContent: existingContent,
      focusAreas: prompt ? [prompt] : undefined,
      provider: provider || undefined,
    });
    
    return {
      content: result.content,
      thinking: `Analyzing the existing PRD and incorporating: "${prompt}"`,
    };
  }

  // Generate new PRD
  if (isBuiltInTemplate && template !== 'custom') {
    const result = await prdGenerator.generateFullPRD({
      description: prompt,
      templateType: template as PRDTemplateType,
      provider: provider || undefined,
    });
    
    return {
      content: result.content,
      thinking: `Using ${PRD_TEMPLATES[template as PRDTemplateType].name} template to structure the PRD`,
    };
  } else if (customSections && customSections.length > 0) {
    // Generate with custom sections - pass them as context
    const sectionsContext = `Please structure the PRD with these specific sections:\n${customSections.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;
    
    const result = await prdGenerator.generateFullPRD({
      description: prompt,
      templateType: 'custom',
      context: sectionsContext,
      provider: provider || undefined,
    });
    
    return {
      content: result.content,
      thinking: `Using custom template with ${customSections.length} sections`,
    };
  } else {
    // Quick generate without template
    const result = await prdGenerator.quickGenerate(prompt, provider || undefined);
    
    return {
      content: result.content,
      thinking: `Generating a comprehensive PRD based on the description`,
    };
  }
}

// ============================================================================
// WELCOME MESSAGE COMPONENT
// ============================================================================

function WelcomeMessage({ onSuggestionClick }: { onSuggestionClick: (text: string) => void }) {
  const suggestions = [
    "Build a task management app for remote teams",
    "Create a customer feedback portal with analytics",
    "Design an AI-powered writing assistant",
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <Sparkles className="w-8 h-8 text-primary" />
      </div>
      <h3 className="text-lg font-semibold mb-2">Generate PRD with AI</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        Describe your product or feature idea, and I&apos;ll help you create a comprehensive 
        Product Requirements Document based on your selected template.
      </p>
      <div className="flex flex-wrap gap-2 justify-center">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            className="px-3 py-1.5 text-xs bg-muted hover:bg-muted/80 rounded-full transition-colors text-left"
            onClick={() => onSuggestionClick(suggestion)}
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PRDChatDrawer({
  open,
  onOpenChange,
  noteContent,
  onApplyContent,
  onGenerateFeatures,
  onGenerateTasks,
  noteId,
}: PRDChatDrawerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = React.useState(false);
  const [isGenerating, setIsGenerating] = React.useState(false);
  
  // State for overwrite/append dialog
  const [showApplyModeDialog, setShowApplyModeDialog] = React.useState(false);
  const [pendingContent, setPendingContent] = React.useState<string | null>(null);

  const {
    session,
    selectedProvider,
    selectedTemplate,
    startNewSession,
    addUserMessage,
    addAssistantMessage,
    updateAssistantMessage,
    setSelectedProvider,
    setSelectedTemplate,
    setCurrentNoteContent,
    revertToVersion,
  } = usePRDChatStore();

  const { templates: customTemplates } = useCustomTemplatesStore();

  // Initialize session when drawer opens
  useEffect(() => {
    if (open && !session) {
      startNewSession(noteId);
    }
  }, [open, session, noteId, startNewSession]);

  // Update current note content when it changes
  useEffect(() => {
    setCurrentNoteContent(noteContent);
  }, [noteContent, setCurrentNoteContent]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [session?.messages]);

  const handleSendMessage = useCallback(async (message: string) => {
    if (isGenerating) return;

    // Add user message with current note snapshot
    const userMsg = addUserMessage(message, noteContent);

    // Create placeholder assistant message
    const assistantMsg = addAssistantMessage('', undefined);
    updateAssistantMessage(assistantMsg.id, { isGenerating: true });

    setIsGenerating(true);

    try {
      // Generate PRD with AI
      const result = await generatePRDWithAI(
        message,
        selectedTemplate,
        selectedProvider,
        customTemplates,
        noteContent // Pass existing content for context/improvement
      );

      updateAssistantMessage(assistantMsg.id, {
        content: result.thinking || 'Here\'s your generated PRD:',
        generatedContent: result.content,
        isGenerating: false,
      });
    } catch (error) {
      console.error('PRD generation failed:', error);
      
      // Provide user-friendly error messages
      let errorMessage = 'Failed to generate PRD. Please try again.';
      if (error instanceof Error) {
        if (error.message.includes('API key') || error.message.includes('401')) {
          errorMessage = 'Invalid API key. Please check your settings.';
        } else if (error.message.includes('rate limit') || error.message.includes('429')) {
          errorMessage = 'Rate limit exceeded. Please wait a moment and try again.';
        } else if (error.message.includes('network')) {
          errorMessage = 'Network error. Please check your connection.';
        } else {
          errorMessage = error.message;
        }
      }
      
      updateAssistantMessage(assistantMsg.id, {
        error: errorMessage,
        isGenerating: false,
      });
    } finally {
      setIsGenerating(false);
    }
  }, [
    isGenerating,
    noteContent,
    selectedTemplate,
    selectedProvider,
    customTemplates,
    addUserMessage,
    addAssistantMessage,
    updateAssistantMessage,
  ]);

  const handleRevert = useCallback((messageId: string) => {
    const snapshot = revertToVersion(messageId);
    if (snapshot !== undefined) {
      onApplyContent(snapshot, 'overwrite');
    }
  }, [revertToVersion, onApplyContent]);

  const handleAddToNote = useCallback((content: string) => {
    if (!content) {
      console.warn('No content to add to note');
      return;
    }

    // Check if there's existing content in the note (more than just whitespace)
    const hasExistingContent = noteContent && noteContent.trim().length > 0;

    if (hasExistingContent) {
      // Show dialog to ask user whether to overwrite or append
      setPendingContent(content);
      setShowApplyModeDialog(true);
    } else {
      // No existing content, just apply directly
      onApplyContent(content, 'append');
    }
  }, [noteContent, onApplyContent]);

  const handleApplyModeSelect = useCallback((mode: 'overwrite' | 'append') => {
    if (pendingContent && onApplyContent) {
      onApplyContent(pendingContent, mode);
    }
    setPendingContent(null);
    setShowApplyModeDialog(false);
  }, [pendingContent, onApplyContent]);

  const handleTemplateCreated = useCallback((template: CustomPRDTemplate) => {
    setSelectedTemplate(template.id);
  }, [setSelectedTemplate]);

  // Find the last assistant message for action buttons
  const lastAssistantMessageId = session?.messages
    .filter(m => m.role === 'assistant' && !m.isGenerating && !m.error)
    .pop()?.id;

  const messages = session?.messages || [];

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent 
          side="right" 
          className="w-full sm:max-w-xl p-0 flex flex-col [&>button]:hidden"
        >
          {/* Header */}
          <SheetHeader className="px-6 py-4 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <SheetTitle className="text-left">PRD Assistant</SheetTitle>
                  <SheetDescription className="text-left">
                    Generate and refine your PRD through conversation
                  </SheetDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {messages.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => startNewSession(noteId)}
                  >
                    <RotateCcw className="h-3 w-3 mr-1.5" />
                    New Chat
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onOpenChange(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </SheetHeader>

          {/* Messages Area */}
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-6 py-4"
          >
            {messages.length === 0 ? (
              <WelcomeMessage onSuggestionClick={handleSendMessage} />
            ) : (
              <div className="space-y-6 pb-4">
                {messages.map((message) => (
                  <PRDChatMessageComponent
                    key={message.id}
                    message={message}
                    isLastAssistantMessage={message.id === lastAssistantMessageId}
                    onRevert={message.role === 'user' ? handleRevert : undefined}
                    onAddToNote={handleAddToNote}
                    onGenerateFeatures={onGenerateFeatures}
                    onGenerateTasks={onGenerateTasks}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Input Area */}
          <PRDChatInput
            onSend={handleSendMessage}
            onOpenTemplateModal={() => setIsTemplateModalOpen(true)}
            selectedProvider={selectedProvider}
            onProviderChange={setSelectedProvider}
            selectedTemplate={selectedTemplate}
            onTemplateChange={setSelectedTemplate}
            disabled={isGenerating}
            placeholder="Describe your product or feature..."
          />
        </SheetContent>
      </Sheet>

      {/* Custom Template Modal */}
      <CustomTemplateModal
        open={isTemplateModalOpen}
        onOpenChange={setIsTemplateModalOpen}
        onTemplateCreated={handleTemplateCreated}
      />

      {/* Overwrite/Append Dialog */}
      <AlertDialog open={showApplyModeDialog} onOpenChange={setShowApplyModeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add PRD to Note</AlertDialogTitle>
            <AlertDialogDescription>
              Your note already has content. Would you like to replace the existing content or add the new PRD at the end?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel onClick={() => setShowApplyModeDialog(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleApplyModeSelect('append')}
              className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
            >
              <Plus className="w-4 h-4 mr-2" />
              Append to Note
            </AlertDialogAction>
            <AlertDialogAction
              onClick={() => handleApplyModeSelect('overwrite')}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Replace className="w-4 h-4 mr-2" />
              Overwrite
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default PRDChatDrawer;
