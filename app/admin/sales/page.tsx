'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  ShoppingCart,
  Search,
  Filter,
  Download,
  Eye,
  RefreshCw,
  Calendar,
  DollarSign,
  TrendingUp,
  Package,
  X
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Sale {
  id: string
  customer_name: string
  customer_email: string
  customer_phone: string
  total_amount: number
  discount_amount: number | null
  status: string
  payment_method: string
  origin: string | null
  utm_source: string | null
  created_at: string
  appmax_order_id: string
}

type FilterTab = 'all' | 'approved' | 'pending' | 'refused' | 'refunded'

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  
  // ✅ CORRIGIDO: Inicializar com datas válidas (últimos 30 dias com fuso horário correto)
  const defaultEnd = endOfDay(new Date())
  const defaultStart = startOfDay(subDays(new Date(), 30))
  const [startDate, setStartDate] = useState(format(defaultStart, 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(defaultEnd, 'yyyy-MM-dd'))
  const [filterType, setFilterType] = useState<'quick' | 'custom'>('quick')
  const [period, setPeriod] = useState(30)
  
  // Estados para modal de detalhes
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)

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
    loadSales()
    
    // 🔴 REALTIME: Escutar novas vendas
    const channel = supabase
      .channel('sales-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sales',
        },
        (payload) => {
          console.log('🔔 Nova venda detectada:', payload)
          loadSales() // Recarrega a lista automaticamente
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    // Recarregar quando os filtros mudarem
    if (startDate && endDate) {
      loadSales()
    }
  }, [startDate, endDate])

  const loadSales = async () => {
    try {
      setRefreshing(true)
      
      const start = startOfDay(new Date(startDate))
      const end = endOfDay(new Date(endDate))
      
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Erro ao carregar vendas:', error)
      } else {
        setSales(data || [])
      }
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Filtrar vendas por status e busca
  const filteredSales = sales.filter(sale => {
    const matchesSearch = 
      sale.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.customer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.appmax_order_id.includes(searchTerm)
    
    const matchesTab = activeTab === 'all' || sale.status === activeTab

    return matchesSearch && matchesTab
  })

  // Contadores para as tabs
  const counts = {
    all: sales.length,
    approved: sales.filter(s => s.status === 'approved' || s.status === 'paid' || s.status === 'completed').length,
    pending: sales.filter(s => s.status === 'pending').length,
    refused: sales.filter(s => s.status === 'refused').length,
    refunded: sales.filter(s => s.status === 'refunded').length,
  }

  // ✅ CORRIGIDO: Métricas aceitam múltiplos status
  const totalRevenue = sales
    .filter(s => s.status === 'approved' || s.status === 'paid' || s.status === 'completed')
    .reduce((sum, s) => sum + (s.total_amount || 0), 0)

  const avgTicket = counts.approved > 0 ? totalRevenue / counts.approved : 0

  function StatusBadge({ status }: { status: string }) {
    const styles = {
      approved: 'bg-green-100 text-green-800 border-green-200',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      refused: 'bg-red-100 text-red-800 border-red-200',
      refunded: 'bg-gray-100 text-gray-800 border-gray-200',
    }

    const labels = {
      approved: 'Pagamento Aprovado',
      pending: 'Aguardando Pagamento',
      refused: 'Recusado',
      refunded: 'Reembolsado',
    }

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    )
  }

  function getPaymentIcon(method: string) {
    if (method?.toLowerCase() === 'pix') {
      return <div className="w-5 h-5 bg-teal-500 rounded flex items-center justify-center text-white text-[10px] font-bold">PIX</div>
    }
    return <DollarSign className="w-4 h-4 text-gray-500" />
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black text-white">Vendas</h1>
          <p className="text-gray-400 mt-1">Gerencie todos os pedidos e transações</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={loadSales}
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

      {/* Filtros de Data */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-700/50">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-gray-400 mb-2">Período Rápido</label>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setQuickPeriod(0)}
                className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
                  period === 0 && filterType === 'quick'
                    ? 'bg-brand-500 text-white shadow-lg'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Hoje
              </button>
              {[7, 14, 30, 60, 90].map((days) => (
                <button
                  key={days}
                  onClick={() => setQuickPeriod(days)}
                  className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
                    period === days && filterType === 'quick'
                      ? 'bg-brand-500 text-white shadow-lg'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {days} dias
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
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

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-700/50"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-900/20 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Receita Total</p>
              <p className="text-2xl font-bold text-white">
                R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-700/50"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-900/20 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Vendas Aprovadas</p>
              <p className="text-2xl font-bold text-white">{counts.approved}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-700/50"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-900/20 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Ticket Médio</p>
              <p className="text-2xl font-bold text-white">
                R$ {avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Tabs de Filtro - Estilo Appmax */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition ${
            activeTab === 'all'
              ? 'bg-brand-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          Todos ({counts.all})
        </button>
        <button
          onClick={() => setActiveTab('approved')}
          className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition ${
            activeTab === 'approved'
              ? 'bg-green-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          ✓ Aprovados ({counts.approved})
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition ${
            activeTab === 'pending'
              ? 'bg-yellow-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          ⏱ Não Pagos ({counts.pending})
        </button>
        <button
          onClick={() => setActiveTab('refused')}
          className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition ${
            activeTab === 'refused'
              ? 'bg-red-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          ✕ Recusados ({counts.refused})
        </button>
        <button
          onClick={() => setActiveTab('refunded')}
          className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition ${
            activeTab === 'refunded'
              ? 'bg-gray-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          ↩ Reembolsos ({counts.refunded})
        </button>
      </div>

      {/* Barra de Busca */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-700/50">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar por nome, email ou ID do pedido..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-900/50 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 placeholder:text-gray-500"
          />
        </div>
      </div>

      {/* Tabela de Vendas - Estilo Appmax */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900/50 border-b border-gray-700">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">ID</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Data</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Valor</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Origem</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <ShoppingCart className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400">
                      {searchTerm ? 'Nenhuma venda encontrada' : 'Aguardando vendas via webhook da Appmax'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-700/30 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-mono text-white">
                        #{sale.appmax_order_id}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-semibold text-white">
                          {sale.customer_name}
                        </div>
                        <div className="text-xs text-gray-400">
                          {sale.customer_email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-300">
                        {format(new Date(sale.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </div>
                      <div className="text-xs text-gray-500">
                        {format(new Date(sale.created_at), "HH:mm")}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getPaymentIcon(sale.payment_method)}
                        <div>
                          <div className="text-sm font-semibold text-white">
                            R$ {sale.total_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                          <div className="text-xs text-gray-500 capitalize">
                            {sale.payment_method}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-300">
                        {sale.utm_source || sale.origin || 'API'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={sale.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button 
                        onClick={() => {
                          setSelectedSale(sale)
                          setDetailsOpen(true)
                        }}
                        className="text-brand-400 hover:text-brand-300 transition-colors"
                        title="Ver detalhes"
                      >
                        <Eye className="w-5 h-5 inline" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-gray-400">
        Mostrando {filteredSales.length} de {sales.length} vendas
      </div>

      {/* Modal de Detalhes */}
      {detailsOpen && selectedSale && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setDetailsOpen(false)}>
          <div className="bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">Detalhes da Venda</h2>
                <p className="text-gray-400 text-sm mt-1">ID: #{selectedSale.appmax_order_id}</p>
              </div>
              <button
                onClick={() => setDetailsOpen(false)}
                className="text-gray-400 hover:text-white transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Cliente */}
              <div>
                <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">Cliente</h3>
                <div className="space-y-2">
                  <p className="text-white"><strong>Nome:</strong> {selectedSale.customer_name}</p>
                  <p className="text-white"><strong>Email:</strong> {selectedSale.customer_email}</p>
                  {selectedSale.customer_phone && (
                    <p className="text-white"><strong>Telefone:</strong> {selectedSale.customer_phone}</p>
                  )}
                </div>
              </div>

              {/* Pagamento */}
              <div>
                <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">Pagamento</h3>
                <div className="space-y-2">
                  <p className="text-white"><strong>Método:</strong> {selectedSale.payment_method?.toUpperCase()}</p>
                  <p className="text-white flex items-center gap-2"><strong>Status:</strong> <StatusBadge status={selectedSale.status} /></p>
                  <p className="text-white"><strong>Valor:</strong> R$ {selectedSale.total_amount?.toFixed(2)}</p>
                  {selectedSale.discount_amount && selectedSale.discount_amount > 0 && (
                    <p className="text-white"><strong>Desconto:</strong> R$ {selectedSale.discount_amount?.toFixed(2)}</p>
                  )}
                </div>
              </div>

              {/* Origem */}
              {selectedSale.utm_source && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">Origem</h3>
                  <div className="space-y-2">
                    <p className="text-white"><strong>Source:</strong> {selectedSale.utm_source}</p>
                    {selectedSale.origin && <p className="text-white"><strong>Origin:</strong> {selectedSale.origin}</p>}
                  </div>
                </div>
              )}

              {/* Data */}
              <div>
                <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">Data</h3>
                <p className="text-white"><strong>Criado em:</strong> {format(new Date(selectedSale.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-800 border-t border-gray-700 p-6">
              <button
                onClick={() => setDetailsOpen(false)}
                className="w-full px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
