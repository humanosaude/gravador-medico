'use client';

/**
 * 📅 DateRangePicker - Seletor de período
 */

import { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DateRange {
  start: string;
  end: string;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

type PresetKey = 'today' | '7d' | '14d' | '30d' | '90d' | 'this_month' | 'last_month' | 'custom';

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: 'today', label: 'Hoje' },
  { key: '7d', label: 'Últimos 7 dias' },
  { key: '14d', label: 'Últimos 14 dias' },
  { key: '30d', label: 'Últimos 30 dias' },
  { key: '90d', label: 'Últimos 90 dias' },
  { key: 'this_month', label: 'Este mês' },
  { key: 'last_month', label: 'Mês passado' }
];

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<PresetKey>('7d');
  const [customStart, setCustomStart] = useState(value.start);
  const [customEnd, setCustomEnd] = useState(value.end);
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

  // Calcular range para preset
  const getPresetRange = (preset: PresetKey): DateRange => {
    const today = new Date();
    const end = today.toISOString().split('T')[0];
    
    switch (preset) {
      case 'today':
        return { start: end, end };
      case '7d': {
        const start = new Date(today);
        start.setDate(start.getDate() - 7);
        return { start: start.toISOString().split('T')[0], end };
      }
      case '14d': {
        const start = new Date(today);
        start.setDate(start.getDate() - 14);
        return { start: start.toISOString().split('T')[0], end };
      }
      case '30d': {
        const start = new Date(today);
        start.setDate(start.getDate() - 30);
        return { start: start.toISOString().split('T')[0], end };
      }
      case '90d': {
        const start = new Date(today);
        start.setDate(start.getDate() - 90);
        return { start: start.toISOString().split('T')[0], end };
      }
      case 'this_month': {
        const start = new Date(today.getFullYear(), today.getMonth(), 1);
        return { start: start.toISOString().split('T')[0], end };
      }
      case 'last_month': {
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        return { 
          start: lastMonthStart.toISOString().split('T')[0], 
          end: lastMonthEnd.toISOString().split('T')[0] 
        };
      }
      default:
        return { start: customStart, end: customEnd };
    }
  };

  // Aplicar preset
  const handlePresetClick = (preset: PresetKey) => {
    setSelectedPreset(preset);
    const range = getPresetRange(preset);
    onChange(range);
    if (preset !== 'custom') {
      setIsOpen(false);
    }
  };

  // Aplicar range customizado
  const handleCustomApply = () => {
    setSelectedPreset('custom');
    onChange({ start: customStart, end: customEnd });
    setIsOpen(false);
  };

  // Formatar label do botão
  const getButtonLabel = () => {
    if (selectedPreset === 'custom') {
      return `${formatDate(value.start)} - ${formatDate(value.end)}`;
    }
    return PRESETS.find(p => p.key === selectedPreset)?.label || 'Selecione';
  };

  // Formatar data
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      {/* Botão */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors",
          "bg-[#1a2332] border-[#2d3748] hover:border-[#3d4758]",
          "text-sm text-white"
        )}
      >
        <Calendar className="w-4 h-4 text-zinc-400" />
        <span>{getButtonLabel()}</span>
        <ChevronDown className={cn(
          "w-4 h-4 text-zinc-400 transition-transform",
          isOpen && "rotate-180"
        )} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-80 bg-[#1a2332] border border-[#2d3748] rounded-xl shadow-xl z-50">
          {/* Presets */}
          <div className="p-2 border-b border-[#2d3748]">
            <div className="grid grid-cols-2 gap-1">
              {PRESETS.map((preset) => (
                <button
                  key={preset.key}
                  onClick={() => handlePresetClick(preset.key)}
                  className={cn(
                    "flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors",
                    selectedPreset === preset.key
                      ? "bg-blue-500/20 text-blue-400"
                      : "text-zinc-300 hover:bg-zinc-700"
                  )}
                >
                  <span>{preset.label}</span>
                  {selectedPreset === preset.key && (
                    <Check className="w-4 h-4" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Custom range */}
          <div className="p-4">
            <div className="text-xs text-zinc-500 mb-2">Período customizado</div>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="text-xs text-zinc-400 block mb-1">Início</label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-[#2d3748] rounded-lg text-sm text-white"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-zinc-400 block mb-1">Fim</label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-[#2d3748] rounded-lg text-sm text-white"
                />
              </div>
            </div>
            <button
              onClick={handleCustomApply}
              className="w-full mt-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DateRangePicker;
