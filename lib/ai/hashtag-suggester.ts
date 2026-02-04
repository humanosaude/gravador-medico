/**
 * InstaFlow - Sugestor de Hashtags com IA
 */

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface HashtagSuggestion {
  hashtag: string;
  category: 'high_volume' | 'medium_volume' | 'low_volume' | 'niche' | 'branded';
  estimatedPosts: string; // Ex: "1M+", "100K-500K"
  relevanceScore: number; // 0-100
  reasoning?: string;
}

export interface HashtagAnalysis {
  suggestions: HashtagSuggestion[];
  recommended: string[]; // Top 10 recomendadas
  strategy: string;
  distribution: {
    high_volume: number;
    medium_volume: number;
    low_volume: number;
    niche: number;
  };
}

/**
 * Sugere hashtags baseado no conteúdo/nicho
 */
export async function suggestHashtags(
  content: string,
  options: {
    niche?: string;
    targetAudience?: string;
    maxHashtags?: number;
    includePortuguese?: boolean;
    includeBranded?: string[];
  } = {}
): Promise<HashtagAnalysis> {
  const {
    niche = 'geral',
    targetAudience = 'público brasileiro',
    maxHashtags = 30,
    includePortuguese = true,
    includeBranded = [],
  } = options;

  const systemPrompt = `Você é um especialista em hashtags do Instagram com conhecimento profundo do algoritmo.

Sua tarefa é sugerir hashtags estratégicas que maximizam alcance e engajamento.

Regras:
1. Mix ideal: 20% alto volume (1M+), 40% médio volume (100K-1M), 30% baixo volume (10K-100K), 10% nicho (<10K)
2. ${includePortuguese ? 'Inclua hashtags em português E inglês' : 'Apenas hashtags em inglês'}
3. Evite hashtags banidas ou spam
4. Considere o nicho: ${niche}
5. Público-alvo: ${targetAudience}
${includeBranded.length > 0 ? `6. Inclua hashtags da marca: ${includeBranded.join(', ')}` : ''}

Formato de resposta (JSON):
{
  "suggestions": [
    {
      "hashtag": "#exemplo",
      "category": "medium_volume",
      "estimatedPosts": "100K-500K",
      "relevanceScore": 85,
      "reasoning": "Alta relevância para o nicho"
    }
  ],
  "recommended": ["#top1", "#top2", ...],
  "strategy": "Explicação da estratégia de hashtags"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Sugira ${maxHashtags} hashtags para este conteúdo:\n\n${content}` },
      ],
      temperature: 0.7,
    });

    const raw = response.choices[0].message.content || '{}';
    const parsed = JSON.parse(raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());

    // Calcular distribuição
    const distribution = {
      high_volume: 0,
      medium_volume: 0,
      low_volume: 0,
      niche: 0,
    };

    parsed.suggestions?.forEach((s: HashtagSuggestion) => {
      if (s.category === 'high_volume') distribution.high_volume++;
      else if (s.category === 'medium_volume') distribution.medium_volume++;
      else if (s.category === 'low_volume') distribution.low_volume++;
      else if (s.category === 'niche') distribution.niche++;
    });

    return {
      suggestions: parsed.suggestions || [],
      recommended: parsed.recommended || [],
      strategy: parsed.strategy || 'Use um mix de hashtags de diferentes volumes para maximizar alcance.',
      distribution,
    };
  } catch (error) {
    console.error('Error suggesting hashtags:', error);
    return {
      suggestions: [],
      recommended: [],
      strategy: 'Erro ao gerar sugestões. Tente novamente.',
      distribution: { high_volume: 0, medium_volume: 0, low_volume: 0, niche: 0 },
    };
  }
}

/**
 * Analisa performance histórica de hashtags
 */
export async function analyzeHashtagPerformance(
  hashtags: string[],
  metrics: { hashtag: string; avgReach: number; avgEngagement: number; timesUsed: number }[]
): Promise<{
  bestPerformers: string[];
  worstPerformers: string[];
  recommendations: string[];
}> {
  // Ordenar por performance
  const sorted = [...metrics].sort((a, b) => {
    const scoreA = (a.avgReach * 0.6 + a.avgEngagement * 0.4) / a.timesUsed;
    const scoreB = (b.avgReach * 0.6 + b.avgEngagement * 0.4) / b.timesUsed;
    return scoreB - scoreA;
  });

  const bestPerformers = sorted.slice(0, 5).map((h) => h.hashtag);
  const worstPerformers = sorted.slice(-5).map((h) => h.hashtag);

  // Gerar recomendações
  const recommendations: string[] = [];
  
  if (worstPerformers.length > 0) {
    recommendations.push(`Considere substituir: ${worstPerformers.slice(0, 3).join(', ')}`);
  }
  
  if (bestPerformers.length > 0) {
    recommendations.push(`Continue usando: ${bestPerformers.slice(0, 3).join(', ')}`);
  }

  return {
    bestPerformers,
    worstPerformers,
    recommendations,
  };
}

/**
 * Gera grupos de hashtags por categoria
 */
export function groupHashtags(hashtags: HashtagSuggestion[]): Record<string, string[]> {
  const groups: Record<string, string[]> = {
    high_volume: [],
    medium_volume: [],
    low_volume: [],
    niche: [],
    branded: [],
  };

  hashtags.forEach((h) => {
    if (groups[h.category]) {
      groups[h.category].push(h.hashtag);
    }
  });

  return groups;
}

/**
 * Formata hashtags para o Instagram (primeiro comentário)
 */
export function formatHashtagsForComment(hashtags: string[], maxPerLine: number = 5): string {
  const lines: string[] = [];
  
  for (let i = 0; i < hashtags.length; i += maxPerLine) {
    const chunk = hashtags.slice(i, i + maxPerLine);
    lines.push(chunk.join(' '));
  }

  return lines.join('\n');
}
