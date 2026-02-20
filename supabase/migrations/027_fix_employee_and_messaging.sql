-- ============================================
-- MIGRATION 027: FIX EMPLOYEE RE-ADD AND MESSAGING ISSUES
-- ============================================
-- This migration fixes:
-- 1. Employee re-add issue - allow re-adding deleted employees
-- 2. Messaging foreign key issues - ensure proper user references
--
-- Date: 2026-02-16
-- ============================================

-- ============================================
-- PART 1: ENSURE WORKSPACE_MEMBERSHIPS HAS UNIQUE CONSTRAINT
-- ============================================
-- Add unique constraint if it doesn't exist (required for ON CONFLICT to work)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'workspace_memberships_user_workspace_unique'
    ) THEN
        -- First, clean up any duplicates
        WITH duplicates AS (
            SELECT 
                id,
                user_id,
                workspace_id,
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
        
        -- Now add the constraint
        ALTER TABLE workspace_memberships
        ADD CONSTRAINT workspace_memberships_user_workspace_unique 
        UNIQUE (user_id, workspace_id);
    END IF;
END $$;

-- ============================================
-- PART 2: FIX EMPLOYEE UNIQUE CONSTRAINT
-- ============================================
-- Problem: Unique constraint on (email, workspace_id) prevents re-adding deleted employees
-- Solution: Make the constraint partial - only apply to non-deleted employees

-- Drop the existing index
DROP INDEX IF EXISTS idx_employees_email_workspace;
DROP INDEX IF EXISTS idx_employees_email_null_workspace;

-- Create a partial unique index that excludes deleted employees
-- This allows the same email to be re-added after deletion
CREATE UNIQUE INDEX idx_employees_email_workspace 
    ON employees(email, workspace_id)
    WHERE is_deleted = false;

-- Handle edge case: employees with NULL workspace_id should still have unique emails (excluding deleted)
CREATE UNIQUE INDEX idx_employees_email_null_workspace 
    ON employees(email) 
    WHERE workspace_id IS NULL AND is_deleted = false;

-- ============================================
-- PART 3: ADD HELPER FUNCTION TO GET USER ID FROM EMAIL
-- ============================================
-- This function helps convert employee emails to user IDs for messaging
CREATE OR REPLACE FUNCTION get_user_id_from_email(_email TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _user_id UUID;
BEGIN
    -- Try to find user by email in users table
    SELECT id INTO _user_id
    FROM users
    WHERE email = _email
    LIMIT 1;
    
    RETURN _user_id;
END;
$$;

-- ============================================
-- PART 4: ENSURE EMPLOYEES HAVE CORRESPONDING USER RECORDS
-- ============================================
-- Create a trigger to auto-create user records for employees
-- This ensures messaging can work for all employees

CREATE OR REPLACE FUNCTION sync_employee_to_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- When a new employee is created (not deleted), ensure they have a user record
    IF NEW.is_deleted = false THEN
        -- Insert or update user record
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
        
        -- Get the user ID if it was an update
        IF v_user_id IS NULL THEN
            SELECT id INTO v_user_id FROM users WHERE email = NEW.email;
        END IF;
        
        -- Also ensure workspace membership exists if employee has a workspace
        IF NEW.workspace_id IS NOT NULL AND v_user_id IS NOT NULL THEN
            INSERT INTO workspace_memberships (workspace_id, user_id, role, status, joined_at)
            VALUES (
                NEW.workspace_id,
                v_user_id,
                NEW.role,
                'active', -- Mark as active so they show up in messaging
                NOW()
            )
            ON CONFLICT (user_id, workspace_id) DO UPDATE SET
                role = NEW.role,
                status = 'active';
        END IF;
    ELSIF NEW.is_deleted = true AND NEW.workspace_id IS NOT NULL THEN
        -- If employee is deleted, mark their workspace membership as suspended
        UPDATE workspace_memberships
        SET status = 'suspended'
        WHERE user_id = (SELECT id FROM users WHERE email = NEW.email)
          AND workspace_id = NEW.workspace_id;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS sync_employee_to_user_trigger ON employees;

-- Create trigger that fires after employee insert or update
CREATE TRIGGER sync_employee_to_user_trigger
    AFTER INSERT OR UPDATE ON employees
    FOR EACH ROW
    EXECUTE FUNCTION sync_employee_to_user();

-- ============================================
-- PART 5: BACKFILL EXISTING EMPLOYEES TO USERS TABLE
-- ============================================
-- Sync all existing non-deleted employees to users table
INSERT INTO users (email, name, avatar, role, created_at, updated_at)
SELECT 
    e.email,
    CONCAT(e.first_name, ' ', e.last_name) as name,
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

-- Also backfill workspace_memberships for all existing employees
-- This is crucial for messaging to work!
INSERT INTO workspace_memberships (workspace_id, user_id, role, status, joined_at)
SELECT 
    e.workspace_id,
    u.id as user_id,
    e.role,
    'active' as status,
    e.created_at as joined_at
FROM employees e
INNER JOIN users u ON u.email = e.email
WHERE e.is_deleted = false
  AND e.workspace_id IS NOT NULL
ON CONFLICT (user_id, workspace_id) DO UPDATE SET
    role = EXCLUDED.role,
    status = 'active';

-- ============================================
-- PART 6: ADD INDEX FOR PERFORMANCE
-- ============================================
-- Add index on employees.email for faster lookups
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email) WHERE is_deleted = false;

-- ============================================
-- VERIFICATION QUERIES (run manually to verify)
-- ============================================
-- 
-- Check the new partial unique index:
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'employees' AND indexname LIKE 'idx_employees_email%';
--
-- Verify users have been synced:
-- SELECT COUNT(*) as employee_count FROM employees WHERE is_deleted = false;
-- SELECT COUNT(*) as user_count FROM users WHERE email IN (SELECT email FROM employees WHERE is_deleted = false);
--
-- Test re-adding deleted employee (should now work):
-- 1. Soft delete: UPDATE employees SET is_deleted = true WHERE email = 'test@example.com' AND workspace_id = 'some-workspace-id';
-- 2. Re-add: INSERT INTO employees (first_name, last_name, email, employee_id, workspace_id) VALUES ('Test', 'User', 'test@example.com', 'US123456', 'some-workspace-id');
