'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Folder } from 'lucide-react';
import { toast } from 'sonner';
import { useCreateProject } from '@/lib/hooks/use-projects';
import type { Project } from '@/types';

interface CreateProjectDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onProjectCreated?: (project: Project) => void;
}

export function CreateProjectDialog({
    open,
    onOpenChange,
    onProjectCreated,
}: CreateProjectDialogProps) {
    const createProject = useCreateProject();
    const [name, setName] = useState('');
    const [instructions, setInstructions] = useState('');

    const handleOpenChange = (newOpen: boolean) => {
        onOpenChange(newOpen);
        if (!newOpen) {
            setName('');
            setInstructions('');
        }
    };

    const handleCreateProject = async () => {
        if (!name.trim()) return;

        try {
            const newProject = await createProject.mutateAsync({
                name: name.trim(),
                instructions: instructions.trim() || undefined,
            });

            toast.success('Project created');

            if (onProjectCreated) {
                onProjectCreated(newProject as Project);
            }

            handleOpenChange(false);
        } catch (error) {
            toast.error('Failed to create project');
            console.error(error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent
                className="!w-[680px] !h-[560px] !max-w-none !p-0"
                style={{
                    backgroundColor: 'rgb(248, 248, 247)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '20px',
                    color: 'rgb(52, 50, 45)',
                    fontSize: '16px',
                    lineHeight: '24px',
                    fontFamily: 'var(--font-sans)',
                }}
            >
                <div className="flex flex-col h-full p-6">
                    <DialogHeader className="flex flex-col items-center text-center pb-4 flex-shrink-0">
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl border bg-muted/50">
                            <Folder className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <DialogTitle className="text-xl" style={{ color: 'rgb(52, 50, 45)' }}>Create project</DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 space-y-4 py-2 overflow-y-auto">
                        {/* Project Name */}
                        <div className="space-y-2">
                            <Label htmlFor="projectName" className="text-sm font-medium" style={{ color: 'rgb(52, 50, 45)' }}>
                                Project name
                            </Label>
                            <Input
                                id="projectName"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Enter the name"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleCreateProject();
                                    }
                                }}
                                style={{
                                    fontSize: '16px',
                                    lineHeight: '24px',
                                    color: 'rgb(52, 50, 45)',
                                }}
                            />
                        </div>

                        {/* Instructions */}
                        <div className="space-y-2">
                            <Label htmlFor="projectInstructions" className="text-sm font-medium" style={{ color: 'rgb(52, 50, 45)' }}>
                                Instructions <span className="text-muted-foreground font-normal">(optional)</span>
                            </Label>
                            <Textarea
                                id="projectInstructions"
                                value={instructions}
                                onChange={(e) => setInstructions(e.target.value)}
                                placeholder='e.g. "Focus on Python best practices", "Maintain a professional tone", or "Always provide sources for important conclusions".'
                                className="min-h-[120px] resize-none bg-muted/30"
                                style={{
                                    fontSize: '16px',
                                    lineHeight: '24px',
                                    color: 'rgb(52, 50, 45)',
                                }}
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-2 flex-shrink-0 pt-4">
                        <Button
                            variant="outline"
                            onClick={() => handleOpenChange(false)}
                            className="flex-1 sm:flex-none"
                            style={{
                                fontSize: '16px',
                                lineHeight: '24px',
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreateProject}
                            disabled={!name.trim()}
                            className="flex-1 sm:flex-none"
                            style={{
                                fontSize: '16px',
                                lineHeight: '24px',
                            }}
                        >
                            Create
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
}
