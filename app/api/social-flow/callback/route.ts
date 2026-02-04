/**
 * Social Flow - OAuth Callback API
 * 
 * Processa o callback do OAuth e salva a conta conectada
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SocialNetwork } from '@/lib/social-flow/types';
import { InstagramAuth } from '@/lib/social-flow/networks/instagram';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Verificar erros do OAuth
    if (error) {
      console.error('OAuth error:', error, errorDescription);
      return NextResponse.redirect(
        new URL(`/admin/social/connect?error=${encodeURIComponent(errorDescription || error)}`, request.url)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/admin/social/connect?error=missing_params', request.url)
      );
    }

    // Decodificar state
    let stateData: { userId: string; network: SocialNetwork; timestamp: number };
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64url').toString());
    } catch {
      return NextResponse.redirect(
        new URL('/admin/social/connect?error=invalid_state', request.url)
      );
    }

    // Verificar timestamp (máx 10 minutos)
    if (Date.now() - stateData.timestamp > 10 * 60 * 1000) {
      return NextResponse.redirect(
        new URL('/admin/social/connect?error=expired_state', request.url)
      );
    }

    const { userId, network } = stateData;

    // Processar baseado na rede
    let accountData;
    
    switch (network) {
      case 'instagram':
        accountData = await handleInstagramCallback(code, userId);
        break;
      // Adicionar outras redes conforme implementação
      default:
        return NextResponse.redirect(
          new URL(`/admin/social/connect?error=network_not_supported&network=${network}`, request.url)
        );
    }

    if (!accountData.success) {
      return NextResponse.redirect(
        new URL(`/admin/social/connect?error=${encodeURIComponent(accountData.error || 'unknown')}`, request.url)
      );
    }

    // Salvar conta no banco
    const { error: dbError } = await supabase
      .from('social_accounts')
      .upsert({
        ...accountData.account,
        user_id: userId,
      }, {
        onConflict: 'user_id,network,platform_account_id',
      });

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.redirect(
        new URL('/admin/social/connect?error=database_error', request.url)
      );
    }

    // Redirecionar para sucesso
    return NextResponse.redirect(
      new URL(`/admin/social/connect?success=true&network=${network}&username=${accountData.account.username}`, request.url)
    );
  } catch (error: any) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(
      new URL(`/admin/social/connect?error=${encodeURIComponent(error.message || 'internal_error')}`, request.url)
    );
  }
}

async function handleInstagramCallback(code: string, userId: string) {
  try {
    const auth = new InstagramAuth();
    const result = await auth.completeAuthFlow(code);

    const accountData = auth.toSocialAccount(
      userId,
      result.account,
      result.accessToken,
      result.tokenExpiresAt,
      result.facebookPageId
    );

    return {
      success: true,
      account: accountData,
    };
  } catch (error: any) {
    console.error('Instagram auth error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}
