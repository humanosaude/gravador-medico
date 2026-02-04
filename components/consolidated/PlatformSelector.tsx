'use client';

/**
 * 🔌 PlatformSelector - Seletor de plataformas ativas
 */

import { cn } from '@/lib/utils';

interface Platform {
  key: 'meta' | 'google_ads' | 'google_analytics';
  name: string;
  icon: string;
  color: string;
  connected: boolean;
}

interface PlatformSelectorProps {
  platforms: Platform[];
  activePlatforms: string[];
  onToggle: (platform: string) => void;
  className?: string;
}

export function PlatformSelector({ 
  platforms, 
  activePlatforms, 
  onToggle,
  className 
}: PlatformSelectorProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {platforms.map((platform) => {
        const isActive = activePlatforms.includes(platform.key);
        const isConnected = platform.connected;
        
        return (
          <button
            key={platform.key}
            onClick={() => isConnected && onToggle(platform.key)}
            disabled={!isConnected}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
              "border",
              isConnected
                ? isActive
                  ? `${platform.color} border-current bg-current/10`
                  : "text-zinc-400 border-zinc-600 hover:border-zinc-500"
                : "text-zinc-600 border-zinc-700 cursor-not-allowed opacity-50"
            )}
            title={isConnected ? `Clique para ${isActive ? 'desativar' : 'ativar'} ${platform.name}` : 'Não conectado'}
          >
            <span>{platform.icon}</span>
            <span>{platform.name}</span>
            {isConnected && (
              <span className={cn(
                "w-2 h-2 rounded-full",
                isActive ? "bg-emerald-400" : "bg-zinc-500"
              )} />
            )}
            {!isConnected && (
              <span className="text-xs text-zinc-500">(não conectado)</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default PlatformSelector;
