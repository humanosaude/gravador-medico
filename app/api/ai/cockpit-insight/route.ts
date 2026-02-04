/**
 * 🧠 API de Análise IA para Cockpit de Campanhas
 * 
 * Utiliza GPT-4o para analisar métricas de Meta Ads e gerar insights acionáveis
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';

// Modelo mais atual da OpenAI
const OPENAI_MODEL = 'gpt-4o';

// Lazy initialization
let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY não configurada');
    _openai = new OpenAI({ apiKey });
  }
  return _openai;
}

// =====================================================
// TIPOS
// =====================================================

interface CampaignData {
  campaign_id: string;
  campaign_name: string;
  spend: number;
  reach: number;
  impressions: number;
  clicks: number;
  link_clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  landing_page_views: number;
  checkout_initiated: number;
  purchases: number;
  purchase_value: number;
  roas: number;
  profit_value: number;
  cost_per_purchase: number;
  funnel_stage?: string;
}

interface CockpitData {
  period: { since: string; until: string };
  summary: {
    total_spend: number;
    total_reach: number;
    total_impressions: number;
    total_clicks: number;
    total_link_clicks: number;
    total_landing_page_views: number;
    total_checkouts: number;
    total_purchases: number;
    total_revenue: number;
    avg_cpm: number;
    avg_cpc: number;
    avg_ctr: number;
    avg_connect_rate: number;
    avg_checkout_rate: number;
    overall_roas: number;
    overall_profit: number;
    avg_ticket: number;
  };
  campaigns: CampaignData[];
  funnel_analysis: {
    topo: CampaignData[];
    meio: CampaignData[];
    fundo: CampaignData[];
  };
}

interface AIAction {
  priority: number;
  action: string;
  reason: string;
  expectedImpact: string;
  urgency: 'CRÍTICO' | 'ALTO' | 'MÉDIO' | 'BAIXO';
}

interface CampaignInsight {
  campaignName: string;
  status: 'winner' | 'loser' | 'potential';
  analysis: string;
  recommendation: string;
  metrics: {
    spend: number;
    roas: number;
    cpa: number;
    ctr: number;
  };
}

interface CockpitAIResponse {
  accountStatus: 'SAUDÁVEL' | 'ATENÇÃO' | 'CRÍTICO';
  summary: string;
  healthScore: number;
  
  executiveSummary: {
    verdict: string;
    spendEfficiency: number;
    biggestWin: string;
    biggestThreat: string;
  };
  
  immediateActions: AIAction[];
  campaignInsights: CampaignInsight[];
  
  funnelAnalysis: {
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  };
  
  budgetRecommendation: {
    scale: string[];
    reduce: string[];
    pause: string[];
  };
  
  generatedAt: string;
}

// =====================================================
// PROMPT DO SISTEMA
// =====================================================

const SYSTEM_PROMPT = `Você é o "Performance Intelligence Engine" do Gravador Médico, uma IA especialista em Meta Ads (Facebook/Instagram).

CONTEXTO DO NEGÓCIO:
- Produto: Gravador Médico - app para médicos gravarem consultas e gerarem prontuários automaticamente
- Preço: Low ticket (R$ 34-97/mês)
- Público: Médicos brasileiros
- Meta de ROAS: ≥ 2.0 (mínimo), ≥ 3.0 (bom), ≥ 5.0 (excelente)

BENCHMARKS DE REFERÊNCIA:
- CTR bom: > 1.5%
- CPC máximo aceitável: R$ 2.00
- CPM saudável: < R$ 50
- Taxa de conversão LP > Checkout: > 5%
- Taxa Checkout > Compra: > 30%

REGRAS DE ANÁLISE:
1. Identifique campanhas vencedoras (ROAS > 2, escalar)
2. Identifique campanhas perdedoras (ROAS < 1, pausar ou otimizar)
3. Analise funil completo (topo/meio/fundo)
4. Detecte desperdício de budget
5. Sugira otimizações específicas e acionáveis
6. Priorize ações por impacto esperado

FORMATO DE RESPOSTA (JSON):
{
  "accountStatus": "SAUDÁVEL|ATENÇÃO|CRÍTICO",
  "summary": "Resumo executivo em 2-3 frases",
  "healthScore": 0-100,
  "executiveSummary": {
    "verdict": "Avaliação geral da conta",
    "spendEfficiency": 0-100,
    "biggestWin": "Maior vitória identificada",
    "biggestThreat": "Maior ameaça/problema"
  },
  "immediateActions": [
    {
      "priority": 1-5,
      "action": "Ação específica",
      "reason": "Por que fazer isso",
      "expectedImpact": "Impacto esperado (em R$ ou %)",
      "urgency": "CRÍTICO|ALTO|MÉDIO|BAIXO"
    }
  ],
  "campaignInsights": [
    {
      "campaignName": "Nome da campanha",
      "status": "winner|loser|potential",
      "analysis": "Análise detalhada",
      "recommendation": "O que fazer",
      "metrics": { "spend": 0, "roas": 0, "cpa": 0, "ctr": 0 }
    }
  ],
  "funnelAnalysis": {
    "strengths": ["Pontos fortes do funil"],
    "weaknesses": ["Pontos fracos"],
    "recommendations": ["Recomendações específicas"]
  },
  "budgetRecommendation": {
    "scale": ["Campanhas para aumentar budget"],
    "reduce": ["Campanhas para reduzir budget"],
    "pause": ["Campanhas para pausar"]
  }
}

Seja EXTREMAMENTE específico. Cite nomes de campanhas, valores em R$ e percentuais reais.`;

// =====================================================
// PREPARAR DADOS PARA IA
// =====================================================

function prepareDataForAI(data: CockpitData): string {
  const { summary, campaigns, funnel_analysis, period } = data;
  
  return `
PERÍODO: ${period.since} até ${period.until}

═══════════════════════════════════════════════════════
RESUMO GERAL DA CONTA
═══════════════════════════════════════════════════════
- Gasto Total: R$ ${summary.total_spend.toFixed(2)}
- Receita Total: R$ ${summary.total_revenue.toFixed(2)}
- ROAS Geral: ${summary.overall_roas.toFixed(2)}x
- Lucro/Prejuízo: R$ ${summary.overall_profit.toFixed(2)}
- Total de Compras: ${summary.total_purchases}
- Ticket Médio: R$ ${summary.avg_ticket.toFixed(2)}

═══════════════════════════════════════════════════════
MÉTRICAS DE TRÁFEGO
═══════════════════════════════════════════════════════
- Alcance: ${summary.total_reach.toLocaleString()} pessoas
- Impressões: ${summary.total_impressions.toLocaleString()}
- Cliques: ${summary.total_clicks.toLocaleString()}
- CTR Médio: ${summary.avg_ctr.toFixed(2)}%
- CPC Médio: R$ ${summary.avg_cpc.toFixed(2)}
- CPM Médio: R$ ${summary.avg_cpm.toFixed(2)}

═══════════════════════════════════════════════════════
FUNIL DE CONVERSÃO
═══════════════════════════════════════════════════════
- Link Clicks: ${summary.total_link_clicks}
- Landing Page Views: ${summary.total_landing_page_views}
- Taxa de Conexão: ${summary.avg_connect_rate.toFixed(2)}%
- Checkouts Iniciados: ${summary.total_checkouts}
- Taxa Checkout: ${summary.avg_checkout_rate.toFixed(2)}%
- Compras: ${summary.total_purchases}

═══════════════════════════════════════════════════════
CAMPANHAS DETALHADAS (${campaigns.length} total)
═══════════════════════════════════════════════════════
${campaigns.map((c, i) => `
${i + 1}. ${c.campaign_name}
   Gasto: R$ ${c.spend.toFixed(2)} | Receita: R$ ${c.purchase_value.toFixed(2)}
   ROAS: ${c.roas.toFixed(2)}x | Lucro: R$ ${c.profit_value.toFixed(2)}
   Compras: ${c.purchases} | CPA: R$ ${c.cost_per_purchase.toFixed(2)}
   CTR: ${c.ctr.toFixed(2)}% | CPC: R$ ${c.cpc.toFixed(2)}
   Funil: ${c.funnel_stage || 'não classificado'}
`).join('\n')}

═══════════════════════════════════════════════════════
ANÁLISE POR ESTÁGIO DO FUNIL
═══════════════════════════════════════════════════════
TOPO (${funnel_analysis.topo.length} campanhas):
${funnel_analysis.topo.length > 0 
  ? funnel_analysis.topo.map(c => `- ${c.campaign_name}: Gasto R$ ${c.spend.toFixed(2)}, ROAS ${c.roas.toFixed(2)}x`).join('\n')
  : '- Nenhuma campanha de topo identificada'}

MEIO (${funnel_analysis.meio.length} campanhas):
${funnel_analysis.meio.length > 0 
  ? funnel_analysis.meio.map(c => `- ${c.campaign_name}: Gasto R$ ${c.spend.toFixed(2)}, ROAS ${c.roas.toFixed(2)}x`).join('\n')
  : '- Nenhuma campanha de meio identificada'}

FUNDO (${funnel_analysis.fundo.length} campanhas):
${funnel_analysis.fundo.length > 0 
  ? funnel_analysis.fundo.map(c => `- ${c.campaign_name}: Gasto R$ ${c.spend.toFixed(2)}, ROAS ${c.roas.toFixed(2)}x`).join('\n')
  : '- Nenhuma campanha de fundo identificada'}
`;
}

// =====================================================
// HANDLER
// =====================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { data } = body as { data: CockpitData };
    
    if (!data || !data.summary) {
      return NextResponse.json({
        success: false,
        error: 'Dados do cockpit inválidos'
      }, { status: 400 });
    }
    
    console.log('🧠 [AI Cockpit] Iniciando análise com GPT-4o...');
    console.log('📊 [AI Cockpit] Campanhas:', data.campaigns.length);
    console.log('💰 [AI Cockpit] Gasto total:', data.summary.total_spend.toFixed(2));
    
    const preparedData = prepareDataForAI(data);
    
    const openai = getOpenAI();
    
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { 
          role: 'user', 
          content: `Analise os seguintes dados de campanhas Meta Ads e gere insights estratégicos:\n\n${preparedData}` 
        }
      ],
      temperature: 0.3,
      max_completion_tokens: 3000,
      response_format: { type: 'json_object' }
    });
    
    const content = response.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('Resposta vazia da IA');
    }
    
    const aiResponse = JSON.parse(content) as Omit<CockpitAIResponse, 'generatedAt'>;
    
    console.log('✅ [AI Cockpit] Análise concluída:', {
      status: aiResponse.accountStatus,
      healthScore: aiResponse.healthScore,
      actionsCount: aiResponse.immediateActions?.length || 0
    });
    
    return NextResponse.json({
      success: true,
      ...aiResponse,
      generatedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ [AI Cockpit] Erro:', error);
    
    // Fallback com análise básica
    return NextResponse.json({
      success: true,
      accountStatus: 'ATENÇÃO',
      summary: 'Análise automática não disponível no momento. Verifique os dados manualmente.',
      healthScore: 60,
      executiveSummary: {
        verdict: 'Análise em processamento',
        spendEfficiency: 0,
        biggestWin: 'Dados insuficientes',
        biggestThreat: 'Dados insuficientes'
      },
      immediateActions: [
        {
          priority: 1,
          action: 'Verificar campanhas com ROAS abaixo de 1.0',
          reason: 'Campanhas não rentáveis consomem budget sem retorno',
          expectedImpact: 'Economia potencial no budget',
          urgency: 'ALTO'
        }
      ],
      campaignInsights: [],
      funnelAnalysis: {
        strengths: [],
        weaknesses: ['Análise não disponível'],
        recommendations: ['Tente novamente em alguns minutos']
      },
      budgetRecommendation: {
        scale: [],
        reduce: [],
        pause: []
      },
      generatedAt: new Date().toISOString()
    });
  }
}

// =====================================================
// HANDLER GET - Chat com contexto
// =====================================================

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const question = searchParams.get('question');
  
  if (!question) {
    return NextResponse.json({
      success: false,
      error: 'Parâmetro "question" é obrigatório'
    }, { status: 400 });
  }
  
  try {
    const openai = getOpenAI();
    
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { 
          role: 'system', 
          content: `Você é um especialista em Meta Ads do Gravador Médico. Responda perguntas sobre campanhas, métricas e otimização de forma clara e objetiva em português brasileiro.` 
        },
        { role: 'user', content: question }
      ],
      temperature: 0.5,
      max_completion_tokens: 1000
    });
    
    return NextResponse.json({
      success: true,
      answer: response.choices[0]?.message?.content || 'Sem resposta',
      generatedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ [AI Cockpit Chat] Erro:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro ao processar pergunta'
    }, { status: 500 });
  }
}
