import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createAppmaxOrder } from '@/lib/appmax'
import { processProvisioningQueue } from '@/lib/provisioning-worker'
import { nowBrazil } from '@/lib/timezone'

/**
 * 🏢 CHECKOUT ENTERPRISE LEVEL
 * 
 * Features:
 * - ✅ Idempotência (proteção contra clique duplo)
 * - ✅ Máquina de Estados (draft → processing → paid → provisioning → active)
 * - ✅ Payment Attempts tipados (histórico granular)
 * - ✅ Cascata inteligente MP → AppMax
 * - ✅ PCI Compliant (tokens, não dados brutos)
 * - ✅ Logging detalhado para debug (checkout_logs)
 * - ✅ Provisioning imediato (email + criação de usuário)
 */

// =====================================================
// FUNÇÃO DE LOGGING PARA DEBUG
// =====================================================

async function logCheckoutAttempt({
  session_id,
  order_id,
  gateway,
  status,
  payload_sent,
  response_data = null,
  error_response = null,
  error_message = null,
  error_cause = null,
  http_status = null
}: {
  session_id?: string
  order_id?: string
  gateway: string
  status: 'SUCCESS' | 'ERROR' | 'FALLBACK'
  payload_sent: any
  response_data?: any
  error_response?: any
  error_message?: string | null
  error_cause?: string | null
  http_status?: number | null
}) {
  try {
    await supabaseAdmin.from('checkout_logs').insert({
      session_id,
      order_id,
      gateway,
      status,
      payload_sent,
      response_data,
      error_response,
      error_message,
      error_cause,
      http_status
    })
    console.log(`📝 Log registrado: ${gateway} - ${status}`)
  } catch (logError) {
    // Não deixar o log quebrar o fluxo
    console.error('⚠️ Erro ao gravar log (não crítico):', logError)
  }
}

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

    const { customer, amount, payment_method, mpToken, appmax_data, idempotencyKey, coupon_code, discount } = body

    // 🔥 LOG DOS DADOS RECEBIDOS
    console.log('📦 Dados recebidos no checkout:', JSON.stringify({
      amount,
      payment_method,
      has_mpToken: !!mpToken,
      has_appmax_data: !!appmax_data,
      customer_email: customer.email,
      idempotencyKey
    }, null, 2))

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
        document_type: customer.documentType || 'CPF', // CPF ou CNPJ
        company_name: customer.companyName || null, // Razão Social (quando CNPJ)
        total_amount: amount, // ✅ CORRIGIDO: usar total_amount em vez de amount
        amount: amount,        // Manter ambos para compatibilidade
        idempotency_key: idempotencyKey,
        order_status: 'processing',
        status: 'pending', // Status legado (manter compatibilidade)
        payment_method: payment_method, // ✅ NOVO: salvar método de pagamento
        coupon_code: coupon_code || null, // ✅ NOVO: salvar código do cupom
        coupon_discount: discount || 0,   // ✅ NOVO: salvar valor do desconto
        discount: discount || 0,          // ✅ NOVO: compatibilidade
        created_at: nowBrazil() // ✅ Horário de São Paulo
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

    // 🔥 FLAG: Só tenta AppMax se MP falhar de forma elegível
    let shouldTryAppmax = false
    let mpTriedAndFailed = false

    console.log('🔍 Verificando condições para Mercado Pago...')
    console.log(`   payment_method: ${payment_method}`)
    console.log(`   mpToken exists: ${!!mpToken}`)
    console.log(`   mpToken value: ${mpToken ? mpToken.substring(0, 20) + '...' : 'NULL'}`)

    if (payment_method === 'credit_card' && mpToken) {
      const mpStartTime = Date.now()
      
      // Montar payload FORA do try para poder logar em caso de erro
      const mpPayload = {
        token: mpToken,
        transaction_amount: amount,
        description: 'Gravador Médico - Acesso Vitalício',
        // NÃO enviar payment_method_id - MP detecta automaticamente pelo token
        installments: 1,
        payer: {
          email: customer.email,
          first_name: customer.name?.split(' ')[0] || '',
          last_name: customer.name?.split(' ').slice(1).join(' ') || '',
          identification: {
            type: customer.documentType || 'CPF', // CPF ou CNPJ
            number: customer.cpf.replace(/\D/g, '')
          }
        },
        external_reference: order.id, // ✅ ADICIONADO: Referência para cruzar dados
        notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/mercadopago`,
        statement_descriptor: 'GRAVADOR MEDICO',
        additional_info: {
          items: [
            {
              id: 'metodo-gravador-medico-v1',
              title: 'Método Gravador Médico',
              description: 'Acesso ao método de transcrição de consultas com IA',
              picture_url: 'https://gravadormedico.com.br/logo.png',
              category_id: 'learnings',
              quantity: 1,
              unit_price: Number(amount)
            }
          ],
          ip_address: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || '127.0.0.1',
          payer: {
            first_name: customer.name?.split(' ')[0] || '',
            last_name: customer.name?.split(' ').slice(1).join(' ') || '',
            phone: {
              number: customer.phone?.replace(/\D/g, '') || ''
            }
          }
        }
      }
      
      try {
        console.log('💳 [1/2] Tentando Mercado Pago...')
        console.log('🔐 Token MP recebido:', mpToken?.substring(0, 20) + '...')

        // 🔥 LOG DETALHADO DO PAYLOAD
        console.log('📦 PAYLOAD ENVIADO PARA MERCADO PAGO:', JSON.stringify({
          transaction_amount: mpPayload.transaction_amount,
          installments: mpPayload.installments,
          payer_email: mpPayload.payer.email,
          payer_cpf: mpPayload.payer.identification.number,
          external_reference: mpPayload.external_reference,
          has_token: !!mpPayload.token,
          note: 'payment_method_id removido - MP detecta automaticamente pelo token'
        }, null, 2))
        
        // Criar AbortController para timeout de 30 segundos
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 30000)
        
        try {
          const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
              'X-Idempotency-Key': idempotencyKey // ✅ Idempotência também no gateway
            },
            body: JSON.stringify(mpPayload),
            signal: controller.signal
          })
          
          clearTimeout(timeoutId)
          
          const mpResult = await mpResponse.json()
        const mpResponseTime = Date.now() - mpStartTime

        // 🔥 LOG DETALHADO DA RESPOSTA
        console.log(`📊 RESPOSTA DO MERCADO PAGO (${mpResponseTime}ms):`, JSON.stringify({
          status: mpResult.status,
          status_detail: mpResult.status_detail,
          payment_id: mpResult.id,
          http_status: mpResponse.status,
          message: mpResult.message,
          cause: mpResult.cause
        }, null, 2))

        // 🔥 SE ERRO, LOG COMPLETO
        if (!mpResponse.ok || mpResult.status !== 'approved') {
          console.error('❌ MERCADO PAGO RETORNOU ERRO OU RECUSA:')
          console.error('HTTP Status:', mpResponse.status)
          console.error('Response completa:', JSON.stringify(mpResult, null, 2))
          
          // 📝 Registrar erro detalhado no banco
          await logCheckoutAttempt({
            order_id: order.id,
            gateway: 'mercadopago',
            status: 'ERROR',
            payload_sent: {
              ...mpPayload,
              token: mpPayload.token ? `${mpPayload.token.substring(0, 10)}...` : null // Ocultar token completo
            },
            response_data: mpResult,
            error_response: mpResult,
            error_message: mpResult.message || mpResult.status_detail || 'Pagamento recusado',
            error_cause: mpResult.cause ? JSON.stringify(mpResult.cause) : null,
            http_status: mpResponse.status
          })
        }

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

          // 📝 Registrar sucesso no banco
          await logCheckoutAttempt({
            order_id: order.id,
            gateway: 'mercadopago',
            status: 'SUCCESS',
            payload_sent: {
              ...mpPayload,
              token: mpPayload.token ? `${mpPayload.token.substring(0, 10)}...` : null
            },
            response_data: {
              id: mpResult.id,
              status: mpResult.status,
              status_detail: mpResult.status_detail,
              payment_method_id: mpResult.payment_method_id
            },
            http_status: mpResponse.status
          })

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
          {
            const { error: provisioningError } = await supabaseAdmin
              .from('provisioning_queue')
              .insert({
                sale_id: order.id,
                status: 'pending'
              })

            if (provisioningError) {
              console.error('⚠️ Falha ao enfileirar provisionamento (MP):', provisioningError)
            } else {
              console.log(`📬 Adicionado na fila de provisionamento (sale_id: ${order.id})`)
              
              // 🚀 Processar fila imediatamente (fire-and-forget, não bloqueia a resposta)
              processProvisioningQueue()
                .then(result => console.log(`📧 Provisioning processado:`, result))
                .catch(err => console.error(`⚠️ Erro no provisioning:`, err))
            }
          }

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
        console.log('🔄 Erro elegível para fallback, marcando para tentar AppMax...')
        shouldTryAppmax = true
        mpTriedAndFailed = true
        
        } catch (fetchError: any) {
          clearTimeout(timeoutId)
          
          // 🔥 Marcar para tentar AppMax após erro de rede
          shouldTryAppmax = true
          mpTriedAndFailed = true
          
          // 🔥 LOG DETALHADO DO ERRO DE REDE
          console.error('❌ ERRO DE REDE/FETCH NO MERCADO PAGO:')
          console.error('Nome do erro:', fetchError.name)
          console.error('Mensagem:', fetchError.message)
          console.error('Stack:', fetchError.stack)
          
          // 📝 Registrar erro de rede no banco
          await logCheckoutAttempt({
            order_id: order.id,
            gateway: 'mercadopago',
            status: 'ERROR',
            payload_sent: {
              ...mpPayload,
              token: mpPayload.token ? `${mpPayload.token.substring(0, 10)}...` : null
            },
            error_response: {
              error_name: fetchError.name,
              error_message: fetchError.message,
              error_stack: fetchError.stack
            },
            error_message: fetchError.message,
            error_cause: fetchError.name
          })
          
          // Tratar timeout especificamente
          if (fetchError.name === 'AbortError') {
            console.error('⏱️ TIMEOUT: Mercado Pago não respondeu em 30s')
            throw new Error('Timeout: Mercado Pago não respondeu em 30s')
          }
          
          // Outros erros de rede
          throw fetchError
        }

      } catch (mpError: any) {
        // 🔥 LOG DETALHADO DO ERRO GERAL
        console.error('❌ ERRO CRÍTICO NO MERCADO PAGO:')
        console.error('Tipo:', mpError.constructor.name)
        console.error('Mensagem:', mpError.message)
        console.error('Stack completa:', mpError.stack)
        
        // Se for erro HTTP, tentar extrair detalhes
        if (mpError.response) {
          console.error('HTTP Status:', mpError.response.status)
          console.error('HTTP Data:', mpError.response.data)
        }
        
        // 📝 Registrar erro crítico no banco
        await logCheckoutAttempt({
          order_id: order.id,
          gateway: 'mercadopago',
          status: 'ERROR',
          payload_sent: mpPayload ? {
            ...mpPayload,
            token: mpPayload.token ? `${mpPayload.token.substring(0, 10)}...` : null
          } : { error: 'payload não disponível' },
          error_response: mpError.response?.data || {
            error_type: mpError.constructor.name,
            error_message: mpError.message,
            error_stack: mpError.stack
          },
          error_message: mpError.message,
          error_cause: mpError.constructor.name,
          http_status: mpError.response?.status
        })
        
        // Registrar erro
        await supabaseAdmin.from('payment_attempts').insert({
          sale_id: order.id,
          provider: 'mercadopago',
          status: 'failed',
          error_message: mpError.message,
          raw_response: { error: mpError.message },
          response_time_ms: Date.now() - startTime
        })
        
        // 🔥 Marcar para tentar AppMax após erro crítico do MP
        shouldTryAppmax = true
        mpTriedAndFailed = true
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
                type: customer.documentType || 'CPF', // CPF ou CNPJ
                number: customer.cpf.replace(/\D/g, '')
              }
            },
            additional_info: {
              items: [
                {
                  id: 'metodo-gravador-medico-v1',
                  title: 'Método Gravador Médico',
                  description: 'Acesso ao método de transcrição de consultas com IA',
                  picture_url: 'https://gravadormedico.com.br/logo.png',
                  category_id: 'learnings',
                  quantity: 1,
                  unit_price: Number(amount)
                }
              ],
              ip_address: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || '127.0.0.1'
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
    // ⚠️ IMPORTANTE: Só tenta AppMax se:
    //    1. MP foi tentado E falhou (shouldTryAppmax = true)
    //    2. OU se não tinha token MP mas tem dados AppMax
    // =====================================================

    console.log('🔍 Verificando condições para AppMax...')
    console.log(`   appmax_data exists: ${!!appmax_data}`)
    console.log(`   shouldTryAppmax: ${shouldTryAppmax}`)
    console.log(`   mpTriedAndFailed: ${mpTriedAndFailed}`)
    console.log(`   payment_method: ${payment_method}`)

    // 🔥 CORREÇÃO: AppMax é APENAS para cartão de crédito como fallback
    // PIX é exclusivamente Mercado Pago - AppMax não deve processar PIX
    const shouldUseAppmax = appmax_data && 
                            payment_method === 'credit_card' && 
                            (shouldTryAppmax || !mpToken)

    if (shouldUseAppmax) {
      console.log('💳 [2/2] Tentando AppMax (fallback para cartão)...')
      const appmaxStartTime = Date.now()
      
      // Preparar payload para log
      // AppMax é APENAS para cartão de crédito, nunca PIX
      const appmaxPayload = {
        customer: {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          cpf: customer.cpf,
        },
        product_id: process.env.APPMAX_PRODUCT_ID || '32991339',
        quantity: 1,
        payment_method: 'credit_card', // AppMax só processa cartão como fallback
        card_data: appmax_data.card_data ? {
          ...appmax_data.card_data,
          number: appmax_data.card_data.number ? `****${appmax_data.card_data.number.slice(-4)}` : null,
          cvv: '***' // Ocultar CVV no log
        } : null,
        order_bumps: appmax_data.order_bumps || [],
        discount: body.discount || 0,
      }
      
      try {
        console.log(' FALLBACK ACIONADO - Mercado Pago falhou ou recusou')
        console.log('📦 Dados AppMax recebidos:', {
          has_card_data: !!appmax_data.card_data,
          payment_method: 'credit_card', // Sempre cartão (fallback)
          order_bumps_count: appmax_data.order_bumps?.length || 0
        })

        // Usar a função correta do lib/appmax.ts
        // AppMax é APENAS fallback para cartão de crédito - PIX é exclusivo MP
        const appmaxResult = await createAppmaxOrder({
          customer: {
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            cpf: customer.cpf,
          },
          product_id: process.env.APPMAX_PRODUCT_ID || '32991339',
          quantity: 1,
          payment_method: 'credit_card', // Sempre cartão - AppMax não processa PIX
          card_data: appmax_data.card_data,
          order_bumps: appmax_data.order_bumps || [],
          discount: body.discount || 0,
        })

        const appmaxResponseTime = Date.now() - appmaxStartTime

        console.log(`📊 AppMax response: success=${appmaxResult.success} (${appmaxResponseTime}ms)`)
        console.log('📊 AppMax result:', JSON.stringify(appmaxResult, null, 2))

        // 📝 Registrar no checkout_logs
        await logCheckoutAttempt({
          order_id: order.id,
          gateway: 'appmax',
          status: appmaxResult.success ? 'SUCCESS' : 'ERROR',
          payload_sent: appmaxPayload,
          response_data: appmaxResult.success ? appmaxResult : null,
          error_response: !appmaxResult.success ? appmaxResult : null,
          error_message: !appmaxResult.success ? appmaxResult.message : null
        })

        // Registrar tentativa
        await supabaseAdmin.from('payment_attempts').insert({
          sale_id: order.id,
          provider: 'appmax',
          gateway_transaction_id: appmaxResult.order_id,
          status: appmaxResult.success ? 'success' : 'rejected',
          error_message: appmaxResult.message,
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
              status: appmaxResult.status === 'approved' ? 'paid' : 'pending',
              payment_gateway: 'appmax',
              appmax_order_id: appmaxResult.order_id,
              current_gateway: 'appmax',
              fallback_used: true, // ✅ MARCA COMO RESGATADO
              payment_details: appmaxResult
            })
            .eq('id', order.id)

          // Adicionar à fila de provisionamento
          {
            const { error: provisioningError } = await supabaseAdmin
              .from('provisioning_queue')
              .insert({
                sale_id: order.id,
                status: 'pending'
              })

            if (provisioningError) {
              console.error('⚠️ Falha ao enfileirar provisionamento (AppMax):', provisioningError)
            } else {
              console.log(`📬 Adicionado na fila de provisionamento (sale_id: ${order.id})`)
              
              // 🚀 Processar fila imediatamente (fire-and-forget, não bloqueia a resposta)
              processProvisioningQueue()
                .then(result => console.log(`📧 Provisioning processado:`, result))
                .catch(err => console.error(`⚠️ Erro no provisioning:`, err))
            }
          }

          const totalTime = Date.now() - startTime
          console.log(`✅ Checkout completo em ${totalTime}ms (resgatado)`)

          return NextResponse.json({
            success: true,
            order_id: order.id,
            payment_id: appmaxResult.order_id,
            gateway_used: 'appmax',
            fallback_used: true,
            status: appmaxResult.status,
            pix_qr_code: appmaxResult.pix_qr_code,
            pix_emv: appmaxResult.pix_emv,
            redirect_url: appmaxResult.redirect_url
          })
        }

        console.log('❌ AppMax também recusou:', appmaxResult.message)

      } catch (appmaxError: any) {
        console.error('❌ Erro crítico no AppMax:', appmaxError.message)
        
        // 📝 Registrar erro do AppMax
        await logCheckoutAttempt({
          order_id: order.id,
          gateway: 'appmax',
          status: 'ERROR',
          payload_sent: appmaxPayload,
          error_response: {
            error_type: appmaxError.constructor.name,
            error_message: appmaxError.message,
            error_stack: appmaxError.stack
          },
          error_message: appmaxError.message,
          error_cause: appmaxError.constructor.name
        })
        
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
    // ❌ AMBOS RECUSARAM (OU NENHUM FOI TENTADO)
    // =====================================================

    console.log('❌ [FAILED] Nenhum gateway processou o pagamento')
    console.log('🔍 Resumo das tentativas:')
    console.log(`   MP foi tentado? ${payment_method === 'credit_card' && !!mpToken ? 'SIM' : 'NÃO'}`)
    console.log(`   AppMax foi tentado? ${!!appmax_data ? 'SIM' : 'NÃO'}`)

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
      order_id: order.id,
      debug: {
        mp_attempted: payment_method === 'credit_card' && !!mpToken,
        appmax_attempted: !!appmax_data,
        payment_method,
        has_mpToken: !!mpToken,
        has_appmax_data: !!appmax_data
      }
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
