// =====================================================
// API: GERAR PRÉVIA DE COPY
// =====================================================
// Analisa criativos e retorna copy SEM publicar campanha
// Usado pelo AdPreviewCard antes de confirmar publicação
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { analyzeCreativeForCopy } from '@/lib/ads/creative-analyzer';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const maxDuration = 60;

// =====================================================
// TIPOS
// =====================================================

interface PreviewRequest {
  mediaUrl: string;
  mediaType: 'image' | 'video';
  objective: string;
  targetAudience?: string;
}

interface PreviewResponse {
  success: boolean;
  previews: Array<{
    primaryText: string;
    headline: string;
    mediaUrl: string;
    allPrimaryTexts: string[];
    allHeadlines: string[];
    analysisType: string;
    imageDescription?: string;
  }>;
  error?: string;
}

// =====================================================
// POST: Gerar Prévia
// =====================================================

export async function POST(request: NextRequest) {
  console.log('🎨 Gerando prévia de copy...');

  try {
    const body = await request.json();
    const { mediaUrls, objective, targetAudience } = body as {
      mediaUrls: Array<{ url: string; type: 'image' | 'video' }>;
      objective: string;
      targetAudience?: string;
    };

    if (!mediaUrls || mediaUrls.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Nenhuma mídia fornecida',
      }, { status: 400 });
    }

    if (!objective) {
      return NextResponse.json({
        success: false,
        error: 'Objetivo é obrigatório',
      }, { status: 400 });
    }

    const audience = targetAudience || 'Profissionais da saúde';
    const previews = [];

    for (const media of mediaUrls) {
      try {
        console.log(`   👁️ Analisando ${media.type}: ${media.url.substring(0, 50)}...`);

        const result = await analyzeCreativeForCopy({
          mediaUrl: media.url,
          mediaType: media.type,
          objective,
          targetAudience: audience,
        });

        previews.push({
          mediaUrl: media.url,
          mediaType: media.type,
          primaryText: result.primaryText[0] || '',
          headline: result.headlines[0] || '',
          allPrimaryTexts: result.primaryText,
          allHeadlines: result.headlines,
          analysisType: result.metadata?.analysisType || 'unknown',
          imageDescription: result.metadata?.imageDescription,
        });

        console.log(`   ✅ Prévia gerada para ${media.type}`);
      } catch (error) {
        console.error(`   ❌ Erro ao analisar ${media.url}:`, error);
        
        // Adicionar prévia com fallback
        previews.push({
          mediaUrl: media.url,
          mediaType: media.type,
          primaryText: `🎯 Descubra como ${objective.toLowerCase()} pode transformar sua vida. Milhares já descobriram!`,
          headline: objective.split(' ').slice(0, 3).join(' '),
          allPrimaryTexts: [
            `🎯 Descubra como ${objective.toLowerCase()} pode transformar sua vida.`,
            `⚡ A solução que você esperava está aqui. ${objective}!`,
          ],
          allHeadlines: [
            objective.split(' ').slice(0, 3).join(' '),
            'Saiba Mais Agora',
          ],
          analysisType: 'fallback',
          imageDescription: 'Análise não disponível',
        });
      }
    }

    return NextResponse.json({
      success: true,
      previews,
      message: `${previews.length} prévia(s) gerada(s) com sucesso`,
    });

  } catch (error) {
    console.error('❌ Erro ao gerar prévia:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
}
