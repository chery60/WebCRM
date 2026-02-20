'use client';

import { useEffect, useState } from 'react';
import { getConfigValidation } from '@/lib/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Wifi, WifiOff } from 'lucide-react';

/**
 * Development-only component that shows Supabase connection status
 * This helps developers quickly identify configuration issues
 */
export function SupabaseStatusIndicator() {
    const [status, setStatus] = useState<{
        isConfigValid: boolean;
        errors: string[];
        isOnline: boolean;
    }>({
        isConfigValid: true,
        errors: [],
        isOnline: true,
    });

    useEffect(() => {
        // Only show in development
        if (process.env.NODE_ENV !== 'development') {
            return;
        }

        // Check configuration
        const validation = getConfigValidation();
        
        // Check network status
        const updateOnlineStatus = () => {
            setStatus(prev => ({
                ...prev,
                isOnline: navigator.onLine,
            }));
        };

        setStatus({
            isConfigValid: validation.isValid,
            errors: validation.errors,
            isOnline: navigator.onLine,
        });

        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);

        return () => {
            window.removeEventListener('online', updateOnlineStatus);
            window.removeEventListener('offline', updateOnlineStatus);
        };
    }, []);

    // Don't render in production
    if (process.env.NODE_ENV !== 'development') {
        return null;
    }

    // Don't render if everything is fine
    if (status.isConfigValid && status.isOnline) {
        return null;
    }

    return (
        <div className="fixed bottom-4 right-4 z-50 max-w-md">
            {!status.isOnline && (
                <Alert variant="destructive" className="mb-2">
                    <WifiOff className="h-4 w-4" />
                    <AlertDescription>
                        No internet connection. Some features may not work.
                    </AlertDescription>
                </Alert>
            )}

            {!status.isConfigValid && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        <strong>Supabase Configuration Error</strong>
                        <ul className="mt-2 list-disc list-inside text-xs">
                            {status.errors.map((error, i) => (
                                <li key={i}>{error}</li>
                            ))}
                        </ul>
                        <p className="mt-2 text-xs">
                            Please check your <code>.env.local</code> file.
                        </p>
                    </AlertDescription>
                </Alert>
            )}
        </div>
    );
}
