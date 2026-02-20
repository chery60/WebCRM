-- ============================================
-- CRITICAL FIX: Allow Admins to Insert Employees
-- ============================================
-- This fixes the RLS policy issue preventing employee creation
--
-- INSTRUCTIONS:
-- 1. Go to Supabase Dashboard SQL Editor
-- 2. Copy and paste this ENTIRE script
-- 3. Click "Run"
--
-- This will ensure workspace admins can add employees
-- ============================================

-- Step 1: Check current user and workspace status
DO $$ 
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CHECKING CURRENT USER STATUS';
    RAISE NOTICE '========================================';
END $$;

-- Show current user
SELECT 
    auth.uid() as current_user_id,
    auth.email() as current_user_email;

-- Show workspaces
SELECT 
    id as workspace_id,
    name as workspace_name,
    owner_id,
    CASE WHEN owner_id = auth.uid() THEN '✅ YOU ARE OWNER' ELSE 'Not owner' END as status
FROM workspaces
WHERE is_deleted = false;

-- Step 2: Ensure workspace membership exists with admin role
DO $$ 
DECLARE
    v_user_id UUID := auth.uid();
    v_workspace_id UUID;
    v_membership_exists BOOLEAN;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'ENSURING WORKSPACE MEMBERSHIP';
    RAISE NOTICE '========================================';
    
    -- Get the first workspace owned by the user
    SELECT id INTO v_workspace_id
    FROM workspaces
    WHERE owner_id = v_user_id
    AND is_deleted = false
    LIMIT 1;
    
    IF v_workspace_id IS NULL THEN
        RAISE NOTICE '⚠️  No workspace found owned by current user';
        RAISE NOTICE 'Creating a default workspace...';
        
        -- Create a workspace for the user
        INSERT INTO workspaces (name, owner_id, icon)
        VALUES ('My Workspace', v_user_id, '🏢')
        RETURNING id INTO v_workspace_id;
        
        RAISE NOTICE '✅ Created workspace: %', v_workspace_id;
    ELSE
        RAISE NOTICE '✅ Found workspace: %', v_workspace_id;
    END IF;
    
    -- Check if membership exists
    SELECT EXISTS(
        SELECT 1 FROM workspace_memberships
        WHERE user_id = v_user_id
        AND workspace_id = v_workspace_id
    ) INTO v_membership_exists;
    
    IF NOT v_membership_exists THEN
        RAISE NOTICE 'Creating workspace membership...';
        
        INSERT INTO workspace_memberships (
            workspace_id,
            user_id,
            role,
            status,
            joined_at
        ) VALUES (
            v_workspace_id,
            v_user_id,
            'owner',
            'active',
            NOW()
        );
        
        RAISE NOTICE '✅ Created workspace membership with owner role';
    ELSE
        -- Update to ensure it's active and owner role
        UPDATE workspace_memberships
        SET role = 'owner',
            status = 'active'
        WHERE user_id = v_user_id
        AND workspace_id = v_workspace_id;
        
        RAISE NOTICE '✅ Updated workspace membership to owner/active';
    END IF;
END $$;

-- Step 3: Verify workspace membership
SELECT 
    wm.workspace_id,
    w.name as workspace_name,
    wm.role,
    wm.status,
    CASE 
        WHEN wm.role IN ('owner', 'admin') AND wm.status = 'active' 
        THEN '✅ CAN ADD EMPLOYEES'
        ELSE '❌ CANNOT ADD EMPLOYEES'
    END as permission_status
FROM workspace_memberships wm
JOIN workspaces w ON w.id = wm.workspace_id
WHERE wm.user_id = auth.uid();

-- Step 4: Test the RLS helper function
DO $$ 
DECLARE
    v_workspace_id UUID;
    v_is_admin BOOLEAN;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'TESTING RLS HELPER FUNCTION';
    RAISE NOTICE '========================================';
    
    SELECT workspace_id INTO v_workspace_id
    FROM workspace_memberships
    WHERE user_id = auth.uid()
    LIMIT 1;
    
    IF v_workspace_id IS NOT NULL THEN
        SELECT is_workspace_admin(v_workspace_id) INTO v_is_admin;
        
        IF v_is_admin THEN
            RAISE NOTICE '✅ is_workspace_admin() returns TRUE';
            RAISE NOTICE 'You should be able to add employees now!';
        ELSE
            RAISE NOTICE '❌ is_workspace_admin() returns FALSE';
            RAISE NOTICE 'There may still be an issue with RLS policies';
        END IF;
    END IF;
END $$;

-- Step 5: Drop and recreate RLS policies to ensure they work
DO $$ 
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'REFRESHING RLS POLICIES';
    RAISE NOTICE '========================================';
    
    -- Drop existing policies
    DROP POLICY IF EXISTS "employees_select_policy" ON employees;
    DROP POLICY IF EXISTS "employees_insert_policy" ON employees;
    DROP POLICY IF EXISTS "employees_update_policy" ON employees;
    DROP POLICY IF EXISTS "employees_delete_policy" ON employees;
    
    RAISE NOTICE '✅ Dropped old RLS policies';
END $$;

-- Create new RLS policies with better error handling
CREATE POLICY "employees_select_policy" ON employees
    FOR SELECT USING (
        workspace_id IS NULL 
        OR EXISTS (
            SELECT 1 FROM workspace_memberships
            WHERE workspace_id = employees.workspace_id
            AND user_id = auth.uid()
            AND status = 'active'
        )
    );

CREATE POLICY "employees_insert_policy" ON employees
    FOR INSERT WITH CHECK (
        workspace_id IS NULL 
        OR EXISTS (
            SELECT 1 FROM workspace_memberships
            WHERE workspace_id = employees.workspace_id
            AND user_id = auth.uid()
            AND role IN ('owner', 'admin')
            AND status = 'active'
        )
    );

CREATE POLICY "employees_update_policy" ON employees
    FOR UPDATE USING (
        workspace_id IS NULL 
        OR EXISTS (
            SELECT 1 FROM workspace_memberships
            WHERE workspace_id = employees.workspace_id
            AND user_id = auth.uid()
            AND role IN ('owner', 'admin')
            AND status = 'active'
        )
    );

CREATE POLICY "employees_delete_policy" ON employees
    FOR DELETE USING (
        workspace_id IS NULL 
        OR EXISTS (
            SELECT 1 FROM workspace_memberships
            WHERE workspace_id = employees.workspace_id
            AND user_id = auth.uid()
            AND role IN ('owner', 'admin')
            AND status = 'active'
        )
    );

DO $$ 
BEGIN
    RAISE NOTICE '✅ Created new RLS policies with direct EXISTS checks';
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '🎉 FIX COMPLETE!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'What was fixed:';
    RAISE NOTICE '1. ✅ Ensured you have a workspace';
    RAISE NOTICE '2. ✅ Ensured you have workspace membership';
    RAISE NOTICE '3. ✅ Set your role to owner/active';
    RAISE NOTICE '4. ✅ Refreshed RLS policies';
    RAISE NOTICE '';
    RAISE NOTICE '👉 Now try adding an employee in your app!';
    RAISE NOTICE '========================================';
END $$;
