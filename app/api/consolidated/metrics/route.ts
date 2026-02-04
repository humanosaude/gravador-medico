/**
 * 📊 API ROUTE - Dashboard Consolidado - Métricas REAIS
 * 
 * GET: Retorna métricas consolidadas de todas as plataformas
 * - Meta Ads: Dados reais da API Meta quando configurado
 * - Google Ads: Status desconectado (não implementado)
 * - Google Analytics: Status desconectado (não implementado)
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { 
  aggregateMetrics,
  calculateVariations,
  buildFunnelData,
  generateAlerts,
  getPreviousPeriod,
  type ConsolidatedDashboardData,
  type PlatformMetrics,
  type CampaignData,
  type DateRange,
  type ConsolidatedMetrics
} from '@/lib/consolidator';

export const dynamic = 'force-dynamic';

// =====================================================
// TIPOS DE STATUS DE CONEXÃO
// =====================================================

interface PlatformStatus {
  platform: string;
  connected: boolean;
  account_name?: string;
  account_id?: string;
  error?: string;
}

// =====================================================
// BUSCAR DADOS DO META ADS (DADOS REAIS)
// =====================================================

async function fetchMetaAdsData(
  adAccountId: string,
  accessToken: string,
  dateRange: DateRange
): Promise<PlatformMetrics | null> {
  try {
    const fields = [
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

    const url = `https://graph.facebook.com/v21.0/act_${adAccountId}/insights?` + 
      new URLSearchParams({
        access_token: accessToken,
        fields,
        time_range: JSON.stringify({ since: dateRange.start, until: dateRange.end }),
        level: 'account'
      });

    console.log('🔍 [Meta API] Buscando dados:', { adAccountId, period: dateRange });

    const response = await fetch(url, { cache: 'no-store' });
    const data = await response.json();

    if (data.error) {
      console.error('❌ [Meta API] Erro:', data.error);
      return null;
    }

    if (!data.data?.[0]) {
      console.log('⚠️ [Meta API] Sem dados para o período');
      // Retorna métricas zeradas se não houver dados no período
      return {
        platform: 'meta',
        account_id: adAccountId,
        account_name: 'Meta Ads',
        metrics: {
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
          checkouts: 0,
          purchases: 0,
          revenue: 0
        },
        raw_data: null
      };
    }

    const insight = data.data[0];
    const actions = insight.actions || [];
    const actionValues = insight.action_values || [];

    // Extrair ações específicas
    const getAction = (type: string) => {
      const action = actions.find((a: any) => a.action_type === type);
      return action ? parseInt(action.value) : 0;
    };

    const getActionValue = (type: string) => {
      const action = actionValues.find((a: any) => a.action_type === type);
      return action ? parseFloat(action.value) : 0;
    };

    const purchases = getAction('purchase') || getAction('omni_purchase');
    const revenue = getActionValue('purchase') || getActionValue('omni_purchase');

    console.log('✅ [Meta API] Dados recebidos:', {
      spend: insight.spend,
      impressions: insight.impressions,
      clicks: insight.clicks,
      purchases,
      revenue
    });

    return {
      platform: 'meta',
      account_id: adAccountId,
      account_name: 'Meta Ads',
      metrics: {
        spend: parseFloat(insight.spend || '0'),
        impressions: parseInt(insight.impressions || '0'),
        reach: parseInt(insight.reach || '0'),
        frequency: parseFloat(insight.frequency || '0'),
        cpm: parseFloat(insight.cpm || '0'),
        clicks: parseInt(insight.clicks || '0'),
        link_clicks: getAction('link_click'),
        cpc: parseFloat(insight.cpc || '0'),
        ctr: parseFloat(insight.ctr || '0'),
        landing_page_views: getAction('landing_page_view'),
        checkouts: getAction('initiate_checkout'),
        purchases,
        revenue
      },
      raw_data: insight
    };
  } catch (error) {
    console.error('❌ [Meta API] Erro de rede:', error);
    return null;
  }
}

// =====================================================
// BUSCAR CAMPANHAS DO META ADS (DADOS REAIS)
// =====================================================

async function fetchMetaCampaigns(
  adAccountId: string,
  accessToken: string,
  dateRange: DateRange
): Promise<CampaignData[]> {
  try {
    const fields = [
      'campaign_id',
      'campaign_name',
      'spend',
      'impressions',
      'clicks',
      'cpc',
      'ctr',
      'actions',
      'action_values'
    ].join(',');

    const url = `https://graph.facebook.com/v21.0/act_${adAccountId}/insights?` + 
      new URLSearchParams({
        access_token: accessToken,
        fields,
        time_range: JSON.stringify({ since: dateRange.start, until: dateRange.end }),
        level: 'campaign',
        limit: '100'
      });

    const response = await fetch(url, { cache: 'no-store' });
    const data = await response.json();

    if (data.error || !data.data) {
      console.log('⚠️ [Meta API] Sem campanhas:', data.error?.message);
      return [];
    }

    console.log(`✅ [Meta API] ${data.data.length} campanhas encontradas`);

    return data.data.map((c: any) => {
      const actions = c.actions || [];
      const actionValues = c.action_values || [];

      const getAction = (type: string) => {
        const action = actions.find((a: any) => a.action_type === type);
        return action ? parseInt(action.value) : 0;
      };

      const getActionValue = (type: string) => {
        const action = actionValues.find((a: any) => a.action_type === type);
        return action ? parseFloat(action.value) : 0;
      };

      const spend = parseFloat(c.spend || '0');
      const purchases = getAction('purchase') || getAction('omni_purchase');
      const revenue = getActionValue('purchase') || getActionValue('omni_purchase');

      return {
        id: c.campaign_id,
        name: c.campaign_name,
        platform: 'meta' as const,
        status: 'ACTIVE',
        spend,
        impressions: parseInt(c.impressions || '0'),
        clicks: parseInt(c.clicks || '0'),
        conversions: purchases,
        revenue,
        roas: spend > 0 ? revenue / spend : 0,
        cpc: parseFloat(c.cpc || '0'),
        ctr: parseFloat(c.ctr || '0'),
        cpa: purchases > 0 ? spend / purchases : 0
      };
    });
  } catch (error) {
    console.error('❌ [Meta API] Erro ao buscar campanhas:', error);
    return [];
  }
}

// =====================================================
// BUSCAR DADOS DIÁRIOS DO META ADS
// =====================================================

async function fetchMetaDailyData(
  adAccountId: string,
  accessToken: string,
  dateRange: DateRange
): Promise<Array<{ date: string; meta: Partial<ConsolidatedMetrics> }>> {
  try {
    const fields = [
      'spend',
      'impressions',
      'clicks',
      'actions',
      'action_values'
    ].join(',');

    const url = `https://graph.facebook.com/v21.0/act_${adAccountId}/insights?` + 
      new URLSearchParams({
        access_token: accessToken,
        fields,
        time_range: JSON.stringify({ since: dateRange.start, until: dateRange.end }),
        time_increment: '1', // Diário
        level: 'account'
      });

    const response = await fetch(url, { cache: 'no-store' });
    const data = await response.json();

    if (data.error || !data.data) {
      return [];
    }

    return data.data.map((d: any) => {
      const actions = d.actions || [];
      const actionValues = d.action_values || [];

      const getAction = (type: string) => {
        const action = actions.find((a: any) => a.action_type === type);
        return action ? parseInt(action.value) : 0;
      };

      const getActionValue = (type: string) => {
        const action = actionValues.find((a: any) => a.action_type === type);
        return action ? parseFloat(action.value) : 0;
      };

      const purchases = getAction('purchase') || getAction('omni_purchase');
      const revenue = getActionValue('purchase') || getActionValue('omni_purchase');

      return {
        date: d.date_start,
        meta: {
          spend: parseFloat(d.spend || '0'),
          impressions: parseInt(d.impressions || '0'),
          clicks: parseInt(d.clicks || '0'),
          purchases,
          revenue
        }
      };
    });
  } catch (error) {
    console.error('❌ [Meta API] Erro dados diários:', error);
    return [];
  }
}

// =====================================================
// BUSCAR CREDENCIAIS DO META ADS
// =====================================================

async function getMetaCredentials(): Promise<{ 
  adAccountId: string; 
  accessToken: string;
  accountName?: string;
} | null> {
  // Tentar buscar do Supabase primeiro
  try {
    const { data } = await supabaseAdmin
      .from('ai_settings')
      .select('meta_ad_account_id, meta_access_token')
      .single();

    if (data?.meta_ad_account_id && data?.meta_access_token) {
      console.log('✅ [Meta] Credenciais do Supabase');
      return {
        adAccountId: data.meta_ad_account_id,
        accessToken: data.meta_access_token,
        accountName: 'Meta Ads'
      };
    }
  } catch (e) {
    console.log('⚠️ Sem credenciais no Supabase, tentando ENV');
  }

  // Tentar variáveis de ambiente (múltiplas variantes)
  const adAccountId = process.env.META_AD_ACCOUNT_ID || process.env.FACEBOOK_AD_ACCOUNT_ID;
  const accessToken = process.env.META_ACCESS_TOKEN || process.env.FACEBOOK_ACCESS_TOKEN;

  if (adAccountId && accessToken) {
    console.log('✅ [Meta] Credenciais do ENV');
    return { 
      adAccountId, 
      accessToken,
      accountName: 'Meta Ads' 
    };
  }

  console.log('❌ [Meta] Nenhuma credencial encontrada');
  return null;
}

// =====================================================
// MÉTRICAS ZERADAS (PARA PLATAFORMAS DESCONECTADAS)
// =====================================================

function getEmptyMetrics(): ConsolidatedMetrics {
  return {
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
}

// =====================================================
// BUSCAR VENDAS DO SUPABASE (FALLBACK PARA ROAS)
// =====================================================

interface DatabaseSales {
  totalRevenue: number;
  totalSales: number;
  attributedRevenue: number;
  attributedSales: number;
}

async function getDatabaseSales(since: string, until: string): Promise<DatabaseSales> {
  try {
    console.log('🔍 [Consolidated] Buscando vendas do Supabase para ROAS fallback...');
    
    // Buscar vendas aprovadas do período
    const { data: allSales, error } = await supabaseAdmin
      .from('sales')
      .select('id, total_amount, utm_source, utm_medium, utm_campaign, created_at, order_status')
      .gte('created_at', `${since}T00:00:00`)
      .lte('created_at', `${until}T23:59:59.999`)
      .in('order_status', ['paid', 'approved', 'authorized', 'active']);
    
    if (error) {
      console.error('❌ [Consolidated] Erro ao buscar vendas:', error);
      return { totalRevenue: 0, totalSales: 0, attributedRevenue: 0, attributedSales: 0 };
    }
    
    const sales = allSales || [];
    
    if (sales.length === 0) {
      console.log('⚠️ [Consolidated] Nenhuma venda encontrada no período');
      return { totalRevenue: 0, totalSales: 0, attributedRevenue: 0, attributedSales: 0 };
    }
    
    // Calcular totais
    const totalRevenue = sales.reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0);
    const totalSales = sales.length;
    
    // Filtrar vendas atribuídas a anúncios (tem UTM de Facebook/Instagram/Meta)
    const attributedSalesList = sales.filter(s => 
      s.utm_source && (
        s.utm_source.toLowerCase().includes('facebook') ||
        s.utm_source.toLowerCase().includes('instagram') ||
        s.utm_source.toLowerCase().includes('fb') ||
        s.utm_source.toLowerCase().includes('ig') ||
        s.utm_source.toLowerCase().includes('meta')
      )
    );
    
    const attributedRevenue = attributedSalesList.reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0);
    const attributedSales = attributedSalesList.length;
    
    console.log('💰 [Consolidated] Vendas do Supabase:', {
      since,
      until,
      totalSales,
      totalRevenue: totalRevenue.toFixed(2),
      attributedSales,
      attributedRevenue: attributedRevenue.toFixed(2)
    });
    
    return { totalRevenue, totalSales, attributedRevenue, attributedSales };
    
  } catch (error) {
    console.error('❌ [Consolidated] Erro ao buscar vendas do banco:', error);
    return { totalRevenue: 0, totalSales: 0, attributedRevenue: 0, attributedSales: 0 };
  }
}

// =====================================================
// HANDLER PRINCIPAL
// =====================================================

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Parâmetros de período
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');
    const daysParam = searchParams.get('days');

    // Calcular período
    const today = new Date();
    let period: DateRange;

    if (startParam && endParam) {
      period = { start: startParam, end: endParam };
    } else {
      const days = daysParam ? parseInt(daysParam) : 7;
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - days);
      
      period = {
        start: startDate.toISOString().split('T')[0],
        end: today.toISOString().split('T')[0]
      };
    }

    console.log('📊 [Consolidated] Período:', period);

    // =====================================================
    // VERIFICAR CONEXÕES
    // =====================================================

    const platformStatuses: PlatformStatus[] = [];
    const platformMetrics: PlatformMetrics[] = [];
    const allCampaigns: CampaignData[] = [];
    let dailyData: Array<{ date: string; meta?: any; google_ads?: any; total: any }> = [];

    // ===== META ADS =====
    const metaCredentials = await getMetaCredentials();
    
    if (metaCredentials) {
      console.log('✅ [Meta] Credenciais encontradas');
      
      const [currentMeta, metaCampaigns, metaDaily] = await Promise.all([
        fetchMetaAdsData(metaCredentials.adAccountId, metaCredentials.accessToken, period),
        fetchMetaCampaigns(metaCredentials.adAccountId, metaCredentials.accessToken, period),
        fetchMetaDailyData(metaCredentials.adAccountId, metaCredentials.accessToken, period)
      ]);

      if (currentMeta) {
        platformStatuses.push({
          platform: 'meta',
          connected: true,
          account_name: metaCredentials.accountName,
          account_id: metaCredentials.adAccountId
        });
        platformMetrics.push(currentMeta);
        allCampaigns.push(...metaCampaigns);
        
        // Processar dados diários
        dailyData = metaDaily.map(d => ({
          date: d.date,
          meta: d.meta,
          total: d.meta
        }));
      } else {
        platformStatuses.push({
          platform: 'meta',
          connected: false,
          error: 'Erro ao buscar dados da API Meta'
        });
      }
    } else {
      platformStatuses.push({
        platform: 'meta',
        connected: false,
        error: 'Credenciais não configuradas'
      });
    }

    // ===== GOOGLE ADS (NÃO IMPLEMENTADO) =====
    platformStatuses.push({
      platform: 'google_ads',
      connected: false,
      error: 'Integração não configurada'
    });

    // ===== GOOGLE ANALYTICS (NÃO IMPLEMENTADO) =====
    platformStatuses.push({
      platform: 'google_analytics',
      connected: false,
      error: 'Integração não configurada'
    });

    // =====================================================
    // AGREGAR MÉTRICAS
    // =====================================================

    let metrics: ConsolidatedMetrics;
    let variations: Partial<Record<keyof ConsolidatedMetrics, number>> = {};

    if (platformMetrics.length > 0) {
      // Temos dados reais
      metrics = aggregateMetrics(platformMetrics);

      // =====================================================
      // FALLBACK: USAR VENDAS DO SUPABASE SE META NÃO RETORNAR REVENUE
      // =====================================================
      if (metrics.revenue <= 0) {
        const dbSales = await getDatabaseSales(period.start, period.end);
        
        let finalRevenue = 0;
        let finalPurchases = metrics.purchases;
        let revenueSource = 'meta';
        
        if (dbSales.attributedRevenue > 0) {
          // Priorizar vendas atribuídas ao Meta (UTM facebook/instagram)
          finalRevenue = dbSales.attributedRevenue;
          revenueSource = 'supabase_attributed';
          console.log('🔄 [Consolidated] Usando receita ATRIBUÍDA do Supabase:', finalRevenue.toFixed(2));
        } else if (dbSales.totalRevenue > 0) {
          // Fallback para total de vendas
          finalRevenue = dbSales.totalRevenue;
          revenueSource = 'supabase_total';
          console.log('🔄 [Consolidated] Usando receita TOTAL do Supabase:', finalRevenue.toFixed(2));
        }
        
        if (finalRevenue > 0) {
          metrics.revenue = finalRevenue;
          metrics.roas = metrics.spend > 0 ? finalRevenue / metrics.spend : 0;
          metrics.profit = finalRevenue - metrics.spend;
          metrics.profit_margin = finalRevenue > 0 ? ((finalRevenue - metrics.spend) / finalRevenue) * 100 : 0;
          
          // Se não temos compras da Meta mas temos do Supabase
          if (metrics.purchases === 0) {
            if (dbSales.attributedSales > 0) {
              metrics.purchases = dbSales.attributedSales;
            } else if (dbSales.totalSales > 0) {
              metrics.purchases = dbSales.totalSales;
            }
          }
          
          metrics.ticket_medio = metrics.purchases > 0 ? finalRevenue / metrics.purchases : 0;
          metrics.cpa = metrics.purchases > 0 ? metrics.spend / metrics.purchases : 0;
          
          console.log('📊 [Consolidated] Métricas recalculadas:', {
            revenue: metrics.revenue.toFixed(2),
            roas: metrics.roas.toFixed(2),
            profit: metrics.profit.toFixed(2),
            source: revenueSource
          });
        }
      }

      // Buscar período anterior para comparação
      const previousPeriod = getPreviousPeriod(period);
      
      if (metaCredentials) {
        const previousMeta = await fetchMetaAdsData(
          metaCredentials.adAccountId, 
          metaCredentials.accessToken, 
          previousPeriod
        );
        
        if (previousMeta) {
          const previousMetrics = aggregateMetrics([previousMeta]);
          variations = calculateVariations(metrics, previousMetrics);
        }
      }
    } else {
      // Sem dados - retorna zerado
      metrics = getEmptyMetrics();
    }

    // =====================================================
    // CONSTRUIR RESPOSTA
    // =====================================================

    const response: ConsolidatedDashboardData & { platform_status: PlatformStatus[] } = {
      period,
      comparison_period: getPreviousPeriod(period),
      
      // Status das plataformas
      platform_status: platformStatuses,
      
      // Métricas
      metrics,
      variations,
      
      // Por plataforma
      by_platform: {
        meta: platformMetrics.find(p => p.platform === 'meta')?.metrics,
        google_ads: undefined, // Desconectado
        google_analytics: undefined // Desconectado
      },
      
      // Funil
      funnel: buildFunnelData(metrics),
      
      // Campanhas
      campaigns: allCampaigns.sort((a, b) => b.spend - a.spend),
      
      // Dados diários
      daily_data: dailyData,
      
      // Alertas
      alerts: platformMetrics.length > 0 
        ? generateAlerts(metrics, allCampaigns)
        : [
            {
              id: 'no-data',
              type: 'connection',
              severity: 'warning' as const,
              title: 'Nenhuma plataforma conectada',
              message: 'Conecte suas contas de anúncios para ver dados reais',
              actions: [{ action: 'connect', label: 'Conectar Conta' }]
            }
          ]
    };

    // Log final
    console.log('📊 [Consolidated] Resultado:', {
      connected_platforms: platformStatuses.filter(p => p.connected).length,
      total_spend: metrics.spend.toFixed(2),
      total_revenue: metrics.revenue.toFixed(2),
      campaigns_count: allCampaigns.length
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ [Consolidated] Erro:', error);
    
    // Em caso de erro, retorna estrutura zerada
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return NextResponse.json({
      period: {
        start: sevenDaysAgo.toISOString().split('T')[0],
        end: today.toISOString().split('T')[0]
      },
      platform_status: [
        { platform: 'meta', connected: false, error: 'Erro interno' },
        { platform: 'google_ads', connected: false, error: 'Não configurado' },
        { platform: 'google_analytics', connected: false, error: 'Não configurado' }
      ],
      metrics: getEmptyMetrics(),
      variations: {},
      by_platform: {},
      funnel: {
        impressions: 0,
        clicks: 0,
        landing_page_views: 0,
        checkouts: 0,
        purchases: 0,
        rates: {
          impressions_to_clicks: 0,
          clicks_to_pv: 0,
          pv_to_checkout: 0,
          checkout_to_purchase: 0,
          overall_conversion: 0
        }
      },
      campaigns: [],
      daily_data: [],
      alerts: [{
        id: 'error',
        type: 'error',
        severity: 'critical',
        title: 'Erro ao carregar dados',
        message: String(error)
      }]
    });
  }
}
