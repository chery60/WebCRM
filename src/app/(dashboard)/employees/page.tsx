'use client';

import { useEffect, useState } from 'react';
import { useEmployeeStore, EmployeeViewType, DepartmentFilter } from '@/lib/stores/employee-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    ArrowUpDown,
    Filter,
    Plus,
    Search,
    List,
    LayoutGrid,
    Table2,
    Columns3,
    X,
    Check,
    MoreVertical,
    Settings,
    Building2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DepartmentManagementModal } from '@/components/employees/department-management-modal';

// Import view components
import { EmployeeListView } from '@/components/employees/employee-list';
import { EmployeeKanbanView } from '@/components/employees/employee-kanban';
import { EmployeeTableView } from '@/components/employees/employee-table';
import { EmployeeGridView } from '@/components/employees/employee-grid';
import { EmployeeEmptyState } from '@/components/employees/employee-empty-state';
import { AddEmployeeDialog } from '@/components/employees/add-employee-dialog';
import { EmployeeDetailsDialog } from '@/components/employees/employee-details-dialog';
import { EditEmployeeDialog } from '@/components/employees/edit-employee-dialog';

// View configuration
const viewOptions: { id: EmployeeViewType; label: string; icon: React.ReactNode }[] = [
    { id: 'list', label: 'List', icon: <List className="h-4 w-4" /> },
    { id: 'kanban', label: 'Kanban', icon: <Columns3 className="h-4 w-4" /> },
    { id: 'table', label: 'Table', icon: <Table2 className="h-4 w-4" /> },
    { id: 'grid', label: 'Grid', icon: <LayoutGrid className="h-4 w-4" /> },
];

export default function EmployeesPage() {
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [employeeToEdit, setEmployeeToEdit] = useState<any>(null);
    const [departmentModalOpen, setDepartmentModalOpen] = useState(false);

    // Get current workspace for filtering
    const { currentWorkspace } = useWorkspaceStore();

    const {
        employees,
        isLoading,
        activeView,
        activeDepartment,
        selectedEmployee,
        visibleDepartments,
        setActiveView,
        setActiveDepartment,
        setSelectedEmployee,
        fetchEmployees,
        getFilteredEmployees,
        deleteEmployee,
        deleteEmployees,
        activateEmployees,
        deactivateEmployees,
        getAllDepartments,
        addDepartmentToTabs,
        removeDepartmentFromTabs,
    } = useEmployeeStore();

    // Get all available departments (including from employees)
    const allDepartments = getAllDepartments();
    // Departments not yet added to tabs
    const availableDepartments = allDepartments.filter(d => !visibleDepartments.includes(d));

    const { currentUser, isAuthenticated } = useAuthStore();
    const isAdmin = currentUser?.role === 'admin';

    // Fetch employees when workspace changes
    useEffect(() => {
        if (currentWorkspace?.id) {
            fetchEmployees(currentWorkspace.id);
        }
    }, [fetchEmployees, currentWorkspace?.id]);

    const filteredEmployees = getFilteredEmployees();
    const isEmpty = !isLoading && filteredEmployees.length === 0;

    // Handle employee click to show details
    const handleEmployeeClick = (employeeId: string) => {
        const employee = employees.find(e => e.id === employeeId);
        if (employee) {
            setSelectedEmployee(employee);
            setDetailsDialogOpen(true);
        }
    };

    // Handle edit employee
    const handleEditEmployee = (employee: any) => {
        setEmployeeToEdit(employee);
        setEditDialogOpen(true);
    };

    // Handle delete employee
    const handleDeleteEmployee = async (employeeId: string) => {
        if (confirm('Are you sure you want to delete this employee?')) {
            await deleteEmployee(employeeId, currentUser?.role || 'member');
            if (currentWorkspace?.id) fetchEmployees(currentWorkspace.id);
        }
    };

    // Handle bulk activate employees
    const handleActivateEmployees = async (ids: string[]) => {
        await activateEmployees(ids, currentUser?.role || 'member');
        if (currentWorkspace?.id) fetchEmployees(currentWorkspace.id);
    };

    // Handle bulk deactivate employees
    const handleDeactivateEmployees = async (ids: string[]) => {
        if (confirm(`Are you sure you want to deactivate ${ids.length} employee(s)? They will not be able to log in.`)) {
            await deactivateEmployees(ids, currentUser?.role || 'member', currentUser?.id || '');
            if (currentWorkspace?.id) fetchEmployees(currentWorkspace.id);
        }
    };

    // Handle bulk delete employees
    const handleDeleteEmployees = async (ids: string[]) => {
        if (confirm(`Are you sure you want to delete ${ids.length} employee(s)? All their data will be removed.`)) {
            await deleteEmployees(ids, currentUser?.role || 'member');
            if (currentWorkspace?.id) fetchEmployees(currentWorkspace.id);
        }
    };

    // Render the active view
    const renderView = () => {
        if (isLoading) {
            return (
                <div className="flex items-center justify-center h-64">
                    <div className="text-muted-foreground">Loading employees...</div>
                </div>
            );
        }

        if (isEmpty) {
            return <EmployeeEmptyState onAddClick={() => setAddDialogOpen(true)} isAdmin={isAdmin} />;
        }

        switch (activeView) {
            case 'list':
                return <EmployeeListView
                    employees={filteredEmployees}
                    onEmployeeClick={handleEmployeeClick}
                    onEditEmployee={handleEditEmployee}
                    onDeleteEmployee={handleDeleteEmployee}
                    onActivateEmployees={handleActivateEmployees}
                    onDeactivateEmployees={handleDeactivateEmployees}
                    onDeleteEmployees={handleDeleteEmployees}
                    isAdmin={isAdmin}
                />;
            case 'kanban':
                return <EmployeeKanbanView employees={filteredEmployees} onEmployeeClick={handleEmployeeClick} onEditEmployee={handleEditEmployee} onDeleteEmployee={handleDeleteEmployee} />;
            case 'table':
                return <EmployeeTableView employees={filteredEmployees} onEmployeeClick={handleEmployeeClick} onEditEmployee={handleEditEmployee} onDeleteEmployee={handleDeleteEmployee} />;
            case 'grid':
                return <EmployeeGridView employees={filteredEmployees} onEmployeeClick={handleEmployeeClick} onEditEmployee={handleEditEmployee} onDeleteEmployee={handleDeleteEmployee} />;
            default:
                return <EmployeeListView
                    employees={filteredEmployees}
                    onEmployeeClick={handleEmployeeClick}
                    onEditEmployee={handleEditEmployee}
                    onDeleteEmployee={handleDeleteEmployee}
                    onActivateEmployees={handleActivateEmployees}
                    onDeactivateEmployees={handleDeactivateEmployees}
                    onDeleteEmployees={handleDeleteEmployees}
                    isAdmin={isAdmin}
                />;
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Page Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
                <div className="flex items-center gap-6">
                    <h1 className="text-2xl font-medium">Employees</h1>

                    {/* View Toggle */}
                    <div className="flex items-center border rounded-lg p-1 bg-muted/30">
                        {viewOptions.map((option) => (
                            <button
                                key={option.id}
                                onClick={() => setActiveView(option.id)}
                                className={cn(
                                    'flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                                    activeView === option.id
                                        ? 'bg-white text-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground'
                                )}
                            >
                                {option.icon}
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Header Actions */}
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" className="gap-2">
                        <ArrowUpDown className="h-4 w-4" />
                        Sort By
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2">
                        <Filter className="h-4 w-4" />
                        Filter
                    </Button>
                    {isAdmin && (
                        <>
                            <Button onClick={() => setAddDialogOpen(true)} className="gap-2">
                                <Plus className="h-4 w-4" />
                                Invite Employee
                            </Button>
                            <AddEmployeeDialog
                                open={addDialogOpen}
                                onOpenChange={setAddDialogOpen}
                                onSuccess={() => { if (currentWorkspace?.id) fetchEmployees(currentWorkspace.id); }}
                            />
                        </>
                    )}
                </div>
            </div>

            {/* Department Tabs & Add Department */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/20">
                <div className="flex items-center gap-2">
                    {/* All Employees Tab */}
                    <button
                        onClick={() => setActiveDepartment('all')}
                        className={cn(
                            'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                            activeDepartment === 'all'
                                ? 'bg-gray-900 text-white'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        )}
                    >
                        All Employees
                    </button>

                    {/* Dynamic Department Tabs */}
                    {visibleDepartments.map((dept) => (
                        <div key={dept} className="relative group">
                            <button
                                onClick={() => setActiveDepartment(dept)}
                                className={cn(
                                    'px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2',
                                    activeDepartment === dept
                                        ? 'bg-gray-900 text-white'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                                )}
                            >
                                {dept}
                                {isAdmin && (
                                    <span
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeDepartmentFromTabs(dept);
                                        }}
                                        className={cn(
                                            'opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-full p-0.5',
                                            activeDepartment === dept
                                                ? 'hover:bg-white/20'
                                                : 'hover:bg-muted-foreground/20'
                                        )}
                                    >
                                        <X className="h-3 w-3" />
                                    </span>
                                )}
                            </button>
                        </div>
                    ))}
                </div>

                {isAdmin && (
                    <div className="flex items-center gap-1">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
                                    <Plus className="h-4 w-4" />
                                    Add Department
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                {availableDepartments.length > 0 ? (
                                    <>
                                        {availableDepartments.map((dept) => (
                                            <DropdownMenuItem
                                                key={dept}
                                                onClick={() => addDepartmentToTabs(dept)}
                                                className="cursor-pointer"
                                            >
                                                <Check className="h-4 w-4 mr-2 opacity-0" />
                                                {dept}
                                            </DropdownMenuItem>
                                        ))}
                                    </>
                                ) : (
                                    <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                                        All departments are visible
                                    </div>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Three-dot menu for department management */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setDepartmentModalOpen(true)}>
                                    <Building2 className="h-4 w-4 mr-2" />
                                    Manage Departments
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )}
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-auto p-6">
                {renderView()}
            </div>

            {/* Employee Details Dialog */}
            {selectedEmployee && (
                <EmployeeDetailsDialog
                    open={detailsDialogOpen}
                    onOpenChange={setDetailsDialogOpen}
                    employee={selectedEmployee}
                />
            )}

            {/* Edit Employee Dialog */}
            {employeeToEdit && (
                <EditEmployeeDialog
                    open={editDialogOpen}
                    onOpenChange={setEditDialogOpen}
                    employee={employeeToEdit}
                    onSuccess={() => {
                        if (currentWorkspace?.id) fetchEmployees(currentWorkspace.id);
                        setEditDialogOpen(false);
                    }}
                />
            )}

            {/* Department Management Modal */}
            <DepartmentManagementModal
                open={departmentModalOpen}
                onOpenChange={setDepartmentModalOpen}
            />
        </div>
    );
}
