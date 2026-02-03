/**
 * =====================================================
 * API: ANALISAR CRIATIVO COM IA
 * =====================================================
 * 
 * POST /api/ads/analyze-creative
 * 
 * Recebe um criativo (imagem/vídeo) e retorna:
 * - Análise visual completa
 * - Recomendação automática de objetivo
 * - Ângulos de copywriting sugeridos
 * 
 * =====================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { analyzeCreative, CreativeFormat } from '@/lib/meta/creative-analyzer';

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

    // Parse do FormData
    const formData = await req.formData();
    const format = formData.get('format') as CreativeFormat;
    const file = formData.get('file') as File;

    // Validações
    if (!format || !['IMAGE', 'VIDEO', 'CAROUSEL'].includes(format)) {
      return NextResponse.json(
        { error: 'Formato inválido. Use: IMAGE, VIDEO ou CAROUSEL' },
        { status: 400 }
      );
    }

    if (!file) {
      return NextResponse.json(
        { error: 'Arquivo é obrigatório' },
        { status: 400 }
      );
    }

    // Validar tipo de arquivo
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const allowedVideoTypes = ['video/mp4', 'video/quicktime', 'video/webm'];
    const allowedTypes = format === 'VIDEO' ? allowedVideoTypes : allowedImageTypes;
    
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `Tipo de arquivo inválido: ${file.type}` },
        { status: 400 }
      );
    }

    // Validar tamanho (max 50MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Arquivo muito grande. Máximo: 50MB' },
        { status: 400 }
      );
    }

    console.log(`🎨 [Analyze Creative API] Formato: ${format}, Arquivo: ${file.name}, Tamanho: ${(file.size / 1024 / 1024).toFixed(2)}MB`);

    // Upload para Supabase Storage
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    const fileBuffer = await file.arrayBuffer();
    
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('creatives')
      .upload(`temp/${fileName}`, fileBuffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('[Analyze Creative API] Erro upload:', uploadError);
      throw new Error('Erro ao fazer upload do arquivo: ' + uploadError.message);
    }

    // Obter URL pública
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('creatives')
      .getPublicUrl(`temp/${fileName}`);

    console.log(`📤 [Analyze Creative API] Upload concluído: ${publicUrl}`);

    // Analisar com GPT-4o Vision
    const analysis = await analyzeCreative(publicUrl, format);

    console.log('✅ [Analyze Creative API] Análise concluída');
    console.log(`💡 Recomendação: ${analysis.recommended_objective} (${analysis.recommendation_confidence}% confiança)`);

    return NextResponse.json({
      success: true,
      analysis,
      creative_url: publicUrl,
      file_name: fileName
    });

  } catch (error: any) {
    console.error('[Analyze Creative API] Erro:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Erro interno ao analisar criativo',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// Configurar limite de tamanho do body
export const config = {
  api: {
    bodyParser: false, // Desabilitar para usar formData
  },
};
