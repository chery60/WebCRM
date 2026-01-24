-- Migration: Add canvas_data column to notes table
-- This stores Excalidraw canvas data as JSON string for PRD visual planning

-- Add canvas_data column to notes table
ALTER TABLE notes ADD COLUMN IF NOT EXISTS canvas_data TEXT;

-- Add generated_features column if not exists (for AI-generated features)
ALTER TABLE notes ADD COLUMN IF NOT EXISTS generated_features JSONB DEFAULT '[]';

-- Add generated_tasks column if not exists (for AI-generated tasks)
ALTER TABLE notes ADD COLUMN IF NOT EXISTS generated_tasks JSONB DEFAULT '[]';

-- Add project_id column if not exists (for organizing notes into projects)
ALTER TABLE notes ADD COLUMN IF NOT EXISTS project_id UUID;

-- Add comment explaining the canvas_data column
COMMENT ON COLUMN notes.canvas_data IS 'JSON string containing Excalidraw canvas elements for PRD visual planning';
COMMENT ON COLUMN notes.generated_features IS 'AI-generated feature requests stored with the note';
COMMENT ON COLUMN notes.generated_tasks IS 'AI-generated tasks stored with the note';
COMMENT ON COLUMN notes.project_id IS 'Optional project ID for organizing notes';
