-- Supabase Database Migration Script
-- Venture CRM - Fix Workspace Isolation Security Issue
-- This migration fixes critical security vulnerability where users could see all notes
-- Run this in Supabase SQL Editor

-- ============================================
-- STEP 1: MIGRATE EXISTING DATA
-- ============================================

-- Assign all notes without workspace_id to their author's first workspace
-- This ensures no "orphan" notes that would be visible to everyone
UPDATE notes 
SET workspace_id = (
    SELECT wm.workspace_id 
    FROM workspace_memberships wm 
    WHERE wm.user_id = notes.author_id 
    AND wm.status = 'active'
    LIMIT 1
)
WHERE workspace_id IS NULL 
AND author_id IS NOT NULL;

-- Soft delete any remaining notes that couldn't be assigned (orphaned notes)
UPDATE notes 
SET is_deleted = true 
WHERE workspace_id IS NULL;

-- Same for projects
UPDATE projects 
SET workspace_id = (
    SELECT wm.workspace_id 
    FROM workspace_memberships wm 
    WHERE wm.user_id = projects.user_id 
    AND wm.status = 'active'
    LIMIT 1
)
WHERE workspace_id IS NULL 
AND user_id IS NOT NULL;

UPDATE projects 
SET is_deleted = true 
WHERE workspace_id IS NULL;

-- ============================================
-- STEP 2: DROP OLD CONFLICTING POLICIES
-- ============================================

-- Drop policies from migration 002 (too permissive)
DROP POLICY IF EXISTS "Authenticated users can view notes" ON notes;
DROP POLICY IF EXISTS "Authenticated users can create notes" ON notes;
DROP POLICY IF EXISTS "Users can update own notes" ON notes;

-- Drop policies from migration 003 (conflicts with workspace scoping)
DROP POLICY IF EXISTS "Users can view own notes" ON notes;
DROP POLICY IF EXISTS "Users can create own notes" ON notes;
DROP POLICY IF EXISTS "Users can update own notes" ON notes;

-- Drop the workspace scoping policies from 009 (we'll recreate without NULL support)
DROP POLICY IF EXISTS "Users can view notes in their workspaces" ON notes;
DROP POLICY IF EXISTS "Users can insert notes in their workspaces" ON notes;
DROP POLICY IF EXISTS "Users can update notes in their workspaces" ON notes;
DROP POLICY IF EXISTS "Users can delete notes in their workspaces" ON notes;

DROP POLICY IF EXISTS "Users can view projects in their workspaces" ON projects;
DROP POLICY IF EXISTS "Users can insert projects in their workspaces" ON projects;
DROP POLICY IF EXISTS "Users can update projects in their workspaces" ON projects;
DROP POLICY IF EXISTS "Users can delete projects in their workspaces" ON projects;

-- ============================================
-- STEP 3: CREATE SECURE WORKSPACE-ONLY POLICIES
-- ============================================

-- NOTES POLICIES
-- Users can ONLY view notes in workspaces they are members of
CREATE POLICY "notes_select_workspace_members" ON notes
    FOR SELECT USING (
        is_deleted = false AND
        workspace_id IN (
            SELECT workspace_id FROM workspace_memberships 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

-- Users can ONLY create notes in workspaces they are members of
CREATE POLICY "notes_insert_workspace_members" ON notes
    FOR INSERT WITH CHECK (
        workspace_id IN (
            SELECT workspace_id FROM workspace_memberships 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

-- Users can ONLY update notes in workspaces they are members of
-- Additional check: must be the author OR have admin role
CREATE POLICY "notes_update_workspace_members" ON notes
    FOR UPDATE USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_memberships 
            WHERE user_id = auth.uid() AND status = 'active'
        ) AND (
            author_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM workspace_memberships
                WHERE user_id = auth.uid() 
                AND workspace_id = notes.workspace_id
                AND role IN ('owner', 'admin')
            )
        )
    );

-- Users can ONLY delete notes in workspaces they are members of
-- Additional check: must be the author OR have admin role
CREATE POLICY "notes_delete_workspace_members" ON notes
    FOR DELETE USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_memberships 
            WHERE user_id = auth.uid() AND status = 'active'
        ) AND (
            author_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM workspace_memberships
                WHERE user_id = auth.uid() 
                AND workspace_id = notes.workspace_id
                AND role IN ('owner', 'admin')
            )
        )
    );

-- PROJECTS POLICIES
-- Users can ONLY view projects in workspaces they are members of
CREATE POLICY "projects_select_workspace_members" ON projects
    FOR SELECT USING (
        is_deleted = false AND
        workspace_id IN (
            SELECT workspace_id FROM workspace_memberships 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

-- Users can ONLY create projects in workspaces they are members of
CREATE POLICY "projects_insert_workspace_members" ON projects
    FOR INSERT WITH CHECK (
        workspace_id IN (
            SELECT workspace_id FROM workspace_memberships 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

-- Users can ONLY update projects in workspaces they are members of
CREATE POLICY "projects_update_workspace_members" ON projects
    FOR UPDATE USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_memberships 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

-- Users can ONLY delete projects in workspaces they are members of (admins only)
CREATE POLICY "projects_delete_workspace_admins" ON projects
    FOR DELETE USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_memberships 
            WHERE user_id = auth.uid() 
            AND status = 'active'
            AND role IN ('owner', 'admin')
        )
    );

-- ============================================
-- STEP 4: ADD NOT NULL CONSTRAINT (OPTIONAL - COMMENTED OUT)
-- ============================================
-- Uncomment after verifying all existing data has workspace_id
-- ALTER TABLE notes ALTER COLUMN workspace_id SET NOT NULL;
-- ALTER TABLE projects ALTER COLUMN workspace_id SET NOT NULL;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these after migration to verify:

-- Check for any notes without workspace_id
-- SELECT COUNT(*) FROM notes WHERE workspace_id IS NULL;

-- Check for any projects without workspace_id  
-- SELECT COUNT(*) FROM projects WHERE workspace_id IS NULL;

-- List all active policies on notes table
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies WHERE tablename = 'notes';
