/**
 * 🧠 IA DE ANÁLISE DE CAMPANHAS
 * 
 * Sistema inteligente que analisa campanhas baseado em:
 * - Funil de Consciência do Consumidor
 * - Métricas de Performance
 * - Benchmarks do Mercado
 * 
 * Gera recomendações personalizadas para otimização
 */

import OpenAI from 'openai';

// =====================================================
// TIPOS
// =====================================================

export interface CampaignForAnalysis {
  campaign_id: string;
  campaign_name: string;
  spend: number;
  reach: number;
  impressions: number;
  frequency: number;
  cpm: number;
  clicks: number;
  link_clicks: number;
  cpc: number;
  ctr: number;
  landing_page_views: number;
  connect_rate: number;
  checkout_initiated: number;
  purchases: number;
  purchase_value: number;
  roas: number;
  profit_value: number;
  ticket_medio: number;
  funnel_stage?: 'topo' | 'meio' | 'fundo';
  consciousness_level?: string;
}

export interface CampaignAnalysisResult {
  campaign_id: string;
  campaign_name: string;
  
  // Diagnóstico
  health_score: number; // 0-100
  health_status: 'excelente' | 'bom' | 'atencao' | 'critico';
  
  // Classificação de Consciência
  funnel_stage: 'topo' | 'meio' | 'fundo';
  consciousness_level: string;
  consciousness_strategy: string;
  
  // Problemas Identificados
  issues: Array<{
    type: 'critical' | 'warning' | 'info';
    metric: string;
    current_value: number;
    benchmark: number;
    message: string;
    impact: string;
  }>;
  
  // Recomendações
  recommendations: Array<{
    priority: 'alta' | 'media' | 'baixa';
    category: 'criativo' | 'publico' | 'orcamento' | 'copy' | 'landing_page';
    action: string;
    expected_impact: string;
  }>;
  
  // Insights de IA
  ai_summary: string;
  ai_insights: string[];
}

export interface FullAnalysisResult {
  timestamp: string;
  period: { since: string; until: string };
  
  // Resumo Geral
  overall_health: number;
  overall_status: string;
  total_campaigns: number;
  
  // Análise por Funil
  funnel_summary: {
    topo: { count: number; spend: number; avg_ctr: number; avg_cpm: number };
    meio: { count: number; spend: number; avg_connect_rate: number; leads: number };
    fundo: { count: number; spend: number; avg_roas: number; purchases: number };
  };
  
  // Análises Individuais
  campaigns: CampaignAnalysisResult[];
  
  // Insights Gerais de IA
  ai_general_summary: string;
  ai_top_opportunities: string[];
  ai_main_risks: string[];
}

// =====================================================
// BENCHMARKS DO MERCADO
// =====================================================

const BENCHMARKS = {
  // CTR por estágio do funil
  ctr: {
    topo: { min: 0.5, good: 1.0, excellent: 2.0 },
    meio: { min: 1.0, good: 2.0, excellent: 3.0 },
    fundo: { min: 1.5, good: 3.0, excellent: 5.0 }
  },
  // CPM por estágio
  cpm: {
    topo: { max: 30, good: 20, excellent: 10 },
    meio: { max: 50, good: 35, excellent: 20 },
    fundo: { max: 80, good: 50, excellent: 30 }
  },
  // CPC
  cpc: {
    topo: { max: 2.0, good: 1.0, excellent: 0.5 },
    meio: { max: 3.0, good: 1.5, excellent: 0.8 },
    fundo: { max: 5.0, good: 2.5, excellent: 1.0 }
  },
  // Connect Rate (PV / Cliques)
  connect_rate: {
    min: 50, good: 70, excellent: 85
  },
  // Checkout Rate (Checkout / PV)
  checkout_rate: {
    min: 5, good: 10, excellent: 20
  },
  // ROAS
  roas: {
    min: 1.0, good: 2.0, excellent: 3.0, excelente: 5.0
  },
  // Frequência
  frequency: {
    topo: { max: 3, warning: 5 },
    meio: { max: 4, warning: 6 },
    fundo: { max: 5, warning: 8 }
  }
};

// =====================================================
// ESTRATÉGIAS POR NÍVEL DE CONSCIÊNCIA
// =====================================================

const CONSCIOUSNESS_STRATEGIES: Record<string, {
  description: string;
  objective: string;
  platforms: string[];
  content_type: string[];
  kpis: string[];
}> = {
  'inconsciente': {
    description: 'Não conhece o produto nem o problema que ele resolve',
    objective: 'Informar sobre a existência de um problema que o consumidor ainda não reconhece',
    platforms: ['YouTube', 'Facebook', 'Instagram (Reels/Stories)'],
    content_type: ['Vídeos educativos', 'Posts de blog', 'Estudos de caso', 'Podcasts'],
    kpis: ['Alcance', 'Impressões', 'View Rate', 'Engajamento']
  },
  'problema': {
    description: 'Reconhece o problema mas não se preocupa ou não busca solução',
    objective: 'Destacar o problema e iniciar o reconhecimento da necessidade',
    platforms: ['YouTube', 'Facebook', 'Instagram'],
    content_type: ['Campanhas de conscientização', 'Quiz/Questionário', 'Isca Digital'],
    kpis: ['CTR', 'Tempo de visualização', 'Engajamento', 'Downloads']
  },
  'solucao': {
    description: 'Sabe o tipo de solução que vai resolver o problema (mecanismo)',
    objective: 'Mostrar diferentes maneiras de resolver o problema',
    platforms: ['Facebook', 'Instagram', 'Google'],
    content_type: ['Webinar', 'Demo de produto', 'Vídeos de branding', 'Comparativos'],
    kpis: ['Cliques', 'Landing Page Views', 'Leads', 'Connect Rate']
  },
  'produto': {
    description: 'Já sabe e conhece o produto, na dúvida se é confiável',
    objective: 'Apresentar prova social e diferenciação',
    platforms: ['YouTube', 'Google', 'Retargeting'],
    content_type: ['Depoimentos', 'Cases de sucesso', 'Garantias', 'FAQ'],
    kpis: ['Checkouts iniciados', 'Add to cart', 'Conversion Rate']
  },
  'totalmente_consciente': {
    description: 'Esperando uma promoção ou momento certo para comprar',
    objective: 'Converter com urgência e escassez',
    platforms: ['Google', 'Email', 'Remarketing'],
    content_type: ['Ofertas limitadas', 'Bônus exclusivos', 'Garantia estendida'],
    kpis: ['ROAS', 'Compras', 'Ticket Médio', 'LTV']
  }
};

// =====================================================
// FUNÇÕES DE ANÁLISE
// =====================================================

/**
 * Calcula score de saúde da campanha (0-100)
 */
function calculateHealthScore(campaign: CampaignForAnalysis): number {
  let score = 100;
  const stage = campaign.funnel_stage || 'meio';
  
  // Penalizar CTR baixo
  const ctrBench = BENCHMARKS.ctr[stage];
  if (campaign.ctr < ctrBench.min) score -= 20;
  else if (campaign.ctr < ctrBench.good) score -= 10;
  
  // Penalizar CPC alto
  const cpcBench = BENCHMARKS.cpc[stage];
  if (campaign.cpc > cpcBench.max) score -= 15;
  else if (campaign.cpc > cpcBench.good) score -= 7;
  
  // Penalizar CPM alto
  const cpmBench = BENCHMARKS.cpm[stage];
  if (campaign.cpm > cpmBench.max) score -= 10;
  
  // Penalizar Connect Rate baixo
  if (campaign.connect_rate < BENCHMARKS.connect_rate.min) score -= 15;
  else if (campaign.connect_rate < BENCHMARKS.connect_rate.good) score -= 7;
  
  // Penalizar ROAS baixo (se campanha de conversão)
  if (stage === 'fundo') {
    if (campaign.roas < BENCHMARKS.roas.min) score -= 25;
    else if (campaign.roas < BENCHMARKS.roas.good) score -= 15;
  }
  
  // Penalizar frequência alta
  const freqBench = BENCHMARKS.frequency[stage];
  if (campaign.frequency > freqBench.warning) score -= 15;
  else if (campaign.frequency > freqBench.max) score -= 7;
  
  // Bonificar lucro positivo
  if (campaign.profit_value > 0) score += 5;
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Identifica problemas na campanha
 */
function identifyIssues(campaign: CampaignForAnalysis): CampaignAnalysisResult['issues'] {
  const issues: CampaignAnalysisResult['issues'] = [];
  const stage = campaign.funnel_stage || 'meio';
  
  // CTR baixo
  const ctrBench = BENCHMARKS.ctr[stage];
  if (campaign.ctr < ctrBench.min) {
    issues.push({
      type: 'critical',
      metric: 'CTR',
      current_value: campaign.ctr,
      benchmark: ctrBench.good,
      message: `CTR muito abaixo do esperado (${campaign.ctr.toFixed(2)}% vs ${ctrBench.good}%)`,
      impact: 'Anúncios não estão atraindo cliques. Revisar criativo e copy.'
    });
  } else if (campaign.ctr < ctrBench.good) {
    issues.push({
      type: 'warning',
      metric: 'CTR',
      current_value: campaign.ctr,
      benchmark: ctrBench.good,
      message: `CTR abaixo do ideal (${campaign.ctr.toFixed(2)}% vs ${ctrBench.good}%)`,
      impact: 'Oportunidade de melhoria nos criativos.'
    });
  }
  
  // CPC alto
  const cpcBench = BENCHMARKS.cpc[stage];
  if (campaign.cpc > cpcBench.max) {
    issues.push({
      type: 'critical',
      metric: 'CPC',
      current_value: campaign.cpc,
      benchmark: cpcBench.good,
      message: `CPC muito alto (R$ ${campaign.cpc.toFixed(2)} vs R$ ${cpcBench.good})`,
      impact: 'Custo por clique está corroendo margem. Otimizar público ou criativo.'
    });
  }
  
  // Connect Rate baixo
  if (campaign.connect_rate < BENCHMARKS.connect_rate.min && campaign.link_clicks > 0) {
    issues.push({
      type: 'critical',
      metric: 'Connect Rate',
      current_value: campaign.connect_rate,
      benchmark: BENCHMARKS.connect_rate.good,
      message: `Connect Rate crítico (${campaign.connect_rate.toFixed(1)}% vs ${BENCHMARKS.connect_rate.good}%)`,
      impact: 'Visitantes não estão chegando à landing page. Verificar velocidade e mobile.'
    });
  }
  
  // ROAS baixo em campanhas de conversão
  if (stage === 'fundo' && campaign.roas < BENCHMARKS.roas.min && campaign.spend > 50) {
    issues.push({
      type: 'critical',
      metric: 'ROAS',
      current_value: campaign.roas,
      benchmark: BENCHMARKS.roas.good,
      message: `ROAS negativo (${campaign.roas.toFixed(2)}x vs ${BENCHMARKS.roas.good}x)`,
      impact: 'Campanha está dando prejuízo. Pausar ou otimizar urgentemente.'
    });
  }
  
  // Frequência alta
  const freqBench = BENCHMARKS.frequency[stage];
  if (campaign.frequency > freqBench.warning) {
    issues.push({
      type: 'warning',
      metric: 'Frequência',
      current_value: campaign.frequency,
      benchmark: freqBench.max,
      message: `Frequência muito alta (${campaign.frequency.toFixed(1)} vs ${freqBench.max})`,
      impact: 'Público está saturado. Expandir audiência ou trocar criativos.'
    });
  }
  
  // Sem conversões com gasto significativo
  if (campaign.purchases === 0 && campaign.spend > 100) {
    issues.push({
      type: 'critical',
      metric: 'Compras',
      current_value: 0,
      benchmark: 1,
      message: `Nenhuma compra com R$ ${campaign.spend.toFixed(2)} gastos`,
      impact: 'Campanha não está convertendo. Revisar funil completo.'
    });
  }
  
  return issues;
}

/**
 * Gera recomendações baseadas nos problemas
 */
function generateRecommendations(
  campaign: CampaignForAnalysis,
  issues: CampaignAnalysisResult['issues']
): CampaignAnalysisResult['recommendations'] {
  const recommendations: CampaignAnalysisResult['recommendations'] = [];
  const stage = campaign.funnel_stage || 'meio';
  
  // Recomendações baseadas em CTR
  if (issues.some(i => i.metric === 'CTR')) {
    recommendations.push({
      priority: 'alta',
      category: 'criativo',
      action: 'Testar novos criativos com hooks mais fortes nos primeiros 3 segundos',
      expected_impact: 'Aumento de 30-50% no CTR'
    });
    recommendations.push({
      priority: 'media',
      category: 'copy',
      action: 'Reescrever headlines focando em benefício principal e urgência',
      expected_impact: 'Aumento de 20-30% no CTR'
    });
  }
  
  // Recomendações baseadas em Connect Rate
  if (issues.some(i => i.metric === 'Connect Rate')) {
    recommendations.push({
      priority: 'alta',
      category: 'landing_page',
      action: 'Verificar velocidade da página (deve carregar < 3s) e otimizar para mobile',
      expected_impact: 'Redução de bounce rate em 40%'
    });
    recommendations.push({
      priority: 'media',
      category: 'landing_page',
      action: 'Garantir consistência entre anúncio e landing page (mesmo visual e promessa)',
      expected_impact: 'Aumento de 25% no Connect Rate'
    });
  }
  
  // Recomendações baseadas em ROAS
  if (issues.some(i => i.metric === 'ROAS')) {
    recommendations.push({
      priority: 'alta',
      category: 'publico',
      action: 'Criar lookalike dos compradores e excluir públicos frios',
      expected_impact: 'Melhoria de 50-100% no ROAS'
    });
    recommendations.push({
      priority: 'alta',
      category: 'orcamento',
      action: 'Redistribuir orçamento para ad sets com melhor ROAS',
      expected_impact: 'Otimização imediata do investimento'
    });
  }
  
  // Recomendações baseadas em Frequência
  if (issues.some(i => i.metric === 'Frequência')) {
    recommendations.push({
      priority: 'media',
      category: 'publico',
      action: 'Expandir público ou criar novas audiências para reduzir frequência',
      expected_impact: 'Redução de fadiga de anúncio'
    });
    recommendations.push({
      priority: 'media',
      category: 'criativo',
      action: 'Adicionar 3-5 novos criativos para rotacionar',
      expected_impact: 'Manutenção do engajamento'
    });
  }
  
  // Recomendações por estágio do funil
  if (stage === 'topo' && campaign.ctr < 1) {
    recommendations.push({
      priority: 'media',
      category: 'criativo',
      action: 'Para topo de funil, usar conteúdo educativo e storytelling ao invés de venda direta',
      expected_impact: 'Melhor engajamento com público frio'
    });
  }
  
  if (stage === 'fundo' && campaign.checkout_initiated > 0 && campaign.purchases === 0) {
    recommendations.push({
      priority: 'alta',
      category: 'landing_page',
      action: 'Implementar remarketing para abandonadores de carrinho com oferta especial',
      expected_impact: 'Recuperação de 10-20% dos carrinhos abandonados'
    });
  }
  
  return recommendations;
}

/**
 * Analisa uma campanha individual
 */
export function analyzeCampaign(campaign: CampaignForAnalysis): CampaignAnalysisResult {
  const healthScore = calculateHealthScore(campaign);
  const issues = identifyIssues(campaign);
  const recommendations = generateRecommendations(campaign, issues);
  
  // Determinar status de saúde
  let health_status: CampaignAnalysisResult['health_status'];
  if (healthScore >= 80) health_status = 'excelente';
  else if (healthScore >= 60) health_status = 'bom';
  else if (healthScore >= 40) health_status = 'atencao';
  else health_status = 'critico';
  
  // Obter estratégia de consciência
  const consciousnessLevel = campaign.consciousness_level || 'solucao';
  const strategy = CONSCIOUSNESS_STRATEGIES[consciousnessLevel];
  
  return {
    campaign_id: campaign.campaign_id,
    campaign_name: campaign.campaign_name,
    health_score: healthScore,
    health_status,
    funnel_stage: campaign.funnel_stage || 'meio',
    consciousness_level: consciousnessLevel,
    consciousness_strategy: strategy?.objective || '',
    issues,
    recommendations,
    ai_summary: `Campanha com ${health_status} performance (score: ${healthScore}/100). ${issues.length} problemas identificados.`,
    ai_insights: [
      `CTR de ${campaign.ctr.toFixed(2)}% indica ${campaign.ctr > 1 ? 'boa' : 'baixa'} atratividade do criativo`,
      `ROAS de ${campaign.roas.toFixed(2)}x ${campaign.roas >= 2 ? 'está saudável' : 'precisa de atenção'}`,
      `Frequência de ${campaign.frequency.toFixed(1)} ${campaign.frequency > 4 ? 'pode causar fadiga' : 'está adequada'}`
    ]
  };
}

/**
 * Análise completa de todas as campanhas com IA
 */
export async function analyzeAllCampaigns(
  campaigns: CampaignForAnalysis[],
  period: { since: string; until: string }
): Promise<FullAnalysisResult> {
  // Analisar cada campanha
  const campaignAnalyses = campaigns.map(analyzeCampaign);
  
  // Calcular média de saúde
  const overallHealth = campaignAnalyses.length > 0
    ? campaignAnalyses.reduce((sum, c) => sum + c.health_score, 0) / campaignAnalyses.length
    : 0;
  
  // Agrupar por funil
  const topoData = campaigns.filter(c => c.funnel_stage === 'topo');
  const meioData = campaigns.filter(c => c.funnel_stage === 'meio');
  const fundoData = campaigns.filter(c => c.funnel_stage === 'fundo');
  
  const funnelSummary = {
    topo: {
      count: topoData.length,
      spend: topoData.reduce((sum, c) => sum + c.spend, 0),
      avg_ctr: topoData.length > 0 ? topoData.reduce((sum, c) => sum + c.ctr, 0) / topoData.length : 0,
      avg_cpm: topoData.length > 0 ? topoData.reduce((sum, c) => sum + c.cpm, 0) / topoData.length : 0
    },
    meio: {
      count: meioData.length,
      spend: meioData.reduce((sum, c) => sum + c.spend, 0),
      avg_connect_rate: meioData.length > 0 ? meioData.reduce((sum, c) => sum + c.connect_rate, 0) / meioData.length : 0,
      leads: meioData.reduce((sum, c) => sum + c.checkout_initiated, 0)
    },
    fundo: {
      count: fundoData.length,
      spend: fundoData.reduce((sum, c) => sum + c.spend, 0),
      avg_roas: fundoData.length > 0 ? fundoData.reduce((sum, c) => sum + c.roas, 0) / fundoData.length : 0,
      purchases: fundoData.reduce((sum, c) => sum + c.purchases, 0)
    }
  };
  
  // Gerar insights gerais
  const totalSpend = campaigns.reduce((sum, c) => sum + c.spend, 0);
  const totalRevenue = campaigns.reduce((sum, c) => sum + c.purchase_value, 0);
  const overallROAS = totalSpend > 0 ? totalRevenue / totalSpend : 0;
  
  const criticalCampaigns = campaignAnalyses.filter(c => c.health_status === 'critico');
  const excellentCampaigns = campaignAnalyses.filter(c => c.health_status === 'excelente');
  
  return {
    timestamp: new Date().toISOString(),
    period,
    overall_health: Math.round(overallHealth),
    overall_status: overallHealth >= 70 ? 'Saudável' : overallHealth >= 50 ? 'Atenção' : 'Crítico',
    total_campaigns: campaigns.length,
    funnel_summary: funnelSummary,
    campaigns: campaignAnalyses,
    ai_general_summary: `Análise de ${campaigns.length} campanhas com ROAS geral de ${overallROAS.toFixed(2)}x. ` +
      `${criticalCampaigns.length} campanhas precisam de atenção urgente. ` +
      `${excellentCampaigns.length} campanhas estão com excelente performance.`,
    ai_top_opportunities: [
      excellentCampaigns.length > 0 
        ? `Escalar investimento nas ${excellentCampaigns.length} campanhas com excelente ROAS`
        : 'Criar novas campanhas baseadas nos melhores criativos',
      funnelSummary.fundo.avg_roas > 2 
        ? 'Aumentar orçamento de fundo de funil que está convertendo bem'
        : 'Otimizar campanhas de conversão para melhorar ROAS',
      funnelSummary.topo.count === 0
        ? 'Criar campanhas de topo de funil para alimentar o funil'
        : 'Manter investimento em awareness para novos públicos'
    ],
    ai_main_risks: [
      criticalCampaigns.length > 0
        ? `${criticalCampaigns.length} campanhas com ROAS negativo queimando orçamento`
        : 'Nenhum risco crítico identificado',
      overallROAS < 1
        ? 'ROAS geral abaixo de 1x - prejuízo no investimento'
        : 'ROAS positivo, mas buscar sempre acima de 2x',
      totalSpend > 0 && funnelSummary.fundo.purchases === 0
        ? 'Nenhuma venda no período - verificar funil completo'
        : 'Funil de vendas funcionando'
    ]
  };
}

/**
 * Gerar análise com IA (OpenAI)
 */
export async function generateAIAnalysis(
  data: FullAnalysisResult,
  apiKey?: string
): Promise<string> {
  if (!apiKey) {
    // Retornar análise baseada em regras se não houver API key
    return data.ai_general_summary + '\n\n' +
      '**Oportunidades:**\n' + data.ai_top_opportunities.map(o => `• ${o}`).join('\n') + '\n\n' +
      '**Riscos:**\n' + data.ai_main_risks.map(r => `• ${r}`).join('\n');
  }
  
  try {
    const openai = new OpenAI({ apiKey });
    
    const prompt = `Você é um especialista em tráfego pago e análise de campanhas Meta Ads.

Analise os seguintes dados de campanhas e gere um relatório executivo:

**Resumo Geral:**
- Total de Campanhas: ${data.total_campaigns}
- Score de Saúde Geral: ${data.overall_health}/100
- ROAS Geral: ${data.funnel_summary.fundo.avg_roas.toFixed(2)}x

**Por Funil:**
- Topo: ${data.funnel_summary.topo.count} campanhas, R$ ${data.funnel_summary.topo.spend.toFixed(2)} gastos, CTR médio ${data.funnel_summary.topo.avg_ctr.toFixed(2)}%
- Meio: ${data.funnel_summary.meio.count} campanhas, R$ ${data.funnel_summary.meio.spend.toFixed(2)} gastos, ${data.funnel_summary.meio.leads} leads
- Fundo: ${data.funnel_summary.fundo.count} campanhas, R$ ${data.funnel_summary.fundo.spend.toFixed(2)} gastos, ${data.funnel_summary.fundo.purchases} compras

**Campanhas Críticas:**
${data.campaigns.filter(c => c.health_status === 'critico').map(c => `- ${c.campaign_name}: ${c.issues.map(i => i.message).join(', ')}`).join('\n') || 'Nenhuma'}

Gere:
1. Um resumo executivo de 2-3 parágrafos
2. As 3 principais ações imediatas
3. Uma previsão para os próximos 7 dias baseada nos dados

Use linguagem direta e acionável. Foque em ROI e crescimento.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
      temperature: 0.7
    });

    return completion.choices[0]?.message?.content || data.ai_general_summary;
  } catch (error) {
    console.error('Erro ao gerar análise com IA:', error);
    return data.ai_general_summary;
  }
}

export { CONSCIOUSNESS_STRATEGIES, BENCHMARKS };
