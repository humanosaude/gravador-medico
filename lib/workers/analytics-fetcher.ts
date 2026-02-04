/**
 * InstaFlow - Analytics Fetcher Worker
 * 
 * Este worker busca métricas atualizadas das contas do Instagram
 * Deve ser executado via cron job (1-2x por dia)
 */

import { createClient } from '@supabase/supabase-js';
import { InstagramAPI } from '@/lib/instagram/api';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface FetchResult {
  accountId: string;
  success: boolean;
  metricsUpdated: number;
  error?: string;
}

/**
 * Busca contas ativas para atualização
 */
async function getActiveAccounts(): Promise<any[]> {
  const { data, error } = await supabase
    .from('instagram_accounts')
    .select('*')
    .eq('is_active', true)
    .gt('token_expires_at', new Date().toISOString());

  if (error) {
    console.error('Error fetching accounts:', error);
    return [];
  }

  return data || [];
}

/**
 * Atualiza métricas da conta
 */
async function updateAccountMetrics(account: any): Promise<FetchResult> {
  const api = new InstagramAPI(account.access_token, account.ig_user_id);

  try {
    // Buscar perfil atualizado
    const profile = await api.getProfile();

    // Buscar insights da conta (últimos 30 dias)
    const insights = await api.getAccountInsights();

    // Salvar snapshot de analytics
    const { error: insertError } = await supabase
      .from('instaflow_account_analytics')
      .insert({
        account_id: account.id,
        date: new Date().toISOString().split('T')[0],
        followers_count: profile.followers_count,
        following_count: profile.follows_count,
        media_count: profile.media_count,
        impressions: insights.impressions,
        reach: insights.reach,
        profile_views: insights.profile_views,
        website_clicks: insights.website_clicks,
        followers_gained: 0, // Calculado na próxima atualização
        followers_lost: 0,
      });

    if (insertError) {
      console.error('Error inserting analytics:', insertError);
    }

    // Atualizar dados da conta
    await supabase
      .from('instagram_accounts')
      .update({
        followers_count: profile.followers_count,
        profile_picture_url: profile.profile_picture_url,
        updated_at: new Date().toISOString(),
      })
      .eq('id', account.id);

    // Buscar métricas dos posts recentes
    const recentMedia = await api.getRecentMedia(25);
    let metricsUpdated = 0;

    for (const media of recentMedia) {
      try {
        const mediaInsights = await api.getMediaInsights(media.id);
        
        // Atualizar ou criar registro de analytics do post
        const { error: upsertError } = await supabase
          .from('instaflow_post_analytics')
          .upsert({
            post_id: null, // Post pode não estar no nosso banco se foi criado externamente
            instagram_media_id: media.id,
            account_id: account.id,
            impressions: mediaInsights.impressions,
            reach: mediaInsights.reach,
            engagement: mediaInsights.engagement,
            likes: mediaInsights.likes,
            comments: mediaInsights.comments,
            shares: mediaInsights.shares,
            saves: mediaInsights.saved,
            video_views: mediaInsights.video_views || 0,
            plays: mediaInsights.plays || 0,
            recorded_at: new Date().toISOString(),
          }, {
            onConflict: 'instagram_media_id',
          });

        if (!upsertError) {
          metricsUpdated++;
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (mediaError) {
        console.error(`Error fetching insights for media ${media.id}:`, mediaError);
      }
    }

    return {
      accountId: account.id,
      success: true,
      metricsUpdated,
    };
  } catch (error: any) {
    console.error(`Error updating account ${account.id}:`, error);
    
    return {
      accountId: account.id,
      success: false,
      metricsUpdated: 0,
      error: error.message,
    };
  }
}

/**
 * Calcula variação de seguidores
 */
async function calculateFollowersChange(accountId: string): Promise<void> {
  // Buscar últimas 2 entradas
  const { data: analytics } = await supabase
    .from('instaflow_account_analytics')
    .select('*')
    .eq('account_id', accountId)
    .order('date', { ascending: false })
    .limit(2);

  if (!analytics || analytics.length < 2) return;

  const today = analytics[0];
  const yesterday = analytics[1];

  const change = today.followers_count - yesterday.followers_count;
  
  await supabase
    .from('instaflow_account_analytics')
    .update({
      followers_gained: change > 0 ? change : 0,
      followers_lost: change < 0 ? Math.abs(change) : 0,
    })
    .eq('id', today.id);
}

/**
 * Worker principal
 */
export async function runAnalyticsFetcher(): Promise<{
  processed: number;
  success: number;
  failed: number;
  totalMetrics: number;
}> {
  console.log('Starting analytics fetcher...');

  const accounts = await getActiveAccounts();
  
  if (accounts.length === 0) {
    console.log('No active accounts to process');
    return { processed: 0, success: 0, failed: 0, totalMetrics: 0 };
  }

  let success = 0;
  let failed = 0;
  let totalMetrics = 0;

  for (const account of accounts) {
    const result = await updateAccountMetrics(account);
    
    if (result.success) {
      success++;
      totalMetrics += result.metricsUpdated;
      
      // Calcular variação de seguidores
      await calculateFollowersChange(account.id);
    } else {
      failed++;
    }

    // Rate limiting entre contas
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  console.log(`Analytics fetcher completed: ${success} success, ${failed} failed, ${totalMetrics} metrics`);

  return {
    processed: accounts.length,
    success,
    failed,
    totalMetrics,
  };
}

/**
 * Handler para API Route ou Edge Function
 */
export async function handleAnalyticsCron(
  authHeader?: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const result = await runAnalyticsFetcher();
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Analytics fetcher error:', error);
    return { success: false, error: error.message };
  }
}
