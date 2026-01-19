'use client';

import { Employee, getEmployeeFullName } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Phone, Mail, MapPin, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface EmployeeRowProps {
    employee: Employee;
    onClick: () => void;
    onEdit?: (employee: Employee) => void;
    onDelete?: (id: string) => void;
    isSelected?: boolean;
    onToggleSelect?: (selected: boolean) => void;
}

// Category badge colors (reused from list view logic)
const categoryColors: Record<string, { bg: string; text: string }> = {
    'Employee': { bg: 'bg-red-100', text: 'text-red-700' },
    'Customers': { bg: 'bg-green-100', text: 'text-green-700' },
    'Partners': { bg: 'bg-orange-100', text: 'text-orange-700' },
};

export function EmployeeRow({
    employee,
    onClick,
    onEdit,
    onDelete,
    isSelected = false,
    onToggleSelect,
}: EmployeeRowProps) {
    const fullName = getEmployeeFullName(employee);
    const categoryStyle = categoryColors[employee.category] || categoryColors['Employee'];

    return (
        <div
            className={cn(
                'group grid grid-cols-[40px_1fr_1fr_150px_150px_100px_80px_50px] gap-4 px-8 py-3 items-center hover:bg-muted/50 cursor-pointer transition-colors border-b border-border/50',
                isSelected && 'bg-muted'
            )}
            onClick={onClick}
        >
            <div onClick={(e) => e.stopPropagation()}>
                <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => onToggleSelect?.(checked as boolean)}
                />
            </div>

            {/* Name with Avatar */}
            <div className="flex items-center gap-3 overflow-hidden">
                <Avatar className="h-8 w-8 border-2 border-background">
                    <AvatarImage src={employee.avatar} alt={fullName} />
                    <AvatarFallback className="text-xs">{fullName.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="font-medium truncate text-sm">{fullName}</span>
            </div>

            {/* Email */}
            <div className="flex items-center gap-2 text-muted-foreground overflow-hidden">
                <Mail className="h-3.5 w-3.5 shrink-0" />
                <a
                    href={`mailto:${employee.email}`}
                    className="truncate text-sm hover:text-foreground"
                    onClick={(e) => e.stopPropagation()}
                >
                    {employee.email}
                </a>
            </div>

            {/* Phone */}
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Phone className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{employee.phone || '-'}</span>
            </div>

            {/* Department */}
            <div>
                <Badge variant="secondary" className={cn('border-0 font-normal', categoryStyle.bg, categoryStyle.text)}>
                    {employee.department || employee.category}
                </Badge>
            </div>

            {/* Location */}
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{employee.city || '-'}</span>
            </div>

            {/* Gender */}
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
                {employee.gender === 'Male' ? '♂' : employee.gender === 'Female' ? '♀' : ''}
                <span>{employee.gender || '-'}</span>
            </div>

            {/* Actions */}
            <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            onEdit?.(employee);
                        }}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={(e) => {
                            e.stopPropagation();
                            onDelete?.(employee.id);
                        }}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}
