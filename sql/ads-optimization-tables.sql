-- =====================================================
-- TABELAS PARA O SISTEMA DE ESCALA AUTOMÁTICA DE ADS
-- =====================================================
-- Execute este SQL no Supabase Dashboard:
-- https://supabase.com/dashboard/project/SEU_PROJETO/sql/new
-- =====================================================

-- =====================================================
-- 1. TABELA: optimization_logs
-- Armazena logs de todas as decisões de otimização
-- =====================================================

CREATE TABLE IF NOT EXISTS optimization_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ad_id TEXT NOT NULL,
    ad_name TEXT NOT NULL,
    adset_id TEXT NOT NULL,
    campaign_id TEXT NOT NULL,
    action_type TEXT NOT NULL CHECK (action_type IN ('PAUSE', 'SCALE', 'NO_ACTION')),
    reason TEXT NOT NULL,
    metrics_before JSONB NOT NULL,
    metrics_after JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_optimization_logs_ad_id ON optimization_logs(ad_id);
CREATE INDEX IF NOT EXISTS idx_optimization_logs_campaign_id ON optimization_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_optimization_logs_action_type ON optimization_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_optimization_logs_created_at ON optimization_logs(created_at DESC);

-- Comentários para documentação
COMMENT ON TABLE optimization_logs IS 'Logs de otimização automática de anúncios do Facebook Ads';
COMMENT ON COLUMN optimization_logs.action_type IS 'PAUSE = pausou anúncio, SCALE = aumentou budget, NO_ACTION = sem ação';
COMMENT ON COLUMN optimization_logs.metrics_before IS 'Métricas antes da ação: spend, purchases, roas, daily_budget';
COMMENT ON COLUMN optimization_logs.metrics_after IS 'Métricas após a ação: status, daily_budget';

-- =====================================================
-- 2. TABELA: ads_campaigns_log
-- Histórico de campanhas criadas pelo sistema
-- =====================================================

CREATE TABLE IF NOT EXISTS ads_campaigns_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    adset_id TEXT NOT NULL,
    ad_ids TEXT[] NOT NULL DEFAULT '{}',
    objective TEXT NOT NULL,
    daily_budget DECIMAL(10,2) NOT NULL,
    target_audience TEXT NOT NULL,
    images_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL CHECK (status IN ('success', 'error')),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_ads_campaigns_log_campaign_id ON ads_campaigns_log(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ads_campaigns_log_status ON ads_campaigns_log(status);
CREATE INDEX IF NOT EXISTS idx_ads_campaigns_log_created_at ON ads_campaigns_log(created_at DESC);

-- Comentários
COMMENT ON TABLE ads_campaigns_log IS 'Histórico de campanhas criadas automaticamente pelo sistema';

-- =====================================================
-- 3. TABELA: ads_creatives_generated
-- Criativos e copys gerados pela IA
-- =====================================================

CREATE TABLE IF NOT EXISTS ads_creatives_generated (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_log_id UUID REFERENCES ads_campaigns_log(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    primary_texts TEXT[] NOT NULL DEFAULT '{}',
    headlines TEXT[] NOT NULL DEFAULT '{}',
    ad_creative_id TEXT,
    ad_id TEXT,
    performance_score DECIMAL(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_ads_creatives_campaign ON ads_creatives_generated(campaign_log_id);
CREATE INDEX IF NOT EXISTS idx_ads_creatives_ad_id ON ads_creatives_generated(ad_id);

-- Comentários
COMMENT ON TABLE ads_creatives_generated IS 'Criativos e copys gerados pela IA para campanhas';

-- =====================================================
-- 4. TABELA: ads_optimization_rules
-- Regras customizáveis de otimização por conta
-- =====================================================

CREATE TABLE IF NOT EXISTS ads_optimization_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    pause_spend_threshold DECIMAL(10,2) NOT NULL DEFAULT 50.00,
    scale_roas_threshold DECIMAL(5,2) NOT NULL DEFAULT 3.00,
    scale_budget_increase DECIMAL(5,2) NOT NULL DEFAULT 0.20,
    max_daily_budget DECIMAL(10,2) NOT NULL DEFAULT 500.00,
    date_preset TEXT NOT NULL DEFAULT 'last_7d',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir regra padrão
INSERT INTO ads_optimization_rules (name, pause_spend_threshold, scale_roas_threshold, scale_budget_increase, max_daily_budget, date_preset)
VALUES ('Regra Padrão', 50.00, 3.00, 0.20, 500.00, 'last_7d')
ON CONFLICT DO NOTHING;

-- Comentários
COMMENT ON TABLE ads_optimization_rules IS 'Regras de otimização configuráveis pelo usuário';

-- =====================================================
-- 5. POLÍTICAS DE SEGURANÇA (RLS)
-- =====================================================

-- Habilitar RLS nas tabelas
ALTER TABLE optimization_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ads_campaigns_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE ads_creatives_generated ENABLE ROW LEVEL SECURITY;
ALTER TABLE ads_optimization_rules ENABLE ROW LEVEL SECURITY;

-- Políticas para service_role (usado pelo backend)
CREATE POLICY "Service role can do everything on optimization_logs" 
ON optimization_logs FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Service role can do everything on ads_campaigns_log" 
ON ads_campaigns_log FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Service role can do everything on ads_creatives_generated" 
ON ads_creatives_generated FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Service role can do everything on ads_optimization_rules" 
ON ads_optimization_rules FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Políticas de leitura para authenticated users (dashboard)
CREATE POLICY "Authenticated users can read optimization_logs" 
ON optimization_logs FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can read ads_campaigns_log" 
ON ads_campaigns_log FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can read ads_creatives_generated" 
ON ads_creatives_generated FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can read ads_optimization_rules" 
ON ads_optimization_rules FOR SELECT 
TO authenticated 
USING (true);

-- =====================================================
-- 6. BUCKET DE STORAGE PARA CRIATIVOS
-- =====================================================

-- Criar bucket para imagens de criativos (execute no Supabase Dashboard > Storage)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('creatives', 'creatives', true);

-- =====================================================
-- DONE! Execute este SQL no Supabase Dashboard
-- =====================================================
