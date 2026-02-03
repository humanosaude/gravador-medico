/**
 * =====================================================
 * SISTEMA INTELIGENTE DE ANÁLISE DE CRIATIVOS
 * =====================================================
 * 
 * Este módulo utiliza GPT-5.2 (modelo mais recente da OpenAI)
 * para analisar criativos de anúncios e recomendar automaticamente:
 * - Melhor objetivo de campanha (TRÁFEGO/CONVERSÃO/REMARKETING)
 * - Ângulos de copy que complementam o visual
 * - Dicas de otimização
 * 
 * =====================================================
 */

import OpenAI from 'openai';
import { GRAVADOR_MEDICO_KNOWLEDGE, CAMPAIGN_OBJECTIVES, ObjectiveType } from '@/lib/gravador-medico-knowledge';

// Modelo mais recente da OpenAI (Fevereiro 2026)
const OPENAI_MODEL = 'gpt-5.2';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type CreativeFormat = 'IMAGE' | 'VIDEO' | 'CAROUSEL';

/**
 * Interface de Análise de Criativo
 */
export interface CreativeAnalysis {
  format: CreativeFormat;
  
  // Análise Visual
  visual_elements: string[];
  colors: string[];
  text_in_image: string | null;
  mood: string;
  
  // Recomendações Inteligentes
  recommended_objective: ObjectiveType;
  recommendation_confidence: number; // 0-100
  recommendation_reasoning: string;
  
  // Ângulos de Copy
  recommended_angles: string[];
  copywriting_suggestions: string[];
  
  // Detalhes Técnicos
  technical_details: {
    has_people: boolean;
    has_product: boolean;
    has_text_overlay: boolean;
    is_professional_photo: boolean;
    visual_quality_score: number; // 0-10
  };
  
  // Avisos e Sugestões
  warnings: string[]; // Ex: "Imagem com pouco contraste"
  optimization_tips: string[]; // Ex: "Adicione um CTA no texto"
}

/**
 * Interface de Variação de Copy
 */
export interface CopyVariation {
  id: number;
  primary_text: string;
  headline: string;
  cta: string;
  predicted_performance: number; // 0-100
  performance_label: string; // "CAMPEÃ", "Alternativa", "Teste A/B"
  reasoning: string;
}

/**
 * Interface de Resultado de Geração de Copies
 */
export interface CopyGenerationResult {
  variations: CopyVariation[];
  generation_notes: string;
}

/**
 * Analisar criativo e recomendar objetivo
 * @param imageUrl URL pública da imagem/frame do vídeo
 * @param format Formato do criativo (IMAGE, VIDEO, CAROUSEL)
 */
export async function analyzeCreative(
  imageUrl: string,
  format: CreativeFormat
): Promise<CreativeAnalysis> {
  
  const prompt = `Você é um estrategista sênior de Meta Ads com 10 anos de experiência analisando criativos de alta performance.

Analise este ${format === 'IMAGE' ? 'criativo em imagem' : format === 'VIDEO' ? 'frame de vídeo' : 'slide de carrossel'} e forneça uma análise COMPLETA:

## 1. ANÁLISE VISUAL BÁSICA

**Elementos Visuais:**
Liste todos os objetos, dispositivos, pessoas, produtos visíveis

**Paleta de Cores:**
3 cores predominantes

**Texto Visível:**
Transcreva EXATAMENTE qualquer texto na imagem (ou "null" se não houver)

**Mood/Atmosfera:**
Descreva em 2-3 palavras (ex: "profissional e moderno")

---

## 2. RECOMENDAÇÃO DE OBJETIVO (CRÍTICO)

Baseado APENAS no que você vê na imagem, qual objetivo de campanha faz mais sentido?

**Critérios de Decisão:**

**TRAFEGO (Topo de Funil):**
- Visual EDUCATIVO ou CURIOSO (não mostra preço)
- Sem call to action agressivo
- Foca em benefício/transformação genérica
- Exemplo: imagem conceitual, antes/depois, infográfico

**CONVERSAO (Fundo de Funil):**
- Visual DIRETO com produto claro
- Mostra preço, garantia ou oferta
- CTA agressivo visível ("Compre agora", "R$ X")
- Exemplo: produto + preço, mockup com benefício específico

**REMARKETING (Meio de Funil):**
- Visual que RESOLVE OBJEÇÃO
- Mostra prova social (depoimentos, números)
- Reforça segurança/garantia
- Exemplo: testemunhos, certificações, "experimente grátis"

**Escolha UMA opção e justifique em 1-2 linhas.**

**Confiança da Recomendação:**
De 0 a 100, qual sua certeza? (70+ = alta confiança)

---

## 3. QUALIDADE TÉCNICA

**Detalhes:**
- Tem pessoas? (sim/não)
- Tem produto físico? (sim/não)
- Tem overlay de texto? (sim/não)
- É foto profissional ou caseira?
- Score de qualidade visual: 0-10 (composição, iluminação, resolução)

**Avisos (se aplicável):**
- Imagem desfocada
- Pouco contraste
- Texto ilegível
- Muito poluída
- Sem foco claro

**Dicas de Otimização:**
3 sugestões práticas para melhorar performance

---

## 4. ÂNGULOS DE COPYWRITING

Baseado no visual, sugira:
- 3 ângulos de copy que COMPLEMENTAM a imagem (não repetem)
- 3 sugestões específicas de primary text

---

## FORMATO JSON:

{
  "visual_elements": ["elemento1", "elemento2", "elemento3"],
  "colors": ["cor1", "cor2", "cor3"],
  "text_in_image": "texto exato ou null",
  "mood": "descrição curta",
  
  "recommended_objective": "TRAFEGO" ou "CONVERSAO" ou "REMARKETING",
  "recommendation_confidence": 85,
  "recommendation_reasoning": "Justificativa clara em 1-2 linhas",
  
  "recommended_angles": ["angulo1", "angulo2", "angulo3"],
  "copywriting_suggestions": ["sugestao1", "sugestao2", "sugestao3"],
  
  "technical_details": {
    "has_people": boolean,
    "has_product": boolean,
    "has_text_overlay": boolean,
    "is_professional_photo": boolean,
    "visual_quality_score": 8
  },
  
  "warnings": ["aviso1 se houver"] ou [],
  "optimization_tips": ["dica1", "dica2", "dica3"]
}

Retorne APENAS o JSON válido, sem markdown.`;

  try {
    console.log(`🎨 [Creative Analyzer] Analisando criativo: ${format} (usando ${OPENAI_MODEL})`);
    
    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: 'system',
          content: 'Você é um estrategista sênior de Meta Ads especializado em análise de criativos de alta performance. Responda sempre em JSON válido.'
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } }
          ]
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 2000,
    });

    const responseContent = completion.choices[0]?.message?.content || '{}';
    const analysis = JSON.parse(responseContent);

    console.log(`✅ [Creative Analyzer] Recomendação: ${analysis.recommended_objective} (${analysis.recommendation_confidence}% confiança)`);

    return {
      format,
      visual_elements: analysis.visual_elements || [],
      colors: analysis.colors || [],
      text_in_image: analysis.text_in_image || null,
      mood: analysis.mood || 'Neutro',
      recommended_objective: analysis.recommended_objective || 'TRAFEGO',
      recommendation_confidence: analysis.recommendation_confidence || 50,
      recommendation_reasoning: analysis.recommendation_reasoning || 'Análise padrão',
      recommended_angles: analysis.recommended_angles || [],
      copywriting_suggestions: analysis.copywriting_suggestions || [],
      technical_details: {
        has_people: analysis.technical_details?.has_people || false,
        has_product: analysis.technical_details?.has_product || false,
        has_text_overlay: analysis.technical_details?.has_text_overlay || false,
        is_professional_photo: analysis.technical_details?.is_professional_photo || false,
        visual_quality_score: analysis.technical_details?.visual_quality_score || 5
      },
      warnings: analysis.warnings || [],
      optimization_tips: analysis.optimization_tips || []
    };

  } catch (error: any) {
    console.error('[Creative Analyzer] Erro:', error);
    throw new Error('Falha ao analisar criativo: ' + error.message);
  }
}

/**
 * Gerar 3 variações de copy + indicar qual é a CAMPEÃ
 * @param objectiveType Tipo de objetivo (TRAFEGO, CONVERSAO, REMARKETING)
 * @param creativeAnalysis Análise do criativo (do passo anterior)
 * @param additionalContext Contexto adicional opcional
 */
export async function generateCopiesWithWinnerPrediction(
  objectiveType: ObjectiveType,
  creativeAnalysis: CreativeAnalysis,
  additionalContext?: string
): Promise<CopyGenerationResult> {
  
  const objective = CAMPAIGN_OBJECTIVES[objectiveType];
  const product = GRAVADOR_MEDICO_KNOWLEDGE;

  const prompt = `Você é David Ogilvy + Claude Hopkins combinados, criando anúncios de Facebook Ads de ULTRA ALTA conversão.

## PRODUTO: Gravador Médico
**Proposta:** ${product.proposta_central}
**Dor:** ${product.dor.principal}
**Benefício:** ${product.beneficios.economia_tempo}
**Prova Social:** ${product.prova_social.usuarios_ativos}
**Preço:** ${product.preco.metodo} (${product.preco.acesso})

## OBJETIVO: ${objective.label}
- Estágio: ${objective.estagio_funil}
- Tom: ${objective.tom}
- Foco: ${objective.foco}
- CTAs ideais: ${objective.cta_ideal.join(', ')}

## ANÁLISE DO CRIATIVO:

**Formato:** ${creativeAnalysis.format}
**Elementos:** ${creativeAnalysis.visual_elements.join(', ')}
**Mood:** ${creativeAnalysis.mood}
**Texto na Imagem:** ${creativeAnalysis.text_in_image || 'Nenhum'}
**Qualidade Visual:** ${creativeAnalysis.technical_details.visual_quality_score}/10

**Ângulos Recomendados:**
${creativeAnalysis.recommended_angles.map((a, i) => `${i + 1}. ${a}`).join('\n')}

${additionalContext ? `\n**Contexto Adicional do Usuário:**\n${additionalContext}\n` : ''}

---

## SUA TAREFA:

Crie **3 VARIAÇÕES** de copy, cada uma explorando um ângulo DIFERENTE.

**VARIAÇÃO 1 (Campeã - Maior Probabilidade):**
- Use o ângulo MAIS PROVADO de Direct Response
- ${objectiveType === 'CONVERSAO' ? 'Mencione preço (R$ 36) + garantia (7 dias)' : 'Foque em curiosidade sem pressão'}
- CTA forte e direto

**VARIAÇÃO 2 (Alternativa - Ângulo Diferente):**
- Explore um ângulo secundário (ex: prova social, urgência, transformação)
- Mantenha consistência com objetivo

**VARIAÇÃO 3 (Teste A/B - Ângulo Criativo):**
- Ângulo mais criativo/arriscado
- Para testar hipóteses novas

---

## REGRAS CRÍTICAS:

**Primary Text:**
- 2-4 linhas (máximo 125 caracteres por linha)
- ${objectiveType === 'TRAFEGO' ? 'Hook de curiosidade' : objectiveType === 'CONVERSAO' ? 'Hook de dor + solução imediata' : 'Reconhecer objeção + garantia'}
- NÃO repita o que está na imagem (texto: "${creativeAnalysis.text_in_image || 'nenhum'}")
- Use números específicos (15h/semana, 2.000 médicos, R$ 36)

**Headline:**
- Máximo 27 caracteres
- Benefício claro e específico

**CTA:**
- Use um dos CTAs ideais: ${objective.cta_ideal.join(', ')}

**Complementar o Visual:**
${creativeAnalysis.technical_details.has_product 
  ? '- Imagem já mostra produto, foque na TRANSFORMAÇÃO'
  : '- Imagem é conceitual, pode mencionar produto'
}

---

## FORMATO JSON:

{
  "variations": [
    {
      "id": 1,
      "primary_text": "Texto de 2-4 linhas com quebras usando \\n",
      "headline": "Até 27 caracteres",
      "cta": "Texto do botão",
      "predicted_performance": 78,
      "performance_label": "CAMPEÃ",
      "reasoning": "Esta variação usa [ângulo X] que historicamente converte 40% melhor em campanhas de [objetivo]"
    },
    {
      "id": 2,
      "primary_text": "...",
      "headline": "...",
      "cta": "...",
      "predicted_performance": 65,
      "performance_label": "Alternativa",
      "reasoning": "Explora prova social que funciona bem com públicos frios"
    },
    {
      "id": 3,
      "primary_text": "...",
      "headline": "...",
      "cta": "...",
      "predicted_performance": 58,
      "performance_label": "Teste A/B",
      "reasoning": "Ângulo criativo para testar resposta emocional"
    }
  ],
  "generation_notes": "As 3 variações exploram: 1) Dor + Solução direta, 2) Prova social, 3) Transformação emocional"
}

**IMPORTANTE:** A previsão de performance deve ser baseada em:
- Alinhamento com objetivo (${objectiveType})
- Uso de gatilhos mentais comprovados
- Clareza do benefício
- Força do CTA
- Complementaridade com o visual

Gere as 3 variações AGORA. Retorne APENAS o JSON válido.`;

  try {
    console.log(`✍️ [Copy Generator] Gerando copies para objetivo: ${objectiveType} (usando ${OPENAI_MODEL})`);
    
    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: 'system',
          content: 'Você é um copywriter de elite especializado em Direct Response para produtos médicos, com histórico de campanhas que geram ROI de 5x+. Responda sempre em JSON válido.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.85, // Criatividade controlada
      max_tokens: 2500,
    });

    const responseContent = completion.choices[0]?.message?.content || '{}';
    const result = JSON.parse(responseContent);

    console.log(`✅ [Copy Generator] ${result.variations?.length || 0} variações geradas`);
    
    if (result.variations?.length > 0) {
      console.log(`🏆 Campeã prevista: Variação ${result.variations[0].id} (${result.variations[0].predicted_performance}%)`);
    }

    return {
      variations: result.variations || [],
      generation_notes: result.generation_notes || 'Variações geradas com sucesso'
    };

  } catch (error: any) {
    console.error('[Copy Generator] Erro:', error);
    throw new Error('Falha ao gerar copies: ' + error.message);
  }
}

/**
 * Regenerar apenas as copies (sem reanalisar o criativo)
 * Útil para o botão "Gerar Novas Copies"
 */
export async function regenerateCopies(
  objectiveType: ObjectiveType,
  creativeAnalysis: CreativeAnalysis,
  additionalContext?: string,
  previousVariations?: CopyVariation[]
): Promise<CopyGenerationResult> {
  
  // Adiciona instrução para gerar variações DIFERENTES das anteriores
  let enhancedContext = additionalContext || '';
  
  if (previousVariations && previousVariations.length > 0) {
    const previousAngles = previousVariations.map(v => v.reasoning).join('; ');
    enhancedContext += `\n\n⚠️ IMPORTANTE: Já foram geradas variações com os seguintes ângulos: ${previousAngles}. Agora gere variações com ÂNGULOS COMPLETAMENTE DIFERENTES.`;
  }
  
  return generateCopiesWithWinnerPrediction(objectiveType, creativeAnalysis, enhancedContext);
}
