'use client';

import { useState } from 'react';
import { Employee } from '@/types';
import { EmployeeRow } from './employee-row';
import { EmployeeBulkActionBar } from './employee-bulk-action-bar';

interface EmployeeListViewProps {
    employees: Employee[];
    onEmployeeClick: (id: string) => void;
    onEditEmployee?: (employee: Employee) => void;
    onDeleteEmployee?: (id: string) => void;
    onActivateEmployees?: (ids: string[]) => void;
    onDeactivateEmployees?: (ids: string[]) => void;
    onDeleteEmployees?: (ids: string[]) => void;
    isAdmin: boolean;
}

export function EmployeeListView({ 
    employees, 
    onEmployeeClick, 
    onEditEmployee, 
    onDeleteEmployee,
    onActivateEmployees,
    onDeactivateEmployees,
    onDeleteEmployees,
    isAdmin 
}: EmployeeListViewProps) {
    const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(new Set());

    const handleToggleSelect = (id: string, selected: boolean) => {
        const newSelected = new Set(selectedEmployeeIds);
        if (selected) {
            newSelected.add(id);
        } else {
            newSelected.delete(id);
        }
        setSelectedEmployeeIds(newSelected);
    };

    const handleClearSelection = () => {
        setSelectedEmployeeIds(new Set());
    };

    const handleBulkActivate = () => {
        if (onActivateEmployees) {
            onActivateEmployees(Array.from(selectedEmployeeIds));
        }
        handleClearSelection();
    };

    const handleBulkDeactivate = () => {
        if (onDeactivateEmployees) {
            onDeactivateEmployees(Array.from(selectedEmployeeIds));
        }
        handleClearSelection();
    };

    const handleBulkDelete = () => {
        if (onDeleteEmployees) {
            onDeleteEmployees(Array.from(selectedEmployeeIds));
        }
        handleClearSelection();
    };

    return (
        <div className="pb-24">
            {/* Employee Rows */}
            <div className="divide-y divide-border/50">
                {employees.map((employee) => (
                    <EmployeeRow
                        key={employee.id}
                        employee={employee}
                        onClick={() => onEmployeeClick(employee.id)}
                        onEdit={onEditEmployee}
                        onDelete={onDeleteEmployee}
                        isSelected={selectedEmployeeIds.has(employee.id)}
                        onToggleSelect={(selected) => handleToggleSelect(employee.id, selected)}
                    />
                ))}
            </div>

            {/* Bulk Action Bar */}
            <EmployeeBulkActionBar
                selectedCount={selectedEmployeeIds.size}
                onClearSelection={handleClearSelection}
                onActivate={handleBulkActivate}
                onDeactivate={handleBulkDeactivate}
                onDelete={handleBulkDelete}
                isAdmin={isAdmin}
            />
        </div>
    );
}

