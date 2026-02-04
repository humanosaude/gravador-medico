/**
 * InstaFlow - Posts CRUD
 * GET /api/social/instagram/posts - Lista posts
 * POST /api/social/instagram/posts - Criar post
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthTokenFromRequest } from '@/lib/auth-server';
import { getUserFromToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = getAuthTokenFromRequest(request);
    const user = token ? await getUserFromToken(token) : null;

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const accountId = searchParams.get('accountId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!accountId) {
      return NextResponse.json({ error: 'accountId é obrigatório' }, { status: 400 });
    }

    // Verificar se conta pertence ao usuário
    const { data: account } = await supabaseAdmin
      .from('instagram_accounts')
      .select('id')
      .eq('id', accountId)
      .eq('user_id', user.id)
      .single();

    if (!account) {
      return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 });
    }

    // Buscar posts
    let query = supabaseAdmin
      .from('instaflow_scheduled_posts')
      .select('*')
      .eq('account_id', accountId)
      .order('scheduled_for', { ascending: true })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: posts, error, count } = await query;

    if (error) throw error;

    return NextResponse.json({
      posts: posts || [],
      total: count || 0,
      hasMore: (posts?.length || 0) === limit,
    });

  } catch (error) {
    console.error('[InstaFlow] Posts GET error:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar posts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getAuthTokenFromRequest(request);
    const user = token ? await getUserFromToken(token) : null;

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const {
      accountId,
      postType,
      caption,
      hashtags,
      firstComment,
      mediaIds,
      mediaUrls,
      coverUrl,
      scheduledFor,
      shareToFeed,
      status: postStatus = 'draft',
    } = body;

    if (!accountId) {
      return NextResponse.json({ error: 'accountId é obrigatório' }, { status: 400 });
    }

    if (!postType) {
      return NextResponse.json({ error: 'postType é obrigatório' }, { status: 400 });
    }

    // Verificar se conta pertence ao usuário
    const { data: account } = await supabaseAdmin
      .from('instagram_accounts')
      .select('id')
      .eq('id', accountId)
      .eq('user_id', user.id)
      .single();

    if (!account) {
      return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 });
    }

    // Criar post
    const { data: post, error } = await supabaseAdmin
      .from('instaflow_scheduled_posts')
      .insert({
        account_id: accountId,
        user_id: user.id,
        post_type: postType,
        caption,
        hashtags,
        first_comment: firstComment,
        media_ids: mediaIds || [],
        media_urls: mediaUrls || [],
        cover_url: coverUrl,
        scheduled_for: scheduledFor,
        share_to_feed: shareToFeed ?? true,
        status: postStatus,
      })
      .select()
      .single();

    if (error) throw error;

    // Log de atividade
    await supabaseAdmin.from('instaflow_activity_log').insert({
      account_id: accountId,
      user_id: user.id,
      action: 'post_created',
      entity_type: 'post',
      entity_id: post.id,
      details: { postType, status: postStatus },
    });

    return NextResponse.json({ post });

  } catch (error) {
    console.error('[InstaFlow] Posts POST error:', error);
    return NextResponse.json(
      { error: 'Erro ao criar post' },
      { status: 500 }
    );
  }
}
