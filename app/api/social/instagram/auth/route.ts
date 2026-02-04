/**
 * InstaFlow - Instagram OAuth Initiation
 * GET /api/social/instagram/auth
 * 
 * Gera a URL de login do Facebook OAuth
 */

import { NextResponse } from 'next/server';
import { getOAuthLoginUrl, generateState } from '@/lib/instagram/auth';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    // Verificar se as variáveis de ambiente estão configuradas
    if (!process.env.NEXT_PUBLIC_FACEBOOK_APP_ID) {
      return NextResponse.json(
        { error: 'NEXT_PUBLIC_FACEBOOK_APP_ID não configurado' },
        { status: 500 }
      );
    }

    // Gerar state para CSRF protection
    const state = generateState();

    // Salvar state em cookie para validação no callback
    const cookieStore = await cookies();
    cookieStore.set('instagram_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10, // 10 minutos
      path: '/',
    });

    // Determinar URL de callback baseado no ambiente
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
                    'http://localhost:3000';
    
    const redirectUri = `${baseUrl}/api/social/instagram/callback`;

    // Gerar URL de autenticação
    const authUrl = getOAuthLoginUrl(redirectUri, state);

    console.log('[InstaFlow] Auth URL generated:', {
      redirectUri,
      state: state.substring(0, 8) + '...',
    });

    return NextResponse.json({ 
      authUrl,
      state,
    });
  } catch (error) {
    console.error('[InstaFlow] Error generating auth URL:', error);
    return NextResponse.json(
      { error: 'Erro ao gerar URL de autenticação' },
      { status: 500 }
    );
  }
}
