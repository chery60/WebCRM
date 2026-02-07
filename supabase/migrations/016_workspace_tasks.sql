-- Supabase Database Migration Script
-- Venture CRM - Add Workspace Scoping to Tasks
-- Run this in Supabase SQL Editor

-- ============================================
-- ADD WORKSPACE SCOPING TO TASKS
-- ============================================
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id);
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_id ON tasks(workspace_id);

-- ============================================
-- MIGRATE EXISTING TASKS TO OWNER'S FIRST WORKSPACE
-- ============================================
-- For each task, assign it to the user's first workspace
UPDATE tasks t
SET workspace_id = (
    SELECT wm.workspace_id 
    FROM workspace_memberships wm 
    WHERE wm.user_id = t.user_id 
    AND wm.status = 'active'
    ORDER BY wm.joined_at ASC
    LIMIT 1
)
WHERE t.workspace_id IS NULL;

-- ============================================
-- UPDATE RLS POLICIES FOR WORKSPACE-BASED ACCESS
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can create own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON tasks;

-- New workspace-scoped policies
CREATE POLICY "Users can view tasks in their workspaces" ON tasks
    FOR SELECT USING (
        workspace_id IS NULL OR
        workspace_id IN (
            SELECT workspace_id FROM workspace_memberships 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

CREATE POLICY "Users can insert tasks in their workspaces" ON tasks
    FOR INSERT WITH CHECK (
        workspace_id IS NULL OR
        workspace_id IN (
            SELECT workspace_id FROM workspace_memberships 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

CREATE POLICY "Users can update tasks in their workspaces" ON tasks
    FOR UPDATE USING (
        workspace_id IS NULL OR
        workspace_id IN (
            SELECT workspace_id FROM workspace_memberships 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

CREATE POLICY "Users can delete tasks in their workspaces" ON tasks
    FOR DELETE USING (
        workspace_id IS NULL OR
        workspace_id IN (
            SELECT workspace_id FROM workspace_memberships 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );
