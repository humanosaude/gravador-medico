/**
 * Social Flow - AI Caption Generator API
 * 
 * Gera legendas usando IA para diferentes redes sociais
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import * as jose from 'jose';
import { aiCaptionGenerator } from '@/lib/social-flow/ai/caption-generator';
import { SocialNetwork } from '@/lib/social-flow/types';

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
      network,
      topic,
      tone,
      includeEmojis,
      includeHashtags,
      hashtagCount,
      includeCTA,
      targetAudience,
      language,
      customInstructions,
      variations,
    } = body;

    if (!network || !topic) {
      return NextResponse.json(
        { error: 'Network and topic are required' },
        { status: 400 }
      );
    }

    const options = {
      network: network as SocialNetwork,
      topic,
      tone,
      includeEmojis,
      includeHashtags,
      hashtagCount,
      includeCTA,
      targetAudience,
      language: language || 'português brasileiro',
      customInstructions,
    };

    if (variations && variations > 1) {
      // Gerar múltiplas variações
      const results = await aiCaptionGenerator.generateVariations(options, variations);
      return NextResponse.json({
        success: true,
        variations: results,
      });
    }

    // Gerar única
    const result = await aiCaptionGenerator.generate(options);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Caption generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate caption' },
      { status: 500 }
    );
  }
}
