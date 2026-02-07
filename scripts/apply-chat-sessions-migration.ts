/**
 * Script to apply the chat_sessions migration to Supabase
 * Run with: npx tsx scripts/apply-chat-sessions-migration.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load .env.local
try {
    const envPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf-8');
        envContent.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                const value = match[2].trim().replace(/^["']|["']$/g, '');
                if (key && value && !process.env[key]) {
                    process.env[key] = value;
                }
            }
        });
        console.log('✓ Loaded .env.local');
    }
} catch (err) {
    console.error('Failed to load .env.local:', err);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Checking chat_sessions table status...\n');
console.log(`   Supabase URL: ${supabaseUrl}`);

// Use service role key if available for admin operations
const supabase = createClient(
    supabaseUrl,
    supabaseServiceKey || supabaseAnonKey
);

async function checkChatSessionsTable(): Promise<boolean> {
    const { error } = await supabase.from('chat_sessions').select('id').limit(1);

    if (error) {
        if (error.code === 'PGRST205' || error.code === '42P01') {
            console.log('❌ chat_sessions table does NOT exist');
            return false;
        }
        console.log(`⚠️  Error checking table: ${error.message} (code: ${error.code})`);
        return false;
    }

    console.log('✅ chat_sessions table exists');
    return true;
}

async function printMigrationInstructions() {
    console.log('\n' + '='.repeat(70));
    console.log('📋 MIGRATION REQUIRED: chat_sessions');
    console.log('='.repeat(70));

    console.log(`
The chat_sessions table needs to be created in your Supabase database.

Steps to apply:

1. Open the Supabase SQL Editor:
   https://supabase.com/dashboard/project/${supabaseUrl.split('//')[1].split('.')[0]}/sql/new

2. Copy the contents of: supabase/migrations/008_chat_sessions.sql

3. Paste into the SQL Editor and click "Run"

This will create:
- chat_sessions table with proper schema
- Indexes for performance
- RLS policies for security
`);

    // Print the SQL content
    const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '008_chat_sessions.sql');
    if (fs.existsSync(migrationPath)) {
        console.log('='.repeat(70));
        console.log('📄 SQL CONTENT (copy and paste this):');
        console.log('='.repeat(70));
        console.log(fs.readFileSync(migrationPath, 'utf8'));
        console.log('='.repeat(70));
    }
}

async function main() {
    const exists = await checkChatSessionsTable();

    if (!exists) {
        await printMigrationInstructions();
        process.exit(1);
    }

    console.log('\n✅ chat_sessions table is ready!');
    process.exit(0);
}

main().catch(console.error);
