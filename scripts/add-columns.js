const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://egsmraszqnmosmtjuzhx.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addColumns() {
  console.log('🔧 Adicionando colunas à tabela ads_audiences...\n');

  // Verificar colunas existentes
  const { data: testData, error: testError } = await supabase
    .from('ads_audiences')
    .select('*')
    .limit(1);

  if (testError) {
    console.error('❌ Erro ao acessar tabela:', testError.message);
    return;
  }

  console.log('📋 Colunas atuais:', testData ? Object.keys(testData[0] || {}) : 'tabela vazia');

  // Tentar inserir um registro de teste com todas as colunas
  const testRecord = {
    meta_audience_id: 'test_' + Date.now(),
    name: 'Teste Migration',
    audience_type: 'CUSTOM',
    source_type: 'WEBSITE',
    funnel_stage: 'FUNDO',
    template_id: 'test',
    is_essential: true,
    use_for_exclusion: false,
    recommended_for: ['CONVERSION'],
    health_status: 'READY',
    approximate_size: 1000
  };

  const { data: insertData, error: insertError } = await supabase
    .from('ads_audiences')
    .insert(testRecord)
    .select();

  if (insertError) {
    console.error('❌ Erro ao inserir registro de teste:', insertError.message);
    console.log('\n⚠️ As colunas precisam ser adicionadas manualmente no Supabase Dashboard');
    console.log('\n📋 SQL para executar no Supabase SQL Editor:');
    console.log(`
ALTER TABLE ads_audiences ADD COLUMN IF NOT EXISTS template_id TEXT;
ALTER TABLE ads_audiences ADD COLUMN IF NOT EXISTS is_essential BOOLEAN DEFAULT false;
ALTER TABLE ads_audiences ADD COLUMN IF NOT EXISTS use_for_exclusion BOOLEAN DEFAULT false;
ALTER TABLE ads_audiences ADD COLUMN IF NOT EXISTS recommended_for TEXT[];
ALTER TABLE ads_audiences ADD COLUMN IF NOT EXISTS health_status TEXT;
ALTER TABLE ads_audiences ADD COLUMN IF NOT EXISTS last_health_check TIMESTAMP WITH TIME ZONE;
ALTER TABLE ads_audiences ADD COLUMN IF NOT EXISTS source_audience_id TEXT;
ALTER TABLE ads_audiences ADD COLUMN IF NOT EXISTS lookalike_ratio DECIMAL(4,3);
    `);
    return;
  }

  console.log('✅ Registro de teste inserido:', insertData[0]?.id);

  // Deletar registro de teste
  const { error: deleteError } = await supabase
    .from('ads_audiences')
    .delete()
    .eq('meta_audience_id', testRecord.meta_audience_id);

  if (!deleteError) {
    console.log('✅ Registro de teste removido');
  }

  console.log('\n✅ Todas as colunas estão funcionando!');
}

addColumns().catch(console.error);
