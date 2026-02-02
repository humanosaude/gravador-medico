// =====================================================
// GERADOR DE COPY COM OPENAI
// =====================================================
// Gera textos de anúncio otimizados para conversão
// =====================================================

import { GeneratedCopy } from './types';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

interface CopyGenerationParams {
  objective: string;
  targetAudience: string;
  imageDescription?: string;
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

/**
 * Gera copy de anúncio usando GPT-5.2
 */
export async function generateAdCopy(params: CopyGenerationParams): Promise<{
  primaryTexts: string[];
  headlines: string[];
}> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY não configurada');
  }

  const prompt = `Você é um copywriter especialista em anúncios de alta conversão para Facebook/Instagram Ads.

CONTEXTO:
- Objetivo da campanha: ${params.objective}
- Público-alvo: ${params.targetAudience}
${params.imageDescription ? `- Descrição da imagem: ${params.imageDescription}` : ''}

TAREFA:
Gere exatamente 2 opções de "Primary Text" (texto principal do anúncio) e 2 opções de "Headline" (título curto).

REGRAS PARA PRIMARY TEXT:
1. Entre 80-150 caracteres
2. Comece com um gancho emocional ou problema
3. Inclua benefício claro
4. Termine com urgência ou curiosidade
5. Use emojis estrategicamente (máximo 2)
6. Tom profissional mas acessível

REGRAS PARA HEADLINE:
1. Entre 20-40 caracteres
2. Seja direto e impactante
3. Foque no benefício principal
4. Pode usar números ou estatísticas
5. Evite clickbait genérico

FORMATO DE RESPOSTA (JSON):
{
  "primaryTexts": [
    "Texto principal opção 1...",
    "Texto principal opção 2..."
  ],
  "headlines": [
    "Headline opção 1",
    "Headline opção 2"
  ]
}

Responda APENAS com o JSON, sem markdown ou explicações adicionais.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-5.2', // Modelo mais recente (Dezembro 2025)
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em copywriting para anúncios digitais. Responda sempre em português brasileiro.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.8, // GPT-5.2 se beneficia de mais criatividade
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API Error: ${error.error?.message || 'Unknown error'}`);
    }

    const data: OpenAIResponse = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('OpenAI não retornou conteúdo');
    }

    // Parse do JSON
    const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleanContent);

    // Validação
    if (!parsed.primaryTexts || !Array.isArray(parsed.primaryTexts) || parsed.primaryTexts.length < 2) {
      throw new Error('Formato inválido: primaryTexts deve ter pelo menos 2 itens');
    }
    if (!parsed.headlines || !Array.isArray(parsed.headlines) || parsed.headlines.length < 2) {
      throw new Error('Formato inválido: headlines deve ter pelo menos 2 itens');
    }

    console.log('✅ Copy gerada com sucesso:', {
      primaryTexts: parsed.primaryTexts.length,
      headlines: parsed.headlines.length,
    });

    return {
      primaryTexts: parsed.primaryTexts,
      headlines: parsed.headlines,
    };
  } catch (error) {
    console.error('❌ Erro ao gerar copy:', error);
    
    // Fallback com copy genérica
    return {
      primaryTexts: [
        `🎯 Descubra como ${params.objective.toLowerCase()} pode transformar sua carreira. Resultados comprovados por milhares de ${params.targetAudience.toLowerCase()}.`,
        `⚡ ${params.targetAudience}: a solução que você esperava para ${params.objective.toLowerCase()} chegou. Não perca essa oportunidade única!`,
      ],
      headlines: [
        `${params.objective.split(' ')[0]} para ${params.targetAudience}`,
        `Transforme sua Carreira Hoje`,
      ],
    };
  }
}

/**
 * Gera copys para múltiplas imagens
 */
export async function generateCopiesForImages(
  imageUrls: string[],
  objective: string,
  targetAudience: string
): Promise<GeneratedCopy[]> {
  const results: GeneratedCopy[] = [];

  for (const imageUrl of imageUrls) {
    const copy = await generateAdCopy({
      objective,
      targetAudience,
    });

    results.push({
      primaryText: copy.primaryTexts,
      headlines: copy.headlines,
      imageUrl,
    });

    // Pequeno delay para não sobrecarregar a API
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return results;
}

/**
 * Analisa uma imagem e gera copy contextualizada
 */
export async function analyzeImageAndGenerateCopy(
  imageUrl: string,
  objective: string,
  targetAudience: string
): Promise<GeneratedCopy> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY não configurada');
  }

  const prompt = `Analise esta imagem e gere copy de anúncio para Facebook/Instagram.

CONTEXTO:
- Objetivo: ${objective}
- Público-alvo: ${targetAudience}

Retorne JSON com:
{
  "imageDescription": "descrição breve da imagem",
  "primaryTexts": ["texto1 (80-150 chars)", "texto2 (80-150 chars)"],
  "headlines": ["headline1 (20-40 chars)", "headline2 (20-40 chars)"]
}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-5.2', // Modelo mais recente (Dezembro 2025) - Suporta Vision
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageUrl } },
            ],
          },
        ],
        temperature: 0.8, // GPT-5.2 se beneficia de mais criatividade
        max_tokens: 600,
      }),
    });

    if (!response.ok) {
      // Fallback para geração sem análise de imagem
      const copy = await generateAdCopy({ objective, targetAudience });
      return {
        primaryText: copy.primaryTexts,
        headlines: copy.headlines,
        imageUrl,
      };
    }

    const data: OpenAIResponse = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('OpenAI não retornou conteúdo');
    }

    const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleanContent);

    return {
      primaryText: parsed.primaryTexts || [],
      headlines: parsed.headlines || [],
      imageUrl,
    };
  } catch (error) {
    console.error('❌ Erro na análise de imagem:', error);
    
    // Fallback
    const copy = await generateAdCopy({ objective, targetAudience });
    return {
      primaryText: copy.primaryTexts,
      headlines: copy.headlines,
      imageUrl,
    };
  }
}
