'use client';

import { Employee, getEmployeeFullName, EmployeeCategory } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Phone, Mail, MoreVertical, MapPin, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface EmployeeKanbanViewProps {
    employees: Employee[];
    onEmployeeClick: (id: string) => void;
    onEditEmployee?: (employee: Employee) => void;
    onDeleteEmployee?: (id: string) => void;
}

// Department columns for Kanban
const departments = ['Design', 'Product', 'Sales'] as const;

// Category badge colors
const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
    'Design': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    'Product': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
    'Sales': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
};

export function EmployeeKanbanView({ employees, onEmployeeClick, onEditEmployee, onDeleteEmployee }: EmployeeKanbanViewProps) {
    // Group employees by department
    const groupedEmployees = departments.reduce((acc, dept) => {
        acc[dept] = employees.filter(e => e.department === dept);
        return acc;
    }, {} as Record<string, Employee[]>);

    return (
        <div className="flex gap-6 h-[calc(100vh-12rem)] overflow-x-auto pb-4">
            {departments.map((dept) => {
                const deptEmployees = groupedEmployees[dept] || [];
                const style = categoryColors[dept];
                const employeeCountText = `${deptEmployees.length} ${deptEmployees.length === 1 ? 'employee' : 'employees'}`;

                return (
                    <div key={dept} className="flex-1 flex flex-col min-w-[350px] bg-muted/30 rounded-lg border border-border/50 h-full">
                        {/* Column Header - Sticky */}
                        <div className="sticky top-0 z-10 flex items-center gap-2 p-4 border-b border-border/50 bg-background/50 rounded-t-lg shrink-0">
                            <Badge className={cn('border', style.bg, style.text, style.border)}>
                                {dept}
                            </Badge>
                            <span className="text-sm text-muted-foreground">{employeeCountText}</span>
                        </div>

                        {/* Create Employee Button - Sticky */}
                        <div className="sticky top-[57px] z-10 bg-muted/30 px-3 pt-3 pb-0 shrink-0">
                            <Button
                                variant="ghost"
                                className="w-full justify-center gap-2 border border-dashed border-border hover:border-primary/50 hover:bg-background"
                            >
                                <Plus className="h-4 w-4" />
                                Add Employee
                            </Button>
                        </div>

                        {/* Employee Cards - Scrollable Area */}
                        <div className="flex-1 overflow-y-auto scrollbar-thin p-3 min-h-0">
                            <div className="space-y-3">
                                {deptEmployees.map((employee) => {
                                    const fullName = getEmployeeFullName(employee);

                                    return (
                                        <div
                                            key={employee.id}
                                            className="bg-background border rounded-lg p-4 shadow-sm hover:shadow-md transition-all cursor-pointer hover:border-primary/50"
                                            onClick={() => onEmployeeClick(employee.id)}
                                        >
                                            {/* Card Header */}
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    <Avatar className="h-10 w-10 shrink-0">
                                                        <AvatarImage src={employee.avatar} alt={fullName} />
                                                        <AvatarFallback>{fullName.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="font-medium truncate">{fullName}</div>
                                                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                            <MapPin className="h-3 w-3 shrink-0" />
                                                            <span className="truncate">{employee.city || 'Austin'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={(e) => {
                                                            e.stopPropagation();
                                                            onEmployeeClick(employee.id);
                                                        }}>
                                                            View Details
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={(e) => {
                                                            e.stopPropagation();
                                                            onEditEmployee?.(employee);
                                                        }}>
                                                            Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem 
                                                            className="text-destructive focus:text-destructive"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onDeleteEmployee?.(employee.id);
                                                            }}
                                                        >
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>

                                            {/* Contact Info */}
                                            <div className="space-y-2 text-sm text-muted-foreground mb-4">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <Mail className="h-4 w-4 shrink-0" />
                                                    <span className="truncate">
                                                        {employee.email}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Phone className="h-4 w-4 shrink-0" />
                                                    <span className="truncate">{employee.phone || '-'}</span>
                                                </div>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                                <Button variant="outline" size="sm" className="flex-1 gap-1.5">
                                                    <Phone className="h-3.5 w-3.5" />
                                                    Call
                                                </Button>
                                                <Button variant="outline" size="sm" className="flex-1 gap-1.5">
                                                    <Mail className="h-3.5 w-3.5" />
                                                    Mail
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
