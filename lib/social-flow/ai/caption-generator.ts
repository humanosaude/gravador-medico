/**
 * Social Flow - AI Caption Generator
 * 
 * Gera legendas otimizadas para cada rede social usando IA
 */

import { SocialNetwork } from '../types';
import { NETWORK_CONFIGS } from '../config';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

interface CaptionGeneratorOptions {
  network: SocialNetwork;
  topic: string;
  tone?: 'professional' | 'casual' | 'fun' | 'inspirational' | 'educational';
  includeEmojis?: boolean;
  includeHashtags?: boolean;
  hashtagCount?: number;
  includeCTA?: boolean;
  targetAudience?: string;
  language?: string;
  customInstructions?: string;
}

interface GeneratedCaption {
  caption: string;
  hashtags: string[];
  emojis: string[];
  charCount: number;
  network: SocialNetwork;
  variations?: string[];
}

export class AICaptionGenerator {
  
  /**
   * Gera uma legenda otimizada para a rede social especificada
   */
  async generate(options: CaptionGeneratorOptions): Promise<GeneratedCaption> {
    const networkConfig = NETWORK_CONFIGS[options.network];
    const maxLength = networkConfig?.maxCaptionLength || 2200;

    const prompt = this.buildPrompt(options, maxLength);

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
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate caption');
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content || '';

      return this.parseResponse(content, options.network);
    } catch (error: any) {
      console.error('Caption generation error:', error);
      return {
        caption: '',
        hashtags: [],
        emojis: [],
        charCount: 0,
        network: options.network,
      };
    }
  }

  /**
   * Gera múltiplas variações de legenda
   */
  async generateVariations(
    options: CaptionGeneratorOptions,
    count: number = 3
  ): Promise<GeneratedCaption[]> {
    const variations: GeneratedCaption[] = [];

    const tones: CaptionGeneratorOptions['tone'][] = [
      'professional', 'casual', 'fun', 'inspirational', 'educational'
    ];

    // Usar tons diferentes para cada variação
    for (let i = 0; i < count; i++) {
      const varOptions = {
        ...options,
        tone: options.tone || tones[i % tones.length],
      };
      
      const result = await this.generate(varOptions);
      variations.push(result);

      // Pequeno delay entre chamadas
      await this.wait(500);
    }

    return variations;
  }

  /**
   * Adapta uma legenda para outra rede social
   */
  async adaptForNetwork(
    originalCaption: string,
    fromNetwork: SocialNetwork,
    toNetwork: SocialNetwork
  ): Promise<GeneratedCaption> {
    const networkConfig = NETWORK_CONFIGS[toNetwork];
    const maxLength = networkConfig?.maxCaptionLength || 2200;

    const prompt = `Adapte esta legenda de ${fromNetwork} para ${toNetwork}:

Legenda original:
${originalCaption}

Requisitos para ${toNetwork}:
- Máximo ${maxLength} caracteres
- Estilo e tom adequados para ${toNetwork}
- Mantenha a mensagem principal
- Ajuste hashtags e emojis conforme a rede

Responda no formato:
LEGENDA: [sua legenda adaptada]
HASHTAGS: [lista de hashtags separadas por vírgula]`;

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
              content: `Você é um especialista em adaptação de conteúdo para ${toNetwork}.`,
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.6,
          max_tokens: 800,
        }),
      });

      const data = await response.json();
      const content = data.choices[0]?.message?.content || '';

      return this.parseResponse(content, toNetwork);
    } catch (error) {
      return {
        caption: originalCaption,
        hashtags: [],
        emojis: [],
        charCount: originalCaption.length,
        network: toNetwork,
      };
    }
  }

  /**
   * Melhora uma legenda existente
   */
  async improve(
    caption: string,
    network: SocialNetwork,
    feedback?: string
  ): Promise<GeneratedCaption> {
    const prompt = `Melhore esta legenda para ${network}:

${caption}

${feedback ? `Feedback do usuário: ${feedback}` : ''}

Foque em:
- Aumentar engajamento
- Melhorar clareza
- Otimizar para o algoritmo
- Manter autenticidade

Responda no formato:
LEGENDA: [legenda melhorada]
HASHTAGS: [hashtags sugeridas]
EXPLICACAO: [breve explicação das melhorias]`;

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
              content: prompt,
            },
          ],
          temperature: 0.5,
          max_tokens: 800,
        }),
      });

      const data = await response.json();
      const content = data.choices[0]?.message?.content || '';

      return this.parseResponse(content, network);
    } catch (error) {
      return {
        caption,
        hashtags: [],
        emojis: [],
        charCount: caption.length,
        network,
      };
    }
  }

  // =======================
  // PRIVATE METHODS
  // =======================

  private getSystemPrompt(network: SocialNetwork): string {
    const prompts: Record<SocialNetwork, string> = {
      instagram: `Você é um especialista em marketing no Instagram. Crie legendas envolventes que geram engajamento. Use emojis estrategicamente. Conhece tendências e boas práticas da plataforma.`,
      
      facebook: `Você é um especialista em marketing no Facebook. Crie posts que incentivam interação e compartilhamento. Conhece o algoritmo e melhores práticas da plataforma.`,
      
      twitter: `Você é um especialista em Twitter/X. Crie tweets concisos e impactantes (máx 280 caracteres). Seja direto, espirituoso quando apropriado.`,
      
      linkedin: `Você é um especialista em conteúdo profissional para LinkedIn. Crie posts que demonstram expertise e geram discussões profissionais. Tom mais formal mas acessível.`,
      
      youtube: `Você é um especialista em YouTube. Crie títulos e descrições otimizados para SEO e engajamento. Conhece boas práticas de thumbnails e CTAs.`,
      
      tiktok: `Você é um especialista em TikTok. Crie legendas curtas, divertidas e que seguem tendências. Use linguagem jovem e atual.`,
      
      pinterest: `Você é um especialista em Pinterest. Crie descrições otimizadas para descoberta, com foco em palavras-chave e inspiração.`,
    };

    return prompts[network] || prompts.instagram;
  }

  private buildPrompt(options: CaptionGeneratorOptions, maxLength: number): string {
    const parts: string[] = [
      `Crie uma legenda para ${options.network} sobre: ${options.topic}`,
      ``,
      `Requisitos:`,
      `- Máximo ${maxLength} caracteres`,
    ];

    if (options.tone) {
      parts.push(`- Tom: ${options.tone}`);
    }

    if (options.includeEmojis !== false) {
      parts.push(`- Inclua emojis relevantes`);
    }

    if (options.includeHashtags !== false) {
      const count = options.hashtagCount || 10;
      parts.push(`- Sugira ${count} hashtags relevantes`);
    }

    if (options.includeCTA) {
      parts.push(`- Inclua call-to-action`);
    }

    if (options.targetAudience) {
      parts.push(`- Público-alvo: ${options.targetAudience}`);
    }

    if (options.language) {
      parts.push(`- Idioma: ${options.language}`);
    }

    if (options.customInstructions) {
      parts.push(`- ${options.customInstructions}`);
    }

    parts.push(``);
    parts.push(`Responda no formato:`);
    parts.push(`LEGENDA: [sua legenda]`);
    parts.push(`HASHTAGS: [lista de hashtags separadas por vírgula]`);

    return parts.join('\n');
  }

  private parseResponse(content: string, network: SocialNetwork): GeneratedCaption {
    let caption = '';
    let hashtags: string[] = [];

    // Extrair legenda
    const captionMatch = content.match(/LEGENDA:\s*([\s\S]+?)(?=HASHTAGS:|$)/);
    if (captionMatch) {
      caption = captionMatch[1].trim();
    } else {
      // Se não encontrou o formato, usar o conteúdo inteiro
      caption = content.split('HASHTAGS:')[0].trim();
    }

    // Extrair hashtags
    const hashtagMatch = content.match(/HASHTAGS:\s*([\s\S]+?)(?=EXPLICACAO:|$)/);
    if (hashtagMatch) {
      hashtags = hashtagMatch[1]
        .split(/[,\s]+/)
        .map(h => h.trim())
        .filter(h => h.length > 0)
        .map(h => h.startsWith('#') ? h : `#${h}`);
    }

    // Extrair emojis da legenda
    const emojis = caption.match(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu) || [];

    return {
      caption,
      hashtags,
      emojis,
      charCount: caption.length,
      network,
    };
  }

  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton
export const aiCaptionGenerator = new AICaptionGenerator();
