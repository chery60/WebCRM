-- ============================================
-- FIX MESSAGING POLICIES (024)
-- ============================================
-- This migration fixes two issues:
-- 1. Channels: Missing INSERT/UPDATE/DELETE policies (020 only created SELECT)
-- 2. Workspace memberships: SELECT policy not allowing proper joins for DM member list
--
-- Root cause: Migration 020_nuclear_policy_reset.sql dropped all policies on channels
-- but only recreated the SELECT policy, missing INSERT/UPDATE/DELETE.

-- ============================================
-- 1. FIX CHANNELS POLICIES
-- ============================================

-- Drop the existing SELECT policy (we'll recreate all 4)
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'channels' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON channels', pol.policyname);
    END LOOP;
END $$;

-- SELECT: Workspace members can view channels
CREATE POLICY "channels_select_policy" ON channels
    FOR SELECT USING (
        is_workspace_member(workspace_id)
    );

-- INSERT: Workspace members can create channels
CREATE POLICY "channels_insert_policy" ON channels
    FOR INSERT WITH CHECK (
        created_by = auth.uid()
        AND is_workspace_member(workspace_id)
    );

-- UPDATE: Channel creator or workspace admin can update
CREATE POLICY "channels_update_policy" ON channels
    FOR UPDATE USING (
        created_by = auth.uid()
        OR is_workspace_admin(workspace_id)
    );

-- DELETE: Channel creator or workspace admin can delete
CREATE POLICY "channels_delete_policy" ON channels
    FOR DELETE USING (
        created_by = auth.uid()
        OR is_workspace_admin(workspace_id)
    );

-- ============================================
-- 2. FIX CHANNEL_MEMBERS POLICIES
-- ============================================

-- Drop all existing channel_members policies
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'channel_members' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON channel_members', pol.policyname);
    END LOOP;
END $$;

-- SELECT: Workspace members can view channel members
CREATE POLICY "channel_members_select_policy" ON channel_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM channels c
            WHERE c.id = channel_members.channel_id
            AND is_workspace_member(c.workspace_id)
        )
    );

-- INSERT: Channel creator can add members (important: MUST be allowed for creator after creating channel)
CREATE POLICY "channel_members_insert_policy" ON channel_members
    FOR INSERT WITH CHECK (
        -- User adding themselves to a channel
        user_id = auth.uid()
        OR
        -- Channel creator can add members
        EXISTS (
            SELECT 1 FROM channels c
            WHERE c.id = channel_members.channel_id
            AND c.created_by = auth.uid()
        )
        OR
        -- Workspace admin can add members
        EXISTS (
            SELECT 1 FROM channels c
            WHERE c.id = channel_members.channel_id
            AND is_workspace_admin(c.workspace_id)
        )
    );

-- UPDATE: Channel owners/admins can update member roles
CREATE POLICY "channel_members_update_policy" ON channel_members
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM channel_members cm
            WHERE cm.channel_id = channel_members.channel_id
            AND cm.user_id = auth.uid()
            AND cm.role IN ('owner', 'admin')
        )
    );

-- DELETE: Users can remove themselves or admins can remove anyone
CREATE POLICY "channel_members_delete_policy" ON channel_members
    FOR DELETE USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM channel_members cm
            WHERE cm.channel_id = channel_members.channel_id
            AND cm.user_id = auth.uid()
            AND cm.role IN ('owner', 'admin')
        )
    );

-- ============================================
-- 3. FIX WORKSPACE_MEMBERSHIPS POLICIES
-- ============================================

-- Drop all existing workspace_memberships policies
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'workspace_memberships' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON workspace_memberships', pol.policyname);
    END LOOP;
END $$;

-- SELECT: Users can view memberships for workspaces they're in
-- This is crucial for the DM dialog to show other workspace members
CREATE POLICY "workspace_memberships_select_policy" ON workspace_memberships
    FOR SELECT USING (
        -- Can see own membership
        user_id = auth.uid()
        -- Can see other members if you're in the workspace
        OR is_workspace_member(workspace_id)
        -- Workspace owner can see all memberships
        OR EXISTS (SELECT 1 FROM workspaces WHERE id = workspace_id AND owner_id = auth.uid())
    );

-- INSERT: Users can join workspaces (typically via invite) or owners can add members
CREATE POLICY "workspace_memberships_insert_policy" ON workspace_memberships
    FOR INSERT WITH CHECK (
        -- User joining themselves
        user_id = auth.uid()
        -- Workspace owner/admin can add members
        OR EXISTS (SELECT 1 FROM workspaces WHERE id = workspace_id AND owner_id = auth.uid())
        OR is_workspace_admin(workspace_id)
    );

-- UPDATE: Users can update their own membership or admins can update others
CREATE POLICY "workspace_memberships_update_policy" ON workspace_memberships
    FOR UPDATE USING (
        user_id = auth.uid()
        OR is_workspace_admin(workspace_id)
    );

-- DELETE: Users can leave or admins can remove members
CREATE POLICY "workspace_memberships_delete_policy" ON workspace_memberships
    FOR DELETE USING (
        user_id = auth.uid()
        OR is_workspace_admin(workspace_id)
    );

-- ============================================
-- 4. FIX USERS TABLE POLICIES (if needed)
-- ============================================

-- The users table needs to be readable for joins
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'users' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON users', pol.policyname);
    END LOOP;
END $$;

-- SELECT: Authenticated users can view basic user info
-- This is needed for the DM dialog to display user names
CREATE POLICY "users_select_policy" ON users
    FOR SELECT USING (
        -- Can see own record
        id = auth.uid()
        -- Can see users in same workspace
        OR EXISTS (
            SELECT 1 FROM workspace_memberships wm1
            INNER JOIN workspace_memberships wm2 ON wm1.workspace_id = wm2.workspace_id
            WHERE wm1.user_id = auth.uid()
            AND wm2.user_id = users.id
            AND wm1.status = 'active'
            AND wm2.status = 'active'
        )
    );

-- INSERT: Users can create their own profile
CREATE POLICY "users_insert_policy" ON users
    FOR INSERT WITH CHECK (
        id = auth.uid()
    );

-- UPDATE: Users can update their own profile
CREATE POLICY "users_update_policy" ON users
    FOR UPDATE USING (
        id = auth.uid()
    );

-- ============================================
-- VERIFICATION (run manually to check policies)
-- ============================================
-- SELECT tablename, policyname, cmd, qual 
-- FROM pg_policies 
-- WHERE tablename IN ('channels', 'channel_members', 'workspace_memberships', 'users')
-- ORDER BY tablename, policyname;
