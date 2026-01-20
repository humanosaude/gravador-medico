import { NextRequest, NextResponse } from 'next/server'
import { createOrUpdateUser, supabaseAdmin } from '@/lib/supabase'

/**
 * Webhook da APPMAX - VERSÃO 2.0
 * 
 * Agora salva TUDO no Supabase para Dashboard Admin:
 * 1. Log completo do webhook (auditoria)
 * 2. Dados da venda (sales)
 * 3. Itens da venda (sales_items)
 * 4. Usuário com acesso (users)
 * 
 * Configurado na APPMAX:
 * URL: https://www.gravadormedico.com.br/api/webhook/appmax
 * Status: ATIVO ✅
 */

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const body = await request.json()

    console.log('📥 Webhook APPMAX recebido:', JSON.stringify(body, null, 2))

    // Pegar IP de origem
    const forwardedFor = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const userAgent = request.headers.get('user-agent')
    const ipAddress = forwardedFor || realIp || 'unknown'
    
    console.log('🔐 IP origem:', ipAddress)

    // 1️⃣ SALVAR LOG DO WEBHOOK (AUDITORIA)
    const { data: webhookLog, error: logError } = await supabaseAdmin
      .from('webhooks_logs')
      .insert({
        source: 'appmax',
        event_type: body.event || body.status || 'unknown',
        ip_address: ipAddress,
        user_agent: userAgent,
        payload: body,
        processed: false,
      })
      .select()
      .single()

    if (logError) {
      console.error('❌ Erro ao salvar log:', logError)
      // Não retorna erro, continua processando
    } else {
      console.log('✅ Log salvo:', webhookLog.id)
    }

    // Validação básica
    if (!body || typeof body !== 'object') {
      console.error('❌ Webhook inválido: corpo não é objeto')
      
      // Atualizar log como erro
      if (webhookLog?.id) {
        await supabaseAdmin
          .from('webhooks_logs')
          .update({
            processed: true,
            success: false,
            error_message: 'Corpo não é objeto válido',
            processed_at: new Date().toISOString(),
          })
          .eq('id', webhookLog.id)
      }
      
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    // 2️⃣ EXTRAIR DADOS DO WEBHOOK
    const customerEmail = 
      body.customer?.email || 
      body.order?.customer?.email || 
      body.email ||
      body.lead?.email

    const customerName = 
      body.customer?.name || 
      body.order?.customer?.name || 
      body.name ||
      (body.firstname ? `${body.firstname} ${body.lastname || ''}`.trim() : null) ||
      body.lead?.name

    const customerPhone = 
      body.customer?.phone || 
      body.order?.customer?.phone || 
      body.phone ||
      body.telephone

    const customerCpf = 
      body.customer?.cpf || 
      body.order?.customer?.cpf || 
      body.cpf

    const orderId = 
      body.order?.id || 
      body.order_id || 
      body.id

    const orderStatus = 
      body.status || 
      body.order?.status ||
      'approved'

    const totalAmount = 
      parseFloat(body.total || body.order?.total || body.amount || 0)

    const discount = 
      parseFloat(body.discount || body.order?.discount || 0)

    const paymentMethod = 
      (body.payment_method || body.order?.payment_method || 'pix').toLowerCase()

    // Produtos (array de itens)
    const products = body.products || body.order?.products || []

    console.log('📋 Dados extraídos:', {
      email: customerEmail,
      name: customerName,
      orderId,
      status: orderStatus,
      total: totalAmount,
      payment: paymentMethod,
      productsCount: products.length,
    })

    if (!customerEmail) {
      console.error('❌ Email do cliente não encontrado')
      
      if (webhookLog?.id) {
        await supabaseAdmin
          .from('webhooks_logs')
          .update({
            processed: true,
            success: false,
            error_message: 'Email não encontrado no payload',
            processed_at: new Date().toISOString(),
          })
          .eq('id', webhookLog.id)
      }
      
      return NextResponse.json(
        { error: 'Email não encontrado', receivedData: Object.keys(body) },
        { status: 400 }
      )
    }

    // Só processa se aprovado
    if (orderStatus !== 'approved' && orderStatus !== 'paid') {
      console.log('⏭️ Pedido ainda não aprovado, status:', orderStatus)
      
      if (webhookLog?.id) {
        await supabaseAdmin
          .from('webhooks_logs')
          .update({
            processed: true,
            success: true,
            error_message: `Pedido com status: ${orderStatus} - aguardando aprovação`,
            processed_at: new Date().toISOString(),
          })
          .eq('id', webhookLog.id)
      }
      
      return NextResponse.json({ message: 'Pedido ainda não aprovado' }, { status: 200 })
    }

    // 3️⃣ SALVAR VENDA NO SUPABASE
    console.log('💾 Salvando venda no Supabase...')
    
    const { data: sale, error: saleError } = await supabaseAdmin
      .from('sales')
      .insert({
        appmax_order_id: orderId.toString(),
        appmax_customer_id: body.customer?.id?.toString() || null,
        customer_name: customerName || 'Cliente',
        customer_email: customerEmail,
        customer_phone: customerPhone,
        customer_cpf: customerCpf,
        total_amount: totalAmount,
        discount: discount,
        subtotal: totalAmount + discount, // Total antes do desconto
        status: 'approved',
        payment_method: paymentMethod as any,
        utm_source: body.tracking?.utm_source || body.utm_source,
        utm_campaign: body.tracking?.utm_campaign || body.utm_campaign,
        utm_medium: body.tracking?.utm_medium || body.utm_medium,
        ip_address: ipAddress,
        paid_at: new Date().toISOString(),
        metadata: {
          raw_webhook: body,
          processing_time_ms: Date.now() - startTime,
        },
      })
      .select()
      .single()

    if (saleError) {
      console.error('❌ Erro ao salvar venda:', saleError)
      
      // Se for erro de duplicata (order já existe), retorna sucesso
      if (saleError.code === '23505') {
        console.log('⚠️ Pedido duplicado (já processado):', orderId)
        return NextResponse.json({ message: 'Pedido já processado anteriormente' }, { status: 200 })
      }
      
      throw saleError
    }

    console.log('✅ Venda salva:', sale.id)

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

      const { error: itemsError } = await supabaseAdmin
        .from('sales_items')
        .insert(salesItems)

      if (itemsError) {
        console.error('❌ Erro ao salvar itens:', itemsError)
        // Não falha a operação inteira
      } else {
        console.log('✅ Itens salvos')
      }
    }

    // 5️⃣ CRIAR/ATUALIZAR USUÁRIO (lógica antiga - manter compatibilidade)
    console.log('� Criando/atualizando usuário...')
    const user = await createOrUpdateUser({
      email: customerEmail,
      name: customerName,
      appmax_customer_id: orderId,
    })

    console.log('✅ Usuário criado/atualizado:', user?.id)

    // 6️⃣ ATUALIZAR LOG COMO SUCESSO
    if (webhookLog?.id) {
      await supabaseAdmin
        .from('webhooks_logs')
        .update({
          processed: true,
          success: true,
          processed_at: new Date().toISOString(),
        })
        .eq('id', webhookLog.id)
    }

    console.log(`✅ Webhook processado em ${Date.now() - startTime}ms`)

    return NextResponse.json({
      success: true,
      message: 'Venda registrada com sucesso',
      sale_id: sale.id,
      user_id: user?.id,
      processing_time_ms: Date.now() - startTime,
    })

  } catch (error: any) {
    console.error('❌ Erro ao processar webhook:', error)
    
    return NextResponse.json(
      { 
        error: 'Erro ao processar webhook', 
        message: error.message,
        processing_time_ms: Date.now() - startTime,
      },
      { status: 500 }
    )
  }
}

/**
 * Endpoint GET para testar
 */
export async function GET() {
  return NextResponse.json({
    message: 'Webhook APPMAX v2.0 - Dashboard Admin',
    timestamp: new Date().toISOString(),
    status: 'operational',
    features: [
      'Auditoria completa (webhooks_logs)',
      'Registro de vendas (sales)',
      'Itens de venda (sales_items)',
      'Criação de usuários',
    ],
  })
}
