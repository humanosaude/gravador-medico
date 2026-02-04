/**
 * Social Flow - AI Hashtag Suggester
 * 
 * Sugere hashtags otimizadas baseadas em conteúdo, performance e tendências
 */

import { SocialNetwork } from '../types';
import { NETWORK_CONFIGS } from '../config';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

interface HashtagSuggestion {
  hashtag: string;
  category: 'trending' | 'niche' | 'branded' | 'general';
  popularity: 'high' | 'medium' | 'low';
  relevance: number; // 0-100
  estimatedReach?: number;
}

interface HashtagSuggestionOptions {
  network: SocialNetwork;
  content: string;
  existingHashtags?: string[];
  niche?: string;
  location?: string;
  language?: string;
  count?: number;
}

interface HashtagAnalysis {
  suggestions: HashtagSuggestion[];
  categories: {
    trending: string[];
    niche: string[];
    branded: string[];
    general: string[];
  };
  strategy: string;
  totalRecommended: number;
}

export class AIHashtagSuggester {
  
  /**
   * Sugere hashtags baseadas no conteúdo
   */
  async suggest(options: HashtagSuggestionOptions): Promise<HashtagAnalysis> {
    const networkConfig = NETWORK_CONFIGS[options.network];
    const maxHashtags = networkConfig?.maxHashtags || 30;
    const count = Math.min(options.count || 20, maxHashtags);

    const prompt = this.buildPrompt(options, count);

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: this.getSystemPrompt(options.network),
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.6,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate hashtags');
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content || '';

      return this.parseResponse(content, options.network);
    } catch (error: any) {
      console.error('Hashtag suggestion error:', error);
      return this.getFallbackSuggestions(options);
    }
  }

  /**
   * Analisa performance de hashtags existentes
   */
  async analyzeHashtags(
    hashtags: string[],
    network: SocialNetwork
  ): Promise<{
    analysis: Array<{ hashtag: string; score: number; recommendation: string }>;
    overallScore: number;
    suggestions: string[];
  }> {
    const prompt = `Analise estas hashtags para ${network}:
${hashtags.map(h => h.startsWith('#') ? h : `#${h}`).join(', ')}

Para cada hashtag, avalie de 1-10:
- Relevância atual
- Nível de competição
- Potencial de alcance

Responda no formato JSON:
{
  "analysis": [
    {"hashtag": "#exemplo", "score": 8, "recommendation": "Manter - bom equilíbrio"}
  ],
  "overallScore": 7,
  "suggestions": ["#novaHashtag1", "#novaHashtag2"]
}`;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.4,
          max_tokens: 800,
        }),
      });

      const data = await response.json();
      const content = data.choices[0]?.message?.content || '';

      // Tentar parsear JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      throw new Error('Invalid response format');
    } catch (error) {
      return {
        analysis: hashtags.map(h => ({
          hashtag: h.startsWith('#') ? h : `#${h}`,
          score: 5,
          recommendation: 'Sem dados suficientes para análise',
        })),
        overallScore: 5,
        suggestions: [],
      };
    }
  }

  /**
   * Sugere hashtags de nicho específico
   */
  async suggestForNiche(
    niche: string,
    network: SocialNetwork,
    count: number = 15
  ): Promise<string[]> {
    const prompt = `Sugira ${count} hashtags efetivas para o nicho "${niche}" no ${network}.

Inclua uma mistura de:
- Hashtags populares (alto volume)
- Hashtags de médio alcance
- Hashtags nichadas (baixa competição, alta conversão)

Liste apenas as hashtags, uma por linha, começando com #.`;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.6,
          max_tokens: 500,
        }),
      });

      const data = await response.json();
      const content = data.choices[0]?.message?.content || '';

      return content
        .split('\n')
        .map((line: string) => line.trim())
        .filter((line: string) => line.startsWith('#'))
        .slice(0, count);
    } catch (error) {
      return [];
    }
  }

  /**
   * Obtém hashtags em tendência (simulado - ideal seria integrar com API real)
   */
  async getTrending(
    network: SocialNetwork,
    category?: string,
    location?: string
  ): Promise<string[]> {
    const prompt = `Liste 10 hashtags que estão em tendência no ${network}${category ? ` na categoria ${category}` : ''}${location ? ` no ${location}` : ''}.

Considere tendências recentes e relevantes. Liste apenas hashtags, uma por linha.`;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 300,
        }),
      });

      const data = await response.json();
      const content = data.choices[0]?.message?.content || '';

      return content
        .split('\n')
        .map((line: string) => line.trim())
        .filter((line: string) => line.startsWith('#'))
        .slice(0, 10);
    } catch (error) {
      return [];
    }
  }

  // =======================
  // PRIVATE METHODS
  // =======================

  private getSystemPrompt(network: SocialNetwork): string {
    return `Você é um especialista em estratégia de hashtags para ${network}. Conhece:
- Hashtags em tendência
- Equilíbrio entre popularidade e relevância
- Estratégias de nicho vs. massa
- Melhores práticas da plataforma
Sempre sugira hashtags em português brasileiro, a menos que especificado.`;
  }

  private buildPrompt(options: HashtagSuggestionOptions, count: number): string {
    const parts = [
      `Sugira ${count} hashtags para este conteúdo no ${options.network}:`,
      ``,
      `Conteúdo: ${options.content}`,
    ];

    if (options.niche) {
      parts.push(`Nicho: ${options.niche}`);
    }

    if (options.location) {
      parts.push(`Localização: ${options.location}`);
    }

    if (options.existingHashtags && options.existingHashtags.length > 0) {
      parts.push(`Hashtags já incluídas (evite repetir): ${options.existingHashtags.join(', ')}`);
    }

    parts.push(``);
    parts.push(`Organize as hashtags por categoria:`);
    parts.push(`TRENDING: [hashtags em alta]`);
    parts.push(`NICHO: [hashtags específicas do segmento]`);
    parts.push(`GERAL: [hashtags amplas relacionadas]`);
    parts.push(``);
    parts.push(`ESTRATEGIA: [breve explicação da estratégia recomendada]`);

    return parts.join('\n');
  }

  private parseResponse(content: string, network: SocialNetwork): HashtagAnalysis {
    const categories = {
      trending: [] as string[],
      niche: [] as string[],
      branded: [] as string[],
      general: [] as string[],
    };

    // Extrair seções
    const trendingMatch = content.match(/TRENDING:\s*([\s\S]*?)(?=NICHO:|GERAL:|ESTRATEGIA:|$)/i);
    const nicheMatch = content.match(/NICHO:\s*([\s\S]*?)(?=TRENDING:|GERAL:|ESTRATEGIA:|$)/i);
    const generalMatch = content.match(/GERAL:\s*([\s\S]*?)(?=TRENDING:|NICHO:|ESTRATEGIA:|$)/i);
    const strategyMatch = content.match(/ESTRATEGIA:\s*([\s\S]*?)$/i);

    const extractHashtags = (text: string): string[] => {
      return (text.match(/#[\w\u00C0-\u00FF]+/g) || [])
        .map(h => h.toLowerCase())
        .filter((h, i, arr) => arr.indexOf(h) === i);
    };

    if (trendingMatch) categories.trending = extractHashtags(trendingMatch[1]);
    if (nicheMatch) categories.niche = extractHashtags(nicheMatch[1]);
    if (generalMatch) categories.general = extractHashtags(generalMatch[1]);

    // Construir sugestões
    const suggestions: HashtagSuggestion[] = [
      ...categories.trending.map(h => ({
        hashtag: h,
        category: 'trending' as const,
        popularity: 'high' as const,
        relevance: 85,
      })),
      ...categories.niche.map(h => ({
        hashtag: h,
        category: 'niche' as const,
        popularity: 'low' as const,
        relevance: 95,
      })),
      ...categories.general.map(h => ({
        hashtag: h,
        category: 'general' as const,
        popularity: 'medium' as const,
        relevance: 70,
      })),
    ];

    return {
      suggestions,
      categories,
      strategy: strategyMatch ? strategyMatch[1].trim() : 'Use uma mistura de hashtags populares e nichadas para maximizar alcance e relevância.',
      totalRecommended: suggestions.length,
    };
  }

  private getFallbackSuggestions(options: HashtagSuggestionOptions): HashtagAnalysis {
    // Hashtags genéricas de fallback
    const fallbackByNetwork: Record<SocialNetwork, string[]> = {
      instagram: ['#instagram', '#instagood', '#photooftheday', '#picoftheday', '#love', '#beautiful', '#happy', '#follow', '#like4like', '#instadaily'],
      facebook: ['#facebook', '#viral', '#trending', '#share', '#follow', '#like', '#comment', '#community', '#social', '#post'],
      twitter: ['#twitter', '#trending', '#viral', '#news', '#thread', '#follow', '#rt', '#quote', '#hot', '#breaking'],
      linkedin: ['#linkedin', '#networking', '#business', '#career', '#professional', '#jobs', '#work', '#leadership', '#success', '#motivation'],
      youtube: ['#youtube', '#video', '#subscribe', '#vlog', '#viral', '#trending', '#tutorial', '#howto', '#entertainment', '#content'],
      tiktok: ['#tiktok', '#fyp', '#foryou', '#viral', '#trending', '#foryoupage', '#trend', '#tiktokviral', '#duet', '#challenge'],
      pinterest: ['#pinterest', '#pin', '#ideas', '#inspiration', '#diy', '#howto', '#aesthetic', '#design', '#creative', '#style'],
    };

    const hashtags = fallbackByNetwork[options.network] || fallbackByNetwork.instagram;

    return {
      suggestions: hashtags.map(h => ({
        hashtag: h,
        category: 'general' as const,
        popularity: 'medium' as const,
        relevance: 50,
      })),
      categories: {
        trending: [],
        niche: [],
        branded: [],
        general: hashtags,
      },
      strategy: 'Hashtags genéricas - personalize baseado no seu conteúdo específico.',
      totalRecommended: hashtags.length,
    };
  }
}

// Singleton
export const aiHashtagSuggester = new AIHashtagSuggester();
