'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import {
    Calendar as CalendarIcon,
    User,
    Target,
    Flag,
    CircleDot,
    FolderOpen,
    Plus
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Note, NOTE_STATUSES, NOTE_PRIORITIES, NoteStatus, NotePriority } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useProjects, useCreateProject } from '@/lib/hooks/use-projects';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { CreateProjectDialog } from '@/components/projects/create-project-dialog';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface NoteMetadataProps {
    note: Note;
    onUpdate: (data: Partial<Note>) => void;
    className?: string;
}

export function NoteMetadata({ note, onUpdate, className }: NoteMetadataProps) {
    // Project state
    const { data: projects = [] } = useProjects();
    const createProject = useCreateProject();
    const [showCreateProjectDialog, setShowCreateProjectDialog] = useState(false);
    // Handle project creation
    const handleCreateProject = (project: any) => {
        onUpdate({ projectId: project.id });
    };

    const getStatusColor = (status?: string) => {
        return NOTE_STATUSES.find(s => s.value === status)?.color || 'bg-gray-500';
    };

    const getPriorityColor = (priority?: string) => {
        return NOTE_PRIORITIES.find(p => p.value === priority)?.color || 'bg-gray-400';
    };

    return (
        <div className={cn('grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-y-6 gap-x-8 py-4', className)}>
            {/* 1. Status */}
            <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                    <CircleDot className="h-3.5 w-3.5" />
                    <span>Status</span>
                </div>
                <Select
                    value={note.status || 'draft'}
                    onValueChange={(val) => onUpdate({ status: val as NoteStatus })}
                >
                    <SelectTrigger className="h-8 px-2 border-0 bg-transparent hover:bg-muted/50 focus:ring-0 text-sm shadow-none p-0 w-full justify-start gap-2">
                        <div className={cn("h-2 w-2 rounded-full", getStatusColor(note.status))} />
                        <SelectValue placeholder="Set status" />
                    </SelectTrigger>
                    <SelectContent>
                        {NOTE_STATUSES.map((status) => (
                            <SelectItem key={status.value} value={status.value}>
                                <div className="flex items-center gap-2">
                                    <div className={cn("h-2 w-2 rounded-full", status.color)} />
                                    {status.label}
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* 2. Priority */}
            <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                    <Flag className="h-3.5 w-3.5" />
                    <span>Priority</span>
                </div>
                <Select
                    value={note.priority || 'medium'}
                    onValueChange={(val) => onUpdate({ priority: val as NotePriority })}
                >
                    <SelectTrigger className="h-8 px-2 border-0 bg-transparent hover:bg-muted/50 focus:ring-0 text-sm shadow-none p-0 w-full justify-start gap-2">
                        <SelectValue placeholder="Set priority" />
                    </SelectTrigger>
                    <SelectContent>
                        {NOTE_PRIORITIES.map((priority) => (
                            <SelectItem key={priority.value} value={priority.value}>
                                <div className="flex items-center gap-2">
                                    <div className={cn("h-2 w-2 rounded-full", priority.color)} />
                                    {priority.label}
                                </div>
                            </SelectItem>
                        ))}
                        <SelectItem value="none" className="text-muted-foreground">Not set</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* 3. Target Release */}
            <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                    <Target className="h-3.5 w-3.5" />
                    <span>Target Release</span>
                </div>
                <Input
                    value={note.targetRelease || ''}
                    onChange={(e) => onUpdate({ targetRelease: e.target.value })}
                    placeholder="e.g., Q1 2026"
                    className="h-8 px-2 border border-input/50 bg-transparent hover:bg-muted/50 focus-visible:ring-0 text-sm shadow-none w-full"
                />
            </div>

            {/* 4. Due Date */}
            <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    <span>Due Date</span>
                </div>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            className={cn(
                                "h-8 px-2 border border-input/50 bg-transparent hover:bg-muted/50 justify-start text-left font-normal shadow-none w-full text-sm",
                                !note.dueDate && "text-muted-foreground"
                            )}
                        >
                            {note.dueDate ? format(new Date(note.dueDate), "MMM d, yyyy") : <span>Set date</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={note.dueDate ? new Date(note.dueDate) : undefined}
                            onSelect={(date) => onUpdate({ dueDate: date })}
                            initialFocus
                        />
                    </PopoverContent>
                </Popover>
            </div>

            {/* 5. Owner */}
            <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                    <User className="h-3.5 w-3.5" />
                    <span>Owner</span>
                </div>
                <div className="flex items-center gap-2 h-8 px-2 border border-input/50 rounded-md bg-transparent">
                    <Avatar className="h-5 w-5">
                        <AvatarImage src={note.authorAvatar} />
                        <AvatarFallback>{note.authorName?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm truncate">{note.authorName}</span>
                </div>
            </div>

            {/* 6. Project */}
            <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                    <FolderOpen className="h-3.5 w-3.5" />
                    <span>Project</span>
                </div>
                <Select
                    value={note.projectId || 'none'}
                    onValueChange={(val) => {
                        if (val === 'create-new') {
                            setShowCreateProjectDialog(true);
                        } else {
                            onUpdate({ projectId: val === 'none' ? undefined : val });
                        }
                    }}
                >
                    <SelectTrigger className="h-8 px-2 border border-input/50 bg-transparent hover:bg-muted/50 focus:ring-0 text-sm shadow-none w-full justify-between">
                        <SelectValue placeholder="No Project" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">No Project</SelectItem>
                        {projects.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                                {p.name}
                            </SelectItem>
                        ))}
                        <SelectItem value="create-new" className="text-primary">
                            <span className="flex items-center gap-2">
                                <Plus className="h-3 w-3" />
                                Create New
                            </span>
                        </SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Create Project Dialog */}
            <CreateProjectDialog
                open={showCreateProjectDialog}
                onOpenChange={setShowCreateProjectDialog}
                onProjectCreated={handleCreateProject}
            />
        </div>
    );
}
