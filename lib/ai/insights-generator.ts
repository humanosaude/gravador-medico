/**
 * InstaFlow - Gerador de Insights com IA
 */

import OpenAI from 'openai';

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

export interface AccountMetrics {
  followers: number;
  followersGrowth: number;
  posts: number;
  avgEngagementRate: number;
  avgReach: number;
  avgImpressions: number;
  topContentTypes: { type: string; performance: number }[];
  bestTimes: { day: string; hour: number }[];
  period: string; // Ex: "últimos 30 dias"
}

export interface PostMetrics {
  type: string;
  caption: string;
  hashtags: string[];
  reach: number;
  impressions: number;
  engagement: number;
  saves: number;
  shares: number;
  comments: number;
  postedAt: Date;
}

export interface InsightReport {
  summary: string;
  highlights: string[];
  concerns: string[];
  opportunities: string[];
  actionItems: { priority: 'high' | 'medium' | 'low'; action: string; impact: string }[];
  benchmarks: { metric: string; your_value: string; industry_avg: string; status: 'above' | 'below' | 'on_par' }[];
  contentStrategy: string;
  growthProjection: string;
}

/**
 * Gera relatório de insights completo usando IA
 */
export async function generateInsightReport(
  accountMetrics: AccountMetrics,
  recentPosts: PostMetrics[],
  niche: string
): Promise<InsightReport> {
  const systemPrompt = `Você é um analista de marketing digital especializado em Instagram.
Sua tarefa é analisar métricas e fornecer insights acionáveis para melhorar o desempenho.

Nicho da conta: ${niche}
Período de análise: ${accountMetrics.period}

Benchmarks do setor (Brasil):
- Taxa de engajamento média: 1-3% para contas com 10K+ seguidores
- Alcance médio: 20-30% dos seguidores
- Taxa de crescimento saudável: 1-2% ao mês

Responda em JSON com o formato:
{
  "summary": "Resumo executivo de 2-3 linhas",
  "highlights": ["Ponto positivo 1", "Ponto positivo 2"],
  "concerns": ["Preocupação 1", "Preocupação 2"],
  "opportunities": ["Oportunidade 1", "Oportunidade 2"],
  "actionItems": [
    { "priority": "high", "action": "Ação específica", "impact": "Impacto esperado" }
  ],
  "benchmarks": [
    { "metric": "Taxa de Engajamento", "your_value": "2.5%", "industry_avg": "1.5%", "status": "above" }
  ],
  "contentStrategy": "Recomendação de estratégia de conteúdo",
  "growthProjection": "Projeção de crescimento"
}`;

  const userPrompt = `Analise estas métricas:

CONTA:
- Seguidores: ${accountMetrics.followers.toLocaleString()}
- Crescimento: ${accountMetrics.followersGrowth > 0 ? '+' : ''}${accountMetrics.followersGrowth.toFixed(1)}%
- Posts no período: ${accountMetrics.posts}
- Taxa de engajamento média: ${accountMetrics.avgEngagementRate.toFixed(2)}%
- Alcance médio: ${accountMetrics.avgReach.toLocaleString()}
- Impressões médias: ${accountMetrics.avgImpressions.toLocaleString()}

TOP TIPOS DE CONTEÚDO:
${accountMetrics.topContentTypes.map((t) => `- ${t.type}: ${t.performance}% performance`).join('\n')}

POSTS RECENTES (últimos 5):
${recentPosts.slice(0, 5).map((p, i) => `
Post ${i + 1} (${p.type}):
- Alcance: ${p.reach.toLocaleString()}
- Engajamento: ${p.engagement}
- Saves: ${p.saves}
- Compartilhamentos: ${p.shares}
`).join('\n')}

Gere insights detalhados e acionáveis.`;

  try {
    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
    });

    const raw = response.choices[0].message.content || '{}';
    const parsed = JSON.parse(raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());

    return {
      summary: parsed.summary || 'Análise em processamento.',
      highlights: parsed.highlights || [],
      concerns: parsed.concerns || [],
      opportunities: parsed.opportunities || [],
      actionItems: parsed.actionItems || [],
      benchmarks: parsed.benchmarks || [],
      contentStrategy: parsed.contentStrategy || '',
      growthProjection: parsed.growthProjection || '',
    };
  } catch (error) {
    console.error('Error generating insights:', error);
    return {
      summary: 'Não foi possível gerar insights no momento.',
      highlights: [],
      concerns: [],
      opportunities: [],
      actionItems: [],
      benchmarks: [],
      contentStrategy: '',
      growthProjection: '',
    };
  }
}

/**
 * Analisa um post específico e sugere melhorias
 */
export async function analyzePost(post: PostMetrics, accountAvg: { reach: number; engagement: number }): Promise<{
  performance: 'excellent' | 'good' | 'average' | 'below_average';
  score: number;
  insights: string[];
  improvements: string[];
}> {
  const reachRatio = post.reach / accountAvg.reach;
  const engagementRatio = post.engagement / accountAvg.engagement;
  
  // Calcular score (0-100)
  const score = Math.round(((reachRatio + engagementRatio) / 2) * 50);
  
  let performance: 'excellent' | 'good' | 'average' | 'below_average';
  if (score >= 80) performance = 'excellent';
  else if (score >= 60) performance = 'good';
  else if (score >= 40) performance = 'average';
  else performance = 'below_average';

  const insights: string[] = [];
  const improvements: string[] = [];

  // Análise de alcance
  if (reachRatio > 1.2) {
    insights.push('Alcance acima da média - conteúdo viral');
  } else if (reachRatio < 0.8) {
    improvements.push('Teste novos horários de postagem');
  }

  // Análise de engajamento
  if (engagementRatio > 1.2) {
    insights.push('Alto engajamento - conteúdo ressonante');
  } else if (engagementRatio < 0.8) {
    improvements.push('Inclua CTAs mais fortes na legenda');
  }

  // Análise de saves
  if (post.saves > 0) {
    const saveRate = post.saves / post.reach;
    if (saveRate > 0.05) {
      insights.push('Alta taxa de salvamentos - conteúdo de valor');
    }
  }

  // Análise de compartilhamentos
  if (post.shares > 0) {
    const shareRate = post.shares / post.reach;
    if (shareRate > 0.02) {
      insights.push('Bom potencial viral - muitos compartilhamentos');
    }
  }

  // Análise de hashtags
  if (post.hashtags.length < 5) {
    improvements.push('Use mais hashtags (recomendado: 10-20)');
  } else if (post.hashtags.length > 25) {
    improvements.push('Reduza hashtags (máximo recomendado: 25)');
  }

  return {
    performance,
    score,
    insights,
    improvements,
  };
}

/**
 * Gera relatório de competidores (simulado - requer dados externos)
 */
export async function generateCompetitorComparison(
  yourMetrics: AccountMetrics,
  competitors: { name: string; metrics: Partial<AccountMetrics> }[]
): Promise<{
  yourRanking: number;
  totalCompetitors: number;
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
}> {
  const rankings = competitors
    .map((c) => ({
      name: c.name,
      score: (c.metrics.avgEngagementRate || 0) * 100 + (c.metrics.followersGrowth || 0) * 10,
    }))
    .sort((a, b) => b.score - a.score);

  const yourScore = yourMetrics.avgEngagementRate * 100 + yourMetrics.followersGrowth * 10;
  const yourRanking = rankings.filter((r) => r.score > yourScore).length + 1;

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const opportunities: string[] = [];

  // Comparar com média dos competidores
  const avgEngagement = competitors.reduce((sum, c) => sum + (c.metrics.avgEngagementRate || 0), 0) / competitors.length;
  const avgGrowth = competitors.reduce((sum, c) => sum + (c.metrics.followersGrowth || 0), 0) / competitors.length;

  if (yourMetrics.avgEngagementRate > avgEngagement) {
    strengths.push('Taxa de engajamento acima da concorrência');
  } else {
    weaknesses.push('Taxa de engajamento abaixo da concorrência');
    opportunities.push('Investir em conteúdo mais interativo');
  }

  if (yourMetrics.followersGrowth > avgGrowth) {
    strengths.push('Crescimento de seguidores acima da média');
  } else {
    weaknesses.push('Crescimento mais lento que a concorrência');
    opportunities.push('Considerar parcerias e colaborações');
  }

  return {
    yourRanking,
    totalCompetitors: competitors.length + 1,
    strengths,
    weaknesses,
    opportunities,
  };
}

/**
 * Gera previsão de métricas
 */
export function predictMetrics(
  historicalData: { date: Date; followers: number; engagement: number }[],
  daysAhead: number = 30
): {
  projectedFollowers: number;
  projectedEngagement: number;
  trend: 'growing' | 'stable' | 'declining';
  confidence: number;
} {
  if (historicalData.length < 7) {
    return {
      projectedFollowers: historicalData[historicalData.length - 1]?.followers || 0,
      projectedEngagement: historicalData[historicalData.length - 1]?.engagement || 0,
      trend: 'stable',
      confidence: 30,
    };
  }

  // Calcular tendência (regressão linear simples)
  const n = historicalData.length;
  const sortedData = [...historicalData].sort((a, b) => a.date.getTime() - b.date.getTime());
  
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  sortedData.forEach((d, i) => {
    sumX += i;
    sumY += d.followers;
    sumXY += i * d.followers;
    sumX2 += i * i;
  });

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  const projectedFollowers = Math.round(intercept + slope * (n + daysAhead));
  
  // Engajamento (média móvel)
  const recentEngagement = sortedData.slice(-7).reduce((sum, d) => sum + d.engagement, 0) / 7;
  const projectedEngagement = recentEngagement;

  // Determinar tendência
  let trend: 'growing' | 'stable' | 'declining';
  const growthRate = (projectedFollowers - sortedData[sortedData.length - 1].followers) / sortedData[sortedData.length - 1].followers;
  
  if (growthRate > 0.02) trend = 'growing';
  else if (growthRate < -0.02) trend = 'declining';
  else trend = 'stable';

  // Confidence baseado na quantidade de dados
  const confidence = Math.min(90, Math.max(30, n * 3));

  return {
    projectedFollowers,
    projectedEngagement,
    trend,
    confidence,
  };
}
