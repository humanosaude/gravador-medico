/**
 * Social Flow - AI Content Analyzer
 * 
 * Analisa imagens e vídeos para gerar legendas e sugestões
 */

import { SocialNetwork } from '../types';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

interface ImageAnalysis {
  description: string;
  objects: string[];
  colors: string[];
  mood: string;
  suggestedCaptions: string[];
  suggestedHashtags: string[];
  contentWarnings?: string[];
}

interface ContentAnalysisOptions {
  network?: SocialNetwork;
  language?: string;
  includeHashtags?: boolean;
  tone?: 'professional' | 'casual' | 'fun' | 'inspirational';
}

export class AIContentAnalyzer {
  
  /**
   * Analisa uma imagem e gera insights
   */
  async analyzeImage(
    imageUrl: string,
    options: ContentAnalysisOptions = {}
  ): Promise<ImageAnalysis> {
    const prompt = this.buildImageAnalysisPrompt(options);

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
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: prompt,
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: imageUrl,
                    detail: 'high',
                  },
                },
              ],
            },
          ],
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze image');
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content || '';

      return this.parseImageAnalysis(content);
    } catch (error: any) {
      console.error('Image analysis error:', error);
      return this.getDefaultAnalysis();
    }
  }

  /**
   * Analisa uma imagem a partir de base64
   */
  async analyzeImageBase64(
    base64Data: string,
    mimeType: string = 'image/jpeg',
    options: ContentAnalysisOptions = {}
  ): Promise<ImageAnalysis> {
    const imageUrl = `data:${mimeType};base64,${base64Data}`;
    return this.analyzeImage(imageUrl, options);
  }

  /**
   * Gera descrição alt-text acessível para uma imagem
   */
  async generateAltText(imageUrl: string): Promise<string> {
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
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Gere um texto alternativo (alt-text) acessível para esta imagem. Seja descritivo mas conciso (máximo 125 caracteres). Descreva o conteúdo visual principal de forma clara e objetiva.',
                },
                {
                  type: 'image_url',
                  image_url: { url: imageUrl },
                },
              ],
            },
          ],
          max_tokens: 100,
        }),
      });

      const data = await response.json();
      return data.choices[0]?.message?.content || 'Imagem sem descrição disponível';
    } catch (error) {
      return 'Imagem sem descrição disponível';
    }
  }

  /**
   * Detecta objetos e texto em uma imagem
   */
  async detectContent(imageUrl: string): Promise<{
    objects: string[];
    text: string[];
    faces: number;
    logos: string[];
  }> {
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
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Analise esta imagem e liste:
1. OBJETOS: Objetos principais identificados
2. TEXTO: Qualquer texto visível na imagem
3. FACES: Número de rostos detectados
4. LOGOS: Marcas ou logos identificados

Responda em formato estruturado.`,
                },
                {
                  type: 'image_url',
                  image_url: { url: imageUrl },
                },
              ],
            },
          ],
          max_tokens: 500,
        }),
      });

      const data = await response.json();
      const content = data.choices[0]?.message?.content || '';

      return this.parseContentDetection(content);
    } catch (error) {
      return {
        objects: [],
        text: [],
        faces: 0,
        logos: [],
      };
    }
  }

  /**
   * Verifica se a imagem é apropriada para publicação
   */
  async checkContentSafety(imageUrl: string): Promise<{
    isSafe: boolean;
    warnings: string[];
    categories: Record<string, boolean>;
  }> {
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
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Analise esta imagem quanto à segurança para publicação em redes sociais.

Verifique:
- Conteúdo adulto ou explícito
- Violência ou gore
- Discurso de ódio ou símbolos ofensivos
- Informações pessoais sensíveis visíveis
- Conteúdo potencialmente perturbador

Responda em formato:
SEGURO: sim/não
AVISOS: [lista de avisos se houver]
CATEGORIAS: adult=sim/não, violence=sim/não, hate=sim/não, sensitive=sim/não`,
                },
                {
                  type: 'image_url',
                  image_url: { url: imageUrl },
                },
              ],
            },
          ],
          max_tokens: 300,
        }),
      });

      const data = await response.json();
      const content = data.choices[0]?.message?.content || '';

      return this.parseSafetyCheck(content);
    } catch (error) {
      return {
        isSafe: true,
        warnings: [],
        categories: {
          adult: false,
          violence: false,
          hate: false,
          sensitive: false,
        },
      };
    }
  }

  /**
   * Sugere melhores proporções de corte para a imagem
   */
  async suggestCrop(
    imageUrl: string,
    network: SocialNetwork
  ): Promise<{
    recommended: string;
    alternatives: string[];
    focusPoint: { x: number; y: number };
  }> {
    const aspectRatios: Record<SocialNetwork, string[]> = {
      instagram: ['1:1', '4:5', '9:16'],
      facebook: ['16:9', '1:1', '4:5'],
      twitter: ['16:9', '2:1'],
      linkedin: ['1.91:1', '1:1'],
      youtube: ['16:9'],
      tiktok: ['9:16'],
      pinterest: ['2:3', '1:1'],
    };

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
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Analise esta imagem para ${network}. Proporções disponíveis: ${aspectRatios[network].join(', ')}

1. Qual proporção melhor destaca o conteúdo principal?
2. Qual o ponto focal da imagem? (porcentagem x, y do centro)

Responda:
RECOMENDADO: [proporção]
ALTERNATIVAS: [outras proporções em ordem de preferência]
PONTO_FOCAL: x=50, y=50`,
                },
                {
                  type: 'image_url',
                  image_url: { url: imageUrl },
                },
              ],
            },
          ],
          max_tokens: 200,
        }),
      });

      const data = await response.json();
      const content = data.choices[0]?.message?.content || '';

      const recommendedMatch = content.match(/RECOMENDADO:\s*([\d:]+)/);
      const focusMatch = content.match(/PONTO_FOCAL:\s*x=(\d+),?\s*y=(\d+)/);

      return {
        recommended: recommendedMatch?.[1] || aspectRatios[network][0],
        alternatives: aspectRatios[network],
        focusPoint: {
          x: focusMatch ? parseInt(focusMatch[1]) : 50,
          y: focusMatch ? parseInt(focusMatch[2]) : 50,
        },
      };
    } catch (error) {
      return {
        recommended: aspectRatios[network][0],
        alternatives: aspectRatios[network],
        focusPoint: { x: 50, y: 50 },
      };
    }
  }

  // =======================
  // PRIVATE METHODS
  // =======================

  private buildImageAnalysisPrompt(options: ContentAnalysisOptions): string {
    const network = options.network || 'instagram';
    const tone = options.tone || 'casual';
    const language = options.language || 'português brasileiro';

    return `Analise esta imagem e forneça:

1. DESCRIÇÃO: Uma descrição detalhada do conteúdo visual
2. OBJETOS: Lista dos principais objetos/elementos na imagem
3. CORES: Cores dominantes na imagem
4. HUMOR: O mood/atmosfera transmitido
5. LEGENDAS: 3 sugestões de legendas para ${network} no tom ${tone}
6. HASHTAGS: 10 hashtags relevantes
7. AVISOS: Qualquer preocupação com o conteúdo (se houver)

Responda em ${language}.

Formato:
DESCRICAO: [texto]
OBJETOS: [lista separada por vírgula]
CORES: [lista]
HUMOR: [descrição]
LEGENDAS:
1. [legenda 1]
2. [legenda 2]
3. [legenda 3]
HASHTAGS: [lista de hashtags]
AVISOS: [avisos ou "nenhum"]`;
  }

  private parseImageAnalysis(content: string): ImageAnalysis {
    const descMatch = content.match(/DESCRICAO:\s*([\s\S]*?)(?=OBJETOS:|$)/i);
    const objMatch = content.match(/OBJETOS:\s*([\s\S]*?)(?=CORES:|$)/i);
    const colorsMatch = content.match(/CORES:\s*([\s\S]*?)(?=HUMOR:|$)/i);
    const moodMatch = content.match(/HUMOR:\s*([\s\S]*?)(?=LEGENDAS:|$)/i);
    const captionsMatch = content.match(/LEGENDAS:\s*([\s\S]*?)(?=HASHTAGS:|$)/i);
    const hashtagsMatch = content.match(/HASHTAGS:\s*([\s\S]*?)(?=AVISOS:|$)/i);
    const warningsMatch = content.match(/AVISOS:\s*([\s\S]*?)$/i);

    const extractList = (text: string): string[] => {
      return text
        .split(/[,\n]/)
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.match(/^\d+\.?$/));
    };

    const extractCaptions = (text: string): string[] => {
      return text
        .split(/\n/)
        .map(line => line.replace(/^\d+\.\s*/, '').trim())
        .filter(s => s.length > 0);
    };

    return {
      description: descMatch?.[1]?.trim() || 'Sem descrição disponível',
      objects: objMatch ? extractList(objMatch[1]) : [],
      colors: colorsMatch ? extractList(colorsMatch[1]) : [],
      mood: moodMatch?.[1]?.trim() || 'Neutro',
      suggestedCaptions: captionsMatch ? extractCaptions(captionsMatch[1]) : [],
      suggestedHashtags: hashtagsMatch 
        ? (hashtagsMatch[1].match(/#[\w\u00C0-\u00FF]+/g) || [])
        : [],
      contentWarnings: warningsMatch && !warningsMatch[1].toLowerCase().includes('nenhum')
        ? [warningsMatch[1].trim()]
        : undefined,
    };
  }

  private parseContentDetection(content: string): {
    objects: string[];
    text: string[];
    faces: number;
    logos: string[];
  } {
    const objMatch = content.match(/OBJETOS:\s*([\s\S]*?)(?=TEXTO:|$)/i);
    const textMatch = content.match(/TEXTO:\s*([\s\S]*?)(?=FACES:|$)/i);
    const facesMatch = content.match(/FACES:\s*(\d+)/i);
    const logosMatch = content.match(/LOGOS:\s*([\s\S]*?)$/i);

    const extractList = (text: string): string[] => {
      return text
        .split(/[,\n]/)
        .map(s => s.trim())
        .filter(s => s.length > 0);
    };

    return {
      objects: objMatch ? extractList(objMatch[1]) : [],
      text: textMatch ? extractList(textMatch[1]) : [],
      faces: facesMatch ? parseInt(facesMatch[1]) : 0,
      logos: logosMatch ? extractList(logosMatch[1]) : [],
    };
  }

  private parseSafetyCheck(content: string): {
    isSafe: boolean;
    warnings: string[];
    categories: Record<string, boolean>;
  } {
    const safeMatch = content.match(/SEGURO:\s*(sim|não)/i);
    const warningsMatch = content.match(/AVISOS:\s*([\s\S]*?)(?=CATEGORIAS:|$)/i);
    const categoriesMatch = content.match(/CATEGORIAS:\s*([\s\S]*?)$/i);

    const isSafe = safeMatch?.[1]?.toLowerCase() === 'sim';
    
    const warnings = warningsMatch && warningsMatch[1].trim() !== '-'
      ? warningsMatch[1].split(/[,\n]/).map(s => s.trim()).filter(Boolean)
      : [];

    const categories: Record<string, boolean> = {
      adult: false,
      violence: false,
      hate: false,
      sensitive: false,
    };

    if (categoriesMatch) {
      const catText = categoriesMatch[1].toLowerCase();
      categories.adult = catText.includes('adult=sim');
      categories.violence = catText.includes('violence=sim');
      categories.hate = catText.includes('hate=sim');
      categories.sensitive = catText.includes('sensitive=sim');
    }

    return { isSafe, warnings, categories };
  }

  private getDefaultAnalysis(): ImageAnalysis {
    return {
      description: 'Não foi possível analisar a imagem',
      objects: [],
      colors: [],
      mood: 'Desconhecido',
      suggestedCaptions: [],
      suggestedHashtags: [],
    };
  }
}

// Singleton
export const aiContentAnalyzer = new AIContentAnalyzer();
