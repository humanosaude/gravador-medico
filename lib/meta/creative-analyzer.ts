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
  
  // === CAMPOS EXTRAS DE VÍDEO (opcionais) ===
  transcription?: string; // Transcrição do áudio via Whisper
  frame_count?: number;   // Quantidade de frames analisados
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
    
    const completion = await getOpenAI().chat.completions.create({
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
      max_completion_tokens: 2000,
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

  // Framework de Copy Avançado 2026
  const copyFramework = {
    TRAFEGO: {
      estrutura: 'AIDA ou SCQA (Storytelling)',
      gancho: 'CURIOSIDADE - "Você sabia que..." ou número chocante',
      tom: 'Consultivo e educativo',
      foco: 'Problema sem pressão',
      cta_examples: ['Ver Como Funciona', 'Assistir Demonstração', 'Descobrir Mais']
    },
    CONVERSAO: {
      estrutura: 'PAS (Problem-Agitate-Solution)',
      gancho: 'DOR ESPECÍFICA - Pergunta direta com dor',
      tom: 'Direto e urgente (sem ser falso)',
      foco: 'Oferta + Garantia + Preço',
      cta_examples: ['Começar Agora por R$ 36', 'Garantir Acesso Vitalício', 'Testar por 7 Dias']
    },
    REMARKETING: {
      estrutura: 'PPPS (Promessa-Problema-Prova-Solução)',
      gancho: 'RECONHECIMENTO - Reconhecer que já viu/considerou',
      tom: 'Empático e removedor de objeções',
      foco: 'Prova social + Garantia',
      cta_examples: ['Testar Sem Risco', 'Resgatar Oferta', 'Finalizar Compra']
    }
  };

  const framework = copyFramework[objectiveType];

  const prompt = `Você é um copywriter de elite combinando David Ogilvy + Claude Hopkins, especializado em Direct Response para Facebook Ads.

## 🎯 FRAMEWORK DE COPY 2026 (Nível Sênior)

### PRINCÍPIO: COPY = ARQUITETURA, NÃO ARTE
"Uma copy não é escrita - é MONTADA como um quebra-cabeça"

---

## 📦 PRODUTO: Gravador Médico

**Proposta Central:** ${product.proposta_central}
**Dor Principal:** ${product.dor.principal}
**Manifestações:** ${product.dor.manifestacoes.slice(0, 3).join(', ')}
**Benefício Core:** ${product.beneficios.economia_tempo}
**Preço:** R$ 36 pagamento único (${product.preco.acesso})
**Garantia:** 7 dias sem perguntas
**Prova Social:** ${product.prova_social.usuarios_ativos}

---

## 🎯 OBJETIVO: ${objective.label.toUpperCase()}

**Estrutura Recomendada:** ${framework.estrutura}
**Tipo de Gancho:** ${framework.gancho}
**Tom:** ${framework.tom}
**Foco:** ${framework.foco}
**CTAs Ideais:** ${framework.cta_examples.join(', ')}

---

## 🖼️ ANÁLISE DO CRIATIVO

**Formato:** ${creativeAnalysis.format}
**Elementos Visuais:** ${creativeAnalysis.visual_elements.join(', ')}
**Mood/Atmosfera:** ${creativeAnalysis.mood}
**Texto na Imagem:** "${creativeAnalysis.text_in_image || 'Nenhum'}"
**Qualidade:** ${creativeAnalysis.technical_details.visual_quality_score}/10
${creativeAnalysis.technical_details.has_product ? '✅ Mostra produto' : '❌ Não mostra produto'}
${creativeAnalysis.technical_details.has_people ? '✅ Tem pessoas' : '❌ Sem pessoas'}
${creativeAnalysis.format === 'VIDEO' && creativeAnalysis.transcription ? `
---
## 🎬 ANÁLISE DE VÍDEO (TRANSCRIÇÃO)

**Frames Analisados:** ${creativeAnalysis.frame_count || 'N/A'}
**Transcrição do Áudio (Whisper):**
"${creativeAnalysis.transcription.substring(0, 1000)}${creativeAnalysis.transcription.length > 1000 ? '...' : ''}"

⚠️ IMPORTANTE: A copy deve COMPLEMENTAR o vídeo, não repetir o que já é dito no áudio.
Use os hooks e pontos principais da transcrição como base para criar copies que reforçam a mensagem.
` : ''}
**Ângulos Recomendados pela Análise Visual:**
${creativeAnalysis.recommended_angles.map((a, i) => `${i + 1}. ${a}`).join('\n')}

${additionalContext ? `\n**Contexto Adicional:**\n${additionalContext}\n` : ''}

---

## 📝 ESTRUTURA DAS 4 CAMADAS (Obrigatório)

### LAYER 1: GANCHO (Hook) - Primeiras palavras
Objetivo: Parar o scroll em 0,3 segundos
${objectiveType === 'TRAFEGO' ? '→ Use CURIOSIDADE: "2.000 médicos descobriram como nunca mais..."' : ''}
${objectiveType === 'CONVERSAO' ? '→ Use DOR ESPECÍFICA: "Médico, você fica até 2h da manhã digitando?"' : ''}
${objectiveType === 'REMARKETING' ? '→ Use RECONHECIMENTO: "Você considerou o Gravador Médico..."' : ''}

### LAYER 2: CONEXÃO (Interest) - Linhas 2-3
Objetivo: Fazer pensar "isso é para mim"
→ Agitar a dor OU Mostrar antes/depois OU Identificação + Promessa

### LAYER 3: AMPLIFICAÇÃO (Desire) - Linhas 4-5
Objetivo: Tornar irresistível com gatilhos mentais
GATILHOS OBRIGATÓRIOS:
- ✅ Prova Social: "2.000+ médicos ativos"
- ✅ Especificidade: "15h/semana", "30 segundos"
- ✅ Contraste: "Antes 3h digitando → Agora 30s"
${objectiveType === 'CONVERSAO' || objectiveType === 'REMARKETING' ? '- ✅ Preço + Garantia: "R$ 36 único, 7 dias de garantia"' : ''}

### LAYER 4: AÇÃO (CTA) - Call to Action
Fórmula: [VERBO] + [BENEFÍCIO] + [REMOÇÃO DE RISCO]

---

## ⚠️ REGRAS CRÍTICAS DE FORMATAÇÃO (NUNCA VIOLAR)

### TRAVESSÃO E PONTUAÇÃO:
❌ NUNCA use travessão (—) → Substituir por vírgulas, pontos ou quebra de linha
❌ Errado: "Médico, você perde 15h/semana — e isso afasta você da família"
✅ Correto: "Médico, você perde 15h/semana.\nIsso afasta você da família e compromete sua saúde."

### QUEBRAS DE LINHA:
✅ Máximo 12-15 palavras por linha
✅ Usar \\n\\n entre blocos lógicos
✅ Estrutura: [Gancho 1-2 linhas] \\n\\n [Conexão 1-2 linhas] \\n\\n [Amplificação + CTA]

### EMOJIS:
✅ Máximo 2 emojis por copy
✅ APENAS onde reforçam benefício (📱 iPhone, ⏱️ tempo, ✅ garantia, 💰 preço)
❌ NUNCA em excesso (parece spam)

### HEADLINE (Máx 27 caracteres):
Fórmula: [BENEFÍCIO DIRETO] + [ESPECIFICIDADE]
❌ Ruim: "Solução para médicos" / "Economia de tempo"
✅ BOM: "Prontuário em 30 segundos" / "Economize 15h por semana"

### CTA (Call to Action):
Fórmula: [VERBO DE AÇÃO] + [BENEFÍCIO IMEDIATO] + [REMOÇÃO DE RISCO]
❌ Ruim: "Saiba Mais" / "Clique Aqui"
✅ BOM: "Testar Grátis por 7 Dias" / "Começar Agora por R$ 36"

### OUTRAS PROIBIÇÕES:
❌ PROIBIDO: Jargão corporativo ("solução inovadora revolucionária")
❌ PROIBIDO: Generalização ("economize tempo" sem número)
❌ PROIBIDO: Urgência FALSA ("últimas 3 vagas")
❌ PROIBIDO: Foco em features ("tem IA" - e daí?)
❌ PROIBIDO: Repetir texto que já está na imagem ("${creativeAnalysis.text_in_image || 'nenhum'}")

✅ OBRIGATÓRIO: Números específicos (15h/semana, R$ 36, 2.000 médicos)
✅ OBRIGATÓRIO: Complementar (não repetir) o visual
✅ OBRIGATÓRIO: Benefício claro em cada linha
✅ OBRIGATÓRIO: Tom de voz usando "VOCÊ" (não "médicos" na terceira pessoa)

---

## 🎯 GERE 3 VARIAÇÕES:

**VARIAÇÃO 1 - CAMPEÃ (75-85% performance prevista):**
- Estrutura: ${framework.estrutura}
- Ângulo mais comprovado para ${objectiveType}
- Todos os gatilhos mentais aplicados

**VARIAÇÃO 2 - ALTERNATIVA (60-74% performance):**
- Ângulo diferente (prova social OU transformação OU contraste)
- Mantém estrutura base

**VARIAÇÃO 3 - TESTE A/B (50-65% performance):**
- Ângulo mais criativo/arriscado
- Para testar hipóteses novas

---

## 📋 FORMATO JSON EXATO:

{
  "variations": [
    {
      "id": 1,
      "primary_text": "[GANCHO]\\n\\n[CONEXÃO]\\n\\n[AMPLIFICAÇÃO]${objectiveType !== 'TRAFEGO' ? '\\n\\nR$ 36 único. Garantia de 7 dias.' : ''}",
      "headline": "Até 27 caracteres máximo",
      "cta": "${framework.cta_examples[0]}",
      "predicted_performance": 82,
      "performance_label": "🏆 CAMPEÃ",
      "reasoning": "Usa estrutura ${framework.estrutura} com gancho de ${framework.gancho.split(' - ')[0].toLowerCase()}, aplicando gatilhos de prova social e especificidade."
    },
    {
      "id": 2,
      "primary_text": "...",
      "headline": "...",
      "cta": "...",
      "predicted_performance": 68,
      "performance_label": "Alternativa",
      "reasoning": "Explora ângulo de [X] que funciona bem com público [Y]"
    },
    {
      "id": 3,
      "primary_text": "...",
      "headline": "...",
      "cta": "...",
      "predicted_performance": 55,
      "performance_label": "Teste A/B",
      "reasoning": "Ângulo criativo testando [hipótese]"
    }
  ],
  "generation_notes": "Variações exploram: 1) [X], 2) [Y], 3) [Z]. Todas seguem framework ${framework.estrutura}."
}

GERE AGORA. Retorne APENAS o JSON válido.`;

  try {
    console.log(`✍️ [Copy Generator] Gerando copies para objetivo: ${objectiveType} (usando ${OPENAI_MODEL})`);
    
    const completion = await getOpenAI().chat.completions.create({
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
      max_completion_tokens: 2500,
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
