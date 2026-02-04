import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET - Listar mídia da biblioteca
export async function GET(request: NextRequest) {
  try {
    const supabase = supabaseAdmin;
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const folder = searchParams.get('folder');
    const fileType = searchParams.get('type');
    const tags = searchParams.get('tags');

    let query = supabase
      .from('instaflow_media_library')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_archived', false)
      .order('uploaded_at', { ascending: false });

    if (folder) {
      query = query.eq('folder', folder);
    }

    if (fileType) {
      query = query.eq('file_type', fileType);
    }

    if (tags) {
      query = query.contains('tags', [tags]);
    }

    const { data: media, error } = await query;

    if (error) {
      console.error('Error fetching media:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ media: media || [] });

  } catch (error) {
    console.error('Error in media API:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Excluir mídia
export async function DELETE(request: NextRequest) {
  try {
    const supabase = supabaseAdmin;
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mediaId = searchParams.get('id');

    if (!mediaId) {
      return NextResponse.json({ error: 'ID da mídia é obrigatório' }, { status: 400 });
    }

    // Buscar o arquivo para pegar o path do storage
    const { data: mediaItem, error: fetchError } = await supabase
      .from('instaflow_media_library')
      .select('file_path')
      .eq('id', mediaId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !mediaItem) {
      return NextResponse.json({ error: 'Mídia não encontrada' }, { status: 404 });
    }

    // Excluir do storage
    if (mediaItem.file_path) {
      await supabase.storage
        .from('instaflow-media')
        .remove([mediaItem.file_path]);
    }

    // Excluir do banco
    const { error: deleteError } = await supabase
      .from('instaflow_media_library')
      .delete()
      .eq('id', mediaId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Error deleting media:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error in media DELETE:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
