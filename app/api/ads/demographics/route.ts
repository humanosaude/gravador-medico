import { NextRequest, NextResponse } from 'next/server';
import { DatePreset, ACTION_TYPES, sumActions, sumActionValues } from '@/lib/meta-marketing';

const AD_ACCOUNT_ID = process.env.FACEBOOK_AD_ACCOUNT_ID;
const ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;

export const dynamic = 'force-dynamic';

/**
 * Busca dados demográficos da Meta Ads com breakdowns
 * Suporta breakdowns: gender, age, publisher_platform
 */
export async function GET(request: NextRequest) {
  try {
    if (!AD_ACCOUNT_ID || !ACCESS_TOKEN) {
      return NextResponse.json({ error: 'Credenciais não configuradas' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const datePreset = (searchParams.get('period') || 'last_30d') as DatePreset;
    const breakdown = searchParams.get('breakdown') || 'gender'; // gender, age, publisher_platform
    const start = searchParams.get('start');
    const end = searchParams.get('end');

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
    const timeRange = since && until ? { since, until } : null;

    // Construir URL da API do Facebook
    const params: Record<string, string> = {
      access_token: ACCESS_TOKEN,
      level: 'account',
      breakdowns: breakdown,
      fields: 'spend,impressions,clicks,cpc,ctr,cpm,actions,action_values,reach',
      limit: '100'
    };

    if (timeRange) {
      params.time_range = JSON.stringify(timeRange);
    } else {
      params.date_preset = datePreset;
    }

    const url = `https://graph.facebook.com/v19.0/act_${AD_ACCOUNT_ID}/insights?` + new URLSearchParams(params);

    const res = await fetch(url, { next: { revalidate: 300 } });
    const data = await res.json();

    if (data.error) {
      console.error('Erro da API Meta:', data.error);
      return NextResponse.json({ error: data.error.message }, { status: 500 });
    }

    // Processar e formatar os dados
    const insights = (data.data || []).map((insight: any) => {
      // Extrair leads
      const leadCount = sumActions(insight.actions, ACTION_TYPES.leads);
      const checkoutCount = sumActions(insight.actions, ACTION_TYPES.checkout);
      const purchaseCount = sumActions(insight.actions, ACTION_TYPES.purchases);
      const revenue = sumActionValues(insight.action_values, ACTION_TYPES.purchases);

      return {
        // Dependendo do breakdown, teremos diferentes chaves
        gender: insight.gender,
        age: insight.age,
        publisher_platform: insight.publisher_platform,
        
        // Métricas
        investimento: Number(insight.spend || 0),
        impressoes: Number(insight.impressions || 0),
        cliques: Number(insight.clicks || 0),
        alcance: Number(insight.reach || 0),
        leads: leadCount,
        finalizacoes: checkoutCount,
        conversoes: purchaseCount,
        receita: revenue,
        
        // Métricas calculadas
        cpm: Number(insight.cpm || 0),
        ctr: Number(insight.ctr || 0),
        cpc: Number(insight.cpc || 0),
      };
    });

    return NextResponse.json(insights);
  } catch (error) {
    console.error('Erro ao buscar dados demográficos:', error);
    return NextResponse.json({ error: 'Erro ao processar dados' }, { status: 500 });
  }
}
