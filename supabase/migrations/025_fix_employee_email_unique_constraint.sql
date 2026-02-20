-- ============================================
-- MIGRATION: FIX EMPLOYEE EMAIL UNIQUE CONSTRAINT
-- ============================================
-- This migration fixes the email constraint to allow the same email
-- across different workspaces, while preventing duplicates within a workspace.
--
-- Problem: Original schema has UNIQUE constraint on email column globally
-- Solution: Drop global constraint, add composite UNIQUE on (email, workspace_id)

-- ============================================
-- DROP GLOBAL UNIQUE CONSTRAINT ON EMAIL
-- ============================================
-- First, check if the constraint exists and drop it
DO $$ 
BEGIN
    -- Drop the unique constraint on email if it exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'employees_email_key' 
        AND conrelid = 'employees'::regclass
    ) THEN
        ALTER TABLE employees DROP CONSTRAINT employees_email_key;
        RAISE NOTICE 'Dropped global UNIQUE constraint on email';
    END IF;
END $$;

-- ============================================
-- ADD COMPOSITE UNIQUE CONSTRAINT
-- ============================================
-- Create a composite unique constraint on (email, workspace_id)
-- This allows the same email in different workspaces, but prevents
-- duplicates within the same workspace
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_email_workspace 
    ON employees(email, workspace_id);

-- ============================================
-- ADD PARTIAL UNIQUE INDEX FOR NULL WORKSPACE_ID
-- ============================================
-- Handle edge case: employees with NULL workspace_id should still have unique emails
-- This is for backwards compatibility with any legacy data
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_email_null_workspace 
    ON employees(email) 
    WHERE workspace_id IS NULL;

-- ============================================
-- VERIFICATION
-- ============================================
-- Test query to verify the constraint works:
-- 
-- -- This should succeed (same email, different workspaces):
-- INSERT INTO employees (first_name, last_name, email, employee_id, workspace_id)
-- VALUES 
--   ('John', 'Doe', 'test@example.com', 'US123456', 'workspace-1-uuid'),
--   ('John', 'Doe', 'test@example.com', 'US789012', 'workspace-2-uuid');
-- 
-- -- This should fail (same email, same workspace):
-- INSERT INTO employees (first_name, last_name, email, employee_id, workspace_id)
-- VALUES 
--   ('Jane', 'Doe', 'test@example.com', 'US345678', 'workspace-1-uuid');

-- ============================================
-- NOTES
-- ============================================
-- 1. Employees can now exist in multiple workspaces
-- 2. Same email can be used across different workspaces
-- 3. Email must be unique within each workspace
-- 4. This fixes the "An employee with this email already exists" error
--    when re-inviting removed employees
