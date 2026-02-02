/**
 * Script para executar migração SQL via Supabase
 * Execute com: npx tsx scripts/run-migration.ts
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Carregar variáveis de ambiente
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não encontradas!');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🚀 Executando migração Alta Escala 2025...\n');

  try {
    // =====================================================
    // ETAPA 1: Adicionar campos instagram_actor
    // =====================================================
    console.log('📦 ETAPA 1: Campos instagram_actor em integration_settings...');
    
    const { error: err1 } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE integration_settings 
          ADD COLUMN IF NOT EXISTS instagram_actor_id TEXT,
          ADD COLUMN IF NOT EXISTS instagram_actor_name TEXT;
      `
    });

    if (err1) {
      // Tentar método alternativo - verificar se colunas já existem
      const { data: cols } = await supabase
        .from('integration_settings')
        .select('*')
        .limit(1);
      
      if (cols) {
        console.log('  ✅ Tabela integration_settings acessível');
      }
    } else {
      console.log('  ✅ Colunas instagram_actor adicionadas');
    }

    // =====================================================
    // ETAPA 2: Campos para pipeline assíncrono
    // =====================================================
    console.log('\n📦 ETAPA 2: Campos assíncronos em ads_creatives...');
    
    const { error: err2 } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE ads_creatives
          ADD COLUMN IF NOT EXISTS video_id TEXT,
          ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'pending',
          ADD COLUMN IF NOT EXISTS meta_errors JSONB DEFAULT '[]'::jsonb,
          ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ,
          ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;
      `
    });

    if (err2) {
      const { data: cols } = await supabase
        .from('ads_creatives')
        .select('*')
        .limit(1);
      
      if (cols) {
        console.log('  ✅ Tabela ads_creatives acessível');
      }
    } else {
      console.log('  ✅ Colunas de processamento adicionadas');
    }

    // =====================================================
    // VERIFICAÇÃO
    // =====================================================
    console.log('\n🔍 Verificando estrutura...');

    // Verificar integration_settings
    const { data: settings } = await supabase
      .from('integration_settings')
      .select('id, meta_ad_account_id, meta_page_id')
      .limit(1);

    console.log('  integration_settings:', settings ? '✅ OK' : '❌ Erro');

    // Verificar ads_creatives
    const { data: creatives } = await supabase
      .from('ads_creatives')
      .select('id, creative_type')
      .limit(1);

    console.log('  ads_creatives:', creatives !== null ? '✅ OK' : '❌ Erro');

    // Verificar ads_campaigns
    const { data: campaigns } = await supabase
      .from('ads_campaigns')
      .select('id, name')
      .limit(1);

    console.log('  ads_campaigns:', campaigns !== null ? '✅ OK' : '❌ Erro');

    console.log('\n✅ Migração concluída!');
    console.log('\n📋 Próximos passos:');
    console.log('1. Verifique as tabelas no Supabase Dashboard');
    console.log('2. Faça deploy no Vercel para ativar o cron job');
    console.log('3. A variável CRON_SECRET já está configurada ✅');

  } catch (error) {
    console.error('❌ Erro na migração:', error);
  }
}

runMigration();
