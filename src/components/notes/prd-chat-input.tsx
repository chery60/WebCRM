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
  SelectValue,
  SelectSeparator,
} from '@/components/ui/select';
import { 
  Send, 
  Sparkles, 
  Plus,
  ChevronUp,
  FileText,
} from 'lucide-react';
import { useAISettingsStore, type AIProviderType } from '@/lib/stores/ai-settings-store';
import { useCustomTemplatesStore } from '@/lib/stores/custom-templates-store';
import { PRD_TEMPLATES } from '@/lib/ai/prompts/prd-templates';
import type { PRDTemplateType } from '@/types';

// ============================================================================
// TYPES
// ============================================================================

interface PRDChatInputProps {
  onSend: (message: string) => void;
  onOpenTemplateModal: () => void;
  selectedProvider: AIProviderType | null;
  onProviderChange: (provider: AIProviderType | null) => void;
  selectedTemplate: PRDTemplateType | string;
  onTemplateChange: (template: PRDTemplateType | string) => void;
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

export function PRDChatInput({
  onSend,
  onOpenTemplateModal,
  selectedProvider,
  onProviderChange,
  selectedTemplate,
  onTemplateChange,
  disabled = false,
  placeholder = 'Describe your product or feature...',
}: PRDChatInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const { activeProvider } = useAISettingsStore();
  const { templates: customTemplates } = useCustomTemplatesStore();

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
    } else {
      onTemplateChange(value as PRDTemplateType | string);
    }
  };

  // Get template display name
  const getTemplateDisplayName = (templateKey: string): string => {
    // Check if it's a built-in template
    const builtInTemplate = Object.entries(PRD_TEMPLATES).find(([key]) => key === templateKey);
    if (builtInTemplate) {
      return builtInTemplate[1].name;
    }
    // Check if it's a custom template
    const customTemplate = customTemplates.find(t => t.id === templateKey);
    if (customTemplate) {
      return customTemplate.name;
    }
    return 'Custom';
  };

  return (
    <div className="border-t border-border bg-background p-4 space-y-3 sticky bottom-0 z-10">
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
      <div className="flex items-center gap-3 flex-wrap">
        {/* AI Model Selector */}
        <Select
          value={selectedProvider || undefined}
          onValueChange={(value) => onProviderChange(value as AIProviderType)}
        >
          <SelectTrigger className="w-auto h-8 text-xs bg-muted/50 border-muted-foreground/20 gap-1.5">
            <Sparkles className="h-3 w-3 text-primary" />
            <SelectValue placeholder="Select AI Model">
              {selectedProvider && AI_MODELS.find(m => m.value === selectedProvider)?.label}
            </SelectValue>
            <ChevronUp className="h-3 w-3 opacity-50" />
          </SelectTrigger>
          <SelectContent>
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
          <SelectTrigger className="w-auto h-8 text-xs bg-muted/50 border-muted-foreground/20 gap-1.5">
            <FileText className="h-3 w-3 text-primary" />
            <SelectValue placeholder="Select Template">
              {getTemplateDisplayName(selectedTemplate)}
            </SelectValue>
            <ChevronUp className="h-3 w-3 opacity-50" />
          </SelectTrigger>
          <SelectContent>
            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
              PRD Template
            </div>
            
            {/* Built-in templates */}
            {Object.entries(PRD_TEMPLATES).map(([key, template]) => (
              <SelectItem key={key} value={key} className="text-sm">
                <div className="flex flex-col">
                  <span>{template.name}</span>
                  <span className="text-xs text-muted-foreground line-clamp-1">
                    {template.description}
                  </span>
                </div>
              </SelectItem>
            ))}
            
            {/* Custom templates */}
            {customTemplates.length > 0 && (
              <>
                <SelectSeparator />
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                  Custom Templates
                </div>
                {customTemplates.map((template) => (
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
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export default PRDChatInput;
