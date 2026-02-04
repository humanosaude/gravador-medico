import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET - Obter analytics da conta
export async function GET(request: NextRequest) {
  try {
    const supabase = supabaseAdmin;
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const period = searchParams.get('period') || '30d';

    // Calcular datas
    const days = parseInt(period.replace('d', ''));
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Buscar conta
    let accountQuery = supabase
      .from('instagram_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (accountId) {
      accountQuery = accountQuery.eq('id', accountId);
    }

    const { data: accounts, error: accountError } = await accountQuery;

    if (accountError || !accounts?.length) {
      return NextResponse.json({
        metrics: null,
        topPosts: [],
        message: 'Nenhuma conta encontrada'
      });
    }

    const account = accounts[0];

    // Buscar analytics da conta
    const { data: accountAnalytics } = await supabase
      .from('instaflow_account_analytics')
      .select('*')
      .eq('account_id', account.id)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: false });

    // Calcular métricas agregadas
    const latestAnalytics = accountAnalytics?.[0];
    const oldestAnalytics = accountAnalytics?.[accountAnalytics.length - 1];

    const metrics = {
      followers_count: account.followers_count || 0,
      follows_count: account.follows_count || 0,
      media_count: account.media_count || 0,
      followers_gained: accountAnalytics?.reduce((sum, a) => sum + (a.followers_gained || 0), 0) || 0,
      followers_lost: accountAnalytics?.reduce((sum, a) => sum + (a.followers_lost || 0), 0) || 0,
      impressions: accountAnalytics?.reduce((sum, a) => sum + (a.impressions || 0), 0) || 0,
      reach: accountAnalytics?.reduce((sum, a) => sum + (a.reach || 0), 0) || 0,
      profile_views: accountAnalytics?.reduce((sum, a) => sum + (a.profile_views || 0), 0) || 0,
      website_clicks: accountAnalytics?.reduce((sum, a) => sum + (a.website_clicks || 0), 0) || 0,
    };

    // Buscar top posts
    const { data: posts } = await supabase
      .from('instaflow_scheduled_posts')
      .select(`
        *,
        analytics:instaflow_post_analytics(*)
      `)
      .eq('account_id', account.id)
      .eq('status', 'published')
      .gte('published_at', startDate.toISOString())
      .order('cached_likes', { ascending: false })
      .limit(10);

    const topPosts = posts?.map(post => ({
      id: post.id,
      caption: post.caption,
      post_type: post.post_type,
      instagram_permalink: post.instagram_permalink,
      published_at: post.published_at,
      media_urls: post.media_urls || [],
      impressions: post.analytics?.[0]?.impressions || 0,
      reach: post.analytics?.[0]?.reach || post.cached_reach || 0,
      likes: post.analytics?.[0]?.likes || post.cached_likes || 0,
      comments: post.analytics?.[0]?.comments || post.cached_comments || 0,
      saves: post.analytics?.[0]?.saves || 0,
      shares: post.analytics?.[0]?.shares || 0,
      engagement_rate: post.analytics?.[0]?.engagement_rate || 0,
    })) || [];

    return NextResponse.json({
      metrics,
      topPosts,
      period,
      account: {
        id: account.id,
        username: account.username,
        profile_picture_url: account.profile_picture_url,
      }
    });

  } catch (error) {
    console.error('Error in analytics API:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
