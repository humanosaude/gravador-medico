'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
  Youtube,
  CheckCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
  Shield,
  Info,
} from 'lucide-react';

interface NetworkInfo {
  id: string;
  name: string;
  description: string;
  icon: any;
  gradient: string;
  isConfigured: boolean;
  configMessage?: string;
  scopes: string[];
  features: string[];
}

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
  </svg>
);

const PinterestIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z" />
  </svg>
);

const networks: NetworkInfo[] = [
  {
    id: 'instagram',
    name: 'Instagram',
    description: 'Publique fotos, vídeos, carrosséis, reels e stories',
    icon: Instagram,
    gradient: 'from-purple-600 via-pink-600 to-orange-500',
    isConfigured: true, // Instagram está configurado
    scopes: ['Publicação', 'Insights', 'Comentários', 'Mensagens'],
    features: ['Feed posts', 'Carrossel', 'Reels', 'Stories', 'Analytics'],
  },
  {
    id: 'facebook',
    name: 'Facebook',
    description: 'Gerencie páginas, grupos e publique conteúdo',
    icon: Facebook,
    gradient: 'from-blue-600 to-blue-700',
    isConfigured: false,
    configMessage: 'Configure as chaves de API do Facebook',
    scopes: ['Páginas', 'Grupos', 'Publicação', 'Insights'],
    features: ['Posts', 'Fotos', 'Vídeos', 'Links', 'Analytics'],
  },
  {
    id: 'twitter',
    name: 'Twitter / X',
    description: 'Tweets, threads, imagens e vídeos',
    icon: Twitter,
    gradient: 'from-sky-400 to-sky-500',
    isConfigured: false,
    configMessage: 'Configure as chaves de API do Twitter/X',
    scopes: ['Tweet', 'Read', 'Users', 'Media'],
    features: ['Tweets', 'Threads', 'Imagens', 'Vídeos', 'Polls'],
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    description: 'Perfil pessoal e páginas de empresa',
    icon: Linkedin,
    gradient: 'from-blue-700 to-blue-800',
    isConfigured: false,
    configMessage: 'Configure as chaves de API do LinkedIn',
    scopes: ['Profile', 'Posts', 'Companies', 'Analytics'],
    features: ['Posts', 'Artigos', 'Documentos', 'Vídeos', 'Analytics'],
  },
  {
    id: 'youtube',
    name: 'YouTube',
    description: 'Vídeos, shorts, lives e community posts',
    icon: Youtube,
    gradient: 'from-red-600 to-red-700',
    isConfigured: false,
    configMessage: 'Configure as chaves de API do YouTube',
    scopes: ['Upload', 'Playlists', 'Comments', 'Analytics'],
    features: ['Vídeos', 'Shorts', 'Thumbnails', 'Playlists', 'Analytics'],
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    description: 'Vídeos curtos e trends',
    icon: TikTokIcon,
    gradient: 'from-gray-900 to-black',
    isConfigured: false,
    configMessage: 'Configure as chaves de API do TikTok',
    scopes: ['Video Upload', 'User Info', 'Video List'],
    features: ['Vídeos', 'Duetos', 'Stitches', 'Analytics'],
  },
  {
    id: 'pinterest',
    name: 'Pinterest',
    description: 'Pins, boards e ideias visuais',
    icon: PinterestIcon,
    gradient: 'from-red-600 to-red-700',
    isConfigured: false,
    configMessage: 'Configure as chaves de API do Pinterest',
    scopes: ['Pins', 'Boards', 'User', 'Analytics'],
    features: ['Pins', 'Boards', 'Idea Pins', 'Analytics'],
  },
];

export default function ConnectNetworkPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedNetwork = searchParams.get('network');
  
  const [selectedNetwork, setSelectedNetwork] = useState<string | null>(preselectedNetwork);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async (networkId: string) => {
    const network = networks.find((n) => n.id === networkId);
    
    if (!network?.isConfigured) {
      setError(`${network?.name} ainda não está configurado. As chaves de API precisam ser adicionadas.`);
      return;
    }

    setConnecting(true);
    setError(null);

    try {
      // Iniciar fluxo OAuth
      const response = await fetch(`/api/social-flow/connect?network=${networkId}`);
      const data = await response.json();

      if (data.authUrl) {
        // Redirecionar para OAuth
        window.location.href = data.authUrl;
      } else {
        throw new Error(data.error || 'Falha ao iniciar conexão');
      }
    } catch (err: any) {
      console.error('Connection error:', err);
      setError(err.message || 'Erro ao conectar. Tente novamente.');
      setConnecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#101A1E] p-6">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>
        
        <h1 className="text-2xl font-bold text-white">Conectar Rede Social</h1>
        <p className="text-gray-400 mt-1">
          Escolha a rede social que deseja conectar ao Social Flow
        </p>
      </div>

      {/* Erro */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-400 font-medium">Erro na conexão</p>
            <p className="text-red-300/80 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Grid de Redes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {networks.map((network) => {
          const NetworkIcon = network.icon;
          const isSelected = selectedNetwork === network.id;
          
          return (
            <div
              key={network.id}
              className={`rounded-xl border-2 transition-all cursor-pointer ${
                isSelected
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
              } ${!network.isConfigured ? 'opacity-75' : ''}`}
              onClick={() => setSelectedNetwork(network.id)}
            >
              {/* Header do Card */}
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${network.gradient} flex items-center justify-center`}>
                    <NetworkIcon className="w-7 h-7 text-white" />
                  </div>
                  {network.isConfigured ? (
                    <span className="flex items-center gap-1 text-green-400 text-xs bg-green-400/10 px-2 py-1 rounded-full">
                      <CheckCircle className="w-3 h-3" />
                      Disponível
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-yellow-400 text-xs bg-yellow-400/10 px-2 py-1 rounded-full">
                      <Info className="w-3 h-3" />
                      Em breve
                    </span>
                  )}
                </div>

                <h3 className="text-white font-semibold text-lg mb-1">
                  {network.name}
                </h3>
                <p className="text-gray-400 text-sm mb-4">
                  {network.description}
                </p>

                {/* Features */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {network.features.map((feature) => (
                    <span
                      key={feature}
                      className="text-xs bg-gray-700/50 text-gray-300 px-2 py-1 rounded-full"
                    >
                      {feature}
                    </span>
                  ))}
                </div>

                {/* Permissões */}
                <div className="border-t border-gray-700 pt-4 mt-4">
                  <p className="text-gray-400 text-xs mb-2 flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    Permissões solicitadas:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {network.scopes.map((scope) => (
                      <span
                        key={scope}
                        className="text-xs text-gray-500 bg-gray-700/30 px-2 py-0.5 rounded"
                      >
                        {scope}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer do Card */}
              <div className="px-6 pb-6">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleConnect(network.id);
                  }}
                  disabled={!network.isConfigured || connecting}
                  className={`w-full py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                    network.isConfigured
                      ? `bg-gradient-to-r ${network.gradient} text-white hover:opacity-90`
                      : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {connecting && selectedNetwork === network.id ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Conectando...
                    </>
                  ) : network.isConfigured ? (
                    <>
                      <ExternalLink className="w-4 h-4" />
                      Conectar {network.name}
                    </>
                  ) : (
                    'Em breve'
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info Box */}
      <div className="mt-8 bg-gray-800/50 rounded-xl border border-gray-700 p-6">
        <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-400" />
          Segurança & Privacidade
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-400">
          <div>
            <p className="font-medium text-gray-300 mb-1">Autenticação OAuth</p>
            <p>Usamos OAuth 2.0 oficial de cada plataforma. Nunca armazenamos sua senha.</p>
          </div>
          <div>
            <p className="font-medium text-gray-300 mb-1">Tokens Criptografados</p>
            <p>Seus tokens de acesso são criptografados e armazenados com segurança.</p>
          </div>
          <div>
            <p className="font-medium text-gray-300 mb-1">Revogação Fácil</p>
            <p>Você pode desconectar qualquer rede a qualquer momento.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
