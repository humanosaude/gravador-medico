import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkColumns() {
  console.log('🔍 Verificando colunas existentes...\n');

  // Testar inserção em integration_settings com as novas colunas
  const { data, error } = await supabase
    .from('integration_settings')
    .select('*')
    .limit(1);

  if (data && data[0]) {
    const cols = Object.keys(data[0]);
    console.log('Colunas em integration_settings:');
    cols.forEach(c => console.log('  -', c));
    
    const hasInstagramActor = cols.includes('instagram_actor_id');
    console.log('\ninstagram_actor_id:', hasInstagramActor ? '✅ Existe' : '❌ Não existe');
  }

  // Testar ads_creatives
  const { data: creatives } = await supabase
    .from('ads_creatives')
    .select('*')
    .limit(1);

  if (creatives) {
    const cols = creatives[0] ? Object.keys(creatives[0]) : [];
    console.log('\nColunas em ads_creatives:');
    cols.forEach(c => console.log('  -', c));
    
    const hasProcessingStatus = cols.includes('processing_status');
    console.log('\nprocessing_status:', hasProcessingStatus ? '✅ Existe' : '❌ Não existe');
  }
}

checkColumns();
