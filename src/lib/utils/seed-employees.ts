// Utility script to set up test data for employees module
import { db } from '../db/dexie';
import { Employee } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const testEmployees: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>[] = [
    {
        firstName: 'Sai',
        lastName: 'Charan',
        email: 'kc60488charan@gmail.com',
        employeeId: 'US219410',
        role: 'admin',
        status: 'active',
        category: 'Employee',
        department: 'HR',
        isActive: true,
        phone: '(555) 123-4567',
        phoneCountryCode: '+1',
        gender: 'Male',
        occupation: 'HR Manager',
        country: 'United States',
        city: 'Austin',
        address: '123 Main St',
        avatar: 'https://ui-avatars.com/api/?name=Sai+Charan&background=random',
        passwordCreated: true,
        isDeleted: false,
    },
    {
        firstName: 'Sarah',
        lastName: 'Johnson',
        email: 'sarah.johnson@venture.com',
        employeeId: 'US219411',
        role: 'admin',
        status: 'active',
        category: 'Employee',
        department: 'Design',
        isActive: true,
        phone: '(555) 234-5678',
        phoneCountryCode: '+1',
        gender: 'Female',
        occupation: 'Design Director',
        country: 'United States',
        city: 'Austin',
        address: '456 Oak Ave',
        avatar: 'https://ui-avatars.com/api/?name=Sarah+Johnson&background=random',
        passwordCreated: true,
        isDeleted: false,
    },
    {
        firstName: 'Michael',
        lastName: 'Chen',
        email: 'michael.chen@venture.com',
        employeeId: 'US219412',
        role: 'member',
        status: 'active',
        category: 'Employee',
        department: 'Product',
        isActive: true,
        phone: '(555) 345-6789',
        phoneCountryCode: '+1',
        gender: 'Male',
        occupation: 'Product Manager',
        country: 'United States',
        city: 'Austin',
        address: '789 Pine Rd',
        avatar: 'https://ui-avatars.com/api/?name=Michael+Chen&background=random',
        passwordCreated: true,
        isDeleted: false,
    },
    {
        firstName: 'Emily',
        lastName: 'Rodriguez',
        email: 'emily.rodriguez@venture.com',
        employeeId: 'US219413',
        role: 'member',
        status: 'active',
        category: 'Employee',
        department: 'Sales',
        isActive: true,
        phone: '(555) 456-7890',
        phoneCountryCode: '+1',
        gender: 'Female',
        occupation: 'Sales Executive',
        country: 'United States',
        city: 'Austin',
        address: '321 Elm St',
        avatar: 'https://ui-avatars.com/api/?name=Emily+Rodriguez&background=random',
        passwordCreated: true,
        isDeleted: false,
    },
    {
        firstName: 'David',
        lastName: 'Kim',
        email: 'david.kim@venture.com',
        employeeId: 'US219414',
        role: 'member',
        status: 'active',
        category: 'Employee',
        department: 'Design',
        isActive: true,
        phone: '(555) 567-8901',
        phoneCountryCode: '+1',
        gender: 'Male',
        occupation: 'UI Designer',
        country: 'United States',
        city: 'Austin',
        address: '654 Maple Dr',
        avatar: 'https://ui-avatars.com/api/?name=David+Kim&background=random',
        passwordCreated: true,
        isDeleted: false,
    },
    {
        firstName: 'Jessica',
        lastName: 'Taylor',
        email: 'jessica.taylor@venture.com',
        employeeId: 'US219415',
        role: 'member',
        status: 'pending',
        category: 'Employee',
        department: 'Product',
        isActive: true,
        phone: '(555) 678-9012',
        phoneCountryCode: '+1',
        gender: 'Female',
        occupation: 'Product Designer',
        country: 'United States',
        city: 'Austin',
        invitationToken: uuidv4().replace(/-/g, ''),
        invitedAt: new Date(),
        invitedBy: '677669e1-c9bd-4916-8ea2-417e65cf2b98',
        passwordCreated: false,
        isDeleted: false,
    },
];

export async function seedEmployees() {
    try {
        // Clear existing employees
        await db.employees.clear();

        // Add test employees
        for (const employeeData of testEmployees) {
            const employee: Employee = {
                ...employeeData,
                id: uuidv4(),
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            await db.employees.add(employee);
        }

        console.log('✅ Successfully seeded test employees');
        return true;
    } catch (error) {
        console.error('❌ Error seeding employees:', error);
        return false;
    }
}

// Helper to update current user to admin
export async function setCurrentUserAsAdmin() {
    try {
        const authData = localStorage.getItem('venture-crm-auth');
        if (authData) {
            const parsed = JSON.parse(authData);
            if (parsed.state?.currentUser) {
                parsed.state.currentUser.role = 'admin';
                localStorage.setItem('venture-crm-auth', JSON.stringify(parsed));
                console.log('✅ Current user role updated to admin');
                return true;
            }
        }
        return false;
    } catch (error) {
        console.error('❌ Error updating user role:', error);
        return false;
    }
}
