-- ============================================
-- DIAGNOSTIC: Check Workspace Membership & RLS
-- ============================================
-- Run this in Supabase SQL Editor to diagnose the issue

-- Step 1: Check if is_workspace_admin function exists
SELECT 
    proname as function_name,
    pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname IN ('is_workspace_admin', 'is_workspace_member')
ORDER BY proname;

-- Step 2: Check current user's workspace memberships
SELECT 
    wm.id,
    wm.user_id,
    wm.workspace_id,
    w.name as workspace_name,
    wm.role,
    wm.status,
    wm.joined_at,
    u.email as user_email
FROM workspace_memberships wm
JOIN workspaces w ON w.id = wm.workspace_id
LEFT JOIN users u ON u.id = wm.user_id
WHERE wm.user_id = auth.uid()
ORDER BY wm.joined_at DESC;

-- Step 3: Check if user is admin in any workspace
SELECT 
    workspace_id,
    role,
    status,
    is_workspace_admin(workspace_id) as is_admin_check
FROM workspace_memberships
WHERE user_id = auth.uid()
AND role IN ('admin', 'owner')
AND status = 'active';

-- Step 4: Check current RLS policies on employees table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'employees'
ORDER BY policyname;

-- Step 5: Test if you can insert directly (bypassing RLS temporarily)
-- This will show the actual error if there is one
SET session_replication_role = replica; -- Temporarily disable RLS
SELECT 'RLS temporarily disabled for testing' as status;

-- Try a test insert (will show actual constraint errors if any)
-- Don't worry, we'll rollback this
BEGIN;
INSERT INTO employees (
    first_name,
    last_name,
    email,
    employee_id,
    workspace_id,
    role,
    invited_by
) VALUES (
    'Test',
    'User',
    'test-diagnostic@example.com',
    'TEST123',
    (SELECT workspace_id FROM workspace_memberships WHERE user_id = auth.uid() LIMIT 1),
    'member',
    auth.uid()
);
ROLLBACK; -- Don't actually insert

SET session_replication_role = DEFAULT; -- Re-enable RLS
SELECT 'RLS re-enabled' as status;

-- ============================================
-- EXPECTED RESULTS
-- ============================================
-- Step 1: Should show both functions exist
-- Step 2: Should show your workspace memberships with role='admin' or 'owner'
-- Step 3: Should show is_admin_check = true for at least one workspace
-- Step 4: Should show 4 policies: select, insert, update, delete
-- Step 5: Will show actual database error if there is one
