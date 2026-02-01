-- Supabase Database Migration Script
-- Venture CRM - Robust Deletion Logic (RPCs)
-- Fixes "row-level security policy" errors by using securely defined functions
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. DELETE PIPELINE FUNCTION
-- ============================================
-- secure function to cascade soft delete pipelines -> roadmaps -> feature_requests
CREATE OR REPLACE FUNCTION delete_pipeline(target_pipeline_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- Run with privileges of the creator (postgres) to bypass RLS for cleanup
SET search_path = public -- Secure search path
AS $$
DECLARE
    curr_user_id UUID;
BEGIN
    curr_user_id := auth.uid();
    
    -- 1. Strict Permission Check (Manual RLS)
    -- Verify the user owns the pipeline they are trying to delete
    IF NOT EXISTS (
        SELECT 1 FROM pipelines 
        WHERE id = target_pipeline_id AND user_id = curr_user_id
    ) THEN
        RAISE EXCEPTION 'Access denied: You do not have permission to delete this pipeline.';
    END IF;

    -- 2. Soft-delete feature requests related to roadmaps in this pipeline
    UPDATE feature_requests
    SET is_deleted = true, updated_at = NOW()
    WHERE roadmap_id IN (
        SELECT id FROM roadmaps WHERE pipeline_id = target_pipeline_id
    );

    -- 3. Soft-delete roadmaps in this pipeline
    UPDATE roadmaps
    SET is_deleted = true, updated_at = NOW()
    WHERE pipeline_id = target_pipeline_id;

    -- 4. Soft-delete the pipeline itself
    UPDATE pipelines
    SET is_deleted = true, updated_at = NOW()
    WHERE id = target_pipeline_id;
    
END;
$$;

-- ============================================
-- 2. DELETE PROJECT FUNCTION
-- ============================================
-- Secure function to delete project and safely unlink notes
CREATE OR REPLACE FUNCTION delete_project(target_project_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    curr_user_id UUID;
    target_workspace_id UUID;
    is_workspace_admin BOOLEAN;
BEGIN
    curr_user_id := auth.uid();
    
    -- Get project details for permission check
    SELECT workspace_id INTO target_workspace_id
    FROM projects
    WHERE id = target_project_id;
    
    -- Check if user is an admin in the project's workspace
    SELECT EXISTS (
        SELECT 1 FROM workspace_memberships
        WHERE user_id = curr_user_id 
        AND workspace_id = target_workspace_id
        AND role IN ('owner', 'admin')
        AND status = 'active'
    ) INTO is_workspace_admin;

    -- 1. Strict Permission Check
    -- Allow if user owns the project OR is a workspace admin
    IF NOT EXISTS (
        SELECT 1 FROM projects 
        WHERE id = target_project_id 
        AND (user_id = curr_user_id OR is_workspace_admin)
    ) THEN
        RAISE EXCEPTION 'Access denied: You do not have permission to delete this project.';
    END IF;

    -- 2. Unlink notes (Set project_id to NULL)
    -- We use SECURITY DEFINER so we can update notes that might not belong to this user
    -- but are part of the project being deleted.
    UPDATE notes
    SET project_id = NULL, updated_at = NOW()
    WHERE project_id = target_project_id;

    -- 3. Soft-delete the project
    UPDATE projects
    SET is_deleted = true, updated_at = NOW()
    WHERE id = target_project_id;
    
END;
$$;
