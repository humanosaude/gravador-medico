/**
 * Social Flow - Drafts API
 * Gerenciamento de rascunhos de posts
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import * as jose from 'jose';
import { createClient } from '@supabase/supabase-js';
import { SocialNetwork } from '@/lib/social-flow/types';

async function getUserFromToken() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    
    if (!token) return null;
    
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret');
    const { payload } = await jose.jwtVerify(token, secret);
    
    return payload as { id: string; email: string };
  } catch {
    return null;
  }
}

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET /api/social-flow/drafts - Listar rascunhos
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const network = searchParams.get('network') as SocialNetwork;
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const supabase = getSupabaseClient();

    // Buscar contas do usuário
    const { data: accounts } = await supabase
      .from('social_accounts')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true);

    const accountIds = accounts?.map((a) => a.id) || [];

    if (!accountIds.length) {
      return NextResponse.json({
        success: true,
        drafts: [],
        total: 0,
      });
    }

    // Construir query
    let query = supabase
      .from('social_posts')
      .select(`
        *,
        social_accounts (
          id,
          account_name,
          account_username,
          network,
          profile_picture_url
        ),
        social_media_items (*)
      `, { count: 'exact' })
      .in('account_id', accountIds)
      .eq('status', 'draft');

    // Filtros opcionais
    if (accountId) {
      query = query.eq('account_id', accountId);
    }

    if (network) {
      // Nota: Filtro por network precisa de join
      const { data: networkAccounts } = await supabase
        .from('social_accounts')
        .select('id')
        .eq('user_id', user.id)
        .eq('network', network);
      
      if (networkAccounts?.length) {
        query = query.in('account_id', networkAccounts.map((a) => a.id));
      }
    }

    if (search) {
      query = query.ilike('content', `%${search}%`);
    }

    // Ordenar por última atualização
    query = query
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: drafts, count, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      drafts: drafts || [],
      total: count || 0,
      hasMore: (count || 0) > offset + limit,
    });
  } catch (error: any) {
    console.error('Drafts error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch drafts' },
      { status: 500 }
    );
  }
}

// POST /api/social-flow/drafts - Criar rascunho
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      accountId,
      content,
      mediaItems,
      hashtags,
      postType = 'feed',
      metadata,
    } = body;

    if (!accountId) {
      return NextResponse.json(
        { error: 'accountId is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // Verificar se a conta pertence ao usuário
    const { data: account, error: accountError } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('id', accountId)
      .eq('user_id', user.id)
      .single();

    if (accountError || !account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    // Criar rascunho
    const { data: draft, error: createError } = await supabase
      .from('social_posts')
      .insert({
        account_id: accountId,
        content: content || '',
        hashtags: hashtags || [],
        post_type: postType,
        status: 'draft',
        metadata: metadata || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (createError) {
      throw createError;
    }

    // Adicionar mídia se houver
    if (mediaItems?.length && draft) {
      const mediaInserts = mediaItems.map((item: any, index: number) => ({
        post_id: draft.id,
        file_type: item.type,
        public_url: item.url,
        storage_path: item.storagePath,
        file_name: item.fileName,
        file_size_bytes: item.fileSize,
        width: item.width,
        height: item.height,
        duration_seconds: item.duration,
        thumbnail_url: item.thumbnailUrl,
        order_index: index,
        created_at: new Date().toISOString(),
      }));

      await supabase
        .from('social_media_items')
        .insert(mediaInserts);
    }

    // Buscar draft completo com mídia
    const { data: completeDraft } = await supabase
      .from('social_posts')
      .select(`
        *,
        social_accounts (
          id,
          account_name,
          network
        ),
        social_media_items (*)
      `)
      .eq('id', draft.id)
      .single();

    return NextResponse.json({
      success: true,
      draft: completeDraft || draft,
      message: 'Draft created successfully',
    });
  } catch (error: any) {
    console.error('Create draft error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create draft' },
      { status: 500 }
    );
  }
}

// PUT /api/social-flow/drafts - Atualizar rascunho
export async function PUT(request: NextRequest) {
  try {
    const user = await getUserFromToken();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      postId,
      content,
      hashtags,
      postType,
      mediaItems,
      metadata,
    } = body;

    if (!postId) {
      return NextResponse.json(
        { error: 'postId is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // Verificar se o draft pertence ao usuário
    const { data: draft, error: draftError } = await supabase
      .from('social_posts')
      .select(`
        *,
        social_accounts!inner (
          id,
          user_id
        )
      `)
      .eq('id', postId)
      .eq('social_accounts.user_id', user.id)
      .eq('status', 'draft')
      .single();

    if (draftError || !draft) {
      return NextResponse.json(
        { error: 'Draft not found' },
        { status: 404 }
      );
    }

    // Preparar atualizações
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (content !== undefined) updates.content = content;
    if (hashtags !== undefined) updates.hashtags = hashtags;
    if (postType !== undefined) updates.post_type = postType;
    if (metadata !== undefined) updates.metadata = { ...draft.metadata, ...metadata };

    // Atualizar draft
    const { data: updatedDraft, error: updateError } = await supabase
      .from('social_posts')
      .update(updates)
      .eq('id', postId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Atualizar mídia se fornecida
    if (mediaItems !== undefined) {
      // Remover mídia existente
      await supabase
        .from('social_media_items')
        .delete()
        .eq('post_id', postId);

      // Adicionar nova mídia
      if (mediaItems.length) {
        const mediaInserts = mediaItems.map((item: any, index: number) => ({
          post_id: postId,
          file_type: item.type,
          public_url: item.url,
          storage_path: item.storagePath,
          file_name: item.fileName,
          file_size_bytes: item.fileSize,
          width: item.width,
          height: item.height,
          duration_seconds: item.duration,
          thumbnail_url: item.thumbnailUrl,
          order_index: index,
          created_at: new Date().toISOString(),
        }));

        await supabase
          .from('social_media_items')
          .insert(mediaInserts);
      }
    }

    // Buscar draft completo
    const { data: completeDraft } = await supabase
      .from('social_posts')
      .select(`
        *,
        social_accounts (
          id,
          account_name,
          network
        ),
        social_media_items (*)
      `)
      .eq('id', postId)
      .single();

    return NextResponse.json({
      success: true,
      draft: completeDraft || updatedDraft,
      message: 'Draft updated successfully',
    });
  } catch (error: any) {
    console.error('Update draft error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update draft' },
      { status: 500 }
    );
  }
}

// DELETE /api/social-flow/drafts - Deletar rascunho(s)
export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserFromToken();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId');
    const postIds = searchParams.get('postIds')?.split(',');

    if (!postId && !postIds?.length) {
      return NextResponse.json(
        { error: 'postId or postIds is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    const idsToDelete = postIds || [postId!];

    // Verificar quais posts pertencem ao usuário
    const { data: validPosts } = await supabase
      .from('social_posts')
      .select(`
        id,
        social_accounts!inner (
          user_id
        )
      `)
      .in('id', idsToDelete)
      .eq('social_accounts.user_id', user.id)
      .eq('status', 'draft');

    const validIds = validPosts?.map((p) => p.id) || [];

    if (!validIds.length) {
      return NextResponse.json(
        { error: 'No valid drafts found to delete' },
        { status: 404 }
      );
    }

    // Deletar mídia primeiro
    await supabase
      .from('social_media_items')
      .delete()
      .in('post_id', validIds);

    // Deletar posts
    const { error: deleteError } = await supabase
      .from('social_posts')
      .delete()
      .in('id', validIds);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({
      success: true,
      deletedCount: validIds.length,
      message: `${validIds.length} draft(s) deleted successfully`,
    });
  } catch (error: any) {
    console.error('Delete draft error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete draft' },
      { status: 500 }
    );
  }
}
