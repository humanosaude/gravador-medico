// =====================================================
// API: OPTIMIZE CAMPAIGNS - CRON JOB / MANUAL
// =====================================================
// Endpoint para executar otimização de campanhas
// Pode ser chamado via Cron Job ou botão no dashboard
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { runOptimization, DEFAULT_RULES } from '@/lib/ads/optimize-campaigns';
import type { OptimizationRules } from '@/lib/ads/optimize-campaigns';

export const runtime = 'nodejs';
export const maxDuration = 60; // 1 minuto

// =====================================================
// POST: Executar otimização (manual ou cron)
// =====================================================

export async function POST(request: NextRequest) {
  console.log('🚀 Recebida requisição de otimização de campanhas');

  try {
    // Verificar autorização para cron jobs
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    // Se tem CRON_SECRET configurado, valida
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // Também aceita chamadas do dashboard (sem auth específico)
      const origin = request.headers.get('origin');
      const isInternalCall = origin?.includes('localhost') || 
                             origin?.includes('vercel.app') ||
                             origin?.includes('gravador-medico');
      
      if (!isInternalCall) {
        return NextResponse.json(
          { success: false, error: 'Não autorizado' },
          { status: 401 }
        );
      }
    }

    // Parse de regras customizadas (opcional)
    let customRules: Partial<OptimizationRules> = {};
    
    try {
      const body = await request.json();
      if (body.rules) {
        customRules = {
          pauseSpendThreshold: body.rules.pauseSpendThreshold,
          scaleRoasThreshold: body.rules.scaleRoasThreshold,
          scaleBudgetIncrease: body.rules.scaleBudgetIncrease,
          maxDailyBudget: body.rules.maxDailyBudget,
          datePreset: body.rules.datePreset,
        };
        // Remover undefined values
        Object.keys(customRules).forEach(key => {
          if (customRules[key as keyof OptimizationRules] === undefined) {
            delete customRules[key as keyof OptimizationRules];
          }
        });
      }
    } catch {
      // Body vazio ou inválido, usa regras padrão
    }

    console.log('📋 Regras aplicadas:', { ...DEFAULT_RULES, ...customRules });

    // Executar otimização
    const result = await runOptimization(customRules);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Otimização concluída com sucesso',
        summary: {
          adsAnalyzed: result.adsAnalyzed,
          paused: result.actionsTaken.paused,
          scaled: result.actionsTaken.scaled,
          noAction: result.actionsTaken.noAction,
        },
        logs: result.logs,
        timestamp: new Date().toISOString(),
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Otimização concluída com erros',
        errors: result.errors,
        partialResults: {
          adsAnalyzed: result.adsAnalyzed,
          paused: result.actionsTaken.paused,
          scaled: result.actionsTaken.scaled,
        },
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('❌ Erro na otimização:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Erro interno ao executar otimização',
    }, { status: 500 });
  }
}

// =====================================================
// GET: Status e últimas otimizações
// =====================================================

export async function GET(request: NextRequest) {
  try {
    const { supabaseAdmin } = await import('@/lib/supabase');

    // Buscar últimos logs de otimização
    const { data: recentLogs, error } = await supabaseAdmin
      .from('optimization_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      throw new Error(`Erro ao buscar logs: ${error.message}`);
    }

    // Calcular estatísticas
    const stats = {
      totalLogs: recentLogs?.length || 0,
      byAction: {
        PAUSE: recentLogs?.filter(l => l.action_type === 'PAUSE').length || 0,
        SCALE: recentLogs?.filter(l => l.action_type === 'SCALE').length || 0,
        NO_ACTION: recentLogs?.filter(l => l.action_type === 'NO_ACTION').length || 0,
      },
      lastRun: recentLogs?.[0]?.created_at || null,
    };

    return NextResponse.json({
      success: true,
      status: 'ready',
      currentRules: DEFAULT_RULES,
      stats,
      recentLogs: recentLogs?.slice(0, 10) || [],
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
