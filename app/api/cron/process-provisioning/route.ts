import { NextRequest, NextResponse } from 'next/server'
import { processProvisioningQueue } from '@/lib/provisioning-worker'

/**
 * ⏰ CRON JOB - PROVISIONING QUEUE
 * 
 * Este endpoint deve ser chamado a cada 1 minuto por:
 * - Vercel Cron Jobs (vercel.json)
 * - GitHub Actions
 * - Cron externo (cron-job.org, easycron, etc)
 * 
 * Configuração Vercel (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/process-provisioning",
 *     "schedule": "* * * * *"
 *   }]
 * }
 */

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  console.log('⏰ [CRON] Iniciando job de provisionamento...')

  try {
    // =====================================================
    // 1️⃣ VALIDAR AUTORIZAÇÃO (Segurança)
    // =====================================================
    
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'provisioning-2026'
    const querySecret = new URL(request.url).searchParams.get('secret')

    // Vercel Cron adiciona automaticamente um header
    const isVercelCron = request.headers.get('user-agent')?.includes('vercel-cron')
    
    // Aceitar: Vercel Cron, Authorization header, ou query param secret
    const isAuthorized = isVercelCron || 
                         authHeader === `Bearer ${cronSecret}` ||
                         querySecret === cronSecret
    
    if (!isAuthorized) {
      console.warn('⚠️ Tentativa não autorizada de executar cron')
      
      return NextResponse.json({
        success: false,
        error: 'Não autorizado'
      }, { status: 401 })
    }

    // =====================================================
    // 2️⃣ PROCESSAR FILA
    // =====================================================
    
    const result = await processProvisioningQueue()

    // =====================================================
    // 3️⃣ RETORNAR RESULTADO
    // =====================================================
    
    const duration = Date.now() - startTime

    return NextResponse.json({
      success: result.success,
      processed: result.processed,
      failed: result.failed,
      errors: result.errors,
      duration_ms: duration,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    const duration = Date.now() - startTime
    console.error('❌ Erro crítico no cron job:', error)

    return NextResponse.json({
      success: false,
      error: error.message,
      duration_ms: duration,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

/**
 * Permitir GET para teste manual
 */
export async function GET(request: NextRequest) {
  console.log('🔍 [TEST] Executando cron manualmente...')

  // Passar para o POST
  return POST(request)
}

/**
 * Health check do cron
 */
export async function HEAD() {
  return new Response(null, {
    status: 200,
    headers: {
      'X-Cron-Status': 'ok',
      'X-Cron-Timestamp': new Date().toISOString()
    }
  })
}
