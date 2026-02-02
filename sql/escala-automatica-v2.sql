-- =====================================================
-- TABELAS PARA ESCALA AUTOMÁTICA DE ADS V2
-- Execute este SQL no Supabase Dashboard:
-- https://supabase.com/dashboard/project/egsmraszqnmosmtjuzhx/sql/new
-- =====================================================

-- 1. Tabela principal de campanhas
CREATE TABLE IF NOT EXISTS ads_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meta_campaign_id TEXT UNIQUE,
  meta_adset_id TEXT,
  name TEXT NOT NULL,
  strategy TEXT NOT NULL CHECK (strategy IN ('TOPO', 'MEIO', 'FUNDO')),
  objective TEXT NOT NULL,
  budget_daily DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'ACTIVE', 'PAUSED', 'ERROR')),
  custom_audiences TEXT[],
  excluded_audiences TEXT[],
  targeting JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de criativos (imagens e vídeos)
CREATE TABLE IF NOT EXISTS ads_creatives (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES ads_campaigns(id) ON DELETE CASCADE,
  meta_ad_id TEXT,
  meta_creative_id TEXT,
  meta_video_id TEXT,
  creative_type TEXT NOT NULL CHECK (creative_type IN ('IMAGE', 'VIDEO')),
  file_url TEXT NOT NULL,
  file_name TEXT,
  primary_text TEXT,
  headline TEXT,
  description TEXT,
  call_to_action TEXT DEFAULT 'LEARN_MORE',
  video_status TEXT CHECK (video_status IN ('PENDING', 'PROCESSING', 'READY', 'ERROR')),
  status TEXT DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabela de logs de otimização
CREATE TABLE IF NOT EXISTS ads_optimization_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ad_id TEXT NOT NULL,
  ad_name TEXT,
  adset_id TEXT,
  campaign_id TEXT,
  action TEXT NOT NULL CHECK (action IN ('PAUSE', 'SCALE', 'UNPAUSE', 'NO_ACTION')),
  reason TEXT NOT NULL,
  metrics_before JSONB,
  metrics_after JSONB,
  spend DECIMAL(10,2),
  impressions INTEGER,
  clicks INTEGER,
  purchases INTEGER,
  roas DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabela de regras de otimização (customizáveis)
CREATE TABLE IF NOT EXISTS ads_optimization_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  condition_type TEXT NOT NULL CHECK (condition_type IN ('SPEND_NO_PURCHASE', 'ROAS_THRESHOLD', 'CPA_THRESHOLD', 'CTR_LOW')),
  threshold_value DECIMAL(10,2) NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('PAUSE', 'SCALE', 'ALERT')),
  scale_percentage DECIMAL(5,2),
  lookback_hours INTEGER DEFAULT 24,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabela de públicos salvos
CREATE TABLE IF NOT EXISTS ads_audiences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meta_audience_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  audience_type TEXT NOT NULL CHECK (audience_type IN ('CUSTOM', 'LOOKALIKE', 'SAVED')),
  source_type TEXT CHECK (source_type IN ('VIDEO_VIEW', 'PAGE_ENGAGEMENT', 'WEBSITE', 'CUSTOMER_LIST', 'INSTAGRAM')),
  funnel_stage TEXT CHECK (funnel_stage IN ('TOPO', 'MEIO', 'FUNDO')),
  approximate_size INTEGER,
  retention_days INTEGER,
  lookalike_ratio DECIMAL(3,2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tabela de configurações de integração (Meta Assets)
CREATE TABLE IF NOT EXISTS integration_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  setting_key TEXT NOT NULL DEFAULT 'meta_default',
  meta_ad_account_id TEXT,
  meta_ad_account_name TEXT,
  meta_page_id TEXT,
  meta_page_name TEXT,
  meta_pixel_id TEXT,
  meta_pixel_name TEXT,
  meta_instagram_id TEXT,
  meta_instagram_name TEXT,
  meta_business_id TEXT,
  is_default BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, setting_key)
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_ads_campaigns_status ON ads_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_ads_campaigns_strategy ON ads_campaigns(strategy);
CREATE INDEX IF NOT EXISTS idx_ads_campaigns_meta_id ON ads_campaigns(meta_campaign_id);
CREATE INDEX IF NOT EXISTS idx_ads_creatives_campaign ON ads_creatives(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ads_creatives_type ON ads_creatives(creative_type);
CREATE INDEX IF NOT EXISTS idx_ads_opt_logs_created ON ads_optimization_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_ads_opt_logs_action ON ads_optimization_logs(action);
CREATE INDEX IF NOT EXISTS idx_ads_audiences_stage ON ads_audiences(funnel_stage);
CREATE INDEX IF NOT EXISTS idx_ads_audiences_type ON ads_audiences(audience_type);
CREATE INDEX IF NOT EXISTS idx_integration_settings_user ON integration_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_integration_settings_default ON integration_settings(is_default) WHERE is_default = TRUE;

-- =====================================================
-- TRIGGERS PARA updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_ads_campaigns_updated_at ON ads_campaigns;
CREATE TRIGGER update_ads_campaigns_updated_at
  BEFORE UPDATE ON ads_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ads_audiences_updated_at ON ads_audiences;
CREATE TRIGGER update_ads_audiences_updated_at
  BEFORE UPDATE ON ads_audiences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- REGRAS PADRÃO DE OTIMIZAÇÃO
-- =====================================================

INSERT INTO ads_optimization_rules (name, description, condition_type, threshold_value, action_type, scale_percentage, lookback_hours)
VALUES 
  ('Pausar sem compras R$50', 'Pausa anúncios que gastaram R$50+ sem nenhuma compra', 'SPEND_NO_PURCHASE', 50.00, 'PAUSE', NULL, 24),
  ('Escalar ROAS > 3', 'Aumenta budget em 20% para anúncios com ROAS acima de 3', 'ROAS_THRESHOLD', 3.00, 'SCALE', 20.00, 24),
  ('Pausar CPA > R$100', 'Pausa anúncios com CPA acima de R$100', 'CPA_THRESHOLD', 100.00, 'PAUSE', NULL, 48),
  ('Alerta CTR baixo', 'Alerta quando CTR está abaixo de 1%', 'CTR_LOW', 1.00, 'ALERT', NULL, 24)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- RLS (Row Level Security)
-- =====================================================

ALTER TABLE ads_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE ads_creatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE ads_optimization_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ads_optimization_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE ads_audiences ENABLE ROW LEVEL SECURITY;

-- Políticas permissivas para service_role e authenticated
DO $$
BEGIN
  -- ads_campaigns
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access ads_campaigns') THEN
    CREATE POLICY "Service role full access ads_campaigns" ON ads_campaigns FOR ALL TO service_role USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated read ads_campaigns') THEN
    CREATE POLICY "Authenticated read ads_campaigns" ON ads_campaigns FOR SELECT TO authenticated USING (true);
  END IF;

  -- ads_creatives
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access ads_creatives') THEN
    CREATE POLICY "Service role full access ads_creatives" ON ads_creatives FOR ALL TO service_role USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated read ads_creatives') THEN
    CREATE POLICY "Authenticated read ads_creatives" ON ads_creatives FOR SELECT TO authenticated USING (true);
  END IF;

  -- ads_optimization_logs
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access ads_optimization_logs') THEN
    CREATE POLICY "Service role full access ads_optimization_logs" ON ads_optimization_logs FOR ALL TO service_role USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated read ads_optimization_logs') THEN
    CREATE POLICY "Authenticated read ads_optimization_logs" ON ads_optimization_logs FOR SELECT TO authenticated USING (true);
  END IF;

  -- ads_optimization_rules
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access ads_optimization_rules') THEN
    CREATE POLICY "Service role full access ads_optimization_rules" ON ads_optimization_rules FOR ALL TO service_role USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated read ads_optimization_rules') THEN
    CREATE POLICY "Authenticated read ads_optimization_rules" ON ads_optimization_rules FOR SELECT TO authenticated USING (true);
  END IF;

  -- ads_audiences
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access ads_audiences') THEN
    CREATE POLICY "Service role full access ads_audiences" ON ads_audiences FOR ALL TO service_role USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated read ads_audiences') THEN
    CREATE POLICY "Authenticated read ads_audiences" ON ads_audiences FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================

SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as columns_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN ('ads_campaigns', 'ads_creatives', 'ads_optimization_logs', 'ads_optimization_rules', 'ads_audiences')
ORDER BY table_name;
