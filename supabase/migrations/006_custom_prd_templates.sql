-- Migration: Add custom PRD templates table
-- This stores user-created and starter templates with sections and categories

-- Create template_categories enum if needed (extensible for user-defined categories)
DO $$ BEGIN
    CREATE TYPE template_category AS ENUM ('saas', 'consumer', 'platform', 'internal', 'api', 'custom');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create custom_prd_templates table
CREATE TABLE IF NOT EXISTS custom_prd_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    sections JSONB NOT NULL DEFAULT '[]', -- Array of TemplateSection objects
    is_starter_template BOOLEAN DEFAULT FALSE,
    context_prompt TEXT,
    icon TEXT,
    color TEXT,
    use_cases JSONB DEFAULT '[]', -- Array of strings
    category template_category DEFAULT 'custom',
    version INTEGER DEFAULT 1,
    version_history JSONB DEFAULT '[]', -- Array of TemplateVersion objects
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID, -- For multi-workspace support in future
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user-defined categories table for custom categories
CREATE TABLE IF NOT EXISTS custom_template_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    label TEXT NOT NULL,
    icon TEXT,
    color TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, name)
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_custom_prd_templates_user_id ON custom_prd_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_prd_templates_category ON custom_prd_templates(category);
CREATE INDEX IF NOT EXISTS idx_custom_template_categories_user_id ON custom_template_categories(user_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_custom_prd_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_custom_prd_templates_updated_at
    BEFORE UPDATE ON custom_prd_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_custom_prd_templates_updated_at();

-- Add comments
COMMENT ON TABLE custom_prd_templates IS 'User-created and starter PRD templates with customizable sections';
COMMENT ON COLUMN custom_prd_templates.sections IS 'Array of TemplateSection objects with id, title, order, and description';
COMMENT ON COLUMN custom_prd_templates.version_history IS 'Array of previous versions for tracking changes';
COMMENT ON TABLE custom_template_categories IS 'User-defined custom categories for organizing templates';
