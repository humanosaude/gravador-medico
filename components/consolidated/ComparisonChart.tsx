'use client';

/**
 * 📊 ComparisonChart - Gráfico de comparação Meta vs Google
 */

import { useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Line,
  ComposedChart
} from 'recharts';
import { cn } from '@/lib/utils';
import type { ConsolidatedDashboardData } from '@/lib/consolidator';

interface ComparisonChartProps {
  data: ConsolidatedDashboardData['daily_data'];
  metric: 'spend' | 'revenue' | 'clicks' | 'impressions';
  loading?: boolean;
  className?: string;
}

const METRIC_CONFIG = {
  spend: { label: 'Gasto', format: 'currency', color: '#ef4444' },
  revenue: { label: 'Receita', format: 'currency', color: '#10b981' },
  clicks: { label: 'Cliques', format: 'number', color: '#3b82f6' },
  impressions: { label: 'Impressões', format: 'number', color: '#8b5cf6' }
};

export function ComparisonChart({ data, metric, loading = false, className }: ComparisonChartProps) {
  const config = METRIC_CONFIG[metric];

  // Preparar dados para o gráfico
  const chartData = useMemo(() => {
    return data.map(day => ({
      date: new Date(day.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
      meta: day.meta?.[metric] || 0,
      google: day.google_ads?.[metric] || 0,
      total: day.total?.[metric] || 0
    }));
  }, [data, metric]);

  // Formatar tooltip
  const formatValue = (value: number) => {
    if (config.format === 'currency') {
      return new Intl.NumberFormat('pt-BR', { 
        style: 'currency', 
        currency: 'BRL',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value);
    }
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toLocaleString('pt-BR');
  };

  // Tooltip customizado
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;

    return (
      <div className="bg-[#1a2332] border border-[#2d3748] rounded-lg p-3 shadow-lg">
        <p className="text-sm font-medium text-white mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-zinc-400">{entry.name}</span>
            </div>
            <span className="font-medium" style={{ color: entry.color }}>
              {formatValue(entry.value)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className={cn("bg-[#1a2332] rounded-xl p-6 border border-[#2d3748]", className)}>
        <div className="h-6 bg-zinc-700 rounded w-48 mb-6 animate-pulse" />
        <div className="h-64 bg-zinc-700/50 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className={cn("bg-[#1a2332] rounded-xl p-6 border border-[#2d3748]", className)}>
      <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
        <span>📈</span>
        {config.label} por Dia
      </h3>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
            <XAxis 
              dataKey="date" 
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              axisLine={{ stroke: '#2d3748' }}
              tickLine={{ stroke: '#2d3748' }}
            />
            <YAxis 
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              axisLine={{ stroke: '#2d3748' }}
              tickLine={{ stroke: '#2d3748' }}
              tickFormatter={(value) => formatValue(value)}
              width={60}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ paddingTop: 10 }}
              formatter={(value) => (
                <span className="text-sm text-zinc-400">{value}</span>
              )}
            />
            <Bar 
              dataKey="meta" 
              name="Meta Ads" 
              fill="#3b82f6"
              radius={[4, 4, 0, 0]}
              stackId="a"
            />
            <Bar 
              dataKey="google" 
              name="Google Ads" 
              fill="#f59e0b"
              radius={[4, 4, 0, 0]}
              stackId="a"
            />
            <Line 
              type="monotone"
              dataKey="total"
              name="Total"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legenda de cores */}
      <div className="mt-4 flex items-center justify-center gap-6 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-blue-500" />
          <span className="text-zinc-400">Meta Ads</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-amber-500" />
          <span className="text-zinc-400">Google Ads</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-emerald-500" />
          <span className="text-zinc-400">Total</span>
        </div>
      </div>
    </div>
  );
}

export default ComparisonChart;
