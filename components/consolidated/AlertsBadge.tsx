'use client';

/**
 * 🔔 AlertsBadge - Badge de alertas com dropdown
 */

import { useState, useRef, useEffect } from 'react';
import { Bell, AlertTriangle, TrendingDown, DollarSign, X, Pause, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Alert {
  id: string;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  campaign_id?: string;
  actions?: Array<{ action: string; label: string }>;
}

interface AlertsBadgeProps {
  alerts: Alert[];
  onDismiss?: (id: string) => void;
  onAction?: (alertId: string, action: string) => void;
  className?: string;
}

export function AlertsBadge({ alerts, onDismiss, onAction, className }: AlertsBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fechar ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Contar por severidade
  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const warningCount = alerts.filter(a => a.severity === 'warning').length;

  // Ícone por tipo
  const getIcon = (type: string) => {
    switch (type) {
      case 'low_roas': return TrendingDown;
      case 'no_conversions': return DollarSign;
      case 'budget_warning': return DollarSign;
      default: return AlertTriangle;
    }
  };

  // Cor por severidade
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-400 bg-red-500/20';
      case 'warning': return 'text-yellow-400 bg-yellow-500/20';
      default: return 'text-blue-400 bg-blue-500/20';
    }
  };

  if (alerts.length === 0) {
    return (
      <div className={cn("relative", className)}>
        <button className="p-2 rounded-lg bg-[#1a2332] border border-[#2d3748] text-zinc-500">
          <Bell className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      {/* Botão */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative p-2 rounded-lg border transition-colors",
          criticalCount > 0 
            ? "bg-red-500/10 border-red-500/50 text-red-400 hover:bg-red-500/20"
            : "bg-yellow-500/10 border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/20"
        )}
      >
        <Bell className="w-5 h-5" />
        
        {/* Badge contador */}
        <span className={cn(
          "absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full text-xs font-bold flex items-center justify-center px-1",
          criticalCount > 0 ? "bg-red-500 text-white" : "bg-yellow-500 text-black"
        )}>
          {alerts.length}
        </span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 max-h-[400px] overflow-y-auto bg-[#1a2332] border border-[#2d3748] rounded-xl shadow-xl z-50">
          {/* Header */}
          <div className="p-3 border-b border-[#2d3748] flex items-center justify-between sticky top-0 bg-[#1a2332]">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
              Alertas
            </h3>
            <div className="flex items-center gap-2 text-xs">
              {criticalCount > 0 && (
                <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400">
                  {criticalCount} críticos
                </span>
              )}
              {warningCount > 0 && (
                <span className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400">
                  {warningCount} avisos
                </span>
              )}
            </div>
          </div>

          {/* Lista de alertas */}
          <div className="divide-y divide-[#2d3748]">
            {alerts.map((alert) => {
              const Icon = getIcon(alert.type);
              
              return (
                <div 
                  key={alert.id}
                  className="p-3 hover:bg-[#1f2937] transition-colors"
                >
                  <div className="flex items-start gap-3">
                    {/* Ícone */}
                    <div className={cn(
                      "p-2 rounded-lg flex-shrink-0",
                      getSeverityColor(alert.severity)
                    )}>
                      <Icon className="w-4 h-4" />
                    </div>

                    {/* Conteúdo */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-medium text-white truncate">
                          {alert.title}
                        </h4>
                        <button 
                          onClick={() => onDismiss?.(alert.id)}
                          className="p-1 hover:bg-zinc-700 rounded transition-colors flex-shrink-0"
                        >
                          <X className="w-3 h-3 text-zinc-500" />
                        </button>
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {alert.message}
                      </p>

                      {/* Ações */}
                      {alert.actions && alert.actions.length > 0 && (
                        <div className="flex items-center gap-2 mt-2">
                          {alert.actions.map((action) => (
                            <button
                              key={action.action}
                              onClick={() => onAction?.(alert.id, action.action)}
                              className={cn(
                                "px-2 py-1 rounded text-xs font-medium transition-colors",
                                action.action === 'pause_campaign'
                                  ? "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30"
                                  : "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                              )}
                            >
                              {action.action === 'pause_campaign' && (
                                <Pause className="w-3 h-3 inline-block mr-1" />
                              )}
                              {action.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-[#2d3748] sticky bottom-0 bg-[#1a2332]">
            <button 
              onClick={() => setIsOpen(false)}
              className="w-full py-2 text-center text-xs text-zinc-400 hover:text-white transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AlertsBadge;
