import { NextRequest, NextResponse } from 'next/server';
import { getAdsInsights, DatePreset, InsightLevel } from '@/lib/meta-marketing';

const AD_ACCOUNT_ID = process.env.FACEBOOK_AD_ACCOUNT_ID;
const ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;

export const dynamic = 'force-dynamic';

// Busca todas as campanhas com status e data de criação (com paginação)
async function getCampaignsMetadata(): Promise<Map<string, { status: string; created_time: string; name: string }>> {
  const map = new Map();
  if (!AD_ACCOUNT_ID || !ACCESS_TOKEN) return map;

  try {
    let url: string | null = `https://graph.facebook.com/v19.0/act_${AD_ACCOUNT_ID}/campaigns?` + new URLSearchParams({
      access_token: ACCESS_TOKEN,
      fields: 'id,name,status,effective_status,created_time',
      limit: '500'
    });
    
    // Paginar para buscar todas as campanhas
    while (url) {
      const res: Response = await fetch(url, { next: { revalidate: 300 } });
      const data: any = await res.json();
      
      if (data.data) {
        data.data.forEach((c: any) => {
          map.set(c.id, { 
            status: c.effective_status || c.status, 
            created_time: c.created_time,
            name: c.name 
          });
        });
      }
      
      // Próxima página
      url = data.paging?.next || null;
    }
  } catch (e) {
    console.error('Erro ao buscar metadata:', e);
  }
  return map;
}

async function getAdsetsMetadata(): Promise<Map<string, { status: string; created_time: string; name: string }>> {
  const map = new Map();
  if (!AD_ACCOUNT_ID || !ACCESS_TOKEN) return map;

  try {
    let url: string | null = `https://graph.facebook.com/v19.0/act_${AD_ACCOUNT_ID}/adsets?` + new URLSearchParams({
      access_token: ACCESS_TOKEN,
      fields: 'id,name,status,effective_status,created_time',
      limit: '500'
    });

    while (url) {
      const res: Response = await fetch(url, { next: { revalidate: 300 } });
      const data: any = await res.json();

      if (data.data) {
        data.data.forEach((a: any) => {
          map.set(a.id, {
            status: a.effective_status || a.status,
            created_time: a.created_time,
            name: a.name
          });
        });
      }

      url = data.paging?.next || null;
    }
  } catch (e) {
    console.error('Erro ao buscar metadata de adsets:', e);
  }

  return map;
}

async function getAdsMetadata(): Promise<Map<string, { status: string; created_time: string; name: string }>> {
  const map = new Map();
  if (!AD_ACCOUNT_ID || !ACCESS_TOKEN) return map;

  try {
    let url: string | null = `https://graph.facebook.com/v19.0/act_${AD_ACCOUNT_ID}/ads?` + new URLSearchParams({
      access_token: ACCESS_TOKEN,
      fields: 'id,name,status,effective_status,created_time',
      limit: '500'
    });

    while (url) {
      const res: Response = await fetch(url, { next: { revalidate: 300 } });
      const data: any = await res.json();

      if (data.data) {
        data.data.forEach((a: any) => {
          map.set(a.id, {
            status: a.effective_status || a.status,
            created_time: a.created_time,
            name: a.name
          });
        });
      }

      url = data.paging?.next || null;
    }
  } catch (e) {
    console.error('Erro ao buscar metadata de ads:', e);
  }

  return map;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const datePreset = (searchParams.get('period') || 'maximum') as DatePreset;
    const level = (searchParams.get('level') || 'campaign') as InsightLevel;
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const timeIncrement = searchParams.get('time_increment');
    const includeStatus = searchParams.get('include_status') === '1';

    // Normaliza a data para formato YYYY-MM-DD
    // Aceita tanto formato ISO (2024-01-28T00:00:00.000Z) quanto YYYY-MM-DD
    const normalizeDate = (value: string) => {
      // Se já está no formato YYYY-MM-DD, retorna direto
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return value;
      }
      // Senão, tenta parsear como Date
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return null;
      // Extrai a data local (não UTC) para evitar problemas de timezone
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const since = start ? normalizeDate(start) : null;
    const until = end ? normalizeDate(end) : null;
    const timeRange = since && until ? { since, until } : undefined;
    const resolvedTimeIncrement = timeIncrement ? timeIncrement : undefined;
    
    // Se for adset ou ad, retorna direto sem enriquecimento (não tem metadata)
    if (level === 'adset' || level === 'ad') {
      const insights = await getAdsInsights(datePreset, level, timeRange, resolvedTimeIncrement);

      if (!includeStatus) {
        return NextResponse.json(insights);
      }

      const metadata = level === 'adset'
        ? await getAdsetsMetadata()
        : await getAdsMetadata();

      const enrichedInsights = insights.map(insight => {
        const id = level === 'adset' ? insight.adset_id : insight.ad_id;
        const meta = metadata.get(id || '');
        return {
          ...insight,
          effective_status: meta?.status || (insight as any).effective_status || 'UNKNOWN',
          created_time: meta?.created_time || (insight as any).created_time || null
        };
      });

      return NextResponse.json(enrichedInsights);
    }
    
    // Para campanhas, buscar insights e metadata em paralelo
    const [insights, metadata] = await Promise.all([
      getAdsInsights(datePreset, 'campaign', timeRange, resolvedTimeIncrement),
      getCampaignsMetadata()
    ]);
    
    // IDs das campanhas que já têm insights
    const insightIds = new Set(insights.map(i => i.campaign_id));
    
    // Enriquecer insights com status e created_time
    const enrichedInsights = insights.map(insight => {
      const meta = metadata.get(insight.campaign_id || '');
      return {
        ...insight,
        effective_status: meta?.status || 'UNKNOWN',
        created_time: meta?.created_time || null
      };
    });
    
    // Adicionar campanhas ATIVAS que não têm insights (campanhas novas sem gastos ainda)
    metadata.forEach((meta, id) => {
      if (!insightIds.has(id) && meta.status === 'ACTIVE') {
        enrichedInsights.push({
          campaign_id: id,
          campaign_name: meta.name,
          spend: '0',
          impressions: '0',
          clicks: '0',
          cpc: '0',
          ctr: '0',
          reach: '0',
          date_start: '',
          date_stop: '',
          effective_status: meta.status,
          created_time: meta.created_time
        } as any);
      }
    });
    
    // Ordenar por created_time (mais recente primeiro) como padrão
    enrichedInsights.sort((a, b) => {
      const dateA = a.created_time || '';
      const dateB = b.created_time || '';
      return dateB.localeCompare(dateA);
    });
    
    return NextResponse.json(enrichedInsights);
  } catch (error) {
    console.error('Erro ao buscar insights de anúncios:', error);
    return NextResponse.json([], { status: 500 });
  }
}
