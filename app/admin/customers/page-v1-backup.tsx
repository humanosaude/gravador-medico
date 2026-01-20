"use client"

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Users, Search, Mail, Phone, Calendar, DollarSign, ShoppingBag, Filter, Download } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Customer {
  email: string
  name: string
  phone: string
  totalSpent: number
  orderCount: number
  lastPurchase: string
  firstPurchase: string
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'totalSpent' | 'orderCount' | 'lastPurchase'>('totalSpent')
  
  // Inicializar com datas válidas (últimos 30 dias)
  const defaultEnd = new Date()
  const defaultStart = subDays(defaultEnd, 30)
  const [startDate, setStartDate] = useState(format(defaultStart, 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(defaultEnd, 'yyyy-MM-dd'))
  const [filterType, setFilterType] = useState<'quick' | 'custom'>('quick')
  const [period, setPeriod] = useState(30)

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
    loadCustomers()
  }, [])

  useEffect(() => {
    // Recarregar quando os filtros mudarem
    if (startDate && endDate) {
      loadCustomers()
    }
  }, [startDate, endDate])

  useEffect(() => {
    filterAndSortCustomers()
  }, [searchTerm, sortBy, customers])

  const loadCustomers = async () => {
    try {
      setLoading(true)

      const start = startOfDay(new Date(startDate))
      const end = endOfDay(new Date(endDate))

      // Buscar todas as vendas aprovadas no período
      const { data: sales, error } = await supabase
        .from('sales')
        .select('*')
        .eq('status', 'approved')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Erro ao buscar vendas:', error)
        return
      }

      // Agrupar por cliente
      const customerMap = new Map<string, Customer>()

      sales?.forEach((sale) => {
        const email = sale.customer_email
        const existing = customerMap.get(email)

        if (existing) {
          existing.totalSpent += Number(sale.total_amount)
          existing.orderCount += 1
          
          // Atualizar última compra se mais recente
          if (new Date(sale.created_at) > new Date(existing.lastPurchase)) {
            existing.lastPurchase = sale.created_at
          }
          
          // Atualizar primeira compra se mais antiga
          if (new Date(sale.created_at) < new Date(existing.firstPurchase)) {
            existing.firstPurchase = sale.created_at
          }
        } else {
          customerMap.set(email, {
            email,
            name: sale.customer_name || 'Sem nome',
            phone: sale.customer_phone || '',
            totalSpent: Number(sale.total_amount),
            orderCount: 1,
            lastPurchase: sale.created_at,
            firstPurchase: sale.created_at,
          })
        }
      })

      const customerList = Array.from(customerMap.values())
      setCustomers(customerList)
    } catch (error) {
      console.error('Erro ao carregar clientes:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterAndSortCustomers = () => {
    let filtered = [...customers]

    // Filtrar por busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(term) ||
          c.email.toLowerCase().includes(term) ||
          c.phone.includes(term)
      )
    }

    // Ordenar
    filtered.sort((a, b) => {
      if (sortBy === 'totalSpent') return b.totalSpent - a.totalSpent
      if (sortBy === 'orderCount') return b.orderCount - a.orderCount
      if (sortBy === 'lastPurchase')
        return new Date(b.lastPurchase).getTime() - new Date(a.lastPurchase).getTime()
      return 0
    })

    setFilteredCustomers(filtered)
  }

  const totalRevenue = customers.reduce((sum, c) => sum + c.totalSpent, 0)
  const totalOrders = customers.reduce((sum, c) => sum + c.orderCount, 0)
  const averageLifetimeValue = customers.length > 0 ? totalRevenue / customers.length : 0

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
      <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-600 to-brand-500 text-white rounded-xl hover:shadow-lg hover:shadow-brand-500/30 transition-all">
        <Download className="w-4 h-4" />
        Exportar
      </button>
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
      {/* Métricas Gerais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-700/50"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-gray-400 text-sm font-semibold">Total de Clientes</h3>
          </div>
          <p className="text-3xl font-black text-white">{customers.length}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-700/50"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-gray-400 text-sm font-semibold">Receita Total</h3>
          </div>
          <p className="text-3xl font-black text-white">
            R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-700/50"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-gray-400 text-sm font-semibold">Total de Pedidos</h3>
          </div>
          <p className="text-3xl font-black text-white">{totalOrders}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-700/50"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-gray-400 text-sm font-semibold">LTV Médio</h3>
          </div>
          <p className="text-3xl font-black text-white">
            R$ {averageLifetimeValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </motion.div>
      </div>

      {/* Filtros */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-700/50">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome, email ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
            >
              <option value="totalSpent">Maior Gasto</option>
              <option value="orderCount">Mais Pedidos</option>
              <option value="lastPurchase">Última Compra</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabela de Clientes */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900/50 border-b border-gray-700">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Contato
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Total Gasto
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Pedidos
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Ticket Médio
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Primeira Compra
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Última Compra
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredCustomers.map((customer) => (
                <tr key={customer.email} className="hover:bg-gray-700/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-white font-bold">
                        {customer.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-white">{customer.name}</div>
                        <div className="text-sm text-gray-400">{customer.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      {customer.phone ? (
                        <>
                          <Phone className="w-4 h-4" />
                          {customer.phone}
                        </>
                      ) : (
                        <span className="text-gray-600">Não informado</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-bold text-green-400">
                      R$ {customer.totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-semibold text-white">{customer.orderCount} pedidos</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-semibold text-blue-400">
                      R${' '}
                      {(customer.totalSpent / customer.orderCount).toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                      })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-400">
                      {format(new Date(customer.firstPurchase), 'dd/MM/yyyy', { locale: ptBR })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-400">
                      {format(new Date(customer.lastPurchase), 'dd/MM/yyyy', { locale: ptBR })}
                    </div>
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
              {searchTerm ? 'Tente buscar por outro termo' : 'Aguardando primeira venda'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
