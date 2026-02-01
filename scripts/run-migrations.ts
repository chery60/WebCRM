/**
 * Migration script to check and guide Supabase migrations
 * Run with: npx tsx scripts/run-migrations.ts
 * 
 * This script checks the current database state and provides guidance
 * on which migrations need to be run.
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Manually load .env.local since we're running via tsx
try {
    const envPath = path.join(process.cwd(), '.env.local');

    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf-8');
        envContent.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                const value = match[2].trim().replace(/^["']|["']$/g, ''); // Remove quotes
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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ubkywhbguzbyewedxjdj.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_PyJxob7rHLuwo-kBxuaopA_gWZ-r6z0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Define all tables and their associated migrations
const migrationInfo = [
    {
        name: '001_initial_schema.sql',
        tables: ['users', 'employees', 'tasks', 'notes', 'tags', 'calendar_events', 'workspaces'],
        description: 'Initial database schema with users, employees, tasks, notes, tags, calendar events'
    },
    {
        name: '002_rls_policies.sql',
        tables: [], // RLS policies don't create tables
        description: 'Row Level Security policies for data protection'
    },
    {
        name: '003_pipelines_and_projects.sql',
        tables: ['pipelines', 'roadmaps', 'feature_requests', 'projects', 'task_tabs'],
        description: 'Pipelines, roadmaps, feature requests, projects, and task tabs for organizing work'
    }
];

async function checkTable(tableName: string): Promise<{ exists: boolean; error?: string }> {
    const { error } = await supabase.from(tableName).select('id').limit(1);

    if (error) {
        if (error.code === '42P01') {
            return { exists: false };
        }
        return { exists: false, error: error.message };
    }
    return { exists: true };
}

async function checkMigrationStatus() {
    console.log('🔍 Checking database migration status...\n');

    const results: { migration: string; status: 'complete' | 'partial' | 'pending'; missingTables: string[] }[] = [];

    for (const migration of migrationInfo) {
        if (migration.tables.length === 0) {
            // Skip migrations without tables (like RLS policies)
            results.push({ migration: migration.name, status: 'complete', missingTables: [] });
            continue;
        }

        const missingTables: string[] = [];
        for (const table of migration.tables) {
            const { exists, error } = await checkTable(table);
            if (!exists) {
                missingTables.push(table);
            }
            if (error) {
                console.log(`  ⚠️  Error checking ${table}: ${error}`);
            }
        }

        const status = missingTables.length === 0
            ? 'complete'
            : missingTables.length === migration.tables.length
                ? 'pending'
                : 'partial';

        results.push({ migration: migration.name, status, missingTables });
    }

    return results;
}

function printMigrationInstructions(pendingMigrations: string[]) {
    console.log('\n' + '='.repeat(70));
    console.log('📋 MIGRATION INSTRUCTIONS');
    console.log('='.repeat(70));
    console.log('\nThe Supabase anon key cannot create tables directly.');
    console.log('You need to run the SQL migrations in the Supabase Dashboard.\n');
    console.log('Steps:');
    console.log(`1. Go to: https://supabase.com/dashboard/project/${supabaseUrl.split('//')[1].split('.')[0]}/sql/new`);
    console.log('\n2. Run the following migration files in order:\n');

    pendingMigrations.forEach((migration, index) => {
        const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', migration);
        console.log(`   ${index + 1}. ${migration}`);
        console.log(`      Path: ${migrationPath}`);

        const info = migrationInfo.find(m => m.name === migration);
        if (info) {
            console.log(`      Description: ${info.description}`);
        }
        console.log('');
    });

    console.log('3. For each file:');
    console.log('   a. Copy the contents of the SQL file');
    console.log('   b. Paste into the SQL Editor');
    console.log('   c. Click "Run"');
    console.log('\n4. (Optional) Run supabase/seed.sql for demo data');
    console.log('\n' + '='.repeat(70));
}

function printSQLContent(migrationName: string) {
    const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', migrationName);

    try {
        const content = fs.readFileSync(migrationPath, 'utf8');
        console.log('\n' + '='.repeat(70));
        console.log(`📄 SQL CONTENT: ${migrationName}`);
        console.log('='.repeat(70));
        console.log('\nCopy everything below this line and paste into Supabase SQL Editor:\n');
        console.log('-'.repeat(70));
        console.log(content);
        console.log('-'.repeat(70));
    } catch (error) {
        console.log(`\n❌ Could not read migration file: ${migrationPath}`);
    }
}

async function runMigrations() {
    console.log('🚀 Venture CRM - Database Migration Helper\n');
    console.log(`   Supabase URL: ${supabaseUrl}`);
    console.log('');

    const results = await checkMigrationStatus();

    // Print status for each migration
    console.log('Migration Status:');
    console.log('-'.repeat(50));

    const pendingMigrations: string[] = [];

    for (const result of results) {
        const icon = result.status === 'complete' ? '✅' : result.status === 'partial' ? '⚠️' : '❌';
        console.log(`${icon} ${result.migration}: ${result.status.toUpperCase()}`);

        if (result.missingTables.length > 0) {
            console.log(`   Missing tables: ${result.missingTables.join(', ')}`);
        }

        if (result.status !== 'complete') {
            pendingMigrations.push(result.migration);
        }
    }

    // Check all new tables from migration 003
    console.log('\n📊 Table Status Summary:');
    console.log('-'.repeat(50));

    const allTables = [
        'users', 'employees', 'tasks', 'notes', 'tags',
        'calendar_events', 'workspaces', 'pipelines',
        'roadmaps', 'feature_requests', 'projects', 'task_tabs'
    ];

    for (const table of allTables) {
        const { exists, error } = await checkTable(table);
        const icon = exists ? '✅' : '❌';
        console.log(`${icon} ${table}${error ? ` (Error: ${error})` : ''}`);
    }

    if (pendingMigrations.length > 0) {
        printMigrationInstructions(pendingMigrations);

        // Ask if user wants to see the SQL content
        const args = process.argv.slice(2);
        if (args.includes('--show-sql') || args.includes('-s')) {
            for (const migration of pendingMigrations) {
                printSQLContent(migration);
            }
        } else {
            console.log('\n💡 TIP: Run with --show-sql or -s flag to display the SQL content directly:');
            console.log('   npx tsx scripts/run-migrations.ts --show-sql\n');
        }

        return false;
    }

    console.log('\n✅ All migrations have been applied! Database is up to date.');
    return true;
}

runMigrations().then((success) => {
    process.exit(success ? 0 : 1);
}).catch((error) => {
    console.error('❌ Migration check failed:', error);
    process.exit(1);
});
