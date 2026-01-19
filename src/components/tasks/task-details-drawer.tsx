'use client';

import { useState, useRef } from 'react';
import { X, Plus, Calendar, ChevronDown, ChevronUp, Send, Paperclip, MoreVertical, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { TaskLabelBadge } from './task-label-badge';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Task, TaskChecklist, TaskChecklistItem, TaskActivity, TaskAttachment } from '@/types';
import { v4 as uuidv4 } from 'uuid';

interface TaskDetailsDrawerProps {
    open: boolean;
    task: Task | null;
    users: { id: string; name: string; avatar?: string }[];
    onClose: () => void;
    onUpdate: (id: string, updates: Partial<Task>) => void;
}

interface ChecklistSectionProps {
    checklist: TaskChecklist;
    onUpdateItem: (checklistId: string, itemId: string, completed: boolean) => void;
    onEditItemText: (checklistId: string, itemId: string, text: string) => void;
    onDeleteItem: (checklistId: string, itemId: string) => void;
    onAddItem: (checklistId: string) => void;
    onEditName: (checklistId: string, name: string) => void;
    onDelete: (checklistId: string) => void;
}

function ChecklistSection({
    checklist,
    onUpdateItem,
    onEditItemText,
    onDeleteItem,
    onAddItem,
    onEditName,
    onDelete
}: ChecklistSectionProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isEditingName, setIsEditingName] = useState(false);
    const [checklistName, setChecklistName] = useState(checklist.name);
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [editingItemText, setEditingItemText] = useState('');

    const handleNameSave = () => {
        if (checklistName.trim()) {
            onEditName(checklist.id, checklistName.trim());
        }
        setIsEditingName(false);
    };

    const handleItemTextSave = (itemId: string) => {
        if (editingItemText.trim()) {
            onEditItemText(checklist.id, itemId, editingItemText.trim());
        }
        setEditingItemId(null);
        setEditingItemText('');
    };

    const startEditingItem = (item: TaskChecklistItem) => {
        setEditingItemId(item.id);
        setEditingItemText(item.text);
    };

    return (
        <div className="space-y-2 p-3 border rounded-lg">
            <div className="flex items-center gap-2">
                <button onClick={() => setIsCollapsed(!isCollapsed)}>
                    {isCollapsed ? (
                        <ChevronDown className="h-4 w-4" />
                    ) : (
                        <ChevronUp className="h-4 w-4" />
                    )}
                </button>
                {isEditingName ? (
                    <Input
                        value={checklistName}
                        onChange={(e) => setChecklistName(e.target.value)}
                        onBlur={handleNameSave}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleNameSave();
                            if (e.key === 'Escape') {
                                setChecklistName(checklist.name);
                                setIsEditingName(false);
                            }
                        }}
                        className="h-7 text-sm font-medium"
                        autoFocus
                    />
                ) : (
                    <span
                        className="text-sm font-medium cursor-pointer hover:text-primary flex-1"
                        onClick={() => setIsEditingName(true)}
                    >
                        {checklist.name}
                    </span>
                )}
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => onDelete(checklist.id)}
                >
                    <X className="h-3 w-3" />
                </Button>
            </div>
            {!isCollapsed && (
                <div className="space-y-1 pl-6">
                    {checklist.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between gap-2 py-1 group">
                            <div className="flex items-center gap-2 flex-1">
                                <Checkbox
                                    checked={item.completed}
                                    onCheckedChange={(checked) =>
                                        onUpdateItem(checklist.id, item.id, checked as boolean)
                                    }
                                />
                                {editingItemId === item.id ? (
                                    <Input
                                        value={editingItemText}
                                        onChange={(e) => setEditingItemText(e.target.value)}
                                        onBlur={() => handleItemTextSave(item.id)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleItemTextSave(item.id);
                                            if (e.key === 'Escape') {
                                                setEditingItemId(null);
                                                setEditingItemText('');
                                            }
                                        }}
                                        className="h-7 text-sm"
                                        autoFocus
                                    />
                                ) : (
                                    <span
                                        className={cn(
                                            'text-sm cursor-pointer hover:text-primary flex-1',
                                            item.completed && 'line-through text-muted-foreground'
                                        )}
                                        onClick={() => startEditingItem(item)}
                                    >
                                        {item.text}
                                    </span>
                                )}
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100"
                                onClick={() => onDeleteItem(checklist.id, item.id)}
                            >
                                <X className="h-3 w-3" />
                            </Button>
                        </div>
                    ))}
                    <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 text-muted-foreground h-8"
                        onClick={() => onAddItem(checklist.id)}
                    >
                        <Plus className="h-3 w-3" />
                        Add Item
                    </Button>
                </div>
            )}
        </div>
    );
}

export function TaskDetailsDrawer({
    open,
    task,
    users,
    onClose,
    onUpdate,
}: TaskDetailsDrawerProps) {
    const [showActivity, setShowActivity] = useState(true);
    const [comment, setComment] = useState('');
    const [editingDescription, setEditingDescription] = useState(false);
    const [description, setDescription] = useState(task?.description || '');
    const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
    const [editingActivityText, setEditingActivityText] = useState('');
    const [editingActivityAttachments, setEditingActivityAttachments] = useState<TaskAttachment[]>([]);
    const [commentAttachments, setCommentAttachments] = useState<TaskAttachment[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const commentFileInputRef = useRef<HTMLInputElement>(null);

    if (!task) return null;

    const taskAssignees = users.filter((u) => task.assignees.includes(u.id));

    const handleUpdateChecklistItem = (
        checklistId: string,
        itemId: string,
        completed: boolean
    ) => {
        const updatedChecklists = task.checklists.map((cl) =>
            cl.id === checklistId
                ? {
                    ...cl,
                    items: cl.items.map((item) =>
                        item.id === itemId ? { ...item, completed } : item
                    ),
                }
                : cl
        );
        onUpdate(task.id, { checklists: updatedChecklists });
    };

    const handleAddChecklistItem = (checklistId: string) => {
        const newItem: TaskChecklistItem = {
            id: uuidv4(),
            text: 'New item',
            completed: false,
        };
        const updatedChecklists = task.checklists.map((cl) =>
            cl.id === checklistId
                ? { ...cl, items: [...cl.items, newItem] }
                : cl
        );
        onUpdate(task.id, { checklists: updatedChecklists });
    };

    const handleEditChecklistItemText = (
        checklistId: string,
        itemId: string,
        text: string
    ) => {
        const updatedChecklists = task.checklists.map((cl) =>
            cl.id === checklistId
                ? {
                    ...cl,
                    items: cl.items.map((item) =>
                        item.id === itemId ? { ...item, text } : item
                    ),
                }
                : cl
        );
        onUpdate(task.id, { checklists: updatedChecklists });
    };

    const handleDeleteChecklistItem = (checklistId: string, itemId: string) => {
        const updatedChecklists = task.checklists.map((cl) =>
            cl.id === checklistId
                ? { ...cl, items: cl.items.filter((item) => item.id !== itemId) }
                : cl
        );
        onUpdate(task.id, { checklists: updatedChecklists });
    };

    const handleEditChecklistName = (checklistId: string, name: string) => {
        const updatedChecklists = task.checklists.map((cl) =>
            cl.id === checklistId ? { ...cl, name } : cl
        );
        onUpdate(task.id, { checklists: updatedChecklists });
    };

    const handleDeleteChecklist = (checklistId: string) => {
        const updatedChecklists = task.checklists.filter((cl) => cl.id !== checklistId);
        onUpdate(task.id, { checklists: updatedChecklists });
    };

    const handleAddNewChecklist = () => {
        const newChecklist: TaskChecklist = {
            id: uuidv4(),
            name: 'New Checklist',
            items: [],
        };
        onUpdate(task.id, { checklists: [...task.checklists, newChecklist] });
    };

    const handleAddMember = (userId: string) => {
        if (!task.assignees.includes(userId)) {
            onUpdate(task.id, { assignees: [...task.assignees, userId] });
        }
    };

    const handleRemoveMember = (userId: string) => {
        onUpdate(task.id, { assignees: task.assignees.filter(id => id !== userId) });
    };

    const handleAddLabel = (label: string) => {
        if (!task.labels.includes(label)) {
            onUpdate(task.id, { labels: [...task.labels, label] });
        }
    };

    const handleRemoveLabel = (label: string) => {
        onUpdate(task.id, { labels: task.labels.filter(l => l !== label) });
    };

    const handleCommentFileUpload = (files: FileList | null) => {
        if (!files) return;

        Array.from(files).forEach((file) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const newAttachment: TaskAttachment = {
                    id: uuidv4(),
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    data: e.target?.result as string,
                    uploadedBy: 'current-user',
                    uploadedAt: new Date(),
                };
                setCommentAttachments(prev => [...prev, newAttachment]);
            };
            reader.readAsDataURL(file);
        });
    };

    const handleRemoveCommentAttachment = (attachmentId: string) => {
        setCommentAttachments(prev => prev.filter(a => a.id !== attachmentId));
    };
    const handleUploadAttachment = (files: FileList | null) => {
        if (!files) return;

        Array.from(files).forEach((file) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const attachment: TaskAttachment = {
                    id: uuidv4(),
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    data: e.target?.result as string,
                    uploadedBy: 'current-user',
                    uploadedAt: new Date(),
                };
                onUpdate(task.id, { attachments: [...task.attachments, attachment] });
            };
            reader.readAsDataURL(file);
        });
    };

    const handleDeleteAttachment = (attachmentId: string) => {
        onUpdate(task.id, {
            attachments: task.attachments.filter(a => a.id !== attachmentId)
        });
    };

    const handleDownloadAttachment = (attachment: TaskAttachment) => {
        const link = document.createElement('a');
        link.href = attachment.data;
        link.download = attachment.name;
        link.click();
    };

    const handleSubmitComment = () => {
        if (!comment.trim() && commentAttachments.length === 0) return;

        const newActivity: TaskActivity = {
            id: uuidv4(),
            type: 'comment',
            userId: 'current-user',
            userName: 'Current User',
            content: comment,
            timestamp: new Date(),
            attachments: commentAttachments.length > 0 ? commentAttachments : undefined,
        };

        const updatedActivities = [newActivity, ...task.activities];
        const newCommentCount = updatedActivities.filter(a => a.type === 'comment').length;

        onUpdate(task.id, {
            activities: updatedActivities,
            commentCount: newCommentCount
        });
        setComment('');
        setCommentAttachments([]);
    };

    const handleEditActivity = (activity: TaskActivity) => {
        setEditingActivityId(activity.id);
        setEditingActivityText(activity.content);
        setEditingActivityAttachments(activity.attachments || []);
    };

    const handleSaveActivityEdit = () => {
        if (!editingActivityId || !editingActivityText.trim()) return;

        const updatedActivities = task.activities.map(a =>
            a.id === editingActivityId
                ? { ...a, content: editingActivityText }
                : a
        );

        onUpdate(task.id, { activities: updatedActivities });
        setEditingActivityId(null);
        setEditingActivityText('');
    };

    const handleDeleteActivity = (activityId: string) => {
        const updatedActivities = task.activities.filter(a => a.id !== activityId);
        const newCommentCount = updatedActivities.filter(a => a.type === 'comment').length;
        onUpdate(task.id, {
            activities: updatedActivities,
            commentCount: newCommentCount
        });
    };

    const handleRemoveActivityAttachment = (attachmentId: string) => {
        setEditingActivityAttachments(prev => prev.filter(a => a.id !== attachmentId));
    };

    const handleSaveDescription = () => {
        if (description !== task.description) {
            onUpdate(task.id, { description });
        }
        setEditingDescription(false);
    };

    return (
        <Sheet open={open} onOpenChange={onClose}>
            <SheetContent className="w-[836px] sm:max-w-[836px] p-0 flex flex-col">
                {/* Header */}
                <SheetHeader className="px-6 py-4 border-b">
                    <SheetTitle className="text-lg font-medium">{task.title}</SheetTitle>
                </SheetHeader>

                {/* Content */}
                <div className="flex-1 overflow-hidden flex">
                    {/* Main Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {/* Description */}
                        <div className="space-y-2">
                            <h4 className="text-sm font-medium">Description</h4>
                            {editingDescription ? (
                                <Textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    onBlur={handleSaveDescription}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Escape') {
                                            setDescription(task.description || '');
                                            setEditingDescription(false);
                                        }
                                    }}
                                    className="min-h-[80px] text-sm"
                                    placeholder="Add a description..."
                                    autoFocus
                                />
                            ) : (
                                <p
                                    className="text-sm text-muted-foreground cursor-pointer hover:text-foreground p-2 border rounded min-h-[80px]"
                                    onClick={() => {
                                        setDescription(task.description || '');
                                        setEditingDescription(true);
                                    }}
                                >
                                    {task.description || 'No description provided. Click to add...'}
                                </p>
                            )}
                        </div>

                        {/* Checklists */}
                        {task.checklists.length > 0 && (
                            <div className="space-y-4">
                                {task.checklists.map((checklist) => (
                                    <ChecklistSection
                                        key={checklist.id}
                                        checklist={checklist}
                                        onUpdateItem={handleUpdateChecklistItem}
                                        onEditItemText={handleEditChecklistItemText}
                                        onDeleteItem={handleDeleteChecklistItem}
                                        onAddItem={handleAddChecklistItem}
                                        onEditName={handleEditChecklistName}
                                        onDelete={handleDeleteChecklist}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Add New Checklist */}
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={handleAddNewChecklist}
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Add New Checklist
                        </Button>

                        {/* Comment Input */}
                        <div className="pt-4 border-t space-y-2">
                            {/* Comment Attachments Preview */}
                            {commentAttachments.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {commentAttachments.map((attachment) => (
                                        <div key={attachment.id} className="flex items-center gap-2 bg-muted p-2 rounded-md text-sm">
                                            <Paperclip className="h-3 w-3" />
                                            <span className="max-w-[150px] truncate">{attachment.name}</span>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-4 w-4"
                                                onClick={() => handleRemoveCommentAttachment(attachment.id)}
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="flex items-center gap-2">
                                <Input
                                    placeholder="Add Your Comment"
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSubmitComment();
                                        }
                                    }}
                                    className="flex-1"
                                />
                                <input
                                    ref={commentFileInputRef}
                                    type="file"
                                    multiple
                                    className="hidden"
                                    onChange={(e) => handleCommentFileUpload(e.target.files)}
                                />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => commentFileInputRef.current?.click()}
                                >
                                    <Paperclip className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={handleSubmitComment}
                                    disabled={!comment.trim() && commentAttachments.length === 0}
                                >
                                    <Send className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Activity */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-medium">Activity</h4>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowActivity(!showActivity)}
                                >
                                    {showActivity ? 'Hide' : 'Show'} Activity Details
                                </Button>
                            </div>
                            {showActivity && task.activities.length > 0 && (
                                <div className="space-y-4">
                                    {task.activities.map((activity) => (
                                        <div key={activity.id} className="flex gap-3 group">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={activity.userAvatar} />
                                                <AvatarFallback>
                                                    {activity.userName.split(' ').map((n) => n[0]).join('')}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 space-y-1">
                                                {editingActivityId === activity.id ? (
                                                    <div className="space-y-2">
                                                        <Textarea
                                                            value={editingActivityText}
                                                            onChange={(e) => setEditingActivityText(e.target.value)}
                                                            onBlur={handleSaveActivityEdit}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                                    e.preventDefault();
                                                                    handleSaveActivityEdit();
                                                                }
                                                                if (e.key === 'Escape') {
                                                                    setEditingActivityId(null);
                                                                    setEditingActivityText('');
                                                                    setEditingActivityAttachments([]);
                                                                }
                                                            }}
                                                            className="text-sm min-h-[60px]"
                                                            autoFocus
                                                        />
                                                        {editingActivityAttachments.length > 0 && (
                                                            <div className="flex flex-wrap gap-2">
                                                                {editingActivityAttachments.map((attachment) => (
                                                                    <div key={attachment.id} className="flex items-center gap-2 bg-muted p-2 rounded-md text-sm">
                                                                        <Paperclip className="h-3 w-3" />
                                                                        <span className="max-w-[150px] truncate">{attachment.name}</span>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-4 w-4"
                                                                            onClick={() => handleRemoveActivityAttachment(attachment.id)}
                                                                        >
                                                                            <X className="h-3 w-3" />
                                                                        </Button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <>
                                                        <p className="text-sm">
                                                            <span className="font-medium">{activity.userName}</span>
                                                        </p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {activity.content}
                                                        </p>
                                                        {activity.attachments && activity.attachments.length > 0 && (
                                                            <div className="flex flex-wrap gap-2 mt-2">
                                                                {activity.attachments.map((attachment) => (
                                                                    <div
                                                                        key={attachment.id}
                                                                        className="flex items-center gap-2 bg-muted p-2 rounded-md text-sm cursor-pointer hover:bg-muted/80"
                                                                        onClick={() => handleDownloadAttachment(attachment)}
                                                                    >
                                                                        <Paperclip className="h-3 w-3" />
                                                                        <span className="max-w-[150px] truncate">{attachment.name}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                                <p className="text-xs text-muted-foreground">
                                                    {format(new Date(activity.timestamp), 'h:mm a')} ago
                                                </p>
                                            </div>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 opacity-0 group-hover:opacity-100"
                                                    >
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleEditActivity(activity)}>
                                                        Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => handleDeleteActivity(activity.id)}
                                                        className="text-destructive"
                                                    >
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Sidebar */}
                    <div className="w-[200px] border-l p-4 space-y-6">
                        {/* Member */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Member</span>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-6 w-6">
                                            <Plus className="h-3 w-3" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[200px] p-0" align="end">
                                        <div className="p-2 space-y-1">
                                            {users
                                                .filter(u => !task.assignees.includes(u.id))
                                                .map((user) => (
                                                    <Button
                                                        key={user.id}
                                                        variant="ghost"
                                                        className="w-full justify-start gap-2"
                                                        onClick={() => handleAddMember(user.id)}
                                                    >
                                                        <Avatar className="h-6 w-6">
                                                            <AvatarImage src={user.avatar} />
                                                            <AvatarFallback>
                                                                {user.name.split(' ').map((n) => n[0]).join('')}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <span className="text-sm">{user.name}</span>
                                                    </Button>
                                                ))}
                                            {users.filter(u => !task.assignees.includes(u.id)).length === 0 && (
                                                <p className="text-xs text-muted-foreground p-2">All members added</p>
                                            )}
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {taskAssignees.map((assignee) => (
                                    <div key={assignee.id} className="relative group">
                                        <Avatar className="h-8 w-8 border-2 border-background">
                                            <AvatarImage src={assignee.avatar} />
                                            <AvatarFallback>
                                                {assignee.name.split(' ').map((n) => n[0]).join('')}
                                            </AvatarFallback>
                                        </Avatar>
                                        <button
                                            onClick={() => handleRemoveMember(assignee.id)}
                                            className="absolute -top-1 -right-1 h-4 w-4 bg-destructive rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="h-2 w-2 text-destructive-foreground" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Due Date */}
                        <div className="space-y-2">
                            <span className="text-sm font-medium">Due Date</span>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" size="sm" className="w-full justify-start">
                                        <Calendar className="mr-2 h-4 w-4" />
                                        {task.dueDate
                                            ? format(new Date(task.dueDate), 'dd MMM yyyy')
                                            : 'Set date'}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <CalendarComponent
                                        mode="single"
                                        selected={task.dueDate ? new Date(task.dueDate) : undefined}
                                        onSelect={(date) => onUpdate(task.id, { dueDate: date ?? null })}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* Labels */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Labels</span>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-6 w-6">
                                            <Plus className="h-3 w-3" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[200px] p-2" align="end">
                                        <div className="space-y-1">
                                            <Input
                                                placeholder="New label name"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        const input = e.target as HTMLInputElement;
                                                        if (input.value.trim()) {
                                                            handleAddLabel(input.value.trim());
                                                            input.value = '';
                                                        }
                                                    }
                                                }}
                                                className="h-8"
                                            />
                                            <p className="text-xs text-muted-foreground px-1">Press Enter to add</p>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="flex flex-wrap gap-1">
                                {task.labels.map((label) => (
                                    <div key={label} className="group relative">
                                        <TaskLabelBadge label={label} />
                                        <button
                                            onClick={() => handleRemoveLabel(label)}
                                            className="absolute -top-1 -right-1 h-3 w-3 bg-destructive rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="h-2 w-2 text-destructive-foreground" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Attachment */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Attachment</span>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    multiple
                                    className="hidden"
                                    onChange={(e) => handleUploadAttachment(e.target.files)}
                                />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Plus className="h-3 w-3" />
                                </Button>
                            </div>
                            {task.attachments.length === 0 ? (
                                <p className="text-xs text-muted-foreground">No attachments</p>
                            ) : (
                                <div className="space-y-1">
                                    {task.attachments.map((attachment) => (
                                        <div
                                            key={attachment.id}
                                            className="flex items-center justify-between gap-2 p-2 rounded border group hover:bg-muted/50"
                                        >
                                            <div
                                                className="flex-1 cursor-pointer min-w-0"
                                                onClick={() => handleDownloadAttachment(attachment)}
                                            >
                                                <p className="text-xs font-medium truncate" title={attachment.name}>{attachment.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {(attachment.size / 1024).toFixed(1)} KB
                                                </p>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 opacity-0 group-hover:opacity-100"
                                                onClick={() => handleDeleteAttachment(attachment.id)}
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
