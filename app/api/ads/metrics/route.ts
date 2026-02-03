/**
 * 📊 API de Métricas de Ads com ROAS Inteligente
 * 
 * Este endpoint calcula ROAS usando:
 * 1. Primeiro tenta usar action_values do Meta (padrão)
 * 2. Se vazio, usa dados de vendas do banco (fallback inteligente)
 * 
 * Isso resolve o problema de ROAS = 0 quando Meta não retorna action_values
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// =====================================================
// CONFIG: Buscar credenciais do banco ou env
// =====================================================

interface MetaCredentials {
  adAccountId: string;
  accessToken: string;
  pixelId: string;
}

async function getMetaCredentials(): Promise<MetaCredentials | null> {
  const accessToken = process.env.META_ACCESS_TOKEN || process.env.FACEBOOK_ACCESS_TOKEN;
  const pixelId = process.env.FACEBOOK_PIXEL_ID;
  
  if (!accessToken) {
    console.error('❌ Access token Meta não configurado');
    return null;
  }

  try {
    const { data: settings } = await supabaseAdmin
      .from('integration_settings')
      .select('meta_ad_account_id, meta_pixel_id')
      .single();

    const adAccountId = settings?.meta_ad_account_id || 
                        process.env.META_AD_ACCOUNT_ID || 
                        process.env.FACEBOOK_AD_ACCOUNT_ID;

    if (!adAccountId) {
      console.error('❌ Meta Ad Account ID não configurado');
      return null;
    }

    return {
      adAccountId,
      accessToken,
      pixelId: settings?.meta_pixel_id || pixelId || '',
    };
  } catch (error) {
    console.error('❌ Erro ao buscar credenciais:', error);
    
    const envAccountId = process.env.META_AD_ACCOUNT_ID || process.env.FACEBOOK_AD_ACCOUNT_ID;
    if (envAccountId) {
      return { 
        adAccountId: envAccountId, 
        accessToken: accessToken,
        pixelId: pixelId || ''
      };
    }
    return null;
  }
}

// =====================================================
// BUSCAR INSIGHTS DO META ADS API
// =====================================================

interface MetaInsights {
  spend: number;
  impressions: number;
  clicks: number;
  reach: number;
  purchases: number;
  purchaseValue: number;
  leads: number;
  cpc: number;
  ctr: number;
  frequency: number;
}

async function getMetaInsights(
  credentials: MetaCredentials,
  since: string,
  until: string
): Promise<MetaInsights> {
  const { adAccountId, accessToken } = credentials;
  
  const fields = [
    'spend',
    'impressions', 
    'clicks',
    'reach',
    'cpc',
    'ctr',
    'frequency',
    'actions',
    'action_values'
  ].join(',');

  const url = `https://graph.facebook.com/v21.0/act_${adAccountId}/insights?` + new URLSearchParams({
    access_token: accessToken,
    fields,
    time_range: JSON.stringify({ since, until }),
    level: 'account'
  });

  console.log('📊 [Meta API] Buscando insights:', { since, until });

  try {
    const response = await fetch(url, { cache: 'no-store' });
    const data = await response.json();

    if (data.error) {
      console.error('❌ [Meta API] Erro:', data.error);
      throw new Error(data.error.message);
    }

    const insights = data.data?.[0] || {};
    
    // Extrair ações (conversões)
    const actions = insights.actions || [];
    const actionValues = insights.action_values || [];
    
    // Buscar purchases (usar apenas offsite_conversion.fb_pixel_purchase para evitar duplicatas)
    const purchaseAction = actions.find((a: any) => 
      a.action_type === 'offsite_conversion.fb_pixel_purchase'
    );
    
    const purchaseValueAction = actionValues.find((a: any) => 
      a.action_type === 'offsite_conversion.fb_pixel_purchase'
    );
    
    // Buscar leads
    const leadAction = actions.find((a: any) => 
      a.action_type === 'offsite_conversion.fb_pixel_lead'
    );

    const result: MetaInsights = {
      spend: parseFloat(insights.spend || '0'),
      impressions: parseInt(insights.impressions || '0'),
      clicks: parseInt(insights.clicks || '0'),
      reach: parseInt(insights.reach || '0'),
      purchases: parseInt(purchaseAction?.value || '0'),
      purchaseValue: parseFloat(purchaseValueAction?.value || '0'),
      leads: parseInt(leadAction?.value || '0'),
      cpc: parseFloat(insights.cpc || '0'),
      ctr: parseFloat(insights.ctr || '0'),
      frequency: parseFloat(insights.frequency || '0'),
    };

    console.log('📊 [Meta API] Resultado:', {
      spend: result.spend,
      purchases: result.purchases,
      purchaseValue: result.purchaseValue,
      hasActionValues: actionValues.length > 0
    });

    return result;
  } catch (error) {
    console.error('❌ [Meta API] Erro na requisição:', error);
    return {
      spend: 0,
      impressions: 0,
      clicks: 0,
      reach: 0,
      purchases: 0,
      purchaseValue: 0,
      leads: 0,
      cpc: 0,
      ctr: 0,
      frequency: 0,
    };
  }
}

// =====================================================
// BUSCAR VENDAS DO BANCO (FALLBACK PARA ROAS)
// =====================================================

interface DatabaseSales {
  totalRevenue: number;
  totalSales: number;
  attributedRevenue: number;
  attributedSales: number;
}

async function getDatabaseSales(since: string, until: string): Promise<DatabaseSales> {
  try {
    // Buscar todas as vendas aprovadas no período
    // Status que indicam venda PAGA: paid, approved, authorized, active
    const { data: allSales, error } = await supabaseAdmin
      .from('sales')
      .select('id, total_amount, utm_source, utm_medium, utm_campaign, created_at, order_status')
      .gte('created_at', `${since}T00:00:00`)
      .lte('created_at', `${until}T23:59:59.999`)
      .in('order_status', ['paid', 'approved', 'authorized', 'active']);

    if (error) {
      console.error('❌ [DB] Erro ao buscar vendas:', error);
      return { totalRevenue: 0, totalSales: 0, attributedRevenue: 0, attributedSales: 0 };
    }

    const sales = allSales || [];
    
    // Calcular totais
    const totalRevenue = sales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
    const totalSales = sales.length;
    
    // Filtrar vendas atribuídas a anúncios (tem UTM de Facebook/Instagram)
    const attributedSales = sales.filter(s => 
      s.utm_source && (
        s.utm_source.toLowerCase().includes('facebook') ||
        s.utm_source.toLowerCase().includes('instagram') ||
        s.utm_source.toLowerCase().includes('fb') ||
        s.utm_source.toLowerCase().includes('ig') ||
        s.utm_source.toLowerCase().includes('meta')
      )
    );
    
    const attributedRevenue = attributedSales.reduce((sum, s) => sum + (s.total_amount || 0), 0);

    console.log('📊 [DB] Vendas no período:', {
      since,
      until,
      totalSales,
      totalRevenue,
      attributedSales: attributedSales.length,
      attributedRevenue
    });

    return {
      totalRevenue,
      totalSales,
      attributedRevenue,
      attributedSales: attributedSales.length
    };
  } catch (error) {
    console.error('❌ [DB] Erro:', error);
    return { totalRevenue: 0, totalSales: 0, attributedRevenue: 0, attributedSales: 0 };
  }
}

// =====================================================
// ENDPOINT PRINCIPAL
// =====================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const days = parseInt(searchParams.get('days') || '0');

    // Calcular datas
    let since: string;
    let until: string;

    if (start && end) {
      since = start;
      until = end;
    } else {
      const today = new Date();
      const startDate = new Date(today);
      
      if (days === 0) {
        // Hoje
        since = today.toISOString().split('T')[0];
        until = since;
      } else if (days === 1) {
        // Ontem
        startDate.setDate(startDate.getDate() - 1);
        since = startDate.toISOString().split('T')[0];
        until = since;
      } else {
        // Últimos N dias
        startDate.setDate(startDate.getDate() - (days - 1));
        since = startDate.toISOString().split('T')[0];
        until = today.toISOString().split('T')[0];
      }
    }

    console.log('📊 [Metrics API] Período:', { since, until, days });

    // Buscar credenciais
    const credentials = await getMetaCredentials();
    
    if (!credentials) {
      return NextResponse.json({
        success: false,
        error: 'Credenciais Meta não configuradas',
        data: null
      }, { status: 500 });
    }

    // Buscar dados em paralelo
    const [metaInsights, dbSales] = await Promise.all([
      getMetaInsights(credentials, since, until),
      getDatabaseSales(since, until)
    ]);

    // ✅ LÓGICA INTELIGENTE DE ROAS
    // Se Meta retornou purchaseValue > 0, usar Meta
    // Senão, usar dados do banco (fallback inteligente)
    
    let revenue: number;
    let purchases: number;
    let revenueSource: 'meta_api' | 'database' | 'database_attributed';

    if (metaInsights.purchaseValue > 0) {
      // Meta retornou action_values - usar diretamente
      revenue = metaInsights.purchaseValue;
      purchases = metaInsights.purchases;
      revenueSource = 'meta_api';
      console.log('✅ [Metrics] Usando receita do Meta API:', revenue);
    } else if (dbSales.attributedRevenue > 0) {
      // Usar vendas atribuídas (com UTM)
      revenue = dbSales.attributedRevenue;
      purchases = dbSales.attributedSales;
      revenueSource = 'database_attributed';
      console.log('✅ [Metrics] Usando receita atribuída do banco:', revenue);
    } else {
      // Fallback: usar todas as vendas do período
      revenue = dbSales.totalRevenue;
      purchases = dbSales.totalSales;
      revenueSource = 'database';
      console.log('✅ [Metrics] Usando receita total do banco (fallback):', revenue);
    }

    // Calcular métricas derivadas
    const spend = metaInsights.spend;
    const roas = spend > 0 ? revenue / spend : 0;
    const cpa = purchases > 0 ? spend / purchases : 0;
    const conversionRate = metaInsights.clicks > 0 
      ? (purchases / metaInsights.clicks) * 100 
      : 0;

    const response = {
      success: true,
      period: { since, until },
      data: {
        // Métricas de investimento
        spend,
        
        // Métricas de alcance
        impressions: metaInsights.impressions,
        reach: metaInsights.reach,
        clicks: metaInsights.clicks,
        cpc: metaInsights.cpc,
        ctr: metaInsights.ctr,
        frequency: metaInsights.frequency,
        
        // Métricas de conversão
        purchases,
        revenue,
        leads: metaInsights.leads,
        
        // Métricas calculadas
        roas: parseFloat(roas.toFixed(2)),
        cpa: parseFloat(cpa.toFixed(2)),
        conversionRate: parseFloat(conversionRate.toFixed(2)),
        
        // Debug info
        _meta: {
          revenueSource,
          metaPurchaseValue: metaInsights.purchaseValue,
          metaPurchases: metaInsights.purchases,
          dbTotalRevenue: dbSales.totalRevenue,
          dbTotalSales: dbSales.totalSales,
          dbAttributedRevenue: dbSales.attributedRevenue,
          dbAttributedSales: dbSales.attributedSales
        }
      }
    };

    console.log('📊 [Metrics API] Resposta:', {
      spend,
      revenue,
      roas: response.data.roas,
      revenueSource
    });

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('❌ [Metrics API] Erro:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      data: null
    }, { status: 500 });
  }
}
