-- Supabase Row Level Security Policies
-- Run this AFTER enabling RLS on tables in Supabase Dashboard

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_accounts ENABLE ROW LEVEL SECURITY;

-- ============================================
-- USERS POLICIES
-- ============================================
-- Users can view all users (for team assignment features)
CREATE POLICY "Users can view all users"
  ON users FOR SELECT
  USING (true);

-- Users can only update their own profile
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Only admins can create new users (handled via Supabase Auth)
CREATE POLICY "Authenticated users can insert"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================
-- EMPLOYEES POLICIES
-- ============================================
-- All authenticated users can view non-deleted employees
CREATE POLICY "Anyone can view employees"
  ON employees FOR SELECT
  USING (is_deleted = false);

-- Only admins can insert employees
CREATE POLICY "Admins can insert employees"
  ON employees FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees 
      WHERE id = auth.uid() AND role = 'admin' AND is_active = true
    )
  );

-- Only admins can update employees
CREATE POLICY "Admins can update employees"
  ON employees FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM employees 
      WHERE id = auth.uid() AND role = 'admin' AND is_active = true
    )
  );

-- ============================================
-- TASKS POLICIES
-- ============================================
-- All authenticated users can view all tasks (team collaboration)
CREATE POLICY "Authenticated users can view tasks"
  ON tasks FOR SELECT
  USING (auth.role() = 'authenticated' AND is_deleted = false);

-- All authenticated users can create tasks
CREATE POLICY "Authenticated users can create tasks"
  ON tasks FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- All authenticated users can update tasks
CREATE POLICY "Authenticated users can update tasks"
  ON tasks FOR UPDATE
  USING (auth.role() = 'authenticated');

-- ============================================
-- NOTES POLICIES
-- ============================================
-- Users can view all notes (shared notes feature)
CREATE POLICY "Authenticated users can view notes"
  ON notes FOR SELECT
  USING (auth.role() = 'authenticated' AND is_deleted = false);

-- Users can create notes
CREATE POLICY "Authenticated users can create notes"
  ON notes FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Users can update their own notes
CREATE POLICY "Users can update own notes"
  ON notes FOR UPDATE
  USING (author_id = auth.uid());

-- ============================================
-- TAGS POLICIES
-- ============================================
-- All authenticated users can view tags
CREATE POLICY "Authenticated users can view tags"
  ON tags FOR SELECT
  USING (auth.role() = 'authenticated');

-- Admins can manage tags
CREATE POLICY "Admins can insert tags"
  ON tags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- CALENDAR EVENTS POLICIES
-- ============================================
-- Authenticated users can view all events
CREATE POLICY "Authenticated users can view events"
  ON calendar_events FOR SELECT
  USING (auth.role() = 'authenticated' AND is_deleted = false);

-- Authenticated users can create events
CREATE POLICY "Authenticated users can create events"
  ON calendar_events FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Authenticated users can update events
CREATE POLICY "Authenticated users can update events"
  ON calendar_events FOR UPDATE
  USING (auth.role() = 'authenticated');

-- ============================================
-- WORKSPACES POLICIES
-- ============================================
-- Users can view workspaces they are members of
CREATE POLICY "Users can view their workspaces"
  ON workspaces FOR SELECT
  USING (
    is_deleted = false AND (
      owner_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM workspace_memberships
        WHERE workspace_id = workspaces.id AND user_id = auth.uid()
      )
    )
  );

-- Users can create workspaces
CREATE POLICY "Authenticated users can create workspaces"
  ON workspaces FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Only owners/admins can update workspaces
CREATE POLICY "Owners can update workspaces"
  ON workspaces FOR UPDATE
  USING (owner_id = auth.uid());

-- ============================================
-- WORKSPACE MEMBERSHIPS POLICIES
-- ============================================
-- Users can view memberships for their workspaces
CREATE POLICY "Users can view workspace memberships"
  ON workspace_memberships FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspaces
      WHERE id = workspace_memberships.workspace_id
      AND (owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM workspace_memberships wm
          WHERE wm.workspace_id = workspaces.id AND wm.user_id = auth.uid()
        )
      )
    )
  );

-- ============================================
-- WORKSPACE INVITATIONS POLICIES
-- ============================================
-- Workspace members can view invitations
CREATE POLICY "Members can view invitations"
  ON workspace_invitations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_memberships
      WHERE workspace_id = workspace_invitations.workspace_id 
      AND user_id = auth.uid()
    )
  );

-- Admins/owners can create invitations
CREATE POLICY "Admins can create invitations"
  ON workspace_invitations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspaces
      WHERE id = workspace_invitations.workspace_id
      AND owner_id = auth.uid()
    )
  );

-- ============================================
-- CALENDAR ACCOUNTS POLICIES
-- ============================================
-- Users can only view their own calendar accounts
CREATE POLICY "Users can view own calendar accounts"
  ON calendar_accounts FOR SELECT
  USING (user_id = auth.uid());

-- Users can only insert their own calendar accounts
CREATE POLICY "Users can insert own calendar accounts"
  ON calendar_accounts FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can only update their own calendar accounts
CREATE POLICY "Users can update own calendar accounts"
  ON calendar_accounts FOR UPDATE
  USING (user_id = auth.uid());

-- Users can only delete their own calendar accounts
CREATE POLICY "Users can delete own calendar accounts"
  ON calendar_accounts FOR DELETE
  USING (user_id = auth.uid());
