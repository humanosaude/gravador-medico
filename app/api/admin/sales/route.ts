import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-server'

export const runtime = 'nodejs'

// Emails e nomes de teste para excluir das vendas
const TEST_EMAILS = [
  'helcio',
  'gabriel',
  'arruda',
  'cardoso',
  'teste',
  'test',
  'admin'
]

const TEST_NAMES = [
  'helcio',
  'gabriel arruda',
  'arruda cardoso',
  'cliente mp',
  'cliente mercadopago',
  'cliente mercado pago',
  'teste',
  'test'
]

function isTestSale(sale: any): boolean {
  const email = (sale.customer_email || '').toLowerCase()
  const name = (sale.customer_name || '').toLowerCase()
  
  // Verificar se é email de teste
  for (const testEmail of TEST_EMAILS) {
    if (email.includes(testEmail)) return true
  }
  
  // Verificar se é nome de teste
  for (const testName of TEST_NAMES) {
    if (name.includes(testName)) return true
  }
  
  return false
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 })
  }

  const { searchParams } = new URL(request.url)
  const start = searchParams.get('start')
  const end = searchParams.get('end')
  const search = searchParams.get('search')
  const limitParam = Number.parseInt(searchParams.get('limit') || '500', 10)
  const limit = Number.isFinite(limitParam) ? Math.min(limitParam, 1000) : 500

  try {
    let salesQuery = supabaseAdmin
      .from('sales')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (start) salesQuery = salesQuery.gte('created_at', start)
    if (end) salesQuery = salesQuery.lte('created_at', end)
    if (search) {
      const term = search.trim()
      if (term) {
        salesQuery = salesQuery.or(
          `customer_name.ilike.%${term}%,customer_email.ilike.%${term}%,appmax_order_id.ilike.%${term}%`
        )
      }
    }

    const { data: salesData, error: salesError } = await salesQuery
    if (salesError) {
      return NextResponse.json({ error: salesError.message }, { status: 500 })
    }

    // Filtrar vendas de teste (Helcio, Gabriel, etc.)
    const filteredSalesData = (salesData || []).filter(sale => !isTestSale(sale))

    const sales = filteredSalesData.map((row) => ({
      ...row,
      // Mapear order_status para status (compatibilidade com front-end)
      status: row.order_status || row.status || 'pending',
      source: 'sale'
    }))

    const failedStatuses = [
      'refused',
      'rejected',
      'failed',
      'expired',
      'cancelled',
      'cancelado',
      'canceled',
      'chargeback'
    ]

    let attemptsQuery = supabaseAdmin
      .from('checkout_attempts')
      .select('*')
      .in('status', failedStatuses)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (start) attemptsQuery = attemptsQuery.gte('created_at', start)
    if (end) attemptsQuery = attemptsQuery.lte('created_at', end)
    if (search) {
      const term = search.trim()
      if (term) {
        attemptsQuery = attemptsQuery.or(
          `customer_name.ilike.%${term}%,customer_email.ilike.%${term}%,appmax_order_id.ilike.%${term}%`
        )
      }
    }

    const { data: attemptData, error: attemptError } = await attemptsQuery
    if (attemptError) {
      return NextResponse.json({ error: attemptError.message }, { status: 500 })
    }

    // Filtrar tentativas de teste também
    const filteredAttemptData = (attemptData || []).filter(attempt => !isTestSale(attempt))

    const salesOrderIds = new Set(
      filteredSalesData.map((row) => row.appmax_order_id).filter(Boolean)
    )

    const attempts = filteredAttemptData
      .filter((row) => !salesOrderIds.has(row.appmax_order_id))
      .map((row) => ({
        id: row.id,
        appmax_order_id: row.appmax_order_id,
        customer_name: row.customer_name || (row.customer_email ? row.customer_email.split('@')[0] : 'Cliente'),
        customer_email: row.customer_email,
        customer_phone: row.customer_phone,
        customer_cpf: row.customer_cpf,
        total_amount: Number(row.total_amount || row.cart_total || 0),
        status: row.status,
        failure_reason: row.failure_reason || row?.metadata?.failure_reason || null,
        payment_method: row.payment_method,
        created_at: row.created_at,
        updated_at: row.updated_at,
        sale_id: row.sale_id || null,
        source: 'attempt'
      }))

    const combined = [...sales, ...attempts]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit)

    return NextResponse.json({ sales: combined })
  } catch (error) {
    console.error('Erro ao carregar vendas admin:', error)
    return NextResponse.json({ error: 'Erro ao carregar vendas' }, { status: 500 })
  }
}
