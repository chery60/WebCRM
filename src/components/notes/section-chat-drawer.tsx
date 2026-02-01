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
  Target, 
  X,
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
import { SectionChatMessageComponent } from './section-chat-message';
import { SectionChatInput } from './section-chat-input';
import { CustomTemplateModal } from './custom-template-modal';
import { EditTemplatesModal } from './edit-templates-modal';
import { useSectionChatStore } from '@/lib/stores/section-chat-store';
import { useCustomTemplatesStore } from '@/lib/stores/custom-templates-store';
import type { AIProviderType } from '@/lib/stores/ai-settings-store';
import { prdGenerator } from '@/lib/ai/services/prd-generator';
import type { CustomPRDTemplate } from '@/types';

// ============================================================================
// TYPES
// ============================================================================

interface SectionChatDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  noteContent: string;
  onApplyContent: (content: string, mode: 'overwrite' | 'append') => void;
  noteId?: string;
}

// ============================================================================
// AI GENERATION FUNCTION
// ============================================================================

async function generateSectionWithAI(
  prompt: string,
  templateId: string,
  sectionId: string,
  provider: AIProviderType | null,
  customTemplates: CustomPRDTemplate[],
  existingContent?: string
): Promise<{ content: string; thinking?: string }> {
  // Find the template from the store
  const template = customTemplates.find(t => t.id === templateId);
  
  // Get the specific section
  const section = template?.sections.find(s => s.id === sectionId);
  const sectionTitle = section?.title || 'Section';
  const sectionDescription = section?.description || '';

  // Build comprehensive guidance with template context and section details
  const templateName = template?.name || 'Custom Template';
  const templateDescription = template?.description || '';
  
  const guidance = `## Section to Generate
**Section Title:** ${sectionTitle}
${sectionDescription ? `**Section Purpose:** ${sectionDescription}` : ''}

## Template Context
**Template:** ${templateName}
${templateDescription ? `**Template Description:** ${templateDescription}` : ''}
${template?.contextPrompt ? `**Additional Context:** ${template.contextPrompt}` : ''}

## Content Requirements
Generate comprehensive content for this section that includes:
- **Detailed explanations** with specific examples
- **Tables** where comparisons or structured data would be helpful
- **Mermaid diagrams** (flowcharts, sequence diagrams) if the section involves processes or flows
- **Bullet lists** for key points, requirements, or acceptance criteria
- **User stories** in the format "As a [user], I want [feature] so that [benefit]" where applicable

## User Request
${prompt}

Generate content specifically for the "${sectionTitle}" section based on the above context. Make it comprehensive, well-structured, and include visual elements (tables, diagrams) where they add value.`;

  // Use the PRD generator to create section content
  const result = await prdGenerator.generateSection({
    sectionId: sectionId,
    description: prompt,
    existingContent: existingContent,
    guidance: guidance,
    provider: provider || undefined,
  });
  
  return {
    content: result.content,
    thinking: `Generating "${sectionTitle}" section based on your input`,
  };
}

// ============================================================================
// WELCOME MESSAGE COMPONENT
// ============================================================================

function WelcomeMessage({ 
  onSuggestionClick,
  sectionTitle 
}: { 
  onSuggestionClick: (text: string) => void;
  sectionTitle?: string;
}) {
  const suggestions = [
    "Generate based on the existing PRD content",
    "Include specific requirements and constraints",
    "Focus on user needs and pain points",
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <Target className="w-8 h-8 text-primary" />
      </div>
      <h3 className="text-lg font-semibold mb-2">Generate Section</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        {sectionTitle 
          ? `Describe what you want in the "${sectionTitle}" section, and I'll generate it for you.`
          : 'Select a template and section, then describe what you want to generate.'}
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

export function SectionChatDrawer({
  open,
  onOpenChange,
  noteContent,
  onApplyContent,
  noteId,
}: SectionChatDrawerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = React.useState(false);
  const [isEditTemplatesModalOpen, setIsEditTemplatesModalOpen] = React.useState(false);
  const [isGenerating, setIsGenerating] = React.useState(false);
  
  // State for overwrite/append dialog
  const [showApplyModeDialog, setShowApplyModeDialog] = React.useState(false);
  const [pendingContent, setPendingContent] = React.useState<string | null>(null);

  const {
    session,
    selectedProvider,
    selectedTemplate,
    selectedSection,
    loadOrCreateSession,
    startNewSession,
    addUserMessage,
    addAssistantMessage,
    updateAssistantMessage,
    setSelectedProvider,
    setSelectedTemplate,
    setSelectedSection,
    setCurrentNoteContent,
    revertToVersion,
  } = useSectionChatStore();

  const { templates: customTemplates, seedStarterTemplates, hasSeededStarterTemplates } = useCustomTemplatesStore();

  // Get current section title for display
  const selectedTemplateData = customTemplates.find(t => t.id === selectedTemplate);
  const currentSection = selectedTemplateData?.sections.find(s => s.id === selectedSection);
  const currentSectionTitle = currentSection?.title;

  // Seed starter templates on first load
  useEffect(() => {
    if (!hasSeededStarterTemplates) {
      seedStarterTemplates();
    }
  }, [hasSeededStarterTemplates, seedStarterTemplates]);

  // Set default template to first starter template if none selected
  useEffect(() => {
    if (customTemplates.length > 0 && !selectedTemplate) {
      const firstStarterTemplate = customTemplates.find(t => t.isStarterTemplate);
      if (firstStarterTemplate) {
        setSelectedTemplate(firstStarterTemplate.id);
      }
    }
  }, [customTemplates, selectedTemplate, setSelectedTemplate]);

  // Initialize or load session when drawer opens
  useEffect(() => {
    if (open && noteId) {
      loadOrCreateSession(noteId);
    }
  }, [open, noteId, loadOrCreateSession]);

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
    addUserMessage(message, noteContent);

    // Create placeholder assistant message
    const assistantMsg = addAssistantMessage('', undefined);
    updateAssistantMessage(assistantMsg.id, { isGenerating: true });

    setIsGenerating(true);

    try {
      // Generate section with AI
      const result = await generateSectionWithAI(
        message,
        selectedTemplate,
        selectedSection,
        selectedProvider,
        customTemplates,
        noteContent // Pass existing content for context
      );

      updateAssistantMessage(assistantMsg.id, {
        content: result.thinking || 'Here\'s the generated section:',
        generatedContent: result.content,
        isGenerating: false,
      });
    } catch (error) {
      console.error('Section generation failed:', error);
      
      // Provide user-friendly error messages
      let errorMessage = 'Failed to generate section. Please try again.';
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
    selectedSection,
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
    if (pendingContent) {
      onApplyContent(pendingContent, mode);
      setPendingContent(null);
    }
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
      <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
        <SheetContent 
          side="right" 
          className="w-full sm:max-w-xl p-0 flex flex-col overflow-hidden [&>button]:hidden"
          onInteractOutside={(e) => {
            // Allow interactions with Select dropdowns and Dialog modals (they render in portals)
            const target = e.target as HTMLElement;
            if (
              target.closest('[role="listbox"]') || 
              target.closest('[data-radix-select-content]') ||
              target.closest('[data-radix-select-viewport]') ||
              target.closest('[data-slot="select-content"]') ||
              target.closest('[data-radix-popper-content-wrapper]') ||
              target.closest('[data-radix-dialog-content]') ||
              target.closest('[data-slot="dialog-content"]') ||
              target.closest('[role="dialog"]')
            ) {
              // This is a dropdown or modal - allow the interaction (don't call preventDefault)
              // By returning WITHOUT preventDefault, the click goes through normally
              return;
            }
            // For all other outside clicks, prevent closing the drawer
            e.preventDefault();
          }}
        >
          {/* Header */}
          <SheetHeader className="px-6 py-4 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Target className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <SheetTitle className="text-left">Section Generator</SheetTitle>
                  <SheetDescription className="text-left">
                    Generate specific PRD sections through conversation
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
            className="flex-1 overflow-y-auto px-6 py-4 min-h-0"
          >
            {messages.length === 0 ? (
              <WelcomeMessage 
                onSuggestionClick={handleSendMessage} 
                sectionTitle={currentSectionTitle}
              />
            ) : (
              <div className="space-y-6 pb-4">
                {messages.map((message) => (
                  <SectionChatMessageComponent
                    key={message.id}
                    message={message}
                    isLastAssistantMessage={message.id === lastAssistantMessageId}
                    onRevert={message.role === 'user' ? handleRevert : undefined}
                    onAddToNote={handleAddToNote}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Input Area */}
          <SectionChatInput
            onSend={handleSendMessage}
            onOpenTemplateModal={() => setIsTemplateModalOpen(true)}
            onOpenEditTemplatesModal={() => setIsEditTemplatesModalOpen(true)}
            selectedProvider={selectedProvider}
            onProviderChange={setSelectedProvider}
            selectedTemplate={selectedTemplate}
            onTemplateChange={setSelectedTemplate}
            selectedSection={selectedSection}
            onSectionChange={setSelectedSection}
            disabled={isGenerating}
            placeholder={currentSectionTitle 
              ? `Describe what you want in "${currentSectionTitle}"...` 
              : 'Describe what you want in this section...'}
          />
        </SheetContent>
      </Sheet>

      {/* Custom Template Modal */}
      <CustomTemplateModal
        open={isTemplateModalOpen}
        onOpenChange={setIsTemplateModalOpen}
        onTemplateCreated={handleTemplateCreated}
      />

      {/* Edit Templates Modal */}
      <EditTemplatesModal
        open={isEditTemplatesModalOpen}
        onOpenChange={setIsEditTemplatesModalOpen}
        onTemplateUpdated={handleTemplateCreated}
      />

      {/* Overwrite/Append Dialog */}
      <AlertDialog open={showApplyModeDialog} onOpenChange={setShowApplyModeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add Section to Note</AlertDialogTitle>
            <AlertDialogDescription>
              Your note already has content. Would you like to replace the existing content or add the new section at the end?
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

export default SectionChatDrawer;
