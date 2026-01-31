'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, FolderPlus, Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateProject } from '@/lib/hooks/use-projects';
import { useCreateNote } from '@/lib/hooks/use-notes';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { toast } from 'sonner';

export function NotesEmptyState() {
    const router = useRouter();
    const { currentUser } = useAuthStore();
    const { currentWorkspace } = useWorkspaceStore();
    const createProject = useCreateProject();
    const createNote = useCreateNote();

    const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
    const [projectName, setProjectName] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const handleCreatePRD = async () => {
        if (!currentUser || !currentWorkspace) {
            toast.error('Please select a workspace first');
            return;
        }

        setIsCreating(true);
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
        } finally {
            setIsCreating(false);
        }
    };

    const handleCreateProject = async () => {
        if (!projectName.trim() || !currentWorkspace) {
            toast.error('Please enter a project name');
            return;
        }

        setIsCreating(true);
        try {
            await createProject.mutateAsync({
                name: projectName.trim(),
                workspaceId: currentWorkspace.id,
            });

            toast.success('Project created successfully');
            setIsProjectDialogOpen(false);
            setProjectName('');
        } catch (error) {
            toast.error('Failed to create project');
            console.error(error);
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center py-20 px-4">
            {/* Illustration */}
            <div className="mb-8 relative">
                <div className="h-32 w-32 rounded-3xl bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                    <FileText className="h-16 w-16 text-blue-500" />
                </div>
                <div className="absolute -bottom-2 -right-2 h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
                    <Sparkles className="h-6 w-6 text-white" />
                </div>
            </div>

            {/* Text */}
            <h2 className="text-2xl font-semibold text-center mb-2">
                No PRDs yet
            </h2>
            <p className="text-muted-foreground text-center max-w-md mb-8">
                Create your first Product Requirements Document (PRD) or organize your work by creating a project first.
            </p>

            {/* Action Buttons */}
            <div className="flex items-center gap-4">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button size="lg" className="gap-2 bg-black hover:bg-black/90">
                            <Plus className="h-5 w-5" />
                            Create
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center" className="w-48">
                        <DropdownMenuItem
                            onClick={handleCreatePRD}
                            className="gap-2 cursor-pointer"
                            disabled={isCreating}
                        >
                            <FileText className="h-4 w-4" />
                            <span>New PRD</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => setIsProjectDialogOpen(true)}
                            className="gap-2 cursor-pointer"
                        >
                            <FolderPlus className="h-4 w-4" />
                            <span>New Project</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Create Project Dialog */}
            <Dialog open={isProjectDialogOpen} onOpenChange={setIsProjectDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New Project</DialogTitle>
                        <DialogDescription>
                            Projects help you organize related PRDs together.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="project-name">Project Name</Label>
                            <Input
                                id="project-name"
                                placeholder="Enter project name"
                                value={projectName}
                                onChange={(e) => setProjectName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !isCreating) {
                                        handleCreateProject();
                                    }
                                }}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsProjectDialogOpen(false)}
                            disabled={isCreating}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreateProject}
                            disabled={isCreating || !projectName.trim()}
                        >
                            {isCreating ? 'Creating...' : 'Create Project'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
