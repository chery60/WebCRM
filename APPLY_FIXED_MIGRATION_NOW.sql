-- ============================================
-- COPY AND RUN THIS IN SUPABASE SQL EDITOR
-- ============================================
-- This is the FIXED version that handles missing constraints

\i supabase/migrations/027_fix_employee_and_messaging.sql

-- After running, verify with this query:
SELECT 
    'VERIFICATION CHECK' as status,
    COUNT(DISTINCT e.id) as total_employees,
    COUNT(DISTINCT u.id) as synced_to_users,
    COUNT(DISTINCT wm.user_id) as synced_to_memberships,
    CASE 
        WHEN COUNT(DISTINCT e.id) = COUNT(DISTINCT wm.user_id) 
        THEN '✅ ALL EMPLOYEES SYNCED!' 
        ELSE '❌ SYNC INCOMPLETE - Check logs' 
    END as result
FROM employees e
LEFT JOIN users u ON u.email = e.email
LEFT JOIN workspace_memberships wm ON wm.user_id = u.id
WHERE e.is_deleted = false;

-- Also check individual employees:
SELECT 
    e.first_name || ' ' || e.last_name as name,
    e.email,
    CASE WHEN u.id IS NOT NULL THEN '✅' ELSE '❌' END as has_user,
    CASE WHEN wm.user_id IS NOT NULL THEN '✅' ELSE '❌' END as has_membership,
    wm.status
FROM employees e
LEFT JOIN users u ON u.email = e.email  
LEFT JOIN workspace_memberships wm ON wm.user_id = u.id AND wm.workspace_id = e.workspace_id
WHERE e.is_deleted = false
ORDER BY e.created_at DESC
LIMIT 10;
