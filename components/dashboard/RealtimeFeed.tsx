'use client'

import { useState, useEffect } from 'react'
import { ShoppingBag, ShoppingCart, Eye, AlertCircle } from 'lucide-react'

interface RealtimeEvent {
  id: string
  type: 'sale' | 'cart_abandoned' | 'visit' | 'payment_failed'
  message: string
  value?: number
  timestamp: Date
}

interface RealtimeFeedProps {
  initialEvents?: RealtimeEvent[]
  autoRefresh?: boolean
  refreshInterval?: number
}

export default function RealtimeFeed({ 
  initialEvents = [], 
  autoRefresh = true,
  refreshInterval = 30000 // 30 segundos
}: RealtimeFeedProps) {
  const [events, setEvents] = useState<RealtimeEvent[]>(initialEvents)
  const [isLive, setIsLive] = useState(true)

  useEffect(() => {
    if (!autoRefresh || !isLive) return

    const fetchEvents = async () => {
      try {
        const response = await fetch('/api/dashboard/realtime-events')
        if (response.ok) {
          const data = await response.json()
          setEvents(data.events || [])
        }
      } catch (error) {
        console.error('Erro ao buscar eventos:', error)
      }
    }

    const interval = setInterval(fetchEvents, refreshInterval)
    return () => clearInterval(interval)
  }, [autoRefresh, isLive, refreshInterval])

  const getEventIcon = (type: RealtimeEvent['type']) => {
    switch (type) {
      case 'sale':
        return <ShoppingBag className="w-4 h-4 text-green-600" />
      case 'cart_abandoned':
        return <ShoppingCart className="w-4 h-4 text-yellow-600" />
      case 'payment_failed':
        return <AlertCircle className="w-4 h-4 text-red-600" />
      case 'visit':
        return <Eye className="w-4 h-4 text-blue-600" />
      default:
        return null
    }
  }

  const getEventColor = (type: RealtimeEvent['type']) => {
    switch (type) {
      case 'sale':
        return 'bg-green-900/20 border-green-800/50'
      case 'cart_abandoned':
        return 'bg-yellow-900/20 border-yellow-800/50'
      case 'payment_failed':
        return 'bg-red-900/20 border-red-800/50'
      case 'visit':
        return 'bg-blue-900/20 border-blue-800/50'
      default:
        return 'bg-gray-800/50 border-gray-700'
    }
  }

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date))
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(value)
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Atividade Recente</h3>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
          <span className="text-xs text-gray-400">{isLive ? 'Ao vivo' : 'Pausado'}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
        {events.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Eye className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhuma atividade recente</p>
            <p className="text-xs text-gray-600 mt-1">Aguardando eventos...</p>
          </div>
        ) : (
          events.map((event) => (
            <div
              key={event.id}
              className={`p-3 rounded-lg border ${getEventColor(event.type)} transition-all hover:scale-[1.02]`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {getEventIcon(event.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-200 line-clamp-2">
                    {event.message}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">
                      {formatTime(event.timestamp)}
                    </span>
                    {event.value && (
                      <>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs font-semibold text-gray-300">
                          {formatCurrency(event.value)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <button
        onClick={() => setIsLive(!isLive)}
        className="mt-4 w-full py-2 text-xs font-medium text-gray-400 hover:text-gray-200 transition-colors"
      >
        {isLive ? 'Pausar atualizações' : 'Retomar atualizações'}
      </button>
    </div>
  )
}
