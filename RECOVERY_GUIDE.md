# 🔧 PROJECT RECOVERY GUIDE - CORRECTED VERSION

## What Happened

You ran migration `011_migrate_orphaned_projects.sql` but your projects are still not visible. Here's why and how to fix it.

---

## 🔍 Root Cause Analysis

### The Issue
Migration 011 has been executed, but projects remain invisible due to one or more of these reasons:

1. **No Active Workspace Memberships** - Users don't have `status = 'active'` in workspace_memberships
2. **Projects Were Soft-Deleted** - Migration 010 may have soft-deleted projects before 011 ran
3. **Workspace Mismatch** - Notes reference projects but workspace_id doesn't match
4. **RLS Policies Blocking** - Row Level Security prevents users from seeing their own data

### Why Migration 011 Didn't Work
- The migration correctly queries for `status = 'active'` memberships
- BUT if user membership status is 'invited' or missing, no projects get migrated
- Projects with NULL workspace_id are then filtered out by RLS policies

---

## ✅ THE FIX - Migration 012

I've created a **corrected migration** that:
- ✅ Recovers soft-deleted projects that were incorrectly deleted
- ✅ Works with ANY workspace membership status (not just 'active')
- ✅ Has better fallback logic for orphaned data
- ✅ Fixes triggers to handle edge cases
- ✅ Provides detailed diagnostics during execution

---

## 🚀 Step-by-Step Recovery

### Step 1: Run Diagnostics
```bash
npx tsx scripts/diagnose-and-fix-projects.ts
```

**This will tell you:**
- ✅ How many workspace memberships you have
- ✅ How many projects are orphaned vs soft-deleted
- ✅ Which notes reference missing projects
- ✅ What the exact issue is
- ✅ Recommended next steps

**Expected Output:**
```
╔════════════════════════════════════════════════════════════╗
║  VENTURE AI - PROJECT RECOVERY DIAGNOSTICS                ║
╚════════════════════════════════════════════════════════════╝

📊 DIAGNOSTIC 1: Workspace Memberships
✓ Found 1 workspace membership(s)
  ⚠ Membership 1:
    Workspace: Sai's Workspace
    Status: invited  <-- THIS IS THE PROBLEM!
    Role: owner
    Joined: Jan 31, 2026

⚠ No ACTIVE memberships found. Projects require active status.
SOLUTION: Update membership status to "active"

📊 DIAGNOSTIC 2: Projects Status
Total projects: 5
  ✗ Soft-deleted: 5  <-- Your projects were deleted!

✗ Soft-Deleted Projects:
  1. "cewa"
     ID: xxx-xxx-xxx
     User ID: yyy-yyy-yyy
     Created: Jan 31, 2026
```

---

### Step 2A: If You Need to Activate Membership

If diagnostics show `status: invited`, run this SQL first:

```sql
-- Update your workspace membership to active
UPDATE workspace_memberships 
SET status = 'active'
WHERE user_id = 'YOUR_USER_ID';  -- Replace with your actual user ID

-- Verify it worked
SELECT * FROM workspace_memberships WHERE status = 'active';
```

**How to get your user ID:**
1. Open browser console on your app
2. Run: `console.log(localStorage.getItem('supabase.auth.token'))`
3. Or check Supabase Dashboard → Authentication → Users

---

### Step 2B: Execute Migration 012

Open **Supabase Dashboard** → **SQL Editor** → **New Query**

Copy and paste the ENTIRE contents of:
```
supabase/migrations/012_fix_orphaned_projects_recovery.sql
```

Click **Run** and wait for completion (~10 seconds).

**Expected Output:**
```
NOTICE:  Migration 012 Starting:
NOTICE:    - Orphaned projects (active): 0
NOTICE:    - Soft-deleted projects: 5
NOTICE:    - Orphaned notes (active): 0
NOTICE:    - Total workspace memberships: 1
NOTICE:    - Active memberships: 1
NOTICE:  Migration 012 Complete:
NOTICE:    - Remaining orphaned projects: 0
NOTICE:    - Remaining orphaned notes: 0
NOTICE:    - Total active projects: 5
NOTICE:  SUCCESS: All orphaned records have been migrated or appropriately handled.
```

---

### Step 3: Verify Recovery

Run diagnostics again:
```bash
npx tsx scripts/diagnose-and-fix-projects.ts
```

Should show:
```
✓ No critical issues found!
```

---

### Step 4: Test Your Application

```bash
npm run dev
```

1. **Check Notes Page** (`/notes`)
   - Project names should appear correctly
   - No "⚠️ Inaccessible Project" warnings

2. **Check Sidebar**
   - Click "PRD" → "Add Project"
   - Your recovered projects should be visible

3. **Test Creating New Project**
   - Click "+ Add Project"
   - Create a test project
   - Should work without errors

---

## 🔍 What Migration 012 Does Differently

### Improvement 1: Recovers Soft-Deleted Projects
```sql
-- Restore projects that were incorrectly deleted
UPDATE projects 
SET is_deleted = false
WHERE is_deleted = true
AND user_id IS NOT NULL
AND user_id IN (
    SELECT user_id FROM workspace_memberships WHERE status = 'active'
);
```

### Improvement 2: Works with ANY Membership Status
```sql
-- Try active first, then fall back to ANY membership
SELECT workspace_id 
FROM workspace_memberships
WHERE user_id = projects.user_id 
-- No status filter here! Works with 'invited', 'active', etc.
ORDER BY joined_at ASC
LIMIT 1
```

### Improvement 3: Better Trigger Logic
```sql
-- New trigger tries multiple fallbacks:
-- 1. Try active memberships first
-- 2. If none, try ANY membership
-- 3. Only fail if user has NO workspace at all
```

### Improvement 4: Comprehensive Diagnostics
- Logs exactly what was migrated
- Shows counts before and after
- Warns about remaining issues

---

## 🛟 Troubleshooting

### Issue: "No workspace memberships found"

**Cause:** User has no entry in workspace_memberships table.

**Solution:**
```sql
-- Create a workspace first if needed
INSERT INTO workspaces (name, owner_id)
VALUES ('My Workspace', 'YOUR_USER_ID')
RETURNING id;

-- Then create membership
INSERT INTO workspace_memberships (workspace_id, user_id, role, status)
VALUES ('WORKSPACE_ID_FROM_ABOVE', 'YOUR_USER_ID', 'owner', 'active');
```

---

### Issue: "Projects still not visible after migration"

**Possible Causes:**
1. Wrong workspace selected in app
2. Browser cache issue
3. RLS policies still blocking

**Solutions:**
1. Check workspace switcher (bottom-left of app)
2. Hard refresh: Cmd/Ctrl + Shift + R
3. Check browser console for errors
4. Run this SQL to verify projects exist:
   ```sql
   SELECT id, name, workspace_id, is_deleted 
   FROM projects 
   WHERE is_deleted = false
   ORDER BY created_at DESC;
   ```

---

### Issue: "Cannot create new projects"

**Error Message:** "Cannot create project without workspace"

**Cause:** Trigger can't find workspace for user.

**Solution:**
```sql
-- Verify you have an active workspace membership
SELECT wm.*, w.name as workspace_name
FROM workspace_memberships wm
JOIN workspaces w ON wm.workspace_id = w.id
WHERE wm.user_id = 'YOUR_USER_ID';

-- If missing, create one
INSERT INTO workspace_memberships (workspace_id, user_id, role, status)
VALUES ('WORKSPACE_ID', 'YOUR_USER_ID', 'member', 'active');
```

---

### Issue: "Some orphaned records remain"

**Meaning:** Some projects/notes couldn't be assigned to any workspace.

**Investigation:**
```sql
-- Find orphaned projects
SELECT id, name, user_id, workspace_id 
FROM projects 
WHERE workspace_id IS NULL AND is_deleted = false;

-- Check if those users have workspaces
SELECT user_id, COUNT(*) as membership_count
FROM workspace_memberships
WHERE user_id IN (SELECT user_id FROM projects WHERE workspace_id IS NULL)
GROUP BY user_id;
```

**Solution:** Manually assign to a workspace:
```sql
UPDATE projects 
SET workspace_id = 'YOUR_WORKSPACE_ID'
WHERE id = 'ORPHANED_PROJECT_ID';
```

---

## 📊 Verification Queries

After migration, run these to verify everything is correct:

### Check All Projects
```sql
SELECT 
    id, 
    name, 
    workspace_id, 
    is_deleted,
    created_at
FROM projects 
ORDER BY created_at DESC
LIMIT 20;
```

### Check Project-Note Relationships
```sql
SELECT 
    n.title as note_title,
    n.workspace_id as note_workspace,
    p.name as project_name,
    p.workspace_id as project_workspace,
    CASE 
        WHEN n.workspace_id = p.workspace_id THEN '✓ Match'
        ELSE '✗ Mismatch'
    END as status
FROM notes n
JOIN projects p ON n.project_id = p.id
WHERE n.project_id IS NOT NULL
AND n.is_deleted = false
AND p.is_deleted = false
ORDER BY n.created_at DESC
LIMIT 20;
```

### Check Your Workspace Access
```sql
SELECT 
    w.name as workspace_name,
    wm.role,
    wm.status,
    COUNT(p.id) as project_count
FROM workspace_memberships wm
JOIN workspaces w ON wm.workspace_id = w.id
LEFT JOIN projects p ON p.workspace_id = w.id AND p.is_deleted = false
WHERE wm.user_id = auth.uid()  -- Or replace with your user ID
GROUP BY w.id, w.name, wm.role, wm.status;
```

---

## ✅ Success Checklist

After completing recovery, verify:

- [ ] Diagnostics show "No critical issues found"
- [ ] All workspace memberships have status = 'active'
- [ ] Projects table has is_deleted = false for your projects
- [ ] All projects have non-NULL workspace_id
- [ ] Notes with project_id have matching workspace_id
- [ ] Sidebar shows all your projects
- [ ] Notes page displays correct project names
- [ ] Can create new projects without errors
- [ ] Can create new notes without errors

---

## 🆘 Still Having Issues?

If projects are still not visible after following this guide:

1. **Export your database state:**
   ```bash
   npx tsx scripts/diagnose-and-fix-projects.ts > diagnostic_output.txt
   ```

2. **Check these files:**
   - Browser console errors
   - Supabase logs (Dashboard → Logs)
   - Migration output from SQL editor

3. **Manual verification:**
   - Can you see projects in Supabase Dashboard → Table Editor → projects?
   - Does your user have entries in workspace_memberships?
   - Is your auth.uid() correct?

4. **Last resort - Manual fix:**
   ```sql
   -- Get your user ID
   SELECT auth.uid();
   
   -- Get your workspace ID
   SELECT id FROM workspaces WHERE owner_id = auth.uid() LIMIT 1;
   
   -- Manually assign all your projects
   UPDATE projects 
   SET workspace_id = 'YOUR_WORKSPACE_ID',
       is_deleted = false
   WHERE user_id = auth.uid();
   ```

---

## 📝 Key Differences: Migration 011 vs 012

| Aspect | Migration 011 (Bug) | Migration 012 (Fixed) |
|--------|---------------------|----------------------|
| Recovery | ❌ No soft-delete recovery | ✅ Recovers deleted projects |
| Membership Status | ❌ Only 'active' | ✅ Any status with fallback |
| Diagnostics | ⚠️ Basic logs | ✅ Detailed counts & warnings |
| Trigger Logic | ⚠️ Fails on non-active | ✅ Multiple fallbacks |
| Note Sync | ⚠️ Basic | ✅ Comprehensive workspace matching |

---

## 🎯 Summary

**The Problem:** Migration 011 didn't account for non-active workspace memberships and didn't recover soft-deleted projects.

**The Solution:** Migration 012 recovers deleted projects, works with any membership status, and has better error handling.

**Next Steps:**
1. Run diagnostics: `npx tsx scripts/diagnose-and-fix-projects.ts`
2. Fix membership status if needed
3. Execute migration 012
4. Verify in your app

---

**Last Updated:** 2026-02-01  
**Author:** Head of Development  
**Migration File:** `supabase/migrations/012_fix_orphaned_projects_recovery.sql`
