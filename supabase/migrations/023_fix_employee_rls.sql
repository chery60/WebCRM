-- ============================================
-- MIGRATION: FIX EMPLOYEE RLS POLICIES (023)
-- ============================================
-- This migration fixes the employee deletion issue by:
-- 1. Dropping conflicting old RLS policies that check employees.role
-- 2. Creating new policies that properly check workspace_memberships.role
-- 
-- The old policies in 002_rls_policies.sql checked if auth.uid() matched
-- an employee record with role='admin', but users are stored in the users
-- table and their workspace role is in workspace_memberships.

DO $$
BEGIN
    -- Drop ALL existing policies on employees table to start fresh
    DROP POLICY IF EXISTS "Anyone can view employees" ON employees;
    DROP POLICY IF EXISTS "Admins can insert employees" ON employees;
    DROP POLICY IF EXISTS "Admins can update employees" ON employees;
    DROP POLICY IF EXISTS "Users can view employees in their workspaces" ON employees;
    DROP POLICY IF EXISTS "Users can insert employees in their workspaces" ON employees;
    DROP POLICY IF EXISTS "Users can update employees in their workspaces" ON employees;
    DROP POLICY IF EXISTS "Users can delete employees in their workspaces" ON employees;
END $$;

-- ============================================
-- HELPER FUNCTION: Check if user is admin/owner of employee's workspace
-- ============================================
CREATE OR REPLACE FUNCTION is_employee_workspace_admin(_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Return true if workspace_id is NULL (legacy data) or user is admin/owner
  IF _workspace_id IS NULL THEN
    RETURN true;
  END IF;
  
  RETURN EXISTS (
    SELECT 1
    FROM workspace_memberships
    WHERE workspace_id = _workspace_id
    AND user_id = auth.uid()
    AND role IN ('owner', 'admin')
    AND status = 'active'
  );
END;
$$;

-- ============================================
-- NEW RLS POLICIES FOR EMPLOYEES
-- ============================================

-- SELECT: Users can view employees in their workspaces
CREATE POLICY "employees_select_policy" ON employees
    FOR SELECT USING (
        workspace_id IS NULL 
        OR is_workspace_member(workspace_id)
    );

-- INSERT: Only workspace admins/owners can add employees
CREATE POLICY "employees_insert_policy" ON employees
    FOR INSERT WITH CHECK (
        workspace_id IS NULL 
        OR is_workspace_admin(workspace_id)
    );

-- UPDATE: Only workspace admins/owners can update employees
CREATE POLICY "employees_update_policy" ON employees
    FOR UPDATE USING (
        workspace_id IS NULL 
        OR is_workspace_admin(workspace_id)
    );

-- DELETE: Only workspace admins/owners can delete employees
CREATE POLICY "employees_delete_policy" ON employees
    FOR DELETE USING (
        workspace_id IS NULL 
        OR is_workspace_admin(workspace_id)
    );

-- ============================================
-- VERIFICATION (run manually)
-- ============================================
-- SELECT policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'employees';
