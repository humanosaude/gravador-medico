'use client';

// =====================================================
// PAINEL DE OTIMIZAÇÃO - AUDITOR DE CAMPANHAS
// =====================================================
// Exibe logs de otimização e permite execução manual
// =====================================================

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  Play,
  Pause,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Clock,
  DollarSign,
  Target,
  ChevronDown,
  ChevronUp,
  Settings2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// =====================================================
// TIPOS
// =====================================================

interface OptimizationLog {
  id: string;
  ad_id: string;
  ad_name: string;
  adset_id: string;
  campaign_id: string;
  action_type: 'PAUSE' | 'SCALE' | 'NO_ACTION';
  reason: string;
  metrics_before: {
    spend: number;
    purchases: number;
    roas: number;
    daily_budget?: number;
  };
  metrics_after?: {
    daily_budget?: number;
    status?: string;
  };
  created_at: string;
}

interface OptimizationStats {
  totalLogs: number;
  byAction: {
    PAUSE: number;
    SCALE: number;
    NO_ACTION: number;
  };
  lastRun: string | null;
}

interface OptimizationRules {
  pauseSpendThreshold: number;
  scaleRoasThreshold: number;
  scaleBudgetIncrease: number;
  maxDailyBudget: number;
  datePreset: string;
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export default function OptimizationPanel() {
  const [logs, setLogs] = useState<OptimizationLog[]>([]);
  const [stats, setStats] = useState<OptimizationStats | null>(null);
  const [rules, setRules] = useState<OptimizationRules | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<any>(null);

  // Carregar dados iniciais
  useEffect(() => {
    fetchOptimizationData();
  }, []);

  const fetchOptimizationData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/ads/optimize');
      const data = await response.json();

      if (data.success) {
        setLogs(data.recentLogs || []);
        setStats(data.stats);
        setRules(data.currentRules);
        setError(null);
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const runOptimization = async () => {
    setIsOptimizing(true);
    setLastResult(null);
    
    try {
      const response = await fetch('/api/ads/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      const data = await response.json();
      setLastResult(data);

      if (data.success) {
        // Recarregar dados após otimização
        await fetchOptimizationData();
      }
    } catch (err: any) {
      setLastResult({ success: false, error: err.message });
    } finally {
      setIsOptimizing(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'PAUSE':
        return <Pause className="w-4 h-4 text-orange-500" />;
      case 'SCALE':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      default:
        return <Activity className="w-4 h-4 text-slate-400" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'PAUSE':
        return 'bg-orange-900/30 text-orange-400';
      case 'SCALE':
        return 'bg-green-900/30 text-green-400';
      default:
        return 'bg-gray-800 text-gray-300';
    }
  };

  // =====================================================
  // RENDERIZAÇÃO
  // =====================================================

  return (
    <div className="bg-gray-900 rounded-2xl shadow-lg border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Auditor de Campanhas</h2>
              <p className="text-emerald-100 text-sm">
                Otimização automática de anúncios
              </p>
            </div>
          </div>

          <button
            onClick={runOptimization}
            disabled={isOptimizing}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all',
              isOptimizing
                ? 'bg-white/30 text-white cursor-not-allowed'
                : 'bg-white text-emerald-600 hover:bg-emerald-50'
            )}
          >
            {isOptimizing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Otimizando...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Executar Agora
              </>
            )}
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Resultado da Última Execução */}
        <AnimatePresence>
          {lastResult && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={cn(
                'rounded-xl p-4 border',
                lastResult.success
                  ? 'bg-green-900/30 border-green-700/50'
                  : 'bg-red-900/30 border-red-700/50'
              )}
            >
              <div className="flex items-start gap-3">
                {lastResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                )}
                <div>
                  <p className={cn(
                    'font-medium',
                    lastResult.success ? 'text-green-100' : 'text-red-100'
                  )}>
                    {lastResult.success ? 'Otimização Concluída!' : 'Erro na Otimização'}
                  </p>
                  {lastResult.success && lastResult.summary && (
                    <div className="mt-2 text-sm text-green-300 space-y-1">
                      <p>📊 Anúncios analisados: {lastResult.summary.adsAnalyzed}</p>
                      <p>⏸️ Pausados: {lastResult.summary.paused}</p>
                      <p>📈 Escalados: {lastResult.summary.scaled}</p>
                    </div>
                  )}
                  {!lastResult.success && (
                    <p className="mt-1 text-sm text-red-400">
                      {lastResult.error}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Estatísticas */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-800 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-300 mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-xs font-medium">Última Execução</span>
              </div>
              <p className="text-lg font-bold text-white">
                {stats.lastRun ? formatDate(stats.lastRun) : 'Nunca'}
              </p>
            </div>

            <div className="bg-orange-900/30 rounded-xl p-4">
              <div className="flex items-center gap-2 text-orange-400 mb-1">
                <Pause className="w-4 h-4" />
                <span className="text-xs font-medium">Pausados</span>
              </div>
              <p className="text-lg font-bold text-orange-300">
                {stats.byAction.PAUSE}
              </p>
            </div>

            <div className="bg-green-900/30 rounded-xl p-4">
              <div className="flex items-center gap-2 text-green-400 mb-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs font-medium">Escalados</span>
              </div>
              <p className="text-lg font-bold text-green-300">
                {stats.byAction.SCALE}
              </p>
            </div>

            <div className="bg-gray-800 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-300 mb-1">
                <Target className="w-4 h-4" />
                <span className="text-xs font-medium">Total Analisados</span>
              </div>
              <p className="text-lg font-bold text-white">
                {stats.totalLogs}
              </p>
            </div>
          </div>
        )}

        {/* Regras Atuais */}
        {rules && (
          <div>
            <button
              onClick={() => setShowRules(!showRules)}
              className="flex items-center gap-2 text-sm font-medium text-emerald-400 hover:text-emerald-300"
            >
              <Settings2 className="w-4 h-4" />
              {showRules ? 'Ocultar Regras' : 'Ver Regras de Otimização'}
              {showRules ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            <AnimatePresence>
              {showRules && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 p-4 bg-gray-800 rounded-xl">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-300">Pausar se gasto {'>'}</span>
                        <p className="font-semibold text-white">
                          R$ {rules.pauseSpendThreshold.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-300">Escalar se ROAS {'>'}</span>
                        <p className="font-semibold text-white">
                          {rules.scaleRoasThreshold}x
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-300">Aumento de budget</span>
                        <p className="font-semibold text-white">
                          +{(rules.scaleBudgetIncrease * 100).toFixed(0)}%
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-300">Budget máximo</span>
                        <p className="font-semibold text-white">
                          R$ {rules.maxDailyBudget.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-300">Período de análise</span>
                        <p className="font-semibold text-white">
                          {rules.datePreset.replace('last_', 'Últimos ').replace('d', ' dias')}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Lista de Logs */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">
              Histórico de Ações
            </h3>
            <button
              onClick={fetchOptimizationData}
              disabled={isLoading}
              className="flex items-center gap-2 text-sm text-gray-300 hover:text-white"
            >
              <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
              Atualizar
            </button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-400">
              <AlertCircle className="w-8 h-8 mx-auto mb-2" />
              <p>{error}</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-gray-300">
              <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Nenhuma otimização realizada ainda</p>
              <p className="text-sm">Clique em "Executar Agora" para analisar suas campanhas</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 p-4 bg-gray-800 rounded-xl"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {getActionIcon(log.action_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn(
                        'px-2 py-0.5 rounded-full text-xs font-medium',
                        getActionColor(log.action_type)
                      )}>
                        {log.action_type}
                      </span>
                      <span className="text-xs text-gray-300">
                        {formatDate(log.created_at)}
                      </span>
                    </div>
                    <p className="mt-1 font-medium text-white truncate">
                      {log.ad_name}
                    </p>
                    <p className="mt-1 text-sm text-gray-300">
                      {log.reason}
                    </p>
                    <div className="mt-2 flex gap-4 text-xs text-gray-300">
                      <span>Spend: R$ {log.metrics_before.spend.toFixed(2)}</span>
                      <span>ROAS: {log.metrics_before.roas.toFixed(2)}x</span>
                      <span>Vendas: {log.metrics_before.purchases}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
