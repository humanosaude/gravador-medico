'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  RefreshCw,
  Calendar,
  BarChart3,
  FileText,
  Settings,
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
  Youtube,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  Users,
  Eye,
  Heart,
  MessageCircle,
  Clock,
  AlertCircle,
  CheckCircle,
  Loader2,
  Zap,
  Sparkles,
  Share2,
} from 'lucide-react';

interface NetworkAccount {
  id: string;
  network: string;
  account_name: string;
  account_username: string;
  profile_picture_url?: string;
  followers_count: number;
  following_count: number;
  posts_count: number;
  engagement_rate?: number;
  is_active: boolean;
  last_sync_at?: string;
}

interface OverviewMetrics {
  totalFollowers: number;
  totalFollowersChange: number;
  totalReach: number;
  totalImpressions: number;
  totalEngagements: number;
  avgEngagementRate: number;
  totalPosts: number;
  postsThisWeek: number;
}

interface ScheduledPost {
  id: string;
  content: string;
  scheduled_for: string;
  status: string;
  social_accounts: {
    network: string;
    account_name: string;
  };
}

const networkIcons: Record<string, any> = {
  instagram: Instagram,
  facebook: Facebook,
  twitter: Twitter,
  linkedin: Linkedin,
  youtube: Youtube,
  tiktok: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
    </svg>
  ),
  pinterest: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z" />
    </svg>
  ),
};

const networkColors: Record<string, string> = {
  instagram: 'from-purple-600 via-pink-600 to-orange-500',
  facebook: 'from-blue-600 to-blue-700',
  twitter: 'from-sky-400 to-sky-500',
  linkedin: 'from-blue-700 to-blue-800',
  youtube: 'from-red-600 to-red-700',
  tiktok: 'from-gray-900 to-black',
  pinterest: 'from-red-600 to-red-700',
};

const networkNames: Record<string, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  twitter: 'Twitter/X',
  linkedin: 'LinkedIn',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  pinterest: 'Pinterest',
};

export default function SocialFlowDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [accounts, setAccounts] = useState<NetworkAccount[]>([]);
  const [overview, setOverview] = useState<OverviewMetrics | null>(null);
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [period, setPeriod] = useState('30d');

  useEffect(() => {
    loadDashboard();
  }, [period]);

  const loadDashboard = async () => {
    try {
      setLoading(true);

      // Carregar em paralelo
      const [accountsRes, analyticsRes, scheduledRes] = await Promise.all([
        fetch('/api/social-flow/accounts'),
        fetch(`/api/social-flow/analytics?view=overview&period=${period}`),
        fetch('/api/social-flow/scheduled?limit=5'),
      ]);

      if (accountsRes.ok) {
        const data = await accountsRes.json();
        setAccounts(data.accounts || []);
      }

      if (analyticsRes.ok) {
        const data = await analyticsRes.json();
        setOverview(data.overview || null);
      }

      if (scheduledRes.ok) {
        const data = await scheduledRes.json();
        setScheduledPosts(data.posts || []);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#101A1E] flex items-center justify-center">
        <div className="flex items-center gap-3 text-white">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Carregando Social Flow...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#101A1E] p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Share2 className="w-7 h-7 text-blue-400" />
            Social Flow
          </h1>
          <p className="text-gray-400 mt-1">
            Gerencie todas as suas redes sociais em um só lugar
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Período */}
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="90d">Últimos 90 dias</option>
          </select>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700 rounded-lg px-4 py-2 text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </button>

          <button
            onClick={() => router.push('/admin/social/flow/connect')}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-lg px-4 py-2 text-white font-medium transition-all"
          >
            <Plus className="w-4 h-4" />
            Conectar Rede
          </button>
        </div>
      </div>

      {/* Redes Disponíveis */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">Redes Disponíveis</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {Object.entries(networkNames).map(([network, name]) => {
            const NetworkIcon = networkIcons[network];
            const gradient = networkColors[network];
            const connected = accounts.some((a) => a.network === network);
            
            return (
              <div
                key={network}
                className={`rounded-xl border p-4 text-center cursor-pointer transition-all ${
                  connected 
                    ? 'bg-gray-800/50 border-gray-600 hover:border-gray-500' 
                    : 'bg-gray-800/30 border-gray-700/50 hover:border-gray-600 opacity-75 hover:opacity-100'
                }`}
                onClick={() => !connected && router.push(`/admin/social/flow/connect?network=${network}`)}
              >
                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center mx-auto mb-2`}>
                  <NetworkIcon className="w-6 h-6 text-white" />
                </div>
                <p className="text-white text-sm font-medium">{name}</p>
                {connected ? (
                  <span className="text-green-400 text-xs flex items-center justify-center gap-1 mt-1">
                    <CheckCircle className="w-3 h-3" /> Conectado
                  </span>
                ) : (
                  <span className="text-gray-500 text-xs mt-1">Não conectado</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Contas Conectadas */}
      {accounts.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Suas Contas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {accounts.map((account) => {
              const NetworkIcon = networkIcons[account.network] || Instagram;
              const gradient = networkColors[account.network] || networkColors.instagram;
              
              return (
                <div
                  key={account.id}
                  className="bg-gray-800/50 rounded-xl border border-gray-700 p-4 hover:border-gray-600 transition-colors cursor-pointer"
                  onClick={() => router.push(`/admin/social/flow/accounts/${account.id}`)}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center overflow-hidden`}>
                      {account.profile_picture_url ? (
                        <img
                          src={account.profile_picture_url}
                          alt={account.account_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <NetworkIcon className="w-6 h-6 text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-medium truncate">
                        {account.account_name}
                      </h3>
                      <p className="text-gray-400 text-sm truncate">
                        @{account.account_username}
                      </p>
                    </div>
                    {account.is_active ? (
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-gray-700/30 rounded-lg p-2">
                      <p className="text-white font-semibold text-sm">
                        {formatNumber(account.followers_count)}
                      </p>
                      <p className="text-gray-400 text-xs">Seguidores</p>
                    </div>
                    <div className="bg-gray-700/30 rounded-lg p-2">
                      <p className="text-white font-semibold text-sm">
                        {formatNumber(account.posts_count)}
                      </p>
                      <p className="text-gray-400 text-xs">Posts</p>
                    </div>
                    <div className="bg-gray-700/30 rounded-lg p-2">
                      <p className="text-white font-semibold text-sm">
                        {account.engagement_rate?.toFixed(1) || '0'}%
                      </p>
                      <p className="text-gray-400 text-xs">Engaj.</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Métricas Overview */}
      {overview && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Visão Geral</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-4">
              <div className="flex items-center justify-between mb-2">
                <Users className="w-5 h-5 text-blue-400" />
                {overview.totalFollowersChange !== 0 && (
                  <span className={`text-xs flex items-center gap-1 ${
                    overview.totalFollowersChange > 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {overview.totalFollowersChange > 0 ? (
                      <ArrowUp className="w-3 h-3" />
                    ) : (
                      <ArrowDown className="w-3 h-3" />
                    )}
                    {Math.abs(overview.totalFollowersChange).toFixed(1)}%
                  </span>
                )}
              </div>
              <p className="text-2xl font-bold text-white">
                {formatNumber(overview.totalFollowers)}
              </p>
              <p className="text-gray-400 text-sm">Total de Seguidores</p>
            </div>

            <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-4">
              <div className="flex items-center justify-between mb-2">
                <Eye className="w-5 h-5 text-purple-400" />
              </div>
              <p className="text-2xl font-bold text-white">
                {formatNumber(overview.totalReach)}
              </p>
              <p className="text-gray-400 text-sm">Alcance Total</p>
            </div>

            <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-4">
              <div className="flex items-center justify-between mb-2">
                <Heart className="w-5 h-5 text-pink-400" />
              </div>
              <p className="text-2xl font-bold text-white">
                {formatNumber(overview.totalEngagements)}
              </p>
              <p className="text-gray-400 text-sm">Engajamentos</p>
            </div>

            <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-4">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
              <p className="text-2xl font-bold text-white">
                {overview.avgEngagementRate.toFixed(2)}%
              </p>
              <p className="text-gray-400 text-sm">Taxa de Engajamento</p>
            </div>
          </div>
        </div>
      )}

      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ações Rápidas */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-white mb-4">Ações Rápidas</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => router.push('/admin/social/flow/create')}
              className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 hover:from-blue-500/30 hover:to-purple-500/30 rounded-xl border border-blue-500/30 p-4 text-center transition-all group"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                <Plus className="w-6 h-6 text-white" />
              </div>
              <p className="text-white font-medium">Criar Post</p>
              <p className="text-gray-400 text-xs mt-1">Multi-rede</p>
            </button>

            <button
              onClick={() => router.push('/admin/social/flow/calendar')}
              className="bg-gray-800/50 hover:bg-gray-700/50 rounded-xl border border-gray-700 p-4 text-center transition-all group"
            >
              <div className="w-12 h-12 bg-gray-700 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                <Calendar className="w-6 h-6 text-blue-400" />
              </div>
              <p className="text-white font-medium">Calendário</p>
              <p className="text-gray-400 text-xs mt-1">Agendar posts</p>
            </button>

            <button
              onClick={() => router.push('/admin/social/flow/analytics')}
              className="bg-gray-800/50 hover:bg-gray-700/50 rounded-xl border border-gray-700 p-4 text-center transition-all group"
            >
              <div className="w-12 h-12 bg-gray-700 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                <BarChart3 className="w-6 h-6 text-green-400" />
              </div>
              <p className="text-white font-medium">Analytics</p>
              <p className="text-gray-400 text-xs mt-1">Ver métricas</p>
            </button>

            <button
              onClick={() => router.push('/admin/social/flow/ai')}
              className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 rounded-xl border border-purple-500/30 p-4 text-center transition-all group"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <p className="text-white font-medium">IA Copilot</p>
              <p className="text-gray-400 text-xs mt-1">Gerar conteúdo</p>
            </button>
          </div>

          {/* Features do Social Flow */}
          <div className="mt-6 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-xl border border-blue-500/20 p-6">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              Recursos do Social Flow
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />
                <span className="text-gray-300">Publicação multi-rede</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />
                <span className="text-gray-300">Agendamento inteligente</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />
                <span className="text-gray-300">Analytics unificado</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />
                <span className="text-gray-300">IA para legendas</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />
                <span className="text-gray-300">Hashtags otimizadas</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />
                <span className="text-gray-300">Melhores horários</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />
                <span className="text-gray-300">Calendário visual</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />
                <span className="text-gray-300">Cross-posting</span>
              </div>
            </div>
          </div>
        </div>

        {/* Posts Agendados */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Próximos Posts</h2>
            <button
              onClick={() => router.push('/admin/social/flow/calendar')}
              className="text-blue-400 text-sm hover:text-blue-300 transition-colors"
            >
              Ver todos
            </button>
          </div>

          <div className="bg-gray-800/50 rounded-xl border border-gray-700 divide-y divide-gray-700">
            {scheduledPosts.length === 0 ? (
              <div className="p-6 text-center">
                <Clock className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">Nenhum post agendado</p>
                <button
                  onClick={() => router.push('/admin/social/flow/create')}
                  className="text-blue-400 text-sm mt-2 hover:text-blue-300"
                >
                  Agendar primeiro post
                </button>
              </div>
            ) : (
              scheduledPosts.map((post) => {
                const NetworkIcon = networkIcons[post.social_accounts?.network] || Instagram;
                const scheduledDate = new Date(post.scheduled_for);
                
                return (
                  <div
                    key={post.id}
                    className="p-4 hover:bg-gray-700/30 transition-colors cursor-pointer"
                    onClick={() => router.push(`/admin/social/flow/posts/${post.id}`)}
                  >
                    <div className="flex items-start gap-3">
                      <NetworkIcon className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm line-clamp-2">
                          {post.content || 'Sem conteúdo'}
                        </p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                          <Clock className="w-3 h-3" />
                          {scheduledDate.toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
