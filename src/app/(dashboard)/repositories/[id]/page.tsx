'use client';

import { useState, use, useMemo } from 'react';
import { notFound } from 'next/navigation';
import { ArrowLeft, Box, Search, Loader2, Github, Package, BookOpen, ExternalLink, Plus, RefreshCw, Code2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sandpack } from '@codesandbox/sandpack-react';
import { useComponentLibrary, useLibraryComponents, useBulkInsertComponents } from '@/lib/hooks/use-component-libraries';
import type { LibraryComponent } from '@/types';
import { toast } from 'sonner';

// ── Component Detail Preview Dialog ─────────────────────────────────────────
function ComponentPreviewDialog({
  component,
  libraryName,
  packageName,
  open,
  onOpenChange,
}: {
  component: LibraryComponent | null;
  libraryName: string;
  packageName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!component) return null;

  const sandpackFiles: Record<string, string> = {
    '/App.js': component.exampleUsage || `import React from 'react';
export default function App() {
  return (
    <div style={{ padding: 40 }}>
      <h2 style={{ fontFamily: 'sans-serif', marginBottom: 16 }}>${component.name}</h2>
      <p style={{ fontFamily: 'sans-serif', color: '#6b7280' }}>
        This component is part of the <strong>${libraryName}</strong> library.
        ${packageName ? `Install with: <code>npm install ${packageName}</code>` : ''}
      </p>
    </div>
  );
}`,
    '/ComponentSource.js': component.codeContent,
  };

  const dependencies: Record<string, string> = {};
  if (packageName) dependencies[packageName] = 'latest';
  dependencies['lucide-react'] = '^0.263.1';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[82vh] flex flex-col p-0 overflow-hidden bg-[#151515] border-border">
        <DialogHeader className="px-5 py-3 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-white text-base font-semibold flex items-center gap-2">
              <Box className="w-4 h-4 text-primary" />
              {component.name}
              {component.category && (
                <Badge variant="secondary" className="text-[10px] ml-1">{component.category}</Badge>
              )}
            </DialogTitle>
            <div className="flex items-center gap-2 text-xs text-white/50">
              <Code2 className="w-3.5 h-3.5" />
              <span>{component.filePath}</span>
            </div>
          </div>
          {component.description && (
            <p className="text-white/60 text-sm mt-1">{component.description}</p>
          )}
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          <Sandpack
            template="react"
            theme="dark"
            files={sandpackFiles}
            options={{
              showNavigator: true,
              showTabs: true,
              editorHeight: '100%',
              editorWidthPercentage: 50,
              externalResources: ['https://cdn.tailwindcss.com'],
            }}
            customSetup={{ dependencies }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Component Card ─────────────────────────────────────────────────────────
function ComponentCard({
  component,
  onClick,
}: {
  component: LibraryComponent;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="group flex flex-col border border-border rounded-xl overflow-hidden cursor-pointer hover:shadow-md hover:border-primary/40 transition-all bg-card"
    >
      {/* Preview placeholder */}
      <div className="flex-1 min-h-[140px] flex flex-col items-center justify-center border-b border-border/50 p-5 bg-muted/20 group-hover:bg-primary/5 transition-colors">
        <Box className="w-9 h-9 mb-2 opacity-50 text-primary group-hover:scale-110 transition-transform" />
        <span className="text-xs text-muted-foreground font-mono">{component.filePath}</span>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="min-w-0">
          <span className="font-semibold text-sm truncate block">{component.name}</span>
          {component.description && (
            <span className="text-xs text-muted-foreground truncate block">{component.description}</span>
          )}
        </div>
        <Eye className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2" />
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function RepositoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data: library, isLoading: libraryLoading } = useComponentLibrary(id);
  const { data: components = [], isLoading: componentsLoading, refetch: refetchComponents } = useLibraryComponents(id);

  const [activeComponent, setActiveComponent] = useState<LibraryComponent | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const categories = useMemo(() => {
    const cats = Array.from(new Set(components.map((c) => c.category || 'General')));
    return cats.sort();
  }, [components]);

  const filtered = useMemo(() => {
    return components.filter((c) => {
      const matchesSearch =
        !search ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.category?.toLowerCase().includes(search.toLowerCase()) ||
        c.description?.toLowerCase().includes(search.toLowerCase());
      const matchesCategory =
        categoryFilter === 'all' || (c.category || 'General') === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [components, search, categoryFilter]);

  const grouped = useMemo(() => {
    return filtered.reduce<Record<string, LibraryComponent[]>>((acc, comp) => {
      const cat = comp.category || 'General';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(comp);
      return acc;
    }, {});
  }, [filtered]);

  if (libraryLoading) {
    return (
      <div className="flex items-center justify-center h-full mt-[100px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!library) return notFound();

  const sourceIcon =
    library.importSource === 'npm' ? <Package className="w-4 h-4" /> :
    library.importSource === 'github' ? <Github className="w-4 h-4" /> :
    library.importSource === 'storybook' ? <BookOpen className="w-4 h-4" /> :
    <Box className="w-4 h-4" />;

  const sourceUrl = library.packageName
    ? `https://www.npmjs.com/package/${library.packageName}`
    : library.repoUrl || library.storybookUrl;

  return (
    <div className="flex flex-col h-full bg-background mt-[100px] overflow-y-auto">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-border bg-background z-10 px-8 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-5">
            <Link href="/repositories">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <span className="text-sm text-muted-foreground">Repositories</span>
            <span className="text-muted-foreground">/</span>
            <span className="text-sm font-medium">{library.name}</span>
          </div>

          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-extrabold tracking-tight">{library.name}</h1>
                <Badge variant="outline" className="flex items-center gap-1 text-xs">
                  {sourceIcon}
                  {library.importSource === 'npm' ? 'npm package' :
                   library.importSource === 'github' ? 'GitHub' :
                   library.importSource === 'storybook' ? 'Storybook' : 'Manual'}
                </Badge>
              </div>
              {library.description && (
                <p className="text-muted-foreground max-w-2xl">{library.description}</p>
              )}
              <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                {library.packageName && (
                  <span className="font-mono bg-muted px-2 py-0.5 rounded text-xs">
                    npm install {library.packageName}
                    {library.packageVersion ? `@${library.packageVersion}` : ''}
                  </span>
                )}
                {sourceUrl && (
                  <a
                    href={sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> View source
                  </a>
                )}
                <span>{components.length} components</span>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetchComponents()}>
              <RefreshCw className="w-4 h-4 mr-2" /> Refresh
            </Button>
          </div>
        </div>
      </header>

      {/* Toolbar */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-8 py-3">
        <div className="max-w-6xl mx-auto flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="flex items-center gap-2 border border-border rounded-lg px-3 bg-background w-64">
            <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <Input
              placeholder="Search components..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-0 px-0 focus-visible:ring-0 bg-transparent h-8 text-sm"
            />
          </div>

          {/* Category filter */}
          {categories.length > 1 && (
            <Tabs value={categoryFilter} onValueChange={setCategoryFilter}>
              <TabsList className="h-8">
                <TabsTrigger value="all" className="text-xs h-6 px-3">All</TabsTrigger>
                {categories.map((cat) => (
                  <TabsTrigger key={cat} value={cat} className="text-xs h-6 px-3">{cat}</TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}

          <span className="ml-auto text-xs text-muted-foreground">
            {filtered.length} of {components.length} components
          </span>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 px-8 py-8">
        <div className="max-w-6xl mx-auto">
          {componentsLoading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {!componentsLoading && components.length === 0 && (
            <div className="text-center py-20 text-muted-foreground">
              <Box className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <h3 className="text-lg font-medium text-foreground mb-2">No components yet</h3>
              <p className="text-sm max-w-md mx-auto mb-6">
                {library.importSource === 'npm'
                  ? 'Components are automatically discovered for popular packages. This package may require manual component addition.'
                  : 'Add individual components to this library so the AI prototype builder can reference them.'}
              </p>
            </div>
          )}

          {!componentsLoading && components.length > 0 && filtered.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No components match your search</p>
              <p className="text-sm mt-1">Try a different search term or clear the filter.</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => { setSearch(''); setCategoryFilter('all'); }}>
                Clear filters
              </Button>
            </div>
          )}

          {/* Grouped component grid */}
          <div className="space-y-10">
            {Object.entries(grouped).map(([category, comps]) => (
              <section key={category}>
                <div className="flex items-center gap-3 mb-5">
                  <h2 className="text-xl font-bold tracking-tight">{category}</h2>
                  <Badge variant="secondary">{comps.length}</Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {comps.map((comp) => (
                    <ComponentCard
                      key={comp.id}
                      component={comp}
                      onClick={() => setActiveComponent(comp)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>

      {/* Component preview dialog */}
      <ComponentPreviewDialog
        component={activeComponent}
        libraryName={library.name}
        packageName={library.packageName}
        open={!!activeComponent}
        onOpenChange={(open) => { if (!open) setActiveComponent(null); }}
      />
    </div>
  );
}
