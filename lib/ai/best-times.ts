/**
 * InstaFlow - Calculador de Melhores Horários com IA
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

export interface TimeSlot {
  dayOfWeek: number; // 0-6 (domingo-sábado)
  hour: number; // 0-23
  score: number; // 0-100
  audienceOnline: number; // % estimado do público online
  competition: 'low' | 'medium' | 'high';
}

export interface BestTimesAnalysis {
  bestTimes: TimeSlot[];
  worstTimes: TimeSlot[];
  weeklyHeatmap: number[][]; // 7 dias x 24 horas
  recommendations: string[];
  timezone: string;
}

export interface HistoricalData {
  postedAt: Date;
  reach: number;
  engagement: number;
  impressions: number;
  contentType: 'image' | 'video' | 'carousel' | 'reels';
}

/**
 * Calcula os melhores horários baseado em dados históricos
 */
export function calculateBestTimesFromHistory(
  posts: HistoricalData[],
  timezone: string = 'America/Sao_Paulo'
): BestTimesAnalysis {
  // Matriz 7x24 para acumular scores
  const heatmap: number[][] = Array(7).fill(null).map(() => Array(24).fill(0));
  const counts: number[][] = Array(7).fill(null).map(() => Array(24).fill(0));

  // Calcular score para cada horário
  posts.forEach((post) => {
    const date = new Date(post.postedAt);
    const dayOfWeek = date.getDay();
    const hour = date.getHours();
    
    // Score baseado em engagement e reach
    const maxReach = Math.max(...posts.map(p => p.reach));
    const maxEngagement = Math.max(...posts.map(p => p.engagement));
    
    const normalizedReach = post.reach / maxReach;
    const normalizedEngagement = post.engagement / maxEngagement;
    
    const score = (normalizedReach * 0.4 + normalizedEngagement * 0.6) * 100;
    
    heatmap[dayOfWeek][hour] += score;
    counts[dayOfWeek][hour]++;
  });

  // Calcular média
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      if (counts[day][hour] > 0) {
        heatmap[day][hour] = Math.round(heatmap[day][hour] / counts[day][hour]);
      }
    }
  }

  // Extrair melhores e piores horários
  const allSlots: TimeSlot[] = [];
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      if (heatmap[day][hour] > 0) {
        allSlots.push({
          dayOfWeek: day,
          hour,
          score: heatmap[day][hour],
          audienceOnline: Math.round(heatmap[day][hour] * 0.8), // Estimativa
          competition: heatmap[day][hour] > 70 ? 'high' : heatmap[day][hour] > 40 ? 'medium' : 'low',
        });
      }
    }
  }

  allSlots.sort((a, b) => b.score - a.score);

  const bestTimes = allSlots.slice(0, 10);
  const worstTimes = allSlots.filter(s => s.score < 30).slice(0, 5);

  // Gerar recomendações
  const recommendations = generateRecommendations(bestTimes, posts);

  return {
    bestTimes,
    worstTimes,
    weeklyHeatmap: heatmap,
    recommendations,
    timezone,
  };
}

/**
 * Gera recomendações baseadas nos dados
 */
function generateRecommendations(bestTimes: TimeSlot[], posts: HistoricalData[]): string[] {
  const recommendations: string[] = [];
  const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  if (bestTimes.length > 0) {
    const topSlot = bestTimes[0];
    recommendations.push(
      `Melhor horário: ${dayNames[topSlot.dayOfWeek]} às ${String(topSlot.hour).padStart(2, '0')}:00`
    );
  }

  // Analisar dias da semana
  const dayScores = Array(7).fill(0);
  const dayCounts = Array(7).fill(0);
  
  posts.forEach((post) => {
    const day = new Date(post.postedAt).getDay();
    dayScores[day] += post.engagement;
    dayCounts[day]++;
  });

  let bestDay = 0;
  let bestAvg = 0;
  for (let i = 0; i < 7; i++) {
    if (dayCounts[i] > 0) {
      const avg = dayScores[i] / dayCounts[i];
      if (avg > bestAvg) {
        bestAvg = avg;
        bestDay = i;
      }
    }
  }
  
  recommendations.push(`${dayNames[bestDay]} tem seu melhor desempenho médio`);

  // Analisar tipo de conteúdo
  const typePerformance: Record<string, { total: number; count: number }> = {};
  posts.forEach((post) => {
    if (!typePerformance[post.contentType]) {
      typePerformance[post.contentType] = { total: 0, count: 0 };
    }
    typePerformance[post.contentType].total += post.engagement;
    typePerformance[post.contentType].count++;
  });

  let bestType = 'image';
  let bestTypeAvg = 0;
  Object.entries(typePerformance).forEach(([type, data]) => {
    const avg = data.total / data.count;
    if (avg > bestTypeAvg) {
      bestTypeAvg = avg;
      bestType = type;
    }
  });

  const typeNames: Record<string, string> = {
    image: 'Imagens',
    video: 'Vídeos',
    carousel: 'Carrosséis',
    reels: 'Reels',
  };
  
  recommendations.push(`${typeNames[bestType] || bestType} têm melhor engajamento no seu perfil`);

  return recommendations;
}

/**
 * Sugere horários usando IA quando não há dados históricos suficientes
 */
export async function suggestBestTimesWithAI(
  niche: string,
  targetAudience: string,
  timezone: string = 'America/Sao_Paulo'
): Promise<BestTimesAnalysis> {
  const systemPrompt = `Você é especialista em marketing de Instagram e conhece profundamente o comportamento do público brasileiro.

Baseado no nicho e público-alvo, sugira os melhores horários para postar.

Considere:
- Horários de pico do Instagram no Brasil
- Comportamento típico do público ${targetAudience}
- Nicho: ${niche}
- Timezone: ${timezone}

Responda em JSON:
{
  "bestTimes": [
    { "dayOfWeek": 1, "hour": 12, "score": 95, "audienceOnline": 75, "competition": "high" }
  ],
  "recommendations": ["Dica 1", "Dica 2"]
}`;

  try {
    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Sugira os 10 melhores horários para o nicho "${niche}" com público "${targetAudience}"` },
      ],
      temperature: 0.7,
    });

    const raw = response.choices[0].message.content || '{}';
    const parsed = JSON.parse(raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());

    // Gerar heatmap a partir das sugestões
    const heatmap: number[][] = Array(7).fill(null).map(() => Array(24).fill(0));
    parsed.bestTimes?.forEach((slot: TimeSlot) => {
      heatmap[slot.dayOfWeek][slot.hour] = slot.score;
    });

    return {
      bestTimes: parsed.bestTimes || [],
      worstTimes: [],
      weeklyHeatmap: heatmap,
      recommendations: parsed.recommendations || [],
      timezone,
    };
  } catch (error) {
    console.error('Error suggesting best times:', error);
    return getDefaultBestTimes(timezone);
  }
}

/**
 * Retorna horários padrão quando não há dados
 */
function getDefaultBestTimes(timezone: string): BestTimesAnalysis {
  // Horários padrão para Brasil
  const defaultSlots: TimeSlot[] = [
    { dayOfWeek: 1, hour: 12, score: 90, audienceOnline: 70, competition: 'medium' },
    { dayOfWeek: 2, hour: 12, score: 88, audienceOnline: 68, competition: 'medium' },
    { dayOfWeek: 3, hour: 12, score: 86, audienceOnline: 66, competition: 'medium' },
    { dayOfWeek: 4, hour: 12, score: 85, audienceOnline: 65, competition: 'medium' },
    { dayOfWeek: 5, hour: 19, score: 92, audienceOnline: 75, competition: 'high' },
    { dayOfWeek: 6, hour: 11, score: 80, audienceOnline: 60, competition: 'low' },
    { dayOfWeek: 0, hour: 11, score: 75, audienceOnline: 55, competition: 'low' },
    { dayOfWeek: 1, hour: 19, score: 88, audienceOnline: 72, competition: 'high' },
    { dayOfWeek: 2, hour: 19, score: 87, audienceOnline: 70, competition: 'high' },
    { dayOfWeek: 3, hour: 19, score: 86, audienceOnline: 68, competition: 'high' },
  ];

  const heatmap: number[][] = Array(7).fill(null).map(() => Array(24).fill(0));
  defaultSlots.forEach((slot) => {
    heatmap[slot.dayOfWeek][slot.hour] = slot.score;
  });

  return {
    bestTimes: defaultSlots,
    worstTimes: [],
    weeklyHeatmap: heatmap,
    recommendations: [
      'Horário de almoço (12h) é ótimo para posts informativos',
      'Noite (19h-21h) tem maior engajamento para conteúdo casual',
      'Finais de semana pela manhã têm menor competição',
    ],
    timezone,
  };
}

/**
 * Formata o horário para exibição
 */
export function formatTimeSlot(slot: TimeSlot): string {
  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  return `${dayNames[slot.dayOfWeek]} ${String(slot.hour).padStart(2, '0')}:00`;
}
