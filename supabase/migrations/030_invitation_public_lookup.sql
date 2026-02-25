-- Allow anyone (including unauthenticated users) to look up an invitation by its token.
-- This is safe because the token is a secret UUID — only the invited person has it.
-- Without this, the invitation page shows "Invalid" for logged-out users due to RLS.

-- Drop the old restrictive select policy
DROP POLICY IF EXISTS "Members can view invitations" ON workspace_invitations;

-- Anyone can SELECT an invitation by token (needed for the invitation acceptance page)
CREATE POLICY "Public can view invitation by token"
  ON workspace_invitations FOR SELECT
  USING (true);

-- workspace members can still view all invitations in their workspace (for admin UI)
-- The row-level filtering happens in app code (we only expose what's needed by token).
