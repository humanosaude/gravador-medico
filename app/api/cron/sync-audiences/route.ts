/**
 * Cron Job: Sincronização de Públicos com Meta
 * 
 * Execução: Diariamente às 03:00 AM
 * 
 * Tarefas:
 * 1. Garante públicos padrão (Pixel/Social) existam na Meta
 * 2. Sincroniza compradores do dia (Customer Match)
 * 3. Sincroniza abandonos de carrinho
 * 4. Cria Lookalikes automáticos (1% e 5%)
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  ensureStandardAudiences,
  syncDatabaseAudiences,
  ensureLookalikes,
  runFullSync,
  runIncrementalSync,
} from '@/lib/services/audience-syncer';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutos

// Chave secreta para autorização do cron
const CRON_SECRET = process.env.CRON_SECRET || 'cron-secret-2026-gravador-medico-secure';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Verificar autorização
    const authHeader = request.headers.get('authorization');
    const cronSecret = request.nextUrl.searchParams.get('secret');
    
    // Verificar secret via header ou query param
    const isAuthorized = 
      authHeader === `Bearer ${CRON_SECRET}` ||
      cronSecret === CRON_SECRET;
    
    if (!isAuthorized) {
      console.error('[sync-audiences] Acesso não autorizado');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.log('[sync-audiences] ========================================');
    console.log('[sync-audiences] Iniciando sincronização de públicos...');
    console.log('[sync-audiences] Timestamp:', new Date().toISOString());
    console.log('[sync-audiences] ========================================');
    
    // Opção para sync incremental (apenas novos do dia)
    const incrementalOnly = request.nextUrl.searchParams.get('incremental') === 'true';
    
    // Executar sincronização
    const result = incrementalOnly 
      ? await runIncrementalSync()
      : await runFullSync();
    
    const duration = Date.now() - startTime;
    
    console.log('[sync-audiences] ========================================');
    console.log('[sync-audiences] Sincronização concluída!');
    console.log('[sync-audiences] Duração:', duration, 'ms');
    console.log('[sync-audiences] Sucesso:', result.success);
    console.log('[sync-audiences] ========================================');
    
    return NextResponse.json({
      success: result.success,
      message: result.success 
        ? 'Sincronização de públicos concluída com sucesso'
        : 'Sincronização concluída com erros',
      data: {
        audiencesCreated: result.audiencesCreated,
        audiencesUpdated: result.audiencesUpdated,
        lookalikesCreated: result.lookalikesCreated,
        stats: result.stats,
        errors: result.errors,
      },
      meta: {
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
        incrementalOnly,
      },
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[sync-audiences] Erro fatal:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Erro interno na sincronização de públicos',
        details: error instanceof Error ? error.message : String(error),
        meta: {
          duration: `${duration}ms`,
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}

// POST para forçar sincronização manual via API
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Verificar autorização
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token de autorização necessário' },
        { status: 401 }
      );
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    // Aceitar CRON_SECRET ou verificar se é admin (implementar conforme necessário)
    if (token !== CRON_SECRET) {
      // Aqui poderia verificar token de admin do Supabase
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 403 }
      );
    }
    
    const body = await request.json().catch(() => ({}));
    
    const incrementalOnly = body.incrementalOnly ?? false;
    
    console.log('[sync-audiences] POST - Sincronização manual iniciada');
    console.log('[sync-audiences] Incremental:', incrementalOnly);
    
    const result = incrementalOnly 
      ? await runIncrementalSync()
      : await runFullSync();
    
    const duration = Date.now() - startTime;
    
    return NextResponse.json({
      success: result.success,
      message: result.success 
        ? 'Sincronização manual concluída'
        : 'Sincronização concluída com erros',
      data: {
        audiencesCreated: result.audiencesCreated,
        audiencesUpdated: result.audiencesUpdated,
        lookalikesCreated: result.lookalikesCreated,
        stats: result.stats,
        errors: result.errors,
      },
      meta: {
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
        incrementalOnly,
      },
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[sync-audiences] POST - Erro:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Erro na sincronização manual',
        details: error instanceof Error ? error.message : String(error),
        meta: {
          duration: `${duration}ms`,
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}
