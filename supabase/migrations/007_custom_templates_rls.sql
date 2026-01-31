-- Migration: Add RLS policies for custom PRD templates

-- Enable RLS on custom_prd_templates
ALTER TABLE custom_prd_templates ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own templates and starter templates
CREATE POLICY "Users can view own templates and starters"
    ON custom_prd_templates
    FOR SELECT
    USING (
        user_id = auth.uid() OR 
        is_starter_template = true OR
        user_id IS NULL -- Allow templates without user_id (system templates)
    );

-- Policy: Users can insert their own templates
CREATE POLICY "Users can insert own templates"
    ON custom_prd_templates
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Policy: Users can update their own templates
CREATE POLICY "Users can update own templates"
    ON custom_prd_templates
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Policy: Users can delete their own templates
CREATE POLICY "Users can delete own templates"
    ON custom_prd_templates
    FOR DELETE
    USING (user_id = auth.uid());

-- Enable RLS on custom_template_categories
ALTER TABLE custom_template_categories ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own categories
CREATE POLICY "Users can view own categories"
    ON custom_template_categories
    FOR SELECT
    USING (user_id = auth.uid());

-- Policy: Users can insert their own categories
CREATE POLICY "Users can insert own categories"
    ON custom_template_categories
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Policy: Users can update their own categories
CREATE POLICY "Users can update own categories"
    ON custom_template_categories
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Policy: Users can delete their own categories
CREATE POLICY "Users can delete own categories"
    ON custom_template_categories
    FOR DELETE
    USING (user_id = auth.uid());
