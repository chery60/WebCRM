'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Plus, 
  X, 
  GripVertical,
  FileText,
  Trash2,
} from 'lucide-react';
import { useCustomTemplatesStore, AVAILABLE_SECTIONS, DEFAULT_TEMPLATE_SECTIONS } from '@/lib/stores/custom-templates-store';
import type { CustomPRDTemplate } from '@/types';

// ============================================================================
// TYPES
// ============================================================================

interface CustomTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTemplateCreated?: (template: CustomPRDTemplate) => void;
  editTemplate?: CustomPRDTemplate; // For editing existing templates
}

interface TemplateSection {
  id: string;
  title: string;
  order: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function CustomTemplateModal({
  open,
  onOpenChange,
  onTemplateCreated,
  editTemplate,
}: CustomTemplateModalProps) {
  const { addTemplate, updateTemplate } = useCustomTemplatesStore();
  
  const [name, setName] = useState(editTemplate?.name || '');
  const [description, setDescription] = useState(editTemplate?.description || '');
  const [sections, setSections] = useState<TemplateSection[]>(
    editTemplate?.sections || DEFAULT_TEMPLATE_SECTIONS
  );
  const [customSectionTitle, setCustomSectionTitle] = useState('');
  const [errors, setErrors] = useState<{ name?: string; sections?: string }>({});

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (open) {
      if (editTemplate) {
        setName(editTemplate.name);
        setDescription(editTemplate.description);
        setSections(editTemplate.sections);
      } else {
        setName('');
        setDescription('');
        setSections(DEFAULT_TEMPLATE_SECTIONS);
      }
      setErrors({});
    }
  }, [open, editTemplate]);

  const handleToggleSection = (sectionId: string, sectionTitle: string) => {
    const exists = sections.find(s => s.id === sectionId);
    if (exists) {
      setSections(sections.filter(s => s.id !== sectionId));
    } else {
      const newOrder = sections.length > 0 ? Math.max(...sections.map(s => s.order)) + 1 : 1;
      setSections([...sections, { id: sectionId, title: sectionTitle, order: newOrder }]);
    }
  };

  const handleAddCustomSection = () => {
    if (!customSectionTitle.trim()) return;
    
    const id = customSectionTitle.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const newOrder = sections.length > 0 ? Math.max(...sections.map(s => s.order)) + 1 : 1;
    
    setSections([...sections, { id, title: customSectionTitle.trim(), order: newOrder }]);
    setCustomSectionTitle('');
  };

  const handleRemoveSection = (sectionId: string) => {
    setSections(sections.filter(s => s.id !== sectionId));
  };

  const handleMoveSection = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === sections.length - 1)
    ) {
      return;
    }

    const newSections = [...sections];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Swap orders
    const tempOrder = newSections[index].order;
    newSections[index].order = newSections[targetIndex].order;
    newSections[targetIndex].order = tempOrder;
    
    // Swap positions
    [newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]];
    
    setSections(newSections);
  };

  const validate = (): boolean => {
    const newErrors: { name?: string; sections?: string } = {};
    
    if (!name.trim()) {
      newErrors.name = 'Template name is required';
    }
    
    if (sections.length === 0) {
      newErrors.sections = 'At least one section is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    const templateData = {
      name: name.trim(),
      description: description.trim(),
      sections: sections.map((s, idx) => ({ ...s, order: idx + 1 })),
    };

    let savedTemplate: CustomPRDTemplate;
    
    if (editTemplate) {
      updateTemplate(editTemplate.id, templateData);
      savedTemplate = { ...editTemplate, ...templateData, updatedAt: new Date() };
    } else {
      savedTemplate = addTemplate(templateData);
    }

    onTemplateCreated?.(savedTemplate);
    onOpenChange(false);
  };

  // Sort sections by order for display
  const sortedSections = [...sections].sort((a, b) => a.order - b.order);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {editTemplate ? 'Edit Template' : 'Create Custom Template'}
          </DialogTitle>
          <DialogDescription>
            Create a custom PRD template with the sections you need. You can add, remove, and reorder sections.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4 py-4">
          {/* Template Name */}
          <div className="space-y-2">
            <Label htmlFor="template-name">Template Name *</Label>
            <Input
              id="template-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Mobile App PRD"
              className={cn(errors.name && 'border-destructive')}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name}</p>
            )}
          </div>

          {/* Template Description */}
          <div className="space-y-2">
            <Label htmlFor="template-description">Description</Label>
            <Textarea
              id="template-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe when to use this template..."
              rows={2}
            />
          </div>

          {/* Selected Sections */}
          <div className="space-y-2 flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between">
              <Label>Selected Sections ({sections.length})</Label>
              {errors.sections && (
                <p className="text-xs text-destructive">{errors.sections}</p>
              )}
            </div>
            
            <ScrollArea className="flex-1 border rounded-md p-2">
              {sortedSections.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No sections selected. Choose sections from the list below.
                </p>
              ) : (
                <div className="space-y-1">
                  {sortedSections.map((section, index) => (
                    <div
                      key={section.id}
                      className="flex items-center gap-2 p-2 bg-muted/50 rounded-md group"
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                      <span className="text-xs text-muted-foreground w-6">{index + 1}.</span>
                      <span className="flex-1 text-sm">{section.title}</span>
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleMoveSection(index, 'up')}
                          disabled={index === 0}
                        >
                          <span className="text-xs">↑</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleMoveSection(index, 'down')}
                          disabled={index === sortedSections.length - 1}
                        >
                          <span className="text-xs">↓</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive hover:text-destructive"
                          onClick={() => handleRemoveSection(section.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Available Sections */}
          <div className="space-y-2">
            <Label>Available Sections</Label>
            <ScrollArea className="h-32 border rounded-md p-2">
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_SECTIONS.map((section) => {
                  const isSelected = sections.some(s => s.id === section.id);
                  return (
                    <Badge
                      key={section.id}
                      variant={isSelected ? 'default' : 'outline'}
                      className={cn(
                        'cursor-pointer transition-colors',
                        isSelected && 'bg-primary'
                      )}
                      onClick={() => handleToggleSection(section.id, section.title)}
                    >
                      {isSelected && <X className="h-3 w-3 mr-1" />}
                      {section.title}
                    </Badge>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Add Custom Section */}
          <div className="space-y-2">
            <Label>Add Custom Section</Label>
            <div className="flex gap-2">
              <Input
                value={customSectionTitle}
                onChange={(e) => setCustomSectionTitle(e.target.value)}
                placeholder="Enter custom section name..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomSection();
                  }
                }}
              />
              <Button
                variant="outline"
                onClick={handleAddCustomSection}
                disabled={!customSectionTitle.trim()}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {editTemplate ? 'Save Changes' : 'Create Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CustomTemplateModal;
