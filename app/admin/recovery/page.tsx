'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  DollarSign,
  Clock,
  ShoppingCart,
  TrendingUp,
  MessageCircle,
  RefreshCw,
  Search,
  Calendar,
  Phone,
  User,
  Package
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatMoney, formatPercent } from '@/lib/format'

interface CheckoutAttempt {
  id: string
  appmax_order_id: string
  customer_name: string
  customer_phone: string
  total_amount: string
  status: string
  recovery_status: string
  created_at: string
}

interface Metrics {
  totalRecovered: number
  totalPending: number
  totalAbandoned: number
  conversionRate: number
  totalAttempts: number
}

export default function RecoveryPage() {
  const [attempts, setAttempts] = useState<CheckoutAttempt[]>([])
  const [filteredAttempts, setFilteredAttempts] = useState<CheckoutAttempt[]>([])
  const [metrics, setMetrics] = useState<Metrics>({
    totalRecovered: 0,
    totalPending: 0,
    totalAbandoned: 0,
    conversionRate: 0,
    totalAttempts: 0
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'recovered' | 'abandoned'>('all')

  // Função para carregar os dados
  const loadRecoveryData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const response = await fetch('/api/admin/recovery', {
        credentials: 'include'
      })
      const result = await response.json()

      if (result.success) {
        setAttempts(result.data)
        setFilteredAttempts(result.data)
        setMetrics(result.metrics)
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Carregar dados na montagem
  useEffect(() => {
    loadRecoveryData()
  }, [])

  // Filtrar por busca e status
  useEffect(() => {
    let filtered = [...attempts]

    // Filtro por texto
    if (searchTerm) {
      filtered = filtered.filter(
        (attempt) =>
          attempt.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          attempt.customer_phone.includes(searchTerm) ||
          attempt.appmax_order_id.includes(searchTerm)
      )
    }

    // Filtro por status
    if (filterStatus !== 'all') {
      filtered = filtered.filter((attempt) => attempt.recovery_status === filterStatus)
    }

    setFilteredAttempts(filtered)
  }, [searchTerm, filterStatus, attempts])

  // Função para abrir WhatsApp
  const openWhatsApp = (phone: string, name: string, amount: string) => {
    // Remover caracteres não numéricos
    const cleanPhone = phone.replace(/\D/g, '')
    
    // Mensagem personalizada
    const message = `Olá ${name}! 👋

Notamos que você iniciou uma compra no valor de *R$ ${formatMoney(parseFloat(amount))}*, mas não finalizou o pagamento. 

Posso te ajudar a concluir seu pedido? Se tiver alguma dúvida, estou à disposição! 😊`

    const encodedMessage = encodeURIComponent(message)
    const whatsappUrl = `https://wa.me/55${cleanPhone}?text=${encodedMessage}`
    
    window.open(whatsappUrl, '_blank')
  }

  // Cards de métricas
  const statsCards = [
    {
      title: 'Receita Recuperada',
      value: `R$ ${formatMoney(metrics.totalRecovered)}`,
      icon: DollarSign,
      color: 'bg-green-500',
      textColor: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'PIX Pendente',
      value: `R$ ${formatMoney(metrics.totalPending)}`,
      icon: Clock,
      color: 'bg-yellow-500',
      textColor: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    },
    {
      title: 'Abandonos',
      value: `R$ ${formatMoney(metrics.totalAbandoned)}`,
      icon: ShoppingCart,
      color: 'bg-red-500',
      textColor: 'text-red-600',
      bgColor: 'bg-red-50'
    },
    {
      title: 'Taxa de Conversão',
      value: `${formatPercent(metrics.conversionRate)}%`,
      icon: TrendingUp,
      color: 'bg-blue-500',
      textColor: 'text-blue-600',
      bgColor: 'bg-blue-50'
    }
  ]

  // Status badge
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
      recovered: { label: 'Recuperado', color: 'bg-green-100 text-green-800' },
      abandoned: { label: 'Abandonado', color: 'bg-red-100 text-red-800' },
      waiting: { label: 'Aguardando', color: 'bg-blue-100 text-blue-800' }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || {
      label: status,
      color: 'bg-gray-100 text-gray-800'
    }

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-300">Carregando dados de recuperação...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Package className="w-8 h-8 text-blue-500" />
                Sala de Recuperação
              </h1>
              <p className="text-gray-400 mt-1">
                Gerencie e recupere checkouts abandonados
              </p>
            </div>
            <button
              onClick={() => loadRecoveryData(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-lg"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>
        </div>

        {/* Cards de Métricas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statsCards.map((card, index) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-gray-800 border border-gray-700 rounded-xl shadow-xl p-6 hover:shadow-2xl hover:border-gray-600 transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${card.bgColor} bg-opacity-20`}>
                  <card.icon className={`w-6 h-6 ${card.textColor}`} />
                </div>
              </div>
              <h3 className="text-gray-400 text-sm font-medium mb-1">{card.title}</h3>
              <p className="text-2xl font-bold text-white">{card.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Filtros e Busca */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-xl p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Busca */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome, telefone ou pedido..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-600 text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filtro de Status */}
            <div className="flex gap-2">
              {[
                { value: 'all', label: 'Todos' },
                { value: 'pending', label: 'Pendentes' },
                { value: 'recovered', label: 'Recuperados' },
                { value: 'abandoned', label: 'Abandonados' }
              ].map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setFilterStatus(filter.value as any)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filterStatus === filter.value
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tabela */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900 border-b border-gray-700">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Telefone
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredAttempts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                      <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                      <p className="text-lg font-medium text-gray-300">Nenhum checkout encontrado</p>
                      <p className="text-sm mt-1 text-gray-500">
                        {searchTerm || filterStatus !== 'all'
                          ? 'Tente ajustar os filtros de busca'
                          : 'Os checkouts abandonados aparecerão aqui'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredAttempts.map((attempt, index) => (
                    <motion.tr
                      key={attempt.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-900/30 rounded-full flex items-center justify-center border border-blue-500/30">
                            <User className="w-5 h-5 text-blue-400" />
                          </div>
                          <div>
                            <p className="font-medium text-white">{attempt.customer_name}</p>
                            <p className="text-xs text-gray-500">ID: {attempt.appmax_order_id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-gray-300">
                          <Phone className="w-4 h-4 text-gray-500" />
                          {attempt.customer_phone}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-white">
                          R$ {formatMoney(parseFloat(attempt.total_amount))}
                        </span>
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(attempt.recovery_status)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          {format(new Date(attempt.created_at), "dd/MM/yyyy 'às' HH:mm", {
                            locale: ptBR
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() =>
                            openWhatsApp(
                              attempt.customer_phone,
                              attempt.customer_name,
                              attempt.total_amount
                            )
                          }
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium shadow-lg hover:shadow-xl"
                        >
                          <MessageCircle className="w-4 h-4" />
                          WhatsApp
                        </button>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer com total */}
          {filteredAttempts.length > 0 && (
            <div className="bg-gray-900 px-6 py-4 border-t border-gray-700">
              <p className="text-sm text-gray-400">
                Mostrando <span className="font-semibold text-white">{filteredAttempts.length}</span> de{' '}
                <span className="font-semibold text-white">{attempts.length}</span> checkouts
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
