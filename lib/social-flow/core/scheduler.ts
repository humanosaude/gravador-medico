/**
 * Social Flow - Scheduler Service
 * 
 * Gerencia agendamento e execução de posts
 */

import { createClient } from '@supabase/supabase-js';
import { Post, SocialAccount, PostStatus } from '../types';
import { universalPublisher } from './publisher';

interface SchedulerConfig {
  pollIntervalMs: number;
  maxConcurrentPublishes: number;
  retryAttempts: number;
  retryDelayMs: number;
}

const DEFAULT_CONFIG: SchedulerConfig = {
  pollIntervalMs: 30000, // 30 segundos
  maxConcurrentPublishes: 3,
  retryAttempts: 3,
  retryDelayMs: 60000, // 1 minuto
};

export class SchedulerService {
  private supabase;
  private config: SchedulerConfig;
  private isRunning: boolean = false;
  private intervalId?: NodeJS.Timeout;

  constructor(config: Partial<SchedulerConfig> = {}) {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Inicia o scheduler
   */
  start(): void {
    if (this.isRunning) {
      console.log('Scheduler já está rodando');
      return;
    }

    this.isRunning = true;
    console.log('Scheduler iniciado');

    // Executar imediatamente
    this.processScheduledPosts();

    // Configurar intervalo
    this.intervalId = setInterval(
      () => this.processScheduledPosts(),
      this.config.pollIntervalMs
    );
  }

  /**
   * Para o scheduler
   */
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    console.log('Scheduler parado');
  }

  /**
   * Processa posts agendados
   */
  async processScheduledPosts(): Promise<void> {
    if (!this.isRunning) return;

    try {
      // Buscar posts prontos para publicar
      const { data: posts, error } = await this.supabase
        .from('posts')
        .select(`
          *,
          social_accounts:account_id (*)
        `)
        .eq('status', 'scheduled')
        .lte('scheduled_for', new Date().toISOString())
        .lt('publish_attempts', this.config.retryAttempts)
        .order('scheduled_for', { ascending: true })
        .limit(this.config.maxConcurrentPublishes);

      if (error) {
        console.error('Erro ao buscar posts agendados:', error);
        return;
      }

      if (!posts || posts.length === 0) {
        return;
      }

      console.log(`Processando ${posts.length} posts agendados`);

      // Publicar cada post
      for (const post of posts) {
        await this.publishPost(post);
      }
    } catch (error) {
      console.error('Erro no scheduler:', error);
    }
  }

  /**
   * Publica um post específico
   */
  private async publishPost(post: any): Promise<void> {
    const account = post.social_accounts;

    if (!account) {
      await this.markPostFailed(post.id, 'Conta não encontrada');
      return;
    }

    try {
      // Atualizar status para publishing
      await this.supabase
        .from('posts')
        .update({
          status: 'publishing',
          publish_attempts: (post.publish_attempts || 0) + 1,
        })
        .eq('id', post.id);

      // Preparar opções de publicação
      const publishOptions = {
        caption: post.caption,
        hashtags: post.hashtags,
        ...(post.metadata?.publishOptions || {}),
      };

      // Buscar mídias se houver
      let mediaItems = [];
      if (post.media_ids && post.media_ids.length > 0) {
        const { data: media } = await this.supabase
          .from('media_library')
          .select('*')
          .in('id', post.media_ids);
        
        if (media) {
          mediaItems = media;
          publishOptions.mediaItems = mediaItems;
        }
      }

      // Publicar
      const result = await universalPublisher.publishToNetwork(account, publishOptions);

      if (result.success) {
        // Marcar como publicado
        await this.supabase
          .from('posts')
          .update({
            status: 'published',
            platform_post_id: result.mediaId,
            platform_permalink: result.permalink,
            published_at: result.publishedAt?.toISOString() || new Date().toISOString(),
            publish_error: null,
          })
          .eq('id', post.id);

        console.log(`✅ Post ${post.id} publicado com sucesso`);
      } else {
        throw new Error(result.error || 'Erro desconhecido');
      }
    } catch (error: any) {
      const attempts = (post.publish_attempts || 0) + 1;
      
      if (attempts >= this.config.retryAttempts) {
        await this.markPostFailed(post.id, error.message);
      } else {
        // Agendar retry
        const retryAt = new Date(Date.now() + this.config.retryDelayMs);
        await this.supabase
          .from('posts')
          .update({
            status: 'scheduled',
            scheduled_for: retryAt.toISOString(),
            publish_error: error.message,
          })
          .eq('id', post.id);

        console.log(`⚠️ Post ${post.id} falhou, retry em ${this.config.retryDelayMs / 1000}s`);
      }
    }
  }

  /**
   * Marca um post como falho
   */
  private async markPostFailed(postId: string, error: string): Promise<void> {
    await this.supabase
      .from('posts')
      .update({
        status: 'failed',
        publish_error: error,
      })
      .eq('id', postId);

    console.log(`❌ Post ${postId} marcado como falho: ${error}`);
  }

  /**
   * Agenda um post
   */
  async schedulePost(
    userId: string,
    accountId: string,
    content: {
      caption: string;
      hashtags?: string[];
      mediaIds?: string[];
      metadata?: Record<string, any>;
    },
    scheduledFor: Date
  ): Promise<{ success: boolean; postId?: string; error?: string }> {
    try {
      const { data, error } = await this.supabase
        .from('posts')
        .insert({
          user_id: userId,
          account_id: accountId,
          caption: content.caption,
          hashtags: content.hashtags || [],
          media_ids: content.mediaIds || [],
          metadata: content.metadata || {},
          status: 'scheduled',
          scheduled_for: scheduledFor.toISOString(),
        })
        .select('id')
        .single();

      if (error) throw error;

      return { success: true, postId: data.id };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Cancela um post agendado
   */
  async cancelScheduledPost(postId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('posts')
        .update({
          status: 'draft',
          scheduled_for: null,
        })
        .eq('id', postId)
        .eq('status', 'scheduled');

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Reagenda um post
   */
  async reschedulePost(postId: string, newScheduledFor: Date): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('posts')
        .update({
          scheduled_for: newScheduledFor.toISOString(),
          status: 'scheduled',
          publish_attempts: 0,
          publish_error: null,
        })
        .eq('id', postId)
        .in('status', ['scheduled', 'failed', 'draft']);

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Lista posts agendados
   */
  async getScheduledPosts(
    userId: string,
    options: {
      startDate?: Date;
      endDate?: Date;
      network?: string;
      accountId?: string;
    } = {}
  ): Promise<Post[]> {
    let query = this.supabase
      .from('posts')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'scheduled')
      .order('scheduled_for', { ascending: true });

    if (options.startDate) {
      query = query.gte('scheduled_for', options.startDate.toISOString());
    }

    if (options.endDate) {
      query = query.lte('scheduled_for', options.endDate.toISOString());
    }

    if (options.network) {
      query = query.eq('network', options.network);
    }

    if (options.accountId) {
      query = query.eq('account_id', options.accountId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao listar posts agendados:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Obtém próximos posts a serem publicados
   */
  async getUpcomingPosts(userId: string, limit: number = 10): Promise<Post[]> {
    const { data, error } = await this.supabase
      .from('posts')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'scheduled')
      .gte('scheduled_for', new Date().toISOString())
      .order('scheduled_for', { ascending: true })
      .limit(limit);

    if (error) return [];
    return data || [];
  }
}

// Singleton
export const schedulerService = new SchedulerService();
