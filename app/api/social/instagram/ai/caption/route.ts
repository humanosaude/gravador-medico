/**
 * InstaFlow - AI Caption Generation API
 */

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateCaptionVariations, analyzeSentiment, improveCaption } from '@/lib/ai/caption-generator';

export async function POST(request: Request) {
  try {
    const supabase = supabaseAdmin;
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case 'generate': {
        const { prompt, tone, language, targetAudience, includeHashtags, maxLength, niche, callToAction } = params;
        
        if (!prompt) {
          return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        const captions = await generateCaptionVariations({
          topic: prompt,
          tone: tone || 'professional',
          language: language || 'pt-BR',
          targetAudience: targetAudience || 'público brasileiro',
          includeHashtags: includeHashtags ?? true,
          maxLength: maxLength || 2200,
          niche: niche,
          callToAction: callToAction,
        });

        return NextResponse.json({ captions });
      }

      case 'analyze': {
        const { text } = params;
        
        if (!text) {
          return NextResponse.json({ error: 'Text is required' }, { status: 400 });
        }

        const analysis = await analyzeSentiment(text);
        return NextResponse.json({ analysis });
      }

      case 'improve': {
        const { caption, instructions } = params;
        
        if (!caption) {
          return NextResponse.json({ error: 'Caption is required' }, { status: 400 });
        }

        const improved = await improveCaption(caption, instructions);
        return NextResponse.json({ improved });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('AI Caption API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
