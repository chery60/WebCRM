-- Migration: Chat Sessions for PRD and Section Generation
-- This table stores chat history for the PRD Assistant and Section Generator drawers
-- Enables persistence across browser sessions and devices

-- Create chat_sessions table
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Session metadata
    note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    session_type TEXT NOT NULL CHECK (session_type IN ('prd', 'section')),
    
    -- Session data (stored as JSONB for flexibility)
    -- Contains: messages array, version history, template/section selections
    session_data JSONB NOT NULL DEFAULT '{}',
    
    -- User tracking
    user_id UUID NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for fast lookup by note_id and session_type
CREATE INDEX IF NOT EXISTS idx_chat_sessions_note_type 
ON chat_sessions(note_id, session_type);

-- Create index for user lookups
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user 
ON chat_sessions(user_id);

-- Create unique constraint to ensure one session per note per type per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_sessions_unique_session 
ON chat_sessions(note_id, session_type, user_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_chat_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_chat_sessions_updated_at
    BEFORE UPDATE ON chat_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_chat_sessions_updated_at();

-- Add RLS policies
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own chat sessions
CREATE POLICY chat_sessions_select_own ON chat_sessions
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own chat sessions
CREATE POLICY chat_sessions_insert_own ON chat_sessions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own chat sessions
CREATE POLICY chat_sessions_update_own ON chat_sessions
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own chat sessions
CREATE POLICY chat_sessions_delete_own ON chat_sessions
    FOR DELETE
    USING (auth.uid() = user_id);

-- Add comment for documentation
COMMENT ON TABLE chat_sessions IS 'Stores chat history for PRD Assistant and Section Generator drawers, enabling persistence across sessions';
COMMENT ON COLUMN chat_sessions.session_type IS 'Type of chat session: prd (PRD Assistant) or section (Section Generator)';
COMMENT ON COLUMN chat_sessions.session_data IS 'JSONB containing messages, version history, and settings';
