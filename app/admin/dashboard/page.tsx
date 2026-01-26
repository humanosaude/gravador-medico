'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import BigNumbers from '@/components/dashboard/BigNumbers'
import ConversionFunnel from '@/components/dashboard/ConversionFunnel'
import OperationalHealth from '@/components/dashboard/OperationalHealth'
import RealtimeFeed from '@/components/dashboard/RealtimeFeed'
import { RealtimeVisitors } from '@/components/dashboard/RealtimeVisitors'
import { FraudAnalysisCard } from '@/components/dashboard/FraudAnalysisCard'
import { SyncAppmaxButton } from '@/components/dashboard/SyncAppmaxButton'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { RefreshCw, Download, MousePointerClick, Link2, Zap, TrendingUp, ArrowRight } from 'lucide-react'

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<any | null>(null)
  const [chartData, setChartData] = useState<any[]>([])
  const [funnelData, setFunnelData] = useState<any[]>([])
  const [operationalHealth, setOperationalHealth] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filterType, setFilterType] = useState<'quick' | 'custom'>('quick')
  const [quickDays, setQuickDays] = useState(30)
  const [startDate, setStartDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 30)
    return date.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])

  useEffect(() => {
    loadAllData()
  }, [filterType, quickDays, startDate, endDate])

  const loadAllData = async () => {
    try {
      setRefreshing(true)
      setLoading(true)
      const params = new URLSearchParams()
      if (filterType === 'custom') {
        const start = new Date(`${startDate}T00:00:00`)
        const end = new Date(`${endDate}T23:59:59.999`)
        params.set('start', start.toISOString())
        params.set('end', end.toISOString())
      } else {
        params.set('days', String(quickDays))
      }

      const response = await fetch(`/api/admin/dashboard?${params.toString()}`, {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Falha ao carregar dashboard')
      }

      const result = await response.json()
      setMetrics(result.metrics || null)
      setChartData(result.chartData || [])
      setFunnelData(result.funnelData || [])
      setOperationalHealth(result.operationalHealth || null)
    } catch (err) {
      console.error('Erro no dashboard:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const formatDateLabel = (value: string) => {
    const [year, month, day] = value.split('-')
    if (!year || !month || !day) return value
    return `${day}/${month}/${year}`
  }

  const periodLabel = filterType === 'custom'
    ? `${formatDateLabel(startDate)} até ${formatDateLabel(endDate)}`
    : `últimos ${quickDays} dias`

  const exportDashboard = () => {
    if (!metrics) return

    const rangeText = periodLabel

    const reportText = `
RELATÓRIO DO DASHBOARD
Período: ${rangeText}
Gerado em: ${new Date().toLocaleString('pt-BR')}

============================================
RESUMO EXECUTIVO
============================================

Faturamento: R$ ${(metrics.revenue || 0).toFixed(2)}
Total de Vendas: ${metrics.sales || 0}
Visitantes: ${metrics.unique_visitors || 0}
Ticket Médio: R$ ${(metrics.average_order_value || 0).toFixed(2)}
Taxa de Conversão: ${(metrics.conversion_rate || 0).toFixed(2)}%

============================================
RECEITA POR DIA
============================================

${(chartData || [])
  .map((row) => `${row.date}: R$ ${(row.amount || 0).toFixed(2)} (${row.sales || 0} vendas)`)
  .join('\n')}

---
Relatório gerado automaticamente pelo Gravador Médico
    `.trim()

    const blob = new Blob([reportText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dashboard-${new Date().toISOString().split('T')[0]}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400 font-medium">Carregando métricas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black text-white">Visão Geral</h1>
          <p className="text-gray-400 mt-1">Acompanhe suas métricas em tempo real</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <SyncAppmaxButton />
          <RealtimeVisitors />
          <button
            onClick={loadAllData}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl hover:bg-gray-700 text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
          <button
            onClick={exportDashboard}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-600 to-brand-500 text-white rounded-xl hover:shadow-lg hover:shadow-brand-500/30 transition-all"
          >
            <Download className="w-4 h-4" />
            Exportar
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-700/50">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-gray-400 mb-2">Período Rápido</label>
            <div className="flex gap-2 flex-wrap">
              {[7, 15, 30, 60, 90].map((days) => (
                <button
                  key={days}
                  onClick={() => {
                    setFilterType('quick')
                    setQuickDays(days)
                  }}
                  className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
                    filterType === 'quick' && quickDays === days
                      ? 'bg-brand-500 text-white shadow-lg'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {days} dias
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 flex-wrap">
            <div>
              <label className="block text-sm font-semibold text-gray-400 mb-2">Personalizado - Início</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setFilterType('custom')
                  setStartDate(e.target.value)
                }}
                className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-400 mb-2">Personalizado - Fim</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setFilterType('custom')
                  setEndDate(e.target.value)
                }}
                className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <BigNumbers metrics={metrics} loading={loading} periodLabel={periodLabel} />

      {/* Acesso Rápido aos Módulos */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-700/50">
        <h3 className="text-xl font-bold text-white mb-4">Módulos Disponíveis</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card Tracking */}
          <Link 
            href="/admin/tracking"
            className="group bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-purple-500/30 rounded-xl p-6 hover:shadow-lg hover:shadow-purple-500/20 transition-all hover:scale-105"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <MousePointerClick className="w-6 h-6 text-purple-400" />
              </div>
              <ArrowRight className="w-5 h-5 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">Tracking</h4>
            <p className="text-sm text-gray-400 mb-3">
              Rastreamento e atribuição de vendas
            </p>
            <div className="flex items-center gap-2 text-xs text-purple-400">
              <Zap className="w-4 h-4" />
              <span>Tintim Killer</span>
            </div>
          </Link>

          {/* Card WhatsApp */}
          <Link 
            href="/admin/whatsapp"
            className="group bg-gradient-to-br from-green-600/20 to-emerald-600/20 border border-green-500/30 rounded-xl p-6 hover:shadow-lg hover:shadow-green-500/20 transition-all hover:scale-105"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </div>
              <ArrowRight className="w-5 h-5 text-green-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">WhatsApp</h4>
            <p className="text-sm text-gray-400 mb-3">
              Inbox e automação de mensagens
            </p>
            <div className="flex items-center gap-2 text-xs text-green-400">
              <Zap className="w-4 h-4" />
              <span>Evolution API</span>
            </div>
          </Link>

          {/* Card CRM */}
          <Link 
            href="/admin/crm"
            className="group bg-gradient-to-br from-orange-600/20 to-red-600/20 border border-orange-500/30 rounded-xl p-6 hover:shadow-lg hover:shadow-orange-500/20 transition-all hover:scale-105"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <ArrowRight className="w-5 h-5 text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">CRM</h4>
            <p className="text-sm text-gray-400 mb-3">
              Gestão de leads e clientes
            </p>
            <div className="flex items-center gap-2 text-xs text-orange-400">
              <TrendingUp className="w-4 h-4" />
              <span>Pipeline de vendas</span>
            </div>
          </Link>

          {/* Card Analytics */}
          <Link 
            href="/admin/analytics"
            className="group bg-gradient-to-br from-blue-600/20 to-cyan-600/20 border border-blue-500/30 rounded-xl p-6 hover:shadow-lg hover:shadow-blue-500/20 transition-all hover:scale-105"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <ArrowRight className="w-5 h-5 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">Analytics</h4>
            <p className="text-sm text-gray-400 mb-3">
              Relatórios e métricas detalhadas
            </p>
            <div className="flex items-center gap-2 text-xs text-blue-400">
              <TrendingUp className="w-4 h-4" />
              <span>Insights avançados</span>
            </div>
          </Link>
        </div>
      </div>

      {/* Saúde Operacional */}
      <OperationalHealth data={operationalHealth || { 
        recoverableCarts: { count: 0, totalValue: 0, last24h: 0 },
        failedPayments: { count: 0, totalValue: 0, reasons: [] },
        chargebacks: { count: 0, totalValue: 0 }
      }} loading={loading} />

      {/* Card de Análise Antifraude */}
      <FraudAnalysisCard />

      {/* Layout Grid: Gráfico Principal (66%) + Feed Realtime (33%) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico Principal */}
        <div className="lg:col-span-2">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-700/50">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-white">Receita ({periodLabel})</h3>
                <p className="text-sm text-gray-400 mt-1">Evolução do faturamento</p>
              </div>
            </div>
            <div className="h-[300px] w-full">
              {loading ? (
                <div className="h-full w-full bg-gray-700/30 animate-pulse rounded" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
                    <YAxis
                      stroke="#9ca3af"
                      fontSize={12}
                      tickFormatter={(value: number) =>
                        new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                          maximumFractionDigits: 0
                        }).format(value)
                      }
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1f2937', 
                        border: '1px solid #374151',
                        borderRadius: '12px',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.3)',
                        color: '#fff'
                      }}
                      formatter={(val: number | undefined) => val ? `R$ ${val.toFixed(2)}` : 'R$ 0,00'}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="amount" 
                      stroke="#10b981" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorReceita)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Feed em Tempo Real */}
        <div className="lg:col-span-1">
          <RealtimeFeed autoRefresh={true} refreshInterval={30000} />
        </div>
      </div>

      {/* Funil de Conversão - Temporariamente desabilitado */}
      {/* <ConversionFunnel data={funnelData} loading={loading} /> */}
    </div>
  )
}
