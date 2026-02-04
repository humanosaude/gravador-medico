/**
 * Social Flow - Scheduled Posts API
 * Gerenciamento de posts agendados
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import * as jose from 'jose';
import { createClient } from '@supabase/supabase-js';
import { PostStatus, SocialNetwork } from '@/lib/social-flow/types';

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

// GET /api/social-flow/scheduled - Listar posts agendados
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
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status') as PostStatus;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const supabase = getSupabaseClient();

    // Buscar contas do usuário primeiro
    const { data: accounts } = await supabase
      .from('social_accounts')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true);

    const accountIds = accounts?.map((a) => a.id) || [];

    if (!accountIds.length) {
      return NextResponse.json({
        success: true,
        posts: [],
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
      .in('status', ['scheduled', 'draft', 'pending']);

    // Filtros opcionais
    if (accountId) {
      query = query.eq('account_id', accountId);
    }

    if (network) {
      query = query.eq('social_accounts.network', network);
    }

    if (status) {
      query = query.eq('status', status);
    } else {
      query = query.in('status', ['scheduled', 'draft']);
    }

    if (startDate) {
      query = query.gte('scheduled_for', startDate);
    }

    if (endDate) {
      query = query.lte('scheduled_for', endDate);
    }

    // Ordenar por data agendada
    query = query
      .order('scheduled_for', { ascending: true })
      .range(offset, offset + limit - 1);

    const { data: posts, count, error } = await query;

    if (error) {
      throw error;
    }

    // Agrupar por data para visão de calendário
    const groupedByDate: Record<string, any[]> = {};
    posts?.forEach((post) => {
      if (post.scheduled_for) {
        const dateKey = post.scheduled_for.split('T')[0];
        if (!groupedByDate[dateKey]) {
          groupedByDate[dateKey] = [];
        }
        groupedByDate[dateKey].push(post);
      }
    });

    return NextResponse.json({
      success: true,
      posts: posts || [],
      calendar: groupedByDate,
      total: count || 0,
      hasMore: (count || 0) > offset + limit,
    });
  } catch (error: any) {
    console.error('Scheduled posts error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch scheduled posts' },
      { status: 500 }
    );
  }
}

// POST /api/social-flow/scheduled - Criar/atualizar agendamento
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
      postId,
      scheduledFor,
      timezone = 'America/Sao_Paulo',
      autoPublish = true,
    } = body;

    if (!postId || !scheduledFor) {
      return NextResponse.json(
        { error: 'postId and scheduledFor are required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // Verificar se o post pertence ao usuário
    const { data: post, error: postError } = await supabase
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
      .single();

    if (postError || !post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // Validar data (não pode ser no passado)
    const scheduledDate = new Date(scheduledFor);
    if (scheduledDate <= new Date()) {
      return NextResponse.json(
        { error: 'Scheduled time must be in the future' },
        { status: 400 }
      );
    }

    // Atualizar post
    const { data: updatedPost, error: updateError } = await supabase
      .from('social_posts')
      .update({
        scheduled_for: scheduledDate.toISOString(),
        timezone,
        status: 'scheduled',
        auto_publish: autoPublish,
        updated_at: new Date().toISOString(),
      })
      .eq('id', postId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      post: updatedPost,
      message: `Post scheduled for ${scheduledDate.toLocaleString('pt-BR', { timeZone: timezone })}`,
    });
  } catch (error: any) {
    console.error('Schedule post error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to schedule post' },
      { status: 500 }
    );
  }
}

// DELETE /api/social-flow/scheduled - Cancelar agendamento
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
    const action = searchParams.get('action') || 'unschedule'; // unschedule | delete

    if (!postId) {
      return NextResponse.json(
        { error: 'postId is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // Verificar se o post pertence ao usuário
    const { data: post, error: postError } = await supabase
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
      .single();

    if (postError || !post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    if (action === 'delete') {
      // Deletar post completamente
      await supabase
        .from('social_posts')
        .delete()
        .eq('id', postId);

      return NextResponse.json({
        success: true,
        message: 'Post deleted successfully',
      });
    } else {
      // Apenas cancelar agendamento (virar draft)
      const { data: updatedPost, error: updateError } = await supabase
        .from('social_posts')
        .update({
          scheduled_for: null,
          status: 'draft',
          updated_at: new Date().toISOString(),
        })
        .eq('id', postId)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      return NextResponse.json({
        success: true,
        post: updatedPost,
        message: 'Schedule cancelled - post moved to drafts',
      });
    }
  } catch (error: any) {
    console.error('Cancel schedule error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to cancel schedule' },
      { status: 500 }
    );
  }
}

// PATCH /api/social-flow/scheduled - Atualizar múltiplos agendamentos
export async function PATCH(request: NextRequest) {
  try {
    const user = await getUserFromToken();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { updates } = body; // Array de { postId, scheduledFor }

    if (!updates?.length) {
      return NextResponse.json(
        { error: 'updates array is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // Buscar todos os posts para validação
    const postIds = updates.map((u: any) => u.postId);
    const { data: posts } = await supabase
      .from('social_posts')
      .select(`
        id,
        social_accounts!inner (
          user_id
        )
      `)
      .in('id', postIds)
      .eq('social_accounts.user_id', user.id);

    const validPostIds = new Set(posts?.map((p) => p.id) || []);

    // Atualizar cada post válido
    const results = await Promise.all(
      updates
        .filter((u: any) => validPostIds.has(u.postId))
        .map(async (update: any) => {
          const { error } = await supabase
            .from('social_posts')
            .update({
              scheduled_for: update.scheduledFor,
              status: 'scheduled',
              updated_at: new Date().toISOString(),
            })
            .eq('id', update.postId);

          return {
            postId: update.postId,
            success: !error,
            error: error?.message,
          };
        })
    );

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: failed === 0,
      results,
      summary: {
        total: updates.length,
        successful,
        failed,
        skipped: updates.length - results.length,
      },
    });
  } catch (error: any) {
    console.error('Bulk schedule error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update schedules' },
      { status: 500 }
    );
  }
}
