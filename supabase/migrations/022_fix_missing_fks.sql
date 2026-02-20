-- ============================================
-- FIX MISSING FOREIGN KEYS (022)
-- ============================================
-- Add missing foreign keys to public.users for tables that store user_id/author_id
-- This resolves "Could not find a relationship" errors in PostgREST (400 Bad Request)

-- 1. Workspace Memberships (Critical Fix for Direct Messages)
ALTER TABLE workspace_memberships DROP CONSTRAINT IF EXISTS workspace_memberships_user_id_fkey;
ALTER TABLE workspace_memberships
    ADD CONSTRAINT workspace_memberships_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES public.users(id)
    ON DELETE CASCADE;

-- 2. Projects
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_user_id_fkey;
ALTER TABLE projects
    ADD CONSTRAINT projects_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES public.users(id)
    ON DELETE CASCADE;

-- 3. Notes (author_id)
ALTER TABLE notes DROP CONSTRAINT IF EXISTS notes_author_id_fkey;
ALTER TABLE notes
    ADD CONSTRAINT notes_author_id_fkey
    FOREIGN KEY (author_id)
    REFERENCES public.users(id)
    ON DELETE CASCADE;

-- 4. Tasks
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_user_id_fkey;
ALTER TABLE tasks
    ADD CONSTRAINT tasks_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES public.users(id)
    ON DELETE CASCADE;

-- 5. Pipelines
ALTER TABLE pipelines DROP CONSTRAINT IF EXISTS pipelines_user_id_fkey;
ALTER TABLE pipelines
    ADD CONSTRAINT pipelines_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES public.users(id)
    ON DELETE CASCADE;

-- 6. Roadmaps
ALTER TABLE roadmaps DROP CONSTRAINT IF EXISTS roadmaps_user_id_fkey;
ALTER TABLE roadmaps
    ADD CONSTRAINT roadmaps_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES public.users(id)
    ON DELETE CASCADE;

-- 7. Calendar Events
ALTER TABLE calendar_events DROP CONSTRAINT IF EXISTS calendar_events_user_id_fkey;
ALTER TABLE calendar_events
    ADD CONSTRAINT calendar_events_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES public.users(id)
    ON DELETE CASCADE;

-- 8. Task Tabs
ALTER TABLE task_tabs DROP CONSTRAINT IF EXISTS task_tabs_user_id_fkey;
ALTER TABLE task_tabs
    ADD CONSTRAINT task_tabs_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES public.users(id)
    ON DELETE CASCADE;

-- 9. Feature Requests
ALTER TABLE feature_requests DROP CONSTRAINT IF EXISTS feature_requests_user_id_fkey;
ALTER TABLE feature_requests
    ADD CONSTRAINT feature_requests_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES public.users(id)
    ON DELETE CASCADE;
