'use client';

import { create } from 'zustand';
import { db } from '@/lib/db/dexie';
import { USE_SUPABASE } from '@/lib/db/database';
import { employeesRepository } from '@/lib/db/repositories/supabase/employees';
import { Employee, EmployeeFormData, EmployeeStatus, EmployeeCategory, getEmployeeFullName } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';

// View types for the employees page
export type EmployeeViewType = 'list' | 'kanban' | 'table' | 'grid';

// Department filter options
export type DepartmentFilter = 'all' | string;

// Default departments that are always available
export const DEFAULT_DEPARTMENTS = ['Design', 'Product', 'Sales', 'Engineering', 'Marketing', 'HR'];

// LocalStorage keys
const STORAGE_KEYS = {
    VISIBLE_DEPARTMENTS: 'venture-crm-visible-departments',
    CUSTOM_DEPARTMENTS: 'venture-crm-custom-departments',
};

// Load from localStorage
function loadFromStorage<T>(key: string, defaultValue: T): T {
    if (typeof window === 'undefined') return defaultValue;
    try {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : defaultValue;
    } catch {
        return defaultValue;
    }
}

// Save to localStorage
function saveToStorage<T>(key: string, value: T): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error('Error saving to localStorage:', error);
    }
}

interface EmployeeState {
    // Data
    employees: Employee[];
    departments: string[]; // All departments (default + custom)
    visibleDepartments: string[]; // Departments shown in tabs
    isLoading: boolean;
    error: string | null;

    // UI State
    activeView: EmployeeViewType;
    activeDepartment: DepartmentFilter;
    selectedEmployee: Employee | null;
    searchQuery: string;

    // Actions
    setActiveView: (view: EmployeeViewType) => void;
    setActiveDepartment: (dept: DepartmentFilter) => void;
    setSelectedEmployee: (employee: Employee | null) => void;
    setSearchQuery: (query: string) => void;

    // Department Management
    addDepartment: (department: string) => void;
    addDepartmentToTabs: (department: string) => void;
    removeDepartmentFromTabs: (department: string) => void;
    deleteDepartment: (department: string) => void;
    renameDepartment: (oldName: string, newName: string) => void;
    getAllDepartments: () => string[];
    loadDepartmentsFromStorage: () => void;

    // CRUD Operations
    fetchEmployees: (workspaceId?: string) => Promise<void>;
    addEmployee: (data: EmployeeFormData, currentUserRole: string, currentUserId: string, workspaceId?: string) => Promise<Employee | null>;
    updateEmployee: (id: string, data: Partial<EmployeeFormData>, currentUserRole: string) => Promise<boolean>;
    deleteEmployee: (id: string, currentUserRole: string) => Promise<boolean>;
    deleteEmployees: (ids: string[], currentUserRole: string) => Promise<boolean>;
    setEmployeeStatus: (id: string, status: EmployeeStatus, currentUserRole: string) => Promise<boolean>;
    activateEmployee: (id: string, currentUserRole: string) => Promise<boolean>;
    deactivateEmployee: (id: string, currentUserRole: string, currentUserId: string) => Promise<boolean>;
    activateEmployees: (ids: string[], currentUserRole: string) => Promise<boolean>;
    deactivateEmployees: (ids: string[], currentUserRole: string, currentUserId: string) => Promise<boolean>;

    // Invitation
    sendInvitation: (employeeId: string, currentUserRole: string) => Promise<boolean>;

    // Helpers
    getFilteredEmployees: () => Employee[];
}

// Generate a unique employee ID (e.g., "US219410")
function generateEmployeeId(): string {
    const prefix = 'US';
    const number = Math.floor(100000 + Math.random() * 900000);
    return `${prefix}${number}`;
}

// Generate invitation token
function generateInvitationToken(): string {
    return uuidv4().replace(/-/g, '');
}

export const useEmployeeStore = create<EmployeeState>((set, get) => ({
    // Initial state
    employees: [],
    departments: [...DEFAULT_DEPARTMENTS, ...loadFromStorage<string[]>(STORAGE_KEYS.CUSTOM_DEPARTMENTS, [])],
    visibleDepartments: loadFromStorage<string[]>(STORAGE_KEYS.VISIBLE_DEPARTMENTS, ['Design', 'Product', 'Sales']),
    isLoading: false,
    error: null,
    activeView: 'list',
    activeDepartment: 'all',
    selectedEmployee: null,
    searchQuery: '',

    // UI Actions
    setActiveView: (view) => set({ activeView: view }),
    setActiveDepartment: (dept) => set({ activeDepartment: dept }),
    setSelectedEmployee: (employee) => set({ selectedEmployee: employee }),
    setSearchQuery: (query) => set({ searchQuery: query }),

    // Department Management
    addDepartment: (department) => {
        const trimmed = department.trim();
        if (!trimmed) return;

        set((state) => {
            if (state.departments.includes(trimmed)) return state;
            const newDepartments = [...state.departments, trimmed].sort();

            // Save custom departments to localStorage
            const customDepts = newDepartments.filter(d => !DEFAULT_DEPARTMENTS.includes(d));
            saveToStorage(STORAGE_KEYS.CUSTOM_DEPARTMENTS, customDepts);

            return { departments: newDepartments };
        });
    },

    addDepartmentToTabs: (department) => {
        const trimmed = department.trim();
        if (!trimmed) return;

        set((state) => {
            // Add to departments if not exists
            const newDepartments = state.departments.includes(trimmed)
                ? state.departments
                : [...state.departments, trimmed].sort();

            // Add to visible tabs if not already there
            if (state.visibleDepartments.includes(trimmed)) {
                return { departments: newDepartments };
            }

            const newVisibleDepartments = [...state.visibleDepartments, trimmed];

            // Save to localStorage
            saveToStorage(STORAGE_KEYS.VISIBLE_DEPARTMENTS, newVisibleDepartments);
            const customDepts = newDepartments.filter(d => !DEFAULT_DEPARTMENTS.includes(d));
            saveToStorage(STORAGE_KEYS.CUSTOM_DEPARTMENTS, customDepts);

            return {
                departments: newDepartments,
                visibleDepartments: newVisibleDepartments,
            };
        });
    },

    removeDepartmentFromTabs: (department) => {
        set((state) => {
            const newVisibleDepartments = state.visibleDepartments.filter(d => d !== department);
            saveToStorage(STORAGE_KEYS.VISIBLE_DEPARTMENTS, newVisibleDepartments);

            return {
                visibleDepartments: newVisibleDepartments,
                activeDepartment: state.activeDepartment === department ? 'all' : state.activeDepartment,
            };
        });
    },

    deleteDepartment: (department) => {
        // Can't delete default departments
        if (DEFAULT_DEPARTMENTS.includes(department)) {
            toast.error('Cannot delete default departments');
            return;
        }

        set((state) => {
            const newDepartments = state.departments.filter(d => d !== department);
            const newVisibleDepartments = state.visibleDepartments.filter(d => d !== department);

            // Save to localStorage
            const customDepts = newDepartments.filter(d => !DEFAULT_DEPARTMENTS.includes(d));
            saveToStorage(STORAGE_KEYS.CUSTOM_DEPARTMENTS, customDepts);
            saveToStorage(STORAGE_KEYS.VISIBLE_DEPARTMENTS, newVisibleDepartments);

            return {
                departments: newDepartments,
                visibleDepartments: newVisibleDepartments,
                activeDepartment: state.activeDepartment === department ? 'all' : state.activeDepartment,
            };
        });

        toast.success(`Department "${department}" deleted`);
    },

    renameDepartment: (oldName, newName) => {
        const trimmedNew = newName.trim();
        if (!trimmedNew || oldName === trimmedNew) return;

        // Can't rename default departments
        if (DEFAULT_DEPARTMENTS.includes(oldName)) {
            toast.error('Cannot rename default departments');
            return;
        }

        set((state) => {
            if (state.departments.includes(trimmedNew)) {
                toast.error('A department with this name already exists');
                return state;
            }

            const newDepartments = state.departments.map(d => d === oldName ? trimmedNew : d).sort();
            const newVisibleDepartments = state.visibleDepartments.map(d => d === oldName ? trimmedNew : d);

            // Save to localStorage
            const customDepts = newDepartments.filter(d => !DEFAULT_DEPARTMENTS.includes(d));
            saveToStorage(STORAGE_KEYS.CUSTOM_DEPARTMENTS, customDepts);
            saveToStorage(STORAGE_KEYS.VISIBLE_DEPARTMENTS, newVisibleDepartments);

            return {
                departments: newDepartments,
                visibleDepartments: newVisibleDepartments,
                activeDepartment: state.activeDepartment === oldName ? trimmedNew : state.activeDepartment,
            };
        });

        toast.success(`Department renamed to "${trimmedNew}"`);
    },

    getAllDepartments: () => {
        const { departments, employees } = get();
        // Combine default departments with any custom ones from employees
        const employeeDepartments = employees
            .map(e => e.department)
            .filter((d): d is string => !!d);

        const allDepts = new Set([...departments, ...employeeDepartments]);
        return Array.from(allDepts).sort();
    },

    loadDepartmentsFromStorage: () => {
        const customDepts = loadFromStorage<string[]>(STORAGE_KEYS.CUSTOM_DEPARTMENTS, []);
        const visibleDepts = loadFromStorage<string[]>(STORAGE_KEYS.VISIBLE_DEPARTMENTS, ['Design', 'Product', 'Sales']);

        set({
            departments: [...DEFAULT_DEPARTMENTS, ...customDepts],
            visibleDepartments: visibleDepts,
        });
    },

    // Fetch all employees for a workspace
    fetchEmployees: async (workspaceId?: string) => {
        set({ isLoading: true, error: null });
        try {
            let activeEmployees: Employee[];

            if (USE_SUPABASE) {
                // Use Supabase repository with workspace filter
                activeEmployees = await employeesRepository.getAll(workspaceId);
            } else {
                // Use Dexie (fallback - no workspace filtering available)
                const allEmployees = await db.employees.toArray();
                activeEmployees = allEmployees
                    .filter(e => !e.isDeleted)
                    .sort((a, b) => getEmployeeFullName(a).localeCompare(getEmployeeFullName(b)));
            }

            set({ employees: activeEmployees, isLoading: false });
        } catch (error) {
            console.error('[Employee Store] Error fetching employees:', error);
            set({ error: 'Failed to fetch employees', isLoading: false });

            // If table doesn't exist yet, just set empty array
            set({ employees: [], isLoading: false });
        }
    },

    // Add new employee (admin only)
    addEmployee: async (data, currentUserRole, currentUserId, workspaceId) => {
        // Check permissions
        if (currentUserRole !== 'admin') {
            toast.error('Only admins can add employees');
            return null;
        }

        set({ isLoading: true });
        try {
            let newEmployee: Employee | null;

            if (USE_SUPABASE) {
                // Use Supabase repository
                const existing = await employeesRepository.getByEmail(data.email);
                if (existing) {
                    toast.error('An employee with this email already exists');
                    set({ isLoading: false });
                    return null;
                }
                // Pass workspaceId in the data
                newEmployee = await employeesRepository.create({ ...data, workspaceId }, currentUserId);
            } else {
                // Use Dexie (fallback)
                const existing = await db.employees.where('email').equals(data.email).first();
                if (existing) {
                    toast.error('An employee with this email already exists');
                    set({ isLoading: false });
                    return null;
                }

                const now = new Date();
                newEmployee = {
                    id: uuidv4(),
                    firstName: data.firstName,
                    lastName: data.lastName,
                    email: data.email,
                    avatar: data.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.firstName + ' ' + data.lastName)}&background=random`,
                    role: data.role || 'member',
                    status: 'pending',
                    category: data.category || 'Employee',
                    employeeId: generateEmployeeId(),
                    department: data.department,
                    isActive: true,
                    phone: data.phone,
                    phoneCountryCode: data.phoneCountryCode || '+1',
                    birthDate: data.birthDate,
                    gender: data.gender,
                    occupation: data.occupation,
                    personalId: data.personalId,
                    country: data.country,
                    city: data.city,
                    address: data.address,
                    invitationToken: generateInvitationToken(),
                    invitedAt: now,
                    invitedBy: currentUserId,
                    passwordCreated: false,
                    createdAt: now,
                    updatedAt: now,
                    isDeleted: false,
                };

                await db.employees.add(newEmployee);
            }

            if (!newEmployee) {
                toast.error('Failed to add employee');
                set({ isLoading: false });
                return null;
            }

            // Update local state
            set((state) => ({
                employees: [...state.employees, newEmployee!].sort((a, b) =>
                    getEmployeeFullName(a).localeCompare(getEmployeeFullName(b))
                ),
                isLoading: false,
            }));

            toast.success('Employee added successfully');

            // Auto-send invitation
            get().sendInvitation(newEmployee.id, currentUserRole);

            return newEmployee;
        } catch (error) {
            console.error('Error adding employee:', error);
            toast.error('Failed to add employee');
            set({ isLoading: false });
            return null;
        }
    },

    // Update employee (admin only)
    updateEmployee: async (id, data, currentUserRole) => {
        if (currentUserRole !== 'admin') {
            toast.error('Only admins can edit employees');
            return false;
        }

        set({ isLoading: true });
        try {
            const updates: Partial<Employee> = {
                ...data,
                updatedAt: new Date(),
            };

            // Update avatar if name changed
            if (data.firstName || data.lastName) {
                const employee = await db.employees.get(id);
                if (employee) {
                    const newName = `${data.firstName || employee.firstName} ${data.lastName || employee.lastName}`;
                    updates.avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(newName)}&background=random`;
                }
            }

            await db.employees.update(id, updates);

            // Update local state
            set((state) => ({
                employees: state.employees.map((e) =>
                    e.id === id ? { ...e, ...updates } : e
                ),
                selectedEmployee: state.selectedEmployee?.id === id
                    ? { ...state.selectedEmployee, ...updates }
                    : state.selectedEmployee,
                isLoading: false,
            }));

            toast.success('Employee updated successfully');
            return true;
        } catch (error) {
            console.error('Error updating employee:', error);
            toast.error('Failed to update employee');
            set({ isLoading: false });
            return false;
        }
    },

    // Delete employee (admin only - soft delete, permanently removes all data)
    deleteEmployee: async (id, currentUserRole) => {
        if (currentUserRole !== 'admin') {
            toast.error('Only admins can delete employees');
            return false;
        }

        set({ isLoading: true });
        try {
            const employee = await db.employees.get(id);
            if (!employee) {
                toast.error('Employee not found');
                set({ isLoading: false });
                return false;
            }

            // Soft delete - marks as deleted but keeps data
            await db.employees.update(id, {
                isDeleted: true,
                updatedAt: new Date()
            });

            // Also deactivate the employee's account
            await db.employees.update(id, {
                isActive: false
            });

            // Remove from local state
            set((state) => ({
                employees: state.employees.filter((e) => e.id !== id),
                selectedEmployee: state.selectedEmployee?.id === id ? null : state.selectedEmployee,
                isLoading: false,
            }));

            toast.success(`${getEmployeeFullName(employee)} has been deleted and all data removed`);
            return true;
        } catch (error) {
            console.error('Error deleting employee:', error);
            toast.error('Failed to delete employee');
            set({ isLoading: false });
            return false;
        }
    },

    // Delete multiple employees (admin only)
    deleteEmployees: async (ids, currentUserRole) => {
        if (currentUserRole !== 'admin') {
            toast.error('Only admins can delete employees');
            return false;
        }

        set({ isLoading: true });
        try {
            const now = new Date();

            // Update all employees to deleted
            await Promise.all(
                ids.map(id =>
                    db.employees.update(id, {
                        isDeleted: true,
                        isActive: false,
                        updatedAt: now
                    })
                )
            );

            // Remove from local state
            set((state) => ({
                employees: state.employees.filter((e) => !ids.includes(e.id)),
                selectedEmployee: state.selectedEmployee && ids.includes(state.selectedEmployee.id)
                    ? null
                    : state.selectedEmployee,
                isLoading: false,
            }));

            toast.success(`${ids.length} employee(s) deleted successfully`);
            return true;
        } catch (error) {
            console.error('Error deleting employees:', error);
            toast.error('Failed to delete employees');
            set({ isLoading: false });
            return false;
        }
    },

    // Change employee status (admin only)
    setEmployeeStatus: async (id, status, currentUserRole) => {
        if (currentUserRole !== 'admin') {
            toast.error('Only admins can change employee status');
            return false;
        }

        try {
            await db.employees.update(id, {
                status,
                updatedAt: new Date()
            });

            // Update local state
            set((state) => ({
                employees: state.employees.map((e) =>
                    e.id === id ? { ...e, status, updatedAt: new Date() } : e
                ),
                selectedEmployee: state.selectedEmployee?.id === id
                    ? { ...state.selectedEmployee, status }
                    : state.selectedEmployee,
            }));

            toast.success(`Employee status changed to ${status}`);
            return true;
        } catch (error) {
            console.error('Error updating employee status:', error);
            toast.error('Failed to update employee status');
            return false;
        }
    },

    // Send invitation email (simulated)
    sendInvitation: async (employeeId, currentUserRole) => {
        if (currentUserRole !== 'admin') {
            toast.error('Only admins can send invitations');
            return false;
        }

        try {
            const employee = await db.employees.get(employeeId);
            if (!employee) {
                toast.error('Employee not found');
                return false;
            }

            // In a real app, this would call an API to send an email
            // For now, we'll simulate by showing a toast with the signup link
            const signupUrl = `${window.location.origin}/signup?token=${employee.invitationToken}`;

            console.log('=== INVITATION EMAIL (SIMULATED) ===');
            console.log(`To: ${employee.email}`);
            console.log(`Name: ${getEmployeeFullName(employee)}`);
            console.log(`Signup URL: ${signupUrl}`);
            console.log('====================================');

            toast.success(
                `Invitation sent to ${employee.email}`,
                {
                    description: 'Check console for signup link (simulated email)',
                    duration: 5000,
                }
            );

            return true;
        } catch (error) {
            console.error('Error sending invitation:', error);
            toast.error('Failed to send invitation');
            return false;
        }
    },

    // Activate employee (admin only)
    activateEmployee: async (id, currentUserRole) => {
        if (currentUserRole !== 'admin') {
            toast.error('Only admins can activate employees');
            return false;
        }

        try {
            const employee = await db.employees.get(id);
            if (!employee) {
                toast.error('Employee not found');
                return false;
            }

            await db.employees.update(id, {
                isActive: true,
                deactivatedAt: undefined,
                deactivatedBy: undefined,
                updatedAt: new Date()
            });

            // Update local state
            set((state) => ({
                employees: state.employees.map((e) =>
                    e.id === id ? { ...e, isActive: true, updatedAt: new Date() } : e
                ),
                selectedEmployee: state.selectedEmployee?.id === id
                    ? { ...state.selectedEmployee, isActive: true }
                    : state.selectedEmployee,
            }));

            toast.success(`${getEmployeeFullName(employee)} has been activated`);
            return true;
        } catch (error) {
            console.error('Error activating employee:', error);
            toast.error('Failed to activate employee');
            return false;
        }
    },

    // Deactivate employee (admin only)
    deactivateEmployee: async (id, currentUserRole, currentUserId) => {
        if (currentUserRole !== 'admin') {
            toast.error('Only admins can deactivate employees');
            return false;
        }

        try {
            const employee = await db.employees.get(id);
            if (!employee) {
                toast.error('Employee not found');
                return false;
            }

            const now = new Date();
            await db.employees.update(id, {
                isActive: false,
                deactivatedAt: now,
                deactivatedBy: currentUserId,
                updatedAt: now
            });

            // Update local state
            set((state) => ({
                employees: state.employees.map((e) =>
                    e.id === id ? { ...e, isActive: false, deactivatedAt: now, updatedAt: now } : e
                ),
                selectedEmployee: state.selectedEmployee?.id === id
                    ? { ...state.selectedEmployee, isActive: false, deactivatedAt: now }
                    : state.selectedEmployee,
            }));

            toast.success(`${getEmployeeFullName(employee)} has been deactivated and cannot log in`);
            return true;
        } catch (error) {
            console.error('Error deactivating employee:', error);
            toast.error('Failed to deactivate employee');
            return false;
        }
    },

    // Activate multiple employees (admin only)
    activateEmployees: async (ids, currentUserRole) => {
        if (currentUserRole !== 'admin') {
            toast.error('Only admins can activate employees');
            return false;
        }

        try {
            const now = new Date();

            // Update all employees to active
            await Promise.all(
                ids.map(id =>
                    db.employees.update(id, {
                        isActive: true,
                        deactivatedAt: undefined,
                        deactivatedBy: undefined,
                        updatedAt: now
                    })
                )
            );

            // Update local state
            set((state) => ({
                employees: state.employees.map((e) =>
                    ids.includes(e.id) ? { ...e, isActive: true, updatedAt: now } : e
                ),
            }));

            toast.success(`${ids.length} employee(s) activated successfully`);
            return true;
        } catch (error) {
            console.error('Error activating employees:', error);
            toast.error('Failed to activate employees');
            return false;
        }
    },

    // Deactivate multiple employees (admin only)
    deactivateEmployees: async (ids, currentUserRole, currentUserId) => {
        if (currentUserRole !== 'admin') {
            toast.error('Only admins can deactivate employees');
            return false;
        }

        try {
            const now = new Date();

            // Update all employees to inactive
            await Promise.all(
                ids.map(id =>
                    db.employees.update(id, {
                        isActive: false,
                        deactivatedAt: now,
                        deactivatedBy: currentUserId,
                        updatedAt: now
                    })
                )
            );

            // Update local state
            set((state) => ({
                employees: state.employees.map((e) =>
                    ids.includes(e.id) ? { ...e, isActive: false, deactivatedAt: now, updatedAt: now } : e
                ),
            }));

            toast.success(`${ids.length} employee(s) deactivated successfully`);
            return true;
        } catch (error) {
            console.error('Error deactivating employees:', error);
            toast.error('Failed to deactivate employees');
            return false;
        }
    },

    // Get filtered employees based on current filters
    getFilteredEmployees: () => {
        const { employees, activeDepartment, searchQuery } = get();

        let filtered = employees;

        // Filter by department
        if (activeDepartment !== 'all') {
            filtered = filtered.filter((e) => e.department === activeDepartment);
        }

        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter((e) =>
                getEmployeeFullName(e).toLowerCase().includes(query) ||
                e.email.toLowerCase().includes(query) ||
                e.department?.toLowerCase().includes(query) ||
                e.phone?.includes(query)
            );
        }

        return filtered;
    },
}));
