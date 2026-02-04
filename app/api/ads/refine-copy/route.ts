/**
 * =====================================================
 * API: REFINAR COPY COM IA
 * =====================================================
 * Refina uma copy existente baseado em instruções do usuário
 * POST /api/ads/refine-copy
 * =====================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { verifyToken } from '@/lib/auth';

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

const OPENAI_MODEL = 'gpt-5.2';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    // Autenticação via cookie JWT
    const token = req.cookies.get('auth_token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Token não encontrado' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    console.log('🎨 [Refine Copy API] Usuário:', payload.email);

    const body = await req.json();
    const { 
      primary_text, 
      headline, 
      cta, 
      refinement_instructions,
      objective_type
    } = body;

    if (!refinement_instructions?.trim()) {
      return NextResponse.json({ error: 'Instruções de refinamento são obrigatórias' }, { status: 400 });
    }

    console.log('🎨 [Refine Copy] Instruções:', refinement_instructions);

    const prompt = `Você é um copywriter especialista em refinar copies de anúncios de Facebook Ads.

## COPY ATUAL:

**Primary Text:**
${primary_text}

**Headline:**
${headline}

**CTA:**
${cta}

---

## INSTRUÇÕES DE REFINAMENTO DO USUÁRIO:

"${refinement_instructions}"

---

## REGRAS OBRIGATÓRIAS (NUNCA QUEBRE):

### 1. TRAVESSÃO:
❌ NUNCA use travessão (—)
✅ Substituir por ponto, vírgula ou quebra de linha (\\n\\n)

### 2. LINHAS CURTAS:
✅ Máximo 12-15 palavras por linha
✅ Quebrar em parágrafos curtos

### 3. EMOJIS:
✅ Máximo 2 por copy
✅ Apenas se reforçarem benefício (📱⏱️✅💰)
❌ NUNCA em excesso

### 4. HEADLINE:
✅ Máximo 27 caracteres
✅ Benefício direto + especificidade

### 5. CTA:
✅ Verbo + benefício + risco zero
❌ NUNCA "Saiba Mais" ou "Clique Aqui"

### 6. NÚMEROS:
✅ Sempre específicos: 15h/semana, R$ 36, 2.000 médicos
❌ Nunca vagos: "muito tempo", "milhares"

---

## SUA TAREFA:

Refine a copy aplicando as instruções do usuário MAS mantendo TODAS as regras obrigatórias.

**Interpretação de instruções comuns:**
- "Mais direto" → Remover palavras desnecessárias, foco no benefício
- "Adicionar urgência" → Garantia de tempo limitado (se honesto)
- "Quebrar em linhas" → Dividir em parágrafos de 1-2 linhas
- "Remover emoji" → Retirar emojis mantendo clareza
- "CTA mais forte" → Verbo de ação + benefício direto
- "Mais curto" → Reduzir mantendo essência

**IMPORTANTE:** Se a instrução conflitar com as regras (ex: "adicionar travessão"), ignore a instrução e mantenha as regras.

## FORMATO JSON:

{
  "refined": {
    "primary_text": "Texto refinado com quebras de linha (use \\n\\n entre parágrafos)",
    "headline": "Headline refinada (máx 27 chars)",
    "cta": "CTA refinado (verbo + benefício)"
  },
  "changes_made": "Lista das mudanças feitas",
  "rules_applied": ["Regra 1 aplicada", "Regra 2 aplicada"]
}

Refine AGORA. Retorne APENAS JSON válido.`;

    const completion = await getOpenAI().chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: 'system',
          content: 'Você é um copywriter especialista em refinar copies seguindo regras rígidas de formatação. Responda sempre em JSON válido.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      max_completion_tokens: 1500,
      temperature: 0.7,
    });

    const result = JSON.parse(completion.choices[0]?.message?.content || '{}');

    console.log('✅ [Refine Copy] Refinamento concluído:', result.changes_made);

    return NextResponse.json({
      success: true,
      ...result
    });

  } catch (error: any) {
    console.error('[Refine Copy API] Erro:', error);
    return NextResponse.json({ 
      error: error.message || 'Erro ao refinar copy' 
    }, { status: 500 });
  }
}
