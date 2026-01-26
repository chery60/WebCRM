'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Building2,
  Smartphone,
  Network,
  Code,
  Wrench,
  FileText,
  Check,
  ChevronRight,
  Pencil,
  Plus,
  Settings,
} from 'lucide-react';
import { useCustomTemplatesStore } from '@/lib/stores/custom-templates-store';
import type { CustomPRDTemplate } from '@/types';
import { cn } from '@/lib/utils';
import { EditTemplatesModal } from './edit-templates-modal';
import { CustomTemplateModal } from './custom-template-modal';

// ============================================================================
// TYPES
// ============================================================================

interface PRDTemplateSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (templateId: string, template: CustomPRDTemplate) => void;
}

// Icon mapping based on template icon field
const getTemplateIcon = (iconName?: string): React.ReactNode => {
  switch (iconName) {
    case 'building2':
      return <Building2 className="h-6 w-6" />;
    case 'smartphone':
      return <Smartphone className="h-6 w-6" />;
    case 'network':
      return <Network className="h-6 w-6" />;
    case 'code':
      return <Code className="h-6 w-6" />;
    case 'wrench':
      return <Wrench className="h-6 w-6" />;
    case 'file-text':
    default:
      return <FileText className="h-6 w-6" />;
  }
};

// Default color for templates without a color field
const DEFAULT_TEMPLATE_COLOR = 'bg-primary/10 text-primary border-primary/20';

// Default use cases for templates without them
const DEFAULT_USE_CASES = ['General purpose', 'Custom workflow'];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PRDTemplateSelector({ open, onClose, onSelect }: PRDTemplateSelectorProps) {
  const { templates, seedStarterTemplates } = useCustomTemplatesStore();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [hoveredTemplateId, setHoveredTemplateId] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CustomPRDTemplate | undefined>(undefined);

  // Seed starter templates on first load
  useEffect(() => {
    seedStarterTemplates();
  }, [seedStarterTemplates]);

  const handleSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
  };

  const handleConfirm = () => {
    if (selectedTemplateId) {
      const template = templates.find(t => t.id === selectedTemplateId);
      if (template) {
        onSelect(selectedTemplateId, template);
        onClose();
        setSelectedTemplateId(null);
      }
    }
  };

  const handleClose = () => {
    setSelectedTemplateId(null);
    onClose();
  };

  const handleEditTemplate = (template: CustomPRDTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTemplate(template);
    setShowCreateModal(true);
  };

  const activeTemplateId = hoveredTemplateId || selectedTemplateId;
  const activeTemplate = activeTemplateId ? templates.find(t => t.id === activeTemplateId) : null;

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
        <DialogContent className="sm:max-w-[900px] p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>Choose a PRD Template</DialogTitle>
                <DialogDescription>
                  Select a template that best matches your product type. All templates are fully customizable.
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateModal(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  New Template
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowEditModal(true)}
                >
                  <Settings className="h-4 w-4 mr-1" />
                  Manage
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="flex">
            {/* Template List */}
            <div className="w-1/2 border-r">
              <ScrollArea className="h-[450px]">
                <div className="p-4 space-y-2">
                  {templates.map((template) => {
                    const isSelected = selectedTemplateId === template.id;
                    const templateColor = template.color || DEFAULT_TEMPLATE_COLOR;

                    return (
                      <button
                        key={template.id}
                        className={cn(
                          'w-full text-left p-4 rounded-lg border transition-all group',
                          'hover:shadow-md',
                          isSelected
                            ? 'border-primary bg-primary/5 shadow-md'
                            : 'border-input hover:border-muted-foreground/50'
                        )}
                        onClick={() => handleSelect(template.id)}
                        onMouseEnter={() => setHoveredTemplateId(template.id)}
                        onMouseLeave={() => setHoveredTemplateId(null)}
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            'p-2 rounded-lg border',
                            templateColor
                          )}>
                            {getTemplateIcon(template.icon)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{template.name}</span>
                              {template.isStarterTemplate && (
                                <Badge variant="secondary" className="text-xs">Starter</Badge>
                              )}
                              {isSelected && (
                                <Check className="h-4 w-4 text-primary" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                              {template.description}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => handleEditTemplate(template, e)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <ChevronRight className={cn(
                              'h-5 w-5 text-muted-foreground/50 transition-transform',
                              (isSelected || hoveredTemplateId === template.id) && 'translate-x-1'
                            )} />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                  
                  {templates.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">No templates available.</p>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => setShowCreateModal(true)}
                        className="mt-2"
                      >
                        Create your first template
                      </Button>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Template Preview */}
            <div className="w-1/2 bg-muted/30">
              <ScrollArea className="h-[450px]">
                {activeTemplate ? (
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className={cn(
                        'p-3 rounded-lg border inline-flex',
                        activeTemplate.color || DEFAULT_TEMPLATE_COLOR
                      )}>
                        {getTemplateIcon(activeTemplate.icon)}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleEditTemplate(activeTemplate, e)}
                      >
                        <Pencil className="h-3.5 w-3.5 mr-1" />
                        Edit
                      </Button>
                    </div>

                    <h3 className="text-lg font-semibold mb-2">
                      {activeTemplate.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {activeTemplate.description}
                    </p>

                    {/* Use Cases */}
                    <div className="mb-4">
                      <h4 className="text-sm font-medium mb-2">Best for:</h4>
                      <div className="flex flex-wrap gap-2">
                        {(activeTemplate.useCases || DEFAULT_USE_CASES).map((useCase) => (
                          <Badge key={useCase} variant="secondary" className="text-xs">
                            {useCase}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Sections Preview */}
                    <div>
                      <h4 className="text-sm font-medium mb-2">
                        Included Sections ({activeTemplate.sections.length})
                      </h4>
                      <div className="space-y-1">
                        {activeTemplate.sections
                          .sort((a, b) => a.order - b.order)
                          .map((section, index) => (
                          <div
                            key={section.id}
                            className="text-sm py-1.5 px-2 rounded flex items-center gap-2 bg-background/50"
                          >
                            <span className="text-muted-foreground text-xs w-5">
                              {index + 1}.
                            </span>
                            <span>{section.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    <p className="text-sm">Select a template to preview</p>
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t flex justify-between">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={!selectedTemplateId}>
              Use Template
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Templates Modal */}
      <EditTemplatesModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
      />

      {/* Create/Edit Single Template Modal */}
      <CustomTemplateModal
        open={showCreateModal}
        onOpenChange={(open) => {
          setShowCreateModal(open);
          if (!open) setEditingTemplate(undefined);
        }}
        editTemplate={editingTemplate}
      />
    </>
  );
}

export default PRDTemplateSelector;
