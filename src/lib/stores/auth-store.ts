'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getSupabaseClient } from '@/lib/supabase/client';
import { USE_SUPABASE } from '@/lib/db/database';
import { db } from '@/lib/db/dexie';
import { User } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { employeesRepository } from '@/lib/db/repositories/supabase/employees';
import { supabaseWorkspacesRepository } from '@/lib/db/repositories/supabase/workspaces';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { ensureCurrentUserInUsersTable } from '@/lib/db/sync-auth-users';

interface AuthState {
    currentUser: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    hasHydrated: boolean;

    // Actions
    login: (email: string, password: string) => Promise<void>;
    signup: (userData: Omit<User, 'id'>) => Promise<{ requiresEmailConfirmation: boolean }>;
    sendOtp: (email: string) => Promise<void>;
    verifyOtp: (email: string, token: string) => Promise<void>;
    resendOtp: (email: string) => Promise<void>;
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
                            // Check for user already registered error
                            if (error.message.includes('already registered') || error.message.includes('already exists')) {
                                throw new Error('This email is already registered. Please sign in instead.');
                            }
                            throw new Error(error.message);
                        }

                        if (!data.user) {
                            throw new Error('Signup failed');
                        }

                        // Supabase returns a user but NO session when email confirmation is enabled.
                        // It also returns a user with an identities array when the email is already
                        // registered but unconfirmed — in that case identities is empty.
                        const isExistingUnconfirmed =
                            data.user.identities && data.user.identities.length === 0;

                        if (isExistingUnconfirmed) {
                            // User already signed up but never confirmed — resend OTP instead of erroring
                            console.warn('[signup] User already exists but unconfirmed, resending OTP.');
                        }

                        // Don't create user profile here — defer to verifyOtp()
                        // Supabase auth.signUp() creates the auth user.
                        // The user profile in the 'users' table will be created only after
                        // successful OTP verification to ensure email ownership.

                        // Send OTP via our custom Nodemailer-based endpoint
                        // This is our email_verification OTP — separate from the workspace_invite OTP
                        const otpResponse = await fetch('/api/send-otp', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email: userData.email }),
                        });

                        if (!otpResponse.ok) {
                            const otpResult = await otpResponse.json();
                            console.error('Failed to send OTP email:', otpResult);
                            throw new Error('Account created but failed to send verification email. Please try resending the OTP.');
                        }

                        console.log('✅ Signup successful. OTP sent via Nodemailer.');

                        // Always require email confirmation via our custom OTP flow
                        // (regardless of Supabase session state)
                        set({ currentUser: null, isAuthenticated: false });

                        return { requiresEmailConfirmation: true };
                    }

                    // Dexie fallback
                    await delay(1000);

                    const existingUser = await db.users.where('email').equals(userData.email).first();
                    if (existingUser) {
                        throw new Error('This email is already registered. Please sign in instead.');
                    }

                    const newUser: User = {
                        id: uuidv4(),
                        ...userData,
                    };

                    await db.users.add(newUser);
                    set({ currentUser: newUser, isAuthenticated: true });

                    return { requiresEmailConfirmation: false };
                } finally {
                    set({ isLoading: false });
                }
            },

            sendOtp: async (email: string) => {
                set({ isLoading: true });
                try {
                    if (USE_SUPABASE) {
                        const supabase = getSupabaseClient();
                        if (!supabase) throw new Error('Supabase client not available');

                        // Use our custom OTP API (Nodemailer-based)
                        const response = await fetch('/api/send-otp', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email }),
                        });

                        if (!response.ok) {
                            const result = await response.json();
                            throw new Error(result.error || 'Failed to send OTP');
                        }
                    } else {
                        // Dexie doesn't support OTP
                        throw new Error('OTP not supported in offline mode');
                    }
                } finally {
                    set({ isLoading: false });
                }
            },

            verifyOtp: async (email: string, token: string) => {
                set({ isLoading: true });
                try {
                    if (USE_SUPABASE) {
                        const supabase = getSupabaseClient();
                        if (!supabase) throw new Error('Supabase client not available');

                        // Step 1: Verify OTP via our custom API
                        const verifyResponse = await fetch('/api/verify-otp', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email, otp: token }),
                        });

                        const verifyResult = await verifyResponse.json();

                        if (!verifyResponse.ok) {
                            throw new Error(verifyResult.error || 'Invalid or expired OTP');
                        }

                        // Step 2: Now sign in the user (email is confirmed by the API)
                        // We need the password from the URL search params or session storage
                        const pendingPassword = sessionStorage.getItem('pending_signup_password');

                        let session = null;
                        let signedInUser = null;

                        if (pendingPassword) {
                            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                                email,
                                password: pendingPassword,
                            });

                            if (signInError) {
                                console.error('Error signing in after OTP verification:', signInError);
                                throw new Error('Email verified but sign-in failed. Please go to the sign-in page and log in with your credentials.');
                            }

                            session = signInData.session;
                            signedInUser = signInData.user;

                            // Clean up stored password
                            sessionStorage.removeItem('pending_signup_password');
                        } else {
                            throw new Error('Email verified successfully! Please go to the sign-in page and log in with your credentials.');
                        }

                        if (!signedInUser) {
                            throw new Error('Verification succeeded but could not sign in. Please try signing in manually.');
                        }

                        // Step 3: Create user profile in the 'users' table
                        const userName = signedInUser.user_metadata?.name || email.split('@')[0];
                        const userAvatar = signedInUser.user_metadata?.avatar || null;
                        const userRole = signedInUser.user_metadata?.role || 'member';

                        const { data: existingProfile } = await supabase
                            .from('users')
                            .select('*')
                            .eq('id', signedInUser.id)
                            .single();

                        let userProfile = existingProfile;

                        if (!existingProfile) {
                            const { data: newProfile, error: profileError } = await supabase
                                .from('users')
                                .insert({
                                    id: signedInUser.id,
                                    name: userName,
                                    email: email,
                                    avatar: userAvatar,
                                    role: userRole,
                                })
                                .select()
                                .single();

                            if (profileError) {
                                if (profileError.code === '23505') {
                                    console.warn('User profile already exists, fetching it');
                                    const { data: refetched } = await supabase
                                        .from('users')
                                        .select('*')
                                        .eq('id', signedInUser.id)
                                        .single();
                                    userProfile = refetched;
                                } else {
                                    console.error('Error creating user profile after OTP verification:', profileError);
                                }
                            } else {
                                userProfile = newProfile;
                            }
                        }

                        // Step 4: Auto-create default workspace if needed.
                        // Skip workspace creation if the user arrived via an invitation link —
                        // they will join an existing workspace on the /invitation page instead.
                        //
                        // Detect invitation: the signup page stores the invitation token in
                        // sessionStorage under 'pending_invitation_token' before redirecting
                        // to /verify-otp, so we can check it here reliably.
                        const pendingInvitationToken = typeof window !== 'undefined'
                            ? sessionStorage.getItem('pending_invitation_token')
                            : null;
                        const isInvitedUser = !!pendingInvitationToken;

                        if (session) {
                            try {
                                const { data: existingWorkspaces } = await supabase
                                    .from('workspace_memberships')
                                    .select('workspace_id')
                                    .eq('user_id', signedInUser.id)
                                    .eq('status', 'active');

                                if (!existingWorkspaces || existingWorkspaces.length === 0) {
                                    if (!isInvitedUser) {
                                        // Regular signup — auto-create a personal workspace
                                        const firstName = userName?.split(' ')[0] || 'My';
                                        const workspaceName = `${firstName}'s Workspace`;
                                        const workspace = await supabaseWorkspacesRepository.create(
                                            workspaceName,
                                            signedInUser.id
                                        );
                                        if (workspace) {
                                            useWorkspaceStore.getState().setCurrentWorkspace(workspace);
                                            useWorkspaceStore.setState({
                                                userWorkspaces: [workspace],
                                            });
                                        }
                                    }
                                    // else: invited user — skip default workspace creation;
                                    // they will join via /invitation OTP page
                                } else {
                                    // Already has active workspace memberships — load them into store
                                    await useWorkspaceStore.getState().fetchUserWorkspaces(signedInUser.id);
                                }
                            } catch (wsError) {
                                console.warn('Could not auto-create default workspace:', wsError);
                            }
                        }

                        // Fetch employee record for name/avatar/role merging
                        const employee = await employeesRepository.getByEmail(email);

                        // Clean up invitation token from sessionStorage now that workspace step is done
                        if (typeof window !== 'undefined') {
                            sessionStorage.removeItem('pending_invitation_token');
                        }

                        const employeeName = (employee?.firstName && employee?.lastName)
                            ? `${employee.firstName} ${employee.lastName}`.trim()
                            : undefined;

                        const user = supabaseUserToUser(signedInUser, {
                            ...employee,
                            has_completed_onboarding: userProfile?.has_completed_onboarding,
                            onboarding_completed_at: userProfile?.onboarding_completed_at,
                            name: userProfile?.name || employeeName,
                            avatar: userProfile?.avatar || employee?.avatar,
                        });

                        set({ currentUser: user, isAuthenticated: true });
                    } else {
                        throw new Error('OTP not supported in offline mode');
                    }
                } finally {
                    set({ isLoading: false });
                }
            },

            resendOtp: async (email: string) => {
                // Resend is the same as sendOtp
                return get().sendOtp(email);
            },

            logout: async () => {
                if (USE_SUPABASE) {
                    const supabase = getSupabaseClient();
                    if (supabase) {
                        await supabase.auth.signOut();
                    }
                }
                useWorkspaceStore.getState().resetWorkspaceState();
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
                    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

                    // Handle session errors gracefully
                    if (sessionError) {
                        console.error('Error fetching session:', sessionError);

                        // Only clear auth state for certain errors
                        if (sessionError.message?.includes('refresh_token') ||
                            sessionError.message?.includes('Invalid') ||
                            sessionError.message?.includes('expired')) {
                            set({ currentUser: null, isAuthenticated: false });
                        }
                        return;
                    }

                    if (session?.user) {
                        // Ensure user exists in users table for messaging system
                        await ensureCurrentUserInUsersTable().catch(err => {
                            console.warn('Could not sync user to users table:', err);
                        });

                        // Get user profile from users table (contains hasCompletedOnboarding)
                        const { data: userProfile, error: profileError } = await supabase
                            .from('users')
                            .select('*')
                            .eq('id', session.user.id)
                            .single();

                        if (profileError && profileError.code !== 'PGRST116') {
                            // PGRST116 is "not found" - that's okay for new users
                            console.warn('Error fetching user profile:', profileError);
                        }

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

                    // Don't clear auth state on network errors
                    // This prevents logout during temporary network issues
                    if (error instanceof Error && !error.message.includes('Failed to fetch')) {
                        set({ currentUser: null, isAuthenticated: false });
                    }
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
