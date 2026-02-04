'use client';

import { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Users, 
  Eye, 
  Heart, 
  MessageCircle, 
  Bookmark,
  Share2,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  ImageIcon,
  Film,
  Sparkles,
  RefreshCw,
  Download,
  Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface AccountMetrics {
  followers_count: number;
  follows_count: number;
  media_count: number;
  followers_gained: number;
  followers_lost: number;
  impressions: number;
  reach: number;
  profile_views: number;
  website_clicks: number;
}

interface PostMetrics {
  id: string;
  caption?: string;
  post_type: string;
  instagram_permalink?: string;
  published_at: string;
  media_urls: string[];
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
  engagement_rate: number;
}

type Period = '7d' | '14d' | '30d' | '90d';

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('30d');
  const [metrics, setMetrics] = useState<AccountMetrics | null>(null);
  const [topPosts, setTopPosts] = useState<PostMetrics[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, [period]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/social/instagram/analytics?period=${period}`);
      const data = await response.json();
      setMetrics(data.metrics || null);
      setTopPosts(data.topPosts || []);
    } catch (error) {
      console.error('Error loading analytics:', error);
      // Mock data for demo
      setMetrics({
        followers_count: 12580,
        follows_count: 843,
        media_count: 156,
        followers_gained: 234,
        followers_lost: 45,
        impressions: 45680,
        reach: 32450,
        profile_views: 1234,
        website_clicks: 89,
      });
      setTopPosts([
        {
          id: '1',
          caption: 'Conheça nosso novo tratamento...',
          post_type: 'reel',
          published_at: new Date().toISOString(),
          media_urls: [],
          impressions: 15420,
          reach: 12300,
          likes: 856,
          comments: 42,
          saves: 123,
          shares: 34,
          engagement_rate: 8.5,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
    });
  };

  const getChangePercent = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous * 100).toFixed(1);
  };

  const StatCard = ({ 
    title, 
    value, 
    change, 
    icon: Icon, 
    iconColor 
  }: { 
    title: string; 
    value: number | string; 
    change?: number; 
    icon: any; 
    iconColor: string;
  }) => (
    <Card className="bg-gray-800/50 border-gray-700/50">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-gray-400">{title}</p>
            <p className="text-3xl font-bold text-white">
              {typeof value === 'number' ? formatNumber(value) : value}
            </p>
            {change !== undefined && (
              <div className={`flex items-center gap-1 text-sm ${
                change >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {change >= 0 ? (
                  <ArrowUpRight className="w-4 h-4" />
                ) : (
                  <ArrowDownRight className="w-4 h-4" />
                )}
                <span>{Math.abs(change)}%</span>
              </div>
            )}
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconColor}`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-[#101A1E] p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Analytics</h1>
            <p className="text-sm text-gray-400">
              Acompanhe o desempenho do seu Instagram
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="border-gray-700 text-gray-300 hover:bg-gray-700/50 hover:text-white"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-gray-700 text-gray-300 hover:bg-gray-700/50 hover:text-white"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Period Selector */}
      <Card className="bg-gray-800/50 border-gray-700/50 mb-6">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 bg-gray-700/50 rounded-lg p-1">
              {[
                { value: '7d', label: '7 dias' },
                { value: '14d', label: '14 dias' },
                { value: '30d', label: '30 dias' },
                { value: '90d', label: '90 dias' },
              ].map((p) => (
                <Button
                  key={p.value}
                  variant="ghost"
                  size="sm"
                  onClick={() => setPeriod(p.value as Period)}
                  className={period === p.value 
                    ? 'bg-purple-600 text-white' 
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                  }
                >
                  {p.label}
                </Button>
              ))}
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Calendar className="w-4 h-4" />
              <span>
                {new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')} 
                {' - '}
                {new Date().toLocaleDateString('pt-BR')}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-28 bg-gray-800/50" />
            ))}
          </div>
          <Skeleton className="h-96 bg-gray-800/50" />
        </div>
      ) : (
        <>
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard
              title="Seguidores"
              value={metrics?.followers_count || 0}
              change={metrics ? Number(getChangePercent(
                metrics.followers_gained - metrics.followers_lost,
                metrics.followers_count - metrics.followers_gained + metrics.followers_lost
              )) : undefined}
              icon={Users}
              iconColor="bg-purple-600"
            />
            <StatCard
              title="Alcance"
              value={metrics?.reach || 0}
              change={12.5}
              icon={Eye}
              iconColor="bg-blue-600"
            />
            <StatCard
              title="Impressões"
              value={metrics?.impressions || 0}
              change={8.2}
              icon={BarChart3}
              iconColor="bg-green-600"
            />
            <StatCard
              title="Visitas ao perfil"
              value={metrics?.profile_views || 0}
              change={-3.1}
              icon={TrendingUp}
              iconColor="bg-orange-600"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard
              title="Seguidores ganhos"
              value={`+${metrics?.followers_gained || 0}`}
              icon={ArrowUpRight}
              iconColor="bg-green-600"
            />
            <StatCard
              title="Seguidores perdidos"
              value={`-${metrics?.followers_lost || 0}`}
              icon={ArrowDownRight}
              iconColor="bg-red-600"
            />
            <StatCard
              title="Cliques no site"
              value={metrics?.website_clicks || 0}
              icon={Share2}
              iconColor="bg-cyan-600"
            />
            <StatCard
              title="Total de posts"
              value={metrics?.media_count || 0}
              icon={ImageIcon}
              iconColor="bg-pink-600"
            />
          </div>

          {/* Engagement Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Chart Placeholder */}
            <Card className="bg-gray-800/50 border-gray-700/50">
              <CardHeader>
                <CardTitle className="text-white">Crescimento de Seguidores</CardTitle>
                <CardDescription className="text-gray-400">
                  Evolução nos últimos {period.replace('d', ' dias')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-700 rounded-lg">
                  <div className="text-center">
                    <TrendingUp className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-500">Gráfico de crescimento</p>
                    <p className="text-xs text-gray-600">Integração com Recharts</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Engagement by Type */}
            <Card className="bg-gray-800/50 border-gray-700/50">
              <CardHeader>
                <CardTitle className="text-white">Engajamento por Tipo</CardTitle>
                <CardDescription className="text-gray-400">
                  Performance por formato de post
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { type: 'Feed', icon: ImageIcon, color: 'blue', engagement: 4.2, posts: 45 },
                    { type: 'Reels', icon: Film, color: 'red', engagement: 8.5, posts: 23 },
                    { type: 'Stories', icon: Sparkles, color: 'green', engagement: 3.1, posts: 88 },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.type} className="flex items-center gap-4">
                        <div className={`w-10 h-10 bg-${item.color}-500/20 rounded-lg flex items-center justify-center`}>
                          <Icon className={`w-5 h-5 text-${item.color}-400`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-white">{item.type}</span>
                            <span className="text-sm text-gray-400">{item.posts} posts</span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <div 
                              className={`bg-${item.color}-500 h-2 rounded-full`}
                              style={{ width: `${item.engagement * 10}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-sm font-medium text-white w-16 text-right">
                          {item.engagement}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Posts */}
          <Card className="bg-gray-800/50 border-gray-700/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">Melhores Posts</CardTitle>
                  <CardDescription className="text-gray-400">
                    Posts com maior engajamento no período
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" className="border-gray-700 text-gray-300 hover:bg-gray-700/50">
                  <Filter className="w-4 h-4 mr-2" />
                  Filtrar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {topPosts.length === 0 ? (
                <div className="text-center py-8">
                  <ImageIcon className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-500">Nenhum post publicado no período</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {topPosts.map((post, index) => (
                    <div 
                      key={post.id}
                      className="flex items-center gap-4 p-4 bg-gray-700/30 rounded-lg"
                    >
                      {/* Rank */}
                      <div className="w-8 h-8 bg-purple-600/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-purple-400">#{index + 1}</span>
                      </div>

                      {/* Thumbnail */}
                      <div className="w-16 h-16 bg-gray-700 rounded-lg overflow-hidden flex-shrink-0">
                        {post.media_urls.length > 0 ? (
                          <img 
                            src={post.media_urls[0]} 
                            alt="" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            {post.post_type === 'reel' ? (
                              <Film className="w-6 h-6 text-gray-600" />
                            ) : (
                              <ImageIcon className="w-6 h-6 text-gray-600" />
                            )}
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={
                            post.post_type === 'reel' 
                              ? 'bg-red-500/20 text-red-400' 
                              : post.post_type === 'story'
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-blue-500/20 text-blue-400'
                          }>
                            {post.post_type}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {formatDate(post.published_at)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-300 truncate">
                          {post.caption || 'Sem legenda'}
                        </p>
                      </div>

                      {/* Metrics */}
                      <div className="flex items-center gap-6 flex-shrink-0">
                        <div className="text-center">
                          <div className="flex items-center gap-1 text-gray-400">
                            <Eye className="w-4 h-4" />
                            <span className="text-sm">{formatNumber(post.reach)}</span>
                          </div>
                          <p className="text-xs text-gray-600">Alcance</p>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center gap-1 text-gray-400">
                            <Heart className="w-4 h-4" />
                            <span className="text-sm">{formatNumber(post.likes)}</span>
                          </div>
                          <p className="text-xs text-gray-600">Curtidas</p>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center gap-1 text-gray-400">
                            <MessageCircle className="w-4 h-4" />
                            <span className="text-sm">{formatNumber(post.comments)}</span>
                          </div>
                          <p className="text-xs text-gray-600">Comentários</p>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center gap-1 text-gray-400">
                            <Bookmark className="w-4 h-4" />
                            <span className="text-sm">{formatNumber(post.saves)}</span>
                          </div>
                          <p className="text-xs text-gray-600">Salvos</p>
                        </div>
                        <div className="text-center px-3 py-1 bg-purple-600/20 rounded-lg">
                          <p className="text-lg font-bold text-purple-400">{post.engagement_rate}%</p>
                          <p className="text-xs text-gray-500">Engajamento</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Insights AI */}
          <Card className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 border-purple-700/50 mt-6">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <CardTitle className="text-white">Insights com IA</CardTitle>
              </div>
              <CardDescription className="text-gray-400">
                Análise inteligente do seu desempenho
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-gray-800/50 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-green-400 mb-2" />
                  <h4 className="text-sm font-medium text-white mb-1">Melhor horário para postar</h4>
                  <p className="text-xs text-gray-400">
                    Seus seguidores estão mais ativos entre <strong className="text-white">18h-20h</strong> durante a semana
                  </p>
                </div>
                <div className="p-4 bg-gray-800/50 rounded-lg">
                  <Film className="w-6 h-6 text-red-400 mb-2" />
                  <h4 className="text-sm font-medium text-white mb-1">Reels performam melhor</h4>
                  <p className="text-xs text-gray-400">
                    Seus Reels têm <strong className="text-white">2.5x mais engajamento</strong> que posts de feed
                  </p>
                </div>
                <div className="p-4 bg-gray-800/50 rounded-lg">
                  <Users className="w-6 h-6 text-blue-400 mb-2" />
                  <h4 className="text-sm font-medium text-white mb-1">Crescimento saudável</h4>
                  <p className="text-xs text-gray-400">
                    Você está <strong className="text-white">15% acima</strong> da média do seu nicho em novos seguidores
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
