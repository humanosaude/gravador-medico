// Endpoint temporário para executar migration de colunas
// DELETE AFTER USE!

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    console.log('🔧 Executando migration de colunas...');

    // As colunas que precisamos adicionar
    const columnsToAdd = [
      { name: 'template_id', type: 'TEXT', default: null },
      { name: 'is_essential', type: 'BOOLEAN', default: 'false' },
      { name: 'use_for_exclusion', type: 'BOOLEAN', default: 'false' },
      { name: 'recommended_for', type: 'TEXT[]', default: null },
      { name: 'health_status', type: 'TEXT', default: null },
      { name: 'last_health_check', type: 'TIMESTAMPTZ', default: null },
      { name: 'source_audience_id', type: 'TEXT', default: null },
      { name: 'lookalike_ratio', type: 'DECIMAL(4,3)', default: null },
    ];

    const results = [];

    // Tentar adicionar cada coluna individualmente via insert/update
    // Como não temos acesso direto ao SQL, vamos verificar quais colunas existem
    const { data: sample, error: sampleError } = await supabaseAdmin
      .from('ads_audiences')
      .select('*')
      .limit(1);

    if (sampleError) {
      return NextResponse.json({ error: sampleError.message }, { status: 500 });
    }

    const existingColumns = sample?.[0] ? Object.keys(sample[0]) : [];
    
    // Verificar quais colunas faltam
    const missingColumns = columnsToAdd.filter(col => !existingColumns.includes(col.name));

    return NextResponse.json({
      success: true,
      existing_columns: existingColumns,
      missing_columns: missingColumns.map(c => c.name),
      message: missingColumns.length > 0 
        ? 'Execute o SQL no Supabase Dashboard para adicionar as colunas faltantes'
        : 'Todas as colunas já existem!',
      sql_to_run: missingColumns.map(col => 
        `ALTER TABLE ads_audiences ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}${col.default ? ` DEFAULT ${col.default}` : ''};`
      ).join('\n')
    });

  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
