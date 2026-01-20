"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Users,
  CreditCard,
  ArrowUp,
  ArrowDown,
  Eye,
  MoreVertical,
  Download,
  RefreshCw,
  Calendar,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface DashboardMetrics {
  totalRevenue: number
  totalOrders: number
  totalCustomers: number
  averageTicket: number
  revenueGrowth: number
  ordersGrowth: number
  conversionRate: number
}

interface RecentSale {
  id: string
  customer_name: string
  customer_email: string
  total_amount: number
  status: string
  payment_method: string
  created_at: string
}

export default function AdminDashboard() {
  const router = useRouter()
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalRevenue: 0,
    totalOrders: 0,
    totalCustomers: 0,
    averageTicket: 0,
    revenueGrowth: 0,
    ordersGrowth: 0,
    conversionRate: 0,
  })
  const [recentSales, setRecentSales] = useState<RecentSale[]>([])
  const [salesChart, setSalesChart] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [period, setPeriod] = useState(30) // MUDADO: 30 dias por padrão
  
  // ✅ CORRIGIDO: Inicializar com datas válidas (últimos 30 dias com fuso horário correto)
  const defaultEnd = endOfDay(new Date()) // Fim do dia atual (23:59:59)
  const defaultStart = startOfDay(subDays(new Date(), 30)) // Início de 30 dias atrás (00:00:00)
  const [startDate, setStartDate] = useState(format(defaultStart, 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(defaultEnd, 'yyyy-MM-dd'))
  const [filterType, setFilterType] = useState<'quick' | 'custom'>('quick')

  // Função para definir período rápido
  const setQuickPeriod = (days: number) => {
    setFilterType('quick')
    setPeriod(days)
    const end = new Date()
    const start = days === 0 ? startOfDay(end) : subDays(end, days) // 0 = hoje
    setStartDate(format(start, 'yyyy-MM-dd'))
    setEndDate(format(end, 'yyyy-MM-dd'))
  }

  useEffect(() => {
    // Carregar dados na montagem inicial com valores padrão já definidos
    loadDashboardData()
  }, [])

  useEffect(() => {
    // Recarregar quando os filtros mudarem (mas não na montagem inicial)
    if (startDate && endDate) {
      loadDashboardData()
    }
  }, [startDate, endDate])

  const loadDashboardData = async () => {
    try {
      setRefreshing(true)
      
      // Calcular datas baseadas nos filtros
      const endDateObj = endOfDay(new Date(endDate))
      const startDateObj = startOfDay(new Date(startDate))
      const periodDays = Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24))
      const previousStartDate = startOfDay(subDays(startDateObj, periodDays))
      
      console.log('📅 Dashboard - Período:', {
        start: startDateObj.toISOString(),
        end: endDateObj.toISOString(),
        days: periodDays
      })
      
      // TESTE: Buscar TODAS as vendas (sem filtro de data)
      const { data: allSales, error: testError } = await supabase
        .from('sales')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)
      
      console.log('🔍 TESTE - Total de vendas na tabela (últimas 10):', allSales?.length || 0)
      console.log('🔍 TESTE - Vendas:', allSales)
      
      // 1. Buscar vendas do período atual
      const { data: currentSales, error: currentError} = await supabase
        .from('sales')
        .select('*')
        .gte('created_at', startDateObj.toISOString())
        .lte('created_at', endDateObj.toISOString())
        .order('created_at', { ascending: false })

      console.log('📊 Dashboard - Vendas encontradas:', currentSales?.length || 0)
      console.log('📦 Dashboard - Exemplo de venda:', currentSales?.[0])
      console.log('📦 Dashboard - Status das vendas:', currentSales?.map(s => s.status))

      if (currentError) {
        console.error('❌ Erro ao buscar vendas atuais:', currentError)
        setLoading(false)
        setRefreshing(false)
        return
      }

      // 2. Buscar vendas do período anterior (para comparação)
      const { data: previousSales } = await supabase
        .from('sales')
        .select('*')
        .gte('created_at', previousStartDate.toISOString())
        .lt('created_at', startDateObj.toISOString())

      // ✅ CORRIGIDO: Aceitar múltiplos status (approved, paid, completed)
      const approvedSales = (currentSales || []).filter(s => 
        s.status === 'approved' || s.status === 'paid' || s.status === 'completed'
      )
      const totalRevenue = approvedSales.reduce((sum, s) => sum + Number(s.total_amount || 0), 0)
      const totalOrders = approvedSales.length
      const uniqueEmails = new Set(approvedSales.map(s => s.customer_email))
      const totalCustomers = uniqueEmails.size
      const averageTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0

      // 4. Calcular métricas do período anterior
      const previousApprovedSales = (previousSales || []).filter(s => 
        s.status === 'approved' || s.status === 'paid' || s.status === 'completed'
      )
      const previousRevenue = previousApprovedSales.reduce((sum, s) => sum + Number(s.total_amount || 0), 0)
      const previousOrders = previousApprovedSales.length

      // 5. Calcular crescimentos
      const revenueGrowth = previousRevenue > 0 
        ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 
        : totalRevenue > 0 ? 100 : 0
      
      const ordersGrowth = previousOrders > 0 
        ? ((totalOrders - previousOrders) / previousOrders) * 100 
        : totalOrders > 0 ? 100 : 0

      // Taxa de conversão (aproximada - vendas aprovadas / total de vendas)
      const totalAttempts = (currentSales || []).length
      const conversionRate = totalAttempts > 0 
        ? (totalOrders / totalAttempts) * 100 
        : 0

      setMetrics({
        totalRevenue,
        totalOrders,
        totalCustomers,
        averageTicket,
        revenueGrowth,
        ordersGrowth,
        conversionRate,
      })

      // 6. Preparar dados para gráfico (últimos N dias do período filtrado)
      const chartData = []
      for (let i = period - 1; i >= 0; i--) {
        const date = subDays(endOfDay(new Date()), i)
        const dateStr = format(date, 'dd/MM')
        
        const daySales = approvedSales.filter(s => {
          const saleDate = new Date(s.created_at)
          return format(saleDate, 'dd/MM') === dateStr
        })
        
        const dayRevenue = daySales.reduce((sum, s) => sum + Number(s.total_amount || 0), 0)
        
        chartData.push({
          date: dateStr,
          receita: dayRevenue,
          vendas: daySales.length,
        })
      }
      
      setSalesChart(chartData)

      // 7. Vendas recentes (últimas 10)
      setRecentSales((currentSales || []).slice(0, 10))

    } catch (error) {
      console.error('Erro ao carregar dashboard:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const MetricCard = ({ 
    title, 
    value, 
    change, 
    icon: Icon, 
    color,
    prefix = '',
    suffix = ''
  }: any) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-700/50 hover:shadow-2xl hover:border-brand-500/30 transition-all"
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div className={`flex items-center gap-1 text-sm font-bold ${
          change >= 0 ? 'text-green-400' : 'text-red-400'
        }`}>
          {change >= 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
          {Math.abs(change).toFixed(1)}%
        </div>
      </div>
      <h3 className="text-gray-400 text-sm font-semibold mb-1">{title}</h3>
      <p className="text-3xl font-black text-white">
        {prefix}{typeof value === 'number' ? value.toLocaleString('pt-BR', {
          minimumFractionDigits: prefix === 'R$ ' ? 2 : 0,
          maximumFractionDigits: prefix === 'R$ ' ? 2 : 0,
        }) : value}{suffix}
      </p>
    </motion.div>
  )

  const StatusBadge = ({ status }: { status: string }) => {
    const styles = {
      approved: 'bg-green-500/20 text-green-400 border-green-500/30',
      pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
      refunded: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    }

    const labels = {
      approved: 'Aprovado',
      pending: 'Pendente',
      rejected: 'Recusado',
      refunded: 'Reembolsado',
    }

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${styles[status as keyof typeof styles] || styles.pending}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    )
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
          {/* Filtros Rápidos */}
          <div className="flex gap-2 bg-gray-800 border border-gray-700 rounded-xl p-1">
            <button
              onClick={() => setQuickPeriod(0)}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                period === 0 && filterType === 'quick'
                  ? 'bg-brand-500 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Hoje
            </button>
            {[7, 14, 30].map((days) => (
              <button
                key={days}
                onClick={() => setQuickPeriod(days)}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                  period === days && filterType === 'quick'
                    ? 'bg-brand-500 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {days} dias
              </button>
            ))}
          </div>

          {/* Filtros Personalizados */}
          <div className="flex gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setFilterType('custom')
                setStartDate(e.target.value)
              }}
              className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setFilterType('custom')
                setEndDate(e.target.value)
              }}
              className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          
          <button
            onClick={loadDashboardData}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl hover:bg-gray-700 text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-600 to-brand-500 text-white rounded-xl hover:shadow-lg hover:shadow-brand-500/30 transition-all">
            <Download className="w-4 h-4" />
            Exportar
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Faturamento Total"
          value={metrics.totalRevenue}
          change={metrics.revenueGrowth}
          icon={DollarSign}
          color="from-green-500 to-emerald-600"
          prefix="R$ "
        />
        <MetricCard
          title="Total de Vendas"
          value={metrics.totalOrders}
          change={metrics.ordersGrowth}
          icon={ShoppingCart}
          color="from-blue-500 to-cyan-600"
        />
        <MetricCard
          title="Clientes Únicos"
          value={metrics.totalCustomers}
          change={0}
          icon={Users}
          color="from-purple-500 to-pink-600"
        />
        <MetricCard
          title="Ticket Médio"
          value={metrics.averageTicket}
          change={0}
          icon={CreditCard}
          color="from-orange-500 to-red-600"
          prefix="R$ "
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-700/50">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-white">Receita ({period} dias)</h3>
              <p className="text-sm text-gray-400 mt-1">Últimos {period} dias</p>
            </div>
            <button className="p-2 hover:bg-gray-700 rounded-lg transition-colors">
              <MoreVertical className="w-5 h-5 text-gray-400" />
            </button>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={salesChart}>
              <defs>
                <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
              <YAxis stroke="#9ca3af" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1f2937', 
                  border: '1px solid #374151',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.3)',
                  color: '#fff'
                }}
                formatter={(value: any) => `R$ ${Number(value).toFixed(2)}`}
              />
              <Area 
                type="monotone" 
                dataKey="receita" 
                stroke="#10b981" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorReceita)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Sales Count Chart */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-700/50">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-white">Vendas ({period} dias)</h3>
              <p className="text-sm text-gray-400 mt-1">Número de pedidos</p>
            </div>
            <button className="p-2 hover:bg-gray-700 rounded-lg transition-colors">
              <MoreVertical className="w-5 h-5 text-gray-400" />
            </button>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={salesChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
              <YAxis stroke="#9ca3af" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1f2937', 
                  border: '1px solid #374151',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.3)',
                  color: '#fff'
                }}
              />
              <Bar 
                dataKey="vendas" 
                fill="#3b82f6" 
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Sales Table */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-700/50 overflow-hidden">
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-white">Vendas Recentes</h3>
              <p className="text-sm text-gray-400 mt-1">Últimas {recentSales.length} transações</p>
            </div>
            <button 
              onClick={() => router.push('/admin/sales')}
              className="text-brand-400 font-semibold hover:text-brand-300 transition-colors"
            >
              Ver todas →
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900/50 border-b border-gray-700">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Email</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Valor</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Método</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Data</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {recentSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-gray-700/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-semibold text-white">{sale.customer_name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-400">{sale.customer_email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-bold text-green-400">
                      R$ {Number(sale.total_amount).toFixed(2)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={sale.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-400 capitalize">{sale.payment_method}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-400">
                      {format(new Date(sale.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button 
                      onClick={() => router.push(`/admin/sales`)}
                      className="text-brand-400 hover:text-brand-300 font-semibold text-sm transition-colors"
                      title="Ver detalhes"
                    >
                      <Eye className="w-5 h-5 inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {recentSales.length === 0 && (
          <div className="p-12 text-center">
            <ShoppingCart className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Nenhuma venda ainda</h3>
            <p className="text-gray-400">Aguardando a primeira venda via webhook da Appmax</p>
          </div>
        )}
      </div>
    </div>
  )
}
