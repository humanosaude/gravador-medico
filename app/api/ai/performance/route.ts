/**
 * 🧠 API Route - Performance Intelligence Engine
 * 
 * Endpoints para análise avançada de performance usando IA
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  runFullAIAnalysis, 
  runQuickAnalysis, 
  chatWithAI, 
  runLocalAnalysis,
  PerformanceData,
  CampaignData,
  AdSetData,
  AdData
} from '@/lib/ai-performance-engine';
import { supabaseAdmin } from '@/lib/supabase';

// Cache
const analysisCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutos

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

function getDateRange(period: string): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString();
  let start: Date;
  
  switch (period) {
    case 'today':
      start = new Date(now); start.setHours(0, 0, 0, 0);
      break;
    case 'yesterday':
      start = new Date(now); start.setDate(start.getDate() - 1); start.setHours(0, 0, 0, 0);
      const endY = new Date(start); endY.setHours(23, 59, 59, 999);
      return { start: start.toISOString(), end: endY.toISOString() };
    case 'last_7d':
      start = new Date(now); start.setDate(start.getDate() - 7);
      break;
    case 'last_14d':
      start = new Date(now); start.setDate(start.getDate() - 14);
      break;
    case 'last_30d':
      start = new Date(now); start.setDate(start.getDate() - 30);
      break;
    default:
      start = new Date(now); start.setDate(start.getDate() - 7);
  }
  
  return { start: start.toISOString(), end };
}

async function fetchRealSales(startDate: string, endDate: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('sales')
      .select('total_amount, created_at')
      .in('status', ['approved', 'paid', 'completed'])
      .gte('created_at', startDate)
      .lte('created_at', endDate);
    
    if (error || !data) {
      return { totalRevenue: 0, totalSales: 0, avgTicket: 0, period: `${startDate} a ${endDate}` };
    }
    
    const totalRevenue = data.reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0);
    const totalSales = data.length;
    
    return {
      totalRevenue,
      totalSales,
      avgTicket: totalSales > 0 ? totalRevenue / totalSales : 0,
      period: `${startDate} a ${endDate}`
    };
  } catch {
    return { totalRevenue: 0, totalSales: 0, avgTicket: 0, period: '' };
  }
}

async function fetchAdsData(baseUrl: string, period: string, level: string): Promise<any[]> {
  try {
    const url = `${baseUrl}/api/ads/insights?period=${period}&level=${level}`;
    console.log(`🧠 [AI Engine] Fetching: ${url}`);
    
    const response = await fetch(url, { 
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      console.log(`🧠 [AI Engine] Fetch failed: ${response.status} ${response.statusText}`);
      return [];
    }
    
    const data = await response.json();
    console.log(`🧠 [AI Engine] Fetched ${level}: ${data.length} items, first spend: ${data[0]?.spend || 'N/A'}`);
    return data;
  } catch (error: any) {
    console.error(`🧠 [AI Engine] Fetch error for ${level}:`, error.message);
    return [];
  }
}

// Extrai valor de uma ação específica do array de actions
function extractActionValue(actions: any[] | undefined, actionType: string): number {
  if (!actions || !Array.isArray(actions)) return 0;
  const action = actions.find(a => a.action_type === actionType);
  return action ? Number(action.value || 0) : 0;
}

// Extrai conversões (purchases) do array de actions
function extractConversions(item: any): number {
  const actions = item.actions || [];
  // Prioridade: purchase > omni_purchase > web_in_store_purchase
  return extractActionValue(actions, 'purchase') || 
         extractActionValue(actions, 'omni_purchase') || 
         extractActionValue(actions, 'web_in_store_purchase') || 
         Number(item.conversions || 0);
}

// Extrai receita do array de action_values
function extractRevenue(item: any): number {
  const actionValues = item.action_values || [];
  if (Array.isArray(actionValues)) {
    const purchaseValue = actionValues.find((a: any) => 
      a.action_type === 'purchase' || 
      a.action_type === 'omni_purchase'
    );
    if (purchaseValue) return Number(purchaseValue.value || 0);
  }
  return Number(item.revenue || item.purchase_value || 0);
}

function transformCampaignData(raw: any[]): CampaignData[] {
  return raw.map(c => {
    const spend = Number(c.spend || 0);
    const conversions = extractConversions(c);
    const revenue = extractRevenue(c);
    const roas = spend > 0 ? revenue / spend : 0;
    
    return {
      id: c.campaign_id || c.id || '',
      name: c.campaign_name || c.name || 'Sem nome',
      status: c.effective_status || c.status || 'UNKNOWN',
      spend,
      impressions: Number(c.impressions || 0),
      clicks: Number(c.clicks || 0),
      reach: Number(c.reach || 0),
      ctr: Number(c.ctr || 0),
      cpc: Number(c.cpc || 0),
      cpm: Number(c.cpm || 0),
      conversions,
      revenue,
      roas
    };
  });
}

function transformAdSetData(raw: any[]): AdSetData[] {
  return raw.map(a => {
    const spend = Number(a.spend || 0);
    const conversions = extractConversions(a);
    const revenue = extractRevenue(a);
    const roas = spend > 0 ? revenue / spend : 0;
    
    return {
      id: a.adset_id || a.id || '',
      name: a.adset_name || a.name || 'Sem nome',
      campaignName: a.campaign_name || '',
      status: a.effective_status || a.status || 'UNKNOWN',
      spend,
      impressions: Number(a.impressions || 0),
      clicks: Number(a.clicks || 0),
      ctr: Number(a.ctr || 0),
      cpc: Number(a.cpc || 0),
      conversions,
      roas,
      frequency: Number(a.frequency || 0)
    };
  });
}

function transformAdData(raw: any[]): AdData[] {
  return raw.map(a => {
    // Detectar tipo de criativo pelo nome
    const name = (a.ad_name || a.name || '').toLowerCase();
    let creativeType: 'video' | 'image' | 'carousel' | 'unknown' = 'unknown';
    if (name.includes('video') || name.includes('vid') || name.includes('ugc')) creativeType = 'video';
    else if (name.includes('carousel') || name.includes('carrossel')) creativeType = 'carousel';
    else if (name.includes('image') || name.includes('img') || name.includes('static')) creativeType = 'image';
    
    const conversions = extractConversions(a);
    
    return {
      id: a.ad_id || a.id || '',
      name: a.ad_name || a.name || 'Sem nome',
      adsetName: a.adset_name || '',
      campaignName: a.campaign_name || '',
      status: a.effective_status || a.status || 'UNKNOWN',
      spend: Number(a.spend || 0),
      impressions: Number(a.impressions || 0),
      clicks: Number(a.clicks || 0),
      ctr: Number(a.ctr || 0),
      cpc: Number(a.cpc || 0),
      conversions,
      creativeType
    };
  });
}

// =====================================================
// ENDPOINTS
// =====================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'last_7d';
    const type = searchParams.get('type') || 'full'; // full, quick, local
    const forceRefresh = searchParams.get('refresh') === 'true';
    
    // Cache key
    const cacheKey = `ai-analysis-${type}-${period}`;
    const cached = analysisCache.get(cacheKey);
    
    if (!forceRefresh && cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({ ...cached.data, cached: true });
    }
    
    // Usar a URL base do request atual para garantir que funcione em dev e prod
    const requestUrl = new URL(request.url);
    const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;
    const { start, end } = getDateRange(period);
    
    console.log(`🧠 [AI Engine] Iniciando análise ${type} - Período: ${period}`);
    console.log(`🧠 [AI Engine] Base URL: ${baseUrl}`);
    
    // Buscar todos os dados em paralelo
    const [campaignsRaw, adSetsRaw, adsRaw, realSales] = await Promise.all([
      fetchAdsData(baseUrl, period, 'campaign'),
      fetchAdsData(baseUrl, period, 'adset'),
      fetchAdsData(baseUrl, period, 'ad'),
      fetchRealSales(start, end)
    ]);
    
    console.log(`🧠 [AI Engine] Dados: ${campaignsRaw.length} campanhas, ${adSetsRaw.length} ad sets, ${adsRaw.length} ads`);
    console.log(`🧠 [AI Engine] Vendas: ${realSales.totalSales} vendas, R$ ${realSales.totalRevenue.toFixed(2)}`);
    
    // Debug: mostrar gasto das campanhas raw
    const totalSpendRaw = campaignsRaw.reduce((s, c) => s + Number(c.spend || 0), 0);
    console.log(`🧠 [AI Engine] Gasto RAW: R$ ${totalSpendRaw.toFixed(2)}`);
    
    // Transformar dados
    const performanceData: PerformanceData = {
      campaigns: transformCampaignData(campaignsRaw),
      adSets: transformAdSetData(adSetsRaw),
      ads: transformAdData(adsRaw),
      realSales,
      period,
      startDate: start,
      endDate: end
    };
    
    // Debug: mostrar gasto transformado
    const totalSpendTransformed = performanceData.campaigns.reduce((s, c) => s + c.spend, 0);
    console.log(`🧠 [AI Engine] Gasto TRANSFORMADO: R$ ${totalSpendTransformed.toFixed(2)}`);
    
    let result;
    
    if (type === 'local' || !process.env.OPENAI_API_KEY) {
      // Análise local (sem API)
      console.log(`🧠 [AI Engine] Usando análise LOCAL`);
      result = runLocalAnalysis(performanceData);
    } else if (type === 'quick') {
      // Análise rápida
      console.log(`🧠 [AI Engine] Análise RÁPIDA via OpenAI`);
      const quickResult = await runQuickAnalysis(performanceData);
      result = { analiseRapida: quickResult, metricas: runLocalAnalysis(performanceData).metricas };
    } else {
      // Análise completa via OpenAI
      try {
        console.log(`🧠 [AI Engine] Análise COMPLETA via OpenAI`);
        result = await runFullAIAnalysis(performanceData);
      } catch (error: any) {
        console.error(`🧠 [AI Engine] Erro OpenAI, usando fallback local:`, error.message);
        result = runLocalAnalysis(performanceData);
        result = { ...result, warning: 'Usando análise local (OpenAI indisponível)' };
      }
    }
    
    // Salvar no cache
    analysisCache.set(cacheKey, { data: result, timestamp: Date.now() });
    
    return NextResponse.json({
      ...result,
      cached: false,
      analyzedAt: new Date().toISOString(),
      dataSource: {
        campaigns: campaignsRaw.length,
        adSets: adSetsRaw.length,
        ads: adsRaw.length,
        realSales: realSales.totalSales
      }
    });
    
  } catch (error: any) {
    console.error('❌ [AI Engine] Erro:', error);
    return NextResponse.json(
      { error: 'Erro ao processar análise de IA', details: error.message },
      { status: 500 }
    );
  }
}

// Chat endpoint
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, period = 'last_7d', includeContext = true } = body;
    
    if (!message) {
      return NextResponse.json({ error: 'Mensagem é obrigatória' }, { status: 400 });
    }
    
    let context: PerformanceData | undefined;
    
    if (includeContext) {
      // Usar a URL base do request atual
      const requestUrl = new URL(request.url);
      const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;
      const { start, end } = getDateRange(period);
      
      const [campaignsRaw, adSetsRaw, adsRaw, realSales] = await Promise.all([
        fetchAdsData(baseUrl, period, 'campaign'),
        fetchAdsData(baseUrl, period, 'adset'),
        fetchAdsData(baseUrl, period, 'ad'),
        fetchRealSales(start, end)
      ]);
      
      context = {
        campaigns: transformCampaignData(campaignsRaw),
        adSets: transformAdSetData(adSetsRaw),
        ads: transformAdData(adsRaw),
        realSales,
        period,
        startDate: start,
        endDate: end
      };
    }
    
    console.log(`🧠 [AI Chat] Pergunta: "${message.substring(0, 50)}..."`);
    
    const response = await chatWithAI(message, context);
    
    return NextResponse.json({
      response,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('❌ [AI Chat] Erro:', error);
    return NextResponse.json(
      { error: 'Erro ao processar chat', details: error.message },
      { status: 500 }
    );
  }
}
