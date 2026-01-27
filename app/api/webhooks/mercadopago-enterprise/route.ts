import { NextRequest, NextResponse } from 'next/server'
import { handleMercadoPagoWebhookEnterprise } from '@/lib/mercadopago-webhook-enterprise'

/**
 * 🔔 WEBHOOK ROUTE - MERCADO PAGO ENTERPRISE
 * 
 * Endpoint para receber notificações do Mercado Pago
 * URL de configuração no MP: https://seu-dominio.com/api/webhooks/mercadopago-enterprise
 */

export async function POST(request: NextRequest) {
  console.log('📨 [WEBHOOK ROUTE] Recebendo notificação do Mercado Pago')

  try {
    // =====================================================
    // 1️⃣ VALIDAR ASSINATURA (Opcional mas recomendado)
    // =====================================================
    
    // const signature = request.headers.get('x-signature')
    // const signatureId = request.headers.get('x-request-id')
    
    // TODO: Implementar validação de assinatura do MP
    // if (!validateMercadoPagoSignature(signature, signatureId, body)) {
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    // }

    // =====================================================
    // 2️⃣ PROCESSAR WEBHOOK
    // =====================================================
    
    const result = await handleMercadoPagoWebhookEnterprise(request)

    // =====================================================
    // 3️⃣ RETORNAR RESPOSTA
    // =====================================================
    
    return NextResponse.json(
      { 
        success: result.status === 200,
        message: result.message 
      },
      { status: result.status }
    )

  } catch (error: any) {
    console.error('❌ Erro crítico no webhook route:', error)

    // Retornar 500 para indicar erro real
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: error.message
    }, { status: 500 })
  }
}

/**
 * Health check do webhook
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'mercadopago-enterprise-webhook',
    timestamp: new Date().toISOString(),
    message: 'Webhook está operacional'
  })
}
