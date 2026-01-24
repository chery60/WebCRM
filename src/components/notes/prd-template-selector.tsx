'use client';

import { useState } from 'react';
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
} from 'lucide-react';
import { PRD_TEMPLATES } from '@/lib/ai/prompts/prd-templates';
import type { PRDTemplateType, PRDTemplate } from '@/types';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface PRDTemplateSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (templateType: PRDTemplateType) => void;
}

// Template icons mapping
const templateIcons: Record<PRDTemplateType, React.ReactNode> = {
  'b2b-saas': <Building2 className="h-6 w-6" />,
  'consumer-app': <Smartphone className="h-6 w-6" />,
  'platform': <Network className="h-6 w-6" />,
  'api-product': <Code className="h-6 w-6" />,
  'internal-tool': <Wrench className="h-6 w-6" />,
  'custom': <FileText className="h-6 w-6" />,
};

// Template colors
const templateColors: Record<PRDTemplateType, string> = {
  'b2b-saas': 'bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800',
  'consumer-app': 'bg-purple-500/10 text-purple-600 border-purple-200 dark:border-purple-800',
  'platform': 'bg-green-500/10 text-green-600 border-green-200 dark:border-green-800',
  'api-product': 'bg-orange-500/10 text-orange-600 border-orange-200 dark:border-orange-800',
  'internal-tool': 'bg-gray-500/10 text-gray-600 border-gray-200 dark:border-gray-700',
  'custom': 'bg-primary/10 text-primary border-primary/20',
};

// Use cases for each template
const templateUseCases: Record<PRDTemplateType, string[]> = {
  'b2b-saas': [
    'CRM software',
    'Project management tools',
    'HR platforms',
    'Analytics dashboards',
  ],
  'consumer-app': [
    'Social media apps',
    'Fitness trackers',
    'Food delivery',
    'Entertainment apps',
  ],
  'platform': [
    'E-commerce marketplaces',
    'Freelance platforms',
    'Developer ecosystems',
    'Content platforms',
  ],
  'api-product': [
    'Payment APIs',
    'Communication SDKs',
    'AI/ML services',
    'Data integration tools',
  ],
  'internal-tool': [
    'Admin dashboards',
    'Reporting tools',
    'Workflow automation',
    'Data management',
  ],
  'custom': [
    'Unique products',
    'Hybrid solutions',
    'Experimental features',
    'Quick prototypes',
  ],
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PRDTemplateSelector({ open, onClose, onSelect }: PRDTemplateSelectorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<PRDTemplateType | null>(null);
  const [hoveredTemplate, setHoveredTemplate] = useState<PRDTemplateType | null>(null);

  const handleSelect = (type: PRDTemplateType) => {
    setSelectedTemplate(type);
  };

  const handleConfirm = () => {
    if (selectedTemplate) {
      onSelect(selectedTemplate);
      onClose();
      setSelectedTemplate(null);
    }
  };

  const handleClose = () => {
    setSelectedTemplate(null);
    onClose();
  };

  const activeTemplate = hoveredTemplate || selectedTemplate;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-[800px] p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>Choose a PRD Template</DialogTitle>
          <DialogDescription>
            Select a template that best matches your product type. Each template includes tailored sections and guidance.
          </DialogDescription>
        </DialogHeader>

        <div className="flex">
          {/* Template List */}
          <div className="w-1/2 border-r">
            <ScrollArea className="h-[400px]">
              <div className="p-4 space-y-2">
                {(Object.keys(PRD_TEMPLATES) as PRDTemplateType[]).map((type) => {
                  const template = PRD_TEMPLATES[type];
                  const isSelected = selectedTemplate === type;

                  return (
                    <button
                      key={type}
                      className={cn(
                        'w-full text-left p-4 rounded-lg border transition-all',
                        'hover:shadow-md',
                        isSelected
                          ? 'border-primary bg-primary/5 shadow-md'
                          : 'border-input hover:border-muted-foreground/50'
                      )}
                      onClick={() => handleSelect(type)}
                      onMouseEnter={() => setHoveredTemplate(type)}
                      onMouseLeave={() => setHoveredTemplate(null)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          'p-2 rounded-lg border',
                          templateColors[type]
                        )}>
                          {templateIcons[type]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{template.name}</span>
                            {isSelected && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                            {template.description}
                          </p>
                        </div>
                        <ChevronRight className={cn(
                          'h-5 w-5 text-muted-foreground/50 transition-transform shrink-0',
                          (isSelected || hoveredTemplate === type) && 'translate-x-1'
                        )} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Template Preview */}
          <div className="w-1/2 bg-muted/30">
            <ScrollArea className="h-[400px]">
              {activeTemplate ? (
                <div className="p-6">
                  <div className={cn(
                    'p-3 rounded-lg border inline-flex mb-4',
                    templateColors[activeTemplate]
                  )}>
                    {templateIcons[activeTemplate]}
                  </div>

                  <h3 className="text-lg font-semibold mb-2">
                    {PRD_TEMPLATES[activeTemplate].name}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {PRD_TEMPLATES[activeTemplate].description}
                  </p>

                  {/* Use Cases */}
                  <div className="mb-4">
                    <h4 className="text-sm font-medium mb-2">Best for:</h4>
                    <div className="flex flex-wrap gap-2">
                      {templateUseCases[activeTemplate].map((useCase) => (
                        <Badge key={useCase} variant="secondary" className="text-xs">
                          {useCase}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Sections Preview */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">
                      Included Sections ({PRD_TEMPLATES[activeTemplate].sections.length})
                    </h4>
                    <div className="space-y-1">
                      {PRD_TEMPLATES[activeTemplate].sections.map((section, index) => (
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
          <Button onClick={handleConfirm} disabled={!selectedTemplate}>
            Use Template
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default PRDTemplateSelector;
