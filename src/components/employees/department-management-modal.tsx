'use client';

import { useState } from 'react';
import { useEmployeeStore, DEFAULT_DEPARTMENTS } from '@/lib/stores/employee-store';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
    Plus, 
    Pencil, 
    Trash2, 
    Check, 
    X, 
    Building2,
    Users,
    Lock
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DepartmentManagementModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function DepartmentManagementModal({ open, onOpenChange }: DepartmentManagementModalProps) {
    const { 
        departments, 
        employees,
        visibleDepartments,
        addDepartment, 
        deleteDepartment, 
        renameDepartment,
        addDepartmentToTabs,
        removeDepartmentFromTabs,
    } = useEmployeeStore();

    const [newDepartmentName, setNewDepartmentName] = useState('');
    const [editingDepartment, setEditingDepartment] = useState<string | null>(null);
    const [editedName, setEditedName] = useState('');
    const [deleteConfirmDepartment, setDeleteConfirmDepartment] = useState<string | null>(null);

    // Get employee count per department
    const getEmployeeCount = (dept: string) => {
        return employees.filter(e => e.department === dept).length;
    };

    const handleAddDepartment = () => {
        if (newDepartmentName.trim()) {
            addDepartment(newDepartmentName.trim());
            setNewDepartmentName('');
        }
    };

    const handleStartEdit = (dept: string) => {
        setEditingDepartment(dept);
        setEditedName(dept);
    };

    const handleSaveEdit = () => {
        if (editingDepartment && editedName.trim()) {
            renameDepartment(editingDepartment, editedName.trim());
            setEditingDepartment(null);
            setEditedName('');
        }
    };

    const handleCancelEdit = () => {
        setEditingDepartment(null);
        setEditedName('');
    };

    const handleDeleteConfirm = () => {
        if (deleteConfirmDepartment) {
            deleteDepartment(deleteConfirmDepartment);
            setDeleteConfirmDepartment(null);
        }
    };

    const isDefaultDepartment = (dept: string) => DEFAULT_DEPARTMENTS.includes(dept);
    const isVisible = (dept: string) => visibleDepartments.includes(dept);

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Building2 className="h-5 w-5" />
                            Manage Departments
                        </DialogTitle>
                        <DialogDescription>
                            Create, edit, and organize departments for your organization.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* Add New Department */}
                        <div className="space-y-2">
                            <Label>Create New Department</Label>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Enter department name..."
                                    value={newDepartmentName}
                                    onChange={(e) => setNewDepartmentName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleAddDepartment();
                                        }
                                    }}
                                />
                                <Button 
                                    onClick={handleAddDepartment}
                                    disabled={!newDepartmentName.trim()}
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add
                                </Button>
                            </div>
                        </div>

                        <Separator />

                        {/* Department List */}
                        <div className="space-y-2">
                            <Label>All Departments ({departments.length})</Label>
                            <ScrollArea className="h-[300px] pr-4">
                                <div className="space-y-2">
                                    {departments.map((dept) => {
                                        const employeeCount = getEmployeeCount(dept);
                                        const isDefault = isDefaultDepartment(dept);
                                        const isInTabs = isVisible(dept);
                                        const isEditing = editingDepartment === dept;

                                        return (
                                            <div
                                                key={dept}
                                                className={cn(
                                                    "flex items-center justify-between p-3 rounded-lg border",
                                                    isEditing ? "border-primary bg-muted/50" : "hover:bg-muted/30"
                                                )}
                                            >
                                                {isEditing ? (
                                                    <div className="flex items-center gap-2 flex-1">
                                                        <Input
                                                            value={editedName}
                                                            onChange={(e) => setEditedName(e.target.value)}
                                                            className="h-8"
                                                            autoFocus
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') handleSaveEdit();
                                                                if (e.key === 'Escape') handleCancelEdit();
                                                            }}
                                                        />
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 shrink-0"
                                                            onClick={handleSaveEdit}
                                                        >
                                                            <Check className="h-4 w-4 text-green-600" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 shrink-0"
                                                            onClick={handleCancelEdit}
                                                        >
                                                            <X className="h-4 w-4 text-muted-foreground" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="flex items-center gap-3">
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-medium">{dept}</span>
                                                                    {isDefault && (
                                                                        <Badge variant="secondary" className="text-xs gap-1">
                                                                            <Lock className="h-3 w-3" />
                                                                            Default
                                                                        </Badge>
                                                                    )}
                                                                    {isInTabs && (
                                                                        <Badge variant="outline" className="text-xs">
                                                                            Visible
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                                                    <Users className="h-3 w-3" />
                                                                    {employeeCount} {employeeCount === 1 ? 'employee' : 'employees'}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-1">
                                                            {/* Toggle Visibility */}
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-8 text-xs"
                                                                onClick={() => {
                                                                    if (isInTabs) {
                                                                        removeDepartmentFromTabs(dept);
                                                                    } else {
                                                                        addDepartmentToTabs(dept);
                                                                    }
                                                                }}
                                                            >
                                                                {isInTabs ? 'Hide' : 'Show'}
                                                            </Button>

                                                            {/* Edit Button (only for custom departments) */}
                                                            {!isDefault && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8"
                                                                    onClick={() => handleStartEdit(dept)}
                                                                >
                                                                    <Pencil className="h-4 w-4" />
                                                                </Button>
                                                            )}

                                                            {/* Delete Button (only for custom departments with no employees) */}
                                                            {!isDefault && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                                                    onClick={() => setDeleteConfirmDepartment(dept)}
                                                                    disabled={employeeCount > 0}
                                                                    title={employeeCount > 0 ? 'Cannot delete department with employees' : 'Delete department'}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </ScrollArea>
                        </div>

                        <Separator />

                        {/* Info */}
                        <div className="text-xs text-muted-foreground space-y-1">
                            <p>• Default departments cannot be edited or deleted</p>
                            <p>• Departments with employees cannot be deleted</p>
                            <p>• "Show" adds the department to the filter tabs</p>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deleteConfirmDepartment} onOpenChange={() => setDeleteConfirmDepartment(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Department</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete "{deleteConfirmDepartment}"? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={handleDeleteConfirm}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
