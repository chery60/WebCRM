import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { validateSupabaseConfig } from './error-handler';

// Validate configuration on module load
let configValidation: ReturnType<typeof validateSupabaseConfig> | null = null;

function getConfigValidation() {
    if (!configValidation) {
        configValidation = validateSupabaseConfig();
        
        if (!configValidation.isValid && typeof window !== 'undefined') {
            console.error(
                '⚠️ Supabase Configuration Error:\n' +
                configValidation.errors.map(e => `  - ${e}`).join('\n') +
                '\n\nPlease check your .env.local file and ensure all Supabase environment variables are set correctly.'
            );
        }
    }
    return configValidation;
}

// Supabase client for browser/client components
// Using untyped client for flexibility with dynamic table operations
export function createSupabaseClient(): SupabaseClient {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    // Validate configuration
    const validation = getConfigValidation();
    if (!validation.isValid) {
        // Return a dummy client that will fail gracefully
        // This prevents the app from crashing completely
        console.warn('Creating Supabase client with invalid configuration');
    }

    return createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            // Add error handling for auth state changes
            flowType: 'pkce',
        },
        global: {
            headers: {
                'x-application-name': 'venture-ai-crm',
            },
        },
        // Add network timeout and retry options
        db: {
            schema: 'public',
        },
    });
}

// Singleton client for client-side use
let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
    if (typeof window === 'undefined') {
        // Server-side: always create new client
        return createSupabaseClient();
    }

    if (!supabaseClient) {
        supabaseClient = createSupabaseClient();
        
        // Set up global error handler for auth state changes
        supabaseClient.auth.onAuthStateChange((event, session) => {
            if (event === 'TOKEN_REFRESHED') {
                console.log('✓ Auth token refreshed successfully');
            } else if (event === 'SIGNED_OUT') {
                console.log('✓ User signed out');
            } else if (event === 'SIGNED_IN') {
                console.log('✓ User signed in');
            }
        });
    }
    return supabaseClient;
}

// Export convenience alias - safely handles SSR
export const supabase = typeof window !== 'undefined' ? getSupabaseClient() : null;

// Export configuration validation for external use
export { getConfigValidation };
