-- Supabase Database Migration Script
-- Venture CRM - Add Workspace Scoping to Pipelines
-- Run this in Supabase SQL Editor

-- ============================================
-- ADD WORKSPACE SCOPING TO PIPELINES
-- ============================================
ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id);
CREATE INDEX IF NOT EXISTS idx_pipelines_workspace_id ON pipelines(workspace_id);

-- ============================================
-- MIGRATE EXISTING PIPELINES TO OWNER'S FIRST WORKSPACE
-- ============================================
-- For each pipeline, assign it to the user's first workspace
UPDATE pipelines p
SET workspace_id = (
    SELECT wm.workspace_id 
    FROM workspace_memberships wm 
    WHERE wm.user_id = p.user_id 
    AND wm.status = 'active'
    ORDER BY wm.joined_at ASC
    LIMIT 1
)
WHERE p.workspace_id IS NULL;

-- ============================================
-- UPDATE RLS POLICIES FOR WORKSPACE-BASED ACCESS
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own pipelines" ON pipelines;
DROP POLICY IF EXISTS "Users can create own pipelines" ON pipelines;
DROP POLICY IF EXISTS "Users can update own pipelines" ON pipelines;
DROP POLICY IF EXISTS "Users can delete own pipelines" ON pipelines;

-- New workspace-scoped policies
CREATE POLICY "Users can view pipelines in their workspaces" ON pipelines
    FOR SELECT USING (
        workspace_id IS NULL OR
        workspace_id IN (
            SELECT workspace_id FROM workspace_memberships 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

CREATE POLICY "Users can insert pipelines in their workspaces" ON pipelines
    FOR INSERT WITH CHECK (
        workspace_id IS NULL OR
        workspace_id IN (
            SELECT workspace_id FROM workspace_memberships 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

CREATE POLICY "Users can update pipelines in their workspaces" ON pipelines
    FOR UPDATE USING (
        workspace_id IS NULL OR
        workspace_id IN (
            SELECT workspace_id FROM workspace_memberships 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

CREATE POLICY "Users can delete pipelines in their workspaces" ON pipelines
    FOR DELETE USING (
        workspace_id IS NULL OR
        workspace_id IN (
            SELECT workspace_id FROM workspace_memberships 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );
