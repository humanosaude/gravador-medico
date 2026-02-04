/**
 * Social Flow - Universal Publisher
 * 
 * Serviço centralizado para publicação em múltiplas redes
 */

import { createClient } from '@supabase/supabase-js';
import { SocialAccount, Post, SocialNetwork, PostStatus, MediaItem } from '../types';
import { getPublisherForAccount, isNetworkConfigured } from '../networks';
import { PreparedMedia } from '../networks/instagram/publisher';

interface PublishOptions {
  // Conteúdo
  caption?: string;
  title?: string;
  description?: string;
  hashtags?: string[];
  mentions?: string[];
  
  // Mídia
  mediaUrls?: string[];
  mediaItems?: MediaItem[];
  
  // Opções específicas
  location?: { id: string; name: string };
  userTags?: { username: string; x: number; y: number }[];
  shareToFeed?: boolean;
  coverUrl?: string;
  
  // Cross-post
  crossPostTo?: SocialNetwork[];
}

interface PublishResult {
  success: boolean;
  network: SocialNetwork;
  mediaId?: string;
  permalink?: string;
  error?: string;
  publishedAt?: Date;
}

interface CrossPostResult {
  overall: {
    success: boolean;
    totalAttempts: number;
    successCount: number;
    failCount: number;
  };
  results: PublishResult[];
}

export class UniversalPublisher {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  /**
   * Publica em uma rede específica
   */
  async publishToNetwork(
    account: SocialAccount,
    options: PublishOptions
  ): Promise<PublishResult> {
    const network = account.network;

    // Verificar se a rede está configurada
    if (!isNetworkConfigured(network)) {
      return {
        success: false,
        network,
        error: `${network} não está configurado. Adicione as chaves de API.`,
      };
    }

    try {
      const publisher = getPublisherForAccount(account);

      // Preparar mídia
      const preparedMedia = this.prepareMedia(options);

      // Publicar baseado na rede
      let result: PublishResult;

      switch (network) {
        case 'instagram':
          result = await this.publishToInstagram(publisher, preparedMedia, options);
          break;
        case 'facebook':
          result = await this.publishToFacebook(publisher, preparedMedia, options);
          break;
        case 'twitter':
          result = await this.publishToTwitter(publisher, preparedMedia, options);
          break;
        case 'linkedin':
          result = await this.publishToLinkedIn(publisher, preparedMedia, options);
          break;
        case 'youtube':
          result = await this.publishToYouTube(publisher, preparedMedia, options);
          break;
        case 'tiktok':
          result = await this.publishToTikTok(publisher, preparedMedia, options);
          break;
        case 'pinterest':
          result = await this.publishToPinterest(publisher, preparedMedia, options);
          break;
        default:
          result = {
            success: false,
            network,
            error: `Rede não suportada: ${network}`,
          };
      }

      // Registrar resultado
      await this.logPublishResult(account, options, result);

      return result;
    } catch (error: any) {
      console.error(`Error publishing to ${network}:`, error);
      return {
        success: false,
        network,
        error: error.message || 'Erro desconhecido',
      };
    }
  }

  /**
   * Publica em múltiplas redes (cross-post)
   */
  async crossPost(
    accounts: SocialAccount[],
    options: PublishOptions
  ): Promise<CrossPostResult> {
    const results: PublishResult[] = [];

    // Publicar em cada conta sequencialmente para respeitar rate limits
    for (const account of accounts) {
      const result = await this.publishToNetwork(account, options);
      results.push(result);

      // Pequeno delay entre publicações
      await this.wait(1000);
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;

    return {
      overall: {
        success: successCount > 0,
        totalAttempts: results.length,
        successCount,
        failCount,
      },
      results,
    };
  }

  /**
   * Agenda publicação para múltiplas redes
   */
  async scheduleCrossPost(
    accounts: SocialAccount[],
    options: PublishOptions,
    scheduledFor: Date,
    userId: string
  ): Promise<{ success: boolean; postIds: string[] }> {
    const postIds: string[] = [];

    for (const account of accounts) {
      try {
        const { data, error } = await this.supabase
          .from('posts')
          .insert({
            user_id: userId,
            account_id: account.id,
            network: account.network,
            caption: options.caption,
            title: options.title,
            description: options.description,
            hashtags: options.hashtags || [],
            media_ids: [],
            metadata: {
              publishOptions: options,
            },
            status: 'scheduled',
            scheduled_for: scheduledFor.toISOString(),
            is_cross_post: accounts.length > 1,
          })
          .select('id')
          .single();

        if (!error && data) {
          postIds.push(data.id);
        }
      } catch (error) {
        console.error(`Error scheduling for ${account.network}:`, error);
      }
    }

    return {
      success: postIds.length > 0,
      postIds,
    };
  }

  // =======================
  // NETWORK SPECIFIC METHODS
  // =======================

  private async publishToInstagram(
    publisher: any,
    media: PreparedMedia[],
    options: PublishOptions
  ): Promise<PublishResult> {
    const result = await publisher.publish(media, {
      caption: options.caption,
      hashtags: options.hashtags,
      mentions: options.mentions,
      location: options.location,
      userTags: options.userTags,
      shareToFeed: options.shareToFeed,
      coverUrl: options.coverUrl,
    });

    return {
      ...result,
      network: 'instagram',
    };
  }

  private async publishToFacebook(
    publisher: any,
    media: PreparedMedia[],
    options: PublishOptions
  ): Promise<PublishResult> {
    // Placeholder - implementar quando Facebook estiver configurado
    return {
      success: false,
      network: 'facebook',
      error: 'Facebook publishing not yet implemented',
    };
  }

  private async publishToTwitter(
    publisher: any,
    media: PreparedMedia[],
    options: PublishOptions
  ): Promise<PublishResult> {
    // Placeholder - implementar quando Twitter estiver configurado
    return {
      success: false,
      network: 'twitter',
      error: 'Twitter publishing not yet implemented',
    };
  }

  private async publishToLinkedIn(
    publisher: any,
    media: PreparedMedia[],
    options: PublishOptions
  ): Promise<PublishResult> {
    // Placeholder - implementar quando LinkedIn estiver configurado
    return {
      success: false,
      network: 'linkedin',
      error: 'LinkedIn publishing not yet implemented',
    };
  }

  private async publishToYouTube(
    publisher: any,
    media: PreparedMedia[],
    options: PublishOptions
  ): Promise<PublishResult> {
    // Placeholder - implementar quando YouTube estiver configurado
    return {
      success: false,
      network: 'youtube',
      error: 'YouTube publishing not yet implemented',
    };
  }

  private async publishToTikTok(
    publisher: any,
    media: PreparedMedia[],
    options: PublishOptions
  ): Promise<PublishResult> {
    // Placeholder - implementar quando TikTok estiver configurado
    return {
      success: false,
      network: 'tiktok',
      error: 'TikTok publishing not yet implemented',
    };
  }

  private async publishToPinterest(
    publisher: any,
    media: PreparedMedia[],
    options: PublishOptions
  ): Promise<PublishResult> {
    // Placeholder - implementar quando Pinterest estiver configurado
    return {
      success: false,
      network: 'pinterest',
      error: 'Pinterest publishing not yet implemented',
    };
  }

  // =======================
  // HELPER METHODS
  // =======================

  private prepareMedia(options: PublishOptions): PreparedMedia[] {
    if (options.mediaUrls) {
      return options.mediaUrls.map(url => ({
        url,
        type: this.inferMediaType(url),
      }));
    }

    if (options.mediaItems) {
      return options.mediaItems.map(item => ({
        url: item.public_url || item.file_path,
        type: item.file_type === 'video' ? 'video' : 'image',
        thumbnailUrl: item.thumbnail_url,
        fileSize: item.file_size_bytes,
        durationSeconds: item.duration_seconds,
        width: item.width,
        height: item.height,
      }));
    }

    return [];
  }

  private inferMediaType(url: string): 'image' | 'video' {
    const videoExtensions = ['.mp4', '.mov', '.avi', '.webm', '.mkv'];
    const lowerUrl = url.toLowerCase();
    
    if (videoExtensions.some(ext => lowerUrl.includes(ext))) {
      return 'video';
    }
    
    return 'image';
  }

  private async logPublishResult(
    account: SocialAccount,
    options: PublishOptions,
    result: PublishResult
  ): Promise<void> {
    try {
      // Atualizar o post se existir
      if (result.success && result.mediaId) {
        await this.supabase
          .from('posts')
          .update({
            status: 'published',
            platform_post_id: result.mediaId,
            platform_permalink: result.permalink,
            published_at: result.publishedAt?.toISOString() || new Date().toISOString(),
          })
          .eq('account_id', account.id)
          .eq('status', 'publishing');
      }
    } catch (error) {
      console.error('Error logging publish result:', error);
    }
  }

  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton
export const universalPublisher = new UniversalPublisher();
