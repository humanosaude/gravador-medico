// =====================================================
// API: UPLOAD TEMPORÁRIO
// =====================================================
// Faz upload de arquivo para Supabase e retorna URL pública
// Usado pelo preview de anúncios antes de publicar
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Arquivo não fornecido' }, { status: 400 });
    }

    // Gerar nome único
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(7);
    const extension = file.name.split('.').pop() || 'bin';
    const isVideo = file.type.startsWith('video/');
    const folder = isVideo ? 'videos' : 'images';
    const fileName = `temp/${folder}/${timestamp}_${randomId}.${extension}`;

    // Converter para buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload para Supabase
    const { error: uploadError } = await supabaseAdmin.storage
      .from('creatives')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('Erro no upload:', uploadError);
      return NextResponse.json({ error: 'Falha no upload' }, { status: 500 });
    }

    // Obter URL pública
    const { data: urlData } = supabaseAdmin.storage
      .from('creatives')
      .getPublicUrl(fileName);

    console.log('✅ Upload temporário:', urlData.publicUrl);

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      fileName,
    });
  } catch (error) {
    console.error('❌ Erro no upload temporário:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
}
