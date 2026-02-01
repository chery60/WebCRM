-- Supabase Database Migration Script
-- Venture AI - RECOVERY: Fix Orphaned Projects (Corrected Version)
-- This fixes issues from migration 011 and recovers soft-deleted projects
-- Date: 2026-02-01
-- Author: Head of Development

-- ============================================
-- STEP 1: DIAGNOSTIC - Current State
-- ============================================

DO $$
DECLARE
    orphaned_projects_count INTEGER;
    soft_deleted_projects_count INTEGER;
    orphaned_notes_count INTEGER;
    workspace_memberships_count INTEGER;
    active_memberships_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO orphaned_projects_count 
    FROM projects WHERE workspace_id IS NULL AND is_deleted = false;
    
    SELECT COUNT(*) INTO soft_deleted_projects_count 
    FROM projects WHERE is_deleted = true;
    
    SELECT COUNT(*) INTO orphaned_notes_count 
    FROM notes WHERE workspace_id IS NULL AND is_deleted = false;
    
    SELECT COUNT(*) INTO workspace_memberships_count 
    FROM workspace_memberships;
    
    SELECT COUNT(*) INTO active_memberships_count 
    FROM workspace_memberships WHERE status = 'active';
    
    RAISE NOTICE 'Migration 012 Starting:';
    RAISE NOTICE '  - Orphaned projects (active): %', orphaned_projects_count;
    RAISE NOTICE '  - Soft-deleted projects: %', soft_deleted_projects_count;
    RAISE NOTICE '  - Orphaned notes (active): %', orphaned_notes_count;
    RAISE NOTICE '  - Total workspace memberships: %', workspace_memberships_count;
    RAISE NOTICE '  - Active memberships: %', active_memberships_count;
END $$;

-- ============================================
-- STEP 2: RECOVER SOFT-DELETED PROJECTS
-- ============================================

-- First, restore projects that were incorrectly soft-deleted
-- These are projects that have a valid user_id but were deleted because
-- migration 010/011 couldn't find their workspace

UPDATE projects 
SET is_deleted = false,
    updated_at = NOW()
WHERE is_deleted = true
AND user_id IS NOT NULL
AND user_id IN (
    SELECT user_id FROM workspace_memberships WHERE status = 'active'
);

-- ============================================
-- STEP 3: MIGRATE ORPHANED PROJECTS (CORRECTED)
-- ============================================

-- First pass: Assign to creator's ACTIVE workspace
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
AND user_id IS NOT NULL
AND EXISTS (
    SELECT 1 FROM workspace_memberships wm 
    WHERE wm.user_id = projects.user_id 
    AND wm.status = 'active'
);

-- Second pass: For users with only 'invited' status, use those workspaces
UPDATE projects 
SET workspace_id = (
    SELECT wm.workspace_id 
    FROM workspace_memberships wm 
    WHERE wm.user_id = projects.user_id 
    ORDER BY wm.joined_at ASC
    LIMIT 1
),
updated_at = NOW()
WHERE workspace_id IS NULL 
AND is_deleted = false
AND user_id IS NOT NULL
AND EXISTS (
    SELECT 1 FROM workspace_memberships wm 
    WHERE wm.user_id = projects.user_id
);

-- Third pass: Infer from notes that reference this project
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
-- STEP 4: MIGRATE ORPHANED NOTES (CORRECTED)
-- ============================================

-- Restore soft-deleted notes that have valid authors
UPDATE notes 
SET is_deleted = false,
    updated_at = NOW()
WHERE is_deleted = true
AND author_id IS NOT NULL
AND author_id IN (
    SELECT user_id FROM workspace_memberships WHERE status = 'active'
);

-- First pass: Assign to author's ACTIVE workspace
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
AND author_id IS NOT NULL
AND EXISTS (
    SELECT 1 FROM workspace_memberships wm 
    WHERE wm.user_id = notes.author_id 
    AND wm.status = 'active'
);

-- Second pass: For users with ANY workspace membership
UPDATE notes 
SET workspace_id = (
    SELECT wm.workspace_id 
    FROM workspace_memberships wm 
    WHERE wm.user_id = notes.author_id 
    ORDER BY wm.joined_at ASC
    LIMIT 1
),
updated_at = NOW()
WHERE workspace_id IS NULL 
AND is_deleted = false
AND author_id IS NOT NULL
AND EXISTS (
    SELECT 1 FROM workspace_memberships wm 
    WHERE wm.user_id = notes.author_id
);

-- ============================================
-- STEP 5: FIX PROJECT REFERENCES IN NOTES
-- ============================================

-- Ensure notes match their project's workspace
UPDATE notes n
SET workspace_id = (
    SELECT p.workspace_id
    FROM projects p
    WHERE p.id = n.project_id
    AND p.workspace_id IS NOT NULL
    AND p.is_deleted = false
),
updated_at = NOW()
WHERE n.project_id IS NOT NULL
AND n.is_deleted = false
AND EXISTS (
    SELECT 1 FROM projects p 
    WHERE p.id = n.project_id 
    AND p.workspace_id IS NOT NULL
    AND p.is_deleted = false
)
AND (
    n.workspace_id IS NULL 
    OR n.workspace_id != (
        SELECT workspace_id FROM projects WHERE id = n.project_id
    )
);

-- ============================================
-- STEP 6: ONLY SOFT-DELETE TRULY ORPHANED DATA
-- ============================================

-- Only delete projects with NO valid user and NO notes referencing them
UPDATE projects 
SET is_deleted = true,
    updated_at = NOW()
WHERE workspace_id IS NULL
AND is_deleted = false
AND (
    user_id IS NULL 
    OR user_id NOT IN (SELECT user_id FROM workspace_memberships)
)
AND NOT EXISTS (
    SELECT 1 FROM notes WHERE project_id = projects.id AND is_deleted = false
);

-- Only delete notes with NO valid author
UPDATE notes 
SET is_deleted = true,
    updated_at = NOW()
WHERE workspace_id IS NULL
AND is_deleted = false
AND (
    author_id IS NULL 
    OR author_id NOT IN (SELECT user_id FROM workspace_memberships)
);

-- ============================================
-- STEP 7: UPDATE/REPLACE TRIGGERS (FIXED)
-- ============================================

-- Drop old triggers if they exist
DROP TRIGGER IF EXISTS trigger_auto_assign_project_workspace ON projects;
DROP TRIGGER IF EXISTS trigger_auto_assign_note_workspace ON notes;

-- Create CORRECTED function for projects
CREATE OR REPLACE FUNCTION auto_assign_project_workspace()
RETURNS TRIGGER AS $$
BEGIN
    -- If workspace_id is not provided, try to assign
    IF NEW.workspace_id IS NULL AND NEW.user_id IS NOT NULL THEN
        -- First try active memberships
        SELECT workspace_id INTO NEW.workspace_id
        FROM workspace_memberships
        WHERE user_id = NEW.user_id
        AND status = 'active'
        ORDER BY joined_at ASC
        LIMIT 1;
        
        -- If no active membership, try ANY membership
        IF NEW.workspace_id IS NULL THEN
            SELECT workspace_id INTO NEW.workspace_id
            FROM workspace_memberships
            WHERE user_id = NEW.user_id
            ORDER BY joined_at ASC
            LIMIT 1;
        END IF;
    END IF;
    
    -- If still NULL, raise error with helpful message
    IF NEW.workspace_id IS NULL THEN
        RAISE EXCEPTION 'Cannot create project without workspace. User must be a member of at least one workspace. User ID: %', NEW.user_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for projects
CREATE TRIGGER trigger_auto_assign_project_workspace
    BEFORE INSERT ON projects
    FOR EACH ROW
    EXECUTE FUNCTION auto_assign_project_workspace();

-- Create CORRECTED function for notes
CREATE OR REPLACE FUNCTION auto_assign_note_workspace()
RETURNS TRIGGER AS $$
BEGIN
    -- Priority 1: If project_id is provided, use project's workspace
    IF NEW.workspace_id IS NULL AND NEW.project_id IS NOT NULL THEN
        SELECT workspace_id INTO NEW.workspace_id
        FROM projects
        WHERE id = NEW.project_id
        AND is_deleted = false;
    END IF;
    
    -- Priority 2: If author exists, try their active workspace
    IF NEW.workspace_id IS NULL AND NEW.author_id IS NOT NULL THEN
        SELECT workspace_id INTO NEW.workspace_id
        FROM workspace_memberships
        WHERE user_id = NEW.author_id
        AND status = 'active'
        ORDER BY joined_at ASC
        LIMIT 1;
        
        -- Fallback: Try ANY workspace membership
        IF NEW.workspace_id IS NULL THEN
            SELECT workspace_id INTO NEW.workspace_id
            FROM workspace_memberships
            WHERE user_id = NEW.author_id
            ORDER BY joined_at ASC
            LIMIT 1;
        END IF;
    END IF;
    
    -- If still NULL, raise error with helpful message
    IF NEW.workspace_id IS NULL THEN
        RAISE EXCEPTION 'Cannot create note without workspace. User must be a member of at least one workspace. Author ID: %', NEW.author_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for notes
CREATE TRIGGER trigger_auto_assign_note_workspace
    BEFORE INSERT ON notes
    FOR EACH ROW
    EXECUTE FUNCTION auto_assign_note_workspace();

-- ============================================
-- STEP 8: VERIFICATION & AUDIT
-- ============================================

DO $$
DECLARE
    remaining_orphaned_projects INTEGER;
    remaining_orphaned_notes INTEGER;
    recovered_projects INTEGER;
    active_projects INTEGER;
BEGIN
    SELECT COUNT(*) INTO remaining_orphaned_projects 
    FROM projects WHERE workspace_id IS NULL AND is_deleted = false;
    
    SELECT COUNT(*) INTO remaining_orphaned_notes 
    FROM notes WHERE workspace_id IS NULL AND is_deleted = false;
    
    SELECT COUNT(*) INTO active_projects 
    FROM projects WHERE is_deleted = false;
    
    RAISE NOTICE 'Migration 012 Complete:';
    RAISE NOTICE '  - Remaining orphaned projects: %', remaining_orphaned_projects;
    RAISE NOTICE '  - Remaining orphaned notes: %', remaining_orphaned_notes;
    RAISE NOTICE '  - Total active projects: %', active_projects;
    
    IF remaining_orphaned_projects > 0 OR remaining_orphaned_notes > 0 THEN
        RAISE WARNING 'Some orphaned records remain. This may indicate users without workspace memberships.';
    ELSE
        RAISE NOTICE 'SUCCESS: All orphaned records have been migrated or appropriately handled.';
    END IF;
END $$;

-- ============================================
-- MANUAL VERIFICATION QUERIES
-- ============================================

-- Check your projects status
-- SELECT id, name, user_id, workspace_id, is_deleted, created_at 
-- FROM projects 
-- ORDER BY created_at DESC
-- LIMIT 20;

-- Check your notes
-- SELECT id, title, author_id, project_id, workspace_id, is_deleted 
-- FROM notes 
-- ORDER BY created_at DESC
-- LIMIT 20;

-- Check workspace memberships
-- SELECT wm.user_id, wm.workspace_id, wm.status, w.name as workspace_name
-- FROM workspace_memberships wm
-- JOIN workspaces w ON wm.workspace_id = w.id
-- ORDER BY wm.joined_at DESC;

-- Check notes with project references
-- SELECT 
--   n.title as note_title, 
--   n.workspace_id as note_workspace,
--   p.name as project_name, 
--   p.workspace_id as project_workspace,
--   n.is_deleted as note_deleted,
--   p.is_deleted as project_deleted
-- FROM notes n
-- LEFT JOIN projects p ON n.project_id = p.id
-- WHERE n.project_id IS NOT NULL
-- ORDER BY n.created_at DESC
-- LIMIT 20;
