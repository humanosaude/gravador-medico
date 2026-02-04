/**
 * Social Flow - Instagram Analytics
 * 
 * Coleta e processa métricas do Instagram
 */

import { InstagramAPI, InstagramInsight, InstagramMedia } from './api';
import { SocialAccount } from '../../types';

// Métricas disponíveis para conta
const ACCOUNT_METRICS = {
  day: [
    'impressions',
    'reach',
    'profile_views',
    'follower_count',
    'email_contacts',
    'phone_call_clicks',
    'text_message_clicks',
    'get_directions_clicks',
    'website_clicks',
  ],
  week: [
    'impressions',
    'reach',
  ],
  days_28: [
    'impressions',
    'reach',
  ],
  lifetime: [
    'audience_city',
    'audience_country',
    'audience_gender_age',
    'audience_locale',
  ],
};

// Métricas disponíveis para mídia
const MEDIA_METRICS = {
  image: ['engagement', 'impressions', 'reach', 'saved'],
  video: ['engagement', 'impressions', 'reach', 'saved', 'video_views'],
  carousel: ['carousel_album_engagement', 'carousel_album_impressions', 'carousel_album_reach', 'carousel_album_saved'],
  reels: ['plays', 'reach', 'likes', 'comments', 'shares', 'saved', 'total_interactions'],
  story: ['exits', 'impressions', 'reach', 'replies', 'taps_forward', 'taps_back'],
};

export interface AccountAnalytics {
  date: string;
  impressions: number;
  reach: number;
  profileViews: number;
  followerCount: number;
  websiteClicks: number;
  emailContacts: number;
  phoneCallClicks: number;
  getDirectionsClicks: number;
}

export interface MediaAnalytics {
  mediaId: string;
  mediaType: string;
  permalink: string;
  timestamp: string;
  engagement: number;
  impressions: number;
  reach: number;
  saved: number;
  likes: number;
  comments: number;
  videoViews?: number;
  shares?: number;
  engagementRate: number;
}

export interface AudienceDemographics {
  cities: Array<{ name: string; value: number }>;
  countries: Array<{ code: string; name: string; value: number }>;
  genderAge: Array<{ gender: string; age: string; value: number }>;
  locales: Array<{ code: string; value: number }>;
}

export interface BestTimesAnalysis {
  bestDays: Array<{ day: string; score: number }>;
  bestHours: Array<{ hour: number; score: number }>;
  bestTimeslots: Array<{ day: string; hour: number; score: number }>;
}

export interface ContentPerformance {
  topPosts: MediaAnalytics[];
  avgEngagement: number;
  avgReach: number;
  avgImpressions: number;
  totalPosts: number;
  reachGrowth: number;
  engagementGrowth: number;
}

export class InstagramAnalytics {
  private api: InstagramAPI;
  private account: SocialAccount;

  constructor(account: SocialAccount) {
    this.account = account;
    this.api = new InstagramAPI(account);
  }

  /**
   * Obtém métricas da conta para um período
   */
  async getAccountAnalytics(
    period: 'day' | 'week' | 'days_28' = 'day'
  ): Promise<AccountAnalytics | null> {
    const metrics = ACCOUNT_METRICS[period];
    const response = await this.api.getAccountInsights(metrics, period);

    if (!response.success || !response.data) {
      console.error('Failed to get account analytics:', response.error);
      return null;
    }

    return this.parseAccountInsights(response.data);
  }

  /**
   * Obtém dados demográficos da audiência
   */
  async getAudienceDemographics(): Promise<AudienceDemographics | null> {
    const metrics = ACCOUNT_METRICS.lifetime;
    const response = await this.api.getAccountInsights(metrics, 'lifetime');

    if (!response.success || !response.data) {
      console.error('Failed to get audience demographics:', response.error);
      return null;
    }

    return this.parseAudienceDemographics(response.data);
  }

  /**
   * Obtém métricas de uma mídia específica
   */
  async getMediaAnalytics(
    mediaId: string,
    mediaType: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM' | 'REELS'
  ): Promise<MediaAnalytics | null> {
    let metrics: string[];

    switch (mediaType) {
      case 'VIDEO':
        metrics = MEDIA_METRICS.video;
        break;
      case 'CAROUSEL_ALBUM':
        metrics = MEDIA_METRICS.carousel;
        break;
      case 'REELS':
        metrics = MEDIA_METRICS.reels;
        break;
      default:
        metrics = MEDIA_METRICS.image;
    }

    const [insightsResponse, mediaResponse] = await Promise.all([
      this.api.getMediaInsights(mediaId, metrics),
      this.api.getMediaById(mediaId),
    ]);

    if (!insightsResponse.success || !mediaResponse.success) {
      return null;
    }

    return this.parseMediaInsights(
      insightsResponse.data!,
      mediaResponse.data!,
      mediaType
    );
  }

  /**
   * Obtém performance de conteúdo recente
   */
  async getContentPerformance(limit: number = 50): Promise<ContentPerformance | null> {
    const mediaResponse = await this.api.getMedia(limit);

    if (!mediaResponse.success || !mediaResponse.data) {
      return null;
    }

    const mediaItems = mediaResponse.data;
    const analyticsPromises = mediaItems.map(media =>
      this.getMediaAnalytics(media.id, media.mediaType)
    );

    const analyticsResults = await Promise.all(analyticsPromises);
    const validAnalytics = analyticsResults.filter(a => a !== null) as MediaAnalytics[];

    // Calcular métricas agregadas
    const totalPosts = validAnalytics.length;
    const totalEngagement = validAnalytics.reduce((sum, a) => sum + a.engagement, 0);
    const totalReach = validAnalytics.reduce((sum, a) => sum + a.reach, 0);
    const totalImpressions = validAnalytics.reduce((sum, a) => sum + a.impressions, 0);

    // Ordenar por engagement
    const topPosts = [...validAnalytics]
      .sort((a, b) => b.engagement - a.engagement)
      .slice(0, 10);

    return {
      topPosts,
      avgEngagement: totalPosts > 0 ? totalEngagement / totalPosts : 0,
      avgReach: totalPosts > 0 ? totalReach / totalPosts : 0,
      avgImpressions: totalPosts > 0 ? totalImpressions / totalPosts : 0,
      totalPosts,
      reachGrowth: 0, // TODO: Calcular com base em dados históricos
      engagementGrowth: 0,
    };
  }

  /**
   * Analisa melhores horários para postar
   */
  async analyzeBestTimes(): Promise<BestTimesAnalysis | null> {
    const mediaResponse = await this.api.getMedia(100);

    if (!mediaResponse.success || !mediaResponse.data) {
      return null;
    }

    const mediaItems = mediaResponse.data;
    const analyticsPromises = mediaItems.map(async media => {
      const analytics = await this.getMediaAnalytics(media.id, media.mediaType);
      if (analytics) {
        return {
          ...analytics,
          postDate: new Date(media.timestamp),
        };
      }
      return null;
    });

    const results = await Promise.all(analyticsPromises);
    const validResults = results.filter(r => r !== null) as Array<MediaAnalytics & { postDate: Date }>;

    // Agrupar por dia da semana e hora
    const dayScores: Record<string, { total: number; count: number }> = {};
    const hourScores: Record<number, { total: number; count: number }> = {};
    const timeslotScores: Record<string, { total: number; count: number }> = {};

    const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

    for (const result of validResults) {
      const day = days[result.postDate.getDay()];
      const hour = result.postDate.getHours();
      const timeslot = `${day}-${hour}`;

      // Score baseado em engagement rate
      const score = result.engagementRate;

      // Por dia
      if (!dayScores[day]) dayScores[day] = { total: 0, count: 0 };
      dayScores[day].total += score;
      dayScores[day].count++;

      // Por hora
      if (!hourScores[hour]) hourScores[hour] = { total: 0, count: 0 };
      hourScores[hour].total += score;
      hourScores[hour].count++;

      // Por timeslot
      if (!timeslotScores[timeslot]) timeslotScores[timeslot] = { total: 0, count: 0 };
      timeslotScores[timeslot].total += score;
      timeslotScores[timeslot].count++;
    }

    // Calcular médias e ordenar
    const bestDays = Object.entries(dayScores)
      .map(([day, data]) => ({
        day,
        score: data.count > 0 ? data.total / data.count : 0,
      }))
      .sort((a, b) => b.score - a.score);

    const bestHours = Object.entries(hourScores)
      .map(([hour, data]) => ({
        hour: parseInt(hour),
        score: data.count > 0 ? data.total / data.count : 0,
      }))
      .sort((a, b) => b.score - a.score);

    const bestTimeslots = Object.entries(timeslotScores)
      .map(([timeslot, data]) => {
        const [day, hour] = timeslot.split('-');
        return {
          day,
          hour: parseInt(hour),
          score: data.count > 0 ? data.total / data.count : 0,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    return {
      bestDays,
      bestHours,
      bestTimeslots,
    };
  }

  /**
   * Obtém crescimento de seguidores
   */
  async getFollowerGrowth(days: number = 30): Promise<{
    current: number;
    change: number;
    changePercent: number;
    history: Array<{ date: string; count: number }>;
  } | null> {
    const accountInfo = await this.api.getAccountInfo();

    if (!accountInfo.success || !accountInfo.data) {
      return null;
    }

    // A API do Instagram não fornece histórico de seguidores diretamente
    // Precisamos armazenar esses dados diariamente no banco
    // Por enquanto, retornamos apenas o valor atual
    return {
      current: accountInfo.data.followers_count,
      change: 0,
      changePercent: 0,
      history: [{
        date: new Date().toISOString().split('T')[0],
        count: accountInfo.data.followers_count,
      }],
    };
  }

  /**
   * Obtém hashtags mais efetivas
   */
  async getTopHashtags(limit: number = 50): Promise<Array<{
    hashtag: string;
    usage: number;
    avgEngagement: number;
    avgReach: number;
  }>> {
    const mediaResponse = await this.api.getMedia(limit);

    if (!mediaResponse.success || !mediaResponse.data) {
      return [];
    }

    const hashtagStats: Record<string, {
      usage: number;
      totalEngagement: number;
      totalReach: number;
    }> = {};

    for (const media of mediaResponse.data) {
      const analytics = await this.getMediaAnalytics(media.id, media.mediaType);
      
      if (analytics && media.caption) {
        // Extrair hashtags da caption
        const hashtags = media.caption.match(/#[\w\u00C0-\u00FF]+/g) || [];
        
        for (const hashtag of hashtags) {
          const tag = hashtag.toLowerCase();
          if (!hashtagStats[tag]) {
            hashtagStats[tag] = { usage: 0, totalEngagement: 0, totalReach: 0 };
          }
          hashtagStats[tag].usage++;
          hashtagStats[tag].totalEngagement += analytics.engagement;
          hashtagStats[tag].totalReach += analytics.reach;
        }
      }
    }

    return Object.entries(hashtagStats)
      .map(([hashtag, stats]) => ({
        hashtag,
        usage: stats.usage,
        avgEngagement: stats.usage > 0 ? stats.totalEngagement / stats.usage : 0,
        avgReach: stats.usage > 0 ? stats.totalReach / stats.usage : 0,
      }))
      .sort((a, b) => b.avgEngagement - a.avgEngagement)
      .slice(0, 20);
  }

  // =======================
  // PRIVATE HELPERS
  // =======================

  private parseAccountInsights(insights: InstagramInsight[]): AccountAnalytics {
    const getValue = (name: string): number => {
      const insight = insights.find(i => i.name === name);
      return insight?.values[0]?.value || 0;
    };

    return {
      date: new Date().toISOString().split('T')[0],
      impressions: getValue('impressions'),
      reach: getValue('reach'),
      profileViews: getValue('profile_views'),
      followerCount: getValue('follower_count'),
      websiteClicks: getValue('website_clicks'),
      emailContacts: getValue('email_contacts'),
      phoneCallClicks: getValue('phone_call_clicks'),
      getDirectionsClicks: getValue('get_directions_clicks'),
    };
  }

  private parseAudienceDemographics(insights: InstagramInsight[]): AudienceDemographics {
    const cities: Array<{ name: string; value: number }> = [];
    const countries: Array<{ code: string; name: string; value: number }> = [];
    const genderAge: Array<{ gender: string; age: string; value: number }> = [];
    const locales: Array<{ code: string; value: number }> = [];

    for (const insight of insights) {
      const value = insight.values[0]?.value;
      if (!value || typeof value !== 'object') continue;

      switch (insight.name) {
        case 'audience_city':
          for (const [name, count] of Object.entries(value)) {
            cities.push({ name, value: count as number });
          }
          break;

        case 'audience_country':
          for (const [code, count] of Object.entries(value)) {
            countries.push({ code, name: code, value: count as number });
          }
          break;

        case 'audience_gender_age':
          for (const [key, count] of Object.entries(value)) {
            const [gender, age] = key.split('.');
            genderAge.push({
              gender: gender === 'M' ? 'Masculino' : 'Feminino',
              age,
              value: count as number,
            });
          }
          break;

        case 'audience_locale':
          for (const [code, count] of Object.entries(value)) {
            locales.push({ code, value: count as number });
          }
          break;
      }
    }

    // Ordenar por valor
    cities.sort((a, b) => b.value - a.value);
    countries.sort((a, b) => b.value - a.value);
    genderAge.sort((a, b) => b.value - a.value);
    locales.sort((a, b) => b.value - a.value);

    return { cities, countries, genderAge, locales };
  }

  private parseMediaInsights(
    insights: InstagramInsight[],
    media: InstagramMedia,
    mediaType: string
  ): MediaAnalytics {
    const getValue = (name: string): number => {
      const insight = insights.find(i => i.name === name || i.name.includes(name));
      return insight?.values[0]?.value || 0;
    };

    // Engagement pode estar em diferentes campos dependendo do tipo
    let engagement = getValue('engagement') || getValue('total_interactions');
    let impressions = getValue('impressions') || getValue('carousel_album_impressions');
    let reach = getValue('reach') || getValue('carousel_album_reach');
    let saved = getValue('saved') || getValue('carousel_album_saved');

    // Para Reels
    const shares = getValue('shares');
    const videoViews = getValue('video_views') || getValue('plays');

    // Se não tiver engagement calculado, calcular
    if (!engagement) {
      engagement = (media.likeCount || 0) + (media.commentsCount || 0) + saved + shares;
    }

    // Taxa de engagement
    const engagementRate = reach > 0 ? (engagement / reach) * 100 : 0;

    return {
      mediaId: media.id,
      mediaType,
      permalink: media.permalink,
      timestamp: media.timestamp,
      engagement,
      impressions,
      reach,
      saved,
      likes: media.likeCount || 0,
      comments: media.commentsCount || 0,
      videoViews: videoViews || undefined,
      shares: shares || undefined,
      engagementRate,
    };
  }
}
