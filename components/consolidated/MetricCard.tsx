'use client';

/**
 * 📊 MetricCard - Card de métrica com variação
 */

import { ArrowUp, ArrowDown, Minus, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  variation?: number;
  invertedMetric?: boolean; // CPC, CPA - menor é melhor
  icon?: LucideIcon;
  iconColor?: string;
  subtitle?: string;
  loading?: boolean;
  className?: string;
  format?: 'currency' | 'number' | 'percent' | 'multiplier';
}

export function MetricCard({
  title,
  value,
  variation,
  invertedMetric = false,
  icon: Icon,
  iconColor = 'text-blue-400',
  subtitle,
  loading = false,
  className,
  format
}: MetricCardProps) {
  // Formatar valor
  const formatValue = (val: string | number): string => {
    if (typeof val === 'string') return val;
    
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
          minimumFractionDigits: 2
        }).format(val);
      case 'percent':
        return `${val.toFixed(2)}%`;
      case 'multiplier':
        return `${val.toFixed(2)}x`;
      case 'number':
      default:
        if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
        if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
        return val.toLocaleString('pt-BR');
    }
  };

  // Determinar cor da variação
  const getVariationColor = () => {
    if (variation === undefined || variation === null) return 'text-zinc-400';
    
    const threshold = 0.5;
    
    if (invertedMetric) {
      // Para métricas invertidas (CPC, CPA), negativo é bom
      if (variation < -threshold) return 'text-emerald-400';
      if (variation > threshold) return 'text-red-400';
    } else {
      // Para métricas normais, positivo é bom
      if (variation > threshold) return 'text-emerald-400';
      if (variation < -threshold) return 'text-red-400';
    }
    
    return 'text-zinc-400';
  };

  // Ícone da variação
  const VariationIcon = () => {
    if (variation === undefined || variation === null) return null;
    
    if (Math.abs(variation) < 0.5) {
      return <Minus className="w-3 h-3" />;
    }
    
    return variation > 0 
      ? <ArrowUp className="w-3 h-3" />
      : <ArrowDown className="w-3 h-3" />;
  };

  if (loading) {
    return (
      <div className={cn(
        "bg-[#1a2332] rounded-xl p-4 border border-[#2d3748]",
        className
      )}>
        <div className="animate-pulse">
          <div className="h-4 bg-zinc-700 rounded w-24 mb-3" />
          <div className="h-8 bg-zinc-700 rounded w-32 mb-2" />
          <div className="h-3 bg-zinc-700 rounded w-16" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "bg-[#1a2332] rounded-xl p-4 border border-[#2d3748]",
      "hover:border-[#3d4758] transition-all duration-200",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-zinc-400 font-medium">{title}</span>
        {Icon && (
          <div className={cn("p-1.5 rounded-lg bg-zinc-800", iconColor)}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      {/* Valor principal */}
      <div className="text-2xl font-bold text-white mb-1">
        {formatValue(value)}
      </div>

      {/* Variação e subtítulo */}
      <div className="flex items-center gap-2">
        {variation !== undefined && (
          <div className={cn("flex items-center gap-0.5 text-xs font-medium", getVariationColor())}>
            <VariationIcon />
            <span>{Math.abs(variation).toFixed(1)}%</span>
          </div>
        )}
        {subtitle && (
          <span className="text-xs text-zinc-500">{subtitle}</span>
        )}
      </div>
    </div>
  );
}

export default MetricCard;
