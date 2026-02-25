'use client';

import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Package, Github, BookOpen, Loader2, Search, Check,
  ChevronRight, Box, RefreshCw, AlertCircle, ExternalLink,
} from 'lucide-react';
import { useCreateComponentLibrary, useBulkInsertComponents } from '@/lib/hooks/use-component-libraries';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import type { LibraryImportSource, ComponentLibrary } from '@/types';

interface ImportLibraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (library: ComponentLibrary) => void;
}

type ImportStep = 'source' | 'configure' | 'importing' | 'done';

interface NpmLookupResult {
  name: string;
  version: string;
  description: string;
  homepage?: string;
  repository?: string;
  keywords?: string[];
  components: Array<{ name: string; category: string; filePath: string }>;
}

interface StorybookComponent {
  name: string;
  category: string;
  filePath: string;
  description: string;
  stories: string[];
}

interface StorybookLookupResult {
  url: string;
  isChromatic: boolean;
  storybookVersion: number;
  componentCount: number;
  storyCount: number;
  components: StorybookComponent[];
}

const POPULAR_PACKAGES = [
  { name: '@shadcn/ui', label: 'shadcn/ui', description: 'Beautifully designed components built with Radix UI and Tailwind CSS.' },
  { name: '@mui/material', label: 'Material UI', description: 'Google\'s Material Design React components.' },
  { name: 'antd', label: 'Ant Design', description: 'Enterprise-class UI design language and React components.' },
  { name: '@chakra-ui/react', label: 'Chakra UI', description: 'Simple, modular and accessible component library.' },
  { name: 'mantine', label: 'Mantine', description: 'A fully featured React components library.' },
  { name: 'daisyui', label: 'DaisyUI', description: 'Tailwind CSS component library.' },
  { name: 'react-bootstrap', label: 'React Bootstrap', description: 'Bootstrap components built with React.' },
  { name: 'flowbite-react', label: 'Flowbite React', description: 'UI components built on top of Tailwind CSS.' },
];

export function ImportLibraryDialog({ open, onOpenChange, onSuccess }: ImportLibraryDialogProps) {
  const { currentWorkspace } = useWorkspaceStore();
  const createLibrary = useCreateComponentLibrary();
  const bulkInsert = useBulkInsertComponents();

  const [step, setStep] = useState<ImportStep>('source');
  const [source, setSource] = useState<LibraryImportSource>('npm');

  // npm state
  const [packageInput, setPackageInput] = useState('');
  const [lookupResult, setLookupResult] = useState<NpmLookupResult | null>(null);
  const [isLooking, setIsLooking] = useState(false);
  const [lookupError, setLookupError] = useState('');

  // github state
  const [githubUrl, setGithubUrl] = useState('');
  const [githubName, setGithubName] = useState('');
  const [githubDesc, setGithubDesc] = useState('');

  // storybook state
  const [storybookUrl, setStorybookUrl] = useState('');
  const [storybookName, setStorybookName] = useState('');
  const [storybookDesc, setStorybookDesc] = useState('');
  const [storybookToken, setStorybookToken] = useState('');
  const [storybookMode, setStorybookMode] = useState<'url' | 'github' | 'manual'>('url');
  const [storybookGithubUrl, setStorybookGithubUrl] = useState('');
  const [storybookGithubToken, setStorybookGithubToken] = useState('');
  const [storybookManualJson, setStorybookManualJson] = useState('');
  const [storybookLookupResult, setStorybookLookupResult] = useState<StorybookLookupResult | null>(null);
  const [isStorybookLooking, setIsStorybookLooking] = useState(false);
  const [storybookLookupError, setStorybookLookupError] = useState('');
  const [storybookIsProtected, setStorybookIsProtected] = useState(false);

  // manual state
  const [manualName, setManualName] = useState('');
  const [manualDesc, setManualDesc] = useState('');

  const [importProgress, setImportProgress] = useState('');

  const resetState = () => {
    setStep('source');
    setSource('npm');
    setPackageInput('');
    setLookupResult(null);
    setIsLooking(false);
    setLookupError('');
    setGithubUrl('');
    setGithubName('');
    setGithubDesc('');
    setStorybookUrl('');
    setStorybookName('');
    setStorybookDesc('');
    setStorybookToken('');
    setStorybookMode('url');
    setStorybookGithubUrl('');
    setStorybookGithubToken('');
    setStorybookManualJson('');
    setStorybookLookupResult(null);
    setIsStorybookLooking(false);
    setStorybookLookupError('');
    setStorybookIsProtected(false);
    setManualName('');
    setManualDesc('');
    setImportProgress('');
  };

  const handleStorybookLookup = async () => {
    setIsStorybookLooking(true);
    setStorybookLookupError('');
    setStorybookLookupResult(null);
    setStorybookIsProtected(false);

    try {
      let body: Record<string, string> = {};

      if (storybookMode === 'url') {
        const url = storybookUrl.trim();
        if (!url) { setIsStorybookLooking(false); return; }
        body = { mode: 'url', url, token: storybookToken.trim() };
      } else if (storybookMode === 'github') {
        const ghUrl = storybookGithubUrl.trim();
        if (!ghUrl) { setIsStorybookLooking(false); return; }
        body = { mode: 'github', githubUrl: ghUrl, token: storybookGithubToken.trim() };
      } else if (storybookMode === 'manual') {
        const json = storybookManualJson.trim();
        if (!json) { setIsStorybookLooking(false); return; }
        body = { mode: 'manual', manualJson: json };
      }

      const res = await fetch('/api/repositories/storybook-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          // Protected Chromatic — suggest switching to GitHub or Manual mode
          setStorybookIsProtected(true);
          setStorybookLookupError(
            'This Storybook is protected by Chromatic login — it cannot be fetched directly. ' +
            'Use "GitHub Repo" to import from source code, or "Paste JSON" to paste your stories.json.'
          );
        } else {
          setStorybookLookupError(data.error || data.message || 'Failed to fetch Storybook components');
        }
      } else {
        const result: StorybookLookupResult = {
          url: storybookUrl,
          isChromatic: storybookUrl.includes('chromatic.com'),
          storybookVersion: data.version || 7,
          componentCount: data.componentCount,
          storyCount: data.storyCount,
          components: data.components,
        };
        setStorybookLookupResult(result);

        // Auto-fill name from URL if not set
        if (!storybookName) {
          try {
            const parsed = new URL(storybookUrl.trim() || storybookGithubUrl.trim());
            const autoName = parsed.hostname.split('.')[0].replace(/-+/g, ' ');
            setStorybookName(autoName.charAt(0).toUpperCase() + autoName.slice(1));
          } catch { /* ignore */ }
        }
      }
    } catch {
      setStorybookLookupError('Network error — check your connection and try again.');
    } finally {
      setIsStorybookLooking(false);
    }
  };

  const handleClose = (val: boolean) => {
    if (!val) resetState();
    onOpenChange(val);
  };

  // Parse any npm/npx/yarn/pnpm command to extract just the package name
  const parsePackageName = (input: string): string => {
    const trimmed = input.trim();

    // Patterns to strip:
    // npm install <pkg> / npm i <pkg>
    // npx <pkg>@latest / npx <pkg>@latest add / npx shadcn@latest add button
    // yarn add <pkg>
    // pnpm add <pkg>
    // pnpm dlx <pkg>
    // npx create-<pkg> / npx <pkg> init
    const patterns = [
      /^npm\s+(?:install|i)\s+/i,
      /^yarn\s+add\s+/i,
      /^pnpm\s+(?:add|dlx)\s+/i,
      /^bun\s+add\s+/i,
    ];

    let cleaned = trimmed;

    for (const pattern of patterns) {
      if (pattern.test(cleaned)) {
        cleaned = cleaned.replace(pattern, '').trim();
        break;
      }
    }

    // Handle npx separately — strip the npx prefix and any trailing subcommands
    // e.g. "npx shadcn@latest add" → "shadcn-ui"
    // e.g. "npx @mui/material" → "@mui/material"
    if (/^npx\s+/i.test(cleaned)) {
      cleaned = cleaned.replace(/^npx\s+/i, '').trim();
      // Remove trailing sub-commands like "add button", "init", "create" etc.
      // Keep only the first token (the package name)
      const firstToken = cleaned.split(/\s+/)[0];
      cleaned = firstToken;
    }

    // Strip version tag if present: @mui/material@7.0.0 → @mui/material
    // But preserve scoped packages: @mui/material (starts with @)
    if (cleaned.startsWith('@')) {
      // scoped: @scope/name@version → @scope/name
      const parts = cleaned.split('@');
      // parts[0] = '', parts[1] = 'scope/name', parts[2] = 'version'
      if (parts.length >= 3 && parts[2]) {
        cleaned = `@${parts[1]}`;
      }
    } else {
      // unscoped: package@version → package
      cleaned = cleaned.split('@')[0];
    }

    // Handle well-known CLI tool → actual npm package mappings
    const CLI_TO_PACKAGE: Record<string, string> = {
      'shadcn': 'shadcn-ui',
      'shadcn-ui': 'shadcn-ui',
      'create-react-app': 'react',
      'create-next-app': 'next',
    };

    return CLI_TO_PACKAGE[cleaned] ?? cleaned;
  };

  const handleNpmLookup = async (pkg: string = packageInput) => {
    const parsed = parsePackageName(pkg);
    if (!parsed) return;
    setIsLooking(true);
    setLookupError('');
    setLookupResult(null);
    try {
      const res = await fetch(`/api/repositories/npm-lookup?package=${encodeURIComponent(parsed)}`);
      const data = await res.json();
      if (!res.ok) {
        setLookupError(data.error || `Package "${parsed}" not found on npm registry`);
      } else {
        setLookupResult(data);
        setPackageInput(parsed);
      }
    } catch {
      setLookupError('Failed to fetch package information. Check your connection.');
    } finally {
      setIsLooking(false);
    }
  };

  const canProceed = () => {
    if (source === 'npm') return !!lookupResult;
    if (source === 'github') return !!githubUrl.trim() && !!githubName.trim();
    if (source === 'storybook') return !!storybookUrl.trim() && !!storybookName.trim();
    if (source === 'manual') return !!manualName.trim();
    return false;
  };

  const handleImport = async () => {
    if (!currentWorkspace) {
      toast.error('Please select a workspace first');
      return;
    }
    setStep('importing');

    try {
      let name = '';
      let description: string | undefined;
      let packageName: string | undefined;
      let packageVersion: string | undefined;
      let repoUrl: string | undefined;
      let sbUrl: string | undefined;

      if (source === 'npm' && lookupResult) {
        name = lookupResult.name;
        description = lookupResult.description;
        packageName = lookupResult.name;
        packageVersion = lookupResult.version;
        repoUrl = lookupResult.repository;
        setImportProgress(`Creating library "${name}"...`);
      } else if (source === 'github') {
        name = githubName;
        description = githubDesc;
        repoUrl = githubUrl;
        setImportProgress(`Creating library "${name}" from GitHub...`);
      } else if (source === 'storybook') {
        name = storybookName;
        description = storybookDesc || (storybookLookupResult ? `${storybookLookupResult.componentCount} components from Storybook` : undefined);
        sbUrl = storybookUrl;
        setImportProgress(`Creating library "${name}" from Storybook...`);
      } else {
        name = manualName;
        description = manualDesc;
        setImportProgress(`Creating library "${name}"...`);
      }

      const library = await createLibrary.mutateAsync({
        name,
        description,
        packageName,
        packageVersion,
        repoUrl,
        storybookUrl: sbUrl,
        importSource: source,
        workspaceId: currentWorkspace.id,
      });

      // If npm and we have discovered components, bulk insert them
      if (source === 'npm' && lookupResult && lookupResult.components.length > 0) {
        setImportProgress(`Importing ${lookupResult.components.length} components...`);
        await bulkInsert.mutateAsync({
          libraryId: library.id,
          components: lookupResult.components.map((c) => ({
            name: c.name,
            filePath: c.filePath,
            codeContent: generateComponentStub(c.name, lookupResult.name, packageVersion),
            category: c.category,
            description: `${c.name} component from ${lookupResult.name}`,
            exampleUsage: generateExampleUsage(c.name, lookupResult.name),
          })),
        });
      }

      // If storybook and we discovered components, bulk insert them
      if (source === 'storybook' && storybookLookupResult && storybookLookupResult.components.length > 0) {
        setImportProgress(`Importing ${storybookLookupResult.componentCount} components from Storybook...`);
        await bulkInsert.mutateAsync({
          libraryId: library.id,
          components: storybookLookupResult.components.map((c) => ({
            name: c.name,
            filePath: c.filePath,
            codeContent: generateStorybookComponentStub(c.name, storybookUrl, c.stories),
            category: c.category,
            description: c.description,
            exampleUsage: generateStorybookExampleUsage(c.name, storybookUrl, c.stories),
          })),
        });
      }

      setImportProgress('Done!');
      setStep('done');
      toast.success(`"${name}" imported successfully!`);
      onSuccess?.(library);
    } catch (error: any) {
      console.error('[ImportLibraryDialog] Error:', error);
      toast.error(error?.message || 'Failed to import library');
      setStep('configure');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="!max-w-2xl !w-full p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Import Component Library
          </DialogTitle>
          <DialogDescription>
            Import components from npm, GitHub, Storybook, or add them manually.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4 max-h-[65vh] overflow-y-auto">
          {step === 'source' && (
            <Tabs value={source} onValueChange={(v) => setSource(v as LibraryImportSource)}>
              <TabsList className="grid grid-cols-4 w-full mb-6">
                <TabsTrigger value="npm" className="flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5" /> npm
                </TabsTrigger>
                <TabsTrigger value="github" className="flex items-center gap-1.5">
                  <Github className="w-3.5 h-3.5" /> GitHub
                </TabsTrigger>
                <TabsTrigger value="storybook" className="flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" /> Storybook
                </TabsTrigger>
                <TabsTrigger value="manual" className="flex items-center gap-1.5">
                  <Box className="w-3.5 h-3.5" /> Manual
                </TabsTrigger>
              </TabsList>

              {/* ── npm tab ── */}
              <TabsContent value="npm" className="space-y-5 mt-0">
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">Install command or package name</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Paste any install command — we'll extract the package automatically.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. npx shadcn@latest  •  npm install @mui/material  •  antd"
                      value={packageInput}
                      onChange={(e) => { setPackageInput(e.target.value); setLookupResult(null); setLookupError(''); }}
                      onKeyDown={(e) => e.key === 'Enter' && handleNpmLookup()}
                      className="flex-1 font-mono text-sm"
                    />
                    <Button
                      onClick={() => handleNpmLookup()}
                      disabled={!packageInput.trim() || isLooking}
                      variant="secondary"
                      size="default"
                    >
                      {isLooking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {[
                      'npx shadcn@latest',
                      'npm install @mui/material',
                      'yarn add antd',
                      'pnpm add @chakra-ui/react',
                    ].map((example) => (
                      <button
                        key={example}
                        type="button"
                        onClick={() => { setPackageInput(example); setLookupResult(null); setLookupError(''); }}
                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors border border-border"
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                  {lookupError && (
                    <p className="text-sm text-destructive mt-2 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" /> {lookupError}
                    </p>
                  )}
                </div>

                {/* Popular packages */}
                {!lookupResult && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wider">Popular libraries</p>
                    <div className="grid grid-cols-2 gap-2">
                      {POPULAR_PACKAGES.map((pkg) => (
                        <button
                          key={pkg.name}
                          onClick={() => { setPackageInput(pkg.name); handleNpmLookup(pkg.name); }}
                          className="text-left p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all group"
                        >
                          <div className="font-medium text-sm group-hover:text-primary transition-colors">{pkg.label}</div>
                          <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{pkg.description}</div>
                          <div className="text-[10px] text-muted-foreground/70 mt-1 font-mono">{pkg.name}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Lookup result */}
                {lookupResult && (
                  <div className="rounded-lg border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20 p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-green-600" />
                          <span className="font-semibold text-sm">{lookupResult.name}</span>
                          <Badge variant="secondary" className="text-[10px]">v{lookupResult.version}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{lookupResult.description}</p>
                      </div>
                      {lookupResult.homepage && (
                        <a href={lookupResult.homepage} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground ml-2 flex-shrink-0">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Box className="w-3.5 h-3.5" />
                      <span>
                        {lookupResult.components.length > 0
                          ? `${lookupResult.components.length} components discovered`
                          : 'No pre-mapped components — you can add them manually after import'}
                      </span>
                    </div>
                    {lookupResult.components.length > 0 && (
                      <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                        {lookupResult.components.slice(0, 30).map((c) => (
                          <Badge key={c.name} variant="outline" className="text-[10px]">{c.name}</Badge>
                        ))}
                        {lookupResult.components.length > 30 && (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">+{lookupResult.components.length - 30} more</Badge>
                        )}
                      </div>
                    )}
                    <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={() => { setLookupResult(null); setPackageInput(''); }}>
                      <RefreshCw className="w-3 h-3 mr-1" /> Search different package
                    </Button>
                  </div>
                )}
              </TabsContent>

              {/* ── GitHub tab ── */}
              <TabsContent value="github" className="space-y-4 mt-0">
                <div>
                  <Label className="text-sm font-medium mb-2 block">GitHub Repository URL</Label>
                  <Input
                    placeholder="https://github.com/owner/repo"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Enter the full URL of the GitHub repository containing your component library.</p>
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Library Name</Label>
                  <Input
                    placeholder="e.g. Acme UI Kit"
                    value={githubName}
                    onChange={(e) => setGithubName(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Textarea
                    placeholder="Brief description of this component library..."
                    value={githubDesc}
                    onChange={(e) => setGithubDesc(e.target.value)}
                    className="resize-none h-20"
                  />
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">After importing:</p>
                  <p>• The repository link will be stored for reference.</p>
                  <p>• You can manually add individual components in the library view.</p>
                  <p>• Use the AI prototype builder to generate UIs referencing this library.</p>
                </div>
              </TabsContent>

              {/* ── Storybook tab ── */}
              <TabsContent value="storybook" className="space-y-4 mt-0">

                {/* Mode switcher */}
                <div className="flex rounded-lg border border-border overflow-hidden text-sm">
                  {(['url', 'github', 'manual'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => { setStorybookMode(m); setStorybookLookupResult(null); setStorybookLookupError(''); setStorybookIsProtected(false); }}
                      className={`flex-1 py-2 px-3 font-medium transition-colors ${storybookMode === m ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}
                    >
                      {m === 'url' ? '🔗 Storybook URL' : m === 'github' ? '🐙 GitHub Repo' : '📋 Paste JSON'}
                    </button>
                  ))}
                </div>

                {/* ── URL mode ── */}
                {storybookMode === 'url' && (
                  <>
                    <div>
                      <Label className="text-sm font-medium mb-1.5 block">Storybook / Chromatic URL</Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="https://develop--abc123.chromatic.com  or  https://storybook.yoursite.com"
                          value={storybookUrl}
                          onChange={(e) => { setStorybookUrl(e.target.value); setStorybookLookupResult(null); setStorybookLookupError(''); }}
                          onKeyDown={(e) => e.key === 'Enter' && handleStorybookLookup()}
                          className="flex-1 font-mono text-sm"
                        />
                        <Button onClick={handleStorybookLookup} disabled={!storybookUrl.trim() || isStorybookLooking} variant="secondary">
                          {isStorybookLooking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Works for public Storybook deployments. Protected Chromatic builds need GitHub or Paste JSON.</p>
                    </div>

                    {/* Token field */}
                    <div className={`rounded-lg border p-3 space-y-2 transition-colors ${storybookIsProtected ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/20' : 'border-border bg-muted/20'}`}>
                      <Label className="text-sm font-medium flex items-center gap-2">
                        Auth Token
                        <span className="text-muted-foreground font-normal text-xs">(optional)</span>
                        {storybookIsProtected && <Badge variant="outline" className="text-[10px] border-amber-400 text-amber-600">Won't work — use GitHub tab</Badge>}
                      </Label>
                      <Input
                        placeholder="Bearer token for private Storybook instances..."
                        value={storybookToken}
                        onChange={(e) => { setStorybookToken(e.target.value); setStorybookLookupError(''); }}
                        type="password"
                        className="font-mono text-sm"
                      />
                    </div>
                  </>
                )}

                {/* ── GitHub mode ── */}
                {storybookMode === 'github' && (
                  <>
                    <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20 p-3 text-xs text-blue-700 dark:text-blue-300">
                      <p className="font-medium mb-1">✅ Best for protected Chromatic builds</p>
                      <p>We'll scan your GitHub repo for <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">*.stories.tsx</code> files and extract all component names automatically — no auth token needed for the Chromatic URL itself.</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium mb-1.5 block">GitHub Repository URL</Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="https://github.com/owner/repo"
                          value={storybookGithubUrl}
                          onChange={(e) => { setStorybookGithubUrl(e.target.value); setStorybookLookupResult(null); setStorybookLookupError(''); }}
                          onKeyDown={(e) => e.key === 'Enter' && handleStorybookLookup()}
                          className="flex-1 font-mono text-sm"
                        />
                        <Button onClick={handleStorybookLookup} disabled={!storybookGithubUrl.trim() || isStorybookLooking} variant="secondary">
                          {isStorybookLooking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium mb-1.5 block">
                        GitHub Token <span className="text-muted-foreground font-normal">(optional — required for private repos)</span>
                      </Label>
                      <Input
                        placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                        value={storybookGithubToken}
                        onChange={(e) => setStorybookGithubToken(e.target.value)}
                        type="password"
                        className="font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Generate at: <span className="font-mono">github.com → Settings → Developer settings → Personal access tokens</span></p>
                    </div>
                    {/* Chromatic URL to store */}
                    <div>
                      <Label className="text-sm font-medium mb-1.5 block">Chromatic/Storybook URL <span className="text-muted-foreground font-normal">(optional — for reference)</span></Label>
                      <Input
                        placeholder="https://develop--abc123.chromatic.com"
                        value={storybookUrl}
                        onChange={(e) => setStorybookUrl(e.target.value)}
                        className="font-mono text-sm"
                      />
                    </div>
                  </>
                )}

                {/* ── Manual JSON mode ── */}
                {storybookMode === 'manual' && (
                  <>
                    <div className="rounded-lg border border-purple-200 bg-purple-50 dark:border-purple-900 dark:bg-purple-950/20 p-3 text-xs text-purple-700 dark:text-purple-300 space-y-1">
                      <p className="font-medium">How to get your stories.json:</p>
                      <p>1. Open your Chromatic/Storybook in a browser while logged in</p>
                      <p>2. Visit <code className="bg-purple-100 dark:bg-purple-900 px-1 rounded">/index.json</code> or <code className="bg-purple-100 dark:bg-purple-900 px-1 rounded">/stories.json</code> in the address bar</p>
                      <p>3. Copy all the JSON and paste it below</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium mb-1.5 block">Paste stories.json content</Label>
                      <Textarea
                        placeholder={'{\n  "v": 4,\n  "entries": {\n    "button--primary": {\n      "id": "button--primary",\n      "title": "Components/Button",\n      "name": "Primary"\n    }\n  }\n}'}
                        value={storybookManualJson}
                        onChange={(e) => { setStorybookManualJson(e.target.value); setStorybookLookupResult(null); setStorybookLookupError(''); }}
                        className="resize-none h-40 font-mono text-xs"
                      />
                    </div>
                    <Button
                      onClick={handleStorybookLookup}
                      disabled={!storybookManualJson.trim() || isStorybookLooking}
                      variant="secondary"
                      className="w-full"
                    >
                      {isStorybookLooking ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                      Parse Components from JSON
                    </Button>
                  </>
                )}

                {/* Error */}
                {storybookLookupError && (
                  <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                    <div className="flex-1 space-y-2">
                      <p className="text-sm text-destructive">{storybookLookupError}</p>
                      {storybookIsProtected && (
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => { setStorybookMode('github'); setStorybookLookupError(''); setStorybookIsProtected(false); }}>
                            🐙 Switch to GitHub
                          </Button>
                          <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => { setStorybookMode('manual'); setStorybookLookupError(''); setStorybookIsProtected(false); }}>
                            📋 Paste JSON instead
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Discovery result */}
                {storybookLookupResult && (
                  <div className="rounded-lg border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20 p-4 space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Check className="w-4 h-4 text-green-600" />
                      <span className="font-semibold text-sm">{storybookLookupResult.componentCount} components discovered</span>
                      <Badge variant="secondary" className="text-[10px]">{storybookLookupResult.storyCount} stories</Badge>
                      {storybookLookupResult.isChromatic && <Badge variant="outline" className="text-[10px]">Chromatic</Badge>}
                      <Badge variant="outline" className="text-[10px]">
                        {storybookMode === 'url' ? 'Live URL' : storybookMode === 'github' ? 'GitHub Source' : 'Manual JSON'}
                      </Badge>
                    </div>
                    <div className="max-h-36 overflow-y-auto space-y-1.5">
                      {Array.from(new Set(storybookLookupResult.components.map(c => c.category))).map(cat => (
                        <div key={cat}>
                          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">{cat}</p>
                          <div className="flex flex-wrap gap-1">
                            {storybookLookupResult.components.filter(c => c.category === cat).map(c => (
                              <Badge key={c.name} variant="outline" className="text-[10px]">
                                {c.name}{c.stories.length > 0 && <span className="ml-1 text-muted-foreground">·{c.stories.length}</span>}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={() => setStorybookLookupResult(null)}>
                      <RefreshCw className="w-3 h-3 mr-1" /> Fetch again
                    </Button>
                  </div>
                )}

                {/* Library name + desc */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Library Name</Label>
                  <Input
                    placeholder="e.g. Toddle Design System"
                    value={storybookName}
                    onChange={(e) => setStorybookName(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Textarea
                    placeholder="Brief description of this component library..."
                    value={storybookDesc}
                    onChange={(e) => setStorybookDesc(e.target.value)}
                    className="resize-none h-16"
                  />
                </div>
              </TabsContent>

              {/* ── Manual tab ── */}
              <TabsContent value="manual" className="space-y-4 mt-0">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Library Name</Label>
                  <Input
                    placeholder="e.g. My Custom Components"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Textarea
                    placeholder="Brief description of this component library..."
                    value={manualDesc}
                    onChange={(e) => setManualDesc(e.target.value)}
                    className="resize-none h-24"
                  />
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">Manual library:</p>
                  <p>• Create a blank library and paste in your component code.</p>
                  <p>• Ideal for private or proprietary component libraries.</p>
                  <p>• Each component gets a live Sandpack preview.</p>
                </div>
              </TabsContent>
            </Tabs>
          )}

          {/* ── Importing step ── */}
          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
              <div className="text-center">
                <p className="font-medium">Importing library...</p>
                <p className="text-sm text-muted-foreground mt-1">{importProgress}</p>
              </div>
            </div>
          )}

          {/* ── Done step ── */}
          {step === 'done' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-950/30 flex items-center justify-center">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-lg">Library imported!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Your component library is ready to use in prototypes.
                </p>
              </div>
              <Button onClick={() => handleClose(false)}>
                View Library <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}
        </div>

        {(step === 'source') && (
          <DialogFooter className="px-6 py-4 border-t border-border bg-muted/20">
            <Button variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
            <Button onClick={handleImport} disabled={!canProceed()}>
              Import Library <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Helper: generate a stub component file for known npm components ──────────
function generateComponentStub(componentName: string, packageName: string, version?: string): string {
  return `// ${componentName} from ${packageName}${version ? ` v${version}` : ''}
// Import this component in your project:
// import { ${componentName} } from '${packageName}';

/**
 * ${componentName}
 * Part of the ${packageName} component library.
 *
 * Usage:
 * import { ${componentName} } from '${packageName}';
 *
 * <${componentName} />
 */
export { ${componentName} } from '${packageName}';
`;
}

function generateExampleUsage(componentName: string, packageName: string): string {
  return `import { ${componentName} } from '${packageName}';

export default function App() {
  return (
    <div style={{ padding: 40 }}>
      <${componentName} />
    </div>
  );
}
`;
}

function generateStorybookComponentStub(componentName: string, storybookUrl: string, stories: string[]): string {
  const storyList = stories.length > 0
    ? stories.map(s => `//   - ${s}`).join('\n')
    : '//   (no stories found)';
  return `// ${componentName} — imported from Storybook
// Source: ${storybookUrl}
//
// Available stories:
${storyList}
//
// This component is managed via your Storybook instance.
// Preview individual stories by visiting:
// ${storybookUrl}/?path=/story/${componentName.toLowerCase()}--${(stories[0] || 'default').toLowerCase().replace(/\s+/g, '-')}

/**
 * ${componentName}
 * 
 * To use this component, import it from your design system package.
 * The source of truth lives in your Storybook at:
 * ${storybookUrl}
 */
export default function ${componentName}(props: Record<string, unknown>) {
  return null; // Replace with actual component import from your design system
}
`;
}

function generateStorybookExampleUsage(componentName: string, storybookUrl: string, stories: string[]): string {
  const firstStory = stories[0] || 'Default';
  return `// ${componentName} — ${firstStory} story
// View live at: ${storybookUrl}/?path=/story/${componentName.toLowerCase()}--${firstStory.toLowerCase().replace(/\s+/g, '-')}

import ${componentName} from './${componentName}';

export default function App() {
  return (
    <div style={{ padding: 40 }}>
      {/* ${componentName} - ${firstStory} */}
      <${componentName} />
    </div>
  );
}
`;
}
