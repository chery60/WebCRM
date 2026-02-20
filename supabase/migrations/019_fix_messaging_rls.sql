-- ============================================
-- FIX MESSAGING SYSTEM RLS (FINAL ROBUST VERSION)
-- ============================================
-- This migration fixes infinite recursion issues by using SECURITY DEFINER functions.
-- These functions bypass RLS to perform membership checks safely.

-- ============================================
-- 1. HELPER FUNCTIONS (SECURITY DEFINER)
-- ============================================

-- Check if user is a member of a workspace (bypasses RLS)
CREATE OR REPLACE FUNCTION is_workspace_member(_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM workspace_memberships
    WHERE workspace_id = _workspace_id
    AND user_id = auth.uid()
    AND status = 'active'
  );
END;
$$;

-- Check if user is an admin/owner of a workspace (bypasses RLS)
CREATE OR REPLACE FUNCTION is_workspace_admin(_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM workspace_memberships
    WHERE workspace_id = _workspace_id
    AND user_id = auth.uid()
    AND role IN ('owner', 'admin')
    AND status = 'active'
  );
END;
$$;

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

-- ============================================
-- 2. FIX WORKSPACE_MEMBERSHIPS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view workspace memberships" ON workspace_memberships;

CREATE POLICY "Users can view workspace memberships"
    ON workspace_memberships FOR SELECT
    USING (
        -- User can view their own membership
        user_id = auth.uid()
        OR
        -- User can view memberships of workspaces they belong to (using secure function)
        is_workspace_member(workspace_id)
        OR
        -- Workspace owners can view all memberships (fallback for owner not in memberships table yet)
        EXISTS (SELECT 1 FROM workspaces WHERE id = workspace_id AND owner_id = auth.uid())
    );

-- ============================================
-- 3. FIX CHANNELS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view channels in their workspace" ON channels;

CREATE POLICY "Users can view channels in their workspace"
    ON channels FOR SELECT
    USING (
        is_workspace_member(workspace_id)
    );

-- ============================================
-- 4. FIX CHANNEL_MEMBERS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view channel members for channels they're in" ON channel_members;
DROP POLICY IF EXISTS "Users can view channel members in their workspace" ON channel_members;
DROP POLICY IF EXISTS "Channel owners/admins and workspace admins can add members" ON channel_members;
DROP POLICY IF EXISTS "Channel creators and admins can add members" ON channel_members;

-- View members: If you are in the workspace, you can see who is in the channels
CREATE POLICY "Users can view channel members in their workspace"
    ON channel_members FOR SELECT
    USING (
        -- We need to look up the workspace_id for the channel
        EXISTS (
            SELECT 1 FROM channels c
            WHERE c.id = channel_members.channel_id
            AND is_workspace_member(c.workspace_id)
        )
    );

-- Add members: Channel creators, Workspace Admins
CREATE POLICY "Channel creators and admins can add members"
    ON channel_members FOR INSERT
    WITH CHECK (
        -- Check if user is creator of the channel
        EXISTS (
            SELECT 1 FROM channels c
            WHERE c.id = channel_members.channel_id
            AND c.created_by = auth.uid()
        )
        OR
        -- Check if user is workspace admin
        EXISTS (
            SELECT 1 FROM channels c
            WHERE c.id = channel_members.channel_id
            AND is_workspace_admin(c.workspace_id)
        )
    );

-- ============================================
-- 5. FIX MESSAGES POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view messages in their channels" ON messages;
DROP POLICY IF EXISTS "Users can send messages to channels they're in or direct messages" ON messages;
DROP POLICY IF EXISTS "Users can send messages to channels they're in" ON messages;
DROP POLICY IF EXISTS "Users can view messages" ON messages;

-- View messages
CREATE POLICY "Users can view messages"
    ON messages FOR SELECT
    USING (
        -- Channel messages: must be a member of the channel
        (channel_id IS NOT NULL AND is_channel_member(channel_id))
        OR
        -- Direct messages: must be sender or receiver
        (receiver_id IS NOT NULL AND (sender_id = auth.uid() OR receiver_id = auth.uid()))
    );

-- Send messages
DROP POLICY IF EXISTS "Users can send messages" ON messages;
CREATE POLICY "Users can send messages"
    ON messages FOR INSERT
    WITH CHECK (
        sender_id = auth.uid() AND (
            -- Channel messages: must be a member of the channel
            (channel_id IS NOT NULL AND is_channel_member(channel_id))
            OR
            -- Direct messages: receiver must be in the same workspace
            (receiver_id IS NOT NULL AND EXISTS (
                -- Check if both users share a workspace
                SELECT 1 FROM workspace_memberships wm1
                JOIN workspace_memberships wm2 ON wm1.workspace_id = wm2.workspace_id
                WHERE wm1.user_id = auth.uid()
                AND wm2.user_id = messages.receiver_id
                AND wm1.status = 'active'
                AND wm2.status = 'active'
            ))
        )
    );

-- ============================================
-- 6. FIX DIRECT MESSAGE CONVERSATIONS
-- ============================================

DROP POLICY IF EXISTS "Users can create DM conversations in their workspace" ON direct_message_conversations;
DROP POLICY IF EXISTS "Workspace members can create DM conversations" ON direct_message_conversations;

CREATE POLICY "Workspace members can create DM conversations"
    ON direct_message_conversations FOR INSERT
    WITH CHECK (
        (user1_id = auth.uid() OR user2_id = auth.uid())
        AND
        is_workspace_member(workspace_id)
        -- Ideally check if the other user is also a member, but the FK constraint and app logic usually handle this.
        -- We can add it for extra security:
        AND EXISTS (
             SELECT 1 
             FROM workspace_memberships 
             WHERE workspace_id = direct_message_conversations.workspace_id
             AND user_id = (CASE WHEN user1_id = auth.uid() THEN user2_id ELSE user1_id END)
             AND status = 'active'
        )
    );
