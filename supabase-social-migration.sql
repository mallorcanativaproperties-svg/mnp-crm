-- ============================================
-- MALLORCA NATIVA CRM - Social Media Module
-- Run in Supabase SQL Editor
-- ============================================

-- 1. Social media connected accounts
CREATE TABLE IF NOT EXISTS social_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  platform TEXT NOT NULL, -- instagram, facebook, tiktok, linkedin, youtube
  account_name TEXT,
  account_id TEXT, -- platform-specific ID
  page_id TEXT, -- for FB pages, IG business account ID
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  profile_pic_url TEXT,
  followers INTEGER DEFAULT 0,
  connected BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}', -- platform-specific config
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Social posts (replaces posts_rrss with richer structure)
ALTER TABLE posts_rrss ADD COLUMN IF NOT EXISTS media_urls TEXT[];
ALTER TABLE posts_rrss ADD COLUMN IF NOT EXISTS published_ids JSONB DEFAULT '{}';
ALTER TABLE posts_rrss ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;
ALTER TABLE posts_rrss ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE posts_rrss ADD COLUMN IF NOT EXISTS error_log TEXT;
ALTER TABLE posts_rrss ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 3. Social inbox - unified messages from all platforms
CREATE TABLE IF NOT EXISTS social_inbox (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  platform TEXT NOT NULL, -- instagram, facebook, tiktok, linkedin, youtube
  conversation_id TEXT, -- platform thread/conversation ID
  sender_id TEXT, -- platform user ID
  sender_name TEXT,
  sender_avatar TEXT,
  message_type TEXT DEFAULT 'dm', -- dm, comment, mention, story_reply
  media_id TEXT, -- post/media the comment is on
  media_caption TEXT, -- snippet of the post caption
  message_text TEXT,
  direction TEXT DEFAULT 'inbound', -- inbound or outbound
  is_read BOOLEAN DEFAULT false,
  replied BOOLEAN DEFAULT false,
  replied_at TIMESTAMPTZ,
  replied_by TEXT,
  automation_id UUID, -- if replied by automation
  raw_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Automations (ManyChat-style)
CREATE TABLE IF NOT EXISTS social_automations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  platform TEXT NOT NULL, -- instagram, facebook, all
  trigger_type TEXT NOT NULL, -- keyword_comment, keyword_dm, new_follower, story_mention
  trigger_keywords TEXT[], -- keywords that activate
  trigger_post_id TEXT, -- specific post or 'all'
  action_type TEXT NOT NULL, -- send_dm, reply_comment, send_dm_and_reply
  action_message TEXT NOT NULL, -- message to send
  action_delay_seconds INTEGER DEFAULT 0,
  match_mode TEXT DEFAULT 'contains', -- contains, exact, starts_with
  case_sensitive BOOLEAN DEFAULT false,
  activo BOOLEAN DEFAULT true,
  total_triggered INTEGER DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Automation log
CREATE TABLE IF NOT EXISTS social_automation_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  automation_id UUID REFERENCES social_automations(id),
  inbox_message_id UUID REFERENCES social_inbox(id),
  action_taken TEXT,
  response_sent TEXT,
  success BOOLEAN DEFAULT true,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_social_inbox_platform ON social_inbox(platform);
CREATE INDEX IF NOT EXISTS idx_social_inbox_read ON social_inbox(is_read);
CREATE INDEX IF NOT EXISTS idx_social_inbox_type ON social_inbox(message_type);
CREATE INDEX IF NOT EXISTS idx_social_inbox_created ON social_inbox(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_automations_active ON social_automations(activo);
CREATE INDEX IF NOT EXISTS idx_social_accounts_platform ON social_accounts(platform);
