/**
 * Mensagens Rastreáveis
 * Página para gerenciar mensagens personalizadas com tracking
 * URL: /admin/tracking/messages
 */

'use client';

import { useState } from 'react';
import { 
  MessageSquareDashed, 
  Plus, 
  Search, 
  Filter,
  Edit, 
  Trash2, 
  Copy,
  TrendingUp,
  MousePointerClick,
  CheckCircle2,
  BarChart3,
  Megaphone,
  Target,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Mock data para visualização
const mockMessages = [
  {
    id: '1',
    campaign_icon: Megaphone,
    campaign_name: 'Black Friday 2026',
    title: 'Oferta Exclusiva - 70% OFF',
    message: 'Olá {nome}! 🎉 Nossa Black Friday começou! Garanta o Gravador Médico com 70% de desconto. Clique aqui: {link}',
    highlighted_text: '70% OFF',
    stats: {
      sent: 1247,
      conversions: 89,
      rate: 7.1
    },
    color: 'purple'
  },
  {
    id: '2',
    campaign_icon: Target,
    campaign_name: 'Recuperação de Carrinho',
    title: 'Seu carrinho está te esperando',
    message: 'Oi {nome}, notamos que você deixou o Gravador Médico no carrinho. Finalize agora e ganhe frete grátis! 🚚',
    highlighted_text: 'frete grátis',
    stats: {
      sent: 3421,
      conversions: 412,
      rate: 12.0
    },
    color: 'green'
  },
  {
    id: '3',
    campaign_icon: Zap,
    campaign_name: 'Boas-vindas Novos Leads',
    title: 'Bem-vindo à família!',
    message: 'Olá {nome}! 👋 Que bom ter você aqui. Preparamos um guia especial sobre como o Gravador Médico pode transformar seu dia a dia.',
    highlighted_text: 'guia especial',
    stats: {
      sent: 892,
      conversions: 156,
      rate: 17.5
    },
    color: 'blue'
  },
  {
    id: '4',
    campaign_icon: TrendingUp,
    campaign_name: 'Upgrade Pro',
    title: 'Conheça nossos recursos PRO',
    message: '{nome}, descubra como nossos recursos PRO podem 10x sua produtividade. Teste grátis por 14 dias! ⚡',
    highlighted_text: 'Teste grátis',
    stats: {
      sent: 645,
      conversions: 97,
      rate: 15.0
    },
    color: 'orange'
  },
  {
    id: '5',
    campaign_icon: CheckCircle2,
    campaign_name: 'Pós-compra Satisfação',
    title: 'Como está sendo sua experiência?',
    message: 'Oi {nome}! Esperamos que esteja adorando o Gravador Médico. Que tal compartilhar sua experiência? 🌟',
    highlighted_text: 'compartilhar',
    stats: {
      sent: 2134,
      conversions: 534,
      rate: 25.0
    },
    color: 'pink'
  }
];

const colorClasses = {
  purple: {
    bg: 'bg-purple-600/10',
    border: 'border-purple-600/30',
    text: 'text-purple-400',
    badge: 'bg-purple-600/20 text-purple-300 border-purple-600/40'
  },
  green: {
    bg: 'bg-green-600/10',
    border: 'border-green-600/30',
    text: 'text-green-400',
    badge: 'bg-green-600/20 text-green-300 border-green-600/40'
  },
  blue: {
    bg: 'bg-blue-600/10',
    border: 'border-blue-600/30',
    text: 'text-blue-400',
    badge: 'bg-blue-600/20 text-blue-300 border-blue-600/40'
  },
  orange: {
    bg: 'bg-orange-600/10',
    border: 'border-orange-600/30',
    text: 'text-orange-400',
    badge: 'bg-orange-600/20 text-orange-300 border-orange-600/40'
  },
  pink: {
    bg: 'bg-pink-600/10',
    border: 'border-pink-600/30',
    text: 'text-pink-400',
    badge: 'bg-pink-600/20 text-pink-300 border-pink-600/40'
  }
};

export default function TrackingMessagesPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredMessages = mockMessages.filter(msg => 
    msg.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    msg.campaign_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    msg.message.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-zinc-950 p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-100 flex items-center gap-3">
            <MessageSquareDashed className="w-8 h-8 text-blue-400" />
            Mensagens Rastreáveis
          </h1>
          <p className="text-zinc-400 mt-2">
            Gerencie mensagens personalizadas com tracking automático de conversões
          </p>
        </div>
        
        <div className="flex gap-3">
          <Button variant="outline" className="bg-zinc-900 border-zinc-800 text-zinc-100 hover:bg-zinc-800">
            <BarChart3 className="w-4 h-4 mr-2" />
            Gerenciar Campanhas
          </Button>
          <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
            <Plus className="w-4 h-4 mr-2" />
            Nova Mensagem
          </Button>
        </div>
      </div>

      {/* Barra de Busca */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <Input
                placeholder="Buscar por campanha, título ou conteúdo da mensagem..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
              />
            </div>
            <Button variant="outline" className="bg-zinc-800 border-zinc-700 text-zinc-100 hover:bg-zinc-700">
              <Filter className="w-4 h-4 mr-2" />
              Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Total de Mensagens</p>
                <p className="text-2xl font-bold text-zinc-100 mt-1">{mockMessages.length}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-600/30 flex items-center justify-center">
                <MessageSquareDashed className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Total Enviado</p>
                <p className="text-2xl font-bold text-zinc-100 mt-1">
                  {mockMessages.reduce((acc, msg) => acc + msg.stats.sent, 0).toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-600/10 border border-purple-600/30 flex items-center justify-center">
                <MousePointerClick className="w-6 h-6 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Conversões</p>
                <p className="text-2xl font-bold text-zinc-100 mt-1">
                  {mockMessages.reduce((acc, msg) => acc + msg.stats.conversions, 0).toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-600/10 border border-green-600/30 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Taxa Média</p>
                <p className="text-2xl font-bold text-zinc-100 mt-1">
                  {(mockMessages.reduce((acc, msg) => acc + msg.stats.rate, 0) / mockMessages.length).toFixed(1)}%
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-orange-600/10 border border-orange-600/30 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Mensagens */}
      <div className="grid gap-4">
        {filteredMessages.map((message) => {
          const Icon = message.campaign_icon;
          const colors = colorClasses[message.color as keyof typeof colorClasses];

          return (
            <Card key={message.id} className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-all">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-10 h-10 rounded-lg ${colors.bg} border ${colors.border} flex items-center justify-center`}>
                        <Icon className={`w-5 h-5 ${colors.text}`} />
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">
                          {message.campaign_name}
                        </p>
                        <CardTitle className="text-lg text-zinc-100 mt-0.5">
                          {message.title}
                        </CardTitle>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-zinc-400 hover:text-red-400 hover:bg-zinc-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-4">
                  {/* Mensagem */}
                  <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
                    <p className="text-sm text-zinc-300 leading-relaxed">
                      {message.message.split(message.highlighted_text).map((part, i, arr) => (
                        <span key={i}>
                          {part}
                          {i < arr.length - 1 && (
                            <span className={`font-bold ${colors.text} px-1 py-0.5 rounded`}>
                              {message.highlighted_text}
                            </span>
                          )}
                        </span>
                      ))}
                    </p>
                  </div>

                  {/* Estatísticas */}
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <div className={`px-3 py-1.5 rounded-lg border ${colors.badge}`}>
                        <div className="flex items-center gap-2">
                          <MousePointerClick className="w-3.5 h-3.5" />
                          <span className="text-xs font-semibold">
                            {message.stats.sent.toLocaleString()} envios
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className={`px-3 py-1.5 rounded-lg border ${colors.badge}`}>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-3.5 h-3.5" />
                          <span className="text-xs font-semibold">
                            {message.stats.conversions} conversões
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className={`px-3 py-1.5 rounded-lg border ${colors.badge}`}>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span className="text-xs font-semibold">
                            {message.stats.rate}% taxa
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="ml-auto">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className={`border ${colors.border} ${colors.text} hover:${colors.bg}`}
                      >
                        Ver Detalhes
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Estado Vazio */}
      {filteredMessages.length === 0 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="py-16 text-center">
            <MessageSquareDashed className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-zinc-300 mb-2">
              Nenhuma mensagem encontrada
            </h3>
            <p className="text-zinc-500 mb-6">
              Tente ajustar os filtros ou criar uma nova mensagem
            </p>
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600">
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeira Mensagem
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
