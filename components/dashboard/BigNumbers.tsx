'use client'

import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, CreditCard, Users } from 'lucide-react'

interface BigNumberProps {
  title: string
  value: string
  delta: number
  deltaText: string
  icon: React.ReactNode
  loading?: boolean
}

function BigNumberCard({ title, value, delta, deltaText, icon, loading }: BigNumberProps) {
  const isPositive = delta > 0
  const isNeutral = delta === 0

  if (loading) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6 animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="h-4 bg-gray-700 rounded w-24"></div>
          <div className="h-8 w-8 bg-gray-700 rounded-lg"></div>
        </div>
        <div className="h-8 bg-gray-700 rounded w-32 mb-2"></div>
        <div className="h-3 bg-gray-700 rounded w-20"></div>
      </div>
    )
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 hover:border-gray-600 transition-all">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-gray-400">{title}</span>
        <div className="p-2 bg-brand-500/10 rounded-lg text-brand-400">
          {icon}
        </div>
      </div>
      
      <div className="mb-2">
        <h3 className="text-3xl font-bold text-white">{value}</h3>
      </div>
      
      <div className="flex items-center gap-1.5">
        {!isNeutral && (
          <div className={`flex items-center gap-0.5 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {isPositive ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            <span className="text-sm font-semibold">
              {isPositive ? '+' : ''}{delta.toFixed(1)}%
            </span>
          </div>
        )}
        <span className="text-sm text-gray-500">{deltaText}</span>
      </div>
    </div>
  )
}

interface BigNumbersProps {
  metrics: {
    revenue: { current: number; previous: number }
    averageTicket: { current: number; previous: number }
    approvalRate: { current: number; previous: number }
    activeCustomers: { current: number; previous: number }
  }
  loading?: boolean
}

export default function BigNumbers({ metrics, loading }: BigNumbersProps) {
  const calculateDelta = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0
    return ((current - previous) / previous) * 100
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  const revenueDelta = calculateDelta(metrics.revenue.current, metrics.revenue.previous)
  const ticketDelta = calculateDelta(metrics.averageTicket.current, metrics.averageTicket.previous)
  const approvalDelta = calculateDelta(metrics.approvalRate.current, metrics.approvalRate.previous)
  const customersDelta = calculateDelta(metrics.activeCustomers.current, metrics.activeCustomers.previous)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <BigNumberCard
        title="Faturamento Bruto"
        value={formatCurrency(metrics.revenue.current)}
        delta={revenueDelta}
        deltaText="vs últimos 30 dias"
        icon={<DollarSign className="w-5 h-5" />}
        loading={loading}
      />
      
      <BigNumberCard
        title="Ticket Médio (AOV)"
        value={formatCurrency(metrics.averageTicket.current)}
        delta={ticketDelta}
        deltaText="vs período anterior"
        icon={<ShoppingCart className="w-5 h-5" />}
        loading={loading}
      />
      
      <BigNumberCard
        title="Taxa de Aprovação"
        value={formatPercent(metrics.approvalRate.current)}
        delta={approvalDelta}
        deltaText="pagamentos aprovados"
        icon={<CreditCard className="w-5 h-5" />}
        loading={loading}
      />
      
      <BigNumberCard
        title="Clientes Ativos"
        value={metrics.activeCustomers.current.toString()}
        delta={customersDelta}
        deltaText="últimos 30 dias"
        icon={<Users className="w-5 h-5" />}
        loading={loading}
      />
    </div>
  )
}
