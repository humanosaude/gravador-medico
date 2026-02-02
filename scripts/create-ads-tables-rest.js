#!/usr/bin/env node
/**
 * Script para criar tabelas via Supabase REST API
 * Cria as tabelas usando INSERT simples para testar conexão
 * e depois usa a API de management
 */

const SUPABASE_URL = "https://egsmraszqnmosmtjuzhx.supabase.co";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnc21yYXN6cW5tb3NtdGp1emh4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODQ4NzcxMCwiZXhwIjoyMDg0MDYzNzEwfQ.wuM5GbYqaDTyf4T3fR62U1sWqZ06RJ3nXHk56I2VcAQ";

const SQL = `
-- Tabela 1: optimization_logs
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

-- Tabela 2: ads_campaigns_log
CREATE TABLE IF NOT EXISTS ads_campaigns_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id TEXT NOT NULL UNIQUE,
  campaign_name TEXT NOT NULL,
  adset_id TEXT NOT NULL,
  ad_ids TEXT[] NOT NULL,
  objective TEXT NOT NULL,
  budget_daily DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela 3: ads_creatives_generated
CREATE TABLE IF NOT EXISTS ads_creatives_generated (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_log_id UUID REFERENCES ads_campaigns_log(id),
  creative_url TEXT NOT NULL,
  creative_type TEXT NOT NULL CHECK (creative_type IN ('IMAGE', 'VIDEO')),
  primary_text TEXT NOT NULL,
  headline TEXT NOT NULL,
  ad_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela 4: ads_optimization_rules
CREATE TABLE IF NOT EXISTS ads_optimization_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  condition_type TEXT NOT NULL CHECK (condition_type IN ('SPEND_NO_PURCHASE', 'ROAS_THRESHOLD')),
  threshold_value DECIMAL(10,2) NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('PAUSE', 'SCALE')),
  scale_percentage DECIMAL(5,2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_optimization_logs_ad_id ON optimization_logs(ad_id);
CREATE INDEX IF NOT EXISTS idx_optimization_logs_created_at ON optimization_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_ads_campaigns_log_status ON ads_campaigns_log(status);
CREATE INDEX IF NOT EXISTS idx_ads_creatives_campaign ON ads_creatives_generated(campaign_log_id);

-- Inserir regras padrão se não existirem
INSERT INTO ads_optimization_rules (name, condition_type, threshold_value, action_type, scale_percentage)
VALUES 
  ('Pausar sem compras', 'SPEND_NO_PURCHASE', 50.00, 'PAUSE', NULL),
  ('Escalar ROAS alto', 'ROAS_THRESHOLD', 3.00, 'SCALE', 20.00)
ON CONFLICT (name) DO NOTHING;
`;

async function createTables() {
  console.log('🚀 Criando tabelas para Escala Automática via Supabase...\n');
  
  try {
    // Usar pg module com URL encoding para a senha
    const { Pool } = require('pg');
    
    // Senha com caractere especial codificada
    const password = encodeURIComponent('Helcio@13');
    const connectionString = `postgresql://postgres.egsmraszqnmosmtjuzhx:${password}@db.egsmraszqnmosmtjuzhx.supabase.co:5432/postgres`;
    
    console.log('📡 Conectando ao PostgreSQL...');
    
    const pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false }
    });
    
    console.log('📝 Executando SQL...\n');
    
    // Executar SQL como uma única transação
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(SQL);
      await client.query('COMMIT');
      console.log('✅ Todas as tabelas criadas com sucesso!');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
    
    // Verificar tabelas criadas
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('optimization_logs', 'ads_campaigns_log', 'ads_creatives_generated', 'ads_optimization_rules')
    `);
    
    console.log('\n📋 Tabelas verificadas:');
    result.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`);
    });
    
    await pool.end();
    console.log('\n✨ Setup completo!');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    
    console.log('\n💡 Alternativa: Execute o SQL manualmente no Supabase Dashboard:');
    console.log('   1. Acesse: https://supabase.com/dashboard/project/egsmraszqnmosmtjuzhx/sql/new');
    console.log('   2. Cole o conteúdo do arquivo: sql/ads-optimization-tables.sql');
    console.log('   3. Clique em "Run"\n');
  }
}

createTables();
