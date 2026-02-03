'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import BigNumbers from '@/components/dashboard/BigNumbers'
import ConversionFunnel from '@/components/dashboard/ConversionFunnel'
import OperationalHealth from '@/components/dashboard/OperationalHealth'
import RealtimeFeed from '@/components/dashboard/RealtimeFeed'
import { RealtimeVisitors } from '@/components/dashboard/RealtimeVisitors'
import { FraudAnalysisCard } from '@/components/dashboard/FraudAnalysisCard'
import { SyncAppmaxButton } from '@/components/dashboard/SyncAppmaxButton'
import { SyncMercadoPagoButton } from '@/components/dashboard/SyncMercadoPagoButton'
import GatewayStatsCard from '@/components/dashboard/GatewayStatsCard'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { RefreshCw, Download, MousePointerClick, Link2, Zap, TrendingUp, ArrowRight, Activity, BarChart3, Facebook, DollarSign, Eye, Target, PlayCircle, ExternalLink } from 'lucide-react'
import { motion } from 'framer-motion'
import { calculateAdsMetrics, AdsMetrics } from '@/lib/meta-marketing'

// Tipos para Analytics
interface TrafficDataItem {
  date: string;
  usuarios: number;
  visualizacoes: number;
}

interface RealtimeData {
  activeUsers: number;
  topPages?: { page: string; views: number }[];
}

// Formatar moeda
const formatCurrencyCompact = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0
  }).format(value);
};

// Formatar número compacto
const formatNumberCompact = (value: number) => {
  if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
  if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
  return value.toString();
};

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<any | null>(null)
  const [chartData, setChartData] = useState<any[]>([])
  const [funnelData, setFunnelData] = useState<any[]>([])
  const [operationalHealth, setOperationalHealth] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filterType, setFilterType] = useState<'quick' | 'custom'>('quick')
  const [quickDays, setQuickDays] = useState(0) // HOJE como padrão
  const [startDate, setStartDate] = useState(() => {
    return new Date().toISOString().split('T')[0] // Hoje
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])
  
  // Estados para Analytics + META Ads
  const [realtime, setRealtime] = useState<RealtimeData | null>(null);
  const [trafficData, setTrafficData] = useState<TrafficDataItem[]>([]);
  const [fbMetrics, setFbMetrics] = useState<AdsMetrics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [adsError, setAdsError] = useState<string | null>(null);
  
  // Novas métricas com ROAS inteligente
  const [smartMetrics, setSmartMetrics] = useState<{
    roas: number;
    revenue: number;
    purchases: number;
    revenueSource: string;
  } | null>(null);

  const resolveMetaAdsRange = useCallback(() => {
    if (filterType === 'custom') {
      const start = new Date(`${startDate}T00:00:00`);
      const end = new Date(`${endDate}T23:59:59.999`);
      return { start, end };
    }

    const now = new Date();
    const end = new Date();
    const start = new Date();
    
    // Tratamento especial para "Hoje" (quickDays = 0) e "Ontem" (quickDays = 1)
    if (quickDays === 0) {
      // Hoje: do início de hoje até agora
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (quickDays === 1) {
      // Ontem: do início de ontem até o fim de ontem
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
    } else {
      // Outros períodos: últimos N dias incluindo hoje
      start.setDate(start.getDate() - (quickDays - 1));
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    }
    
    return { start, end };
  }, [filterType, quickDays, startDate, endDate]);

  // Helper para formatar data no padrão YYYY-MM-DD (sem timezone)
  const formatDateForAPI = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Carregar dados de Analytics e META Ads
  const loadAnalyticsData = useCallback(async () => {
    setAnalyticsLoading(true);
    setAdsError(null);
    try {
      const { start, end } = resolveMetaAdsRange();
      
      // Usar formato YYYY-MM-DD para evitar problemas de timezone
      const startDateStr = formatDateForAPI(start);
      const endDateStr = formatDateForAPI(end);
      
      // Debug: Log das datas sendo enviadas para Meta Ads
      console.log('📅 [loadAnalyticsData] Filtro:', filterType, 'quickDays:', quickDays);
      console.log('📅 [loadAnalyticsData] Meta Ads range:', { startDateStr, endDateStr });
      console.log('📅 [loadAnalyticsData] Start Date obj:', start.toISOString());
      console.log('📅 [loadAnalyticsData] End Date obj:', end.toISOString());
      
      const metaParams = new URLSearchParams({
        start: startDateStr,
        end: endDateStr
      });

      const [realtimeRes, trafficRes, fbRes, metricsRes] = await Promise.allSettled([
        fetch('/api/analytics/realtime').then(r => r.json()),
        fetch(`/api/analytics/traffic?start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}`).then(r => r.json()),
        fetch(`/api/ads/insights?${metaParams.toString()}`).then(r => r.json()),
        // Nova API de métricas com ROAS inteligente
        fetch(`/api/ads/metrics?${metaParams.toString()}`).then(r => r.json())
      ]);

      if (realtimeRes.status === 'fulfilled') {
        setRealtime(realtimeRes.value);
      }

      if (trafficRes.status === 'fulfilled' && Array.isArray(trafficRes.value)) {
        setTrafficData(trafficRes.value);
      }

      if (fbRes.status === 'fulfilled' && Array.isArray(fbRes.value)) {
        setFbMetrics(calculateAdsMetrics(fbRes.value));
      } else if (fbRes.status === 'rejected') {
        console.error('❌ Erro ao carregar Meta Ads:', fbRes.reason);
        setAdsError('Erro ao carregar dados do Meta Ads');
      }
      
      // Processar métricas inteligentes (ROAS com fallback)
      if (metricsRes.status === 'fulfilled' && metricsRes.value?.success) {
        const data = metricsRes.value.data;
        setSmartMetrics({
          roas: data.roas || 0,
          revenue: data.revenue || 0,
          purchases: data.purchases || 0,
          revenueSource: data._meta?.revenueSource || 'unknown'
        });
        console.log('✅ [Smart Metrics] ROAS:', data.roas, 'Fonte:', data._meta?.revenueSource);
      }
    } catch (error) {
      console.error('Erro ao carregar analytics:', error);
      setAdsError('Erro ao carregar analytics');
    } finally {
      setAnalyticsLoading(false);
    }
  }, [resolveMetaAdsRange]);

  useEffect(() => {
    loadAllData()
    loadAnalyticsData()
    // Auto-refresh realtime a cada 30s
    const interval = setInterval(() => {
      fetch('/api/analytics/realtime').then(r => r.json()).then(setRealtime).catch(console.error);
    }, 30000);
    return () => clearInterval(interval);
  }, [filterType, quickDays, startDate, endDate, loadAnalyticsData])

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
        console.log('📊 [loadAllData] Modo custom:', { start: start.toISOString(), end: end.toISOString() });
      } else {
        params.set('days', String(quickDays))
        console.log('📊 [loadAllData] Modo quick:', { days: quickDays, filterType });
      }

      console.log('📊 [loadAllData] URL params:', params.toString());
      
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
    : quickDays === 0 
      ? 'hoje'
      : quickDays === 1 
        ? 'ontem'
        : `últimos ${quickDays} dias`

  const roiInvested = fbMetrics?.totalSpend || 0
  const roiReturn = metrics?.revenue || 0
  const roiDelta = roiReturn - roiInvested

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
        <div className="flex gap-3 flex-wrap items-center">
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
          <RealtimeVisitors />
        </div>
      </div>

      {/* Sincronização */}
      <div className="bg-gradient-to-br from-gray-800/80 to-gray-800/50 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-700/50">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-brand-400" />
              Sincronização de Vendas
            </h3>
            <p className="text-sm text-gray-400 mt-1">Importar vendas históricas do Mercado Pago e Appmax</p>
          </div>
          <div className="flex gap-3 flex-wrap relative">
            <SyncMercadoPagoButton />
            <SyncAppmaxButton />
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-700/50">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-gray-400 mb-2">Período Rápido</label>
            <div className="flex gap-2 flex-wrap">
              {/* Hoje e Ontem */}
              <button
                onClick={() => {
                  setFilterType('quick')
                  setQuickDays(0) // 0 = hoje
                }}
                className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
                  filterType === 'quick' && quickDays === 0
                    ? 'bg-green-500 text-white shadow-lg'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Hoje
              </button>
              <button
                onClick={() => {
                  setFilterType('quick')
                  setQuickDays(1) // 1 = ontem
                }}
                className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
                  filterType === 'quick' && quickDays === 1
                    ? 'bg-blue-500 text-white shadow-lg'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Ontem
              </button>
              {/* Períodos em dias */}
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

      {/* ============ ANALYTICS + META ADS SECTION ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Card Realtime */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-gray-800/60 to-gray-900/80 backdrop-blur-xl rounded-2xl border border-white/10 p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <Activity className="h-5 w-5 text-green-400" />
            <span className="text-gray-300 font-medium">Ao Vivo</span>
            <span className="relative flex h-2 w-2 ml-auto">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
          </div>
          
          {analyticsLoading ? (
            <div className="h-20 bg-white/10 rounded-lg animate-pulse" />
          ) : (
            <>
              <motion.div
                key={realtime?.activeUsers}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-5xl font-bold text-green-400 mb-3"
              >
                {realtime?.activeUsers || 0}
              </motion.div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Usuários ativos agora</p>
              {realtime?.topPages?.slice(0, 2).map((page, i) => (
                <div key={i} className="flex items-center justify-between text-xs text-gray-400">
                  <span className="truncate max-w-[150px]">{page.page}</span>
                  <span className="text-green-400">{page.views}</span>
                </div>
              ))}
            </>
          )}
        </motion.div>

        {/* Gráfico de Tráfego */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-3 bg-gradient-to-br from-gray-800/60 to-gray-900/80 backdrop-blur-xl rounded-2xl border border-white/10 p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-5 w-5 text-blue-400" />
              <span className="text-white font-medium">Tráfego do Site</span>
              <span className="text-gray-500 text-sm">{periodLabel}</span>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-gray-400">Visualizações: {formatNumberCompact(trafficData.reduce((s, d) => s + d.visualizacoes, 0))}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-500" />
                <span className="text-gray-400">Usuários: {formatNumberCompact(trafficData.reduce((s, d) => s + d.usuarios, 0))}</span>
              </div>
            </div>
          </div>
          
          <div className="h-48">
            {analyticsLoading ? (
              <div className="h-full bg-white/10 rounded-lg animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trafficData}>
                  <defs>
                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.3} />
                  <XAxis dataKey="date" stroke="#9ca3af" fontSize={11} />
                  <YAxis stroke="#9ca3af" fontSize={11} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Area type="monotone" dataKey="visualizacoes" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorViews)" name="Visualizações" />
                  <Area type="monotone" dataKey="usuarios" stroke="#a855f7" strokeWidth={2} fillOpacity={1} fill="url(#colorUsers)" name="Usuários" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>
      </div>

      {/* ROI Card Destacado + META Ads KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* ROI Card Grande */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
          className={`md:col-span-2 relative overflow-hidden rounded-2xl p-6 ${
            metrics && fbMetrics?.totalSpend && (metrics.revenue || 0) > 0
              ? (((metrics.revenue || 0) - fbMetrics.totalSpend) / fbMetrics.totalSpend * 100) >= 0
                ? 'bg-gradient-to-br from-green-600/30 to-emerald-700/30 border-2 border-green-500/40'
                : 'bg-gradient-to-br from-red-600/30 to-rose-700/30 border-2 border-red-500/40'
              : 'bg-gradient-to-br from-gray-700/40 to-gray-800/60 border border-gray-600/30'
          }`}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl ${
                  metrics && fbMetrics?.totalSpend && (metrics.revenue || 0) > 0
                    ? (((metrics.revenue || 0) - fbMetrics.totalSpend) / fbMetrics.totalSpend * 100) >= 0
                      ? 'bg-green-500/30'
                      : 'bg-red-500/30'
                    : 'bg-gray-500/30'
                }`}>
                  <TrendingUp className={`h-5 w-5 ${
                    metrics && fbMetrics?.totalSpend && (metrics.revenue || 0) > 0
                      ? (((metrics.revenue || 0) - fbMetrics.totalSpend) / fbMetrics.totalSpend * 100) >= 0
                        ? 'text-green-400'
                        : 'text-red-400'
                      : 'text-gray-400'
                  }`} />
                </div>
                <span className={`text-lg font-semibold ${
                  metrics && fbMetrics?.totalSpend && (metrics.revenue || 0) > 0
                    ? (((metrics.revenue || 0) - fbMetrics.totalSpend) / fbMetrics.totalSpend * 100) >= 0
                      ? 'text-green-300'
                      : 'text-red-300'
                    : 'text-gray-300'
                }`}>
                  ROI ({periodLabel})
                </span>
              </div>
            </div>
            <div className={`text-4xl font-bold ${
              metrics && fbMetrics?.totalSpend && (metrics.revenue || 0) > 0
                ? (((metrics.revenue || 0) - fbMetrics.totalSpend) / fbMetrics.totalSpend * 100) >= 0
                  ? 'text-green-400'
                  : 'text-red-400'
                : 'text-gray-400'
            }`}>
              {analyticsLoading || loading ? '...' : (
                fbMetrics?.totalSpend && fbMetrics.totalSpend > 0 && metrics?.revenue
                  ? `${(((metrics.revenue || 0) - fbMetrics.totalSpend) / fbMetrics.totalSpend * 100) >= 0 ? '+' : ''}${(((metrics.revenue || 0) - fbMetrics.totalSpend) / fbMetrics.totalSpend * 100).toFixed(1)}%`
                  : '0%'
              )}
            </div>
            <div className="flex items-center gap-4 mt-3 text-sm">
              <span className="text-gray-400">
                Investido: <span className="text-white font-medium">{formatCurrencyCompact(fbMetrics?.totalSpend || 0)}</span>
              </span>
              <span className="text-gray-400">
                Receita: <span className={`font-medium ${metrics?.revenue ? 'text-green-400' : 'text-gray-500'}`}>
                  {formatCurrencyCompact(metrics?.revenue || 0)}
                </span>
              </span>
            </div>
          </div>
        </motion.div>

        {/* KPIs Meta Ads */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-gray-800/60 to-gray-900/80 backdrop-blur-xl rounded-2xl border border-white/10 p-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-green-500/20">
              <DollarSign className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Investimento META</p>
              <p className="text-xl font-bold text-white">
                {analyticsLoading ? '...' : formatCurrencyCompact(fbMetrics?.totalSpend || 0)}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-gradient-to-br from-gray-800/60 to-gray-900/80 backdrop-blur-xl rounded-2xl border border-white/10 p-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/20">
              <MousePointerClick className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Cliques</p>
              <p className="text-xl font-bold text-white">
                {analyticsLoading ? '...' : formatNumberCompact(fbMetrics?.totalClicks || 0)}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-gray-800/60 to-gray-900/80 backdrop-blur-xl rounded-2xl border border-white/10 p-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/20">
              <TrendingUp className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400">CTR Médio</p>
              <p className="text-xl font-bold text-white">
                {analyticsLoading ? '...' : `${(fbMetrics?.avgCtr || 0).toFixed(2)}%`}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ROAS Inteligente Card */}
      {smartMetrics && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-2xl p-6 border-2 ${
            smartMetrics.roas >= 1 
              ? 'bg-gradient-to-br from-green-600/20 to-emerald-700/20 border-green-500/40' 
              : 'bg-gradient-to-br from-amber-600/20 to-orange-700/20 border-amber-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Target className={`h-5 w-5 ${smartMetrics.roas >= 1 ? 'text-green-400' : 'text-amber-400'}`} />
                <span className="text-sm font-medium text-gray-300">ROAS Inteligente ({periodLabel})</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  smartMetrics.revenueSource === 'meta_api' 
                    ? 'bg-blue-500/30 text-blue-300' 
                    : smartMetrics.revenueSource === 'database_attributed'
                    ? 'bg-purple-500/30 text-purple-300'
                    : 'bg-gray-500/30 text-gray-300'
                }`}>
                  {smartMetrics.revenueSource === 'meta_api' ? '📊 Meta API' : 
                   smartMetrics.revenueSource === 'database_attributed' ? '🎯 Atribuído' : '💾 Banco'}
                </span>
              </div>
              <p className={`text-4xl font-bold ${smartMetrics.roas >= 1 ? 'text-green-400' : 'text-amber-400'}`}>
                {smartMetrics.roas.toFixed(2)}x
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {smartMetrics.purchases} compras = R$ {smartMetrics.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400">Para cada R$ 1 investido</p>
              <p className={`text-2xl font-bold ${smartMetrics.roas >= 1 ? 'text-green-300' : 'text-amber-300'}`}>
                R$ {smartMetrics.roas.toFixed(2)}
              </p>
              {smartMetrics.roas < 1 && (
                <p className="text-xs text-amber-400 mt-1">⚠️ ROAS abaixo de 1x</p>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Erro de Ads */}
      {adsError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <p className="text-red-400 text-sm flex items-center gap-2">
            <span>❌</span> {adsError}
            <button 
              onClick={loadAnalyticsData}
              className="ml-auto text-xs bg-red-500/20 hover:bg-red-500/30 px-3 py-1 rounded"
            >
              Tentar novamente
            </button>
          </p>
        </div>
      )}

      {/* ROI Big Numbers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-gradient-to-br from-emerald-500/20 to-green-600/20 rounded-2xl border border-emerald-500/30 p-5"
        >
          <p className="text-xs text-emerald-300 mb-1">Investido ({periodLabel})</p>
          <p className="text-3xl font-bold text-white">
            {analyticsLoading ? '...' : formatCurrencyCompact(roiInvested)}
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-br from-blue-500/20 to-indigo-600/20 rounded-2xl border border-blue-500/30 p-5"
        >
          <p className="text-xs text-blue-300 mb-1">Retorno Real ({periodLabel})</p>
          <p className="text-3xl font-bold text-white">
            {loading ? '...' : formatCurrencyCompact(roiReturn)}
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className={`rounded-2xl border p-5 ${
            roiDelta >= 0
              ? 'bg-gradient-to-br from-green-600/20 to-emerald-700/20 border-green-500/30'
              : 'bg-gradient-to-br from-red-600/20 to-rose-700/20 border-red-500/30'
          }`}
        >
          <p className="text-xs text-gray-300 mb-1">Diferença Real ({periodLabel})</p>
          <p className={`text-3xl font-bold ${roiDelta >= 0 ? 'text-green-300' : 'text-red-300'}`}>
            {loading ? '...' : `${roiDelta >= 0 ? '+' : ''}${formatCurrencyCompact(roiDelta)}`}
          </p>
        </motion.div>
      </div>

      {/* Campanhas Ativas */}
      {fbMetrics && fbMetrics.campaigns.filter(c => (c as any).effective_status === 'ACTIVE').length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-br from-gray-800/60 to-gray-900/80 backdrop-blur-xl rounded-2xl border border-white/10 p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Facebook className="h-5 w-5 text-blue-500" />
              <span className="text-white font-medium">Campanhas Ativas</span>
              <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">
                {fbMetrics.campaigns.filter(c => (c as any).effective_status === 'ACTIVE').length} ativas
              </span>
            </div>
            <Link 
              href="/admin/ads"
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
            >
              Ver todas <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
          
          <div className="space-y-2">
            {fbMetrics.campaigns
              .filter(c => (c as any).effective_status === 'ACTIVE')
              .slice(0, 3)
              .map((campaign, index) => (
              <div
                key={campaign.campaign_id || index}
                className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/20">
                    <PlayCircle className="h-4 w-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="font-medium text-white text-sm">{campaign.campaign_name}</p>
                    <p className="text-xs text-gray-500">
                      Criada em {(campaign as any).created_time?.slice(0, 10) || 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="text-right">
                    <p className="font-medium text-green-400">{formatCurrencyCompact(Number(campaign.spend || 0))}</p>
                    <p className="text-xs text-gray-500">Gasto</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-blue-400">{formatNumberCompact(Number(campaign.clicks || 0))}</p>
                    <p className="text-xs text-gray-500">Cliques</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
      {/* ============ FIM ANALYTICS + META ADS SECTION ============ */}

      {/* Gateway Performance Stats */}
      <GatewayStatsCard 
        startDate={filterType === 'custom' ? startDate : undefined}
        endDate={filterType === 'custom' ? endDate : undefined}
        days={filterType === 'quick' ? quickDays : undefined}
      />

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
            className="group bg-gradient-to-br from-green-500 to-green-600 border border-green-400 rounded-xl p-6 hover:shadow-lg hover:shadow-green-500/50 transition-all hover:scale-105"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </div>
              <ArrowRight className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">WhatsApp</h4>
            <p className="text-sm text-white/80 mb-3">
              Inbox e automação de mensagens
            </p>
            <div className="flex items-center gap-2 text-xs text-white/90">
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
            {/* 🔧 FIX: Container com altura fixa para Recharts */}
            <div className="w-full h-[350px] min-h-[350px]">
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
