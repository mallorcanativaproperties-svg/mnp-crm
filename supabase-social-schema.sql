-- ============================================
-- MALLORCA NATIVA PROPERTIES - SOCIAL MEDIA SCHEMA
-- Run this in Supabase SQL Editor
-- ============================================

-- Social media connected accounts / tokens
CREATE TABLE IF NOT EXISTS social_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  platform TEXT NOT NULL,
  account_name TEXT,
  account_id TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  page_id TEXT,
  ig_user_id TEXT,
  extra JSONB DEFAULT '{}',
  connected BOOLEAN DEFAULT true,
  connected_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Posts table (new rich structure)
CREATE TABLE IF NOT EXISTS social_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT,
  tipo TEXT,
  texto TEXT,
  hashtags TEXT,
  primer_comentario TEXT,
  redes TEXT[],
  estado TEXT DEFAULT 'borrador',
  fecha_programada TIMESTAMPTZ,
  fecha_publicado TIMESTAMPTZ,
  agente TEXT,
  prop_ref TEXT,
  media_urls TEXT[],
  media_types TEXT[],
  ig_post_id TEXT,
  fb_post_id TEXT,
  li_post_id TEXT,
  tk_post_id TEXT,
  yt_video_id TEXT,
  likes INTEGER DEFAULT 0,
  comentarios INTEGER DEFAULT 0,
  compartidos INTEGER DEFAULT 0,
  alcance INTEGER DEFAULT 0,
  impresiones INTEGER DEFAULT 0,
  guardados INTEGER DEFAULT 0,
  metrics_by_platform JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Inbox: unified messages from all platforms
CREATE TABLE IF NOT EXISTS social_inbox (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  platform TEXT NOT NULL,
  thread_id TEXT,
  contact_name TEXT,
  contact_username TEXT,
  contact_id TEXT,
  contact_avatar TEXT,
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  unread BOOLEAN DEFAULT true,
  assigned_to TEXT,
  tags TEXT[],
  is_lead BOOLEAN DEFAULT false,
  comprador_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Individual messages within threads
CREATE TABLE IF NOT EXISTS social_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  inbox_id UUID REFERENCES social_inbox(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  direction TEXT NOT NULL,
  message_type TEXT DEFAULT 'text',
  content TEXT,
  media_url TEXT,
  platform_message_id TEXT,
  sent_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Comments from posts
CREATE TABLE IF NOT EXISTS social_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES social_posts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  platform_comment_id TEXT,
  author_name TEXT,
  author_username TEXT,
  author_id TEXT,
  content TEXT,
  reply_to TEXT,
  our_reply TEXT,
  our_reply_at TIMESTAMPTZ,
  replied_by TEXT,
  is_hidden BOOLEAN DEFAULT false,
  automation_triggered TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Automations (ManyChat-style)
CREATE TABLE IF NOT EXISTS social_automations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  activa BOOLEAN DEFAULT true,
  platform TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  trigger_keywords TEXT[],
  trigger_post_id UUID,
  action_type TEXT NOT NULL,
  action_message TEXT,
  action_delay_seconds INTEGER DEFAULT 0,
  action_assign_to TEXT,
  action_tags TEXT[],
  times_triggered INTEGER DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Automation log
CREATE TABLE IF NOT EXISTS social_automation_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  automation_id UUID REFERENCES social_automations(id) ON DELETE CASCADE,
  contact_name TEXT,
  contact_id TEXT,
  trigger_content TEXT,
  action_taken TEXT,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_inbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_automation_log ENABLE ROW LEVEL SECURITY;

-- Policies: allow all (CRM handles auth)
CREATE POLICY "Allow all social_accounts" ON social_accounts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all social_posts" ON social_posts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all social_inbox" ON social_inbox FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all social_messages" ON social_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all social_comments" ON social_comments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all social_automations" ON social_automations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all social_automation_log" ON social_automation_log FOR ALL USING (true) WITH CHECK (true);

-- Storage bucket (run separately):
-- INSERT INTO storage.buckets (id, name, public) VALUES ('social-media', 'social-media', true);
