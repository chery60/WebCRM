'use client';

import { useState, useEffect } from 'react';
import { useMessagingStore } from '@/lib/stores/messaging-store';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useEmployeeStore } from '@/lib/stores/employee-store';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search } from 'lucide-react';

interface CreateChannelDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CreateChannelDialog({ open, onOpenChange }: CreateChannelDialogProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isPrivate, setIsPrivate] = useState(false);
    const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');

    const { createChannel } = useMessagingStore();
    const { currentWorkspace } = useWorkspaceStore();
    const { currentUser } = useAuthStore();
    const { employees, fetchEmployees } = useEmployeeStore();

    useEffect(() => {
        if (open && currentWorkspace) {
            fetchEmployees(currentWorkspace.id);
        }
    }, [open, currentWorkspace, fetchEmployees]);

    const filteredEmployees = employees.filter(emp => {
        if (!searchQuery) return true;
        const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
        return fullName.includes(searchQuery.toLowerCase()) || emp.email.toLowerCase().includes(searchQuery.toLowerCase());
    });

    const handleToggleMember = (email: string) => {
        const newSet = new Set(selectedMembers);
        if (newSet.has(email)) {
            newSet.delete(email);
        } else {
            newSet.add(email);
        }
        setSelectedMembers(newSet);
    };

    const handleCreate = async () => {
        if (!name.trim() || !currentWorkspace || !currentUser) return;

        const channel = await createChannel({
            workspaceId: currentWorkspace.id,
            name: name.trim(),
            description: description.trim() || undefined,
            isPrivate,
            createdBy: currentUser.id,
            memberEmails: Array.from(selectedMembers),
        });

        if (channel) {
            onOpenChange(false);
            // Reset form
            setName('');
            setDescription('');
            setIsPrivate(false);
            setSelectedMembers(new Set());
            setSearchQuery('');
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Create a channel</DialogTitle>
                    <DialogDescription>
                        Channels are where your team communicates. They're best when organized around a topic — #marketing, for example.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="channel-name">Channel name</Label>
                        <Input
                            id="channel-name"
                            placeholder="e.g. marketing"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            maxLength={80}
                        />
                        <p className="text-xs text-muted-foreground">
                            Channel names must be lowercase, without spaces or periods, and can't be longer than 80 characters.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="channel-description">Description (optional)</Label>
                        <Textarea
                            id="channel-description"
                            placeholder="What's this channel about?"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label htmlFor="private-channel">Make private</Label>
                            <p className="text-xs text-muted-foreground">
                                When a channel is set to private, it can only be viewed or joined by invitation
                            </p>
                        </div>
                        <Switch
                            id="private-channel"
                            checked={isPrivate}
                            onCheckedChange={setIsPrivate}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Add members (optional)</Label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search members"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <ScrollArea className="h-[200px] rounded-md border">
                            <div className="p-4 space-y-2">
                                {filteredEmployees.map((employee) => {
                                    // Skip current user (will be added as owner automatically)
                                    if (employee.email === currentUser?.email) return null;

                                    const initials = `${employee.firstName?.[0] || ''}${employee.lastName?.[0] || ''}`.toUpperCase();
                                    const isSelected = selectedMembers.has(employee.email);

                                    return (
                                        <div
                                            key={employee.id}
                                            className="flex items-center space-x-3 p-2 rounded hover:bg-accent cursor-pointer"
                                            onClick={() => handleToggleMember(employee.email)}
                                        >
                                            <Checkbox
                                                checked={isSelected}
                                                onCheckedChange={() => handleToggleMember(employee.email)}
                                            />
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={employee.avatar} alt={`${employee.firstName} ${employee.lastName}`} />
                                                <AvatarFallback>{initials}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">
                                                    {employee.firstName} {employee.lastName}
                                                </p>
                                                <p className="text-xs text-muted-foreground truncate">
                                                    {employee.email}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                                {filteredEmployees.length === 0 && (
                                    <p className="text-sm text-muted-foreground text-center py-4">
                                        No members found
                                    </p>
                                )}
                            </div>
                        </ScrollArea>
                        {selectedMembers.size > 0 && (
                            <p className="text-xs text-muted-foreground">
                                {selectedMembers.size} member{selectedMembers.size !== 1 ? 's' : ''} selected
                            </p>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleCreate} disabled={!name.trim()}>
                        Create Channel
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
