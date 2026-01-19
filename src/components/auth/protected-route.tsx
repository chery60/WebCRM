'use client';

import { useAuthStore } from '@/lib/stores/auth-store';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading, hasHydrated } = useAuthStore();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        // Only redirect if we've finished hydrating and loading, and still not authenticated
        if (hasHydrated && !isLoading && !isAuthenticated) {
            router.push('/signin');
        }
    }, [isAuthenticated, isLoading, hasHydrated, router]);


    // Show nothing (or loader) until hydrated and loaded
    if (!hasHydrated || (!isAuthenticated && !isLoading)) {
        return null; // Or return a loading spinner
    }

    return <>{children}</>;
}
