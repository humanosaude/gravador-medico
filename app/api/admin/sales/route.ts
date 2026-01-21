import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth-server'

export const runtime = 'nodejs'

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

    const sales = (salesData || []).map((row) => ({
      ...row,
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

    const salesOrderIds = new Set(
      (salesData || []).map((row) => row.appmax_order_id).filter(Boolean)
    )

    const attempts = (attemptData || [])
      .filter((row) => !salesOrderIds.has(row.appmax_order_id))
      .map((row) => ({
        id: row.id,
        appmax_order_id: row.appmax_order_id,
        customer_name: row.customer_name || (row.customer_email ? row.customer_email.split('@')[0] : 'Cliente'),
        customer_email: row.customer_email,
        customer_phone: row.customer_phone,
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
