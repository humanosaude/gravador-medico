import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendPurchaseEvent } from '@/lib/meta-capi'

/**
 * Webhook da APPMAX - VERSÃO 3.0 BLINDADA + META CAPI
 * 
 * ✅ Usa Service Role Key para ignorar RLS
 * ✅ Trata todos os eventos: OrderCreated, OrderPaid, PaymentAuthorized
 * ✅ UPSERT para evitar duplicatas
 * ✅ Extração segura (funciona mesmo se customer vier null)
 * ✅ Logs detalhados para debug
 * ✅ 🆕 Envia eventos de conversão para Meta CAPI
 * 
 * URL: https://www.gravadormedico.com.br/api/webhook/appmax
 */

// Cliente Supabase ADMIN (ignora RLS e salva sempre)
// Só inicializa se a chave existir (evita erro no build)
const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY 
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
  : null

// Mapeia status da Appmax para nosso banco
function mapStatusToDatabase(appmaxStatus: string): string {
  const statusMap: Record<string, string> = {
    'pending': 'pending',
    'approved': 'approved',
    'paid': 'approved',
    'processing': 'pending',
    'refunded': 'refunded',
    'canceled': 'refused',
    'payment_not_authorized': 'refused',
    'refused': 'refused',
  }
  return statusMap[appmaxStatus.toLowerCase()] || 'pending'
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  console.log('🔔 ============================================')
  console.log('🔔 WEBHOOK APPMAX RECEBIDO:', new Date().toISOString())
  console.log('🔔 ============================================')
  
  try {
    // Verificar se o Supabase Admin está configurado
    if (!supabaseAdmin) {
      console.error('❌ SUPABASE_SERVICE_ROLE_KEY não configurada!')
      return NextResponse.json(
        { error: 'Servidor mal configurado' },
        { status: 500 }
      )
    }

    // Ler o corpo da requisição
    const body = await request.json()
    
    console.log('📦 Payload completo recebido:', JSON.stringify(body, null, 2))
    console.log('🔔 Evento:', body.event || 'unknown')

    // IP de origem
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown'
    
    console.log('🔐 IP:', ipAddress)

    // 1️⃣ SALVAR LOG (AUDITORIA)
    const { data: webhookLog } = await supabaseAdmin!
      .from('webhooks_logs')
      .insert({
        source: 'appmax',
        event_type: body.event || body.status || 'unknown',
        ip_address: ipAddress,
        user_agent: request.headers.get('user-agent'),
        payload: body,
        processed: false,
      })
      .select()
      .single()

    console.log('✅ Log salvo:', webhookLog?.id)

    // 2️⃣ EXTRAÇÃO SEGURA DE DADOS
    const data = body.data || body.order || body
    
    if (!data.id && !body.order_id && !body.id) {
      console.log('⚠️ Webhook sem ID - Ignorando')
      return NextResponse.json({ message: 'Sem ID' }, { status: 200 })
    }

    const orderId = (data.id || body.order_id || body.id)?.toString()

    // Cliente (pode vir null)
    const customer = data.customer || body.customer || {}
    const customerName = customer.firstname 
      ? `${customer.firstname} ${customer.lastname || ''}`.trim()
      : (customer.name || body.name || 'Cliente Desconhecido')
    
    const customerEmail = customer.email || body.email || 'email@naoinformado.com'
    const customerPhone = customer.telephone || customer.phone || body.phone || null
    const customerCpf = customer.cpf || body.cpf || null

    // Status e Valores
    // Se o evento for de pagamento confirmado, sempre marca como approved
    const eventType = body.event || ''
    const rawStatus = data.status || body.status || 'pending'
    const orderStatus = (eventType.toLowerCase().includes('paid') || eventType.toLowerCase().includes('authorized'))
      ? 'approved' 
      : mapStatusToDatabase(rawStatus)
    
    const totalAmount = parseFloat(data.total || data.full_payment_amount || body.total || body.amount || 0)
    const discount = parseFloat(data.discount || body.discount || 0)
    const paymentMethod = (data.payment_type || data.payment_method || body.payment_method || 'pix').toLowerCase()

    // Produtos
    const products = data.products || body.products || data.items || body.items || []

    console.log('📋 Dados extraídos:', {
      orderId,
      event: body.event,
      email: customerEmail,
      name: customerName,
      rawStatus,
      finalStatus: orderStatus,
      total: totalAmount,
      payment: paymentMethod,
      products: products.length,
    })

    // 3️⃣ SALVAR VENDA (UPSERT - Cria ou atualiza)
    console.log('💾 Salvando venda...')
    
    const { data: sale, error: saleError } = await supabaseAdmin!
      .from('sales')
      .upsert({
        appmax_order_id: orderId,
        appmax_customer_id: (customer.id || body.customer_id)?.toString() || null,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        customer_cpf: customerCpf,
        total_amount: totalAmount,
        discount: discount,
        subtotal: totalAmount + discount,
        status: orderStatus,
        payment_method: paymentMethod as any,
        utm_source: body.tracking?.utm_source || body.utm_source,
        utm_campaign: body.tracking?.utm_campaign || body.utm_campaign,
        utm_medium: body.tracking?.utm_medium || body.utm_medium,
        ip_address: ipAddress,
        paid_at: orderStatus === 'approved' ? new Date().toISOString() : null,
        metadata: {
          raw_webhook: body,
          event_type: body.event,
          processing_time_ms: Date.now() - startTime,
        },
      }, {
        onConflict: 'appmax_order_id', // Atualiza se já existir
      })
      .select()
      .single()

    if (saleError) {
      console.error('❌ Erro ao salvar venda:', saleError)
      throw saleError
    }

    console.log('✅ Venda salva:', sale.id, '- Status:', sale.status)

    // 4️⃣ SALVAR ITENS DA VENDA
    if (products && products.length > 0) {
      console.log('📦 Salvando', products.length, 'produtos...')
      
      const salesItems = products.map((product: any, index: number) => ({
        sale_id: sale.id,
        product_id: product.sku || product.id?.toString() || `product_${index}`,
        product_name: product.name || 'Produto',
        product_type: index === 0 ? 'main' : 'bump',
        price: parseFloat(product.price || 0),
        quantity: parseInt(product.qty || product.quantity || 1),
      }))

      const { error: itemsError } = await supabaseAdmin!
        .from('sales_items')
        .upsert(salesItems, {
          onConflict: 'sale_id,product_id'
        })

      if (itemsError) {
        console.error('⚠️ Erro ao salvar itens:', itemsError)
      } else {
        console.log('✅ Itens salvos')
      }
    }

    // 5️⃣ ATUALIZAR LOG COMO SUCESSO
    if (webhookLog?.id) {
      await supabaseAdmin!
        .from('webhooks_logs')
        .update({
          processed: true,
          success: true,
          processed_at: new Date().toISOString(),
        })
        .eq('id', webhookLog.id)
    }

    // 6️⃣ 🚀 ENVIAR EVENTO PARA META CAPI (Se venda aprovada)
    if (orderStatus === 'approved' && totalAmount > 0) {
      console.log('🚀 Enviando conversão para Meta CAPI...')
      
      // Buscar dados de tracking (fbp, fbc, session_id) do analytics
      let trackingData = { fbc: null, fbp: null, ipAddress, userAgent: null }
      
      if (customerEmail) {
        const { data: visits } = await supabaseAdmin!
          .from('analytics_visits')
          .select('fbc, fbp, ip_address, user_agent, session_id')
          .ilike('referrer', `%${customerEmail}%`) // Tentar encontrar por email no referrer
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        
        if (visits) {
          trackingData = {
            fbc: visits.fbc,
            fbp: visits.fbp,
            ipAddress: visits.ip_address || ipAddress,
            userAgent: visits.user_agent
          }
        }
      }

      const metaResult = await sendPurchaseEvent({
        orderId: orderId,
        customerEmail: customerEmail !== 'email@naoinformado.com' ? customerEmail : undefined,
        customerPhone: customerPhone || undefined,
        customerName: customerName !== 'Cliente Desconhecido' ? customerName : undefined,
        totalAmount: totalAmount,
        currency: 'BRL',
        productName: products[0]?.name || 'Gravador Médico',
        productIds: products.map((p: any) => p.sku || p.id?.toString()).filter(Boolean),
        fbc: trackingData.fbc || undefined,
        fbp: trackingData.fbp || undefined,
        ipAddress: trackingData.ipAddress || undefined,
        userAgent: trackingData.userAgent || undefined,
        eventSourceUrl: 'https://www.gravadormedico.com.br'
      })

      if (metaResult.success) {
        console.log('✅ Conversão enviada para Meta CAPI:', metaResult.fbTraceId)
      } else {
        console.error('⚠️ Falha ao enviar para Meta CAPI:', metaResult.error)
      }
    }

    console.log(`✅ Webhook processado em ${Date.now() - startTime}ms`)

    return NextResponse.json({
      success: true,
      message: 'Venda registrada',
      sale_id: sale.id,
      processing_time_ms: Date.now() - startTime,
    })

  } catch (error: any) {
    console.error('❌ Erro crítico:', error)
    
    // Retorna 200 para Appmax não ficar reenviando
    return NextResponse.json(
      { 
        error: 'Erro processado', 
        message: error.message,
      },
      { status: 200 }
    )
  }
}

// Endpoint GET para testar
export async function GET() {
  return NextResponse.json({
    message: 'Webhook APPMAX v3.0 - Blindado',
    timestamp: new Date().toISOString(),
    status: 'operational',
  })
}
