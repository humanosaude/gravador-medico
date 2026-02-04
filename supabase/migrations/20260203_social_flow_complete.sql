-- ===========================================================
-- SOCIAL FLOW - SISTEMA MULTI-PLATAFORMA COMPLETO
-- Suporte: Instagram, Facebook, Twitter, LinkedIn, YouTube, TikTok, Pinterest
-- Data: 2026-02-03
-- ===========================================================

-- =======================
-- ENUMS
-- =======================

-- Tipo: Rede social suportada
DO $$ BEGIN
  CREATE TYPE social_network AS ENUM (
    'instagram', 
    'facebook', 
    'twitter', 
    'linkedin', 
    'youtube', 
    'tiktok', 
    'pinterest'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Tipo: Status do post
DO $$ BEGIN
  CREATE TYPE sf_post_status AS ENUM (
    'idea',
    'draft',
    'pending_approval',
    'approved',
    'scheduled',
    'publishing',
    'published',
    'failed',
    'deleted'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Tipo: Role do usuário no time
DO $$ BEGIN
  CREATE TYPE sf_user_role AS ENUM (
    'viewer',
    'creator',
    'editor',
    'approver',
    'admin'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Tipo: Tipo de mídia
DO $$ BEGIN
  CREATE TYPE sf_media_type AS ENUM (
    'image',
    'video',
    'gif',
    'document',
    'carousel'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =======================
-- CONTAS CONECTADAS (MULTI-REDE)
-- =======================

CREATE TABLE IF NOT EXISTS sf_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Identificação da rede
  network social_network NOT NULL,
  platform_account_id TEXT NOT NULL,
  username TEXT NOT NULL,
  display_name TEXT,
  profile_picture_url TEXT,
  
  -- Tokens de acesso
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  
  -- IDs auxiliares (específicos por rede)
  -- Instagram/Facebook: facebook_page_id, instagram_business_account_id
  -- YouTube: channel_id
  -- LinkedIn: organization_id (para company pages)
  auxiliary_ids JSONB DEFAULT '{}',
  
  -- Métricas snapshot (atualizadas periodicamente)
  followers_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  posts_count INTEGER DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_primary BOOLEAN DEFAULT false, -- Conta principal do usuário para essa rede
  connection_status TEXT DEFAULT 'connected', -- connected, expired, revoked, error
  last_error TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ,
  token_refreshed_at TIMESTAMPTZ,
  
  UNIQUE(network, platform_account_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_sf_accounts_user ON sf_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_sf_accounts_network ON sf_accounts(network);
CREATE INDEX IF NOT EXISTS idx_sf_accounts_active ON sf_accounts(is_active) WHERE is_active = true;

-- RLS
ALTER TABLE sf_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own accounts" ON sf_accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own accounts" ON sf_accounts
  FOR ALL USING (auth.uid() = user_id);

-- =======================
-- BIBLIOTECA DE MÍDIA
-- =======================

CREATE TABLE IF NOT EXISTS sf_media_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Arquivo
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type sf_media_type NOT NULL,
  file_size_bytes BIGINT,
  mime_type TEXT,
  
  -- URLs
  public_url TEXT,
  thumbnail_url TEXT,
  
  -- Metadados de mídia
  width INTEGER,
  height INTEGER,
  duration_seconds DECIMAL,
  aspect_ratio TEXT, -- '1:1', '9:16', '16:9', '4:5'
  
  -- Organização
  folder_path TEXT DEFAULT '/',
  tags TEXT[] DEFAULT '{}',
  color_label TEXT, -- red, orange, yellow, green, blue, purple, pink, gray
  is_favorite BOOLEAN DEFAULT false,
  
  -- AI metadata (preenchido por análise)
  detected_objects TEXT[],
  dominant_color TEXT,
  alt_text TEXT,
  ai_description TEXT,
  
  -- Auditoria
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ -- soft delete
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_sf_media_user ON sf_media_library(user_id);
CREATE INDEX IF NOT EXISTS idx_sf_media_folder ON sf_media_library(folder_path);
CREATE INDEX IF NOT EXISTS idx_sf_media_type ON sf_media_library(file_type);
CREATE INDEX IF NOT EXISTS idx_sf_media_tags ON sf_media_library USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_sf_media_favorite ON sf_media_library(is_favorite) WHERE is_favorite = true;

-- RLS
ALTER TABLE sf_media_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own media" ON sf_media_library
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own media" ON sf_media_library
  FOR ALL USING (auth.uid() = user_id);

-- =======================
-- POSTS (TODAS AS REDES)
-- =======================

CREATE TABLE IF NOT EXISTS sf_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES sf_accounts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  network social_network NOT NULL,
  
  -- Tipo de post (varia por rede)
  -- Instagram: feed, reel, story, carousel
  -- Facebook: post, reel, story, album, link
  -- Twitter: tweet, thread, poll
  -- LinkedIn: post, article, document, carousel
  -- YouTube: video, short
  -- TikTok: video
  -- Pinterest: pin, idea_pin
  post_type TEXT NOT NULL,
  
  -- Conteúdo
  caption TEXT,
  title TEXT, -- Para YouTube, LinkedIn articles
  description TEXT, -- Para YouTube
  
  -- Hashtags (separado para facilitar análise)
  hashtags TEXT[] DEFAULT '{}',
  first_comment TEXT, -- Hashtags no primeiro comentário
  
  -- Mídia
  media_ids UUID[] DEFAULT '{}',
  
  -- Configurações específicas por rede (JSON flexível)
  metadata JSONB DEFAULT '{}',
  /*
  Exemplos:
  Instagram: {
    "location_id": "123",
    "location_name": "São Paulo",
    "tagged_users": [{"username": "user1", "x": 0.5, "y": 0.5}],
    "cover_url": "...",
    "share_to_feed": true
  }
  
  Twitter: {
    "is_thread": true,
    "thread_tweets": ["texto1", "texto2"],
    "poll": {"options": ["A", "B"], "duration_hours": 24},
    "reply_settings": "everyone"
  }
  
  YouTube: {
    "tags": ["tag1", "tag2"],
    "category_id": "22",
    "thumbnail_url": "...",
    "privacy_status": "public",
    "made_for_kids": false,
    "cards": [],
    "end_screen": {}
  }
  
  LinkedIn: {
    "visibility": "PUBLIC",
    "document_title": "...",
    "article_content": "..."
  }
  */
  
  -- Cross-posting
  is_cross_post BOOLEAN DEFAULT false,
  cross_post_parent_id UUID REFERENCES sf_posts(id),
  cross_post_children_ids UUID[] DEFAULT '{}',
  
  -- Workflow de aprovação
  status sf_post_status DEFAULT 'draft',
  approval_required BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES auth.users(id),
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- Agendamento
  scheduled_for TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  
  -- IDs da plataforma (após publicação)
  platform_post_id TEXT,
  platform_permalink TEXT,
  
  -- Analytics snapshot (última atualização)
  impressions INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  engagement INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  video_views INTEGER DEFAULT 0,
  link_clicks INTEGER DEFAULT 0,
  engagement_rate DECIMAL(5,4) DEFAULT 0,
  
  -- Erros de publicação
  publish_error TEXT,
  publish_attempts INTEGER DEFAULT 0,
  last_publish_attempt_at TIMESTAMPTZ,
  
  -- Auditoria
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  -- Versionamento
  version INTEGER DEFAULT 1,
  previous_version_id UUID REFERENCES sf_posts(id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_sf_posts_account ON sf_posts(account_id);
CREATE INDEX IF NOT EXISTS idx_sf_posts_user ON sf_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_sf_posts_network ON sf_posts(network);
CREATE INDEX IF NOT EXISTS idx_sf_posts_status ON sf_posts(status);
CREATE INDEX IF NOT EXISTS idx_sf_posts_scheduled ON sf_posts(scheduled_for) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_sf_posts_published ON sf_posts(published_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_sf_posts_pending ON sf_posts(created_at) WHERE status = 'pending_approval';

-- RLS
ALTER TABLE sf_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own posts" ON sf_posts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own posts" ON sf_posts
  FOR ALL USING (auth.uid() = user_id);

-- =======================
-- IDEIAS DE CONTEÚDO
-- =======================

CREATE TABLE IF NOT EXISTS sf_content_ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  title TEXT NOT NULL,
  description TEXT,
  reference_url TEXT,
  reference_image_url TEXT,
  
  -- Organização
  tags TEXT[] DEFAULT '{}',
  media_ids UUID[] DEFAULT '{}',
  suggested_networks social_network[] DEFAULT '{}',
  priority TEXT DEFAULT 'medium', -- low, medium, high
  
  -- Status
  is_used BOOLEAN DEFAULT false,
  used_in_post_id UUID REFERENCES sf_posts(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE sf_content_ideas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own ideas" ON sf_content_ideas
  FOR ALL USING (auth.uid() = user_id);

-- =======================
-- TEMPLATES DE POST
-- =======================

CREATE TABLE IF NOT EXISTS sf_post_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  description TEXT,
  
  -- Template
  network social_network NOT NULL,
  post_type TEXT,
  caption_template TEXT, -- Com placeholders: {{produto}}, {{data}}, {{emoji}}
  hashtags_template TEXT[] DEFAULT '{}',
  media_ids UUID[] DEFAULT '{}',
  metadata_template JSONB DEFAULT '{}',
  
  -- Estatísticas
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  -- Organização
  category TEXT, -- promotional, educational, engagement, seasonal
  tags TEXT[] DEFAULT '{}',
  is_favorite BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE sf_post_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own templates" ON sf_post_templates
  FOR ALL USING (auth.uid() = user_id);

-- =======================
-- CALENDÁRIO EDITORIAL
-- =======================

CREATE TABLE IF NOT EXISTS sf_editorial_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  date DATE NOT NULL,
  theme TEXT,
  description TEXT,
  suggested_hashtags TEXT[] DEFAULT '{}',
  suggested_networks social_network[] DEFAULT '{}',
  
  -- Datas sazonais
  is_seasonal BOOLEAN DEFAULT false,
  seasonal_name TEXT, -- Natal, Dia das Mães, Black Friday, etc
  seasonal_emoji TEXT,
  
  -- Recorrência
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern TEXT, -- weekly, monthly, yearly
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice
CREATE INDEX IF NOT EXISTS idx_sf_calendar_date ON sf_editorial_calendar(date);

-- RLS
ALTER TABLE sf_editorial_calendar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own calendar" ON sf_editorial_calendar
  FOR ALL USING (auth.uid() = user_id);

-- =======================
-- ANALYTICS - HISTÓRICO DE POSTS
-- =======================

CREATE TABLE IF NOT EXISTS sf_post_analytics_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES sf_posts(id) ON DELETE CASCADE,
  
  -- Métricas padrão
  impressions INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  engagement INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  video_views INTEGER DEFAULT 0,
  video_completion_rate DECIMAL(5,4),
  link_clicks INTEGER DEFAULT 0,
  profile_visits INTEGER DEFAULT 0,
  
  -- Métricas específicas por rede (JSON flexível)
  network_metrics JSONB DEFAULT '{}',
  /*
  Instagram: {
    "sticker_taps": 10,
    "replies": 5,
    "exits": 20,
    "taps_forward": 15,
    "taps_back": 3
  }
  
  YouTube: {
    "watch_time_minutes": 450,
    "avg_view_duration_seconds": 180,
    "ctr": 0.05,
    "subscribers_gained": 12,
    "subscribers_lost": 2
  }
  
  Twitter: {
    "retweets": 50,
    "quote_tweets": 10,
    "replies": 25,
    "bookmark_count": 15
  }
  */
  
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice
CREATE INDEX IF NOT EXISTS idx_sf_post_analytics_post ON sf_post_analytics_history(post_id);
CREATE INDEX IF NOT EXISTS idx_sf_post_analytics_date ON sf_post_analytics_history(fetched_at);

-- =======================
-- ANALYTICS - CONTA DIÁRIO
-- =======================

CREATE TABLE IF NOT EXISTS sf_account_analytics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES sf_accounts(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  
  -- Métricas de crescimento
  followers_count INTEGER DEFAULT 0,
  followers_gained INTEGER DEFAULT 0,
  followers_lost INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  
  -- Métricas de atividade
  posts_published INTEGER DEFAULT 0,
  total_impressions INTEGER DEFAULT 0,
  total_reach INTEGER DEFAULT 0,
  total_engagement INTEGER DEFAULT 0,
  profile_views INTEGER DEFAULT 0,
  website_clicks INTEGER DEFAULT 0,
  
  -- Métricas específicas por rede
  network_metrics JSONB DEFAULT '{}',
  
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(account_id, date)
);

-- Índice
CREATE INDEX IF NOT EXISTS idx_sf_account_analytics_account ON sf_account_analytics_daily(account_id);
CREATE INDEX IF NOT EXISTS idx_sf_account_analytics_date ON sf_account_analytics_daily(date);

-- =======================
-- MELHORES HORÁRIOS
-- =======================

CREATE TABLE IF NOT EXISTS sf_best_times (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES sf_accounts(id) ON DELETE CASCADE,
  
  post_type TEXT, -- feed, reel, story, etc (null = todos)
  day_of_week INTEGER NOT NULL, -- 0-6 (domingo-sábado)
  hour_of_day INTEGER NOT NULL, -- 0-23
  
  -- Métricas calculadas
  avg_engagement_rate DECIMAL(5,4) DEFAULT 0,
  avg_reach INTEGER DEFAULT 0,
  avg_impressions INTEGER DEFAULT 0,
  total_posts_analyzed INTEGER DEFAULT 0,
  
  -- Confiança
  confidence_score DECIMAL(3,2) DEFAULT 0, -- 0-1
  
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(account_id, post_type, day_of_week, hour_of_day)
);

-- Índice
CREATE INDEX IF NOT EXISTS idx_sf_best_times_account ON sf_best_times(account_id);

-- =======================
-- RELATÓRIOS
-- =======================

CREATE TABLE IF NOT EXISTS sf_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  title TEXT NOT NULL,
  description TEXT,
  report_type TEXT NOT NULL, -- weekly, monthly, quarterly, custom
  
  -- Período
  date_from DATE NOT NULL,
  date_to DATE NOT NULL,
  
  -- Contas incluídas
  account_ids UUID[] DEFAULT '{}',
  networks social_network[] DEFAULT '{}',
  
  -- Arquivo gerado
  pdf_url TEXT,
  pdf_size_bytes BIGINT,
  
  -- Insights gerados por IA
  ai_summary TEXT,
  ai_insights TEXT[] DEFAULT '{}',
  ai_recommendations TEXT[] DEFAULT '{}',
  
  -- Compartilhamento (Portal do Cliente)
  is_public BOOLEAN DEFAULT false,
  public_token TEXT UNIQUE,
  public_password_hash TEXT,
  public_expires_at TIMESTAMPTZ,
  
  -- Customização visual
  branding JSONB DEFAULT '{}', -- logo_url, primary_color, company_name
  include_sections TEXT[] DEFAULT ARRAY['overview', 'growth', 'engagement', 'top_posts', 'recommendations'],
  
  -- Auditoria
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Downloads
  download_count INTEGER DEFAULT 0,
  last_downloaded_at TIMESTAMPTZ
);

-- RLS
ALTER TABLE sf_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own reports" ON sf_reports
  FOR ALL USING (auth.uid() = user_id);

-- Permitir acesso público via token
CREATE POLICY "Public can view shared reports" ON sf_reports
  FOR SELECT USING (is_public = true AND public_token IS NOT NULL);

-- =======================
-- AGENDAMENTO DE RELATÓRIOS
-- =======================

CREATE TABLE IF NOT EXISTS sf_report_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  report_type TEXT NOT NULL, -- weekly, monthly
  
  -- Contas incluídas
  account_ids UUID[] DEFAULT '{}',
  networks social_network[] DEFAULT '{}',
  
  -- Agendamento
  frequency TEXT NOT NULL, -- daily, weekly, monthly
  day_of_week INTEGER, -- 0-6 para weekly
  day_of_month INTEGER, -- 1-31 para monthly
  time_of_day TIME NOT NULL,
  timezone TEXT DEFAULT 'America/Sao_Paulo',
  
  -- Destinatários
  recipients TEXT[] DEFAULT '{}', -- emails
  
  -- Customização
  branding JSONB DEFAULT '{}',
  include_sections TEXT[] DEFAULT ARRAY['overview', 'growth', 'engagement', 'top_posts', 'recommendations'],
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  last_sent_at TIMESTAMPTZ,
  next_send_at TIMESTAMPTZ,
  last_error TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE sf_report_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own schedules" ON sf_report_schedules
  FOR ALL USING (auth.uid() = user_id);

-- =======================
-- COMENTÁRIOS EM POSTS (WORKFLOW)
-- =======================

CREATE TABLE IF NOT EXISTS sf_post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES sf_posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  comment TEXT NOT NULL,
  mentioned_users UUID[] DEFAULT '{}',
  
  -- Tipo de comentário
  comment_type TEXT DEFAULT 'general', -- general, revision_request, approval, rejection
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE sf_post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view post comments" ON sf_post_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sf_posts 
      WHERE sf_posts.id = post_id AND sf_posts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add comments" ON sf_post_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =======================
-- LOG DE APROVAÇÕES
-- =======================

CREATE TABLE IF NOT EXISTS sf_approval_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES sf_posts(id) ON DELETE CASCADE,
  
  action TEXT NOT NULL, -- submitted, approved, rejected, requested_changes, published
  performed_by UUID REFERENCES auth.users(id),
  reason TEXT,
  
  -- Snapshot do post no momento da ação
  post_snapshot JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice
CREATE INDEX IF NOT EXISTS idx_sf_approval_logs_post ON sf_approval_logs(post_id);

-- =======================
-- MEMBROS DO TIME
-- =======================

CREATE TABLE IF NOT EXISTS sf_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Dono do workspace (quem convidou)
  workspace_owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Usuário convidado
  member_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Role
  role sf_user_role DEFAULT 'viewer',
  
  -- Permissões granulares
  can_create_posts BOOLEAN DEFAULT false,
  can_edit_posts BOOLEAN DEFAULT false,
  can_delete_posts BOOLEAN DEFAULT false,
  can_approve_posts BOOLEAN DEFAULT false,
  can_publish_posts BOOLEAN DEFAULT false,
  can_manage_media BOOLEAN DEFAULT false,
  can_view_analytics BOOLEAN DEFAULT false,
  can_generate_reports BOOLEAN DEFAULT false,
  can_manage_accounts BOOLEAN DEFAULT false,
  can_manage_team BOOLEAN DEFAULT false,
  
  -- Restrições por conta (vazio = todas)
  allowed_account_ids UUID[] DEFAULT '{}',
  allowed_networks social_network[] DEFAULT '{}',
  
  -- Status
  invite_status TEXT DEFAULT 'pending', -- pending, accepted, declined
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  
  -- Atividade
  last_active_at TIMESTAMPTZ,
  
  UNIQUE(workspace_owner_id, member_user_id)
);

-- RLS
ALTER TABLE sf_team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage team" ON sf_team_members
  FOR ALL USING (auth.uid() = workspace_owner_id);

CREATE POLICY "Members can view their membership" ON sf_team_members
  FOR SELECT USING (auth.uid() = member_user_id);

-- =======================
-- HISTÓRICO DE LEGENDAS IA
-- =======================

CREATE TABLE IF NOT EXISTS sf_ai_caption_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Input
  prompt TEXT NOT NULL,
  network social_network,
  post_type TEXT,
  tone TEXT, -- formal, casual, funny, professional, inspirational
  language TEXT DEFAULT 'pt-BR',
  
  -- Output
  generated_captions TEXT[] DEFAULT '{}',
  selected_caption TEXT,
  selected_index INTEGER,
  
  -- Feedback
  was_useful BOOLEAN,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE sf_ai_caption_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own history" ON sf_ai_caption_history
  FOR ALL USING (auth.uid() = user_id);

-- =======================
-- PERFORMANCE DE HASHTAGS
-- =======================

CREATE TABLE IF NOT EXISTS sf_hashtag_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES sf_accounts(id) ON DELETE CASCADE,
  
  hashtag TEXT NOT NULL,
  
  -- Estatísticas
  times_used INTEGER DEFAULT 0,
  avg_engagement_rate DECIMAL(5,4) DEFAULT 0,
  avg_reach INTEGER DEFAULT 0,
  avg_impressions INTEGER DEFAULT 0,
  
  -- Classificação
  category TEXT, -- niche, trending, branded, general
  volume_estimate TEXT, -- low, medium, high
  
  last_used_at TIMESTAMPTZ,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(account_id, hashtag)
);

-- Índice
CREATE INDEX IF NOT EXISTS idx_sf_hashtag_account ON sf_hashtag_performance(account_id);
CREATE INDEX IF NOT EXISTS idx_sf_hashtag_name ON sf_hashtag_performance(hashtag);

-- =======================
-- MONITORAMENTO DE HASHTAGS
-- =======================

CREATE TABLE IF NOT EXISTS sf_monitored_hashtags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES sf_accounts(id) ON DELETE CASCADE,
  
  hashtag TEXT NOT NULL,
  network social_network NOT NULL,
  
  -- Configuração
  is_active BOOLEAN DEFAULT true,
  notify_on_new BOOLEAN DEFAULT false,
  
  -- Estatísticas
  posts_found INTEGER DEFAULT 0,
  last_checked_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE sf_monitored_hashtags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own monitored hashtags" ON sf_monitored_hashtags
  FOR ALL USING (auth.uid() = user_id);

-- =======================
-- MENÇÕES DETECTADAS
-- =======================

CREATE TABLE IF NOT EXISTS sf_detected_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES sf_accounts(id) ON DELETE CASCADE,
  
  -- Fonte
  network social_network NOT NULL,
  platform_post_id TEXT,
  
  -- Autor
  author_username TEXT,
  author_display_name TEXT,
  author_profile_url TEXT,
  author_profile_picture TEXT,
  
  -- Conteúdo
  content TEXT,
  media_url TEXT,
  post_url TEXT,
  
  -- Status
  is_read BOOLEAN DEFAULT false,
  is_replied BOOLEAN DEFAULT false,
  replied_at TIMESTAMPTZ,
  
  -- Sentimento (IA)
  sentiment TEXT, -- positive, negative, neutral
  
  detected_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice
CREATE INDEX IF NOT EXISTS idx_sf_mentions_account ON sf_detected_mentions(account_id);
CREATE INDEX IF NOT EXISTS idx_sf_mentions_unread ON sf_detected_mentions(is_read) WHERE is_read = false;

-- =======================
-- INTEGRAÇÕES EXTERNAS
-- =======================

CREATE TABLE IF NOT EXISTS sf_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  integration_type TEXT NOT NULL, -- google_drive, dropbox, canva, unsplash, zapier, make
  
  -- Credenciais (criptografadas)
  credentials JSONB DEFAULT '{}',
  
  -- Configurações
  settings JSONB DEFAULT '{}',
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  last_error TEXT,
  
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE sf_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own integrations" ON sf_integrations
  FOR ALL USING (auth.uid() = user_id);

-- =======================
-- INBOX - CONVERSAS
-- =======================

CREATE TABLE IF NOT EXISTS sf_inbox_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES sf_accounts(id) ON DELETE CASCADE,
  
  -- Participante
  network social_network NOT NULL,
  participant_id TEXT NOT NULL,
  participant_username TEXT,
  participant_name TEXT,
  participant_avatar_url TEXT,
  
  -- Última mensagem
  last_message_preview TEXT,
  last_message_at TIMESTAMPTZ,
  last_message_is_from_us BOOLEAN DEFAULT false,
  
  -- Status
  unread_count INTEGER DEFAULT 0,
  is_archived BOOLEAN DEFAULT false,
  is_spam BOOLEAN DEFAULT false,
  
  -- Labels
  labels TEXT[] DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(account_id, participant_id)
);

-- Índice
CREATE INDEX IF NOT EXISTS idx_sf_inbox_account ON sf_inbox_conversations(account_id);
CREATE INDEX IF NOT EXISTS idx_sf_inbox_unread ON sf_inbox_conversations(unread_count) WHERE unread_count > 0;

-- RLS
ALTER TABLE sf_inbox_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversations" ON sf_inbox_conversations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sf_accounts 
      WHERE sf_accounts.id = account_id AND sf_accounts.user_id = auth.uid()
    )
  );

-- =======================
-- INBOX - MENSAGENS
-- =======================

CREATE TABLE IF NOT EXISTS sf_inbox_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES sf_inbox_conversations(id) ON DELETE CASCADE,
  
  -- Remetente
  is_from_us BOOLEAN NOT NULL,
  sender_id TEXT,
  
  -- Conteúdo
  message_type TEXT DEFAULT 'text', -- text, image, video, sticker, share
  content TEXT,
  media_url TEXT,
  
  -- IDs da plataforma
  platform_message_id TEXT,
  
  -- Status
  is_read BOOLEAN DEFAULT false,
  
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice
CREATE INDEX IF NOT EXISTS idx_sf_messages_conversation ON sf_inbox_messages(conversation_id);

-- =======================
-- LINK NA BIO
-- =======================

CREATE TABLE IF NOT EXISTS sf_link_in_bio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES sf_accounts(id) ON DELETE CASCADE,
  
  -- Configuração
  slug TEXT UNIQUE NOT NULL, -- URL: /bio/slug
  title TEXT,
  bio TEXT,
  avatar_url TEXT,
  background_color TEXT DEFAULT '#000000',
  text_color TEXT DEFAULT '#FFFFFF',
  button_style TEXT DEFAULT 'rounded', -- rounded, square, pill
  
  -- Links
  links JSONB DEFAULT '[]',
  /*
  [
    { "id": "uuid", "title": "Meu Site", "url": "https://...", "icon": "globe", "clicks": 0 },
    { "id": "uuid", "title": "WhatsApp", "url": "https://wa.me/...", "icon": "whatsapp", "clicks": 0 }
  ]
  */
  
  -- Estatísticas
  total_views INTEGER DEFAULT 0,
  total_clicks INTEGER DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE sf_link_in_bio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own link in bio" ON sf_link_in_bio
  FOR ALL USING (auth.uid() = user_id);

-- Permitir visualização pública
CREATE POLICY "Public can view active links" ON sf_link_in_bio
  FOR SELECT USING (is_active = true);

-- =======================
-- FUNÇÕES AUXILIARES
-- =======================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION sf_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER sf_accounts_updated_at BEFORE UPDATE ON sf_accounts
  FOR EACH ROW EXECUTE FUNCTION sf_update_updated_at();

CREATE TRIGGER sf_posts_updated_at BEFORE UPDATE ON sf_posts
  FOR EACH ROW EXECUTE FUNCTION sf_update_updated_at();

CREATE TRIGGER sf_media_updated_at BEFORE UPDATE ON sf_media_library
  FOR EACH ROW EXECUTE FUNCTION sf_update_updated_at();

-- =======================
-- COMENTÁRIOS NAS TABELAS
-- =======================

COMMENT ON TABLE sf_accounts IS 'Contas de redes sociais conectadas ao Social Flow';
COMMENT ON TABLE sf_posts IS 'Posts criados/agendados para todas as redes sociais';
COMMENT ON TABLE sf_media_library IS 'Biblioteca centralizada de mídia (imagens, vídeos, documentos)';
COMMENT ON TABLE sf_content_ideas IS 'Banco de ideias de conteúdo para inspiração';
COMMENT ON TABLE sf_post_templates IS 'Templates reutilizáveis de posts';
COMMENT ON TABLE sf_editorial_calendar IS 'Calendário editorial com temas e datas sazonais';
COMMENT ON TABLE sf_reports IS 'Relatórios de performance gerados';
COMMENT ON TABLE sf_team_members IS 'Membros do time com permissões granulares';
COMMENT ON TABLE sf_inbox_conversations IS 'Conversas de DM/mensagens de todas as redes';
COMMENT ON TABLE sf_link_in_bio IS 'Páginas personalizadas de link na bio';

-- =======================
-- MIGRAÇÃO DE DADOS DO INSTAFLOW (SE EXISTIR)
-- =======================

-- Se as tabelas do InstaFlow existirem, migrar dados
DO $$
BEGIN
  -- Verificar se a tabela antiga existe
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'instaflow_accounts') THEN
    -- Migrar contas
    INSERT INTO sf_accounts (
      user_id, network, platform_account_id, username, display_name, 
      profile_picture_url, access_token, refresh_token, token_expires_at,
      auxiliary_ids, followers_count, following_count, posts_count,
      is_active, created_at, last_synced_at
    )
    SELECT 
      user_id, 'instagram'::social_network, instagram_account_id, username, name,
      profile_picture_url, access_token, NULL, token_expires_at,
      jsonb_build_object('facebook_page_id', facebook_page_id, 'facebook_page_name', facebook_page_name),
      followers_count, follows_count, media_count,
      is_active, created_at, last_synced_at
    FROM instaflow_accounts
    ON CONFLICT (network, platform_account_id) DO NOTHING;
    
    RAISE NOTICE 'Migração do InstaFlow concluída!';
  END IF;
END $$;

-- =======================
-- SEED: DATAS SAZONAIS BRASILEIRAS
-- =======================

-- Inserir datas sazonais comuns (se não existirem)
INSERT INTO sf_editorial_calendar (user_id, date, theme, seasonal_name, seasonal_emoji, is_seasonal, is_recurring, recurrence_pattern)
SELECT 
  auth.uid(),
  date,
  theme,
  seasonal_name,
  emoji,
  true,
  true,
  'yearly'
FROM (VALUES
  ('2026-01-01'::DATE, 'Ano Novo - Metas e Resoluções', 'Ano Novo', '🎆'),
  ('2026-02-14', 'Dia dos Namorados (EUA) / Dia da Amizade', 'Dia da Amizade', '💕'),
  ('2026-03-08', 'Dia Internacional da Mulher', 'Dia da Mulher', '👩'),
  ('2026-03-15', 'Dia do Consumidor', 'Dia do Consumidor', '🛒'),
  ('2026-04-07', 'Dia Mundial da Saúde', 'Dia da Saúde', '🏥'),
  ('2026-05-10', 'Dia das Mães', 'Dia das Mães', '💐'),
  ('2026-06-12', 'Dia dos Namorados (Brasil)', 'Dia dos Namorados', '❤️'),
  ('2026-08-09', 'Dia dos Pais', 'Dia dos Pais', '👔'),
  ('2026-09-07', 'Independência do Brasil', 'Independência', '🇧🇷'),
  ('2026-10-12', 'Dia das Crianças', 'Dia das Crianças', '🧒'),
  ('2026-10-18', 'Dia do Médico', 'Dia do Médico', '👨‍⚕️'),
  ('2026-10-31', 'Halloween', 'Halloween', '🎃'),
  ('2026-11-27', 'Black Friday', 'Black Friday', '🏷️'),
  ('2026-11-30', 'Cyber Monday', 'Cyber Monday', '💻'),
  ('2026-12-25', 'Natal', 'Natal', '🎄'),
  ('2026-12-31', 'Réveillon', 'Réveillon', '🥂')
) AS seasonal(date, theme, seasonal_name, emoji)
WHERE NOT EXISTS (
  SELECT 1 FROM sf_editorial_calendar WHERE is_seasonal = true
)
ON CONFLICT DO NOTHING;
