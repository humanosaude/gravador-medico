import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { supabaseAdmin } from '@/lib/supabase'

// Retorna a data atual em São Paulo como string YYYY-MM-DD
function getTodaySP(): string {
  const now = new Date()
  // Formatar em timezone de SP
  const formatter = new Intl.DateTimeFormat('en-CA', { 
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
  return formatter.format(now) // retorna YYYY-MM-DD
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const start = searchParams.get('start')
    const end = searchParams.get('end')
    const daysParam = Number.parseInt(searchParams.get('days') || '', 10)
    const days = Number.isFinite(daysParam) ? daysParam : 30

    const todayStr = getTodaySP() // YYYY-MM-DD em SP
    let startISO: string
    let endISO: string
    let label: string

    if (start && end) {
      // Modo custom - usar as datas passadas
      startISO = start
      endISO = end
      label = 'Período personalizado'
    } else {
      // Calcular baseado em dias
      const todayDate = new Date(todayStr + 'T00:00:00-03:00') // Forçar timezone SP
      
      if (days === 0) {
        // Hoje: 00:00:00 até 23:59:59 em SP
        startISO = todayStr + 'T00:00:00-03:00'
        endISO = todayStr + 'T23:59:59.999-03:00'
        label = 'Hoje'
      } else if (days === 1) {
        // Ontem
        const yesterday = new Date(todayDate)
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayStr = yesterday.toISOString().split('T')[0]
        startISO = yesterdayStr + 'T00:00:00-03:00'
        endISO = yesterdayStr + 'T23:59:59.999-03:00'
        label = 'Ontem'
      } else {
        // Últimos N dias
        const startDay = new Date(todayDate)
        startDay.setDate(startDay.getDate() - days)
        const startStr = startDay.toISOString().split('T')[0]
        startISO = startStr + 'T00:00:00-03:00'
        endISO = todayStr + 'T23:59:59.999-03:00'
        label = `Últimos ${days} dias`
      }
    }

    console.log('[Dashboard API] Período:', label)
    console.log('[Dashboard API] Range:', startISO, 'até', endISO)

    // Calcular período anterior para comparação
    const startMs = new Date(startISO).getTime()
    const endMs = new Date(endISO).getTime()
    const duration = endMs - startMs
    const prevStartISO = new Date(startMs - duration).toISOString()
    const prevEndISO = new Date(startMs - 1).toISOString()

    const [salesResult, prevSalesResult, visitorsResult, prevVisitorsResult, chartResult, cartsResult] = await Promise.all([
      supabaseAdmin.from('sales').select('id, total_amount, order_status, payment_gateway, created_at').gte('created_at', startISO).lte('created_at', endISO).is('deleted_at', null),
      supabaseAdmin.from('sales').select('id, total_amount, order_status').gte('created_at', prevStartISO).lte('created_at', prevEndISO).is('deleted_at', null),
      supabaseAdmin.from('analytics_visits').select('session_id').gte('created_at', startISO).lte('created_at', endISO),
      supabaseAdmin.from('analytics_visits').select('session_id').gte('created_at', prevStartISO).lte('created_at', prevEndISO),
      supabaseAdmin.from('sales').select('total_amount, created_at').gte('created_at', startISO).lte('created_at', endISO).is('deleted_at', null).in('order_status', ['approved', 'paid', 'authorized', 'active']),
      supabaseAdmin.from('abandoned_carts').select('id, total_amount, status, created_at').gte('created_at', startISO).lte('created_at', endISO).is('deleted_at', null)
    ])

    // Status que indicam venda APROVADA/PAGA
    // - approved: Mercado Pago aprovado
    // - paid: Venda paga genérico
    // - authorized: Mercado Pago autorizado
    // - active: Status ativo (Appmax ou assinatura ativa)
    const approvedStatuses = ['approved', 'paid', 'authorized', 'active']
    const allSales = salesResult.data || []
    const approvedSales = allSales.filter(s => approvedStatuses.includes(s.order_status))
    const prevAllSales = prevSalesResult.data || []
    const prevApprovedSales = prevAllSales.filter(s => approvedStatuses.includes(s.order_status))

    const totalSales = approvedSales.length
    const totalRevenue = approvedSales.reduce((sum, s) => sum + (parseFloat(s.total_amount) || 0), 0)
    const avgTicket = totalSales > 0 ? totalRevenue / totalSales : 0

    const prevTotalSales = prevApprovedSales.length
    const prevTotalRevenue = prevApprovedSales.reduce((sum, s) => sum + (parseFloat(s.total_amount) || 0), 0)

    const visitors = new Set(visitorsResult.data?.map(v => v.session_id) || []).size
    const prevVisitors = new Set(prevVisitorsResult.data?.map(v => v.session_id) || []).size

    const conversionRate = visitors > 0 ? (totalSales / visitors) * 100 : 0

    const calcChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0
      return ((current - previous) / previous) * 100
    }

    const salesByDay: Record<string, { sales: number; revenue: number }> = {}
    const chartSales = chartResult.data || []
    
    chartSales.forEach(sale => {
      const saleDate = new Date(sale.created_at)
      const saleDateSP = new Date(saleDate.getTime() - (3 * 60 * 60 * 1000))
      const dateKey = saleDateSP.toISOString().split('T')[0]
      
      if (!salesByDay[dateKey]) {
        salesByDay[dateKey] = { sales: 0, revenue: 0 }
      }
      salesByDay[dateKey].sales++
      salesByDay[dateKey].revenue += parseFloat(sale.total_amount) || 0
    })

    const chartData = Object.entries(salesByDay)
      .map(([date, data]) => ({ date, amount: data.revenue, sales: data.sales }))
      .sort((a, b) => a.date.localeCompare(b.date))

    const carts = cartsResult.data || []
    const recoverableCarts = carts.filter(c => c.status === 'abandoned')
    const recoverableValue = recoverableCarts.reduce((sum, c) => sum + (parseFloat(c.total_amount) || 0), 0)
    
    const now = new Date()
    const last24h = new Date(now.getTime() - (24 * 60 * 60 * 1000))
    const recentCarts = recoverableCarts.filter(c => new Date(c.created_at) >= last24h)
    const recentValue = recentCarts.reduce((sum, c) => sum + (parseFloat(c.total_amount) || 0), 0)

    const failedSales = allSales.filter(s => ['rejected', 'failed', 'cancelled'].includes(s.order_status))
    const failedValue = failedSales.reduce((sum, s) => sum + (parseFloat(s.total_amount) || 0), 0)

    const response = {
      metrics: {
        revenue: Math.round(totalRevenue * 100) / 100,
        sales: totalSales,
        unique_visitors: visitors,
        average_order_value: Math.round(avgTicket * 100) / 100,
        conversion_rate: Math.round(conversionRate * 100) / 100,
        revenue_change: Math.round(calcChange(totalRevenue, prevTotalRevenue) * 10) / 10,
        sales_change: Math.round(calcChange(totalSales, prevTotalSales) * 10) / 10,
        visitors_change: Math.round(calcChange(visitors, prevVisitors) * 10) / 10,
      },
      chartData,
      funnelData: [
        { stage: 'Visitantes', count: visitors, percentage: 100 },
        { stage: 'Checkouts', count: carts.length, percentage: visitors > 0 ? Math.round((carts.length / visitors) * 100) : 0 },
        { stage: 'Compras', count: totalSales, percentage: visitors > 0 ? Math.round((totalSales / visitors) * 100) : 0 },
      ],
      operationalHealth: {
        recoverableCarts: { count: recoverableCarts.length, totalValue: Math.round(recoverableValue * 100) / 100, last24h: Math.round(recentValue * 100) / 100 },
        failedPayments: { count: failedSales.length, totalValue: Math.round(failedValue * 100) / 100, reasons: [] },
        chargebacks: { count: 0, totalValue: 0 }
      },
      debug: { period: label, startISO, endISO, totalSalesInPeriod: allSales.length, approvedSalesInPeriod: approvedSales.length }
    }

    console.log('[Dashboard API] Resultado:', totalSales, 'vendas, R$', totalRevenue.toFixed(2), ',', visitors, 'visitantes')

    return NextResponse.json(response)
  } catch (error) {
    console.error('[Dashboard API] Erro:', error)
    return NextResponse.json({ error: 'Erro ao carregar dashboard', details: error instanceof Error ? error.message : 'Erro desconhecido' }, { status: 500 })
  }
}
