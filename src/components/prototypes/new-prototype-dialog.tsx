'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Package, ChevronRight, Loader2, Plus } from 'lucide-react';
import { useComponentLibraries } from '@/lib/hooks/use-component-libraries';
import { useAISettingsStore, AI_MODELS } from '@/lib/stores/ai-settings-store';
import { toast } from 'sonner';

interface NewPrototypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewPrototypeDialog({ open, onOpenChange }: NewPrototypeDialogProps) {
  const router = useRouter();
  const { data: libraries = [], isLoading: librariesLoading } = useComponentLibraries();
  const { providers, activeProvider } = useAISettingsStore();

  const [name, setName] = useState('');
  const [selectedLibraryId, setSelectedLibraryId] = useState<string>('none');
  const [selectedProvider, setSelectedProvider] = useState<string>(activeProvider || 'openai');
  const [selectedModel, setSelectedModel] = useState<string>('');

  // Get configured (enabled + has API key) providers
  const configuredProviders = (Object.entries(providers) as [string, any][])
    .filter(([, cfg]) => cfg.apiKey && cfg.isEnabled)
    .map(([key]) => key);

  // When provider changes, reset model to provider default
  const handleProviderChange = (p: string) => {
    setSelectedProvider(p);
    const cfg = providers[p as keyof typeof providers];
    setSelectedModel(cfg?.defaultModel || '');
  };

  // Models for selected provider
  const modelsForProvider = AI_MODELS[selectedProvider as keyof typeof AI_MODELS] as readonly { id: string; name: string; description: string }[] | undefined;

  const canProceed = name.trim().length > 0 && selectedProvider;

  const handleCreate = () => {
    if (!canProceed) return;

    const cfg = providers[selectedProvider as keyof typeof providers];
    if (!cfg?.apiKey) {
      toast.error(`No API key configured for ${selectedProvider}. Go to Settings → Features to add one.`);
      return;
    }

    // Always resolve the model explicitly — never send empty string
    const resolvedModel =
      selectedModel ||
      cfg.defaultModel ||
      (AI_MODELS[selectedProvider as keyof typeof AI_MODELS]?.[0]?.id ?? '');

    if (!resolvedModel) {
      toast.error(`No model available for ${selectedProvider}.`);
      return;
    }

    // Encode config into URL params so the workspace page can read them
    const params = new URLSearchParams({
      name: name.trim(),
      provider: selectedProvider,
      model: resolvedModel,
    });
    if (selectedLibraryId && selectedLibraryId !== 'none') {
      params.set('libraryId', selectedLibraryId);
    }

    onOpenChange(false);
    router.push(`/prototypes/new?${params.toString()}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-lg w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="w-5 h-5 text-primary" />
            New Prototype
          </DialogTitle>
          <DialogDescription>
            Configure your prototype's name, component library, and AI model.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="proto-name">Prototype Name</Label>
            <Input
              id="proto-name"
              placeholder="e.g. Dashboard Overview, Login Page..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
          </div>

          {/* Component Library */}
          <div className="space-y-1.5">
            <Label>Component Library</Label>
            {librariesLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading libraries...
              </div>
            ) : libraries.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                <Package className="w-5 h-5 mx-auto mb-1 opacity-50" />
                No component libraries imported yet.{' '}
                <a href="/repositories" className="text-primary underline underline-offset-2">
                  Import one first
                </a>
              </div>
            ) : (
              <Select value={selectedLibraryId} onValueChange={setSelectedLibraryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a library (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <span className="text-muted-foreground">None — use plain Tailwind CSS</span>
                  </SelectItem>
                  {libraries.map((lib) => (
                    <SelectItem key={lib.id} value={lib.id}>
                      <div className="flex items-center gap-2">
                        <Package className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{lib.name}</span>
                        {lib.packageName && (
                          <Badge variant="outline" className="text-[10px] font-mono ml-1">
                            {lib.packageName}
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* AI Provider */}
          <div className="space-y-1.5">
            <Label>AI Provider</Label>
            {configuredProviders.length === 0 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20 p-3 text-sm text-amber-700 dark:text-amber-300">
                No AI providers configured.{' '}
                <a href="/settings/features" className="underline underline-offset-2 font-medium">
                  Add an API key in Settings → Features
                </a>
              </div>
            ) : (
              <Select value={selectedProvider} onValueChange={handleProviderChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {configuredProviders.map((p) => (
                    <SelectItem key={p} value={p}>
                      <span className="capitalize">{p === 'openai' ? 'OpenAI' : p === 'anthropic' ? 'Anthropic' : 'Google Gemini'}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* AI Model */}
          {selectedProvider && modelsForProvider && (
            <div className="space-y-1.5">
              <Label>Model</Label>
              <Select
                value={selectedModel || providers[selectedProvider as keyof typeof providers]?.defaultModel || ''}
                onValueChange={setSelectedModel}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {modelsForProvider.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      <div>
                        <div className="font-medium">{m.name}</div>
                        <div className="text-xs text-muted-foreground">{m.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:items-center">
          {/* Summary of what will be used */}
          {selectedProvider && (providers[selectedProvider as keyof typeof providers]?.apiKey) && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mr-auto">
              <span className="font-medium capitalize">
                {selectedProvider === 'openai' ? 'OpenAI' : selectedProvider === 'anthropic' ? 'Anthropic' : 'Gemini'}
              </span>
              <span>·</span>
              <span className="font-mono">
                {selectedModel || providers[selectedProvider as keyof typeof providers]?.defaultModel || AI_MODELS[selectedProvider as keyof typeof AI_MODELS]?.[0]?.id}
              </span>
              {selectedLibraryId && selectedLibraryId !== 'none' && (
                <>
                  <span>·</span>
                  <span>{libraries.find(l => l.id === selectedLibraryId)?.name || 'Custom Library'}</span>
                </>
              )}
            </div>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!canProceed}>
            <Plus className="w-4 h-4 mr-1.5" />
            Create Prototype
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
