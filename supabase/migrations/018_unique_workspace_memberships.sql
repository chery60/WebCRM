-- Migration: 018_unique_workspace_memberships.sql
-- Description: Clean up duplicate workspace memberships and add unique constraint

-- 1. Clean up duplicates, keeping the one with higher privilege or most recent join date
WITH duplicates AS (
    SELECT 
        id,
        user_id,
        workspace_id,
        role,
        ROW_NUMBER() OVER (
            PARTITION BY user_id, workspace_id 
            ORDER BY 
                CASE role 
                    WHEN 'owner' THEN 1 
                    WHEN 'admin' THEN 2 
                    WHEN 'member' THEN 3 
                    WHEN 'viewer' THEN 4 
                    ELSE 5 
                END ASC,
                joined_at DESC
        ) as rank
    FROM workspace_memberships
)
DELETE FROM workspace_memberships
WHERE id IN (SELECT id FROM duplicates WHERE rank > 1);

-- 2. Add unique constraint to prevent future duplicates
ALTER TABLE workspace_memberships
ADD CONSTRAINT workspace_memberships_user_workspace_unique UNIQUE (user_id, workspace_id);
