import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

interface RealtimeEvent {
  id: string
  type: 'sale' | 'cart_abandoned' | 'payment_failed'
  message: string
  value: number
  timestamp: string
}

export async function GET() {
  try {

    // Buscar últimas vendas (últimas 10)
    const { data: sales } = await supabase
      .from('sales')
      .select('id, customer_name, total_amount, created_at, status')
      .in('status', ['paid', 'approved'])
      .order('created_at', { ascending: false })
      .limit(10)

    // Buscar carrinhos abandonados recentes (últimas 5)
    const { data: carts } = await supabase
      .from('abandoned_carts')
      .select('id, customer_name, customer_email, cart_value, created_at')
      .eq('status', 'abandoned')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(5)

    // Buscar pagamentos falhados recentes (últimas 5)
    const { data: failed } = await supabase
      .from('sales')
      .select('id, customer_name, total_amount, created_at, status')
      .in('status', ['canceled', 'cancelado', 'refused', 'failed', 'denied'])
      .order('created_at', { ascending: false })
      .limit(5)

    const events: RealtimeEvent[] = []

    // Adicionar vendas como eventos
    if (sales) {
      sales.forEach((sale) => {
        events.push({
          id: `sale_${sale.id}`,
          type: 'sale',
          message: `${sale.customer_name || 'Cliente'} realizou uma compra`,
          value: sale.total_amount,
          timestamp: sale.created_at,
        })
      })
    }

    // Adicionar carrinhos abandonados
    if (carts) {
      carts.forEach((cart) => {
        const name = cart.customer_name || cart.customer_email?.split('@')[0] || 'Visitante'
        events.push({
          id: `cart_${cart.id}`,
          type: 'cart_abandoned',
          message: `${name} abandonou um carrinho`,
          value: cart.cart_value || 0,
          timestamp: cart.created_at,
        })
      })
    }

    // Adicionar pagamentos falhados
    if (failed) {
      failed.forEach((payment) => {
        events.push({
          id: `failed_${payment.id}`,
          type: 'payment_failed',
          message: `Pagamento de ${payment.customer_name || 'Cliente'} foi recusado`,
          value: payment.total_amount,
          timestamp: payment.created_at,
        })
      })
    }

    // Ordenar por timestamp (mais recente primeiro)
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    // Retornar apenas os 15 mais recentes
    return NextResponse.json({ 
      events: events.slice(0, 15),
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Erro ao buscar eventos em tempo real:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar eventos' },
      { status: 500 }
    )
  }
}
