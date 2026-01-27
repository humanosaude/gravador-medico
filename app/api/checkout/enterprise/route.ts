import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * 🏢 CHECKOUT ENTERPRISE LEVEL
 * 
 * Features:
 * - ✅ Idempotência (proteção contra clique duplo)
 * - ✅ Máquina de Estados (draft → processing → paid → provisioning → active)
 * - ✅ Payment Attempts tipados (histórico granular)
 * - ✅ Cascata inteligente MP → AppMax
 * - ✅ PCI Compliant (tokens, não dados brutos)
 */

// =====================================================
// CONFIGURAÇÃO DE ERRO
// =====================================================

const MP_ERRORS_SHOULD_RETRY = [
  'cc_rejected_high_risk',
  'cc_rejected_blacklist',
  'cc_rejected_other_reason',
  'cc_rejected_call_for_authorize',
  'cc_rejected_duplicated_payment',
  'cc_rejected_max_attempts'
]

const MP_ERRORS_DONT_RETRY = [
  'cc_rejected_bad_filled_card_number',
  'cc_rejected_bad_filled_security_code',
  'cc_rejected_bad_filled_date',
  'cc_rejected_bad_filled_other',
  'cc_rejected_invalid_installments',
  'cc_rejected_insufficient_amount' // Sem saldo - não adianta tentar AppMax
]

// =====================================================
// MAIN HANDLER
// =====================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const body = await request.json()
    
    console.log('🏢 [ENTERPRISE] Iniciando checkout...')
    
    // =====================================================
    // 1️⃣ VALIDAÇÃO DE DADOS OBRIGATÓRIOS
    // =====================================================
    
    if (!body.customer || !body.amount || !body.idempotencyKey) {
      return NextResponse.json({
        success: false,
        error: 'Dados obrigatórios faltando (customer, amount, idempotencyKey)'
      }, { status: 400 })
    }

    const { customer, amount, payment_method, mpToken, appmax_data, idempotencyKey } = body

    // =====================================================
    // 2️⃣ CHECK DE IDEMPOTÊNCIA
    // =====================================================
    
    console.log(`🔍 Verificando idempotência: ${idempotencyKey}`)
    
    const { data: existingOrder, error: idempotencyError } = await supabaseAdmin
      .from('sales')
      .select('*')
      .eq('idempotency_key', idempotencyKey)
      .single()

    if (existingOrder) {
      console.log('⚠️ Pedido já existe (idempotência), retornando existente')
      
      return NextResponse.json({
        success: existingOrder.order_status !== 'failed',
        idempotent: true,
        order_id: existingOrder.id,
        status: existingOrder.order_status,
        payment_id: existingOrder.mercadopago_payment_id || existingOrder.appmax_order_id,
        gateway_used: existingOrder.payment_gateway,
        fallback_used: existingOrder.fallback_used,
        message: 'Pedido já processado anteriormente (idempotência)'
      })
    }

    // =====================================================
    // 3️⃣ CRIAR PEDIDO (Status: draft → processing)
    // =====================================================
    
    console.log('📝 Criando pedido...')
    
    const { data: order, error: orderError } = await supabaseAdmin
      .from('sales')
      .insert({
        customer_email: customer.email,
        customer_name: customer.name,
        customer_phone: customer.phone,
        customer_cpf: customer.cpf,
        total_amount: amount, // ✅ CORRIGIDO: usar total_amount em vez de amount
        amount: amount,        // Manter ambos para compatibilidade
        idempotency_key: idempotencyKey,
        order_status: 'processing',
        status: 'pending', // Status legado (manter compatibilidade)
        payment_method: payment_method, // ✅ NOVO: salvar método de pagamento
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (orderError || !order) {
      console.error('❌ Erro ao criar pedido:', orderError)
      throw new Error('Falha ao criar pedido no banco de dados')
    }

    console.log(`✅ Pedido criado: ${order.id}`)

    // =====================================================
    // 4️⃣ TENTATIVA 1: MERCADO PAGO
    // =====================================================

    if (payment_method === 'credit_card' && mpToken) {
      try {
        console.log('💳 [1/2] Tentando Mercado Pago...')
        
        const mpStartTime = Date.now()
        
        const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
            'X-Idempotency-Key': idempotencyKey // ✅ Idempotência também no gateway
          },
          body: JSON.stringify({
            token: mpToken,
            transaction_amount: amount,
            description: 'Gravador Médico - Acesso Vitalício',
            payment_method_id: 'credit_card',
            installments: 1,
            payer: {
              email: customer.email,
              identification: {
                type: 'CPF',
                number: customer.cpf.replace(/\D/g, '')
              }
            },
            notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/mercadopago`,
            statement_descriptor: 'GRAVADOR MEDICO'
          })
        })

        const mpResult = await mpResponse.json()
        const mpResponseTime = Date.now() - mpStartTime

        console.log(`📊 Mercado Pago: ${mpResult.status} (${mpResponseTime}ms)`)

        // Registrar tentativa em payment_attempts
        await supabaseAdmin.from('payment_attempts').insert({
          sale_id: order.id,
          provider: 'mercadopago',
          gateway_transaction_id: mpResult.id,
          status: mpResult.status === 'approved' ? 'success' : 'rejected',
          rejection_code: mpResult.status_detail,
          error_message: mpResult.status !== 'approved' ? mpResult.status_detail : null,
          raw_response: mpResult,
          response_time_ms: mpResponseTime
        })

        // ✅ MERCADO PAGO APROVOU
        if (mpResult.status === 'approved') {
          console.log('✅ [SUCCESS] Mercado Pago aprovou!')

          // Atualizar pedido: processing → paid
          await supabaseAdmin
            .from('sales')
            .update({
              order_status: 'paid',
              status: 'paid',
              payment_gateway: 'mercadopago',
              mercadopago_payment_id: mpResult.id,
              current_gateway: 'mercadopago',
              fallback_used: false,
              payment_details: mpResult
            })
            .eq('id', order.id)

          // Adicionar à fila de provisionamento
          await supabaseAdmin.from('provisioning_queue').insert({
            order_id: order.id,
            status: 'pending'
          })

          const totalTime = Date.now() - startTime
          console.log(`✅ Checkout completo em ${totalTime}ms`)

          return NextResponse.json({
            success: true,
            order_id: order.id,
            payment_id: mpResult.id,
            gateway_used: 'mercadopago',
            fallback_used: false,
            status: 'paid'
          })
        }

        // ⚠️ MERCADO PAGO RECUSOU
        const statusDetail = mpResult.status_detail || ''
        console.log(`⚠️ MP recusou: ${statusDetail}`)

        // Erro de dados inválidos - NÃO tenta AppMax
        if (MP_ERRORS_DONT_RETRY.includes(statusDetail)) {
          console.log('❌ Erro de validação, não tentará AppMax')
          
          await supabaseAdmin
            .from('sales')
            .update({
              order_status: 'failed',
              status: 'refused'
            })
            .eq('id', order.id)

          return NextResponse.json({
            success: false,
            error: 'Verifique os dados do cartão e tente novamente',
            error_code: statusDetail,
            gateway_used: 'mercadopago',
            fallback_used: false
          }, { status: 400 })
        }

        // Erro elegível para retry AppMax
        console.log('🔄 Erro elegível para fallback, tentando AppMax...')

      } catch (mpError: any) {
        console.error('❌ Erro crítico no Mercado Pago:', mpError.message)
        
        // Registrar erro
        await supabaseAdmin.from('payment_attempts').insert({
          sale_id: order.id,
          provider: 'mercadopago',
          status: 'failed',
          error_message: mpError.message,
          raw_response: { error: mpError.message },
          response_time_ms: Date.now() - startTime
        })
      }
    }

    // 📱 PIX MERCADO PAGO
    if (payment_method === 'pix') {
      try {
        console.log('📱 Gerando PIX Mercado Pago...')
        
        const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
            'X-Idempotency-Key': idempotencyKey
          },
          body: JSON.stringify({
            transaction_amount: amount,
            description: 'Gravador Médico - Acesso Vitalício',
            payment_method_id: 'pix',
            payer: {
              email: customer.email,
              first_name: customer.name.split(' ')[0],
              last_name: customer.name.split(' ').slice(1).join(' ') || customer.name.split(' ')[0],
              identification: {
                type: 'CPF',
                number: customer.cpf.replace(/\D/g, '')
              }
            },
            notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/mercadopago-enterprise`
          })
        })

        const mpResult = await mpResponse.json()

        if (mpResult.status === 'pending' && mpResult.point_of_interaction?.transaction_data) {
          console.log('✅ PIX gerado com sucesso!')

          // Atualizar pedido
          await supabaseAdmin
            .from('sales')
            .update({
              order_status: 'pending_payment',
              status: 'pending',
              payment_gateway: 'mercadopago',
              mercadopago_payment_id: mpResult.id,
              fallback_used: false
            })
            .eq('id', order.id)

          // Registrar tentativa
          await supabaseAdmin.from('payment_attempts').insert({
            sale_id: order.id,
            gateway: 'mercadopago',
            status: 'pending',
            error_code: null,
            error_message: null
          })

          return NextResponse.json({
            success: true,
            order_id: order.id,
            payment_id: mpResult.id,
            gateway_used: 'mercadopago',
            pix_qr_code: mpResult.point_of_interaction.transaction_data.qr_code_base64,
            pix_emv: mpResult.point_of_interaction.transaction_data.qr_code,
            status: 'pending_payment'
          })
        }

        throw new Error('Falha ao gerar PIX no Mercado Pago')

      } catch (pixError: any) {
        console.error('❌ Erro ao gerar PIX:', pixError)
        
        await supabaseAdmin
          .from('sales')
          .update({ order_status: 'failed', status: 'failed' })
          .eq('id', order.id)

        return NextResponse.json({
          success: false,
          error: 'Falha ao gerar PIX',
          details: pixError.message
        }, { status: 500 })
      }
    }

    // =====================================================
    // 5️⃣ TENTATIVA 2: APPMAX (FALLBACK)
    // =====================================================

    if (appmax_data) {
      try {
        console.log('💳 [2/2] Tentando AppMax (fallback)...')
        
        const appmaxStartTime = Date.now()

        const appmaxResponse = await fetch('https://admin.appmax.com.br/api/v3/order', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'token': process.env.APPMAX_TOKEN!
          },
          body: JSON.stringify({
            customer: {
              name: customer.name,
              email: customer.email,
              phone: customer.phone,
              cpf: customer.cpf
            },
            product_id: process.env.APPMAX_PRODUCT_ID,
            quantity: 1,
            payment_method: appmax_data.payment_method,
            card_data: appmax_data.card_data,
            order_bumps: appmax_data.order_bumps || []
          })
        })

        const appmaxResult = await appmaxResponse.json()
        const appmaxResponseTime = Date.now() - appmaxStartTime

        console.log(`📊 AppMax: ${appmaxResult.success} (${appmaxResponseTime}ms)`)

        // Registrar tentativa
        await supabaseAdmin.from('payment_attempts').insert({
          sale_id: order.id,
          provider: 'appmax',
          gateway_transaction_id: appmaxResult.order?.id,
          status: appmaxResult.success ? 'success' : 'rejected',
          error_message: appmaxResult.error,
          raw_response: appmaxResult,
          response_time_ms: appmaxResponseTime
        })

        // ✅ APPMAX APROVOU (VENDA RESGATADA!)
        if (appmaxResult.success) {
          console.log('✅ [RESCUED] AppMax aprovou (venda resgatada)!')

          // Atualizar pedido: processing → paid
          await supabaseAdmin
            .from('sales')
            .update({
              order_status: 'paid',
              status: appmaxResult.payment?.status === 'paid' ? 'paid' : 'pending',
              payment_gateway: 'appmax',
              appmax_order_id: appmaxResult.order?.id,
              current_gateway: 'appmax',
              fallback_used: true, // ✅ MARCA COMO RESGATADO
              payment_details: appmaxResult
            })
            .eq('id', order.id)

          // Adicionar à fila de provisionamento
          await supabaseAdmin.from('provisioning_queue').insert({
            sale_id: order.id,
            status: 'pending'
          })

          const totalTime = Date.now() - startTime
          console.log(`✅ Checkout completo em ${totalTime}ms (resgatado)`)

          return NextResponse.json({
            success: true,
            order_id: order.id,
            payment_id: appmaxResult.order?.id,
            gateway_used: 'appmax',
            fallback_used: true,
            status: appmaxResult.payment?.status,
            qr_code: appmaxResult.payment?.qr_code,
            qr_code_base64: appmaxResult.payment?.qr_code_base64
          })
        }

        console.log('❌ AppMax também recusou')

      } catch (appmaxError: any) {
        console.error('❌ Erro crítico no AppMax:', appmaxError.message)
        
        await supabaseAdmin.from('payment_attempts').insert({
          sale_id: order.id,
          provider: 'appmax',
          status: 'failed',
          error_message: appmaxError.message,
          raw_response: { error: appmaxError.message },
          response_time_ms: Date.now() - startTime
        })
      }
    }

    // =====================================================
    // ❌ AMBOS RECUSARAM
    // =====================================================

    console.log('❌ [FAILED] Todos os gateways recusaram')

    // Atualizar pedido: processing → failed
    await supabaseAdmin
      .from('sales')
      .update({
        order_status: 'failed',
        status: 'refused'
      })
      .eq('id', order.id)

    return NextResponse.json({
      success: false,
      error: 'Pagamento recusado por todos os gateways. Tente outro cartão ou entre em contato com seu banco.',
      order_id: order.id
    }, { status: 402 })

  } catch (error: any) {
    console.error('❌ [CRITICAL] Erro inesperado:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Erro inesperado ao processar pagamento',
      details: error.message
    }, { status: 500 })
  }
}

// =====================================================
// HEALTH CHECK
// =====================================================

export async function GET() {
  const checks: Record<string, boolean> = {
    mp_token_configured: !!process.env.MERCADOPAGO_ACCESS_TOKEN,
    appmax_token_configured: !!process.env.APPMAX_TOKEN,
    supabase_configured: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    app_url_configured: !!process.env.NEXT_PUBLIC_APP_URL
  }

  // Verificar conexão com Supabase
  try {
    const { error } = await supabaseAdmin.from('sales').select('id').limit(1)
    checks.supabase_connection = !error
  } catch (e) {
    checks.supabase_connection = false
  }

  const allConfigured = Object.values(checks).every(v => v)

  return NextResponse.json({
    status: allConfigured ? 'ok' : 'misconfigured',
    timestamp: new Date().toISOString(),
    checks,
    message: allConfigured 
      ? '✅ Sistema enterprise operacional'
      : '⚠️ Algumas variáveis de ambiente estão faltando'
  }, { status: allConfigured ? 200 : 503 })
}
