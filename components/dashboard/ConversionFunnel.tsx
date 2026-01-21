'use client'

import { Users, ShoppingCart, CreditCard, CheckCircle } from 'lucide-react'

interface FunnelStep {
  label: string
  value: number
  icon: React.ReactNode
  color: string
}

interface ConversionFunnelProps {
  data: {
    visitors: number
    addedToCart: number
    checkoutStarted: number
    completedSales: number
  }
  loading?: boolean
}

export default function ConversionFunnel({ data, loading }: ConversionFunnelProps) {
  if (loading) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6 animate-pulse">
        <div className="h-6 bg-gray-700 rounded w-48 mb-6"></div>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  const steps: FunnelStep[] = [
    {
      label: 'Visitantes Únicos',
      value: data.visitors,
      icon: <Users className="w-5 h-5" />,
      color: 'bg-blue-500',
    },
    {
      label: 'Adições ao Carrinho',
      value: data.addedToCart,
      icon: <ShoppingCart className="w-5 h-5" />,
      color: 'bg-indigo-500',
    },
    {
      label: 'Checkouts Iniciados',
      value: data.checkoutStarted,
      icon: <CreditCard className="w-5 h-5" />,
      color: 'bg-purple-500',
    },
    {
      label: 'Vendas Concluídas',
      value: data.completedSales,
      icon: <CheckCircle className="w-5 h-5" />,
      color: 'bg-green-500',
    },
  ]

  const calculateConversion = (current: number, total: number) => {
    if (total === 0) return 0
    return (current / total) * 100
  }

  const globalConversion = calculateConversion(data.completedSales, data.visitors)
  const cartConversion = calculateConversion(data.addedToCart, data.visitors)
  const checkoutConversion = calculateConversion(data.checkoutStarted, data.addedToCart)
  const saleConversion = calculateConversion(data.completedSales, data.checkoutStarted)

  const conversions = [100, cartConversion, checkoutConversion, saleConversion]

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Funil de Conversão</h3>
        <div className="text-right">
          <div className={`text-2xl font-bold ${globalConversion >= 2 ? 'text-green-400' : globalConversion >= 1 ? 'text-yellow-400' : 'text-red-400'}`}>
            {globalConversion.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500">Taxa Global</div>
        </div>
      </div>

      <div className="space-y-4">
        {steps.map((step, index) => {
          const width = conversions[index]
          const dropoff = index > 0 ? conversions[index - 1] - width : 0
          
          return (
            <div key={step.label}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 ${step.color} text-white rounded-lg`}>
                    {step.icon}
                  </div>
                  <span className="text-sm font-medium text-gray-300">{step.label}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-white">
                    {step.value.toLocaleString('pt-BR')}
                  </div>
                  {index > 0 && dropoff > 0 && (
                    <div className="text-xs text-red-400">
                      -{dropoff.toFixed(0)}%
                    </div>
                  )}
                </div>
              </div>
              
              <div className="w-full bg-gray-700/50 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full ${step.color} transition-all duration-500 ease-out relative`}
                  style={{ width: `${width}%` }}
                >
                  {width > 15 && (
                    <span className="absolute right-2 top-0 text-xs font-semibold text-white">
                      {width.toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {globalConversion < 1 && (
        <div className="mt-4 p-3 bg-red-900/20 border border-red-800/50 rounded-lg">
          <p className="text-sm text-red-300">
            ⚠️ <strong>Atenção:</strong> Conversão abaixo de 1%. Verifique se o checkout está funcionando ou se há problemas de performance.
          </p>
        </div>
      )}
    </div>
  )
}
