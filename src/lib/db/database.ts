/**
 * Database Abstraction Layer
 * 
 * This module provides a unified interface for database operations,
 * allowing seamless switching between Dexie (IndexedDB) and Supabase backends.
 * 
 * Set USE_SUPABASE=true in environment to use Supabase backend.
 */

// Feature flag for database backend
export const USE_SUPABASE = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';

// Re-export the appropriate repositories based on the feature flag
export function getDatabaseBackend(): 'supabase' | 'dexie' {
    return USE_SUPABASE ? 'supabase' : 'dexie';
}

// Log which backend is being used (development only)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.log(`[Database] Using ${USE_SUPABASE ? 'Supabase' : 'Dexie'} backend`);
}
