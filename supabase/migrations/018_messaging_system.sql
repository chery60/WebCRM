-- Messaging System Migration
-- Channels and Direct Messages for workspace collaboration

-- ============================================
-- CHANNELS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_private BOOLEAN DEFAULT false,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    is_deleted BOOLEAN DEFAULT false,
    
    -- Constraints
    CONSTRAINT channels_name_workspace_unique UNIQUE(workspace_id, name)
);

-- Index for faster queries
CREATE INDEX idx_channels_workspace_id ON channels(workspace_id);
CREATE INDEX idx_channels_created_by ON channels(created_by);
CREATE INDEX idx_channels_is_deleted ON channels(is_deleted);

-- ============================================
-- CHANNEL MEMBERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS channel_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    
    -- Constraints
    CONSTRAINT channel_members_unique UNIQUE(channel_id, user_id)
);

-- Index for faster queries
CREATE INDEX idx_channel_members_channel_id ON channel_members(channel_id);
CREATE INDEX idx_channel_members_user_id ON channel_members(user_id);

-- ============================================
-- MESSAGES TABLE (for both channels and DMs)
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- For direct messages
    content TEXT NOT NULL,
    parent_message_id UUID REFERENCES messages(id) ON DELETE CASCADE, -- For threaded replies
    thread_count INTEGER DEFAULT 0, -- Number of replies in thread
    attachments JSONB DEFAULT '[]'::jsonb, -- Array of attachment objects
    reactions JSONB DEFAULT '[]'::jsonb, -- Array of reaction objects
    is_edited BOOLEAN DEFAULT false,
    edited_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    is_deleted BOOLEAN DEFAULT false,
    
    -- Constraints: Either channel_id OR (sender_id AND receiver_id) must be set for DMs
    CONSTRAINT message_destination_check CHECK (
        (channel_id IS NOT NULL AND receiver_id IS NULL) OR
        (channel_id IS NULL AND receiver_id IS NOT NULL)
    )
);

-- Indexes for faster queries
CREATE INDEX idx_messages_workspace_id ON messages(workspace_id);
CREATE INDEX idx_messages_channel_id ON messages(channel_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX idx_messages_parent_message_id ON messages(parent_message_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_messages_is_deleted ON messages(is_deleted);

-- ============================================
-- MESSAGE READS TABLE (track read status)
-- ============================================
CREATE TABLE IF NOT EXISTS message_reads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    read_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    
    -- Constraints
    CONSTRAINT message_reads_unique UNIQUE(message_id, user_id)
);

-- Index for faster queries
CREATE INDEX idx_message_reads_message_id ON message_reads(message_id);
CREATE INDEX idx_message_reads_user_id ON message_reads(user_id);

-- ============================================
-- DIRECT MESSAGE CONVERSATIONS TABLE
-- (To track DM conversation metadata)
-- ============================================
CREATE TABLE IF NOT EXISTS direct_message_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    last_message_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints: Ensure user1_id < user2_id to avoid duplicates
    CONSTRAINT dm_conversations_unique UNIQUE(workspace_id, user1_id, user2_id),
    CONSTRAINT dm_users_different CHECK (user1_id != user2_id)
);

-- Index for faster queries
CREATE INDEX idx_dm_conversations_workspace_id ON direct_message_conversations(workspace_id);
CREATE INDEX idx_dm_conversations_user1_id ON direct_message_conversations(user1_id);
CREATE INDEX idx_dm_conversations_user2_id ON direct_message_conversations(user2_id);
CREATE INDEX idx_dm_conversations_last_message_at ON direct_message_conversations(last_message_at DESC);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_channels_updated_at BEFORE UPDATE ON channels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dm_conversations_updated_at BEFORE UPDATE ON direct_message_conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to increment thread count
CREATE OR REPLACE FUNCTION increment_thread_count()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.parent_message_id IS NOT NULL THEN
        UPDATE messages 
        SET thread_count = thread_count + 1 
        WHERE id = NEW.parent_message_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to increment thread count on new reply
CREATE TRIGGER increment_message_thread_count AFTER INSERT ON messages
    FOR EACH ROW EXECUTE FUNCTION increment_thread_count();

-- Function to update DM conversation last_message_at
CREATE OR REPLACE FUNCTION update_dm_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.receiver_id IS NOT NULL THEN
        UPDATE direct_message_conversations
        SET last_message_at = NEW.created_at,
            updated_at = NEW.created_at
        WHERE workspace_id = NEW.workspace_id
          AND (
              (user1_id = NEW.sender_id AND user2_id = NEW.receiver_id) OR
              (user1_id = NEW.receiver_id AND user2_id = NEW.sender_id)
          );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update DM conversation timestamp
CREATE TRIGGER update_dm_conversation_on_message AFTER INSERT ON messages
    FOR EACH ROW EXECUTE FUNCTION update_dm_conversation_timestamp();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_message_conversations ENABLE ROW LEVEL SECURITY;

-- Channels Policies
CREATE POLICY "Users can view channels in their workspace"
    ON channels FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_memberships 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

CREATE POLICY "Users can create channels in their workspace"
    ON channels FOR INSERT
    WITH CHECK (
        workspace_id IN (
            SELECT workspace_id FROM workspace_memberships 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

CREATE POLICY "Channel creators and admins can update channels"
    ON channels FOR UPDATE
    USING (
        created_by = auth.uid() OR
        workspace_id IN (
            SELECT workspace_id FROM workspace_memberships 
            WHERE user_id = auth.uid() 
              AND role IN ('owner', 'admin')
              AND status = 'active'
        )
    );

CREATE POLICY "Channel creators and admins can delete channels"
    ON channels FOR DELETE
    USING (
        created_by = auth.uid() OR
        workspace_id IN (
            SELECT workspace_id FROM workspace_memberships 
            WHERE user_id = auth.uid() 
              AND role IN ('owner', 'admin')
              AND status = 'active'
        )
    );

-- Channel Members Policies
CREATE POLICY "Users can view channel members for channels they're in"
    ON channel_members FOR SELECT
    USING (
        channel_id IN (
            SELECT channel_id FROM channel_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Channel owners/admins and workspace admins can add members"
    ON channel_members FOR INSERT
    WITH CHECK (
        channel_id IN (
            SELECT cm.channel_id FROM channel_members cm
            WHERE cm.user_id = auth.uid() AND cm.role IN ('owner', 'admin')
        ) OR
        channel_id IN (
            SELECT c.id FROM channels c
            INNER JOIN workspace_memberships wm ON c.workspace_id = wm.workspace_id
            WHERE wm.user_id = auth.uid() AND wm.role IN ('owner', 'admin') AND wm.status = 'active'
        )
    );

CREATE POLICY "Channel owners/admins can update members"
    ON channel_members FOR UPDATE
    USING (
        channel_id IN (
            SELECT cm.channel_id FROM channel_members cm
            WHERE cm.user_id = auth.uid() AND cm.role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Users can remove themselves, channel owners/admins can remove anyone"
    ON channel_members FOR DELETE
    USING (
        user_id = auth.uid() OR
        channel_id IN (
            SELECT cm.channel_id FROM channel_members cm
            WHERE cm.user_id = auth.uid() AND cm.role IN ('owner', 'admin')
        )
    );

-- Messages Policies
CREATE POLICY "Users can view messages in their channels"
    ON messages FOR SELECT
    USING (
        (channel_id IS NOT NULL AND channel_id IN (
            SELECT channel_id FROM channel_members WHERE user_id = auth.uid()
        )) OR
        (receiver_id IS NOT NULL AND (sender_id = auth.uid() OR receiver_id = auth.uid()))
    );

CREATE POLICY "Users can send messages to channels they're in or direct messages"
    ON messages FOR INSERT
    WITH CHECK (
        (channel_id IS NOT NULL AND channel_id IN (
            SELECT channel_id FROM channel_members WHERE user_id = auth.uid()
        ) AND sender_id = auth.uid()) OR
        (receiver_id IS NOT NULL AND sender_id = auth.uid() AND 
         workspace_id IN (
            SELECT workspace_id FROM workspace_memberships 
            WHERE user_id = auth.uid() AND status = 'active'
         ) AND
         receiver_id IN (
            SELECT user_id FROM workspace_memberships 
            WHERE workspace_id = messages.workspace_id AND status = 'active'
         ))
    );

CREATE POLICY "Users can update their own messages"
    ON messages FOR UPDATE
    USING (sender_id = auth.uid());

CREATE POLICY "Users can delete their own messages"
    ON messages FOR DELETE
    USING (sender_id = auth.uid());

-- Message Reads Policies
CREATE POLICY "Users can view their own read status"
    ON message_reads FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can mark messages as read"
    ON message_reads FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own read status"
    ON message_reads FOR UPDATE
    USING (user_id = auth.uid());

-- Direct Message Conversations Policies
CREATE POLICY "Users can view their own DM conversations"
    ON direct_message_conversations FOR SELECT
    USING (user1_id = auth.uid() OR user2_id = auth.uid());

CREATE POLICY "Users can create DM conversations in their workspace"
    ON direct_message_conversations FOR INSERT
    WITH CHECK (
        (user1_id = auth.uid() OR user2_id = auth.uid()) AND
        workspace_id IN (
            SELECT workspace_id FROM workspace_memberships 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

CREATE POLICY "Users can update their own DM conversations"
    ON direct_message_conversations FOR UPDATE
    USING (user1_id = auth.uid() OR user2_id = auth.uid());

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE channels IS 'Workspace channels for team communication';
COMMENT ON TABLE channel_members IS 'Members of each channel with their roles';
COMMENT ON TABLE messages IS 'Messages in channels and direct messages';
COMMENT ON TABLE message_reads IS 'Track which messages have been read by users';
COMMENT ON TABLE direct_message_conversations IS 'Direct message conversations between users';
