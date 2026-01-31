'use client';

import { useAuthStore } from '@/lib/stores/auth-store';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading, hasHydrated, currentUser } = useAuthStore();
    const { fetchUserWorkspaces, currentWorkspace, userWorkspaces } = useWorkspaceStore();
    const router = useRouter();
    const pathname = usePathname();
    const workspacesFetchedRef = useRef(false);

    // Fetch workspaces when user is authenticated
    useEffect(() => {
        if (hasHydrated && isAuthenticated && currentUser && !workspacesFetchedRef.current) {
            workspacesFetchedRef.current = true;
            fetchUserWorkspaces(currentUser.id);
        }
        
        // Reset the ref when user logs out
        if (!isAuthenticated) {
            workspacesFetchedRef.current = false;
        }
    }, [hasHydrated, isAuthenticated, currentUser, fetchUserWorkspaces]);

    useEffect(() => {
        // Only redirect if we've finished hydrating and loading
        if (hasHydrated && !isLoading) {
            if (!isAuthenticated) {
                // Not authenticated, redirect to signin
                router.push('/signin');
            } else if (currentUser && !currentUser.hasCompletedOnboarding) {
                // Authenticated but hasn't completed onboarding
                // Don't redirect if already on onboarding page
                if (pathname !== '/onboarding') {
                    router.push('/onboarding');
                }
            }
        }
    }, [isAuthenticated, isLoading, hasHydrated, currentUser, router, pathname]);


    // Show nothing (or loader) until hydrated and loaded
    if (!hasHydrated || (!isAuthenticated && !isLoading)) {
        return null; // Or return a loading spinner
    }

    // If user hasn't completed onboarding and not on onboarding page, show nothing
    if (currentUser && !currentUser.hasCompletedOnboarding && pathname !== '/onboarding') {
        return null;
    }

    return <>{children}</>;
}

