-- 036_fix_prototypes_rls.sql
-- Idempotent fix: ensures the prototypes (and related) tables exist with correct RLS.
-- Safe to run multiple times.

-- ============================================================
-- Ensure the updated_at trigger function exists
-- ============================================================
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Component Libraries
-- ============================================================
CREATE TABLE IF NOT EXISTS public.component_libraries (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    package_name text,
    package_version text,
    repo_url text,
    storybook_url text,
    import_source text NOT NULL DEFAULT 'manual',
    is_public boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================
-- Library Components
-- ============================================================
CREATE TABLE IF NOT EXISTS public.library_components (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    library_id uuid NOT NULL REFERENCES public.component_libraries(id) ON DELETE CASCADE,
    name text NOT NULL,
    file_path text NOT NULL,
    code_content text NOT NULL,
    category text,
    description text,
    example_usage text,
    props_schema jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(library_id, name)
);

-- ============================================================
-- Prototypes
-- ============================================================
CREATE TABLE IF NOT EXISTS public.prototypes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
    prd_id uuid REFERENCES public.notes(id) ON DELETE SET NULL,
    library_id uuid REFERENCES public.component_libraries(id) ON DELETE SET NULL,
    name text NOT NULL DEFAULT 'Untitled Prototype',
    code_content text,
    chat_history jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================
-- Triggers
-- ============================================================
DROP TRIGGER IF EXISTS update_component_libraries_modtime ON public.component_libraries;
CREATE TRIGGER update_component_libraries_modtime
    BEFORE UPDATE ON public.component_libraries
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

DROP TRIGGER IF EXISTS update_library_components_modtime ON public.library_components;
CREATE TRIGGER update_library_components_modtime
    BEFORE UPDATE ON public.library_components
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

DROP TRIGGER IF EXISTS update_prototypes_modtime ON public.prototypes;
CREATE TRIGGER update_prototypes_modtime
    BEFORE UPDATE ON public.prototypes
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- ============================================================
-- Enable RLS
-- ============================================================
ALTER TABLE public.component_libraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prototypes ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS Policies: component_libraries
-- ============================================================
DROP POLICY IF EXISTS "Users can view component_libraries in their workspaces" ON public.component_libraries;
CREATE POLICY "Users can view component_libraries in their workspaces"
    ON public.component_libraries FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_memberships
            WHERE workspace_memberships.workspace_id = component_libraries.workspace_id
            AND workspace_memberships.user_id = auth.uid()
            AND workspace_memberships.status = 'active'
        )
    );

DROP POLICY IF EXISTS "Users can insert component_libraries in their workspaces" ON public.component_libraries;
CREATE POLICY "Users can insert component_libraries in their workspaces"
    ON public.component_libraries FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.workspace_memberships
            WHERE workspace_memberships.workspace_id = component_libraries.workspace_id
            AND workspace_memberships.user_id = auth.uid()
            AND workspace_memberships.status = 'active'
        )
    );

DROP POLICY IF EXISTS "Users can update component_libraries in their workspaces" ON public.component_libraries;
CREATE POLICY "Users can update component_libraries in their workspaces"
    ON public.component_libraries FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_memberships
            WHERE workspace_memberships.workspace_id = component_libraries.workspace_id
            AND workspace_memberships.user_id = auth.uid()
            AND workspace_memberships.status = 'active'
        )
    );

DROP POLICY IF EXISTS "Users can delete component_libraries in their workspaces" ON public.component_libraries;
CREATE POLICY "Users can delete component_libraries in their workspaces"
    ON public.component_libraries FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_memberships
            WHERE workspace_memberships.workspace_id = component_libraries.workspace_id
            AND workspace_memberships.user_id = auth.uid()
            AND workspace_memberships.status = 'active'
        )
    );

-- ============================================================
-- RLS Policies: library_components
-- ============================================================
DROP POLICY IF EXISTS "Users can view library_components via library workspace" ON public.library_components;
CREATE POLICY "Users can view library_components via library workspace"
    ON public.library_components FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.component_libraries cl
            JOIN public.workspace_memberships wm ON wm.workspace_id = cl.workspace_id
            WHERE cl.id = library_components.library_id
            AND wm.user_id = auth.uid()
            AND wm.status = 'active'
        )
    );

DROP POLICY IF EXISTS "Users can insert library_components via library workspace" ON public.library_components;
CREATE POLICY "Users can insert library_components via library workspace"
    ON public.library_components FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.component_libraries cl
            JOIN public.workspace_memberships wm ON wm.workspace_id = cl.workspace_id
            WHERE cl.id = library_components.library_id
            AND wm.user_id = auth.uid()
            AND wm.status = 'active'
        )
    );

DROP POLICY IF EXISTS "Users can update library_components via library workspace" ON public.library_components;
CREATE POLICY "Users can update library_components via library workspace"
    ON public.library_components FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.component_libraries cl
            JOIN public.workspace_memberships wm ON wm.workspace_id = cl.workspace_id
            WHERE cl.id = library_components.library_id
            AND wm.user_id = auth.uid()
            AND wm.status = 'active'
        )
    );

DROP POLICY IF EXISTS "Users can delete library_components via library workspace" ON public.library_components;
CREATE POLICY "Users can delete library_components via library workspace"
    ON public.library_components FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.component_libraries cl
            JOIN public.workspace_memberships wm ON wm.workspace_id = cl.workspace_id
            WHERE cl.id = library_components.library_id
            AND wm.user_id = auth.uid()
            AND wm.status = 'active'
        )
    );

-- ============================================================
-- RLS Policies: prototypes
-- ============================================================
DROP POLICY IF EXISTS "Users can view prototypes in their workspaces" ON public.prototypes;
CREATE POLICY "Users can view prototypes in their workspaces"
    ON public.prototypes FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_memberships
            WHERE workspace_memberships.workspace_id = prototypes.workspace_id
            AND workspace_memberships.user_id = auth.uid()
            AND workspace_memberships.status = 'active'
        )
    );

DROP POLICY IF EXISTS "Users can insert prototypes in their workspaces" ON public.prototypes;
CREATE POLICY "Users can insert prototypes in their workspaces"
    ON public.prototypes FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.workspace_memberships
            WHERE workspace_memberships.workspace_id = prototypes.workspace_id
            AND workspace_memberships.user_id = auth.uid()
            AND workspace_memberships.status = 'active'
        )
    );

DROP POLICY IF EXISTS "Users can update prototypes in their workspaces" ON public.prototypes;
CREATE POLICY "Users can update prototypes in their workspaces"
    ON public.prototypes FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_memberships
            WHERE workspace_memberships.workspace_id = prototypes.workspace_id
            AND workspace_memberships.user_id = auth.uid()
            AND workspace_memberships.status = 'active'
        )
    );

DROP POLICY IF EXISTS "Users can delete prototypes in their workspaces" ON public.prototypes;
CREATE POLICY "Users can delete prototypes in their workspaces"
    ON public.prototypes FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_memberships
            WHERE workspace_memberships.workspace_id = prototypes.workspace_id
            AND workspace_memberships.user_id = auth.uid()
            AND workspace_memberships.status = 'active'
        )
    );

-- ============================================================
-- Realtime (idempotent)
-- ============================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'prototypes'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.prototypes;
    END IF;
END $$;
