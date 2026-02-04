/**
 * InstaFlow - List Instagram Accounts
 * GET /api/social/instagram/accounts
 * 
 * Lista todas as contas Instagram conectadas do usuário
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthTokenFromRequest } from '@/lib/auth-server';
import { getUserFromToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Autenticar usuário
    const token = getAuthTokenFromRequest(request);
    const user = token ? await getUserFromToken(token) : null;

    if (!user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    // Buscar contas do usuário
    const { data: accounts, error } = await supabaseAdmin
      .from('instagram_accounts')
      .select(`
        id,
        instagram_business_account_id,
        username,
        name,
        profile_picture_url,
        biography,
        followers_count,
        follows_count,
        media_count,
        facebook_page_id,
        facebook_page_name,
        is_active,
        connection_status,
        last_sync_at,
        token_expires_at,
        created_at
      `)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[InstaFlow] Error fetching accounts:', error);
      return NextResponse.json(
        { error: 'Erro ao buscar contas' },
        { status: 500 }
      );
    }

    return NextResponse.json({ accounts: accounts || [] });

  } catch (error) {
    console.error('[InstaFlow] Accounts API error:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/social/instagram/accounts
 * Desconecta uma conta Instagram
 */
export async function DELETE(request: NextRequest) {
  try {
    const token = getAuthTokenFromRequest(request);
    const user = token ? await getUserFromToken(token) : null;

    if (!user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const { accountId } = await request.json();

    if (!accountId) {
      return NextResponse.json(
        { error: 'ID da conta é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar se a conta pertence ao usuário
    const { data: account } = await supabaseAdmin
      .from('instagram_accounts')
      .select('id, username')
      .eq('id', accountId)
      .eq('user_id', user.id)
      .single();

    if (!account) {
      return NextResponse.json(
        { error: 'Conta não encontrada' },
        { status: 404 }
      );
    }

    // Desativar a conta (soft delete)
    const { error } = await supabaseAdmin
      .from('instagram_accounts')
      .update({
        is_active: false,
        connection_status: 'disconnected',
        access_token: null,
        facebook_page_access_token: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', accountId);

    if (error) {
      throw error;
    }

    // Log de atividade
    await supabaseAdmin.from('instaflow_activity_log').insert({
      account_id: accountId,
      user_id: user.id,
      action: 'account_disconnected',
      entity_type: 'account',
      details: { username: account.username },
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[InstaFlow] Delete account error:', error);
    return NextResponse.json(
      { error: 'Erro ao desconectar conta' },
      { status: 500 }
    );
  }
}
