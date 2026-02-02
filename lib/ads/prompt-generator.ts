// =====================================================
// META-PROMPT GENERATOR - SISTEMA DE 2 CAMADAS
// =====================================================
// Transforma objetivos simples em prompts profissionais
// de copywriting para geração de anúncios de alta conversão
// =====================================================

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// =====================================================
// TIPOS
// =====================================================

export interface PromptGeneratorResult {
  professionalPrompt: string;
  analysis: {
    funnelStage: 'TOPO' | 'MEIO' | 'FUNDO';
    intent: 'awareness' | 'consideration' | 'conversion' | 'remarketing';
    copyAngle: 'pain' | 'gain' | 'urgency' | 'social_proof' | 'curiosity';
    targetAudience: string;
    primaryBenefit: string;
    ctaStyle: string;
  };
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

// =====================================================
// CONTEXTO DO PRODUTO GRAVADOR MÉDICO
// =====================================================

const PRODUCT_CONTEXT = `
DADOS DO PRODUTO (USE ESTES DADOS REAIS):
- Nome: Gravador Médico
- O que faz: Transcrição automática de consultas médicas via IA
- Problema que resolve: Médicos perdem em média 3 horas por dia digitando prontuários manualmente
- Benefício principal: Economiza até 15 horas por semana de trabalho manual
- Prova social: Mais de 2.000 médicos ativos na plataforma
- Diferenciais: 
  * Integração com prontuário eletrônico
  * Transcrição em tempo real com 98% de precisão
  * Funciona offline (sincroniza depois)
  * Compatível com LGPD e sigilo médico
- Preço: Teste grátis de 7 dias, depois planos a partir de R$ 149/mês
- CTA de baixa fricção: "Teste grátis por 7 dias. Sem cartão."
- CTA de alta urgência: "Comece agora e ganhe 30% off"
- Público-alvo principal: Médicos de todas as especialidades (clínicos gerais, cardiologistas, pediatras, etc.)
`;

// =====================================================
// META-PROMPT: O prompt que gera outros prompts
// =====================================================

function buildMetaPrompt(userObjective: string): string {
  return `Você é um especialista em criar prompts para gerar copies de anúncios de alta conversão no estilo Direct Response Marketing.

## CONTEXTO:
Um usuário quer criar um anúncio no Facebook/Instagram Ads. Ele digitou este objetivo de forma simples e natural:

"${userObjective}"

${PRODUCT_CONTEXT}

## SUA TAREFA:
Analise o objetivo do usuário e crie um PROMPT ESTRUTURADO que será usado pelo GPT-5.2 Vision para gerar a copy final do anúncio. O prompt deve seguir frameworks de copywriting profissional (AIDA, PAS, etc).

## ANÁLISE OBRIGATÓRIA (faça antes de criar o prompt):

1. **Estágio do Funil:**
   - TOPO: Se mencionar "tráfego", "alcance", "conhecer", "descobrir", "educar"
   - MEIO: Se mencionar "remarketing", "engajamento", "consideração", "site"
   - FUNDO: Se mencionar "vender", "conversão", "comprar", "checkout", "abandono"

2. **Intenção Principal:**
   - awareness: Fazer pessoas conhecerem o produto
   - consideration: Fazer pessoas considerarem o produto
   - conversion: Fazer pessoas comprarem agora
   - remarketing: Reconquistar quem já interagiu

3. **Ângulo de Copy Ideal:**
   - pain: Focar na dor/problema que a pessoa tem
   - gain: Focar nos benefícios e ganhos
   - urgency: Criar senso de urgência
   - social_proof: Usar prova social e autoridade
   - curiosity: Despertar curiosidade

## ESTRUTURA DO PROMPT QUE VOCÊ DEVE CRIAR:

\`\`\`
Você é [PERSONA DE COPYWRITER] criando um anúncio de [TIPO DE CAMPANHA].

OBJETIVO: [Objetivo específico baseado na análise]
ESTÁGIO: [Topo/Meio/Fundo de Funil]
ÂNGULO: [Pain/Gain/Urgency/Social Proof/Curiosity]
PÚBLICO: [Descrição específica do público]

CONTEXTO DO PRODUTO:
- Nome: Gravador Médico
- Solução: [Benefício específico para este objetivo]
- Dor principal: [Dor relevante para este ângulo]
- Prova social: [Dado de prova social adequado]

ESTRUTURA OBRIGATÓRIA PARA PRIMARY TEXT (3-4 linhas):
- Linha 1: [Tipo de abertura - pergunta, afirmação chocante, etc]
- Linha 2: [Apresentação - como conectar a solução]
- Linha 3: [Prova - que dado usar]
- Linha 4: [CTA ou remoção de fricção - se aplicável]

HEADLINE (4-7 palavras):
- [Orientação específica para o headline]

CTA:
- [Orientação específica para o Call to Action]

REGRAS DE COPY:
- [3-5 regras específicas para este tipo de campanha]
- [O que usar]
- [O que NUNCA usar]

TOM DE VOZ: [Direto/Consultivo/Urgente/Educacional]

FORMATO DE RESPOSTA:
Retorne APENAS um JSON válido:
{
  "primary_text": "texto completo do anúncio",
  "headline": "headline curto e impactante",
  "cta": "texto do botão de CTA"
}
\`\`\`

## EXEMPLOS DE TRANSFORMAÇÃO:

EXEMPLO 1:
Input: "quero vender direto para médicos"
Output: Prompt de Fundo de Funil com ângulo de urgência e prova social, CTA forte de conversão.

EXEMPLO 2:
Input: "gerar tráfego de alto volume para remarketing depois"
Output: Prompt de Topo de Funil com ângulo de curiosidade/educação, CTA suave sem pressão de venda.

EXEMPLO 3:
Input: "remarketing para quem abandonou checkout"
Output: Prompt de conversão urgente com desconto, garantia, escassez.

## RESPOSTA ESPERADA:

Retorne um JSON com:
{
  "analysis": {
    "funnelStage": "TOPO" | "MEIO" | "FUNDO",
    "intent": "awareness" | "consideration" | "conversion" | "remarketing",
    "copyAngle": "pain" | "gain" | "urgency" | "social_proof" | "curiosity",
    "targetAudience": "descrição do público",
    "primaryBenefit": "benefício principal a destacar",
    "ctaStyle": "baixa_friccao" | "urgente" | "educacional"
  },
  "professionalPrompt": "O PROMPT COMPLETO E ESTRUTURADO para o GPT-5.2 gerar a copy"
}

IMPORTANTE:
- Seja MUITO específico no prompt que você gerar
- Adapte DOR, BENEFÍCIO e ÂNGULO baseado no objetivo do usuário
- Inclua números e dados reais do Gravador Médico
- O prompt gerado deve ter instruções claras e completas
- Mantenha o formato JSON na resposta`;
}

// =====================================================
// FUNÇÃO PRINCIPAL: Gerar Prompt Profissional
// =====================================================

/**
 * Transforma objetivo simples do usuário em prompt estruturado de copywriting
 * Esta é a CAMADA 1 do sistema de 2 camadas de IA
 * 
 * @param userObjective - Texto simples digitado pelo usuário
 * @returns Prompt profissional estruturado + análise
 */
export async function generateCopywritingPrompt(
  userObjective: string
): Promise<PromptGeneratorResult> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY não configurada');
  }

  if (!userObjective || userObjective.trim().length < 5) {
    // Objetivo muito curto, usar fallback
    return generateFallbackPrompt(userObjective);
  }

  console.log('📝 [IA Layer 1] Gerando prompt profissional...');
  console.log('   Input do usuário:', userObjective.substring(0, 100));

  const metaPrompt = buildMetaPrompt(userObjective);

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
            content: 'Você é um especialista em criar prompts de copywriting para Direct Response Marketing. Seus prompts sempre geram copies que convertem. Responda APENAS com JSON válido.',
          },
          {
            role: 'user',
            content: metaPrompt,
          },
        ],
        temperature: 0.8, // GPT-5.2 se beneficia de mais criatividade
        max_tokens: 2000,
        response_format: { type: 'json_object' },
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
    const parsed = JSON.parse(content);

    // Validação
    if (!parsed.professionalPrompt || !parsed.analysis) {
      console.warn('⚠️ Resposta incompleta da IA, usando fallback');
      return generateFallbackPrompt(userObjective);
    }

    console.log('✅ [IA Layer 1] Prompt gerado com sucesso');
    console.log('   Análise:', {
      funnel: parsed.analysis.funnelStage,
      intent: parsed.analysis.intent,
      angle: parsed.analysis.copyAngle,
    });

    return {
      professionalPrompt: parsed.professionalPrompt,
      analysis: {
        funnelStage: parsed.analysis.funnelStage || 'TOPO',
        intent: parsed.analysis.intent || 'awareness',
        copyAngle: parsed.analysis.copyAngle || 'gain',
        targetAudience: parsed.analysis.targetAudience || 'Médicos',
        primaryBenefit: parsed.analysis.primaryBenefit || 'Economia de tempo',
        ctaStyle: parsed.analysis.ctaStyle || 'baixa_friccao',
      },
    };
  } catch (error) {
    console.error('❌ [IA Layer 1] Erro ao gerar prompt:', error);
    return generateFallbackPrompt(userObjective);
  }
}

// =====================================================
// FALLBACK: Prompt padrão quando IA falha
// =====================================================

function generateFallbackPrompt(userObjective: string): PromptGeneratorResult {
  console.log('⚠️ [IA Layer 1] Usando prompt fallback');

  // Detectar intenção básica por palavras-chave
  const objectiveLower = userObjective.toLowerCase();
  
  let funnelStage: 'TOPO' | 'MEIO' | 'FUNDO' = 'TOPO';
  let intent: 'awareness' | 'consideration' | 'conversion' | 'remarketing' = 'awareness';
  let copyAngle: 'pain' | 'gain' | 'urgency' | 'social_proof' | 'curiosity' = 'gain';
  let ctaStyle = 'baixa_friccao';

  if (objectiveLower.includes('vend') || objectiveLower.includes('convers') || objectiveLower.includes('compra')) {
    funnelStage = 'FUNDO';
    intent = 'conversion';
    copyAngle = 'urgency';
    ctaStyle = 'urgente';
  } else if (objectiveLower.includes('remarketing') || objectiveLower.includes('abandon')) {
    funnelStage = 'FUNDO';
    intent = 'remarketing';
    copyAngle = 'urgency';
    ctaStyle = 'urgente';
  } else if (objectiveLower.includes('engaj') || objectiveLower.includes('consider')) {
    funnelStage = 'MEIO';
    intent = 'consideration';
    copyAngle = 'social_proof';
    ctaStyle = 'educacional';
  }

  const fallbackPrompt = `Você é um copywriter especialista em anúncios de performance para Facebook/Instagram Ads.

OBJETIVO: ${userObjective}
ESTÁGIO: ${funnelStage === 'TOPO' ? 'Topo de Funil (Awareness)' : funnelStage === 'MEIO' ? 'Meio de Funil (Consideração)' : 'Fundo de Funil (Conversão)'}
PÚBLICO: Médicos de todas as especialidades

CONTEXTO DO PRODUTO:
- Nome: Gravador Médico
- Solução: Transcrição automática de consultas via IA
- Dor principal: Médicos perdem 3h/dia digitando prontuários
- Benefício: Economiza 15h/semana de trabalho manual
- Prova social: Mais de 2.000 médicos ativos

ESTRUTURA DO PRIMARY TEXT:
- Linha 1: Hook com pergunta sobre a dor ("Médico, você gasta horas digitando prontuários?")
- Linha 2: Apresentação da solução ("O Gravador Médico transcreve automaticamente suas consultas")
- Linha 3: Prova social ("Mais de 2.000 médicos já economizam 15h/semana")
- Linha 4: Remoção de fricção ("Teste grátis por 7 dias. Sem cartão.")

HEADLINE: Benefício claro em 4-6 palavras (ex: "Prontuário pronto em segundos")

CTA: ${ctaStyle === 'urgente' ? '"Começar Agora"' : '"Ver Como Funciona"'}

REGRAS:
- Use "você" (fale direto com o médico)
- Inclua números específicos
- Tom: ${funnelStage === 'FUNDO' ? 'Direto e urgente' : 'Consultivo e educacional'}
- NUNCA use: "descubra", "saiba mais" genérico

FORMATO: Retorne APENAS JSON:
{
  "primary_text": "texto completo",
  "headline": "headline curto",
  "cta": "texto do botão"
}`;

  return {
    professionalPrompt: fallbackPrompt,
    analysis: {
      funnelStage,
      intent,
      copyAngle,
      targetAudience: 'Médicos',
      primaryBenefit: 'Economia de tempo',
      ctaStyle,
    },
  };
}

// =====================================================
// HELPER: Detectar estágio do funil pelo objetivo
// =====================================================

export function detectFunnelFromObjective(objective: string): 'TOPO' | 'MEIO' | 'FUNDO' {
  const objectiveLower = objective.toLowerCase();

  // Palavras-chave de Fundo de Funil
  const fundoKeywords = ['vend', 'convers', 'compra', 'checkout', 'abandon', 'remarketing', 'retargeting', 'carrinho'];
  if (fundoKeywords.some(kw => objectiveLower.includes(kw))) {
    return 'FUNDO';
  }

  // Palavras-chave de Meio de Funil
  const meioKeywords = ['engaj', 'consider', 'interesse', 'site', 'clique', 'visita'];
  if (meioKeywords.some(kw => objectiveLower.includes(kw))) {
    return 'MEIO';
  }

  // Default: Topo de Funil
  return 'TOPO';
}

// =====================================================
// EXPORT DEFAULT
// =====================================================

export default {
  generateCopywritingPrompt,
  detectFunnelFromObjective,
};
