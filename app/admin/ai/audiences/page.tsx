'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Sparkles, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle,
  Loader2,
  RefreshCw,
  Target,
  Zap,
  Eye,
  Play,
  Instagram,
  Facebook,
  ExternalLink,
  Copy,
  Search,
  Filter,
  Info,
  ChevronDown,
  CloudDownload
} from 'lucide-react';
import { toast } from 'sonner';

// ============================================
// TIPOS
// ============================================

interface Audience {
  id: string;
  meta_audience_id: string;
  template_id?: string;
  name: string;
  audience_type: 'CUSTOM' | 'LOOKALIKE';
  subtype?: string;
  source_type?: string;
  funnel_stage?: 'TOPO' | 'MEIO' | 'FUNDO';
  approximate_size?: number;
  health_status?: string;
  is_essential?: boolean;
  is_system_audience?: boolean;
  use_for_exclusion?: boolean;
  recommended_for?: string[];
  lookalike_ratio?: number;
  retention_days?: number;
  last_health_check?: string;
  time_updated?: string;
}

interface HealthCheck {
  id: string;
  name: string;
  size: number;
  is_healthy: boolean;
  status: string;
  status_description: string;
}

interface AudienceStats {
  total: number;
  custom: number;
  lookalikes: number;
  ready: number;
  filling: number;
  system_created: number;
}

// ============================================
// CONSTANTES
// ============================================

const SYSTEM_PREFIX = '[GDM]';

// ============================================
// COMPONENTES AUXILIARES
// ============================================

function StatusBadge({ status }: { status: string }) {
  const normalizedStatus = status?.toUpperCase() || 'UNKNOWN';
  const config: Record<string, { bg: string; text: string; icon: any; label: string }> = {
    'READY': { bg: 'bg-green-500/20', text: 'text-green-400', icon: CheckCircle, label: 'Pronto' },
    '200': { bg: 'bg-green-500/20', text: 'text-green-400', icon: CheckCircle, label: 'Pronto' },
    'FILLING': { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: Loader2, label: 'Preenchendo' },
    'POPULATING': { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: Loader2, label: 'Preenchendo' },
    'ERROR': { bg: 'bg-red-500/20', text: 'text-red-400', icon: AlertCircle, label: 'Erro' },
    'DELETED': { bg: 'bg-gray-500/20', text: 'text-gray-400', icon: AlertCircle, label: 'Deletado' },
    'UNKNOWN': { bg: 'bg-gray-500/20', text: 'text-gray-400', icon: AlertCircle, label: 'Desconhecido' },
  };

  const { bg, text, icon: Icon, label } = config[normalizedStatus] || config['UNKNOWN'];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${bg} ${text}`}>
      <Icon className={`w-3 h-3 ${normalizedStatus === 'FILLING' || normalizedStatus === 'POPULATING' ? 'animate-spin' : ''}`} />
      {label}
    </span>
  );
}

function FunnelBadge({ stage }: { stage?: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    'TOPO': { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Topo' },
    'MEIO': { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'Meio' },
    'FUNDO': { bg: 'bg-orange-500/20', text: 'text-orange-400', label: 'Fundo' },
  };

  if (!stage) return null;

  const { bg, text, label } = config[stage] || config['MEIO'];

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${bg} ${text}`}>
      {label}
    </span>
  );
}

function TypeBadge({ audience }: { audience: Audience }) {
  const isLookalike = audience.audience_type === 'LOOKALIKE' || audience.subtype === 'LOOKALIKE';
  
  if (isLookalike) {
    const percentage = audience.lookalike_ratio 
      ? `${Math.round(audience.lookalike_ratio * 100)}%` 
      : '';
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
        <TrendingUp className="w-3 h-3" />
        LAL {percentage}
      </span>
    );
  }

  // Para custom audiences, usar subtype se disponível
  const subtypeIcons: Record<string, { icon: any; label: string; color: string }> = {
    'WEBSITE': { icon: Eye, label: 'Website', color: 'blue' },
    'ENGAGEMENT': { icon: Facebook, label: 'Engajamento', color: 'purple' },
    'VIDEO': { icon: Play, label: 'Vídeo', color: 'pink' },
    'IG_BUSINESS': { icon: Instagram, label: 'Instagram', color: 'pink' },
    'CUSTOM': { icon: Users, label: 'Custom', color: 'gray' },
  };

  const config = subtypeIcons[audience.subtype || 'CUSTOM'] || subtypeIcons['CUSTOM'];
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-${config.color}-500/20 text-${config.color}-400`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function AudienceCard({ 
  audience, 
  onCopyId
}: { 
  audience: Audience;
  onCopyId: (id: string) => void;
}) {
  const size = audience.approximate_size || 0;
  const isHealthy = size >= 1000;
  const isSystemCreated = audience.name?.startsWith(SYSTEM_PREFIX) || audience.is_system_audience;
  const isLookalike = audience.audience_type === 'LOOKALIKE' || audience.subtype === 'LOOKALIKE';

  // Determinar ícone baseado no tipo
  const getIcon = () => {
    if (isLookalike) return TrendingUp;
    if (audience.subtype === 'WEBSITE') return Eye;
    if (audience.subtype === 'ENGAGEMENT') return Facebook;
    if (audience.subtype === 'VIDEO') return Play;
    if (audience.subtype === 'IG_BUSINESS') return Instagram;
    return Users;
  };
  const Icon = getIcon();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`
        bg-gray-800/50 rounded-xl p-4 border transition-all hover:bg-gray-800/70
        ${audience.use_for_exclusion 
          ? 'border-red-500/30 hover:border-red-500/50' 
          : isSystemCreated
            ? 'border-purple-500/30 hover:border-purple-500/50'
            : 'border-white/10 hover:border-white/20'}
      `}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`p-2 rounded-lg ${isSystemCreated ? 'bg-purple-500/20' : 'bg-white/5'}`}>
            <Icon className={`w-5 h-5 ${isLookalike ? 'text-green-400' : isSystemCreated ? 'text-purple-400' : 'text-blue-400'}`} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-semibold text-white truncate max-w-md">
                {audience.name}
              </h3>
              {isSystemCreated && (
                <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded-full flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  Sistema
                </span>
              )}
              {audience.is_essential && (
                <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">
                  Essencial
                </span>
              )}
              {audience.use_for_exclusion && (
                <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">
                  Exclusão
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 text-sm text-gray-400 flex-wrap mt-1">
              <span className={`flex items-center gap-1 font-medium ${
                size >= 10000 ? 'text-green-400' :
                size >= 1000 ? 'text-yellow-400' :
                'text-red-400'
              }`}>
                <Users className="w-3.5 h-3.5" />
                {size.toLocaleString('pt-BR')} pessoas
              </span>
              
              {audience.lookalike_ratio && (
                <span className="text-green-400">
                  {(audience.lookalike_ratio * 100).toFixed(0)}% Similar
                </span>
              )}

              <TypeBadge audience={audience} />
              <FunnelBadge stage={audience.funnel_stage} />
            </div>

            {audience.recommended_for && audience.recommended_for.length > 0 && (
              <div className="flex items-center gap-1 mt-2 flex-wrap">
                <span className="text-xs text-gray-500">Recomendado para:</span>
                {audience.recommended_for.map(obj => (
                  <span 
                    key={obj}
                    className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 text-xs rounded"
                  >
                    {obj}
                  </span>
                ))}
              </div>
            )}

            <p className="text-gray-500 text-xs mt-1">
              ID: {audience.id || audience.meta_audience_id}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <StatusBadge status={audience.health_status || 'READY'} />
          
          {!isHealthy && (
            <div className="relative group">
              <AlertCircle className="w-5 h-5 text-yellow-500" />
              <div className="absolute right-0 top-full mt-1 w-48 p-2 bg-gray-900 rounded-lg text-xs text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 border border-white/10">
                Público pequeno. Mínimo recomendado: 1.000 pessoas
              </div>
            </div>
          )}

          <div className="flex items-center gap-1">
            <button
              onClick={() => onCopyId(audience.id || audience.meta_audience_id)}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              title="Copiar ID"
            >
              <Copy className="w-4 h-4" />
            </button>
            <a
              href={`https://business.facebook.com/audiences/${audience.id || audience.meta_audience_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              title="Ver no Meta"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function AudiencesPage() {
  const [audiences, setAudiences] = useState<Audience[]>([]);
  const [stats, setStats] = useState<AudienceStats>({ 
    total: 0, 
    custom: 0, 
    lookalikes: 0, 
    ready: 0, 
    filling: 0,
    system_created: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFunnel, setFilterFunnel] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Carregar públicos
  const loadAudiences = useCallback(async () => {
    try {
      const response = await fetch('/api/meta/audiences');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao carregar públicos');
      }

      // Formatar dados
      const formattedAudiences: Audience[] = (data.audiences || []).map((a: any) => ({
        id: a.id,
        meta_audience_id: a.id,
        template_id: a.template_id,
        name: a.name,
        audience_type: a.subtype === 'LOOKALIKE' ? 'LOOKALIKE' : 'CUSTOM',
        subtype: a.subtype,
        approximate_size: a.approximate_count,
        health_status: a.isReady ? 'READY' : 'FILLING',
        is_essential: a.is_essential,
        is_system_audience: a.name?.startsWith(SYSTEM_PREFIX),
        lookalike_ratio: a.lookalike_spec?.ratio,
        time_updated: a.time_updated,
        // Inferir estágio do funil baseado no nome
        funnel_stage: a.name?.includes('[T]') ? 'TOPO' : 
                     a.name?.includes('[M]') ? 'MEIO' : 
                     a.name?.includes('[F]') ? 'FUNDO' : 
                     a.subtype === 'LOOKALIKE' ? 'TOPO' : undefined
      }));

      setAudiences(formattedAudiences);
      
      // Calcular estatísticas
      const systemAudiences = formattedAudiences.filter(a => a.name?.startsWith(SYSTEM_PREFIX));
      const systemCreated = systemAudiences.length;
      
      // Debug log para verificar públicos [GDM]
      console.log(`📊 [GDM] Públicos carregados: ${formattedAudiences.length} total, ${systemCreated} [GDM]`);
      console.log('📋 Lista [GDM]:', systemAudiences.map(a => a.name));
      
      setStats({
        total: formattedAudiences.length,
        custom: formattedAudiences.filter(a => a.audience_type === 'CUSTOM').length,
        lookalikes: formattedAudiences.filter(a => a.audience_type === 'LOOKALIKE').length,
        ready: formattedAudiences.filter(a => (a.approximate_size || 0) >= 1000).length,
        filling: formattedAudiences.filter(a => (a.approximate_size || 0) < 1000).length,
        system_created: systemCreated
      });

    } catch (error: any) {
      console.error('Erro ao carregar públicos:', error);
      toast.error(error.message || 'Erro ao carregar públicos');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Criar públicos essenciais
  const handleCreateEssentials = async () => {
    setIsCreating(true);

    try {
      const response = await fetch('/api/meta/audiences/create-essentials', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar públicos');
      }

      const { summary } = data;
      
      toast.success(
        `✅ ${summary.audiences_created} públicos criados, ${summary.lookalikes_created} lookalikes!`,
        {
          description: summary.skipped > 0 
            ? `${summary.skipped} já existiam` 
            : 'Todos os públicos essenciais foram criados com nomenclatura padronizada [GDM]'
        }
      );

      // Recarregar lista
      await loadAudiences();

    } catch (error: any) {
      console.error('Erro ao criar públicos:', error);
      toast.error(error.message || 'Erro ao criar públicos');
    } finally {
      setIsCreating(false);
    }
  };

  // Health check
  const handleHealthCheck = async () => {
    setIsRefreshing(true);

    try {
      const response = await fetch('/api/meta/audiences/health-check');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao verificar saúde');
      }

      toast.success(
        `✅ ${data.summary.healthy}/${data.summary.total} públicos saudáveis`
      );

      // Recarregar lista para atualizar dados
      await loadAudiences();

    } catch (error: any) {
      console.error('Erro no health check:', error);
      toast.error(error.message || 'Erro ao verificar saúde');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Sincronizar públicos existentes da Meta
  const handleSyncFromMeta = async () => {
    setIsSyncing(true);

    try {
      const response = await fetch('/api/meta/audiences/sync-sizes', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao sincronizar');
      }

      if (data.summary?.updated > 0) {
        toast.success(
          `✅ ${data.summary.updated} públicos atualizados!`,
          {
            description: `Tamanhos sincronizados com a Meta API`
          }
        );
      } else {
        toast.info('Nenhuma atualização necessária', {
          description: `${data.summary?.total_in_meta || 0} públicos na Meta, ${data.summary?.skipped || 0} ignorados`
        });
      }

      // Recarregar lista para mostrar novos dados
      await loadAudiences();

    } catch (error: any) {
      console.error('Erro ao sincronizar:', error);
      toast.error(error.message || 'Erro ao sincronizar com Meta');
    } finally {
      setIsSyncing(false);
    }
  };

  // Copiar ID
  const copyId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success('ID copiado!');
  };

  // Carregar ao montar
  useEffect(() => {
    loadAudiences();
  }, [loadAudiences]);

  // Filtrar públicos
  const filteredAudiences = audiences.filter(a => {
    // Filtro de busca
    if (searchTerm && !a.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    // Filtro de funil
    if (filterFunnel && a.funnel_stage !== filterFunnel) return false;
    // Filtro de tipo
    if (filterType === 'LOOKALIKE' && a.audience_type !== 'LOOKALIKE') return false;
    if (filterType === 'CUSTOM' && a.audience_type !== 'CUSTOM') return false;
    if (filterType === 'SYSTEM' && !a.name?.startsWith(SYSTEM_PREFIX)) return false;
    return true;
  });

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30">
            <Users className="w-8 h-8 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Públicos Meta Ads</h1>
            <p className="text-sm text-gray-400">
              Gerencie Custom Audiences e Lookalikes com IA
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadAudiences()}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleSyncFromMeta}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all disabled:opacity-50"
            title="Sincronizar públicos existentes da Meta"
          >
            {isSyncing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CloudDownload className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">{isSyncing ? 'Sincronizando...' : 'Sincronizar'}</span>
          </button>

          <button
            onClick={handleHealthCheck}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all disabled:opacity-50"
          >
            <Target className={`w-4 h-4 ${isRefreshing ? 'animate-pulse' : ''}`} />
            <span className="hidden sm:inline">Health Check</span>
          </button>

          <button
            onClick={handleCreateEssentials}
            disabled={isCreating}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-medium transition-all disabled:opacity-50"
          >
            {isCreating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {isCreating ? 'Criando...' : 'Criar Essenciais'}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total', value: stats.total, icon: Users, color: 'blue' },
          { label: 'Personalizados', value: stats.custom, icon: Target, color: 'purple' },
          { label: 'Lookalikes', value: stats.lookalikes, icon: TrendingUp, color: 'green' },
          { label: 'Prontos', value: stats.ready, icon: CheckCircle, color: 'emerald' },
          { label: 'Preenchendo', value: stats.filling, icon: Loader2, color: 'yellow' },
          { label: 'Sistema [GDM]', value: stats.system_created, icon: Zap, color: 'pink' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-gray-800/50 rounded-xl p-3 border border-white/10"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-gray-400 text-xs">{stat.label}</span>
              <stat.icon className={`w-4 h-4 text-${stat.color}-400`} />
            </div>
            <div className="text-xl font-bold text-white">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="bg-gray-800/30 rounded-xl p-4 border border-white/10">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar público..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all ${
              showFilters || filterFunnel || filterType
                ? 'bg-purple-500/20 border-purple-500/30 text-purple-400'
                : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filtros
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Filter Options */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-4 flex flex-wrap items-center gap-4">
                <span className="text-sm text-gray-400">Funil:</span>
                <div className="flex items-center gap-2">
                  {['TOPO', 'MEIO', 'FUNDO'].map(stage => (
                    <button
                      key={stage}
                      onClick={() => setFilterFunnel(filterFunnel === stage ? null : stage)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        filterFunnel === stage
                          ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                          : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-transparent'
                      }`}
                    >
                      {stage}
                    </button>
                  ))}
                </div>

                <div className="h-6 w-px bg-white/10" />

                <span className="text-sm text-gray-400">Tipo:</span>
                <div className="flex items-center gap-2">
                  {[
                    { value: 'CUSTOM', label: 'Personalizados' },
                    { value: 'LOOKALIKE', label: 'Lookalikes' },
                    { value: 'SYSTEM', label: '[GDM] Sistema' },
                  ].map(type => (
                    <button
                      key={type.value}
                      onClick={() => setFilterType(filterType === type.value ? null : type.value)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        filterType === type.value
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-transparent'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>

                {(filterFunnel || filterType) && (
                  <button
                    onClick={() => { setFilterFunnel(null); setFilterType(null); }}
                    className="text-sm text-red-400 hover:text-red-300 ml-auto"
                  >
                    Limpar filtros
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Lista de Públicos */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
        </div>
      ) : filteredAudiences.length === 0 ? (
        <div className="bg-gray-800/50 rounded-xl p-12 text-center border border-white/10">
          <Users className="w-16 h-16 mx-auto text-gray-600 mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">
            {audiences.length === 0 ? 'Nenhum público encontrado' : 'Nenhum resultado'}
          </h3>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            {audiences.length === 0 
              ? 'Crie automaticamente os públicos essenciais para suas campanhas de remarketing e aquisição.'
              : 'Tente ajustar os filtros ou termo de busca.'
            }
          </p>
          {audiences.length === 0 && (
            <button
              onClick={handleCreateEssentials}
              disabled={isCreating}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-white font-medium"
            >
              <Sparkles className="w-5 h-5" />
              Criar Públicos Essenciais
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filteredAudiences.map((audience) => (
              <AudienceCard
                key={audience.id || audience.meta_audience_id}
                audience={audience}
                onCopyId={copyId}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Info Box - Convenção de Nomenclatura */}
      <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-xl p-6 border border-purple-500/20">
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <Info className="w-5 h-5 text-blue-400" />
          Convenção de Nomenclatura [GDM]
        </h3>
        <p className="text-gray-400 text-sm mb-4">
          Públicos criados pelo sistema seguem o padrão: <code className="bg-gray-800 px-2 py-0.5 rounded text-purple-400">[GDM] [F] TIPO - Descrição</code>
        </p>
        <div className="grid sm:grid-cols-3 gap-4 text-sm">
          <div className="space-y-2">
            <h4 className="font-medium text-purple-400">🎯 [F] Fundo de Funil</h4>
            <ul className="text-gray-400 space-y-1">
              <li>• <code className="text-xs">[GDM] [F] WEB - Visitantes 30d</code></li>
              <li>• <code className="text-xs">[GDM] [F] WEB - Checkout 30d</code></li>
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium text-blue-400">📱 [M] Meio de Funil</h4>
            <ul className="text-gray-400 space-y-1">
              <li>• <code className="text-xs">[GDM] [M] ENG - Facebook 365d</code></li>
              <li>• <code className="text-xs">[GDM] [M] ENG - Instagram 365d</code></li>
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium text-green-400">🚀 [T] Topo de Funil</h4>
            <ul className="text-gray-400 space-y-1">
              <li>• <code className="text-xs">[GDM] [T] LAL - Compradores 1%</code></li>
              <li>• <code className="text-xs">[GDM] [T] LAL - Checkout 3%</code></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Info sobre públicos essenciais */}
      <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 rounded-xl p-6 border border-yellow-500/20">
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-400" />
          Públicos Essenciais Criados Automaticamente
        </h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div className="space-y-2">
            <h4 className="font-medium text-orange-400">🎯 Remarketing (Fundo)</h4>
            <ul className="text-gray-400 space-y-1">
              <li>• Visitantes 7/30/180 dias</li>
              <li>• Abandonou Checkout 30d</li>
              <li>• Adicionou ao Carrinho 30d</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium text-blue-400">📱 Engajamento (Meio)</h4>
            <ul className="text-gray-400 space-y-1">
              <li>• Engajou no Facebook 365d</li>
              <li>• Engajou no Instagram 365d</li>
              <li>• Assistiu Vídeos 75%+</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium text-green-400">🚀 Aquisição (Topo)</h4>
            <ul className="text-gray-400 space-y-1">
              <li>• Lookalike Compradores 1-5%</li>
              <li>• Lookalike Checkout 1%</li>
              <li>• Lookalike Engajamento IG</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
