/**
 * 📊 META MARKETING API
 * 
 * Busca dados de campanhas de anúncios do Facebook/Instagram
 * para exibir métricas de performance no dashboard admin.
 */

import { supabaseAdmin } from './supabase';

// =====================================================
// CONFIG: Buscar credenciais do banco ou env
// =====================================================

interface MetaCredentials {
  adAccountId: string;
  accessToken: string;
}

let cachedCredentials: MetaCredentials | null = null;
let credentialsCacheTime: number = 0;
const CACHE_TTL = 60000; // 1 minuto

async function getMetaCredentials(): Promise<MetaCredentials | null> {
  // Verifica cache
  if (cachedCredentials && Date.now() - credentialsCacheTime < CACHE_TTL) {
    return cachedCredentials;
  }

  // Access token SEMPRE vem das variáveis de ambiente (segurança)
  const accessToken = process.env.META_ACCESS_TOKEN || process.env.FACEBOOK_ACCESS_TOKEN;
  
  if (!accessToken) {
    console.error('❌ Access token Meta não configurado nas variáveis de ambiente');
    return null;
  }

  try {
    // 1. Tentar buscar account_id do banco de dados (integration_settings)
    const { data: settings } = await supabaseAdmin
      .from('integration_settings')
      .select('meta_ad_account_id')
      .single();

    if (settings?.meta_ad_account_id) {
      cachedCredentials = {
        adAccountId: settings.meta_ad_account_id,
        accessToken: accessToken,
      };
      credentialsCacheTime = Date.now();
      console.log('✅ [meta-marketing] Usando Account ID do banco, Token das env vars');
      return cachedCredentials;
    }

    // 2. Fallback: account_id das variáveis de ambiente
    const envAccountId = process.env.META_AD_ACCOUNT_ID || process.env.FACEBOOK_AD_ACCOUNT_ID;

    if (envAccountId) {
      cachedCredentials = {
        adAccountId: envAccountId,
        accessToken: accessToken,
      };
      credentialsCacheTime = Date.now();
      console.log('✅ [meta-marketing] Usando credenciais das env vars');
      return cachedCredentials;
    }

    console.error('❌ Meta Ad Account ID não configurado');
    return null;
  } catch (error) {
    console.error('❌ Erro ao buscar credenciais Meta:', error);
    
    // Fallback para variáveis de ambiente em caso de erro
    const envAccountId = process.env.META_AD_ACCOUNT_ID || process.env.FACEBOOK_AD_ACCOUNT_ID;

    if (envAccountId) {
      return {
        adAccountId: envAccountId,
        accessToken: accessToken,
      };
    }

    return null;
  }
}

export interface CampaignInsight {
  campaign_name?: string;
  campaign_id?: string;
  adset_name?: string;
  adset_id?: string;
  ad_name?: string;
  ad_id?: string;
  spend: string;
  impressions: string;
  clicks: string;
  cpc: string;
  ctr: string;
  reach: string;
  date_start?: string;
  date_stop?: string;
  outbound_clicks?: Array<{ action_type: string; value: string }>;
  video_views?: string;
  video_thruplay_watched_actions?: Array<{ action_type: string; value: string }>;
  actions?: Array<{
    action_type: string;
    value: string;
  }>;
  action_values?: Array<{
    action_type: string;
    value: string;
  }>;
  // Campos enriquecidos pela API
  effective_status?: string;
  created_time?: string;
}

export interface AdsMetrics {
  totalSpend: number;
  totalClicks: number;
  totalImpressions: number;
  totalReach: number;
  avgCpc: number;
  avgCtr: number;
  totalVideoViews: number;
  totalOutboundClicks: number;
  totalPurchases: number;
  totalPurchaseValue: number;
  totalLeads: number;
  totalCheckoutComplete: number;
  cpl: number;
  costPerCheckout: number;
  roas: number;
  cpa: number;
  campaigns: CampaignInsight[];
}

// Períodos disponíveis para consulta (compatíveis com Facebook Ads API)
export type DatePreset = 'today' | 'yesterday' | 'last_7d' | 'last_14d' | 'last_30d' | 'this_month' | 'last_month' | 'maximum';

// Níveis de detalhamento
export type InsightLevel = 'campaign' | 'adset' | 'ad';

// Campos por nível
const FIELDS_BY_LEVEL: Record<InsightLevel, string> = {
  campaign: 'campaign_name,campaign_id,spend,impressions,clicks,cpc,ctr,actions,action_values,reach,date_start,date_stop,outbound_clicks,video_thruplay_watched_actions',
  adset: 'adset_name,adset_id,campaign_name,campaign_id,spend,impressions,clicks,cpc,ctr,actions,action_values,reach,date_start,date_stop,outbound_clicks,video_thruplay_watched_actions',
  ad: 'ad_name,ad_id,adset_name,adset_id,campaign_name,spend,impressions,clicks,cpc,ctr,actions,action_values,reach,date_start,date_stop,outbound_clicks,video_thruplay_watched_actions'
};

// Action types helpers
// ⚠️ IMPORTANTE: Usar APENAS UM tipo de cada evento para evitar duplicação
// O Meta retorna múltiplas versões do mesmo evento (purchase, omni_purchase, fb_pixel_purchase)
// Todos representam a MESMA transação, então só contamos uma vez
export const ACTION_TYPES = {
  // Compras: usar APENAS o evento do Pixel (mais confiável)
  purchases: [
    'offsite_conversion.fb_pixel_purchase'
  ],
  // Leads: usar APENAS o evento do Pixel
  leads: [
    'offsite_conversion.fb_pixel_lead'
  ],
  // Checkout: usar APENAS o evento do Pixel  
  checkout: [
    'offsite_conversion.fb_pixel_initiate_checkout'
  ]
} as const;

export function sumActions(
  actions: CampaignInsight['actions'] | undefined,
  types: readonly string[]
): number {
  if (!actions || !Array.isArray(actions)) return 0;
  return actions
    .filter(action => types.includes(action.action_type))
    .reduce((sum, action) => sum + Number(action.value || 0), 0);
}

export function sumActionValues(
  actionValues: CampaignInsight['action_values'] | undefined,
  types: readonly string[]
): number {
  if (!actionValues || !Array.isArray(actionValues)) return 0;
  return actionValues
    .filter(action => types.includes(action.action_type))
    .reduce((sum, action) => sum + Number(action.value || 0), 0);
}

/**
 * Converte date_preset para time_range com datas explícitas
 * Isso garante que o dia atual seja incluído corretamente
 */
function getTimeRange(datePreset: DatePreset): { since: string; until: string } | null {
  const today = new Date();
  const pad = (value: number) => value.toString().padStart(2, '0');
  const formatDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  
  switch (datePreset) {
    case 'today': {
      const todayStr = formatDate(today);
      return { since: todayStr, until: todayStr };
    }
    case 'yesterday': {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = formatDate(yesterday);
      return { since: yesterdayStr, until: yesterdayStr };
    }
    case 'last_7d': {
      const start = new Date(today);
      start.setDate(start.getDate() - 6); // 7 dias incluindo hoje
      return { since: formatDate(start), until: formatDate(today) };
    }
    case 'last_14d': {
      const start = new Date(today);
      start.setDate(start.getDate() - 13);
      return { since: formatDate(start), until: formatDate(today) };
    }
    case 'last_30d': {
      const start = new Date(today);
      start.setDate(start.getDate() - 29);
      return { since: formatDate(start), until: formatDate(today) };
    }
    case 'this_month': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return { since: formatDate(start), until: formatDate(today) };
    }
    case 'last_month': {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      return { since: formatDate(start), until: formatDate(end) };
    }
    case 'maximum':
    default:
      return null; // Usa date_preset para maximum
  }
}

/**
 * Busca insights das campanhas/conjuntos/anúncios
 * @param datePreset - Período de tempo
 * @param level - Nível de detalhamento (campaign, adset, ad)
 */
export async function getAdsInsights(
  datePreset: DatePreset = 'maximum',
  level: InsightLevel = 'campaign',
  timeRange?: { since: string; until: string },
  timeIncrement?: string
): Promise<CampaignInsight[]> {
  // ✅ Buscar credenciais do banco ou env
  const credentials = await getMetaCredentials();
  
  if (!credentials) {
    console.error('❌ Meta Ads não configurado. Configure em /admin/ai/settings ou nas variáveis de ambiente.');
    return [];
  }

  const { adAccountId, accessToken } = credentials;

  // Usar time_range para períodos específicos (garante inclusão do dia atual)
  const resolvedTimeRange = timeRange || getTimeRange(datePreset);
  
  const params: Record<string, string> = {
    access_token: accessToken,
    level: level,
    fields: FIELDS_BY_LEVEL[level],
    limit: '100'
  };

  // Se temos time_range, usa ele; senão usa date_preset
  if (resolvedTimeRange) {
    params.time_range = JSON.stringify(resolvedTimeRange);
  } else {
    params.date_preset = datePreset;
  }

  if (timeIncrement) {
    params.time_increment = timeIncrement;
  }

  const url = `https://graph.facebook.com/v19.0/act_${adAccountId}/insights?` + new URLSearchParams(params);

  try {
    // Sem cache para dados do dia atual (podem mudar frequentemente)
    const cacheOptions = datePreset === 'today' ? { cache: 'no-store' as RequestCache } : { next: { revalidate: 60 } };
    const res = await fetch(url, cacheOptions);
    const data = await res.json();
    
    if (data.error) {
      console.error('❌ Erro na Meta Ads API:', data.error);
      return [];
    }
    
    // Log para debug
    console.log(`📊 Meta Ads ${level} [${datePreset}]: ${data.data?.length || 0} resultados, timeRange:`, resolvedTimeRange);
    
    // Ordenar por spend decrescente
    const insights = data.data || [];
    insights.sort((a: CampaignInsight, b: CampaignInsight) => 
      Number(b.spend || 0) - Number(a.spend || 0)
    );
    
    return insights;
  } catch (error) {
    console.error('💥 Erro ao buscar Ads Insights:', error);
    return [];
  }
}

/**
 * Calcula métricas agregadas das campanhas
 */
export function calculateAdsMetrics(campaigns: CampaignInsight[]): AdsMetrics {
  if (!campaigns.length) {
    return {
      totalSpend: 0,
      totalClicks: 0,
      totalImpressions: 0,
      totalReach: 0,
      avgCpc: 0,
      avgCtr: 0,
      totalVideoViews: 0,
      totalOutboundClicks: 0,
      totalPurchases: 0,
      totalPurchaseValue: 0,
      totalLeads: 0,
      totalCheckoutComplete: 0,
      cpl: 0,
      costPerCheckout: 0,
      roas: 0,
      cpa: 0,
      campaigns: []
    };
  }

  const totalSpend = campaigns.reduce((sum, c) => sum + Number(c.spend || 0), 0);
  const totalClicks = campaigns.reduce((sum, c) => sum + Number(c.clicks || 0), 0);
  const totalImpressions = campaigns.reduce((sum, c) => sum + Number(c.impressions || 0), 0);
  const totalReach = campaigns.reduce((sum, c) => sum + Number(c.reach || 0), 0);
  
  // Video views (busca dentro das actions)
  const totalVideoViews = campaigns.reduce((sum, c) => {
    if (c.actions && Array.isArray(c.actions)) {
      const videoView = c.actions.find(a => a.action_type === 'video_view');
      return sum + Number(videoView?.value || 0);
    }
    return sum;
  }, 0);
  
  // Outbound clicks (cliques de saída)
  const totalOutboundClicks = campaigns.reduce((sum, c) => {
    if (c.outbound_clicks && Array.isArray(c.outbound_clicks)) {
      return sum + c.outbound_clicks.reduce((s, oc) => s + Number(oc.value || 0), 0);
    }
    return sum;
  }, 0);
  
  // Purchases (compras) das actions
  const totalPurchases = campaigns.reduce(
    (sum, c) => sum + sumActions(c.actions, ACTION_TYPES.purchases),
    0
  );
  
  // Valor total das compras
  const totalPurchaseValue = campaigns.reduce(
    (sum, c) => sum + sumActionValues(c.action_values, ACTION_TYPES.purchases),
    0
  );

  // Leads
  const totalLeads = campaigns.reduce(
    (sum, c) => sum + sumActions(c.actions, ACTION_TYPES.leads),
    0
  );

  // Finalizações (checkout)
  const totalCheckoutComplete = campaigns.reduce(
    (sum, c) => sum + sumActions(c.actions, ACTION_TYPES.checkout),
    0
  );
  
  // Média ponderada do CPC (gasto total / cliques totais)
  const avgCpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
  
  // Média ponderada do CTR (cliques totais / impressões totais * 100)
  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  
  // ROAS (Return on Ad Spend) = Valor das vendas / Gasto
  const roas = totalSpend > 0 ? totalPurchaseValue / totalSpend : 0;
  
  // CPA (Cost per Acquisition) = Gasto / Número de compras
  const cpa = totalPurchases > 0 ? totalSpend / totalPurchases : 0;

  // CPL (Custo por Lead)
  const cpl = totalLeads > 0 ? totalSpend / totalLeads : 0;

  // Custo por Finalização
  const costPerCheckout = totalCheckoutComplete > 0 ? totalSpend / totalCheckoutComplete : 0;

  // Ordena pelo maior gasto
  const sortedCampaigns = [...campaigns].sort((a, b) => Number(b.spend) - Number(a.spend));

  return {
    totalSpend,
    totalClicks,
    totalImpressions,
    totalReach,
    avgCpc,
    avgCtr,
    totalVideoViews,
    totalOutboundClicks,
    totalPurchases,
    totalPurchaseValue,
    totalLeads,
    totalCheckoutComplete,
    cpl,
    costPerCheckout,
    roas,
    cpa,
    campaigns: sortedCampaigns
  };
}

/**
 * Busca status das campanhas (ativa/pausada) com data de criação
 */
export async function getCampaignsStatus(): Promise<Map<string, string>> {
  // ✅ Buscar credenciais do banco ou env
  const credentials = await getMetaCredentials();
  if (!credentials) return new Map();

  const { adAccountId, accessToken } = credentials;

  const url = `https://graph.facebook.com/v19.0/act_${adAccountId}/campaigns?` + new URLSearchParams({
    access_token: accessToken,
    fields: 'id,name,status,effective_status,created_time',
    limit: '50'
  });

  try {
    const res = await fetch(url, { next: { revalidate: 300 } });
    const data = await res.json();
    
    const statusMap = new Map<string, string>();
    if (data.data) {
      data.data.forEach((campaign: any) => {
        statusMap.set(campaign.id, campaign.effective_status || campaign.status);
      });
    }
    return statusMap;
  } catch (error) {
    console.error('Erro ao buscar status das campanhas:', error);
    return new Map();
  }
}
