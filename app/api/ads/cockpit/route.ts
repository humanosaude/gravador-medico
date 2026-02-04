/**
 * 🎯 COCKPIT DE CAMPANHAS - API COMPLETA
 * 
 * Retorna TODAS as métricas de campanhas detalhadas:
 * - Campanha > Conjunto > Anúncio
 * - Métricas de Tráfego, Engajamento, Conversão
 * - Análise de Funil de Consciência
 * - Cálculos de Lucro e ROI
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// =====================================================
// TIPOS
// =====================================================

interface MetaCredentials {
  adAccountId: string;
  accessToken: string;
}

interface CockpitCampaign {
  // Identificação
  campaign_id: string;
  campaign_name: string;
  adset_id?: string;
  adset_name?: string;
  ad_id?: string;
  ad_name?: string;
  level: 'campaign' | 'adset' | 'ad';
  
  // Métricas de Alcance
  reach: number;
  impressions: number;
  frequency: number;
  cpm: number;
  
  // Métricas de Engajamento
  clicks: number;
  link_clicks: number;
  cpc: number;
  ctr: number;
  
  // Métricas de Landing Page
  landing_page_views: number;
  connect_rate: number; // PV / Cliques
  
  // Métricas de Checkout (4 tipos)
  checkout_initiated: number;
  checkout_add_payment_info: number;
  checkout_completed: number;
  checkout_conversion_rate: number; // Checkout / PV
  pv_to_checkout_rate: number;
  
  // Métricas de Compra
  purchases: number;
  purchase_value: number;
  cost_per_purchase: number;
  
  // ROAS e Lucro
  spend: number;
  roas: number;
  profit_percentage: number;
  profit_value: number;
  ticket_medio: number;
  
  // Conversão Global
  global_conversion_rate: number; // Compras / Cliques
  
  // Funil de Consciência (classificação)
  funnel_stage?: 'topo' | 'meio' | 'fundo';
  consciousness_level?: string;
}

interface CockpitResponse {
  success: boolean;
  period: { since: string; until: string };
  summary: {
    total_spend: number;
    total_reach: number;
    total_impressions: number;
    total_clicks: number;
    total_link_clicks: number;
    total_landing_page_views: number;
    total_checkouts: number;
    total_purchases: number;
    total_revenue: number;
    avg_cpm: number;
    avg_cpc: number;
    avg_ctr: number;
    avg_connect_rate: number;
    avg_checkout_rate: number;
    overall_roas: number;
    overall_profit: number;
    avg_ticket: number;
  };
  campaigns: CockpitCampaign[];
  adsets: CockpitCampaign[];
  ads: CockpitCampaign[];
  funnel_analysis: {
    topo: CockpitCampaign[];
    meio: CockpitCampaign[];
    fundo: CockpitCampaign[];
  };
}

// =====================================================
// BUSCAR CREDENCIAIS
// =====================================================

async function getMetaCredentials(): Promise<MetaCredentials | null> {
  try {
    const { data } = await supabaseAdmin
      .from('ai_settings')
      .select('meta_ad_account_id, meta_access_token')
      .single();

    if (data?.meta_ad_account_id && data?.meta_access_token) {
      return {
        adAccountId: data.meta_ad_account_id,
        accessToken: data.meta_access_token
      };
    }
  } catch (e) {
    // Fallback para env vars
  }

  const adAccountId = process.env.META_AD_ACCOUNT_ID;
  const accessToken = process.env.META_ACCESS_TOKEN;

  if (adAccountId && accessToken) {
    return { adAccountId, accessToken };
  }

  return null;
}

// =====================================================
// BUSCAR INSIGHTS DETALHADOS
// =====================================================

async function fetchInsights(
  credentials: MetaCredentials,
  level: 'campaign' | 'adset' | 'ad',
  since: string,
  until: string
): Promise<any[]> {
  const { adAccountId, accessToken } = credentials;
  
  // Campos completos para análise de cockpit
  const fields = [
    'campaign_id',
    'campaign_name',
    'adset_id',
    'adset_name', 
    'ad_id',
    'ad_name',
    'spend',
    'reach',
    'impressions',
    'frequency',
    'clicks',
    'cpc',
    'cpm',
    'ctr',
    'actions',
    'action_values',
    'outbound_clicks',
    'cost_per_action_type',
    'video_thruplay_watched_actions'
  ].join(',');

  const url = `https://graph.facebook.com/v21.0/act_${adAccountId}/insights?` + new URLSearchParams({
    access_token: accessToken,
    fields,
    level,
    time_range: JSON.stringify({ since, until }),
    limit: '500'
  });

  try {
    const response = await fetch(url, { cache: 'no-store' });
    const data = await response.json();

    if (data.error) {
      console.error(`❌ [Cockpit] Erro ao buscar ${level}:`, data.error);
      return [];
    }

    return data.data || [];
  } catch (error) {
    console.error(`❌ [Cockpit] Erro na requisição ${level}:`, error);
    return [];
  }
}

// =====================================================
// EXTRAIR MÉTRICAS DE ACTIONS
// =====================================================

const ACTION_TYPES = {
  link_clicks: ['link_click'],
  landing_page_views: ['landing_page_view'],
  checkout_initiated: ['initiate_checkout', 'offsite_conversion.fb_pixel_initiate_checkout'],
  checkout_add_payment: ['add_payment_info', 'offsite_conversion.fb_pixel_add_payment_info'],
  checkout_completed: ['purchase', 'offsite_conversion.fb_pixel_purchase', 'omni_purchase'],
  purchases: ['purchase', 'offsite_conversion.fb_pixel_purchase', 'omni_purchase'],
  leads: ['lead', 'offsite_conversion.fb_pixel_lead']
};

function extractAction(actions: any[] | undefined, types: string[]): number {
  if (!actions || !Array.isArray(actions)) return 0;
  return actions
    .filter(a => types.includes(a.action_type))
    .reduce((sum, a) => sum + Number(a.value || 0), 0);
}

function extractActionValue(actionValues: any[] | undefined, types: string[]): number {
  if (!actionValues || !Array.isArray(actionValues)) return 0;
  return actionValues
    .filter(a => types.includes(a.action_type))
    .reduce((sum, a) => sum + Number(a.value || 0), 0);
}

// =====================================================
// CLASSIFICAR FUNIL DE CONSCIÊNCIA
// =====================================================

function classifyFunnelStage(campaign: CockpitCampaign): { 
  funnel_stage: 'topo' | 'meio' | 'fundo';
  consciousness_level: string;
} {
  const name = (campaign.campaign_name || '').toLowerCase();
  const ctr = campaign.ctr;
  const conversionRate = campaign.global_conversion_rate;
  const roas = campaign.roas;
  
  // Análise por nome da campanha
  if (name.includes('awareness') || name.includes('alcance') || name.includes('brand') || 
      name.includes('topo') || name.includes('descoberta') || name.includes('top')) {
    return { funnel_stage: 'topo', consciousness_level: 'inconsciente' };
  }
  
  if (name.includes('engajamento') || name.includes('consideração') || name.includes('trafego') ||
      name.includes('traffico') || name.includes('meio') || name.includes('middle') ||
      name.includes('whatsapp') || name.includes('lead')) {
    return { funnel_stage: 'meio', consciousness_level: 'problema' };
  }
  
  if (name.includes('conversao') || name.includes('vendas') || name.includes('compra') ||
      name.includes('fundo') || name.includes('bottom') || name.includes('retargeting') ||
      name.includes('remarketing') || name.includes('carrinho')) {
    return { funnel_stage: 'fundo', consciousness_level: 'produto' };
  }
  
  // Análise por métricas se não identificou pelo nome
  if (conversionRate > 3 || roas > 2) {
    return { funnel_stage: 'fundo', consciousness_level: 'totalmente_consciente' };
  }
  
  if (ctr > 1.5 || conversionRate > 1) {
    return { funnel_stage: 'meio', consciousness_level: 'solucao' };
  }
  
  return { funnel_stage: 'topo', consciousness_level: 'inconsciente' };
}

// =====================================================
// PROCESSAR INSIGHT EM COCKPIT CAMPAIGN
// =====================================================

function processInsight(insight: any, level: 'campaign' | 'adset' | 'ad'): CockpitCampaign {
  const spend = parseFloat(insight.spend || '0');
  const reach = parseInt(insight.reach || '0');
  const impressions = parseInt(insight.impressions || '0');
  const frequency = parseFloat(insight.frequency || '0');
  const clicks = parseInt(insight.clicks || '0');
  const cpm = parseFloat(insight.cpm || '0');
  const cpc = parseFloat(insight.cpc || '0');
  const ctr = parseFloat(insight.ctr || '0');
  
  // Extrair métricas de actions
  const link_clicks = extractAction(insight.actions, ACTION_TYPES.link_clicks);
  const landing_page_views = extractAction(insight.actions, ACTION_TYPES.landing_page_views);
  const checkout_initiated = extractAction(insight.actions, ACTION_TYPES.checkout_initiated);
  const checkout_add_payment = extractAction(insight.actions, ACTION_TYPES.checkout_add_payment);
  const purchases = extractAction(insight.actions, ACTION_TYPES.purchases);
  const purchase_value = extractActionValue(insight.action_values, ACTION_TYPES.purchases);
  
  // Calcular métricas derivadas
  const connect_rate = link_clicks > 0 ? (landing_page_views / link_clicks) * 100 : 0;
  const pv_to_checkout_rate = landing_page_views > 0 ? (checkout_initiated / landing_page_views) * 100 : 0;
  const checkout_conversion_rate = checkout_initiated > 0 ? (purchases / checkout_initiated) * 100 : 0;
  const cost_per_purchase = purchases > 0 ? spend / purchases : 0;
  const roas = spend > 0 ? purchase_value / spend : 0;
  const profit_value = purchase_value - spend;
  const profit_percentage = spend > 0 ? ((purchase_value - spend) / spend) * 100 : 0;
  const ticket_medio = purchases > 0 ? purchase_value / purchases : 0;
  const global_conversion_rate = clicks > 0 ? (purchases / clicks) * 100 : 0;
  
  const campaign: CockpitCampaign = {
    campaign_id: insight.campaign_id || '',
    campaign_name: insight.campaign_name || '',
    adset_id: insight.adset_id,
    adset_name: insight.adset_name,
    ad_id: insight.ad_id,
    ad_name: insight.ad_name,
    level,
    
    // Alcance
    reach,
    impressions,
    frequency,
    cpm,
    
    // Engajamento
    clicks,
    link_clicks,
    cpc,
    ctr,
    
    // Landing Page
    landing_page_views,
    connect_rate,
    
    // Checkout
    checkout_initiated,
    checkout_add_payment_info: checkout_add_payment,
    checkout_completed: purchases, // Checkout completed = purchase
    checkout_conversion_rate,
    pv_to_checkout_rate,
    
    // Compras
    purchases,
    purchase_value,
    cost_per_purchase,
    
    // Lucro
    spend,
    roas,
    profit_percentage,
    profit_value,
    ticket_medio,
    
    // Conversão
    global_conversion_rate
  };
  
  // Classificar funil
  const { funnel_stage, consciousness_level } = classifyFunnelStage(campaign);
  campaign.funnel_stage = funnel_stage;
  campaign.consciousness_level = consciousness_level;
  
  return campaign;
}

// =====================================================
// CALCULAR SUMÁRIO
// =====================================================

function calculateSummary(campaigns: CockpitCampaign[]): CockpitResponse['summary'] {
  const total_spend = campaigns.reduce((sum, c) => sum + c.spend, 0);
  const total_reach = campaigns.reduce((sum, c) => sum + c.reach, 0);
  const total_impressions = campaigns.reduce((sum, c) => sum + c.impressions, 0);
  const total_clicks = campaigns.reduce((sum, c) => sum + c.clicks, 0);
  const total_link_clicks = campaigns.reduce((sum, c) => sum + c.link_clicks, 0);
  const total_landing_page_views = campaigns.reduce((sum, c) => sum + c.landing_page_views, 0);
  const total_checkouts = campaigns.reduce((sum, c) => sum + c.checkout_initiated, 0);
  const total_purchases = campaigns.reduce((sum, c) => sum + c.purchases, 0);
  const total_revenue = campaigns.reduce((sum, c) => sum + c.purchase_value, 0);
  
  return {
    total_spend,
    total_reach,
    total_impressions,
    total_clicks,
    total_link_clicks,
    total_landing_page_views,
    total_checkouts,
    total_purchases,
    total_revenue,
    avg_cpm: total_impressions > 0 ? (total_spend / total_impressions) * 1000 : 0,
    avg_cpc: total_clicks > 0 ? total_spend / total_clicks : 0,
    avg_ctr: total_impressions > 0 ? (total_clicks / total_impressions) * 100 : 0,
    avg_connect_rate: total_link_clicks > 0 ? (total_landing_page_views / total_link_clicks) * 100 : 0,
    avg_checkout_rate: total_landing_page_views > 0 ? (total_checkouts / total_landing_page_views) * 100 : 0,
    overall_roas: total_spend > 0 ? total_revenue / total_spend : 0,
    overall_profit: total_revenue - total_spend,
    avg_ticket: total_purchases > 0 ? total_revenue / total_purchases : 0
  };
}

// =====================================================
// HANDLER
// =====================================================

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const days = searchParams.get('days');
    
    // Calcular período
    const today = new Date();
    let since: string;
    let until: string = today.toISOString().split('T')[0];
    
    if (start && end) {
      since = start;
      until = end;
    } else if (days) {
      const daysNum = parseInt(days);
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - daysNum);
      since = startDate.toISOString().split('T')[0];
    } else {
      // Default: últimos 7 dias
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 7);
      since = startDate.toISOString().split('T')[0];
    }
    
    console.log('🎯 [Cockpit] Período:', { since, until });
    
    // Buscar credenciais
    const credentials = await getMetaCredentials();
    
    if (!credentials) {
      return NextResponse.json({
        success: false,
        error: 'Credenciais Meta não configuradas'
      }, { status: 500 });
    }
    
    // Buscar dados em paralelo
    const [campaignData, adsetData, adData] = await Promise.all([
      fetchInsights(credentials, 'campaign', since, until),
      fetchInsights(credentials, 'adset', since, until),
      fetchInsights(credentials, 'ad', since, until)
    ]);
    
    // Processar dados
    const campaigns = campaignData.map(d => processInsight(d, 'campaign'));
    const adsets = adsetData.map(d => processInsight(d, 'adset'));
    const ads = adData.map(d => processInsight(d, 'ad'));
    
    // Ordenar por gasto
    campaigns.sort((a, b) => b.spend - a.spend);
    adsets.sort((a, b) => b.spend - a.spend);
    ads.sort((a, b) => b.spend - a.spend);
    
    // Análise de funil
    const funnel_analysis = {
      topo: campaigns.filter(c => c.funnel_stage === 'topo'),
      meio: campaigns.filter(c => c.funnel_stage === 'meio'),
      fundo: campaigns.filter(c => c.funnel_stage === 'fundo')
    };
    
    // Calcular sumário
    const summary = calculateSummary(campaigns);
    
    const response: CockpitResponse = {
      success: true,
      period: { since, until },
      summary,
      campaigns,
      adsets,
      ads,
      funnel_analysis
    };
    
    console.log('🎯 [Cockpit] Resultado:', {
      campaigns: campaigns.length,
      adsets: adsets.length,
      ads: ads.length,
      total_spend: summary.total_spend,
      total_revenue: summary.total_revenue,
      roas: summary.overall_roas.toFixed(2)
    });
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('❌ [Cockpit] Erro:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro ao processar dados do cockpit'
    }, { status: 500 });
  }
}
