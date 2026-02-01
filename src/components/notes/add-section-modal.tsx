'use client';

import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogOverlay,
    DialogPortal,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface AddSectionModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAdd: (section: { title: string; description: string }) => void;
}

export function AddSectionModal({
    open,
    onOpenChange,
    onAdd,
}: AddSectionModalProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [error, setError] = useState('');

    // Reset state when modal opens
    React.useEffect(() => {
        if (open) {
            setTitle('');
            setDescription('');
            setError('');
        }
    }, [open]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!title.trim()) {
            setError('Section title is required');
            return;
        }

        onAdd({
            title: title.trim(),
            description: description.trim(),
        });
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogPortal>
                <DialogOverlay className="z-[150]" />
                <DialogContent className="sm:max-w-[425px] z-[150]">
                    <DialogHeader>
                        <DialogTitle>Add New Section</DialogTitle>
                        <DialogDescription>
                            Add a new section to your PRD template. This will allow you to generate content for this specific section.
                        </DialogDescription>
                    </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="section-title">Section Title <span className="text-destructive">*</span></Label>
                        <Input
                            id="section-title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. Deployment Strategy"
                            autoFocus
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="section-description">Description (Optional)</Label>
                        <Textarea
                            id="section-description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Describe what this section should contain..."
                            rows={3}
                        />
                        <p className="text-xs text-muted-foreground">
                            This description helps the AI understand what to generate for this section.
                        </p>
                    </div>
                    {error && (
                        <div className="text-sm text-destructive font-medium">
                            {error}
                        </div>
                    )}
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button type="submit">
                            Add Section
                        </Button>
                    </DialogFooter>
                </form>
                </DialogContent>
            </DialogPortal>
        </Dialog>
    );
}
