'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { formatBRDateTime, getUTCDayRange } from '@/lib/date-utils'
import { formatCpfCnpj, formatPhone } from '@/lib/display-helpers'
import { refundOrder } from '@/actions/refund-order'
import { SyncAppmaxButton } from '@/components/dashboard/SyncAppmaxButton'
import { SyncMercadoPagoButton } from '@/components/dashboard/SyncMercadoPagoButton'
import { ContactButtons, WhatsAppIcon, EmailIcon } from '@/components/ContactButtons'
import Image from 'next/image'
import {
  Search,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Copy,
  Mail,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  X,
  Trash2,
  Play,
  Loader2
} from 'lucide-react'

interface Sale {
  id: string
  appmax_order_id: string
  sale_id?: string | null
  customer_name: string
  customer_email: string
  customer_phone?: string
  customer_cpf?: string
  total_amount: number
  status: string
  failure_reason?: string
  payment_method: string
  payment_gateway?: string
  created_at: string
  updated_at?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  source?: 'sale' | 'attempt'
  coupon_code?: string | null
  coupon_discount?: number
}

type StatusFilter = 'all' | 'paid' | 'pending' | 'fraud_analysis' | 'failed' | 'refunded'

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [filteredSales, setFilteredSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [processingWorker, setProcessingWorker] = useState(false)
  const [workerResult, setWorkerResult] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [showDrawer, setShowDrawer] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 20
  const searchParams = useSearchParams()
  
  // Filtros de período (igual à Visão Geral)
  const [filterType, setFilterType] = useState<'quick' | 'custom'>('quick')
  const [quickDays, setQuickDays] = useState(30) // Últimos 30 dias como padrão
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])

  // Calcula as datas baseado no filtro rápido
  const getDateRange = () => {
    if (filterType === 'custom') {
      return { start: startDate, end: endDate }
    }
    
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    
    if (quickDays === 0) {
      // Hoje
      return { start: todayStr, end: todayStr }
    } else if (quickDays === 1) {
      // Ontem
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]
      return { start: yesterdayStr, end: yesterdayStr }
    } else {
      // Últimos N dias
      const startDay = new Date(today)
      startDay.setDate(startDay.getDate() - quickDays)
      return { start: startDay.toISOString().split('T')[0], end: todayStr }
    }
  }

  useEffect(() => {
    loadSales()
  }, [filterType, quickDays, startDate, endDate])

  useEffect(() => {
    applyFilters()
  }, [sales, searchTerm, statusFilter])

  useEffect(() => {
    const statusParam = searchParams.get('status')
    if (!statusParam) return
    const normalized = statusParam.toLowerCase()
    if (['all', 'paid', 'pending', 'failed', 'refunded'].includes(normalized)) {
      setStatusFilter(normalized as StatusFilter)
    }
  }, [searchParams])

  const loadSales = async () => {
    try {
      setLoading(true)
      const { start, end } = getDateRange()
      const { start: startUTC, end: endUTC } = getUTCDayRange(new Date(end))
      const { start: rangeStartUTC } = getUTCDayRange(new Date(start))

      const params = new URLSearchParams({
        start: rangeStartUTC,
        end: endUTC
      })

      const response = await fetch(`/api/admin/sales?${params.toString()}`, {
        credentials: 'include'
      })

      if (!response.ok) {
        console.error('Erro ao carregar vendas:', response.status)
        setSales([])
        return
      }

      const result = await response.json()
      setSales(result.sales || [])
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...sales]
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(sale =>
        sale.customer_name?.toLowerCase().includes(term) ||
        sale.customer_email?.toLowerCase().includes(term) ||
        sale.appmax_order_id?.toLowerCase().includes(term) ||
        sale.id.toLowerCase().includes(term)
      )
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(sale => {
        switch (statusFilter) {
          case 'paid':
            return ['paid', 'approved', 'active', 'authorized'].includes(sale.status)
          case 'pending':
            return ['pending', 'processing', 'provisioning'].includes(sale.status)
          case 'fraud_analysis':
            return sale.status === 'fraud_analysis'
          case 'failed':
            return ['canceled', 'cancelado', 'cancelled', 'refused', 'rejected', 'failed', 'denied', 'expired', 'chargeback', 'provisioning_failed'].includes(sale.status)
          case 'refunded':
            return ['refunded', 'reversed'].includes(sale.status)
          default:
            return true
        }
      })
    }
    
    setFilteredSales(filtered)
    setCurrentPage(1)
  }

  const getStatusConfig = (status: string, failureReason?: string) => {
    const normalizedStatus = status.toLowerCase()

    if (normalizedStatus === 'fraud_analysis') {
      return {
        label: 'Análise Antifraude',
        className: 'bg-orange-500/20 text-orange-400 border-orange-500/30 font-semibold',
        icon: AlertTriangle
      }
    }

    if (normalizedStatus === 'expired') {
      return {
        label: failureReason || 'Expirado',
        className: 'bg-gray-600/30 text-gray-200 border-gray-500/60 font-semibold',
        icon: Clock
      }
    }

    // ⚠️ IMPORTANTE: NÃO incluir 'expired' aqui! Já tratado acima com etiqueta cinza
    if (['canceled', 'cancelado', 'cancelled', 'refused', 'rejected', 'failed', 'denied', 'chargeback', 'provisioning_failed'].includes(normalizedStatus)) {
      return {
        label: failureReason || 'Cancelado',
        className: 'bg-red-500 text-white border-red-600 font-semibold',
        icon: XCircle
      }
    }
    
    if (['refunded', 'reversed'].includes(normalizedStatus)) {
      return {
        label: 'Estornado',
        className: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
        icon: AlertTriangle
      }
    }
    
    if (['paid', 'approved', 'active', 'authorized'].includes(normalizedStatus)) {
      return {
        label: 'Pago',
        className: 'bg-green-500/20 text-green-400 border-green-500/30',
        icon: CheckCircle2
      }
    }
    
    if (['provisioning'].includes(normalizedStatus)) {
      return {
        label: 'Provisionando',
        className: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        icon: Clock
      }
    }
    
    return {
      label: 'Pendente',
      className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      icon: Clock
    }
  }

  const getPaymentMethodIcon = (method: string) => {
    switch (method?.toLowerCase()) {
      case 'pix': return '💠'
      case 'boleto': return '📄'
      case 'credit_card':
      case 'creditcard':
      case 'cartao':
      case 'credit':
      case 'debit_card':
      case 'debito':
      case 'card':
        return '💳'
      default: return '💳' // Cartão como padrão
    }
  }

  const getGatewayBadge = (gateway?: string) => {
    if (!gateway) return null
    
    switch (gateway.toLowerCase()) {
      case 'mercadopago':
        return (
          <>
            {/* Versão notebook - ícone pequeno com fundo branco */}
            <span className="lg:hidden inline-flex items-center justify-center w-8 h-8 rounded-full bg-white">
              <Image 
                src="/mercado-pago-icon.png" 
                alt="MP" 
                width={24} 
                height={24}
                className="object-contain"
              />
            </span>
            {/* Versão desktop - logo completa */}
            <span className="hidden lg:inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <Image 
                src="/logo-mercadopago-blanco.png" 
                alt="Mercado Pago" 
                width={80} 
                height={28}
                className="object-contain brightness-0 invert"
              />
            </span>
          </>
        )
      case 'appmax':
        return (
          <>
            {/* Versão notebook - ícone pequeno */}
            <span className="lg:hidden inline-flex items-center justify-center w-8 h-8 rounded-lg overflow-hidden">
              <Image 
                src="/appmax-icon.avif" 
                alt="AX" 
                width={32} 
                height={32}
                className="object-cover"
              />
            </span>
            {/* Versão desktop - logo completa */}
            <span className="hidden lg:inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <Image 
                src="/appmax-logo.png" 
                alt="Appmax" 
                width={80} 
                height={28}
                className="object-contain brightness-0 invert"
              />
            </span>
          </>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 lg:px-3 lg:py-1.5 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400 border border-gray-500/30">
            {gateway}
          </span>
        )
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    console.log(`${label} copiado: ${text}`)
  }

  const handleDelete = async (saleId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta venda do dashboard?\n\nEla permanecerá no banco de dados mas não aparecerá mais na listagem.')) {
      return
    }

    setDeleting(saleId)
    try {
      const response = await fetch('/api/admin/soft-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'sales', id: saleId })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao excluir venda')
      }

      setSales(prev => prev.filter(s => s.id !== saleId))
      setShowDrawer(false)
      alert('Venda excluída do dashboard com sucesso!')
    } catch (error: any) {
      console.error('Erro ao excluir:', error)
      alert(`Erro ao excluir venda: ${error.message}`)
    } finally {
      setDeleting(null)
    }
  }

  const handleRefund = async (sale: Sale) => {
    const saleId = sale.sale_id || (sale.source === 'sale' ? sale.id : null)
    if (!saleId) {
      alert('Este pedido nao possui venda confirmada para estorno.')
      return
    }

    if (!confirm(`Estornar R$ ${sale.total_amount.toFixed(2)}?\n\nIRREVERSÍVEL.`)) return
    const result = await refundOrder(saleId, sale.appmax_order_id)
    if (result.success) {
      alert(result.message)
      loadSales()
      setShowDrawer(false)
    } else {
      alert(`Erro: ${result.message}`)
    }
  }

  // 🔧 PROCESSAMENTO MANUAL: Executa o worker de provisionamento
  const handleRunWorker = async () => {
    setProcessingWorker(true)
    setWorkerResult(null)
    
    try {
      const response = await fetch('/api/system/run-worker')
      const data = await response.json()
      
      setWorkerResult(data)
      
      if (data.success) {
        const { processed, stages } = data.worker_results || {}
        if (processed > 0) {
          alert(`✅ Worker executado!\n\n📊 Processados: ${processed}\n👤 Usuários criados: ${stages?.users_created || 0}\n📧 Emails enviados: ${stages?.emails_sent || 0}`)
        } else {
          alert('ℹ️ Worker executado, mas nenhum item pendente na fila.')
        }
        // Recarregar vendas para atualizar status
        loadSales()
      } else {
        alert(`❌ Erro ao executar worker: ${data.error || 'Erro desconhecido'}`)
      }
    } catch (error: any) {
      console.error('Erro ao executar worker:', error)
      alert(`❌ Erro: ${error.message}`)
    } finally {
      setProcessingWorker(false)
    }
  }

  const totalPages = Math.ceil(filteredSales.length / pageSize)
  const paginatedSales = filteredSales.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const counts = {
    all: sales.length,
    paid: sales.filter(s => ['paid', 'approved'].includes(s.status)).length,
    pending: sales.filter(s => ['pending', 'processing'].includes(s.status)).length,
    fraud_analysis: sales.filter(s => s.status === 'fraud_analysis').length,
    failed: sales.filter(s => ['canceled', 'cancelado', 'cancelled', 'refused', 'rejected', 'failed', 'denied', 'expired', 'chargeback'].includes(s.status)).length,
    refunded: sales.filter(s => ['refunded', 'reversed'].includes(s.status)).length,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Vendas</h1>
        <p className="text-gray-400">Central operacional</p>
      </div>

      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-4">
        <div className="flex flex-col gap-4">
          {/* Filtros de Período Rápido */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { setFilterType('quick'); setQuickDays(0); }}
              className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
                filterType === 'quick' && quickDays === 0
                  ? 'bg-green-500 text-white shadow-lg'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Hoje
            </button>
            <button
              onClick={() => { setFilterType('quick'); setQuickDays(1); }}
              className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
                filterType === 'quick' && quickDays === 1
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Ontem
            </button>
            {[7, 15, 30, 60, 90].map((days) => (
              <button
                key={days}
                onClick={() => { setFilterType('quick'); setQuickDays(days); }}
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

          {/* Busca, Datas Personalizadas e Ações */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-900/50 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="flex gap-2">
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => { setFilterType('custom'); setStartDate(e.target.value); }} 
                className="px-3 py-2 bg-gray-900/50 border border-gray-700 text-white rounded-lg" 
              />
              <span className="self-center text-gray-500">até</span>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => { setFilterType('custom'); setEndDate(e.target.value); }} 
                className="px-3 py-2 bg-gray-900/50 border border-gray-700 text-white rounded-lg" 
              />
            </div>

            <SyncMercadoPagoButton />
            <SyncAppmaxButton />

            {/* 🔧 Botão de Processamento Manual */}
            <button 
              onClick={handleRunWorker} 
              disabled={processingWorker}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
              title="Processar fila de provisionamento (criar usuários + enviar emails)"
            >
              {processingWorker ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              <span className="hidden lg:inline">Processar Fila</span>
            </button>

            <button onClick={loadSales} disabled={loading} className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 flex items-center gap-2">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>
        </div>
      </div>

      {/* Indicador de resultado do Worker */}
      <AnimatePresence>
        {workerResult && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-xl border ${
              workerResult.success 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {workerResult.success ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <XCircle className="w-5 h-5" />
                )}
                <div>
                  <p className="font-medium">
                    {workerResult.success ? 'Worker executado com sucesso' : 'Erro ao executar worker'}
                  </p>
                  {workerResult.worker_results && (
                    <p className="text-sm opacity-80">
                      Processados: {workerResult.worker_results.processed} | 
                      Usuários: {workerResult.worker_results.stages?.users_created || 0} | 
                      Emails: {workerResult.worker_results.stages?.emails_sent || 0}
                    </p>
                  )}
                </div>
              </div>
              <button 
                onClick={() => setWorkerResult(null)}
                className="p-1 hover:bg-white/10 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { key: 'all', label: 'Todas' },
          { key: 'paid', label: 'Pagas' },
          { key: 'pending', label: 'Pendentes' },
          { key: 'fraud_analysis', label: '🛡️ Análise Antifraude' },
          { key: 'failed', label: 'Recusadas' },
          { key: 'refunded', label: 'Estornadas' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key as StatusFilter)}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${
              statusFilter === key ? 'bg-brand-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700'
            }`}
          >
            {label} ({counts[key as keyof typeof counts]})
          </button>
        ))}
      </div>

      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[1,2,3,4,5].map((i) => <div key={i} className="h-16 bg-gray-700/30 rounded-lg animate-pulse"></div>)}
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium text-gray-400">Nenhuma venda encontrada</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead className="bg-gray-900/50 border-b border-gray-700">
                <tr>
                  <th className="px-2 lg:px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase whitespace-nowrap">Status</th>
                  <th className="px-2 lg:px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase whitespace-nowrap">Cliente</th>
                  <th className="px-2 lg:px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase whitespace-nowrap hidden md:table-cell">Telefone</th>
                  <th className="px-2 lg:px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase whitespace-nowrap hidden lg:table-cell">CPF/CNPJ</th>
                  <th className="px-2 lg:px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase whitespace-nowrap">Valor</th>
                  <th className="px-2 lg:px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase whitespace-nowrap hidden lg:table-cell">Cupom</th>
                  <th className="px-2 lg:px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase whitespace-nowrap">Método</th>
                  <th className="px-2 lg:px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase whitespace-nowrap">Gateway</th>
                  <th className="px-2 lg:px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase whitespace-nowrap">Data</th>
                  <th className="px-2 lg:px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase whitespace-nowrap hidden xl:table-cell">Origem</th>
                  <th className="px-2 lg:px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase whitespace-nowrap">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {paginatedSales.map((sale) => {
                  const statusConfig = getStatusConfig(sale.status, sale.failure_reason)
                  const StatusIcon = statusConfig.icon
                  
                  return (
                    <motion.tr
                      key={sale.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-gray-700/30 cursor-pointer group"
                      onClick={() => { setSelectedSale(sale); setShowDrawer(true) }}
                    >
                      <td className="px-2 lg:px-4 py-2 lg:py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 lg:gap-1.5 px-2 lg:px-3 py-1 rounded-full text-xs border ${statusConfig.className}`}>
                          <StatusIcon className="w-3 h-3" />
                          <span className="hidden sm:inline">{statusConfig.label}</span>
                        </span>
                      </td>
                      <td className="px-2 lg:px-4 py-2 lg:py-4">
                        <div className="font-medium text-white text-sm truncate max-w-[120px] lg:max-w-[200px]">{sale.customer_name}</div>
                        <div className="text-xs text-gray-400 truncate max-w-[120px] lg:max-w-[200px]">{sale.customer_email}</div>
                      </td>
                      <td className="px-2 lg:px-4 py-2 lg:py-4 whitespace-nowrap hidden md:table-cell">
                        <div className="text-xs text-gray-300 font-mono">{formatPhone(sale.customer_phone)}</div>
                      </td>
                      <td className="px-2 lg:px-4 py-2 lg:py-4 whitespace-nowrap hidden lg:table-cell">
                        <div className="text-xs text-gray-300 font-mono">{formatCpfCnpj(sale.customer_cpf)}</div>
                      </td>
                      <td className="px-2 lg:px-4 py-2 lg:py-4 whitespace-nowrap">
                        <div className="font-bold text-white text-sm">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sale.total_amount)}
                        </div>
                      </td>
                      <td className="px-2 lg:px-4 py-2 lg:py-4 whitespace-nowrap hidden lg:table-cell">
                        {sale.coupon_code ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-mono font-semibold bg-green-500/20 text-green-400 border border-green-500/30">
                            🎟️ {sale.coupon_code}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-500">—</span>
                        )}
                      </td>
                      <td className="px-2 lg:px-4 py-2 lg:py-4 whitespace-nowrap text-lg lg:text-2xl">{getPaymentMethodIcon(sale.payment_method)}</td>
                      <td className="px-2 lg:px-4 py-2 lg:py-4 whitespace-nowrap">
                        {getGatewayBadge(sale.payment_gateway)}
                      </td>
                      <td className="px-2 lg:px-4 py-2 lg:py-4 whitespace-nowrap text-xs text-gray-400">
                        <div className="font-medium text-gray-300">{formatBRDateTime(sale.created_at)}</div>
                      </td>
                      <td className="px-2 lg:px-4 py-2 lg:py-4 whitespace-nowrap hidden xl:table-cell">
                        {sale.utm_source ? (
                          <span className="text-xs bg-blue-900/30 text-blue-400 px-2 py-1 rounded border border-blue-700/50">{sale.utm_source}</span>
                        ) : (
                          <span className="text-xs text-gray-500">Direto</span>
                        )}
                      </td>
                      <td className="px-2 lg:px-4 py-2 lg:py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={(e) => { e.stopPropagation(); copyToClipboard(sale.id, 'ID') }} className="p-1 hover:bg-gray-600 rounded">
                            <Copy className="w-3.5 h-3.5 text-gray-400" />
                          </button>
                          <div onClick={(e) => e.stopPropagation()}>
                            {sale.customer_phone && (
                              <WhatsAppIcon 
                                phone={sale.customer_phone}
                                context="support"
                                customerName={sale.customer_name}
                              />
                            )}
                          </div>
                          <div onClick={(e) => e.stopPropagation()}>
                            <EmailIcon
                              email={sale.customer_email}
                              context="support"
                              customerName={sale.customer_name}
                              extraData={{
                                orderId: sale.appmax_order_id,
                                saleId: sale.id
                              }}
                            />
                          </div>
                        </div>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
            </div>

            {totalPages > 1 && (
              <div className="px-6 py-4 bg-gray-900/50 border-t border-gray-700 flex items-center justify-between">
                <div className="text-sm text-gray-400">
                  Mostrando {(currentPage - 1) * pageSize + 1} a {Math.min(currentPage * pageSize, filteredSales.length)} de {filteredSales.length}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 border border-gray-700 text-gray-300 rounded-md hover:bg-gray-700/50 disabled:opacity-50">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="px-4 py-1 text-sm font-medium text-gray-300">Página {currentPage} de {totalPages}</span>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 border border-gray-700 text-gray-300 rounded-md hover:bg-gray-700/50 disabled:opacity-50">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <AnimatePresence>
        {showDrawer && selectedSale && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowDrawer(false)} className="fixed inset-0 bg-black/70 z-40" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25 }} className="fixed right-0 top-0 bottom-0 w-full md:w-[600px] bg-gray-800 shadow-2xl z-50 overflow-y-auto border-l border-gray-700">
              <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-6 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">Detalhes</h2>
                  <p className="text-sm text-gray-400">ID: {selectedSale.id.slice(0, 8)}...</p>
                </div>
                <button onClick={() => setShowDrawer(false)} className="p-2 hover:bg-gray-700 rounded-lg">
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div className="bg-gradient-to-r from-brand-900/20 to-purple-900/20 rounded-xl p-6 border border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    {(() => {
                      const statusConfig = getStatusConfig(selectedSale.status, selectedSale.failure_reason)
                      const StatusIcon = statusConfig.icon
                      return (
                        <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm border ${statusConfig.className}`}>
                          <StatusIcon className="w-4 h-4" />
                          {statusConfig.label}
                        </span>
                      )
                    })()}
                    <span className="text-3xl font-bold text-white">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedSale.total_amount)}
                    </span>
                  </div>
                  {selectedSale.failure_reason && (
                    <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-3">
                      <p className="text-sm font-medium text-red-400">Motivo: {selectedSale.failure_reason}</p>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Cliente</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-400 w-24">Nome:</span>
                      <span className="text-sm font-medium text-white">{selectedSale.customer_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-400 w-24">Email:</span>
                      <span className="text-sm font-medium text-white">{selectedSale.customer_email}</span>
                      <button onClick={() => copyToClipboard(selectedSale.customer_email, 'Email')} className="p-1 hover:bg-gray-700 rounded">
                        <Copy className="w-3.5 h-3.5 text-gray-400" />
                      </button>
                    </div>
                    {selectedSale.customer_phone && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-400 w-24">Telefone:</span>
                        <span className="text-sm font-medium text-white">{selectedSale.customer_phone}</span>
                        <button onClick={() => copyToClipboard(selectedSale.customer_phone || '', 'Telefone')} className="p-1 hover:bg-gray-700 rounded">
                          <Copy className="w-3.5 h-3.5 text-gray-400" />
                        </button>
                      </div>
                    )}
                    {selectedSale.customer_cpf && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-400 w-24">CPF/CNPJ:</span>
                        <span className="text-sm font-medium text-white font-mono">
                          {(() => {
                            const cleaned = selectedSale.customer_cpf.replace(/\D/g, '')
                            if (cleaned.length === 11) {
                              return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
                            }
                            if (cleaned.length === 14) {
                              return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
                            }
                            return selectedSale.customer_cpf
                          })()}
                        </span>
                        <button onClick={() => copyToClipboard(selectedSale.customer_cpf || '', 'CPF/CNPJ')} className="p-1 hover:bg-gray-700 rounded">
                          <Copy className="w-3.5 h-3.5 text-gray-400" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  {/* Botões de contato personalizados */}
                  <ContactButtons
                    email={selectedSale.customer_email}
                    phone={selectedSale.customer_phone}
                    customerName={selectedSale.customer_name}
                    emailContext="support"
                    whatsappContext="support"
                    extraData={{
                      orderId: selectedSale.appmax_order_id,
                      saleId: selectedSale.id
                    }}
                    variant="stacked"
                    showLabels={true}
                  />
                  
                  {selectedSale.appmax_order_id && (
                    <button onClick={() => window.open(`https://admin.appmax.com.br/orders/${selectedSale.appmax_order_id}`, '_blank')} className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-700/50">
                      <ExternalLink className="w-5 h-5" />
                      Ver na AppMax
                    </button>
                  )}
                  {['paid', 'approved'].includes(selectedSale.status) && (selectedSale.sale_id || selectedSale.source === 'sale') && (
                    <button onClick={() => handleRefund(selectedSale)} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700">
                      <AlertTriangle className="w-5 h-5" />
                      Estornar
                    </button>
                  )}
                  <button 
                    onClick={() => handleDelete(selectedSale.id)} 
                    disabled={deleting === selectedSale.id}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-5 h-5" />
                    {deleting === selectedSale.id ? 'Excluindo...' : 'Excluir do Dashboard'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
