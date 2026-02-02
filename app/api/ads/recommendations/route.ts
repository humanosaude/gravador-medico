// =====================================================
// API: RECOMMENDATIONS
// =====================================================
// CRUD de recomendações + aplicar/ignorar ações
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

// =====================================================
// GET: Listar recomendações
// =====================================================

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || 'PENDING';
    const limit = parseInt(searchParams.get('limit') || '50');
    const priority = searchParams.get('priority');

    let query = supabaseAdmin
      .from('ads_recommendations')
      .select(`
        *,
        campaign:ads_campaigns(name, status, objective)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Filtrar por status
    if (status !== 'all') {
      query = query.eq('status', status);
    }

    // Filtrar por prioridade
    if (priority) {
      query = query.eq('priority', priority);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    // Agrupar por prioridade para o frontend
    const grouped = {
      CRITICAL: data?.filter(r => r.priority === 'CRITICAL') || [],
      HIGH: data?.filter(r => r.priority === 'HIGH') || [],
      MEDIUM: data?.filter(r => r.priority === 'MEDIUM') || [],
      LOW: data?.filter(r => r.priority === 'LOW') || [],
    };

    // Estatísticas
    const stats = {
      total: data?.length || 0,
      critical: grouped.CRITICAL.length,
      high: grouped.HIGH.length,
      medium: grouped.MEDIUM.length,
      low: grouped.LOW.length,
      pending: data?.filter(r => r.status === 'PENDING').length || 0,
    };

    return NextResponse.json({
      success: true,
      recommendations: data,
      grouped,
      stats,
    });

  } catch (error) {
    console.error('❌ Erro ao buscar recomendações:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erro' },
      { status: 500 }
    );
  }
}

// =====================================================
// POST: Aplicar ou ignorar recomendação
// =====================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { recommendation_id, action } = body as {
      recommendation_id: string;
      action: 'apply' | 'dismiss';
    };

    if (!recommendation_id || !action) {
      return NextResponse.json(
        { success: false, error: 'recommendation_id e action são obrigatórios' },
        { status: 400 }
      );
    }

    // Buscar recomendação
    const { data: rec, error: fetchError } = await supabaseAdmin
      .from('ads_recommendations')
      .select('*')
      .eq('id', recommendation_id)
      .single();

    if (fetchError || !rec) {
      return NextResponse.json(
        { success: false, error: 'Recomendação não encontrada' },
        { status: 404 }
      );
    }

    if (action === 'dismiss') {
      // Apenas marcar como ignorada
      await supabaseAdmin
        .from('ads_recommendations')
        .update({
          status: 'DISMISSED',
          dismissed_at: new Date().toISOString(),
        })
        .eq('id', recommendation_id);

      return NextResponse.json({
        success: true,
        message: 'Recomendação ignorada',
      });
    }

    // Aplicar ação
    let actionResult: Record<string, unknown> = {};

    if (rec.action_type === 'pause' && rec.action_params?.campaign_id) {
      // Pausar campanha na Meta
      actionResult = await pauseCampaign(rec.action_params.campaign_id as string);
    } else if (rec.action_type === 'scale_up' && rec.action_params) {
      // Escalar orçamento
      actionResult = await scaleCampaignBudget(
        rec.action_params.campaign_id as string,
        rec.action_params.new_budget as number
      );
    } else if (rec.action_type === 'unpause' && rec.action_params?.campaign_id) {
      // Reativar campanha
      actionResult = await unpauseCampaign(rec.action_params.campaign_id as string);
    }

    // Atualizar status da recomendação
    await supabaseAdmin
      .from('ads_recommendations')
      .update({
        status: 'APPLIED',
        applied_at: new Date().toISOString(),
        action_result: actionResult,
      })
      .eq('id', recommendation_id);

    return NextResponse.json({
      success: true,
      message: 'Ação aplicada com sucesso',
      result: actionResult,
    });

  } catch (error) {
    console.error('❌ Erro ao aplicar ação:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erro' },
      { status: 500 }
    );
  }
}

// =====================================================
// HELPERS: Ações na Meta
// =====================================================

async function pauseCampaign(campaignId: string): Promise<Record<string, unknown>> {
  const accessToken = process.env.META_ACCESS_TOKEN || process.env.FACEBOOK_ACCESS_TOKEN;
  
  if (!accessToken) {
    throw new Error('Token Meta não configurado');
  }

  const url = `https://graph.facebook.com/v21.0/${campaignId}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      access_token: accessToken,
      status: 'PAUSED',
    }),
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message);
  }

  // Atualizar status local também
  await supabaseAdmin
    .from('ads_campaigns')
    .update({ status: 'PAUSED' })
    .eq('meta_campaign_id', campaignId);

  console.log(`⏸️ Campanha ${campaignId} pausada`);
  
  return { paused: true, campaign_id: campaignId };
}

async function unpauseCampaign(campaignId: string): Promise<Record<string, unknown>> {
  const accessToken = process.env.META_ACCESS_TOKEN || process.env.FACEBOOK_ACCESS_TOKEN;
  
  if (!accessToken) {
    throw new Error('Token Meta não configurado');
  }

  const url = `https://graph.facebook.com/v21.0/${campaignId}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      access_token: accessToken,
      status: 'ACTIVE',
    }),
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message);
  }

  await supabaseAdmin
    .from('ads_campaigns')
    .update({ status: 'ACTIVE' })
    .eq('meta_campaign_id', campaignId);

  console.log(`▶️ Campanha ${campaignId} reativada`);
  
  return { activated: true, campaign_id: campaignId };
}

async function scaleCampaignBudget(
  campaignId: string,
  newBudget: number
): Promise<Record<string, unknown>> {
  const accessToken = process.env.META_ACCESS_TOKEN || process.env.FACEBOOK_ACCESS_TOKEN;
  
  if (!accessToken) {
    throw new Error('Token Meta não configurado');
  }

  // Buscar AdSet da campanha para atualizar o budget
  const adsetsUrl = `https://graph.facebook.com/v21.0/${campaignId}/adsets?fields=id,daily_budget&access_token=${accessToken}`;
  const adsetsResponse = await fetch(adsetsUrl);
  const adsetsData = await adsetsResponse.json();

  if (adsetsData.error || !adsetsData.data?.[0]) {
    throw new Error('Não foi possível encontrar AdSet da campanha');
  }

  const adsetId = adsetsData.data[0].id;
  const newBudgetCents = Math.round(newBudget * 100);

  const url = `https://graph.facebook.com/v21.0/${adsetId}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      access_token: accessToken,
      daily_budget: newBudgetCents.toString(),
    }),
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message);
  }

  console.log(`📈 Orçamento de ${campaignId} atualizado para R$ ${newBudget.toFixed(2)}`);
  
  return { 
    scaled: true, 
    campaign_id: campaignId,
    adset_id: adsetId,
    new_budget: newBudget,
  };
}
