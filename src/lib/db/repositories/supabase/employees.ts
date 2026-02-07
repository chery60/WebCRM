'use client';

import { getSupabaseClient } from '@/lib/supabase/client';
import type { Employee, EmployeeFormData, EmployeeStatus, EmployeeCategory, getEmployeeFullName } from '@/types';

// Helper to convert database row to Employee type
function rowToEmployee(row: any): Employee {
    return {
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        avatar: row.avatar,
        role: row.role,
        status: row.status,
        category: row.category,
        employeeId: row.employee_id,
        department: row.department,
        isActive: row.is_active,
        phone: row.phone,
        phoneCountryCode: row.phone_country_code,
        birthDate: row.birth_date ? new Date(row.birth_date) : undefined,
        gender: row.gender,
        occupation: row.occupation,
        personalId: row.personal_id,
        country: row.country,
        city: row.city,
        address: row.address,
        invitationToken: row.invitation_token,
        invitedAt: row.invited_at ? new Date(row.invited_at) : undefined,
        invitedBy: row.invited_by,
        passwordCreated: row.password_created,
        passwordCreatedAt: row.password_created_at ? new Date(row.password_created_at) : undefined,
        lastActivityAt: row.last_activity_at ? new Date(row.last_activity_at) : undefined,
        deactivatedAt: row.deactivated_at ? new Date(row.deactivated_at) : undefined,
        deactivatedBy: row.deactivated_by,
        workspaceId: row.workspace_id,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        isDeleted: row.is_deleted,
    };
}

// Helper to convert Employee to database row
function employeeToRow(employee: Partial<Employee>): Record<string, any> {
    const row: Record<string, any> = {};

    if (employee.firstName !== undefined) row.first_name = employee.firstName;
    if (employee.lastName !== undefined) row.last_name = employee.lastName;
    if (employee.email !== undefined) row.email = employee.email;
    if (employee.avatar !== undefined) row.avatar = employee.avatar;
    if (employee.role !== undefined) row.role = employee.role;
    if (employee.status !== undefined) row.status = employee.status;
    if (employee.category !== undefined) row.category = employee.category;
    if (employee.employeeId !== undefined) row.employee_id = employee.employeeId;
    if (employee.department !== undefined) row.department = employee.department;
    if (employee.isActive !== undefined) row.is_active = employee.isActive;
    if (employee.phone !== undefined) row.phone = employee.phone;
    if (employee.phoneCountryCode !== undefined) row.phone_country_code = employee.phoneCountryCode;
    if (employee.birthDate !== undefined) row.birth_date = employee.birthDate?.toISOString().split('T')[0];
    if (employee.gender !== undefined) row.gender = employee.gender;
    if (employee.occupation !== undefined) row.occupation = employee.occupation;
    if (employee.personalId !== undefined) row.personal_id = employee.personalId;
    if (employee.country !== undefined) row.country = employee.country;
    if (employee.city !== undefined) row.city = employee.city;
    if (employee.address !== undefined) row.address = employee.address;
    if (employee.invitationToken !== undefined) row.invitation_token = employee.invitationToken;
    if (employee.invitedAt !== undefined) row.invited_at = employee.invitedAt?.toISOString();
    if (employee.invitedBy !== undefined) row.invited_by = employee.invitedBy;
    if (employee.passwordCreated !== undefined) row.password_created = employee.passwordCreated;
    if (employee.passwordCreatedAt !== undefined) row.password_created_at = employee.passwordCreatedAt?.toISOString();
    if (employee.lastActivityAt !== undefined) row.last_activity_at = employee.lastActivityAt?.toISOString();
    if (employee.deactivatedAt !== undefined) row.deactivated_at = employee.deactivatedAt?.toISOString();
    if (employee.deactivatedBy !== undefined) row.deactivated_by = employee.deactivatedBy;
    if (employee.workspaceId !== undefined) row.workspace_id = employee.workspaceId;
    if (employee.isDeleted !== undefined) row.is_deleted = employee.isDeleted;

    return row;
}

// Generate a unique employee ID (e.g., "US219410")
function generateEmployeeId(): string {
    const prefix = 'US';
    const number = Math.floor(100000 + Math.random() * 900000);
    return `${prefix}${number}`;
}

export const employeesRepository = {
    // Get all employees for a workspace
    async getAll(workspaceId?: string): Promise<Employee[]> {
        const supabase = getSupabaseClient();
        if (!supabase) return [];

        let query = supabase
            .from('employees')
            .select('*')
            .eq('is_deleted', false);

        // SECURITY: Filter by workspace - strict mode
        if (workspaceId) {
            query = query.eq('workspace_id', workspaceId);
        } else {
            // If no workspace provided, return empty to prevent data leaks
            console.warn('[Employees Repository] No workspace provided - returning empty list');
            return [];
        }

        const { data, error } = await query.order('first_name');

        if (error) {
            console.error('[Employees Repository] Error fetching employees:', error);
            return [];
        }

        const employees = (data || []).map(rowToEmployee);
        console.log(`[Employees Repository] Fetched ${employees.length} employees for workspace: ${workspaceId}`);
        return employees;
    },

    // Get employee by ID
    async getById(id: string): Promise<Employee | undefined> {
        const supabase = getSupabaseClient();
        if (!supabase) return undefined;

        const { data, error } = await supabase
            .from('employees')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !data) {
            console.error('Error fetching employee:', error);
            return undefined;
        }

        return rowToEmployee(data);
    },

    // Get employee by email
    async getByEmail(email: string): Promise<Employee | undefined> {
        const supabase = getSupabaseClient();
        if (!supabase) return undefined;

        const { data, error } = await supabase
            .from('employees')
            .select('*')
            .eq('email', email)
            .single();

        if (error || !data) {
            return undefined;
        }

        return rowToEmployee(data);
    },

    // Create a new employee (requires workspaceId for data isolation)
    async create(data: EmployeeFormData, invitedBy: string): Promise<Employee | null> {
        const supabase = getSupabaseClient();
        if (!supabase) return null;

        // SECURITY: workspace_id is REQUIRED
        if (!data.workspaceId) {
            console.error('[Employees Repository] Attempted to create employee without workspace_id:', { email: data.email });
            throw new Error('Workspace ID is required to create an employee. Please ensure you have a workspace selected.');
        }

        console.log(`[Employees Repository] Creating employee "${data.email}" in workspace: ${data.workspaceId}`);

        // Check if email already exists
        const existing = await this.getByEmail(data.email);
        if (existing) {
            console.error('[Employees Repository] Employee with this email already exists');
            return null;
        }

        const employeeData = {
            first_name: data.firstName,
            last_name: data.lastName,
            email: data.email,
            avatar: data.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.firstName + ' ' + data.lastName)}&background=random`,
            role: data.role || 'member',
            status: 'pending' as EmployeeStatus,
            category: data.category || 'Employee',
            employee_id: generateEmployeeId(),
            department: data.department,
            is_active: true,
            phone: data.phone,
            phone_country_code: data.phoneCountryCode || '+1',
            birth_date: data.birthDate?.toISOString().split('T')[0],
            gender: data.gender,
            occupation: data.occupation,
            personal_id: data.personalId,
            country: data.country,
            city: data.city,
            address: data.address,
            workspace_id: data.workspaceId,
            invitation_token: crypto.randomUUID().replace(/-/g, ''),
            invited_at: new Date().toISOString(),
            invited_by: invitedBy,
            password_created: false,
            is_deleted: false,
        };

        const { data: insertedData, error } = await supabase
            .from('employees')
            .insert(employeeData)
            .select()
            .single();

        if (error || !insertedData) {
            console.error('[Employees Repository] Error creating employee:', error);
            return null;
        }

        console.log(`[Employees Repository] Successfully created employee: ${insertedData.id}`);
        return rowToEmployee(insertedData);
    },

    // Update an employee
    async update(id: string, updates: Partial<EmployeeFormData>): Promise<Employee | undefined> {
        const supabase = getSupabaseClient();
        if (!supabase) return undefined;

        const row = employeeToRow(updates as Partial<Employee>);

        // Don't make an update call if there's nothing to update
        if (Object.keys(row).length === 0) {
            return this.getById(id);
        }

        const { data, error } = await supabase
            .from('employees')
            .update(row)
            .eq('id', id)
            .select()
            .single();

        if (error || !data) {
            console.error('Error updating employee:', error?.message || error?.code || JSON.stringify(error));
            return undefined;
        }

        return rowToEmployee(data);
    },

    // Soft delete an employee
    async delete(id: string): Promise<boolean> {
        const supabase = getSupabaseClient();
        if (!supabase) return false;

        const { error } = await supabase
            .from('employees')
            .update({ is_deleted: true, is_active: false })
            .eq('id', id);

        if (error) {
            console.error('Error deleting employee:', error);
            return false;
        }

        return true;
    },

    // Bulk delete employees
    async deleteMany(ids: string[]): Promise<boolean> {
        const supabase = getSupabaseClient();
        if (!supabase) return false;

        const { error } = await supabase
            .from('employees')
            .update({ is_deleted: true, is_active: false })
            .in('id', ids);

        if (error) {
            console.error('Error bulk deleting employees:', error);
            return false;
        }

        return true;
    },

    // Update employee status
    async setStatus(id: string, status: EmployeeStatus): Promise<boolean> {
        const supabase = getSupabaseClient();
        if (!supabase) return false;

        const { error } = await supabase
            .from('employees')
            .update({ status })
            .eq('id', id);

        if (error) {
            console.error('Error updating employee status:', error);
            return false;
        }

        return true;
    },

    // Activate an employee
    async activate(id: string): Promise<boolean> {
        const supabase = getSupabaseClient();
        if (!supabase) return false;

        const { error } = await supabase
            .from('employees')
            .update({
                is_active: true,
                deactivated_at: null,
                deactivated_by: null,
            })
            .eq('id', id);

        if (error) {
            console.error('Error activating employee:', error);
            return false;
        }

        return true;
    },

    // Deactivate an employee
    async deactivate(id: string, deactivatedBy: string): Promise<boolean> {
        const supabase = getSupabaseClient();
        if (!supabase) return false;

        const { error } = await supabase
            .from('employees')
            .update({
                is_active: false,
                deactivated_at: new Date().toISOString(),
                deactivated_by: deactivatedBy,
            })
            .eq('id', id);

        if (error) {
            console.error('Error deactivating employee:', error);
            return false;
        }

        return true;
    },

    // Bulk activate employees
    async activateMany(ids: string[]): Promise<boolean> {
        const supabase = getSupabaseClient();
        if (!supabase) return false;

        const { error } = await supabase
            .from('employees')
            .update({
                is_active: true,
                deactivated_at: null,
                deactivated_by: null,
            })
            .in('id', ids);

        if (error) {
            console.error('Error bulk activating employees:', error);
            return false;
        }

        return true;
    },

    // Bulk deactivate employees
    async deactivateMany(ids: string[], deactivatedBy: string): Promise<boolean> {
        const supabase = getSupabaseClient();
        if (!supabase) return false;

        const { error } = await supabase
            .from('employees')
            .update({
                is_active: false,
                deactivated_at: new Date().toISOString(),
                deactivated_by: deactivatedBy,
            })
            .in('id', ids);

        if (error) {
            console.error('Error bulk deactivating employees:', error);
            return false;
        }

        return true;
    },

    // Update last activity
    async updateLastActivity(id: string): Promise<void> {
        const supabase = getSupabaseClient();
        if (!supabase) return;

        await supabase
            .from('employees')
            .update({ last_activity_at: new Date().toISOString() })
            .eq('id', id);
    },
};
