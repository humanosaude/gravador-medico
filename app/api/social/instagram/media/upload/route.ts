import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// POST - Upload de mídia
export async function POST(request: NextRequest) {
  try {
    const supabase = supabaseAdmin;
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folder = formData.get('folder') as string || 'general';
    const accountId = formData.get('account_id') as string;
    const tags = formData.get('tags') as string;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    // Validar tipo de arquivo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Tipo de arquivo não permitido' }, { status: 400 });
    }

    // Validar tamanho (máximo 100MB)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'Arquivo muito grande (máx: 100MB)' }, { status: 400 });
    }

    // Gerar nome único
    const timestamp = Date.now();
    const ext = file.name.split('.').pop();
    const fileName = `${user.id}/${folder}/${timestamp}.${ext}`;

    // Upload para Supabase Storage
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('instaflow-media')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Obter URL pública
    const { data: { publicUrl } } = supabase.storage
      .from('instaflow-media')
      .getPublicUrl(fileName);

    // Determinar tipo de mídia
    const fileType = file.type.startsWith('video/') ? 'video' : 'image';

    // Salvar no banco de dados
    const { data: media, error: dbError } = await supabase
      .from('instaflow_media_library')
      .insert({
        user_id: user.id,
        account_id: accountId || null,
        file_name: file.name,
        file_path: fileName,
        file_url: publicUrl,
        file_type: fileType,
        file_size: file.size,
        mime_type: file.type,
        folder,
        tags: tags ? tags.split(',').map(t => t.trim()) : [],
      })
      .select()
      .single();

    if (dbError) {
      console.error('Error saving media to database:', dbError);
      // Tentar deletar o arquivo do storage se falhou no banco
      await supabase.storage.from('instaflow-media').remove([fileName]);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      media 
    });

  } catch (error) {
    console.error('Error in media upload:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
