// =====================================================
// CRON: AUDIT CAMPAIGNS
// =====================================================
// Roda a cada 30 minutos para auditar campanhas
// Configurar no Vercel: vercel.json
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { runCampaignAudit } from '@/lib/services/ads-auditor';

export const runtime = 'nodejs';
export const maxDuration = 60; // 1 minuto max

// =====================================================
// POST: Executar auditoria (chamado pelo cron)
// =====================================================

export async function POST(request: NextRequest) {
  console.log('⏰ Cron: Iniciando auditoria de campanhas...');

  try {
    // Verificar autorização
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // Vercel envia o secret no header
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.error('❌ Cron: Autorização inválida');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Executar auditoria
    const result = await runCampaignAudit();

    console.log('✅ Cron: Auditoria concluída', {
      campanhas: result.campaigns_analyzed,
      alertas: result.alerts_generated,
      oportunidades: result.opportunities_found,
    });

    return NextResponse.json({
      success: true,
      data: {
        campaigns_analyzed: result.campaigns_analyzed,
        alerts_generated: result.alerts_generated,
        opportunities_found: result.opportunities_found,
        errors_count: result.errors_count,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ Cron: Erro na auditoria:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      },
      { status: 500 }
    );
  }
}

// =====================================================
// GET: Executar manualmente (para testes)
// =====================================================

export async function GET(request: NextRequest) {
  // Permitir execução manual apenas em desenvolvimento
  const isDev = process.env.NODE_ENV === 'development';
  const hasSecret = request.nextUrl.searchParams.get('secret') === process.env.CRON_SECRET;

  if (!isDev && !hasSecret) {
    return NextResponse.json(
      { error: 'Use POST para executar via cron' },
      { status: 405 }
    );
  }

  console.log('🔧 Executando auditoria manual...');

  try {
    const result = await runCampaignAudit();

    return NextResponse.json({
      success: true,
      mode: 'manual',
      data: result,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ Erro na auditoria manual:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      },
      { status: 500 }
    );
  }
}
