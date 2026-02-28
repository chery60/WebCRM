'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, LayoutDashboard, Search, Clock, Sparkles, Loader2, Trash2, ExternalLink, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { usePrototypes, useDeletePrototype, useCreatePrototype } from '@/lib/hooks/use-prototypes';
import { useComponentLibraries } from '@/lib/hooks/use-component-libraries';
import { toast } from 'sonner';
import type { Prototype, ComponentLibrary } from '@/types';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';

export default function PrototypesPage() {
  const [search, setSearch] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const { data: prototypes = [], isLoading } = usePrototypes();
  const { data: libraries = [] } = useComponentLibraries();
  const deletePrototype = useDeletePrototype();
  const createPrototype = useCreatePrototype();

  const libraryMap = new Map<string, ComponentLibrary>(
    libraries.map((lib) => [lib.id, lib])
  );

  const filtered = prototypes.filter((p: Prototype) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleNewPrototype = async () => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      const prototype = await createPrototype.mutateAsync({ name: 'Untitled Prototype' });
      router.push(`/prototypes/${prototype.id}`);
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('migration') || msg.includes('42P01') || msg.includes('not set up')) {
        toast.error('Database tables not ready. Please run migration 035_prototyping_schema.sql in Supabase.');
      } else if (msg.includes('No workspace')) {
        toast.error('No workspace selected. Please select a workspace first.');
      } else {
        toast.error('Failed to create prototype: ' + (msg || 'Unknown error'));
      }
      setIsCreating(false);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, proto: Prototype) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteTarget({ id: proto.id, name: proto.name });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deletePrototype.mutateAsync(deleteTarget.id);
      toast.success('Prototype deleted');
      setDeleteTarget(null);
    } catch {
      toast.error('Failed to delete prototype');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-border bg-background/95 backdrop-blur z-10 px-8 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Prototypes</h1>
            <p className="text-sm text-muted-foreground mt-1">
              AI-generated UI prototypes powered by your component libraries and PRDs.
            </p>
          </div>
          <Button onClick={handleNewPrototype} disabled={isCreating}>
            {isCreating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
            New Prototype
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto space-y-6">

          {/* Loading */}
          {isLoading ? (
            <div className="flex items-center justify-center py-32 text-muted-foreground gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading prototypes…</span>
            </div>
          ) : prototypes.length === 0 ? (
            /* ── Empty state: no prototypes yet ── */
            <div className="flex flex-col items-center justify-center py-32 text-center">
              <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-10 h-10 text-primary" />
              </div>
              <h3 className="font-semibold text-xl mb-2">No prototypes yet</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                Generate AI-powered UI prototypes from your PRDs, features, and tasks — using your own component library.
              </p>
              <Button size="lg" onClick={handleNewPrototype} disabled={isCreating}>
                {isCreating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />} New Prototype
              </Button>
            </div>
          ) : (
            <>
              {/* Search bar */}
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search prototypes..."
                  className="pl-9 w-full"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {/* Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((proto: Prototype) => {
                  const lib = proto.libraryId ? libraryMap.get(proto.libraryId) : null;
                  return (
                    <Link key={proto.id} href={`/prototypes/${proto.id}`} className="block group">
                      <div className="flex flex-col h-48 p-6 bg-card border border-border rounded-xl shadow-sm hover:shadow-md transition-all hover:border-primary/50 relative overflow-hidden">
                        {/* Decorative bg icon */}
                        <div className="absolute top-0 right-0 p-4 opacity-[0.06] group-hover:scale-110 transition-transform pointer-events-none">
                          <LayoutDashboard size={80} />
                        </div>

                        {/* Top row */}
                        <div className="flex items-start justify-between">
                          <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            <LayoutDashboard className="w-5 h-5" />
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={(e) => handleDeleteClick(e, proto)}
                              className="p-1.5 rounded-md hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground"
                              title="Delete prototype"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="mt-4 flex-1 min-w-0">
                          <h3 className="font-semibold text-base line-clamp-1">{proto.name}</h3>
                          {lib && (
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                              <LayoutDashboard className="w-3 h-3" />
                              {lib.name}
                            </p>
                          )}
                          {proto.chatHistory && Array.isArray(proto.chatHistory) && proto.chatHistory.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {proto.chatHistory.length} message{proto.chatHistory.length !== 1 ? 's' : ''}
                            </p>
                          )}
                        </div>

                        {/* Footer */}
                        <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(proto.updatedAt).toLocaleDateString()}
                          </span>
                          <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* No search results */}
              {filtered.length === 0 && search && (
                <div className="text-center py-16 text-muted-foreground">
                  <p className="text-sm">No prototypes match &ldquo;{search}&rdquo;</p>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* ── Delete Confirmation Modal ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <AlertDialogTitle className="text-left">Delete Prototype</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-left">
              Are you sure you want to delete{' '}
              <span className="font-semibold text-foreground">"{deleteTarget?.name}"</span>?
              <br />
              This action cannot be undone and will permanently remove the prototype and all its chat history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-2">
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting…
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Prototype
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
