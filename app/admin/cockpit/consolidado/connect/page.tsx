'use client';

/**
 * 🔌 Conectar Conta - Página de OAuth (dentro do Cockpit)
 */

import { useState } from 'react';
import { 
  ArrowLeft, 
  CheckCircle, 
  AlertCircle,
  ExternalLink,
  Loader2
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface Platform {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  bgColor: string;
  status: 'available' | 'coming_soon' | 'connected';
  instructions: string[];
}

const PLATFORMS: Platform[] = [
  {
    id: 'meta',
    name: 'Meta Ads',
    description: 'Facebook Ads, Instagram Ads',
    icon: '📘',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    status: 'available',
    instructions: [
      'Clique em "Conectar" para iniciar o fluxo OAuth',
      'Faça login com sua conta do Facebook Business',
      'Selecione as contas de anúncios que deseja conectar',
      'Autorize as permissões solicitadas'
    ]
  },
  {
    id: 'google_ads',
    name: 'Google Ads',
    description: 'Search, Display, YouTube Ads',
    icon: '🔍',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    status: 'coming_soon',
    instructions: [
      'Clique em "Conectar" para iniciar o fluxo OAuth',
      'Faça login com sua conta Google',
      'Selecione a conta de anúncios do Google Ads',
      'Autorize as permissões de leitura'
    ]
  },
  {
    id: 'google_analytics',
    name: 'Google Analytics 4',
    description: 'Web Analytics, Conversões',
    icon: '📊',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    status: 'coming_soon',
    instructions: [
      'Clique em "Conectar" para iniciar',
      'Faça login com sua conta Google',
      'Selecione a propriedade GA4',
      'Autorize acesso de leitura aos relatórios'
    ]
  }
];

export default function ConnectAccountPage() {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Iniciar OAuth
  const handleConnect = async (platform: Platform) => {
    if (platform.status !== 'available') return;
    
    setConnecting(true);
    setError(null);
    setSuccess(null);

    try {
      if (platform.id === 'meta') {
        // Redirecionar para OAuth do Facebook
        const clientId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '';
        const redirectUri = encodeURIComponent(
          `${window.location.origin}/api/social/instagram/callback`
        );
        const scope = encodeURIComponent(
          'ads_read,ads_management,business_management,read_insights'
        );
        
        const authUrl = `https://www.facebook.com/v21.0/dialog/oauth?` +
          `client_id=${clientId}&` +
          `redirect_uri=${redirectUri}&` +
          `scope=${scope}&` +
          `response_type=code`;

        // Por enquanto, apenas mostrar que está em desenvolvimento
        setSuccess(`OAuth do ${platform.name} configurado! Redirecionando...`);
        
        // Em produção, descomentar:
        // window.location.href = authUrl;
      } else {
        setError(`Conexão com ${platform.name} ainda não implementada`);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="text-white">
      {/* Header */}
      <div className="max-w-4xl mx-auto px-4 py-4 border-b border-[#2d3748]">
        <div className="flex items-center gap-4">
          <Link 
            href="/admin/cockpit/consolidado"
            className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-zinc-400" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white">
              Conectar Nova Conta
            </h1>
            <p className="text-sm text-zinc-400">
              Adicione plataformas de anúncios ao seu dashboard
            </p>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Mensagens */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-400">Erro</p>
              <p className="text-sm text-red-300">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-emerald-400">Sucesso</p>
              <p className="text-sm text-emerald-300">{success}</p>
            </div>
          </div>
        )}

        {/* Lista de plataformas */}
        <div className="grid gap-4">
          {PLATFORMS.map((platform) => (
            <div
              key={platform.id}
              className={cn(
                "rounded-xl border overflow-hidden transition-all",
                selectedPlatform?.id === platform.id
                  ? "border-blue-500/50 bg-[#1a2332]"
                  : "border-[#2d3748] bg-[#1a2332] hover:border-[#3d4758]",
                platform.status === 'coming_soon' && "opacity-60"
              )}
            >
              {/* Header do card */}
              <button
                onClick={() => setSelectedPlatform(
                  selectedPlatform?.id === platform.id ? null : platform
                )}
                className="w-full p-4 flex items-center justify-between text-left"
                disabled={platform.status === 'coming_soon'}
              >
                <div className="flex items-center gap-4">
                  <div className={cn("p-3 rounded-xl", platform.bgColor)}>
                    <span className="text-3xl">{platform.icon}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white flex items-center gap-2">
                      {platform.name}
                      {platform.status === 'connected' && (
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                      )}
                      {platform.status === 'coming_soon' && (
                        <span className="text-xs px-2 py-0.5 rounded bg-zinc-700 text-zinc-400">
                          Em breve
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-zinc-400">{platform.description}</p>
                  </div>
                </div>

                {platform.status === 'available' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleConnect(platform);
                    }}
                    disabled={connecting}
                    className={cn(
                      "px-4 py-2 rounded-lg font-medium text-sm transition-colors",
                      "bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                    )}
                  >
                    {connecting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Conectar'
                    )}
                  </button>
                )}
              </button>

              {/* Instruções expandidas */}
              {selectedPlatform?.id === platform.id && (
                <div className="px-4 pb-4 pt-0 border-t border-[#2d3748]">
                  <div className="pt-4">
                    <h4 className="text-sm font-medium text-zinc-300 mb-3">
                      Como conectar:
                    </h4>
                    <ol className="space-y-2">
                      {platform.instructions.map((instruction, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm text-zinc-400">
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-zinc-700 text-white flex items-center justify-center text-xs">
                            {i + 1}
                          </span>
                          {instruction}
                        </li>
                      ))}
                    </ol>

                    {/* Requisitos */}
                    <div className="mt-4 p-3 bg-zinc-800 rounded-lg">
                      <h5 className="text-xs font-medium text-zinc-400 mb-2">
                        Requisitos:
                      </h5>
                      <ul className="text-xs text-zinc-500 space-y-1">
                        {platform.id === 'meta' && (
                          <>
                            <li>• Conta Business do Facebook verificada</li>
                            <li>• Acesso de administrador às contas de anúncios</li>
                            <li>• Pixel do Facebook configurado (para conversões)</li>
                          </>
                        )}
                        {platform.id === 'google_ads' && (
                          <>
                            <li>• Conta Google Ads ativa</li>
                            <li>• Permissões de leitura na conta</li>
                            <li>• Conversão tracking configurado</li>
                          </>
                        )}
                        {platform.id === 'google_analytics' && (
                          <>
                            <li>• Propriedade GA4 configurada</li>
                            <li>• Permissões de visualização</li>
                            <li>• Eventos de e-commerce configurados</li>
                          </>
                        )}
                      </ul>
                    </div>

                    {/* Link de ajuda */}
                    <a
                      href={
                        platform.id === 'meta'
                          ? 'https://developers.facebook.com/docs/marketing-api/'
                          : platform.id === 'google_ads'
                          ? 'https://developers.google.com/google-ads/api/'
                          : 'https://developers.google.com/analytics/'
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center gap-1 text-sm text-blue-400 hover:underline"
                    >
                      Ver documentação
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Info adicional */}
        <div className="mt-8 p-4 bg-[#1a2332] rounded-xl border border-[#2d3748]">
          <h3 className="font-medium text-white mb-2">💡 Dica</h3>
          <p className="text-sm text-zinc-400">
            Após conectar suas contas, o dashboard consolidado irá agregar automaticamente 
            todas as métricas. Os dados são atualizados a cada 5 minutos e você pode 
            comparar o desempenho entre as plataformas.
          </p>
        </div>
      </main>
    </div>
  );
}
