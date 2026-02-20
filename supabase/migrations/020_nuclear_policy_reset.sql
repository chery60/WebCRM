-- ============================================
-- NUCLEAR POLICY RESET & FIX (020)
-- ============================================
-- This migration fixes "policy already exists" errors by dynamically dropping 
-- ALL policies on the messaging tables before recreating them.
-- It also includes the SECURITY DEFINER fixes for recursion.

DO $$
DECLARE
    pol record;
BEGIN
    -- 1. Drop ALL policies on workspace_memberships
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'workspace_memberships' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON workspace_memberships', pol.policyname);
    END LOOP;

    -- 2. Drop ALL policies on channel_members
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'channel_members' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON channel_members', pol.policyname);
    END LOOP;

    -- 3. Drop ALL policies on messages
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'messages' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON messages', pol.policyname);
    END LOOP;

    -- 4. Drop ALL policies on direct_message_conversations
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'direct_message_conversations' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON direct_message_conversations', pol.policyname);
    END LOOP;

    -- 5. Drop ALL policies on channels
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'channels' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON channels', pol.policyname);
    END LOOP;
END $$;

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
-- 2. RECREATE POLICIES (CLEAN SLATE)
-- ============================================

-- WORKSPACE MEMBERSHIPS
CREATE POLICY "Users can view workspace memberships"
    ON workspace_memberships FOR SELECT
    USING (
        user_id = auth.uid()
        OR is_workspace_member(workspace_id)
        OR EXISTS (SELECT 1 FROM workspaces WHERE id = workspace_id AND owner_id = auth.uid())
    );

-- CHANNELS
CREATE POLICY "Users can view channels in their workspace"
    ON channels FOR SELECT
    USING (
        is_workspace_member(workspace_id)
    );

-- CHANNEL MEMBERS
CREATE POLICY "Users can view channel members in their workspace"
    ON channel_members FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM channels c
            WHERE c.id = channel_members.channel_id
            AND is_workspace_member(c.workspace_id)
        )
    );

CREATE POLICY "Channel creators and admins can add members"
    ON channel_members FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM channels c
            WHERE c.id = channel_members.channel_id
            AND c.created_by = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM channels c
            WHERE c.id = channel_members.channel_id
            AND is_workspace_admin(c.workspace_id)
        )
    );

-- MESSAGES
CREATE POLICY "Users can view messages"
    ON messages FOR SELECT
    USING (
        (channel_id IS NOT NULL AND is_channel_member(channel_id))
        OR
        (receiver_id IS NOT NULL AND (sender_id = auth.uid() OR receiver_id = auth.uid()))
    );

CREATE POLICY "Users can send messages"
    ON messages FOR INSERT
    WITH CHECK (
        sender_id = auth.uid() AND (
            (channel_id IS NOT NULL AND is_channel_member(channel_id))
            OR
            (receiver_id IS NOT NULL AND is_workspace_member(workspace_id))
        )
    );

-- DIRECT MESSAGE CONVERSATIONS
CREATE POLICY "Workspace members can create DM conversations"
    ON direct_message_conversations FOR INSERT
    WITH CHECK (
        (user1_id = auth.uid() OR user2_id = auth.uid())
        AND
        is_workspace_member(workspace_id)
        AND EXISTS (
             SELECT 1 
             FROM workspace_memberships 
             WHERE workspace_id = direct_message_conversations.workspace_id
             AND user_id = (CASE WHEN user1_id = auth.uid() THEN user2_id ELSE user1_id END)
             AND status = 'active'
        )
    );

-- Note: The simplified DM check above ensures both users are in the workspace
-- because is_workspace_member checks auth.uid(), and the extra EXISTS checks the other user.
