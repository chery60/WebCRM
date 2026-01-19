'use client';

import { Employee, getEmployeeFullName } from '@/types';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useEmployeeStore } from '@/lib/stores/employee-store';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
    Phone,
    Mail,
    MessageSquare,
    MoreHorizontal,
    Briefcase,
    MapPin,
    Calendar,
    User,
    Flag,
    Home
} from 'lucide-react';
import { format } from 'date-fns';

interface EmployeeDetailsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    employee: Employee;
}

export function EmployeeDetailsDialog({ open, onOpenChange, employee }: EmployeeDetailsDialogProps) {
    const fullName = getEmployeeFullName(employee);
    const { currentUser } = useAuthStore();
    const isAdmin = currentUser?.role === 'admin';

    // Format last activity
    const lastActivity = employee.lastActivityAt
        ? `Last Activity: ${format(employee.lastActivityAt, 'd')} days ago`
        : 'Last Activity: 2 days ago';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader className="sr-only">
                    <DialogTitle>Employee Details</DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Header with Avatar and Name */}
                    <div className="flex flex-col items-center text-center">
                        <Avatar className="h-20 w-20 mb-3">
                            <AvatarImage src={employee.avatar} alt={fullName} />
                            <AvatarFallback className="text-xl">{fullName.charAt(0)}</AvatarFallback>
                        </Avatar>

                        <h2 className="text-xl font-semibold">{fullName}</h2>

                        {/* Status Badge */}
                        <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                            <span className="w-2 h-2 rounded-full bg-green-500" />
                            {lastActivity}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-center gap-4">
                        <Button variant="outline" size="icon" className="h-12 w-12 rounded-full">
                            <Phone className="h-5 w-5" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-12 w-12 rounded-full">
                            <Mail className="h-5 w-5" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-12 w-12 rounded-full">
                            <MessageSquare className="h-5 w-5" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-12 w-12 rounded-full">
                            <MoreHorizontal className="h-5 w-5" />
                        </Button>
                    </div>

                    {/* Account Information */}
                    <div className="space-y-2">
                        <h3 className="text-sm font-medium text-muted-foreground">Account Information</h3>
                        <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                            <div className="flex items-center gap-3">
                                <Briefcase className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{employee.employeeId}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{employee.email}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{employee.phone || '(671) 555-0110'}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Briefcase className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{employee.occupation || employee.department || 'Marketing'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Personal Information */}
                    <div className="space-y-2">
                        <h3 className="text-sm font-medium text-muted-foreground">Personal Information</h3>
                        <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                            <div className="flex items-center gap-3">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">
                                    {employee.birthDate
                                        ? format(new Date(employee.birthDate), 'dd/MM/yyyy')
                                        : '14/07/1988'}
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{employee.gender || 'Female'}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Flag className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{employee.country || 'United States'}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{employee.city || 'Austin'}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Home className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{employee.address || 'Majestic Ave, 21 Tree St.'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
