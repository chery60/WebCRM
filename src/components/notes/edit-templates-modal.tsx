'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Plus, 
  X, 
  GripVertical,
  FileText,
  Trash2,
  Pencil,
  Check,
  Copy,
  ChevronDown,
  ChevronRight,
  Info,
  Download,
  Upload,
  History,
  MoreHorizontal,
  RotateCcw,
  Building2,
  Smartphone,
  Network,
  Code,
  Wrench,
  Filter,
} from 'lucide-react';
import { useCustomTemplatesStore, AVAILABLE_SECTIONS, DEFAULT_TEMPLATE_SECTIONS } from '@/lib/stores/custom-templates-store';
import type { CustomPRDTemplate, TemplateSection, TemplateCategory, TemplateExportFormat, TEMPLATE_CATEGORIES } from '@/types';

// Mode for the right panel
type EditorMode = 'edit' | 'create';

// ============================================================================
// TYPES
// ============================================================================

interface EditTemplatesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTemplateUpdated?: (template: CustomPRDTemplate) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

// Category options with icons
const CATEGORY_OPTIONS: { value: TemplateCategory; label: string; icon: React.ReactNode }[] = [
  { value: 'saas', label: 'SaaS & B2B', icon: <Building2 className="h-4 w-4" /> },
  { value: 'consumer', label: 'Consumer Apps', icon: <Smartphone className="h-4 w-4" /> },
  { value: 'platform', label: 'Platforms', icon: <Network className="h-4 w-4" /> },
  { value: 'internal', label: 'Internal Tools', icon: <Wrench className="h-4 w-4" /> },
  { value: 'api', label: 'API & Dev Tools', icon: <Code className="h-4 w-4" /> },
  { value: 'custom', label: 'Custom', icon: <FileText className="h-4 w-4" /> },
];

export function EditTemplatesModal({
  open,
  onOpenChange,
  onTemplateUpdated,
}: EditTemplatesModalProps) {
  const { 
    templates, 
    updateTemplate, 
    deleteTemplate, 
    addTemplate, 
    duplicateTemplate,
    exportTemplates,
    exportAllTemplates,
    importTemplates,
    getTemplateVersionHistory,
    restoreTemplateVersion,
  } = useCustomTemplatesStore();
  
  // Editor mode: 'edit' for editing existing, 'create' for new template
  const [mode, setMode] = useState<EditorMode>('edit');
  
  // Selected template for editing
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sections, setSections] = useState<TemplateSection[]>([]);
  const [category, setCategory] = useState<TemplateCategory>('custom');
  const [customSectionTitle, setCustomSectionTitle] = useState('');
  const [customSectionDescription, setCustomSectionDescription] = useState('');
  const [errors, setErrors] = useState<{ name?: string; sections?: string }>({});
  
  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<CustomPRDTemplate | null>(null);
  
  // Track if there are unsaved changes
  const [hasChanges, setHasChanges] = useState(false);
  
  // Track which sections are expanded for description editing
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  
  // Category filter for left panel
  const [categoryFilter, setCategoryFilter] = useState<TemplateCategory | 'all'>('all');
  
  // Version history panel
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  
  // Import file input ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Import result state
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);
  
  // Drag and drop state for sections
  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null);
  const [draggedSectionIndex, setDraggedSectionIndex] = useState<number | null>(null);
  const [dragOverSectionId, setDragOverSectionId] = useState<string | null>(null);

  // Get the selected template
  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  // Reset form when modal opens or closes
  useEffect(() => {
    if (open) {
      // Auto-select the first template if available
      if (templates.length > 0 && !selectedTemplateId) {
        setSelectedTemplateId(templates[0].id);
        setMode('edit');
      }
    } else {
      // Reset state when closing
      setSelectedTemplateId(null);
      setMode('edit');
      setErrors({});
      setHasChanges(false);
    }
  }, [open, templates, selectedTemplateId]);

  // Filtered templates based on category
  const filteredTemplates = categoryFilter === 'all' 
    ? templates 
    : templates.filter(t => t.category === categoryFilter);

  // Handle switching to create mode
  const handleCreateNew = () => {
    setMode('create');
    setSelectedTemplateId(null);
    setName('');
    setDescription('');
    setCategory('custom');
    // Include default descriptions from AVAILABLE_SECTIONS
    setSections(DEFAULT_TEMPLATE_SECTIONS.map((s, idx) => {
      const availableSection = AVAILABLE_SECTIONS.find(as => as.id === s.id);
      return { 
        ...s, 
        order: idx + 1,
        description: availableSection?.description || ''
      };
    }));
    setErrors({});
    setExpandedSections(new Set());
    setShowVersionHistory(false);
    setHasChanges(true); // Mark as having changes since it's a new template
  };

  // Handle duplicating a template
  const handleDuplicateTemplate = (template: CustomPRDTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    const duplicatedName = `${template.name} (Copy)`;
    const duplicated = duplicateTemplate(template.id, duplicatedName);
    if (duplicated) {
      setMode('edit');
      setSelectedTemplateId(duplicated.id);
      onTemplateUpdated?.(duplicated);
    }
  };

  // Load template data when selection changes
  useEffect(() => {
    if (mode === 'create') {
      // Don't reset when in create mode
      return;
    }
    
    if (selectedTemplate) {
      setName(selectedTemplate.name);
      setDescription(selectedTemplate.description || '');
      setSections([...selectedTemplate.sections]);
      setCategory(selectedTemplate.category || 'custom');
      setErrors({});
      setHasChanges(false);
      setShowVersionHistory(false);
    } else {
      setName('');
      setDescription('');
      setSections([]);
      setCategory('custom');
    }
  }, [selectedTemplate, mode]);

  // Export single template
  const handleExportTemplate = (templateId: string) => {
    const exportData = exportTemplates([templateId]);
    const template = templates.find(t => t.id === templateId);
    const fileName = `template-${template?.name.toLowerCase().replace(/\s+/g, '-') || 'export'}.json`;
    downloadJSON(exportData, fileName);
  };

  // Export all templates
  const handleExportAll = () => {
    const exportData = exportAllTemplates();
    downloadJSON(exportData, 'all-templates.json');
  };

  // Download JSON helper
  const downloadJSON = (data: TemplateExportFormat, fileName: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Handle import file selection
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  // Handle file import
  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content) as TemplateExportFormat;
        const result = importTemplates(data, false);
        
        if (result.success) {
          setImportResult({
            success: true,
            message: `Successfully imported ${result.imported} template(s)${result.skipped > 0 ? `, ${result.skipped} skipped` : ''}.`,
          });
        } else {
          setImportResult({
            success: false,
            message: result.errors.join(', '),
          });
        }
      } catch {
        setImportResult({
          success: false,
          message: 'Invalid file format. Please select a valid template export file.',
        });
      }
    };
    reader.readAsText(file);
    
    // Reset file input
    event.target.value = '';
  };

  // Handle restore version
  const handleRestoreVersion = (versionId: string) => {
    if (selectedTemplateId) {
      const success = restoreTemplateVersion(selectedTemplateId, versionId);
      if (success) {
        setShowVersionHistory(false);
        // Reload template data
        const updated = templates.find(t => t.id === selectedTemplateId);
        if (updated) {
          setName(updated.name);
          setDescription(updated.description || '');
          setSections([...updated.sections]);
          setCategory(updated.category || 'custom');
        }
      }
    }
  };

  // Track changes
  useEffect(() => {
    // In create mode, always has changes (it's a new template)
    if (mode === 'create') {
      setHasChanges(true);
      return;
    }
    
    if (!selectedTemplate) {
      setHasChanges(false);
      return;
    }
    
    const nameChanged = name !== selectedTemplate.name;
    const descChanged = description !== (selectedTemplate.description || '');
    const sectionsChanged = JSON.stringify(sections) !== JSON.stringify(selectedTemplate.sections);
    const categoryChanged = category !== (selectedTemplate.category || 'custom');
    
    setHasChanges(nameChanged || descChanged || sectionsChanged || categoryChanged);
  }, [name, description, sections, category, selectedTemplate, mode]);

  const handleSelectTemplate = (templateId: string) => {
    if (hasChanges) {
      // Could add a confirmation dialog here, but for simplicity we'll just switch
      // In a production app, you might want to warn the user about unsaved changes
    }
    setMode('edit');
    setSelectedTemplateId(templateId);
  };

  const handleToggleSection = (sectionId: string, sectionTitle: string) => {
    const exists = sections.find(s => s.id === sectionId);
    if (exists) {
      setSections(sections.filter(s => s.id !== sectionId));
      // Remove from expanded sections if it was expanded
      const newExpanded = new Set(expandedSections);
      newExpanded.delete(sectionId);
      setExpandedSections(newExpanded);
    } else {
      const newOrder = sections.length > 0 ? Math.max(...sections.map(s => s.order)) + 1 : 1;
      // Get default description from AVAILABLE_SECTIONS
      const availableSection = AVAILABLE_SECTIONS.find(as => as.id === sectionId);
      setSections([...sections, { 
        id: sectionId, 
        title: sectionTitle, 
        order: newOrder,
        description: availableSection?.description || ''
      }]);
    }
  };

  const handleAddCustomSection = () => {
    if (!customSectionTitle.trim()) return;
    
    const id = customSectionTitle.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const newOrder = sections.length > 0 ? Math.max(...sections.map(s => s.order)) + 1 : 1;
    
    setSections([...sections, { 
      id, 
      title: customSectionTitle.trim(), 
      order: newOrder,
      description: customSectionDescription.trim() || undefined
    }]);
    setCustomSectionTitle('');
    setCustomSectionDescription('');
  };

  // Update section description
  const handleUpdateSectionDescription = (sectionId: string, newDescription: string) => {
    setSections(sections.map(s => 
      s.id === sectionId ? { ...s, description: newDescription } : s
    ));
  };

  // Toggle section expansion
  const toggleSectionExpanded = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
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

  // Drag and drop handlers for sections
  const handleDragStart = useCallback((e: React.DragEvent, sectionId: string, index: number) => {
    setDraggedSectionId(sectionId);
    setDraggedSectionIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', sectionId);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedSectionId(null);
    setDraggedSectionIndex(null);
    setDragOverSectionId(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, sectionId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (sectionId !== draggedSectionId) {
      setDragOverSectionId(sectionId);
    }
  }, [draggedSectionId]);

  const handleDragLeave = useCallback(() => {
    setDragOverSectionId(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    
    if (draggedSectionIndex === null || draggedSectionIndex === targetIndex) {
      handleDragEnd();
      return;
    }

    const sortedSectionsCopy = [...sections].sort((a, b) => a.order - b.order);
    const [draggedItem] = sortedSectionsCopy.splice(draggedSectionIndex, 1);
    sortedSectionsCopy.splice(targetIndex, 0, draggedItem);
    
    // Update orders
    const reorderedSections = sortedSectionsCopy.map((section, idx) => ({
      ...section,
      order: idx + 1
    }));
    
    setSections(reorderedSections);
    handleDragEnd();
  }, [draggedSectionIndex, sections, handleDragEnd]);

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
      category,
    };

    if (mode === 'create') {
      // Create new template
      const newTemplate = addTemplate(templateData);
      onTemplateUpdated?.(newTemplate);
      
      // Switch to edit mode with the new template selected
      setMode('edit');
      setSelectedTemplateId(newTemplate.id);
      setHasChanges(false);
    } else if (selectedTemplate) {
      // Update existing template with change description
      updateTemplate(selectedTemplate.id, templateData, 'Manual update');
      
      const updatedTemplate = { ...selectedTemplate, ...templateData, updatedAt: new Date() };
      onTemplateUpdated?.(updatedTemplate);
      setHasChanges(false);
    }
  };

  const handleDeleteClick = (template: CustomPRDTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    setTemplateToDelete(template);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    if (templateToDelete) {
      deleteTemplate(templateToDelete.id);
      
      // If we deleted the selected template, select another one
      if (selectedTemplateId === templateToDelete.id) {
        const remainingTemplates = templates.filter(t => t.id !== templateToDelete.id);
        setSelectedTemplateId(remainingTemplates.length > 0 ? remainingTemplates[0].id : null);
      }
    }
    setShowDeleteConfirm(false);
    setTemplateToDelete(null);
  };

  // Sort sections by order for display
  const sortedSections = [...sections].sort((a, b) => a.order - b.order);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[880px] max-w-[95vw] max-h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b rounded-t-lg relative">
            <div className="flex items-start justify-between pr-16">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  <Pencil className="h-5 w-5 text-primary" />
                  {mode === 'create' ? 'Create New Template' : 'Edit Templates'}
                </DialogTitle>
                <DialogDescription>
                  {mode === 'create' 
                    ? 'Create a new template with custom sections for your PRD.'
                    : 'Select a template from the list to edit its name, description, and sections.'}
                </DialogDescription>
              </div>
              <div className="absolute top-4 right-14 flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileImport}
                  accept=".json"
                  className="hidden"
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleImportClick}>
                      <Upload className="h-4 w-4 mr-2" />
                      Import Templates
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleExportAll}>
                      <Download className="h-4 w-4 mr-2" />
                      Export All Templates
                    </DropdownMenuItem>
                    {selectedTemplate && (
                      <DropdownMenuItem onClick={() => handleExportTemplate(selectedTemplate.id)}>
                        <FileText className="h-4 w-4 mr-2" />
                        Export &quot;{selectedTemplate.name}&quot;
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            {importResult && (
              <div className={cn(
                "mt-3 p-2 rounded-md text-sm",
                importResult.success ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400" : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
              )}>
                {importResult.message}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="ml-2 h-5 px-1"
                  onClick={() => setImportResult(null)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </DialogHeader>

          {templates.length === 0 && mode !== 'create' ? (
            <div className="flex-1 flex items-center justify-center p-12">
              <div className="text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Custom Templates</h3>
                <p className="text-sm text-muted-foreground max-w-sm mb-4">
                  You haven&apos;t created any custom templates yet. Create your first template to get started.
                </p>
                <Button onClick={handleCreateNew}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex overflow-hidden min-h-0">
              {/* Left Panel - Template List */}
              <div className="w-72 border-r flex flex-col bg-muted/30 rounded-bl-lg overflow-hidden">
                <div className="p-3 border-b">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-muted-foreground">Your Templates</h3>
                    <div className="ml-auto flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={handleCreateNew}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        New
                      </Button>
                      {/* Category Filter - Icon only with badge */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 relative flex-shrink-0"
                          >
                            <Filter className="h-3.5 w-3.5" />
                            {categoryFilter !== 'all' && (
                              <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-primary text-[9px] text-primary-foreground flex items-center justify-center font-medium">
                                1
                              </span>
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={() => setCategoryFilter('all')}
                            className={cn(categoryFilter === 'all' && "bg-accent")}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            All Categories
                            {categoryFilter === 'all' && <Check className="h-4 w-4 ml-auto" />}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {CATEGORY_OPTIONS.map((cat) => (
                            <DropdownMenuItem 
                              key={cat.value} 
                              onClick={() => setCategoryFilter(cat.value)}
                              className={cn(categoryFilter === cat.value && "bg-accent")}
                            >
                              {cat.icon}
                              <span className="ml-2">{cat.label}</span>
                              {categoryFilter === cat.value && <Check className="h-4 w-4 ml-auto" />}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
                <ScrollArea className="flex-1">
                  <div className="py-2 pr-2 space-y-1">
                    {filteredTemplates.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4 px-2">
                        No templates in this category
                      </p>
                    ) : (
                      filteredTemplates.map((template) => {
                        const categoryOption = CATEGORY_OPTIONS.find(c => c.value === template.category);
                        const isSelected = mode === 'edit' && selectedTemplateId === template.id;
                        return (
                          <div
                            key={template.id}
                            className={cn(
                              "group flex items-center gap-2 p-3 cursor-pointer transition-colors ml-2",
                              isSelected
                                ? "bg-primary/10 border-y border-r border-primary/20"
                                : "hover:bg-muted rounded-lg"
                            )}
                            onClick={() => handleSelectTemplate(template.id)}
                          >
                            <div className={cn(
                              "h-4 w-4 flex-shrink-0",
                              isSelected ? "text-primary" : "text-muted-foreground"
                            )}>
                              {categoryOption?.icon || <FileText className="h-4 w-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={cn(
                                "text-sm font-medium truncate",
                                isSelected && "text-primary"
                              )}>
                                {template.name}
                              </p>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-muted-foreground">
                                  {template.sections.length} sections
                                </span>
                                {template.version && template.version > 1 && (
                                  <Badge variant="outline" className="h-4 text-[10px] px-1">
                                    v{template.version}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <TooltipProvider delayDuration={300}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                      onClick={(e) => handleDuplicateTemplate(template, e)}
                                    >
                                      <Copy className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">
                                    <p>Duplicate template</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <TooltipProvider delayDuration={300}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                      onClick={(e) => handleDeleteClick(template, e)}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">
                                    <p>Delete template</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* Right Panel - Edit Form */}
              <div className="flex-1 flex flex-col overflow-hidden rounded-br-lg min-w-0 max-w-[calc(100%-288px)]">
                {(mode === 'create' || selectedTemplate) ? (
                  <div className="flex-1 overflow-y-auto overflow-x-hidden">
                    <div className="p-6 space-y-6 min-w-0 pb-8 overflow-hidden">
                      {/* Template Name & Category Row */}
                      <div className="space-y-2 min-w-0">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="edit-template-name">Template Name *</Label>
                          {mode === 'edit' && selectedTemplate && selectedTemplate.versionHistory && selectedTemplate.versionHistory.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => setShowVersionHistory(!showVersionHistory)}
                            >
                              <History className="h-3.5 w-3.5 mr-1" />
                              History ({selectedTemplate.versionHistory.length})
                            </Button>
                          )}
                        </div>
                        <div className="flex gap-3">
                          <Input
                            id="edit-template-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Mobile App PRD"
                            className={cn("flex-1", errors.name && 'border-destructive')}
                          />
                          {/* Category Selector - Inline */}
                          <Select value={category} onValueChange={(v) => setCategory(v as TemplateCategory)}>
                            <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent>
                              {CATEGORY_OPTIONS.map((cat) => (
                                <SelectItem key={cat.value} value={cat.value}>
                                  <div className="flex items-center gap-2">
                                    {cat.icon}
                                    {cat.label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {errors.name && (
                          <p className="text-xs text-destructive">{errors.name}</p>
                        )}
                      </div>

                      {/* Version History Panel */}
                      {showVersionHistory && selectedTemplate?.versionHistory && selectedTemplate.versionHistory.length > 0 && (
                        <div className="border rounded-md p-3 bg-muted/30 space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">Version History</Label>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => setShowVersionHistory(false)}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <div className="space-y-1 max-h-[150px] overflow-y-auto">
                            {[...selectedTemplate.versionHistory].reverse().map((version) => (
                              <div key={version.id} className="flex items-center justify-between p-2 rounded bg-background text-sm">
                                <div>
                                  <span className="font-medium">v{version.version}</span>
                                  <span className="text-muted-foreground ml-2">
                                    {new Date(version.createdAt).toLocaleDateString()}
                                  </span>
                                  {version.changeDescription && (
                                    <span className="text-muted-foreground ml-2 text-xs">
                                      — {version.changeDescription}
                                    </span>
                                  )}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => handleRestoreVersion(version.id)}
                                >
                                  <RotateCcw className="h-3 w-3 mr-1" />
                                  Restore
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Template Description */}
                      <div className="space-y-2 min-w-0">
                        <Label htmlFor="edit-template-description">Description</Label>
                        <Textarea
                          id="edit-template-description"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Describe when to use this template..."
                          rows={2}
                        />
                      </div>

                      {/* Selected Sections */}
                      <div className="space-y-2 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Label>Selected Sections ({sections.length})</Label>
                            <TooltipProvider delayDuration={300}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-xs">
                                  <p>Drag sections to reorder. Click on a section to expand and edit its description.</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          {errors.sections && (
                            <p className="text-xs text-destructive">{errors.sections}</p>
                          )}
                        </div>
                        
                        <div className="border rounded-md min-h-[200px] max-h-[320px] overflow-hidden">
                          {sortedSections.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4 px-2">
                              No sections selected. Choose sections from the list below.
                            </p>
                          ) : (
                            <div className="h-full max-h-[318px] overflow-y-auto">
                              <div className="p-2 space-y-1">
                                {sortedSections.map((section, index) => {
                                  const isExpanded = expandedSections.has(section.id);
                                  return (
                                    <Collapsible 
                                      key={section.id} 
                                      open={isExpanded}
                                      onOpenChange={() => toggleSectionExpanded(section.id)}
                                    >
                                      <div 
                                        className={cn(
                                          "rounded-md transition-colors",
                                          isExpanded ? "bg-muted/70 border border-border" : "bg-muted/50",
                                          draggedSectionId === section.id && "opacity-50",
                                          dragOverSectionId === section.id && draggedSectionId !== section.id && "border-t-2 border-t-primary"
                                        )}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, section.id, index)}
                                        onDragEnd={handleDragEnd}
                                        onDragOver={(e) => handleDragOver(e, section.id)}
                                        onDragLeave={handleDragLeave}
                                        onDrop={(e) => handleDrop(e, index)}
                                      >
                                        <div className="flex items-center gap-2 p-2 group">
                                          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab flex-shrink-0 hover:text-foreground" />
                                          <span className="text-xs text-muted-foreground w-5 flex-shrink-0">{index + 1}.</span>
                                          <CollapsibleTrigger asChild>
                                            <button className="flex items-center gap-1.5 flex-1 text-left hover:text-primary transition-colors min-w-0">
                                              {isExpanded ? (
                                                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                              ) : (
                                                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                              )}
                                              <span className="text-sm font-medium truncate">{section.title}</span>
                                              {section.description && !isExpanded && (
                                                <Badge variant="outline" className="ml-2 text-[10px] px-1.5 py-0 h-4 flex-shrink-0">
                                                  Description added
                                                </Badge>
                                              )}
                                            </button>
                                          </CollapsibleTrigger>
                                          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity flex-shrink-0">
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-6 w-6"
                                              onClick={(e) => { e.stopPropagation(); handleMoveSection(index, 'up'); }}
                                              disabled={index === 0}
                                            >
                                              <span className="text-xs">↑</span>
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-6 w-6"
                                              onClick={(e) => { e.stopPropagation(); handleMoveSection(index, 'down'); }}
                                              disabled={index === sortedSections.length - 1}
                                            >
                                              <span className="text-xs">↓</span>
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-6 w-6 text-destructive hover:text-destructive"
                                              onClick={(e) => { e.stopPropagation(); handleRemoveSection(section.id); }}
                                            >
                                              <Trash2 className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        </div>
                                        <CollapsibleContent>
                                          <div className="px-3 pb-3 pt-1">
                                            <Label className="text-xs text-muted-foreground mb-1.5 block">
                                              Section Description (guides AI generation)
                                            </Label>
                                            <Textarea
                                              value={section.description || ''}
                                              onChange={(e) => handleUpdateSectionDescription(section.id, e.target.value)}
                                              placeholder="Describe what this section should contain, what information to include, and any specific requirements..."
                                              rows={3}
                                              className="text-sm resize-none"
                                            />
                                          </div>
                                        </CollapsibleContent>
                                      </div>
                                    </Collapsible>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Available Sections */}
                      <div className="space-y-2 min-w-0 overflow-hidden">
                        <Label>Available Sections</Label>
                        <div className="border rounded-md p-3 max-h-[160px] overflow-y-auto overflow-x-hidden">
                          <div className="flex flex-wrap gap-2">
                            {AVAILABLE_SECTIONS.filter(section => !sections.some(s => s.id === section.id)).map((section) => {
                              return (
                                <button
                                  key={section.id}
                                  type="button"
                                  className="inline-flex items-center justify-center rounded-full border px-2.5 py-1 text-xs font-medium cursor-pointer transition-colors hover:bg-primary hover:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 max-w-full"
                                  onClick={() => handleToggleSection(section.id, section.title)}
                                >
                                  <Plus className="h-3 w-3 mr-1.5 flex-shrink-0" />
                                  <span className="truncate">{section.title}</span>
                                </button>
                              );
                            })}
                            {AVAILABLE_SECTIONS.filter(section => !sections.some(s => s.id === section.id)).length === 0 && (
                              <p className="text-sm text-muted-foreground">All sections have been added</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Add Custom Section */}
                      <div className="space-y-2 min-w-0 overflow-hidden">
                        <Label>Add Custom Section</Label>
                        <div className="border rounded-md p-3 space-y-3 bg-muted/30">
                          <div className="flex gap-2">
                            <Input
                              value={customSectionTitle}
                              onChange={(e) => setCustomSectionTitle(e.target.value)}
                              placeholder="Section name (e.g., Competitive Analysis)"
                              className="min-w-0 flex-1"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleAddCustomSection();
                                }
                              }}
                            />
                            <Button
                              variant="default"
                              onClick={handleAddCustomSection}
                              disabled={!customSectionTitle.trim()}
                              className="shrink-0"
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Add
                            </Button>
                          </div>
                          <Textarea
                            value={customSectionDescription}
                            onChange={(e) => setCustomSectionDescription(e.target.value)}
                            placeholder="Optional: Describe what this section should contain..."
                            rows={2}
                            className="text-sm resize-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">Select a template to edit or create a new one</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer - spans entire modal width */}
          <div className="border-t p-4 flex items-center justify-between bg-background rounded-b-lg">
            <div className="text-sm text-muted-foreground">
              {mode === 'create' ? (
                <span className="text-primary">Creating new template</span>
              ) : hasChanges ? (
                <span className="text-amber-600">You have unsaved changes</span>
              ) : (
                <span>No changes</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={mode === 'edit' && !hasChanges}
              >
                <Check className="h-4 w-4 mr-1" />
                {mode === 'create' ? 'Create Template' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{templateToDelete?.name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default EditTemplatesModal;
