import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * API de Sincronização Manual com Appmax
 * Busca pedidos históricos da Appmax e importa para o banco
 * 
 * Uso:
 * POST /api/admin/sync-appmax
 * Body: { days?: number, force?: boolean }
 */

const APPMAX_API_URL = process.env.APPMAX_API_URL || 'https://admin.appmax.com.br/api/v3'
const APPMAX_API_TOKEN = process.env.APPMAX_API_TOKEN || ''

// Mapeamento de status da Appmax para nosso sistema
const STATUS_MAP: Record<string, string> = {
  'pago': 'paid',
  'aprovado': 'approved',
  'autorizado': 'approved',
  'pendente': 'pending',
  'recusado': 'refused',
  'cancelado': 'cancelled',
  'estornado': 'refunded',
  'chargeback': 'chargeback',
  'analise antifraude': 'fraud_analysis',
  'análise antifraude': 'fraud_analysis',
  'expired': 'expired',
  'boleto vencido': 'expired',
  'pix expirado': 'expired'
}

function normalizeStatus(status?: string): string {
  if (!status) return 'pending'
  const normalized = status.toLowerCase().trim()
  return STATUS_MAP[normalized] || 'pending'
}

function normalizePaymentMethod(method?: string): string {
  if (!method) return 'unknown'
  const normalized = method.toLowerCase().trim()
  if (normalized.includes('pix')) return 'pix'
  if (normalized.includes('cartao') || normalized.includes('cartão') || normalized.includes('credit')) return 'credit_card'
  if (normalized.includes('boleto')) return 'boleto'
  return normalized
}

async function fetchAppmaxOrders(days: number = 30) {
  const url = new URL(`${APPMAX_API_URL}/order`)
  url.searchParams.set('limit', '1000')
  url.searchParams.set('offset', '0')
  
  // NÃO filtrar por data - buscar TODOS os pedidos
  // A Appmax às vezes não respeita o filtro de data corretamente

  console.log(`📡 Buscando pedidos da Appmax: ${url.toString()}`)

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${APPMAX_API_TOKEN}`,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('❌ Erro da API Appmax:', errorText)
    throw new Error(`Appmax API error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  console.log(`✅ Appmax retornou ${data.data?.length || 0} pedidos`)
  
  // Filtrar localmente por data (últimos X dias)
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  
  const filteredOrders = (data.data || []).filter((order: any) => {
    const orderDate = new Date(order.created_at || order.date)
    return orderDate >= startDate
  })
  
  console.log(`📅 Filtrados ${filteredOrders.length} pedidos dos últimos ${days} dias`)
  
  return filteredOrders
}

async function syncOrder(order: any) {
  try {
    const orderId = order.id?.toString()
    if (!orderId) {
      console.warn('⚠️ Order sem ID:', order)
      return { success: false, error: 'Missing order ID', orderId: 'unknown' }
    }

    console.log(`🔄 Sincronizando pedido ${orderId}...`)

    // Extrair dados do pedido
    const customer = order.customer || {}
    const customerEmail = customer.email || order.email || null
    const customerName = customer.name || order.customer_name || null
    const customerPhone = customer.phone || order.phone || null
    const customerCpf = customer.cpf || order.cpf || null

    if (!customerEmail) {
      console.warn(`⚠️ Pedido ${orderId} sem email`)
      return { success: false, error: 'Missing customer email', orderId }
    }

    // Buscar ou criar customer
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
      console.warn('Erro ao upsert customer:', error)
    }

    // Extrair valores
    const totalAmount = Number(order.total_amount || order.amount || order.value || 0)
    const discount = Number(order.discount || 0)
    const subtotal = totalAmount + discount

    // Extrair status
    const status = normalizeStatus(order.status || order.order_status)
    const paymentMethod = normalizePaymentMethod(order.payment_method)

    // Extrair cupom (se tiver)
    const couponCode = order.coupon_code || order.discount_code || null
    const couponDiscount = couponCode ? discount : 0

    // Datas
    const now = new Date().toISOString()
    const createdAt = order.created_at || order.date || now

    // Criar/atualizar sale
    const salePayload: Record<string, any> = {
      appmax_order_id: orderId,
      customer_id: customerId,
      customer_name: customerName || 'Cliente Appmax',
      customer_email: customerEmail,
      customer_phone: customerPhone,
      customer_cpf: customerCpf,
      total_amount: totalAmount,
      subtotal: subtotal,
      discount: discount,
      coupon_code: couponCode,
      coupon_discount: couponDiscount,
      status: status,
      payment_method: paymentMethod,
      created_at: createdAt,
      updated_at: now,
      metadata: {
        synced_from_appmax: true,
        synced_at: now,
        original_order: order
      }
    }

    const { data: saleRow, error: saleError } = await supabaseAdmin
      .from('sales')
      .upsert(salePayload, { onConflict: 'appmax_order_id' })
      .select('id')
      .single()

    if (saleError) {
      console.error(`❌ Erro ao upsert pedido ${orderId}:`, saleError)
      return { success: false, error: saleError.message, orderId }
    }

    console.log(`✅ Pedido ${orderId} sincronizado com sucesso (${status})`)
    return { success: true, saleId: saleRow?.id, orderId, status }
  } catch (error: any) {
    console.error('Erro ao sincronizar pedido:', error)
    return { success: false, error: error.message }
  }
}

export async function POST(request: NextRequest) {
  try {
    // Remover auth header - já validado no middleware
    
    if (!APPMAX_API_TOKEN) {
      console.error('❌ APPMAX_API_TOKEN não configurado')
      return NextResponse.json({ 
        error: 'APPMAX_API_TOKEN não configurado' 
      }, { status: 500 })
    }

    const body = await request.json().catch(() => ({}))
    const days = body.days || 45 // Últimos 45 dias por padrão (desde 15/01)
    const force = body.force || false

    console.log(`🔄 Iniciando sincronização dos últimos ${days} dias...`)

    // Buscar pedidos da Appmax
    const orders = await fetchAppmaxOrders(days)
    console.log(`📦 Encontrados ${orders.length} pedidos na Appmax`)

    // Sincronizar cada pedido
    const results = []
    for (const order of orders) {
      const result = await syncOrder(order)
      results.push(result)
      
      // Log de progresso
      if (results.length % 10 === 0) {
        console.log(`✅ Processados ${results.length}/${orders.length} pedidos`)
      }
    }

    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length

    console.log(`✅ Sincronização concluída: ${successful} sucesso, ${failed} falhas`)

    return NextResponse.json({
      success: true,
      message: `Sincronização concluída`,
      stats: {
        total: orders.length,
        successful,
        failed,
        results: results.map(r => ({
          orderId: r.orderId,
          success: r.success,
          error: r.error
        }))
      }
    })

  } catch (error: any) {
    console.error('❌ Erro na sincronização:', error)
    return NextResponse.json({
      error: error.message || 'Erro ao sincronizar pedidos'
    }, { status: 500 })
  }
}
