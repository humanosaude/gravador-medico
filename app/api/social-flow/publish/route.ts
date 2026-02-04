/**
 * Social Flow - Publish API
 * 
 * Publica ou agenda posts em redes sociais
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import * as jose from 'jose';
import { universalPublisher } from '@/lib/social-flow/core/publisher';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      accountId,
      accountIds, // Para cross-post
      caption,
      hashtags,
      mentions,
      mediaUrls,
      mediaIds,
      scheduledFor,
      location,
      options,
    } = body;

    // Validar requisição
    if (!accountId && (!accountIds || accountIds.length === 0)) {
      return NextResponse.json(
        { error: 'accountId or accountIds required' },
        { status: 400 }
      );
    }

    // Buscar contas
    const targetAccountIds = accountIds || [accountId];
    const { data: accounts, error: accountsError } = await supabase
      .from('social_accounts')
      .select('*')
      .in('id', targetAccountIds)
      .eq('user_id', user.id);

    if (accountsError || !accounts || accounts.length === 0) {
      return NextResponse.json(
        { error: 'Accounts not found' },
        { status: 404 }
      );
    }

    // Buscar mídias se fornecidos IDs
    let mediaItems = [];
    if (mediaIds && mediaIds.length > 0) {
      const { data: media } = await supabase
        .from('media_library')
        .select('*')
        .in('id', mediaIds)
        .eq('user_id', user.id);
      
      if (media) {
        mediaItems = media;
      }
    }

    // Preparar opções de publicação
    const publishOptions = {
      caption,
      hashtags,
      mentions,
      mediaUrls,
      mediaItems: mediaItems.length > 0 ? mediaItems : undefined,
      location,
      ...options,
    };

    // Se agendado, criar posts no banco
    if (scheduledFor) {
      const scheduledDate = new Date(scheduledFor);
      
      if (scheduledDate <= new Date()) {
        return NextResponse.json(
          { error: 'Scheduled time must be in the future' },
          { status: 400 }
        );
      }

      const result = await universalPublisher.scheduleCrossPost(
        accounts,
        publishOptions,
        scheduledDate,
        user.id
      );

      return NextResponse.json({
        success: true,
        scheduled: true,
        scheduledFor,
        postIds: result.postIds,
      });
    }

    // Publicar imediatamente
    if (accounts.length === 1) {
      // Publicação única
      const result = await universalPublisher.publishToNetwork(
        accounts[0],
        publishOptions
      );

      return NextResponse.json({
        success: result.success,
        result,
      });
    } else {
      // Cross-post
      const result = await universalPublisher.crossPost(
        accounts,
        publishOptions
      );

      return NextResponse.json({
        success: result.overall.success,
        overall: result.overall,
        results: result.results,
      });
    }
  } catch (error: any) {
    console.error('Publish error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
