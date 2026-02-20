-- ============================================
-- QUICK FIX FOR DIRECT MESSAGING ISSUE
-- ============================================
-- Copy this entire file and run it in Supabase SQL Editor
-- This will make employees appear in the "Start a direct message" dialog

-- Or just run: supabase/migrations/027_fix_employee_and_messaging.sql

-- STEP 1: Verify the issue
SELECT 
    'DIAGNOSIS' as step,
    COUNT(DISTINCT e.id) as total_employees,
    COUNT(DISTINCT u.id) as synced_to_users,
    COUNT(DISTINCT wm.user_id) as synced_to_memberships
FROM employees e
LEFT JOIN users u ON u.email = e.email
LEFT JOIN workspace_memberships wm ON wm.user_id = u.id
WHERE e.is_deleted = false;

-- If synced_to_memberships is 0 or less than total_employees, you need this fix!

-- STEP 2: Apply the complete migration
\i supabase/migrations/027_fix_employee_and_messaging.sql

-- STEP 3: Verify the fix worked
SELECT 
    'VERIFICATION' as step,
    e.first_name || ' ' || e.last_name as employee_name,
    e.email,
    CASE WHEN u.id IS NOT NULL THEN '✅' ELSE '❌' END as has_user_record,
    CASE WHEN wm.user_id IS NOT NULL THEN '✅' ELSE '❌' END as has_workspace_membership,
    wm.status as membership_status
FROM employees e
LEFT JOIN users u ON u.email = e.email
LEFT JOIN workspace_memberships wm ON wm.user_id = u.id AND wm.workspace_id = e.workspace_id
WHERE e.is_deleted = false
ORDER BY e.created_at DESC;

-- All employees should show ✅ ✅ and status = 'active'

-- DONE! Now test the messaging feature in your app.
