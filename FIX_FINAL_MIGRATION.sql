-- ============================================
-- FINAL FIX MIGRATION: MESSAGING, EMPLOYEES & CONSTRAINTS
-- ============================================
-- This script consolidates all necessary fixes into one transaction-safe file.
-- It handles:
-- 1. Cleaning up duplicate workspace memberships
-- 2. Ensuring unique constraints exist on workspace_memberships(user_id, workspace_id)
-- 3. Fixing the employee unique constraint to allow re-adds (ignoring deleted)
-- 4. Syncing employees to the users table for messaging support
-- 5. Creating necessary triggers

BEGIN;

-- ============================================
-- 1. CLEAN UP DUPLICATE WORKSPACE MEMBERSHIPS
-- ============================================
-- We must remove duplicates before adding a unique constraint
DELETE FROM workspace_memberships
WHERE id IN (
    SELECT id
    FROM (
        SELECT id,
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
    ) t
    WHERE t.rank > 1
);

-- ============================================
-- 2. ENSURE UNIQUE CONSTRAINT ON WORKSPACE_MEMBERSHIPS
-- ============================================
-- This is required for ON CONFLICT (user_id, workspace_id) to work
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'workspace_memberships_user_workspace_key'
    ) THEN
        -- Check if a unique index already exists with a different name
        IF NOT EXISTS (
            SELECT 1 FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            JOIN pg_index i ON i.indexrelid = c.oid
            JOIN pg_attribute a ON a.attrelid = c.oid
            WHERE c.relname = 'workspace_memberships'
            AND i.indisunique = true
            -- Roughly check for composite index on 2 columns by counting atts
            AND i.indnkeyatts = 2
        ) THEN
             -- Add constraint if no unique index found
            ALTER TABLE workspace_memberships
            ADD CONSTRAINT workspace_memberships_user_workspace_key UNIQUE (user_id, workspace_id);
        END IF;
    END IF;
END $$;

-- ============================================
-- 3. FIX EMPLOYEE UNIQUE CONSTRAINT (ALLOW RE-ADDS)
-- ============================================
-- Drop old constraints that prevent re-adding deleted employees
DROP INDEX IF EXISTS idx_employees_email_workspace;
DROP INDEX IF EXISTS idx_employees_email_null_workspace;

-- Create partial unique index (active employees only)
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_email_workspace 
    ON employees(email, workspace_id)
    WHERE is_deleted = false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_email_null_workspace 
    ON employees(email) 
    WHERE workspace_id IS NULL AND is_deleted = false;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email) WHERE is_deleted = false;

-- ============================================
-- 4. SYNC FUNCTION & TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION sync_employee_to_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Only sync active employees
    IF NEW.is_deleted = false THEN
        -- 1. Sync User Record
        INSERT INTO users (email, name, avatar, role, created_at, updated_at)
        VALUES (
            NEW.email,
            CONCAT(NEW.first_name, ' ', NEW.last_name),
            NEW.avatar,
            NEW.role,
            NOW(),
            NOW()
        )
        ON CONFLICT (email) DO UPDATE SET
            name = CONCAT(NEW.first_name, ' ', NEW.last_name),
            avatar = NEW.avatar,
            role = NEW.role,
            updated_at = NOW()
        RETURNING id INTO v_user_id;
        
        -- Fallback if update didn't return ID (shouldn't happen but safe)
        IF v_user_id IS NULL THEN
            SELECT id INTO v_user_id FROM users WHERE email = NEW.email;
        END IF;
        
        -- 2. Sync Workspace Membership
        IF NEW.workspace_id IS NOT NULL AND v_user_id IS NOT NULL THEN
            INSERT INTO workspace_memberships (workspace_id, user_id, role, status, joined_at)
            VALUES (
                NEW.workspace_id,
                v_user_id,
                NEW.role,
                'active',
                NOW()
            )
            ON CONFLICT (user_id, workspace_id) DO UPDATE SET
                role = NEW.role,
                status = 'active';
        END IF;

    ELSIF NEW.is_deleted = true AND NEW.workspace_id IS NOT NULL THEN
        -- If deleted, suspend membership
        UPDATE workspace_memberships
        SET status = 'suspended'
        WHERE user_id = (SELECT id FROM users WHERE email = NEW.email)
          AND workspace_id = NEW.workspace_id;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Recreate trigger
DROP TRIGGER IF EXISTS sync_employee_to_user_trigger ON employees;
CREATE TRIGGER sync_employee_to_user_trigger
    AFTER INSERT OR UPDATE ON employees
    FOR EACH ROW
    EXECUTE FUNCTION sync_employee_to_user();

-- ============================================
-- 5. BACKFILL EXISTING DATA
-- ============================================
-- 1. Sync Users
INSERT INTO users (email, name, avatar, role, created_at, updated_at)
SELECT 
    e.email,
    CONCAT(e.first_name, ' ', e.last_name),
    e.avatar,
    e.role,
    e.created_at,
    e.updated_at
FROM employees e
WHERE e.is_deleted = false
ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    avatar = EXCLUDED.avatar,
    role = EXCLUDED.role,
    updated_at = NOW();

-- 2. Sync Memberships
INSERT INTO workspace_memberships (workspace_id, user_id, role, status, joined_at)
SELECT 
    e.workspace_id,
    u.id,
    e.role,
    'active',
    e.created_at
FROM employees e
JOIN users u ON u.email = e.email
WHERE e.is_deleted = false
  AND e.workspace_id IS NOT NULL
ON CONFLICT (user_id, workspace_id) DO UPDATE SET
    role = EXCLUDED.role,
    status = 'active';

COMMIT;

-- ============================================
-- VERIFICATION (Run separately if needed)
-- ============================================
SELECT 
    'SUCCESS' as status,
    (SELECT count(*) FROM employees WHERE is_deleted=false) as active_employees,
    (SELECT count(*) FROM workspace_memberships) as total_memberships;
