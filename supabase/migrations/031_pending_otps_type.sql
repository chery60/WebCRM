-- Add type column to pending_otps to distinguish email verification OTPs from workspace invite OTPs.
-- This prevents the signup flow from overwriting the workspace invite OTP.

ALTER TABLE pending_otps
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'email_verification'
  CHECK (type IN ('email_verification', 'workspace_invite'));

-- Index for fast lookup by email + type
CREATE INDEX IF NOT EXISTS idx_pending_otps_email_type
  ON pending_otps(email, type);
