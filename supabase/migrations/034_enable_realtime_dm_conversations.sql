-- ============================================
-- ENABLE REALTIME FOR DIRECT MESSAGE CONVERSATIONS (034)
-- ============================================
-- Supabase Realtime postgres_changes requires tables to be in the
-- supabase_realtime publication. This migration ensures that the
-- direct_message_conversations table is included so that clients
-- can receive INSERT/UPDATE events when a new DM conversation is
-- created (e.g. when another user starts a conversation with you).

-- Add direct_message_conversations to the realtime publication
-- so the recipient's sidebar updates in real-time.
ALTER PUBLICATION supabase_realtime ADD TABLE direct_message_conversations;

-- Also ensure messages table is in realtime publication (may already be, but idempotent)
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Ensure channels table is also covered
ALTER PUBLICATION supabase_realtime ADD TABLE channels;
