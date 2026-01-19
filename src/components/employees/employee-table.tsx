'use client';

import { useState } from 'react';
import { Employee, getEmployeeFullName } from '@/types';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Phone, Mail, MapPin, ChevronLeft, ChevronRight, Plus, ArrowUpDown, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BulkActionBar } from '@/components/tasks/bulk-action-bar';
import type { TaskStatus } from '@/types';

interface EmployeeTableViewProps {
    employees: Employee[];
    onEmployeeClick: (id: string) => void;
    onEditEmployee?: (employee: Employee) => void;
    onDeleteEmployee?: (id: string) => void;
}

// Category badge colors
const categoryColors: Record<string, { bg: string; text: string }> = {
    'Employee': { bg: 'bg-red-100', text: 'text-red-700' },
    'Customers': { bg: 'bg-green-100', text: 'text-green-700' },
    'Partners': { bg: 'bg-orange-100', text: 'text-orange-700' },
};

export function EmployeeTableView({ employees, onEmployeeClick, onEditEmployee, onDeleteEmployee }: EmployeeTableViewProps) {
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(new Set());

    const totalPages = Math.ceil(employees.length / rowsPerPage);
    const startIndex = (currentPage - 1) * rowsPerPage;
    const paginatedEmployees = employees.slice(startIndex, startIndex + rowsPerPage);

    const handleToggleSelect = (id: string, selected: boolean) => {
        const newSelected = new Set(selectedEmployeeIds);
        if (selected) {
            newSelected.add(id);
        } else {
            newSelected.delete(id);
        }
        setSelectedEmployeeIds(newSelected);
    };

    const handleSelectAll = (selected: boolean) => {
        if (selected) {
            setSelectedEmployeeIds(new Set(paginatedEmployees.map(e => e.id)));
        } else {
            setSelectedEmployeeIds(new Set());
        }
    };

    const handleClearSelection = () => {
        setSelectedEmployeeIds(new Set());
    };

    const handleBulkDelete = () => {
        if (onDeleteEmployee) {
            selectedEmployeeIds.forEach(id => {
                onDeleteEmployee(id);
            });
        }
        handleClearSelection();
    };

    const allSelected = paginatedEmployees.length > 0 && selectedEmployeeIds.size === paginatedEmployees.length;
    const isIndeterminate = selectedEmployeeIds.size > 0 && selectedEmployeeIds.size < paginatedEmployees.length;

    return (
        <div className="px-8 py-4">
            <div className="rounded-lg border bg-white overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                            <TableHead className="w-[4%]">
                                <Checkbox
                                    checked={allSelected || (isIndeterminate ? 'indeterminate' : false)}
                                    onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                                />
                            </TableHead>
                            <TableHead className="w-[20%] font-medium">
                                <Button variant="ghost" size="sm" className="-ml-3 h-8">
                                    Name
                                    <ArrowUpDown className="ml-2 h-4 w-4" />
                                </Button>
                            </TableHead>
                            <TableHead className="w-[20%] font-medium">
                                <Button variant="ghost" size="sm" className="-ml-3 h-8">
                                    Email
                                    <ArrowUpDown className="ml-2 h-4 w-4" />
                                </Button>
                            </TableHead>
                            <TableHead className="w-[12%] font-medium">
                                <Button variant="ghost" size="sm" className="-ml-3 h-8">
                                    Phone
                                    <ArrowUpDown className="ml-2 h-4 w-4" />
                                </Button>
                            </TableHead>
                            <TableHead className="w-[12%] font-medium">Category</TableHead>
                            <TableHead className="w-[12%] font-medium">Location</TableHead>
                            <TableHead className="w-[10%] font-medium">Gender</TableHead>
                            <TableHead className="w-[6%]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedEmployees.map((employee) => {
                            const fullName = getEmployeeFullName(employee);
                            const categoryStyle = categoryColors[employee.category] || categoryColors['Employee'];
                            const isSelected = selectedEmployeeIds.has(employee.id);

                            return (
                                <TableRow
                                    key={employee.id}
                                    className={cn(
                                        "group cursor-pointer hover:bg-muted/50 transition-colors",
                                        isSelected && "bg-muted"
                                    )}
                                    onClick={() => onEmployeeClick(employee.id)}
                                >
                                    <TableCell onClick={(e) => e.stopPropagation()}>
                                        <Checkbox
                                            checked={isSelected}
                                            onCheckedChange={(checked) => handleToggleSelect(employee.id, checked as boolean)}
                                        />
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-7 w-7 border-2 border-background">
                                                <AvatarImage src={employee.avatar} alt={fullName} />
                                                <AvatarFallback className="text-xs">{fullName.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <span>{fullName}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                            <Mail className="h-4 w-4" />
                                            <a
                                                href={`mailto:${employee.email}`}
                                                className="hover:text-foreground truncate"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {employee.email}
                                            </a>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                            <Phone className="h-4 w-4" />
                                            <span>{employee.phone || '-'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={cn('border-0', categoryStyle.bg, categoryStyle.text)}>
                                            {employee.category}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                            <MapPin className="h-4 w-4" />
                                            <span>{employee.city || '-'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm">
                                        {employee.gender === 'Male' ? '♂' : employee.gender === 'Female' ? '♀' : ''} {employee.gender || '-'}
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={(e) => {
                                                    e.stopPropagation();
                                                    onEditEmployee?.(employee);
                                                }}>
                                                    <Pencil className="mr-2 h-4 w-4" />
                                                    Edit
                                                </DropdownMenuItem>
                                                <DropdownMenuItem 
                                                    className="text-destructive focus:text-destructive"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onDeleteEmployee?.(employee.id);
                                                    }}
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {/* Add New Employee Row */}
                        <TableRow>
                            <TableCell colSpan={8}>
                                <Button
                                    variant="ghost"
                                    className="w-full justify-start gap-2 text-muted-foreground"
                                >
                                    <Plus className="h-4 w-4" />
                                    New Employee
                                </Button>
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    Show
                    <Select value={String(rowsPerPage)} onValueChange={(v) => setRowsPerPage(Number(v))}>
                        <SelectTrigger className="h-8 w-[70px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="20">20</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                        </SelectContent>
                    </Select>
                    Row
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage((p) => p - 1)}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>

                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const page = i + 1;
                        return (
                            <Button
                                key={page}
                                variant={currentPage === page ? 'default' : 'outline'}
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setCurrentPage(page)}
                            >
                                {page}
                            </Button>
                        );
                    })}

                    {totalPages > 5 && (
                        <>
                            <span className="text-muted-foreground">...</span>
                            <Button
                                variant={currentPage === totalPages ? 'default' : 'outline'}
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setCurrentPage(totalPages)}
                            >
                                {totalPages}
                            </Button>
                        </>
                    )}

                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage((p) => p + 1)}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Bulk Action Bar */}
            <BulkActionBar
                selectedCount={selectedEmployeeIds.size}
                onClearSelection={handleClearSelection}
                onMarkComplete={() => {}} // Not applicable for employees
                onDelete={handleBulkDelete}
                onStatusChange={() => {}} // Not applicable for employees
            />
        </div>
    );
}
