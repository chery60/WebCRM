#!/usr/bin/env tsx
/**
 * Venture AI - Complete Project Recovery Diagnostic Script
 * 
 * This script diagnoses why projects are missing and provides actionable fixes
 * Run this BEFORE executing migration 012
 * 
 * Usage:
 *   npx tsx scripts/diagnose-and-fix-projects.ts
 * 
 * Author: Head of Development
 * Date: 2026-02-01
 */

import { createClient } from '@supabase/supabase-js';

// Color codes
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
  detail: (msg: string) => console.log(`  ${colors.reset}${msg}`),
};

async function main() {
  log.header('╔════════════════════════════════════════════════════════════╗');
  log.header('║  VENTURE AI - PROJECT RECOVERY DIAGNOSTICS                ║');
  log.header('╚════════════════════════════════════════════════════════════╝');

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

  // Check environment
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    log.error('Missing required environment variables:');
    if (!supabaseUrl) log.error('  - NEXT_PUBLIC_SUPABASE_URL');
    if (!supabaseServiceKey) log.error('  - SUPABASE_SERVICE_ROLE_KEY');
    log.error('\nPlease set these in your .env.local file');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  log.success('Connected to Supabase');

  // ============================================
  // DIAGNOSTIC 1: Check Workspace Memberships
  // ============================================
  log.header('\n📊 DIAGNOSTIC 1: Workspace Memberships');

  const { data: memberships, error: membershipError } = await supabase
    .from('workspace_memberships')
    .select('*, workspaces(name)');

  if (membershipError) {
    log.error(`Failed to fetch memberships: ${membershipError.message}`);
  } else if (!memberships || memberships.length === 0) {
    log.error('❌ CRITICAL: No workspace memberships found!');
    log.warning('This is the root cause - users must have workspace memberships to see projects.');
    log.info('\nSOLUTION: Create a workspace membership for your user.');
  } else {
    log.success(`Found ${memberships.length} workspace membership(s)`);
    memberships.forEach((m: any, idx) => {
      const statusIcon = m.status === 'active' ? '✓' : '⚠';
      console.log(`  ${statusIcon} Membership ${idx + 1}:`);
      log.detail(`    Workspace: ${m.workspaces?.name || 'Unknown'}`);
      log.detail(`    Status: ${m.status}`);
      log.detail(`    Role: ${m.role}`);
      log.detail(`    Joined: ${new Date(m.joined_at).toLocaleDateString()}`);
    });

    const activeMemberships = memberships.filter((m: any) => m.status === 'active');
    if (activeMemberships.length === 0) {
      log.warning('\n⚠ No ACTIVE memberships found. Projects require active status.');
      log.info('SOLUTION: Update membership status to "active" in workspace_memberships table.');
    }
  }

  // ============================================
  // DIAGNOSTIC 2: Check Projects
  // ============================================
  log.header('\n📊 DIAGNOSTIC 2: Projects Status');

  const { data: allProjects, error: projectsError } = await supabase
    .from('projects')
    .select('id, name, user_id, workspace_id, is_deleted, created_at')
    .order('created_at', { ascending: false });

  if (projectsError) {
    log.error(`Failed to fetch projects: ${projectsError.message}`);
  } else if (!allProjects || allProjects.length === 0) {
    log.warning('No projects found in database at all.');
  } else {
    const activeProjects = allProjects.filter(p => !p.is_deleted);
    const deletedProjects = allProjects.filter(p => p.is_deleted);
    const orphanedProjects = activeProjects.filter(p => !p.workspace_id);
    const validProjects = activeProjects.filter(p => p.workspace_id);

    log.info(`Total projects: ${allProjects.length}`);
    log.success(`  ✓ Active with workspace: ${validProjects.length}`);
    if (orphanedProjects.length > 0) {
      log.warning(`  ⚠ Active but no workspace: ${orphanedProjects.length}`);
    }
    if (deletedProjects.length > 0) {
      log.error(`  ✗ Soft-deleted: ${deletedProjects.length}`);
    }

    if (orphanedProjects.length > 0) {
      log.warning('\n⚠ Orphaned Projects Found:');
      orphanedProjects.forEach((p, idx) => {
        console.log(`  ${idx + 1}. "${p.name}"`);
        log.detail(`    ID: ${p.id}`);
        log.detail(`    User ID: ${p.user_id || 'NULL'}`);
        log.detail(`    Created: ${new Date(p.created_at).toLocaleDateString()}`);
      });
      log.info('\nSOLUTION: Run migration 012 to assign these to workspaces.');
    }

    if (deletedProjects.length > 0) {
      log.error('\n✗ Soft-Deleted Projects (Previously Visible):');
      deletedProjects.slice(0, 10).forEach((p, idx) => {
        console.log(`  ${idx + 1}. "${p.name}"`);
        log.detail(`    ID: ${p.id}`);
        log.detail(`    User ID: ${p.user_id || 'NULL'}`);
        log.detail(`    Workspace: ${p.workspace_id || 'NULL'}`);
        log.detail(`    Created: ${new Date(p.created_at).toLocaleDateString()}`);
      });
      if (deletedProjects.length > 10) {
        log.detail(`... and ${deletedProjects.length - 10} more`);
      }
      log.info('\nSOLUTION: Migration 012 will recover these if they have valid users.');
    }
  }

  // ============================================
  // DIAGNOSTIC 3: Check Notes Referencing Projects
  // ============================================
  log.header('\n📊 DIAGNOSTIC 3: Notes with Project References');

  const { data: notesWithProjects, error: notesError } = await supabase
    .from('notes')
    .select('id, title, project_id, workspace_id, is_deleted')
    .not('project_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(20);

  if (notesError) {
    log.error(`Failed to fetch notes: ${notesError.message}`);
  } else if (notesWithProjects && notesWithProjects.length > 0) {
    log.info(`Found ${notesWithProjects.length} notes referencing projects`);

    const orphanedNoteProjects = notesWithProjects.filter(n => !n.workspace_id && !n.is_deleted);
    if (orphanedNoteProjects.length > 0) {
      log.warning(`\n⚠ ${orphanedNoteProjects.length} notes have project_id but no workspace_id`);
      log.info('SOLUTION: Migration 012 will sync these with their project workspaces.');
    }

    // Cross-reference with projects
    const projectIds = [...new Set(notesWithProjects.map(n => n.project_id))];
    const { data: referencedProjects } = await supabase
      .from('projects')
      .select('id, name, workspace_id, is_deleted')
      .in('id', projectIds as string[]);

    if (referencedProjects) {
      const missingProjects = projectIds.filter(
        pid => !referencedProjects.find(p => p.id === pid)
      );
      const deletedReferences = referencedProjects.filter(p => p.is_deleted);

      if (missingProjects.length > 0) {
        log.error(`\n✗ ${missingProjects.length} notes reference non-existent projects`);
      }
      if (deletedReferences.length > 0) {
        log.warning(`\n⚠ ${deletedReferences.length} notes reference soft-deleted projects`);
        deletedReferences.slice(0, 5).forEach((p, idx) => {
          console.log(`  ${idx + 1}. Project: "${p.name}" (deleted)`);
        });
        log.info('SOLUTION: Migration 012 will recover these projects if possible.');
      }
    }
  } else {
    log.info('No notes with project references found.');
  }

  // ============================================
  // DIAGNOSTIC 4: RLS Policy Check
  // ============================================
  log.header('\n📊 DIAGNOSTIC 4: RLS Policy Status');

  const { data: policies, error: policiesError } = await supabase
    .from('pg_policies')
    .select('tablename, policyname, cmd')
    .in('tablename', ['projects', 'notes']);

  if (policiesError) {
    log.warning('Could not check RLS policies (requires admin access)');
  } else if (policies) {
    const projectPolicies = policies.filter((p: any) => p.tablename === 'projects');
    const notePolicies = policies.filter((p: any) => p.tablename === 'notes');

    log.info(`Projects table: ${projectPolicies.length} RLS policies`);
    log.info(`Notes table: ${notePolicies.length} RLS policies`);

    if (projectPolicies.length === 0) {
      log.error('⚠ No RLS policies on projects - security issue!');
    }
  }

  // ============================================
  // DIAGNOSTIC 5: Trigger Status
  // ============================================
  log.header('\n📊 DIAGNOSTIC 5: Database Triggers');

  const { data: triggers, error: triggersError } = await supabase
    .from('pg_trigger')
    .select('tgname, tgrelid')
    .or('tgname.eq.trigger_auto_assign_project_workspace,tgname.eq.trigger_auto_assign_note_workspace');

  if (triggersError) {
    log.warning('Could not check triggers (may require admin access)');
  } else if (triggers && triggers.length > 0) {
    log.success(`Found ${triggers.length} auto-assignment trigger(s)`);
    (triggers as any[]).forEach(t => {
      log.detail(`✓ ${t.tgname}`);
    });
  } else {
    log.warning('⚠ No auto-assignment triggers found');
    log.info('Migration 012 will create these.');
  }

  // ============================================
  // FINAL RECOMMENDATIONS
  // ============================================
  log.header('\n🎯 RECOMMENDATIONS');

  let hasIssues = false;

  if (!memberships || memberships.length === 0) {
    hasIssues = true;
    log.error('\n1. CRITICAL: Create workspace memberships');
    log.detail('   Your users need to be members of workspaces to see projects.');
    log.detail('   SQL: INSERT INTO workspace_memberships (workspace_id, user_id, status) VALUES (...)');
  } else {
    const activeMemberships = memberships.filter((m: any) => m.status === 'active');
    if (activeMemberships.length === 0) {
      hasIssues = true;
      log.warning('\n1. Update membership status to "active"');
      log.detail('   SQL: UPDATE workspace_memberships SET status = \'active\' WHERE user_id = ...');
    }
  }

  if (allProjects) {
    const deletedProjects = allProjects.filter(p => p.is_deleted);
    const orphanedProjects = allProjects.filter(p => !p.workspace_id && !p.is_deleted);

    if (deletedProjects.length > 0 || orphanedProjects.length > 0) {
      hasIssues = true;
      log.warning('\n2. Run Migration 012 to recover and assign projects');
      log.detail('   Execute: supabase/migrations/012_fix_orphaned_projects_recovery.sql');
      log.detail('   This will:');
      log.detail('   - Recover soft-deleted projects');
      log.detail('   - Assign orphaned projects to workspaces');
      log.detail('   - Fix project-note workspace mismatches');
      log.detail('   - Install corrected triggers');
    }
  }

  if (!hasIssues) {
    log.success('\n✓ No critical issues found!');
    log.info('Your database appears healthy. If projects still not visible:');
    log.detail('1. Check browser console for errors');
    log.detail('2. Verify you\'re logged in as the correct user');
    log.detail('3. Refresh the page');
    log.detail('4. Check workspace switcher (bottom-left)');
  }

  log.header('\n═══════════════════════════════════════════════════════════');
  log.header('  DIAGNOSTICS COMPLETE');
  log.header('═══════════════════════════════════════════════════════════\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    log.error(`\nFatal error: ${error.message}`);
    console.error(error);
    process.exit(1);
  });
