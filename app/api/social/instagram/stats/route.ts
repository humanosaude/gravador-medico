/**
 * InstaFlow - Dashboard Stats
 * GET /api/social/instagram/stats
 * 
 * Retorna estatísticas do dashboard para uma conta
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

    const accountId = request.nextUrl.searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json({ error: 'accountId é obrigatório' }, { status: 400 });
    }

    // Verificar se conta pertence ao usuário
    const { data: account } = await supabaseAdmin
      .from('instagram_accounts')
      .select('id, followers_count')
      .eq('id', accountId)
      .eq('user_id', user.id)
      .single();

    if (!account) {
      return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 });
    }

    // Buscar posts agendados
    const { count: scheduledPosts } = await supabaseAdmin
      .from('instaflow_scheduled_posts')
      .select('*', { count: 'exact', head: true })
      .eq('account_id', accountId)
      .eq('status', 'scheduled');

    // Buscar posts publicados hoje
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { count: publishedToday } = await supabaseAdmin
      .from('instaflow_scheduled_posts')
      .select('*', { count: 'exact', head: true })
      .eq('account_id', accountId)
      .eq('status', 'published')
      .gte('published_at', today.toISOString());

    // Buscar analytics recentes
    const { data: recentAnalytics } = await supabaseAdmin
      .from('instaflow_account_analytics')
      .select('reach, followers_count, average_engagement_rate')
      .eq('account_id', accountId)
      .order('date', { ascending: false })
      .limit(7);

    // Calcular métricas
    const totalReach = recentAnalytics?.reduce((sum, a) => sum + (a.reach || 0), 0) || 0;
    const avgEngagement = recentAnalytics?.length 
      ? recentAnalytics.reduce((sum, a) => sum + (a.average_engagement_rate || 0), 0) / recentAnalytics.length
      : 0;

    // Calcular mudança de seguidores (comparando com 7 dias atrás)
    let followersChange = 0;
    if (recentAnalytics && recentAnalytics.length >= 2) {
      const latest = recentAnalytics[0]?.followers_count || account.followers_count;
      const oldest = recentAnalytics[recentAnalytics.length - 1]?.followers_count || latest;
      followersChange = latest - oldest;
    }

    return NextResponse.json({
      stats: {
        scheduledPosts: scheduledPosts || 0,
        publishedToday: publishedToday || 0,
        totalReach,
        engagementRate: avgEngagement,
        followersChange,
      }
    });

  } catch (error) {
    console.error('[InstaFlow] Stats error:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar estatísticas' },
      { status: 500 }
    );
  }
}
