import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase client for browser/client components
// Using untyped client for flexibility with dynamic table operations
export function createSupabaseClient(): SupabaseClient {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    return createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
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
    }
    return supabaseClient;
}

// Export convenience alias - safely handles SSR
export const supabase = typeof window !== 'undefined' ? getSupabaseClient() : null;
