/**
 * Sync Auth Users with Users Table
 * Ensures that auth.users entries have corresponding entries in the users table
 * This is critical for the messaging system which joins messages.sender_id with users table
 */

import { getSupabaseClient } from '@/lib/supabase/client';

/**
 * Sync a single auth user to the users table
 */
export async function syncAuthUserToUsersTable(userId: string, email: string, name?: string, avatar?: string): Promise<void> {
    const supabase = getSupabaseClient();
    
    try {
        // Check if user already exists
        const { data: existingUser } = await supabase
            .from('users')
            .select('id, name, avatar')
            .eq('id', userId)
            .single();

        if (existingUser) {
            // User exists, optionally update if name/avatar provided
            if (name || avatar) {
                await supabase
                    .from('users')
                    .update({
                        name: name || existingUser.name,
                        avatar: avatar || existingUser.avatar,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', userId);
            }
            return;
        }

        // Create new user entry
        await supabase
            .from('users')
            .insert({
                id: userId,
                email,
                name: name || email.split('@')[0], // Use email prefix as default name
                avatar: avatar || null,
                role: 'member',
            });

        console.log(`✓ Synced auth user ${email} to users table`);
    } catch (error) {
        console.error('Error syncing auth user to users table:', error);
        throw error;
    }
}

/**
 * Ensure current authenticated user exists in users table
 */
export async function ensureCurrentUserInUsersTable(): Promise<void> {
    const supabase = getSupabaseClient();
    
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            console.warn('No authenticated user to sync');
            return;
        }

        await syncAuthUserToUsersTable(
            user.id,
            user.email || '',
            user.user_metadata?.name || user.user_metadata?.full_name,
            user.user_metadata?.avatar_url
        );
    } catch (error) {
        console.error('Error ensuring current user in users table:', error);
    }
}

/**
 * Batch sync all auth users to users table
 * This should be run as a migration or admin task
 */
export async function batchSyncAuthUsers(): Promise<{ synced: number; errors: number }> {
    const supabase = getSupabaseClient();
    
    let synced = 0;
    let errors = 0;

    try {
        // Get all users from auth.users (admin only)
        // Note: This requires service role key, not available in client
        console.warn('Batch sync requires service role access and should be run server-side');
        
        // For client-side, we can only sync the current user
        await ensureCurrentUserInUsersTable();
        synced = 1;
    } catch (error) {
        console.error('Error in batch sync:', error);
        errors = 1;
    }

    return { synced, errors };
}
