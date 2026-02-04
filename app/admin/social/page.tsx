'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Instagram, 
  Plus, 
  Calendar, 
  ImageIcon, 
  BarChart3, 
  Settings,
  TrendingUp,
  TrendingDown,
  Heart,
  Eye,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface InstagramAccount {
  id: string;
  username: string;
  name?: string;
  profile_picture_url?: string;
  followers_count: number;
  follows_count: number;
  media_count: number;
  connection_status: 'connected' | 'expired' | 'error';
  last_sync_at?: string;
  token_expires_at?: string;
}

interface DashboardStats {
  scheduledPosts: number;
  publishedToday: number;
  totalReach: number;
  engagementRate: number;
  followersChange: number;
}

interface ScheduledPost {
  id: string;
  caption?: string;
  post_type: string;
  scheduled_for: string;
  status: string;
  media_urls: string[];
}

export default function InstaFlowDashboard() {
  const [accounts, setAccounts] = useState<InstagramAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<InstagramAccount | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [upcomingPosts, setUpcomingPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccount) {
      loadDashboardData(selectedAccount.id);
    }
  }, [selectedAccount]);

  const loadAccounts = async () => {
    try {
      const response = await fetch('/api/social/instagram/accounts');
      const data = await response.json();
      
      if (data.accounts && data.accounts.length > 0) {
        setAccounts(data.accounts);
        setSelectedAccount(data.accounts[0]);
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardData = async (accountId: string) => {
    try {
      const [statsRes, postsRes] = await Promise.all([
        fetch(`/api/social/instagram/stats?accountId=${accountId}`),
        fetch(`/api/social/instagram/posts?accountId=${accountId}&status=scheduled&limit=5`),
      ]);

      const statsData = await statsRes.json();
      const postsData = await postsRes.json();

      setStats(statsData.stats || null);
      setUpcomingPosts(postsData.posts || []);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const handleSync = async () => {
    if (!selectedAccount) return;
    
    setSyncing(true);
    try {
      await fetch(`/api/social/instagram/sync?accountId=${selectedAccount.id}`, {
        method: 'POST',
      });
      await loadAccounts();
    } catch (error) {
      console.error('Error syncing:', error);
    } finally {
      setSyncing(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Se não tem contas, mostrar tela de boas-vindas
  if (!loading && accounts.length === 0) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <Card className="w-full max-w-lg text-center">
          <CardHeader>
            <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Instagram className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl">Bem-vindo ao InstaFlow!</CardTitle>
            <CardDescription>
              Conecte sua conta Instagram Business para começar a automatizar seus posts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/social/connect">
              <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                <Plus className="w-4 h-4 mr-2" />
                Conectar conta Instagram
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
            <Instagram className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">InstaFlow</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Gestão e automação de Instagram
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            Sincronizar
          </Button>
          <Link href="/admin/social/post/new">
            <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
              <Plus className="w-4 h-4 mr-2" />
              Novo Post
            </Button>
          </Link>
        </div>
      </div>

      {/* Account Selector */}
      {selectedAccount && (
        <Card className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {selectedAccount.profile_picture_url ? (
                  <img 
                    src={selectedAccount.profile_picture_url} 
                    alt={selectedAccount.username}
                    className="w-14 h-14 rounded-full border-2 border-white shadow-lg"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold text-xl">
                    {selectedAccount.username[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-lg text-gray-900 dark:text-white">
                      @{selectedAccount.username}
                    </h2>
                    <Badge variant={selectedAccount.connection_status === 'connected' ? 'success' : 'default'}>
                      {selectedAccount.connection_status === 'connected' ? (
                        <><CheckCircle2 className="w-3 h-3 mr-1" /> Conectada</>
                      ) : (
                        <><AlertCircle className="w-3 h-3 mr-1" /> {selectedAccount.connection_status}</>
                      )}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mt-1">
                    <span><strong>{formatNumber(selectedAccount.followers_count)}</strong> seguidores</span>
                    <span><strong>{formatNumber(selectedAccount.follows_count)}</strong> seguindo</span>
                    <span><strong>{selectedAccount.media_count}</strong> posts</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a 
                  href={`https://instagram.com/${selectedAccount.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <ExternalLink className="w-5 h-5 text-gray-500" />
                </a>
                <Link href="/admin/social/connect">
                  <Button variant="ghost" size="sm">
                    <Plus className="w-4 h-4 mr-1" />
                    Adicionar
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Posts Agendados</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats?.scheduledPosts || 0}
                </p>
              </div>
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Publicados Hoje</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats?.publishedToday || 0}
                </p>
              </div>
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <Send className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Alcance Total</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatNumber(stats?.totalReach || 0)}
                </p>
              </div>
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Eye className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Taxa de Engajamento</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {(stats?.engagementRate || 0).toFixed(1)}%
                </p>
              </div>
              <div className="w-10 h-10 bg-pink-100 dark:bg-pink-900/30 rounded-lg flex items-center justify-center">
                <Heart className="w-5 h-5 text-pink-600 dark:text-pink-400" />
              </div>
            </div>
            {stats?.followersChange !== undefined && (
              <div className={`flex items-center gap-1 mt-2 text-sm ${
                stats.followersChange >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {stats.followersChange >= 0 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                <span>{stats.followersChange >= 0 ? '+' : ''}{stats.followersChange} seguidores</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Link href="/admin/social/calendar">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-4">
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center mb-2">
                  <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <p className="font-medium text-gray-900 dark:text-white">Calendário</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Agendar posts</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/social/library">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-4">
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mb-2">
                  <ImageIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <p className="font-medium text-gray-900 dark:text-white">Biblioteca</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Mídia salva</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/social/analytics">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-4">
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center mb-2">
                  <BarChart3 className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <p className="font-medium text-gray-900 dark:text-white">Analytics</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Métricas</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/social/settings">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-4">
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center mb-2">
                  <Settings className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                </div>
                <p className="font-medium text-gray-900 dark:text-white">Configurações</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Preferências</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Upcoming Posts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Próximos Posts</CardTitle>
            <CardDescription>Posts agendados para publicação</CardDescription>
          </div>
          <Link href="/admin/social/calendar">
            <Button variant="outline" size="sm">Ver todos</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {upcomingPosts.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum post agendado</p>
              <Link href="/admin/social/post/new">
                <Button variant="ghost" className="mt-2 text-purple-600">
                  Criar primeiro post
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingPosts.map((post) => (
                <div 
                  key={post.id}
                  className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  {post.media_urls?.[0] ? (
                    <img 
                      src={post.media_urls[0]} 
                      alt=""
                      className="w-14 h-14 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-14 h-14 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                      <ImageIcon className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {post.caption || 'Sem legenda'}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded capitalize">
                        {post.post_type}
                      </span>
                      <span>•</span>
                      <Clock className="w-3 h-3" />
                      <span>{formatDate(post.scheduled_for)}</span>
                    </div>
                  </div>
                  <Badge variant={post.status === 'scheduled' ? 'success' : 'default'}>
                    {post.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
