'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { CampaignInsight } from '@/lib/meta-marketing';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  DollarSign, MousePointerClick, Eye, TrendingUp, AlertCircle, 
  RefreshCw, Image, Target, ExternalLink, PlayCircle
} from 'lucide-react';
import { motion } from 'framer-motion';

// Formatar moeda BRL
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

// Formatar número
const formatNumber = (value: number) => {
  return new Intl.NumberFormat('pt-BR').format(Math.round(value));
};

// Opções de período
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

const sortOptions = [
  { value: 'status_date', label: 'Ativos + Recentes' },
  { value: 'spend_desc', label: 'Maior gasto' },
  { value: 'conversions_desc', label: 'Mais conversões' },
  { value: 'ctr_desc', label: 'Melhor CTR' },
];

export default function CriativosPage() {
  const [ads, setAds] = useState<CampaignInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('last_7d');
  const [sortBy, setSortBy] = useState('status_date');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    setLoading(true);
    try {
      const res = await fetch(`/api/ads/insights?period=${selectedPeriod}&level=ad`);
      const data = await res.json();
      setAds(Array.isArray(data) ? data : []);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Erro ao carregar criativos:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedPeriod]);

  useEffect(() => {
    fetchData();
  }, [selectedPeriod, fetchData]);

  // Ordenar ads - prioriza ativos primeiro, depois por data mais recente
  const sortedAds = useMemo(() => {
    return [...ads].sort((a, b) => {
      switch (sortBy) {
        case 'status_date':
          // Primeiro: ativos antes de inativos
          const aActive = (a as any).effective_status === 'ACTIVE' || (a as any).status === 'ACTIVE' ? 1 : 0;
          const bActive = (b as any).effective_status === 'ACTIVE' || (b as any).status === 'ACTIVE' ? 1 : 0;
          if (bActive !== aActive) return bActive - aActive;
          // Depois: por data de criação/atualização (mais recente primeiro)
          const aDate = new Date((a as any).created_time || (a as any).updated_time || 0).getTime();
          const bDate = new Date((b as any).created_time || (b as any).updated_time || 0).getTime();
          if (bDate !== aDate) return bDate - aDate;
          // Fallback: maior gasto
          return Number(b.spend || 0) - Number(a.spend || 0);
        case 'spend_desc': return Number(b.spend || 0) - Number(a.spend || 0);
        case 'conversions_desc': return Number((b as any).conversions || 0) - Number((a as any).conversions || 0);
        case 'ctr_desc': return Number(b.ctr || 0) - Number(a.ctr || 0);
        default: return Number(b.spend || 0) - Number(a.spend || 0);
      }
    });
  }, [ads, sortBy]);

  // Calcular totais e métricas
  const totals = useMemo(() => {
    const spend = ads.reduce((sum, a) => sum + Number(a.spend || 0), 0);
    const impressions = ads.reduce((sum, a) => sum + Number(a.impressions || 0), 0);
    const clicks = ads.reduce((sum, a) => sum + Number(a.clicks || 0), 0);
    const conversions = ads.reduce((sum, a) => sum + Number((a as any).conversions || 0), 0);
    return {
      count: ads.length,
      spend,
      impressions,
      clicks,
      conversions,
      cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
      ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
      cpc: clicks > 0 ? spend / clicks : 0,
      cpl: conversions > 0 ? spend / conversions : 0,
    };
  }, [ads]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 shadow-lg">
            <Image className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Criativos</h1>
            <p className="text-gray-400">Performance por anúncio individual</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 mt-4 md:mt-0">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm"
          >
            {periodOptions.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-gray-800">{opt.label}</option>
            ))}
          </select>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm"
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-gray-800">{opt.label}</option>
            ))}
          </select>
          
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </motion.div>

      {/* KPIs Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-gradient-to-br from-pink-500/20 to-rose-600/20 rounded-2xl border border-pink-500/30 p-4">
          <p className="text-xs text-pink-300 mb-1">QTD de Anúncios</p>
          <p className="text-2xl font-bold text-white">{totals.count}</p>
        </div>
        <div className="bg-gradient-to-br from-gray-700/40 to-gray-800/60 rounded-2xl border border-gray-600/30 p-4">
          <p className="text-xs text-gray-300 mb-1">CPM</p>
          <p className="text-2xl font-bold text-white">{formatCurrency(totals.cpm)}</p>
        </div>
        <div className="bg-gradient-to-br from-gray-700/40 to-gray-800/60 rounded-2xl border border-gray-600/30 p-4">
          <p className="text-xs text-gray-300 mb-1">CTR</p>
          <p className="text-2xl font-bold text-white">{totals.ctr.toFixed(2)}%</p>
        </div>
        <div className="bg-gradient-to-br from-gray-700/40 to-gray-800/60 rounded-2xl border border-gray-600/30 p-4">
          <p className="text-xs text-gray-300 mb-1">CPC</p>
          <p className="text-2xl font-bold text-white">{formatCurrency(totals.cpc)}</p>
        </div>
        <div className="bg-gradient-to-br from-green-500/20 to-emerald-600/20 rounded-2xl border border-green-500/30 p-4">
          <p className="text-xs text-green-300 mb-1">Taxa de Conversão</p>
          <p className="text-2xl font-bold text-white">
            {totals.clicks > 0 ? ((totals.conversions / totals.clicks) * 100).toFixed(2) : 0}%
          </p>
        </div>
        <div className="bg-gradient-to-br from-gray-700/40 to-gray-800/60 rounded-2xl border border-gray-600/30 p-4">
          <p className="text-xs text-gray-300 mb-1">CPL</p>
          <p className="text-2xl font-bold text-white">{formatCurrency(totals.cpl)}</p>
        </div>
      </div>

      {/* Tabela de Criativos */}
      <div className="bg-gradient-to-br from-gray-800/40 to-gray-900/60 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">Anúncios ({sortedAds.length})</h2>
        </div>
        
        {loading ? (
          <div className="p-8 space-y-4">
            {Array(5).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-16 bg-white/10" />
            ))}
          </div>
        ) : sortedAds.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum anúncio encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-white/5">
                  <th className="text-left text-xs font-semibold text-gray-400 px-4 py-3">Anúncio</th>
                  <th className="text-left text-xs font-semibold text-gray-400 px-4 py-3">Campanha</th>
                  <th className="text-left text-xs font-semibold text-gray-400 px-4 py-3">URL do Criativo</th>
                  <th className="text-right text-xs font-semibold text-gray-400 px-4 py-3">Investimento</th>
                  <th className="text-right text-xs font-semibold text-gray-400 px-4 py-3">Conversões</th>
                  <th className="text-right text-xs font-semibold text-gray-400 px-4 py-3">CTR</th>
                  <th className="text-right text-xs font-semibold text-gray-400 px-4 py-3">CPL</th>
                </tr>
              </thead>
              <tbody>
                {sortedAds.map((ad, index) => {
                  const spend = Number(ad.spend || 0);
                  const ctr = Number(ad.ctr || 0);
                  const conversions = Number((ad as any).conversions || 0);
                  const cpl = conversions > 0 ? spend / conversions : 0;
                  
                  return (
                    <motion.tr
                      key={ad.ad_id || index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className="border-t border-white/5 hover:bg-white/5"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-white text-sm">{ad.ad_name || 'Sem nome'}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-sm">{ad.campaign_name}</td>
                      <td className="px-4 py-3">
                        {(ad as any).creative_thumbnail_url ? (
                          <a 
                            href={(ad as any).creative_thumbnail_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
                          >
                            Ver criativo <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-gray-500 text-sm">—</span>
                        )}
                      </td>
                      <td className="text-right px-4 py-3 text-green-400 font-medium">{formatCurrency(spend)}</td>
                      <td className="text-right px-4 py-3 text-orange-400 font-medium">{formatNumber(conversions)}</td>
                      <td className="text-right px-4 py-3 text-purple-400">{ctr.toFixed(2)}%</td>
                      <td className="text-right px-4 py-3 text-gray-400">{conversions > 0 ? formatCurrency(cpl) : '—'}</td>
                    </motion.tr>
                  );
                })}
                {/* Total */}
                <tr className="border-t-2 border-white/20 bg-white/5 font-bold">
                  <td className="px-4 py-3 text-white" colSpan={3}>Total geral</td>
                  <td className="text-right px-4 py-3 text-green-400">{formatCurrency(totals.spend)}</td>
                  <td className="text-right px-4 py-3 text-orange-400">{formatNumber(totals.conversions)}</td>
                  <td className="text-right px-4 py-3 text-purple-400">{totals.ctr.toFixed(2)}%</td>
                  <td className="text-right px-4 py-3 text-gray-400">{formatCurrency(totals.cpl)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
