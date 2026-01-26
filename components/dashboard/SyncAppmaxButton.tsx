'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

export function SyncAppmaxButton() {
  const [syncing, setSyncing] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleSync = async () => {
    console.log('🚀 [SYNC] Iniciando sincronização Appmax...')
    try {
      setSyncing(true)
      setResult(null)
      
      toast.info('Iniciando sincronização com Appmax...')
      console.log('📤 [SYNC] Fazendo requisição POST para /api/admin/sync-appmax')

      const response = await fetch('/api/admin/sync-appmax', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          days: 45 // Últimos 45 dias (desde 15/01/2026)
        })
      })

      console.log('📥 [SYNC] Response status:', response.status, response.statusText)
      
      const data = await response.json()
      console.log('📊 [SYNC] Response data:', data)

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao sincronizar')
      }

      setResult(data.stats)
      console.log('✅ [SYNC] Sucesso! Stats:', data.stats)
      toast.success(`Sincronização concluída! ${data.stats.successful} pedidos importados`)
      
      // Recarregar página após 2 segundos
      setTimeout(() => {
        window.location.reload()
      }, 2000)

    } catch (error: any) {
      console.error('❌ [SYNC] Erro na sincronização:', error)
      console.error('❌ [SYNC] Error stack:', error.stack)
      toast.error(error.message || 'Erro ao sincronizar com Appmax')
    } finally {
      console.log('🏁 [SYNC] Finalizando...')
      setSyncing(false)
    }
  }

  return (
    <div className="space-y-4">
      <Button
        onClick={handleSync}
        disabled={syncing}
        className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
      >
        {syncing ? (
          <>
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            Sincronizando...
          </>
        ) : (
          <>
            <RefreshCw className="w-4 h-4 mr-2" />
            Sincronizar Pedidos Appmax
          </>
        )}
      </Button>

      {result && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2 text-green-400">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-semibold">Sincronização Concluída</span>
          </div>
          <div className="text-sm text-gray-300 space-y-1">
            <p>✅ <strong>{result.successful}</strong> pedidos importados</p>
            <p>📦 <strong>{result.total}</strong> pedidos processados</p>
            {result.failed > 0 && (
              <p className="text-yellow-400">
                ⚠️ <strong>{result.failed}</strong> pedidos com erro
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
