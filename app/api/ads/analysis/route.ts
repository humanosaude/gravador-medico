/**
 * 🧠 API DE ANÁLISE DE CAMPANHAS COM IA
 * 
 * Endpoint que analisa campanhas e gera insights inteligentes
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { analyzeAllCampaigns, generateAIAnalysis, CampaignForAnalysis } from '@/lib/campaign-analyzer';

export const dynamic = 'force-dynamic';

// =====================================================
// BUSCAR DADOS DO COCKPIT
// =====================================================

async function fetchCockpitData(days: number = 7): Promise<any> {
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - days);
  
  const since = startDate.toISOString().split('T')[0];
  const until = today.toISOString().split('T')[0];
  
  // Buscar credenciais
  const { data: settings } = await supabaseAdmin
    .from('ai_settings')
    .select('meta_ad_account_id, meta_access_token, openai_api_key')
    .single();

  const adAccountId = settings?.meta_ad_account_id || process.env.META_AD_ACCOUNT_ID;
  const accessToken = settings?.meta_access_token || process.env.META_ACCESS_TOKEN;
  const openaiKey = settings?.openai_api_key || process.env.OPENAI_API_KEY;

  if (!adAccountId || !accessToken) {
    throw new Error('Credenciais Meta não configuradas');
  }

  // Buscar insights de campanhas
  const fields = [
    'campaign_id',
    'campaign_name',
    'spend',
    'reach',
    'impressions',
    'frequency',
    'clicks',
    'cpc',
    'cpm',
    'ctr',
    'actions',
    'action_values'
  ].join(',');

  const url = `https://graph.facebook.com/v21.0/act_${adAccountId}/insights?` + new URLSearchParams({
    access_token: accessToken,
    fields,
    level: 'campaign',
    time_range: JSON.stringify({ since, until }),
    limit: '500'
  });

  const response = await fetch(url, { cache: 'no-store' });
  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message);
  }

  return {
    campaigns: data.data || [],
    period: { since, until },
    openaiKey
  };
}

// =====================================================
// PROCESSAR CAMPANHAS
// =====================================================

function processCampaigns(rawCampaigns: any[]): CampaignForAnalysis[] {
  return rawCampaigns.map(c => {
    const actions = c.actions || [];
    const actionValues = c.action_values || [];
    
    // Extrair métricas
    const extractAction = (types: string[]) => {
      return actions
        .filter((a: any) => types.includes(a.action_type))
        .reduce((sum: number, a: any) => sum + Number(a.value || 0), 0);
    };
    
    const extractActionValue = (types: string[]) => {
      return actionValues
        .filter((a: any) => types.includes(a.action_type))
        .reduce((sum: number, a: any) => sum + Number(a.value || 0), 0);
    };
    
    const link_clicks = extractAction(['link_click']);
    const landing_page_views = extractAction(['landing_page_view']);
    const checkout_initiated = extractAction(['initiate_checkout', 'offsite_conversion.fb_pixel_initiate_checkout']);
    const purchases = extractAction(['purchase', 'offsite_conversion.fb_pixel_purchase', 'omni_purchase']);
    const purchase_value = extractActionValue(['purchase', 'offsite_conversion.fb_pixel_purchase', 'omni_purchase']);
    
    const spend = parseFloat(c.spend || '0');
    const clicks = parseInt(c.clicks || '0');
    const ctr = parseFloat(c.ctr || '0');
    
    const connect_rate = link_clicks > 0 ? (landing_page_views / link_clicks) * 100 : 0;
    const roas = spend > 0 ? purchase_value / spend : 0;
    const profit_value = purchase_value - spend;
    const ticket_medio = purchases > 0 ? purchase_value / purchases : 0;
    
    // Classificar funil pelo nome
    const name = (c.campaign_name || '').toLowerCase();
    let funnel_stage: 'topo' | 'meio' | 'fundo' = 'meio';
    let consciousness_level = 'solucao';
    
    if (name.includes('awareness') || name.includes('alcance') || name.includes('topo') || name.includes('top')) {
      funnel_stage = 'topo';
      consciousness_level = 'inconsciente';
    } else if (name.includes('conversao') || name.includes('vendas') || name.includes('fundo') || name.includes('remarketing')) {
      funnel_stage = 'fundo';
      consciousness_level = 'produto';
    }
    
    return {
      campaign_id: c.campaign_id || '',
      campaign_name: c.campaign_name || '',
      spend,
      reach: parseInt(c.reach || '0'),
      impressions: parseInt(c.impressions || '0'),
      frequency: parseFloat(c.frequency || '0'),
      cpm: parseFloat(c.cpm || '0'),
      clicks,
      link_clicks,
      cpc: parseFloat(c.cpc || '0'),
      ctr,
      landing_page_views,
      connect_rate,
      checkout_initiated,
      purchases,
      purchase_value,
      roas,
      profit_value,
      ticket_medio,
      funnel_stage,
      consciousness_level
    };
  });
}

// =====================================================
// HANDLER
// =====================================================

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '7');
    const includeAI = searchParams.get('ai') !== 'false';
    
    console.log('🧠 [Campaign Analysis] Iniciando análise, dias:', days);
    
    // Buscar dados
    const { campaigns: rawCampaigns, period, openaiKey } = await fetchCockpitData(days);
    
    if (!rawCampaigns.length) {
      return NextResponse.json({
        success: true,
        message: 'Nenhuma campanha encontrada no período',
        analysis: null
      });
    }
    
    // Processar campanhas
    const campaigns = processCampaigns(rawCampaigns);
    
    // Analisar
    const analysis = await analyzeAllCampaigns(campaigns, period);
    
    // Gerar análise de IA se solicitado
    let aiNarrative = '';
    if (includeAI && openaiKey) {
      aiNarrative = await generateAIAnalysis(analysis, openaiKey);
    }
    
    console.log('🧠 [Campaign Analysis] Análise concluída:', {
      campaigns: analysis.total_campaigns,
      health: analysis.overall_health,
      critical: analysis.campaigns.filter(c => c.health_status === 'critico').length
    });
    
    return NextResponse.json({
      success: true,
      analysis,
      aiNarrative
    });
    
  } catch (error) {
    console.error('❌ [Campaign Analysis] Erro:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}
