/**
 * Social Flow - Instagram Publisher
 * 
 * Gerencia publicação de conteúdo no Instagram
 * Suporta: Imagens, Carousels, Reels, Stories
 */

import { InstagramAPI } from './api';
import { SocialAccount, MediaItem, MediaType } from '../../types';

interface PublishOptions {
  caption?: string;
  hashtags?: string[];
  mentions?: string[];
  location?: { id: string; name: string };
  shareToFeed?: boolean; // Para Reels
  coverUrl?: string; // Para Reels
  userTags?: { username: string; x: number; y: number }[];
}

interface PublishResult {
  success: boolean;
  mediaId?: string;
  permalink?: string;
  error?: string;
  publishedAt?: Date;
}

// Mídia preparada para publicação
export interface PreparedMedia {
  url: string;
  type: 'image' | 'video';
  thumbnailUrl?: string;
  fileSize?: number;
  durationSeconds?: number;
  width?: number;
  height?: number;
}

export class InstagramPublisher {
  private api: InstagramAPI;
  private account: SocialAccount;

  constructor(account: SocialAccount) {
    this.account = account;
    this.api = new InstagramAPI(account);
  }

  /**
   * Publica um post no Instagram usando mídias preparadas
   */
  async publish(
    mediaItems: PreparedMedia[],
    options: PublishOptions = {}
  ): Promise<PublishResult> {
    try {
      // Verificar limite de publicação
      const limitCheck = await this.api.checkPublishingLimit();
      if (!limitCheck.canPublish) {
        return {
          success: false,
          error: `Limite de publicação atingido (${limitCheck.limit}/dia). Restam ${limitCheck.remainingPosts} posts.`,
        };
      }

      // Montar caption completa
      const caption = this.buildCaption(
        options.caption || '',
        options.hashtags || [],
        options.mentions || []
      );

      if (mediaItems.length === 0) {
        return {
          success: false,
          error: 'Post deve conter pelo menos uma mídia',
        };
      }

      let result: PublishResult;

      if (mediaItems.length === 1) {
        const media = mediaItems[0];
        if (media.type === 'video') {
          result = await this.publishReel(media, caption, options);
        } else {
          result = await this.publishSingleImage(media, caption, options);
        }
      } else {
        result = await this.publishCarousel(mediaItems, caption, options);
      }

      return result;
    } catch (error: any) {
      console.error('Instagram publish error:', error);
      return {
        success: false,
        error: error.message || 'Erro desconhecido ao publicar',
      };
    }
  }

  /**
   * Publica usando MediaItem do banco (resolve URLs)
   */
  async publishFromMediaItems(
    mediaItems: MediaItem[],
    options: PublishOptions = {}
  ): Promise<PublishResult> {
    // Converter MediaItem para PreparedMedia
    const preparedMedia: PreparedMedia[] = mediaItems.map(item => ({
      url: item.public_url || item.file_path,
      type: this.getMediaType(item.file_type),
      thumbnailUrl: item.thumbnail_url,
      fileSize: item.file_size_bytes,
      durationSeconds: item.duration_seconds,
      width: item.width,
      height: item.height,
    }));

    return this.publish(preparedMedia, options);
  }

  /**
   * Converte MediaType para tipo simples
   */
  private getMediaType(fileType: MediaType): 'image' | 'video' {
    if (fileType === 'video') return 'video';
    return 'image';
  }

  /**
   * Publica uma única imagem
   */
  private async publishSingleImage(
    media: PreparedMedia,
    caption: string,
    options: PublishOptions
  ): Promise<PublishResult> {
    // Criar container
    const containerResponse = await this.api.createMediaContainer({
      imageUrl: media.url,
      caption,
      locationId: options.location?.id,
      userTags: options.userTags,
    });

    if (!containerResponse.success || !containerResponse.data) {
      return {
        success: false,
        error: containerResponse.error?.message || 'Falha ao criar container',
      };
    }

    const containerId = containerResponse.data.id;

    // Publicar
    const publishResponse = await this.api.publishContainer(containerId);

    if (!publishResponse.success || !publishResponse.data) {
      return {
        success: false,
        error: publishResponse.error?.message || 'Falha ao publicar',
      };
    }

    // Obter permalink
    const mediaInfo = await this.api.getMediaById(publishResponse.data.id);

    return {
      success: true,
      mediaId: publishResponse.data.id,
      permalink: mediaInfo.data?.permalink,
      publishedAt: new Date(),
    };
  }

  /**
   * Publica um Reel/Vídeo
   */
  private async publishReel(
    media: PreparedMedia,
    caption: string,
    options: PublishOptions
  ): Promise<PublishResult> {
    // Criar container de vídeo
    const containerResponse = await this.api.createMediaContainer({
      videoUrl: media.url,
      caption,
      shareToFeed: options.shareToFeed ?? true,
      coverUrl: options.coverUrl || media.thumbnailUrl,
      locationId: options.location?.id,
    });

    if (!containerResponse.success || !containerResponse.data) {
      return {
        success: false,
        error: containerResponse.error?.message || 'Falha ao criar container de vídeo',
      };
    }

    const containerId = containerResponse.data.id;

    // Aguardar processamento do vídeo
    const statusResponse = await this.api.waitForContainer(containerId);

    if (!statusResponse.success) {
      return {
        success: false,
        error: statusResponse.error?.message || 'Timeout no processamento do vídeo',
      };
    }

    // Publicar
    const publishResponse = await this.api.publishContainer(containerId);

    if (!publishResponse.success || !publishResponse.data) {
      return {
        success: false,
        error: publishResponse.error?.message || 'Falha ao publicar Reel',
      };
    }

    // Obter permalink
    const mediaInfo = await this.api.getMediaById(publishResponse.data.id);

    return {
      success: true,
      mediaId: publishResponse.data.id,
      permalink: mediaInfo.data?.permalink,
      publishedAt: new Date(),
    };
  }

  /**
   * Publica um carousel (múltiplas imagens/vídeos)
   */
  private async publishCarousel(
    mediaItems: PreparedMedia[],
    caption: string,
    options: PublishOptions
  ): Promise<PublishResult> {
    // Limite de 10 itens no carousel
    if (mediaItems.length > 10) {
      return {
        success: false,
        error: 'Carousel pode ter no máximo 10 itens',
      };
    }

    // Criar containers para cada item
    const childContainerIds: string[] = [];

    for (const media of mediaItems) {
      const childResponse = await this.api.createCarouselItem({
        imageUrl: media.type === 'image' ? media.url : undefined,
        videoUrl: media.type === 'video' ? media.url : undefined,
      });

      if (!childResponse.success || !childResponse.data) {
        return {
          success: false,
          error: `Falha ao criar item do carousel: ${childResponse.error?.message}`,
        };
      }

      childContainerIds.push(childResponse.data.id);

      // Se for vídeo, aguardar processamento
      if (media.type === 'video') {
        const status = await this.api.waitForContainer(childResponse.data.id);
        if (!status.success) {
          return {
            success: false,
            error: `Falha no processamento do vídeo: ${status.error?.message}`,
          };
        }
      }
    }

    // Criar container do carousel
    const carouselResponse = await this.api.createMediaContainer({
      isCarousel: true,
      carouselChildren: childContainerIds,
      caption,
      locationId: options.location?.id,
    });

    if (!carouselResponse.success || !carouselResponse.data) {
      return {
        success: false,
        error: carouselResponse.error?.message || 'Falha ao criar carousel',
      };
    }

    // Publicar carousel
    const publishResponse = await this.api.publishContainer(carouselResponse.data.id);

    if (!publishResponse.success || !publishResponse.data) {
      return {
        success: false,
        error: publishResponse.error?.message || 'Falha ao publicar carousel',
      };
    }

    // Obter permalink
    const mediaInfo = await this.api.getMediaById(publishResponse.data.id);

    return {
      success: true,
      mediaId: publishResponse.data.id,
      permalink: mediaInfo.data?.permalink,
      publishedAt: new Date(),
    };
  }

  /**
   * Monta a caption com hashtags e menções
   */
  private buildCaption(
    text: string,
    hashtags: string[],
    mentions: string[]
  ): string {
    let caption = text;

    // Adicionar menções no início se houver
    if (mentions.length > 0) {
      const mentionText = mentions
        .map(m => m.startsWith('@') ? m : `@${m}`)
        .join(' ');
      caption = `${mentionText} ${caption}`;
    }

    // Adicionar hashtags no final
    if (hashtags.length > 0) {
      const hashtagText = hashtags
        .slice(0, 30) // Limite de 30 hashtags
        .map(h => h.startsWith('#') ? h : `#${h}`)
        .join(' ');
      caption = `${caption}\n\n${hashtagText}`;
    }

    // Limite de 2200 caracteres
    if (caption.length > 2200) {
      caption = caption.substring(0, 2197) + '...';
    }

    return caption;
  }

  /**
   * Valida mídia antes de publicar
   */
  validateMedia(mediaItems: PreparedMedia[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (mediaItems.length === 0) {
      errors.push('Nenhuma mídia selecionada');
      return { valid: false, errors };
    }

    if (mediaItems.length > 10) {
      errors.push('Máximo de 10 itens no carousel');
    }

    for (const media of mediaItems) {
      // Validar tipo
      if (!['image', 'video'].includes(media.type)) {
        errors.push(`Tipo de mídia não suportado: ${media.type}`);
      }

      // Validar tamanho (aproximado)
      if (media.fileSize) {
        if (media.type === 'image' && media.fileSize > 8 * 1024 * 1024) {
          errors.push('Imagem muito grande (máx 8MB)');
        }
        if (media.type === 'video' && media.fileSize > 1024 * 1024 * 1024) {
          errors.push('Vídeo muito grande (máx 1GB)');
        }
      }

      // Validar duração de vídeo
      if (media.type === 'video' && media.durationSeconds) {
        if (media.durationSeconds < 3) {
          errors.push('Vídeo muito curto (mín 3 segundos)');
        }
        if (media.durationSeconds > 90) {
          errors.push('Vídeo muito longo para Reel (máx 90 segundos)');
        }
      }

      // Validar dimensões
      if (media.width && media.height) {
        const aspectRatio = media.width / media.height;
        
        // Instagram aceita de 4:5 (0.8) a 1.91:1 (1.91)
        if (aspectRatio < 0.8 || aspectRatio > 1.91) {
          errors.push(`Proporção de imagem inválida (${aspectRatio.toFixed(2)}). Use entre 4:5 e 1.91:1`);
        }

        // Resolução mínima
        if (media.width < 320 || media.height < 320) {
          errors.push('Resolução muito baixa (mín 320x320)');
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Valida MediaItem do banco
   */
  validateMediaItems(mediaItems: MediaItem[]): { valid: boolean; errors: string[] } {
    const prepared = mediaItems.map(item => ({
      url: item.public_url || item.file_path,
      type: this.getMediaType(item.file_type),
      fileSize: item.file_size_bytes,
      durationSeconds: item.duration_seconds,
      width: item.width,
      height: item.height,
    }));

    return this.validateMedia(prepared);
  }
}
