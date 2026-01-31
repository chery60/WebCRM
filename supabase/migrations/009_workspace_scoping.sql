-- Supabase Database Migration Script
-- Venture CRM - Workspace Scoping & User Onboarding
-- Run this in Supabase SQL Editor

-- ============================================
-- ADD WORKSPACE SCOPING TO NOTES
-- ============================================
ALTER TABLE notes ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id);
CREATE INDEX IF NOT EXISTS idx_notes_workspace_id ON notes(workspace_id);

-- ============================================
-- ADD WORKSPACE SCOPING TO PROJECTS
-- ============================================
ALTER TABLE projects ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id);
CREATE INDEX IF NOT EXISTS idx_projects_workspace_id ON projects(workspace_id);

-- ============================================
-- ADD ONBOARDING STATUS TO USERS
-- ============================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS has_completed_onboarding BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- ============================================
-- UPDATE RLS POLICIES FOR WORKSPACE SCOPING
-- ============================================

-- Notes: Users can only see notes in workspaces they belong to
DROP POLICY IF EXISTS "Users can view notes in their workspaces" ON notes;
CREATE POLICY "Users can view notes in their workspaces" ON notes
    FOR SELECT USING (
        workspace_id IS NULL OR
        workspace_id IN (
            SELECT workspace_id FROM workspace_memberships 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

DROP POLICY IF EXISTS "Users can insert notes in their workspaces" ON notes;
CREATE POLICY "Users can insert notes in their workspaces" ON notes
    FOR INSERT WITH CHECK (
        workspace_id IS NULL OR
        workspace_id IN (
            SELECT workspace_id FROM workspace_memberships 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

DROP POLICY IF EXISTS "Users can update notes in their workspaces" ON notes;
CREATE POLICY "Users can update notes in their workspaces" ON notes
    FOR UPDATE USING (
        workspace_id IS NULL OR
        workspace_id IN (
            SELECT workspace_id FROM workspace_memberships 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

DROP POLICY IF EXISTS "Users can delete notes in their workspaces" ON notes;
CREATE POLICY "Users can delete notes in their workspaces" ON notes
    FOR DELETE USING (
        workspace_id IS NULL OR
        workspace_id IN (
            SELECT workspace_id FROM workspace_memberships 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

-- Projects: Users can only see projects in workspaces they belong to
DROP POLICY IF EXISTS "Users can view projects in their workspaces" ON projects;
CREATE POLICY "Users can view projects in their workspaces" ON projects
    FOR SELECT USING (
        workspace_id IS NULL OR
        workspace_id IN (
            SELECT workspace_id FROM workspace_memberships 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

DROP POLICY IF EXISTS "Users can insert projects in their workspaces" ON projects;
CREATE POLICY "Users can insert projects in their workspaces" ON projects
    FOR INSERT WITH CHECK (
        workspace_id IS NULL OR
        workspace_id IN (
            SELECT workspace_id FROM workspace_memberships 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

DROP POLICY IF EXISTS "Users can update projects in their workspaces" ON projects;
CREATE POLICY "Users can update projects in their workspaces" ON projects
    FOR UPDATE USING (
        workspace_id IS NULL OR
        workspace_id IN (
            SELECT workspace_id FROM workspace_memberships 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

DROP POLICY IF EXISTS "Users can delete projects in their workspaces" ON projects;
CREATE POLICY "Users can delete projects in their workspaces" ON projects
    FOR DELETE USING (
        workspace_id IS NULL OR
        workspace_id IN (
            SELECT workspace_id FROM workspace_memberships 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );
