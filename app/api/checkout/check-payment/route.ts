import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * 🔍 API para verificar status de pagamento PIX
 * 
 * O cliente usa esta API para polling e saber se o pagamento foi aprovado
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('order_id')
    const paymentId = searchParams.get('payment_id')

    if (!orderId && !paymentId) {
      return NextResponse.json({
        success: false,
        error: 'order_id ou payment_id é obrigatório'
      }, { status: 400 })
    }

    console.log(`🔍 Verificando status: order_id=${orderId}, payment_id=${paymentId}`)

    // Buscar pelo order_id (UUID) ou mercadopago_payment_id
    let query = supabaseAdmin
      .from('sales')
      .select('id, status, order_status, mercadopago_payment_id')

    if (orderId) {
      query = query.eq('id', orderId)
    } else if (paymentId) {
      query = query.eq('mercadopago_payment_id', paymentId)
    }

    const { data, error } = await query.maybeSingle()

    if (error) {
      console.error('❌ Erro ao buscar venda:', error)
      return NextResponse.json({
        success: false,
        error: 'Erro ao verificar pagamento'
      }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({
        success: false,
        status: 'not_found',
        message: 'Pedido não encontrado'
      })
    }

    const isPaid = data.status === 'paid' || data.status === 'approved' || 
                   data.order_status === 'paid' || data.order_status === 'approved'

    console.log(`📊 Status do pedido ${orderId}: status=${data.status}, order_status=${data.order_status}, isPaid=${isPaid}`)

    return NextResponse.json({
      success: true,
      order_id: data.id,
      status: data.status,
      order_status: data.order_status,
      is_paid: isPaid,
      mercadopago_payment_id: data.mercadopago_payment_id
    })

  } catch (error: any) {
    console.error('❌ Erro no check-payment:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
