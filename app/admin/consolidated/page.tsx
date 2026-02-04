'use client';

/**
 * 🎯 Dashboard Consolidado - Página Principal
 * 
 * Visão unificada de todas as plataformas de anúncios:
 * - Meta Ads
 * - Google Ads
 * - Google Analytics
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  RefreshCw, 
  Download, 
  Plus,
  DollarSign,
  Eye,
  MousePointerClick,
  ShoppingCart,
  TrendingUp,
  Users,
  Target,
  Wallet
} from 'lucide-react';
import { 
  MetricCard, 
  ConversionFunnel, 
  CampaignsTable, 
  AlertsBadge,
  DateRangePicker,
  PlatformSelector,
  ComparisonChart
} from '@/components/consolidated';
import type { ConsolidatedDashboardData, DateRange } from '@/lib/consolidator';
import { cn } from '@/lib/utils';
import Link from 'next/link';

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export default function ConsolidatedDashboardPage() {
  // Estados
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ConsolidatedDashboardData | null>(null);
  
  // Filtros
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return {
      start: sevenDaysAgo.toISOString().split('T')[0],
      end: today.toISOString().split('T')[0]
    };
  });
  
  const [activePlatforms, setActivePlatforms] = useState<string[]>(['meta', 'google_ads']);
  const [chartMetric, setChartMetric] = useState<'spend' | 'revenue'>('spend');

  // Plataformas disponíveis
  const platforms = [
    { key: 'meta' as const, name: 'Meta Ads', icon: '📘', color: 'text-blue-400', connected: true },
    { key: 'google_ads' as const, name: 'Google Ads', icon: '🔍', color: 'text-amber-400', connected: false },
    { key: 'google_analytics' as const, name: 'Analytics', icon: '📊', color: 'text-orange-400', connected: false }
  ];

  // Buscar dados
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        start: dateRange.start,
        end: dateRange.end,
        platforms: activePlatforms.join(',')
      });

      const response = await fetch(`/api/consolidated/metrics?${params}`);
      const result = await response.json();

      if (result.success === false) {
        throw new Error(result.error || 'Erro ao buscar dados');
      }

      setData(result);
    } catch (err: any) {
      console.error('❌ [Dashboard] Erro:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [dateRange, activePlatforms]);

  // Carregar dados ao montar e quando filtros mudam
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Toggle de plataforma
  const handlePlatformToggle = (platform: string) => {
    setActivePlatforms(prev => 
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  // Exportar CSV
  const handleExportCSV = () => {
    if (!data) return;

    const headers = ['Campanha', 'Plataforma', 'Gasto', 'Impressões', 'Cliques', 'Conversões', 'Receita', 'ROAS'];
    const rows = data.campaigns.map(c => [
      c.name,
      c.platform,
      c.spend.toFixed(2),
      c.impressions,
      c.clicks,
      c.conversions,
      c.revenue.toFixed(2),
      c.roas.toFixed(2)
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-${dateRange.start}-${dateRange.end}.csv`;
    a.click();
    
    URL.revokeObjectURL(url);
  };

  // Formatar valores
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0a0e1a]/95 backdrop-blur-sm border-b border-[#2d3748]">
        <div className="max-w-[1800px] mx-auto px-4 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            {/* Título */}
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Target className="w-6 h-6 text-blue-400" />
                Dashboard Consolidado
              </h1>
              <p className="text-sm text-zinc-400 mt-0.5">
                Visão unificada de todas as plataformas
              </p>
            </div>

            {/* Controles */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Seletor de plataformas */}
              <PlatformSelector
                platforms={platforms}
                activePlatforms={activePlatforms}
                onToggle={handlePlatformToggle}
              />

              {/* Date picker */}
              <DateRangePicker 
                value={dateRange}
                onChange={setDateRange}
              />

              {/* Alertas */}
              {data && <AlertsBadge alerts={data.alerts} />}

              {/* Refresh */}
              <button
                onClick={fetchData}
                disabled={loading}
                className={cn(
                  "p-2 rounded-lg bg-[#1a2332] border border-[#2d3748] transition-colors",
                  "hover:border-[#3d4758] disabled:opacity-50"
                )}
                title="Atualizar dados"
              >
                <RefreshCw className={cn("w-5 h-5 text-zinc-400", loading && "animate-spin")} />
              </button>

              {/* Export */}
              <button
                onClick={handleExportCSV}
                disabled={!data}
                className={cn(
                  "p-2 rounded-lg bg-[#1a2332] border border-[#2d3748] transition-colors",
                  "hover:border-[#3d4758] disabled:opacity-50"
                )}
                title="Exportar CSV"
              >
                <Download className="w-5 h-5 text-zinc-400" />
              </button>

              {/* Conectar conta */}
              <Link
                href="/admin/consolidated/connect"
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg",
                  "bg-blue-600 hover:bg-blue-700 transition-colors",
                  "text-sm font-medium"
                )}
              >
                <Plus className="w-4 h-4" />
                Conectar Conta
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="max-w-[1800px] mx-auto px-4 py-6">
        {/* Erro */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
            <p className="font-medium">Erro ao carregar dados</p>
            <p className="text-sm mt-1">{error}</p>
            <button 
              onClick={fetchData}
              className="mt-2 text-sm underline hover:no-underline"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-6">
          <MetricCard
            title="Gasto Total"
            value={data?.metrics.spend || 0}
            variation={data?.variations.spend}
            format="currency"
            icon={Wallet}
            iconColor="text-red-400"
            loading={loading}
          />
          <MetricCard
            title="Receita"
            value={data?.metrics.revenue || 0}
            variation={data?.variations.revenue}
            format="currency"
            icon={DollarSign}
            iconColor="text-emerald-400"
            loading={loading}
          />
          <MetricCard
            title="ROAS"
            value={data?.metrics.roas || 0}
            variation={data?.variations.roas}
            format="multiplier"
            icon={TrendingUp}
            iconColor="text-blue-400"
            loading={loading}
          />
          <MetricCard
            title="Compras"
            value={data?.metrics.purchases || 0}
            variation={data?.variations.purchases}
            format="number"
            icon={ShoppingCart}
            iconColor="text-purple-400"
            loading={loading}
          />
          <MetricCard
            title="Impressões"
            value={data?.metrics.impressions || 0}
            variation={data?.variations.impressions}
            format="number"
            icon={Eye}
            iconColor="text-cyan-400"
            loading={loading}
          />
          <MetricCard
            title="Cliques"
            value={data?.metrics.clicks || 0}
            variation={data?.variations.clicks}
            format="number"
            icon={MousePointerClick}
            iconColor="text-yellow-400"
            loading={loading}
          />
          <MetricCard
            title="CTR"
            value={data?.metrics.ctr || 0}
            variation={data?.variations.ctr}
            format="percent"
            icon={Target}
            iconColor="text-orange-400"
            loading={loading}
          />
          <MetricCard
            title="CPA"
            value={data?.metrics.cpa || 0}
            variation={data?.variations.cpa}
            invertedMetric
            format="currency"
            icon={Users}
            iconColor="text-pink-400"
            loading={loading}
          />
        </div>

        {/* Grid principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Funil de conversão */}
          <ConversionFunnel
            data={data?.funnel || {
              impressions: 0,
              clicks: 0,
              landing_page_views: 0,
              checkouts: 0,
              purchases: 0,
              rates: {
                impressions_to_clicks: 0,
                clicks_to_pv: 0,
                pv_to_checkout: 0,
                checkout_to_purchase: 0,
                overall_conversion: 0
              }
            }}
            loading={loading}
            className="lg:col-span-1"
          />

          {/* Gráfico de comparação */}
          <div className="lg:col-span-2 bg-[#1a2332] rounded-xl p-6 border border-[#2d3748]">
            {/* Seletor de métrica */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <span>📈</span>
                Comparativo por Plataforma
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setChartMetric('spend')}
                  className={cn(
                    "px-3 py-1 rounded-lg text-sm transition-colors",
                    chartMetric === 'spend'
                      ? "bg-red-500/20 text-red-400"
                      : "bg-zinc-700 text-zinc-400 hover:text-white"
                  )}
                >
                  Gasto
                </button>
                <button
                  onClick={() => setChartMetric('revenue')}
                  className={cn(
                    "px-3 py-1 rounded-lg text-sm transition-colors",
                    chartMetric === 'revenue'
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-zinc-700 text-zinc-400 hover:text-white"
                  )}
                >
                  Receita
                </button>
              </div>
            </div>

            {/* Gráfico */}
            {data && data.daily_data.length > 0 ? (
              <ComparisonChart
                data={data.daily_data}
                metric={chartMetric}
                loading={loading}
                className="bg-transparent border-0 p-0"
              />
            ) : (
              <div className="h-64 flex items-center justify-center text-zinc-500">
                {loading ? 'Carregando...' : 'Sem dados para exibir'}
              </div>
            )}
          </div>
        </div>

        {/* Resumo por plataforma */}
        {data?.by_platform && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Meta Ads */}
            {data.by_platform.meta && (
              <div className="bg-[#1a2332] rounded-xl p-4 border border-[#2d3748]">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">📘</span>
                  <h4 className="font-semibold text-white">Meta Ads</h4>
                  <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-xs">
                    {((data.by_platform.meta.spend || 0) / (data.metrics.spend || 1) * 100).toFixed(0)}% do gasto
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-3 text-center">
                  <div>
                    <div className="text-lg font-bold text-white">
                      {formatCurrency(data.by_platform.meta.spend || 0)}
                    </div>
                    <div className="text-xs text-zinc-500">Gasto</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-emerald-400">
                      {formatCurrency(data.by_platform.meta.revenue || 0)}
                    </div>
                    <div className="text-xs text-zinc-500">Receita</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-blue-400">
                      {(data.by_platform.meta.roas || 0).toFixed(2)}x
                    </div>
                    <div className="text-xs text-zinc-500">ROAS</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-purple-400">
                      {data.by_platform.meta.purchases || 0}
                    </div>
                    <div className="text-xs text-zinc-500">Compras</div>
                  </div>
                </div>
              </div>
            )}

            {/* Google Ads */}
            {data.by_platform.google_ads && (
              <div className="bg-[#1a2332] rounded-xl p-4 border border-[#2d3748]">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">🔍</span>
                  <h4 className="font-semibold text-white">Google Ads</h4>
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-xs">
                    {((data.by_platform.google_ads.spend || 0) / (data.metrics.spend || 1) * 100).toFixed(0)}% do gasto
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-3 text-center">
                  <div>
                    <div className="text-lg font-bold text-white">
                      {formatCurrency(data.by_platform.google_ads.spend || 0)}
                    </div>
                    <div className="text-xs text-zinc-500">Gasto</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-emerald-400">
                      {formatCurrency(data.by_platform.google_ads.revenue || 0)}
                    </div>
                    <div className="text-xs text-zinc-500">Receita</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-blue-400">
                      {(data.by_platform.google_ads.roas || 0).toFixed(2)}x
                    </div>
                    <div className="text-xs text-zinc-500">ROAS</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-purple-400">
                      {data.by_platform.google_ads.purchases || 0}
                    </div>
                    <div className="text-xs text-zinc-500">Compras</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tabela de campanhas */}
        <CampaignsTable
          campaigns={data?.campaigns || []}
          loading={loading}
          onPauseCampaign={(id) => console.log('Pausar:', id)}
          onResumeCampaign={(id) => console.log('Ativar:', id)}
        />

        {/* Footer com resumo */}
        {data && (
          <div className="mt-6 p-4 bg-[#1a2332] rounded-xl border border-[#2d3748]">
            <div className="flex items-center justify-between flex-wrap gap-4 text-sm">
              <div className="text-zinc-400">
                Período: <span className="text-white">{dateRange.start}</span> até <span className="text-white">{dateRange.end}</span>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-zinc-400">
                  Lucro: <span className={cn(
                    "font-bold",
                    data.metrics.profit > 0 ? "text-emerald-400" : "text-red-400"
                  )}>
                    {formatCurrency(data.metrics.profit)}
                  </span>
                </div>
                <div className="text-zinc-400">
                  Margem: <span className={cn(
                    "font-bold",
                    data.metrics.profit_margin > 50 ? "text-emerald-400" :
                    data.metrics.profit_margin > 20 ? "text-yellow-400" :
                    "text-red-400"
                  )}>
                    {data.metrics.profit_margin.toFixed(1)}%
                  </span>
                </div>
                <div className="text-zinc-400">
                  Ticket Médio: <span className="text-white font-bold">
                    {formatCurrency(data.metrics.ticket_medio)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
