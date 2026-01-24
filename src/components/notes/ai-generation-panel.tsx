'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Loader2,
  Sparkles,
  FileText,
  Lightbulb,
  ListTodo,
  Zap,
  Check,
  X,
  Bot,
  Brain,
  Wand2,
  ChevronRight,
} from 'lucide-react';
import { useAIService } from '@/lib/ai/use-ai-service';
import { useAISettingsStore, getProviderDisplayName, type AIProviderType } from '@/lib/stores/ai-settings-store';
import { prdGenerator } from '@/lib/ai/services/prd-generator';
import { featureGenerator } from '@/lib/ai/services/feature-generator';
import { taskGenerator } from '@/lib/ai/services/task-generator';
import type { GeneratedFeature, GeneratedTask, PRDTemplateType } from '@/types';
import { PRD_TEMPLATES } from '@/lib/ai/prompts/prd-templates';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

export type GenerationMode = 
  | 'generate-prd'
  | 'prd-template'
  | 'generate-features'
  | 'generate-tasks'
  | 'improve-prd'
  | 'generate-section';

interface AIGenerationPanelProps {
  open: boolean;
  onClose: () => void;
  mode: GenerationMode;
  /** Current content in the editor (for context) */
  currentContent?: string;
  /** Previously generated/saved features (for task generation) */
  savedFeatures?: GeneratedFeature[];
  /** Callback when PRD content is generated */
  onPRDGenerated?: (content: string) => void;
  /** Callback when features are generated */
  onFeaturesGenerated?: (features: GeneratedFeature[]) => void;
  /** Callback when tasks are generated */
  onTasksGenerated?: (tasks: GeneratedTask[]) => void;
  /** Callback to insert an inline canvas after PRD generation */
  onInsertCanvas?: () => void;
}

// Provider icon component
const ProviderIcon = ({ provider }: { provider: AIProviderType }) => {
  switch (provider) {
    case 'openai':
      return <Bot className="h-4 w-4" />;
    case 'anthropic':
      return <Brain className="h-4 w-4" />;
    case 'gemini':
      return <Wand2 className="h-4 w-4" />;
  }
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AIGenerationPanel({
  open,
  onClose,
  mode,
  currentContent = '',
  savedFeatures = [],
  onPRDGenerated,
  onFeaturesGenerated,
  onTasksGenerated,
  onInsertCanvas,
}: AIGenerationPanelProps) {
  // State
  const [prompt, setPrompt] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<PRDTemplateType>('custom');
  const [selectedProvider, setSelectedProvider] = useState<AIProviderType | undefined>();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string>('');
  const [generatedFeatures, setGeneratedFeatures] = useState<GeneratedFeature[]>([]);
  const [generatedTasks, setGeneratedTasks] = useState<GeneratedTask[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'input' | 'preview'>('input');

  // Hooks
  const { availableProviders, activeProvider, hasProvider } = useAIService();
  const { providers } = useAISettingsStore();

  // Get the provider to use
  const effectiveProvider = selectedProvider || activeProvider || undefined;

  // Reset state when panel opens
  useEffect(() => {
    if (open) {
      console.log('[AIGenerationPanel] Panel opened, resetting state');
      console.log('[AIGenerationPanel] Mode:', mode);
      console.log('[AIGenerationPanel] Has provider:', hasProvider);
      console.log('[AIGenerationPanel] Available providers:', availableProviders);
      console.log('[AIGenerationPanel] Active provider:', activeProvider);
      setStep('input');
      setPrompt('');
      setGeneratedContent('');
      setGeneratedFeatures([]);
      setGeneratedTasks([]);
      setError(null);
    }
  }, [open, mode, hasProvider, availableProviders, activeProvider]);

  // Mode configuration
  const modeConfig: Record<GenerationMode, {
    title: string;
    description: string;
    icon: React.ReactNode;
    promptLabel: string;
    promptPlaceholder: string;
    generateButtonText: string;
    showTemplateSelector?: boolean;
    requiresContent?: boolean;
  }> = {
    'generate-prd': {
      title: 'Generate PRD',
      description: 'Create a comprehensive Product Requirements Document from your idea',
      icon: <FileText className="h-5 w-5" />,
      promptLabel: 'Describe your product or feature',
      promptPlaceholder: 'e.g., A mobile app that helps busy professionals track their daily water intake with smart reminders and health insights...',
      generateButtonText: 'Generate PRD',
    },
    'prd-template': {
      title: 'PRD from Template',
      description: 'Start with a structured template tailored to your product type',
      icon: <FileText className="h-5 w-5" />,
      promptLabel: 'Describe your product or feature',
      promptPlaceholder: 'Describe what you want to build...',
      generateButtonText: 'Generate from Template',
      showTemplateSelector: true,
    },
    'generate-features': {
      title: 'Generate Features',
      description: 'Extract and define features from your PRD content',
      icon: <Lightbulb className="h-5 w-5" />,
      promptLabel: 'Additional guidance (optional)',
      promptPlaceholder: 'e.g., Focus on MVP features, prioritize user-facing features...',
      generateButtonText: 'Generate Features',
      requiresContent: true,
    },
    'generate-tasks': {
      title: 'Generate Tasks',
      description: 'Break down features into actionable development tasks',
      icon: <ListTodo className="h-5 w-5" />,
      promptLabel: 'Additional context (optional)',
      promptPlaceholder: 'e.g., Small team of 3 developers, using React and Node.js...',
      generateButtonText: 'Generate Tasks',
      requiresContent: true,
    },
    'improve-prd': {
      title: 'Improve PRD',
      description: 'Enhance your PRD with AI suggestions and fill gaps',
      icon: <Zap className="h-5 w-5" />,
      promptLabel: 'Areas to focus on (optional)',
      promptPlaceholder: 'e.g., Add more detail to user stories, improve success metrics...',
      generateButtonText: 'Improve PRD',
      requiresContent: true,
    },
    'generate-section': {
      title: 'Generate Section',
      description: 'Generate a specific section for your PRD',
      icon: <FileText className="h-5 w-5" />,
      promptLabel: 'What section do you need?',
      promptPlaceholder: 'e.g., User personas, Success metrics, Technical requirements...',
      generateButtonText: 'Generate Section',
    },
  };

  const config = modeConfig[mode];

  // Handle generation
  const handleGenerate = useCallback(async () => {
    console.log('[AIGenerationPanel] handleGenerate called');
    console.log('[AIGenerationPanel] hasProvider:', hasProvider);
    console.log('[AIGenerationPanel] effectiveProvider:', effectiveProvider);
    console.log('[AIGenerationPanel] mode:', mode);
    console.log('[AIGenerationPanel] prompt:', prompt);
    
    // Note: We allow generation even without a configured provider because
    // the Mock AI provider will be used as a fallback for testing/demo purposes
    if (!hasProvider) {
      console.log('[AIGenerationPanel] No provider configured, will use Mock AI');
    }

    if (config.requiresContent && !currentContent.trim()) {
      console.log('[AIGenerationPanel] Content required but not provided');
      setError('This feature requires content in the editor. Please add some PRD content first.');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      switch (mode) {
        case 'generate-prd': {
          console.log('[AIGenerationPanel] Calling prdGenerator.quickGenerate');
          const result = await prdGenerator.quickGenerate(prompt, effectiveProvider);
          console.log('[AIGenerationPanel] PRD generated, content length:', result.content?.length);
          setGeneratedContent(result.content);
          setStep('preview');
          break;
        }
        case 'prd-template': {
          const result = await prdGenerator.generateFullPRD({
            description: prompt,
            templateType: selectedTemplate,
            provider: effectiveProvider,
          });
          setGeneratedContent(result.content);
          setStep('preview');
          break;
        }
        case 'generate-features': {
          const features = await featureGenerator.generateFromPRD({
            prdContent: currentContent,
            productDescription: prompt || undefined,
            provider: effectiveProvider,
          });
          setGeneratedFeatures(features);
          setStep('preview');
          break;
        }
        case 'generate-tasks': {
          // For tasks, first check if we have saved features, then try to generate new ones,
          // and finally fall back to direct PRD-based generation
          let features: GeneratedFeature[] = [];
          
          // Use saved features if available
          if (savedFeatures.length > 0) {
            features = savedFeatures;
            console.log(`Using ${savedFeatures.length} saved features for task generation`);
          } else {
            // Try to generate features from PRD
            try {
              features = await featureGenerator.generateFromPRD({
                prdContent: currentContent,
                provider: effectiveProvider,
                maxFeatures: 5, // Limit for task generation
              });
            } catch (featureError) {
              console.warn('Feature generation failed, will generate tasks directly from PRD:', featureError);
            }
          }

          const allTasks: GeneratedTask[] = [];
          
          if (features.length > 0) {
            // Generate tasks for each feature (limit to top 3 features)
            for (const feature of features.slice(0, 3)) {
              try {
                const tasks = await taskGenerator.generateForFeature({
                  feature,
                  prdContent: currentContent,
                  techStack: prompt || undefined,
                  provider: effectiveProvider,
                  maxTasks: 8,
                });
                allTasks.push(...tasks);
              } catch (taskError) {
                console.warn(`Task generation failed for feature "${feature.title}":`, taskError);
                // Continue with other features
              }
            }
          }
          
          // Fallback: If no tasks generated from features, generate directly from PRD
          if (allTasks.length === 0) {
            try {
              const directTasks = await taskGenerator.quickGenerate(
                currentContent + (prompt ? `\n\nTechnical context: ${prompt}` : ''),
                effectiveProvider
              );
              allTasks.push(...directTasks);
            } catch (directError) {
              console.error('Direct task generation also failed:', directError);
            }
          }
          
          if (allTasks.length === 0) {
            setError('Could not generate tasks from the content. Please try adding more detail to your PRD or try again.');
            return;
          }

          setGeneratedTasks(allTasks);
          setStep('preview');
          break;
        }
        case 'improve-prd': {
          const result = await prdGenerator.improvePRD({
            currentContent,
            focusAreas: prompt ? prompt.split(',').map(s => s.trim()) : undefined,
            provider: effectiveProvider,
          });
          setGeneratedContent(result.content);
          setStep('preview');
          break;
        }
        case 'generate-section': {
          const section = await prdGenerator.generateSection({
            sectionId: prompt.toLowerCase().replace(/\s+/g, '-'),
            description: currentContent || prompt,
            existingContent: currentContent,
            provider: effectiveProvider,
          });
          setGeneratedContent(`## ${section.title}\n\n${section.content}`);
          setStep('preview');
          break;
        }
      }
    } catch (err) {
      console.error('Generation failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Generation failed. Please try again.';
      
      // Provide more user-friendly error messages for common issues
      if (errorMessage.includes('not found') || errorMessage.includes('not supported')) {
        setError(`Model not available. Please go to Settings > Apps and select a different model for your provider, then try again.`);
      } else if (errorMessage.includes('API key') || errorMessage.includes('authentication') || errorMessage.includes('401')) {
        setError('Invalid API key. Please check your API key in Settings > Apps.');
      } else if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
        setError('Rate limit exceeded. Please wait a moment and try again.');
      } else if (errorMessage.includes('quota') || errorMessage.includes('insufficient')) {
        setError('API quota exceeded. Please check your API usage limits.');
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        setError('Network error. Please check your internet connection and try again.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsGenerating(false);
    }
  }, [mode, prompt, currentContent, selectedTemplate, effectiveProvider, hasProvider, config.requiresContent]);

  // Handle applying generated content
  const handleApply = useCallback(() => {
    if (generatedContent && onPRDGenerated) {
      onPRDGenerated(generatedContent);
      // Insert an inline canvas after PRD content for visual planning
      if (onInsertCanvas && (mode === 'generate-prd' || mode === 'prd-template')) {
        // Small delay to ensure PRD content is inserted first
        setTimeout(() => {
          onInsertCanvas();
        }, 100);
      }
    }
    if (generatedFeatures.length > 0 && onFeaturesGenerated) {
      onFeaturesGenerated(generatedFeatures.filter(f => f.isSelected));
    }
    if (generatedTasks.length > 0 && onTasksGenerated) {
      onTasksGenerated(generatedTasks.filter(t => t.isSelected));
    }
    handleClose();
  }, [generatedContent, generatedFeatures, generatedTasks, onPRDGenerated, onFeaturesGenerated, onTasksGenerated, onInsertCanvas, mode]);

  // Handle close and reset
  const handleClose = useCallback(() => {
    setPrompt('');
    setGeneratedContent('');
    setGeneratedFeatures([]);
    setGeneratedTasks([]);
    setError(null);
    setStep('input');
    onClose();
  }, [onClose]);

  // Toggle feature selection
  const toggleFeatureSelection = (id: string) => {
    setGeneratedFeatures(prev =>
      prev.map(f => f.id === id ? { ...f, isSelected: !f.isSelected } : f)
    );
  };

  // Toggle task selection
  const toggleTaskSelection = (id: string) => {
    setGeneratedTasks(prev =>
      prev.map(t => t.id === id ? { ...t, isSelected: !t.isSelected } : t)
    );
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <SheetContent className="w-full sm:max-w-[600px] p-0 flex flex-col h-full overflow-hidden gap-0">
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              {config.icon}
            </div>
            <div>
              <SheetTitle>{config.title}</SheetTitle>
              <SheetDescription>{config.description}</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="px-6 py-4 space-y-6">
            {step === 'input' ? (
              <>
                {/* Provider Selector */}
                {availableProviders.length > 0 && (
                  <div className="space-y-2">
                    <Label>AI Provider</Label>
                    <Select
                      value={effectiveProvider}
                      onValueChange={(v) => setSelectedProvider(v as AIProviderType)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableProviders.map(({ type, name }) => (
                          <SelectItem key={type} value={type}>
                            <div className="flex items-center gap-2">
                              <ProviderIcon provider={type} />
                              <span>{name}</span>
                              {type === activeProvider && (
                                <Badge variant="secondary" className="ml-2 text-xs">Active</Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* No Provider Info */}
                {!hasProvider && (
                  <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      <strong>Using Demo Mode (Mock AI).</strong> For real AI generation, go to{' '}
                      <a href="/settings/apps" className="underline">Settings → Apps</a> to add your API key.
                    </p>
                  </div>
                )}

                {/* Template Selector */}
                {config.showTemplateSelector && (
                  <div className="space-y-2">
                    <Label>Template Type</Label>
                    <Select
                      value={selectedTemplate}
                      onValueChange={(v) => setSelectedTemplate(v as PRDTemplateType)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(PRD_TEMPLATES).map(([key, template]) => (
                          <SelectItem key={key} value={key}>
                            <div>
                              <div className="font-medium">{template.name}</div>
                              <div className="text-xs text-muted-foreground">{template.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Content Preview (if requires content) */}
                {config.requiresContent && currentContent && (
                  <div className="space-y-2">
                    <Label>Current Content</Label>
                    <div className="bg-muted/50 rounded-lg p-3 max-h-32 overflow-auto">
                      <p className="text-sm text-muted-foreground line-clamp-6">
                        {currentContent.substring(0, 500)}
                        {currentContent.length > 500 && '...'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Prompt Input */}
                <div className="space-y-2">
                  <Label>{config.promptLabel}</Label>
                  <Textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={config.promptPlaceholder}
                    rows={4}
                    className="resize-none"
                  />
                </div>

                {/* Error */}
                {error && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}
              </>
            ) : (
              /* Preview Step */
              <>
                {/* Generated PRD Content */}
                {generatedContent && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Generated Content</Label>
                      <Badge variant="outline" className="text-xs">
                        {effectiveProvider ? getProviderDisplayName(effectiveProvider) : 'AI'}
                      </Badge>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-4 max-h-[400px] overflow-auto">
                      <pre className="text-sm whitespace-pre-wrap font-sans">
                        {generatedContent}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Generated Features */}
                {generatedFeatures.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Generated Features ({generatedFeatures.filter(f => f.isSelected).length} selected)</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setGeneratedFeatures(prev => prev.map(f => ({ ...f, isSelected: true })))}
                      >
                        Select All
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {generatedFeatures.map((feature) => (
                        <div
                          key={feature.id}
                          className={cn(
                            'border rounded-lg p-3 cursor-pointer transition-colors',
                            feature.isSelected
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-muted-foreground/30'
                          )}
                          onClick={() => toggleFeatureSelection(feature.id)}
                        >
                          <div className="flex items-start gap-3">
                            <div className={cn(
                              'w-5 h-5 rounded border flex items-center justify-center shrink-0 mt-0.5',
                              feature.isSelected
                                ? 'bg-primary border-primary text-primary-foreground'
                                : 'border-muted-foreground/30'
                            )}>
                              {feature.isSelected && <Check className="h-3 w-3" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{feature.title}</span>
                                <Badge variant="outline" className={cn(
                                  'text-xs',
                                  feature.priority === 'urgent' && 'border-red-500 text-red-500',
                                  feature.priority === 'high' && 'border-orange-500 text-orange-500',
                                  feature.priority === 'medium' && 'border-yellow-500 text-yellow-500',
                                  feature.priority === 'low' && 'border-gray-500 text-gray-500'
                                )}>
                                  {feature.priority}
                                </Badge>
                                <Badge variant="secondary" className="text-xs">{feature.phase}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {feature.description}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Generated Tasks */}
                {generatedTasks.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Generated Tasks ({generatedTasks.filter(t => t.isSelected).length} selected)</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setGeneratedTasks(prev => prev.map(t => ({ ...t, isSelected: true })))}
                      >
                        Select All
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {generatedTasks.map((task) => (
                        <div
                          key={task.id}
                          className={cn(
                            'border rounded-lg p-3 cursor-pointer transition-colors',
                            task.isSelected
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-muted-foreground/30'
                          )}
                          onClick={() => toggleTaskSelection(task.id)}
                        >
                          <div className="flex items-start gap-3">
                            <div className={cn(
                              'w-5 h-5 rounded border flex items-center justify-center shrink-0 mt-0.5',
                              task.isSelected
                                ? 'bg-primary border-primary text-primary-foreground'
                                : 'border-muted-foreground/30'
                            )}>
                              {task.isSelected && <Check className="h-3 w-3" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium">{task.title}</span>
                                <Badge variant="secondary" className="text-xs">{task.role}</Badge>
                                <Badge variant="outline" className="text-xs">{task.estimatedHours}h</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {task.description}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t shrink-0 flex justify-between gap-3 bg-background">
          {step === 'input' ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || (!prompt.trim() && !config.requiresContent)}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    {config.generateButtonText}
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep('input')}>
                Back
              </Button>
              <Button onClick={handleApply}>
                <Check className="h-4 w-4 mr-2" />
                Apply to Note
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default AIGenerationPanel;
