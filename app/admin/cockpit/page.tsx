'use client';

/**
 * 🎯 COCKPIT DE CAMPANHAS - DASHBOARD PROFISSIONAL
 * 
 * Métricas completas de campanhas Meta Ads com:
 * - Tabela detalhada por Campanha > Conjunto > Anúncio
 * - Funil de Tráfego visual
 * - Análise de Consciência do Consumidor
 * - Gráficos de performance
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  Target, TrendingUp, DollarSign, Users, MousePointer, Eye, 
  ShoppingCart, CreditCard, ArrowRight, ChevronDown, ChevronRight,
  RefreshCw, Download, Filter, BarChart3, PieChart, Layers,
  AlertCircle, CheckCircle, Clock, Zap, Brain, Sparkles
} from 'lucide-react';
import { AIInsightPanel } from '@/components/ai/AIInsightPanel';

// =====================================================
// TIPOS
// =====================================================

interface CockpitCampaign {
  campaign_id: string;
  campaign_name: string;
  adset_id?: string;
  adset_name?: string;
  ad_id?: string;
  ad_name?: string;
  level: 'campaign' | 'adset' | 'ad';
  
  reach: number;
  impressions: number;
  frequency: number;
  cpm: number;
  
  clicks: number;
  link_clicks: number;
  cpc: number;
  ctr: number;
  
  landing_page_views: number;
  connect_rate: number;
  
  checkout_initiated: number;
  checkout_add_payment_info: number;
  checkout_completed: number;
  checkout_conversion_rate: number;
  pv_to_checkout_rate: number;
  
  purchases: number;
  purchase_value: number;
  cost_per_purchase: number;
  
  spend: number;
  roas: number;
  profit_percentage: number;
  profit_value: number;
  ticket_medio: number;
  
  global_conversion_rate: number;
  
  funnel_stage?: 'topo' | 'meio' | 'fundo';
  consciousness_level?: string;
}

interface CockpitData {
  success: boolean;
  period: { since: string; until: string };
  summary: {
    total_spend: number;
    total_reach: number;
    total_impressions: number;
    total_clicks: number;
    total_link_clicks: number;
    total_landing_page_views: number;
    total_checkouts: number;
    total_purchases: number;
    total_revenue: number;
    avg_cpm: number;
    avg_cpc: number;
    avg_ctr: number;
    avg_connect_rate: number;
    avg_checkout_rate: number;
    overall_roas: number;
    overall_profit: number;
    avg_ticket: number;
  };
  campaigns: CockpitCampaign[];
  adsets: CockpitCampaign[];
  ads: CockpitCampaign[];
  funnel_analysis: {
    topo: CockpitCampaign[];
    meio: CockpitCampaign[];
    fundo: CockpitCampaign[];
  };
}

// =====================================================
// HELPERS
// =====================================================

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2
  }).format(value);
};

const formatNumber = (value: number) => {
  return new Intl.NumberFormat('pt-BR').format(Math.round(value));
};

const formatPercent = (value: number) => {
  return `${value.toFixed(2)}%`;
};

const getROASColor = (roas: number) => {
  if (roas >= 3) return 'text-green-500';
  if (roas >= 2) return 'text-emerald-400';
  if (roas >= 1) return 'text-yellow-500';
  return 'text-red-500';
};

const getProfitColor = (profit: number) => {
  if (profit > 0) return 'text-green-500';
  if (profit === 0) return 'text-gray-400';
  return 'text-red-500';
};

const getFunnelColor = (stage: string) => {
  switch (stage) {
    case 'topo': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'meio': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'fundo': return 'bg-red-500/20 text-red-400 border-red-500/30';
    default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
};

const getConsciousnessInfo = (level: string) => {
  const info: Record<string, { label: string; description: string; color: string }> = {
    'inconsciente': {
      label: 'Inconsciente',
      description: 'Não conhece o produto nem o problema',
      color: 'bg-blue-500'
    },
    'problema': {
      label: 'Consciente do Problema',
      description: 'Reconhece o problema mas não a solução',
      color: 'bg-cyan-500'
    },
    'solucao': {
      label: 'Consciente da Solução',
      description: 'Sabe o tipo de solução que precisa',
      color: 'bg-yellow-500'
    },
    'produto': {
      label: 'Consciente do Produto',
      description: 'Conhece o produto, avalia confiança',
      color: 'bg-orange-500'
    },
    'totalmente_consciente': {
      label: 'Totalmente Consciente',
      description: 'Pronto para comprar, espera promoção',
      color: 'bg-green-500'
    }
  };
  return info[level] || { label: level, description: '', color: 'bg-gray-500' };
};

// =====================================================
// COMPONENTES
// =====================================================

// Card de Métrica KPI
function KPICard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  color = 'blue',
  trend 
}: { 
  title: string; 
  value: string; 
  subtitle?: string;
  icon: any; 
  color?: string;
  trend?: { value: number; isPositive: boolean };
}) {
  const colorClasses: Record<string, string> = {
    blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
    green: 'from-green-500/20 to-green-600/10 border-green-500/30',
    purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/30',
    orange: 'from-orange-500/20 to-orange-600/10 border-orange-500/30',
    cyan: 'from-cyan-500/20 to-cyan-600/10 border-cyan-500/30',
    pink: 'from-pink-500/20 to-pink-600/10 border-pink-500/30',
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} border rounded-xl p-4`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-400 uppercase tracking-wider">{title}</span>
        <Icon className="w-4 h-4 text-gray-400" />
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {subtitle && <div className="text-xs text-gray-400 mt-1">{subtitle}</div>}
      {trend && (
        <div className={`text-xs mt-2 ${trend.isPositive ? 'text-green-400' : 'text-red-400'}`}>
          {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value).toFixed(1)}%
        </div>
      )}
    </div>
  );
}

// Funil Visual de Tráfego
function TrafficFunnel({ data }: { data: CockpitData['summary'] }) {
  const stages = [
    { label: 'Impressões', value: data.total_impressions, color: 'bg-blue-500' },
    { label: 'Cliques', value: data.total_clicks, color: 'bg-cyan-500' },
    { label: 'Page Views', value: data.total_landing_page_views, color: 'bg-yellow-500' },
    { label: 'Checkouts', value: data.total_checkouts, color: 'bg-orange-500' },
    { label: 'Compras', value: data.total_purchases, color: 'bg-green-500' },
  ];

  const maxValue = Math.max(...stages.map(s => s.value));

  return (
    <div className="bg-[#1a1a2e] rounded-xl p-6 border border-gray-800">
      <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
        <Layers className="w-5 h-5 text-blue-400" />
        Funil de Tráfego
      </h3>
      
      <div className="space-y-3">
        {stages.map((stage, index) => {
          const width = maxValue > 0 ? (stage.value / maxValue) * 100 : 0;
          const dropRate = index > 0 && stages[index - 1].value > 0 
            ? ((stages[index - 1].value - stage.value) / stages[index - 1].value * 100).toFixed(1)
            : null;
          
          return (
            <div key={stage.label} className="relative">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-300">{stage.label}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-white">{formatNumber(stage.value)}</span>
                  {dropRate && (
                    <span className="text-xs text-red-400">-{dropRate}%</span>
                  )}
                </div>
              </div>
              <div className="h-8 bg-gray-800 rounded-lg overflow-hidden">
                <div 
                  className={`h-full ${stage.color} transition-all duration-500 rounded-lg flex items-center justify-end pr-3`}
                  style={{ width: `${Math.max(width, 5)}%` }}
                >
                  {width > 20 && (
                    <span className="text-xs font-medium text-white/80">
                      {formatNumber(stage.value)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Taxas de Conversão */}
      <div className="mt-6 pt-4 border-t border-gray-700 grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-xs text-gray-400">Click Rate</div>
          <div className="text-lg font-bold text-blue-400">
            {data.avg_ctr.toFixed(2)}%
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-400">Connect Rate</div>
          <div className="text-lg font-bold text-yellow-400">
            {data.avg_connect_rate.toFixed(2)}%
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-400">Checkout Rate</div>
          <div className="text-lg font-bold text-green-400">
            {data.avg_checkout_rate.toFixed(2)}%
          </div>
        </div>
      </div>
    </div>
  );
}

// Card de Análise de Consciência
function ConsciousnessAnalysis({ funnelData }: { funnelData: CockpitData['funnel_analysis'] }) {
  const stages = [
    { key: 'topo', label: 'Topo do Funil', data: funnelData.topo, color: 'blue', icon: Eye },
    { key: 'meio', label: 'Meio do Funil', data: funnelData.meio, color: 'yellow', icon: Brain },
    { key: 'fundo', label: 'Fundo do Funil', data: funnelData.fundo, color: 'green', icon: Target },
  ];

  return (
    <div className="bg-[#1a1a2e] rounded-xl p-6 border border-gray-800">
      <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
        <Brain className="w-5 h-5 text-purple-400" />
        Análise de Consciência do Consumidor
      </h3>
      
      <div className="grid grid-cols-3 gap-4">
        {stages.map((stage) => {
          const totalSpend = stage.data.reduce((sum, c) => sum + c.spend, 0);
          const totalRevenue = stage.data.reduce((sum, c) => sum + c.purchase_value, 0);
          const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
          
          return (
            <div 
              key={stage.key} 
              className={`p-4 rounded-lg border ${getFunnelColor(stage.key)}`}
            >
              <div className="flex items-center gap-2 mb-3">
                <stage.icon className="w-4 h-4" />
                <span className="font-medium">{stage.label}</span>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Campanhas:</span>
                  <span className="font-medium">{stage.data.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Investimento:</span>
                  <span className="font-medium">{formatCurrency(totalSpend)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Receita:</span>
                  <span className="font-medium">{formatCurrency(totalRevenue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">ROAS:</span>
                  <span className={`font-bold ${getROASColor(avgRoas)}`}>
                    {avgRoas.toFixed(2)}x
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Legenda de Consciência */}
      <div className="mt-6 pt-4 border-t border-gray-700">
        <h4 className="text-sm font-medium text-gray-300 mb-3">Níveis de Consciência:</h4>
        <div className="grid grid-cols-5 gap-2">
          {['inconsciente', 'problema', 'solucao', 'produto', 'totalmente_consciente'].map((level) => {
            const info = getConsciousnessInfo(level);
            return (
              <div key={level} className="text-center">
                <div className={`w-3 h-3 rounded-full ${info.color} mx-auto mb-1`} />
                <div className="text-[10px] text-gray-400">{info.label}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Tabela de Campanhas Expandível
function CampaignsTable({ 
  campaigns, 
  adsets, 
  ads 
}: { 
  campaigns: CockpitCampaign[];
  adsets: CockpitCampaign[];
  ads: CockpitCampaign[];
}) {
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());
  const [expandedAdsets, setExpandedAdsets] = useState<Set<string>>(new Set());

  const toggleCampaign = (id: string) => {
    const newExpanded = new Set(expandedCampaigns);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedCampaigns(newExpanded);
  };

  const toggleAdset = (id: string) => {
    const newExpanded = new Set(expandedAdsets);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedAdsets(newExpanded);
  };

  return (
    <div className="bg-[#1a1a2e] rounded-xl border border-gray-800 overflow-hidden">
      <div className="p-4 border-b border-gray-800">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-400" />
          Métricas por Campanha / Conjunto / Anúncio
        </h3>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-800/50">
            <tr>
              <th className="text-left p-3 text-gray-400 font-medium sticky left-0 bg-gray-800/50">Nome</th>
              <th className="text-right p-3 text-gray-400 font-medium">Alcance</th>
              <th className="text-right p-3 text-gray-400 font-medium">Impressões</th>
              <th className="text-right p-3 text-gray-400 font-medium">CPM</th>
              <th className="text-right p-3 text-gray-400 font-medium">Freq.</th>
              <th className="text-right p-3 text-gray-400 font-medium">Cliques</th>
              <th className="text-right p-3 text-gray-400 font-medium">CPC</th>
              <th className="text-right p-3 text-gray-400 font-medium">CTR</th>
              <th className="text-right p-3 text-gray-400 font-medium">PV</th>
              <th className="text-right p-3 text-gray-400 font-medium">Connect</th>
              <th className="text-right p-3 text-gray-400 font-medium">Checkout</th>
              <th className="text-right p-3 text-gray-400 font-medium">PV→CK</th>
              <th className="text-right p-3 text-gray-400 font-medium">Compras</th>
              <th className="text-right p-3 text-gray-400 font-medium">CPA</th>
              <th className="text-right p-3 text-gray-400 font-medium">Receita</th>
              <th className="text-right p-3 text-gray-400 font-medium">ROAS</th>
              <th className="text-right p-3 text-gray-400 font-medium">Lucro %</th>
              <th className="text-right p-3 text-gray-400 font-medium">Lucro R$</th>
              <th className="text-right p-3 text-gray-400 font-medium">Gasto</th>
              <th className="text-right p-3 text-gray-400 font-medium">Ticket</th>
              <th className="text-center p-3 text-gray-400 font-medium">Funil</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((campaign) => {
              const campaignAdsets = adsets.filter(a => a.campaign_id === campaign.campaign_id);
              const isExpanded = expandedCampaigns.has(campaign.campaign_id);
              
              return (
                <>
                  {/* Linha da Campanha */}
                  <tr 
                    key={campaign.campaign_id}
                    className="border-b border-gray-800 hover:bg-gray-800/30 cursor-pointer"
                    onClick={() => toggleCampaign(campaign.campaign_id)}
                  >
                    <td className="p-3 sticky left-0 bg-[#1a1a2e]">
                      <div className="flex items-center gap-2">
                        {campaignAdsets.length > 0 ? (
                          isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />
                        ) : (
                          <div className="w-4" />
                        )}
                        <span className="font-medium text-white truncate max-w-[200px]" title={campaign.campaign_name}>
                          {campaign.campaign_name}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-right text-gray-300">{formatNumber(campaign.reach)}</td>
                    <td className="p-3 text-right text-gray-300">{formatNumber(campaign.impressions)}</td>
                    <td className="p-3 text-right text-gray-300">{formatCurrency(campaign.cpm)}</td>
                    <td className="p-3 text-right text-gray-300">{campaign.frequency.toFixed(2)}</td>
                    <td className="p-3 text-right text-gray-300">{formatNumber(campaign.clicks)}</td>
                    <td className="p-3 text-right text-gray-300">{formatCurrency(campaign.cpc)}</td>
                    <td className="p-3 text-right text-blue-400">{formatPercent(campaign.ctr)}</td>
                    <td className="p-3 text-right text-gray-300">{formatNumber(campaign.landing_page_views)}</td>
                    <td className="p-3 text-right text-yellow-400">{formatPercent(campaign.connect_rate)}</td>
                    <td className="p-3 text-right text-gray-300">{formatNumber(campaign.checkout_initiated)}</td>
                    <td className="p-3 text-right text-orange-400">{formatPercent(campaign.pv_to_checkout_rate)}</td>
                    <td className="p-3 text-right text-gray-300">{formatNumber(campaign.purchases)}</td>
                    <td className="p-3 text-right text-gray-300">{formatCurrency(campaign.cost_per_purchase)}</td>
                    <td className="p-3 text-right text-green-400 font-medium">{formatCurrency(campaign.purchase_value)}</td>
                    <td className={`p-3 text-right font-bold ${getROASColor(campaign.roas)}`}>{campaign.roas.toFixed(2)}x</td>
                    <td className={`p-3 text-right font-medium ${getProfitColor(campaign.profit_percentage)}`}>{formatPercent(campaign.profit_percentage)}</td>
                    <td className={`p-3 text-right font-medium ${getProfitColor(campaign.profit_value)}`}>{formatCurrency(campaign.profit_value)}</td>
                    <td className="p-3 text-right text-gray-300">{formatCurrency(campaign.spend)}</td>
                    <td className="p-3 text-right text-gray-300">{formatCurrency(campaign.ticket_medio)}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-1 text-xs rounded-full border ${getFunnelColor(campaign.funnel_stage || '')}`}>
                        {campaign.funnel_stage?.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                  
                  {/* Linhas dos AdSets (expandidas) */}
                  {isExpanded && campaignAdsets.map((adset) => {
                    const adsetAds = ads.filter(a => a.adset_id === adset.adset_id);
                    const isAdsetExpanded = expandedAdsets.has(adset.adset_id || '');
                    
                    return (
                      <>
                        <tr 
                          key={adset.adset_id}
                          className="border-b border-gray-800/50 bg-gray-900/30 hover:bg-gray-800/20 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleAdset(adset.adset_id || '');
                          }}
                        >
                          <td className="p-3 pl-8 sticky left-0 bg-gray-900/30">
                            <div className="flex items-center gap-2">
                              {adsetAds.length > 0 ? (
                                isAdsetExpanded ? <ChevronDown className="w-3 h-3 text-gray-500" /> : <ChevronRight className="w-3 h-3 text-gray-500" />
                              ) : (
                                <div className="w-3" />
                              )}
                              <span className="text-gray-300 text-sm truncate max-w-[180px]" title={adset.adset_name}>
                                ↳ {adset.adset_name}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 text-right text-gray-400 text-sm">{formatNumber(adset.reach)}</td>
                          <td className="p-3 text-right text-gray-400 text-sm">{formatNumber(adset.impressions)}</td>
                          <td className="p-3 text-right text-gray-400 text-sm">{formatCurrency(adset.cpm)}</td>
                          <td className="p-3 text-right text-gray-400 text-sm">{adset.frequency.toFixed(2)}</td>
                          <td className="p-3 text-right text-gray-400 text-sm">{formatNumber(adset.clicks)}</td>
                          <td className="p-3 text-right text-gray-400 text-sm">{formatCurrency(adset.cpc)}</td>
                          <td className="p-3 text-right text-blue-400/70 text-sm">{formatPercent(adset.ctr)}</td>
                          <td className="p-3 text-right text-gray-400 text-sm">{formatNumber(adset.landing_page_views)}</td>
                          <td className="p-3 text-right text-yellow-400/70 text-sm">{formatPercent(adset.connect_rate)}</td>
                          <td className="p-3 text-right text-gray-400 text-sm">{formatNumber(adset.checkout_initiated)}</td>
                          <td className="p-3 text-right text-orange-400/70 text-sm">{formatPercent(adset.pv_to_checkout_rate)}</td>
                          <td className="p-3 text-right text-gray-400 text-sm">{formatNumber(adset.purchases)}</td>
                          <td className="p-3 text-right text-gray-400 text-sm">{formatCurrency(adset.cost_per_purchase)}</td>
                          <td className="p-3 text-right text-green-400/70 text-sm">{formatCurrency(adset.purchase_value)}</td>
                          <td className={`p-3 text-right text-sm ${getROASColor(adset.roas)}`}>{adset.roas.toFixed(2)}x</td>
                          <td className={`p-3 text-right text-sm ${getProfitColor(adset.profit_percentage)}`}>{formatPercent(adset.profit_percentage)}</td>
                          <td className={`p-3 text-right text-sm ${getProfitColor(adset.profit_value)}`}>{formatCurrency(adset.profit_value)}</td>
                          <td className="p-3 text-right text-gray-400 text-sm">{formatCurrency(adset.spend)}</td>
                          <td className="p-3 text-right text-gray-400 text-sm">{formatCurrency(adset.ticket_medio)}</td>
                          <td className="p-3"></td>
                        </tr>
                        
                        {/* Linhas dos Ads (expandidas) */}
                        {isAdsetExpanded && adsetAds.map((ad) => (
                          <tr 
                            key={ad.ad_id}
                            className="border-b border-gray-800/30 bg-gray-900/50"
                          >
                            <td className="p-3 pl-14 sticky left-0 bg-gray-900/50">
                              <span className="text-gray-500 text-xs truncate max-w-[160px] block" title={ad.ad_name}>
                                ↳ {ad.ad_name}
                              </span>
                            </td>
                            <td className="p-3 text-right text-gray-500 text-xs">{formatNumber(ad.reach)}</td>
                            <td className="p-3 text-right text-gray-500 text-xs">{formatNumber(ad.impressions)}</td>
                            <td className="p-3 text-right text-gray-500 text-xs">{formatCurrency(ad.cpm)}</td>
                            <td className="p-3 text-right text-gray-500 text-xs">{ad.frequency.toFixed(2)}</td>
                            <td className="p-3 text-right text-gray-500 text-xs">{formatNumber(ad.clicks)}</td>
                            <td className="p-3 text-right text-gray-500 text-xs">{formatCurrency(ad.cpc)}</td>
                            <td className="p-3 text-right text-blue-400/50 text-xs">{formatPercent(ad.ctr)}</td>
                            <td className="p-3 text-right text-gray-500 text-xs">{formatNumber(ad.landing_page_views)}</td>
                            <td className="p-3 text-right text-yellow-400/50 text-xs">{formatPercent(ad.connect_rate)}</td>
                            <td className="p-3 text-right text-gray-500 text-xs">{formatNumber(ad.checkout_initiated)}</td>
                            <td className="p-3 text-right text-orange-400/50 text-xs">{formatPercent(ad.pv_to_checkout_rate)}</td>
                            <td className="p-3 text-right text-gray-500 text-xs">{formatNumber(ad.purchases)}</td>
                            <td className="p-3 text-right text-gray-500 text-xs">{formatCurrency(ad.cost_per_purchase)}</td>
                            <td className="p-3 text-right text-green-400/50 text-xs">{formatCurrency(ad.purchase_value)}</td>
                            <td className={`p-3 text-right text-xs ${getROASColor(ad.roas)}`}>{ad.roas.toFixed(2)}x</td>
                            <td className={`p-3 text-right text-xs ${getProfitColor(ad.profit_percentage)}`}>{formatPercent(ad.profit_percentage)}</td>
                            <td className={`p-3 text-right text-xs ${getProfitColor(ad.profit_value)}`}>{formatCurrency(ad.profit_value)}</td>
                            <td className="p-3 text-right text-gray-500 text-xs">{formatCurrency(ad.spend)}</td>
                            <td className="p-3 text-right text-gray-500 text-xs">{formatCurrency(ad.ticket_medio)}</td>
                            <td className="p-3"></td>
                          </tr>
                        ))}
                      </>
                    );
                  })}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// =====================================================
// PÁGINA PRINCIPAL
// =====================================================

export default function CockpitPage() {
  const [data, setData] = useState<CockpitData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('7');
  
  // Estados da IA
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Função para buscar análise da IA
  const fetchAIAnalysis = useCallback(async (cockpitData: CockpitData) => {
    setAiLoading(true);
    setAiError(null);
    
    try {
      const response = await fetch('/api/ai/cockpit-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: cockpitData })
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

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/ads/cockpit?days=${period}`);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Erro ao carregar dados');
      }
      
      setData(result);
      
      // Buscar análise da IA após carregar dados
      if (result.summary && result.summary.total_spend > 0) {
        fetchAIAnalysis(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0d1a] flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Carregando dados do Cockpit...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0d0d1a] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-400 mb-4">{error}</p>
          <button 
            onClick={fetchData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-[#0d0d1a] p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Target className="w-8 h-8 text-blue-500" />
            Cockpit de Campanhas
          </h1>
          <p className="text-gray-400 mt-1">
            Análise completa • {data.period.since} até {data.period.until}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Seletor de Período */}
          <select 
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2"
          >
            <option value="0">Hoje</option>
            <option value="1">Ontem</option>
            <option value="7">Últimos 7 dias</option>
            <option value="14">Últimos 14 dias</option>
            <option value="30">Últimos 30 dias</option>
          </select>
          
          <button 
            onClick={fetchData}
            className="p-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Painel de Análise IA */}
      <div className="mb-8">
        <AIInsightPanel
          type="cockpit"
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
      
      {/* KPIs Principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-8">
        <KPICard
          title="Investimento"
          value={formatCurrency(data.summary.total_spend)}
          icon={DollarSign}
          color="blue"
        />
        <KPICard
          title="Alcance"
          value={formatNumber(data.summary.total_reach)}
          icon={Users}
          color="cyan"
        />
        <KPICard
          title="Cliques"
          value={formatNumber(data.summary.total_clicks)}
          subtitle={`CTR: ${data.summary.avg_ctr.toFixed(2)}%`}
          icon={MousePointer}
          color="purple"
        />
        <KPICard
          title="Page Views"
          value={formatNumber(data.summary.total_landing_page_views)}
          subtitle={`Connect: ${data.summary.avg_connect_rate.toFixed(1)}%`}
          icon={Eye}
          color="orange"
        />
        <KPICard
          title="Checkouts"
          value={formatNumber(data.summary.total_checkouts)}
          subtitle={`Taxa: ${data.summary.avg_checkout_rate.toFixed(1)}%`}
          icon={ShoppingCart}
          color="pink"
        />
        <KPICard
          title="Compras"
          value={formatNumber(data.summary.total_purchases)}
          icon={CreditCard}
          color="green"
        />
        <KPICard
          title="Receita"
          value={formatCurrency(data.summary.total_revenue)}
          subtitle={`Ticket: ${formatCurrency(data.summary.avg_ticket)}`}
          icon={TrendingUp}
          color="green"
        />
        <KPICard
          title="ROAS"
          value={`${data.summary.overall_roas.toFixed(2)}x`}
          subtitle={`Lucro: ${formatCurrency(data.summary.overall_profit)}`}
          icon={Zap}
          color={data.summary.overall_roas >= 2 ? 'green' : 'orange'}
        />
      </div>
      
      {/* Funil e Análise de Consciência */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <TrafficFunnel data={data.summary} />
        <ConsciousnessAnalysis funnelData={data.funnel_analysis} />
      </div>
      
      {/* Tabela de Campanhas */}
      <CampaignsTable 
        campaigns={data.campaigns}
        adsets={data.adsets}
        ads={data.ads}
      />
    </div>
  );
}
