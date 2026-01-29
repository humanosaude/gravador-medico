'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { calculateAdsMetrics, CampaignInsight, AdsMetrics, ACTION_TYPES, sumActions, sumActionValues } from '@/lib/meta-marketing';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DollarSign, MousePointerClick, Eye, Users, TrendingUp, AlertCircle, 
  RefreshCw, Megaphone, Target, BarChart3, Zap, Filter, ArrowUpDown,
  PlayCircle, ExternalLink, ShoppingCart, Facebook, Layers, Image, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Interface para dados de vendas do Supabase
interface SalesData {
  totalSales: number;
  totalValue: number;
  approvedSales: number;
  approvedValue: number;
}

// Função para calcular datas baseado no período do Facebook
function getDateRangeFromPeriod(period: string): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  
  let start = new Date(now);
  start.setHours(0, 0, 0, 0);

  switch (period) {
    case 'today':
      // start já está em hoje às 00:00
      break;
    case 'yesterday':
      start.setDate(start.getDate() - 1);
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      break;
    case 'last_7d':
      start.setDate(start.getDate() - 6); // Inclui hoje = 7 dias
      break;
    case 'last_14d':
      start.setDate(start.getDate() - 13);
      break;
    case 'last_30d':
      start.setDate(start.getDate() - 29);
      break;
    case 'this_month':
      start.setDate(1);
      break;
    case 'last_month':
      start.setMonth(start.getMonth() - 1);
      start.setDate(1);
      end.setDate(0); // Último dia do mês anterior
      break;
    case 'maximum':
      start = new Date('2020-01-01');
      break;
    default:
      start.setDate(start.getDate() - 6);
  }

  return { start, end };
}

// Tipo para níveis de análise
type InsightLevel = 'campaign' | 'adset' | 'ad';

// Formatar moeda BRL
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

// Formatar número com separador de milhar
const formatNumber = (value: number) => {
  return new Intl.NumberFormat('pt-BR').format(Math.round(value));
};

// Formatar percentual
const formatPercent = (value: number) => {
  return `${value.toFixed(2)}%`;
};

// Indicador de Performance baseado no CTR
const PerformanceIndicator = ({ ctr }: { ctr: number }) => {
  if (ctr >= 1.5) return <span title="CTR excelente (>1.5%)">🔥</span>;
  if (ctr <= 0.5) return <span title="CTR baixo (<0.5%)">❄️</span>;
  return null;
};

// Empty State Component
const EmptyState = ({ type, total, selectedPeriod, statusFilter }: { 
  type: 'campaign' | 'adset' | 'ad';
  total: number;
  selectedPeriod: string;
  statusFilter: string;
}) => {
  const labels = {
    campaign: { singular: 'campanha', plural: 'campanhas' },
    adset: { singular: 'conjunto', plural: 'conjuntos' },
    ad: { singular: 'anúncio', plural: 'anúncios' }
  };
  
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <div className="p-4 rounded-full bg-gray-800/50 mb-6">
        <AlertCircle className="h-12 w-12 text-gray-500" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">
        {total === 0 
          ? (selectedPeriod === 'today' ? 'Dados de hoje ainda não disponíveis' : `Nenhum ${labels[type].singular} encontrado`)
          : `Nenhum ${labels[type].singular} ${statusFilter !== 'all' ? statusFilter : ''} encontrado`}
      </h3>
      <p className="text-gray-400 max-w-md mb-6">
        {total === 0 
          ? (selectedPeriod === 'today' 
            ? 'O Facebook pode levar até 24 horas para processar os dados do dia atual.'
            : `Não há dados de ${labels[type].plural} para o período selecionado.`)
          : 'Tente alterar os filtros para ver mais resultados.'}
      </p>
      <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
        <Zap className="h-4 w-4 text-blue-400" />
        <span className="text-sm text-blue-300">
          {selectedPeriod === 'today' ? 'Selecione "Ontem" para ver os dados mais recentes' : `Tente outro período`}
        </span>
      </div>
    </motion.div>
  );
};

// Glass Card Component (igual ao Analytics)
const GlassCard = ({ children, className = '', gradient = false }: { children: React.ReactNode; className?: string; gradient?: boolean }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-800/40 to-gray-900/60 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/20 hover:shadow-blue-500/10 hover:border-blue-500/20 transition-all duration-500 ${gradient ? 'before:absolute before:inset-0 before:bg-gradient-to-br before:from-blue-500/10 before:to-transparent before:pointer-events-none' : ''} ${className}`}
  >
    {children}
  </motion.div>
);

// Animated Number Component
const AnimatedNumber = ({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) => (
  <AnimatePresence mode="wait">
    <motion.span 
      key={value} 
      initial={{ opacity: 0, y: -20 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: 20 }} 
      className="tabular-nums"
    >
      {prefix}{value >= 1000000 ? (value / 1000000).toFixed(1) + 'M' : value >= 1000 ? (value / 1000).toFixed(1) + 'K' : value.toFixed(value < 10 ? 2 : 0)}{suffix}
    </motion.span>
  </AnimatePresence>
);

// Badge de status da campanha
function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    ACTIVE: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Ativa' },
    PAUSED: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Pausada' },
    DELETED: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Excluída' },
    ARCHIVED: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'Arquivada' },
    CAMPAIGN_PAUSED: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Pausada' },
    IN_PROCESS: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Processando' },
    WITH_ISSUES: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Com Problemas' },
    UNKNOWN: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'Desconhecido' },
  };

  const config = statusConfig[status] || statusConfig.UNKNOWN;
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

// Opções de período (compatíveis com Facebook Ads API date_preset)
const periodOptions = [
  { value: 'today', label: 'Hoje' },
  { value: 'yesterday', label: 'Ontem' },
  { value: 'last_7d', label: 'Últimos 7 dias' },
  { value: 'last_14d', label: 'Últimos 14 dias' },
  { value: 'last_30d', label: 'Últimos 30 dias' },
  { value: 'this_month', label: 'Este mês' },
  { value: 'last_month', label: 'Mês passado' },
  { value: 'maximum', label: 'Todo período' },
];

// Opções de filtro por status
const statusFilterOptions = [
  { value: 'all', label: 'Todas' },
  { value: 'active', label: 'Ativas' },
  { value: 'paused', label: 'Pausadas' },
  { value: 'archived', label: 'Arquivadas' },
];

// Opções de ordenação
const sortOptions = [
  { value: 'spend_desc', label: 'Maior gasto' },
  { value: 'spend_asc', label: 'Menor gasto' },
  { value: 'date_desc', label: 'Mais recentes' },
  { value: 'date_asc', label: 'Mais antigas' },
  { value: 'clicks_desc', label: 'Mais cliques' },
  { value: 'ctr_desc', label: 'Melhor CTR' },
];

export default function AdsPage() {
  const [metrics, setMetrics] = useState<AdsMetrics | null>(null);
  const [allCampaigns, setAllCampaigns] = useState<CampaignInsight[]>([]);
  const [adsets, setAdsets] = useState<CampaignInsight[]>([]);
  const [ads, setAds] = useState<CampaignInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAdsets, setLoadingAdsets] = useState(false);
  const [loadingAds, setLoadingAds] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [selectedPeriod, setSelectedPeriod] = useState('last_7d');
  
  // Estado para vendas reais do Supabase
  const [realSales, setRealSales] = useState<SalesData | null>(null);
  
  // Estados para gastos do dia e do mês
  const [spendToday, setSpendToday] = useState<number>(0);
  const [spendMonth, setSpendMonth] = useState<number>(0);
  
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date_desc');
  const [activeTab, setActiveTab] = useState<InsightLevel>('campaign');

  // Fetch data por nível
  const fetchLevelData = useCallback(async (level: InsightLevel, period: string) => {
    const params = new URLSearchParams({ period, level });
    if (level !== 'campaign') {
      params.set('include_status', '1');
    }
    const res = await fetch(`/api/ads/insights?${params.toString()}`);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  }, []);

  // Buscar vendas reais do Supabase para o período
  const fetchRealSales = useCallback(async (period: string) => {
    try {
      const { start, end } = getDateRangeFromPeriod(period);
      const params = new URLSearchParams({
        start: start.toISOString(),
        end: end.toISOString(),
        limit: '1000'
      });
      
      const res = await fetch(`/api/admin/sales?${params.toString()}`, {
        credentials: 'include'
      });
      
      if (!res.ok) {
        console.error('Erro ao buscar vendas reais');
        return;
      }
      
      const data = await res.json();
      const sales = Array.isArray(data) ? data : (data.sales || []);
      
      // Filtrar apenas vendas (não tentativas falhas)
      const actualSales = sales.filter((s: any) => s.source === 'sale' || !s.source);
      
      // Calcular totais
      const approvedStatuses = ['paid', 'approved', 'captured', 'completed'];
      const approved = actualSales.filter((s: any) => 
        approvedStatuses.includes((s.status || '').toLowerCase())
      );
      
      setRealSales({
        totalSales: actualSales.length,
        totalValue: actualSales.reduce((sum: number, s: any) => sum + Number(s.total_amount || 0), 0),
        approvedSales: approved.length,
        approvedValue: approved.reduce((sum: number, s: any) => sum + Number(s.total_amount || 0), 0)
      });
    } catch (error) {
      console.error('Erro ao buscar vendas reais:', error);
    }
  }, []);

  // Buscar gastos de hoje e do mês (sempre, independente do período selecionado)
  const fetchSpendSummary = useCallback(async () => {
    try {
      // Buscar gasto de hoje
      const todayData = await fetchLevelData('campaign', 'today');
      const todaySpend = todayData.reduce((sum: number, c: CampaignInsight) => sum + Number(c.spend || 0), 0);
      setSpendToday(todaySpend);
      
      // Buscar gasto do mês
      const monthData = await fetchLevelData('campaign', 'this_month');
      const monthSpend = monthData.reduce((sum: number, c: CampaignInsight) => sum + Number(c.spend || 0), 0);
      setSpendMonth(monthSpend);
    } catch (error) {
      console.error('Erro ao buscar resumo de gastos:', error);
    }
  }, [fetchLevelData]);

  const fetchData = useCallback(async (showRefresh = false, period = selectedPeriod) => {
    if (showRefresh) setRefreshing(true);
    try {
      // Buscar campanhas do Facebook, vendas reais e resumo de gastos em paralelo
      const [campaigns] = await Promise.all([
        fetchLevelData('campaign', period),
        fetchRealSales(period),
        fetchSpendSummary()
      ]);
      
      setAllCampaigns(campaigns);
      const calculatedMetrics = calculateAdsMetrics(campaigns);
      setMetrics(calculatedMetrics);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Erro ao carregar dados de anúncios:', error);
      setAllCampaigns([]);
      setMetrics({
        totalSpend: 0,
        totalClicks: 0,
        totalImpressions: 0,
        totalReach: 0,
        avgCpc: 0,
        avgCtr: 0,
        totalVideoViews: 0,
        totalOutboundClicks: 0,
        totalPurchases: 0,
        totalPurchaseValue: 0,
        totalLeads: 0,
        totalCheckoutComplete: 0,
        cpl: 0,
        costPerCheckout: 0,
        roas: 0,
        cpa: 0,
        campaigns: []
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedPeriod, fetchLevelData, fetchRealSales, fetchSpendSummary]);

  // Carregar adsets quando tab mudar
  const fetchAdsets = useCallback(async () => {
    if (adsets.length > 0 && !refreshing) return; // Já carregado
    setLoadingAdsets(true);
    try {
      const data = await fetchLevelData('adset', selectedPeriod);
      setAdsets(data);
    } catch (error) {
      console.error('Erro ao carregar conjuntos:', error);
    } finally {
      setLoadingAdsets(false);
    }
  }, [fetchLevelData, selectedPeriod, adsets.length, refreshing]);

  // Carregar ads quando tab mudar
  const fetchAds = useCallback(async () => {
    if (ads.length > 0 && !refreshing) return; // Já carregado
    setLoadingAds(true);
    try {
      const data = await fetchLevelData('ad', selectedPeriod);
      setAds(data);
    } catch (error) {
      console.error('Erro ao carregar anúncios:', error);
    } finally {
      setLoadingAds(false);
    }
  }, [fetchLevelData, selectedPeriod, ads.length, refreshing]);

  // Handler de mudança de tab
  const handleTabChange = useCallback((value: string) => {
    const level = value as InsightLevel;
    setActiveTab(level);
    
    if (level === 'adset') {
      fetchAdsets();
    } else if (level === 'ad') {
      fetchAds();
    }
  }, [fetchAdsets, fetchAds]);

  useEffect(() => {
    fetchData(false, selectedPeriod);
    // Limpar dados de níveis secundários quando período muda
    setAdsets([]);
    setAds([]);
  }, [selectedPeriod]);

  useEffect(() => {
    // Atualizar a cada 5 minutos
    const interval = setInterval(() => fetchData(), 300000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Filtrar campanhas (para métricas e lista)
  const filteredCampaigns = useMemo(() => {
    if (!allCampaigns.length) return [];
    
    let result = [...allCampaigns];
    
    // Filtrar por status (usando effective_status enriquecido da API)
    if (statusFilter !== 'all') {
      result = result.filter(campaign => {
        const campaignStatus = (campaign as any).effective_status || 'UNKNOWN';
        const normalizedStatus = campaignStatus.toUpperCase();
        
        switch (statusFilter) {
          case 'active':
            return normalizedStatus === 'ACTIVE';
          case 'paused':
            return normalizedStatus === 'PAUSED';
          case 'archived':
            return normalizedStatus === 'ARCHIVED';
          default:
            return true;
        }
      });
    }
    
    return result;
  }, [allCampaigns, statusFilter]);

  // Ordenar campanhas filtradas
  const filteredAndSortedCampaigns = useMemo(() => {
    let result = [...filteredCampaigns];
    
    // Ordenar (os dados já vêm ordenados por created_time da API, mas podemos reordenar)
    result.sort((a, b) => {
      switch (sortBy) {
        case 'spend_desc':
          return Number(b.spend || 0) - Number(a.spend || 0);
        case 'spend_asc':
          return Number(a.spend || 0) - Number(b.spend || 0);
        case 'date_desc': {
          // Usar created_time enriquecido da API
          const dateA = (a as any).created_time || a.date_start || '';
          const dateB = (b as any).created_time || b.date_start || '';
          return dateB.localeCompare(dateA);
        }
        case 'date_asc': {
          const dateA = (a as any).created_time || a.date_start || '';
          const dateB = (b as any).created_time || b.date_start || '';
          return dateA.localeCompare(dateB);
        }
        case 'clicks_desc':
          return Number(b.clicks || 0) - Number(a.clicks || 0);
        case 'ctr_desc':
          return Number(b.ctr || 0) - Number(a.ctr || 0);
        default:
          return Number(b.spend || 0) - Number(a.spend || 0);
      }
    });
    
    return result;
  }, [filteredCampaigns, sortBy]);

  // Métricas exibidas respeitando filtro de status
  const displayMetrics = useMemo(() => {
    return calculateAdsMetrics(filteredCampaigns);
  }, [filteredCampaigns]);

  // Filtrar e ordenar adsets
  const filteredAndSortedAdsets = useMemo(() => {
    if (!adsets || adsets.length === 0) return [];
    
    let result = [...adsets];

    if (statusFilter !== 'all') {
      result = result.filter(adset => {
        const status = ((adset as any).effective_status || (adset as any).status || 'UNKNOWN').toUpperCase();
        if (statusFilter === 'active') return status === 'ACTIVE';
        if (statusFilter === 'paused') return status === 'PAUSED';
        if (statusFilter === 'archived') return status === 'ARCHIVED';
        return true;
      });
    }
    
    // Ordenar
    result.sort((a, b) => {
      switch (sortBy) {
        case 'spend_desc':
          return Number(b.spend || 0) - Number(a.spend || 0);
        case 'spend_asc':
          return Number(a.spend || 0) - Number(b.spend || 0);
        case 'clicks_desc':
          return Number(b.clicks || 0) - Number(a.clicks || 0);
        case 'ctr_desc':
          return Number(b.ctr || 0) - Number(a.ctr || 0);
        default:
          return Number(b.spend || 0) - Number(a.spend || 0);
      }
    });
    
    return result;
  }, [adsets, sortBy, statusFilter]);

  // Filtrar e ordenar ads
  const filteredAndSortedAds = useMemo(() => {
    if (!ads || ads.length === 0) return [];
    
    let result = [...ads];

    if (statusFilter !== 'all') {
      result = result.filter(ad => {
        const status = ((ad as any).effective_status || (ad as any).status || 'UNKNOWN').toUpperCase();
        if (statusFilter === 'active') return status === 'ACTIVE';
        if (statusFilter === 'paused') return status === 'PAUSED';
        if (statusFilter === 'archived') return status === 'ARCHIVED';
        return true;
      });
    }
    
    // Ordenar
    result.sort((a, b) => {
      switch (sortBy) {
        case 'spend_desc':
          return Number(b.spend || 0) - Number(a.spend || 0);
        case 'spend_asc':
          return Number(a.spend || 0) - Number(b.spend || 0);
        case 'clicks_desc':
          return Number(b.clicks || 0) - Number(a.clicks || 0);
        case 'ctr_desc':
          return Number(b.ctr || 0) - Number(a.ctr || 0);
        default:
          return Number(b.spend || 0) - Number(a.spend || 0);
      }
    });
    
    return result;
  }, [ads, sortBy, statusFilter]);

  // Encontrar o melhor anúncio (maior CTR com pelo menos 100 impressões)
  const bestAdId = useMemo(() => {
    if (!filteredAndSortedAds || filteredAndSortedAds.length === 0) return null;
    
    const qualifiedAds = filteredAndSortedAds.filter(ad => Number(ad.impressions || 0) >= 100);
    if (qualifiedAds.length === 0) return null;
    
    const best = qualifiedAds.reduce((best, ad) => 
      Number(ad.ctr || 0) > Number(best.ctr || 0) ? ad : best
    );
    
    return best.ad_id || null;
  }, [filteredAndSortedAds]);

  const kpiCards = [
    { 
      title: 'Investimento Total', 
      value: displayMetrics?.totalSpend || 0, 
      icon: DollarSign, 
      color: 'from-green-500 to-emerald-600',
      format: 'currency'
    },
    { 
      title: 'ROAS', 
      value: displayMetrics?.roas || 0, 
      icon: TrendingUp, 
      color: 'from-purple-500 to-violet-600',
      format: 'roas'
    },
    { 
      title: 'CPA', 
      value: displayMetrics?.cpa || 0, 
      icon: ShoppingCart, 
      color: 'from-pink-500 to-rose-600',
      format: 'currency'
    },
    { 
      title: 'CTR Médio', 
      value: displayMetrics?.avgCtr || 0, 
      icon: Target, 
      color: 'from-orange-500 to-amber-600',
      format: 'percent'
    },
  ];

  const funnelCards = [
    { 
      title: 'Impressões', 
      value: displayMetrics?.totalImpressions || 0, 
      icon: Eye, 
      color: 'text-gray-400',
      description: 'Vezes que apareceu'
    },
    { 
      title: 'Cliques no Link', 
      value: displayMetrics?.totalClicks || 0, 
      icon: MousePointerClick, 
      color: 'text-blue-400',
      description: 'Interessados'
    },
    { 
      title: 'Cliques de Saída', 
      value: displayMetrics?.totalOutboundClicks || 0, 
      icon: ExternalLink, 
      color: 'text-cyan-400',
      description: 'Saíram do FB'
    },
    { 
      title: 'CPC Médio', 
      value: displayMetrics?.avgCpc || 0, 
      icon: DollarSign, 
      color: 'text-green-400',
      description: 'Custo por clique',
      isCurrency: true
    },
  ];

  const engagementCards = [
    { 
      title: 'Alcance', 
      value: displayMetrics?.totalReach || 0, 
      icon: Users, 
      color: 'text-indigo-400'
    },
    { 
      title: 'Video Views', 
      value: displayMetrics?.totalVideoViews || 0, 
      icon: PlayCircle, 
      color: 'text-red-400'
    },
    { 
      title: 'Compras (Pixel)', 
      value: displayMetrics?.totalPurchases || 0, 
      icon: ShoppingCart, 
      color: 'text-emerald-400',
      description: 'Dados do Facebook Pixel'
    },
    { 
      title: 'Valor Pixel', 
      value: displayMetrics?.totalPurchaseValue || 0, 
      icon: DollarSign, 
      color: 'text-yellow-400',
      isCurrency: true,
      description: 'Dados do Facebook Pixel'
    },
  ];

  // Cards de vendas reais (Supabase)
  const realSalesCards = [
    { 
      title: 'Vendas Reais', 
      value: realSales?.approvedSales || 0, 
      icon: ShoppingCart, 
      color: 'text-emerald-400',
      description: 'Vendas aprovadas no período'
    },
    { 
      title: 'Receita Real', 
      value: realSales?.approvedValue || 0, 
      icon: DollarSign, 
      color: 'text-green-400',
      isCurrency: true,
      description: 'Valor das vendas aprovadas'
    },
  ];

  // Cards de conversão (Meta Ads)
  const conversionCards = [
    { 
      title: 'Leads', 
      value: displayMetrics?.totalLeads || 0, 
      icon: Target, 
      color: 'text-pink-400',
      description: 'Leads captados'
    },
    { 
      title: 'CPL', 
      value: displayMetrics?.cpl || 0, 
      icon: DollarSign, 
      color: 'text-orange-400',
      isCurrency: true,
      description: 'Custo por lead'
    },
    { 
      title: 'Finalizações', 
      value: displayMetrics?.totalCheckoutComplete || 0, 
      icon: Zap, 
      color: 'text-purple-400',
      description: 'Início de checkout'
    },
  ];

  // ROAS Real calculado com vendas reais
  const realRoas = displayMetrics?.totalSpend && realSales?.approvedValue 
    ? (realSales.approvedValue / displayMetrics.totalSpend) 
    : 0;

  // CPA Real
  const realCpa = realSales?.approvedSales && displayMetrics?.totalSpend 
    ? (displayMetrics.totalSpend / realSales.approvedSales) 
    : 0;

  // ROI Real = ((Receita - Investimento) / Investimento) * 100
  const realROI = displayMetrics?.totalSpend && displayMetrics.totalSpend > 0 && realSales?.approvedValue
    ? ((realSales.approvedValue - displayMetrics.totalSpend) / displayMetrics.totalSpend) * 100
    : 0;

  // ROI do dia (gasto hoje vs vendas hoje)
  const [salesToday, setSalesToday] = useState<SalesData | null>(null);
  
  // Buscar vendas de hoje para ROI do dia
  useEffect(() => {
    const fetchSalesToday = async () => {
      try {
        const { start, end } = getDateRangeFromPeriod('today');
        
        // Log para debug - remover depois
        console.log('📅 Buscando vendas de hoje:', {
          start: start.toISOString(),
          end: end.toISOString(),
          startLocal: start.toLocaleString('pt-BR'),
          endLocal: end.toLocaleString('pt-BR')
        });
        
        const params = new URLSearchParams({
          start: start.toISOString(),
          end: end.toISOString(),
          limit: '1000'
        });
        
        const res = await fetch(`/api/admin/sales?${params.toString()}`, {
          credentials: 'include'
        });
        
        if (!res.ok) return;
        
        const data = await res.json();
        const sales = Array.isArray(data) ? data : (data.sales || []);
        
        // Log para debug
        console.log('📊 Vendas encontradas hoje:', sales.length);
        
        const actualSales = sales.filter((s: any) => s.source === 'sale' || !s.source);
        const approvedStatuses = ['paid', 'approved', 'captured', 'completed'];
        const approved = actualSales.filter((s: any) => 
          approvedStatuses.includes((s.status || '').toLowerCase())
        );
        
        console.log('✅ Vendas aprovadas hoje:', approved.length, 'Total:', approved.reduce((sum: number, s: any) => sum + Number(s.total_amount || 0), 0));
        
        setSalesToday({
          totalSales: actualSales.length,
          totalValue: actualSales.reduce((sum: number, s: any) => sum + Number(s.total_amount || 0), 0),
          approvedSales: approved.length,
          approvedValue: approved.reduce((sum: number, s: any) => sum + Number(s.total_amount || 0), 0)
        });
      } catch (error) {
        console.error('Erro ao buscar vendas de hoje:', error);
      }
    };
    
    fetchSalesToday();
  }, []);

  // ROI do dia
  const roiToday = spendToday > 0 && salesToday?.approvedValue
    ? ((salesToday.approvedValue - spendToday) / spendToday) * 100
    : 0;

  return (
    <div className="p-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between mb-8"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/25">
            <Facebook className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Meta Ads</h1>
            <p className="text-gray-400 mt-1">
              Performance das campanhas ({periodOptions.find(p => p.value === selectedPeriod)?.label})
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 mt-4 md:mt-0">
          {/* Seletor de Período */}
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
            style={{ backgroundImage: 'none' }}
          >
            {periodOptions.map((option) => (
              <option key={option.value} value={option.value} className="bg-gray-800 text-white">
                {option.label}
              </option>
            ))}
          </select>

          {/* Filtro por Status */}
          <div className="flex items-center gap-1.5">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
              style={{ backgroundImage: 'none' }}
            >
              {statusFilterOptions.map((option) => (
                <option key={option.value} value={option.value} className="bg-gray-800 text-white">
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Ordenação */}
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="h-4 w-4 text-gray-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
              style={{ backgroundImage: 'none' }}
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value} className="bg-gray-800 text-white">
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          
          <span className="text-sm text-gray-500 hidden md:block">
            Atualizado: {lastUpdate.toLocaleTimeString('pt-BR')}
          </span>
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </motion.div>

      {/* ROI Cards em Destaque */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.05 }}
          className={`relative overflow-hidden rounded-2xl p-6 ${
            roiToday >= 0 
              ? 'bg-gradient-to-br from-green-600/30 to-emerald-700/30 border-2 border-green-500/40' 
              : 'bg-gradient-to-br from-red-600/30 to-rose-700/30 border-2 border-red-500/40'
          }`}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl ${roiToday >= 0 ? 'bg-green-500/30' : 'bg-red-500/30'}`}>
                  <TrendingUp className={`h-5 w-5 ${roiToday >= 0 ? 'text-green-400' : 'text-red-400'}`} />
                </div>
                <span className={`text-lg font-semibold ${roiToday >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                  ROI do Dia
                </span>
              </div>
              <span className="text-xs text-gray-400">Hoje</span>
            </div>
            <div className={`text-4xl font-bold ${roiToday >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {loading ? <Skeleton className="h-10 w-32 bg-white/10" /> : `${roiToday >= 0 ? '+' : ''}${roiToday.toFixed(1)}%`}
            </div>
            <div className="flex items-center gap-4 mt-3 text-sm">
              <span className="text-gray-400">
                Investido: <span className="text-white font-medium">{formatCurrency(spendToday)}</span>
              </span>
              <span className="text-gray-400">
                Receita: <span className={`font-medium ${salesToday?.approvedValue ? 'text-green-400' : 'text-gray-500'}`}>
                  {formatCurrency(salesToday?.approvedValue || 0)}
                </span>
              </span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className={`relative overflow-hidden rounded-2xl p-6 ${
            realROI >= 0 
              ? 'bg-gradient-to-br from-blue-600/30 to-indigo-700/30 border-2 border-blue-500/40' 
              : 'bg-gradient-to-br from-orange-600/30 to-red-700/30 border-2 border-orange-500/40'
          }`}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl ${realROI >= 0 ? 'bg-blue-500/30' : 'bg-orange-500/30'}`}>
                  <BarChart3 className={`h-5 w-5 ${realROI >= 0 ? 'text-blue-400' : 'text-orange-400'}`} />
                </div>
                <span className={`text-lg font-semibold ${realROI >= 0 ? 'text-blue-300' : 'text-orange-300'}`}>
                  ROI do Período
                </span>
              </div>
              <span className="text-xs text-gray-400">{periodOptions.find(p => p.value === selectedPeriod)?.label}</span>
            </div>
            <div className={`text-4xl font-bold ${realROI >= 0 ? 'text-blue-400' : 'text-orange-400'}`}>
              {loading ? <Skeleton className="h-10 w-32 bg-white/10" /> : `${realROI >= 0 ? '+' : ''}${realROI.toFixed(1)}%`}
            </div>
            <div className="flex items-center gap-4 mt-3 text-sm">
              <span className="text-gray-400">
                Investido: <span className="text-white font-medium">{formatCurrency(displayMetrics?.totalSpend || 0)}</span>
              </span>
              <span className="text-gray-400">
                Receita: <span className={`font-medium ${realSales?.approvedValue ? 'text-green-400' : 'text-gray-500'}`}>
                  {formatCurrency(realSales?.approvedValue || 0)}
                </span>
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Big Numbers - Gastos do Dia e Mês */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="col-span-1 bg-gradient-to-br from-orange-500/20 to-red-600/20 backdrop-blur-xl rounded-2xl border border-orange-500/30 p-6"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-orange-300">Gasto Hoje</span>
            <div className="p-2 rounded-xl bg-orange-500/20">
              <DollarSign className="h-4 w-4 text-orange-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-white">
            {loading ? <Skeleton className="h-8 w-28 bg-white/10" /> : formatCurrency(spendToday)}
          </div>
          <p className="text-xs text-orange-300/60 mt-1">Investimento do dia atual</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="col-span-1 bg-gradient-to-br from-purple-500/20 to-pink-600/20 backdrop-blur-xl rounded-2xl border border-purple-500/30 p-6"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-purple-300">Gasto do Mês</span>
            <div className="p-2 rounded-xl bg-purple-500/20">
              <TrendingUp className="h-4 w-4 text-purple-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-white">
            {loading ? <Skeleton className="h-8 w-28 bg-white/10" /> : formatCurrency(spendMonth)}
          </div>
          <p className="text-xs text-purple-300/60 mt-1">Investimento em {new Date().toLocaleDateString('pt-BR', { month: 'long' })}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="col-span-1 bg-gradient-to-br from-emerald-500/20 to-green-600/20 backdrop-blur-xl rounded-2xl border border-emerald-500/30 p-6"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-emerald-300">Vendas Reais (Hoje)</span>
            <div className="p-2 rounded-xl bg-emerald-500/20">
              <ShoppingCart className="h-4 w-4 text-emerald-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-white">
            {loading ? <Skeleton className="h-8 w-16 bg-white/10" /> : salesToday?.approvedSales || 0}
          </div>
          <p className="text-xs text-emerald-300/60 mt-1">Vendas aprovadas hoje</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="col-span-1 bg-gradient-to-br from-yellow-500/20 to-amber-600/20 backdrop-blur-xl rounded-2xl border border-yellow-500/30 p-6"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-yellow-300">Receita Real (Hoje)</span>
            <div className="p-2 rounded-xl bg-yellow-500/20">
              <DollarSign className="h-4 w-4 text-yellow-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-white">
            {loading ? <Skeleton className="h-8 w-28 bg-white/10" /> : formatCurrency(salesToday?.approvedValue || 0)}
          </div>
          <p className="text-xs text-yellow-300/60 mt-1">Receita de vendas hoje</p>
        </motion.div>
      </div>

      {/* Métricas do Período Selecionado */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="col-span-1 bg-gradient-to-br from-gray-700/40 to-gray-800/60 backdrop-blur-xl rounded-2xl border border-gray-600/30 p-5"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-300">Compras (Pixel)</span>
            <div className="p-2 rounded-xl bg-gray-500/20">
              <ShoppingCart className="h-4 w-4 text-gray-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">
            {loading ? <Skeleton className="h-7 w-16 bg-white/10" /> : displayMetrics?.totalPurchases || 0}
          </div>
          <p className="text-xs text-gray-400 mt-1">Dados do Facebook Pixel</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="col-span-1 bg-gradient-to-br from-gray-700/40 to-gray-800/60 backdrop-blur-xl rounded-2xl border border-gray-600/30 p-5"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-300">Receita (Pixel)</span>
            <div className="p-2 rounded-xl bg-gray-500/20">
              <DollarSign className="h-4 w-4 text-gray-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">
            {loading ? <Skeleton className="h-7 w-24 bg-white/10" /> : formatCurrency(displayMetrics?.totalPurchaseValue || 0)}
          </div>
          <p className="text-xs text-gray-400 mt-1">Dados do Facebook Pixel</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="col-span-1 bg-gradient-to-br from-cyan-700/40 to-blue-800/60 backdrop-blur-xl rounded-2xl border border-cyan-600/30 p-5"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-cyan-300">Vendas Reais</span>
            <div className="p-2 rounded-xl bg-cyan-500/20">
              <ShoppingCart className="h-4 w-4 text-cyan-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">
            {loading ? <Skeleton className="h-7 w-16 bg-white/10" /> : realSales?.approvedSales || 0}
          </div>
          <p className="text-xs text-cyan-400/60 mt-1">{periodOptions.find(p => p.value === selectedPeriod)?.label}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="col-span-1 bg-gradient-to-br from-green-700/40 to-emerald-800/60 backdrop-blur-xl rounded-2xl border border-green-600/30 p-5"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-green-300">Receita Real</span>
            <div className="p-2 rounded-xl bg-green-500/20">
              <DollarSign className="h-4 w-4 text-green-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">
            {loading ? <Skeleton className="h-7 w-24 bg-white/10" /> : formatCurrency(realSales?.approvedValue || 0)}
          </div>
          <p className="text-xs text-green-400/60 mt-1">{periodOptions.find(p => p.value === selectedPeriod)?.label}</p>
        </motion.div>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {loading ? (
          Array(4).fill(0).map((_, i) => (
            <GlassCard key={i} className="p-6">
              <Skeleton className="h-4 w-24 bg-white/10 mb-4" />
              <Skeleton className="h-8 w-32 bg-white/10" />
            </GlassCard>
          ))
        ) : (
          kpiCards.map((kpi, index) => (
            <GlassCard key={kpi.title} gradient className="p-6">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-gray-400">{kpi.title}</span>
                  <div className={`p-2 rounded-xl bg-gradient-to-br ${kpi.color} shadow-lg`}>
                    <kpi.icon className="h-4 w-4 text-white" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-white">
                  {kpi.format === 'currency' && formatCurrency(kpi.value)}
                  {kpi.format === 'number' && formatNumber(kpi.value)}
                  {kpi.format === 'percent' && formatPercent(kpi.value)}
                  {kpi.format === 'roas' && `${kpi.value.toFixed(2)}x`}
                </div>
              </motion.div>
            </GlassCard>
          ))
        )}
      </div>

      {/* Funil de Tráfego */}
      <GlassCard className="mb-6 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Facebook className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-semibold text-white">Funil de Tráfego</h2>
          <Badge className="bg-blue-500/10 text-blue-300 border border-blue-500/30">
            Meta Ads
          </Badge>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {loading ? (
            Array(4).fill(0).map((_, i) => (
              <div key={i} className="p-4 rounded-xl bg-white/5">
                <Skeleton className="h-4 w-20 bg-white/10 mb-2" />
                <Skeleton className="h-6 w-16 bg-white/10" />
              </div>
            ))
          ) : (
            funnelCards.map((card, index) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
              >
                <div className="flex items-center gap-2 mb-2">
                  <card.icon className={`h-4 w-4 ${card.color}`} />
                  <span className="text-sm text-gray-400">{card.title}</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  {card.isCurrency ? formatCurrency(card.value) : formatNumber(card.value)}
                </div>
                {card.description && (
                  <span className="text-xs text-gray-500">{card.description}</span>
                )}
              </motion.div>
            ))
          )}
        </div>
      </GlassCard>

      {/* Conversões */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {loading ? (
          Array(3).fill(0).map((_, i) => (
            <GlassCard key={i} className="p-4">
              <Skeleton className="h-4 w-24 bg-white/10 mb-4" />
              <Skeleton className="h-8 w-32 bg-white/10" />
            </GlassCard>
          ))
        ) : (
          conversionCards.map((card, index) => (
            <GlassCard key={card.title} className="p-4">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 + index * 0.1 }}
                className="flex items-center justify-between"
              >
                <div>
                  <span className="text-xs font-medium text-gray-400">{card.title}</span>
                  <div className="text-xl font-bold text-white mt-1">
                    {card.isCurrency ? formatCurrency(card.value) : formatNumber(card.value)}
                  </div>
                  {card.description && (
                    <span className="text-xs text-gray-500">{card.description}</span>
                  )}
                </div>
                <card.icon className={`h-8 w-8 ${card.color}`} />
              </motion.div>
            </GlassCard>
          ))
        )}
      </div>

      {/* Engagement Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {loading ? (
          Array(4).fill(0).map((_, i) => (
            <GlassCard key={i} className="p-4">
              <Skeleton className="h-4 w-24 bg-white/10 mb-4" />
              <Skeleton className="h-8 w-32 bg-white/10" />
            </GlassCard>
          ))
        ) : (
          engagementCards.map((card, index) => (
            <GlassCard key={card.title} className="p-4">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                className="flex items-center justify-between"
              >
                <div>
                  <span className="text-xs font-medium text-gray-400">{card.title}</span>
                  <div className="text-xl font-bold text-white mt-1">
                    {card.isCurrency ? formatCurrency(card.value) : formatNumber(card.value)}
                  </div>
                </div>
                <card.icon className={`h-8 w-8 ${card.color}`} />
              </motion.div>
            </GlassCard>
          ))
        )}
      </div>

      {/* Tabs: Campanhas, Conjuntos, Anúncios */}
      <GlassCard className="overflow-hidden">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <div className="p-6 border-b border-white/10">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-5 w-5 text-blue-400" />
                <h2 className="text-xl font-semibold text-white">Campanhas</h2>
              </div>
              <TabsList className="bg-gray-800/80 border border-white/20 p-1 rounded-xl">
                <TabsTrigger value="campaign" className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all">
                  <Megaphone className="h-4 w-4 mr-2" />
                  Campanhas
                </TabsTrigger>
                <TabsTrigger value="adset" className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all">
                  <Layers className="h-4 w-4 mr-2" />
                  Conjuntos
                </TabsTrigger>
                <TabsTrigger value="ad" className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 data-[state=active]:bg-pink-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all">
                  <Image className="h-4 w-4 mr-2" />
                  Anúncios
                </TabsTrigger>
              </TabsList>
            </div>
          </div>
          
          {/* Tab Campanhas */}
          <TabsContent value="campaign" className="mt-0">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-500">
                  {filteredAndSortedCampaigns.length} de {allCampaigns.length || 0} campanhas
                </span>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>🔥 CTR &gt; 1.5%</span>
                  <span>❄️ CTR &lt; 0.5%</span>
                </div>
              </div>
              {loading ? (
                <div className="space-y-4">
                  {Array(5).fill(0).map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-6 w-48 bg-white/10" />
                      <Skeleton className="h-6 w-20 bg-white/10" />
                      <Skeleton className="h-6 w-24 bg-white/10" />
                      <Skeleton className="h-6 w-16 bg-white/10" />
                    </div>
                  ))}
                </div>
              ) : filteredAndSortedCampaigns.length === 0 ? (
                <EmptyState 
                  type="campaign" 
                  total={allCampaigns.length || 0} 
                  selectedPeriod={selectedPeriod}
                  statusFilter={statusFilter}
                />
              ) : (
                <div className="overflow-auto max-h-[500px] scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
                  <table className="w-full min-w-[1200px]">
                    <thead className="sticky top-0 bg-gray-900/95 backdrop-blur-sm z-10">
                      <tr className="border-b border-white/10">
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Campanha</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Status</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Gasto</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Alcance</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Cliques</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Cliq. Saída</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">CPC</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">CTR</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Leads</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">CPL</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Finalizações</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Impressões</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Compras</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Receita</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Custo/Compra</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAndSortedCampaigns.map((campaign, index) => {
                        const status = (campaign as any).effective_status || 'UNKNOWN';
                        const ctr = Number(campaign.ctr || 0);
                        
                        const purchaseCount = sumActions(campaign.actions, ACTION_TYPES.purchases);
                        const purchaseAmount = sumActionValues(campaign.action_values, ACTION_TYPES.purchases);
                        const leadCount = sumActions(campaign.actions, ACTION_TYPES.leads);
                        const checkoutCount = sumActions(campaign.actions, ACTION_TYPES.checkout);
                        
                        // Cliques de saída (outbound clicks)
                        const outboundClicks = campaign.outbound_clicks?.reduce(
                          (sum, oc) => sum + Number(oc.value || 0), 0
                        ) || 0;
                        
                        return (
                          <motion.tr 
                            key={campaign.campaign_id || index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="border-b border-white/5 hover:bg-white/5 transition-colors"
                          >
                            <td className="py-4 px-4">
                              <span className="font-medium text-white">{campaign.campaign_name}</span>
                            </td>
                            <td className="py-4 px-4">
                              <StatusBadge status={status} />
                            </td>
                            <td className="py-4 px-4 text-right font-medium text-green-400">
                              {formatCurrency(Number(campaign.spend || 0))}
                            </td>
                            <td className="py-4 px-4 text-right text-indigo-400">
                              {formatNumber(Number(campaign.reach || 0))}
                            </td>
                            <td className="py-4 px-4 text-right text-white">
                              {formatNumber(Number(campaign.clicks || 0))}
                            </td>
                            <td className="py-4 px-4 text-right text-cyan-400">
                              {formatNumber(outboundClicks)}
                            </td>
                            <td className="py-4 px-4 text-right text-orange-400">
                              {formatCurrency(Number(campaign.cpc || 0))}
                            </td>
                            <td className="py-4 px-4 text-right text-purple-400">
                              <span className="flex items-center justify-end gap-1">
                                {formatPercent(ctr)}
                                <PerformanceIndicator ctr={ctr} />
                              </span>
                            </td>
                            <td className="py-4 px-4 text-right">
                              {leadCount > 0 ? (
                                <span className="font-semibold text-pink-400">{formatNumber(leadCount)}</span>
                              ) : (
                                <span className="text-gray-500">0</span>
                              )}
                            </td>
                            <td className="py-4 px-4 text-right text-orange-400">
                              {leadCount > 0 ? (
                                <span className="font-semibold">{formatCurrency(Number(campaign.spend || 0) / leadCount)}</span>
                              ) : (
                                <span className="text-gray-500">-</span>
                              )}
                            </td>
                            <td className="py-4 px-4 text-right">
                              {checkoutCount > 0 ? (
                                <span className="font-semibold text-purple-400">{formatNumber(checkoutCount)}</span>
                              ) : (
                                <span className="text-gray-500">0</span>
                              )}
                            </td>
                            <td className="py-4 px-4 text-right text-gray-400">
                              {formatNumber(Number(campaign.impressions || 0))}
                            </td>
                            <td className="py-4 px-4 text-right">
                              {purchaseCount > 0 ? (
                                <span className="font-semibold text-emerald-400">{purchaseCount}</span>
                              ) : (
                                <span className="text-gray-500">0</span>
                              )}
                            </td>
                            <td className="py-4 px-4 text-right">
                              {purchaseAmount > 0 ? (
                                <span className="font-semibold text-yellow-400">{formatCurrency(purchaseAmount)}</span>
                              ) : (
                                <span className="text-gray-500">R$ 0,00</span>
                              )}
                            </td>
                            <td className="py-4 px-4 text-right">
                              {purchaseCount > 0 ? (
                                <span className="font-semibold text-pink-400">
                                  {formatCurrency(Number(campaign.spend || 0) / purchaseCount)}
                                </span>
                              ) : (
                                <span className="text-gray-500">-</span>
                              )}
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Tab Conjuntos (AdSets) */}
          <TabsContent value="adset" className="mt-0">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-500">
                  {filteredAndSortedAdsets.length} conjuntos de anúncios
                </span>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>🔥 CTR &gt; 1.5%</span>
                  <span>❄️ CTR &lt; 0.5%</span>
                </div>
              </div>
              {loadingAdsets ? (
                <div className="space-y-4">
                  {Array(5).fill(0).map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-6 w-48 bg-white/10" />
                      <Skeleton className="h-6 w-32 bg-white/10" />
                      <Skeleton className="h-6 w-24 bg-white/10" />
                    </div>
                  ))}
                </div>
              ) : filteredAndSortedAdsets.length === 0 ? (
                <EmptyState type="adset" total={0} selectedPeriod={selectedPeriod} statusFilter={statusFilter} />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Conjunto</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Campanha</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Gasto</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Cliques</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">CPC</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">CTR</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Leads</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">CPL</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Finalizações</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Impressões</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAndSortedAdsets.map((adset, index) => {
                        const ctr = Number(adset.ctr || 0);
                        const leadCount = sumActions(adset.actions, ACTION_TYPES.leads);
                        const checkoutCount = sumActions(adset.actions, ACTION_TYPES.checkout);
                        
                        return (
                          <motion.tr 
                            key={adset.adset_id || index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="border-b border-white/5 hover:bg-white/5 transition-colors"
                          >
                            <td className="py-4 px-4">
                              <span className="font-medium text-white">{adset.adset_name || 'Sem nome'}</span>
                            </td>
                            <td className="py-4 px-4">
                              <span className="text-gray-400 text-sm">{adset.campaign_name || '-'}</span>
                            </td>
                            <td className="py-4 px-4 text-right font-medium text-green-400">
                              {formatCurrency(Number(adset.spend || 0))}
                            </td>
                            <td className="py-4 px-4 text-right text-white">
                              {formatNumber(Number(adset.clicks || 0))}
                            </td>
                            <td className="py-4 px-4 text-right text-orange-400">
                              {formatCurrency(Number(adset.cpc || 0))}
                            </td>
                            <td className="py-4 px-4 text-right text-purple-400">
                              <span className="flex items-center justify-end gap-1">
                                {formatPercent(ctr)}
                                <PerformanceIndicator ctr={ctr} />
                              </span>
                            </td>
                            <td className="py-4 px-4 text-right">
                              {leadCount > 0 ? (
                                <span className="font-semibold text-pink-400">{formatNumber(leadCount)}</span>
                              ) : (
                                <span className="text-gray-500">0</span>
                              )}
                            </td>
                            <td className="py-4 px-4 text-right text-orange-400">
                              {leadCount > 0 ? (
                                <span className="font-semibold">{formatCurrency(Number(adset.spend || 0) / leadCount)}</span>
                              ) : (
                                <span className="text-gray-500">-</span>
                              )}
                            </td>
                            <td className="py-4 px-4 text-right">
                              {checkoutCount > 0 ? (
                                <span className="font-semibold text-purple-400">{formatNumber(checkoutCount)}</span>
                              ) : (
                                <span className="text-gray-500">0</span>
                              )}
                            </td>
                            <td className="py-4 px-4 text-right text-gray-400">
                              {formatNumber(Number(adset.impressions || 0))}
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Tab Anúncios (Ads) */}
          <TabsContent value="ad" className="mt-0">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-500">
                  {filteredAndSortedAds.length} anúncios
                  {bestAdId && <Badge className="ml-2 bg-yellow-500/20 text-yellow-300 border-yellow-500/30">⭐ Melhor destacado</Badge>}
                </span>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>🔥 CTR &gt; 1.5%</span>
                  <span>❄️ CTR &lt; 0.5%</span>
                </div>
              </div>
              {loadingAds ? (
                <div className="space-y-4">
                  {Array(5).fill(0).map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-6 w-48 bg-white/10" />
                      <Skeleton className="h-6 w-32 bg-white/10" />
                      <Skeleton className="h-6 w-24 bg-white/10" />
                    </div>
                  ))}
                </div>
              ) : filteredAndSortedAds.length === 0 ? (
                <EmptyState type="ad" total={0} selectedPeriod={selectedPeriod} statusFilter={statusFilter} />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Anúncio</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Conjunto</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Gasto</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Cliques</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">CPC</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">CTR</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Leads</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">CPL</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Finalizações</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Impressões</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAndSortedAds.map((ad, index) => {
                        const ctr = Number(ad.ctr || 0);
                        const isBest = ad.ad_id === bestAdId;
                        const leadCount = sumActions(ad.actions, ACTION_TYPES.leads);
                        const checkoutCount = sumActions(ad.actions, ACTION_TYPES.checkout);
                        
                        return (
                          <motion.tr 
                            key={ad.ad_id || index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={`border-b border-white/5 hover:bg-white/5 transition-colors ${isBest ? 'bg-yellow-500/5' : ''}`}
                          >
                            <td className="py-4 px-4">
                              <span className={`font-medium ${isBest ? 'text-yellow-300' : 'text-white'}`}>
                                {isBest && '⭐ '}
                                {ad.ad_name || 'Sem nome'}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              <span className="text-gray-400 text-sm">{ad.adset_name || '-'}</span>
                            </td>
                            <td className="py-4 px-4 text-right font-medium text-green-400">
                              {formatCurrency(Number(ad.spend || 0))}
                            </td>
                            <td className="py-4 px-4 text-right text-white">
                              {formatNumber(Number(ad.clicks || 0))}
                            </td>
                            <td className="py-4 px-4 text-right text-orange-400">
                              {formatCurrency(Number(ad.cpc || 0))}
                            </td>
                            <td className="py-4 px-4 text-right text-purple-400">
                              <span className={`flex items-center justify-end gap-1 ${isBest ? 'font-bold' : ''}`}>
                                {formatPercent(ctr)}
                                <PerformanceIndicator ctr={ctr} />
                              </span>
                            </td>
                            <td className="py-4 px-4 text-right">
                              {leadCount > 0 ? (
                                <span className="font-semibold text-pink-400">{formatNumber(leadCount)}</span>
                              ) : (
                                <span className="text-gray-500">0</span>
                              )}
                            </td>
                            <td className="py-4 px-4 text-right text-orange-400">
                              {leadCount > 0 ? (
                                <span className="font-semibold">{formatCurrency(Number(ad.spend || 0) / leadCount)}</span>
                              ) : (
                                <span className="text-gray-500">-</span>
                              )}
                            </td>
                            <td className="py-4 px-4 text-right">
                              {checkoutCount > 0 ? (
                                <span className="font-semibold text-purple-400">{formatNumber(checkoutCount)}</span>
                              ) : (
                                <span className="text-gray-500">0</span>
                              )}
                            </td>
                            <td className="py-4 px-4 text-right text-gray-400">
                              {formatNumber(Number(ad.impressions || 0))}
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </GlassCard>
    </div>
  );
}
