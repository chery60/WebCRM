-- ============================================
-- FIX MESSAGES RLS POLICIES (026)
-- ============================================
-- This migration restores the missing RLS policies for the messages table.
-- It ensures users can INSERT messages into channels they are part of
-- and send Direct Messages to other workspace members.

-- 0. Helper Functions (Ensure they exist)
-- Check if user is a member of a channel (bypasses RLS)
CREATE OR REPLACE FUNCTION is_channel_member(_channel_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM channel_members
    WHERE channel_id = _channel_id
    AND user_id = auth.uid()
  );
END;
$$;

-- 1. Enable RLS on messages table (just in case)
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view messages" ON messages;
DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON messages;

-- 3. SELECT Policy
CREATE POLICY "Users can view messages"
ON messages FOR SELECT
USING (
    -- Channel messages: must be a member of the channel
    (channel_id IS NOT NULL AND is_channel_member(channel_id))
    OR
    -- Direct messages: must be sender or receiver
    (receiver_id IS NOT NULL AND (sender_id = auth.uid() OR receiver_id = auth.uid()))
);

-- 4. INSERT Policy
CREATE POLICY "Users can send messages"
ON messages FOR INSERT
WITH CHECK (
    sender_id = auth.uid() 
    AND (
        -- Channel messages: must be a member of the channel
        (channel_id IS NOT NULL AND is_channel_member(channel_id))
        OR
        -- Direct messages: receiver must be in the same workspace (shared workspace check)
        (receiver_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM workspace_memberships wm1
            JOIN workspace_memberships wm2 ON wm1.workspace_id = wm2.workspace_id
            WHERE wm1.user_id = auth.uid()
            AND wm2.user_id = messages.receiver_id
            AND wm1.status = 'active'
            AND wm2.status = 'active'
        ))
    )
);

-- 5. UPDATE Policy (Edit message)
CREATE POLICY "Users can update their own messages"
ON messages FOR UPDATE
USING (
    sender_id = auth.uid()
)
WITH CHECK (
    sender_id = auth.uid()
);

-- 6. DELETE Policy (Delete message - usually soft delete via update, but allow hard delete if needed or check is_deleted)
CREATE POLICY "Users can delete their own messages"
ON messages FOR DELETE
USING (
    sender_id = auth.uid()
);

-- 7. Ensure users/profiles are visible for DM search
-- Re-applying the robust users select policy just in case 024 didn't cover it fully
-- or if it was dropped by accident.

DROP POLICY IF EXISTS "users_select_policy" ON users;
CREATE POLICY "users_select_policy" ON users
FOR SELECT USING (
    -- Can see own record
    id = auth.uid()
    OR
    -- Can see users in same workspace
    EXISTS (
        SELECT 1 FROM workspace_memberships wm1
        INNER JOIN workspace_memberships wm2 ON wm1.workspace_id = wm2.workspace_id
        WHERE wm1.user_id = auth.uid()
        AND wm2.user_id = users.id
        AND wm1.status = 'active'
        AND wm2.status = 'active'
    )
);
