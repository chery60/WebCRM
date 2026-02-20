-- ============================================
-- QUICK CHECK: Your Workspace Membership Status
-- ============================================
-- Run this in Supabase SQL Editor to see if you're an admin

-- 1. Check your user ID
SELECT auth.uid() as your_user_id;

-- 2. Check your workspaces
SELECT 
    w.id as workspace_id,
    w.name as workspace_name,
    w.owner_id,
    CASE 
        WHEN w.owner_id = auth.uid() THEN 'YOU ARE OWNER'
        ELSE 'Not owner'
    END as owner_status
FROM workspaces w
WHERE w.is_deleted = false
ORDER BY w.created_at DESC;

-- 3. Check your workspace memberships
SELECT 
    wm.workspace_id,
    w.name as workspace_name,
    wm.role,
    wm.status,
    wm.joined_at,
    CASE 
        WHEN wm.role IN ('admin', 'owner') AND wm.status = 'active' THEN '✅ CAN ADD EMPLOYEES'
        WHEN wm.status != 'active' THEN '❌ NOT ACTIVE'
        ELSE '❌ NOT ADMIN/OWNER'
    END as can_add_employees
FROM workspace_memberships wm
JOIN workspaces w ON w.id = wm.workspace_id
WHERE wm.user_id = auth.uid()
ORDER BY wm.joined_at DESC;

-- 4. Test the helper function
SELECT 
    wm.workspace_id,
    w.name,
    is_workspace_admin(wm.workspace_id) as is_admin_result
FROM workspace_memberships wm
JOIN workspaces w ON w.id = wm.workspace_id
WHERE wm.user_id = auth.uid();

-- ============================================
-- EXPECTED RESULTS
-- ============================================
-- You should see at least ONE workspace where:
--   • role = 'admin' OR 'owner'
--   • status = 'active'
--   • can_add_employees = '✅ CAN ADD EMPLOYEES'
--
-- If you don't see this, that's why you can't add employees!
-- ============================================
