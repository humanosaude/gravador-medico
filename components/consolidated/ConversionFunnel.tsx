'use client';

/**
 * 📈 ConversionFunnel - Funil de conversão visual
 */

import { cn } from '@/lib/utils';
import type { FunnelData } from '@/lib/consolidator';

interface ConversionFunnelProps {
  data: FunnelData;
  loading?: boolean;
  className?: string;
}

interface FunnelStage {
  label: string;
  value: number;
  rate: number;
  color: string;
  bgColor: string;
}

export function ConversionFunnel({ data, loading = false, className }: ConversionFunnelProps) {
  const stages: FunnelStage[] = [
    {
      label: 'Impressões',
      value: data.impressions,
      rate: 100,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-500/20'
    },
    {
      label: 'Cliques',
      value: data.clicks,
      rate: data.rates.impressions_to_clicks,
      color: 'bg-cyan-500',
      bgColor: 'bg-cyan-500/20'
    },
    {
      label: 'Page Views',
      value: data.landing_page_views,
      rate: data.rates.clicks_to_pv,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-500/20'
    },
    {
      label: 'Checkouts',
      value: data.checkouts,
      rate: data.rates.pv_to_checkout,
      color: 'bg-orange-500',
      bgColor: 'bg-orange-500/20'
    },
    {
      label: 'Compras',
      value: data.purchases,
      rate: data.rates.checkout_to_purchase,
      color: 'bg-emerald-500',
      bgColor: 'bg-emerald-500/20'
    }
  ];

  // Calcular largura proporcional
  const maxValue = stages[0].value || 1;
  const getWidth = (value: number) => {
    const minWidth = 20;
    const width = (value / maxValue) * 100;
    return Math.max(width, minWidth);
  };

  // Formatar número
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString('pt-BR');
  };

  if (loading) {
    return (
      <div className={cn("bg-[#1a2332] rounded-xl p-6 border border-[#2d3748]", className)}>
        <div className="h-6 bg-zinc-700 rounded w-40 mb-6 animate-pulse" />
        <div className="space-y-4">
          {[100, 80, 60, 40, 30].map((w, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-zinc-700 rounded mb-2" style={{ width: `${w}%` }} />
              <div className="h-10 bg-zinc-700 rounded" style={{ width: `${w}%` }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-[#1a2332] rounded-xl p-6 border border-[#2d3748]", className)}>
      <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
        <span>📊</span>
        Funil de Conversão
      </h3>

      <div className="space-y-3">
        {stages.map((stage, index) => (
          <div key={stage.label} className="relative">
            {/* Label e valor */}
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm text-zinc-400">{stage.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">
                  {formatNumber(stage.value)}
                </span>
                {index > 0 && (
                  <span className={cn(
                    "text-xs px-1.5 py-0.5 rounded",
                    stage.rate >= 30 ? "bg-emerald-500/20 text-emerald-400" :
                    stage.rate >= 10 ? "bg-yellow-500/20 text-yellow-400" :
                    "bg-red-500/20 text-red-400"
                  )}>
                    {stage.rate.toFixed(1)}%
                  </span>
                )}
              </div>
            </div>

            {/* Barra */}
            <div className="relative h-10 rounded-lg overflow-hidden bg-zinc-800">
              <div 
                className={cn(
                  "absolute inset-y-0 left-0 rounded-lg transition-all duration-500",
                  stage.color
                )}
                style={{ 
                  width: `${getWidth(stage.value)}%`,
                  opacity: 0.85
                }}
              />
              {/* Valor dentro da barra */}
              <div className="absolute inset-0 flex items-center px-3">
                <span className="text-sm font-bold text-white drop-shadow-lg">
                  {formatNumber(stage.value)}
                </span>
              </div>
            </div>

            {/* Seta de drop-off */}
            {index < stages.length - 1 && (
              <div className="flex justify-center py-1">
                <div className="flex items-center gap-1 text-xs text-zinc-500">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                  <span>
                    -{((1 - (stages[index + 1].value / (stage.value || 1))) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Taxa de conversão geral */}
      <div className="mt-6 pt-4 border-t border-[#2d3748]">
        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-400">Conversão Geral</span>
          <span className={cn(
            "text-lg font-bold",
            data.rates.overall_conversion >= 1 ? "text-emerald-400" :
            data.rates.overall_conversion >= 0.5 ? "text-yellow-400" :
            "text-red-400"
          )}>
            {data.rates.overall_conversion.toFixed(3)}%
          </span>
        </div>
        <p className="text-xs text-zinc-500 mt-1">
          De {formatNumber(data.impressions)} impressões → {formatNumber(data.purchases)} compras
        </p>
      </div>
    </div>
  );
}

export default ConversionFunnel;
