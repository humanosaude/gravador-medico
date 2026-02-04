import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { 
  GRAVADOR_MEDICO_KNOWLEDGE, 
  CAMPAIGN_OBJECTIVES, 
  generateMetaPrompt,
  type ObjectiveType 
} from '@/lib/gravador-medico-knowledge';

// =====================================================
// API: GERAR PROMPT COM INTELIGÊNCIA DO PRODUTO EMBUTIDA
// =====================================================
// Sistema simplificado onde o usuário escolhe apenas:
// - TRAFEGO (Topo de Funil)
// - CONVERSAO (Fundo de Funil)
// - REMARKETING (Meio de Funil)
// 
// A IA já conhece TUDO sobre o produto Gravador Médico.
// =====================================================

// Lazy initialization para evitar erro durante build
let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return _openai;
}

// Tipos para ambos os modos (legado e novo)
interface LegacyRequest {
  objective: string;
  funnelStage?: 'TOPO' | 'MEIO' | 'FUNDO';
  audienceStrategy?: string;
  targetAudience?: string;
  productName?: string;
}

interface NewRequest {
  objective_type: ObjectiveType;
}

type GeneratePromptRequest = LegacyRequest | NewRequest;

function isNewRequest(body: GeneratePromptRequest): body is NewRequest {
  return 'objective_type' in body;
}

export async function POST(request: Request) {
  try {
    const body: GeneratePromptRequest = await request.json();

    // =====================================================
    // MODO NOVO: Objetivo pré-definido (TRAFEGO/CONVERSAO/REMARKETING)
    // =====================================================
    if (isNewRequest(body)) {
      const { objective_type } = body;

      // Validar objetivo
      if (!objective_type || !CAMPAIGN_OBJECTIVES[objective_type]) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Objetivo inválido. Use: TRAFEGO, CONVERSAO ou REMARKETING' 
          },
          { status: 400 }
        );
      }

      const objective = CAMPAIGN_OBJECTIVES[objective_type];
      const product = GRAVADOR_MEDICO_KNOWLEDGE;

      console.log(`📝 [Prompt Generator] Modo NOVO - Objetivo: ${objective.label}`);
      console.log(`   📊 Estágio: ${objective.estagio_funil}`);
      console.log(`   🎯 Foco: ${objective.foco}`);

      // Gerar o meta-prompt completo usando a função helper
      const metaPrompt = generateMetaPrompt(objective_type);

      // Chamar GPT-5.2 para gerar as variações de copy
      const completion = await getOpenAI().chat.completions.create({
        model: 'gpt-5.2',
        messages: [
          {
            role: 'system',
            content: `Você é um copywriter especialista em Direct Response Marketing para produtos médicos.
Você SEMPRE responde em formato JSON válido.
Você conhece profundamente o produto "${product.nome}" e sabe exatamente como falar com médicos.
Seu objetivo é criar copies que convertem, respeitando o tom e as regras específicas de cada estágio do funil.`
          },
          {
            role: 'user',
            content: metaPrompt
          }
        ],
        temperature: 0.8,
        max_completion_tokens: 2000,
        response_format: { type: "json_object" }
      });

      const responseContent = completion.choices[0]?.message?.content;

      if (!responseContent) {
        return NextResponse.json(
          { success: false, error: 'Falha ao gerar resposta da IA' },
          { status: 500 }
        );
      }

      // Parse do JSON
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(responseContent);
      } catch {
        console.error('Erro ao parsear JSON:', responseContent);
        return NextResponse.json(
          { success: false, error: 'Resposta da IA não é JSON válido' },
          { status: 500 }
        );
      }

      console.log(`✅ [Prompt Generator] ${parsedResponse.variacoes?.length || 0} variações geradas`);

      return NextResponse.json({
        success: true,
        objective: {
          type: objective_type,
          label: objective.label,
          estagio_funil: objective.estagio_funil,
          foco: objective.foco,
          tom: objective.tom
        },
        variacoes: parsedResponse.variacoes || [],
        prompt: metaPrompt, // Compatibilidade com modo legado
        meta: {
          produto: product.nome,
          model: 'gpt-5.2',
          tokens_used: completion.usage?.total_tokens || 0,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // =====================================================
    // MODO LEGADO: Objetivo livre digitado pelo usuário
    // =====================================================
    const { objective, funnelStage, audienceStrategy, targetAudience, productName } = body;

    if (!objective) {
      return NextResponse.json(
        { success: false, error: 'Objetivo é obrigatório' },
        { status: 400 }
      );
    }

    console.log(`📝 [Prompt Generator] Modo LEGADO - Objetivo: ${objective}`);

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

ESTÁGIO DO FUNIL: ${funnelStage || 'TOPO'}
- Foco: ${funnelFocus[funnelStage || 'TOPO']}

ESTRATÉGIA DE PÚBLICO: ${audienceMap[audienceStrategy || 'COLD_WINNER'] || audienceStrategy}

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

    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-5.2',
      messages: [
        { 
          role: 'system', 
          content: `Você é um GERADOR DE PROMPTS especialista em copywriting para anúncios.
Sua função é criar prompts profissionais que serão usados por outra IA para gerar copys de alta conversão.

REGRAS PARA O PROMPT QUE VOCÊ GERAR:
1. Seja específico sobre tom, estilo e estrutura
2. Inclua gatilhos mentais relevantes
3. Defina claramente o público-alvo
4. Especifique quantidade de variações
5. Inclua instruções sobre CTAs
6. Mencione limitações de caracteres do Meta Ads
7. Oriente sobre uso de emojis` 
        },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_completion_tokens: 1500,
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
        model: 'gpt-5.2',
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error: unknown) {
    console.error('[Prompt Generator] Erro:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      },
      { status: 500 }
    );
  }
}

// GET para retornar os objetivos disponíveis
export async function GET() {
  return NextResponse.json({
    success: true,
    objectives: Object.entries(CAMPAIGN_OBJECTIVES).map(([key, value]) => ({
      type: key,
      label: value.label,
      emoji: value.emoji,
      descricao: value.descricao,
      estagio_funil: value.estagio_funil,
      cta_ideal: value.cta_ideal
    })),
    produto: {
      nome: GRAVADOR_MEDICO_KNOWLEDGE.nome,
      proposta: GRAVADOR_MEDICO_KNOWLEDGE.proposta_central,
      preco: GRAVADOR_MEDICO_KNOWLEDGE.preco.metodo
    }
  });
}
