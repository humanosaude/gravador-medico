"use client"

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Users, Search, Mail, Phone, Calendar, DollarSign, 
  ShoppingBag, Filter, Download, RefreshCw, Eye, TrendingUp 
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { format, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { fetchCustomersWithMetrics } from '@/lib/dashboard-queries'

interface Customer {
  customer_id: string
  name: string
  email: string
  phone: string | null
  segment: string | null
  status: string
  total_orders: number
  total_spent: number
  average_order_value: number
  last_purchase_at: string
  first_purchase_at: string
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'total_spent' | 'total_orders' | 'last_purchase_at'>('total_spent')
  const [filterSegment, setFilterSegment] = useState<'all' | 'vip' | 'regular' | 'new'>('all')
  
  // Filtros de data
  const today = new Date()
  const thirtyDaysAgo = subDays(today, 30)
  const [startDate, setStartDate] = useState(format(thirtyDaysAgo, 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(today, 'yyyy-MM-dd'))
  const [period, setPeriod] = useState(30)

  // Função para definir período rápido
  const setQuickPeriod = (days: number) => {
    setPeriod(days)
    const end = new Date()
    const start = subDays(end, days)
    setStartDate(format(start, 'yyyy-MM-dd'))
    setEndDate(format(end, 'yyyy-MM-dd'))
  }

  useEffect(() => {
    loadCustomers()
  }, [startDate, endDate])

  useEffect(() => {
    filterAndSortCustomers()
  }, [searchTerm, sortBy, filterSegment, customers])

  const loadCustomers = async () => {
    try {
      setRefreshing(true)

      console.log('📊 Carregando clientes:', { startDate, endDate })

      // Usar helper de queries
      const { data, error } = await fetchCustomersWithMetrics(
        supabase,
        startDate,
        endDate
      )

      if (error) {
        console.error('❌ Erro ao buscar clientes:', error)
        return
      }

      console.log('✅ Clientes carregados:', data?.length || 0)
      setCustomers(data || [])

    } catch (error) {
      console.error('❌ Erro:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const filterAndSortCustomers = () => {
    let filtered = [...customers]

    // Filtrar por busca
    if (searchTerm) {
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone?.includes(searchTerm)
      )
    }

    // Filtrar por segmento
    if (filterSegment !== 'all') {
      filtered = filtered.filter(c => c.segment === filterSegment)
    }

    // Ordenar
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'total_spent':
          return b.total_spent - a.total_spent
        case 'total_orders':
          return b.total_orders - a.total_orders
        case 'last_purchase_at':
          return new Date(b.last_purchase_at).getTime() - new Date(a.last_purchase_at).getTime()
        default:
          return 0
      }
    })

    setFilteredCustomers(filtered)
  }

  // Métricas totais
  const totalCustomers = customers.length
  const totalRevenue = customers.reduce((sum, c) => sum + c.total_spent, 0)
  const avgOrderValue = customers.reduce((sum, c) => sum + c.average_order_value, 0) / (customers.length || 1)
  const totalOrders = customers.reduce((sum, c) => sum + c.total_orders, 0)

  // Segmentos
  const vipCount = customers.filter(c => c.segment === 'vip').length
  const regularCount = customers.filter(c => c.segment === 'regular').length
  const newCount = customers.filter(c => c.segment === 'new').length

  const MetricCard = ({ title, value, icon: Icon, color, prefix = '', suffix = '' }: any) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-700/50"
    >
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div>
          <p className="text-gray-400 text-sm font-medium">{title}</p>
          <p className="text-2xl font-bold text-white">
            {prefix}{typeof value === 'number' ? value.toLocaleString('pt-BR', {
              minimumFractionDigits: prefix === 'R$ ' ? 2 : 0,
              maximumFractionDigits: prefix === 'R$ ' ? 2 : 0,
            }) : value}{suffix}
          </p>
        </div>
      </div>
    </motion.div>
  )

  const SegmentBadge = ({ segment }: { segment: string | null }) => {
    const styles = {
      vip: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      regular: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      new: 'bg-green-500/20 text-green-400 border-green-500/30',
    }

    const labels = {
      vip: '⭐ VIP',
      regular: '👤 Regular',
      new: '🆕 Novo',
    }

    const seg = segment || 'new'
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${styles[seg as keyof typeof styles]}`}>
        {labels[seg as keyof typeof labels]}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400 font-medium">Carregando clientes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black text-white">Clientes</h1>
          <p className="text-gray-400 mt-1">Gerencie sua base de clientes</p>
        </div>

        <div className="flex gap-3 flex-wrap">
          {/* Filtros Rápidos */}
          <div className="flex gap-2 bg-gray-800 border border-gray-700 rounded-xl p-1">
            {[7, 14, 30, 90].map((days) => (
              <button
                key={days}
                onClick={() => setQuickPeriod(days)}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                  period === days
                    ? 'bg-brand-500 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {days} dias
              </button>
            ))}
          </div>

          <button
            onClick={loadCustomers}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl hover:bg-gray-700 text-white transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total de Clientes"
          value={totalCustomers}
          icon={Users}
          color="from-blue-500 to-cyan-600"
        />
        <MetricCard
          title="Receita Total"
          value={totalRevenue}
          icon={DollarSign}
          color="from-green-500 to-emerald-600"
          prefix="R$ "
        />
        <MetricCard
          title="Ticket Médio"
          value={avgOrderValue}
          icon={ShoppingBag}
          color="from-orange-500 to-red-600"
          prefix="R$ "
        />
        <MetricCard
          title="Total de Pedidos"
          value={totalOrders}
          icon={TrendingUp}
          color="from-purple-500 to-pink-600"
        />
      </div>

      {/* Filtros e Busca */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-700/50">
        <div className="flex flex-wrap gap-4">
          {/* Busca */}
          <div className="flex-1 min-w-[300px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar por nome, email ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Filtro Segmento */}
          <select
            value={filterSegment}
            onChange={(e) => setFilterSegment(e.target.value as any)}
            className="px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">Todos os Segmentos</option>
            <option value="vip">⭐ VIP ({vipCount})</option>
            <option value="regular">👤 Regular ({regularCount})</option>
            <option value="new">🆕 Novo ({newCount})</option>
          </select>

          {/* Ordenar por */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="total_spent">Maior Gasto</option>
            <option value="total_orders">Mais Pedidos</option>
            <option value="last_purchase_at">Última Compra</option>
          </select>

          <button className="flex items-center gap-2 px-4 py-3 bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition-colors">
            <Download className="w-4 h-4" />
            Exportar
          </button>
        </div>
      </div>

      {/* Tabela de Clientes */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900/50 border-b border-gray-700">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase">Cliente</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase">Segmento</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase">Total Gasto</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase">Pedidos</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase">Ticket Médio</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase">Última Compra</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredCustomers.map((customer) => (
                <tr key={customer.customer_id} className="hover:bg-gray-700/30 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-semibold text-white">{customer.name}</div>
                      <div className="text-sm text-gray-400 flex items-center gap-2 mt-1">
                        <Mail className="w-3 h-3" />
                        {customer.email}
                      </div>
                      {customer.phone && (
                        <div className="text-sm text-gray-400 flex items-center gap-2 mt-1">
                          <Phone className="w-3 h-3" />
                          {customer.phone}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <SegmentBadge segment={customer.segment} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-green-400">
                      R$ {customer.total_spent.toFixed(2)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-blue-400" />
                      <span className="font-semibold text-white">{customer.total_orders}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-gray-300">
                      R$ {customer.average_order_value.toFixed(2)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(customer.last_purchase_at), 'dd/MM/yyyy', { locale: ptBR })}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-brand-400 hover:text-brand-300 font-semibold text-sm transition-colors">
                      <Eye className="w-5 h-5 inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredCustomers.length === 0 && (
          <div className="p-12 text-center">
            <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Nenhum cliente encontrado</h3>
            <p className="text-gray-400">
              {searchTerm ? 'Tente ajustar os filtros de busca' : 'Aguardando primeiras vendas'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
