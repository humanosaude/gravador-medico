/**
 * InstaFlow - Instagram OAuth Callback
 * GET /api/social/instagram/callback
 * 
 * Processa o retorno do Facebook OAuth e salva a conta conectada
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { processOAuthCallback } from '@/lib/instagram/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthTokenFromRequest } from '@/lib/auth-server';
import { getUserFromToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // URL base para redirecionamento
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
                  'http://localhost:3000');

  // ============================================
  // VERIFICAÇÃO DO FACEBOOK (quando clica em "Verificar" no console)
  // O Facebook faz GET sem parâmetros para verificar se a URL existe
  // ============================================
  if (!code && !error && !state) {
    // Retornar 200 OK para o Facebook validar a URL
    return new NextResponse('OK', { 
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
      }
    });
  }

  // Verificar erro do Facebook
  if (error) {
    console.error('[InstaFlow] OAuth error:', error, errorDescription);
    return NextResponse.redirect(
      `${baseUrl}/admin/social/connect?error=${encodeURIComponent(errorDescription || error)}`
    );
  }

  // Verificar código
  if (!code) {
    return NextResponse.redirect(
      `${baseUrl}/admin/social/connect?error=${encodeURIComponent('Código de autorização não recebido')}`
    );
  }

  // Validar state (CSRF protection)
  const cookieStore = await cookies();
  const savedState = cookieStore.get('instagram_oauth_state')?.value;

  if (!savedState || savedState !== state) {
    console.error('[InstaFlow] State mismatch:', { saved: savedState, received: state });
    return NextResponse.redirect(
      `${baseUrl}/admin/social/connect?error=${encodeURIComponent('Sessão expirada. Tente novamente.')}`
    );
  }

  // Limpar cookie de state
  cookieStore.delete('instagram_oauth_state');

  try {
    // Obter usuário autenticado via token
    const token = getAuthTokenFromRequest(request);
    const user = token ? await getUserFromToken(token) : null;

    if (!user) {
      return NextResponse.redirect(
        `${baseUrl}/admin/social/connect?error=${encodeURIComponent('Usuário não autenticado')}`
      );
    }

    // URL de callback
    const redirectUri = `${baseUrl}/api/social/instagram/callback`;

    // Processar OAuth
    console.log('[InstaFlow] Processing OAuth callback...');
    const result = await processOAuthCallback(code, redirectUri);

    if (!result.success || !result.account) {
      return NextResponse.redirect(
        `${baseUrl}/admin/social/connect?error=${encodeURIComponent(result.error || 'Erro desconhecido')}`
      );
    }

    const { account, pageAccessToken, tokenExpiresAt } = result;

    // Verificar se a conta já existe
    const { data: existingAccount } = await supabaseAdmin
      .from('instagram_accounts')
      .select('id')
      .eq('instagram_business_account_id', account.instagram_business_account_id)
      .single();

    if (existingAccount) {
      // Atualizar conta existente
      const { error: updateError } = await supabaseAdmin
        .from('instagram_accounts')
        .update({
          username: account.username,
          name: account.name,
          profile_picture_url: account.profile_picture_url,
          biography: account.biography,
          followers_count: account.followers_count,
          follows_count: account.follows_count,
          media_count: account.media_count,
          facebook_page_name: account.facebook_page_name,
          facebook_page_access_token: pageAccessToken,
          access_token: pageAccessToken,
          token_expires_at: tokenExpiresAt?.toISOString(),
          connection_status: 'connected',
          error_message: null,
          last_sync_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingAccount.id);

      if (updateError) {
        console.error('[InstaFlow] Error updating account:', updateError);
        throw updateError;
      }

      console.log('[InstaFlow] Account updated:', account.username);
    } else {
      // Criar nova conta
      const { error: insertError } = await supabaseAdmin
        .from('instagram_accounts')
        .insert({
          user_id: user.id,
          instagram_business_account_id: account.instagram_business_account_id,
          instagram_user_id: account.instagram_business_account_id,
          username: account.username,
          name: account.name,
          profile_picture_url: account.profile_picture_url,
          biography: account.biography,
          followers_count: account.followers_count,
          follows_count: account.follows_count,
          media_count: account.media_count,
          facebook_page_id: account.facebook_page_id,
          facebook_page_name: account.facebook_page_name,
          facebook_page_access_token: pageAccessToken,
          access_token: pageAccessToken!,
          token_type: 'page',
          token_expires_at: tokenExpiresAt?.toISOString(),
          token_scopes: [
            'instagram_basic',
            'instagram_content_publish',
            'instagram_manage_insights',
            'pages_read_engagement',
          ],
          is_active: true,
          connection_status: 'connected',
          last_sync_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error('[InstaFlow] Error inserting account:', insertError);
        throw insertError;
      }

      console.log('[InstaFlow] Account created:', account.username);
    }

    // Log de atividade
    await supabaseAdmin.from('instaflow_activity_log').insert({
      account_id: existingAccount?.id,
      user_id: user.id,
      action: 'account_connected',
      entity_type: 'account',
      details: {
        username: account.username,
        followers: account.followers_count,
      },
    });

    // Redirecionar para página de sucesso
    return NextResponse.redirect(`${baseUrl}/admin/social/connect?status=success`);

  } catch (error) {
    console.error('[InstaFlow] Callback error:', error);
    return NextResponse.redirect(
      `${baseUrl}/admin/social/connect?error=${encodeURIComponent(
        error instanceof Error ? error.message : 'Erro ao processar conexão'
      )}`
    );
  }
}
