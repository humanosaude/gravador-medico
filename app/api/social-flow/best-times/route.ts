/**
 * Social Flow - Best Times API
 * Recomendações de melhores horários para postar
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import * as jose from 'jose';
import { createClient } from '@supabase/supabase-js';
import { SocialNetwork } from '@/lib/social-flow/types';

async function getUserFromToken() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    
    if (!token) return null;
    
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret');
    const { payload } = await jose.jwtVerify(token, secret);
    
    return payload as { id: string; email: string };
  } catch {
    return null;
  }
}

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface TimeSlot {
  dayOfWeek: number; // 0-6 (Domingo-Sábado)
  hour: number; // 0-23
  score: number; // 0-100
  postsCount: number;
  avgEngagement: number;
  avgReach: number;
}

interface BestTimesResult {
  bestTimes: TimeSlot[];
  heatmap: number[][];  // 7 dias x 24 horas
  recommendations: {
    bestDay: string;
    bestHour: string;
    worstDay: string;
    worstHour: string;
    summary: string;
  };
}

// GET /api/social-flow/best-times - Obter melhores horários
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const network = searchParams.get('network') as SocialNetwork;
    const period = searchParams.get('period') || '90d'; // Usar 90 dias para melhor amostragem

    const supabase = getSupabaseClient();

    // Calcular período
    const days = parseInt(period.replace('d', '')) || 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Buscar contas do usuário
    let accountsQuery = supabase
      .from('social_accounts')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (accountId) {
      accountsQuery = accountsQuery.eq('id', accountId);
    }

    if (network) {
      accountsQuery = accountsQuery.eq('network', network);
    }

    const { data: accounts } = await accountsQuery;
    const accountIds = accounts?.map((a) => a.id) || [];

    if (!accountIds.length) {
      // Retornar melhores horários genéricos
      return NextResponse.json({
        success: true,
        ...getDefaultBestTimes(network),
        isDefault: true,
        message: 'Using industry defaults (connect an account for personalized times)',
      });
    }

    // Buscar posts publicados com métricas
    const { data: posts } = await supabase
      .from('social_posts')
      .select(`
        id,
        published_at,
        social_post_metrics (
          impressions,
          reach,
          engagement,
          likes,
          comments,
          shares,
          saves
        )
      `)
      .in('account_id', accountIds)
      .eq('status', 'published')
      .gte('published_at', startDate.toISOString())
      .not('published_at', 'is', null);

    if (!posts?.length || posts.length < 10) {
      // Poucos dados, usar defaults com sugestões
      return NextResponse.json({
        success: true,
        ...getDefaultBestTimes(network),
        isDefault: true,
        sampleSize: posts?.length || 0,
        message: 'Not enough data for personalized times. Post more and check back!',
      });
    }

    // Analisar performance por horário
    const timeSlots = analyzeTimeSlots(posts);
    const heatmap = generateHeatmap(timeSlots);
    const recommendations = generateRecommendations(timeSlots);

    // Ordenar por score
    const bestTimes = timeSlots
      .filter((slot) => slot.postsCount >= 2)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    return NextResponse.json({
      success: true,
      bestTimes,
      heatmap,
      recommendations,
      isDefault: false,
      sampleSize: posts.length,
      periodDays: days,
    });
  } catch (error: any) {
    console.error('Best times error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get best times' },
      { status: 500 }
    );
  }
}

// Análise de posts por horário
function analyzeTimeSlots(posts: any[]): TimeSlot[] {
  // Agrupar por dia/hora
  const slots: Record<string, {
    posts: any[];
    totalEngagement: number;
    totalReach: number;
    totalImpressions: number;
  }> = {};

  posts.forEach((post) => {
    if (!post.published_at) return;

    const date = new Date(post.published_at);
    const dayOfWeek = date.getDay();
    const hour = date.getHours();
    const key = `${dayOfWeek}-${hour}`;

    if (!slots[key]) {
      slots[key] = {
        posts: [],
        totalEngagement: 0,
        totalReach: 0,
        totalImpressions: 0,
      };
    }

    const metrics = post.social_post_metrics?.[0] || {};
    const engagement = 
      (metrics.likes || 0) + 
      (metrics.comments || 0) * 2 + 
      (metrics.shares || 0) * 3 + 
      (metrics.saves || 0) * 2;

    slots[key].posts.push(post);
    slots[key].totalEngagement += engagement;
    slots[key].totalReach += metrics.reach || 0;
    slots[key].totalImpressions += metrics.impressions || 0;
  });

  // Calcular médias e scores
  const timeSlots: TimeSlot[] = [];
  const allEngagements: number[] = [];

  Object.entries(slots).forEach(([key, data]) => {
    const avgEngagement = data.totalEngagement / data.posts.length;
    allEngagements.push(avgEngagement);
  });

  // Normalizar scores (0-100)
  const maxEngagement = Math.max(...allEngagements, 1);

  Object.entries(slots).forEach(([key, data]) => {
    const [dayOfWeek, hour] = key.split('-').map(Number);
    const avgEngagement = data.totalEngagement / data.posts.length;
    const avgReach = data.totalReach / data.posts.length;

    timeSlots.push({
      dayOfWeek,
      hour,
      score: Math.round((avgEngagement / maxEngagement) * 100),
      postsCount: data.posts.length,
      avgEngagement: Math.round(avgEngagement),
      avgReach: Math.round(avgReach),
    });
  });

  return timeSlots;
}

// Gerar heatmap 7x24
function generateHeatmap(timeSlots: TimeSlot[]): number[][] {
  // Inicializar com zeros
  const heatmap: number[][] = Array(7)
    .fill(null)
    .map(() => Array(24).fill(0));

  // Preencher com scores
  timeSlots.forEach((slot) => {
    heatmap[slot.dayOfWeek][slot.hour] = slot.score;
  });

  return heatmap;
}

// Gerar recomendações
function generateRecommendations(timeSlots: TimeSlot[]): BestTimesResult['recommendations'] {
  const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  
  // Agrupar por dia
  const byDay: Record<number, TimeSlot[]> = {};
  timeSlots.forEach((slot) => {
    if (!byDay[slot.dayOfWeek]) {
      byDay[slot.dayOfWeek] = [];
    }
    byDay[slot.dayOfWeek].push(slot);
  });

  // Calcular média por dia
  const dayScores = Object.entries(byDay).map(([day, slots]) => ({
    day: parseInt(day),
    avgScore: slots.reduce((sum, s) => sum + s.score, 0) / slots.length,
  }));

  const bestDayData = dayScores.sort((a, b) => b.avgScore - a.avgScore)[0];
  const worstDayData = dayScores.sort((a, b) => a.avgScore - b.avgScore)[0];

  // Melhor e pior hora geral
  const sorted = [...timeSlots].sort((a, b) => b.score - a.score);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  const formatHour = (h: number) => `${h.toString().padStart(2, '0')}:00`;

  return {
    bestDay: bestDayData ? dayNames[bestDayData.day] : 'Terça',
    bestHour: best ? formatHour(best.hour) : '18:00',
    worstDay: worstDayData ? dayNames[worstDayData.day] : 'Domingo',
    worstHour: worst ? formatHour(worst.hour) : '03:00',
    summary: best
      ? `Seus posts performam melhor ${dayNames[best.dayOfWeek]} às ${formatHour(best.hour)}`
      : 'Poste mais para obter recomendações personalizadas',
  };
}

// Melhores horários padrão por rede
function getDefaultBestTimes(network?: SocialNetwork): BestTimesResult {
  const defaults: Record<string, TimeSlot[]> = {
    instagram: [
      { dayOfWeek: 2, hour: 11, score: 95, postsCount: 0, avgEngagement: 0, avgReach: 0 }, // Terça 11h
      { dayOfWeek: 3, hour: 11, score: 92, postsCount: 0, avgEngagement: 0, avgReach: 0 }, // Quarta 11h
      { dayOfWeek: 4, hour: 14, score: 90, postsCount: 0, avgEngagement: 0, avgReach: 0 }, // Quinta 14h
      { dayOfWeek: 5, hour: 10, score: 88, postsCount: 0, avgEngagement: 0, avgReach: 0 }, // Sexta 10h
      { dayOfWeek: 1, hour: 12, score: 85, postsCount: 0, avgEngagement: 0, avgReach: 0 }, // Segunda 12h
    ],
    facebook: [
      { dayOfWeek: 3, hour: 13, score: 95, postsCount: 0, avgEngagement: 0, avgReach: 0 }, // Quarta 13h
      { dayOfWeek: 4, hour: 13, score: 92, postsCount: 0, avgEngagement: 0, avgReach: 0 }, // Quinta 13h
      { dayOfWeek: 5, hour: 13, score: 90, postsCount: 0, avgEngagement: 0, avgReach: 0 }, // Sexta 13h
      { dayOfWeek: 2, hour: 15, score: 88, postsCount: 0, avgEngagement: 0, avgReach: 0 }, // Terça 15h
      { dayOfWeek: 1, hour: 9, score: 85, postsCount: 0, avgEngagement: 0, avgReach: 0 },  // Segunda 9h
    ],
    twitter: [
      { dayOfWeek: 3, hour: 9, score: 95, postsCount: 0, avgEngagement: 0, avgReach: 0 },  // Quarta 9h
      { dayOfWeek: 5, hour: 9, score: 92, postsCount: 0, avgEngagement: 0, avgReach: 0 },  // Sexta 9h
      { dayOfWeek: 4, hour: 12, score: 90, postsCount: 0, avgEngagement: 0, avgReach: 0 }, // Quinta 12h
      { dayOfWeek: 2, hour: 9, score: 88, postsCount: 0, avgEngagement: 0, avgReach: 0 },  // Terça 9h
      { dayOfWeek: 1, hour: 8, score: 85, postsCount: 0, avgEngagement: 0, avgReach: 0 },  // Segunda 8h
    ],
    linkedin: [
      { dayOfWeek: 2, hour: 10, score: 95, postsCount: 0, avgEngagement: 0, avgReach: 0 }, // Terça 10h
      { dayOfWeek: 3, hour: 10, score: 92, postsCount: 0, avgEngagement: 0, avgReach: 0 }, // Quarta 10h
      { dayOfWeek: 4, hour: 10, score: 90, postsCount: 0, avgEngagement: 0, avgReach: 0 }, // Quinta 10h
      { dayOfWeek: 1, hour: 8, score: 88, postsCount: 0, avgEngagement: 0, avgReach: 0 },  // Segunda 8h
      { dayOfWeek: 5, hour: 9, score: 85, postsCount: 0, avgEngagement: 0, avgReach: 0 },  // Sexta 9h
    ],
    youtube: [
      { dayOfWeek: 4, hour: 15, score: 95, postsCount: 0, avgEngagement: 0, avgReach: 0 }, // Quinta 15h
      { dayOfWeek: 5, hour: 15, score: 92, postsCount: 0, avgEngagement: 0, avgReach: 0 }, // Sexta 15h
      { dayOfWeek: 6, hour: 14, score: 90, postsCount: 0, avgEngagement: 0, avgReach: 0 }, // Sábado 14h
      { dayOfWeek: 0, hour: 14, score: 88, postsCount: 0, avgEngagement: 0, avgReach: 0 }, // Domingo 14h
      { dayOfWeek: 3, hour: 17, score: 85, postsCount: 0, avgEngagement: 0, avgReach: 0 }, // Quarta 17h
    ],
    tiktok: [
      { dayOfWeek: 2, hour: 19, score: 95, postsCount: 0, avgEngagement: 0, avgReach: 0 }, // Terça 19h
      { dayOfWeek: 4, hour: 19, score: 92, postsCount: 0, avgEngagement: 0, avgReach: 0 }, // Quinta 19h
      { dayOfWeek: 5, hour: 17, score: 90, postsCount: 0, avgEngagement: 0, avgReach: 0 }, // Sexta 17h
      { dayOfWeek: 6, hour: 12, score: 88, postsCount: 0, avgEngagement: 0, avgReach: 0 }, // Sábado 12h
      { dayOfWeek: 0, hour: 12, score: 85, postsCount: 0, avgEngagement: 0, avgReach: 0 }, // Domingo 12h
    ],
    pinterest: [
      { dayOfWeek: 6, hour: 21, score: 95, postsCount: 0, avgEngagement: 0, avgReach: 0 }, // Sábado 21h
      { dayOfWeek: 0, hour: 20, score: 92, postsCount: 0, avgEngagement: 0, avgReach: 0 }, // Domingo 20h
      { dayOfWeek: 5, hour: 15, score: 90, postsCount: 0, avgEngagement: 0, avgReach: 0 }, // Sexta 15h
      { dayOfWeek: 2, hour: 21, score: 88, postsCount: 0, avgEngagement: 0, avgReach: 0 }, // Terça 21h
      { dayOfWeek: 4, hour: 20, score: 85, postsCount: 0, avgEngagement: 0, avgReach: 0 }, // Quinta 20h
    ],
  };

  const bestTimes = network ? defaults[network] || defaults.instagram : defaults.instagram;

  // Gerar heatmap padrão
  const heatmap: number[][] = Array(7)
    .fill(null)
    .map(() => Array(24).fill(30)); // Base 30%

  bestTimes.forEach((slot) => {
    heatmap[slot.dayOfWeek][slot.hour] = slot.score;
    // Horários adjacentes também são bons
    if (slot.hour > 0) heatmap[slot.dayOfWeek][slot.hour - 1] = Math.max(heatmap[slot.dayOfWeek][slot.hour - 1], slot.score - 15);
    if (slot.hour < 23) heatmap[slot.dayOfWeek][slot.hour + 1] = Math.max(heatmap[slot.dayOfWeek][slot.hour + 1], slot.score - 15);
  });

  return {
    bestTimes,
    heatmap,
    recommendations: {
      bestDay: 'Terça',
      bestHour: '11:00',
      worstDay: 'Domingo',
      worstHour: '03:00',
      summary: 'Baseado em dados da indústria. Conecte uma conta para recomendações personalizadas.',
    },
  };
}
