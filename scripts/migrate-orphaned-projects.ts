#!/usr/bin/env tsx
/**
 * Venture AI - Orphaned Projects Migration Script
 * 
 * This script migrates orphaned projects (projects without workspace_id) to user workspaces
 * Run this before executing the SQL migration to get diagnostic information
 * 
 * Usage:
 *   npx tsx scripts/migrate-orphaned-projects.ts
 * 
 * Author: Head of Development
 * Date: 2026-02-01
 */

import { createClient } from '@supabase/supabase-js';

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg: string) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg: string) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg: string) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg: string) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  header: (msg: string) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}`),
};

async function main() {
  log.header('═══════════════════════════════════════════════════════');
  log.header('  VENTURE AI - ORPHANED PROJECTS MIGRATION');
  log.header('═══════════════════════════════════════════════════════');

  // Manually load .env.local since we're running via tsx
  try {
    const fs = await import('fs');
    const path = await import('path');
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
      console.log(`${colors.green}✓${colors.reset} Loaded .env.local`);
    } else {
      console.log(`${colors.yellow}⚠${colors.reset} .env.local not found at ${envPath}`);
    }
  } catch (err) {
    console.error('Failed to load .env.local:', err);
  }

  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    log.error('Missing required environment variables:');
    if (!supabaseUrl) log.error('  - NEXT_PUBLIC_SUPABASE_URL');
    if (!supabaseServiceKey) log.error('  - SUPABASE_SERVICE_ROLE_KEY');
    log.error('\nPlease set these in your .env.local file');
    process.exit(1);
  }

  log.success('Environment variables loaded');

  // Create Supabase client with service role key
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  log.success('Supabase client initialized');

  // ========================================
  // STEP 1: PRE-MIGRATION DIAGNOSTICS
  // ========================================
  log.header('\n📊 STEP 1: PRE-MIGRATION DIAGNOSTICS');

  // Count orphaned projects
  const { data: orphanedProjects, error: projectsError } = await supabase
    .from('projects')
    .select('id, name, user_id, workspace_id, created_at, updated_at')
    .is('workspace_id', null)
    .eq('is_deleted', false);

  if (projectsError) {
    log.error(`Failed to fetch orphaned projects: ${projectsError.message}`);
    process.exit(1);
  }

  log.info(`Found ${orphanedProjects?.length || 0} orphaned projects`);

  if (orphanedProjects && orphanedProjects.length > 0) {
    console.log('\n  Orphaned Projects:');
    orphanedProjects.forEach((p, idx) => {
      console.log(`    ${idx + 1}. "${p.name}" (ID: ${p.id})`);
      console.log(`       User ID: ${p.user_id || 'NULL'}`);
      console.log(`       Created: ${new Date(p.created_at).toLocaleDateString()}`);
    });
  }

  // Count orphaned notes
  const { data: orphanedNotes, error: notesError } = await supabase
    .from('notes')
    .select('id, title, author_id, project_id, workspace_id, created_at')
    .is('workspace_id', null)
    .eq('is_deleted', false);

  if (notesError) {
    log.error(`Failed to fetch orphaned notes: ${notesError.message}`);
  } else {
    log.info(`Found ${orphanedNotes?.length || 0} orphaned notes`);
  }

  // Count notes referencing orphaned projects
  if (orphanedProjects && orphanedProjects.length > 0) {
    const orphanedProjectIds = orphanedProjects.map(p => p.id);
    const { data: affectedNotes, error: affectedError } = await supabase
      .from('notes')
      .select('id, title, project_id, workspace_id')
      .in('project_id', orphanedProjectIds)
      .eq('is_deleted', false);

    if (!affectedError && affectedNotes) {
      log.info(`Found ${affectedNotes.length} notes referencing orphaned projects`);

      if (affectedNotes.length > 0) {
        console.log('\n  Affected Notes:');
        affectedNotes.slice(0, 5).forEach((n, idx) => {
          const project = orphanedProjects.find(p => p.id === n.project_id);
          console.log(`    ${idx + 1}. "${n.title}" → Project: "${project?.name}"`);
        });
        if (affectedNotes.length > 5) {
          console.log(`    ... and ${affectedNotes.length - 5} more`);
        }
      }
    }
  }

  // ========================================
  // STEP 2: CHECK USER WORKSPACES
  // ========================================
  log.header('\n🔍 STEP 2: WORKSPACE ANALYSIS');

  const { data: workspaces, error: workspacesError } = await supabase
    .from('workspaces')
    .select('id, name, created_at')
    .eq('is_deleted', false);

  if (workspacesError) {
    log.error(`Failed to fetch workspaces: ${workspacesError.message}`);
  } else {
    log.info(`Found ${workspaces?.length || 0} active workspaces`);
    if (workspaces && workspaces.length > 0) {
      console.log('\n  Active Workspaces:');
      workspaces.forEach((w, idx) => {
        console.log(`    ${idx + 1}. "${w.name}" (ID: ${w.id})`);
      });
    }
  }

  // Check workspace memberships
  const { data: memberships, error: membershipsError } = await supabase
    .from('workspace_memberships')
    .select('user_id, workspace_id, role, status')
    .eq('status', 'active');

  if (membershipsError) {
    log.error(`Failed to fetch workspace memberships: ${membershipsError.message}`);
  } else {
    log.info(`Found ${memberships?.length || 0} active workspace memberships`);
  }

  // ========================================
  // STEP 3: MIGRATION DRY RUN
  // ========================================
  log.header('\n🧪 STEP 3: MIGRATION DRY RUN (Preview)');

  if (!orphanedProjects || orphanedProjects.length === 0) {
    log.success('No orphaned projects found - migration not needed!');
    log.header('\n═══════════════════════════════════════════════════════');
    log.header('  MIGRATION STATUS: ✓ CLEAN (No action required)');
    log.header('═══════════════════════════════════════════════════════\n');
    return;
  }

  log.info('Simulating migration...');

  let migratable = 0;
  let notMigratable = 0;

  for (const project of orphanedProjects) {
    if (project.user_id && memberships) {
      const userMembership = memberships.find(m => m.user_id === project.user_id);
      if (userMembership) {
        const workspace = workspaces?.find(w => w.id === userMembership.workspace_id);
        console.log(`  ✓ Project "${project.name}" → Workspace "${workspace?.name}"`);
        migratable++;
      } else {
        console.log(`  ⚠ Project "${project.name}" → No workspace membership found`);
        notMigratable++;
      }
    } else {
      console.log(`  ⚠ Project "${project.name}" → No user_id or memberships`);
      notMigratable++;
    }
  }

  log.info(`\nMigration Summary:`);
  log.success(`  ${migratable} projects can be migrated`);
  if (notMigratable > 0) {
    log.warning(`  ${notMigratable} projects will be soft-deleted (no valid workspace)`);
  }

  // ========================================
  // STEP 4: EXECUTION RECOMMENDATION
  // ========================================
  log.header('\n🚀 STEP 4: NEXT STEPS');

  log.info('To execute the migration, run the following SQL migration:');
  console.log(`\n  ${colors.cyan}supabase/migrations/011_migrate_orphaned_projects.sql${colors.reset}\n`);

  log.info('You can apply it using:');
  console.log(`\n  ${colors.bright}npx supabase db push${colors.reset}`);
  console.log(`  ${colors.bright}# OR via Supabase Dashboard → SQL Editor${colors.reset}\n`);

  log.warning('⚠️  IMPORTANT: Always backup your database before running migrations!');

  log.header('\n═══════════════════════════════════════════════════════');
  log.header('  DIAGNOSTICS COMPLETE');
  log.header('═══════════════════════════════════════════════════════\n');
}

// Run the script
main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    log.error(`\nFatal error: ${error.message}`);
    console.error(error);
    process.exit(1);
  });
