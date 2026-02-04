'use client';

/**
 * 🎯 Dashboard Consolidado - Dados REAIS da Meta + Status de Conexão
 * 
 * Visão unificada de todas as plataformas de anúncios:
 * - Meta Ads: CONECTADO (dados reais da API)
 * - Google Ads: DESCONECTADO (aguardando integração)
 * - Google Analytics: DESCONECTADO (aguardando integração)
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
  Wallet,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Unplug,
  Brain,
  Sparkles
} from 'lucide-react';
import { 
  MetricCard, 
  ConversionFunnel, 
  CampaignsTable, 
  AlertsBadge,
  DateRangePicker,
  ComparisonChart
} from '@/components/consolidated';
import { AIInsightPanel } from '@/components/ai/AIInsightPanel';
import type { ConsolidatedDashboardData, DateRange } from '@/lib/consolidator';
import { cn } from '@/lib/utils';
import Link from 'next/link';

// =====================================================
// TIPOS
// =====================================================

interface PlatformStatus {
  platform: string;
  connected: boolean;
  account_name?: string;
  account_id?: string;
  error?: string;
}

interface ExtendedDashboardData extends ConsolidatedDashboardData {
  platform_status?: PlatformStatus[];
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export default function ConsolidadoPage() {
  // Estados
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ExtendedDashboardData | null>(null);
  
  // Estados da IA
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  
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
  
  const [chartMetric, setChartMetric] = useState<'spend' | 'revenue'>('spend');

  // Função para buscar análise da IA
  const fetchAIAnalysis = useCallback(async (consolidatedData: ExtendedDashboardData) => {
    setAiLoading(true);
    setAiError(null);
    
    try {
      // Usar a API do cockpit já que os dados são similares
      const cockpitFormatted = {
        period: consolidatedData.period,
        summary: {
          total_spend: consolidatedData.metrics.spend,
          total_reach: consolidatedData.metrics.reach,
          total_impressions: consolidatedData.metrics.impressions,
          total_clicks: consolidatedData.metrics.clicks,
          total_link_clicks: consolidatedData.metrics.link_clicks,
          total_landing_page_views: consolidatedData.metrics.landing_page_views,
          total_checkouts: consolidatedData.metrics.checkouts,
          total_purchases: consolidatedData.metrics.purchases,
          total_revenue: consolidatedData.metrics.revenue,
          avg_cpm: consolidatedData.metrics.cpm,
          avg_cpc: consolidatedData.metrics.cpc,
          avg_ctr: consolidatedData.metrics.ctr,
          avg_connect_rate: consolidatedData.metrics.connect_rate,
          avg_checkout_rate: consolidatedData.metrics.checkout_rate,
          overall_roas: consolidatedData.metrics.roas,
          overall_profit: consolidatedData.metrics.profit,
          avg_ticket: consolidatedData.metrics.ticket_medio
        },
        campaigns: consolidatedData.campaigns.map(c => ({
          campaign_id: c.id,
          campaign_name: c.name,
          spend: c.spend,
          impressions: c.impressions,
          clicks: c.clicks,
          cpc: c.cpc,
          ctr: c.ctr,
          purchases: c.conversions,
          purchase_value: c.revenue,
          roas: c.roas,
          cost_per_purchase: c.cpa
        })),
        funnel_analysis: { topo: [], meio: [], fundo: [] }
      };
      
      const response = await fetch('/api/ai/cockpit-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: cockpitFormatted })
      });
      
      if (!response.ok) throw new Error('Erro ao buscar análise');
      
      const result = await response.json();
      setAiAnalysis(result);
    } catch (error) {
      console.error('Erro na análise IA:', error);
      setAiError('Não foi possível gerar análise. Tente novamente.');
    } finally {
      setAiLoading(false);
    }
  }, []);

  // Buscar dados
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        start: dateRange.start,
        end: dateRange.end
      });

      const response = await fetch(`/api/consolidated/metrics?${params}`);
      const result = await response.json();

      if (result.success === false) {
        throw new Error(result.error || 'Erro ao buscar dados');
      }

      setData(result);
      
      // Buscar análise da IA após carregar dados
      if (result.metrics && result.metrics.spend > 0) {
        fetchAIAnalysis(result);
      }
    } catch (err: any) {
      console.error('❌ [Consolidado] Erro:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  // Carregar dados ao montar e quando filtros mudam
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Exportar CSV
  const handleExportCSV = () => {
    if (!data || data.campaigns.length === 0) return;

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
    a.download = `consolidado-${dateRange.start}-${dateRange.end}.csv`;
    a.click();
    
    URL.revokeObjectURL(url);
  };

  // Formatar valores
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // Helper para verificar se tem dados
  const hasData = data && (data.metrics.spend > 0 || data.metrics.impressions > 0);
  const connectedPlatforms = data?.platform_status?.filter(p => p.connected) || [];
  const disconnectedPlatforms = data?.platform_status?.filter(p => !p.connected) || [];

  return (
    <div className="text-white">
      {/* Toolbar */}
      <div className="bg-[#0f1520] border-b border-[#2d3748] -mx-4 sm:-mx-6 lg:-mx-8 -mt-4 sm:-mt-6 lg:-mt-8 mb-6">
        <div className="px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            {/* Status das plataformas */}
            <div className="flex items-center gap-3">
              {data?.platform_status?.map((p) => (
                <div
                  key={p.platform}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg border",
                    p.connected
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      : "bg-zinc-800/50 border-zinc-700 text-zinc-500"
                  )}
                >
                  <span className="text-lg">
                    {p.platform === 'meta' ? '📘' : p.platform === 'google_ads' ? '🔍' : '📊'}
                  </span>
                  <span className="text-sm font-medium">
                    {p.platform === 'meta' ? 'Meta Ads' : 
                     p.platform === 'google_ads' ? 'Google Ads' : 'Analytics'}
                  </span>
                  {p.connected ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                </div>
              ))}
            </div>

            {/* Controles direita */}
            <div className="flex items-center gap-3 flex-wrap">
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
                disabled={!hasData}
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
                href="/admin/cockpit/consolidado/connect"
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
      </div>

      {/* Conteúdo */}
      <div>
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

        {/* Aviso de plataformas desconectadas */}
        {disconnectedPlatforms.length > 0 && (
          <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
            <div className="flex items-start gap-3">
              <Unplug className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-400">
                  Plataformas não conectadas
                </p>
                <p className="text-sm text-amber-300/80 mt-1">
                  {disconnectedPlatforms.map(p => 
                    p.platform === 'meta' ? 'Meta Ads' : 
                    p.platform === 'google_ads' ? 'Google Ads' : 'Google Analytics'
                  ).join(', ')} {disconnectedPlatforms.length === 1 ? 'não está conectado' : 'não estão conectados'}. 
                  Configure as credenciais para ver dados dessas plataformas.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Sem dados */}
        {!loading && !hasData && connectedPlatforms.length === 0 && (
          <div className="mb-6 p-8 bg-[#1a2332] rounded-xl border border-[#2d3748] text-center">
            <Unplug className="w-12 h-12 text-zinc-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">
              Nenhuma plataforma conectada
            </h3>
            <p className="text-zinc-400 mb-4">
              Conecte suas contas de anúncios para ver métricas consolidadas
            </p>
            <Link
              href="/admin/cockpit/consolidado/connect"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
            >
              <Plus className="w-5 h-5" />
              Conectar Conta
            </Link>
          </div>
        )}

        {/* Painel de Análise IA */}
        {hasData && (
          <div className="mb-6">
            <AIInsightPanel
              type="consolidated"
              loading={aiLoading}
              error={aiError || undefined}
              summary={aiAnalysis?.summary}
              healthScore={aiAnalysis?.healthScore}
              accountStatus={aiAnalysis?.accountStatus}
              actions={aiAnalysis?.immediateActions}
              executiveSummary={aiAnalysis?.executiveSummary}
              generatedAt={aiAnalysis?.generatedAt}
              onRefresh={() => {
                if (data) {
                  fetchAIAnalysis(data);
                }
              }}
            />
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
                Evolução Diária
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
            {data && data.daily_data && data.daily_data.length > 0 ? (
              <ComparisonChart
                data={data.daily_data}
                metric={chartMetric}
                loading={loading}
                className="bg-transparent border-0 p-0"
              />
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-zinc-500">
                {loading ? (
                  <RefreshCw className="w-8 h-8 animate-spin mb-2" />
                ) : (
                  <>
                    <AlertTriangle className="w-8 h-8 mb-2" />
                    <span>Sem dados diários para o período</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Resumo por plataforma - só mostra se tiver dados */}
        {data?.by_platform && (data.by_platform.meta || data.by_platform.google_ads) && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {/* Meta Ads */}
            {data.by_platform.meta && (
              <div className="bg-[#1a2332] rounded-xl p-4 border border-[#2d3748]">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">📘</span>
                  <h4 className="font-semibold text-white">Meta Ads</h4>
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  {data.metrics.spend > 0 && (
                    <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-xs ml-auto">
                      {((data.by_platform.meta.spend || 0) / (data.metrics.spend || 1) * 100).toFixed(0)}% do gasto
                    </span>
                  )}
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

            {/* Google Ads - Desconectado */}
            <div className="bg-[#1a2332] rounded-xl p-4 border border-[#2d3748] opacity-60">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">🔍</span>
                <h4 className="font-semibold text-white">Google Ads</h4>
                <XCircle className="w-4 h-4 text-zinc-500" />
                <span className="px-2 py-0.5 rounded bg-zinc-700 text-zinc-400 text-xs ml-auto">
                  Desconectado
                </span>
              </div>
              <div className="text-center py-4">
                <Unplug className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                <p className="text-sm text-zinc-500">Conecte sua conta do Google Ads</p>
              </div>
            </div>

            {/* Google Analytics - Desconectado */}
            <div className="bg-[#1a2332] rounded-xl p-4 border border-[#2d3748] opacity-60">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">📊</span>
                <h4 className="font-semibold text-white">Analytics</h4>
                <XCircle className="w-4 h-4 text-zinc-500" />
                <span className="px-2 py-0.5 rounded bg-zinc-700 text-zinc-400 text-xs ml-auto">
                  Desconectado
                </span>
              </div>
              <div className="text-center py-4">
                <Unplug className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                <p className="text-sm text-zinc-500">Conecte sua conta do GA4</p>
              </div>
            </div>
          </div>
        )}

        {/* Tabela de campanhas */}
        {data && data.campaigns.length > 0 ? (
          <CampaignsTable
            campaigns={data.campaigns}
            loading={loading}
            onPauseCampaign={(id) => console.log('Pausar:', id)}
            onResumeCampaign={(id) => console.log('Ativar:', id)}
          />
        ) : !loading && (
          <div className="bg-[#1a2332] rounded-xl p-8 border border-[#2d3748] text-center">
            <AlertTriangle className="w-10 h-10 text-zinc-500 mx-auto mb-3" />
            <h4 className="font-semibold text-white mb-2">Nenhuma campanha encontrada</h4>
            <p className="text-sm text-zinc-400">
              {connectedPlatforms.length === 0 
                ? 'Conecte suas contas de anúncios para ver campanhas'
                : 'Não há campanhas ativas no período selecionado'}
            </p>
          </div>
        )}

        {/* Footer com resumo */}
        {data && hasData && (
          <div className="mt-6 p-4 bg-[#1a2332] rounded-xl border border-[#2d3748]">
            <div className="flex items-center justify-between flex-wrap gap-4 text-sm">
              <div className="text-zinc-400">
                Período: <span className="text-white">{dateRange.start}</span> até <span className="text-white">{dateRange.end}</span>
                <span className="mx-3 text-zinc-600">|</span>
                <span className="text-emerald-400">
                  {connectedPlatforms.length} plataforma{connectedPlatforms.length !== 1 ? 's' : ''} conectada{connectedPlatforms.length !== 1 ? 's' : ''}
                </span>
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
      </div>
    </div>
  );
}
