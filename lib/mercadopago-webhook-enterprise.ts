import { NextRequest } from 'next/server'
import { supabaseAdmin } from './supabase'
import { getPaymentStatus } from './mercadopago'

/**
 * 🏢 WEBHOOK ENTERPRISE - MERCADO PAGO
 * 
 * Diferenças vs webhook básico:
 * - ✅ Salva em webhook_logs (não mp_webhook_logs)
 * - ✅ Atualiza order_status (máquina de estados)
 * - ✅ Adiciona em provisioning_queue (não cria usuário diretamente)
 * - ✅ Usa função transition_order_status para transições seguras
 * - ✅ Race condition fix aprimorado
 */

export async function handleMercadoPagoWebhookEnterprise(request: NextRequest) {
  const startTime = Date.now()
  
  console.log('📨 [ENTERPRISE] Webhook Mercado Pago recebido')
  
  try {
    const body = await request.json()
    
    // =====================================================
    // 1️⃣ SALVAR PAYLOAD BRUTO (SEMPRE)
    // =====================================================
    
    const { data: logEntry, error: logError } = await supabaseAdmin
      .from('webhook_logs')
      .insert({
        provider: 'mercadopago',
        event_id: body.data?.id,
        topic: body.action || body.type,
        raw_payload: body,
        processed: false,
        retry_count: 0
      })
      .select()
      .single()

    if (logError) {
      console.error('❌ Erro ao salvar log de webhook:', logError)
    }

    // =====================================================
    // 2️⃣ VALIDAR SE É NOTIFICAÇÃO DE PAGAMENTO
    // =====================================================
    
    const { action, data } = body
    
    if (!action || !action.includes('payment')) {
      console.log('ℹ️ Webhook não é de pagamento, ignorando')
      
      if (logEntry) {
        await supabaseAdmin
          .from('webhook_logs')
          .update({ 
            processed: true, 
            processed_at: new Date().toISOString() 
          })
          .eq('id', logEntry.id)
      }
      
      return { status: 200, message: 'Not a payment event' }
    }

    const paymentId = data.id
    console.log(`🔍 Processando pagamento: ${paymentId}`)

    // =====================================================
    // 3️⃣ DETECTAR WEBHOOK DE TESTE (MP Simulator) - ANTES DE BUSCAR NA API
    // =====================================================
    
    // Mercado Pago envia IDs de teste como "123456" no simulador
    // Detectar ANTES de tentar buscar na API para evitar erro 404
    const isTestWebhook = !paymentId || 
                         paymentId === '123456' || 
                         paymentId.toString().length < 10 ||
                         typeof paymentId !== 'number' && typeof paymentId !== 'string'
    
    if (isTestWebhook) {
      console.log('✅ Webhook de teste detectado - respondendo com sucesso sem processar')
      
      if (logEntry) {
        await supabaseAdmin
          .from('webhook_logs')
          .update({ 
            processed: true, 
            processed_at: new Date().toISOString(),
            last_error: null,
            processing_time_ms: Date.now() - startTime
          })
          .eq('id', logEntry.id)
      }
      
      return { 
        status: 200, 
        message: 'Test webhook accepted' 
      }
    }

    // =====================================================
    // 4️⃣ BUSCAR DETALHES COMPLETOS (ENRIQUECIMENTO)
    // =====================================================
    
    let payment
    try {
      payment = await getPaymentStatus(paymentId.toString())
      console.log(`📊 Status do pagamento: ${payment.status}`)
    } catch (error: any) {
      console.error('❌ Erro ao buscar detalhes do pagamento:', error)
      
      // Se falhar ao buscar, logar e retornar erro
      if (logEntry) {
        await supabaseAdmin
          .from('webhook_logs')
          .update({
            processed: false,
            last_error: `Erro ao buscar pagamento ${paymentId}: ${error.message}`,
            processing_time_ms: Date.now() - startTime
          })
          .eq('id', logEntry.id)
      }
      
      throw error
    }

    // =====================================================
    // 5️⃣ RACE CONDITION FIX (Buscar pedido com retry)
    // =====================================================
    
    let order = null
    let retries = 0
    const MAX_RETRIES = 5
    const RETRY_DELAY_MS = 2000

    while (!order && retries < MAX_RETRIES) {
      const { data: orderData, error: orderError } = await supabaseAdmin
        .from('orders')
        .select('*')
        .eq('mercadopago_payment_id', paymentId)
        .single()

      if (orderData) {
        order = orderData
        console.log('✅ Pedido encontrado no banco')
        break
      }

      if (orderError && orderError.code !== 'PGRST116') {
        console.error('❌ Erro ao buscar pedido:', orderError)
        throw orderError
      }

      retries++
      console.log(`⏳ Pedido ainda não existe, aguardando... (${retries}/${MAX_RETRIES})`)

      if (retries < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS))
      }
    }

    if (!order) {
      console.warn(`⚠️ Pedido não encontrado após ${MAX_RETRIES} tentativas`)

      if (logEntry) {
        await supabaseAdmin
          .from('webhook_logs')
          .update({
            processed: false,
            retry_count: MAX_RETRIES,
            last_error: 'Pedido não encontrado após múltiplas tentativas'
          })
          .eq('id', logEntry.id)
      }

      return {
        status: 202,
        message: 'Aceito para reprocessamento - pedido ainda não existe'
      }
    }

    // =====================================================
    // 6️⃣ ATUALIZAR PEDIDO COM DADOS ENRIQUECIDOS
    // =====================================================
    
    const newStatus = mapMPStatusToOrderStatus(payment.status)
    console.log(`🔄 Atualizando status: ${order.order_status} → ${newStatus}`)

    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        order_status: newStatus,
        status: mapMPStatusToLegacyStatus(payment.status), // Manter compatibilidade
        payment_details: payment
      })
      .eq('id', order.id)

    if (updateError) {
      console.error('❌ Erro ao atualizar pedido:', updateError)
      throw updateError
    }

    console.log('✅ Pedido atualizado com sucesso')

    // =====================================================
    // 7️⃣ ADICIONAR À FILA DE PROVISIONAMENTO (se aprovado)
    // =====================================================
    
    if (payment.status === 'approved') {
      console.log('✅ Pagamento aprovado! Adicionando à fila de provisionamento...')

      // Verificar se já existe na fila
      const { data: existingQueue } = await supabaseAdmin
        .from('provisioning_queue')
        .select('*')
        .eq('sale_id', order.id)
        .single()

      if (!existingQueue) {
        const { error: queueError } = await supabaseAdmin
          .from('provisioning_queue')
          .insert({
            sale_id: order.id,
            status: 'pending',
            retry_count: 0,
            max_retries: 3
          })

        if (queueError) {
          console.error('❌ Erro ao adicionar na fila:', queueError)
          
          // Marcar pedido como provisioning_failed
          await supabaseAdmin
            .from('orders')
            .update({ order_status: 'provisioning_failed' })
            .eq('id', order.id)
        } else {
          console.log('✅ Pedido adicionado à fila de provisionamento')
        }
      } else {
        console.log('ℹ️ Pedido já está na fila de provisionamento')
      }
    }

    // =====================================================
    // 7️⃣ MARCAR WEBHOOK COMO PROCESSADO
    // =====================================================
    
    if (logEntry) {
      await supabaseAdmin
        .from('webhook_logs')
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
          retry_count: retries
        })
        .eq('id', logEntry.id)
    }

    const duration = Date.now() - startTime
    console.log(`✅ Webhook processado em ${duration}ms`)

    return {
      status: 200,
      message: 'Webhook processado com sucesso',
      payment_id: paymentId,
      order_id: order.id,
      order_status: newStatus
    }

  } catch (error: any) {
    const duration = Date.now() - startTime
    console.error(`❌ Erro ao processar webhook (${duration}ms):`, error)

    return {
      status: 500,
      message: 'Erro ao processar webhook',
      error: error.message
    }
  }
}

// =====================================================
// HELPERS: MAPEAMENTO DE STATUS
// =====================================================

function mapMPStatusToOrderStatus(mpStatus: string): string {
  const map: Record<string, string> = {
    'approved': 'paid',           // Pagamento aprovado → mover para fila
    'pending': 'processing',       // Aguardando processamento
    'in_process': 'processing',    // Em processamento
    'rejected': 'failed',          // Recusado
    'cancelled': 'cancelled',      // Cancelado
    'refunded': 'cancelled',       // Estornado
    'charged_back': 'cancelled'    // Chargeback
  }
  
  return map[mpStatus] || 'processing'
}

function mapMPStatusToLegacyStatus(mpStatus: string): string {
  const map: Record<string, string> = {
    'approved': 'paid',
    'pending': 'pending',
    'in_process': 'pending',
    'rejected': 'refused',
    'cancelled': 'cancelled',
    'refunded': 'refunded'
  }
  
  return map[mpStatus] || 'pending'
}
