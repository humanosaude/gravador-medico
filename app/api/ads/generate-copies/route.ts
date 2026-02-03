/**
 * =====================================================
 * API: GERAR COPIES COM IA
 * =====================================================
 * 
 * POST /api/ads/generate-copies
 * 
 * Recebe análise do criativo + objetivo e gera:
 * - 3 variações de copy com ranking
 * - Indicação da copy CAMPEÃ
 * - Justificativas para cada variação
 * 
 * =====================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { 
  generateCopiesWithWinnerPrediction, 
  regenerateCopies,
  CreativeAnalysis,
  CopyVariation
} from '@/lib/meta/creative-analyzer';
import { ObjectiveType } from '@/lib/gravador-medico-knowledge';

interface GenerateCopiesRequest {
  objective_type: ObjectiveType;
  creative_analysis: CreativeAnalysis;
  additional_context?: string;
  regenerate?: boolean;
  previous_variations?: CopyVariation[];
}

export async function POST(req: NextRequest) {
  try {
    // Verificar autenticação via header
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    // Parse do body
    const body: GenerateCopiesRequest = await req.json();
    const { 
      objective_type, 
      creative_analysis, 
      additional_context,
      regenerate,
      previous_variations
    } = body;

    // Validações
    if (!objective_type || !['TRAFEGO', 'CONVERSAO', 'REMARKETING'].includes(objective_type)) {
      return NextResponse.json(
        { error: 'objective_type inválido. Use: TRAFEGO, CONVERSAO ou REMARKETING' },
        { status: 400 }
      );
    }

    if (!creative_analysis) {
      return NextResponse.json(
        { error: 'creative_analysis é obrigatório' },
        { status: 400 }
      );
    }

    console.log(`✍️ [Generate Copies API] Objetivo: ${objective_type}, Regenerar: ${regenerate || false}`);

    // Gerar copies com previsão de performance
    let result;
    
    if (regenerate && previous_variations?.length) {
      // Regenerar com novos ângulos
      result = await regenerateCopies(
        objective_type,
        creative_analysis,
        additional_context,
        previous_variations
      );
    } else {
      // Primeira geração
      result = await generateCopiesWithWinnerPrediction(
        objective_type,
        creative_analysis,
        additional_context
      );
    }

    console.log('✅ [Generate Copies API] Copies geradas com sucesso');

    // Salvar no banco para histórico (opcional)
    try {
      await supabaseAdmin
        .from('ad_copies_history')
        .insert({
          user_id: user.id,
          objective_type,
          creative_analysis: JSON.stringify(creative_analysis),
          variations: JSON.stringify(result.variations),
          additional_context,
          created_at: new Date().toISOString()
        });
    } catch (dbError) {
      // Não bloquear se falhar o log
      console.warn('[Generate Copies API] Erro ao salvar histórico:', dbError);
    }

    return NextResponse.json({
      success: true,
      ...result
    });

  } catch (error: any) {
    console.error('[Generate Copies API] Erro:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Erro interno ao gerar copies',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
