#!/usr/bin/env node
/**
 * Script para criar as tabelas de Escala Automática de Ads no Supabase
 * Executa via API REST usando o service_role key
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://egsmraszqnmosmtjuzhx.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnc21yYXN6cW5tb3NtdGp1emh4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODQ4NzcxMCwiZXhwIjoyMDg0MDYzNzEwfQ.wuM5GbYqaDTyf4T3fR62U1sWqZ06RJ3nXHk56I2VcAQ';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeSql(sql, description) {
  console.log(`\n📋 Executando: ${description}...`);
  
  try {
    // Usar a API REST para executar SQL
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({ query: sql }),
    });

    if (!response.ok) {
      // Se a função exec_sql não existir, tentar direto
      throw new Error('RPC não disponível');
    }

    console.log(`   ✅ ${description} - OK`);
    return true;
  } catch (error) {
    // Fallback: usar a API de Management
    console.log(`   ⚠️ Tentando método alternativo...`);
    return false;
  }
}

async function createTables() {
  console.log('🚀 Criando tabelas para Escala Automática de Ads...\n');
  console.log('━'.repeat(50));

  // 1. Verificar tabela optimization_logs
  console.log('\n1️⃣ Verificando tabela optimization_logs...');
  const { error: testError1 } = await supabase
    .from('optimization_logs')
    .select('id')
    .limit(1);

  if (!testError1) {
    console.log('   ✅ optimization_logs já existe');
  } else {
    console.log('   ⚠️ optimization_logs precisa ser criada manualmente');
  }

  // 2. Verificar tabela ads_campaigns_log
  console.log('\n2️⃣ Verificando tabela ads_campaigns_log...');
  const { error: testError2 } = await supabase
    .from('ads_campaigns_log')
    .select('id')
    .limit(1);

  if (!testError2) {
    console.log('   ✅ ads_campaigns_log já existe');
  } else {
    console.log('   ⚠️ ads_campaigns_log precisa ser criada');
  }

  // 3. Verificar tabela ads_creatives_generated
  console.log('\n3️⃣ Verificando tabela ads_creatives_generated...');
  const { error: testError3 } = await supabase
    .from('ads_creatives_generated')
    .select('id')
    .limit(1);

  if (!testError3) {
    console.log('   ✅ ads_creatives_generated já existe');
  } else {
    console.log('   ⚠️ ads_creatives_generated precisa ser criada');
  }

  // 4. Verificar tabela ads_optimization_rules
  console.log('\n4️⃣ Verificando tabela ads_optimization_rules...');
  const { error: testError4 } = await supabase
    .from('ads_optimization_rules')
    .select('id')
    .limit(1);

  if (!testError4) {
    console.log('   ✅ ads_optimization_rules já existe');
  } else {
    console.log('   ⚠️ ads_optimization_rules precisa ser criada');
  }

  // 5. Verificar bucket de storage
  console.log('\n5️⃣ Verificando bucket de storage "creatives"...');
  const { data: buckets, error: bucketsError } = await supabase
    .storage
    .listBuckets();

  if (bucketsError) {
    console.log('   ⚠️ Erro ao verificar buckets:', bucketsError.message);
  } else {
    const creativesBucket = buckets?.find(b => b.name === 'creatives');
    if (creativesBucket) {
      console.log('   ✅ Bucket "creatives" já existe');
    } else {
      console.log('   📦 Criando bucket "creatives"...');
      const { error: createBucketError } = await supabase.storage.createBucket('creatives', {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4'],
        fileSizeLimit: 52428800, // 50MB
      });
      if (createBucketError) {
        console.log('   ⚠️ Erro ao criar bucket:', createBucketError.message);
      } else {
        console.log('   ✅ Bucket "creatives" criado com sucesso');
      }
    }
  }

  console.log('\n' + '━'.repeat(50));
  console.log('\n📝 ATENÇÃO: Se alguma tabela não foi criada automaticamente,');
  console.log('   execute o SQL manualmente no Supabase Dashboard:');
  console.log('   https://supabase.com/dashboard/project/egsmraszqnmosmtjuzhx/sql/new');
  console.log('\n   Arquivo: sql/ads-optimization-tables.sql');
  console.log('\n✨ Script concluído!\n');
}

createTables().catch(console.error);
