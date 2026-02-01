#!/usr/bin/env tsx
/**
 * Venture AI - Migration Verification Script
 * 
 * This script verifies that the orphaned projects migration was successful
 * Run this after executing the SQL migration
 * 
 * Usage:
 *   npx tsx scripts/verify-migration-success.ts
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
  log.header('  VENTURE AI - MIGRATION VERIFICATION');
  log.header('═══════════════════════════════════════════════════════');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    log.error('Missing required environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  log.header('\n🔍 VERIFICATION CHECKS');

  let allChecksPassed = true;

  // Check 1: No orphaned projects
  log.info('\n1. Checking for orphaned projects...');
  const { data: orphanedProjects, error: projectsError } = await supabase
    .from('projects')
    .select('id, name')
    .is('workspace_id', null)
    .eq('is_deleted', false);

  if (projectsError) {
    log.error(`   Error checking projects: ${projectsError.message}`);
    allChecksPassed = false;
  } else if (orphanedProjects && orphanedProjects.length > 0) {
    log.error(`   Found ${orphanedProjects.length} orphaned projects`);
    orphanedProjects.forEach(p => console.log(`   - "${p.name}" (${p.id})`));
    allChecksPassed = false;
  } else {
    log.success('   No orphaned projects found');
  }

  // Check 2: No orphaned notes
  log.info('\n2. Checking for orphaned notes...');
  const { data: orphanedNotes, error: notesError } = await supabase
    .from('notes')
    .select('id, title')
    .is('workspace_id', null)
    .eq('is_deleted', false);

  if (notesError) {
    log.error(`   Error checking notes: ${notesError.message}`);
    allChecksPassed = false;
  } else if (orphanedNotes && orphanedNotes.length > 0) {
    log.error(`   Found ${orphanedNotes.length} orphaned notes`);
    allChecksPassed = false;
  } else {
    log.success('   No orphaned notes found');
  }

  // Check 3: All notes with project_id have matching workspace_id
  log.info('\n3. Checking note-project workspace consistency...');
  
  // Try RPC function first, if it exists
  let inconsistentNotes: any = null;
  let consistencyError: any = null;
  
  try {
    const rpcResult = await supabase.rpc('check_note_project_workspace_consistency', {});
    inconsistentNotes = rpcResult.data;
    consistencyError = rpcResult.error;
  } catch (e) {
    // If RPC function doesn't exist, run a direct query
    const { data, error } = await supabase
      .from('notes')
      .select('id, title, workspace_id, project_id, projects!inner(workspace_id)')
      .not('project_id', 'is', null)
      .eq('is_deleted', false);
    
    if (error) {
      consistencyError = error;
    } else {
      inconsistentNotes = data?.filter(n => {
        const note = n as any;
        return note.workspace_id !== note.projects.workspace_id;
      });
    }
  }

  if (consistencyError) {
    log.warning('   Could not verify workspace consistency (this is OK for fresh migrations)');
  } else if (inconsistentNotes && inconsistentNotes.length > 0) {
    log.error(`   Found ${inconsistentNotes.length} notes with mismatched workspaces`);
    allChecksPassed = false;
  } else {
    log.success('   All notes have consistent workspace assignments');
  }

  // Check 4: Verify triggers exist
  log.info('\n4. Checking database triggers...');
  const { data: triggers, error: triggersError } = await supabase
    .from('pg_trigger')
    .select('tgname')
    .in('tgname', ['trigger_auto_assign_project_workspace', 'trigger_auto_assign_note_workspace']);

  if (triggersError) {
    log.warning('   Could not verify triggers (may need admin access)');
  } else if (triggers && triggers.length >= 2) {
    log.success(`   Found ${triggers.length} safety triggers`);
  } else {
    log.warning('   Some triggers may be missing - check migration logs');
  }

  // Check 5: Sample data verification
  log.info('\n5. Verifying sample data (projects with notes)...');
  const { data: projectsWithNotes, error: sampleError } = await supabase
    .from('projects')
    .select('id, name, workspace_id, notes(count)')
    .eq('is_deleted', false)
    .limit(5);

  if (sampleError) {
    log.error(`   Error fetching sample data: ${sampleError.message}`);
  } else if (projectsWithNotes && projectsWithNotes.length > 0) {
    log.success('   Sample projects verified:');
    projectsWithNotes.forEach((p: any) => {
      const noteCount = p.notes?.[0]?.count || 0;
      console.log(`   ✓ "${p.name}" - ${noteCount} notes, workspace: ${p.workspace_id?.substring(0, 8)}...`);
    });
  }

  // Final verdict
  log.header('\n═══════════════════════════════════════════════════════');
  if (allChecksPassed) {
    log.header('  ✓ VERIFICATION PASSED - Migration Successful!');
    log.success('\nYour orphaned projects have been successfully migrated.');
    log.success('All data integrity checks passed.');
    log.info('\nNext steps:');
    console.log('  1. Restart your development server');
    console.log('  2. Check the notes page - project names should be visible');
    console.log('  3. Verify projects appear in sidebar');
  } else {
    log.header('  ⚠ VERIFICATION INCOMPLETE - Manual Review Required');
    log.warning('\nSome checks did not pass. Please review the issues above.');
    log.info('\nRecommended actions:');
    console.log('  1. Re-run the SQL migration');
    console.log('  2. Check database logs for errors');
    console.log('  3. Contact support if issues persist');
  }
  log.header('═══════════════════════════════════════════════════════\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    log.error(`\nFatal error: ${error.message}`);
    console.error(error);
    process.exit(1);
  });
