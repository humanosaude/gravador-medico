import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { supabaseAdmin } from '@/lib/supabase'

function getSaoPauloDate(): Date {
  const now = new Date()
  const offset = -3 * 60
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000)
  return new Date(utc + (offset * 60000))
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

    const nowSP = getSaoPauloDate()
    let startDate: Date
    let endDate: Date
    let label: string

    if (start && end) {
      startDate = new Date(start)
      endDate = new Date(end)
      label = `${startDate.toLocaleDateString('pt-BR')} até ${endDate.toLocaleDateString('pt-BR')}`
    } else {
      const todaySP = new Date(nowSP.getFullYear(), nowSP.getMonth(), nowSP.getDate())
      
      if (days === 0) {
        startDate = new Date(todaySP)
        startDate.setHours(0, 0, 0, 0)
        endDate = new Date(todaySP)
        endDate.setHours(23, 59, 59, 999)
        label = 'Hoje'
      } else if (days === 1) {
        startDate = new Date(todaySP)
        startDate.setDate(startDate.getDate() - 1)
        startDate.setHours(0, 0, 0, 0)
        endDate = new Date(startDate)
        endDate.setHours(23, 59, 59, 999)
        label = 'Ontem'
      } else {
        endDate = new Date(todaySP)
        endDate.setHours(23, 59, 59, 999)
        startDate = new Date(todaySP)
        startDate.setDate(startDate.getDate() - days)
        startDate.setHours(0, 0, 0, 0)
        label = `Últimos ${days} dias`
      }
    }

    const startUTC = new Date(startDate.getTime() + (3 * 60 * 60 * 1000))
    const endUTC = new Date(endDate.getTime() + (3 * 60 * 60 * 1000))

    console.log('[Dashboard API] Período:', label, 'Start:', startUTC.toISOString(), 'End:', endUTC.toISOString())

    const duration = endDate.getTime() - startDate.getTime()
    const prevStartUTC = new Date(startUTC.getTime() - duration)
    const prevEndUTC = new Date(startUTC.getTime() - 1)

    const [salesResult, prevSalesResult, visitorsResult, prevVisitorsResult, chartResult, cartsResult] = await Promise.all([
      supabaseAdmin.from('sales').select('id, total_amount, order_status, payment_gateway, created_at').gte('created_at', startUTC.toISOString()).lte('created_at', endUTC.toISOString()).is('deleted_at', null),
      supabaseAdmin.from('sales').select('id, total_amount, order_status').gte('created_at', prevStartUTC.toISOString()).lte('created_at', prevEndUTC.toISOString()).is('deleted_at', null),
      supabaseAdmin.from('analytics_visits').select('session_id').gte('created_at', startUTC.toISOString()).lte('created_at', endUTC.toISOString()),
      supabaseAdmin.from('analytics_visits').select('session_id').gte('created_at', prevStartUTC.toISOString()).lte('created_at', prevEndUTC.toISOString()),
      supabaseAdmin.from('sales').select('total_amount, created_at').gte('created_at', startUTC.toISOString()).lte('created_at', endUTC.toISOString()).is('deleted_at', null).in('order_status', ['approved', 'paid', 'authorized']),
      supabaseAdmin.from('abandoned_carts').select('id, total_amount, status, created_at').gte('created_at', startUTC.toISOString()).lte('created_at', endUTC.toISOString()).is('deleted_at', null)
    ])

    const approvedStatuses = ['approved', 'paid', 'authorized']
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
      debug: { period: label, startUTC: startUTC.toISOString(), endUTC: endUTC.toISOString(), totalSalesInPeriod: allSales.length, approvedSalesInPeriod: approvedSales.length }
    }

    console.log('[Dashboard API] Resultado:', totalSales, 'vendas, R$', totalRevenue.toFixed(2), ',', visitors, 'visitantes')

    return NextResponse.json(response)
  } catch (error) {
    console.error('[Dashboard API] Erro:', error)
    return NextResponse.json({ error: 'Erro ao carregar dashboard', details: error instanceof Error ? error.message : 'Erro desconhecido' }, { status: 500 })
  }
}
