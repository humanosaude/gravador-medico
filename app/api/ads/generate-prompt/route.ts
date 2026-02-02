import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// =====================================================
// API: GERAR PROMPT PROFISSIONAL COM IA (ETAPA 1)
// =====================================================
// Sistema de 2 Etapas (Meta-Prompt Generator):
// 1. IA gera um prompt profissional de copywriting
// 2. Usuário revisa/edita → IA usa o prompt para gerar copys finais
// =====================================================

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Meta-prompt para gerar prompts profissionais
const META_PROMPT_SYSTEM = `Você é um GERADOR DE PROMPTS especialista em copywriting para anúncios.
Sua função é criar prompts profissionais que serão usados por outra IA para gerar copys de alta conversão.

REGRAS PARA O PROMPT QUE VOCÊ GERAR:
1. Seja específico sobre tom, estilo e estrutura
2. Inclua gatilhos mentais relevantes
3. Defina claramente o público-alvo
4. Especifique quantidade de variações
5. Inclua instruções sobre CTAs
6. Mencione limitações de caracteres do Meta Ads
7. Oriente sobre uso de emojis

O prompt que você gerar será usado por GPT-5.2 Vision para criar as copys finais.`;

interface GeneratePromptRequest {
  objective: string;
  funnelStage: 'TOPO' | 'MEIO' | 'FUNDO';
  audienceStrategy: string;
  targetAudience?: string;
  productName?: string;
}

export async function POST(request: Request) {
  try {
    const body: GeneratePromptRequest = await request.json();
    const { objective, funnelStage, audienceStrategy, targetAudience, productName } = body;

    if (!objective) {
      return NextResponse.json(
        { success: false, error: 'Objetivo é obrigatório' },
        { status: 400 }
      );
    }

    // Mapear estratégia de audiência para texto
    const audienceMap: Record<string, string> = {
      'COLD_WINNER': 'Público frio inteligente com exclusão de compradores',
      'LOOKALIKE_AUTO': 'Lookalike 1% de compradores',
      'REMARKETING_VIDEO': 'Remarketing de quem assistiu vídeos',
      'REMARKETING_HOT': 'Remarketing quente (visitantes site + abandonos)',
    };

    // Mapear estágio do funil para foco
    const funnelFocus: Record<string, string> = {
      'TOPO': 'Awareness e alcance - foco em despertar curiosidade e interesse inicial',
      'MEIO': 'Engajamento e consideração - foco em educar e criar desejo',
      'FUNDO': 'Conversão e vendas - foco em urgência e call-to-action forte',
    };

    const userPrompt = `Crie um prompt profissional de copywriting para o seguinte cenário:

OBJETIVO DA CAMPANHA: ${objective}

ESTÁGIO DO FUNIL: ${funnelStage}
- Foco: ${funnelFocus[funnelStage] || 'Conversão'}

ESTRATÉGIA DE PÚBLICO: ${audienceMap[audienceStrategy] || audienceStrategy}

PÚBLICO-ALVO: ${targetAudience || 'Profissionais da saúde'}

PRODUTO: ${productName || 'Gravador Médico'}

---

Gere um prompt detalhado e profissional que inclua:
1. Instruções claras sobre tom e estilo
2. Gatilhos mentais específicos para usar
3. Estrutura das copys (primary text, headline)
4. Limites de caracteres (125 para primary text ideal, 27 para headline)
5. Quantidade de variações (3)
6. Orientações sobre CTAs
7. Uso estratégico de emojis

O prompt deve ser completo e pronto para ser usado diretamente.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: META_PROMPT_SYSTEM },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 1500,
    });

    const generatedPrompt = response.choices[0]?.message?.content;

    if (!generatedPrompt) {
      return NextResponse.json(
        { success: false, error: 'Falha ao gerar prompt' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      prompt: generatedPrompt,
      meta: {
        objective,
        funnelStage,
        audienceStrategy,
        model: 'gpt-4o',
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error: unknown) {
    console.error('Erro ao gerar prompt:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      },
      { status: 500 }
    );
  }
}
