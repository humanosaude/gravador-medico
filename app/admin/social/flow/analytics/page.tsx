'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import {
  ArrowLeft,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Calendar,
  RefreshCw,
  Download,
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
  Youtube,
  Loader2,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
} from 'lucide-react';

// =====================================================
// TIPOS
// =====================================================

interface NetworkAccount {
  id: string;
  network: string;
  account_name: string;
  account_username: string;
  profile_picture_url?: string;
  is_active: boolean;
}

interface AnalyticsMetric {
  label: string;
  value: number;
  previousValue: number;
  change: number;
  changePercent: number;
  icon: React.ReactNode;
  color: string;
}

interface DailyMetric {
  date: string;
  followers: number;
  reach: number;
  impressions: number;
  engagement: number;
  profile_views: number;
}

interface TopPost {
  id: string;
  network: string;
  media_url?: string;
  caption?: string;
  post_type: string;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  reach: number;
  engagement_rate: number;
  published_at: string;
}

interface NetworkStats {
  network: string;
  total_followers: number;
  total_posts: number;
  avg_engagement_rate: number;
  total_reach: number;
}

// =====================================================
// ÍCONES DAS REDES
// =====================================================

const networkIcons: Record<string, React.ReactNode> = {
  instagram: <Instagram className="w-4 h-4" />,
  facebook: <Facebook className="w-4 h-4" />,
  twitter: <Twitter className="w-4 h-4" />,
  linkedin: <Linkedin className="w-4 h-4" />,
  youtube: <Youtube className="w-4 h-4" />,
  tiktok: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
    </svg>
  ),
  pinterest: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0a12 12 0 00-4.37 23.17c-.1-.94-.2-2.4.04-3.44l1.4-5.96s-.37-.73-.37-1.82c0-1.7.99-2.98 2.22-2.98 1.05 0 1.56.79 1.56 1.73 0 1.05-.67 2.63-1.02 4.1-.29 1.22.62 2.22 1.82 2.22 2.19 0 3.87-2.3 3.87-5.64 0-2.95-2.12-5.01-5.14-5.01-3.5 0-5.56 2.63-5.56 5.35 0 1.06.41 2.2.92 2.82.1.12.12.23.08.35l-.34 1.4c-.06.23-.18.28-.42.17-1.56-.73-2.54-3-2.54-4.83 0-3.93 2.86-7.54 8.24-7.54 4.33 0 7.69 3.08 7.69 7.2 0 4.3-2.71 7.76-6.47 7.76-1.26 0-2.45-.66-2.86-1.44l-.78 2.96c-.28 1.08-1.04 2.44-1.55 3.27A12 12 0 1012 0z" />
    </svg>
  ),
};

const networkColors: Record<string, string> = {
  instagram: 'text-pink-500 bg-pink-500/10',
  facebook: 'text-blue-500 bg-blue-500/10',
  twitter: 'text-sky-500 bg-sky-500/10',
  linkedin: 'text-blue-600 bg-blue-600/10',
  youtube: 'text-red-500 bg-red-500/10',
  tiktok: 'text-white bg-gray-800',
  pinterest: 'text-red-600 bg-red-600/10',
};

// =====================================================
// COMPONENTES
// =====================================================

function MetricCard({ metric }: { metric: AnalyticsMetric }) {
  const isPositive = metric.change >= 0;

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-lg ${metric.color}`}>
          {metric.icon}
        </div>
        <div className={`flex items-center gap-1 text-sm ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
          {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
          {Math.abs(metric.changePercent).toFixed(1)}%
        </div>
      </div>
      <div className="text-2xl font-bold text-white mb-1">
        {metric.value.toLocaleString()}
      </div>
      <div className="text-sm text-gray-400">{metric.label}</div>
      <div className="text-xs text-gray-500 mt-1">
        vs. período anterior: {metric.previousValue.toLocaleString()}
      </div>
    </div>
  );
}

function SimpleChart({ data, dataKey, color }: { data: DailyMetric[]; dataKey: keyof DailyMetric; color: string }) {
  if (data.length === 0) return null;

  const values = data.map(d => d[dataKey] as number);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  return (
    <div className="h-32 flex items-end gap-1">
      {data.map((item, index) => {
        const value = item[dataKey] as number;
        const height = ((value - min) / range) * 100;
        return (
          <div
            key={index}
            className="flex-1 rounded-t transition-all hover:opacity-80"
            style={{
              height: `${Math.max(height, 5)}%`,
              backgroundColor: color,
            }}
            title={`${item.date}: ${value.toLocaleString()}`}
          />
        );
      })}
    </div>
  );
}

function TopPostCard({ post }: { post: TopPost }) {
  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors">
      <div className="flex gap-4">
        {post.media_url && (
          <img
            src={post.media_url}
            alt="Post"
            className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <div className={`p-1 rounded ${networkColors[post.network]}`}>
              {networkIcons[post.network]}
            </div>
            <span className="text-xs text-gray-400 capitalize">{post.post_type}</span>
            <span className="text-xs text-gray-500">•</span>
            <span className="text-xs text-gray-500">
              {new Date(post.published_at).toLocaleDateString('pt-BR')}
            </span>
          </div>
          {post.caption && (
            <p className="text-sm text-gray-300 line-clamp-2 mb-2">{post.caption}</p>
          )}
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Heart className="w-3 h-3" />
              {post.likes_count.toLocaleString()}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="w-3 h-3" />
              {post.comments_count.toLocaleString()}
            </span>
            <span className="flex items-center gap-1">
              <Share2 className="w-3 h-3" />
              {post.shares_count.toLocaleString()}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {post.reach.toLocaleString()}
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-white">
            {post.engagement_rate.toFixed(2)}%
          </div>
          <div className="text-xs text-gray-400">Engajamento</div>
        </div>
      </div>
    </div>
  );
}

function NetworkComparisonCard({ stats }: { stats: NetworkStats }) {
  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2 rounded-lg ${networkColors[stats.network]}`}>
          {networkIcons[stats.network]}
        </div>
        <span className="font-medium text-white capitalize">{stats.network}</span>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-gray-400">Seguidores</div>
          <div className="text-white font-medium">{stats.total_followers.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-gray-400">Posts</div>
          <div className="text-white font-medium">{stats.total_posts.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-gray-400">Engajamento</div>
          <div className="text-white font-medium">{stats.avg_engagement_rate.toFixed(2)}%</div>
        </div>
        <div>
          <div className="text-gray-400">Alcance</div>
          <div className="text-white font-medium">{stats.total_reach.toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// PÁGINA PRINCIPAL
// =====================================================

export default function SocialFlowAnalyticsPage() {
  const supabase = createClientComponentClient();
  
  // Estado
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [accounts, setAccounts] = useState<NetworkAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [metrics, setMetrics] = useState<AnalyticsMetric[]>([]);
  const [dailyData, setDailyData] = useState<DailyMetric[]>([]);
  const [topPosts, setTopPosts] = useState<TopPost[]>([]);
  const [networkStats, setNetworkStats] = useState<NetworkStats[]>([]);
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);

  // Carregar contas
  const loadAccounts = useCallback(async () => {
    const { data } = await supabase
      .from('social_accounts')
      .select('id, network, account_name, account_username, profile_picture_url, is_active')
      .eq('is_active', true)
      .order('network');
    
    if (data) {
      setAccounts(data);
    }
  }, [supabase]);

  // Carregar analytics
  const loadAnalytics = useCallback(async () => {
    setRefreshing(true);
    try {
      const params = new URLSearchParams({
        range: dateRange,
        ...(selectedAccount !== 'all' && { account_id: selectedAccount }),
      });

      const response = await fetch(`/api/social-flow/analytics?${params}`);
      const data = await response.json();

      if (data.success) {
        // Processar métricas principais
        const currentMetrics = data.current || {};
        const previousMetrics = data.previous || {};

        const calculateChange = (current: number, previous: number) => {
          const change = current - previous;
          const changePercent = previous > 0 ? ((change / previous) * 100) : 0;
          return { change, changePercent };
        };

        const followers = currentMetrics.followers || 0;
        const prevFollowers = previousMetrics.followers || 0;
        const followersChange = calculateChange(followers, prevFollowers);

        const reach = currentMetrics.reach || 0;
        const prevReach = previousMetrics.reach || 0;
        const reachChange = calculateChange(reach, prevReach);

        const impressions = currentMetrics.impressions || 0;
        const prevImpressions = previousMetrics.impressions || 0;
        const impressionsChange = calculateChange(impressions, prevImpressions);

        const engagement = currentMetrics.engagement || 0;
        const prevEngagement = previousMetrics.engagement || 0;
        const engagementChange = calculateChange(engagement, prevEngagement);

        const likes = currentMetrics.likes || 0;
        const prevLikes = previousMetrics.likes || 0;
        const likesChange = calculateChange(likes, prevLikes);

        const comments = currentMetrics.comments || 0;
        const prevComments = previousMetrics.comments || 0;
        const commentsChange = calculateChange(comments, prevComments);

        setMetrics([
          {
            label: 'Seguidores',
            value: followers,
            previousValue: prevFollowers,
            ...followersChange,
            icon: <Users className="w-5 h-5" />,
            color: 'text-blue-400 bg-blue-400/10',
          },
          {
            label: 'Alcance',
            value: reach,
            previousValue: prevReach,
            ...reachChange,
            icon: <Eye className="w-5 h-5" />,
            color: 'text-green-400 bg-green-400/10',
          },
          {
            label: 'Impressões',
            value: impressions,
            previousValue: prevImpressions,
            ...impressionsChange,
            icon: <BarChart3 className="w-5 h-5" />,
            color: 'text-purple-400 bg-purple-400/10',
          },
          {
            label: 'Engajamento',
            value: engagement,
            previousValue: prevEngagement,
            ...engagementChange,
            icon: <TrendingUp className="w-5 h-5" />,
            color: 'text-pink-400 bg-pink-400/10',
          },
          {
            label: 'Curtidas',
            value: likes,
            previousValue: prevLikes,
            ...likesChange,
            icon: <Heart className="w-5 h-5" />,
            color: 'text-red-400 bg-red-400/10',
          },
          {
            label: 'Comentários',
            value: comments,
            previousValue: prevComments,
            ...commentsChange,
            icon: <MessageCircle className="w-5 h-5" />,
            color: 'text-yellow-400 bg-yellow-400/10',
          },
        ]);

        // Dados diários para gráficos
        setDailyData(data.daily || []);

        // Top posts
        setTopPosts(data.topPosts || []);

        // Estatísticas por rede
        setNetworkStats(data.networkStats || []);
      }
    } catch (error) {
      console.error('Erro ao carregar analytics:', error);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [dateRange, selectedAccount]);

  // Efeitos
  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  // Exportar relatório
  const exportReport = async () => {
    try {
      const response = await fetch('/api/social-flow/analytics/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          range: dateRange,
          account_id: selectedAccount !== 'all' ? selectedAccount : undefined,
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `social-analytics-${dateRange}.csv`;
        a.click();
      }
    } catch (error) {
      console.error('Erro ao exportar:', error);
    }
  };

  // Conta selecionada
  const selectedAccountData = accounts.find(a => a.id === selectedAccount);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#101A1E] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-400">Carregando analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#101A1E] text-white p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Link
            href="/admin/social/flow"
            className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <BarChart3 className="w-7 h-7 text-blue-500" />
              Analytics
            </h1>
            <p className="text-gray-400">Métricas e insights de suas redes sociais</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Seletor de conta */}
          <div className="relative">
            <button
              onClick={() => setShowAccountDropdown(!showAccountDropdown)}
              className="flex items-center gap-3 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 hover:border-gray-600 transition-colors"
            >
              {selectedAccount === 'all' ? (
                <>
                  <Filter className="w-4 h-4 text-gray-400" />
                  <span>Todas as contas</span>
                </>
              ) : selectedAccountData ? (
                <>
                  {selectedAccountData.profile_picture_url ? (
                    <img
                      src={selectedAccountData.profile_picture_url}
                      alt={selectedAccountData.account_name}
                      className="w-6 h-6 rounded-full"
                    />
                  ) : (
                    <div className={`p-1 rounded ${networkColors[selectedAccountData.network]}`}>
                      {networkIcons[selectedAccountData.network]}
                    </div>
                  )}
                  <span>@{selectedAccountData.account_username}</span>
                </>
              ) : (
                <span>Selecionar conta</span>
              )}
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            {showAccountDropdown && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
                <button
                  onClick={() => {
                    setSelectedAccount('all');
                    setShowAccountDropdown(false);
                  }}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors flex items-center gap-3 ${
                    selectedAccount === 'all' ? 'bg-gray-700' : ''
                  }`}
                >
                  <Filter className="w-4 h-4 text-gray-400" />
                  <span>Todas as contas</span>
                </button>
                <div className="border-t border-gray-700" />
                {accounts.map((account) => (
                  <button
                    key={account.id}
                    onClick={() => {
                      setSelectedAccount(account.id);
                      setShowAccountDropdown(false);
                    }}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors flex items-center gap-3 ${
                      selectedAccount === account.id ? 'bg-gray-700' : ''
                    }`}
                  >
                    {account.profile_picture_url ? (
                      <img
                        src={account.profile_picture_url}
                        alt={account.account_name}
                        className="w-6 h-6 rounded-full"
                      />
                    ) : (
                      <div className={`p-1 rounded ${networkColors[account.network]}`}>
                        {networkIcons[account.network]}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{account.account_name}</div>
                      <div className="text-xs text-gray-400">@{account.account_username}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Seletor de período */}
          <div className="flex items-center bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
            {(['7d', '30d', '90d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-4 py-2 text-sm transition-colors ${
                  dateRange === range
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                {range === '7d' ? '7 dias' : range === '30d' ? '30 dias' : '90 dias'}
              </button>
            ))}
          </div>

          {/* Botões de ação */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => loadAnalytics()}
              disabled={refreshing}
              className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
            <button
              onClick={exportReport}
              className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 hover:bg-gray-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Exportar
            </button>
          </div>
        </div>
      </div>

      {/* Métricas principais */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {metrics.map((metric, index) => (
          <MetricCard key={index} metric={metric} />
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Gráfico de Seguidores */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" />
              Crescimento de Seguidores
            </h3>
          </div>
          <SimpleChart data={dailyData} dataKey="followers" color="#3b82f6" />
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            {dailyData.length > 0 && (
              <>
                <span>{new Date(dailyData[0].date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
                <span>{new Date(dailyData[dailyData.length - 1].date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
              </>
            )}
          </div>
        </div>

        {/* Gráfico de Alcance */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Eye className="w-5 h-5 text-green-400" />
              Alcance
            </h3>
          </div>
          <SimpleChart data={dailyData} dataKey="reach" color="#22c55e" />
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            {dailyData.length > 0 && (
              <>
                <span>{new Date(dailyData[0].date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
                <span>{new Date(dailyData[dailyData.length - 1].date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
              </>
            )}
          </div>
        </div>

        {/* Gráfico de Engajamento */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-pink-400" />
              Engajamento
            </h3>
          </div>
          <SimpleChart data={dailyData} dataKey="engagement" color="#ec4899" />
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            {dailyData.length > 0 && (
              <>
                <span>{new Date(dailyData[0].date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
                <span>{new Date(dailyData[dailyData.length - 1].date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
              </>
            )}
          </div>
        </div>

        {/* Gráfico de Impressões */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-400" />
              Impressões
            </h3>
          </div>
          <SimpleChart data={dailyData} dataKey="impressions" color="#a855f7" />
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            {dailyData.length > 0 && (
              <>
                <span>{new Date(dailyData[0].date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
                <span>{new Date(dailyData[dailyData.length - 1].date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Comparativo de Redes */}
      {networkStats.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            Comparativo de Redes
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {networkStats.map((stats) => (
              <NetworkComparisonCard key={stats.network} stats={stats} />
            ))}
          </div>
        </div>
      )}

      {/* Top Posts */}
      {topPosts.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            Top Posts do Período
          </h3>
          <div className="space-y-4">
            {topPosts.map((post) => (
              <TopPostCard key={post.id} post={post} />
            ))}
          </div>
        </div>
      )}

      {/* Estado vazio */}
      {accounts.length === 0 && (
        <div className="text-center py-16">
          <BarChart3 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Nenhuma conta conectada</h3>
          <p className="text-gray-400 mb-6">
            Conecte suas redes sociais para ver analytics
          </p>
          <Link
            href="/admin/social/flow/connect"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg transition-colors"
          >
            Conectar Redes
          </Link>
        </div>
      )}
    </div>
  );
}
