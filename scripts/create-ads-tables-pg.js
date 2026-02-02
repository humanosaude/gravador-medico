#!/usr/bin/env node
/**
 * Script para criar tabelas via conexão direta com PostgreSQL
 * Usa pg para executar SQL diretamente
 */

const { Pool } = require('pg');

// Connection string do Supabase (modo direto)
const connectionString = 'postgresql://postgres.egsmraszqnmosmtjuzhx:Helcio@13@db.egsmraszqnmosmtjuzhx.supabase.co:5432/postgres';

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

const SQL_COMMANDS = [
  // 1. Tabela optimization_logs
  `CREATE TABLE IF NOT EXISTS optimization_logs (
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
  )`,
  
  // Índices optimization_logs
  `CREATE INDEX IF NOT EXISTS idx_optimization_logs_ad_id ON optimization_logs(ad_id)`,
  `CREATE INDEX IF NOT EXISTS idx_optimization_logs_campaign_id ON optimization_logs(campaign_id)`,
  `CREATE INDEX IF NOT EXISTS idx_optimization_logs_action_type ON optimization_logs(action_type)`,
  `CREATE INDEX IF NOT EXISTS idx_optimization_logs_created_at ON optimization_logs(created_at DESC)`,
  
  // 2. Tabela ads_campaigns_log
  `CREATE TABLE IF NOT EXISTS ads_campaigns_log (
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
  )`,
  
  // Índices ads_campaigns_log
  `CREATE INDEX IF NOT EXISTS idx_ads_campaigns_log_campaign_id ON ads_campaigns_log(campaign_id)`,
  `CREATE INDEX IF NOT EXISTS idx_ads_campaigns_log_status ON ads_campaigns_log(status)`,
  `CREATE INDEX IF NOT EXISTS idx_ads_campaigns_log_created_at ON ads_campaigns_log(created_at DESC)`,
  
  // 3. Tabela ads_creatives_generated
  `CREATE TABLE IF NOT EXISTS ads_creatives_generated (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_log_id UUID REFERENCES ads_campaigns_log(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    primary_texts TEXT[] NOT NULL DEFAULT '{}',
    headlines TEXT[] NOT NULL DEFAULT '{}',
    ad_creative_id TEXT,
    ad_id TEXT,
    performance_score DECIMAL(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  
  // Índices ads_creatives_generated
  `CREATE INDEX IF NOT EXISTS idx_ads_creatives_campaign ON ads_creatives_generated(campaign_log_id)`,
  `CREATE INDEX IF NOT EXISTS idx_ads_creatives_ad_id ON ads_creatives_generated(ad_id)`,
  
  // 4. Tabela ads_optimization_rules
  `CREATE TABLE IF NOT EXISTS ads_optimization_rules (
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
  )`,
  
  // Inserir regra padrão
  `INSERT INTO ads_optimization_rules (name, pause_spend_threshold, scale_roas_threshold, scale_budget_increase, max_daily_budget, date_preset)
   SELECT 'Regra Padrão', 50.00, 3.00, 0.20, 500.00, 'last_7d'
   WHERE NOT EXISTS (SELECT 1 FROM ads_optimization_rules WHERE name = 'Regra Padrão')`,
  
  // 5. RLS - Habilitar
  `ALTER TABLE optimization_logs ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE ads_campaigns_log ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE ads_creatives_generated ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE ads_optimization_rules ENABLE ROW LEVEL SECURITY`,
  
  // Políticas RLS para service_role
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access on optimization_logs') THEN
      CREATE POLICY "Service role full access on optimization_logs" ON optimization_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
  END $$`,
  
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access on ads_campaigns_log') THEN
      CREATE POLICY "Service role full access on ads_campaigns_log" ON ads_campaigns_log FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
  END $$`,
  
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access on ads_creatives_generated') THEN
      CREATE POLICY "Service role full access on ads_creatives_generated" ON ads_creatives_generated FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
  END $$`,
  
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access on ads_optimization_rules') THEN
      CREATE POLICY "Service role full access on ads_optimization_rules" ON ads_optimization_rules FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
  END $$`,
];

async function main() {
  console.log('🚀 Criando tabelas para Escala Automática de Ads...\n');
  console.log('━'.repeat(50));
  
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < SQL_COMMANDS.length; i++) {
    const sql = SQL_COMMANDS[i];
    const shortSql = sql.substring(0, 60).replace(/\n/g, ' ').trim() + '...';
    
    try {
      await pool.query(sql);
      console.log(`✅ [${i + 1}/${SQL_COMMANDS.length}] ${shortSql}`);
      successCount++;
    } catch (error) {
      // Ignorar erros de "já existe"
      if (error.message.includes('already exists') || error.message.includes('duplicate')) {
        console.log(`⏭️  [${i + 1}/${SQL_COMMANDS.length}] Já existe: ${shortSql}`);
        successCount++;
      } else {
        console.log(`❌ [${i + 1}/${SQL_COMMANDS.length}] Erro: ${error.message.substring(0, 100)}`);
        errorCount++;
      }
    }
  }
  
  await pool.end();
  
  console.log('\n' + '━'.repeat(50));
  console.log(`\n✨ Concluído: ${successCount} comandos OK, ${errorCount} erros`);
  
  if (errorCount === 0) {
    console.log('\n🎉 Todas as tabelas foram criadas com sucesso!');
  }
}

main().catch(err => {
  console.error('❌ Erro fatal:', err.message);
  process.exit(1);
});
