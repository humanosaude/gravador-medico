/**
 * InstaFlow - Publish Scheduler Worker
 * 
 * Este worker verifica posts agendados e publica automaticamente
 * Deve ser executado via cron job (a cada 1-5 minutos)
 */

import { createClient } from '@supabase/supabase-js';
import { InstagramAPI } from '@/lib/instagram/api';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Service role para bypass RLS
);

export interface ScheduledPost {
  id: string;
  account_id: string;
  media_id: string | null;
  content_type: string;
  caption: string;
  hashtags: string[];
  media_urls: string[];
  scheduled_for: string;
  status: string;
  first_comment: string | null;
  location_id: string | null;
  user_tags: string[];
}

export interface PublishResult {
  success: boolean;
  postId?: string;
  error?: string;
  publishedAt?: Date;
}

/**
 * Busca posts pendentes para publicação
 */
export async function getPendingPosts(): Promise<ScheduledPost[]> {
  const now = new Date().toISOString();
  
  const { data, error } = await supabase
    .from('instaflow_scheduled_posts')
    .select(`
      *,
      instagram_accounts!inner(
        id,
        user_id,
        access_token,
        ig_user_id
      )
    `)
    .eq('status', 'scheduled')
    .lte('scheduled_for', now)
    .order('scheduled_for', { ascending: true })
    .limit(10); // Processar 10 por vez

  if (error) {
    console.error('Error fetching pending posts:', error);
    return [];
  }

  return data || [];
}

/**
 * Publica um post no Instagram
 */
export async function publishPost(post: ScheduledPost & { instagram_accounts: any }): Promise<PublishResult> {
  const account = post.instagram_accounts;
  
  if (!account?.access_token || !account?.ig_user_id) {
    return {
      success: false,
      error: 'Conta do Instagram não configurada corretamente',
    };
  }

  const api = new InstagramAPI(account.access_token, account.ig_user_id);

  try {
    // Marcar como publicando
    await updatePostStatus(post.id, 'publishing');

    let result: any;
    const fullCaption = post.caption + (post.hashtags?.length > 0 ? '\n\n' + post.hashtags.join(' ') : '');

    // Publicar baseado no tipo de conteúdo
    switch (post.content_type) {
      case 'image':
        result = await api.publishImage(post.media_urls[0], fullCaption);
        break;
      
      case 'video':
      case 'reels':
        result = await api.publishReel(post.media_urls[0], { 
          caption: fullCaption,
          shareToFeed: true,
        });
        break;
      
      case 'carousel':
        result = await api.publishCarousel(post.media_urls, fullCaption);
        break;

      case 'story_image':
        result = await api.publishStoryImage(post.media_urls[0]);
        break;

      case 'story_video':
        result = await api.publishStoryVideo(post.media_urls[0]);
        break;
      
      default:
        throw new Error(`Tipo de conteúdo não suportado: ${post.content_type}`);
    }

    // Publicar primeiro comentário se configurado
    if (post.first_comment && result.id) {
      try {
        await api.addComment(result.id, post.first_comment);
      } catch (commentError) {
        console.error('Error posting first comment:', commentError);
        // Não falhar a publicação por causa do comentário
      }
    }

    // Marcar como publicado
    await updatePostStatus(post.id, 'published', result.id);

    // Registrar no log de atividades
    await logActivity(account.user_id, account.id, 'post_published', {
      post_id: post.id,
      instagram_media_id: result.id,
      content_type: post.content_type,
    });

    return {
      success: true,
      postId: result.id,
      publishedAt: new Date(),
    };
  } catch (error: any) {
    console.error('Error publishing post:', error);

    // Marcar como falhou
    await updatePostStatus(post.id, 'failed', null, error.message);

    // Registrar erro no log
    await logActivity(account.user_id, account.id, 'post_failed', {
      post_id: post.id,
      error: error.message,
    });

    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Atualiza o status de um post
 */
async function updatePostStatus(
  postId: string,
  status: string,
  instagramMediaId?: string | null,
  errorMessage?: string
): Promise<void> {
  const updateData: any = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === 'published') {
    updateData.published_at = new Date().toISOString();
    if (instagramMediaId) {
      updateData.instagram_media_id = instagramMediaId;
    }
  }

  if (status === 'failed' && errorMessage) {
    updateData.error_message = errorMessage;
    updateData.retry_count = supabase.rpc('increment_retry_count', { row_id: postId });
  }

  const { error } = await supabase
    .from('instaflow_scheduled_posts')
    .update(updateData)
    .eq('id', postId);

  if (error) {
    console.error('Error updating post status:', error);
  }
}

/**
 * Registra atividade no log
 */
async function logActivity(
  userId: string,
  accountId: string,
  action: string,
  details: Record<string, any>
): Promise<void> {
  const { error } = await supabase.from('instaflow_activity_log').insert({
    user_id: userId,
    account_id: accountId,
    action,
    details,
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error('Error logging activity:', error);
  }
}

/**
 * Reprocessa posts que falharam (com retry limit)
 */
export async function retryFailedPosts(maxRetries: number = 3): Promise<void> {
  const { data: failedPosts, error } = await supabase
    .from('instaflow_scheduled_posts')
    .select(`
      *,
      instagram_accounts!inner(
        id,
        user_id,
        access_token,
        ig_user_id
      )
    `)
    .eq('status', 'failed')
    .lt('retry_count', maxRetries)
    .order('updated_at', { ascending: true })
    .limit(5);

  if (error || !failedPosts?.length) {
    return;
  }

  for (const post of failedPosts) {
    // Aguardar um pouco entre retries
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    console.log(`Retrying post ${post.id}, attempt ${(post.retry_count || 0) + 1}`);
    await publishPost(post);
  }
}

/**
 * Worker principal - executa a cada minuto via cron
 */
export async function runPublishWorker(): Promise<{
  processed: number;
  published: number;
  failed: number;
}> {
  console.log('Starting publish worker...');
  
  const pendingPosts = await getPendingPosts();
  
  if (pendingPosts.length === 0) {
    console.log('No pending posts to publish');
    return { processed: 0, published: 0, failed: 0 };
  }

  let published = 0;
  let failed = 0;

  for (const post of pendingPosts) {
    const result = await publishPost(post as any);
    
    if (result.success) {
      published++;
    } else {
      failed++;
    }

    // Rate limiting - aguardar entre publicações
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  // Tentar reprocessar posts com falha
  await retryFailedPosts();

  console.log(`Publish worker completed: ${published} published, ${failed} failed`);
  
  return {
    processed: pendingPosts.length,
    published,
    failed,
  };
}

/**
 * Handler para API Route ou Edge Function
 */
export async function handleCronRequest(
  authHeader?: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  // Verificar autorização do cron
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const result = await runPublishWorker();
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Publish worker error:', error);
    return { success: false, error: error.message };
  }
}
