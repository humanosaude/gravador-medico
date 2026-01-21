import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  }
})

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const payload = await request.json()
    console.log('🔔 Appmax webhook recebido:', JSON.stringify(payload, null, 2))
    
    // ⚠️ APPMAX "test event" envia payload VAZIO/NULL - apenas logar e retornar OK
    if (!payload || Object.keys(payload).length === 0) {
      console.log('⚠️ Webhook de teste vazio recebido (normal para Appmax)')
      await supabase.from('webhooks_logs').insert({
        endpoint: '/api/webhook/appmax',
        payload: { test: true, empty: true },
        response_status: 200,
        processing_time_ms: Date.now() - startTime,
      })
      return NextResponse.json({ received: true, test: true }, { status: 200 })
    }
    
    // Log webhook válido
    await supabase.from('webhooks_logs').insert({
      endpoint: '/api/webhook/appmax',
      payload,
      response_status: 200,
      processing_time_ms: Date.now() - startTime,
    })
    
    // ✅ Appmax envia dados em payload.data
    const data = payload.data || payload
    const orderId = data.id || payload.appmax_order_id || payload.order_id || payload.id
    
    // Mapear status da Appmax para nosso sistema
    const appmaxStatus = data.status || payload.status || 'pending'
    const status = appmaxStatus === 'aprovado' ? 'approved' : appmaxStatus
    
    const customerEmail = data.customer?.email || payload.customer?.email || payload.email
    const customerName = data.customer?.fullname || data.customer?.name || payload.customer?.name || payload.name || 'Cliente Appmax'
    const totalAmount = Number(data.total || data.total_products || payload.total_amount || payload.amount || payload.value || 0)
    const paymentMethod = data.payment_type || payload.payment_method || payload.payment_type
    
    // ⚠️ Se não tiver dados mínimos, apenas loga e retorna OK
    if (!orderId) {
      console.log('⚠️ Webhook sem order_id - apenas logado')
      return NextResponse.json({ received: true, warning: 'Sem order_id' }, { status: 200 })
    }
    
    // ✅ IMPORTANTE: Aceita PIX gerado (pending) mesmo sem email
    // O email pode vir depois no webhook de aprovação
    if (!customerEmail && status !== 'pending') {
      console.log('⚠️ Dados incompletos e status não é pending:', { orderId, status })
      return NextResponse.json({ received: true, warning: 'Dados incompletos' }, { status: 200 })
    }
    
    // UPSERT cliente (apenas se tiver email)
    let customerId = null
    if (customerEmail) {
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .upsert({ 
          email: customerEmail,
          name: customerName,
        }, { 
          onConflict: 'email',
          ignoreDuplicates: false 
        })
        .select('id')
        .single()
      
      if (customerError) {
        console.error('❌ Erro ao criar/atualizar cliente:', customerError)
      } else {
        customerId = customer?.id
      }
    }
    
    // UPSERT venda (aceita mesmo sem customer_id para PIX pending)
    const { error: salesError } = await supabase.from('sales').upsert({
      appmax_order_id: orderId,
      customer_id: customerId,
      customer_email: customerEmail || null,
      customer_name: customerName || null,
      total_amount: totalAmount,
      status: status,
      payment_method: paymentMethod || (status === 'pending' ? 'pix' : null),
    }, { 
      onConflict: 'appmax_order_id',
      ignoreDuplicates: false 
    })
    
    if (salesError) {
      console.error('❌ Erro ao criar/atualizar venda:', salesError)
    }
    
    console.log('✅ Venda processada com sucesso:', { orderId, status, totalAmount })
    return NextResponse.json({ 
      success: true, 
      order_id: orderId, 
      status 
    })
    
  } catch (error) {
    console.error('❌ Webhook erro:', error)
    
    // Log erro
    try {
      await supabase.from('webhooks_logs').insert({
        endpoint: '/api/webhook/appmax',
        response_status: 500,
        error: error instanceof Error ? error.message : String(error),
        processing_time_ms: Date.now() - startTime,
      })
    } catch (logError) {
      console.error('❌ Erro ao logar webhook:', logError)
    }
    
    // ⚠️ Appmax precisa de 200 sempre, senão fica reenviando
    return NextResponse.json({ received: true, error: 'Internal error' }, { status: 200 })
  }
}
