/**
 * Social Flow Worker - Publish Scheduler
 * 
 * Publica posts agendados automaticamente.
 * Deve ser executado a cada 1 minuto via cron job.
 */

import { createClient } from '@supabase/supabase-js';
import { UniversalPublisher } from '../core/publisher';
import { SocialNetwork, Post, SocialAccount, PostStatus, MediaItem } from '../types';

export interface ScheduledPostResult {
  postId: string;
  success: boolean;
  platformPostId?: string;
  error?: string;
  publishedAt?: string;
}

export interface PublishSchedulerReport {
  processedAt: string;
  totalFound: number;
  totalPublished: number;
  totalFailed: number;
  results: ScheduledPostResult[];
}

/**
 * Publica todos os posts que estão agendados para agora ou no passado
 */
export async function publishScheduledPosts(): Promise<PublishSchedulerReport> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const publisher = new UniversalPublisher();
  const results: ScheduledPostResult[] = [];
  const now = new Date();

  console.log(`[PublishScheduler] Starting at ${now.toISOString()}`);

  try {
    // Buscar posts agendados que devem ser publicados
    const { data: scheduledPosts, error } = await supabase
      .from('social_posts')
      .select(`
        *,
        social_accounts (
          id,
          user_id,
          network,
          access_token,
          platform_account_id,
          account_name,
          is_active
        ),
        social_media_items (*)
      `)
      .eq('status', 'scheduled')
      .lte('scheduled_for', now.toISOString())
      .eq('auto_publish', true)
      .limit(50); // Processar em lotes

    if (error) {
      console.error('[PublishScheduler] Error fetching posts:', error);
      throw error;
    }

    if (!scheduledPosts?.length) {
      console.log('[PublishScheduler] No posts to publish');
      return {
        processedAt: now.toISOString(),
        totalFound: 0,
        totalPublished: 0,
        totalFailed: 0,
        results: [],
      };
    }

    console.log(`[PublishScheduler] Found ${scheduledPosts.length} posts to publish`);

    // Processar cada post
    for (const post of scheduledPosts) {
      const account = post.social_accounts;
      
      // Verificar se a conta está ativa
      if (!account?.is_active) {
        results.push({
          postId: post.id,
          success: false,
          error: 'Account is inactive',
        });
        
        // Marcar como falha
        await supabase
          .from('social_posts')
          .update({
            status: 'failed',
            error_message: 'Account is inactive',
            updated_at: new Date().toISOString(),
          })
          .eq('id', post.id);
        
        continue;
      }

      // Verificar se o token está válido
      if (!account.access_token) {
        results.push({
          postId: post.id,
          success: false,
          error: 'No access token',
        });
        
        await supabase
          .from('social_posts')
          .update({
            status: 'failed',
            error_message: 'No access token - reauthorize account',
            updated_at: new Date().toISOString(),
          })
          .eq('id', post.id);
        
        continue;
      }

      try {
        // Marcar como em processamento
        await supabase
          .from('social_posts')
          .update({
            status: 'pending',
            updated_at: new Date().toISOString(),
          })
          .eq('id', post.id);

        // Preparar mídia
        const mediaItems: MediaItem[] = (post.social_media_items || []).map((m: any) => ({
          id: m.id,
          public_url: m.public_url,
          file_type: m.file_type,
          width: m.width,
          height: m.height,
        }));

        // Publicar usando o método correto do UniversalPublisher
        const publishResult = await publisher.publishToNetwork(
          account as SocialAccount,
          {
            caption: post.content,
            mediaItems,
            hashtags: post.hashtags,
          }
        );

        if (publishResult.success) {
          results.push({
            postId: post.id,
            success: true,
            platformPostId: publishResult.mediaId,
            publishedAt: new Date().toISOString(),
          });

          // Atualizar post como publicado
          await supabase
            .from('social_posts')
            .update({
              status: 'published',
              platform_post_id: publishResult.mediaId,
              permalink: publishResult.permalink,
              published_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              error_message: null,
            })
            .eq('id', post.id);

          console.log(`[PublishScheduler] Published post ${post.id} -> ${publishResult.mediaId}`);
        } else {
          results.push({
            postId: post.id,
            success: false,
            error: publishResult.error,
          });

          // Marcar como falha
          await supabase
            .from('social_posts')
            .update({
              status: 'failed',
              error_message: publishResult.error,
              retry_count: (post.retry_count || 0) + 1,
              updated_at: new Date().toISOString(),
            })
            .eq('id', post.id);

          console.error(`[PublishScheduler] Failed to publish post ${post.id}:`, publishResult.error);
        }
      } catch (postError: any) {
        console.error(`[PublishScheduler] Error processing post ${post.id}:`, postError);
        
        results.push({
          postId: post.id,
          success: false,
          error: postError.message,
        });

        await supabase
          .from('social_posts')
          .update({
            status: 'failed',
            error_message: postError.message,
            retry_count: (post.retry_count || 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', post.id);
      }

      // Pequeno delay entre posts para evitar rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    const report: PublishSchedulerReport = {
      processedAt: now.toISOString(),
      totalFound: scheduledPosts.length,
      totalPublished: results.filter((r) => r.success).length,
      totalFailed: results.filter((r) => !r.success).length,
      results,
    };

    console.log(`[PublishScheduler] Completed: ${report.totalPublished} published, ${report.totalFailed} failed`);

    return report;
  } catch (error: any) {
    console.error('[PublishScheduler] Fatal error:', error);
    throw error;
  }
}

/**
 * Retry de posts que falharam (máximo 3 tentativas)
 */
export async function retryFailedPosts(): Promise<PublishSchedulerReport> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const publisher = new UniversalPublisher();
  const results: ScheduledPostResult[] = [];
  const now = new Date();

  console.log(`[PublishScheduler] Retrying failed posts at ${now.toISOString()}`);

  // Buscar posts que falharam mas ainda podem ser retentados
  const { data: failedPosts, error } = await supabase
    .from('social_posts')
    .select(`
      *,
      social_accounts (
        id,
        user_id,
        network,
        access_token,
        platform_account_id,
        is_active
      ),
      social_media_items (*)
    `)
    .eq('status', 'failed')
    .lt('retry_count', 3)
    .not('scheduled_for', 'is', null)
    .order('updated_at', { ascending: true })
    .limit(20);

  if (error || !failedPosts?.length) {
    return {
      processedAt: now.toISOString(),
      totalFound: 0,
      totalPublished: 0,
      totalFailed: 0,
      results: [],
    };
  }

  console.log(`[PublishScheduler] Found ${failedPosts.length} failed posts to retry`);

  for (const post of failedPosts) {
    const account = post.social_accounts;
    
    if (!account?.is_active || !account.access_token) {
      continue;
    }

    try {
      await supabase
        .from('social_posts')
        .update({
          status: 'pending',
          updated_at: new Date().toISOString(),
        })
        .eq('id', post.id);

      const mediaItems: MediaItem[] = (post.social_media_items || []).map((m: any) => ({
        id: m.id,
        public_url: m.public_url,
        file_type: m.file_type,
      }));

      const publishResult = await publisher.publishToNetwork(
        account as SocialAccount,
        {
          caption: post.content,
          mediaItems,
          hashtags: post.hashtags,
        }
      );

      if (publishResult.success) {
        results.push({
          postId: post.id,
          success: true,
          platformPostId: publishResult.mediaId,
        });

        await supabase
          .from('social_posts')
          .update({
            status: 'published',
            platform_post_id: publishResult.mediaId,
            permalink: publishResult.permalink,
            published_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            error_message: null,
          })
          .eq('id', post.id);
      } else {
        results.push({
          postId: post.id,
          success: false,
          error: publishResult.error,
        });

        await supabase
          .from('social_posts')
          .update({
            status: 'failed',
            error_message: publishResult.error,
            retry_count: (post.retry_count || 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', post.id);
      }
    } catch (postError: any) {
      results.push({
        postId: post.id,
        success: false,
        error: postError.message,
      });

      await supabase
        .from('social_posts')
        .update({
          status: 'failed',
          error_message: postError.message,
          retry_count: (post.retry_count || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', post.id);
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  return {
    processedAt: now.toISOString(),
    totalFound: failedPosts.length,
    totalPublished: results.filter((r) => r.success).length,
    totalFailed: results.filter((r) => !r.success).length,
    results,
  };
}
