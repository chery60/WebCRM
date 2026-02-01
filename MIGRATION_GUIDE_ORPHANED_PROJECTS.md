# 🔧 Orphaned Projects Migration Guide

## Overview

This guide helps you migrate orphaned projects (projects without `workspace_id`) to their proper workspaces. This fixes the issue where project names appear in the notes table but the projects themselves are not visible in the sidebar.

## Problem Description

**Symptoms:**
- ✅ Notes show project names in the "Project" column (e.g., "cewa")
- ❌ These projects are NOT visible in the sidebar under "Add Project"
- ❌ Users cannot access or manage these projects directly

**Root Cause:**
Projects were created before strict workspace isolation was enforced, resulting in `NULL` or invalid `workspace_id` values. The Supabase repository filters these out for security reasons.

## Solution

We provide an **automatic migration** that:
1. ✅ Assigns orphaned projects to their creator's workspace
2. ✅ Fixes orphaned notes to match their project's workspace
3. ✅ Adds database triggers to prevent future orphaned projects
4. ✅ Soft-deletes unrecoverable orphaned data
5. ✅ Provides comprehensive logging and audit trails

---

## 📋 Prerequisites

Before starting the migration, ensure you have:

- [x] Database backup (CRITICAL - always backup first!)
- [x] Supabase project access
- [x] Environment variables configured in `.env.local`:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (for diagnostics script)
- [x] Node.js and npm/pnpm installed
- [x] Supabase CLI installed (optional, for local migrations)

---

## 🚀 Migration Steps

### Step 1: Run Diagnostics (Recommended)

First, run the diagnostic script to see what will be migrated:

```bash
npx tsx scripts/migrate-orphaned-projects.ts
```

**What this does:**
- ✅ Counts orphaned projects and notes
- ✅ Lists affected data
- ✅ Shows which projects can be migrated
- ✅ Provides a dry-run preview
- ❌ Does NOT modify any data

**Expected Output:**
```
═══════════════════════════════════════════════════════
  VENTURE AI - ORPHANED PROJECTS MIGRATION
═══════════════════════════════════════════════════════

📊 STEP 1: PRE-MIGRATION DIAGNOSTICS
ℹ Found 2 orphaned projects
  Orphaned Projects:
    1. "cewa" (ID: xxx-xxx-xxx)
       User ID: yyy-yyy-yyy
       Created: Jan 31, 2026

ℹ Found 5 notes referencing orphaned projects

🔍 STEP 2: WORKSPACE ANALYSIS
ℹ Found 1 active workspaces
  Active Workspaces:
    1. "Sai's Workspace" (ID: zzz-zzz-zzz)

🧪 STEP 3: MIGRATION DRY RUN (Preview)
  ✓ Project "cewa" → Workspace "Sai's Workspace"
  
✓ 2 projects can be migrated

🚀 STEP 4: NEXT STEPS
To execute the migration, run the SQL migration...
```

### Step 2: Backup Your Database (CRITICAL!)

**Option A: Supabase Dashboard**
1. Go to Supabase Dashboard → Database → Backups
2. Create a manual backup
3. Wait for completion

**Option B: Export Data (if self-hosting)**
```bash
pg_dump -h your-host -U postgres -d postgres > backup_$(date +%Y%m%d).sql
```

### Step 3: Execute the Migration

**Option A: Via Supabase Dashboard (RECOMMENDED)**

1. Open Supabase Dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the contents of `supabase/migrations/011_migrate_orphaned_projects.sql`
5. Paste into the editor
6. Click **Run** (at the bottom right)
7. Wait for completion (should take a few seconds)
8. Check the **Logs** tab for success messages

**Option B: Via Supabase CLI (if using local development)**

```bash
# If you have supabase CLI configured
npx supabase db push

# This will apply all pending migrations including 011
```

**Option C: Manual SQL Execution**

```bash
# Connect to your database and run the migration file
psql -h your-host -U postgres -d postgres -f supabase/migrations/011_migrate_orphaned_projects.sql
```

### Step 4: Verify the Migration

After running the migration, check for success messages in the SQL output:

**Expected Success Messages:**
```sql
NOTICE:  Migration 011 Starting: Found 2 orphaned projects and 0 orphaned notes
NOTICE:  Migration 011 Complete: 0 orphaned projects remain, 0 orphaned notes remain
NOTICE:  SUCCESS: All orphaned records have been migrated or soft-deleted.
```

**Run the diagnostics script again to verify:**
```bash
npx tsx scripts/migrate-orphaned-projects.ts
```

You should see:
```
✓ No orphaned projects found - migration not needed!
  MIGRATION STATUS: ✓ CLEAN (No action required)
```

### Step 5: Test in Your Application

1. **Restart your development server:**
   ```bash
   npm run dev
   ```

2. **Check the Notes page:**
   - Go to `/notes` (PRDs page)
   - Verify project names still appear in the "Project" column
   - Project names should now be visible (no more "⚠️ Inaccessible Project")

3. **Check the Sidebar:**
   - Look at the left sidebar under "PRD" section
   - Click "Add Project"
   - Your previously missing projects (e.g., "cewa") should now be visible

4. **Test Project Navigation:**
   - Click on a migrated project in the sidebar
   - Verify you can see all notes associated with that project
   - Test creating a new note in the migrated project

---

## 🔍 What the Migration Does

### 1. Assigns Orphaned Projects to Workspaces

```sql
-- Assigns projects to their creator's first active workspace
UPDATE projects 
SET workspace_id = (
    SELECT workspace_id FROM workspace_memberships 
    WHERE user_id = projects.user_id 
    AND status = 'active'
    ORDER BY created_at ASC LIMIT 1
)
WHERE workspace_id IS NULL;
```

### 2. Fixes Orphaned Notes

```sql
-- Assigns notes to their author's workspace
-- OR matches notes to their project's workspace
UPDATE notes 
SET workspace_id = (...)
WHERE workspace_id IS NULL;
```

### 3. Adds Safety Triggers

Creates database triggers that automatically assign `workspace_id` on project/note creation, preventing future orphaned data.

### 4. Soft-Deletes Unrecoverable Data

Projects or notes that cannot be assigned to any workspace are soft-deleted (`is_deleted = true`) instead of being left orphaned.

---

## 🛟 Troubleshooting

### Issue: "Some orphaned records remain"

**Cause:** Some projects couldn't be assigned to a workspace (no owner, no valid workspace membership).

**Solution:**
1. Check the SQL output for details
2. Run this query to see remaining orphaned projects:
   ```sql
   SELECT id, name, user_id, workspace_id, is_deleted, created_at 
   FROM projects 
   WHERE workspace_id IS NULL
   ORDER BY created_at DESC;
   ```
3. Manually assign them or soft-delete them

### Issue: "⚠️ Inaccessible Project" still showing

**Cause:** The migrated project may not be in your current workspace context.

**Solution:**
1. Check your workspace switcher in the bottom-left corner
2. Ensure you're in the correct workspace
3. Refresh the page (Cmd/Ctrl + R)
4. Clear browser cache if needed

### Issue: Notes lost after migration

**Cause:** This should NOT happen - the migration only updates `workspace_id`, not deletes data.

**Solution:**
1. Restore from backup immediately
2. Contact support with error logs
3. Run this query to check for soft-deleted notes:
   ```sql
   SELECT id, title, is_deleted, workspace_id 
   FROM notes 
   WHERE is_deleted = true
   ORDER BY updated_at DESC;
   ```

### Issue: Migration fails with permission error

**Cause:** Insufficient database permissions.

**Solution:**
1. Ensure you're using a database user with sufficient privileges
2. For Supabase, use the service role key or run via Dashboard
3. Check RLS policies are not blocking the update

---

## 🔄 Rollback Plan

If something goes wrong, you can rollback the migration:

### Step 1: Restore from Backup
```bash
# If you exported via pg_dump
psql -h your-host -U postgres -d postgres < backup_YYYYMMDD.sql

# If using Supabase, restore via Dashboard → Backups
```

### Step 2: Remove Triggers (Optional)
```sql
DROP TRIGGER IF EXISTS trigger_auto_assign_project_workspace ON projects;
DROP TRIGGER IF EXISTS trigger_auto_assign_note_workspace ON notes;
DROP FUNCTION IF EXISTS auto_assign_project_workspace();
DROP FUNCTION IF EXISTS auto_assign_note_workspace();
```

---

## 📊 Migration Impact

### Database Changes
- ✅ Updates `workspace_id` in `projects` table
- ✅ Updates `workspace_id` in `notes` table
- ✅ Creates 2 new trigger functions
- ✅ Creates 2 new triggers
- ❌ No data deletion (only soft-deletes with `is_deleted = true`)

### Application Behavior
- ✅ Previously hidden projects now visible
- ✅ Notes display correct project names
- ✅ No more "⚠️ Inaccessible Project" warnings
- ✅ Future projects automatically assigned to workspaces

### Performance
- ⚡ Migration runs in <5 seconds for typical datasets
- ⚡ Triggers add negligible overhead (<1ms per insert)
- ⚡ No impact on read queries

---

## ✅ Post-Migration Checklist

After completing the migration, verify:

- [ ] All previously hidden projects are now visible in sidebar
- [ ] Notes show correct project names (no warnings)
- [ ] Can create new projects without errors
- [ ] Can create new notes without errors
- [ ] Can assign notes to migrated projects
- [ ] Workspace switcher works correctly
- [ ] No console errors in browser
- [ ] Database logs show no errors

---

## 🆘 Support

If you encounter issues:

1. **Check the logs:** Browser console and Supabase logs
2. **Run diagnostics:** `npx tsx scripts/migrate-orphaned-projects.ts`
3. **Review the SQL output:** Look for NOTICE, WARNING, or ERROR messages
4. **Restore from backup:** If things go wrong, restore immediately
5. **Contact support:** Provide error logs and diagnostic output

---

## 📝 Technical Details

### Files Modified/Created

1. **SQL Migration:** `supabase/migrations/011_migrate_orphaned_projects.sql`
   - Main migration logic
   - ~250 lines of SQL
   - Includes diagnostic queries and rollback plan

2. **Diagnostics Script:** `scripts/migrate-orphaned-projects.ts`
   - TypeScript/Node.js script
   - Dry-run preview
   - No database modifications

3. **Repository Updates:** `src/lib/db/repositories/supabase/projects.ts`
   - Added logging for debugging
   - Enhanced error messages
   - No functional changes

4. **UI Updates:** `src/components/notes/views/note-table-view.tsx`
   - Shows warning for inaccessible projects
   - Better user experience
   - No breaking changes

### Database Schema Changes

**Before Migration:**
```
projects:
  - workspace_id: NULL (orphaned)
  
notes:
  - workspace_id: NULL (orphaned)
  - project_id: points to orphaned project
```

**After Migration:**
```
projects:
  - workspace_id: valid UUID (migrated)
  
notes:
  - workspace_id: valid UUID (migrated)
  - project_id: points to valid project

triggers:
  - auto_assign_project_workspace (prevents future orphans)
  - auto_assign_note_workspace (prevents future orphans)
```

---

## 🎯 Success Criteria

The migration is successful when:

1. ✅ Diagnostics script reports "CLEAN (No action required)"
2. ✅ All project names visible in sidebar
3. ✅ No "⚠️ Inaccessible Project" warnings in notes table
4. ✅ Can create and manage projects normally
5. ✅ No database errors in logs
6. ✅ Application functions normally

---

## 📚 Additional Resources

- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Workspace Isolation Best Practices](./SECURITY_FIX_WORKSPACE_ISOLATION.md)
- [Database Triggers in PostgreSQL](https://www.postgresql.org/docs/current/sql-createtrigger.html)

---

**Last Updated:** 2026-02-01  
**Author:** Head of Development  
**Version:** 1.0.0
