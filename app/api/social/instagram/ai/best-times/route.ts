/**
 * InstaFlow - AI Best Times API
 */

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { 
  calculateBestTimesFromHistory, 
  suggestBestTimesWithAI, 
  formatTimeSlot,
  HistoricalData
} from '@/lib/ai/best-times';

export async function GET(request: Request) {
  try {
    const supabase = supabaseAdmin;
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
    }

    // Buscar dados históricos dos últimos 90 dias
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data: posts } = await supabase
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

    // Converter para formato esperado
    const historicalData: HistoricalData[] = (posts || [])
      .filter((p: any) => p.published_at && p.instaflow_post_analytics?.[0])
      .map((p: any) => {
        const analytics = p.instaflow_post_analytics[0];
        return {
          postedAt: new Date(p.published_at),
          reach: analytics.reach || 0,
          engagement: analytics.engagement || 0,
          impressions: analytics.impressions || 0,
          contentType: p.content_type as 'image' | 'video' | 'carousel' | 'reels',
        };
      });

    let bestTimes;

    if (historicalData.length >= 10) {
      // Dados suficientes - calcular com base no histórico
      bestTimes = calculateBestTimesFromHistory(historicalData);
    } else {
      // Dados insuficientes - usar IA para sugerir
      const { data: account } = await supabase
        .from('instagram_accounts')
        .select('username')
        .eq('id', accountId)
        .single();

      bestTimes = await suggestBestTimesWithAI(
        account?.username || 'geral',
        'público brasileiro',
        'America/Sao_Paulo'
      );
    }

    // Formatar horários para exibição
    const formattedTimes = bestTimes.bestTimes.slice(0, 10).map(slot => ({
      ...slot,
      formatted: formatTimeSlot(slot),
    }));

    return NextResponse.json({
      bestTimes: formattedTimes,
      heatmap: bestTimes.weeklyHeatmap,
      recommendations: bestTimes.recommendations,
      dataPoints: historicalData.length,
      isAISuggestion: historicalData.length < 10,
    });
  } catch (error: any) {
    console.error('Best Times API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
