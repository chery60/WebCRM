-- Supabase Database Migration Script
-- Venture AI - Migrate Orphaned Projects to User Workspaces
-- ⚠️  WARNING: This migration has a bug - use 012_fix_orphaned_projects_recovery.sql instead
-- Date: 2026-02-01
-- Author: Head of Development
-- Status: DEPRECATED - Use migration 012 for correct fix

-- ============================================
-- STEP 1: DIAGNOSTIC - Count Orphaned Projects
-- ============================================

-- Log current state for audit trail
DO $$
DECLARE
    orphaned_projects_count INTEGER;
    orphaned_notes_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO orphaned_projects_count FROM projects WHERE workspace_id IS NULL AND is_deleted = false;
    SELECT COUNT(*) INTO orphaned_notes_count FROM notes WHERE workspace_id IS NULL AND is_deleted = false;
    
    RAISE NOTICE 'Migration 011 Starting: Found % orphaned projects and % orphaned notes', 
        orphaned_projects_count, orphaned_notes_count;
END $$;

-- ============================================
-- STEP 2: MIGRATE ORPHANED PROJECTS
-- ============================================

-- Strategy: Assign orphaned projects to the workspace of their creator
-- If creator has multiple workspaces, assign to their first active workspace
-- If creator has no workspace, assign to the workspace of any note referencing this project

-- First pass: Assign to creator's workspace
UPDATE projects 
SET workspace_id = (
    SELECT wm.workspace_id 
    FROM workspace_memberships wm 
    WHERE wm.user_id = projects.user_id 
    AND wm.status = 'active'
    ORDER BY wm.joined_at ASC
    LIMIT 1
),
updated_at = NOW()
WHERE workspace_id IS NULL 
AND is_deleted = false
AND user_id IS NOT NULL;

-- Second pass: For projects without user_id, try to infer from notes
UPDATE projects p
SET workspace_id = (
    SELECT n.workspace_id
    FROM notes n
    WHERE n.project_id = p.id
    AND n.workspace_id IS NOT NULL
    AND n.is_deleted = false
    ORDER BY n.created_at DESC
    LIMIT 1
),
updated_at = NOW()
WHERE p.workspace_id IS NULL 
AND p.is_deleted = false
AND EXISTS (
    SELECT 1 FROM notes n 
    WHERE n.project_id = p.id 
    AND n.workspace_id IS NOT NULL
    AND n.is_deleted = false
);

-- ============================================
-- STEP 3: MIGRATE ORPHANED NOTES
-- ============================================

-- Assign orphaned notes to their author's workspace
UPDATE notes 
SET workspace_id = (
    SELECT wm.workspace_id 
    FROM workspace_memberships wm 
    WHERE wm.user_id = notes.author_id 
    AND wm.status = 'active'
    ORDER BY wm.joined_at ASC
    LIMIT 1
),
updated_at = NOW()
WHERE workspace_id IS NULL 
AND is_deleted = false
AND author_id IS NOT NULL;

-- ============================================
-- STEP 4: FIX PROJECT REFERENCES IN NOTES
-- ============================================

-- Ensure all notes with project_id have matching workspace_id
-- This handles cases where notes reference projects in different workspaces
UPDATE notes n
SET workspace_id = (
    SELECT p.workspace_id
    FROM projects p
    WHERE p.id = n.project_id
    AND p.workspace_id IS NOT NULL
),
updated_at = NOW()
WHERE n.project_id IS NOT NULL
AND n.workspace_id IS NULL
AND n.is_deleted = false
AND EXISTS (
    SELECT 1 FROM projects p 
    WHERE p.id = n.project_id 
    AND p.workspace_id IS NOT NULL
);

-- ============================================
-- STEP 5: SOFT DELETE UNRECOVERABLE ORPHANS
-- ============================================

-- Soft delete projects that couldn't be assigned (no owner, no references)
UPDATE projects 
SET is_deleted = true,
    updated_at = NOW()
WHERE workspace_id IS NULL
AND is_deleted = false;

-- Soft delete notes that couldn't be assigned (no author, no workspace)
UPDATE notes 
SET is_deleted = true,
    updated_at = NOW()
WHERE workspace_id IS NULL
AND is_deleted = false;

-- ============================================
-- STEP 6: ADD SAFETY CONSTRAINTS
-- ============================================

-- Create function to auto-assign workspace_id on project creation
CREATE OR REPLACE FUNCTION auto_assign_project_workspace()
RETURNS TRIGGER AS $$
BEGIN
    -- If workspace_id is not provided, assign to user's first active workspace
    IF NEW.workspace_id IS NULL AND NEW.user_id IS NOT NULL THEN
        SELECT workspace_id INTO NEW.workspace_id
        FROM workspace_memberships
        WHERE user_id = NEW.user_id
        AND status = 'active'
        ORDER BY joined_at ASC
        LIMIT 1;
    END IF;
    
    -- If still NULL, raise error
    IF NEW.workspace_id IS NULL THEN
        RAISE EXCEPTION 'Cannot create project without workspace_id. User must be a member of at least one workspace.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for projects
DROP TRIGGER IF EXISTS trigger_auto_assign_project_workspace ON projects;
CREATE TRIGGER trigger_auto_assign_project_workspace
    BEFORE INSERT ON projects
    FOR EACH ROW
    EXECUTE FUNCTION auto_assign_project_workspace();

-- Create function to auto-assign workspace_id on note creation
CREATE OR REPLACE FUNCTION auto_assign_note_workspace()
RETURNS TRIGGER AS $$
BEGIN
    -- If workspace_id is not provided but project_id is, use project's workspace
    IF NEW.workspace_id IS NULL AND NEW.project_id IS NOT NULL THEN
        SELECT workspace_id INTO NEW.workspace_id
        FROM projects
        WHERE id = NEW.project_id
        AND is_deleted = false;
    END IF;
    
    -- If still NULL and author exists, assign to author's first active workspace
    IF NEW.workspace_id IS NULL AND NEW.author_id IS NOT NULL THEN
        SELECT workspace_id INTO NEW.workspace_id
        FROM workspace_memberships
        WHERE user_id = NEW.author_id
        AND status = 'active'
        ORDER BY joined_at ASC
        LIMIT 1;
    END IF;
    
    -- If still NULL, raise error
    IF NEW.workspace_id IS NULL THEN
        RAISE EXCEPTION 'Cannot create note without workspace_id. User must be a member of at least one workspace.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for notes
DROP TRIGGER IF EXISTS trigger_auto_assign_note_workspace ON notes;
CREATE TRIGGER trigger_auto_assign_note_workspace
    BEFORE INSERT ON notes
    FOR EACH ROW
    EXECUTE FUNCTION auto_assign_note_workspace();

-- ============================================
-- STEP 7: VERIFICATION & AUDIT
-- ============================================

-- Log final state for audit trail
DO $$
DECLARE
    remaining_orphaned_projects INTEGER;
    remaining_orphaned_notes INTEGER;
    migrated_projects INTEGER;
    migrated_notes INTEGER;
BEGIN
    SELECT COUNT(*) INTO remaining_orphaned_projects FROM projects WHERE workspace_id IS NULL AND is_deleted = false;
    SELECT COUNT(*) INTO remaining_orphaned_notes FROM notes WHERE workspace_id IS NULL AND is_deleted = false;
    
    RAISE NOTICE 'Migration 011 Complete: % orphaned projects remain, % orphaned notes remain', 
        remaining_orphaned_projects, remaining_orphaned_notes;
    
    IF remaining_orphaned_projects > 0 OR remaining_orphaned_notes > 0 THEN
        RAISE WARNING 'Some orphaned records remain. Manual intervention may be required.';
    ELSE
        RAISE NOTICE 'SUCCESS: All orphaned records have been migrated or soft-deleted.';
    END IF;
END $$;

-- ============================================
-- VERIFICATION QUERIES (Run manually to check)
-- ============================================

-- Check for any projects without workspace_id
-- SELECT id, name, user_id, workspace_id, is_deleted, created_at 
-- FROM projects 
-- WHERE workspace_id IS NULL
-- ORDER BY created_at DESC;

-- Check for any notes without workspace_id
-- SELECT id, title, author_id, project_id, workspace_id, is_deleted, created_at 
-- FROM notes 
-- WHERE workspace_id IS NULL
-- ORDER BY created_at DESC;

-- Check notes that reference projects
-- SELECT n.id as note_id, n.title, n.workspace_id as note_workspace, 
--        p.id as project_id, p.name as project_name, p.workspace_id as project_workspace
-- FROM notes n
-- LEFT JOIN projects p ON n.project_id = p.id
-- WHERE n.project_id IS NOT NULL
-- AND n.is_deleted = false
-- ORDER BY n.created_at DESC
-- LIMIT 20;

-- ============================================
-- ROLLBACK PLAN (If needed)
-- ============================================
-- To rollback this migration:
-- 1. DROP TRIGGER trigger_auto_assign_project_workspace ON projects;
-- 2. DROP TRIGGER trigger_auto_assign_note_workspace ON notes;
-- 3. DROP FUNCTION auto_assign_project_workspace();
-- 4. DROP FUNCTION auto_assign_note_workspace();
-- 5. Restore from backup if data migration needs to be undone
