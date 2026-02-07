'use client';

import { useParams, useRouter } from 'next/navigation';
import { useProject, useUpdateProject, useDeleteProject } from '@/lib/hooks/use-projects';
import { useNotes, useDeleteNote, useCreateNote } from '@/lib/hooks/use-notes';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FileText, Trash2, MoreVertical, Star, Pencil, MoreHorizontal, Plus } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function ProjectSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const { currentWorkspace } = useWorkspaceStore();
  const { currentUser } = useAuthStore();
  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: prds = [], isLoading: prdsLoading } = useNotes({
    projectId,
    workspaceId: currentWorkspace?.id
  });
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const deleteNote = useDeleteNote();
  const createNote = useCreateNote();

  const [name, setName] = useState('');
  const [instructions, setInstructions] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  // Initialize form with project data
  useEffect(() => {
    if (project) {
      setName(project.name);
      setInstructions(project.instructions || '');
    }
  }, [project]);

  // Track changes
  useEffect(() => {
    if (project) {
      const nameChanged = name !== project.name;
      const instructionsChanged = instructions !== (project.instructions || '');
      setHasChanges(nameChanged || instructionsChanged);
    }
  }, [name, instructions, project]);

  const handleSave = async () => {
    if (!projectId || !name.trim()) return;

    setIsSaving(true);
    try {
      await updateProject.mutateAsync({
        id: projectId,
        data: {
          name: name.trim(),
          instructions: instructions.trim() || undefined,
        },
      });
      toast.success('Project settings saved');
      setHasChanges(false);
    } catch (error) {
      toast.error('Failed to save project settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProject = async () => {
    try {
      await deleteProject.mutateAsync(projectId);
      toast.success('Project deleted');
      router.push('/notes');
    } catch (error) {
      toast.error('Failed to delete project');
    }
  };

  const handleRename = async () => {
    if (!renameValue.trim()) return;
    try {
      await updateProject.mutateAsync({
        id: projectId,
        data: { name: renameValue.trim() },
      });
      setName(renameValue.trim());
      toast.success('Project renamed');
      setShowRenameDialog(false);
    } catch (error) {
      toast.error('Failed to rename project');
    }
  };

  const openRenameDialog = () => {
    setRenameValue(name || project?.name || '');
    setShowRenameDialog(true);
  };

  const handleDeletePRD = async (prdId: string, prdTitle: string) => {
    try {
      await deleteNote.mutateAsync(prdId);
      toast.success(`"${prdTitle}" deleted`);
    } catch (error) {
      toast.error('Failed to delete PRD');
    }
  };

  const handleCreatePRD = async () => {
    if (!currentUser || !currentWorkspace) {
      toast.error('Please select a workspace first');
      return;
    }

    try {
      const result = await createNote.mutateAsync({
        data: {
          title: 'Untitled PRD',
          content: JSON.stringify({
            type: 'doc',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Start writing your PRD here...' }]
              }
            ]
          }),
          tags: [],
          workspaceId: currentWorkspace.id,
          projectId: projectId, // Assign to current project
        },
        authorId: currentUser.id,
        authorName: currentUser.name,
        authorAvatar: currentUser.avatar,
      });

      if (result) {
        router.push(`/notes/${result.id}`);
        toast.success('PRD created successfully');
      }
    } catch (error) {
      toast.error('Failed to create PRD');
      console.error(error);
    }
  };

  if (projectLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-4 w-96 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h2 className="text-lg font-semibold">Project not found</h2>
          <p className="text-muted-foreground mt-1">The project you're looking for doesn't exist.</p>
          <Button asChild className="mt-4">
            <Link href="/notes">Go back</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <div className="max-w-[1280px] mx-auto px-8 py-6 grid grid-cols-12 gap-6 h-full">
          {/* Left Content Area */}
          <div className="col-span-7 flex flex-col gap-4 min-h-0">
            {/* Project Header */}
            <div className="space-y-3 mb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-2xl font-medium text-muted-foreground">{name || project.name}</h1>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {project.description || 'Help with technical documentation or PRD for a new architecture, platform we are trying to build.'}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={openRenameDialog}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setShowDeleteDialog(true)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Star className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* PRDs List */}
            <ScrollArea className="flex-1 min-h-0">
              <div className="space-y-1 pr-4">
                {prdsLoading ? (
                  <div className="animate-pulse space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 bg-muted rounded" />
                    ))}
                  </div>
                ) : prds.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No PRDs yet</p>
                    <p className="text-sm mb-4">Create your first PRD for this project</p>
                    <Button
                      onClick={handleCreatePRD}
                      className="gap-2"
                      disabled={createNote.isPending}
                    >
                      <Plus className="h-4 w-4" />
                      {createNote.isPending ? 'Creating...' : 'Create PRD'}
                    </Button>
                  </div>
                ) : (
                  <ul className="space-y-0">
                    {prds.map((prd, index) => (
                      <li key={prd.id}>
                        <div className="group flex items-center gap-2">
                          <Link
                            href={`/notes/${prd.id}`}
                            className="flex-1 block px-0 py-3 hover:bg-muted/30 transition-colors"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-medium text-foreground mb-1">
                                  {prd.title || 'Untitled'}
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                  Last message {format(new Date(prd.updatedAt), 'MMM d, yyyy')}
                                </p>
                              </div>
                            </div>
                          </Link>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleDeletePRD(prd.id, prd.title || 'Untitled')}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        {index < prds.length - 1 && <Separator />}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Right Sidebar */}
          <div className="col-span-5 pl-12">
            <div className="space-y-6">
              {/* Instructions Section */}
              <div className="rounded-2xl border bg-white shadow-sm">
                <div className="flex items-center justify-between px-6 pt-6 pb-4">
                  <h2 className="text-sm font-medium">Instructions</h2>
                </div>
                <Separator className="opacity-15" />
                <div className="px-6 py-6">
                  <Textarea
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="Add instructions to tailor Claude's responses."
                    className="min-h-[200px] resize-none border-0 bg-transparent focus-visible:ring-0 p-0 text-sm"
                    onBlur={() => {
                      if (hasChanges) {
                        handleSave();
                      }
                    }}
                  />
                </div>
              </div>

              {/* Files Section */}
              <div className="rounded-2xl border bg-white shadow-sm">
                <div className="flex items-center justify-between px-6 pt-6 pb-4">
                  <h2 className="text-sm font-medium">Files</h2>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <Separator className="opacity-15" />
                <div className="px-6 py-6">
                  <div className="text-sm text-muted-foreground text-center py-8">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No files yet</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Rename Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Project</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="rename-input" className="sr-only">Project name</Label>
            <Input
              id="rename-input"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="Project name"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRename();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={!renameValue.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{name || project.name}"? All PRDs in this project will be permanently deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProject}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
