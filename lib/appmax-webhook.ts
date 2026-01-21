import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from './supabase'
import { sendPurchaseEvent } from './meta-capi'

interface AppmaxWebhookResult {
  response: NextResponse
}

const EVENT_STATUS_MAP: Record<string, { status: string; failure_reason?: string }> = {
  // Eventos da API
  'order.approved': { status: 'approved' },
  'order.paid': { status: 'paid' },
  'order.pending': { status: 'pending' },
  'order.rejected': { status: 'refused', failure_reason: 'Pedido recusado' },
  'order.cancelled': { status: 'cancelled', failure_reason: 'Pedido cancelado' },
  'order.refunded': { status: 'refunded', failure_reason: 'Estornado' },
  'pix.generated': { status: 'pending' },
  'pix.paid': { status: 'paid' },
  'pix.expired': { status: 'expired', failure_reason: 'PIX expirado' },
  // Eventos Appmax (normalizados)
  'pedido aprovado': { status: 'approved' },
  'pedido autorizado': { status: 'approved' },
  'pedido pago': { status: 'paid' },
  'pedido pendente de integracao': { status: 'pending' },
  'pedido integrado': { status: 'approved' },
  'pedido autorizado com atraso (60min)': { status: 'approved', failure_reason: 'Autorizado com atraso (60min)' },
  'pagamento nao autorizado': { status: 'refused', failure_reason: 'Pagamento nao autorizado' },
  'pagamento nao autorizado com atraso (60min)': { status: 'refused', failure_reason: 'Pagamento nao autorizado (60min)' },
  'boleto gerado': { status: 'pending' },
  'pedido com boleto vencido': { status: 'expired', failure_reason: 'Boleto vencido' },
  'pix gerado': { status: 'pending' },
  'pix pago': { status: 'paid' },
  'pix expirado': { status: 'expired', failure_reason: 'PIX expirado' },
  'pedido estornado': { status: 'refunded', failure_reason: 'Estornado' },
  'pedido chargeback em tratamento': { status: 'chargeback', failure_reason: 'Chargeback em analise' },
  'pedido chargeback ganho': { status: 'approved' },
  'upsell pago': { status: 'paid' }
}

const SUCCESS_STATUSES = new Set(['approved', 'paid', 'completed'])
const FAILED_STATUSES = new Set(['refused', 'rejected', 'cancelled', 'expired', 'failed', 'chargeback'])

const STATUS_ALIASES: Record<string, { status: string; failure_reason?: string }> = {
  approved: { status: 'approved' },
  paid: { status: 'paid' },
  completed: { status: 'completed' },
  aprovado: { status: 'approved' },
  pago: { status: 'paid' },
  autorizado: { status: 'approved' },
  pending: { status: 'pending' },
  pendente: { status: 'pending' },
  processing: { status: 'pending' },
  refused: { status: 'refused', failure_reason: 'Pagamento recusado' },
  rejected: { status: 'refused', failure_reason: 'Pagamento recusado' },
  failed: { status: 'refused', failure_reason: 'Pagamento recusado' },
  'nao autorizado': { status: 'refused', failure_reason: 'Pagamento nao autorizado' },
  payment_not_authorized: { status: 'refused', failure_reason: 'Pagamento nao autorizado' },
  cancelled: { status: 'cancelled', failure_reason: 'Pedido cancelado' },
  canceled: { status: 'cancelled', failure_reason: 'Pedido cancelado' },
  cancelado: { status: 'cancelled', failure_reason: 'Pedido cancelado' },
  expired: { status: 'expired', failure_reason: 'Expirado' },
  expirado: { status: 'expired', failure_reason: 'Expirado' },
  'boleto vencido': { status: 'expired', failure_reason: 'Boleto vencido' },
  'pix expirado': { status: 'expired', failure_reason: 'PIX expirado' },
  refunded: { status: 'refunded', failure_reason: 'Estornado' },
  estornado: { status: 'refunded', failure_reason: 'Estornado' },
  chargeback: { status: 'chargeback', failure_reason: 'Chargeback' }
}

function normalizeEventName(value?: string) {
  if (!value) return ''
  return value
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function normalizeSignature(signature: string) {
  return signature.startsWith('sha256=') ? signature.slice(7) : signature
}

function safeCompareSignature(a: string, b: string) {
  const aBuf = Buffer.from(a)
  const bBuf = Buffer.from(b)
  if (aBuf.length !== bBuf.length) {
    return false
  }
  return crypto.timingSafeEqual(aBuf, bBuf)
}

function resolveStatus(event?: string, status?: string) {
  const normalizedEvent = normalizeEventName(event)
  if (normalizedEvent && EVENT_STATUS_MAP[normalizedEvent]) {
    return EVENT_STATUS_MAP[normalizedEvent]
  }

  if (!status) {
    return null
  }

  const normalized = normalizeEventName(status)
  if (STATUS_ALIASES[normalized]) {
    return STATUS_ALIASES[normalized]
  }

  return { status: normalized }
}

async function logWebhook(params: {
  endpoint: string
  payload: any
  response_status: number
  processing_time_ms: number
  error?: string
}) {
  try {
    const basePayload: Record<string, any> = {
      endpoint: params.endpoint,
      payload: params.payload,
      response_status: params.response_status,
      processing_time_ms: params.processing_time_ms,
      error: params.error || null,
      success: params.response_status < 400,
      processed: true,
      processed_at: new Date().toISOString()
    }

    const { error } = await supabaseAdmin.from('webhooks_logs').insert(basePayload)

    if (error && (error.message?.includes('column') || error.code === 'PGRST204')) {
      await supabaseAdmin.from('webhooks_logs').insert({
        payload: params.payload
      })
    }
  } catch (error) {
    console.warn('⚠️ Falha ao registrar webhook:', error)
  }
}

async function updateCheckoutAttempt(params: {
  orderId?: string | null
  customerEmail?: string | null
  customerName?: string | null
  totalAmount: number
  paymentMethod?: string | null
  status: string
  saleId?: string | null
  failureReason?: string | null
}) {
  const now = new Date().toISOString()
  const isSuccess = SUCCESS_STATUSES.has(params.status)
  const isFailed = FAILED_STATUSES.has(params.status)

  const updateData: Record<string, any> = {
    status: params.status,
    failure_reason: params.failureReason || null,
    total_amount: params.totalAmount,
    payment_method: params.paymentMethod || null,
    recovery_status: isSuccess ? 'recovered' : isFailed ? 'abandoned' : 'pending',
    converted_at: isSuccess ? now : null,
    abandoned_at: isFailed ? now : null,
    sale_id: params.saleId || null,
    metadata: {
      appmax_order_id: params.orderId || null,
      failure_reason: params.failureReason || null,
      updated_by: 'webhook'
    },
    updated_at: now
  }

  let updated = false

  const runUpdate = async (filters: { appmax_order_id?: string; customer_email?: string }) => {
    let query = supabaseAdmin.from('checkout_attempts').update(updateData)

    if (filters.appmax_order_id) {
      query = query.eq('appmax_order_id', filters.appmax_order_id)
    }
    if (filters.customer_email) {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      query = query.eq('customer_email', filters.customer_email).in('status', ['pending', 'abandoned']).gte('created_at', since)
    }

    let { data, error } = await query.select('id')

    if (error && (error.message?.includes('total_amount') || error.message?.includes('failure_reason'))) {
      const fallbackData = { ...updateData }
      if (error.message?.includes('total_amount')) {
        delete fallbackData.total_amount
      }
      if (error.message?.includes('failure_reason')) {
        delete fallbackData.failure_reason
      }

      let fallbackQuery = supabaseAdmin.from('checkout_attempts').update(fallbackData)
      if (filters.appmax_order_id) {
        fallbackQuery = fallbackQuery.eq('appmax_order_id', filters.appmax_order_id)
      }
      if (filters.customer_email) {
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        fallbackQuery = fallbackQuery.eq('customer_email', filters.customer_email).in('status', ['pending', 'abandoned']).gte('created_at', since)
      }

      const fallbackResult = await fallbackQuery.select('id')
      data = fallbackResult.data
      error = fallbackResult.error
    }

    return { data, error }
  }

  if (params.orderId) {
    const { data, error } = await runUpdate({ appmax_order_id: params.orderId })
    if (!error && data?.length) {
      updated = true
    } else if (error && !error.message?.includes('appmax_order_id')) {
      console.warn('⚠️ Erro ao atualizar checkout_attempts por order_id:', error)
    }
  }

  if (!updated && params.customerEmail) {
    const { data, error } = await runUpdate({ customer_email: params.customerEmail })
    if (!error && data?.length) {
      updated = true
    } else if (error) {
      console.warn('⚠️ Erro ao atualizar checkout_attempts por email:', error)
    }
  }

  if (!updated && params.customerEmail) {
    const insertData: Record<string, any> = {
      session_id: params.orderId ? `order_${params.orderId}` : `webhook_${Date.now()}`,
      customer_email: params.customerEmail,
      customer_name: params.customerName || null,
      cart_items: [],
      cart_total: params.totalAmount,
      total_amount: params.totalAmount,
      appmax_order_id: params.orderId || null,
      payment_method: params.paymentMethod || null,
      status: params.status,
      failure_reason: params.failureReason || null,
      recovery_status: isSuccess ? 'recovered' : isFailed ? 'abandoned' : 'pending',
      converted_at: isSuccess ? now : null,
      abandoned_at: isFailed ? now : null,
      metadata: {
        appmax_order_id: params.orderId || null,
        failure_reason: params.failureReason || null,
        created_by: 'webhook'
      }
    }

    let { error } = await supabaseAdmin.from('checkout_attempts').insert(insertData)
    if (error && (
      error.message?.includes('total_amount') ||
      error.message?.includes('appmax_order_id') ||
      error.message?.includes('failure_reason')
    )) {
      const fallbackData = { ...insertData }
      if (error.message?.includes('total_amount')) {
        delete fallbackData.total_amount
      }
      if (error.message?.includes('appmax_order_id')) {
        delete fallbackData.appmax_order_id
      }
      if (error.message?.includes('failure_reason')) {
        delete fallbackData.failure_reason
      }

      const fallbackResult = await supabaseAdmin.from('checkout_attempts').insert(fallbackData)
      error = fallbackResult.error
    }
    if (error) {
      console.warn('⚠️ Erro ao inserir checkout_attempts via webhook:', error)
    }
  }
}

export async function handleAppmaxWebhook(request: NextRequest, endpoint: string): Promise<AppmaxWebhookResult> {
  const startTime = Date.now()
  const secret = process.env.APPMAX_WEBHOOK_SECRET
  const signatureHeader = request.headers.get('x-appmax-signature') || ''
  const timestampHeader = request.headers.get('x-appmax-timestamp')
  const rawBody = await request.text()

  let payload: any
  try {
    payload = JSON.parse(rawBody)
  } catch (error) {
    await logWebhook({
      endpoint,
      payload: rawBody,
      response_status: 400,
      processing_time_ms: Date.now() - startTime,
      error: 'Payload inválido'
    })

    return { response: NextResponse.json({ error: 'Payload inválido' }, { status: 400 }) }
  }

  if (secret) {
    if (!signatureHeader) {
      await logWebhook({
        endpoint,
        payload,
        response_status: 401,
        processing_time_ms: Date.now() - startTime,
        error: 'Assinatura ausente'
      })
      return { response: NextResponse.json({ error: 'Assinatura ausente' }, { status: 401 }) }
    }

    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
    const provided = normalizeSignature(signatureHeader)

    if (!safeCompareSignature(expected, provided)) {
      await logWebhook({
        endpoint,
        payload,
        response_status: 401,
        processing_time_ms: Date.now() - startTime,
        error: 'Assinatura inválida'
      })
      return { response: NextResponse.json({ error: 'Assinatura inválida' }, { status: 401 }) }
    }

    if (timestampHeader) {
      const timestampMs = Number(timestampHeader)
      const parsed = Number.isNaN(timestampMs) ? Date.parse(timestampHeader) : timestampMs * (timestampMs < 1e12 ? 1000 : 1)
      if (!Number.isNaN(parsed) && Math.abs(Date.now() - parsed) > 5 * 60 * 1000) {
        await logWebhook({
          endpoint,
          payload,
          response_status: 401,
          processing_time_ms: Date.now() - startTime,
          error: 'Timestamp inválido'
        })
        return { response: NextResponse.json({ error: 'Timestamp inválido' }, { status: 401 }) }
      }
    }
  } else {
    console.warn('⚠️ APPMAX_WEBHOOK_SECRET não configurado - assinatura não validada')
  }

  const eventName = payload.event || payload.type || payload?.data?.event

  if (eventName === 'test' && process.env.NODE_ENV !== 'production') {
    await logWebhook({
      endpoint,
      payload,
      response_status: 200,
      processing_time_ms: Date.now() - startTime
    })
    return { response: NextResponse.json({ success: true, message: 'Teste recebido' }) }
  }

  const data = payload.data || payload
  const mapping = resolveStatus(eventName, data?.status || payload?.status)

  if (!mapping) {
    await logWebhook({
      endpoint,
      payload,
      response_status: 200,
      processing_time_ms: Date.now() - startTime
    })
    return { response: NextResponse.json({ success: true, message: 'Evento ignorado' }) }
  }

  const status = mapping.status
  const failureReason = mapping.failure_reason

  const orderId = data.order_id || data.appmax_order_id || data.order?.id || payload.order_id || payload.appmax_order_id
  const customer = data.customer || payload.customer || {}
  const customerEmail = data.customer_email || payload.customer_email || customer.email || payload.email || null
  const customerName = data.customer_name || payload.customer_name || customer.name || (customerEmail ? customerEmail.split('@')[0] : null)
  const customerPhone = data.customer_phone || payload.customer_phone || customer.phone || null
  const customerCpf = data.customer_cpf || payload.customer_cpf || customer.cpf || null
  const totalAmount = Number(
    data.total_amount ||
    data.amount ||
    data.total ||
    payload.total_amount ||
    payload.amount ||
    0
  )
  const paymentMethod = data.payment_method || payload.payment_method || null

  await logWebhook({
    endpoint,
    payload,
    response_status: 200,
    processing_time_ms: Date.now() - startTime
  })

  if (!orderId || !customerEmail) {
    return { response: NextResponse.json({ success: true, message: 'Dados insuficientes' }) }
  }

  let customerId: string | null = null

  try {
    const { data: customerRow, error: customerError } = await supabaseAdmin
      .from('customers')
      .upsert({
        email: customerEmail,
        name: customerName,
        phone: customerPhone,
        cpf: customerCpf
      }, {
        onConflict: 'email',
        ignoreDuplicates: false
      })
      .select('id')
      .single()

    if (!customerError) {
      customerId = customerRow?.id || null
    }
  } catch (error) {
    console.warn('⚠️ Erro ao upsert customer:', error)
  }

  let saleId: string | null = null
  try {
    const now = new Date().toISOString()
    const salePayload: Record<string, any> = {
      appmax_order_id: orderId,
      customer_id: customerId,
      customer_name: customerName || 'Cliente Appmax',
      customer_email: customerEmail,
      customer_phone: customerPhone,
      customer_cpf: customerCpf,
      total_amount: totalAmount,
      subtotal: totalAmount,
      discount: 0,
      status,
      failure_reason: failureReason || null,
      payment_method: paymentMethod,
      paid_at: SUCCESS_STATUSES.has(status) ? now : null,
      refunded_at: status === 'refunded' ? now : null,
      updated_at: now
    }

    let { data: saleRow, error: saleError } = await supabaseAdmin
      .from('sales')
      .upsert(salePayload, { onConflict: 'appmax_order_id' })
      .select('id')
      .single()

    if (saleError && saleError.message?.includes('failure_reason')) {
      const fallbackPayload = { ...salePayload }
      delete fallbackPayload.failure_reason
      const fallbackResult = await supabaseAdmin
        .from('sales')
        .upsert(fallbackPayload, { onConflict: 'appmax_order_id' })
        .select('id')
        .single()
      saleRow = fallbackResult.data
      saleError = fallbackResult.error
    }

    if (!saleError) {
      saleId = saleRow?.id || null
    }
  } catch (error) {
    console.warn('⚠️ Erro ao upsert venda:', error)
  }

  await updateCheckoutAttempt({
    orderId,
    customerEmail,
    customerName,
    totalAmount,
    paymentMethod,
    status,
    saleId,
    failureReason
  })

  if (FAILED_STATUSES.has(status) && customerEmail) {
    try {
      await supabaseAdmin
        .from('abandoned_carts')
        .update({
          status: 'abandoned',
          updated_at: new Date().toISOString()
        })
        .eq('customer_email', customerEmail)
        .eq('status', 'recovered')
    } catch (error) {
      console.warn('⚠️ Erro ao atualizar carrinho abandonado:', error)
    }
  }

  if (SUCCESS_STATUSES.has(status)) {
    await sendPurchaseEvent({
      orderId,
      customerEmail: customerEmail || undefined,
      customerPhone: customerPhone || undefined,
      customerName: customerName || undefined,
      totalAmount,
      currency: 'BRL'
    })
  }

  return { response: NextResponse.json({ success: true, status }) }
}
