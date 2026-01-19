'use client';

import { X, Trash2, UserCheck, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { motion, AnimatePresence } from 'framer-motion';

interface EmployeeBulkActionBarProps {
    selectedCount: number;
    onClearSelection: () => void;
    onDelete: () => void;
    onActivate: () => void;
    onDeactivate: () => void;
    isAdmin: boolean;
}

export function EmployeeBulkActionBar({
    selectedCount,
    onClearSelection,
    onDelete,
    onActivate,
    onDeactivate,
    isAdmin,
}: EmployeeBulkActionBarProps) {
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

                <div className="flex items-center gap-1 pr-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-2 hover:bg-muted rounded-full"
                        onClick={onActivate}
                        title="Activate selected employees"
                    >
                        <UserCheck className="h-4 w-4" />
                        <span className="hidden sm:inline">Activate</span>
                    </Button>
                    
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-2 hover:bg-muted rounded-full"
                        onClick={onDeactivate}
                        title="Deactivate selected employees"
                    >
                        <UserX className="h-4 w-4" />
                        <span className="hidden sm:inline">Deactivate</span>
                    </Button>

                    {isAdmin && (
                        <>
                            <Separator orientation="vertical" className="h-6 mx-1" />
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full"
                                onClick={onDelete}
                                title="Delete selected employees (Admin only)"
                            >
                                <Trash2 className="h-4 w-4" />
                                <span className="hidden sm:inline">Delete</span>
                            </Button>
                        </>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
