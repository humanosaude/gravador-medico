/**
 * 🤖 AI CAMPAIGN ADVISOR
 * 
 * Usa IA (OpenAI GPT-4) para analisar métricas de campanhas
 * e gerar dicas/insights acionáveis para otimização.
 */

import OpenAI from 'openai';
import { AdsMetrics, CampaignInsight } from './meta-marketing';

// Função para obter cliente OpenAI (lazy initialization)
function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY não configurada');
  }
  return new OpenAI({ apiKey });
}

// =====================================================
// TIPOS
// =====================================================

export interface CampaignInsightAI {
  type: 'success' | 'warning' | 'danger' | 'info';
  title: string;
  description: string;
  action?: string;
  metric?: string;
  priority: 'high' | 'medium' | 'low';
}

export interface AIAnalysisResult {
  summary: string;
  insights: CampaignInsightAI[];
  recommendations: string[];
  healthScore: number; // 0-100
  generatedAt: string;
}

export interface DashboardMetricsForAI {
  revenue: number;
  sales: number;
  visitors: number;
  conversionRate: number;
  averageOrderValue: number;
  revenueChange: number;
  salesChange: number;
}

// =====================================================
// PROMPTS
// =====================================================

const SYSTEM_PROMPT = `Você é um especialista em marketing digital e análise de campanhas de Facebook/Instagram Ads.
Sua função é analisar métricas de campanhas e fornecer insights acionáveis em português brasileiro.

Regras:
1. Seja direto e prático - foque em ações que o usuário pode tomar HOJE
2. Use números específicos quando possível (ex: "seu CPA está 30% acima do ideal")
3. Priorize insights por impacto no ROI
4. Considere benchmarks do mercado brasileiro de e-commerce
5. Identifique campanhas problemáticas e sugira correções específicas
6. Destaque oportunidades de escala em campanhas performando bem

Benchmarks de referência (e-commerce Brasil):
- CTR bom: > 1.5%
- CPC aceitável: < R$ 2.00
- ROAS saudável: > 3.0
- Taxa de conversão: > 2%
- CPM médio: R$ 15-30`;

function buildAnalysisPrompt(metrics: AdsMetrics, dashboardMetrics?: DashboardMetricsForAI): string {
  const topCampaigns = metrics.campaigns.slice(0, 10).map(c => ({
    name: c.campaign_name,
    spend: Number(c.spend),
    clicks: Number(c.clicks),
    impressions: Number(c.impressions),
    ctr: Number(c.ctr),
    cpc: Number(c.cpc),
    purchases: c.actions?.filter(a => 
      ['purchase', 'omni_purchase', 'offsite_conversion.fb_pixel_purchase'].includes(a.action_type)
    ).reduce((sum, a) => sum + Number(a.value), 0) || 0,
    status: c.effective_status,
  }));

  let prompt = `
## Métricas Gerais de Ads

- **Investimento Total:** R$ ${metrics.totalSpend.toFixed(2)}
- **Impressões:** ${metrics.totalImpressions.toLocaleString('pt-BR')}
- **Cliques:** ${metrics.totalClicks.toLocaleString('pt-BR')}
- **Alcance:** ${metrics.totalReach.toLocaleString('pt-BR')}
- **CTR Médio:** ${metrics.avgCtr.toFixed(2)}%
- **CPC Médio:** R$ ${metrics.avgCpc.toFixed(2)}
- **Compras (Meta):** ${metrics.totalPurchases}
- **ROAS:** ${metrics.roas.toFixed(2)}
- **CPA:** R$ ${metrics.cpa.toFixed(2)}
- **CPL:** R$ ${metrics.cpl.toFixed(2)}

## Top 10 Campanhas
${JSON.stringify(topCampaigns, null, 2)}
`;

  if (dashboardMetrics) {
    prompt += `
## Métricas do Dashboard (Vendas Reais)

- **Receita Total:** R$ ${dashboardMetrics.revenue.toFixed(2)}
- **Vendas:** ${dashboardMetrics.sales}
- **Visitantes:** ${dashboardMetrics.visitors.toLocaleString('pt-BR')}
- **Taxa de Conversão:** ${dashboardMetrics.conversionRate.toFixed(2)}%
- **Ticket Médio:** R$ ${dashboardMetrics.averageOrderValue.toFixed(2)}
- **Variação Receita:** ${dashboardMetrics.revenueChange > 0 ? '+' : ''}${dashboardMetrics.revenueChange.toFixed(1)}%
- **Variação Vendas:** ${dashboardMetrics.salesChange > 0 ? '+' : ''}${dashboardMetrics.salesChange.toFixed(1)}%
`;
  }

  prompt += `

## Sua Análise

Forneça uma análise em JSON com o seguinte formato:
{
  "summary": "Resumo executivo de 2-3 frases sobre a saúde geral das campanhas",
  "healthScore": 75, // Nota de 0 a 100 para saúde das campanhas
  "insights": [
    {
      "type": "warning", // success, warning, danger, info
      "title": "Título curto do insight",
      "description": "Explicação detalhada",
      "action": "Ação específica recomendada",
      "metric": "CPA alto", // métrica relacionada
      "priority": "high" // high, medium, low
    }
  ],
  "recommendations": [
    "Recomendação 1 clara e acionável",
    "Recomendação 2 clara e acionável"
  ]
}

Gere 3-5 insights mais relevantes e 3-5 recomendações práticas.`;

  return prompt;
}

// =====================================================
// FUNÇÕES PRINCIPAIS
// =====================================================

/**
 * Analisa métricas de campanhas usando IA
 */
export async function analyzeCampaigns(
  metrics: AdsMetrics,
  dashboardMetrics?: DashboardMetricsForAI
): Promise<AIAnalysisResult> {
  try {
    const prompt = buildAnalysisPrompt(metrics, dashboardMetrics);
    const openai = getOpenAIClient();

    const completion = await openai.chat.completions.create({
      model: 'gpt-5.1-chat', // Modelo recomendado para produção (mais rápido e barato que gpt-5.2)
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    });

    const content = completion.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('Resposta vazia da IA');
    }

    const result = JSON.parse(content) as Omit<AIAnalysisResult, 'generatedAt'>;

    return {
      ...result,
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Erro ao analisar com IA:', error);
    
    // Fallback: análise básica sem IA
    return generateFallbackAnalysis(metrics);
  }
}

/**
 * Análise rápida de uma campanha específica
 */
export async function analyzeSingleCampaign(campaign: CampaignInsight): Promise<string> {
  try {
    const prompt = `
Analise esta campanha de Facebook Ads e dê 2-3 dicas práticas em português:

- Nome: ${campaign.campaign_name}
- Gasto: R$ ${campaign.spend}
- Impressões: ${campaign.impressions}
- Cliques: ${campaign.clicks}
- CTR: ${campaign.ctr}%
- CPC: R$ ${campaign.cpc}
- Status: ${campaign.effective_status}

Seja conciso e direto. Máximo 150 palavras.
`;
    const openai = getOpenAIClient();

    const completion = await openai.chat.completions.create({
      model: 'gpt-5.1-chat', // Modelo recomendado para produção
      messages: [
        { role: 'system', content: 'Você é um especialista em Facebook Ads. Responda em português brasileiro de forma concisa.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 300
    });

    return completion.choices[0]?.message?.content || 'Não foi possível gerar análise.';
  } catch (error) {
    console.error('❌ Erro ao analisar campanha:', error);
    return 'Erro ao processar análise. Tente novamente.';
  }
}

/**
 * Gera perguntas/respostas sobre as campanhas (chat)
 */
export async function chatAboutCampaigns(
  question: string,
  metrics: AdsMetrics,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
): Promise<string> {
  try {
    const context = `
Contexto das campanhas:
- Investimento: R$ ${metrics.totalSpend.toFixed(2)}
- ROAS: ${metrics.roas.toFixed(2)}
- CPA: R$ ${metrics.cpa.toFixed(2)}
- CTR: ${metrics.avgCtr.toFixed(2)}%
- Campanhas ativas: ${metrics.campaigns.filter(c => c.effective_status === 'ACTIVE').length}
- Total de campanhas: ${metrics.campaigns.length}
`;

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { 
        role: 'system', 
        content: `${SYSTEM_PROMPT}\n\n${context}\n\nResponda perguntas sobre estas campanhas de forma útil e prática.` 
      },
      ...conversationHistory,
      { role: 'user', content: question }
    ];

    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: 'gpt-5.1-chat', // Modelo recomendado para produção
      messages,
      temperature: 0.7,
      max_tokens: 500
    });

    return completion.choices[0]?.message?.content || 'Não entendi sua pergunta. Pode reformular?';
  } catch (error) {
    console.error('❌ Erro no chat:', error);
    return 'Erro ao processar sua pergunta. Tente novamente.';
  }
}

// =====================================================
// FALLBACK (quando API falha)
// =====================================================

function generateFallbackAnalysis(metrics: AdsMetrics): AIAnalysisResult {
  const insights: CampaignInsightAI[] = [];
  
  // Análise de ROAS
  if (metrics.roas < 2) {
    insights.push({
      type: 'danger',
      title: 'ROAS abaixo do ideal',
      description: `Seu ROAS atual de ${metrics.roas.toFixed(2)} está abaixo do recomendado (3.0). Isso significa que você está perdendo dinheiro nas campanhas.`,
      action: 'Revise os criativos e segmentação das campanhas com menor performance.',
      metric: `ROAS: ${metrics.roas.toFixed(2)}`,
      priority: 'high'
    });
  } else if (metrics.roas >= 4) {
    insights.push({
      type: 'success',
      title: 'ROAS excelente!',
      description: `Seu ROAS de ${metrics.roas.toFixed(2)} está ótimo. Considere aumentar o investimento nas campanhas que mais convertem.`,
      action: 'Aumente o orçamento das top 3 campanhas em 20-30%.',
      metric: `ROAS: ${metrics.roas.toFixed(2)}`,
      priority: 'medium'
    });
  }

  // Análise de CTR
  if (metrics.avgCtr < 1) {
    insights.push({
      type: 'warning',
      title: 'CTR baixo',
      description: `CTR médio de ${metrics.avgCtr.toFixed(2)}% indica que os criativos não estão atraindo atenção suficiente.`,
      action: 'Teste novos criativos com headlines mais chamativos e imagens de maior impacto.',
      metric: `CTR: ${metrics.avgCtr.toFixed(2)}%`,
      priority: 'medium'
    });
  }

  // Análise de CPC
  if (metrics.avgCpc > 3) {
    insights.push({
      type: 'warning',
      title: 'CPC elevado',
      description: `CPC médio de R$ ${metrics.avgCpc.toFixed(2)} está acima do benchmark do mercado.`,
      action: 'Revise a segmentação para públicos mais qualificados e menos competitivos.',
      metric: `CPC: R$ ${metrics.avgCpc.toFixed(2)}`,
      priority: 'medium'
    });
  }

  // Campanhas pausadas
  const pausedCampaigns = metrics.campaigns.filter(c => c.effective_status === 'PAUSED').length;
  if (pausedCampaigns > metrics.campaigns.length * 0.5) {
    insights.push({
      type: 'info',
      title: 'Muitas campanhas pausadas',
      description: `${pausedCampaigns} de ${metrics.campaigns.length} campanhas estão pausadas.`,
      action: 'Revise as campanhas pausadas e reative as que tinham bom potencial.',
      priority: 'low'
    });
  }

  // Calcula health score
  let healthScore = 70;
  if (metrics.roas >= 3) healthScore += 15;
  if (metrics.roas < 2) healthScore -= 20;
  if (metrics.avgCtr >= 1.5) healthScore += 10;
  if (metrics.avgCtr < 1) healthScore -= 10;
  if (metrics.avgCpc <= 2) healthScore += 5;
  if (metrics.avgCpc > 3) healthScore -= 5;

  healthScore = Math.max(0, Math.min(100, healthScore));

  return {
    summary: `Análise de ${metrics.campaigns.length} campanhas com investimento total de R$ ${metrics.totalSpend.toFixed(2)}. ${
      metrics.roas >= 3 ? 'Performance geral positiva.' : 'Há oportunidades de otimização.'
    }`,
    insights,
    recommendations: [
      'Revise semanalmente as métricas de cada campanha',
      'Faça testes A/B constantes nos criativos',
      'Monitore o ROAS diariamente e pause campanhas abaixo de 2.0',
      'Segmente públicos lookalike baseados nos seus melhores clientes'
    ],
    healthScore,
    generatedAt: new Date().toISOString()
  };
}

// =====================================================
// CACHE HELPERS
// =====================================================

/**
 * Chave de cache para análise (invalida a cada 6 horas)
 */
export function getAnalysisCacheKey(): string {
  const now = new Date();
  const period = Math.floor(now.getTime() / (6 * 60 * 60 * 1000));
  return `ai-analysis-${period}`;
}
