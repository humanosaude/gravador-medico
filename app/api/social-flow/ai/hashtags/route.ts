/**
 * Social Flow - AI Hashtag Suggestion API
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import * as jose from 'jose';
import { aiHashtagSuggester } from '@/lib/social-flow/ai/hashtag-suggester';
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
      content,
      existingHashtags,
      niche,
      location,
      language,
      count,
    } = body;

    if (!network || !content) {
      return NextResponse.json(
        { error: 'Network and content are required' },
        { status: 400 }
      );
    }

    const result = await aiHashtagSuggester.suggest({
      network: network as SocialNetwork,
      content,
      existingHashtags,
      niche,
      location,
      language,
      count,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Hashtag suggestion error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate hashtags' },
      { status: 500 }
    );
  }
}
