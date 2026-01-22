/**
 * Jornada de Compra (Funil de Conversão)
 * Página para configurar etapas do funil e eventos do Facebook
 * URL: /admin/tracking/journey
 */

'use client';

import { useState } from 'react';
import { 
  Footprints, 
  Plus, 
  GripVertical,
  Edit,
  Trash2,
  CheckCircle2,
  Circle,
  ArrowDown,
  Save,
  Zap,
  ShoppingCart,
  MessageCircle,
  Calendar,
  CreditCard,
  TrendingUp
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Mock data - Etapas do funil
const mockJourneySteps = [
  {
    id: '1',
    order: 1,
    name: 'Visitou o Site',
    description: 'Usuário acessou a página de vendas',
    fb_event: 'PageView',
    fb_event_color: 'blue',
    icon: TrendingUp,
    icon_color: 'blue',
    is_active: true,
    conversions: 4521
  },
  {
    id: '2',
    order: 2,
    name: 'Fez Contato',
    description: 'Clicou no WhatsApp e iniciou conversa',
    fb_event: 'Contact',
    fb_event_color: 'green',
    icon: MessageCircle,
    icon_color: 'green',
    is_active: true,
    conversions: 1834
  },
  {
    id: '3',
    order: 3,
    name: 'Demonstrou Interesse',
    description: 'Interagiu com o vendedor, fez perguntas',
    fb_event: 'Lead',
    fb_event_color: 'purple',
    icon: Footprints,
    icon_color: 'purple',
    is_active: true,
    conversions: 892
  },
  {
    id: '4',
    order: 4,
    name: 'Adicionou ao Carrinho',
    description: 'Produto adicionado ao carrinho de compras',
    fb_event: 'AddToCart',
    fb_event_color: 'orange',
    icon: ShoppingCart,
    icon_color: 'orange',
    is_active: true,
    conversions: 645
  },
  {
    id: '5',
    order: 5,
    name: 'Iniciou Checkout',
    description: 'Começou o processo de pagamento',
    fb_event: 'InitiateCheckout',
    fb_event_color: 'yellow',
    icon: CreditCard,
    icon_color: 'yellow',
    is_active: true,
    conversions: 512
  },
  {
    id: '6',
    order: 6,
    name: 'Agendou Demonstração',
    description: 'Marcou uma call ou reunião',
    fb_event: 'Schedule',
    fb_event_color: 'pink',
    icon: Calendar,
    icon_color: 'pink',
    is_active: false,
    conversions: 289
  },
  {
    id: '7',
    order: 7,
    name: 'Comprou',
    description: 'Pagamento aprovado e venda concluída',
    fb_event: 'Purchase',
    fb_event_color: 'emerald',
    icon: CheckCircle2,
    icon_color: 'emerald',
    is_active: true,
    conversions: 387
  }
];

const eventColorClasses = {
  blue: 'bg-blue-600/20 text-blue-300 border-blue-600/40',
  green: 'bg-green-600/20 text-green-300 border-green-600/40',
  purple: 'bg-purple-600/20 text-purple-300 border-purple-600/40',
  orange: 'bg-orange-600/20 text-orange-300 border-orange-600/40',
  yellow: 'bg-yellow-600/20 text-yellow-300 border-yellow-600/40',
  pink: 'bg-pink-600/20 text-pink-300 border-pink-600/40',
  emerald: 'bg-emerald-600/20 text-emerald-300 border-emerald-600/40'
};

const iconColorClasses = {
  blue: 'text-blue-400',
  green: 'text-green-400',
  purple: 'text-purple-400',
  orange: 'text-orange-400',
  yellow: 'text-yellow-400',
  pink: 'text-pink-400',
  emerald: 'text-emerald-400'
};

const iconBgClasses = {
  blue: 'bg-blue-600/10 border-blue-600/30',
  green: 'bg-green-600/10 border-green-600/30',
  purple: 'bg-purple-600/10 border-purple-600/30',
  orange: 'bg-orange-600/10 border-orange-600/30',
  yellow: 'bg-yellow-600/10 border-yellow-600/30',
  pink: 'bg-pink-600/10 border-pink-600/30',
  emerald: 'bg-emerald-600/10 border-emerald-600/30'
};

export default function TrackingJourneyPage() {
  const [steps, setSteps] = useState(mockJourneySteps);

  // Calcula taxa de conversão entre etapas
  const getConversionRate = (currentIndex: number) => {
    if (currentIndex === 0) return 100;
    const current = steps[currentIndex].conversions;
    const previous = steps[currentIndex - 1].conversions;
    return ((current / previous) * 100).toFixed(1);
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-100 flex items-center gap-3">
            <Footprints className="w-8 h-8 text-purple-400" />
            Jornada de Compra
          </h1>
          <p className="text-zinc-400 mt-2">
            Configure as etapas do funil e eventos disparados para o Facebook Pixel
          </p>
        </div>
        
        <div className="flex gap-3">
          <Button variant="outline" className="bg-zinc-900 border-zinc-800 text-zinc-100 hover:bg-zinc-800">
            <GripVertical className="w-4 h-4 mr-2" />
            Reordenar
          </Button>
          <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Etapa
          </Button>
        </div>
      </div>

      {/* Estatísticas do Funil */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Total de Etapas</p>
                <p className="text-2xl font-bold text-zinc-100 mt-1">{steps.length}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-600/10 border border-purple-600/30 flex items-center justify-center">
                <Footprints className="w-6 h-6 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Etapas Ativas</p>
                <p className="text-2xl font-bold text-zinc-100 mt-1">
                  {steps.filter(s => s.is_active).length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-600/10 border border-green-600/30 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Taxa de Conversão Final</p>
                <p className="text-2xl font-bold text-zinc-100 mt-1">
                  {((steps[steps.length - 1].conversions / steps[0].conversions) * 100).toFixed(1)}%
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-600/10 border border-emerald-600/30 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Funil Visual */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-zinc-100">Configuração do Funil de Vendas</CardTitle>
          <CardDescription className="text-zinc-400">
            Cada etapa dispara um evento específico no Facebook Pixel para otimização de campanhas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const iconColor = iconColorClasses[step.icon_color as keyof typeof iconColorClasses];
              const iconBg = iconBgClasses[step.icon_color as keyof typeof iconBgClasses];
              const eventColor = eventColorClasses[step.fb_event_color as keyof typeof eventColorClasses];
              const conversionRate = getConversionRate(index);

              return (
                <div key={step.id}>
                  {/* Etapa */}
                  <Card className={`bg-zinc-800/50 border-zinc-700 hover:border-zinc-600 transition-all ${
                    !step.is_active ? 'opacity-60' : ''
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        {/* Drag Handle */}
                        <div className="cursor-move text-zinc-600 hover:text-zinc-400">
                          <GripVertical className="w-5 h-5" />
                        </div>

                        {/* Número da Etapa */}
                        <div className="w-8 h-8 rounded-lg bg-zinc-700 border border-zinc-600 flex items-center justify-center">
                          <span className="text-sm font-bold text-zinc-300">{step.order}</span>
                        </div>

                        {/* Ícone */}
                        <div className={`w-12 h-12 rounded-xl ${iconBg} border flex items-center justify-center`}>
                          <Icon className={`w-6 h-6 ${iconColor}`} />
                        </div>

                        {/* Informações */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-zinc-100">{step.name}</h4>
                            {step.is_active ? (
                              <CheckCircle2 className="w-4 h-4 text-green-400" />
                            ) : (
                              <Circle className="w-4 h-4 text-zinc-600" />
                            )}
                          </div>
                          <p className="text-sm text-zinc-400">{step.description}</p>
                        </div>

                        {/* Evento Facebook */}
                        <div className="flex items-center gap-3">
                          <div className={`px-3 py-1.5 rounded-lg border ${eventColor}`}>
                            <div className="flex items-center gap-2">
                              <Zap className="w-3.5 h-3.5" />
                              <span className="text-xs font-semibold">{step.fb_event}</span>
                            </div>
                          </div>
                        </div>

                        {/* Estatísticas */}
                        <div className="text-right min-w-[140px]">
                          <p className="text-lg font-bold text-zinc-100">
                            {step.conversions.toLocaleString()}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {index > 0 && `${conversionRate}% da etapa anterior`}
                          </p>
                        </div>

                        {/* Ações */}
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-zinc-400 hover:text-red-400 hover:bg-zinc-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Seta de Conexão */}
                  {index < steps.length - 1 && (
                    <div className="flex justify-center py-2">
                      <ArrowDown className="w-5 h-5 text-zinc-600" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Eventos Disponíveis */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-zinc-100">Eventos do Facebook Pixel Disponíveis</CardTitle>
          <CardDescription className="text-zinc-400">
            Eventos padrão que podem ser configurados nas etapas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { name: 'PageView', color: 'blue' },
              { name: 'ViewContent', color: 'purple' },
              { name: 'Contact', color: 'green' },
              { name: 'Lead', color: 'purple' },
              { name: 'AddToCart', color: 'orange' },
              { name: 'InitiateCheckout', color: 'yellow' },
              { name: 'Schedule', color: 'pink' },
              { name: 'Purchase', color: 'emerald' },
            ].map((event) => {
              const eventColor = eventColorClasses[event.color as keyof typeof eventColorClasses];
              return (
                <div
                  key={event.name}
                  className={`px-4 py-3 rounded-lg border ${eventColor} flex items-center gap-2`}
                >
                  <Zap className="w-4 h-4" />
                  <span className="text-sm font-semibold">{event.name}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Ações */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" className="bg-zinc-900 border-zinc-800 text-zinc-100 hover:bg-zinc-800">
          Cancelar
        </Button>
        <Button className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
          <Save className="w-4 h-4 mr-2" />
          Salvar Configuração
        </Button>
      </div>
    </div>
  );
}
