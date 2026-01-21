'use client'

import { ShoppingCart, XCircle, AlertTriangle, ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface OperationalHealthProps {
  data: {
    recoverableCarts: {
      count: number
      totalValue: number
      last24h: number
    }
    failedPayments: {
      count: number
      totalValue: number
      reasons: { reason: string; count: number }[]
    }
    chargebacks: {
      count: number
      totalValue: number
    }
  }
  loading?: boolean
}

export default function OperationalHealth({ data, loading }: OperationalHealthProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(value)
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
            <div className="h-6 bg-gray-700 rounded w-32 mb-4"></div>
            <div className="h-8 bg-gray-700 rounded w-24 mb-2"></div>
            <div className="h-4 bg-gray-700 rounded w-40"></div>
          </div>
        ))}
      </div>
    )
  }

  const hasRecoverableCarts = data.recoverableCarts.count > 0
  const hasFailedPayments = data.failedPayments.count > 0
  const hasChargebacks = data.chargebacks.count > 0

  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-yellow-400" />
        Saúde Operacional - Ação Imediata
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Carrinhos Abandonados Recuperáveis */}
        <div className={`bg-gray-800/50 backdrop-blur-sm rounded-xl border ${hasRecoverableCarts ? 'border-yellow-700/50' : 'border-gray-700/50'} p-6 relative overflow-hidden`}>
          {hasRecoverableCarts && (
            <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-900/20 rounded-bl-full opacity-50"></div>
          )}
          
          <div className="relative">
            <div className="flex items-center gap-2 mb-4">
              <div className={`p-2 rounded-lg ${hasRecoverableCarts ? 'bg-yellow-900/30 text-yellow-400' : 'bg-gray-700/50 text-gray-500'}`}>
                <ShoppingCart className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-white">Carrinhos Abandonados</h3>
            </div>

            <div className="mb-3">
              <div className="text-3xl font-bold text-white">
                {formatCurrency(data.recoverableCarts.totalValue)}
              </div>
              <p className="text-sm text-gray-400 mt-1">
                {data.recoverableCarts.count} {data.recoverableCarts.count === 1 ? 'carrinho' : 'carrinhos'} recuperáveis
              </p>
            </div>

            {hasRecoverableCarts && (
              <>
                <div className="mb-4 p-2 bg-yellow-900/30 rounded-lg">
                  <p className="text-xs text-yellow-300">
                    <strong>{formatCurrency(data.recoverableCarts.last24h)}</strong> nas últimas 24h
                  </p>
                </div>

                <Link
                  href="/admin/abandoned-carts"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Recuperar Carrinhos
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </>
            )}

            {!hasRecoverableCarts && (
              <p className="text-sm text-gray-500">✓ Nenhum carrinho para recuperar</p>
            )}
          </div>
        </div>

        {/* Pagamentos Recusados */}
        <div className={`bg-gray-800/50 backdrop-blur-sm rounded-xl border ${hasFailedPayments ? 'border-red-700/50' : 'border-gray-700/50'} p-6 relative overflow-hidden`}>
          {hasFailedPayments && (
            <div className="absolute top-0 right-0 w-24 h-24 bg-red-900/20 rounded-bl-full opacity-50"></div>
          )}
          
          <div className="relative">
            <div className="flex items-center gap-2 mb-4">
              <div className={`p-2 rounded-lg ${hasFailedPayments ? 'bg-red-900/30 text-red-400' : 'bg-gray-700/50 text-gray-500'}`}>
                <XCircle className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-white">Pagamentos Recusados</h3>
            </div>

            <div className="mb-3">
              <div className="text-3xl font-bold text-white">
                {formatCurrency(data.failedPayments.totalValue)}
              </div>
              <p className="text-sm text-gray-400 mt-1">
                {data.failedPayments.count} {data.failedPayments.count === 1 ? 'tentativa' : 'tentativas'} falharam
              </p>
            </div>

            {hasFailedPayments && data.failedPayments.reasons.length > 0 && (
              <>
                <div className="mb-4 space-y-1">
                  {data.failedPayments.reasons.slice(0, 2).map((reason) => (
                    <div key={reason.reason} className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">{reason.reason}</span>
                      <span className="font-semibold text-white">{reason.count}</span>
                    </div>
                  ))}
                </div>

                <Link
                  href="/admin/failed-payments"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Ver Detalhes
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </>
            )}

            {!hasFailedPayments && (
              <p className="text-sm text-gray-500">✓ Nenhum pagamento recusado</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
