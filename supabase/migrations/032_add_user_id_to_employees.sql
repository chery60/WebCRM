-- ============================================
-- MIGRATION: Add user_id to employees table
-- ============================================
-- Links an employee record to an authenticated Supabase user after they join.
-- This is set during workspace OTP verification (deferred creation pattern).
-- NULL means the invited user hasn't joined yet.

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Index for fast lookup by user_id
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);

-- ============================================
-- Ensure pending_otps has workspace_id and type columns
-- (These may have been missed if earlier migrations didn't run)
-- ============================================
ALTER TABLE pending_otps
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE pending_otps
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'email_verification'
  CHECK (type IN ('email_verification', 'workspace_invite'));

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_pending_otps_email_workspace
  ON pending_otps(email, workspace_id);

CREATE INDEX IF NOT EXISTS idx_pending_otps_email_type
  ON pending_otps(email, type);
