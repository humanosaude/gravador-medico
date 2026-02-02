-- =====================================================
-- MÓDULO DE INTELIGÊNCIA - TABELAS
-- =====================================================
-- Sistema de Alertas, Recomendações e Action Center
-- Arquitetura de Polling Ativo (Cron a cada 30min)
-- =====================================================

-- =====================================================
-- 1. REGRAS DE ALERTA (Configuradas pelo usuário)
-- =====================================================

CREATE TABLE IF NOT EXISTS ads_alert_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Métrica monitorada
  metric TEXT NOT NULL CHECK (metric IN ('cpa', 'roas', 'spend', 'ctr', 'cpc', 'frequency')),
  
  -- Condição de disparo
  condition TEXT NOT NULL CHECK (condition IN ('gt', 'lt', 'gte', 'lte', 'eq')),
  value NUMERIC NOT NULL,
  
  -- Período de análise
  time_window TEXT DEFAULT 'today' CHECK (time_window IN ('today', 'last_3d', 'last_7d', 'last_30d')),
  
  -- Ação sugerida quando regra disparar
  action_suggested TEXT NOT NULL CHECK (action_suggested IN ('pause', 'scale_up', 'scale_down', 'notify', 'review')),
  
  -- Configurações
  is_active BOOLEAN DEFAULT true,
  priority TEXT DEFAULT 'MEDIUM' CHECK (priority IN ('HIGH', 'MEDIUM', 'LOW')),
  
  -- Metadados
  name TEXT, -- Nome amigável da regra
  description TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para buscar regras ativas
CREATE INDEX IF NOT EXISTS idx_alert_rules_active 
  ON ads_alert_rules(user_id, is_active) 
  WHERE is_active = true;

-- =====================================================
-- 2. SNAPSHOTS DE INSIGHTS (Histórico para tendências)
-- =====================================================

CREATE TABLE IF NOT EXISTS ads_insights_snapshot (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Referências
  campaign_id UUID REFERENCES ads_campaigns(id) ON DELETE CASCADE,
  meta_campaign_id TEXT NOT NULL,
  adset_id TEXT,
  ad_id TEXT,
  
  -- Período do snapshot
  date_start DATE NOT NULL,
  date_stop DATE NOT NULL,
  snapshot_hour INTEGER, -- Hora do dia (0-23) para granularidade
  
  -- Métricas de Performance
  impressions BIGINT DEFAULT 0,
  reach BIGINT DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  spend NUMERIC(12,2) DEFAULT 0,
  
  -- Métricas Calculadas
  cpm NUMERIC(10,4),
  cpc NUMERIC(10,4),
  ctr NUMERIC(10,4),
  
  -- Conversões
  purchases INTEGER DEFAULT 0,
  purchase_value NUMERIC(12,2) DEFAULT 0,
  leads INTEGER DEFAULT 0,
  add_to_cart INTEGER DEFAULT 0,
  
  -- Métricas de ROI
  cpa NUMERIC(10,2),
  roas NUMERIC(10,4),
  cost_per_lead NUMERIC(10,2),
  
  -- Qualidade
  frequency NUMERIC(8,4),
  quality_ranking TEXT,
  engagement_rate_ranking TEXT,
  conversion_rate_ranking TEXT,
  
  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para buscar histórico de campanha
CREATE INDEX IF NOT EXISTS idx_insights_campaign_date 
  ON ads_insights_snapshot(meta_campaign_id, date_start DESC);

-- Índice para análise por hora
CREATE INDEX IF NOT EXISTS idx_insights_hourly 
  ON ads_insights_snapshot(meta_campaign_id, date_start, snapshot_hour);

-- Prevenir duplicatas
CREATE UNIQUE INDEX IF NOT EXISTS idx_insights_unique 
  ON ads_insights_snapshot(meta_campaign_id, date_start, date_stop, COALESCE(snapshot_hour, -1));

-- =====================================================
-- 3. RECOMENDAÇÕES (Feed do Action Center)
-- =====================================================

CREATE TABLE IF NOT EXISTS ads_recommendations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Referências
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES ads_campaigns(id) ON DELETE SET NULL,
  meta_campaign_id TEXT,
  adset_id TEXT,
  ad_id TEXT,
  
  -- Classificação
  type TEXT NOT NULL CHECK (type IN ('ALERT', 'OPPORTUNITY', 'WARNING', 'INFO')),
  priority TEXT NOT NULL CHECK (priority IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
  category TEXT CHECK (category IN ('budget', 'performance', 'creative', 'audience', 'technical')),
  
  -- Conteúdo
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  details JSONB, -- Dados extras (métricas, comparações, etc)
  
  -- Ação sugerida
  action_type TEXT CHECK (action_type IN ('pause', 'unpause', 'scale_up', 'scale_down', 'duplicate', 'archive', 'review', 'none')),
  action_params JSONB, -- Parâmetros para executar a ação (ex: { "scale_percent": 20 })
  
  -- Status
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPLIED', 'DISMISSED', 'EXPIRED', 'AUTO_RESOLVED')),
  
  -- Regra que gerou (se aplicável)
  triggered_by_rule UUID REFERENCES ads_alert_rules(id) ON DELETE SET NULL,
  
  -- Métricas no momento da recomendação
  metrics_snapshot JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- Quando a recomendação perde relevância
  applied_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  applied_by UUID REFERENCES auth.users(id),
  
  -- Resultado da ação (se aplicada)
  action_result JSONB
);

-- Índice para buscar recomendações pendentes
CREATE INDEX IF NOT EXISTS idx_recommendations_pending 
  ON ads_recommendations(user_id, status, priority) 
  WHERE status = 'PENDING';

-- Índice para histórico por campanha
CREATE INDEX IF NOT EXISTS idx_recommendations_campaign 
  ON ads_recommendations(campaign_id, created_at DESC);

-- =====================================================
-- 4. CONFIGURAÇÕES GLOBAIS DO USUÁRIO
-- =====================================================

CREATE TABLE IF NOT EXISTS ads_user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  
  -- Limites de Performance
  max_cpa NUMERIC(10,2),
  min_roas NUMERIC(10,4),
  max_frequency NUMERIC(8,4) DEFAULT 3.0,
  min_ctr NUMERIC(10,4),
  
  -- Limites de Gasto
  daily_budget_limit NUMERIC(12,2),
  monthly_budget_limit NUMERIC(12,2),
  max_spend_without_purchase NUMERIC(10,2) DEFAULT 50.00,
  
  -- Preferências de Notificação
  notify_critical BOOLEAN DEFAULT true,
  notify_high BOOLEAN DEFAULT true,
  notify_medium BOOLEAN DEFAULT false,
  notify_low BOOLEAN DEFAULT false,
  
  -- Automação
  auto_pause_bleeders BOOLEAN DEFAULT false, -- Pausar automaticamente campanhas sangrando
  auto_scale_winners BOOLEAN DEFAULT false,  -- Escalar automaticamente vencedores
  scale_increment_percent INTEGER DEFAULT 20,
  
  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 5. LOG DE AUDITORIAS
-- =====================================================

CREATE TABLE IF NOT EXISTS ads_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Referência
  audit_run_id UUID NOT NULL, -- Agrupa todos os logs de uma execução
  
  -- Estatísticas da execução
  campaigns_analyzed INTEGER DEFAULT 0,
  alerts_generated INTEGER DEFAULT 0,
  opportunities_found INTEGER DEFAULT 0,
  errors_count INTEGER DEFAULT 0,
  
  -- Duração
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  
  -- Status
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  error_message TEXT,
  
  -- Detalhes
  details JSONB
);

-- =====================================================
-- 6. FUNÇÕES AUXILIARES
-- =====================================================

-- Função para calcular tendência (variação percentual)
CREATE OR REPLACE FUNCTION calculate_trend(
  current_value NUMERIC,
  previous_value NUMERIC
) RETURNS NUMERIC AS $$
BEGIN
  IF previous_value IS NULL OR previous_value = 0 THEN
    RETURN NULL;
  END IF;
  RETURN ROUND(((current_value - previous_value) / previous_value) * 100, 2);
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_alert_rules_updated
  BEFORE UPDATE ON ads_alert_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_user_settings_updated
  BEFORE UPDATE ON ads_user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- 7. REGRAS PADRÃO (Inseridas automaticamente)
-- =====================================================

-- Inserir regras padrão para novos usuários (será feito via API)

-- =====================================================
-- 8. VERIFICAÇÃO
-- =====================================================

SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as columns_count
FROM (
  VALUES 
    ('ads_alert_rules'),
    ('ads_insights_snapshot'),
    ('ads_recommendations'),
    ('ads_user_settings'),
    ('ads_audit_log')
) AS t(table_name)
WHERE EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' AND tables.table_name = t.table_name
);
