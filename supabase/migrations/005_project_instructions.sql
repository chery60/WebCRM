-- Add instructions column to projects table
-- This column stores default AI instructions for generating PRDs in the project

ALTER TABLE projects ADD COLUMN IF NOT EXISTS instructions TEXT;

-- Add comment for documentation
COMMENT ON COLUMN projects.instructions IS 'Default AI instructions for generating PRDs in this project';


