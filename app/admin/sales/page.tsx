'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatRelativeTime, formatBRDateTime, getUTCDayRange } from '@/lib/date-utils'
import { refundOrder } from '@/actions/refund-order'
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
  X
} from 'lucide-react'

interface Sale {
  id: string
  appmax_order_id: string
  sale_id?: string | null
  customer_name: string
  customer_email: string
  customer_phone?: string
  total_amount: number
  status: string
  failure_reason?: string
  payment_method: string
  created_at: string
  updated_at?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  source?: 'sale' | 'attempt'
}

type StatusFilter = 'all' | 'paid' | 'pending' | 'failed' | 'refunded'

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [filteredSales, setFilteredSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [showDrawer, setShowDrawer] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 20
  
  const [startDate, setStartDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 30)
    return date.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])

  useEffect(() => {
    loadSales()
  }, [startDate, endDate])

  useEffect(() => {
    applyFilters()
  }, [sales, searchTerm, statusFilter])

  const loadSales = async () => {
    try {
      setLoading(true)
      const { start, end } = getUTCDayRange(new Date(endDate))
      const { start: rangeStart } = getUTCDayRange(new Date(startDate))

      const params = new URLSearchParams({
        start: rangeStart,
        end
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
            return ['paid', 'approved'].includes(sale.status)
          case 'pending':
            return ['pending', 'processing'].includes(sale.status)
          case 'failed':
            return ['canceled', 'cancelado', 'cancelled', 'refused', 'rejected', 'failed', 'denied', 'expired', 'chargeback'].includes(sale.status)
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
    
    if (['canceled', 'cancelado', 'cancelled', 'refused', 'rejected', 'failed', 'denied', 'expired', 'chargeback'].includes(normalizedStatus)) {
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
    
    if (['paid', 'approved'].includes(normalizedStatus)) {
      return {
        label: 'Pago',
        className: 'bg-green-500/20 text-green-400 border-green-500/30',
        icon: CheckCircle2
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
      case 'credit_card':
      case 'cartao': return '💳'
      case 'boleto': return '📄'
      default: return '💰'
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    console.log(`${label} copiado: ${text}`)
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

  const totalPages = Math.ceil(filteredSales.length / pageSize)
  const paginatedSales = filteredSales.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const counts = {
    all: sales.length,
    paid: sales.filter(s => ['paid', 'approved'].includes(s.status)).length,
    pending: sales.filter(s => ['pending', 'processing'].includes(s.status)).length,
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
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-3 py-2 bg-gray-900/50 border border-gray-700 text-white rounded-lg" />
            <span className="self-center text-gray-500">até</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-3 py-2 bg-gray-900/50 border border-gray-700 text-white rounded-lg" />
          </div>

          <button onClick={loadSales} disabled={loading} className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { key: 'all', label: 'Todas' },
          { key: 'paid', label: 'Pagas' },
          { key: 'pending', label: 'Pendentes' },
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
            <table className="w-full">
              <thead className="bg-gray-900/50 border-b border-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Cliente</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Valor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Método</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Data</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Origem</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">Ações</th>
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border ${statusConfig.className}`}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-white">{sale.customer_name}</div>
                        <div className="text-sm text-gray-400">{sale.customer_email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-bold text-white">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sale.total_amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-2xl">{getPaymentMethodIcon(sale.payment_method)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        <div className="font-medium text-gray-300">{formatRelativeTime(sale.created_at)}</div>
                        <div className="text-xs">{formatBRDateTime(sale.created_at)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {sale.utm_source ? (
                          <span className="text-xs bg-blue-900/30 text-blue-400 px-2 py-1 rounded border border-blue-700/50">{sale.utm_source}</span>
                        ) : (
                          <span className="text-xs text-gray-500">Direto</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100">
                          <button onClick={(e) => { e.stopPropagation(); copyToClipboard(sale.id, 'ID') }} className="p-1.5 hover:bg-gray-600 rounded">
                            <Copy className="w-4 h-4 text-gray-400" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); window.location.href = `mailto:${sale.customer_email}` }} className="p-1.5 hover:bg-gray-600 rounded">
                            <Mail className="w-4 h-4 text-gray-400" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>

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
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <button onClick={() => window.location.href = `mailto:${selectedSale.customer_email}`} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700">
                    <Mail className="w-5 h-5" />
                    Enviar Email
                  </button>
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
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
