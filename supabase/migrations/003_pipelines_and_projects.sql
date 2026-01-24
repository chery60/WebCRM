-- Supabase Database Migration Script
-- Venture CRM - Pipelines, Roadmaps, Feature Requests, Projects
-- Run this in Supabase SQL Editor

-- ============================================
-- PROJECTS TABLE (for organizing notes and tasks)
-- ============================================
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT false
);

-- ============================================
-- PIPELINES TABLE (top-level container for roadmaps)
-- ============================================
CREATE TABLE IF NOT EXISTS pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT false
);

-- ============================================
-- ROADMAPS TABLE (belongs to a pipeline)
-- ============================================
CREATE TABLE IF NOT EXISTS roadmaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT false
);

-- ============================================
-- FEATURE REQUESTS TABLE (belongs to a roadmap)
-- ============================================
CREATE TABLE IF NOT EXISTS feature_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id UUID NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'backlog' CHECK (status IN ('backlog', 'considering', 'in_scoping', 'designing', 'ready_for_dev', 'under_development', 'in_review', 'live_on_production')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  phase TEXT,
  assignees UUID[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  due_date TIMESTAMPTZ,
  start_date TIMESTAMPTZ,
  problem_statement TEXT,
  proposed_solution TEXT,
  acceptance_criteria TEXT[] DEFAULT '{}',
  user_stories TEXT[] DEFAULT '{}',
  technical_notes TEXT,
  dependencies TEXT[] DEFAULT '{}',
  estimated_effort TEXT,
  business_value TEXT CHECK (business_value IS NULL OR business_value IN ('low', 'medium', 'high', 'critical')),
  activities JSONB DEFAULT '[]',
  attachments JSONB DEFAULT '[]',
  "order" INTEGER DEFAULT 0,
  created_by UUID NOT NULL,
  created_by_name TEXT NOT NULL,
  created_by_avatar TEXT,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT false
);

-- ============================================
-- TASK TABS TABLE (for organizing tasks into projects/tabs)
-- ============================================
CREATE TABLE IF NOT EXISTS task_tabs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  icon TEXT,
  "order" INTEGER DEFAULT 0,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ALTER EXISTING TABLES
-- ============================================

-- Add project_id to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS project_id UUID;

-- Add project_id to notes table
ALTER TABLE notes ADD COLUMN IF NOT EXISTS project_id UUID;

-- Add generated_features and generated_tasks to notes table
ALTER TABLE notes ADD COLUMN IF NOT EXISTS generated_features JSONB DEFAULT '[]';
ALTER TABLE notes ADD COLUMN IF NOT EXISTS generated_tasks JSONB DEFAULT '[]';

-- Add user_id to tasks table for user-specific data
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS user_id UUID;

-- Add user_id to notes table (author_id already exists but let's add user_id for consistency)
-- Notes already have author_id, we'll use that

-- Add user_id to calendar_events table
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS user_id UUID;

-- Add user_id to tags table
ALTER TABLE tags ADD COLUMN IF NOT EXISTS user_id UUID;

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Projects
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_is_deleted ON projects(is_deleted);

-- Pipelines
CREATE INDEX IF NOT EXISTS idx_pipelines_user_id ON pipelines(user_id);
CREATE INDEX IF NOT EXISTS idx_pipelines_is_deleted ON pipelines(is_deleted);

-- Roadmaps
CREATE INDEX IF NOT EXISTS idx_roadmaps_pipeline_id ON roadmaps(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_roadmaps_user_id ON roadmaps(user_id);
CREATE INDEX IF NOT EXISTS idx_roadmaps_is_deleted ON roadmaps(is_deleted);

-- Feature Requests
CREATE INDEX IF NOT EXISTS idx_feature_requests_roadmap_id ON feature_requests(roadmap_id);
CREATE INDEX IF NOT EXISTS idx_feature_requests_status ON feature_requests(status);
CREATE INDEX IF NOT EXISTS idx_feature_requests_priority ON feature_requests(priority);
CREATE INDEX IF NOT EXISTS idx_feature_requests_user_id ON feature_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_feature_requests_is_deleted ON feature_requests(is_deleted);

-- Task Tabs
CREATE INDEX IF NOT EXISTS idx_task_tabs_user_id ON task_tabs(user_id);

-- Tasks project_id and user_id
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);

-- Notes project_id
CREATE INDEX IF NOT EXISTS idx_notes_project_id ON notes(project_id);

-- Calendar events user_id
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON calendar_events(user_id);

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pipelines_updated_at ON pipelines;
CREATE TRIGGER update_pipelines_updated_at BEFORE UPDATE ON pipelines
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_roadmaps_updated_at ON roadmaps;
CREATE TRIGGER update_roadmaps_updated_at BEFORE UPDATE ON roadmaps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_feature_requests_updated_at ON feature_requests;
CREATE TRIGGER update_feature_requests_updated_at BEFORE UPDATE ON feature_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_task_tabs_updated_at ON task_tabs;
CREATE TRIGGER update_task_tabs_updated_at BEFORE UPDATE ON task_tabs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE roadmaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_tabs ENABLE ROW LEVEL SECURITY;

-- Projects Policies
DROP POLICY IF EXISTS "Users can view own projects" ON projects;
CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  USING (user_id = auth.uid() AND is_deleted = false);

DROP POLICY IF EXISTS "Users can create own projects" ON projects;
CREATE POLICY "Users can create own projects"
  ON projects FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own projects" ON projects;
CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own projects" ON projects;
CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE
  USING (user_id = auth.uid());

-- Pipelines Policies
DROP POLICY IF EXISTS "Users can view own pipelines" ON pipelines;
CREATE POLICY "Users can view own pipelines"
  ON pipelines FOR SELECT
  USING (user_id = auth.uid() AND is_deleted = false);

DROP POLICY IF EXISTS "Users can create own pipelines" ON pipelines;
CREATE POLICY "Users can create own pipelines"
  ON pipelines FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own pipelines" ON pipelines;
CREATE POLICY "Users can update own pipelines"
  ON pipelines FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own pipelines" ON pipelines;
CREATE POLICY "Users can delete own pipelines"
  ON pipelines FOR DELETE
  USING (user_id = auth.uid());

-- Roadmaps Policies
DROP POLICY IF EXISTS "Users can view own roadmaps" ON roadmaps;
CREATE POLICY "Users can view own roadmaps"
  ON roadmaps FOR SELECT
  USING (user_id = auth.uid() AND is_deleted = false);

DROP POLICY IF EXISTS "Users can create own roadmaps" ON roadmaps;
CREATE POLICY "Users can create own roadmaps"
  ON roadmaps FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own roadmaps" ON roadmaps;
CREATE POLICY "Users can update own roadmaps"
  ON roadmaps FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own roadmaps" ON roadmaps;
CREATE POLICY "Users can delete own roadmaps"
  ON roadmaps FOR DELETE
  USING (user_id = auth.uid());

-- Feature Requests Policies
DROP POLICY IF EXISTS "Users can view own feature requests" ON feature_requests;
CREATE POLICY "Users can view own feature requests"
  ON feature_requests FOR SELECT
  USING (user_id = auth.uid() AND is_deleted = false);

DROP POLICY IF EXISTS "Users can create own feature requests" ON feature_requests;
CREATE POLICY "Users can create own feature requests"
  ON feature_requests FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own feature requests" ON feature_requests;
CREATE POLICY "Users can update own feature requests"
  ON feature_requests FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own feature requests" ON feature_requests;
CREATE POLICY "Users can delete own feature requests"
  ON feature_requests FOR DELETE
  USING (user_id = auth.uid());

-- Task Tabs Policies
DROP POLICY IF EXISTS "Users can view own task tabs" ON task_tabs;
CREATE POLICY "Users can view own task tabs"
  ON task_tabs FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create own task tabs" ON task_tabs;
CREATE POLICY "Users can create own task tabs"
  ON task_tabs FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own task tabs" ON task_tabs;
CREATE POLICY "Users can update own task tabs"
  ON task_tabs FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own task tabs" ON task_tabs;
CREATE POLICY "Users can delete own task tabs"
  ON task_tabs FOR DELETE
  USING (user_id = auth.uid());

-- Update existing tables RLS to be user-specific
-- Tasks: Update policy to filter by user_id
DROP POLICY IF EXISTS "Authenticated users can view tasks" ON tasks;
DROP POLICY IF EXISTS "Users can view own tasks" ON tasks;
CREATE POLICY "Users can view own tasks"
  ON tasks FOR SELECT
  USING (user_id = auth.uid() AND is_deleted = false);

DROP POLICY IF EXISTS "Authenticated users can create tasks" ON tasks;
DROP POLICY IF EXISTS "Users can create own tasks" ON tasks;
CREATE POLICY "Users can create own tasks"
  ON tasks FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can update tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON tasks;
CREATE POLICY "Users can update own tasks"
  ON tasks FOR UPDATE
  USING (user_id = auth.uid());

-- Notes: Already has author_id, update to use it
DROP POLICY IF EXISTS "Authenticated users can view notes" ON notes;
DROP POLICY IF EXISTS "Users can view own notes" ON notes;
CREATE POLICY "Users can view own notes"
  ON notes FOR SELECT
  USING (author_id = auth.uid() AND is_deleted = false);

DROP POLICY IF EXISTS "Authenticated users can create notes" ON notes;
DROP POLICY IF EXISTS "Users can create own notes" ON notes;
CREATE POLICY "Users can create own notes"
  ON notes FOR INSERT
  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own notes" ON notes;
CREATE POLICY "Users can update own notes"
  ON notes FOR UPDATE
  USING (author_id = auth.uid());

-- Calendar Events: Update to be user-specific
DROP POLICY IF EXISTS "Authenticated users can view events" ON calendar_events;
DROP POLICY IF EXISTS "Users can view own events" ON calendar_events;
CREATE POLICY "Users can view own events"
  ON calendar_events FOR SELECT
  USING (user_id = auth.uid() AND is_deleted = false);

DROP POLICY IF EXISTS "Authenticated users can create events" ON calendar_events;
DROP POLICY IF EXISTS "Users can create own events" ON calendar_events;
CREATE POLICY "Users can create own events"
  ON calendar_events FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can update events" ON calendar_events;
DROP POLICY IF EXISTS "Users can update own events" ON calendar_events;
CREATE POLICY "Users can update own events"
  ON calendar_events FOR UPDATE
  USING (user_id = auth.uid());
