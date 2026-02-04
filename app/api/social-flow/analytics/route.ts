/**
 * Social Flow - Analytics API
 * Agregação de métricas de todas as redes
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import * as jose from 'jose';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AnalyticsAggregator } from '@/lib/social-flow/core/analytics-aggregator';
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

// Mapear período string para enum
function mapPeriod(period: string): 'day' | 'week' | 'month' | 'year' {
  if (period.includes('7') || period.includes('week')) return 'week';
  if (period.includes('30') || period.includes('month')) return 'month';
  if (period.includes('90') || period.includes('year')) return 'year';
  if (period.includes('1') || period.includes('day')) return 'day';
  return 'month';
}

// GET /api/social-flow/analytics - Obter métricas agregadas
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
    const view = searchParams.get('view') || 'overview'; // overview | account | post | trends | comparison
    const accountId = searchParams.get('accountId');
    const postId = searchParams.get('postId');
    const networks = searchParams.get('networks')?.split(',') as SocialNetwork[];
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const period = searchParams.get('period') || '30d'; // 7d, 30d, 90d

    const supabase = getSupabaseClient();
    const aggregator = new AnalyticsAggregator();

    // Calcular datas com base no período
    const now = new Date();
    const start = startDate ? new Date(startDate) : new Date(now.getTime() - getPeriodMs(period));
    const end = endDate ? new Date(endDate) : now;

    switch (view) {
      case 'overview':
        // Visão geral de todas as contas
        const overview = await aggregator.getAggregatedMetrics(
          user.id,
          mapPeriod(period)
        );
        return NextResponse.json({ success: true, ...overview });

      case 'account':
        // Métricas de uma conta específica
        if (!accountId) {
          return NextResponse.json(
            { error: 'accountId required for account view' },
            { status: 400 }
          );
        }
        const accountMetrics = await getAccountMetrics(supabase, accountId, start, end);
        return NextResponse.json({ success: true, ...accountMetrics });

      case 'post':
        // Métricas de um post específico
        if (!postId) {
          return NextResponse.json(
            { error: 'postId required for post view' },
            { status: 400 }
          );
        }
        const postMetrics = await getPostMetrics(supabase, postId);
        return NextResponse.json({ success: true, ...postMetrics });

      case 'trends':
        // Tendências ao longo do tempo
        const trends = await getTrends(supabase, user.id, start, end, networks);
        return NextResponse.json({ success: true, ...trends });

      case 'comparison':
        // Comparação entre redes (usa overview por rede)
        const comparisonData = await aggregator.getAggregatedMetrics(user.id, mapPeriod(period));
        return NextResponse.json({ success: true, byNetwork: comparisonData.byNetwork });

      case 'top-posts':
        // Posts com melhor performance
        const topPosts = await getTopPosts(supabase, user.id, start, end, networks);
        return NextResponse.json({ success: true, posts: topPosts });

      default:
        return NextResponse.json(
          { error: 'Invalid view type' },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}

// POST /api/social-flow/analytics - Sincronizar métricas
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
    const { accountId, force = false } = body;

    const supabase = getSupabaseClient();

    // Verificar se a conta pertence ao usuário
    const { data: account, error } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('id', accountId)
      .eq('user_id', user.id)
      .single();

    if (error || !account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    // Verificar rate limit (não sincronizar com muita frequência)
    const lastSync = account.last_sync_at ? new Date(account.last_sync_at) : null;
    const minInterval = 5 * 60 * 1000; // 5 minutos

    if (!force && lastSync && Date.now() - lastSync.getTime() < minInterval) {
      return NextResponse.json({
        success: false,
        message: 'Sync rate limited',
        nextSyncAt: new Date(lastSync.getTime() + minInterval).toISOString(),
      });
    }

    // Disparar sincronização via aggregator
    const aggregator = new AnalyticsAggregator();
    // Nota: syncAccountMetrics será implementado quando tivermos todas as APIs
    // Por agora, apenas atualizar timestamp

    // Atualizar timestamp de sincronização
    await supabase
      .from('social_accounts')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', accountId);

    return NextResponse.json({
      success: true,
      message: 'Sync initiated',
      syncedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Analytics sync error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync analytics' },
      { status: 500 }
    );
  }
}

// Helpers

function getPeriodMs(period: string): number {
  const days = parseInt(period.replace('d', '')) || 30;
  return days * 24 * 60 * 60 * 1000;
}

async function getAccountMetrics(
  supabase: any,
  accountId: string,
  start: Date,
  end: Date
) {
  // Buscar métricas históricas da conta
  const { data: history } = await supabase
    .from('social_account_metrics_history')
    .select('*')
    .eq('account_id', accountId)
    .gte('recorded_at', start.toISOString())
    .lte('recorded_at', end.toISOString())
    .order('recorded_at', { ascending: true });

  // Buscar métricas atuais
  const { data: account } = await supabase
    .from('social_accounts')
    .select('followers_count, following_count, posts_count, engagement_rate')
    .eq('id', accountId)
    .single();

  // Buscar posts do período
  const { data: posts } = await supabase
    .from('social_posts')
    .select(`
      id,
      platform_post_id,
      content,
      status,
      published_at,
      social_post_metrics (*)
    `)
    .eq('account_id', accountId)
    .gte('published_at', start.toISOString())
    .lte('published_at', end.toISOString())
    .order('published_at', { ascending: false });

  // Calcular totais do período
  interface MetricsTotals {
    impressions: number;
    reach: number;
    engagement: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
  }
  
  const initialTotals: MetricsTotals = { 
    impressions: 0, reach: 0, engagement: 0, likes: 0, comments: 0, shares: 0, saves: 0 
  };
  
  const totals = (posts || []).reduce(
    (acc: MetricsTotals, post: any): MetricsTotals => {
      const metrics = post.social_post_metrics?.[0] || {};
      return {
        impressions: acc.impressions + (metrics.impressions || 0),
        reach: acc.reach + (metrics.reach || 0),
        engagement: acc.engagement + (metrics.engagement || 0),
        likes: acc.likes + (metrics.likes || 0),
        comments: acc.comments + (metrics.comments || 0),
        shares: acc.shares + (metrics.shares || 0),
        saves: acc.saves + (metrics.saves || 0),
      };
    },
    initialTotals
  );

  return {
    current: account,
    history: history || [],
    posts: posts || [],
    totals,
    period: {
      start: start.toISOString(),
      end: end.toISOString(),
    },
  };
}

async function getPostMetrics(supabase: any, postId: string) {
  // Buscar post com métricas
  const { data: post, error } = await supabase
    .from('social_posts')
    .select(`
      *,
      social_post_metrics (*),
      social_post_metrics_history (*)
    `)
    .eq('id', postId)
    .single();

  if (error || !post) {
    throw new Error('Post not found');
  }

  // Buscar média de performance da conta para comparação
  const { data: accountPosts } = await supabase
    .from('social_posts')
    .select('social_post_metrics (*)')
    .eq('account_id', post.account_id)
    .eq('status', 'published')
    .limit(20);

  const avgMetrics = calculateAverageMetrics(
    accountPosts?.map((p: any) => p.social_post_metrics?.[0]).filter(Boolean) || []
  );

  return {
    post,
    metrics: post.social_post_metrics?.[0] || null,
    history: post.social_post_metrics_history || [],
    comparison: {
      accountAverage: avgMetrics,
      performance: calculatePerformanceVsAverage(
        post.social_post_metrics?.[0],
        avgMetrics
      ),
    },
  };
}

async function getTrends(
  supabase: any,
  userId: string,
  start: Date,
  end: Date,
  networks?: SocialNetwork[]
) {
  // Buscar contas do usuário
  let accountsQuery = supabase
    .from('social_accounts')
    .select('id, network')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (networks?.length) {
    accountsQuery = accountsQuery.in('network', networks);
  }

  const { data: accounts } = await accountsQuery;
  const accountIds = accounts?.map((a: any) => a.id) || [];

  if (!accountIds.length) {
    return { trends: [], labels: [] };
  }

  // Buscar histórico de métricas
  const { data: history } = await supabase
    .from('social_account_metrics_history')
    .select('*')
    .in('account_id', accountIds)
    .gte('recorded_at', start.toISOString())
    .lte('recorded_at', end.toISOString())
    .order('recorded_at', { ascending: true });

  // Agrupar por data
  const groupedByDate = (history || []).reduce((acc: any, item: any) => {
    const date = item.recorded_at.split('T')[0];
    if (!acc[date]) {
      acc[date] = { followers: 0, engagement: 0, impressions: 0, count: 0 };
    }
    acc[date].followers += item.followers_count || 0;
    acc[date].engagement += item.engagement_rate || 0;
    acc[date].impressions += item.impressions || 0;
    acc[date].count++;
    return acc;
  }, {});

  // Converter para arrays
  const labels = Object.keys(groupedByDate).sort();
  const trends = {
    followers: labels.map((date) => groupedByDate[date].followers),
    engagement: labels.map(
      (date) => groupedByDate[date].engagement / groupedByDate[date].count
    ),
    impressions: labels.map((date) => groupedByDate[date].impressions),
  };

  return { trends, labels };
}

async function getTopPosts(
  supabase: any,
  userId: string,
  start: Date,
  end: Date,
  networks?: SocialNetwork[],
  limit: number = 10
) {
  // Buscar contas do usuário
  let accountsQuery = supabase
    .from('social_accounts')
    .select('id')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (networks?.length) {
    accountsQuery = accountsQuery.in('network', networks);
  }

  const { data: accounts } = await accountsQuery;
  const accountIds = accounts?.map((a: any) => a.id) || [];

  if (!accountIds.length) {
    return [];
  }

  // Buscar posts com métricas
  const { data: posts } = await supabase
    .from('social_posts')
    .select(`
      *,
      social_accounts (
        account_name,
        account_username,
        network,
        profile_picture_url
      ),
      social_post_metrics (*)
    `)
    .in('account_id', accountIds)
    .eq('status', 'published')
    .gte('published_at', start.toISOString())
    .lte('published_at', end.toISOString())
    .order('published_at', { ascending: false });

  // Ordenar por engagement
  const sorted = (posts || [])
    .map((post: any) => ({
      ...post,
      engagementScore:
        (post.social_post_metrics?.[0]?.likes || 0) * 1 +
        (post.social_post_metrics?.[0]?.comments || 0) * 2 +
        (post.social_post_metrics?.[0]?.shares || 0) * 3 +
        (post.social_post_metrics?.[0]?.saves || 0) * 2,
    }))
    .sort((a: any, b: any) => b.engagementScore - a.engagementScore)
    .slice(0, limit);

  return sorted;
}

function calculateAverageMetrics(metrics: any[]) {
  if (!metrics.length) {
    return {
      impressions: 0,
      reach: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
    };
  }

  const sum = metrics.reduce(
    (acc, m) => ({
      impressions: acc.impressions + (m.impressions || 0),
      reach: acc.reach + (m.reach || 0),
      likes: acc.likes + (m.likes || 0),
      comments: acc.comments + (m.comments || 0),
      shares: acc.shares + (m.shares || 0),
      saves: acc.saves + (m.saves || 0),
    }),
    { impressions: 0, reach: 0, likes: 0, comments: 0, shares: 0, saves: 0 }
  );

  return {
    impressions: Math.round(sum.impressions / metrics.length),
    reach: Math.round(sum.reach / metrics.length),
    likes: Math.round(sum.likes / metrics.length),
    comments: Math.round(sum.comments / metrics.length),
    shares: Math.round(sum.shares / metrics.length),
    saves: Math.round(sum.saves / metrics.length),
  };
}

function calculatePerformanceVsAverage(current: any, average: any) {
  if (!current || !average) return null;

  const calc = (curr: number, avg: number) => {
    if (avg === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - avg) / avg) * 100);
  };

  return {
    impressions: calc(current.impressions || 0, average.impressions),
    reach: calc(current.reach || 0, average.reach),
    likes: calc(current.likes || 0, average.likes),
    comments: calc(current.comments || 0, average.comments),
    shares: calc(current.shares || 0, average.shares),
    saves: calc(current.saves || 0, average.saves),
    overall:
      calc(current.likes || 0, average.likes) * 0.3 +
      calc(current.comments || 0, average.comments) * 0.3 +
      calc(current.shares || 0, average.shares) * 0.2 +
      calc(current.saves || 0, average.saves) * 0.2,
  };
}
