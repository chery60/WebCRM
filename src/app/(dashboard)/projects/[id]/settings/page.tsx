'use client';

import { useParams, useRouter } from 'next/navigation';
import { useProject, useUpdateProject, useDeleteProject } from '@/lib/hooks/use-projects';
import { useNotes, useDeleteNote } from '@/lib/hooks/use-notes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { ArrowLeft, FileText, Trash2, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function ProjectSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: prds = [], isLoading: prdsLoading } = useNotes({ projectId });
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const deleteNote = useDeleteNote();

  const [name, setName] = useState('');
  const [instructions, setInstructions] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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

  const handleDeletePRD = async (prdId: string, prdTitle: string) => {
    try {
      await deleteNote.mutateAsync(prdId);
      toast.success(`"${prdTitle}" deleted`);
    } catch (error) {
      toast.error('Failed to delete PRD');
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
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/notes">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">Project Settings</h1>
          <p className="text-muted-foreground text-sm">Manage your project configuration and PRDs</p>
        </div>
        {hasChanges && (
          <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        )}
      </div>

      <div className="space-y-6">
        {/* Project Details */}
        <Card>
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
            <CardDescription>Basic information about your project</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter project name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="instructions">
                Instructions <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Textarea
                id="instructions"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Add instructions for AI when generating PRDs in this project..."
                className="min-h-[120px] resize-none"
              />
              <p className="text-xs text-muted-foreground">
                These instructions will be used by AI when generating or improving PRDs in this project.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* PRDs List */}
        <Card>
          <CardHeader>
            <CardTitle>PRDs</CardTitle>
            <CardDescription>
              {prds.length === 0
                ? 'No PRDs in this project yet'
                : `${prds.length} PRD${prds.length === 1 ? '' : 's'} in this project`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {prdsLoading ? (
              <div className="animate-pulse space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-muted rounded" />
                ))}
              </div>
            ) : prds.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No PRDs yet</p>
                <p className="text-sm">Create your first PRD using the sidebar</p>
              </div>
            ) : (
              <div className="space-y-2">
                {prds.map((prd) => (
                  <div
                    key={prd.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <Link
                          href={`/notes/${prd.id}`}
                          className="font-medium hover:underline truncate block"
                        >
                          {prd.title || 'Untitled'}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          Updated {format(new Date(prd.updatedAt), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/notes/${prd.id}`}>
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete PRD</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{prd.title || 'Untitled'}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeletePRD(prd.id, prd.title || 'Untitled')}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>Irreversible actions for this project</CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">Delete Project</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Project</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{project.name}"? All PRDs in this project will be permanently deleted. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteProject}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete Project
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
