'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
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
  Check,
  RefreshCw,
  Wand2,
  FileEdit,
  Minimize2,
  Maximize2,
  MessageSquare,
  Briefcase,
  Smile,
  Bot,
  Brain,
} from 'lucide-react';
import { useAIService } from '@/lib/ai/use-ai-service';
import { useAISettingsStore, getProviderDisplayName, type AIProviderType } from '@/lib/stores/ai-settings-store';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

export type RewriteStyle = 
  | 'improve'
  | 'shorter'
  | 'longer'
  | 'professional'
  | 'casual'
  | 'friendly'
  | 'custom';

interface AIRewriteDrawerProps {
  open: boolean;
  onClose: () => void;
  selectedText: string;
  onApply: (newText: string) => void;
}

// Style configuration
const REWRITE_STYLES: {
  id: RewriteStyle;
  label: string;
  icon: React.ReactNode;
  description: string;
  prompt: string;
}[] = [
  {
    id: 'improve',
    label: 'Improve Writing',
    icon: <Wand2 className="h-4 w-4" />,
    description: 'Fix grammar, improve...',
    prompt: 'Improve the writing quality of the following text. Fix any grammar issues, improve clarity, and make it flow better while preserving the original meaning:',
  },
  {
    id: 'shorter',
    label: 'Make Shorter',
    icon: <Minimize2 className="h-4 w-4" />,
    description: 'Condense while keeping...',
    prompt: 'Make the following text more concise. Remove unnecessary words and condense it while preserving the key points and meaning:',
  },
  {
    id: 'longer',
    label: 'Make Longer',
    icon: <Maximize2 className="h-4 w-4" />,
    description: 'Expand with more detail',
    prompt: 'Expand the following text with more detail, examples, or explanations while maintaining the same tone and style:',
  },
  {
    id: 'professional',
    label: 'Professional',
    icon: <Briefcase className="h-4 w-4" />,
    description: 'Formal business tone',
    prompt: 'Rewrite the following text in a professional, formal business tone suitable for corporate communication:',
  },
  {
    id: 'casual',
    label: 'Casual',
    icon: <MessageSquare className="h-4 w-4" />,
    description: 'Relaxed, conversational...',
    prompt: 'Rewrite the following text in a casual, conversational tone that feels natural and approachable:',
  },
  {
    id: 'friendly',
    label: 'Friendly',
    icon: <Smile className="h-4 w-4" />,
    description: 'Warm and approachable',
    prompt: 'Rewrite the following text in a friendly, warm tone that feels welcoming and personable:',
  },
  {
    id: 'custom',
    label: 'Custom',
    icon: <FileEdit className="h-4 w-4" />,
    description: 'Provide your own...',
    prompt: '',
  },
];

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

export function AIRewriteDrawer({
  open,
  onClose,
  selectedText,
  onApply,
}: AIRewriteDrawerProps) {
  // State
  const [selectedStyle, setSelectedStyle] = useState<RewriteStyle>('improve');
  const [customPrompt, setCustomPrompt] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<AIProviderType | undefined>();
  const [isGenerating, setIsGenerating] = useState(false);
  const [rewrittenText, setRewrittenText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'input' | 'preview'>('input');

  // Hooks
  const { generateContent, availableProviders, activeProvider, hasProvider } = useAIService();
  const { providers } = useAISettingsStore();

  // Get the provider to use
  const effectiveProvider = selectedProvider || activeProvider || undefined;

  // Reset state when drawer opens
  useEffect(() => {
    if (open) {
      setStep('input');
      setSelectedStyle('improve');
      setCustomPrompt('');
      setRewrittenText('');
      setError(null);
    }
  }, [open]);

  // Handle generation
  const handleGenerate = useCallback(async () => {
    if (!selectedText.trim()) {
      setError('No text selected to rewrite.');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const styleConfig = REWRITE_STYLES.find(s => s.id === selectedStyle);
      let prompt = styleConfig?.prompt || '';
      
      if (selectedStyle === 'custom') {
        if (!customPrompt.trim()) {
          setError('Please provide custom instructions for the rewrite.');
          setIsGenerating(false);
          return;
        }
        prompt = customPrompt;
      }

      const fullPrompt = `${prompt}\n\nText to rewrite:\n"""${selectedText}"""\n\nRewritten text:`;

      const result = await generateContent({
        prompt: fullPrompt,
        context: '',
        type: 'rewrite',
      });

      if (result.content) {
        // Clean up the response - remove any quotes or extra formatting
        let cleanedContent = result.content.trim();
        // Remove leading/trailing quotes if present
        if ((cleanedContent.startsWith('"') && cleanedContent.endsWith('"')) ||
            (cleanedContent.startsWith("'") && cleanedContent.endsWith("'"))) {
          cleanedContent = cleanedContent.slice(1, -1);
        }
        // Remove triple quotes if present
        if (cleanedContent.startsWith('"""') && cleanedContent.endsWith('"""')) {
          cleanedContent = cleanedContent.slice(3, -3);
        }
        setRewrittenText(cleanedContent.trim());
        setStep('preview');
      } else {
        setError('Failed to generate rewritten text. Please try again.');
      }
    } catch (err) {
      console.error('Rewrite failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Rewrite failed. Please try again.';
      
      // Provide user-friendly error messages
      if (errorMessage.includes('API key') || errorMessage.includes('authentication') || errorMessage.includes('401')) {
        setError('Invalid API key. Please check your API key in Settings > Apps.');
      } else if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
        setError('Rate limit exceeded. Please wait a moment and try again.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsGenerating(false);
    }
  }, [selectedText, selectedStyle, customPrompt, generateContent]);

  // Handle apply
  const handleApply = useCallback(() => {
    if (rewrittenText) {
      onApply(rewrittenText);
      onClose();
    }
  }, [rewrittenText, onApply, onClose]);

  // Handle regenerate
  const handleRegenerate = useCallback(() => {
    setStep('input');
    setRewrittenText('');
  }, []);

  // Handle close
  const handleClose = useCallback(() => {
    setStep('input');
    setRewrittenText('');
    setError(null);
    onClose();
  }, [onClose]);

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <SheetContent className="w-full sm:max-w-[500px] p-0 flex flex-col h-full overflow-hidden gap-0">
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <SheetTitle>AI Rewrite</SheetTitle>
              <SheetDescription>Transform your selected text with AI</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="px-6 py-4 space-y-6">
            {step === 'input' ? (
              <>
                {/* Original Text Preview */}
                <div className="space-y-2">
                  <Label>Selected Text</Label>
                  <div className="bg-muted/50 rounded-lg p-3 max-h-32 overflow-auto">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {selectedText.length > 500 
                        ? `${selectedText.substring(0, 500)}...` 
                        : selectedText}
                    </p>
                  </div>
                </div>

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
                  <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      <strong>Using Demo Mode.</strong> For real AI, add your API key in{' '}
                      <a href="/settings/apps" className="underline">Settings → Apps</a>.
                    </p>
                  </div>
                )}

                {/* Rewrite Style Selection */}
                <div className="space-y-3">
                  <Label>Rewrite Style</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {REWRITE_STYLES.map((style) => (
                      <button
                        key={style.id}
                        type="button"
                        className={cn(
                          'flex items-start gap-3 p-3 rounded-lg border text-left transition-colors',
                          selectedStyle === style.id
                            ? 'border-primary bg-primary/5'
                            : 'border-input hover:border-muted-foreground/50 hover:bg-muted/50'
                        )}
                        onClick={() => setSelectedStyle(style.id)}
                      >
                        <div className={cn(
                          'p-1.5 rounded-md',
                          selectedStyle === style.id
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted text-muted-foreground'
                        )}>
                          {style.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{style.label}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {style.description}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Prompt Input */}
                {selectedStyle === 'custom' && (
                  <div className="space-y-2">
                    <Label>Custom Instructions</Label>
                    <Textarea
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      placeholder="e.g., Rewrite in the style of a tech blog, add bullet points, use simpler language..."
                      rows={3}
                      className="resize-none"
                    />
                  </div>
                )}

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
                {/* Original vs Rewritten Comparison */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-muted-foreground">Original</Label>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-3 max-h-32 overflow-auto">
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap line-through opacity-70">
                        {selectedText.length > 300 
                          ? `${selectedText.substring(0, 300)}...` 
                          : selectedText}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Rewritten</Label>
                      <Badge variant="outline" className="text-xs">
                        {effectiveProvider ? getProviderDisplayName(effectiveProvider) : 'AI'}
                      </Badge>
                    </div>
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 max-h-64 overflow-auto">
                      <p className="text-sm whitespace-pre-wrap">{rewrittenText}</p>
                    </div>
                  </div>
                </div>
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
                disabled={isGenerating || (selectedStyle === 'custom' && !customPrompt.trim())}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Rewriting...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Rewrite
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleRegenerate}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button onClick={handleApply}>
                <Check className="h-4 w-4 mr-2" />
                Apply Changes
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default AIRewriteDrawer;
