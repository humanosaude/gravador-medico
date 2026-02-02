/**
 * Rota para setup e verificação de banco de dados
 * Verifica todas as tabelas necessárias e retorna SQL para criar as faltantes
 * 
 * Acesso:
 * - GET /api/system/setup-db → Verifica tabelas e retorna status
 * - POST /api/system/setup-db → Cria tabelas via SQL (requer x-setup-key header)
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Lista de todas as tabelas necessárias
const REQUIRED_TABLES = [
  'ads_campaigns',
  'ads_creatives', 
  'ads_optimization_logs',
  'ads_optimization_rules',
  'ads_audiences',
  'integration_settings'
];

// SQL COMPLETO - Atualizado com integration_settings
const SETUP_SQL = `
-- =====================================================
-- TABELAS PARA ESCALA AUTOMÁTICA DE ADS V2
-- Gerado automaticamente via /api/system/setup-db
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

DROP TRIGGER IF EXISTS update_integration_settings_updated_at ON integration_settings;
CREATE TRIGGER update_integration_settings_updated_at
  BEFORE UPDATE ON integration_settings
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
ALTER TABLE integration_settings ENABLE ROW LEVEL SECURITY;

-- Políticas (usando DO para evitar erros se já existirem)
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

  -- integration_settings
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access integration_settings') THEN
    CREATE POLICY "Service role full access integration_settings" ON integration_settings FOR ALL TO service_role USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own settings') THEN
    CREATE POLICY "Users can manage own settings" ON integration_settings FOR ALL TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;
`;

// SQL APENAS para integration_settings (caso as outras tabelas já existam)
const INTEGRATION_SETTINGS_SQL = `
-- =====================================================
-- TABELA INTEGRATION_SETTINGS (META ASSETS CONFIG)
-- =====================================================

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

-- Índices
CREATE INDEX IF NOT EXISTS idx_integration_settings_user ON integration_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_integration_settings_default ON integration_settings(is_default) WHERE is_default = TRUE;

-- RLS
ALTER TABLE integration_settings ENABLE ROW LEVEL SECURITY;

-- Políticas
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access integration_settings') THEN
    CREATE POLICY "Service role full access integration_settings" ON integration_settings FOR ALL TO service_role USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own settings') THEN
    CREATE POLICY "Users can manage own settings" ON integration_settings FOR ALL TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

-- Trigger para updated_at (requer que a função update_updated_at_column já exista)
DROP TRIGGER IF EXISTS update_integration_settings_updated_at ON integration_settings;
CREATE TRIGGER update_integration_settings_updated_at
  BEFORE UPDATE ON integration_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
`;

// Verifica quais tabelas existem
async function checkTables() {
  const results: { 
    table: string; 
    exists: boolean; 
    error?: string;
    rowCount?: number;
  }[] = [];

  for (const table of REQUIRED_TABLES) {
    try {
      const { data, error, count } = await supabaseAdmin
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error && error.code === '42P01') {
        // Tabela não existe
        results.push({ table, exists: false, error: 'Tabela não existe' });
      } else if (error) {
        results.push({ table, exists: false, error: error.message });
      } else {
        results.push({ table, exists: true, rowCount: count || 0 });
      }
    } catch (err) {
      results.push({ 
        table, 
        exists: false, 
        error: err instanceof Error ? err.message : 'Erro desconhecido' 
      });
    }
  }

  return results;
}

// GET - Verifica status das tabelas
export async function GET() {
  try {
    const tableStatus = await checkTables();
    
    const existingTables = tableStatus.filter(t => t.exists);
    const missingTables = tableStatus.filter(t => !t.exists);
    
    const allExist = missingTables.length === 0;
    
    return NextResponse.json({
      success: allExist,
      message: allExist 
        ? '✅ Todas as 6 tabelas existem!' 
        : `⚠️ ${missingTables.length} tabela(s) faltando`,
      summary: {
        total: REQUIRED_TABLES.length,
        existing: existingTables.length,
        missing: missingTables.length
      },
      tables: tableStatus,
      ...(missingTables.length > 0 && {
        missingTables: missingTables.map(t => t.table),
        sql: missingTables.length === 1 && missingTables[0].table === 'integration_settings'
          ? INTEGRATION_SETTINGS_SQL
          : SETUP_SQL,
        instructions: [
          '1. Acesse: https://supabase.com/dashboard/project/egsmraszqnmosmtjuzhx/sql/new',
          '2. Cole o SQL retornado no campo "sql"',
          '3. Clique em "Run"',
          '4. Acesse esta URL novamente para verificar'
        ]
      })
    });
    
  } catch (error) {
    console.error('Erro ao verificar tabelas:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

// POST - Retorna SQL para criar tabelas (segurança via header)
export async function POST(request: NextRequest) {
  try {
    // Verificar header de autorização
    const authHeader = request.headers.get('x-setup-key');
    if (authHeader !== 'gravador-medico-setup-2024') {
      return NextResponse.json({ 
        error: 'Unauthorized',
        hint: 'Adicione header: x-setup-key: gravador-medico-setup-2024'
      }, { status: 401 });
    }

    const tableStatus = await checkTables();
    const missingTables = tableStatus.filter(t => !t.exists);
    
    if (missingTables.length === 0) {
      return NextResponse.json({
        success: true,
        message: '✅ Todas as tabelas já existem! Nada a fazer.',
        tables: tableStatus
      });
    }

    // Determinar qual SQL retornar
    const onlyIntegrationMissing = 
      missingTables.length === 1 && 
      missingTables[0].table === 'integration_settings';

    return NextResponse.json({
      success: false,
      message: `⚠️ ${missingTables.length} tabela(s) precisam ser criadas`,
      missingTables: missingTables.map(t => t.table),
      existingTables: tableStatus.filter(t => t.exists).map(t => t.table),
      sql: onlyIntegrationMissing ? INTEGRATION_SETTINGS_SQL : SETUP_SQL,
      sqlType: onlyIntegrationMissing ? 'integration_settings_only' : 'full_setup',
      instructions: [
        '📋 COPIE O SQL ABAIXO E EXECUTE NO SUPABASE:',
        '',
        '1. Acesse: https://supabase.com/dashboard/project/egsmraszqnmosmtjuzhx/sql/new',
        '2. Cole o conteúdo do campo "sql"',
        '3. Clique em "Run"',
        '4. Volte aqui e chame GET /api/system/setup-db para verificar'
      ]
    });

  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}
