'use client';

/**
 * 📋 CampaignsTable - Tabela de campanhas com drill-down
 */

import { useState } from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  Pause, 
  Play, 
  MoreHorizontal,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CampaignData } from '@/lib/consolidator';

interface CampaignsTableProps {
  campaigns: CampaignData[];
  loading?: boolean;
  onPauseCampaign?: (id: string) => void;
  onResumeCampaign?: (id: string) => void;
  className?: string;
}

export function CampaignsTable({ 
  campaigns, 
  loading = false,
  onPauseCampaign,
  onResumeCampaign,
  className 
}: CampaignsTableProps) {
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<keyof CampaignData>('spend');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Toggle expansion
  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedCampaigns);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedCampaigns(newExpanded);
  };

  // Ordenar
  const sortedCampaigns = [...campaigns].sort((a, b) => {
    const aVal = a[sortField] ?? 0;
    const bVal = b[sortField] ?? 0;
    
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDirection === 'desc' ? bVal - aVal : aVal - bVal;
    }
    
    return sortDirection === 'desc' 
      ? String(bVal).localeCompare(String(aVal))
      : String(aVal).localeCompare(String(bVal));
  });

  // Formatar valores
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const formatNumber = (val: number) => {
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
    return val.toLocaleString('pt-BR');
  };

  // Cor do ROAS
  const getRoasColor = (roas: number) => {
    if (roas >= 3) return 'text-emerald-400';
    if (roas >= 2) return 'text-green-400';
    if (roas >= 1) return 'text-yellow-400';
    return 'text-red-400';
  };

  // Ícone da plataforma
  const PlatformIcon = ({ platform }: { platform: string }) => {
    if (platform === 'meta') {
      return (
        <div className="w-5 h-5 rounded bg-blue-500/20 flex items-center justify-center">
          <span className="text-xs">📘</span>
        </div>
      );
    }
    return (
      <div className="w-5 h-5 rounded bg-red-500/20 flex items-center justify-center">
        <span className="text-xs">🔍</span>
      </div>
    );
  };

  // Status badge
  const StatusBadge = ({ status }: { status: string }) => {
    const colors = {
      ACTIVE: 'bg-emerald-500/20 text-emerald-400',
      PAUSED: 'bg-yellow-500/20 text-yellow-400',
      DELETED: 'bg-red-500/20 text-red-400',
      ARCHIVED: 'bg-zinc-500/20 text-zinc-400'
    };

    return (
      <span className={cn(
        "px-2 py-0.5 rounded text-xs font-medium",
        colors[status as keyof typeof colors] || colors.ARCHIVED
      )}>
        {status === 'ACTIVE' ? 'Ativo' : 
         status === 'PAUSED' ? 'Pausado' : 
         status === 'DELETED' ? 'Excluído' : 'Arquivado'}
      </span>
    );
  };

  // Header sortável
  const SortableHeader = ({ field, label, align = 'left' }: { field: keyof CampaignData; label: string; align?: 'left' | 'right' }) => (
    <th 
      className={cn(
        "py-3 px-4 text-xs font-medium text-zinc-400 cursor-pointer hover:text-white transition-colors",
        align === 'right' ? 'text-right' : 'text-left'
      )}
      onClick={() => {
        if (sortField === field) {
          setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc');
        } else {
          setSortField(field);
          setSortDirection('desc');
        }
      }}
    >
      <div className={cn("flex items-center gap-1", align === 'right' && "justify-end")}>
        {label}
        {sortField === field && (
          sortDirection === 'desc' 
            ? <ChevronDown className="w-3 h-3" />
            : <ChevronRight className="w-3 h-3 rotate-90" />
        )}
      </div>
    </th>
  );

  if (loading) {
    return (
      <div className={cn("bg-[#1a2332] rounded-xl border border-[#2d3748] overflow-hidden", className)}>
        <div className="p-4 border-b border-[#2d3748]">
          <div className="h-6 bg-zinc-700 rounded w-40 animate-pulse" />
        </div>
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-12 bg-zinc-700/50 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-[#1a2332] rounded-xl border border-[#2d3748] overflow-hidden", className)}>
      {/* Header */}
      <div className="p-4 border-b border-[#2d3748] flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <span>📋</span>
          Campanhas
          <span className="text-sm font-normal text-zinc-400">
            ({campaigns.length})
          </span>
        </h3>
        
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">
            Total: {formatCurrency(campaigns.reduce((acc, c) => acc + c.spend, 0))}
          </span>
        </div>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[#0f1520]">
            <tr>
              <th className="py-3 px-4 w-8" />
              <SortableHeader field="name" label="Campanha" />
              <SortableHeader field="status" label="Status" />
              <SortableHeader field="spend" label="Gasto" align="right" />
              <SortableHeader field="impressions" label="Impressões" align="right" />
              <SortableHeader field="clicks" label="Cliques" align="right" />
              <SortableHeader field="ctr" label="CTR" align="right" />
              <SortableHeader field="conversions" label="Conv." align="right" />
              <SortableHeader field="revenue" label="Receita" align="right" />
              <SortableHeader field="roas" label="ROAS" align="right" />
              <th className="py-3 px-4 w-12" />
            </tr>
          </thead>
          <tbody>
            {sortedCampaigns.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-12 text-center text-zinc-500">
                  Nenhuma campanha encontrada
                </td>
              </tr>
            ) : (
              sortedCampaigns.map((campaign) => (
                <>
                  {/* Linha da campanha */}
                  <tr 
                    key={campaign.id}
                    className="border-t border-[#2d3748] hover:bg-[#1f2937] transition-colors"
                  >
                    <td className="py-3 px-4">
                      <button 
                        onClick={() => toggleExpand(campaign.id)}
                        className="p-1 hover:bg-zinc-700 rounded transition-colors"
                      >
                        {expandedCampaigns.has(campaign.id) 
                          ? <ChevronDown className="w-4 h-4 text-zinc-400" />
                          : <ChevronRight className="w-4 h-4 text-zinc-400" />
                        }
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <PlatformIcon platform={campaign.platform} />
                        <div>
                          <div className="text-sm font-medium text-white max-w-[200px] truncate">
                            {campaign.name}
                          </div>
                          <div className="text-xs text-zinc-500">
                            {campaign.objective || campaign.platform}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={campaign.status} />
                    </td>
                    <td className="py-3 px-4 text-right text-sm text-white font-medium">
                      {formatCurrency(campaign.spend)}
                    </td>
                    <td className="py-3 px-4 text-right text-sm text-zinc-300">
                      {formatNumber(campaign.impressions)}
                    </td>
                    <td className="py-3 px-4 text-right text-sm text-zinc-300">
                      {formatNumber(campaign.clicks)}
                    </td>
                    <td className="py-3 px-4 text-right text-sm text-zinc-300">
                      {campaign.ctr.toFixed(2)}%
                    </td>
                    <td className="py-3 px-4 text-right text-sm text-zinc-300">
                      {campaign.conversions}
                    </td>
                    <td className="py-3 px-4 text-right text-sm text-white font-medium">
                      {formatCurrency(campaign.revenue)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={cn("text-sm font-bold", getRoasColor(campaign.roas))}>
                        {campaign.roas.toFixed(2)}x
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        {campaign.status === 'ACTIVE' ? (
                          <button 
                            onClick={() => onPauseCampaign?.(campaign.id)}
                            className="p-1.5 hover:bg-zinc-700 rounded transition-colors"
                            title="Pausar campanha"
                          >
                            <Pause className="w-4 h-4 text-yellow-400" />
                          </button>
                        ) : (
                          <button 
                            onClick={() => onResumeCampaign?.(campaign.id)}
                            className="p-1.5 hover:bg-zinc-700 rounded transition-colors"
                            title="Ativar campanha"
                          >
                            <Play className="w-4 h-4 text-emerald-400" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Ad Sets expandidos */}
                  {expandedCampaigns.has(campaign.id) && campaign.adsets?.map((adset) => (
                    <tr 
                      key={adset.id}
                      className="bg-[#0f1520]/50 border-t border-[#2d3748]/50"
                    >
                      <td className="py-2 px-4" />
                      <td className="py-2 px-4 pl-12" colSpan={2}>
                        <div className="text-sm text-zinc-400">
                          └─ {adset.name}
                        </div>
                      </td>
                      <td className="py-2 px-4 text-right text-sm text-zinc-400">
                        {formatCurrency(adset.spend)}
                      </td>
                      <td className="py-2 px-4 text-right text-sm text-zinc-500">
                        {formatNumber(adset.impressions)}
                      </td>
                      <td className="py-2 px-4 text-right text-sm text-zinc-500">
                        {formatNumber(adset.clicks)}
                      </td>
                      <td className="py-2 px-4 text-right text-sm text-zinc-500">
                        -
                      </td>
                      <td className="py-2 px-4 text-right text-sm text-zinc-500">
                        {adset.conversions}
                      </td>
                      <td className="py-2 px-4 text-right text-sm text-zinc-400">
                        {formatCurrency(adset.revenue)}
                      </td>
                      <td className="py-2 px-4 text-right">
                        <span className={cn("text-sm", getRoasColor(adset.roas))}>
                          {adset.roas.toFixed(2)}x
                        </span>
                      </td>
                      <td className="py-2 px-4" />
                    </tr>
                  ))}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-[#2d3748] bg-[#0f1520] flex items-center justify-between">
        <div className="text-xs text-zinc-500">
          Mostrando {campaigns.length} campanhas
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-zinc-400">ROAS ≥ 3x</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-zinc-400">ROAS 1-3x</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-zinc-400">ROAS &lt; 1x</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CampaignsTable;
