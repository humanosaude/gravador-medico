/**
 * 🔗 CONSOLIDATOR - Agregador de métricas multi-plataforma
 * 
 * Combina dados de Meta Ads, Google Ads e Google Analytics
 * em uma visão unificada para o Dashboard Consolidado.
 */

// ==============================================
// TIPOS
// ==============================================

export interface ConsolidatedMetrics {
  // Custo
  spend: number;
  
  // Alcance
  impressions: number;
  reach: number;
  frequency: number;
  cpm: number;
  
  // Engajamento
  clicks: number;
  link_clicks: number;
  cpc: number;
  ctr: number;
  
  // Conversão
  landing_page_views: number;
  connect_rate: number;
  checkouts: number;
  checkout_rate: number;
  purchases: number;
  revenue: number;
  conversion_rate: number;
  
  // ROI
  roas: number;
  cpa: number;
  profit: number;
  profit_margin: number;
  ticket_medio: number;
}

export interface PlatformMetrics {
  platform: 'meta' | 'google_ads' | 'google_analytics';
  account_id: string;
  account_name: string;
  metrics: Partial<ConsolidatedMetrics>;
  raw_data?: any;
}

export interface FunnelData {
  impressions: number;
  clicks: number;
  landing_page_views: number;
  checkouts: number;
  purchases: number;
  rates: {
    impressions_to_clicks: number;
    clicks_to_pv: number;
    pv_to_checkout: number;
    checkout_to_purchase: number;
    overall_conversion: number;
  };
}

export interface DemographicsData {
  gender: { male: number; female: number; unknown: number };
  age: Record<string, number>;
  location: Record<string, number>;
}

export interface CampaignData {
  id: string;
  name: string;
  platform: 'meta' | 'google_ads';
  status: 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED';
  objective?: string;
  
  // Métricas
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  roas: number;
  cpc: number;
  ctr: number;
  cpa: number;
  
  // Ad Sets / Ad Groups (para drill-down)
  adsets?: AdSetData[];
}

export interface AdSetData {
  id: string;
  name: string;
  campaign_id: string;
  status: string;
  
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  roas: number;
  
  // Ads (para drill-down)
  ads?: AdData[];
}

export interface AdData {
  id: string;
  name: string;
  adset_id: string;
  status: string;
  preview_url?: string;
  
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  roas: number;
}

export interface DateRange {
  start: string; // YYYY-MM-DD
  end: string;
}

export interface ConsolidatedDashboardData {
  period: DateRange;
  comparison_period?: DateRange;
  
  // Métricas consolidadas
  metrics: ConsolidatedMetrics;
  previous_metrics?: ConsolidatedMetrics;
  
  // Variações percentuais
  variations: Partial<Record<keyof ConsolidatedMetrics, number>>;
  
  // Por plataforma
  by_platform: {
    meta?: Partial<ConsolidatedMetrics>;
    google_ads?: Partial<ConsolidatedMetrics>;
    google_analytics?: Partial<ConsolidatedMetrics>;
  };
  
  // Funil
  funnel: FunnelData;
  
  // Demográficos
  demographics?: DemographicsData;
  
  // Campanhas
  campaigns: CampaignData[];
  
  // Dados diários (para gráficos)
  daily_data: Array<{
    date: string;
    meta?: Partial<ConsolidatedMetrics>;
    google_ads?: Partial<ConsolidatedMetrics>;
    total: Partial<ConsolidatedMetrics>;
  }>;
  
  // Alertas
  alerts: Array<{
    id: string;
    type: string;
    severity: 'info' | 'warning' | 'critical';
    title: string;
    message: string;
    campaign_id?: string;
    actions?: Array<{ action: string; label: string }>;
  }>;
}

// ==============================================
// FUNÇÕES DE AGREGAÇÃO
// ==============================================

/**
 * Soma arrays de métricas por plataforma
 */
export function aggregateMetrics(
  platformMetrics: PlatformMetrics[]
): ConsolidatedMetrics {
  const initial: ConsolidatedMetrics = {
    spend: 0,
    impressions: 0,
    reach: 0,
    frequency: 0,
    cpm: 0,
    clicks: 0,
    link_clicks: 0,
    cpc: 0,
    ctr: 0,
    landing_page_views: 0,
    connect_rate: 0,
    checkouts: 0,
    checkout_rate: 0,
    purchases: 0,
    revenue: 0,
    conversion_rate: 0,
    roas: 0,
    cpa: 0,
    profit: 0,
    profit_margin: 0,
    ticket_medio: 0
  };

  // Somar valores absolutos
  for (const pm of platformMetrics) {
    const m = pm.metrics;
    initial.spend += m.spend || 0;
    initial.impressions += m.impressions || 0;
    initial.reach += m.reach || 0;
    initial.clicks += m.clicks || 0;
    initial.link_clicks += m.link_clicks || 0;
    initial.landing_page_views += m.landing_page_views || 0;
    initial.checkouts += m.checkouts || 0;
    initial.purchases += m.purchases || 0;
    initial.revenue += m.revenue || 0;
  }

  // Calcular métricas derivadas
  initial.frequency = initial.reach > 0 ? initial.impressions / initial.reach : 0;
  initial.cpm = initial.impressions > 0 ? (initial.spend / initial.impressions) * 1000 : 0;
  initial.cpc = initial.clicks > 0 ? initial.spend / initial.clicks : 0;
  initial.ctr = initial.impressions > 0 ? (initial.clicks / initial.impressions) * 100 : 0;
  initial.connect_rate = initial.link_clicks > 0 
    ? (initial.landing_page_views / initial.link_clicks) * 100 
    : 0;
  initial.checkout_rate = initial.landing_page_views > 0 
    ? (initial.checkouts / initial.landing_page_views) * 100 
    : 0;
  initial.conversion_rate = initial.clicks > 0 
    ? (initial.purchases / initial.clicks) * 100 
    : 0;
  initial.roas = initial.spend > 0 ? initial.revenue / initial.spend : 0;
  initial.cpa = initial.purchases > 0 ? initial.spend / initial.purchases : 0;
  initial.profit = initial.revenue - initial.spend;
  initial.profit_margin = initial.revenue > 0 
    ? (initial.profit / initial.revenue) * 100 
    : 0;
  initial.ticket_medio = initial.purchases > 0 
    ? initial.revenue / initial.purchases 
    : 0;

  return initial;
}

/**
 * Calcula variações percentuais entre dois períodos
 */
export function calculateVariations(
  current: ConsolidatedMetrics,
  previous: ConsolidatedMetrics
): Partial<Record<keyof ConsolidatedMetrics, number>> {
  const variations: Partial<Record<keyof ConsolidatedMetrics, number>> = {};

  const keys: (keyof ConsolidatedMetrics)[] = [
    'spend', 'impressions', 'reach', 'clicks', 'link_clicks',
    'landing_page_views', 'checkouts', 'purchases', 'revenue',
    'ctr', 'cpc', 'cpm', 'roas', 'cpa', 'conversion_rate',
    'connect_rate', 'checkout_rate', 'profit', 'ticket_medio'
  ];

  for (const key of keys) {
    const prev = previous[key] || 0;
    const curr = current[key] || 0;
    
    if (prev === 0) {
      variations[key] = curr > 0 ? 100 : 0;
    } else {
      variations[key] = ((curr - prev) / prev) * 100;
    }
  }

  return variations;
}

/**
 * Constrói dados do funil de conversão
 */
export function buildFunnelData(metrics: ConsolidatedMetrics): FunnelData {
  const { impressions, clicks, landing_page_views, checkouts, purchases } = metrics;

  return {
    impressions,
    clicks,
    landing_page_views,
    checkouts,
    purchases,
    rates: {
      impressions_to_clicks: impressions > 0 ? (clicks / impressions) * 100 : 0,
      clicks_to_pv: clicks > 0 ? (landing_page_views / clicks) * 100 : 0,
      pv_to_checkout: landing_page_views > 0 ? (checkouts / landing_page_views) * 100 : 0,
      checkout_to_purchase: checkouts > 0 ? (purchases / checkouts) * 100 : 0,
      overall_conversion: impressions > 0 ? (purchases / impressions) * 100 : 0
    }
  };
}

/**
 * Gera alertas automáticos baseados nas métricas
 */
export function generateAlerts(
  metrics: ConsolidatedMetrics,
  campaigns: CampaignData[]
): Array<{
  id: string;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  campaign_id?: string;
  actions?: Array<{ action: string; label: string }>;
}> {
  const alerts: Array<{
    id: string;
    type: string;
    severity: 'info' | 'warning' | 'critical';
    title: string;
    message: string;
    campaign_id?: string;
    actions?: Array<{ action: string; label: string }>;
  }> = [];

  // Alerta: ROAS geral baixo
  if (metrics.roas < 1.0 && metrics.spend > 100) {
    alerts.push({
      id: `roas_low_${Date.now()}`,
      type: 'low_roas',
      severity: 'critical',
      title: 'ROAS Negativo',
      message: `ROAS geral está em ${metrics.roas.toFixed(2)}x. Você está perdendo dinheiro.`,
      actions: [
        { action: 'review_campaigns', label: 'Revisar Campanhas' }
      ]
    });
  } else if (metrics.roas < 2.0 && metrics.spend > 100) {
    alerts.push({
      id: `roas_warning_${Date.now()}`,
      type: 'low_roas',
      severity: 'warning',
      title: 'ROAS Abaixo do Ideal',
      message: `ROAS geral está em ${metrics.roas.toFixed(2)}x. Considere otimizar.`,
      actions: [
        { action: 'review_campaigns', label: 'Analisar' }
      ]
    });
  }

  // Alerta: CTR muito baixo
  if (metrics.ctr < 1.0 && metrics.impressions > 10000) {
    alerts.push({
      id: `ctr_low_${Date.now()}`,
      type: 'low_ctr',
      severity: 'warning',
      title: 'CTR Baixo',
      message: `CTR geral está em ${metrics.ctr.toFixed(2)}%. Considere testar novos criativos.`,
      actions: [
        { action: 'test_creatives', label: 'Ver Criativos' }
      ]
    });
  }

  // Alertas por campanha
  for (const campaign of campaigns) {
    if (campaign.status !== 'ACTIVE') continue;

    // Campanha sem conversões mas gastando
    if (campaign.conversions === 0 && campaign.spend > 50) {
      alerts.push({
        id: `no_conv_${campaign.id}`,
        type: 'no_conversions',
        severity: 'warning',
        title: `Sem Conversões: ${campaign.name}`,
        message: `Campanha gastou R$ ${campaign.spend.toFixed(2)} sem nenhuma conversão.`,
        campaign_id: campaign.id,
        actions: [
          { action: 'pause_campaign', label: 'Pausar' },
          { action: 'review_targeting', label: 'Revisar Público' }
        ]
      });
    }

    // ROAS negativo na campanha
    if (campaign.roas < 0.5 && campaign.spend > 100) {
      alerts.push({
        id: `camp_roas_${campaign.id}`,
        type: 'low_roas',
        severity: 'critical',
        title: `ROAS Crítico: ${campaign.name}`,
        message: `ROAS de ${campaign.roas.toFixed(2)}x. Considere pausar.`,
        campaign_id: campaign.id,
        actions: [
          { action: 'pause_campaign', label: 'Pausar Agora' }
        ]
      });
    }
  }

  return alerts;
}

/**
 * Calcula período anterior para comparação
 */
export function getPreviousPeriod(current: DateRange): DateRange {
  const start = new Date(current.start);
  const end = new Date(current.end);
  const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  const prevEnd = new Date(start);
  prevEnd.setDate(prevEnd.getDate() - 1);

  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - diffDays);

  return {
    start: prevStart.toISOString().split('T')[0],
    end: prevEnd.toISOString().split('T')[0]
  };
}

/**
 * Formata valor monetário em BRL
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

/**
 * Formata percentual
 */
export function formatPercent(value: number, decimals = 2): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
}

/**
 * Formata número grande (1000 → 1K, 1000000 → 1M)
 */
export function formatCompact(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toLocaleString('pt-BR');
}

/**
 * Determina cor baseada na variação
 */
export function getVariationColor(
  value: number,
  invertedMetric = false
): 'green' | 'red' | 'neutral' {
  // Algumas métricas invertidas (ex: CPC, CPA - menor é melhor)
  if (invertedMetric) {
    if (value < -5) return 'green';
    if (value > 5) return 'red';
    return 'neutral';
  }

  if (value > 5) return 'green';
  if (value < -5) return 'red';
  return 'neutral';
}

// ==============================================
// DADOS DEMO
// ==============================================

export function generateDemoData(period: DateRange): ConsolidatedDashboardData {
  const daysInPeriod = Math.ceil(
    (new Date(period.end).getTime() - new Date(period.start).getTime()) / 
    (1000 * 60 * 60 * 24)
  ) + 1;

  // Métricas base
  const baseSpend = 150 * daysInPeriod;
  const baseRevenue = baseSpend * 3.5;
  const basePurchases = Math.floor(baseRevenue / 95);

  const metrics: ConsolidatedMetrics = {
    spend: baseSpend,
    impressions: Math.floor(baseSpend * 45),
    reach: Math.floor(baseSpend * 30),
    frequency: 1.5,
    cpm: 22.22,
    clicks: Math.floor(baseSpend * 2.5),
    link_clicks: Math.floor(baseSpend * 2.1),
    cpc: 0.40,
    ctr: 5.56,
    landing_page_views: Math.floor(baseSpend * 1.8),
    connect_rate: 85.71,
    checkouts: Math.floor(basePurchases * 1.8),
    checkout_rate: 12.5,
    purchases: basePurchases,
    revenue: baseRevenue,
    conversion_rate: 3.8,
    roas: 3.5,
    cpa: baseSpend / basePurchases,
    profit: baseRevenue - baseSpend,
    profit_margin: ((baseRevenue - baseSpend) / baseRevenue) * 100,
    ticket_medio: 95
  };

  // Métricas anteriores (15% piores)
  const previousMetrics: ConsolidatedMetrics = {
    ...metrics,
    spend: metrics.spend * 0.9,
    revenue: metrics.revenue * 0.85,
    purchases: Math.floor(metrics.purchases * 0.85),
    roas: 3.3,
    impressions: Math.floor(metrics.impressions * 0.9),
    clicks: Math.floor(metrics.clicks * 0.9)
  };

  // Campanhas demo
  const campaigns: CampaignData[] = [
    {
      id: 'meta_001',
      name: '🎯 [CONVERSÃO] Gravador Médico - Lookalike',
      platform: 'meta',
      status: 'ACTIVE',
      objective: 'CONVERSIONS',
      spend: baseSpend * 0.35,
      impressions: Math.floor(metrics.impressions * 0.35),
      clicks: Math.floor(metrics.clicks * 0.35),
      conversions: Math.floor(basePurchases * 0.45),
      revenue: baseRevenue * 0.45,
      roas: 4.5,
      cpc: 0.38,
      ctr: 5.8,
      cpa: 18.50
    },
    {
      id: 'meta_002',
      name: '📱 [TRÁFEGO] Médicos - Instagram',
      platform: 'meta',
      status: 'ACTIVE',
      objective: 'TRAFFIC',
      spend: baseSpend * 0.25,
      impressions: Math.floor(metrics.impressions * 0.30),
      clicks: Math.floor(metrics.clicks * 0.30),
      conversions: Math.floor(basePurchases * 0.20),
      revenue: baseRevenue * 0.20,
      roas: 2.8,
      cpc: 0.35,
      ctr: 4.5,
      cpa: 32.00
    },
    {
      id: 'meta_003',
      name: '🔄 [REMARKETING] Carrinho Abandonado',
      platform: 'meta',
      status: 'ACTIVE',
      objective: 'CONVERSIONS',
      spend: baseSpend * 0.15,
      impressions: Math.floor(metrics.impressions * 0.10),
      clicks: Math.floor(metrics.clicks * 0.15),
      conversions: Math.floor(basePurchases * 0.25),
      revenue: baseRevenue * 0.25,
      roas: 5.8,
      cpc: 0.42,
      ctr: 6.2,
      cpa: 12.00
    },
    {
      id: 'gads_001',
      name: '🔍 [SEARCH] Gravador Médico - Branded',
      platform: 'google_ads',
      status: 'ACTIVE',
      objective: 'CONVERSIONS',
      spend: baseSpend * 0.15,
      impressions: Math.floor(metrics.impressions * 0.15),
      clicks: Math.floor(metrics.clicks * 0.12),
      conversions: Math.floor(basePurchases * 0.08),
      revenue: baseRevenue * 0.08,
      roas: 1.87,
      cpc: 0.52,
      ctr: 3.8,
      cpa: 45.00
    },
    {
      id: 'gads_002',
      name: '📺 [DISPLAY] Retargeting Visitantes',
      platform: 'google_ads',
      status: 'PAUSED',
      objective: 'REMARKETING',
      spend: baseSpend * 0.10,
      impressions: Math.floor(metrics.impressions * 0.10),
      clicks: Math.floor(metrics.clicks * 0.08),
      conversions: Math.floor(basePurchases * 0.02),
      revenue: baseRevenue * 0.02,
      roas: 0.7,
      cpc: 0.55,
      ctr: 1.2,
      cpa: 78.00
    }
  ];

  // Dados diários
  const daily_data: ConsolidatedDashboardData['daily_data'] = [];
  const startDate = new Date(period.start);

  for (let i = 0; i < daysInPeriod; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    
    // Variação aleatória por dia (±20%)
    const variance = 0.8 + Math.random() * 0.4;
    const daySpend = (baseSpend / daysInPeriod) * variance;
    const dayRevenue = daySpend * (3 + Math.random() * 1.5);

    daily_data.push({
      date: date.toISOString().split('T')[0],
      meta: {
        spend: daySpend * 0.75,
        revenue: dayRevenue * 0.8,
        clicks: Math.floor((metrics.clicks / daysInPeriod) * variance * 0.75),
        impressions: Math.floor((metrics.impressions / daysInPeriod) * variance * 0.75)
      },
      google_ads: {
        spend: daySpend * 0.25,
        revenue: dayRevenue * 0.2,
        clicks: Math.floor((metrics.clicks / daysInPeriod) * variance * 0.25),
        impressions: Math.floor((metrics.impressions / daysInPeriod) * variance * 0.25)
      },
      total: {
        spend: daySpend,
        revenue: dayRevenue,
        clicks: Math.floor((metrics.clicks / daysInPeriod) * variance),
        impressions: Math.floor((metrics.impressions / daysInPeriod) * variance)
      }
    });
  }

  return {
    period,
    comparison_period: getPreviousPeriod(period),
    metrics,
    previous_metrics: previousMetrics,
    variations: calculateVariations(metrics, previousMetrics),
    by_platform: {
      meta: {
        spend: metrics.spend * 0.75,
        revenue: metrics.revenue * 0.85,
        impressions: Math.floor(metrics.impressions * 0.75),
        clicks: Math.floor(metrics.clicks * 0.80),
        purchases: Math.floor(metrics.purchases * 0.90),
        roas: 3.97
      },
      google_ads: {
        spend: metrics.spend * 0.25,
        revenue: metrics.revenue * 0.15,
        impressions: Math.floor(metrics.impressions * 0.25),
        clicks: Math.floor(metrics.clicks * 0.20),
        purchases: Math.floor(metrics.purchases * 0.10),
        roas: 2.1
      }
    },
    funnel: buildFunnelData(metrics),
    demographics: {
      gender: { male: 62, female: 35, unknown: 3 },
      age: { '25-34': 32, '35-44': 38, '45-54': 18, '55-64': 8, '65+': 4 },
      location: { 
        'São Paulo': 35, 
        'Rio de Janeiro': 18, 
        'Minas Gerais': 12, 
        'Paraná': 8, 
        'Rio Grande do Sul': 7,
        'Outros': 20 
      }
    },
    campaigns,
    daily_data,
    alerts: generateAlerts(metrics, campaigns)
  };
}
