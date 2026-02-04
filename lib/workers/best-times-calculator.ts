/**
 * InstaFlow - Calculador de Melhores Horários Worker
 * 
 * Recalcula os melhores horários para postar baseado em dados históricos
 * Deve ser executado semanalmente
 */

import { createClient } from '@supabase/supabase-js';
import { calculateBestTimesFromHistory, HistoricalData, BestTimesAnalysis } from '@/lib/ai/best-times';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface BestTimesResult {
  accountId: string;
  success: boolean;
  bestTimes: BestTimesAnalysis | null;
  error?: string;
}

/**
 * Busca contas ativas
 */
async function getActiveAccounts(): Promise<any[]> {
  const { data, error } = await supabase
    .from('instagram_accounts')
    .select('id, user_id, username')
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching accounts:', error);
    return [];
  }

  return data || [];
}

/**
 * Busca dados históricos de posts
 */
async function getHistoricalData(accountId: string): Promise<HistoricalData[]> {
  // Buscar posts publicados nos últimos 90 dias
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const { data: posts, error } = await supabase
    .from('instaflow_scheduled_posts')
    .select(`
      id,
      content_type,
      published_at,
      instaflow_post_analytics(
        reach,
        engagement,
        impressions
      )
    `)
    .eq('account_id', accountId)
    .eq('status', 'published')
    .gte('published_at', ninetyDaysAgo.toISOString())
    .order('published_at', { ascending: false });

  if (error || !posts) {
    console.error('Error fetching historical data:', error);
    return [];
  }

  return posts
    .filter(p => p.published_at && p.instaflow_post_analytics?.[0])
    .map(p => {
      const analytics = p.instaflow_post_analytics[0];
      return {
        postedAt: new Date(p.published_at),
        reach: analytics.reach || 0,
        engagement: analytics.engagement || 0,
        impressions: analytics.impressions || 0,
        contentType: p.content_type as 'image' | 'video' | 'carousel' | 'reels',
      };
    });
}

/**
 * Salva os melhores horários calculados
 */
async function saveBestTimes(
  userId: string,
  accountId: string,
  bestTimes: BestTimesAnalysis
): Promise<void> {
  // Buscar configurações existentes
  const { data: existing } = await supabase
    .from('instaflow_settings')
    .select('settings')
    .eq('user_id', userId)
    .eq('account_id', accountId)
    .single();

  const currentSettings = existing?.settings || {};
  
  // Atualizar com os novos melhores horários
  const updatedSettings = {
    ...currentSettings,
    best_times: {
      calculated_at: new Date().toISOString(),
      times: bestTimes.bestTimes.map(t => ({
        day: t.dayOfWeek,
        hour: t.hour,
        score: t.score,
      })),
      heatmap: bestTimes.weeklyHeatmap,
      recommendations: bestTimes.recommendations,
    },
  };

  // Upsert configurações
  await supabase
    .from('instaflow_settings')
    .upsert({
      user_id: userId,
      account_id: accountId,
      settings: updatedSettings,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,account_id',
    });
}

/**
 * Calcula melhores horários para uma conta
 */
async function calculateForAccount(account: any): Promise<BestTimesResult> {
  try {
    const historicalData = await getHistoricalData(account.id);

    if (historicalData.length < 10) {
      return {
        accountId: account.id,
        success: false,
        bestTimes: null,
        error: 'Insufficient data (need at least 10 posts)',
      };
    }

    const bestTimes = calculateBestTimesFromHistory(historicalData);

    await saveBestTimes(account.user_id, account.id, bestTimes);

    return {
      accountId: account.id,
      success: true,
      bestTimes,
    };
  } catch (error: any) {
    console.error(`Error calculating best times for ${account.id}:`, error);
    
    return {
      accountId: account.id,
      success: false,
      bestTimes: null,
      error: error.message,
    };
  }
}

/**
 * Worker principal
 */
export async function runBestTimesCalculator(): Promise<{
  processed: number;
  success: number;
  failed: number;
  skipped: number;
}> {
  console.log('Starting best times calculator...');

  const accounts = await getActiveAccounts();
  
  if (accounts.length === 0) {
    console.log('No active accounts to process');
    return { processed: 0, success: 0, failed: 0, skipped: 0 };
  }

  let success = 0;
  let failed = 0;
  let skipped = 0;

  for (const account of accounts) {
    const result = await calculateForAccount(account);
    
    if (result.success) {
      success++;
    } else if (result.error?.includes('Insufficient')) {
      skipped++;
    } else {
      failed++;
    }
  }

  console.log(`Best times calculator completed: ${success} success, ${failed} failed, ${skipped} skipped`);

  return {
    processed: accounts.length,
    success,
    failed,
    skipped,
  };
}

/**
 * Handler para API Route ou Edge Function
 */
export async function handleBestTimesCron(
  authHeader?: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const result = await runBestTimesCalculator();
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Best times calculator error:', error);
    return { success: false, error: error.message };
  }
}
