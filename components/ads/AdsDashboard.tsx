'use client';

// =====================================================
// ADS DASHBOARD - PAINEL DE ANÁLISE DE CAMPANHAS
// =====================================================
// Dashboard profissional mostrando:
// - Lista de campanhas com métricas
// - Status de IA (último log de otimização)
// - Ações rápidas (pausar, ver no Ads Manager)
// =====================================================

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Eye,
  MousePointer,
  Pause,
  Play,
  ExternalLink,
  RefreshCw,
  Brain,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  ChevronDown,
  ChevronUp,
  Zap,
  Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// =====================================================
// TIPOS
// =====================================================

interface Campaign {
  id: string;
  meta_campaign_id: string;
  meta_adset_id: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED';
  strategy: string;
  objective: string;
  budget_daily: number;
  created_at: string;
  
  // Métricas (virão da API Meta ou estimadas)
  metrics?: {
    spend: number;
    impressions: number;
    clicks: number;
    ctr: number;
    cpc: number;
    conversions: number;
    revenue: number;
    roas: number;
  };
  
  // Logs de IA
  lastOptimization?: {
    action: string;
    reason: string;
    timestamp: string;
    success: boolean;
  };
  
  // Criativos
  ads_creatives?: {
    id: string;
    creative_type: 'IMAGE' | 'VIDEO';
    processing_status?: string;
  }[];
}

// =====================================================
// COMPONENTE DE BADGE DE STATUS
// =====================================================

function StatusBadge({ status }: { status: 'ACTIVE' | 'PAUSED' }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
      status === 'ACTIVE'
        ? 'bg-green-900/50 text-green-400 border border-green-700/50'
        : 'bg-yellow-900/50 text-yellow-400 border border-yellow-700/50'
    )}>
      {status === 'ACTIVE' ? (
        <>
          <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
          Ativo
        </>
      ) : (
        <>
          <Pause className="w-3 h-3" />
          Pausado
        </>
      )}
    </span>
  );
}

// =====================================================
// COMPONENTE DE MÉTRICA
// =====================================================

function MetricCard({ 
  label, 
  value, 
  icon: Icon, 
  trend,
  color = 'purple'
}: { 
  label: string; 
  value: string | number; 
  icon: React.ElementType;
  trend?: number;
  color?: 'purple' | 'green' | 'blue' | 'yellow';
}) {
  const colors = {
    purple: 'text-purple-400 bg-purple-900/30',
    green: 'text-green-400 bg-green-900/30',
    blue: 'text-blue-400 bg-blue-900/30',
    yellow: 'text-yellow-400 bg-yellow-900/30',
  };

  return (
    <div className="bg-gray-800/50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-400">{label}</span>
        <div className={cn('p-1.5 rounded-lg', colors[color])}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold text-white">{value}</span>
        {trend !== undefined && (
          <span className={cn(
            'text-sm flex items-center gap-0.5',
            trend >= 0 ? 'text-green-400' : 'text-red-400'
          )}>
            {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
    </div>
  );
}

// =====================================================
// COMPONENTE DE LOG DE IA
// =====================================================

function AILogBadge({ log }: { log?: Campaign['lastOptimization'] }) {
  if (!log) {
    return (
      <span className="text-gray-500 text-sm flex items-center gap-1">
        <Clock className="w-3 h-3" />
        Aguardando análise
      </span>
    );
  }

  const isPositive = log.action.toLowerCase().includes('escal') || 
                     log.action.toLowerCase().includes('aument') ||
                     log.action.toLowerCase().includes('ativ');
  
  const isNegative = log.action.toLowerCase().includes('paus') || 
                     log.action.toLowerCase().includes('reduz') ||
                     log.action.toLowerCase().includes('desativ');

  return (
    <div className={cn(
      'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm',
      isPositive && 'bg-green-900/30 border border-green-700/50',
      isNegative && 'bg-red-900/30 border border-red-700/50',
      !isPositive && !isNegative && 'bg-blue-900/30 border border-blue-700/50'
    )}>
      <Brain className={cn(
        'w-4 h-4',
        isPositive && 'text-green-400',
        isNegative && 'text-red-400',
        !isPositive && !isNegative && 'text-blue-400'
      )} />
      <span className={cn(
        isPositive && 'text-green-300',
        isNegative && 'text-red-300',
        !isPositive && !isNegative && 'text-blue-300'
      )}>
        {log.action}
      </span>
    </div>
  );
}

// =====================================================
// COMPONENTE DE LINHA DA CAMPANHA
// =====================================================

function CampaignRow({ 
  campaign, 
  onToggleStatus,
  isUpdating 
}: { 
  campaign: Campaign;
  onToggleStatus: (id: string, newStatus: 'ACTIVE' | 'PAUSED') => void;
  isUpdating: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  
  const metrics = campaign.metrics || {
    spend: 0,
    impressions: 0,
    clicks: 0,
    ctr: 0,
    cpc: 0,
    conversions: 0,
    revenue: 0,
    roas: 0,
  };

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
      {/* Linha Principal */}
      <div 
        className="p-4 cursor-pointer hover:bg-gray-800/50 transition"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-white">{campaign.name}</h3>
                <StatusBadge status={campaign.status} />
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-gray-500">
                  {new Date(campaign.created_at).toLocaleDateString('pt-BR')}
                </span>
                <span className={cn(
                  'text-xs px-2 py-0.5 rounded',
                  campaign.strategy === 'TOPO' && 'bg-blue-900/50 text-blue-400',
                  campaign.strategy === 'MEIO' && 'bg-yellow-900/50 text-yellow-400',
                  campaign.strategy === 'FUNDO' && 'bg-green-900/50 text-green-400'
                )}>
                  {campaign.strategy}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Métricas Resumidas */}
            <div className="hidden md:flex items-center gap-6">
              <div className="text-right">
                <p className="text-sm text-gray-400">Gasto</p>
                <p className="text-white font-semibold">
                  R$ {metrics.spend.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-400">ROAS</p>
                <p className={cn(
                  'font-semibold',
                  metrics.roas >= 3 ? 'text-green-400' : 
                  metrics.roas >= 1 ? 'text-yellow-400' : 'text-red-400'
                )}>
                  {metrics.roas.toFixed(1)}x
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-400">CTR</p>
                <p className="text-white font-semibold">{metrics.ctr.toFixed(2)}%</p>
              </div>
            </div>

            {/* Log IA */}
            <div className="hidden lg:block">
              <AILogBadge log={campaign.lastOptimization} />
            </div>

            {/* Ações */}
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleStatus(
                    campaign.meta_campaign_id,
                    campaign.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
                  );
                }}
                disabled={isUpdating}
                className={cn(
                  'p-2 rounded-lg transition',
                  campaign.status === 'ACTIVE'
                    ? 'bg-yellow-900/30 text-yellow-400 hover:bg-yellow-900/50'
                    : 'bg-green-900/30 text-green-400 hover:bg-green-900/50'
                )}
                title={campaign.status === 'ACTIVE' ? 'Pausar' : 'Ativar'}
              >
                {isUpdating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : campaign.status === 'ACTIVE' ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </button>
              
              <a
                href={`https://business.facebook.com/adsmanager/manage/campaigns?act=${campaign.meta_campaign_id?.replace('act_', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-2 rounded-lg bg-blue-900/30 text-blue-400 hover:bg-blue-900/50 transition"
                title="Ver no Ads Manager"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
              
              {expanded ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Detalhes Expandidos */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0 border-t border-gray-800">
              <div className="pt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard 
                  label="Gasto Total" 
                  value={`R$ ${metrics.spend.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                  icon={DollarSign}
                  color="yellow"
                />
                <MetricCard 
                  label="Impressões" 
                  value={metrics.impressions.toLocaleString('pt-BR')}
                  icon={Eye}
                  color="blue"
                />
                <MetricCard 
                  label="Cliques" 
                  value={metrics.clicks.toLocaleString('pt-BR')}
                  icon={MousePointer}
                  color="purple"
                />
                <MetricCard 
                  label="ROAS" 
                  value={`${metrics.roas.toFixed(1)}x`}
                  icon={TrendingUp}
                  color="green"
                />
              </div>

              {/* Histórico de IA */}
              {campaign.lastOptimization && (
                <div className="mt-4 p-4 bg-gray-800/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-medium text-gray-300">Última Ação da IA</span>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      'p-2 rounded-lg',
                      campaign.lastOptimization.success ? 'bg-green-900/30' : 'bg-red-900/30'
                    )}>
                      {campaign.lastOptimization.success ? (
                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-white font-medium">{campaign.lastOptimization.action}</p>
                      <p className="text-sm text-gray-400 mt-1">{campaign.lastOptimization.reason}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(campaign.lastOptimization.timestamp).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Criativos */}
              {campaign.ads_creatives && campaign.ads_creatives.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-gray-400 mb-2">
                    {campaign.ads_creatives.length} Criativos
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {campaign.ads_creatives.map((creative) => (
                      <span
                        key={creative.id}
                        className={cn(
                          'px-2 py-1 rounded text-xs',
                          creative.processing_status === 'pending' && 'bg-yellow-900/30 text-yellow-400',
                          creative.processing_status === 'ready' && 'bg-green-900/30 text-green-400',
                          creative.processing_status === 'error' && 'bg-red-900/30 text-red-400',
                          !creative.processing_status && 'bg-gray-800 text-gray-400'
                        )}
                      >
                        {creative.creative_type === 'VIDEO' ? '🎬' : '🖼️'} 
                        {creative.processing_status === 'pending' ? ' Processando...' : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export default function AdsDashboard() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingCampaign, setUpdatingCampaign] = useState<string | null>(null);

  // Carregar campanhas
  const loadCampaigns = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/ads/launch-v2');
      const data = await response.json();

      if (data.success) {
        // Mapear campanhas com logs de otimização
        const campaignsWithLogs = await Promise.all(
          (data.campaigns || []).map(async (campaign: Campaign) => {
            // Buscar último log de otimização
            try {
              const logResponse = await fetch(`/api/ads/optimization-logs?campaign_id=${campaign.id}&limit=1`);
              const logData = await logResponse.json();
              
              if (logData.success && logData.logs?.length > 0) {
                const log = logData.logs[0];
                campaign.lastOptimization = {
                  action: log.action_taken,
                  reason: log.analysis_result?.recommendation || '',
                  timestamp: log.created_at,
                  success: log.success
                };
              }
            } catch (e) {
              // Ignorar erro de logs
            }
            return campaign;
          })
        );

        setCampaigns(campaignsWithLogs);
      } else {
        setError(data.error || 'Erro ao carregar campanhas');
      }
    } catch (err) {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  // Toggle status da campanha
  const handleToggleStatus = async (campaignId: string, newStatus: 'ACTIVE' | 'PAUSED') => {
    try {
      setUpdatingCampaign(campaignId);
      
      // Aqui você pode chamar a API do Meta para alterar o status
      // Por enquanto, apenas atualiza localmente
      setCampaigns(prev =>
        prev.map(c =>
          c.meta_campaign_id === campaignId
            ? { ...c, status: newStatus }
            : c
        )
      );

      // TODO: Chamar API Meta para alterar status real
      // await fetch(`/api/ads/campaigns/${campaignId}/status`, {
      //   method: 'PATCH',
      //   body: JSON.stringify({ status: newStatus })
      // });

    } catch (err) {
      console.error('Erro ao alterar status:', err);
    } finally {
      setUpdatingCampaign(null);
    }
  };

  // Calcular totais
  const totals = campaigns.reduce(
    (acc, c) => ({
      spend: acc.spend + (c.metrics?.spend || 0),
      impressions: acc.impressions + (c.metrics?.impressions || 0),
      clicks: acc.clicks + (c.metrics?.clicks || 0),
      revenue: acc.revenue + (c.metrics?.revenue || 0),
    }),
    { spend: 0, impressions: 0, clicks: 0, revenue: 0 }
  );

  const totalRoas = totals.spend > 0 ? totals.revenue / totals.spend : 0;
  const totalCtr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-900/30 rounded-lg">
            <BarChart3 className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Dashboard de Campanhas</h2>
            <p className="text-gray-400 text-sm">
              {campaigns.length} campanha{campaigns.length !== 1 ? 's' : ''} • 
              {campaigns.filter(c => c.status === 'ACTIVE').length} ativa{campaigns.filter(c => c.status === 'ACTIVE').length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        
        <button
          onClick={loadCampaigns}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 transition"
        >
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          Atualizar
        </button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Gasto Total"
          value={`R$ ${totals.spend.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={DollarSign}
          color="yellow"
        />
        <MetricCard
          label="Impressões"
          value={totals.impressions.toLocaleString('pt-BR')}
          icon={Eye}
          color="blue"
        />
        <MetricCard
          label="CTR Médio"
          value={`${totalCtr.toFixed(2)}%`}
          icon={MousePointer}
          color="purple"
        />
        <MetricCard
          label="ROAS Geral"
          value={`${totalRoas.toFixed(1)}x`}
          icon={TrendingUp}
          color="green"
        />
      </div>

      {/* Lista de Campanhas */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-6 flex items-center gap-4">
          <AlertCircle className="w-8 h-8 text-red-400" />
          <div>
            <p className="text-red-300 font-medium">Erro ao carregar campanhas</p>
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
          <Target className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-300">Nenhuma campanha ainda</h3>
          <p className="text-gray-500 mt-2">
            Crie sua primeira campanha usando o Cockpit acima
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {campaigns.map(campaign => (
            <CampaignRow
              key={campaign.id}
              campaign={campaign}
              onToggleStatus={handleToggleStatus}
              isUpdating={updatingCampaign === campaign.meta_campaign_id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
