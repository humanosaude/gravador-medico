'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  CreditCard, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  RefreshCw, 
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Target,
  Activity,
  BarChart3,
  PieChart,
  Filter,
  Download,
  Search,
  Eye,
  ChevronDown,
  ChevronUp,
  Wallet,
  Receipt,
  ShieldCheck,
  Ban,
  Loader2,
  Percent
} from 'lucide-react'
import Image from 'next/image'

// Constantes de taxas do Mercado Pago
const MP_PIX_FEE_PERCENT = 0.70 // 0,70% do valor
const MP_PIX_FEE_FIXED = 0.25 // R$ 0,25 fixo por transação

// Função para calcular taxas do Mercado Pago (PIX)
function calculateMPFees(revenue: number, pixSalesCount: number) {
  // Taxa percentual: 0,70% do valor
  const percentFee = revenue * (MP_PIX_FEE_PERCENT / 100)
  // Taxa fixa: R$ 0,25 por transação PIX
  const fixedFee = pixSalesCount * MP_PIX_FEE_FIXED
  // Total de taxas
  const totalFees = percentFee + fixedFee
  // Valor líquido
  const netRevenue = revenue - totalFees
  
  return {
    percentFee,
    fixedFee,
    totalFees,
    netRevenue
  }
}

// Tipos
interface PaymentTransaction {
  id: string
  appmax_order_id: string
  customer_name: string
  customer_email: string
  customer_phone?: string
  total_amount: number
  status: string
  payment_method: string
  payment_gateway?: string
  created_at: string
  paid_at?: string
  failure_reason?: string
  fallback_used?: boolean
}

interface PaymentStats {
  total_transactions: number
  total_revenue: number
  approved_count: number
  approved_revenue: number
  pending_count: number
  pending_revenue: number
  failed_count: number
  refunded_count: number
  refunded_revenue: number
  average_ticket: number
  approval_rate: number
  mp_transactions: number
  mp_revenue: number
  mp_approved: number
  mp_failed: number
  appmax_transactions: number
  appmax_revenue: number
  appmax_approved: number
  pix_count: number
  pix_revenue: number
  credit_card_count: number
  credit_card_revenue: number
  boleto_count: number
  boleto_revenue: number
  today_revenue: number
  today_transactions: number
  yesterday_revenue: number
  yesterday_transactions: number
  week_revenue: number
  week_transactions: number
  // Cascata stats
  rescued_sales: number
  rescued_revenue: number
  rescue_rate: number
  mp_rejection_rate: number
  potential_lost_without_cascata: number
}

type TabType = 'overview' | 'transactions' | 'gateways' | 'methods' | 'cascata'
type DateFilter = 'today' | '7d' | '30d' | '90d' | 'all'
type StatusFilter = 'all' | 'approved' | 'pending' | 'failed' | 'refunded'

export default function PaymentsPage() {
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([])
  const [stats, setStats] = useState<PaymentStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [dateFilter, setDateFilter] = useState<DateFilter>('30d')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTransaction, setSelectedTransaction] = useState<PaymentTransaction | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    loadPayments()
  }, [dateFilter])

  const loadPayments = async () => {
    try {
      setRefreshing(true)
      
      // Calcula datas baseado no filtro
      const now = new Date()
      let startDate = new Date()
      
      switch (dateFilter) {
        case 'today':
          startDate.setHours(0, 0, 0, 0)
          break
        case '7d':
          startDate.setDate(now.getDate() - 7)
          break
        case '30d':
          startDate.setDate(now.getDate() - 30)
          break
        case '90d':
          startDate.setDate(now.getDate() - 90)
          break
        case 'all':
          startDate = new Date(0)
          break
      }

      const params = new URLSearchParams({
        start: startDate.toISOString(),
        end: now.toISOString()
      })

      const response = await fetch(`/api/admin/sales?${params.toString()}`, {
        credentials: 'include'
      })

      if (!response.ok) {
        console.error('Erro ao carregar pagamentos:', response.status)
        setTransactions([])
        return
      }

      const result = await response.json()
      const salesData = result.sales || []
      
      // Mapeia para formato de transações de pagamento
      const mappedTransactions: PaymentTransaction[] = salesData.map((sale: any) => ({
        id: sale.id,
        appmax_order_id: sale.appmax_order_id || sale.id,
        customer_name: sale.customer_name || 'Cliente',
        customer_email: sale.customer_email || '',
        customer_phone: sale.customer_phone,
        total_amount: Number(sale.total_amount) || 0,
        status: sale.status,
        payment_method: sale.payment_method || 'pix',
        payment_gateway: sale.payment_gateway || (sale.fallback_used ? 'appmax' : 'mercadopago'),
        created_at: sale.created_at,
        paid_at: sale.paid_at,
        failure_reason: sale.failure_reason,
        fallback_used: sale.fallback_used
      }))

      setTransactions(mappedTransactions)
      
      // Calcula estatísticas
      const calculatedStats = calculateStats(mappedTransactions)
      setStats(calculatedStats)
      
    } catch (error) {
      console.error('Erro ao carregar pagamentos:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const calculateStats = (data: PaymentTransaction[]): PaymentStats => {
    const now = new Date()
    const todayStart = new Date(now.setHours(0, 0, 0, 0))
    const yesterdayStart = new Date(todayStart)
    yesterdayStart.setDate(yesterdayStart.getDate() - 1)
    const weekStart = new Date(todayStart)
    weekStart.setDate(weekStart.getDate() - 7)

    const approved = data.filter(t => ['paid', 'approved'].includes(t.status))
    const pending = data.filter(t => ['pending', 'processing', 'fraud_analysis'].includes(t.status))
    const failed = data.filter(t => ['failed', 'rejected', 'refused', 'cancelled', 'canceled', 'expired'].includes(t.status))
    const refunded = data.filter(t => ['refunded', 'reversed', 'chargeback'].includes(t.status))

    const mp = data.filter(t => t.payment_gateway === 'mercadopago' && !t.fallback_used)
    const mpApproved = mp.filter(t => ['paid', 'approved'].includes(t.status))
    const mpFailed = mp.filter(t => ['failed', 'rejected', 'refused', 'cancelled', 'canceled', 'expired'].includes(t.status))
    
    // Cascata: transações que usaram fallback para AppMax
    const rescued = data.filter(t => t.fallback_used === true)
    const rescuedApproved = rescued.filter(t => ['paid', 'approved'].includes(t.status))
    
    const appmax = data.filter(t => t.payment_gateway === 'appmax' || t.fallback_used)
    const appmaxApproved = appmax.filter(t => ['paid', 'approved'].includes(t.status))

    const pix = data.filter(t => t.payment_method === 'pix')
    const pixApproved = pix.filter(t => ['paid', 'approved'].includes(t.status))
    const creditCard = data.filter(t => ['credit_card', 'creditCard', 'credit'].includes(t.payment_method))
    const ccApproved = creditCard.filter(t => ['paid', 'approved'].includes(t.status))
    const boleto = data.filter(t => t.payment_method === 'boleto')
    const boletoApproved = boleto.filter(t => ['paid', 'approved'].includes(t.status))

    const todayData = data.filter(t => new Date(t.created_at) >= todayStart)
    const todayApproved = todayData.filter(t => ['paid', 'approved'].includes(t.status))
    
    const yesterdayData = data.filter(t => {
      const date = new Date(t.created_at)
      return date >= yesterdayStart && date < todayStart
    })
    const yesterdayApproved = yesterdayData.filter(t => ['paid', 'approved'].includes(t.status))

    const weekData = data.filter(t => new Date(t.created_at) >= weekStart)
    const weekApproved = weekData.filter(t => ['paid', 'approved'].includes(t.status))

    const totalRevenue = approved.reduce((sum, t) => sum + t.total_amount, 0)
    const rescuedRevenue = rescuedApproved.reduce((sum, t) => sum + t.total_amount, 0)

    return {
      total_transactions: data.length,
      total_revenue: totalRevenue,
      approved_count: approved.length,
      approved_revenue: totalRevenue,
      pending_count: pending.length,
      pending_revenue: pending.reduce((sum, t) => sum + t.total_amount, 0),
      failed_count: failed.length,
      refunded_count: refunded.length,
      refunded_revenue: refunded.reduce((sum, t) => sum + t.total_amount, 0),
      average_ticket: approved.length > 0 ? totalRevenue / approved.length : 0,
      approval_rate: data.length > 0 ? (approved.length / data.length) * 100 : 0,
      mp_transactions: mp.length,
      mp_revenue: mpApproved.reduce((sum, t) => sum + t.total_amount, 0),
      mp_approved: mpApproved.length,
      mp_failed: mpFailed.length,
      appmax_transactions: appmax.length,
      appmax_revenue: appmaxApproved.reduce((sum, t) => sum + t.total_amount, 0),
      appmax_approved: appmaxApproved.length,
      pix_count: pix.length,
      pix_revenue: pixApproved.reduce((sum, t) => sum + t.total_amount, 0),
      credit_card_count: creditCard.length,
      credit_card_revenue: ccApproved.reduce((sum, t) => sum + t.total_amount, 0),
      boleto_count: boleto.length,
      boleto_revenue: boletoApproved.reduce((sum, t) => sum + t.total_amount, 0),
      today_revenue: todayApproved.reduce((sum, t) => sum + t.total_amount, 0),
      today_transactions: todayData.length,
      yesterday_revenue: yesterdayApproved.reduce((sum, t) => sum + t.total_amount, 0),
      yesterday_transactions: yesterdayData.length,
      week_revenue: weekApproved.reduce((sum, t) => sum + t.total_amount, 0),
      week_transactions: weekData.length,
      // Cascata stats
      rescued_sales: rescuedApproved.length,
      rescued_revenue: rescuedRevenue,
      rescue_rate: mpFailed.length > 0 ? (rescuedApproved.length / (mpFailed.length + rescuedApproved.length)) * 100 : 0,
      mp_rejection_rate: mp.length > 0 ? (mpFailed.length / mp.length) * 100 : 0,
      potential_lost_without_cascata: rescuedRevenue
    }
  }

  // Filtragem de transações
  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions]

    // Filtro de status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(t => {
        switch (statusFilter) {
          case 'approved':
            return ['paid', 'approved'].includes(t.status)
          case 'pending':
            return ['pending', 'processing', 'fraud_analysis'].includes(t.status)
          case 'failed':
            return ['failed', 'rejected', 'refused', 'cancelled', 'canceled', 'expired'].includes(t.status)
          case 'refunded':
            return ['refunded', 'reversed', 'chargeback'].includes(t.status)
          default:
            return true
        }
      })
    }

    // Filtro de busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(t => 
        t.customer_name?.toLowerCase().includes(term) ||
        t.customer_email?.toLowerCase().includes(term) ||
        t.appmax_order_id?.toLowerCase().includes(term) ||
        t.id?.toLowerCase().includes(term)
      )
    }

    return filtered
  }, [transactions, statusFilter, searchTerm])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'paid':
      case 'approved':
        return { 
          label: 'Aprovado', 
          icon: CheckCircle2, 
          color: 'text-emerald-500',
          bg: 'bg-emerald-500/10',
          border: 'border-emerald-500/20'
        }
      case 'pending':
      case 'processing':
        return { 
          label: 'Pendente', 
          icon: Clock, 
          color: 'text-amber-500',
          bg: 'bg-amber-500/10',
          border: 'border-amber-500/20'
        }
      case 'fraud_analysis':
        return { 
          label: 'Em Análise', 
          icon: ShieldCheck, 
          color: 'text-blue-500',
          bg: 'bg-blue-500/10',
          border: 'border-blue-500/20'
        }
      case 'refunded':
      case 'reversed':
      case 'chargeback':
        return { 
          label: 'Reembolsado', 
          icon: Receipt, 
          color: 'text-purple-500',
          bg: 'bg-purple-500/10',
          border: 'border-purple-500/20'
        }
      default:
        return { 
          label: 'Falhou', 
          icon: XCircle, 
          color: 'text-red-500',
          bg: 'bg-red-500/10',
          border: 'border-red-500/20'
        }
    }
  }

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'pix':
        return '⚡'
      case 'credit_card':
      case 'creditCard':
      case 'credit':
        return '💳'
      case 'boleto':
        return '📄'
      default:
        return '💰'
    }
  }

  const getGatewayBadge = (gateway: string | undefined, fallback: boolean | undefined) => {
    if (gateway === 'appmax' || fallback) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
          <Zap className="w-3 h-3" />
          AppMax
          {fallback && <span className="text-[10px] opacity-75">(Resgate)</span>}
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
        <CreditCard className="w-3 h-3" />
        Mercado Pago
      </span>
    )
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-brand-500 animate-spin" />
          <p className="text-gray-400 text-sm">Carregando pagamentos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      <div className="max-w-[1800px] mx-auto p-6 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 shadow-lg shadow-brand-500/20">
                <CreditCard className="w-7 h-7 text-white" />
              </div>
              Central de Pagamentos
            </h1>
            <p className="text-gray-400 mt-1.5">
              Acompanhe transações, receitas e performance dos gateways
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Filtro de Data */}
            <div className="flex items-center gap-2 bg-gray-800/50 rounded-xl p-1 border border-gray-700/50">
              {[
                { id: 'today', label: 'Hoje' },
                { id: '7d', label: '7 dias' },
                { id: '30d', label: '30 dias' },
                { id: '90d', label: '90 dias' },
              ].map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setDateFilter(filter.id as DateFilter)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    dateFilter === filter.id
                      ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <button
              onClick={loadPayments}
              disabled={refreshing}
              className="p-2.5 rounded-xl bg-gray-800/50 border border-gray-700/50 text-gray-400 hover:text-white hover:bg-gray-700/50 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Receita Total */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/10 via-gray-800/50 to-gray-800/50 border border-emerald-500/20 p-6"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-gray-400 text-sm font-medium">Receita Aprovada</span>
                  <div className="p-2 rounded-lg bg-emerald-500/20">
                    <DollarSign className="w-5 h-5 text-emerald-400" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-white mb-2">
                  {formatCurrency(stats.total_revenue)}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 text-sm font-medium flex items-center gap-1">
                    <ArrowUpRight className="w-4 h-4" />
                    {stats.approved_count} aprovados
                  </span>
                  <span className="text-gray-500">•</span>
                  <span className="text-gray-400 text-sm">
                    Ticket: {formatCurrency(stats.average_ticket)}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Transações */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/10 via-gray-800/50 to-gray-800/50 border border-blue-500/20 p-6"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-gray-400 text-sm font-medium">Total Transações</span>
                  <div className="p-2 rounded-lg bg-blue-500/20">
                    <BarChart3 className="w-5 h-5 text-blue-400" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-white mb-2">
                  {stats.total_transactions}
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {stats.approved_count}
                  </span>
                  <span className="text-amber-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> {stats.pending_count}
                  </span>
                  <span className="text-red-400 flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" /> {stats.failed_count}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Taxa de Aprovação */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/10 via-gray-800/50 to-gray-800/50 border border-purple-500/20 p-6"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-gray-400 text-sm font-medium">Taxa de Aprovação</span>
                  <div className="p-2 rounded-lg bg-purple-500/20">
                    <Target className="w-5 h-5 text-purple-400" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-white mb-2">
                  {stats.approval_rate.toFixed(1)}%
                </div>
                <div className="w-full bg-gray-700/50 rounded-full h-2 mt-3">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-purple-400 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(stats.approval_rate, 100)}%` }}
                  />
                </div>
              </div>
            </motion.div>

            {/* Hoje */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/10 via-gray-800/50 to-gray-800/50 border border-amber-500/20 p-6"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-gray-400 text-sm font-medium">Receita Hoje</span>
                  <div className="p-2 rounded-lg bg-amber-500/20">
                    <TrendingUp className="w-5 h-5 text-amber-400" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-white mb-2">
                  {formatCurrency(stats.today_revenue)}
                </div>
                <div className="text-sm">
                  <span className="text-gray-400">
                    {stats.today_transactions} transações hoje
                  </span>
                  {stats.yesterday_revenue > 0 && (
                    <span className={`ml-2 ${stats.today_revenue >= stats.yesterday_revenue ? 'text-emerald-400' : 'text-red-400'}`}>
                      {stats.today_revenue >= stats.yesterday_revenue ? '↑' : '↓'} vs ontem
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Card de Taxas Mercado Pago */}
        {stats && stats.total_revenue > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-2xl bg-gradient-to-br from-orange-500/10 via-gray-800/50 to-gray-800/50 border border-orange-500/20 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/20">
                  <Percent className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Taxas Mercado Pago (PIX)</h3>
                  <p className="text-xs text-gray-400">0,70% + R$ 0,25 por transação</p>
                </div>
              </div>
            </div>
            
            {(() => {
              const mpFees = calculateMPFees(stats.total_revenue, stats.approved_count)
              return (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                  <div className="p-3 rounded-xl bg-gray-800/50">
                    <p className="text-xs text-gray-400 mb-1">Receita Bruta</p>
                    <p className="text-lg font-bold text-white">{formatCurrency(stats.total_revenue)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-800/50">
                    <p className="text-xs text-gray-400 mb-1">Taxa % (0,70%)</p>
                    <p className="text-lg font-bold text-orange-400">-{formatCurrency(mpFees.percentFee)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-800/50">
                    <p className="text-xs text-gray-400 mb-1">Taxa Fixa (×{stats.approved_count})</p>
                    <p className="text-lg font-bold text-orange-400">-{formatCurrency(mpFees.fixedFee)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-800/50">
                    <p className="text-xs text-gray-400 mb-1">Total Taxas MP</p>
                    <p className="text-lg font-bold text-orange-500">-{formatCurrency(mpFees.totalFees)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <p className="text-xs text-emerald-300 mb-1">💰 Líquido Final</p>
                    <p className="text-lg font-bold text-emerald-400">{formatCurrency(mpFees.netRevenue)}</p>
                  </div>
                </div>
              )
            })()}
          </motion.div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-2 bg-gray-800/30 rounded-xl p-1.5 border border-gray-700/30 w-fit overflow-x-auto">
          {[
            { id: 'overview', label: 'Visão Geral', icon: PieChart },
            { id: 'transactions', label: 'Transações', icon: Receipt },
            { id: 'gateways', label: 'Gateways', icon: Zap },
            { id: 'methods', label: 'Métodos', icon: Wallet },
            { id: 'cascata', label: 'Cascata', icon: Target },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {/* Overview Tab */}
          {activeTab === 'overview' && stats && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
              {/* Gateway Performance */}
              <div className="rounded-2xl bg-gray-800/30 border border-gray-700/30 p-6">
                <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-brand-400" />
                  Performance por Gateway
                </h3>
                <div className="space-y-6">
                  {/* Mercado Pago */}
                  <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-500/20">
                          <CreditCard className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                          <h4 className="font-medium text-white">Mercado Pago</h4>
                          <p className="text-xs text-gray-400">Gateway Principal</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-white">{formatCurrency(stats.mp_revenue)}</p>
                        <p className="text-xs text-gray-400">{stats.mp_approved} vendas</p>
                      </div>
                    </div>
                    <div className="w-full bg-gray-700/30 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-blue-400 h-2 rounded-full"
                        style={{ width: `${stats.total_revenue > 0 ? (stats.mp_revenue / stats.total_revenue) * 100 : 0}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {stats.total_revenue > 0 ? ((stats.mp_revenue / stats.total_revenue) * 100).toFixed(1) : 0}% da receita total
                    </p>
                  </div>

                  {/* AppMax */}
                  <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/10">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-purple-500/20">
                          <Zap className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                          <h4 className="font-medium text-white">AppMax</h4>
                          <p className="text-xs text-gray-400">Gateway de Resgate</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-white">{formatCurrency(stats.appmax_revenue)}</p>
                        <p className="text-xs text-gray-400">{stats.appmax_approved} vendas</p>
                      </div>
                    </div>
                    <div className="w-full bg-gray-700/30 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-purple-500 to-purple-400 h-2 rounded-full"
                        style={{ width: `${stats.total_revenue > 0 ? (stats.appmax_revenue / stats.total_revenue) * 100 : 0}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {stats.total_revenue > 0 ? ((stats.appmax_revenue / stats.total_revenue) * 100).toFixed(1) : 0}% da receita total
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="rounded-2xl bg-gray-800/30 border border-gray-700/30 p-6">
                <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-brand-400" />
                  Métodos de Pagamento
                </h3>
                <div className="space-y-4">
                  {/* PIX */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-gray-700/20 border border-gray-700/30">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">⚡</span>
                      <div>
                        <h4 className="font-medium text-white">PIX</h4>
                        <p className="text-xs text-gray-400">{stats.pix_count} transações</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-emerald-400">{formatCurrency(stats.pix_revenue)}</p>
                    </div>
                  </div>

                  {/* Cartão de Crédito */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-gray-700/20 border border-gray-700/30">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">💳</span>
                      <div>
                        <h4 className="font-medium text-white">Cartão de Crédito</h4>
                        <p className="text-xs text-gray-400">{stats.credit_card_count} transações</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-blue-400">{formatCurrency(stats.credit_card_revenue)}</p>
                    </div>
                  </div>

                  {/* Boleto */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-gray-700/20 border border-gray-700/30">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">📄</span>
                      <div>
                        <h4 className="font-medium text-white">Boleto</h4>
                        <p className="text-xs text-gray-400">{stats.boleto_count} transações</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-amber-400">{formatCurrency(stats.boleto_revenue)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Distribution */}
              <div className="rounded-2xl bg-gray-800/30 border border-gray-700/30 p-6 lg:col-span-2">
                <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-brand-400" />
                  Distribuição de Status
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-white">{stats.approved_count}</p>
                    <p className="text-sm text-gray-400">Aprovados</p>
                    <p className="text-xs text-emerald-400 mt-1">{formatCurrency(stats.approved_revenue)}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                    <Clock className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-white">{stats.pending_count}</p>
                    <p className="text-sm text-gray-400">Pendentes</p>
                    <p className="text-xs text-amber-400 mt-1">{formatCurrency(stats.pending_revenue)}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
                    <XCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-white">{stats.failed_count}</p>
                    <p className="text-sm text-gray-400">Falharam</p>
                  </div>
                  <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-center">
                    <Receipt className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-white">{stats.refunded_count}</p>
                    <p className="text-sm text-gray-400">Reembolsados</p>
                    <p className="text-xs text-purple-400 mt-1">{formatCurrency(stats.refunded_revenue)}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Transactions Tab */}
          {activeTab === 'transactions' && (
            <motion.div
              key="transactions"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-2xl bg-gray-800/30 border border-gray-700/30 overflow-hidden"
            >
              {/* Filters */}
              <div className="p-4 border-b border-gray-700/30 flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Buscar por nome, email ou ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-700/30 border border-gray-600/30 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="w-5 h-5 text-gray-500" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                    className="px-4 py-2.5 rounded-xl bg-gray-700/30 border border-gray-600/30 text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                  >
                    <option value="all">Todos os Status</option>
                    <option value="approved">Aprovados</option>
                    <option value="pending">Pendentes</option>
                    <option value="failed">Falharam</option>
                    <option value="refunded">Reembolsados</option>
                  </select>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-800/50">
                      <th className="text-left py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="text-left py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Cliente</th>
                      <th className="text-left py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Gateway</th>
                      <th className="text-left py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Método</th>
                      <th className="text-left py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Valor</th>
                      <th className="text-left py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Data</th>
                      <th className="text-left py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/30">
                    {filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-gray-500">
                          <Ban className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p>Nenhuma transação encontrada</p>
                        </td>
                      </tr>
                    ) : (
                      filteredTransactions.slice(0, 50).map((transaction) => {
                        const statusConfig = getStatusConfig(transaction.status)
                        const StatusIcon = statusConfig.icon
                        return (
                          <tr 
                            key={transaction.id} 
                            className="hover:bg-gray-700/20 transition-colors group"
                          >
                            <td className="py-4 px-4">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.color} border ${statusConfig.border}`}>
                                <StatusIcon className="w-3.5 h-3.5" />
                                {statusConfig.label}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              <div>
                                <p className="font-medium text-white">{transaction.customer_name}</p>
                                <p className="text-xs text-gray-500">{transaction.customer_email}</p>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              {getGatewayBadge(transaction.payment_gateway, transaction.fallback_used)}
                            </td>
                            <td className="py-4 px-4">
                              <span className="text-lg">{getPaymentMethodIcon(transaction.payment_method)}</span>
                            </td>
                            <td className="py-4 px-4">
                              <span className="font-semibold text-white">{formatCurrency(transaction.total_amount)}</span>
                            </td>
                            <td className="py-4 px-4">
                              <span className="text-sm text-gray-400">{formatDate(transaction.created_at)}</span>
                            </td>
                            <td className="py-4 px-4">
                              <button
                                onClick={() => {
                                  setSelectedTransaction(transaction)
                                  setShowDetails(true)
                                }}
                                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors opacity-0 group-hover:opacity-100"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination info */}
              {filteredTransactions.length > 0 && (
                <div className="p-4 border-t border-gray-700/30 text-sm text-gray-500">
                  Mostrando {Math.min(50, filteredTransactions.length)} de {filteredTransactions.length} transações
                </div>
              )}
            </motion.div>
          )}

          {/* Gateways Tab */}
          {activeTab === 'gateways' && stats && (
            <motion.div
              key="gateways"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              {/* Mercado Pago Card */}
              <div className="rounded-2xl bg-gradient-to-br from-blue-600/20 via-gray-800/50 to-gray-800/50 border border-blue-500/30 p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 rounded-xl bg-blue-500/20">
                    <CreditCard className="w-8 h-8 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Mercado Pago</h3>
                    <p className="text-sm text-gray-400">Gateway Principal</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-4 rounded-xl bg-gray-900/30">
                    <p className="text-sm text-gray-400 mb-1">Transações</p>
                    <p className="text-2xl font-bold text-white">{stats.mp_transactions}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-gray-900/30">
                    <p className="text-sm text-gray-400 mb-1">Aprovadas</p>
                    <p className="text-2xl font-bold text-emerald-400">{stats.mp_approved}</p>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-gray-900/30">
                  <p className="text-sm text-gray-400 mb-1">Receita Total</p>
                  <p className="text-3xl font-bold text-white">{formatCurrency(stats.mp_revenue)}</p>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-700/30">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Taxa de Aprovação</span>
                    <span className="font-bold text-blue-400">
                      {stats.mp_transactions > 0 ? ((stats.mp_approved / stats.mp_transactions) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                </div>
              </div>

              {/* AppMax Card */}
              <div className="rounded-2xl bg-gradient-to-br from-purple-600/20 via-gray-800/50 to-gray-800/50 border border-purple-500/30 p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 rounded-xl bg-purple-500/20">
                    <Zap className="w-8 h-8 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">AppMax</h3>
                    <p className="text-sm text-gray-400">Gateway de Resgate</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-4 rounded-xl bg-gray-900/30">
                    <p className="text-sm text-gray-400 mb-1">Transações</p>
                    <p className="text-2xl font-bold text-white">{stats.appmax_transactions}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-gray-900/30">
                    <p className="text-sm text-gray-400 mb-1">Aprovadas</p>
                    <p className="text-2xl font-bold text-emerald-400">{stats.appmax_approved}</p>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-gray-900/30">
                  <p className="text-sm text-gray-400 mb-1">Receita Resgatada</p>
                  <p className="text-3xl font-bold text-white">{formatCurrency(stats.appmax_revenue)}</p>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-700/30">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Taxa de Aprovação</span>
                    <span className="font-bold text-purple-400">
                      {stats.appmax_transactions > 0 ? ((stats.appmax_approved / stats.appmax_transactions) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Comparativo */}
              <div className="rounded-2xl bg-gray-800/30 border border-gray-700/30 p-6 md:col-span-2">
                <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-brand-400" />
                  Comparativo de Gateways
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-400">Mercado Pago</span>
                      <span className="text-sm font-medium text-white">
                        {formatCurrency(stats.mp_revenue)} ({stats.mp_approved} vendas)
                      </span>
                    </div>
                    <div className="h-4 bg-gray-700/30 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full"
                        style={{ width: `${stats.total_revenue > 0 ? (stats.mp_revenue / stats.total_revenue) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-400">AppMax</span>
                      <span className="text-sm font-medium text-white">
                        {formatCurrency(stats.appmax_revenue)} ({stats.appmax_approved} vendas)
                      </span>
                    </div>
                    <div className="h-4 bg-gray-700/30 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full"
                        style={{ width: `${stats.total_revenue > 0 ? (stats.appmax_revenue / stats.total_revenue) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Methods Tab */}
          {activeTab === 'methods' && stats && (
            <motion.div
              key="methods"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              {/* PIX */}
              <div className="rounded-2xl bg-gradient-to-br from-emerald-600/20 via-gray-800/50 to-gray-800/50 border border-emerald-500/30 p-6">
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-4xl">⚡</span>
                  <div>
                    <h3 className="text-xl font-bold text-white">PIX</h3>
                    <p className="text-sm text-gray-400">Pagamento Instantâneo</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-gray-900/30">
                    <p className="text-sm text-gray-400 mb-1">Transações</p>
                    <p className="text-3xl font-bold text-white">{stats.pix_count}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-gray-900/30">
                    <p className="text-sm text-gray-400 mb-1">Receita</p>
                    <p className="text-2xl font-bold text-emerald-400">{formatCurrency(stats.pix_revenue)}</p>
                  </div>
                </div>
              </div>

              {/* Credit Card */}
              <div className="rounded-2xl bg-gradient-to-br from-blue-600/20 via-gray-800/50 to-gray-800/50 border border-blue-500/30 p-6">
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-4xl">💳</span>
                  <div>
                    <h3 className="text-xl font-bold text-white">Cartão de Crédito</h3>
                    <p className="text-sm text-gray-400">Parcelamento</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-gray-900/30">
                    <p className="text-sm text-gray-400 mb-1">Transações</p>
                    <p className="text-3xl font-bold text-white">{stats.credit_card_count}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-gray-900/30">
                    <p className="text-sm text-gray-400 mb-1">Receita</p>
                    <p className="text-2xl font-bold text-blue-400">{formatCurrency(stats.credit_card_revenue)}</p>
                  </div>
                </div>
              </div>

              {/* Boleto */}
              <div className="rounded-2xl bg-gradient-to-br from-amber-600/20 via-gray-800/50 to-gray-800/50 border border-amber-500/30 p-6">
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-4xl">📄</span>
                  <div>
                    <h3 className="text-xl font-bold text-white">Boleto</h3>
                    <p className="text-sm text-gray-400">Pagamento à Vista</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-gray-900/30">
                    <p className="text-sm text-gray-400 mb-1">Transações</p>
                    <p className="text-3xl font-bold text-white">{stats.boleto_count}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-gray-900/30">
                    <p className="text-sm text-gray-400 mb-1">Receita</p>
                    <p className="text-2xl font-bold text-amber-400">{formatCurrency(stats.boleto_revenue)}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Cascata Tab */}
          {activeTab === 'cascata' && stats && (
            <motion.div
              key="cascata"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Header Explicativo */}
              <div className="rounded-2xl bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-purple-600/20 border border-purple-500/30 p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 shadow-lg">
                    <Target className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">Sistema de Cascata de Pagamentos</h3>
                    <p className="text-gray-300">
                      Quando o <span className="text-blue-400 font-semibold">Mercado Pago</span> recusa um pagamento, 
                      automaticamente tentamos recuperar a venda pelo <span className="text-purple-400 font-semibold">AppMax</span>. 
                      Isso maximiza suas conversões e evita perda de receita.
                    </p>
                  </div>
                </div>
              </div>

              {/* Métricas de Cascata */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Vendas Resgatadas */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-600/20 via-gray-800/50 to-gray-800/50 border border-green-500/30 p-6">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/10 rounded-full blur-2xl -mr-12 -mt-12" />
                  <div className="relative">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-gray-400 text-sm font-medium">Vendas Resgatadas</span>
                      <div className="p-2 rounded-lg bg-green-500/20">
                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                      </div>
                    </div>
                    <div className="text-4xl font-bold text-white mb-1">{stats.rescued_sales}</div>
                    <p className="text-sm text-green-400">
                      💪 Recuperadas via AppMax
                    </p>
                  </div>
                </div>

                {/* Receita Resgatada */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600/20 via-gray-800/50 to-gray-800/50 border border-emerald-500/30 p-6">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl -mr-12 -mt-12" />
                  <div className="relative">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-gray-400 text-sm font-medium">Receita Resgatada</span>
                      <div className="p-2 rounded-lg bg-emerald-500/20">
                        <DollarSign className="w-5 h-5 text-emerald-400" />
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">{formatCurrency(stats.rescued_revenue)}</div>
                    <p className="text-sm text-emerald-400">
                      💰 Dinheiro salvo!
                    </p>
                  </div>
                </div>

                {/* Taxa de Resgate */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600/20 via-gray-800/50 to-gray-800/50 border border-purple-500/30 p-6">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl -mr-12 -mt-12" />
                  <div className="relative">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-gray-400 text-sm font-medium">Taxa de Resgate</span>
                      <div className="p-2 rounded-lg bg-purple-500/20">
                        <TrendingUp className="w-5 h-5 text-purple-400" />
                      </div>
                    </div>
                    <div className="text-4xl font-bold text-white mb-1">{stats.rescue_rate.toFixed(1)}%</div>
                    <p className="text-sm text-purple-400">
                      Das falhas MP recuperadas
                    </p>
                  </div>
                </div>

                {/* Taxa de Rejeição MP */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-600/20 via-gray-800/50 to-gray-800/50 border border-red-500/30 p-6">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-full blur-2xl -mr-12 -mt-12" />
                  <div className="relative">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-gray-400 text-sm font-medium">Rejeição MP</span>
                      <div className="p-2 rounded-lg bg-red-500/20">
                        <XCircle className="w-5 h-5 text-red-400" />
                      </div>
                    </div>
                    <div className="text-4xl font-bold text-white mb-1">{stats.mp_rejection_rate.toFixed(1)}%</div>
                    <p className="text-sm text-red-400">
                      {stats.mp_failed} rejeitadas no MP
                    </p>
                  </div>
                </div>
              </div>

              {/* Fluxo Visual da Cascata */}
              <div className="rounded-2xl bg-gray-800/30 border border-gray-700/30 p-6">
                <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-brand-400" />
                  Fluxo da Cascata
                </h3>
                
                <div className="space-y-4">
                  {/* Step 1: Mercado Pago */}
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-40 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <CreditCard className="w-5 h-5 text-blue-400" />
                        <span className="text-sm font-semibold text-white">Mercado Pago</span>
                      </div>
                      <p className="text-xs text-gray-500">Gateway Principal</p>
                    </div>
                    <div className="flex-1">
                      <div className="relative h-10 bg-gray-700/30 rounded-lg overflow-hidden">
                        <div 
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-600 to-blue-500 flex items-center px-3"
                          style={{ width: `${stats.mp_transactions > 0 ? (stats.mp_approved / stats.mp_transactions) * 100 : 0}%`, minWidth: 'fit-content' }}
                        >
                          <span className="text-xs font-bold text-white whitespace-nowrap">
                            {stats.mp_approved} aprovados
                          </span>
                        </div>
                        {stats.mp_failed > 0 && (
                          <div 
                            className="absolute inset-y-0 bg-gradient-to-r from-red-600 to-red-500 flex items-center px-3"
                            style={{ 
                              left: `${stats.mp_transactions > 0 ? (stats.mp_approved / stats.mp_transactions) * 100 : 0}%`,
                              width: `${stats.mp_transactions > 0 ? (stats.mp_failed / stats.mp_transactions) * 100 : 0}%`,
                              minWidth: 'fit-content'
                            }}
                          >
                            <span className="text-xs font-bold text-white whitespace-nowrap">
                              {stats.mp_failed} falhas
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0 w-28 text-right">
                      <span className="text-sm font-bold text-blue-400">
                        {formatCurrency(stats.mp_revenue)}
                      </span>
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-40" />
                    <div className="flex-1 flex items-center justify-center">
                      <div className="flex flex-col items-center">
                        <div className="w-0.5 h-4 bg-gradient-to-b from-red-500 to-purple-500" />
                        <ArrowDownRight className="w-6 h-6 text-purple-400" />
                        <p className="text-xs text-gray-400 mt-1">Falhas → Tentativa AppMax</p>
                      </div>
                    </div>
                    <div className="flex-shrink-0 w-28" />
                  </div>

                  {/* Step 2: AppMax Resgate */}
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-40 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Zap className="w-5 h-5 text-purple-400" />
                        <span className="text-sm font-semibold text-white">AppMax</span>
                      </div>
                      <p className="text-xs text-gray-500">Gateway de Resgate</p>
                    </div>
                    <div className="flex-1">
                      <div className="relative h-10 bg-gray-700/30 rounded-lg overflow-hidden">
                        <div 
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-600 to-purple-500 flex items-center px-3"
                          style={{ width: `${stats.rescued_sales > 0 ? 100 : 0}%`, minWidth: 'fit-content' }}
                        >
                          <span className="text-xs font-bold text-white whitespace-nowrap">
                            {stats.rescued_sales} vendas resgatadas
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex-shrink-0 w-28 text-right">
                      <span className="text-sm font-bold text-purple-400">
                        {formatCurrency(stats.rescued_revenue)}
                      </span>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t-2 border-dashed border-gray-700 my-4" />

                  {/* Total Final */}
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20">
                    <div className="flex-shrink-0 w-40 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                        <span className="text-sm font-bold text-white">TOTAL APROVADO</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="relative h-10 bg-gray-700/30 rounded-lg overflow-hidden">
                        <div 
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-600 to-emerald-500 flex items-center px-3"
                          style={{ width: '100%' }}
                        >
                          <span className="text-sm font-bold text-white whitespace-nowrap">
                            {stats.approved_count} vendas totais
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex-shrink-0 w-28 text-right">
                      <span className="text-lg font-bold text-green-400">
                        {formatCurrency(stats.total_revenue)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Insights */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Card de Impacto */}
                <div className="rounded-2xl bg-gradient-to-br from-yellow-600/10 via-orange-600/10 to-orange-600/10 border border-orange-500/30 p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-orange-500/20">
                      <AlertTriangle className="w-6 h-6 text-orange-400" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white mb-3">💡 Impacto da Cascata</h4>
                      <ul className="space-y-2 text-sm text-gray-300">
                        <li className="flex items-start gap-2">
                          <span className="text-green-400 mt-0.5">✓</span>
                          <span>
                            <strong className="text-white">{stats.rescued_sales} vendas</strong> seriam perdidas sem a cascata
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-400 mt-0.5">✓</span>
                          <span>
                            <strong className="text-white">{formatCurrency(stats.potential_lost_without_cascata)}</strong> em receita protegida
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-400 mt-0.5">✓</span>
                          <span>
                            Taxa de resgate de <strong className="text-white">{stats.rescue_rate.toFixed(1)}%</strong> das falhas MP
                          </span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Card de Performance */}
                <div className="rounded-2xl bg-gradient-to-br from-blue-600/10 via-purple-600/10 to-purple-600/10 border border-blue-500/30 p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-blue-500/20">
                      <BarChart3 className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white mb-3">📊 Performance dos Gateways</h4>
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-400">Mercado Pago</span>
                            <span className="text-blue-400 font-medium">
                              {stats.mp_transactions > 0 ? ((stats.mp_approved / stats.mp_transactions) * 100).toFixed(1) : 0}% aprovação
                            </span>
                          </div>
                          <div className="h-2 bg-gray-700/30 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${stats.mp_transactions > 0 ? (stats.mp_approved / stats.mp_transactions) * 100 : 0}%` }}
                            />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-400">AppMax (Resgate)</span>
                            <span className="text-purple-400 font-medium">
                              {stats.appmax_transactions > 0 ? ((stats.appmax_approved / stats.appmax_transactions) * 100).toFixed(1) : 0}% aprovação
                            </span>
                          </div>
                          <div className="h-2 bg-gray-700/30 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-purple-500 rounded-full"
                              style={{ width: `${stats.appmax_transactions > 0 ? (stats.appmax_approved / stats.appmax_transactions) * 100 : 0}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lista de Vendas Resgatadas */}
              <div className="rounded-2xl bg-gray-800/30 border border-gray-700/30 overflow-hidden">
                <div className="p-4 border-b border-gray-700/30">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Zap className="w-5 h-5 text-purple-400" />
                    Últimas Vendas Resgatadas
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-800/50">
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase">Status</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase">Cliente</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase">Valor</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase">Data</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700/30">
                      {transactions.filter(t => t.fallback_used).length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-gray-500">
                            <Zap className="w-10 h-10 mx-auto mb-2 opacity-50" />
                            <p>Nenhuma venda resgatada no período</p>
                          </td>
                        </tr>
                      ) : (
                        transactions
                          .filter(t => t.fallback_used)
                          .slice(0, 10)
                          .map((transaction) => {
                            const statusConfig = getStatusConfig(transaction.status)
                            const StatusIcon = statusConfig.icon
                            return (
                              <tr key={transaction.id} className="hover:bg-gray-700/20">
                                <td className="py-3 px-4">
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.color} border ${statusConfig.border}`}>
                                    <StatusIcon className="w-3.5 h-3.5" />
                                    {statusConfig.label}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  <p className="font-medium text-white">{transaction.customer_name}</p>
                                  <p className="text-xs text-gray-500">{transaction.customer_email}</p>
                                </td>
                                <td className="py-3 px-4">
                                  <span className="font-semibold text-purple-400">{formatCurrency(transaction.total_amount)}</span>
                                </td>
                                <td className="py-3 px-4">
                                  <span className="text-sm text-gray-400">{formatDate(transaction.created_at)}</span>
                                </td>
                              </tr>
                            )
                          })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Transaction Details Modal */}
        <AnimatePresence>
          {showDetails && selectedTransaction && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowDetails(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-gray-800 rounded-2xl border border-gray-700 w-full max-w-lg overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6 border-b border-gray-700">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">Detalhes da Transação</h3>
                    <button
                      onClick={() => setShowDetails(false)}
                      className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">ID</p>
                      <p className="text-sm font-mono text-gray-300">{selectedTransaction.id.slice(0, 8)}...</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Order ID</p>
                      <p className="text-sm font-mono text-gray-300">{selectedTransaction.appmax_order_id}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Cliente</p>
                    <p className="font-medium text-white">{selectedTransaction.customer_name}</p>
                    <p className="text-sm text-gray-400">{selectedTransaction.customer_email}</p>
                    {selectedTransaction.customer_phone && (
                      <p className="text-sm text-gray-400">{selectedTransaction.customer_phone}</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Valor</p>
                      <p className="text-xl font-bold text-white">{formatCurrency(selectedTransaction.total_amount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Status</p>
                      {(() => {
                        const config = getStatusConfig(selectedTransaction.status)
                        const Icon = config.icon
                        return (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color} border ${config.border}`}>
                            <Icon className="w-3.5 h-3.5" />
                            {config.label}
                          </span>
                        )
                      })()}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Gateway</p>
                      {getGatewayBadge(selectedTransaction.payment_gateway, selectedTransaction.fallback_used)}
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Método</p>
                      <p className="text-lg">{getPaymentMethodIcon(selectedTransaction.payment_method)} {selectedTransaction.payment_method}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Criado em</p>
                      <p className="text-sm text-gray-300">{formatDate(selectedTransaction.created_at)}</p>
                    </div>
                    {selectedTransaction.paid_at && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Pago em</p>
                        <p className="text-sm text-gray-300">{formatDate(selectedTransaction.paid_at)}</p>
                      </div>
                    )}
                  </div>
                  {selectedTransaction.failure_reason && (
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                      <p className="text-xs text-red-400 mb-1">Motivo da Falha</p>
                      <p className="text-sm text-red-300">{selectedTransaction.failure_reason}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
