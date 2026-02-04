/**
 * InstaFlow - Instagram Graph API Wrapper
 * 
 * Funções para interagir com a Instagram Graph API
 * - Publicação de posts (Feed, Stories, Reels, Carrossel)
 * - Busca de métricas e insights
 * - Gerenciamento de mídia
 * 
 * Referências:
 * - https://developers.facebook.com/docs/instagram-api/reference
 * - https://developers.facebook.com/docs/instagram-api/guides/content-publishing
 */

// =====================================================
// TYPES
// =====================================================

export type PostType = 'feed' | 'story' | 'reel' | 'carousel';
export type MediaType = 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM' | 'REELS';

export interface MediaContainer {
  id: string;
  status?: string;
  status_code?: string;
}

export interface PublishedMedia {
  id: string;
  permalink?: string;
  timestamp?: string;
}

export interface MediaInsights {
  impressions: number;
  reach: number;
  engagement: number;
  saved: number;
  likes: number;
  comments: number;
  shares: number;
  video_views?: number;
  plays?: number;
}

export interface AccountInsights {
  impressions: number;
  reach: number;
  profile_views: number;
  website_clicks: number;
  follower_count: number;
  email_contacts: number;
  phone_call_clicks: number;
  get_directions_clicks: number;
}

export interface RecentMedia {
  id: string;
  caption?: string;
  media_type: MediaType;
  media_url?: string;
  thumbnail_url?: string;
  permalink: string;
  timestamp: string;
  like_count?: number;
  comments_count?: number;
}

export interface PublishOptions {
  caption?: string;
  mediaUrls: string[];
  mediaType: PostType;
  coverUrl?: string;
  locationId?: string;
  shareToFeed?: boolean; // Para Reels
  collaborators?: string[]; // Usernames
}

// =====================================================
// CONFIGURAÇÕES
// =====================================================

const GRAPH_API_VERSION = 'v18.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

// =====================================================
// CLASSE PRINCIPAL
// =====================================================

export class InstagramAPI {
  private accessToken: string;
  private instagramAccountId: string;

  constructor(accessToken: string, instagramAccountId: string) {
    this.accessToken = accessToken;
    this.instagramAccountId = instagramAccountId;
  }

  // =====================================================
  // MÉTODOS AUXILIARES
  // =====================================================

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = endpoint.startsWith('http')
      ? endpoint
      : `${GRAPH_API_BASE}${endpoint}`;

    const separator = url.includes('?') ? '&' : '?';
    const fullUrl = `${url}${separator}access_token=${this.accessToken}`;

    const response = await fetch(fullUrl, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[InstagramAPI] Error:', data);
      throw new Error(data.error?.message || 'Instagram API error');
    }

    return data;
  }

  // =====================================================
  // INFORMAÇÕES DA CONTA
  // =====================================================

  /**
   * Obtém informações do perfil
   */
  async getProfile(): Promise<{
    id: string;
    username: string;
    name: string;
    biography: string;
    profile_picture_url: string;
    followers_count: number;
    follows_count: number;
    media_count: number;
    website: string;
  }> {
    return this.request(
      `/${this.instagramAccountId}?fields=id,username,name,biography,profile_picture_url,followers_count,follows_count,media_count,website`
    );
  }

  /**
   * Obtém posts recentes da conta
   */
  async getRecentMedia(limit = 25): Promise<RecentMedia[]> {
    const response = await this.request<{ data: RecentMedia[] }>(
      `/${this.instagramAccountId}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count&limit=${limit}`
    );
    return response.data || [];
  }

  // =====================================================
  // PUBLICAÇÃO DE CONTEÚDO
  // =====================================================

  /**
   * Cria um container de mídia (primeiro passo da publicação)
   */
  private async createMediaContainer(
    imageUrl: string,
    caption?: string,
    isCarouselItem = false
  ): Promise<MediaContainer> {
    const params = new URLSearchParams({
      image_url: imageUrl,
      ...(caption && !isCarouselItem ? { caption } : {}),
      ...(isCarouselItem ? { is_carousel_item: 'true' } : {}),
    });

    return this.request(`/${this.instagramAccountId}/media?${params.toString()}`, {
      method: 'POST',
    });
  }

  /**
   * Cria um container de vídeo (Reel ou Story)
   */
  private async createVideoContainer(
    videoUrl: string,
    options: {
      caption?: string;
      coverUrl?: string;
      mediaType: 'REELS' | 'STORIES';
      shareToFeed?: boolean;
      isCarouselItem?: boolean;
    }
  ): Promise<MediaContainer> {
    const params = new URLSearchParams({
      video_url: videoUrl,
      media_type: options.mediaType,
      ...(options.caption && !options.isCarouselItem ? { caption: options.caption } : {}),
      ...(options.coverUrl ? { cover_url: options.coverUrl } : {}),
      ...(options.shareToFeed !== undefined ? { share_to_feed: String(options.shareToFeed) } : {}),
      ...(options.isCarouselItem ? { is_carousel_item: 'true' } : {}),
    });

    return this.request(`/${this.instagramAccountId}/media?${params.toString()}`, {
      method: 'POST',
    });
  }

  /**
   * Cria um container de carrossel
   */
  private async createCarouselContainer(
    childrenIds: string[],
    caption?: string
  ): Promise<MediaContainer> {
    const params = new URLSearchParams({
      media_type: 'CAROUSEL',
      children: childrenIds.join(','),
      ...(caption ? { caption } : {}),
    });

    return this.request(`/${this.instagramAccountId}/media?${params.toString()}`, {
      method: 'POST',
    });
  }

  /**
   * Verifica o status de um container de mídia
   */
  async checkContainerStatus(containerId: string): Promise<{
    status: string;
    status_code: string;
  }> {
    return this.request(`/${containerId}?fields=status,status_code`);
  }

  /**
   * Aguarda até que o container esteja pronto para publicação
   */
  private async waitForContainerReady(
    containerId: string,
    maxAttempts = 30,
    delayMs = 2000
  ): Promise<boolean> {
    for (let i = 0; i < maxAttempts; i++) {
      const status = await this.checkContainerStatus(containerId);
      
      if (status.status_code === 'FINISHED') {
        return true;
      }
      
      if (status.status_code === 'ERROR') {
        throw new Error(`Container processing failed: ${status.status}`);
      }

      // IN_PROGRESS - aguardar
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }

    throw new Error('Container processing timeout');
  }

  /**
   * Publica um container de mídia
   */
  private async publishContainer(containerId: string): Promise<PublishedMedia> {
    const params = new URLSearchParams({
      creation_id: containerId,
    });

    return this.request(`/${this.instagramAccountId}/media_publish?${params.toString()}`, {
      method: 'POST',
    });
  }

  /**
   * Obtém o permalink de uma mídia publicada
   */
  async getMediaPermalink(mediaId: string): Promise<string> {
    const response = await this.request<{ permalink: string }>(
      `/${mediaId}?fields=permalink`
    );
    return response.permalink;
  }

  // =====================================================
  // MÉTODOS DE PUBLICAÇÃO DE ALTO NÍVEL
  // =====================================================

  /**
   * Publica uma imagem no feed
   */
  async publishImage(
    imageUrl: string,
    caption?: string
  ): Promise<PublishedMedia> {
    console.log('[InstagramAPI] Publishing image...');
    
    // 1. Criar container
    const container = await this.createMediaContainer(imageUrl, caption);
    console.log('[InstagramAPI] Container created:', container.id);

    // 2. Publicar
    const published = await this.publishContainer(container.id);
    console.log('[InstagramAPI] Published:', published.id);

    // 3. Obter permalink
    const permalink = await this.getMediaPermalink(published.id);

    return {
      ...published,
      permalink,
    };
  }

  /**
   * Publica um Reel
   */
  async publishReel(
    videoUrl: string,
    options: {
      caption?: string;
      coverUrl?: string;
      shareToFeed?: boolean;
    } = {}
  ): Promise<PublishedMedia> {
    console.log('[InstagramAPI] Publishing reel...');

    // 1. Criar container
    const container = await this.createVideoContainer(videoUrl, {
      ...options,
      mediaType: 'REELS',
    });
    console.log('[InstagramAPI] Container created:', container.id);

    // 2. Aguardar processamento do vídeo
    await this.waitForContainerReady(container.id);
    console.log('[InstagramAPI] Container ready');

    // 3. Publicar
    const published = await this.publishContainer(container.id);
    console.log('[InstagramAPI] Published:', published.id);

    // 4. Obter permalink
    const permalink = await this.getMediaPermalink(published.id);

    return {
      ...published,
      permalink,
    };
  }

  /**
   * Publica um carrossel (múltiplas imagens/vídeos)
   */
  async publishCarousel(
    mediaUrls: string[],
    caption?: string,
    mediaTypes?: ('image' | 'video')[]
  ): Promise<PublishedMedia> {
    console.log('[InstagramAPI] Publishing carousel with', mediaUrls.length, 'items');

    if (mediaUrls.length < 2 || mediaUrls.length > 10) {
      throw new Error('Carousel must have 2-10 items');
    }

    // 1. Criar containers para cada item
    const childrenIds: string[] = [];
    
    for (let i = 0; i < mediaUrls.length; i++) {
      const url = mediaUrls[i];
      const isVideo = mediaTypes?.[i] === 'video' || url.includes('.mp4');

      let container: MediaContainer;
      
      if (isVideo) {
        container = await this.createVideoContainer(url, {
          mediaType: 'REELS',
          isCarouselItem: true,
        });
        await this.waitForContainerReady(container.id);
      } else {
        container = await this.createMediaContainer(url, undefined, true);
      }

      childrenIds.push(container.id);
      console.log('[InstagramAPI] Child container created:', container.id);
    }

    // 2. Criar container do carrossel
    const carouselContainer = await this.createCarouselContainer(childrenIds, caption);
    console.log('[InstagramAPI] Carousel container created:', carouselContainer.id);

    // 3. Publicar
    const published = await this.publishContainer(carouselContainer.id);
    console.log('[InstagramAPI] Published:', published.id);

    // 4. Obter permalink
    const permalink = await this.getMediaPermalink(published.id);

    return {
      ...published,
      permalink,
    };
  }

  /**
   * Publica um Story (imagem)
   */
  async publishStoryImage(imageUrl: string): Promise<PublishedMedia> {
    console.log('[InstagramAPI] Publishing story image...');

    const params = new URLSearchParams({
      image_url: imageUrl,
      media_type: 'STORIES',
    });

    const container = await this.request<MediaContainer>(
      `/${this.instagramAccountId}/media?${params.toString()}`,
      { method: 'POST' }
    );

    const published = await this.publishContainer(container.id);
    
    return published;
  }

  /**
   * Publica um Story (vídeo)
   */
  async publishStoryVideo(videoUrl: string): Promise<PublishedMedia> {
    console.log('[InstagramAPI] Publishing story video...');

    const container = await this.createVideoContainer(videoUrl, {
      mediaType: 'STORIES',
    });

    await this.waitForContainerReady(container.id);

    const published = await this.publishContainer(container.id);
    
    return published;
  }

  // =====================================================
  // COMENTÁRIOS
  // =====================================================

  /**
   * Adiciona um comentário a um post
   */
  async addComment(mediaId: string, message: string): Promise<{ id: string }> {
    const params = new URLSearchParams({ message });

    return this.request(`/${mediaId}/comments?${params.toString()}`, {
      method: 'POST',
    });
  }

  /**
   * Lista comentários de um post
   */
  async getComments(mediaId: string, limit = 50): Promise<{
    data: Array<{
      id: string;
      text: string;
      username: string;
      timestamp: string;
    }>;
  }> {
    return this.request(
      `/${mediaId}/comments?fields=id,text,username,timestamp&limit=${limit}`
    );
  }

  /**
   * Responde a um comentário
   */
  async replyToComment(commentId: string, message: string): Promise<{ id: string }> {
    const params = new URLSearchParams({ message });

    return this.request(`/${commentId}/replies?${params.toString()}`, {
      method: 'POST',
    });
  }

  // =====================================================
  // INSIGHTS E MÉTRICAS
  // =====================================================

  /**
   * Obtém insights de um post específico
   */
  async getMediaInsights(mediaId: string): Promise<MediaInsights> {
    // Métricas variam por tipo de mídia
    const metrics = [
      'impressions',
      'reach',
      'engagement',
      'saved',
      'likes',
      'comments',
      'shares',
      'video_views',
      'plays',
    ].join(',');

    try {
      const response = await this.request<{
        data: Array<{ name: string; values: Array<{ value: number }> }>;
      }>(`/${mediaId}/insights?metric=${metrics}`);

      const insights: MediaInsights = {
        impressions: 0,
        reach: 0,
        engagement: 0,
        saved: 0,
        likes: 0,
        comments: 0,
        shares: 0,
      };

      for (const metric of response.data || []) {
        const value = metric.values?.[0]?.value || 0;
        (insights as any)[metric.name] = value;
      }

      return insights;
    } catch (error) {
      console.error('[InstagramAPI] Error getting media insights:', error);
      return {
        impressions: 0,
        reach: 0,
        engagement: 0,
        saved: 0,
        likes: 0,
        comments: 0,
        shares: 0,
      };
    }
  }

  /**
   * Obtém insights da conta
   */
  async getAccountInsights(
    period: 'day' | 'week' | 'days_28' = 'day'
  ): Promise<AccountInsights> {
    const metrics = [
      'impressions',
      'reach',
      'profile_views',
      'website_clicks',
      'follower_count',
      'email_contacts',
      'phone_call_clicks',
      'get_directions_clicks',
    ].join(',');

    try {
      const response = await this.request<{
        data: Array<{ name: string; values: Array<{ value: number }> }>;
      }>(`/${this.instagramAccountId}/insights?metric=${metrics}&period=${period}`);

      const insights: AccountInsights = {
        impressions: 0,
        reach: 0,
        profile_views: 0,
        website_clicks: 0,
        follower_count: 0,
        email_contacts: 0,
        phone_call_clicks: 0,
        get_directions_clicks: 0,
      };

      for (const metric of response.data || []) {
        const value = metric.values?.[0]?.value || 0;
        (insights as any)[metric.name] = value;
      }

      return insights;
    } catch (error) {
      console.error('[InstagramAPI] Error getting account insights:', error);
      return {
        impressions: 0,
        reach: 0,
        profile_views: 0,
        website_clicks: 0,
        follower_count: 0,
        email_contacts: 0,
        phone_call_clicks: 0,
        get_directions_clicks: 0,
      };
    }
  }

  /**
   * Obtém dados demográficos da audiência
   */
  async getAudienceInsights(): Promise<{
    audience_city: Record<string, number>;
    audience_country: Record<string, number>;
    audience_gender_age: Record<string, number>;
    online_followers: Record<string, number>;
  }> {
    const metrics = [
      'audience_city',
      'audience_country', 
      'audience_gender_age',
      'online_followers',
    ].join(',');

    try {
      const response = await this.request<{
        data: Array<{ name: string; values: Array<{ value: Record<string, number> }> }>;
      }>(`/${this.instagramAccountId}/insights?metric=${metrics}&period=lifetime`);

      const insights: any = {
        audience_city: {},
        audience_country: {},
        audience_gender_age: {},
        online_followers: {},
      };

      for (const metric of response.data || []) {
        insights[metric.name] = metric.values?.[0]?.value || {};
      }

      return insights;
    } catch (error) {
      console.error('[InstagramAPI] Error getting audience insights:', error);
      return {
        audience_city: {},
        audience_country: {},
        audience_gender_age: {},
        online_followers: {},
      };
    }
  }

  // =====================================================
  // HASHTAGS
  // =====================================================

  /**
   * Busca informações de uma hashtag
   */
  async searchHashtag(hashtag: string): Promise<{
    id: string;
    name: string;
  } | null> {
    try {
      const response = await this.request<{
        data: Array<{ id: string }>;
      }>(`/ig_hashtag_search?user_id=${this.instagramAccountId}&q=${encodeURIComponent(hashtag)}`);

      if (response.data?.[0]) {
        return {
          id: response.data[0].id,
          name: hashtag,
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Obtém posts recentes de uma hashtag
   */
  async getHashtagRecentMedia(hashtagId: string, limit = 50): Promise<RecentMedia[]> {
    try {
      const response = await this.request<{ data: RecentMedia[] }>(
        `/${hashtagId}/recent_media?user_id=${this.instagramAccountId}&fields=id,caption,media_type,permalink,timestamp,like_count,comments_count&limit=${limit}`
      );
      return response.data || [];
    } catch {
      return [];
    }
  }
}

// =====================================================
// FACTORY FUNCTION
// =====================================================

/**
 * Cria uma instância da API do Instagram
 */
export function createInstagramAPI(
  accessToken: string,
  instagramAccountId: string
): InstagramAPI {
  return new InstagramAPI(accessToken, instagramAccountId);
}
