/**
 * InstaFlow - Sync Account
 * POST /api/social/instagram/sync
 * 
 * Sincroniza dados da conta com o Instagram
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthTokenFromRequest } from '@/lib/auth-server';
import { getUserFromToken } from '@/lib/auth';
import { createInstagramAPI } from '@/lib/instagram/api';

export async function POST(request: NextRequest) {
  try {
    const token = getAuthTokenFromRequest(request);
    const user = token ? await getUserFromToken(token) : null;

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const accountId = request.nextUrl.searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json({ error: 'accountId é obrigatório' }, { status: 400 });
    }

    // Buscar conta com token
    const { data: account, error: accountError } = await supabaseAdmin
      .from('instagram_accounts')
      .select('*')
      .eq('id', accountId)
      .eq('user_id', user.id)
      .single();

    if (accountError || !account) {
      return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 });
    }

    if (!account.access_token) {
      return NextResponse.json({ error: 'Token de acesso não encontrado' }, { status: 400 });
    }

    // Criar cliente da API
    const api = createInstagramAPI(
      account.access_token,
      account.instagram_business_account_id
    );

    // Buscar dados atualizados do perfil
    const profile = await api.getProfile();

    // Atualizar conta no banco
    const { error: updateError } = await supabaseAdmin
      .from('instagram_accounts')
      .update({
        username: profile.username,
        name: profile.name,
        biography: profile.biography,
        profile_picture_url: profile.profile_picture_url,
        followers_count: profile.followers_count,
        follows_count: profile.follows_count,
        media_count: profile.media_count,
        website: profile.website,
        last_sync_at: new Date().toISOString(),
        connection_status: 'connected',
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', accountId);

    if (updateError) {
      console.error('[InstaFlow] Error updating account:', updateError);
      throw updateError;
    }

    // Buscar e salvar analytics do dia
    try {
      const insights = await api.getAccountInsights('day');
      
      const today = new Date().toISOString().split('T')[0];
      
      await supabaseAdmin
        .from('instaflow_account_analytics')
        .upsert({
          account_id: accountId,
          date: today,
          followers_count: profile.followers_count,
          follows_count: profile.follows_count,
          impressions: insights.impressions,
          reach: insights.reach,
          profile_views: insights.profile_views,
          website_clicks: insights.website_clicks,
        }, {
          onConflict: 'account_id,date',
        });
    } catch (insightsError) {
      console.warn('[InstaFlow] Could not fetch insights:', insightsError);
      // Não falha se não conseguir buscar insights
    }

    // Log de atividade
    await supabaseAdmin.from('instaflow_activity_log').insert({
      account_id: accountId,
      user_id: user.id,
      action: 'analytics_synced',
      entity_type: 'account',
      details: {
        followers: profile.followers_count,
        media: profile.media_count,
      },
    });

    return NextResponse.json({
      success: true,
      profile: {
        username: profile.username,
        followers_count: profile.followers_count,
        follows_count: profile.follows_count,
        media_count: profile.media_count,
      }
    });

  } catch (error) {
    console.error('[InstaFlow] Sync error:', error);

    // Se o erro for de token inválido, atualizar status
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    
    if (errorMessage.includes('OAuthException') || errorMessage.includes('Invalid')) {
      const accountId = request.nextUrl.searchParams.get('accountId');
      if (accountId) {
        await supabaseAdmin
          .from('instagram_accounts')
          .update({
            connection_status: 'expired',
            error_message: errorMessage,
            updated_at: new Date().toISOString(),
          })
          .eq('id', accountId);
      }
    }

    return NextResponse.json(
      { error: 'Erro ao sincronizar conta', details: errorMessage },
      { status: 500 }
    );
  }
}
