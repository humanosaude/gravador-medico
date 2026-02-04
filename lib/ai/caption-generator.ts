/**
 * InstaFlow - Gerador de Legendas com IA (OpenAI)
 */

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface CaptionGeneratorOptions {
  topic: string;
  tone?: 'professional' | 'casual' | 'humorous' | 'inspirational' | 'educational';
  targetAudience?: string;
  includeEmojis?: boolean;
  includeHashtags?: boolean;
  maxLength?: number;
  language?: 'pt-BR' | 'en-US' | 'es';
  niche?: string;
  callToAction?: string;
}

export interface GeneratedCaption {
  caption: string;
  hashtags: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  readingTime: number;
  characterCount: number;
}

export interface CaptionVariations {
  variations: GeneratedCaption[];
  bestOption: number;
  reasoning: string;
}

/**
 * Gera 3 variações de legenda usando GPT-4
 */
export async function generateCaptionVariations(
  options: CaptionGeneratorOptions
): Promise<CaptionVariations> {
  const {
    topic,
    tone = 'professional',
    targetAudience = 'público geral',
    includeEmojis = true,
    includeHashtags = true,
    maxLength = 2200,
    language = 'pt-BR',
    niche = 'geral',
    callToAction,
  } = options;

  const toneDescriptions: Record<string, string> = {
    professional: 'tom profissional, autoritário e confiável',
    casual: 'tom casual, amigável e descontraído',
    humorous: 'tom bem-humorado, divertido e leve',
    inspirational: 'tom inspirador, motivacional e positivo',
    educational: 'tom educacional, informativo e didático',
  };

  const systemPrompt = `Você é um especialista em marketing digital e criação de conteúdo para Instagram.
Seu trabalho é criar legendas envolventes que geram engajamento.

Regras:
- Idioma: ${language === 'pt-BR' ? 'Português do Brasil' : language === 'es' ? 'Espanhol' : 'Inglês'}
- Tom: ${toneDescriptions[tone]}
- Público-alvo: ${targetAudience}
- Nicho: ${niche}
- Máximo de caracteres: ${maxLength}
${includeEmojis ? '- Use emojis de forma estratégica para chamar atenção' : '- NÃO use emojis'}
${callToAction ? `- Inclua um call-to-action: ${callToAction}` : ''}

Formato de resposta OBRIGATÓRIO (JSON):
{
  "variations": [
    {
      "caption": "texto da legenda aqui",
      "hashtags": ["hashtag1", "hashtag2", ...],
      "sentiment": "positive|neutral|negative"
    }
  ],
  "bestOption": 0,
  "reasoning": "explicação de porque a opção X é a melhor"
}`;

  const userPrompt = `Crie 3 variações de legenda para Instagram sobre o tema: "${topic}"

Cada variação deve ter:
1. Uma abordagem diferente (pergunta, afirmação, história)
2. ${includeHashtags ? '5-10 hashtags relevantes (mix de alto e médio volume)' : 'Sem hashtags'}
3. Máximo ${maxLength} caracteres

Retorne APENAS o JSON, sem markdown.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.8,
      max_tokens: 2000,
    });

    const content = response.choices[0].message.content || '{}';
    
    // Tentar parsear o JSON
    let parsed;
    try {
      // Remove possíveis marcadores de código
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleanContent);
    } catch {
      console.error('Failed to parse OpenAI response:', content);
      throw new Error('Falha ao processar resposta da IA');
    }

    // Adicionar métricas calculadas
    const variations: GeneratedCaption[] = parsed.variations.map((v: any) => ({
      caption: v.caption,
      hashtags: v.hashtags || [],
      sentiment: v.sentiment || 'neutral',
      readingTime: Math.ceil(v.caption.split(' ').length / 200), // minutos
      characterCount: v.caption.length,
    }));

    return {
      variations,
      bestOption: parsed.bestOption || 0,
      reasoning: parsed.reasoning || 'Variação recomendada com base no engajamento esperado.',
    };
  } catch (error) {
    console.error('Error generating captions:', error);
    throw error;
  }
}

/**
 * Analisa o sentimento de uma legenda
 */
export async function analyzeSentiment(caption: string): Promise<{
  sentiment: 'positive' | 'neutral' | 'negative';
  score: number;
  emotions: string[];
}> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Analise o sentimento do texto e retorne JSON: {"sentiment": "positive|neutral|negative", "score": 0-100, "emotions": ["emoção1", "emoção2"]}',
        },
        { role: 'user', content: caption },
      ],
      temperature: 0.3,
    });

    const content = response.choices[0].message.content || '{}';
    return JSON.parse(content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
  } catch {
    return { sentiment: 'neutral', score: 50, emotions: [] };
  }
}

/**
 * Melhora uma legenda existente
 */
export async function improveCaption(
  caption: string,
  instructions: string
): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'Você é um editor de copy para Instagram. Melhore a legenda seguindo as instruções. Retorne APENAS a legenda melhorada, sem explicações.',
        },
        {
          role: 'user',
          content: `Legenda original:\n${caption}\n\nInstruções de melhoria:\n${instructions}`,
        },
      ],
      temperature: 0.7,
    });

    return response.choices[0].message.content || caption;
  } catch {
    return caption;
  }
}
