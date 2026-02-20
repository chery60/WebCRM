-- ============================================
-- FIX: Add foreign key constraint name for messages.sender_id
-- This allows proper join syntax in queries
-- ============================================

-- Drop existing constraint if it exists
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;

-- Re-add with explicit name for better query support
ALTER TABLE messages 
ADD CONSTRAINT messages_sender_id_fkey 
FOREIGN KEY (sender_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- Also ensure receiver_id has named constraint
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_receiver_id_fkey;

ALTER TABLE messages 
ADD CONSTRAINT messages_receiver_id_fkey 
FOREIGN KEY (receiver_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- Add comment explaining the relationship
COMMENT ON CONSTRAINT messages_sender_id_fkey ON messages IS 
'Foreign key to auth.users - use users table for profile data via sender_id join';

COMMENT ON CONSTRAINT messages_receiver_id_fkey ON messages IS 
'Foreign key to auth.users - use users table for profile data via receiver_id join';
