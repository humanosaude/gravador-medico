'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Instagram, 
  Plus, 
  Settings, 
  BarChart3, 
  Image, 
  Calendar,
  Users,
  Heart,
  MessageCircle,
  Share2,
  TrendingUp,
  Clock,
  FileText,
  Zap,
  Sparkles,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import Link from 'next/link'

interface InstagramAccount {
  id: string
  instagram_user_id: string
  username: string
  profile_picture_url?: string
  followers_count?: number
  media_count?: number
  is_active: boolean
  created_at: string
}

interface DashboardStats {
  totalPosts: number
  totalScheduled: number
  totalDrafts: number
  engagementRate: number
  bestPostingTime: string
}

export default function InstaFlowDashboard() {
  const [accounts, setAccounts] = useState<InstagramAccount[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/social/instagram/accounts')
      if (response.ok) {
        const data = await response.json()
        setAccounts(data.accounts || [])
        setStats({
          totalPosts: data.stats?.totalPosts || 0,
          totalScheduled: data.stats?.totalScheduled || 0,
          totalDrafts: data.stats?.totalDrafts || 0,
          engagementRate: data.stats?.engagementRate || 0,
          bestPostingTime: data.stats?.bestPostingTime || '19:00'
        })
      }
    } catch {
      setError('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  const hasConnectedAccounts = accounts.length > 0

  return (
    <div className="min-h-screen bg-[#0B1215] p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 via-purple-500 to-orange-400 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <Instagram className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">InstaFlow</h1>
              <p className="text-gray-400 text-sm">Gerencie seu Instagram com Inteligência Artificial</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm"
              onClick={loadData}
              className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
            <Link href="/admin/social/flow/settings">
              <Button variant="outline" size="sm" className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white">
                <Settings className="w-4 h-4 mr-2" />
                Configurações
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="text-red-300">{error}</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32 bg-gray-800/50 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-64 bg-gray-800/50 rounded-xl" />
        </div>
      )}

      {/* Main Content */}
      {!loading && (
        <>
          {/* Connected Accounts Section */}
          {hasConnectedAccounts ? (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-[#151F23] border border-gray-800/50 rounded-xl p-5 hover:border-pink-500/30 transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-pink-500/20 flex items-center justify-center">
                      <Users className="w-5 h-5 text-pink-400" />
                    </div>
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                      Ativo
                    </Badge>
                  </div>
                  <p className="text-2xl font-bold text-white mb-1">
                    {accounts.reduce((acc, a) => acc + (a.followers_count || 0), 0).toLocaleString()}
                  </p>
                  <p className="text-gray-400 text-sm">Seguidores Totais</p>
                </div>

                <div className="bg-[#151F23] border border-gray-800/50 rounded-xl p-5 hover:border-purple-500/30 transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-purple-400" />
                    </div>
                    <TrendingUp className="w-4 h-4 text-green-400" />
                  </div>
                  <p className="text-2xl font-bold text-white mb-1">{stats?.totalScheduled || 0}</p>
                  <p className="text-gray-400 text-sm">Posts Agendados</p>
                </div>

                <div className="bg-[#151F23] border border-gray-800/50 rounded-xl p-5 hover:border-orange-500/30 transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-orange-400" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-white mb-1">{stats?.totalDrafts || 0}</p>
                  <p className="text-gray-400 text-sm">Rascunhos</p>
                </div>

                <div className="bg-[#151F23] border border-gray-800/50 rounded-xl p-5 hover:border-blue-500/30 transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-blue-400" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-white mb-1">{stats?.bestPostingTime || '19:00'}</p>
                  <p className="text-gray-400 text-sm">Melhor Horário</p>
                </div>
              </div>

              {/* Connected Accounts */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-white">Contas Conectadas</h2>
                  <Link href="/admin/social/flow/connect">
                    <Button size="sm" className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white border-0">
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Conta
                    </Button>
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {accounts.map((account) => (
                    <div 
                      key={account.id}
                      className="bg-[#151F23] border border-gray-800/50 rounded-xl p-5 hover:border-pink-500/30 transition-all group"
                    >
                      <div className="flex items-center gap-4 mb-4">
                        {account.profile_picture_url ? (
                          <img 
                            src={account.profile_picture_url} 
                            alt={account.username}
                            className="w-14 h-14 rounded-full border-2 border-pink-500/50"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center">
                            <Instagram className="w-6 h-6 text-white" />
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-white">@{account.username}</h3>
                            {account.is_active && (
                              <CheckCircle2 className="w-4 h-4 text-green-400" />
                            )}
                          </div>
                          <p className="text-gray-400 text-sm">
                            {(account.followers_count || 0).toLocaleString()} seguidores
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mb-4">
                        <div className="text-center p-2 bg-gray-800/50 rounded-lg">
                          <Heart className="w-4 h-4 text-pink-400 mx-auto mb-1" />
                          <p className="text-xs text-gray-400">Curtidas</p>
                        </div>
                        <div className="text-center p-2 bg-gray-800/50 rounded-lg">
                          <MessageCircle className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                          <p className="text-xs text-gray-400">Comentários</p>
                        </div>
                        <div className="text-center p-2 bg-gray-800/50 rounded-lg">
                          <Share2 className="w-4 h-4 text-purple-400 mx-auto mb-1" />
                          <p className="text-xs text-gray-400">Compartilhar</p>
                        </div>
                      </div>

                      <Link href={`/admin/social/flow/analytics?account=${account.id}`}>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white group-hover:border-pink-500/50"
                        >
                          <BarChart3 className="w-4 h-4 mr-2" />
                          Ver Analytics
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-white mb-4">Ações Rápidas</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Link href="/admin/social/flow/create">
                    <div className="bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/30 rounded-xl p-5 hover:border-pink-500/50 transition-all cursor-pointer group">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <Sparkles className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="font-semibold text-white mb-1">Criar Post com IA</h3>
                      <p className="text-gray-400 text-sm">Gere legendas e hashtags automaticamente</p>
                    </div>
                  </Link>

                  <Link href="/admin/social/flow/calendar">
                    <div className="bg-[#151F23] border border-gray-800/50 rounded-xl p-5 hover:border-purple-500/30 transition-all cursor-pointer group">
                      <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <Calendar className="w-6 h-6 text-purple-400" />
                      </div>
                      <h3 className="font-semibold text-white mb-1">Calendário</h3>
                      <p className="text-gray-400 text-sm">Visualize todos os agendamentos</p>
                    </div>
                  </Link>

                  <Link href="/admin/social/flow/media">
                    <div className="bg-[#151F23] border border-gray-800/50 rounded-xl p-5 hover:border-blue-500/30 transition-all cursor-pointer group">
                      <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <Image className="w-6 h-6 text-blue-400" />
                      </div>
                      <h3 className="font-semibold text-white mb-1">Biblioteca de Mídia</h3>
                      <p className="text-gray-400 text-sm">Gerencie suas imagens e vídeos</p>
                    </div>
                  </Link>

                  <Link href="/admin/social/flow/analytics">
                    <div className="bg-[#151F23] border border-gray-800/50 rounded-xl p-5 hover:border-green-500/30 transition-all cursor-pointer group">
                      <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <BarChart3 className="w-6 h-6 text-green-400" />
                      </div>
                      <h3 className="font-semibold text-white mb-1">Analytics</h3>
                      <p className="text-gray-400 text-sm">Métricas detalhadas de desempenho</p>
                    </div>
                  </Link>
                </div>
              </div>
            </>
          ) : (
            /* Empty State - No Connected Accounts */
            <div className="max-w-2xl mx-auto text-center py-16">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-pink-500 via-purple-500 to-orange-400 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-purple-500/30">
                <Instagram className="w-12 h-12 text-white" />
              </div>
              
              <h2 className="text-3xl font-bold text-white mb-4">
                Bem-vindo ao InstaFlow
              </h2>
              <p className="text-gray-400 text-lg mb-8 max-w-md mx-auto">
                Conecte sua conta do Instagram para começar a criar posts incríveis com ajuda da Inteligência Artificial
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-[#151F23] border border-gray-800/50 rounded-xl p-5">
                  <div className="w-12 h-12 rounded-xl bg-pink-500/20 flex items-center justify-center mx-auto mb-3">
                    <Sparkles className="w-6 h-6 text-pink-400" />
                  </div>
                  <h3 className="font-semibold text-white mb-2">Legendas com IA</h3>
                  <p className="text-gray-400 text-sm">Gere legendas criativas automaticamente</p>
                </div>

                <div className="bg-[#151F23] border border-gray-800/50 rounded-xl p-5">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mx-auto mb-3">
                    <Calendar className="w-6 h-6 text-purple-400" />
                  </div>
                  <h3 className="font-semibold text-white mb-2">Agendamento</h3>
                  <p className="text-gray-400 text-sm">Programe posts para o melhor horário</p>
                </div>

                <div className="bg-[#151F23] border border-gray-800/50 rounded-xl p-5">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mx-auto mb-3">
                    <BarChart3 className="w-6 h-6 text-blue-400" />
                  </div>
                  <h3 className="font-semibold text-white mb-2">Analytics</h3>
                  <p className="text-gray-400 text-sm">Acompanhe o desempenho em tempo real</p>
                </div>
              </div>

              <Link href="/admin/social/flow/connect">
                <Button 
                  size="lg"
                  className="bg-gradient-to-r from-pink-500 via-purple-500 to-orange-400 hover:from-pink-600 hover:via-purple-600 hover:to-orange-500 text-white font-semibold px-8 py-6 text-lg shadow-xl shadow-purple-500/30"
                >
                  <Instagram className="w-5 h-5 mr-2" />
                  Conectar Instagram
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>

              <p className="text-gray-500 text-sm mt-4">
                Processo seguro via OAuth - Suas credenciais ficam protegidas
              </p>
            </div>
          )}

          {/* Social Flow Pro Section */}
          <div className="mt-8 bg-gradient-to-r from-purple-900/30 via-pink-900/30 to-orange-900/30 border border-purple-500/30 rounded-2xl p-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-1">Social Flow Pro</h3>
                  <p className="text-gray-300">
                    Gerencie múltiplas redes sociais em um só lugar: Facebook, Twitter, LinkedIn, YouTube, TikTok e Pinterest
                  </p>
                </div>
              </div>
              <Link href="/admin/social/flow">
                <Button 
                  size="lg"
                  className="bg-white text-purple-900 hover:bg-gray-100 font-semibold"
                >
                  Explorar
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
