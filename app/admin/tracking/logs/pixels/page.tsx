/**
 * Logs de Disparos de Pixel
 * Página para visualizar histórico de eventos enviados ao Facebook Pixel
 * URL: /admin/tracking/logs/pixels
 */

'use client';

import { useState } from 'react';
import { 
  Activity, 
  Search, 
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Download,
  Calendar,
  Facebook,
  ShoppingCart,
  MessageCircle,
  TrendingUp,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// Mock data - Logs de pixel
const mockPixelLogs = [
  {
    id: '1',
    timestamp: '2026-01-22 14:35:21',
    phone: '+5511987654321',
    customer_name: 'Dr. João Silva',
    event_type: 'Purchase',
    event_icon: ShoppingCart,
    platform: 'Meta (Facebook)',
    platform_icon: Facebook,
    status: 'success',
    value: 'R$ 497,00',
    response_time: '142ms'
  },
  {
    id: '2',
    timestamp: '2026-01-22 14:32:18',
    phone: '+5511976543210',
    customer_name: 'Dra. Maria Santos',
    event_type: 'InitiateCheckout',
    event_icon: TrendingUp,
    platform: 'Meta (Facebook)',
    platform_icon: Facebook,
    status: 'success',
    value: 'R$ 497,00',
    response_time: '98ms'
  },
  {
    id: '3',
    timestamp: '2026-01-22 14:28:45',
    phone: '+5511965432109',
    customer_name: 'Dr. Pedro Costa',
    event_type: 'Contact',
    event_icon: MessageCircle,
    platform: 'Meta (Facebook)',
    platform_icon: Facebook,
    status: 'success',
    value: null,
    response_time: '76ms'
  },
  {
    id: '4',
    timestamp: '2026-01-22 14:25:33',
    phone: '+5511954321098',
    customer_name: 'Dra. Ana Oliveira',
    event_type: 'Lead',
    event_icon: Zap,
    platform: 'Meta (Facebook)',
    platform_icon: Facebook,
    status: 'failed',
    value: null,
    response_time: '2340ms',
    error: 'Timeout na conexão'
  },
  {
    id: '5',
    timestamp: '2026-01-22 14:22:10',
    phone: '+5511943210987',
    customer_name: 'Dr. Carlos Mendes',
    event_type: 'AddToCart',
    event_icon: ShoppingCart,
    platform: 'Meta (Facebook)',
    platform_icon: Facebook,
    status: 'success',
    value: 'R$ 497,00',
    response_time: '134ms'
  },
  {
    id: '6',
    timestamp: '2026-01-22 14:18:55',
    phone: '+5511932109876',
    customer_name: 'Dra. Beatriz Lima',
    event_type: 'ViewContent',
    event_icon: TrendingUp,
    platform: 'Meta (Facebook)',
    platform_icon: Facebook,
    status: 'success',
    value: null,
    response_time: '89ms'
  },
  {
    id: '7',
    timestamp: '2026-01-22 14:15:42',
    phone: '+5511921098765',
    customer_name: 'Dr. Roberto Ferreira',
    event_type: 'Contact',
    event_icon: MessageCircle,
    platform: 'Meta (Facebook)',
    platform_icon: Facebook,
    status: 'success',
    value: null,
    response_time: '112ms'
  },
  {
    id: '8',
    timestamp: '2026-01-22 14:12:28',
    phone: '+5511910987654',
    customer_name: 'Dra. Juliana Rocha',
    event_type: 'Purchase',
    event_icon: ShoppingCart,
    platform: 'Meta (Facebook)',
    platform_icon: Facebook,
    status: 'success',
    value: 'R$ 497,00',
    response_time: '156ms'
  },
  {
    id: '9',
    timestamp: '2026-01-22 14:08:15',
    phone: '+5511909876543',
    customer_name: 'Dr. Fernando Alves',
    event_type: 'Lead',
    event_icon: Zap,
    platform: 'Meta (Facebook)',
    platform_icon: Facebook,
    status: 'pending',
    value: null,
    response_time: '1823ms'
  },
  {
    id: '10',
    timestamp: '2026-01-22 14:05:02',
    phone: '+5511898765432',
    customer_name: 'Dra. Camila Souza',
    event_type: 'InitiateCheckout',
    event_icon: TrendingUp,
    platform: 'Meta (Facebook)',
    platform_icon: Facebook,
    status: 'success',
    value: 'R$ 497,00',
    response_time: '201ms'
  }
];

export default function PixelLogsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [logs, setLogs] = useState(mockPixelLogs);

  const filteredLogs = logs.filter(log => 
    log.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.phone.includes(searchTerm) ||
    log.event_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const successCount = logs.filter(l => l.status === 'success').length;
  const failedCount = logs.filter(l => l.status === 'failed').length;
  const pendingCount = logs.filter(l => l.status === 'pending').length;
  const avgResponseTime = (logs.reduce((acc, l) => acc + parseInt(l.response_time), 0) / logs.length).toFixed(0);

  return (
    <div className="min-h-screen bg-zinc-950 p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-100 flex items-center gap-3">
            <Activity className="w-8 h-8 text-green-400" />
            Disparos de Pixel
          </h1>
          <p className="text-zinc-400 mt-2">
            Histórico completo de eventos enviados ao Facebook Pixel em tempo real
          </p>
        </div>
        
        <div className="flex gap-3">
          <Button variant="outline" className="bg-zinc-900 border-zinc-800 text-zinc-100 hover:bg-zinc-800">
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
          <Button 
            onClick={() => setLogs([...mockPixelLogs])}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Total de Disparos</p>
                <p className="text-2xl font-bold text-zinc-100 mt-1">{logs.length}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-600/30 flex items-center justify-center">
                <Activity className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Bem-sucedidos</p>
                <p className="text-2xl font-bold text-zinc-100 mt-1">{successCount}</p>
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
                <p className="text-sm text-zinc-400">Falharam</p>
                <p className="text-2xl font-bold text-zinc-100 mt-1">{failedCount}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-red-600/10 border border-red-600/30 flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Tempo Médio</p>
                <p className="text-2xl font-bold text-zinc-100 mt-1">{avgResponseTime}ms</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-600/10 border border-purple-600/30 flex items-center justify-center">
                <Clock className="w-6 h-6 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <Input
                placeholder="Buscar por cliente, telefone ou tipo de evento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
              />
            </div>
            <Button variant="outline" className="bg-zinc-800 border-zinc-700 text-zinc-100 hover:bg-zinc-700">
              <Calendar className="w-4 h-4 mr-2" />
              Hoje
            </Button>
            <Button variant="outline" className="bg-zinc-800 border-zinc-700 text-zinc-100 hover:bg-zinc-700">
              <Filter className="w-4 h-4 mr-2" />
              Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Logs */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-zinc-100">Histórico de Eventos</CardTitle>
          <CardDescription className="text-zinc-400">
            Lista completa de todos os eventos disparados para o Facebook Pixel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-zinc-800 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800/50">
                  <TableHead className="text-zinc-300 font-semibold">Horário</TableHead>
                  <TableHead className="text-zinc-300 font-semibold">Cliente</TableHead>
                  <TableHead className="text-zinc-300 font-semibold">Telefone</TableHead>
                  <TableHead className="text-zinc-300 font-semibold">Evento</TableHead>
                  <TableHead className="text-zinc-300 font-semibold">Plataforma</TableHead>
                  <TableHead className="text-zinc-300 font-semibold">Status</TableHead>
                  <TableHead className="text-zinc-300 font-semibold">Valor</TableHead>
                  <TableHead className="text-zinc-300 font-semibold">Resposta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => {
                  const EventIcon = log.event_icon;
                  const PlatformIcon = log.platform_icon;

                  return (
                    <TableRow 
                      key={log.id} 
                      className="border-zinc-800 hover:bg-zinc-800/30 transition-colors"
                    >
                      <TableCell className="text-zinc-400 text-sm font-mono">
                        {log.timestamp}
                      </TableCell>
                      <TableCell className="text-zinc-200 font-medium">
                        {log.customer_name}
                      </TableCell>
                      <TableCell className="text-zinc-400 text-sm font-mono">
                        {log.phone}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-blue-600/10 border border-blue-600/30 flex items-center justify-center">
                            <EventIcon className="w-4 h-4 text-blue-400" />
                          </div>
                          <span className="text-zinc-200 text-sm font-medium">
                            {log.event_type}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <PlatformIcon className="w-4 h-4 text-blue-500" />
                          <span className="text-zinc-400 text-sm">{log.platform}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {log.status === 'success' && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-green-600/20 border border-green-600/40">
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                            <span className="text-xs font-semibold text-green-300">Sucesso</span>
                          </div>
                        )}
                        {log.status === 'failed' && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-600/20 border border-red-600/40">
                            <XCircle className="w-3.5 h-3.5 text-red-400" />
                            <span className="text-xs font-semibold text-red-300">Falhou</span>
                          </div>
                        )}
                        {log.status === 'pending' && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-yellow-600/20 border border-yellow-600/40">
                            <Clock className="w-3.5 h-3.5 text-yellow-400" />
                            <span className="text-xs font-semibold text-yellow-300">Pendente</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-zinc-300 font-semibold">
                        {log.value || '-'}
                      </TableCell>
                      <TableCell>
                        <span className={`text-sm font-mono ${
                          parseInt(log.response_time) < 200 
                            ? 'text-green-400' 
                            : parseInt(log.response_time) < 1000 
                            ? 'text-yellow-400' 
                            : 'text-red-400'
                        }`}>
                          {log.response_time}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Paginação */}
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-zinc-500">
              Mostrando <span className="font-semibold text-zinc-300">{filteredLogs.length}</span> de <span className="font-semibold text-zinc-300">{logs.length}</span> eventos
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="bg-zinc-800 border-zinc-700 text-zinc-100 hover:bg-zinc-700">
                Anterior
              </Button>
              <Button variant="outline" size="sm" className="bg-zinc-800 border-zinc-700 text-zinc-100 hover:bg-zinc-700">
                Próximo
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estado Vazio */}
      {filteredLogs.length === 0 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="py-16 text-center">
            <Activity className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-zinc-300 mb-2">
              Nenhum evento encontrado
            </h3>
            <p className="text-zinc-500">
              Tente ajustar os filtros de busca
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
