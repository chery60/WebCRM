'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getSupabaseClient } from '@/lib/supabase/client';
import { USE_SUPABASE } from '@/lib/db/database';
import { db } from '@/lib/db/dexie';
import { User } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { employeesRepository } from '@/lib/db/repositories/supabase/employees';

interface AuthState {
    currentUser: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    hasHydrated: boolean;

    // Actions
    login: (email: string, password: string) => Promise<void>;
    signup: (userData: Omit<User, 'id'>) => Promise<void>;
    logout: () => Promise<void>;
    updateProfile: (data: Partial<User>) => Promise<void>;
    setHasHydrated: (state: boolean) => void;
    refreshSession: () => Promise<void>;
}

// Helper to simulate API delay (for Dexie fallback)
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Convert Supabase user to our User type
function supabaseUserToUser(supabaseUser: any, profile?: any): User {
    return {
        id: supabaseUser.id,
        name: profile?.name || supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'User',
        email: supabaseUser.email || '',
        avatar: profile?.avatar || supabaseUser.user_metadata?.avatar,
        role: profile?.role || 'member',
        phone: profile?.phone,
        department: profile?.department,
        location: profile?.location,
        gender: profile?.gender,
        hasCompletedOnboarding: profile?.has_completed_onboarding || false,
        onboardingCompletedAt: profile?.onboarding_completed_at ? new Date(profile.onboarding_completed_at) : undefined,
    };
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            currentUser: null,
            isAuthenticated: false,
            isLoading: false,
            hasHydrated: false,

            setHasHydrated: (state) => set({ hasHydrated: state }),

            login: async (email: string, password: string) => {
                set({ isLoading: true });

                try {
                    if (USE_SUPABASE) {
                        // Supabase authentication
                        const supabase = getSupabaseClient();
                        if (!supabase) throw new Error('Supabase client not available');

                        const { data, error } = await supabase.auth.signInWithPassword({
                            email,
                            password,
                        });

                        if (error) {
                            throw new Error(error.message);
                        }

                        if (!data.user) {
                            throw new Error('Login failed');
                        }

                        // Get user profile from users table (contains hasCompletedOnboarding)
                        const { data: userProfile } = await supabase
                            .from('users')
                            .select('*')
                            .eq('id', data.user.id)
                            .single();

                        // Get employee data for additional checks
                        const employee = await employeesRepository.getByEmail(email);

                        if (employee && !employee.isActive) {
                            await supabase.auth.signOut();
                            throw new Error('Your account has been deactivated. Please contact your administrator.');
                        }

                        // Update last activity
                        if (employee) {
                            await employeesRepository.updateLastActivity(employee.id);
                        }

                        // Merge user profile data with employee data, prioritizing user profile for onboarding flags
                        // Build name: prefer userProfile.name, then employee name, then fallback handled by supabaseUserToUser
                        const employeeName = (employee?.firstName && employee?.lastName)
                            ? `${employee.firstName} ${employee.lastName}`.trim()
                            : undefined;

                        const user = supabaseUserToUser(data.user, {
                            ...employee,
                            has_completed_onboarding: userProfile?.has_completed_onboarding,
                            onboarding_completed_at: userProfile?.onboarding_completed_at,
                            name: userProfile?.name || employeeName,
                            avatar: userProfile?.avatar || employee?.avatar,
                        });
                        set({ currentUser: user, isAuthenticated: true });
                    } else {
                        // Dexie fallback (original implementation)
                        await delay(800);

                        const user = await db.users.where('email').equals(email).first();

                        if (!user) {
                            throw new Error('User not found');
                        }

                        if (user.password && user.password !== password) {
                            throw new Error('Invalid password');
                        }

                        const employee = await db.employees.where('email').equals(email).first();
                        if (employee && !employee.isActive) {
                            throw new Error('Your account has been deactivated. Please contact your administrator.');
                        }

                        set({ currentUser: user, isAuthenticated: true });
                    }
                } finally {
                    set({ isLoading: false });
                }
            },

            signup: async (userData) => {
                set({ isLoading: true });

                try {
                    if (USE_SUPABASE) {
                        // Supabase signup
                        const supabase = getSupabaseClient();
                        if (!supabase) throw new Error('Supabase client not available');

                        const { data, error } = await supabase.auth.signUp({
                            email: userData.email,
                            password: userData.password || '',
                            options: {
                                data: {
                                    name: userData.name,
                                    avatar: userData.avatar,
                                },
                            },
                        });

                        if (error) {
                            throw new Error(error.message);
                        }

                        if (!data.user) {
                            throw new Error('Signup failed');
                        }

                        // Create user profile in users table
                        const { error: profileError } = await supabase
                            .from('users')
                            .upsert({
                                id: data.user.id,
                                name: userData.name,
                                email: userData.email,
                                avatar: userData.avatar,
                                role: userData.role || 'member',
                            });

                        if (profileError) {
                            console.error('Error creating user profile:', profileError);
                            console.error('Error details:', JSON.stringify(profileError, null, 2));
                        }

                        const user: User = {
                            id: data.user.id,
                            ...userData,
                        };

                        set({ currentUser: user, isAuthenticated: true });
                    } else {
                        // Dexie fallback
                        await delay(1000);

                        const existingUser = await db.users.where('email').equals(userData.email).first();
                        if (existingUser) {
                            throw new Error('User already exists');
                        }

                        const newUser: User = {
                            id: uuidv4(),
                            ...userData,
                        };

                        await db.users.add(newUser);
                        set({ currentUser: newUser, isAuthenticated: true });
                    }
                } finally {
                    set({ isLoading: false });
                }
            },

            logout: async () => {
                if (USE_SUPABASE) {
                    const supabase = getSupabaseClient();
                    if (supabase) {
                        await supabase.auth.signOut();
                    }
                }
                set({ currentUser: null, isAuthenticated: false });
            },

            updateProfile: async (data) => {
                const { currentUser } = get();
                if (!currentUser) return;

                set({ isLoading: true });
                try {
                    if (USE_SUPABASE) {
                        const supabase = getSupabaseClient();
                        if (!supabase) throw new Error('Supabase client not available');

                        // Update user metadata in Supabase Auth
                        if (data.name || data.avatar) {
                            await supabase.auth.updateUser({
                                data: {
                                    name: data.name,
                                    avatar: data.avatar,
                                },
                            });
                        }

                        // Update user profile in database
                        const updateData: Record<string, any> = {};
                        if (data.name !== undefined) updateData.name = data.name;
                        if (data.avatar !== undefined) updateData.avatar = data.avatar;
                        if (data.phone !== undefined) updateData.phone = data.phone;
                        if (data.department !== undefined) updateData.department = data.department;
                        if (data.location !== undefined) updateData.location = data.location;
                        if (data.gender !== undefined) updateData.gender = data.gender;
                        if (data.hasCompletedOnboarding !== undefined) updateData.has_completed_onboarding = data.hasCompletedOnboarding;
                        if (data.onboardingCompletedAt !== undefined) updateData.onboarding_completed_at = data.onboardingCompletedAt;

                        const { error } = await supabase
                            .from('users')
                            .update(updateData)
                            .eq('id', currentUser.id);

                        if (error) {
                            console.error('Error updating profile:', error);
                            throw error;
                        }
                    } else {
                        // Dexie fallback
                        await db.users.update(currentUser.id, data);
                    }

                    set({
                        currentUser: { ...currentUser, ...data }
                    });
                } finally {
                    set({ isLoading: false });
                }
            },

            refreshSession: async () => {
                if (!USE_SUPABASE) return;

                const supabase = getSupabaseClient();
                if (!supabase) return;

                try {
                    const { data: { session } } = await supabase.auth.getSession();

                    if (session?.user) {
                        // Get user profile from users table (contains hasCompletedOnboarding)
                        const { data: userProfile } = await supabase
                            .from('users')
                            .select('*')
                            .eq('id', session.user.id)
                            .single();

                        const employee = await employeesRepository.getByEmail(session.user.email || '');

                        // Build name: prefer userProfile.name, then employee name
                        const employeeName = (employee?.firstName && employee?.lastName)
                            ? `${employee.firstName} ${employee.lastName}`.trim()
                            : undefined;

                        // Merge user profile data with employee data
                        const user = supabaseUserToUser(session.user, {
                            ...employee,
                            has_completed_onboarding: userProfile?.has_completed_onboarding,
                            onboarding_completed_at: userProfile?.onboarding_completed_at,
                            name: userProfile?.name || employeeName,
                            avatar: userProfile?.avatar || employee?.avatar,
                        });
                        set({ currentUser: user, isAuthenticated: true });
                    } else {
                        set({ currentUser: null, isAuthenticated: false });
                    }
                } catch (error) {
                    console.error('Error refreshing session:', error);
                }
            },
        }),
        {
            name: 'venture-crm-auth',
            partialize: (state) => ({
                currentUser: state.currentUser,
                isAuthenticated: state.isAuthenticated
            }),
            onRehydrateStorage: () => (state) => {
                state?.setHasHydrated(true);
                // Refresh session from Supabase on rehydration
                if (USE_SUPABASE) {
                    state?.refreshSession();
                }
            },
        }
    )
);
