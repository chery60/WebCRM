-- ============================================
-- FIX MESSAGING FOREIGN KEYS (021)
-- ============================================
-- Repoint Foreign Keys from auth.users to public.users
-- This allows PostgREST to perform joins (e.g. embed sender details) which is
-- not possible with auth.users (not exposed in the API).

-- 1. Messages Table
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_receiver_id_fkey;

ALTER TABLE messages
    ADD CONSTRAINT messages_sender_id_fkey
    FOREIGN KEY (sender_id)
    REFERENCES public.users(id)
    ON DELETE CASCADE;

ALTER TABLE messages
    ADD CONSTRAINT messages_receiver_id_fkey
    FOREIGN KEY (receiver_id)
    REFERENCES public.users(id)
    ON DELETE CASCADE;

-- 2. Channels Table
-- Default name likely channels_created_by_fkey
ALTER TABLE channels DROP CONSTRAINT IF EXISTS channels_created_by_fkey;

ALTER TABLE channels
    ADD CONSTRAINT channels_created_by_fkey
    FOREIGN KEY (created_by)
    REFERENCES public.users(id)
    ON DELETE CASCADE;

-- 3. Channel Members Table
-- Default name likely channel_members_user_id_fkey
ALTER TABLE channel_members DROP CONSTRAINT IF EXISTS channel_members_user_id_fkey;

ALTER TABLE channel_members
    ADD CONSTRAINT channel_members_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES public.users(id)
    ON DELETE CASCADE;

-- 4. Direct Message Conversations Table
-- Default names likely direct_message_conversations_user1_id_fkey etc.
ALTER TABLE direct_message_conversations DROP CONSTRAINT IF EXISTS direct_message_conversations_user1_id_fkey;
ALTER TABLE direct_message_conversations DROP CONSTRAINT IF EXISTS direct_message_conversations_user2_id_fkey;

ALTER TABLE direct_message_conversations
    ADD CONSTRAINT direct_message_conversations_user1_id_fkey
    FOREIGN KEY (user1_id)
    REFERENCES public.users(id)
    ON DELETE CASCADE;

ALTER TABLE direct_message_conversations
    ADD CONSTRAINT direct_message_conversations_user2_id_fkey
    FOREIGN KEY (user2_id)
    REFERENCES public.users(id)
    ON DELETE CASCADE;

-- 5. Message Reads Table
ALTER TABLE message_reads DROP CONSTRAINT IF EXISTS message_reads_user_id_fkey;

ALTER TABLE message_reads
    ADD CONSTRAINT message_reads_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES public.users(id)
    ON DELETE CASCADE;
