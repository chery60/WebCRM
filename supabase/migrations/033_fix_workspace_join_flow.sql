-- ============================================================
-- Migration 033: Fix workspace join flow
-- Fixes all RLS and constraint issues that block invited users
-- from joining a workspace via OTP verification.
-- ============================================================

-- ── 1. workspace_memberships: add missing INSERT and UPDATE policies ──────────
-- The service-role admin client bypasses RLS, but the anon/authenticated
-- client (used by the workspace store) needs these policies for reads.
-- The verify-workspace-otp API uses service-role, so INSERT always works
-- server-side. We still add these for completeness and future use.

-- Drop any conflicting old policies first
DROP POLICY IF EXISTS "Users can insert own membership" ON workspace_memberships;
DROP POLICY IF EXISTS "Users can update own membership" ON workspace_memberships;
DROP POLICY IF EXISTS "Service role can manage memberships" ON workspace_memberships;
DROP POLICY IF EXISTS "Workspace owners and admins can manage memberships" ON workspace_memberships;

-- Allow authenticated users to see their own memberships
DROP POLICY IF EXISTS "Users can view workspace memberships" ON workspace_memberships;
CREATE POLICY "Users can view workspace memberships"
  ON workspace_memberships FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM workspace_memberships wm
      WHERE wm.workspace_id = workspace_memberships.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.status = 'active'
    )
  );

-- Allow authenticated users to insert their OWN membership row
-- (needed for client-side acceptInvitation flow)
CREATE POLICY "Users can insert own membership"
  ON workspace_memberships FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Allow workspace owners/admins to manage memberships
CREATE POLICY "Workspace owners and admins can manage memberships"
  ON workspace_memberships FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM workspace_memberships wm
      WHERE wm.workspace_id = workspace_memberships.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
        AND wm.status = 'active'
    )
  );

-- ── 2. Fix unique constraint issue: allow UPSERT on workspace_memberships ─────
-- When an invited membership row (status='invited') already exists and
-- the user tries to join, the INSERT fails with a unique constraint violation.
-- Solution: use ON CONFLICT DO UPDATE in application code (migration docs this).
-- No schema change needed here — handled in application code (verify-workspace-otp).

-- ── 3. employees: fix RLS so invited users can be created/updated on join ────
-- The employees table needs to allow the service role to insert/update.
-- Since verify-workspace-otp uses service role admin, RLS is bypassed.
-- But ensure the policy is correct for client-side reads.

DROP POLICY IF EXISTS "Anyone can view employees" ON employees;
DROP POLICY IF EXISTS "Admins can insert employees" ON employees;
DROP POLICY IF EXISTS "Admins can update employees" ON employees;
DROP POLICY IF EXISTS "Workspace members can view employees" ON employees;
DROP POLICY IF EXISTS "Workspace members can insert employees" ON employees;
DROP POLICY IF EXISTS "Workspace members can update employees" ON employees;

-- Workspace members can view employees in their workspace
CREATE POLICY "Workspace members can view employees"
  ON employees FOR SELECT
  USING (
    is_deleted = false
    AND (
      workspace_id IS NULL  -- legacy rows
      OR EXISTS (
        SELECT 1 FROM workspace_memberships wm
        WHERE wm.workspace_id = employees.workspace_id
          AND wm.user_id = auth.uid()
          AND wm.status = 'active'
      )
    )
  );

-- Workspace admins/owners can insert employees
CREATE POLICY "Workspace admins can insert employees"
  ON employees FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_memberships wm
      WHERE wm.workspace_id = employees.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
        AND wm.status = 'active'
    )
  );

-- Workspace admins/owners can update employees
CREATE POLICY "Workspace admins can update employees"
  ON employees FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_memberships wm
      WHERE wm.workspace_id = employees.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
        AND wm.status = 'active'
    )
  );

-- Users can update their own employee record (e.g., setting user_id, status on join)
CREATE POLICY "Users can update own employee record"
  ON employees FOR UPDATE
  USING (user_id = auth.uid());

-- ── 4. pending_otps: ensure service role can always read/write ───────────────
-- No client-side RLS policies needed — all access is via service role API routes.
-- This is already the case from migration 029. Just confirm RLS is enabled.
ALTER TABLE pending_otps ENABLE ROW LEVEL SECURITY;

-- Drop any accidental permissive policies
DROP POLICY IF EXISTS "Allow all on pending_otps" ON pending_otps;
DROP POLICY IF EXISTS "Public read pending_otps" ON pending_otps;

-- ── 5. workspace_invitations: ensure public SELECT remains (idempotent) ───────
DROP POLICY IF EXISTS "Members can view invitations" ON workspace_invitations;
DROP POLICY IF EXISTS "Public can view invitation by token" ON workspace_invitations;
DROP POLICY IF EXISTS "Admins can create invitations" ON workspace_invitations;
DROP POLICY IF EXISTS "Workspace members can update invitations" ON workspace_invitations;

CREATE POLICY "Public can view invitation by token"
  ON workspace_invitations FOR SELECT
  USING (true);

CREATE POLICY "Admins can create invitations"
  ON workspace_invitations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_memberships wm
      WHERE wm.workspace_id = workspace_invitations.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
        AND wm.status = 'active'
    )
  );

CREATE POLICY "Workspace members can update invitations"
  ON workspace_invitations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_memberships wm
      WHERE wm.workspace_id = workspace_invitations.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.status = 'active'
    )
  );

-- ── 6. Ensure employees.user_id column exists (idempotent) ───────────────────
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);

-- ── 7. Ensure pending_otps has workspace_id and type (idempotent) ─────────────
ALTER TABLE pending_otps
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE pending_otps
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'email_verification'
  CHECK (type IN ('email_verification', 'workspace_invite'));

CREATE INDEX IF NOT EXISTS idx_pending_otps_email_workspace ON pending_otps(email, workspace_id);
CREATE INDEX IF NOT EXISTS idx_pending_otps_email_type ON pending_otps(email, type);
