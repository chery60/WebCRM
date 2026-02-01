'use client';

import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectSeparator,
} from '@/components/ui/select';
import {
  Send,
  Sparkles,
  Plus,
  ChevronDown,
  FileText,
  Pencil,
  LayoutList,
} from 'lucide-react';
import { useAISettingsStore, type AIProviderType } from '@/lib/stores/ai-settings-store';
import { useCustomTemplatesStore } from '@/lib/stores/custom-templates-store';
import { AddSectionModal } from './add-section-modal';
import type { TemplateSection } from '@/types';

// ============================================================================
// TYPES
// ============================================================================

interface SectionChatInputProps {
  onSend: (message: string) => void;
  onOpenTemplateModal: () => void;
  onOpenEditTemplatesModal: () => void;
  selectedProvider: AIProviderType | null;
  onProviderChange: (provider: AIProviderType | null) => void;
  selectedTemplate: string;
  onTemplateChange: (template: string) => void;
  selectedSection: string;
  onSectionChange: (section: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

// ============================================================================
// AI MODEL OPTIONS
// ============================================================================

const AI_MODELS: { value: AIProviderType; label: string; description?: string }[] = [
  { value: 'openai', label: 'OpenAI GPT-4', description: 'Best for complex reasoning' },
  { value: 'anthropic', label: 'Claude 3.5 Sonnet', description: 'Best for writing' },
  { value: 'gemini', label: 'Google Gemini', description: 'Fast and capable' },
];

// ============================================================================
// COMPONENT
// ============================================================================

export function SectionChatInput({
  onSend,
  onOpenTemplateModal,
  onOpenEditTemplatesModal,
  selectedProvider,
  onProviderChange,
  selectedTemplate,
  onTemplateChange,
  selectedSection,
  onSectionChange,
  disabled = false,
  placeholder = 'Describe what you want in this section...',
}: SectionChatInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { activeProvider } = useAISettingsStore();
  const { templates: customTemplates, updateTemplate } = useCustomTemplatesStore();

  const [isAddSectionModalOpen, setIsAddSectionModalOpen] = useState(false);

  // Get sections from the selected template (memoized to avoid dependency issues)
  const templateSections: TemplateSection[] = React.useMemo(() => {
    const selectedTemplateData = customTemplates.find(t => t.id === selectedTemplate);
    return selectedTemplateData?.sections || [];
  }, [customTemplates, selectedTemplate]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [message]);

  // Set default provider from settings
  useEffect(() => {
    if (!selectedProvider && activeProvider) {
      onProviderChange(activeProvider);
    }
  }, [activeProvider, selectedProvider, onProviderChange]);

  // Set default section when template changes
  useEffect(() => {
    if (templateSections.length > 0 && !selectedSection) {
      const firstSection = templateSections.sort((a, b) => a.order - b.order)[0];
      if (firstSection) {
        onSectionChange(firstSection.id);
      }
    }
  }, [templateSections, selectedSection, onSectionChange]);

  // Reset section when template changes
  useEffect(() => {
    if (selectedTemplate && templateSections.length > 0) {
      const firstSection = templateSections.sort((a, b) => a.order - b.order)[0];
      if (firstSection && !templateSections.some(s => s.id === selectedSection)) {
        onSectionChange(firstSection.id);
      }
    }
  }, [selectedTemplate, templateSections, selectedSection, onSectionChange]);

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTemplateSelect = (value: string) => {
    if (value === 'add-template') {
      onOpenTemplateModal();
    } else if (value === 'edit-templates') {
      onOpenEditTemplatesModal();
    } else {
      onTemplateChange(value);
    }
  };

  const handleSectionSelect = (value: string) => {
    if (value === 'add-section') {
      setIsAddSectionModalOpen(true);
    } else {
      onSectionChange(value);
    }
  };

  const handleAddSection = (sectionData: { title: string; description: string }) => {
    if (!selectedTemplate) return;

    // Generate ID from title (slugify) plus random suffix
    const slug = sectionData.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    const id = `${slug}-${Date.now().toString(36).substring(2, 7)}`;

    // Calculate new order (max + 1)
    const maxOrder = templateSections.length > 0
      ? Math.max(...templateSections.map(s => s.order))
      : 0;

    const newSection: TemplateSection = {
      id,
      title: sectionData.title,
      description: sectionData.description,
      order: maxOrder + 1,
    };

    // Update template with new section
    updateTemplate(selectedTemplate, {
      sections: [...templateSections, newSection]
    }, `Added section: ${sectionData.title}`);

    // Select the new section
    onSectionChange(id);
  };



  // Get template display name
  const getTemplateDisplayName = (templateKey: string): string => {
    const template = customTemplates.find(t => t.id === templateKey);
    if (template) {
      return template.name;
    }
    return 'Select Template';
  };

  // Get section display name
  const getSectionDisplayName = (sectionId: string): string => {
    const section = templateSections.find(s => s.id === sectionId);
    if (section) {
      return section.title;
    }
    return 'Select Section';
  };

  // Separate starter templates from user-created templates for display
  const starterTemplates = customTemplates.filter(t => t.isStarterTemplate);
  const userTemplates = customTemplates.filter(t => !t.isStarterTemplate);

  // Sort sections by order
  const sortedSections = [...templateSections].sort((a, b) => a.order - b.order);

  return (
    <div className="border-t border-border bg-background p-4 space-y-3 sticky bottom-0 z-20">
      {/* Chat input area */}
      <div className="relative flex items-end gap-2">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              "min-h-[44px] max-h-[200px] resize-none pr-12",
              "bg-muted/50 border-muted-foreground/20",
              "focus:bg-background focus:border-primary/50",
              "placeholder:text-muted-foreground/60"
            )}
            rows={1}
          />
          <Button
            size="icon"
            variant="ghost"
            className={cn(
              "absolute right-2 bottom-2 h-8 w-8",
              message.trim() ? "text-primary hover:text-primary" : "text-muted-foreground"
            )}
            onClick={handleSend}
            disabled={!message.trim() || disabled}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Dropdowns row */}
      <div className="flex items-center gap-2">
        {/* AI Model Selector */}
        <Select
          value={selectedProvider || undefined}
          onValueChange={(value) => onProviderChange(value as AIProviderType)}
        >
          <SelectTrigger className="h-8 text-xs bg-muted/50 border-muted-foreground/20 gap-1.5 max-w-[140px] [&>svg:last-child]:hidden">
            <Sparkles className="h-3 w-3 text-primary shrink-0" />
            <span className="truncate">
              {selectedProvider ? AI_MODELS.find(m => m.value === selectedProvider)?.label : 'Select AI'}
            </span>
            <ChevronDown className="h-3 w-3 opacity-50 shrink-0" />
          </SelectTrigger>
          <SelectContent position="popper" className="!z-[100]">
            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
              AI Model
            </div>
            {AI_MODELS.map((model) => (
              <SelectItem key={model.value} value={model.value} className="text-sm">
                <div className="flex flex-col">
                  <span>{model.label}</span>
                  {model.description && (
                    <span className="text-xs text-muted-foreground">{model.description}</span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Template Selector */}
        <Select
          value={selectedTemplate}
          onValueChange={handleTemplateSelect}
        >
          <SelectTrigger className="h-8 text-xs bg-muted/50 border-muted-foreground/20 gap-1.5 max-w-[160px] [&>svg:last-child]:hidden">
            <FileText className="h-3 w-3 text-primary shrink-0" />
            <span className="truncate">
              {getTemplateDisplayName(selectedTemplate)}
            </span>
            <ChevronDown className="h-3 w-3 opacity-50 shrink-0" />
          </SelectTrigger>
          <SelectContent position="popper" className="max-w-[300px]">
            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
              PRD Template
            </div>

            {/* Starter templates (editable) */}
            {starterTemplates.map((template) => (
              <SelectItem key={template.id} value={template.id} className="text-sm">
                <div className="flex flex-col">
                  <span>{template.name}</span>
                  <span className="text-xs text-muted-foreground line-clamp-1">
                    {template.description}
                  </span>
                </div>
              </SelectItem>
            ))}

            {/* User-created custom templates */}
            {userTemplates.length > 0 && (
              <>
                <SelectSeparator />
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                  My Templates
                </div>
                {userTemplates.map((template) => (
                  <SelectItem key={template.id} value={template.id} className="text-sm">
                    <div className="flex flex-col">
                      <span>{template.name}</span>
                      <span className="text-xs text-muted-foreground line-clamp-1">
                        {template.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </>
            )}

            {/* Add template option */}
            <SelectSeparator />
            <SelectItem value="add-template" className="text-sm text-primary">
              <div className="flex items-center gap-2">
                <Plus className="h-3 w-3" />
                <span>Add Template</span>
              </div>
            </SelectItem>

            {/* Edit templates option */}
            <SelectItem value="edit-templates" className="text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Pencil className="h-3 w-3" />
                <span>Edit Templates</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Section Selector */}
        <Select
          value={selectedSection}
          onValueChange={handleSectionSelect}
          disabled={!selectedTemplate}
        >
          <SelectTrigger className="h-8 text-xs bg-muted/50 border-muted-foreground/20 gap-1.5 max-w-[160px] [&>svg:last-child]:hidden">
            <LayoutList className="h-3 w-3 text-primary shrink-0" />
            <span className="truncate">
              {getSectionDisplayName(selectedSection)}
            </span>
            <ChevronDown className="h-3 w-3 opacity-50 shrink-0" />
          </SelectTrigger>
          <SelectContent position="popper" className="!z-[100] max-w-[300px]">
            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
              Available Sections
            </div>
            {sortedSections.length === 0 ? (
              <div className="px-2 py-3 text-xs text-muted-foreground text-center">
                No sections in this template yet.
                <br />
                Click "Add Section" below to create one.
              </div>
            ) : (
              sortedSections.map((section) => (
                <SelectItem key={section.id} value={section.id} className="text-sm">
                  <div className="flex flex-col">
                    <span>{section.title}</span>
                    {section.description && (
                      <span className="text-xs text-muted-foreground line-clamp-1">
                        {section.description}
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))
            )}

            <SelectSeparator />
            <SelectItem value="add-section" className="text-sm text-primary">
              <div className="flex items-center gap-2">
                <Plus className="h-3 w-3" />
                <span>Add New Section</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Add Section Modal */}
      <AddSectionModal
        open={isAddSectionModalOpen}
        onOpenChange={setIsAddSectionModalOpen}
        onAdd={handleAddSection}
      />
    </div>
  );
}

export default SectionChatInput;
