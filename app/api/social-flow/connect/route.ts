/**
 * Social Flow - Connect Network API
 * 
 * Inicia o fluxo OAuth para conectar uma rede social
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import * as jose from 'jose';
import { SocialNetwork } from '@/lib/social-flow/types';
import { getAuthForNetwork, isNetworkConfigured } from '@/lib/social-flow/networks';

async function getUserFromToken() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    
    if (!token) return null;
    
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret');
    const { payload } = await jose.jwtVerify(token, secret);
    
    return payload as { id: string; email: string };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const network = searchParams.get('network') as SocialNetwork;

    if (!network) {
      return NextResponse.json(
        { error: 'Network parameter required' },
        { status: 400 }
      );
    }

    // Verificar se a rede está configurada
    if (!isNetworkConfigured(network)) {
      return NextResponse.json(
        { 
          error: `${network} não está configurado`, 
          message: 'Adicione as chaves de API no painel de configurações' 
        },
        { status: 400 }
      );
    }

    // Gerar state para CSRF protection
    const state = Buffer.from(JSON.stringify({
      userId: user.id,
      network,
      timestamp: Date.now(),
    })).toString('base64url');

    // Obter URL de autorização
    const auth = getAuthForNetwork(network);
    const authUrl = auth.getAuthorizationUrl(state);

    return NextResponse.json({
      authUrl,
      state,
      network,
    });
  } catch (error: any) {
    console.error('Connect network error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
