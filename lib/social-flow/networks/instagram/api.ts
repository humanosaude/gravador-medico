/**
 * Social Flow - Instagram Graph API
 * 
 * Cliente para Instagram Graph API v21.0
 * Inclui rate limiting e retry automático
 */

import { SocialAccount } from '../../types';

const GRAPH_API_VERSION = 'v21.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

// Rate Limits do Instagram
const RATE_LIMITS = {
  POSTS_PER_DAY: 25,           // Máximo de posts por dia
  REQUESTS_PER_HOUR: 200,      // Requests por hora por usuário
  COMMENTS_PER_HOUR: 60,       // Comentários por hora
  REPLIES_PER_COMMENT: 3,      // Respostas por comentário
};

export interface InstagramMedia {
  id: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM' | 'REELS';
  mediaUrl?: string;
  thumbnailUrl?: string;
  caption?: string;
  permalink: string;
  timestamp: string;
  likeCount?: number;
  commentsCount?: number;
  username: string;
  children?: InstagramMedia[];
}

export interface InstagramComment {
  id: string;
  text: string;
  timestamp: string;
  username: string;
  likeCount: number;
  replies?: InstagramComment[];
}

export interface InstagramInsight {
  name: string;
  period: string;
  values: {
    value: number;
    end_time?: string;
  }[];
  title: string;
  description: string;
}

export interface MediaContainerStatus {
  id: string;
  status: 'IN_PROGRESS' | 'FINISHED' | 'ERROR' | 'EXPIRED' | 'PUBLISHED';
  statusCode?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: number;
    message: string;
    type: string;
    fbtrace_id?: string;
  };
  paging?: {
    cursors: { before: string; after: string };
    next?: string;
    previous?: string;
  };
}

export class InstagramAPI {
  private accountId: string;
  private accessToken: string;
  private requestCount: number = 0;
  private lastRequestTime: number = 0;

  constructor(account: SocialAccount) {
    this.accountId = account.platform_account_id;
    this.accessToken = account.access_token;
  }

  /**
   * Faz uma requisição à API do Instagram com rate limiting
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retries: number = 3
  ): Promise<ApiResponse<T>> {
    // Rate limiting simples
    await this.checkRateLimit();

    const url = endpoint.startsWith('http') 
      ? endpoint 
      : `${GRAPH_API_BASE}${endpoint}`;

    const separator = url.includes('?') ? '&' : '?';
    const fullUrl = `${url}${separator}access_token=${this.accessToken}`;

    try {
      const response = await fetch(fullUrl, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      this.requestCount++;
      this.lastRequestTime = Date.now();

      const data = await response.json();

      if (!response.ok) {
        // Retry em caso de rate limit
        if (response.status === 429 && retries > 0) {
          const waitTime = parseInt(response.headers.get('Retry-After') || '60') * 1000;
          await this.wait(waitTime);
          return this.request(endpoint, options, retries - 1);
        }

        return {
          success: false,
          error: data.error || {
            code: response.status,
            message: data.message || 'Unknown error',
            type: 'OAuthException',
          },
        };
      }

      return {
        success: true,
        data: data.data ?? data,
        paging: data.paging,
      };
    } catch (error: any) {
      // Retry em caso de erro de rede
      if (retries > 0) {
        await this.wait(1000);
        return this.request(endpoint, options, retries - 1);
      }

      return {
        success: false,
        error: {
          code: 0,
          message: error.message || 'Network error',
          type: 'NetworkException',
        },
      };
    }
  }

  private async checkRateLimit(): Promise<void> {
    // Espera se muitas requisições em pouco tempo
    if (this.requestCount >= RATE_LIMITS.REQUESTS_PER_HOUR) {
      const hourAgo = Date.now() - 3600000;
      if (this.lastRequestTime > hourAgo) {
        const waitTime = this.lastRequestTime - hourAgo + 1000;
        await this.wait(waitTime);
        this.requestCount = 0;
      } else {
        this.requestCount = 0;
      }
    }
  }

  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // =======================
  // ACCOUNT ENDPOINTS
  // =======================

  /**
   * Obtém informações da conta
   */
  async getAccountInfo(): Promise<ApiResponse<{
    id: string;
    username: string;
    name: string;
    biography: string;
    website: string;
    followers_count: number;
    follows_count: number;
    media_count: number;
    profile_picture_url: string;
  }>> {
    const fields = [
      'id', 'username', 'name', 'biography', 'website',
      'followers_count', 'follows_count', 'media_count',
      'profile_picture_url',
    ].join(',');

    return this.request(`/${this.accountId}?fields=${fields}`);
  }

  // =======================
  // MEDIA ENDPOINTS
  // =======================

  /**
   * Lista as mídias da conta
   */
  async getMedia(limit: number = 25, after?: string): Promise<ApiResponse<InstagramMedia[]>> {
    const fields = [
      'id', 'media_type', 'media_url', 'thumbnail_url',
      'caption', 'permalink', 'timestamp', 'like_count',
      'comments_count', 'username', 'children{id,media_type,media_url}',
    ].join(',');

    let endpoint = `/${this.accountId}/media?fields=${fields}&limit=${limit}`;
    if (after) {
      endpoint += `&after=${after}`;
    }

    const response = await this.request<any[]>(endpoint);

    if (response.success && response.data) {
      return {
        ...response,
        data: response.data.map(this.transformMedia),
      };
    }

    return response as ApiResponse<InstagramMedia[]>;
  }

  /**
   * Obtém uma mídia específica
   */
  async getMediaById(mediaId: string): Promise<ApiResponse<InstagramMedia>> {
    const fields = [
      'id', 'media_type', 'media_url', 'thumbnail_url',
      'caption', 'permalink', 'timestamp', 'like_count',
      'comments_count', 'username', 'children{id,media_type,media_url}',
    ].join(',');

    const response = await this.request<any>(`/${mediaId}?fields=${fields}`);

    if (response.success && response.data) {
      return {
        ...response,
        data: this.transformMedia(response.data),
      };
    }

    return response as ApiResponse<InstagramMedia>;
  }

  private transformMedia(media: any): InstagramMedia {
    return {
      id: media.id,
      mediaType: media.media_type,
      mediaUrl: media.media_url,
      thumbnailUrl: media.thumbnail_url,
      caption: media.caption,
      permalink: media.permalink,
      timestamp: media.timestamp,
      likeCount: media.like_count,
      commentsCount: media.comments_count,
      username: media.username,
      children: media.children?.data?.map((child: any) => ({
        id: child.id,
        mediaType: child.media_type,
        mediaUrl: child.media_url,
      })),
    };
  }

  // =======================
  // PUBLISHING ENDPOINTS
  // =======================

  /**
   * Cria um container de mídia (passo 1 da publicação)
   */
  async createMediaContainer(params: {
    imageUrl?: string;
    videoUrl?: string;
    caption?: string;
    isCarousel?: boolean;
    carouselChildren?: string[];
    coverUrl?: string;
    shareToFeed?: boolean;
    locationId?: string;
    userTags?: { username: string; x: number; y: number }[];
  }): Promise<ApiResponse<{ id: string }>> {
    const body: Record<string, any> = {};

    if (params.isCarousel && params.carouselChildren) {
      // Carousel post
      body.media_type = 'CAROUSEL';
      body.children = params.carouselChildren;
    } else if (params.videoUrl) {
      // Video/Reels
      body.video_url = params.videoUrl;
      body.media_type = 'REELS';
      if (params.coverUrl) {
        body.cover_url = params.coverUrl;
      }
      if (params.shareToFeed !== undefined) {
        body.share_to_feed = params.shareToFeed;
      }
    } else if (params.imageUrl) {
      // Single image
      body.image_url = params.imageUrl;
    }

    if (params.caption) {
      body.caption = params.caption;
    }

    if (params.locationId) {
      body.location_id = params.locationId;
    }

    if (params.userTags && params.userTags.length > 0) {
      body.user_tags = params.userTags.map(tag => ({
        username: tag.username,
        x: tag.x,
        y: tag.y,
      }));
    }

    return this.request(`/${this.accountId}/media`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  /**
   * Cria um item de carousel (para posts de múltiplas imagens)
   */
  async createCarouselItem(params: {
    imageUrl?: string;
    videoUrl?: string;
  }): Promise<ApiResponse<{ id: string }>> {
    const body: Record<string, any> = {
      is_carousel_item: true,
    };

    if (params.videoUrl) {
      body.video_url = params.videoUrl;
      body.media_type = 'VIDEO';
    } else if (params.imageUrl) {
      body.image_url = params.imageUrl;
    }

    return this.request(`/${this.accountId}/media`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  /**
   * Verifica o status de um container de mídia
   */
  async getContainerStatus(containerId: string): Promise<ApiResponse<MediaContainerStatus>> {
    return this.request(`/${containerId}?fields=id,status,status_code`);
  }

  /**
   * Aguarda o container ficar pronto (para vídeos)
   */
  async waitForContainer(
    containerId: string,
    maxWaitMs: number = 300000, // 5 minutos
    pollIntervalMs: number = 5000
  ): Promise<ApiResponse<MediaContainerStatus>> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      const status = await this.getContainerStatus(containerId);

      if (!status.success) {
        return status;
      }

      if (status.data?.status === 'FINISHED') {
        return status;
      }

      if (status.data?.status === 'ERROR' || status.data?.status === 'EXPIRED') {
        return {
          success: false,
          error: {
            code: 0,
            message: `Container ${status.data.status}: ${status.data.statusCode}`,
            type: 'ContainerError',
          },
        };
      }

      await this.wait(pollIntervalMs);
    }

    return {
      success: false,
      error: {
        code: 0,
        message: 'Container processing timeout',
        type: 'TimeoutError',
      },
    };
  }

  /**
   * Publica um container (passo 2 da publicação)
   */
  async publishContainer(containerId: string): Promise<ApiResponse<{ id: string }>> {
    return this.request(`/${this.accountId}/media_publish`, {
      method: 'POST',
      body: JSON.stringify({ creation_id: containerId }),
    });
  }

  // =======================
  // COMMENTS ENDPOINTS
  // =======================

  /**
   * Lista comentários de uma mídia
   */
  async getComments(mediaId: string, limit: number = 50): Promise<ApiResponse<InstagramComment[]>> {
    const response = await this.request<any[]>(
      `/${mediaId}/comments?fields=id,text,timestamp,username,like_count,replies{id,text,timestamp,username,like_count}&limit=${limit}`
    );

    if (response.success && response.data) {
      return {
        ...response,
        data: response.data.map(this.transformComment),
      };
    }

    return response as ApiResponse<InstagramComment[]>;
  }

  /**
   * Responde a um comentário
   */
  async replyToComment(commentId: string, message: string): Promise<ApiResponse<{ id: string }>> {
    return this.request(`/${commentId}/replies`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  /**
   * Oculta um comentário
   */
  async hideComment(commentId: string, hide: boolean = true): Promise<ApiResponse<{ success: boolean }>> {
    return this.request(`/${commentId}`, {
      method: 'POST',
      body: JSON.stringify({ hide }),
    });
  }

  /**
   * Deleta um comentário
   */
  async deleteComment(commentId: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.request(`/${commentId}`, {
      method: 'DELETE',
    });
  }

  private transformComment(comment: any): InstagramComment {
    return {
      id: comment.id,
      text: comment.text,
      timestamp: comment.timestamp,
      username: comment.username,
      likeCount: comment.like_count,
      replies: comment.replies?.data?.map((reply: any) => ({
        id: reply.id,
        text: reply.text,
        timestamp: reply.timestamp,
        username: reply.username,
        likeCount: reply.like_count,
      })),
    };
  }

  // =======================
  // INSIGHTS ENDPOINTS
  // =======================

  /**
   * Obtém insights da conta
   */
  async getAccountInsights(
    metrics: string[],
    period: 'day' | 'week' | 'days_28' | 'lifetime' = 'day'
  ): Promise<ApiResponse<InstagramInsight[]>> {
    return this.request(
      `/${this.accountId}/insights?metric=${metrics.join(',')}&period=${period}`
    );
  }

  /**
   * Obtém insights de uma mídia
   */
  async getMediaInsights(
    mediaId: string,
    metrics: string[] = ['engagement', 'impressions', 'reach', 'saved']
  ): Promise<ApiResponse<InstagramInsight[]>> {
    return this.request(
      `/${mediaId}/insights?metric=${metrics.join(',')}`
    );
  }

  /**
   * Obtém insights de um Reel
   */
  async getReelInsights(
    mediaId: string,
    metrics: string[] = ['plays', 'reach', 'likes', 'comments', 'shares', 'saved']
  ): Promise<ApiResponse<InstagramInsight[]>> {
    return this.request(
      `/${mediaId}/insights?metric=${metrics.join(',')}`
    );
  }

  // =======================
  // HASHTAG ENDPOINTS
  // =======================

  /**
   * Busca ID de uma hashtag
   */
  async searchHashtag(hashtag: string): Promise<ApiResponse<{ id: string }[]>> {
    return this.request(
      `/ig_hashtag_search?user_id=${this.accountId}&q=${encodeURIComponent(hashtag)}`
    );
  }

  /**
   * Obtém posts recentes de uma hashtag
   */
  async getHashtagRecentMedia(
    hashtagId: string,
    limit: number = 50
  ): Promise<ApiResponse<InstagramMedia[]>> {
    const fields = 'id,media_type,media_url,caption,permalink,timestamp,like_count,comments_count';
    
    const response = await this.request<any[]>(
      `/${hashtagId}/recent_media?user_id=${this.accountId}&fields=${fields}&limit=${limit}`
    );

    if (response.success && response.data) {
      return {
        ...response,
        data: response.data.map(this.transformMedia),
      };
    }

    return response as ApiResponse<InstagramMedia[]>;
  }

  /**
   * Obtém posts mais populares de uma hashtag
   */
  async getHashtagTopMedia(
    hashtagId: string,
    limit: number = 50
  ): Promise<ApiResponse<InstagramMedia[]>> {
    const fields = 'id,media_type,media_url,caption,permalink,timestamp,like_count,comments_count';
    
    const response = await this.request<any[]>(
      `/${hashtagId}/top_media?user_id=${this.accountId}&fields=${fields}&limit=${limit}`
    );

    if (response.success && response.data) {
      return {
        ...response,
        data: response.data.map(this.transformMedia),
      };
    }

    return response as ApiResponse<InstagramMedia[]>;
  }

  // =======================
  // STORY ENDPOINTS
  // =======================

  /**
   * Lista stories da conta
   */
  async getStories(): Promise<ApiResponse<InstagramMedia[]>> {
    const fields = 'id,media_type,media_url,thumbnail_url,timestamp,permalink';
    
    const response = await this.request<any[]>(
      `/${this.accountId}/stories?fields=${fields}`
    );

    if (response.success && response.data) {
      return {
        ...response,
        data: response.data.map(this.transformMedia),
      };
    }

    return response as ApiResponse<InstagramMedia[]>;
  }

  // =======================
  // UTILITY METHODS
  // =======================

  /**
   * Verifica limite de publicações do dia
   */
  async checkPublishingLimit(): Promise<{
    canPublish: boolean;
    remainingPosts: number;
    limit: number;
  }> {
    const response = await this.request<any>(
      `/${this.accountId}/content_publishing_limit?fields=quota_usage`
    );

    if (response.success && response.data) {
      const usage = response.data.quota_usage || 0;
      return {
        canPublish: usage < RATE_LIMITS.POSTS_PER_DAY,
        remainingPosts: RATE_LIMITS.POSTS_PER_DAY - usage,
        limit: RATE_LIMITS.POSTS_PER_DAY,
      };
    }

    // Assume que pode publicar se não conseguiu verificar
    return {
      canPublish: true,
      remainingPosts: RATE_LIMITS.POSTS_PER_DAY,
      limit: RATE_LIMITS.POSTS_PER_DAY,
    };
  }

  /**
   * Obtém rate limits
   */
  getRateLimits() {
    return RATE_LIMITS;
  }
}
