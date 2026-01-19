'use client';

import { X, CheckCircle2, Trash2, ArrowRightCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Separator } from '@/components/ui/separator';
import { motion, AnimatePresence } from 'framer-motion';
import type { TaskStatus } from '@/types';

interface BulkActionBarProps {
    selectedCount: number;
    onClearSelection: () => void;
    onMarkComplete: () => void;
    onDelete: () => void;
    onStatusChange: (status: TaskStatus) => void;
}

export function BulkActionBar({
    selectedCount,
    onClearSelection,
    onMarkComplete,
    onDelete,
    onStatusChange,
}: BulkActionBarProps) {
    if (selectedCount === 0) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 p-2 bg-background border shadow-xl rounded-full"
            >
                <div className="flex items-center gap-2 pl-4 pr-2">
                    <span className="text-sm font-medium whitespace-nowrap">
                        {selectedCount} selected
                    </span>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 hover:bg-muted rounded-full"
                        onClick={onClearSelection}
                    >
                        <X className="h-3 w-3" />
                    </Button>
                </div>

                <Separator orientation="vertical" className="h-6" />

                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-2 rounded-full"
                        onClick={onMarkComplete}
                    >
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="hidden sm:inline">Mark Complete</span>
                    </Button>

                    <Select onValueChange={(val) => onStatusChange(val as TaskStatus)}>
                        <SelectTrigger className="h-8 border-none bg-transparent hover:bg-accent hover:text-accent-foreground w-[130px] rounded-full focus:ring-0">
                            <ArrowRightCircle className="mr-2 h-4 w-4" />
                            <SelectValue placeholder="Move to..." />
                        </SelectTrigger>
                        <SelectContent align="center">
                            <SelectItem value="planned">Planned</SelectItem>
                            <SelectItem value="upcoming">Upcoming</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                    </Select>

                    <Separator orientation="vertical" className="h-6 mx-1" />

                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full"
                        onClick={onDelete}
                    >
                        <Trash2 className="h-4 w-4" />
                        <span className="hidden sm:inline">Delete</span>
                    </Button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
