/**
 * Supabase Error Handler
 * Centralized error handling and retry logic for Supabase operations
 */

export class SupabaseError extends Error {
    constructor(
        message: string,
        public code?: string,
        public status?: number,
        public originalError?: unknown
    ) {
        super(message);
        this.name = 'SupabaseError';
    }
}

export interface RetryOptions {
    maxRetries?: number;
    delayMs?: number;
    backoffMultiplier?: number;
    shouldRetry?: (error: unknown) => boolean;
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
    maxRetries: 3,
    delayMs: 1000,
    backoffMultiplier: 2,
    shouldRetry: (error: unknown) => {
        // Only retry network errors and 5xx server errors
        if (error instanceof Error) {
            const message = error.message.toLowerCase();
            return (
                message.includes('failed to fetch') ||
                message.includes('network') ||
                message.includes('timeout') ||
                message.includes('abort')
            );
        }
        return false;
    },
};

/**
 * Retry a Supabase operation with exponential backoff
 */
export async function withRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
    let lastError: unknown;

    for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;

            // Don't retry if this is the last attempt or if we shouldn't retry this error
            if (attempt === opts.maxRetries || !opts.shouldRetry(error)) {
                break;
            }

            // Calculate delay with exponential backoff
            const delay = opts.delayMs * Math.pow(opts.backoffMultiplier, attempt);
            
            console.warn(
                `Supabase operation failed (attempt ${attempt + 1}/${opts.maxRetries + 1}), retrying in ${delay}ms...`,
                error
            );

            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    // All retries failed
    throw lastError;
}

/**
 * Check if Supabase configuration is valid
 */
export function validateSupabaseConfig(): {
    isValid: boolean;
    errors: string[];
} {
    const errors: string[] = [];
    
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url) {
        errors.push('NEXT_PUBLIC_SUPABASE_URL is not defined');
    } else if (!url.startsWith('http')) {
        errors.push('NEXT_PUBLIC_SUPABASE_URL must be a valid URL');
    }

    if (!anonKey) {
        errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is not defined');
    } else if (!anonKey.startsWith('eyJ')) {
        errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY appears to be invalid (should be a JWT token starting with eyJ)');
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
}

/**
 * Handle Supabase auth errors gracefully
 */
export function handleAuthError(error: unknown): SupabaseError {
    if (error instanceof SupabaseError) {
        return error;
    }

    if (error instanceof Error) {
        // Network/fetch errors
        if (error.message.includes('Failed to fetch')) {
            return new SupabaseError(
                'Unable to connect to authentication server. Please check your internet connection.',
                'NETWORK_ERROR',
                0,
                error
            );
        }

        // Parse Supabase error responses
        const message = error.message;
        
        if (message.includes('Invalid API key')) {
            return new SupabaseError(
                'Authentication configuration error. Please contact support.',
                'INVALID_API_KEY',
                401,
                error
            );
        }

        if (message.includes('refresh_token')) {
            return new SupabaseError(
                'Your session has expired. Please sign in again.',
                'SESSION_EXPIRED',
                401,
                error
            );
        }

        return new SupabaseError(
            message || 'An unexpected error occurred',
            'UNKNOWN_ERROR',
            500,
            error
        );
    }

    return new SupabaseError(
        'An unexpected error occurred',
        'UNKNOWN_ERROR',
        500,
        error
    );
}

/**
 * Log errors to console in development, send to monitoring in production
 */
export function logSupabaseError(error: SupabaseError, context?: string): void {
    const errorInfo = {
        message: error.message,
        code: error.code,
        status: error.status,
        context,
        timestamp: new Date().toISOString(),
    };

    if (process.env.NODE_ENV === 'development') {
        console.error('[Supabase Error]', errorInfo, error.originalError);
    } else {
        // In production, you would send this to a monitoring service
        console.error('[Supabase Error]', errorInfo);
        // TODO: Send to monitoring service (e.g., Sentry, DataDog)
    }
}
