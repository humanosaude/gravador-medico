'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import BigNumbers from '@/components/dashboard/BigNumbers'
import ConversionFunnel from '@/components/dashboard/ConversionFunnel'
import OperationalHealth from '@/components/dashboard/OperationalHealth'
import RealtimeFeed from '@/components/dashboard/RealtimeFeed'
import { RealtimeVisitors } from '@/components/dashboard/RealtimeVisitors'
import { 
  fetchDashboardMetrics, 
  fetchSalesChartData, 
  fetchFunnelData 
} from '@/lib/dashboard-queries'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<any | null>(null)
  const [chartData, setChartData] = useState<any[]>([])
  const [funnelData, setFunnelData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadAllData() {
      try {
        setLoading(true)
        const [metricsRes, chartRes, funnelRes] = await Promise.all([
          fetchDashboardMetrics(supabase),
          fetchSalesChartData(supabase),
          fetchFunnelData(supabase)
        ])
        
        setMetrics(metricsRes)
        setChartData(chartRes.data || [])
        setFunnelData(funnelRes || [])
      } catch (err) {
        console.error('Erro no dashboard:', err)
      } finally {
        setLoading(false)
      }
    }
    loadAllData()
  }, [])

  return (
    <div className="space-y-6 p-6 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Visão Geral</h1>
          <p className="text-muted-foreground">Monitoramento em tempo real da operação.</p>
        </div>
        <div className="flex items-center gap-3">
          <RealtimeVisitors />
        </div>
      </div>

      {/* KPIs */}
      <BigNumbers metrics={metrics} loading={loading} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico Principal */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border shadow-sm">
          <h3 className="font-semibold mb-6">Receita (30 dias)</h3>
          <div className="h-[300px] w-full">
            {loading ? (
              <div className="h-full w-full bg-gray-50 animate-pulse rounded" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `R$${val}`} />
                  <Tooltip formatter={(val: number) => `R$ ${val.toFixed(2)}`} />
                  <Area type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Feed Realtime */}
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <RealtimeFeed />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ConversionFunnel data={funnelData} />
        <OperationalHealth />
      </div>
    </div>
  )
}
