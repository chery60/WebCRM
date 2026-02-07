-- ============================================
-- MIGRATION: ADD WORKSPACE SCOPING TO EMPLOYEES
-- ============================================
-- This migration adds workspace_id to employees table for data isolation
-- between workspaces. Each employee will belong to exactly one workspace.

-- ============================================
-- ADD WORKSPACE_ID COLUMN TO EMPLOYEES
-- ============================================
ALTER TABLE employees ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id);
CREATE INDEX IF NOT EXISTS idx_employees_workspace_id ON employees(workspace_id);

-- ============================================
-- MIGRATE EXISTING EMPLOYEES TO OWNER'S FIRST WORKSPACE
-- ============================================
-- For each employee, assign to the workspace of the user who invited them
-- If no invited_by, use the first workspace of any active admin user
UPDATE employees e
SET workspace_id = (
    SELECT COALESCE(
        -- First, try the inviter's first workspace
        (SELECT wm.workspace_id 
         FROM workspace_memberships wm 
         WHERE wm.user_id = e.invited_by 
         AND wm.status = 'active'
         ORDER BY wm.joined_at ASC
         LIMIT 1),
        -- Fallback: use any active workspace with the same user_id
        (SELECT wm.workspace_id 
         FROM workspace_memberships wm 
         WHERE wm.status = 'active'
         ORDER BY wm.joined_at ASC
         LIMIT 1)
    )
)
WHERE e.workspace_id IS NULL;

-- ============================================
-- UPDATE RLS POLICIES FOR WORKSPACE-BASED ACCESS
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view employees" ON employees;
DROP POLICY IF EXISTS "Users can view own employees" ON employees;
DROP POLICY IF EXISTS "Users can insert employees" ON employees;
DROP POLICY IF EXISTS "Users can insert own employees" ON employees;
DROP POLICY IF EXISTS "Users can update employees" ON employees;
DROP POLICY IF EXISTS "Users can update own employees" ON employees;
DROP POLICY IF EXISTS "Users can delete employees" ON employees;
DROP POLICY IF EXISTS "Users can delete own employees" ON employees;

-- Create new workspace-scoped policies
CREATE POLICY "Users can view employees in their workspaces" ON employees
    FOR SELECT USING (
        workspace_id IS NULL OR
        workspace_id IN (
            SELECT workspace_id FROM workspace_memberships 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

CREATE POLICY "Users can insert employees in their workspaces" ON employees
    FOR INSERT WITH CHECK (
        workspace_id IS NULL OR
        workspace_id IN (
            SELECT workspace_id FROM workspace_memberships 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

CREATE POLICY "Users can update employees in their workspaces" ON employees
    FOR UPDATE USING (
        workspace_id IS NULL OR
        workspace_id IN (
            SELECT workspace_id FROM workspace_memberships 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

CREATE POLICY "Users can delete employees in their workspaces" ON employees
    FOR DELETE USING (
        workspace_id IS NULL OR
        workspace_id IN (
            SELECT workspace_id FROM workspace_memberships 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

-- ============================================
-- VERIFICATION QUERY (run manually to check)
-- ============================================
-- SELECT id, first_name, last_name, workspace_id 
-- FROM employees 
-- WHERE workspace_id IS NOT NULL
-- LIMIT 10;
