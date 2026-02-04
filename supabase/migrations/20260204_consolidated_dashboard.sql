-- ===========================================================
-- DASHBOARD CONSOLIDADO - MULTI-PLATAFORMA
-- Meta Ads + Google Ads + Google Analytics
-- Data: 2026-02-04
-- ===========================================================

-- =======================
-- CONTAS CONECTADAS
-- =======================

CREATE TABLE IF NOT EXISTS connected_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Plataforma
  platform TEXT NOT NULL CHECK (platform IN ('meta', 'google_ads', 'google_analytics')),
  
  -- Identificação
  account_id TEXT NOT NULL,
  account_name TEXT,
  
  -- Tokens OAuth
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  connection_status TEXT DEFAULT 'connected' CHECK (connection_status IN ('connected', 'expired', 'error', 'disconnected')),
  last_error TEXT,
  last_synced_at TIMESTAMPTZ,
  
  -- Metadados específicos da plataforma
  metadata JSONB DEFAULT '{}',
  /*
    Meta: { ad_account_id, business_id, timezone }
    Google Ads: { customer_id, manager_id, currency }
    Google Analytics: { property_id, stream_id, view_id }
  */
  
  -- Configurações
  settings JSONB DEFAULT '{}',
  /*
    { auto_sync: true, sync_interval_minutes: 60, alerts_enabled: true }
  */
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint para evitar duplicatas
  UNIQUE(user_id, platform, account_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_connected_accounts_user ON connected_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_connected_accounts_platform ON connected_accounts(platform);
CREATE INDEX IF NOT EXISTS idx_connected_accounts_active ON connected_accounts(is_active) WHERE is_active = true;

-- RLS
ALTER TABLE connected_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own connected accounts" ON connected_accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own connected accounts" ON connected_accounts
  FOR ALL USING (auth.uid() = user_id);

-- =======================
-- CACHE DE MÉTRICAS
-- =======================

CREATE TABLE IF NOT EXISTS metrics_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Período
  date_range_start DATE NOT NULL,
  date_range_end DATE NOT NULL,
  
  -- Fonte
  platform TEXT CHECK (platform IN ('meta', 'google_ads', 'google_analytics', 'consolidated')),
  account_id UUID REFERENCES connected_accounts(id) ON DELETE CASCADE,
  
  -- Métricas armazenadas
  metrics JSONB NOT NULL,
  /*
    {
      spend: 1500.00,
      impressions: 50000,
      reach: 35000,
      clicks: 2500,
      link_clicks: 2100,
      ctr: 4.2,
      cpc: 0.71,
      cpm: 30.00,
      landing_page_views: 1800,
      checkouts_initiated: 250,
      purchases: 75,
      purchase_value: 7125.00,
      roas: 4.75,
      cpa: 20.00,
      connect_rate: 85.7,
      checkout_rate: 13.9,
      conversion_rate: 4.17
    }
  */
  
  -- Métricas de comparação (período anterior)
  previous_metrics JSONB DEFAULT '{}',
  
  -- Dados de funil
  funnel_data JSONB DEFAULT '{}',
  /*
    {
      impressions: 50000,
      clicks: 2500,
      landing_page_views: 1800,
      checkouts: 250,
      purchases: 75,
      rates: {
        impressions_to_clicks: 5.0,
        clicks_to_pv: 72.0,
        pv_to_checkout: 13.9,
        checkout_to_purchase: 30.0
      }
    }
  */
  
  -- Dados demográficos
  demographics JSONB DEFAULT '{}',
  /*
    {
      gender: { male: 45, female: 52, unknown: 3 },
      age: { "18-24": 15, "25-34": 35, "35-44": 28, "45-54": 15, "55+": 7 },
      location: { "São Paulo": 40, "Rio de Janeiro": 20, ... }
    }
  */
  
  -- Dados de campanhas
  campaigns JSONB DEFAULT '[]',
  
  -- Timestamp
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '5 minutes'
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_metrics_cache_lookup 
  ON metrics_cache(user_id, date_range_start, date_range_end, platform);
  
CREATE INDEX IF NOT EXISTS idx_metrics_cache_expiry 
  ON metrics_cache(expires_at);

-- Limpar cache expirado automaticamente (função)
CREATE OR REPLACE FUNCTION cleanup_expired_metrics_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM metrics_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- =======================
-- ALERTAS
-- =======================

CREATE TABLE IF NOT EXISTS dashboard_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES connected_accounts(id) ON DELETE CASCADE,
  
  -- Tipo de alerta
  alert_type TEXT NOT NULL CHECK (alert_type IN (
    'low_roas',
    'budget_warning',
    'no_conversions',
    'high_cpc',
    'low_ctr',
    'account_error',
    'token_expiring'
  )),
  
  -- Detalhes
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
  
  -- Dados relacionados
  related_data JSONB DEFAULT '{}',
  /*
    { campaign_id: "123", campaign_name: "...", current_value: 0.8, threshold: 1.0 }
  */
  
  -- Status
  is_read BOOLEAN DEFAULT false,
  is_dismissed BOOLEAN DEFAULT false,
  
  -- Ações disponíveis
  actions JSONB DEFAULT '[]',
  /*
    [
      { action: "pause_campaign", label: "Pausar Campanha", data: { campaign_id: "123" } },
      { action: "increase_budget", label: "Aumentar Orçamento", data: { current: 100, suggested: 150 } }
    ]
  */
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_alerts_user ON dashboard_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_unread ON dashboard_alerts(is_read) WHERE is_read = false;

-- RLS
ALTER TABLE dashboard_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own alerts" ON dashboard_alerts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own alerts" ON dashboard_alerts
  FOR ALL USING (auth.uid() = user_id);

-- =======================
-- HISTÓRICO DE MÉTRICAS DIÁRIAS
-- =======================

CREATE TABLE IF NOT EXISTS daily_metrics_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES connected_accounts(id) ON DELETE CASCADE,
  
  date DATE NOT NULL,
  platform TEXT NOT NULL,
  
  -- Métricas do dia
  spend DECIMAL(12, 2) DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  link_clicks INTEGER DEFAULT 0,
  landing_page_views INTEGER DEFAULT 0,
  checkouts INTEGER DEFAULT 0,
  purchases INTEGER DEFAULT 0,
  revenue DECIMAL(12, 2) DEFAULT 0,
  
  -- Métricas calculadas
  ctr DECIMAL(8, 4) DEFAULT 0,
  cpc DECIMAL(8, 4) DEFAULT 0,
  cpm DECIMAL(8, 4) DEFAULT 0,
  roas DECIMAL(8, 4) DEFAULT 0,
  cpa DECIMAL(8, 4) DEFAULT 0,
  
  -- Timestamp
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(account_id, date)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_daily_metrics_lookup 
  ON daily_metrics_history(user_id, account_id, date);
  
CREATE INDEX IF NOT EXISTS idx_daily_metrics_date 
  ON daily_metrics_history(date DESC);

-- =======================
-- TRIGGERS
-- =======================

-- Atualizar updated_at em connected_accounts
CREATE OR REPLACE FUNCTION update_connected_accounts_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER connected_accounts_updated_at
  BEFORE UPDATE ON connected_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_connected_accounts_timestamp();

-- =======================
-- COMENTÁRIOS
-- =======================

COMMENT ON TABLE connected_accounts IS 'Contas de anúncios e analytics conectadas (Meta, Google Ads, GA4)';
COMMENT ON TABLE metrics_cache IS 'Cache de métricas agregadas para performance do dashboard';
COMMENT ON TABLE dashboard_alerts IS 'Alertas automáticos de performance (ROAS baixo, budget alto, etc)';
COMMENT ON TABLE daily_metrics_history IS 'Histórico diário de métricas para gráficos temporais';
