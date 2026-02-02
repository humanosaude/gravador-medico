'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  TrendingUp,
  Pause,
  Play,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  DollarSign,
  Target,
  Users,
  Eye,
  ChevronDown,
  ChevronUp,
  Loader2,
  Bell,
  Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// =====================================================
// TIPOS
// =====================================================

interface Recommendation {
  id: string;
  campaign_id: string | null;
  meta_campaign_id: string;
  type: 'ALERT' | 'OPPORTUNITY' | 'WARNING' | 'INFO';
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  title: string;
  message: string;
  action_type: string | null;
  action_params: Record<string, unknown> | null;
  status: 'PENDING' | 'APPLIED' | 'DISMISSED';
  metrics_snapshot: Record<string, unknown>;
  created_at: string;
  campaign?: {
    name: string;
    status: string;
  };
}

interface Stats {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  pending: number;
}

// =====================================================
// CONFIGURAÇÕES
// =====================================================

const PRIORITY_CONFIG = {
  CRITICAL: {
    color: 'bg-red-500',
    textColor: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/50',
    icon: AlertTriangle,
    label: 'Crítico',
  },
  HIGH: {
    color: 'bg-orange-500',
    textColor: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/50',
    icon: AlertTriangle,
    label: 'Alto',
  },
  MEDIUM: {
    color: 'bg-yellow-500',
    textColor: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/50',
    icon: Clock,
    label: 'Médio',
  },
  LOW: {
    color: 'bg-blue-500',
    textColor: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/50',
    icon: TrendingUp,
    label: 'Baixo',
  },
};

const TYPE_CONFIG = {
  ALERT: { icon: AlertTriangle, color: 'text-red-400' },
  OPPORTUNITY: { icon: TrendingUp, color: 'text-green-400' },
  WARNING: { icon: Clock, color: 'text-yellow-400' },
  INFO: { icon: Eye, color: 'text-blue-400' },
};

const CATEGORY_CONFIG: Record<string, { icon: React.ElementType; label: string }> = {
  budget: { icon: DollarSign, label: 'Orçamento' },
  performance: { icon: Target, label: 'Performance' },
  creative: { icon: Eye, label: 'Criativo' },
  audience: { icon: Users, label: 'Audiência' },
  technical: { icon: Zap, label: 'Técnico' },
};

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export default function ActionCenter() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>('all');
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'all'>('PENDING');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Buscar recomendações (com polling)
  const fetchRecommendations = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        status: statusFilter,
        limit: '50',
      });
      
      if (filter !== 'all') {
        params.set('priority', filter);
      }

      const response = await fetch(`/api/ads/recommendations?${params}`);
      const data = await response.json();

      if (data.success) {
        setRecommendations(data.recommendations || []);
        setStats(data.stats);
        setError(null);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Erro ao carregar recomendações');
    } finally {
      setLoading(false);
    }
  }, [filter, statusFilter]);

  // Polling a cada 30 segundos
  useEffect(() => {
    fetchRecommendations();
    const interval = setInterval(fetchRecommendations, 30000);
    return () => clearInterval(interval);
  }, [fetchRecommendations]);

  // Aplicar ação
  const handleApplyAction = async (recId: string) => {
    setActionLoading(recId);
    
    try {
      const response = await fetch('/api/ads/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recommendation_id: recId,
          action: 'apply',
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Atualizar lista local
        setRecommendations(prev => 
          prev.map(r => r.id === recId ? { ...r, status: 'APPLIED' as const } : r)
        );
      } else {
        alert(`Erro: ${data.error}`);
      }
    } catch (err) {
      alert('Erro ao aplicar ação');
    } finally {
      setActionLoading(null);
    }
  };

  // Ignorar recomendação
  const handleDismiss = async (recId: string) => {
    setActionLoading(recId);
    
    try {
      const response = await fetch('/api/ads/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recommendation_id: recId,
          action: 'dismiss',
        }),
      });

      const data = await response.json();

      if (data.success) {
        setRecommendations(prev => 
          prev.map(r => r.id === recId ? { ...r, status: 'DISMISSED' as const } : r)
        );
      }
    } catch (err) {
      alert('Erro ao ignorar');
    } finally {
      setActionLoading(null);
    }
  };

  // Formatar tempo
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins}min atrás`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h atrás`;
    return date.toLocaleDateString('pt-BR');
  };

  // Renderizar card de recomendação
  const renderRecommendationCard = (rec: Recommendation) => {
    const priorityConfig = PRIORITY_CONFIG[rec.priority];
    const typeConfig = TYPE_CONFIG[rec.type];
    const categoryConfig = CATEGORY_CONFIG[rec.category] || CATEGORY_CONFIG.performance;
    const isExpanded = expandedId === rec.id;
    const isLoading = actionLoading === rec.id;
    const isCompleted = rec.status !== 'PENDING';

    return (
      <motion.div
        key={rec.id}
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: isCompleted ? 0.5 : 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={cn(
          'bg-gray-900 rounded-xl border overflow-hidden transition-all',
          priorityConfig.borderColor,
          isCompleted && 'opacity-50'
        )}
      >
        {/* Header */}
        <div 
          className="p-4 cursor-pointer hover:bg-gray-800/50 transition-colors"
          onClick={() => setExpandedId(isExpanded ? null : rec.id)}
        >
          <div className="flex items-start gap-3">
            {/* Priority indicator */}
            <div className={cn('w-2 h-full min-h-[40px] rounded-full', priorityConfig.color)} />
            
            {/* Icon */}
            <div className={cn('p-2 rounded-lg', priorityConfig.bgColor)}>
              <typeConfig.icon className={cn('w-5 h-5', typeConfig.color)} />
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-white font-medium truncate">{rec.title}</h3>
                <span className={cn(
                  'px-2 py-0.5 rounded-full text-xs font-medium',
                  priorityConfig.bgColor,
                  priorityConfig.textColor
                )}>
                  {priorityConfig.label}
                </span>
                {rec.status === 'APPLIED' && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-green-500/10 text-green-400">
                    Aplicado
                  </span>
                )}
                {rec.status === 'DISMISSED' && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-gray-500/10 text-gray-400">
                    Ignorado
                  </span>
                )}
              </div>
              
              <p className="text-gray-400 text-sm line-clamp-2">{rec.message}</p>
              
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <categoryConfig.icon className="w-3 h-3" />
                  {categoryConfig.label}
                </span>
                {rec.campaign?.name && (
                  <span className="truncate max-w-[200px]">
                    📢 {rec.campaign.name}
                  </span>
                )}
                <span>{formatTime(rec.created_at)}</span>
              </div>
            </div>

            {/* Expand icon */}
            <div className="text-gray-500">
              {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </div>
        </div>

        {/* Expanded content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="overflow-hidden border-t border-gray-800"
            >
              <div className="p-4 space-y-4">
                {/* Métricas */}
                {rec.metrics_snapshot && Object.keys(rec.metrics_snapshot).length > 0 && (
                  <div>
                    <h4 className="text-gray-400 text-xs uppercase mb-2">Métricas</h4>
                    <div className="flex flex-wrap gap-3">
                      {Object.entries(rec.metrics_snapshot).map(([key, value]) => (
                        <div key={key} className="bg-gray-800 px-3 py-2 rounded-lg">
                          <p className="text-gray-500 text-xs">{key}</p>
                          <p className="text-white font-medium">
                            {typeof value === 'number' 
                              ? key.includes('roas') || key.includes('ctr')
                                ? `${value.toFixed(2)}${key.includes('ctr') ? '%' : 'x'}`
                                : key.includes('spend') || key.includes('cpa') || key.includes('budget')
                                  ? `R$ ${value.toFixed(2)}`
                                  : value.toLocaleString()
                              : String(value)
                            }
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ações */}
                {rec.status === 'PENDING' && (
                  <div className="flex items-center gap-3 pt-2 border-t border-gray-800">
                    {rec.action_type && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApplyAction(rec.id);
                        }}
                        disabled={isLoading}
                        className={cn(
                          'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
                          rec.action_type === 'pause' 
                            ? 'bg-red-600 hover:bg-red-500 text-white'
                            : rec.action_type === 'scale_up'
                              ? 'bg-green-600 hover:bg-green-500 text-white'
                              : 'bg-blue-600 hover:bg-blue-500 text-white',
                          isLoading && 'opacity-50 cursor-not-allowed'
                        )}
                      >
                        {isLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : rec.action_type === 'pause' ? (
                          <Pause className="w-4 h-4" />
                        ) : rec.action_type === 'scale_up' ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                        {rec.action_type === 'pause' ? 'Pausar Campanha' :
                         rec.action_type === 'scale_up' ? 'Aumentar Orçamento' :
                         rec.action_type === 'unpause' ? 'Reativar' : 'Aplicar'}
                      </button>
                    )}
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDismiss(rec.id);
                      }}
                      disabled={isLoading}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                      Ignorar
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  return (
    <div className="bg-gray-950 rounded-2xl border border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-xl">
              <Bell className="w-6 h-6 text-orange-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Action Center</h2>
              <p className="text-sm text-gray-400">Alertas e oportunidades da IA</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchRecommendations}
              disabled={loading}
              className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-400 transition-colors"
            >
              <RefreshCw className={cn('w-5 h-5', loading && 'animate-spin')} />
            </button>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-5 gap-3 mb-4">
            <div className="bg-gray-800/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-white">{stats.pending}</p>
              <p className="text-xs text-gray-400">Pendentes</p>
            </div>
            <div className="bg-red-500/10 rounded-lg p-3 text-center border border-red-500/20">
              <p className="text-2xl font-bold text-red-400">{stats.critical}</p>
              <p className="text-xs text-gray-400">Críticos</p>
            </div>
            <div className="bg-orange-500/10 rounded-lg p-3 text-center border border-orange-500/20">
              <p className="text-2xl font-bold text-orange-400">{stats.high}</p>
              <p className="text-xs text-gray-400">Altos</p>
            </div>
            <div className="bg-yellow-500/10 rounded-lg p-3 text-center border border-yellow-500/20">
              <p className="text-2xl font-bold text-yellow-400">{stats.medium}</p>
              <p className="text-xs text-gray-400">Médios</p>
            </div>
            <div className="bg-blue-500/10 rounded-lg p-3 text-center border border-blue-500/20">
              <p className="text-2xl font-bold text-blue-400">{stats.low}</p>
              <p className="text-xs text-gray-400">Baixos</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            >
              <option value="all">Todas prioridades</option>
              <option value="CRITICAL">🔴 Crítico</option>
              <option value="HIGH">🟠 Alto</option>
              <option value="MEDIUM">🟡 Médio</option>
              <option value="LOW">🔵 Baixo</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            >
              <option value="PENDING">Pendentes</option>
              <option value="all">Todos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 max-h-[600px] overflow-y-auto space-y-3">
        {loading && recommendations.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <p className="text-red-400">{error}</p>
            <button
              onClick={fetchRecommendations}
              className="mt-4 px-4 py-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20"
            >
              Tentar novamente
            </button>
          </div>
        ) : recommendations.filter(r => statusFilter === 'all' || r.status === statusFilter).length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <p className="text-gray-400">Nenhum alerta pendente!</p>
            <p className="text-gray-500 text-sm mt-1">Suas campanhas estão saudáveis</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {recommendations
              .filter(r => statusFilter === 'all' || r.status === statusFilter)
              .map(renderRecommendationCard)
            }
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
