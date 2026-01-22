/**
 * Dashboard de Tracking
 * Página principal do módulo de rastreamento
 * URL: /admin/tracking
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getTrackingStats } from '@/actions/tracking';
import { 
  MousePointerClick, 
  Zap, 
  Clock, 
  AlertCircle, 
  Link2, 
  TrendingUp,
  ArrowRight 
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrackingDashboardStats } from '@/lib/types/tracking';

export default function TrackingDashboard() {
  const [stats, setStats] = useState<TrackingDashboardStats>({
    totalClicks: 0,
    totalEvents: 0,
    pendingEvents: 0,
    failedEvents: 0,
    activeLinks: 0,
    conversions: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // TODO: Pegar userId do contexto de autenticação
      const userId = 'temp-user-id'; // Placeholder
      const result = await getTrackingStats(userId);
      if (result.success && result.stats) {
        setStats(result.stats);
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Skeleton loader
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-10 bg-zinc-800 rounded w-1/3 mb-2"></div>
          <div className="h-6 bg-zinc-800 rounded w-1/2"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 bg-zinc-800 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Rastreamento & Atribuição
          </h1>
          <p className="text-gray-400 mt-2">
            Módulo Tintim Killer - Rastreie cliques e atribua vendas
          </p>
        </div>
        
        <div className="flex gap-3">
          <Link href="/admin/tracking/pixels">
            <Button variant="outline" className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700">
              <Zap className="w-4 h-4 mr-2" />
              Configurar Pixel
            </Button>
          </Link>
          <Link href="/admin/tracking/links">
            <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white">
              <Link2 className="w-4 h-4 mr-2" />
              Gerenciar Links
            </Button>
          </Link>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Total de Cliques */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Total de Cliques
            </CardTitle>
            <MousePointerClick className="w-4 h-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">
              {stats.totalClicks.toLocaleString('pt-BR')}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Cliques rastreados em todos os links
            </p>
          </CardContent>
        </Card>

        {/* Eventos Disparados */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Eventos Disparados
            </CardTitle>
            <Zap className="w-4 h-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">
              {stats.totalEvents.toLocaleString('pt-BR')}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Total de eventos enviados ao Meta
            </p>
          </CardContent>
        </Card>

        {/* Conversões */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Conversões
            </CardTitle>
            <TrendingUp className="w-4 h-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">
              {stats.conversions.toLocaleString('pt-BR')}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Vendas atribuídas a campanhas
            </p>
          </CardContent>
        </Card>

        {/* Links Ativos */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Links Ativos
            </CardTitle>
            <Link2 className="w-4 h-4 text-indigo-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">
              {stats.activeLinks.toLocaleString('pt-BR')}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Links de rastreamento ativos
            </p>
          </CardContent>
        </Card>

        {/* Eventos Pendentes */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Eventos Pendentes
            </CardTitle>
            <Clock className="w-4 h-4 text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">
              {stats.pendingEvents.toLocaleString('pt-BR')}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Na fila para processamento
            </p>
          </CardContent>
        </Card>

        {/* Eventos com Falha */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Eventos com Falha
            </CardTitle>
            <AlertCircle className="w-4 h-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">
              {stats.failedEvents.toLocaleString('pt-BR')}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Requerem atenção
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card: Como Funciona */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Como Funciona</CardTitle>
            <CardDescription className="text-gray-400">
              Entenda o fluxo de rastreamento
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center flex-shrink-0">
                <span className="text-blue-400 font-bold text-sm">1</span>
              </div>
              <div>
                <h4 className="font-medium text-white">Crie um Link Rastreável</h4>
                <p className="text-sm text-gray-400">
                  Configure a mensagem do WhatsApp e parâmetros UTM
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-green-600/20 flex items-center justify-center flex-shrink-0">
                <span className="text-green-400 font-bold text-sm">2</span>
              </div>
              <div>
                <h4 className="font-medium text-white">Compartilhe o Link</h4>
                <p className="text-sm text-gray-400">
                  Use em anúncios, redes sociais ou e-mail marketing
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-600/20 flex items-center justify-center flex-shrink-0">
                <span className="text-purple-400 font-bold text-sm">3</span>
              </div>
              <div>
                <h4 className="font-medium text-white">Rastreie Conversões</h4>
                <p className="text-sm text-gray-400">
                  Cada clique gera um código único que atribui vendas
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card: Ações Rápidas */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Ações Rápidas</CardTitle>
            <CardDescription className="text-gray-400">
              Acesso direto às principais funcionalidades
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/admin/tracking/links">
              <Button variant="outline" className="w-full justify-between bg-gray-700/50 border-gray-600 text-white hover:bg-gray-700">
                <span className="flex items-center">
                  <Link2 className="w-4 h-4 mr-2" />
                  Gerenciar Links Rastreáveis
                </span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>

            <Link href="/admin/tracking/pixels">
              <Button variant="outline" className="w-full justify-between bg-gray-700/50 border-gray-600 text-white hover:bg-gray-700">
                <span className="flex items-center">
                  <Zap className="w-4 h-4 mr-2" />
                  Configurar Meta Pixel
                </span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>

            <div className="pt-3 border-t border-gray-700">
              <p className="text-sm text-gray-400 mb-2">
                Precisa de ajuda?
              </p>
              <Button variant="ghost" className="p-0 h-auto text-purple-400 hover:text-purple-300">
                Ver Documentação
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
