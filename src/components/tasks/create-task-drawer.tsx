'use client';

import { useState } from 'react';
import { X, Plus, Trash2, Calendar, Image, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import type { TaskFormData, TaskStatus, TaskChecklist, TaskTab } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface CreateTaskDrawerProps {
    open: boolean;
    onClose: () => void;
    onCreate: (data: TaskFormData) => void;
    defaultStatus?: TaskStatus;
    users: { id: string; name: string; avatar?: string }[];
    availableLabels: string[];
    tabs?: TaskTab[];
    defaultProjectId?: string;
}

export function CreateTaskDrawer({
    open,
    onClose,
    onCreate,
    defaultStatus = 'planned',
    users = [],
    availableLabels = [],
    tabs = [],
    defaultProjectId,
}: CreateTaskDrawerProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [dueDate, setDueDate] = useState<Date | null>(null);
    const [labels, setLabels] = useState<string[]>([]);
    const [assignees, setAssignees] = useState<string[]>([]);
    const [projectId, setProjectId] = useState<string | undefined>(defaultProjectId);
    const [checklists, setChecklists] = useState<TaskChecklist[]>([]);
    const [openAssignee, setOpenAssignee] = useState(false);
    const [openLabel, setOpenLabel] = useState(false);
    const [newLabel, setNewLabel] = useState('');

    const maxDescriptionLength = 50;

    const handleAddChecklist = () => {
        setChecklists([
            ...checklists,
            {
                id: uuidv4(),
                name: 'New Checklist',
                items: [],
            },
        ]);
    };

    const handleDeleteChecklist = (checklistId: string) => {
        setChecklists(checklists.filter((c) => c.id !== checklistId));
    };

    const handleUpdateChecklistName = (checklistId: string, name: string) => {
        setChecklists(
            checklists.map((c) => (c.id === checklistId ? { ...c, name } : c))
        );
    };

    const handleAddItem = (checklistId: string) => {
        setChecklists(
            checklists.map((c) =>
                c.id === checklistId
                    ? {
                        ...c,
                        items: [
                            ...c.items,
                            { id: uuidv4(), text: '', completed: false },
                        ],
                    }
                    : c
            )
        );
    };

    const handleUpdateItem = (checklistId: string, itemId: string, text: string) => {
        setChecklists(
            checklists.map((c) =>
                c.id === checklistId
                    ? {
                        ...c,
                        items: c.items.map((item) =>
                            item.id === itemId ? { ...item, text } : item
                        ),
                    }
                    : c
            )
        );
    };

    const handleDeleteItem = (checklistId: string, itemId: string) => {
        setChecklists(
            checklists.map((c) =>
                c.id === checklistId
                    ? {
                        ...c,
                        items: c.items.filter((item) => item.id !== itemId),
                    }
                    : c
            )
        );
    };

    const handleSave = () => {
        // Filter out empty items
        const cleanChecklists = checklists.map(list => ({
            ...list,
            items: list.items.filter(item => item.text.trim())
        })).filter(list => list.items.length > 0 || list.name !== 'New Checklist');

        onCreate({
            title,
            description,
            status: defaultStatus,
            dueDate,
            labels,
            assignees,
            projectId,
            checklists: cleanChecklists,
        });

        // Reset form
        setTitle('');
        setDescription('');
        setDueDate(null);
        setLabels([]);
        setAssignees([]);
        setProjectId(defaultProjectId);
        setChecklists([]);
        onClose();
    };

    return (
        <Sheet open={open} onOpenChange={onClose}>
            <SheetContent className="w-[640px] sm:max-w-[640px] p-0 flex flex-col">
                {/* Header */}
                <SheetHeader className="px-6 py-4 border-b">
                    <SheetTitle className="text-lg font-medium">Create New Task</SheetTitle>
                </SheetHeader>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                    {/* Task Title */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Task Title</label>
                        <Input
                            placeholder="Enter task name here"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>

                    {/* Add Members, Add Labels, Due Date, Project */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Add Members</label>
                            <Popover open={openAssignee} onOpenChange={setOpenAssignee}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className="w-full justify-start h-auto min-h-10 px-3 py-2 text-left font-normal"
                                    >
                                        {assignees.length > 0 ? (
                                            <div className="flex flex-wrap gap-1">
                                                {assignees.map((assigneeId) => {
                                                    const user = users.find((u) => u.id === assigneeId);
                                                    return (
                                                        <Avatar key={assigneeId} className="h-6 w-6">
                                                            <AvatarImage src={user?.avatar} />
                                                            <AvatarFallback className="text-[10px]">
                                                                {user?.name?.slice(0, 2).toUpperCase()}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-dashed">
                                                <Plus className="h-3 w-3" />
                                            </div>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="p-0" align="start">
                                    <Command>
                                        <CommandInput placeholder="Search members..." />
                                        <CommandList>
                                            <CommandEmpty>No member found.</CommandEmpty>
                                            <CommandGroup>
                                                {users.map((user) => (
                                                    <CommandItem
                                                        key={user.id}
                                                        value={user.name}
                                                        onSelect={() => {
                                                            setAssignees((prev) =>
                                                                prev.includes(user.id)
                                                                    ? prev.filter((id) => id !== user.id)
                                                                    : [...prev, user.id]
                                                            );
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                assignees.includes(user.id) ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                        <Avatar className="mr-2 h-6 w-6">
                                                            <AvatarImage src={user.avatar} />
                                                            <AvatarFallback>{user.name.slice(0, 2)}</AvatarFallback>
                                                        </Avatar>
                                                        {user.name}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Add Labels</label>
                            <Popover open={openLabel} onOpenChange={setOpenLabel}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className="w-full justify-start h-auto min-h-10 px-3 py-2 text-left font-normal"
                                    >
                                        {labels.length > 0 ? (
                                            <div className="flex flex-wrap gap-1">
                                                {labels.map((label) => (
                                                    <Badge key={label} variant="secondary" className="px-1 py-0 text-[10px]">
                                                        {label}
                                                    </Badge>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-dashed">
                                                <Plus className="h-3 w-3" />
                                            </div>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="p-0" align="start">
                                    <Command>
                                        <CommandInput
                                            placeholder="Search labels..."
                                            value={newLabel}
                                            onValueChange={setNewLabel}
                                        />
                                        <CommandList>
                                            <CommandEmpty>
                                                <div className="p-2">
                                                    <p className="text-sm text-muted-foreground mb-2">No label found.</p>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="w-full h-7 text-xs"
                                                        onClick={() => {
                                                            if (newLabel.trim()) {
                                                                setLabels([...labels, newLabel.trim()]);
                                                                setNewLabel('');
                                                            }
                                                        }}
                                                    >
                                                        Create "{newLabel}"
                                                    </Button>
                                                </div>
                                            </CommandEmpty>
                                            <CommandGroup>
                                                {availableLabels.map((label) => (
                                                    <CommandItem
                                                        key={label}
                                                        value={label}
                                                        onSelect={() => {
                                                            setLabels((prev) =>
                                                                prev.includes(label)
                                                                    ? prev.filter((l) => l !== label)
                                                                    : [...prev, label]
                                                            );
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                labels.includes(label) ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                        {label}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Due Date</label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className="w-full justify-start h-10 text-left font-normal"
                                    >
                                        <Calendar className="mr-2 h-4 w-4" />
                                        {dueDate ? format(dueDate, 'dd MMM yyyy') : 'Select Date'}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <CalendarComponent
                                        mode="single"
                                        selected={dueDate ?? undefined}
                                        onSelect={(date) => setDueDate(date ?? null)}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Project</label>
                            <Select
                                value={projectId || 'none'}
                                onValueChange={(value) => setProjectId(value === 'none' ? undefined : value)}
                            >
                                <SelectTrigger className="w-full h-10">
                                    <SelectValue placeholder="Select project" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No Project</SelectItem>
                                    {tabs.map((tab) => (
                                        <SelectItem key={tab.id} value={tab.id}>
                                            {tab.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Description</label>
                        <div className="relative">
                            <Textarea
                                placeholder="Enter your description here"
                                value={description}
                                onChange={(e) => setDescription(e.target.value.slice(0, maxDescriptionLength))}
                                className="min-h-[100px] resize-none"
                            />
                            <span className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                                {description.length}/{maxDescriptionLength}
                            </span>
                        </div>
                    </div>

                    {/* Task Checklists */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium">Task Checklist</label>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8"
                                onClick={handleAddChecklist}
                            >
                                <Plus className="mr-1 h-3 w-3" />
                                Add Checklist
                            </Button>
                        </div>

                        {checklists.map((checklist) => (
                            <div key={checklist.id} className="space-y-3 p-4 border rounded-lg bg-card/50">
                                <div className="flex items-center gap-2">
                                    <CheckSquare className="h-4 w-4 text-muted-foreground" />
                                    <Input
                                        value={checklist.name}
                                        onChange={(e) => handleUpdateChecklistName(checklist.id, e.target.value)}
                                        className="h-8 font-medium border-0 focus-visible:ring-0 px-0 bg-transparent placeholder:text-muted-foreground/70"
                                        placeholder="Checklist Name"
                                    />
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                        onClick={() => handleDeleteChecklist(checklist.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>

                                <div className="space-y-2 pl-6">
                                    {checklist.items.map((item) => (
                                        <div key={item.id} className="flex items-center gap-2 group">
                                            <Checkbox checked={item.completed} disabled />
                                            <Input
                                                placeholder="Type here"
                                                value={item.text}
                                                onChange={(e) => handleUpdateItem(checklist.id, item.id, e.target.value)}
                                                className="h-8 flex-1"
                                            />
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                                onClick={() => handleDeleteItem(checklist.id, item.id)}
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    ))}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 text-muted-foreground hover:text-foreground"
                                        onClick={() => handleAddItem(checklist.id)}
                                    >
                                        <Plus className="mr-1 h-3 w-3" />
                                        Add Item
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Attachment */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Attachment</label>
                        <div className="border-2 border-dashed border-amber-400 rounded-lg p-6 flex flex-col items-center justify-center text-center">
                            <Image className="h-8 w-8 text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">
                                Drag files here or <span className="text-primary cursor-pointer">Browse</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t">
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={!title.trim()}>
                        Save
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}
