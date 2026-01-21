"use client"

import { useState } from 'react'
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'

interface ProductSyncButtonProps {
  onSyncComplete?: () => void
}

export function ProductSyncButton({ onSyncComplete }: ProductSyncButtonProps) {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const { toast } = useToast()

  const handleSync = async () => {
    setLoading(true)
    setStatus('idle')

    try {
      const res = await fetch('/api/admin/products/sync', { 
        method: 'POST' 
      })
      
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Erro na sincronização')

      setStatus('success')
      
      toast(`✅ ${data.message || `${data.discovered_count} produtos sincronizados`}`)

      // Callback para recarregar a lista de produtos
      if (onSyncComplete) {
        onSyncComplete()
      }
      
      // Reseta o status após 3 segundos
      setTimeout(() => setStatus('idle'), 3000)

    } catch (error: any) {
      console.error('Erro no sync:', error)
      setStatus('error')
      
      toast(`❌ Erro: ${error.message || 'Tente novamente em alguns instantes'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handleSync}
      disabled={loading}
      className={`
        flex items-center gap-2 transition-all
        ${status === 'success' 
          ? 'bg-green-600 hover:bg-green-700' 
          : status === 'error'
          ? 'bg-red-600 hover:bg-red-700'
          : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
        }
      `}
    >
      {loading ? (
        <RefreshCw className="w-4 h-4 animate-spin" />
      ) : status === 'success' ? (
        <CheckCircle className="w-4 h-4" />
      ) : status === 'error' ? (
        <AlertCircle className="w-4 h-4" />
      ) : (
        <RefreshCw className="w-4 h-4" />
      )}
      
      {loading ? 'Sincronizando...' : status === 'success' ? 'Sincronizado!' : 'Sincronizar com Vendas'}
    </Button>
  )
}
