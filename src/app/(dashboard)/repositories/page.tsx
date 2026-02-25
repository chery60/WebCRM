'use client';

import { useState } from 'react';
import { Plus, Github, Box, FolderOpen, Package, BookOpen, Loader2, Trash2, MoreHorizontal, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { toast } from 'sonner';
import { ImportLibraryDialog } from '@/components/repositories/import-library-dialog';
import { useComponentLibraries, useDeleteComponentLibrary } from '@/lib/hooks/use-component-libraries';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import type { ComponentLibrary, LibraryImportSource } from '@/types';

function getSourceIcon(source: LibraryImportSource) {
  switch (source) {
    case 'npm': return <Package className="w-3 h-3 mr-1" />;
    case 'github': return <Github className="w-3 h-3 mr-1" />;
    case 'storybook': return <BookOpen className="w-3 h-3 mr-1" />;
    default: return <Box className="w-3 h-3 mr-1" />;
  }
}

function getSourceLabel(source: LibraryImportSource) {
  switch (source) {
    case 'npm': return 'npm';
    case 'github': return 'GitHub';
    case 'storybook': return 'Storybook';
    default: return 'Manual';
  }
}

function LibraryCard({ library, onDelete }: { library: ComponentLibrary; onDelete: (id: string) => void }) {
  const displayUrl = library.packageName || library.repoUrl || library.storybookUrl;

  return (
    <div className="group relative flex flex-col h-52 p-6 bg-card border border-border rounded-xl shadow-sm hover:shadow-md transition-all hover:border-primary/50 overflow-hidden">
      {/* Background icon */}
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
        <FolderOpen size={90} />
      </div>

      {/* Actions menu */}
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => e.preventDefault()}>
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={(e) => { e.preventDefault(); onDelete(library.id); }}
            >
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Link href={`/repositories/${library.id}`} className="flex flex-col h-full">
        <div className="flex items-start justify-between">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <Box className="w-5 h-5" />
          </div>
          <Badge variant="secondary" className="text-[10px] flex items-center">
            {getSourceIcon(library.importSource)}
            {getSourceLabel(library.importSource)}
          </Badge>
        </div>

        <div className="mt-3 flex-1 min-w-0">
          <h3 className="font-semibold text-base line-clamp-1">{library.name}</h3>
          {library.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{library.description}</p>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border/50">
          <span className="flex items-center truncate max-w-[60%]">
            {library.importSource === 'npm' && <Package className="w-3 h-3 mr-1 flex-shrink-0" />}
            {library.importSource === 'github' && <Github className="w-3 h-3 mr-1 flex-shrink-0" />}
            {library.importSource === 'storybook' && <BookOpen className="w-3 h-3 mr-1 flex-shrink-0" />}
            <span className="truncate">{displayUrl || 'No source URL'}</span>
          </span>
          <span className="flex-shrink-0 ml-2">
            {library.componentCount ?? 0} components
          </span>
        </div>
      </Link>
    </div>
  );
}

export default function RepositoriesPage() {
  const [showImport, setShowImport] = useState(false);
  const { currentWorkspace } = useWorkspaceStore();
  const { data: libraries = [], isLoading, isError, refetch } = useComponentLibraries();
  const deleteLibrary = useDeleteComponentLibrary();

  const handleDelete = async (id: string) => {
    const lib = libraries.find((l) => l.id === id);
    if (!lib) return;
    if (!confirm(`Delete "${lib.name}"? This will also delete all its components.`)) return;
    try {
      await deleteLibrary.mutateAsync(id);
      toast.success(`"${lib.name}" deleted`);
    } catch {
      toast.error('Failed to delete library');
    }
  };

  return (
    <div className="flex flex-col h-full bg-background mt-[100px]">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10 px-8 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Component Repositories</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Import and manage React component libraries for AI prototyping.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} title="Refresh">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button onClick={() => setShowImport(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Import Library
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* No workspace warning */}
          {!currentWorkspace && !isLoading && (
            <div className="rounded-xl border border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/20 p-5 flex items-start gap-3">
              <span className="text-yellow-600 text-lg mt-0.5">⚠️</span>
              <div>
                <p className="font-medium text-yellow-800 dark:text-yellow-300">No workspace selected</p>
                <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-0.5">
                  Please select or create a workspace to manage component libraries.
                </p>
              </div>
            </div>
          )}

          {/* Migration error banner */}
          {isError && (
            <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20 p-5 flex items-start gap-3">
              <span className="text-red-600 text-lg mt-0.5">🔧</span>
              <div className="flex-1">
                <p className="font-medium text-red-800 dark:text-red-300">Database migration required</p>
                <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                  The component library tables don&apos;t exist yet. Please run the migration in your Supabase SQL editor:
                </p>
                <code className="block mt-2 text-xs bg-red-100 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded px-3 py-2 font-mono text-red-800 dark:text-red-300">
                  supabase/migrations/035_prototyping_schema.sql
                </code>
                <button
                  onClick={() => refetch()}
                  className="mt-3 text-xs text-red-700 dark:text-red-400 underline hover:no-underline"
                >
                  Retry after running migration
                </button>
              </div>
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Grid */}
          {!isLoading && libraries.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {libraries.map((lib) => (
                <LibraryCard key={lib.id} library={lib} onDelete={handleDelete} />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !isError && libraries.length === 0 && (
            <div className="flex flex-col items-center justify-center py-28 text-muted-foreground">
              <Package className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <h3 className="text-lg font-medium text-foreground mb-2">No component libraries yet</h3>
              <p className="text-sm max-w-md mx-auto mb-6 text-center">
                Import a component library like shadcn/ui, Material UI, or Ant Design to start building AI-powered prototypes.
              </p>
              <Button onClick={() => setShowImport(true)}>
                <Plus className="w-4 h-4 mr-2" /> Import your first library
              </Button>
            </div>
          )}
        </div>
      </main>

      <ImportLibraryDialog
        open={showImport}
        onOpenChange={setShowImport}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
