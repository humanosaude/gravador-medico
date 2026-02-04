/**
 * Social Flow - Cron Jobs API
 * 
 * Endpoint para execução de workers via cron job.
 * Configure no Vercel Cron ou serviço similar.
 * 
 * Exemplo de configuração vercel.json:
 * crons: [
 *   { path: "/api/social-flow/cron?job=publish", schedule: "every 1 minute" },
 *   { path: "/api/social-flow/cron?job=analytics", schedule: "every 1 hour" },
 *   { path: "/api/social-flow/cron?job=tokens", schedule: "every 6 hours" },
 *   { path: "/api/social-flow/cron?job=sync", schedule: "every day" }
 * ]
 */

import { NextRequest, NextResponse } from 'next/server';

// Importar workers diretamente para evitar problemas de módulo
import { publishScheduledPosts, retryFailedPosts } from '@/lib/social-flow/workers/publish-scheduler';
import { fetchAnalytics } from '@/lib/social-flow/workers/analytics-fetcher';
import { refreshTokens, checkTokenStatus } from '@/lib/social-flow/workers/token-refresher';
import { syncAllAccounts, cleanupInactiveAccounts } from '@/lib/social-flow/workers/account-syncer';

// Verificar token de autorização para cron jobs
function validateCronAuth(request: NextRequest): boolean {
  // Vercel Cron Jobs incluem este header automaticamente
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // Se CRON_SECRET está configurado, validar
  if (cronSecret) {
    return authHeader === `Bearer ${cronSecret}`;
  }

  // Em desenvolvimento, permitir sem auth
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  // Vercel Cron inclui header especial
  const isVercelCron = request.headers.get('x-vercel-cron') === '1';
  return isVercelCron;
}

export async function GET(request: NextRequest) {
  // Validar autorização
  if (!validateCronAuth(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const job = searchParams.get('job');

  if (!job) {
    return NextResponse.json(
      { error: 'Job parameter required. Options: publish, analytics, tokens, sync, all' },
      { status: 400 }
    );
  }

  const startTime = Date.now();
  let result: any = {};

  try {
    switch (job) {
      case 'publish':
        // Publicar posts agendados (a cada minuto)
        const publishReport = await publishScheduledPosts();
        result = {
          job: 'publish',
          ...publishReport,
        };
        break;

      case 'retry':
        // Retentar posts que falharam
        const retryReport = await retryFailedPosts();
        result = {
          job: 'retry',
          ...retryReport,
        };
        break;

      case 'analytics':
        // Buscar métricas (a cada hora)
        const analyticsReport = await fetchAnalytics();
        result = {
          job: 'analytics',
          ...analyticsReport,
        };
        break;

      case 'tokens':
        // Renovar tokens (a cada 6 horas)
        const tokensReport = await refreshTokens();
        result = {
          job: 'tokens',
          ...tokensReport,
        };
        break;

      case 'token-status':
        // Verificar status dos tokens
        const tokenStatus = await checkTokenStatus();
        result = {
          job: 'token-status',
          ...tokenStatus,
        };
        break;

      case 'sync':
        // Sincronizar contas (diariamente)
        const syncReport = await syncAllAccounts();
        result = {
          job: 'sync',
          ...syncReport,
        };
        break;

      case 'cleanup':
        // Limpar contas inativas
        const cleanupReport = await cleanupInactiveAccounts();
        result = {
          job: 'cleanup',
          ...cleanupReport,
        };
        break;

      case 'all':
        // Executar todos os jobs (para teste/manutenção)
        const allResults = {
          publish: await publishScheduledPosts(),
          analytics: await fetchAnalytics(),
          tokens: await refreshTokens(),
          sync: await syncAllAccounts(),
        };
        result = {
          job: 'all',
          results: allResults,
        };
        break;

      default:
        return NextResponse.json(
          { error: `Unknown job: ${job}. Options: publish, retry, analytics, tokens, token-status, sync, cleanup, all` },
          { status: 400 }
        );
    }

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      duration: `${duration}ms`,
      ...result,
    });
  } catch (error: any) {
    console.error(`[Cron] Error executing job ${job}:`, error);

    const duration = Date.now() - startTime;

    return NextResponse.json(
      {
        success: false,
        job,
        error: error.message,
        duration: `${duration}ms`,
      },
      { status: 500 }
    );
  }
}

// POST também suportado para flexibilidade
export async function POST(request: NextRequest) {
  return GET(request);
}
