-- =====================================================
-- INSTAFLOW - Instagram Automation Suite
-- Migration: Tabelas principais
-- Data: 2026-02-03
-- =====================================================

-- 1. Contas Instagram conectadas via Facebook Business
CREATE TABLE IF NOT EXISTS instagram_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Dados do Instagram
  instagram_business_account_id TEXT NOT NULL UNIQUE,
  instagram_user_id TEXT, -- ID numérico do IG
  username TEXT NOT NULL,
  name TEXT,
  profile_picture_url TEXT,
  biography TEXT,
  website TEXT,
  followers_count INTEGER DEFAULT 0,
  follows_count INTEGER DEFAULT 0,
  media_count INTEGER DEFAULT 0,
  
  -- Dados do Facebook Page vinculada
  facebook_page_id TEXT NOT NULL,
  facebook_page_name TEXT,
  facebook_page_access_token TEXT, -- Page Access Token (longa duração)
  
  -- Token de acesso
  access_token TEXT NOT NULL,
  token_type TEXT DEFAULT 'user', -- 'user' ou 'page'
  token_expires_at TIMESTAMP WITH TIME ZONE,
  token_scopes TEXT[], -- Permissões concedidas
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  connection_status TEXT DEFAULT 'connected', -- connected, expired, error
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Biblioteca de mídia (imagens, vídeos, carrosséis)
CREATE TABLE IF NOT EXISTS instaflow_media_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES instagram_accounts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Arquivo
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL, -- Path no Supabase Storage
  file_url TEXT NOT NULL, -- URL pública
  file_type TEXT NOT NULL CHECK (file_type IN ('image', 'video', 'carousel')),
  file_size INTEGER, -- Em bytes
  mime_type TEXT,
  
  -- Metadados de mídia
  width INTEGER,
  height INTEGER,
  duration_seconds DECIMAL, -- Para vídeos
  thumbnail_url TEXT, -- Thumbnail para vídeos
  
  -- Organização
  folder TEXT DEFAULT 'general',
  tags TEXT[] DEFAULT '{}',
  alt_text TEXT,
  
  -- Status
  is_archived BOOLEAN DEFAULT false,
  
  -- Timestamps
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Posts agendados/publicados
CREATE TABLE IF NOT EXISTS instaflow_scheduled_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES instagram_accounts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Tipo de post
  post_type TEXT NOT NULL CHECK (post_type IN ('feed', 'story', 'reel', 'carousel')),
  
  -- Conteúdo
  caption TEXT,
  hashtags TEXT, -- Hashtags separadas (para primeiro comentário)
  first_comment TEXT, -- Comentário automático após publicação
  location_id TEXT, -- ID do local do Instagram
  location_name TEXT,
  
  -- Mídia
  media_ids UUID[] DEFAULT '{}', -- IDs da media_library
  media_urls TEXT[] DEFAULT '{}', -- URLs das mídias (cache)
  cover_url TEXT, -- Capa para Reels/Carrossel
  
  -- Configurações de Reel
  share_to_feed BOOLEAN DEFAULT true, -- Compartilhar Reel no feed
  audio_name TEXT, -- Nome do áudio usado
  
  -- Agendamento
  scheduled_for TIMESTAMP WITH TIME ZONE,
  timezone TEXT DEFAULT 'America/Sao_Paulo',
  
  -- Status do workflow
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft',      -- Rascunho
    'pending',    -- Aguardando aprovação
    'approved',   -- Aprovado, aguardando agendamento
    'scheduled',  -- Agendado para publicação
    'publishing', -- Em processo de publicação
    'published',  -- Publicado com sucesso
    'failed',     -- Falhou ao publicar
    'cancelled'   -- Cancelado
  )),
  
  -- Dados pós-publicação
  instagram_media_id TEXT, -- ID do post no Instagram
  instagram_permalink TEXT, -- Link permanente
  published_at TIMESTAMP WITH TIME ZONE,
  publish_error TEXT,
  publish_attempts INTEGER DEFAULT 0,
  
  -- IA
  ai_generated BOOLEAN DEFAULT false,
  ai_prompt TEXT, -- Prompt usado para gerar
  ai_variations JSONB, -- Variações geradas pela IA
  
  -- Métricas rápidas (cache)
  cached_likes INTEGER DEFAULT 0,
  cached_comments INTEGER DEFAULT 0,
  cached_reach INTEGER DEFAULT 0,
  metrics_updated_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Analytics detalhados por post
CREATE TABLE IF NOT EXISTS instaflow_post_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES instaflow_scheduled_posts(id) ON DELETE CASCADE,
  instagram_media_id TEXT NOT NULL,
  
  -- Métricas de engajamento
  impressions INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  
  -- Métricas de vídeo/Reel
  video_views INTEGER DEFAULT 0,
  plays INTEGER DEFAULT 0,
  total_interactions INTEGER DEFAULT 0,
  
  -- Métricas de Story
  exits INTEGER DEFAULT 0,
  replies INTEGER DEFAULT 0,
  taps_forward INTEGER DEFAULT 0,
  taps_back INTEGER DEFAULT 0,
  
  -- Calculados
  engagement_rate DECIMAL(5,2), -- (likes+comments+saves+shares)/reach * 100
  
  -- Período
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  period TEXT DEFAULT 'lifetime' -- 'lifetime', 'day', 'week', 'days_28'
);

-- 5. Analytics da conta (diário)
CREATE TABLE IF NOT EXISTS instaflow_account_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES instagram_accounts(id) ON DELETE CASCADE,
  
  -- Data do registro
  date DATE NOT NULL,
  
  -- Métricas de audiência
  followers_count INTEGER DEFAULT 0,
  follows_count INTEGER DEFAULT 0,
  followers_gained INTEGER DEFAULT 0,
  followers_lost INTEGER DEFAULT 0,
  net_followers INTEGER DEFAULT 0, -- gained - lost
  
  -- Métricas de alcance
  impressions INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  profile_views INTEGER DEFAULT 0,
  website_clicks INTEGER DEFAULT 0,
  email_contacts INTEGER DEFAULT 0,
  phone_call_clicks INTEGER DEFAULT 0,
  get_directions_clicks INTEGER DEFAULT 0,
  
  -- Métricas de conteúdo
  total_posts INTEGER DEFAULT 0,
  total_stories INTEGER DEFAULT 0,
  total_reels INTEGER DEFAULT 0,
  
  -- Métricas de engajamento
  total_likes INTEGER DEFAULT 0,
  total_comments INTEGER DEFAULT 0,
  total_saves INTEGER DEFAULT 0,
  total_shares INTEGER DEFAULT 0,
  average_engagement_rate DECIMAL(5,2),
  
  -- Dados demográficos (JSONB para flexibilidade)
  audience_city JSONB, -- {"São Paulo": 1500, "Rio": 800}
  audience_country JSONB,
  audience_gender_age JSONB, -- {"M.25-34": 500, "F.25-34": 600}
  online_followers JSONB, -- Horários mais ativos
  
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique por conta/data
  UNIQUE(account_id, date)
);

-- 6. Templates de posts
CREATE TABLE IF NOT EXISTS instaflow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES instagram_accounts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Template
  name TEXT NOT NULL,
  description TEXT,
  post_type TEXT NOT NULL CHECK (post_type IN ('feed', 'story', 'reel', 'carousel')),
  
  -- Conteúdo padrão
  caption_template TEXT, -- Com placeholders: {{produto}}, {{data}}
  hashtags_template TEXT,
  
  -- Agendamento recorrente
  day_of_week INTEGER, -- 0=Domingo, 1=Segunda...
  preferred_time TIME,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Histórico de hashtags usadas
CREATE TABLE IF NOT EXISTS instaflow_hashtags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES instagram_accounts(id) ON DELETE CASCADE,
  
  hashtag TEXT NOT NULL,
  category TEXT, -- 'nicho', 'local', 'trending', 'branded'
  times_used INTEGER DEFAULT 1,
  avg_reach DECIMAL,
  avg_engagement DECIMAL,
  
  -- Dados do Instagram
  instagram_hashtag_id TEXT,
  posts_count BIGINT, -- Quantos posts usam essa hashtag
  
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(account_id, hashtag)
);

-- 8. Log de atividades
CREATE TABLE IF NOT EXISTS instaflow_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES instagram_accounts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  
  action TEXT NOT NULL, -- 'post_created', 'post_published', 'media_uploaded', etc.
  entity_type TEXT, -- 'post', 'media', 'account'
  entity_id UUID,
  
  details JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ÍNDICES
-- =====================================================

-- instagram_accounts
CREATE INDEX IF NOT EXISTS idx_instagram_accounts_user ON instagram_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_instagram_accounts_username ON instagram_accounts(username);
CREATE INDEX IF NOT EXISTS idx_instagram_accounts_status ON instagram_accounts(connection_status);

-- media_library
CREATE INDEX IF NOT EXISTS idx_media_library_account ON instaflow_media_library(account_id);
CREATE INDEX IF NOT EXISTS idx_media_library_user ON instaflow_media_library(user_id);
CREATE INDEX IF NOT EXISTS idx_media_library_type ON instaflow_media_library(file_type);
CREATE INDEX IF NOT EXISTS idx_media_library_folder ON instaflow_media_library(folder);
CREATE INDEX IF NOT EXISTS idx_media_library_tags ON instaflow_media_library USING GIN(tags);

-- scheduled_posts
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_account ON instaflow_scheduled_posts(account_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_status ON instaflow_scheduled_posts(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_scheduled ON instaflow_scheduled_posts(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_type ON instaflow_scheduled_posts(post_type);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_instagram ON instaflow_scheduled_posts(instagram_media_id);

-- post_analytics
CREATE INDEX IF NOT EXISTS idx_post_analytics_post ON instaflow_post_analytics(post_id);
CREATE INDEX IF NOT EXISTS idx_post_analytics_fetched ON instaflow_post_analytics(fetched_at);

-- account_analytics
CREATE INDEX IF NOT EXISTS idx_account_analytics_account ON instaflow_account_analytics(account_id);
CREATE INDEX IF NOT EXISTS idx_account_analytics_date ON instaflow_account_analytics(date);

-- activity_log
CREATE INDEX IF NOT EXISTS idx_activity_log_account ON instaflow_activity_log(account_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_action ON instaflow_activity_log(action);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON instaflow_activity_log(created_at DESC);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers de updated_at
DROP TRIGGER IF EXISTS update_instagram_accounts_updated_at ON instagram_accounts;
CREATE TRIGGER update_instagram_accounts_updated_at
  BEFORE UPDATE ON instagram_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_media_library_updated_at ON instaflow_media_library;
CREATE TRIGGER update_media_library_updated_at
  BEFORE UPDATE ON instaflow_media_library
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_scheduled_posts_updated_at ON instaflow_scheduled_posts;
CREATE TRIGGER update_scheduled_posts_updated_at
  BEFORE UPDATE ON instaflow_scheduled_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_templates_updated_at ON instaflow_templates;
CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON instaflow_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- RLS (Row Level Security)
-- =====================================================

-- Habilitar RLS
ALTER TABLE instagram_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE instaflow_media_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE instaflow_scheduled_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE instaflow_post_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE instaflow_account_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE instaflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE instaflow_hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE instaflow_activity_log ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes (se houver)
DROP POLICY IF EXISTS "Users can view own instagram accounts" ON instagram_accounts;
DROP POLICY IF EXISTS "Users can insert own instagram accounts" ON instagram_accounts;
DROP POLICY IF EXISTS "Users can update own instagram accounts" ON instagram_accounts;
DROP POLICY IF EXISTS "Users can delete own instagram accounts" ON instagram_accounts;

DROP POLICY IF EXISTS "Users can view own media" ON instaflow_media_library;
DROP POLICY IF EXISTS "Users can insert own media" ON instaflow_media_library;
DROP POLICY IF EXISTS "Users can update own media" ON instaflow_media_library;
DROP POLICY IF EXISTS "Users can delete own media" ON instaflow_media_library;

DROP POLICY IF EXISTS "Users can view own posts" ON instaflow_scheduled_posts;
DROP POLICY IF EXISTS "Users can insert own posts" ON instaflow_scheduled_posts;
DROP POLICY IF EXISTS "Users can update own posts" ON instaflow_scheduled_posts;
DROP POLICY IF EXISTS "Users can delete own posts" ON instaflow_scheduled_posts;

DROP POLICY IF EXISTS "Users can view own post analytics" ON instaflow_post_analytics;
DROP POLICY IF EXISTS "Users can view own account analytics" ON instaflow_account_analytics;
DROP POLICY IF EXISTS "Users can manage own templates" ON instaflow_templates;
DROP POLICY IF EXISTS "Users can view account hashtags" ON instaflow_hashtags;
DROP POLICY IF EXISTS "Users can view own activity" ON instaflow_activity_log;

-- Políticas de instagram_accounts
CREATE POLICY "Users can view own instagram accounts"
  ON instagram_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own instagram accounts"
  ON instagram_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own instagram accounts"
  ON instagram_accounts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own instagram accounts"
  ON instagram_accounts FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas de media_library
CREATE POLICY "Users can view own media"
  ON instaflow_media_library FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own media"
  ON instaflow_media_library FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own media"
  ON instaflow_media_library FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own media"
  ON instaflow_media_library FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas de scheduled_posts
CREATE POLICY "Users can view own posts"
  ON instaflow_scheduled_posts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own posts"
  ON instaflow_scheduled_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts"
  ON instaflow_scheduled_posts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts"
  ON instaflow_scheduled_posts FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas de post_analytics (via join com posts)
CREATE POLICY "Users can view own post analytics"
  ON instaflow_post_analytics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM instaflow_scheduled_posts
      WHERE instaflow_scheduled_posts.id = instaflow_post_analytics.post_id
      AND instaflow_scheduled_posts.user_id = auth.uid()
    )
  );

-- Políticas de account_analytics (via join com accounts)
CREATE POLICY "Users can view own account analytics"
  ON instaflow_account_analytics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM instagram_accounts
      WHERE instagram_accounts.id = instaflow_account_analytics.account_id
      AND instagram_accounts.user_id = auth.uid()
    )
  );

-- Políticas de templates
CREATE POLICY "Users can manage own templates"
  ON instaflow_templates FOR ALL
  USING (auth.uid() = user_id);

-- Políticas de hashtags
CREATE POLICY "Users can view account hashtags"
  ON instaflow_hashtags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM instagram_accounts
      WHERE instagram_accounts.id = instaflow_hashtags.account_id
      AND instagram_accounts.user_id = auth.uid()
    )
  );

-- Políticas de activity_log
CREATE POLICY "Users can view own activity"
  ON instaflow_activity_log FOR SELECT
  USING (auth.uid() = user_id);

-- =====================================================
-- STORAGE BUCKET
-- =====================================================

-- Criar bucket para mídia do InstaFlow (executar no Dashboard do Supabase)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('instaflow-media', 'instaflow-media', true);

-- =====================================================
-- COMENTÁRIOS
-- =====================================================

COMMENT ON TABLE instagram_accounts IS 'Contas Instagram Business conectadas via Facebook OAuth';
COMMENT ON TABLE instaflow_media_library IS 'Biblioteca de mídia (imagens, vídeos) para posts';
COMMENT ON TABLE instaflow_scheduled_posts IS 'Posts agendados, rascunhos e publicados';
COMMENT ON TABLE instaflow_post_analytics IS 'Métricas detalhadas por post';
COMMENT ON TABLE instaflow_account_analytics IS 'Métricas diárias da conta Instagram';
COMMENT ON TABLE instaflow_templates IS 'Templates reutilizáveis de posts';
COMMENT ON TABLE instaflow_hashtags IS 'Histórico e performance de hashtags usadas';
COMMENT ON TABLE instaflow_activity_log IS 'Log de todas atividades do InstaFlow';
