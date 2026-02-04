/**
 * InstaFlow - AI Hashtag Suggestion API
 */

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { suggestHashtags, analyzeHashtagPerformance, formatHashtagsForComment } from '@/lib/ai/hashtag-suggester';

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
      case 'suggest': {
        const { content, niche, targetAudience, maxHashtags, includePortuguese, includeBranded } = params;
        
        if (!content) {
          return NextResponse.json({ error: 'Content is required' }, { status: 400 });
        }

        const suggestions = await suggestHashtags(content, {
          niche: niche || 'geral',
          targetAudience: targetAudience || 'público brasileiro',
          maxHashtags: maxHashtags || 30,
          includePortuguese: includePortuguese ?? true,
          includeBranded: includeBranded || [],
        });

        return NextResponse.json({ suggestions });
      }

      case 'analyze': {
        const { hashtags, metrics } = params;
        
        if (!hashtags || !metrics) {
          return NextResponse.json({ error: 'Hashtags and metrics are required' }, { status: 400 });
        }

        const analysis = await analyzeHashtagPerformance(hashtags, metrics);
        return NextResponse.json({ analysis });
      }

      case 'format': {
        const { hashtags, maxPerLine } = params;
        
        if (!hashtags || !Array.isArray(hashtags)) {
          return NextResponse.json({ error: 'Hashtags array is required' }, { status: 400 });
        }

        const formatted = formatHashtagsForComment(hashtags, maxPerLine || 5);
        return NextResponse.json({ formatted });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('AI Hashtag API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
