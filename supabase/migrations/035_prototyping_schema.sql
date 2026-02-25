-- 035_prototyping_schema.sql

-- Component Libraries (Repositories of UI code imported for use)
CREATE TABLE IF NOT EXISTS public.component_libraries (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    repo_url text, -- If imported from GitHub
    is_public boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Individual components parsed from library
CREATE TABLE IF NOT EXISTS public.library_components (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    library_id uuid NOT NULL REFERENCES public.component_libraries(id) ON DELETE CASCADE,
    name text NOT NULL,
    file_path text NOT NULL,
    code_content text NOT NULL,
    props_schema jsonb, -- Optional representation of props
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(library_id, name)
);

-- AI Prototypes generated using Adorable flow
CREATE TABLE IF NOT EXISTS public.prototypes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL, -- Optional linking
    prd_id uuid REFERENCES public.notes(id) ON DELETE SET NULL, -- Optional PRD reference
    library_id uuid REFERENCES public.component_libraries(id) ON DELETE SET NULL,
    name text NOT NULL,
    code_content text, -- The generated Next/React app code or state
    chat_history jsonb DEFAULT '[]'::jsonb, -- Store the Adorable chat history
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add updated_at trigger for tables
CREATE TRIGGER update_component_libraries_modtime BEFORE UPDATE ON public.component_libraries FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_library_components_modtime BEFORE UPDATE ON public.library_components FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER update_prototypes_modtime BEFORE UPDATE ON public.prototypes FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Enable RLS
ALTER TABLE public.component_libraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prototypes ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- Standard Workspace RLS Policies
-- Users can read/write if they are members of the workspace
-- ----------------------------------------------------------------------------

-- component_libraries
CREATE POLICY "Users can view component_libraries in their workspaces"
    ON public.component_libraries FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_members.workspace_id = component_libraries.workspace_id
            AND workspace_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert component_libraries in their workspaces"
    ON public.component_libraries FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_members.workspace_id = component_libraries.workspace_id
            AND workspace_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update component_libraries in their workspaces"
    ON public.component_libraries FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_members.workspace_id = component_libraries.workspace_id
            AND workspace_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete component_libraries in their workspaces"
    ON public.component_libraries FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_members.workspace_id = component_libraries.workspace_id
            AND workspace_members.user_id = auth.uid()
        )
    );

-- library_components
CREATE POLICY "Users can view library_components via library workspace"
    ON public.library_components FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.component_libraries cl
            JOIN public.workspace_members wm ON wm.workspace_id = cl.workspace_id
            WHERE cl.id = library_components.library_id
            AND wm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert library_components via library workspace"
    ON public.library_components FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.component_libraries cl
            JOIN public.workspace_members wm ON wm.workspace_id = cl.workspace_id
            WHERE cl.id = library_components.library_id
            AND wm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update library_components via library workspace"
    ON public.library_components FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.component_libraries cl
            JOIN public.workspace_members wm ON wm.workspace_id = cl.workspace_id
            WHERE cl.id = library_components.library_id
            AND wm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete library_components via library workspace"
    ON public.library_components FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.component_libraries cl
            JOIN public.workspace_members wm ON wm.workspace_id = cl.workspace_id
            WHERE cl.id = library_components.library_id
            AND wm.user_id = auth.uid()
        )
    );

-- prototypes
CREATE POLICY "Users can view prototypes in their workspaces"
    ON public.prototypes FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_members.workspace_id = prototypes.workspace_id
            AND workspace_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert prototypes in their workspaces"
    ON public.prototypes FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_members.workspace_id = prototypes.workspace_id
            AND workspace_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update prototypes in their workspaces"
    ON public.prototypes FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_members.workspace_id = prototypes.workspace_id
            AND workspace_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete prototypes in their workspaces"
    ON public.prototypes FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_members.workspace_id = prototypes.workspace_id
            AND workspace_members.user_id = auth.uid()
        )
    );

-- Add to publications for realtime if needed
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'prototypes'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.prototypes;
    END IF;
END $$;
