-- ============================================
-- FIX DIRECT MESSAGE CONVERSATIONS POLICIES (028)
-- ============================================
-- Migration 020 dropped all policies but only recreated the INSERT policy.
-- This migration adds the missing SELECT and UPDATE policies.

-- Add SELECT policy so users can view their DM conversations
CREATE POLICY "Users can view their own DM conversations"
    ON direct_message_conversations FOR SELECT
    USING (
        (user1_id = auth.uid() OR user2_id = auth.uid())
        AND is_workspace_member(workspace_id)
    );

-- Add UPDATE policy so conversations can be updated (e.g., last_message_at)
CREATE POLICY "Users can update their own DM conversations"
    ON direct_message_conversations FOR UPDATE
    USING (
        (user1_id = auth.uid() OR user2_id = auth.uid())
        AND is_workspace_member(workspace_id)
    );

-- Add helpful comment
COMMENT ON POLICY "Users can view their own DM conversations" ON direct_message_conversations 
IS 'Allows users to view DM conversations they are part of in their workspace';

COMMENT ON POLICY "Users can update their own DM conversations" ON direct_message_conversations 
IS 'Allows users to update DM conversations they are part of (e.g., last message timestamp)';
