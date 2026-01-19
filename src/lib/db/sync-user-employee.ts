import { db } from './dexie';
import { User, Employee } from '@/types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Ensures that a logged-in user has a corresponding employee record.
 * If the user doesn't exist as an employee, creates one automatically.
 * This is called after successful login to sync user -> employee data.
 */
export async function syncUserToEmployee(user: User): Promise<Employee> {
  try {
    // Check if employee record already exists
    const existingEmployee = await db.employees.get(user.id);
    
    if (existingEmployee && !existingEmployee.isDeleted) {
      // Update last activity
      await db.employees.update(user.id, {
        lastActivityAt: new Date(),
      });
      return existingEmployee;
    }
    
    // If employee doesn't exist or is deleted, create/restore the employee record
    const nameParts = user.name.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || '';
    
    // Generate employee ID if not exists
    const employeeId = existingEmployee?.employeeId || `US${Math.floor(100000 + Math.random() * 900000)}`;
    
    const employeeData: Employee = {
      id: user.id, // Use the same ID as the user
      firstName,
      lastName,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      status: 'active',
      category: 'Employee',
      employeeId,
      department: user.department || 'General',
      isActive: true, // Employee can log in
      phone: user.phone,
      phoneCountryCode: '+1',
      birthDate: undefined,
      gender: user.gender as 'Male' | 'Female' | 'Other' | undefined,
      occupation: undefined,
      personalId: undefined,
      country: user.location || 'United States',
      city: undefined,
      address: undefined,
      invitationToken: undefined,
      invitedAt: undefined,
      invitedBy: undefined,
      passwordCreated: true, // User can login, so password exists
      passwordCreatedAt: new Date(),
      lastActivityAt: new Date(),
      createdAt: existingEmployee?.createdAt || new Date(),
      updatedAt: new Date(),
      isDeleted: false,
    };
    
    // Use put instead of add to handle both create and update
    await db.employees.put(employeeData);
    
    console.log(`✅ Synced user ${user.email} to employee record`);
    return employeeData;
  } catch (error) {
    console.error('Error syncing user to employee:', error);
    throw error;
  }
}

/**
 * Updates an employee record when user profile is updated
 */
export async function syncEmployeeToUser(userId: string, userData: Partial<User>): Promise<void> {
  try {
    const employee = await db.employees.get(userId);
    if (!employee) return;
    
    const updates: Partial<Employee> = {
      updatedAt: new Date(),
    };
    
    if (userData.name) {
      const nameParts = userData.name.split(' ');
      updates.firstName = nameParts[0];
      updates.lastName = nameParts.slice(1).join(' ') || '';
    }
    
    if (userData.email) updates.email = userData.email;
    if (userData.avatar) updates.avatar = userData.avatar;
    if (userData.role) updates.role = userData.role;
    if (userData.department) updates.department = userData.department;
    if (userData.phone) updates.phone = userData.phone;
    if (userData.location) updates.country = userData.location;
    if (userData.gender) updates.gender = userData.gender as 'Male' | 'Female' | 'Other';
    
    await db.employees.update(userId, updates);
    console.log(`✅ Synced employee record for user ${userId}`);
  } catch (error) {
    console.error('Error syncing employee to user:', error);
  }
}
