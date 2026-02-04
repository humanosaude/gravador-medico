/**
 * Social Flow - Analytics Aggregator
 * 
 * Agrega métricas de todas as redes sociais conectadas
 */

import { createClient } from '@supabase/supabase-js';
import { SocialAccount, SocialNetwork } from '../types';
import { getAnalyticsForAccount, isNetworkConfigured } from '../networks';

export interface AggregatedMetrics {
  overview: {
    totalFollowers: number;
    totalFollowersChange: number;
    totalReach: number;
    totalImpressions: number;
    totalEngagements: number;
    avgEngagementRate: number;
    totalPosts: number;
    postsThisWeek: number;
  };
  byNetwork: Record<SocialNetwork, NetworkMetrics>;
  trends: {
    followers: TrendData[];
    reach: TrendData[];
    engagement: TrendData[];
  };
  topContent: TopContent[];
  bestTimes: BestTimeSlot[];
  audienceGrowth: AudienceGrowth;
}

export interface NetworkMetrics {
  network: SocialNetwork;
  followers: number;
  followersChange: number;
  reach: number;
  impressions: number;
  engagements: number;
  engagementRate: number;
  posts: number;
  isConnected: boolean;
  lastSyncedAt?: string;
}

export interface TrendData {
  date: string;
  value: number;
  network: SocialNetwork;
}

export interface TopContent {
  id: string;
  network: SocialNetwork;
  permalink: string;
  thumbnailUrl?: string;
  caption?: string;
  publishedAt: string;
  reach: number;
  engagements: number;
  engagementRate: number;
}

export interface BestTimeSlot {
  dayOfWeek: number;
  hour: number;
  score: number;
  postsCount: number;
  avgEngagement: number;
}

export interface AudienceGrowth {
  totalGrowth: number;
  growthRate: number;
  periodStart: string;
  periodEnd: string;
  byNetwork: Record<SocialNetwork, number>;
}

export class AnalyticsAggregator {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  /**
   * Obtém métricas agregadas de todas as contas
   */
  async getAggregatedMetrics(
    userId: string,
    period: 'day' | 'week' | 'month' | 'year' = 'week'
  ): Promise<AggregatedMetrics> {
    // Buscar todas as contas do usuário
    const { data: accounts, error } = await this.supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error || !accounts) {
      throw new Error('Failed to fetch accounts');
    }

    // Agregar métricas por rede
    const networkMetrics = await this.getNetworkMetrics(accounts);
    
    // Calcular overview
    const overview = this.calculateOverview(networkMetrics);
    
    // Buscar top content
    const topContent = await this.getTopContent(userId, period);
    
    // Buscar melhores horários
    const bestTimes = await this.getBestTimes(userId);
    
    // Calcular crescimento de audiência
    const audienceGrowth = await this.getAudienceGrowth(userId, period);
    
    // Buscar trends
    const trends = await this.getTrends(userId, period);

    return {
      overview,
      byNetwork: this.mapNetworkMetrics(networkMetrics),
      trends,
      topContent,
      bestTimes,
      audienceGrowth,
    };
  }

  /**
   * Obtém métricas por rede
   */
  private async getNetworkMetrics(accounts: SocialAccount[]): Promise<NetworkMetrics[]> {
    const results: NetworkMetrics[] = [];

    for (const account of accounts) {
      try {
        const analytics = getAnalyticsForAccount(account);
        
        // Buscar métricas da rede (se configurada)
        let metrics: NetworkMetrics = {
          network: account.network,
          followers: account.followers_count || 0,
          followersChange: 0,
          reach: 0,
          impressions: 0,
          engagements: 0,
          engagementRate: 0,
          posts: account.posts_count || 0,
          isConnected: account.connection_status === 'connected',
          lastSyncedAt: account.last_synced_at,
        };

        // Tentar obter métricas detalhadas da API
        if (isNetworkConfigured(account.network) && account.connection_status === 'connected') {
          try {
            const networkAnalytics = await analytics.getAccountAnalytics?.();
            if (networkAnalytics) {
              metrics = {
                ...metrics,
                reach: networkAnalytics.reach || 0,
                impressions: networkAnalytics.impressions || 0,
                engagementRate: networkAnalytics.engagementRate || 0,
              };
            }
          } catch (e) {
            console.warn(`Failed to get analytics for ${account.network}:`, e);
          }
        }

        results.push(metrics);
      } catch (error) {
        console.error(`Error getting metrics for ${account.network}:`, error);
      }
    }

    return results;
  }

  /**
   * Calcula métricas de overview
   */
  private calculateOverview(networkMetrics: NetworkMetrics[]): AggregatedMetrics['overview'] {
    const totalFollowers = networkMetrics.reduce((sum, m) => sum + m.followers, 0);
    const totalFollowersChange = networkMetrics.reduce((sum, m) => sum + m.followersChange, 0);
    const totalReach = networkMetrics.reduce((sum, m) => sum + m.reach, 0);
    const totalImpressions = networkMetrics.reduce((sum, m) => sum + m.impressions, 0);
    const totalEngagements = networkMetrics.reduce((sum, m) => sum + m.engagements, 0);
    const totalPosts = networkMetrics.reduce((sum, m) => sum + m.posts, 0);

    // Calcular média de engagement rate
    const connectedNetworks = networkMetrics.filter(m => m.isConnected);
    const avgEngagementRate = connectedNetworks.length > 0
      ? connectedNetworks.reduce((sum, m) => sum + m.engagementRate, 0) / connectedNetworks.length
      : 0;

    return {
      totalFollowers,
      totalFollowersChange,
      totalReach,
      totalImpressions,
      totalEngagements,
      avgEngagementRate,
      totalPosts,
      postsThisWeek: 0, // TODO: Calcular do banco
    };
  }

  /**
   * Mapeia métricas para objeto por rede
   */
  private mapNetworkMetrics(metrics: NetworkMetrics[]): Record<SocialNetwork, NetworkMetrics> {
    const result: Partial<Record<SocialNetwork, NetworkMetrics>> = {};
    
    for (const m of metrics) {
      result[m.network] = m;
    }

    // Adicionar redes não conectadas
    const allNetworks: SocialNetwork[] = [
      'instagram', 'facebook', 'twitter', 'linkedin', 
      'youtube', 'tiktok', 'pinterest'
    ];

    for (const network of allNetworks) {
      if (!result[network]) {
        result[network] = {
          network,
          followers: 0,
          followersChange: 0,
          reach: 0,
          impressions: 0,
          engagements: 0,
          engagementRate: 0,
          posts: 0,
          isConnected: false,
        };
      }
    }

    return result as Record<SocialNetwork, NetworkMetrics>;
  }

  /**
   * Obtém top content do período
   */
  private async getTopContent(userId: string, period: string): Promise<TopContent[]> {
    const startDate = this.getPeriodStartDate(period);

    const { data: posts, error } = await this.supabase
      .from('posts')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'published')
      .gte('published_at', startDate.toISOString())
      .order('engagement', { ascending: false })
      .limit(10);

    if (error || !posts) return [];

    return posts.map((post: any) => ({
      id: post.id,
      network: post.network,
      permalink: post.platform_permalink || '',
      caption: post.caption,
      publishedAt: post.published_at,
      reach: post.reach || 0,
      engagements: post.engagement || 0,
      engagementRate: post.engagement_rate || 0,
    }));
  }

  /**
   * Obtém melhores horários para postar
   */
  private async getBestTimes(userId: string): Promise<BestTimeSlot[]> {
    const { data, error } = await this.supabase
      .from('best_times_analysis')
      .select('*')
      .eq('user_id', userId)
      .order('engagement_score', { ascending: false })
      .limit(10);

    if (error || !data) return [];

    return data.map((row: any) => ({
      dayOfWeek: row.day_of_week,
      hour: row.hour_of_day,
      score: row.engagement_score,
      postsCount: row.posts_analyzed,
      avgEngagement: row.avg_engagement,
    }));
  }

  /**
   * Calcula crescimento de audiência
   */
  private async getAudienceGrowth(userId: string, period: string): Promise<AudienceGrowth> {
    const startDate = this.getPeriodStartDate(period);
    
    // Buscar histórico de analytics
    const { data: history, error } = await this.supabase
      .from('account_analytics_daily')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (error || !history || history.length < 2) {
      return {
        totalGrowth: 0,
        growthRate: 0,
        periodStart: startDate.toISOString(),
        periodEnd: new Date().toISOString(),
        byNetwork: {} as Record<SocialNetwork, number>,
      };
    }

    // Calcular crescimento por rede
    const byNetwork: Partial<Record<SocialNetwork, number>> = {};
    const networks = [...new Set(history.map((h: any) => h.network))];

    for (const network of networks) {
      const networkHistory = history.filter((h: any) => h.network === network);
      if (networkHistory.length >= 2) {
        const first = networkHistory[0].followers_count || 0;
        const last = networkHistory[networkHistory.length - 1].followers_count || 0;
        byNetwork[network as SocialNetwork] = last - first;
      }
    }

    const totalGrowth = Object.values(byNetwork).reduce((sum, v) => sum + v, 0);
    const firstTotal = history[0]?.followers_count || 1;
    const growthRate = (totalGrowth / firstTotal) * 100;

    return {
      totalGrowth,
      growthRate,
      periodStart: startDate.toISOString(),
      periodEnd: new Date().toISOString(),
      byNetwork: byNetwork as Record<SocialNetwork, number>,
    };
  }

  /**
   * Obtém dados de tendência
   */
  private async getTrends(userId: string, period: string): Promise<AggregatedMetrics['trends']> {
    const startDate = this.getPeriodStartDate(period);

    const { data: history, error } = await this.supabase
      .from('account_analytics_daily')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (error || !history) {
      return { followers: [], reach: [], engagement: [] };
    }

    const followers: TrendData[] = history.map((h: any) => ({
      date: h.date,
      value: h.followers_count || 0,
      network: h.network,
    }));

    const reach: TrendData[] = history.map((h: any) => ({
      date: h.date,
      value: h.reach || 0,
      network: h.network,
    }));

    const engagement: TrendData[] = history.map((h: any) => ({
      date: h.date,
      value: h.engagement || 0,
      network: h.network,
    }));

    return { followers, reach, engagement };
  }

  /**
   * Helper para obter data de início do período
   */
  private getPeriodStartDate(period: string): Date {
    const now = new Date();
    switch (period) {
      case 'day':
        return new Date(now.setDate(now.getDate() - 1));
      case 'week':
        return new Date(now.setDate(now.getDate() - 7));
      case 'month':
        return new Date(now.setMonth(now.getMonth() - 1));
      case 'year':
        return new Date(now.setFullYear(now.getFullYear() - 1));
      default:
        return new Date(now.setDate(now.getDate() - 7));
    }
  }

  /**
   * Sincroniza métricas de todas as contas
   */
  async syncAllMetrics(userId: string): Promise<{ synced: number; errors: number }> {
    const { data: accounts, error } = await this.supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error || !accounts) {
      return { synced: 0, errors: 0 };
    }

    let synced = 0;
    let errors = 0;

    for (const account of accounts) {
      try {
        if (isNetworkConfigured(account.network) && account.connection_status === 'connected') {
          const analytics = getAnalyticsForAccount(account);
          const metrics = await analytics.getAccountAnalytics?.();
          
          if (metrics) {
            // Salvar no histórico
            await this.supabase
              .from('account_analytics_daily')
              .upsert({
                account_id: account.id,
                user_id: userId,
                network: account.network,
                date: new Date().toISOString().split('T')[0],
                followers_count: metrics.followerCount || account.followers_count,
                reach: metrics.reach || 0,
                impressions: metrics.impressions || 0,
                engagement: metrics.engagement || 0,
              });

            // Atualizar conta
            await this.supabase
              .from('social_accounts')
              .update({
                followers_count: metrics.followerCount || account.followers_count,
                last_synced_at: new Date().toISOString(),
              })
              .eq('id', account.id);

            synced++;
          }
        }
      } catch (e) {
        console.error(`Failed to sync ${account.network}:`, e);
        errors++;
      }
    }

    return { synced, errors };
  }
}

// Singleton
export const analyticsAggregator = new AnalyticsAggregator();
