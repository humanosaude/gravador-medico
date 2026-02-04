/**
 * Social Flow - Image Analysis API
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import * as jose from 'jose';
import { aiContentAnalyzer } from '@/lib/social-flow/ai/content-analyzer';
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
      imageUrl,
      imageBase64,
      mimeType,
      network,
      tone,
      language,
      action, // 'analyze' | 'altText' | 'safety' | 'crop'
    } = body;

    if (!imageUrl && !imageBase64) {
      return NextResponse.json(
        { error: 'imageUrl or imageBase64 required' },
        { status: 400 }
      );
    }

    const url = imageUrl || `data:${mimeType || 'image/jpeg'};base64,${imageBase64}`;

    switch (action) {
      case 'altText':
        const altText = await aiContentAnalyzer.generateAltText(url);
        return NextResponse.json({ success: true, altText });

      case 'safety':
        const safety = await aiContentAnalyzer.checkContentSafety(url);
        return NextResponse.json({ success: true, ...safety });

      case 'crop':
        if (!network) {
          return NextResponse.json(
            { error: 'Network required for crop suggestions' },
            { status: 400 }
          );
        }
        const crop = await aiContentAnalyzer.suggestCrop(url, network as SocialNetwork);
        return NextResponse.json({ success: true, ...crop });

      case 'detect':
        const detection = await aiContentAnalyzer.detectContent(url);
        return NextResponse.json({ success: true, ...detection });

      case 'analyze':
      default:
        const analysis = await aiContentAnalyzer.analyzeImage(url, {
          network: network as SocialNetwork,
          tone,
          language,
        });
        return NextResponse.json({ success: true, ...analysis });
    }
  } catch (error: any) {
    console.error('Image analysis error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to analyze image' },
      { status: 500 }
    );
  }
}
