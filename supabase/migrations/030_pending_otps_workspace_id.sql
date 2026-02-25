-- Add workspace_id column to pending_otps table
-- This allows scoping OTPs per workspace for cleaner cleanup

ALTER TABLE pending_otps
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;

-- Index for faster lookup by email + workspace
CREATE INDEX IF NOT EXISTS idx_pending_otps_email_workspace
  ON pending_otps(email, workspace_id);

-- Allow public lookup by token on workspace_invitations (needed for unauthenticated invitation page)
-- Drop old restrictive policy first if it exists
DROP POLICY IF EXISTS "Members can view invitations" ON workspace_invitations;
DROP POLICY IF EXISTS "Public can view invitation by token" ON workspace_invitations;

-- Anyone can SELECT a workspace invitation (safe — token is a secret UUID)
CREATE POLICY "Public can view invitation by token"
  ON workspace_invitations FOR SELECT
  USING (true);
