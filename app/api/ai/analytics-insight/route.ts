/**
 * 🧠 API de Análise IA para Google Analytics 4
 * 
 * Utiliza GPT-4o para analisar métricas do GA4 e gerar insights acionáveis
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

interface AnalyticsData {
  kpis: {
    totalUsers: number;
    totalViews: number;
    totalEvents: number;
    totalSessions: number;
  };
  traffic: Array<{ date: string; usuarios: number; visualizacoes: number }>;
  sources: Array<{ source: string; users: number; sessions: number }>;
  topPages: Array<{ page: string; title: string; views: number }>;
  devices: Array<{ device: string; users: number }>;
  countries: Array<{ country: string; users: number }>;
  cities: Array<{ city: string; users: number }>;
  realtime?: { activeUsers: number };
}

interface AIInsight {
  category: 'performance' | 'traffic' | 'engagement' | 'opportunity' | 'alert';
  severity: 'success' | 'warning' | 'danger' | 'info';
  title: string;
  description: string;
  metric?: string;
  recommendation?: string;
}

interface AnalyticsAIResponse {
  summary: string;
  healthScore: number;
  insights: AIInsight[];
  recommendations: string[];
  trends: {
    direction: 'up' | 'down' | 'stable';
    description: string;
  };
  generatedAt: string;
}

// =====================================================
// PROMPT DO SISTEMA
// =====================================================

const SYSTEM_PROMPT = `Você é um especialista em Google Analytics 4 e análise de dados web integrado ao sistema Gravador Médico.

Sua função é analisar métricas de tráfego do site e gerar insights estratégicos para otimização.

CONTEXTO DO NEGÓCIO:
- Produto: Gravador Médico - app para médicos gravarem consultas e gerarem prontuários
- Ticket médio: ~R$ 34-97 por assinatura
- Público-alvo: Médicos brasileiros

REGRAS DE ANÁLISE:
1. Analise padrões de tráfego (horários, dias da semana)
2. Identifique fontes de tráfego mais valiosas
3. Avalie performance de páginas (bounce, conversão)
4. Detecte oportunidades de otimização
5. Alerte sobre métricas preocupantes

FORMATO DE RESPOSTA (JSON):
{
  "summary": "Resumo executivo em 2-3 frases",
  "healthScore": 0-100,
  "insights": [
    {
      "category": "performance|traffic|engagement|opportunity|alert",
      "severity": "success|warning|danger|info",
      "title": "Título curto",
      "description": "Descrição detalhada",
      "metric": "Métrica relacionada (opcional)",
      "recommendation": "Ação recomendada (opcional)"
    }
  ],
  "recommendations": ["Recomendação 1", "Recomendação 2", "Recomendação 3"],
  "trends": {
    "direction": "up|down|stable",
    "description": "Descrição da tendência"
  }
}

Seja ESPECÍFICO e ACIONÁVEL. Não use termos genéricos.`;

// =====================================================
// PREPARAR DADOS PARA IA
// =====================================================

function prepareDataForAI(data: AnalyticsData, period: string): string {
  const { kpis, traffic, sources, topPages, devices, countries, cities, realtime } = data;
  
  // Calcular métricas derivadas
  const avgSessionDuration = kpis.totalSessions > 0 ? (kpis.totalSessions / kpis.totalUsers) : 0;
  const pagesPerSession = kpis.totalSessions > 0 ? (kpis.totalViews / kpis.totalSessions).toFixed(1) : '0';
  const bounceRate = kpis.totalViews > 0 ? Math.round((1 - kpis.totalSessions / kpis.totalViews) * 100) : 0;
  const engagementRate = kpis.totalUsers > 0 ? (kpis.totalEvents / kpis.totalUsers).toFixed(1) : '0';
  
  return `
PERÍODO DE ANÁLISE: ${period}

KPIs PRINCIPAIS:
- Usuários totais: ${kpis.totalUsers.toLocaleString()}
- Visualizações de página: ${kpis.totalViews.toLocaleString()}
- Sessões: ${kpis.totalSessions.toLocaleString()}
- Eventos: ${kpis.totalEvents.toLocaleString()}
- Taxa de rejeição estimada: ${bounceRate}%
- Páginas por sessão: ${pagesPerSession}
- Engajamento (eventos/usuário): ${engagementRate}
${realtime ? `- Usuários ativos agora: ${realtime.activeUsers}` : ''}

TRÁFEGO DIÁRIO (últimos dias):
${traffic.slice(-7).map(t => `${t.date}: ${t.usuarios} usuários, ${t.visualizacoes} views`).join('\n')}

FONTES DE TRÁFEGO (top 5):
${sources.slice(0, 5).map((s, i) => `${i + 1}. ${s.source}: ${s.users} usuários, ${s.sessions} sessões`).join('\n')}

PÁGINAS MAIS ACESSADAS (top 5):
${topPages.slice(0, 5).map((p, i) => `${i + 1}. ${p.title || p.page}: ${p.views} visualizações`).join('\n')}

DISPOSITIVOS:
${devices.map(d => `- ${d.device}: ${d.users} usuários (${((d.users / kpis.totalUsers) * 100).toFixed(1)}%)`).join('\n')}

PAÍSES (top 3):
${countries.slice(0, 3).map(c => `- ${c.country}: ${c.users} usuários`).join('\n')}

CIDADES (top 5):
${cities.slice(0, 5).map(c => `- ${c.city}: ${c.users} usuários`).join('\n')}
`;
}

// =====================================================
// HANDLER
// =====================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { data, period = '7 dias' } = body as { data: AnalyticsData; period: string };
    
    if (!data || !data.kpis) {
      return NextResponse.json({
        success: false,
        error: 'Dados de analytics inválidos'
      }, { status: 400 });
    }
    
    console.log('🧠 [AI Analytics] Iniciando análise com GPT-4o...');
    
    const preparedData = prepareDataForAI(data, period);
    
    const openai = getOpenAI();
    
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { 
          role: 'user', 
          content: `Analise os seguintes dados de Google Analytics e gere insights:\n\n${preparedData}` 
        }
      ],
      temperature: 0.4,
      max_completion_tokens: 2000,
      response_format: { type: 'json_object' }
    });
    
    const content = response.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('Resposta vazia da IA');
    }
    
    const aiResponse = JSON.parse(content) as Omit<AnalyticsAIResponse, 'generatedAt'>;
    
    console.log('✅ [AI Analytics] Análise concluída:', {
      healthScore: aiResponse.healthScore,
      insightsCount: aiResponse.insights?.length || 0
    });
    
    return NextResponse.json({
      success: true,
      ...aiResponse,
      generatedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ [AI Analytics] Erro:', error);
    
    // Fallback com análise básica
    return NextResponse.json({
      success: true,
      summary: 'Análise automática não disponível no momento. Verifique as métricas manualmente.',
      healthScore: 70,
      insights: [
        {
          category: 'info',
          severity: 'info',
          title: 'Análise em processamento',
          description: 'A análise completa com IA está temporariamente indisponível.',
          recommendation: 'Tente novamente em alguns minutos'
        }
      ],
      recommendations: [
        'Monitore os KPIs principais diariamente',
        'Acompanhe as fontes de tráfego com melhor conversão',
        'Verifique a taxa de rejeição das principais páginas'
      ],
      trends: {
        direction: 'stable',
        description: 'Dados insuficientes para determinar tendência'
      },
      generatedAt: new Date().toISOString()
    });
  }
}
