/**
 * Migration script to run SQL on Supabase
 * Run with: npx tsx scripts/run-migrations.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ubkywhbguzbyewedxjdj.supabase.co';
const supabaseAnonKey = 'sb_publishable_PyJxob7rHLuwo-kBxuaopA_gWZ-r6z0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runMigrations() {
    console.log('🚀 Starting Supabase migrations...\n');

    // Test connection by trying to access a table
    const { data, error } = await supabase
        .from('employees')
        .select('id')
        .limit(1);

    if (error) {
        if (error.code === '42P01') {
            console.log('❌ Tables do not exist yet.');
            console.log('\n⚠️  IMPORTANT: You need to run the SQL migrations manually.');
            console.log('\nPlease follow these steps:');
            console.log('1. Go to: https://supabase.com/dashboard/project/ubkywhbguzbyewedxjdj/sql/new');
            console.log('2. Copy/paste the contents of: supabase/migrations/001_initial_schema.sql');
            console.log('3. Click "Run"');
            console.log('4. Then copy/paste: supabase/migrations/002_rls_policies.sql');
            console.log('5. Click "Run"');
            console.log('6. Optionally run: supabase/seed.sql for demo data');
            console.log('\nNote: The Supabase anon key cannot create tables directly.');
            console.log('You need to use the SQL Editor in the Supabase Dashboard.');
        } else {
            console.log('Error checking tables:', error.message);
        }
        return false;
    }

    console.log('✅ Tables already exist! Connection successful.');
    console.log('   Found employees table with data:', data?.length || 0, 'rows (limited)');

    // Check other tables
    const tables = ['users', 'tasks', 'notes', 'tags', 'calendar_events', 'workspaces'];
    for (const table of tables) {
        const { error: tableError } = await supabase.from(table).select('id').limit(1);
        if (tableError && tableError.code === '42P01') {
            console.log(`❌ Table "${table}" does not exist`);
        } else if (!tableError) {
            console.log(`✅ Table "${table}" exists`);
        }
    }

    return true;
}

runMigrations().then((success) => {
    process.exit(success ? 0 : 1);
});
