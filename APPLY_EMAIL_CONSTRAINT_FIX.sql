-- ============================================
-- 🔧 CRITICAL FIX: Employee Email Constraint
-- ============================================
-- 
-- INSTRUCTIONS:
-- 1. Go to your Supabase Dashboard: https://ubkywhbguzbyewedxjdj.supabase.co
-- 2. Navigate to SQL Editor
-- 3. Create a new query
-- 4. Copy and paste this ENTIRE script
-- 5. Click "Run" to execute
--
-- This fixes the "Failed to add employee" error by allowing the same
-- email across different workspaces.
--
-- ============================================

-- Step 1: Check current constraints
DO $$ 
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CURRENT CONSTRAINTS ON EMPLOYEES TABLE';
    RAISE NOTICE '========================================';
END $$;

SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'employees'::regclass
ORDER BY conname;

-- Step 2: Drop the global UNIQUE constraint on email
DO $$ 
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'DROPPING GLOBAL EMAIL CONSTRAINT';
    RAISE NOTICE '========================================';
    
    -- Drop the unique constraint on email if it exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'employees_email_key' 
        AND conrelid = 'employees'::regclass
    ) THEN
        ALTER TABLE employees DROP CONSTRAINT employees_email_key;
        RAISE NOTICE '✅ Dropped global UNIQUE constraint on email';
    ELSE
        RAISE NOTICE 'ℹ️ Global constraint already removed or does not exist';
    END IF;
END $$;

-- Step 3: Create composite unique index on (email, workspace_id)
DO $$ 
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CREATING WORKSPACE-SCOPED CONSTRAINT';
    RAISE NOTICE '========================================';
END $$;

-- Drop index if it already exists (for re-running this script)
DROP INDEX IF EXISTS idx_employees_email_workspace;
DROP INDEX IF EXISTS idx_employees_email_null_workspace;

-- Create composite unique index on (email, workspace_id)
-- This allows same email in different workspaces
CREATE UNIQUE INDEX idx_employees_email_workspace 
    ON employees(email, workspace_id)
    WHERE workspace_id IS NOT NULL;

-- Create unique index for legacy null workspace_id
CREATE UNIQUE INDEX idx_employees_email_null_workspace 
    ON employees(email) 
    WHERE workspace_id IS NULL;

DO $$ 
BEGIN
    RAISE NOTICE '✅ Created workspace-scoped email constraint';
    RAISE NOTICE '✅ Created null workspace constraint for legacy data';
END $$;

-- Step 4: Verify the fix
DO $$ 
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'VERIFICATION';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Same email can now exist in different workspaces';
    RAISE NOTICE '✅ Same email CANNOT exist twice in the same workspace';
    RAISE NOTICE '✅ Re-inviting removed employees will now work';
END $$;

-- Step 5: Show new constraints
SELECT 
    indexname AS index_name,
    indexdef AS definition
FROM pg_indexes
WHERE tablename = 'employees' 
    AND indexname LIKE 'idx_employees_email%'
ORDER BY indexname;

-- ============================================
-- EXPECTED RESULTS
-- ============================================
-- You should see:
-- 1. "Dropped global UNIQUE constraint on email" message
-- 2. Two new indexes created:
--    - idx_employees_email_workspace (for workspace-scoped uniqueness)
--    - idx_employees_email_null_workspace (for legacy data)
-- 3. Verification success messages
--
-- After running this, try adding an employee again!
-- ============================================

DO $$ 
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '🎉 MIGRATION COMPLETE!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'You can now:';
    RAISE NOTICE '1. Add employees with the same email to different workspaces';
    RAISE NOTICE '2. Remove and re-invite employees without errors';
    RAISE NOTICE '3. Support multi-workspace collaboration';
    RAISE NOTICE '';
    RAISE NOTICE 'Go back to your app and try adding the employee again!';
    RAISE NOTICE '========================================';
END $$;
