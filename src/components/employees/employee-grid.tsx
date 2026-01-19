'use client';

import { Employee, getEmployeeFullName } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Phone, Mail, MoreVertical, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface EmployeeGridViewProps {
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

export function EmployeeGridView({ employees, onEmployeeClick, onEditEmployee, onDeleteEmployee }: EmployeeGridViewProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6">
            {employees.map((employee) => {
                const fullName = getEmployeeFullName(employee);
                const categoryStyle = categoryColors[employee.category] || categoryColors['Employee'];

                return (
                    <div
                        key={employee.id}
                        className="bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => onEmployeeClick(employee.id)}
                    >
                        {/* Card Header */}
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                    <AvatarImage src={employee.avatar} alt={fullName} />
                                    <AvatarFallback>{fullName.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <div className="font-medium">{fullName}</div>
                                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                        <MapPin className="h-3 w-3" />
                                        {employee.city || 'Austin'}
                                    </div>
                                </div>
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={(e) => {
                                        e.stopPropagation();
                                        onEmployeeClick(employee.id);
                                    }}>View Details</DropdownMenuItem>
                                    <DropdownMenuItem onClick={(e) => {
                                        e.stopPropagation();
                                        onEditEmployee?.(employee);
                                    }}>Edit</DropdownMenuItem>
                                    <DropdownMenuItem 
                                        className="text-destructive"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDeleteEmployee?.(employee.id);
                                        }}
                                    >Delete</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        {/* Category Badge */}
                        <Badge className={cn('border-0 mb-3', categoryStyle.bg, categoryStyle.text)}>
                            {employee.category}
                        </Badge>

                        {/* Contact Info */}
                        <div className="space-y-2 text-sm text-muted-foreground mb-4">
                            <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4" />
                                <span className="underline underline-offset-2 decoration-muted-foreground/40 truncate">
                                    {employee.email}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4" />
                                {employee.phone || '(671) 555-0110'}
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
    );
}
