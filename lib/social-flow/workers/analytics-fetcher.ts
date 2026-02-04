/**
 * Social Flow Worker - Analytics Fetcher
 * 
 * Busca métricas de posts e contas periodicamente.
 * Deve ser executado a cada 15-30 minutos via cron job.
 */

import { createClient } from '@supabase/supabase-js';
import { SocialNetwork, SocialAccount } from '../types';
import { getAnalyticsForAccount, isNetworkConfigured } from '../networks';

export interface AnalyticsFetchResult {
  accountId: string;
  network: SocialNetwork;
  success: boolean;
  postsUpdated?: number;
  error?: string;
}

export interface AnalyticsFetcherReport {
  processedAt: string;
  totalAccounts: number;
  totalSuccess: number;
  totalFailed: number;
  totalPostsUpdated: number;
  results: AnalyticsFetchResult[];
}

/**
 * Busca métricas de todas as contas ativas
 */
export async function fetchAnalytics(): Promise<AnalyticsFetcherReport> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const results: AnalyticsFetchResult[] = [];
  const now = new Date();
  let totalPostsUpdated = 0;

  console.log(`[AnalyticsFetcher] Starting at ${now.toISOString()}`);

  try {
    // Buscar contas ativas que não foram sincronizadas recentemente
    const syncInterval = 30 * 60 * 1000; // 30 minutos
    const lastSyncThreshold = new Date(now.getTime() - syncInterval);

    const { data: accounts, error } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('is_active', true)
      .or(`last_sync_at.is.null,last_sync_at.lt.${lastSyncThreshold.toISOString()}`)
      .limit(50);

    if (error) {
      console.error('[AnalyticsFetcher] Error fetching accounts:', error);
      throw error;
    }

    if (!accounts?.length) {
      console.log('[AnalyticsFetcher] No accounts to sync');
      return {
        processedAt: now.toISOString(),
        totalAccounts: 0,
        totalSuccess: 0,
        totalFailed: 0,
        totalPostsUpdated: 0,
        results: [],
      };
    }

    console.log(`[AnalyticsFetcher] Found ${accounts.length} accounts to sync`);

    // Processar cada conta
    for (const account of accounts) {
      // Verificar se a rede está configurada
      if (!isNetworkConfigured(account.network)) {
        results.push({
          accountId: account.id,
          network: account.network,
          success: false,
          error: 'Network not configured',
        });
        continue;
      }

      // Verificar se há token válido
      if (!account.access_token) {
        results.push({
          accountId: account.id,
          network: account.network,
          success: false,
          error: 'No access token',
        });
        continue;
      }

      try {
        // Obter analytics adapter para a rede
        const analytics = getAnalyticsForAccount(account as SocialAccount);

        if (!analytics) {
          results.push({
            accountId: account.id,
            network: account.network,
            success: false,
            error: 'Analytics not available for this network',
          });
          continue;
        }

        // Buscar métricas da conta
        const accountMetrics = await analytics.getAccountMetrics(account.platform_account_id);
        
        // Atualizar métricas da conta
        if (accountMetrics) {
          await supabase
            .from('social_accounts')
            .update({
              followers_count: accountMetrics.followersCount || account.followers_count,
              following_count: accountMetrics.followingCount || account.following_count,
              posts_count: accountMetrics.mediaCount || account.posts_count,
              engagement_rate: accountMetrics.engagementRate,
              last_sync_at: now.toISOString(),
              updated_at: now.toISOString(),
            })
            .eq('id', account.id);

          // Salvar histórico
          await supabase
            .from('social_account_metrics_history')
            .insert({
              account_id: account.id,
              followers_count: accountMetrics.followersCount,
              following_count: accountMetrics.followingCount,
              posts_count: accountMetrics.mediaCount,
              engagement_rate: accountMetrics.engagementRate,
              impressions: accountMetrics.impressions,
              reach: accountMetrics.reach,
              recorded_at: now.toISOString(),
            });
        }

        // Buscar posts publicados recentemente para atualizar métricas
        const { data: recentPosts } = await supabase
          .from('social_posts')
          .select('id, platform_post_id')
          .eq('account_id', account.id)
          .eq('status', 'published')
          .not('platform_post_id', 'is', null)
          .order('published_at', { ascending: false })
          .limit(20);

        let postsUpdated = 0;

        // Atualizar métricas de cada post
        for (const post of recentPosts || []) {
          try {
            const postMetrics = await analytics.getPostMetrics(post.platform_post_id);

            if (postMetrics) {
              // Upsert métricas do post
              await supabase
                .from('social_post_metrics')
                .upsert({
                  post_id: post.id,
                  impressions: postMetrics.impressions,
                  reach: postMetrics.reach,
                  engagement: postMetrics.engagement,
                  likes: postMetrics.likeCount || postMetrics.likes,
                  comments: postMetrics.commentsCount || postMetrics.comments,
                  shares: postMetrics.sharesCount || postMetrics.shares,
                  saves: postMetrics.savedCount || postMetrics.saves,
                  video_views: postMetrics.videoViews || postMetrics.plays,
                  updated_at: now.toISOString(),
                }, {
                  onConflict: 'post_id',
                });

              // Salvar histórico
              await supabase
                .from('social_post_metrics_history')
                .insert({
                  post_id: post.id,
                  impressions: postMetrics.impressions,
                  reach: postMetrics.reach,
                  engagement: postMetrics.engagement,
                  likes: postMetrics.likeCount || postMetrics.likes,
                  comments: postMetrics.commentsCount || postMetrics.comments,
                  shares: postMetrics.sharesCount || postMetrics.shares,
                  saves: postMetrics.savedCount || postMetrics.saves,
                  recorded_at: now.toISOString(),
                });

              postsUpdated++;
            }
          } catch (postError) {
            console.error(`[AnalyticsFetcher] Error fetching metrics for post ${post.id}:`, postError);
          }

          // Rate limiting
          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        results.push({
          accountId: account.id,
          network: account.network,
          success: true,
          postsUpdated,
        });

        totalPostsUpdated += postsUpdated;
        console.log(`[AnalyticsFetcher] Synced ${account.account_name}: ${postsUpdated} posts updated`);
      } catch (accountError: any) {
        console.error(`[AnalyticsFetcher] Error syncing account ${account.id}:`, accountError);
        
        results.push({
          accountId: account.id,
          network: account.network,
          success: false,
          error: accountError.message,
        });

        // Marcar erro na conta
        await supabase
          .from('social_accounts')
          .update({
            last_error: accountError.message,
            last_error_at: now.toISOString(),
          })
          .eq('id', account.id);
      }

      // Delay entre contas
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    const report: AnalyticsFetcherReport = {
      processedAt: now.toISOString(),
      totalAccounts: accounts.length,
      totalSuccess: results.filter((r) => r.success).length,
      totalFailed: results.filter((r) => !r.success).length,
      totalPostsUpdated,
      results,
    };

    console.log(`[AnalyticsFetcher] Completed: ${report.totalSuccess} success, ${report.totalFailed} failed, ${totalPostsUpdated} posts updated`);

    return report;
  } catch (error: any) {
    console.error('[AnalyticsFetcher] Fatal error:', error);
    throw error;
  }
}

/**
 * Força sincronização de uma conta específica
 */
export async function fetchAccountAnalytics(accountId: string): Promise<AnalyticsFetchResult> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const now = new Date();

  const { data: account, error } = await supabase
    .from('social_accounts')
    .select('*')
    .eq('id', accountId)
    .single();

  if (error || !account) {
    return {
      accountId,
      network: 'instagram',
      success: false,
      error: 'Account not found',
    };
  }

  if (!isNetworkConfigured(account.network)) {
    return {
      accountId: account.id,
      network: account.network,
      success: false,
      error: 'Network not configured',
    };
  }

  if (!account.access_token) {
    return {
      accountId: account.id,
      network: account.network,
      success: false,
      error: 'No access token',
    };
  }

  try {
    const analytics = getAnalyticsForAccount(account as SocialAccount);

    if (!analytics) {
      return {
        accountId: account.id,
        network: account.network,
        success: false,
        error: 'Analytics not available',
      };
    }

    const accountMetrics = await analytics.getAccountMetrics(account.platform_account_id);

    if (accountMetrics) {
      await supabase
        .from('social_accounts')
        .update({
          followers_count: accountMetrics.followersCount,
          following_count: accountMetrics.followingCount,
          posts_count: accountMetrics.mediaCount,
          engagement_rate: accountMetrics.engagementRate,
          last_sync_at: now.toISOString(),
          updated_at: now.toISOString(),
          last_error: null,
          last_error_at: null,
        })
        .eq('id', account.id);
    }

    return {
      accountId: account.id,
      network: account.network,
      success: true,
      postsUpdated: 0,
    };
  } catch (error: any) {
    await supabase
      .from('social_accounts')
      .update({
        last_error: error.message,
        last_error_at: now.toISOString(),
      })
      .eq('id', account.id);

    return {
      accountId: account.id,
      network: account.network,
      success: false,
      error: error.message,
    };
  }
}
