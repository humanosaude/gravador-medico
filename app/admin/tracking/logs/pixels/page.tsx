/**
 * Logs de Disparos de Pixel
 * Página para visualizar histórico de eventos enviados ao Facebook Pixel
 * URL: /admin/tracking/logs/pixels
 */

'use client';

import { useState, useEffect } from 'react';
import { getPixelLogs } from '@/actions/tracking';
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

interface PixelLog {
  id: string;
  created_at: string;
  event_type: string;
  status: 'pending' | 'success' | 'failed';
  event_data: any;
  error_message?: string;
  processed_at?: string;
}

const eventIcons: Record<string, any> = {
  Purchase: ShoppingCart,
  InitiateCheckout: TrendingUp,
  Contact: MessageCircle,
  Lead: Zap,
  AddToCart: ShoppingCart,
  ViewContent: TrendingUp,
  Schedule: Calendar,
  PageView: Activity,
};

export default function PixelLogsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [logs, setLogs] = useState<PixelLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      setIsLoading(true);
      // TODO: Pegar userId do contexto de autenticação
      const userId = 'temp-user-id';
      const result = await getPixelLogs(userId, 50);
      
      if (result.success && result.logs) {
        setLogs(result.logs as PixelLog[]);
      }
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => 
    log.event_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (log.event_data?.phone && log.event_data.phone.includes(searchTerm))
  );

  const successCount = logs.filter(l => l.status === 'success').length;
  const failedCount = logs.filter(l => l.status === 'failed').length;
  const pendingCount = logs.filter(l => l.status === 'pending').length;
  
  // Calcula tempo médio de resposta
  const logsWithTime = logs.filter(l => l.processed_at && l.created_at);
  const avgResponseTime = logsWithTime.length > 0
    ? logsWithTime.reduce((acc, l) => {
        const created = new Date(l.created_at).getTime();
        const processed = new Date(l.processed_at!).getTime();
        return acc + (processed - created);
      }, 0) / logsWithTime.length
    : 0;

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getResponseTime = (log: PixelLog) => {
    if (!log.processed_at) return '-';
    const created = new Date(log.created_at).getTime();
    const processed = new Date(log.processed_at).getTime();
    return `${processed - created}ms`;
  };

  // Skeleton loader
  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="animate-pulse">
            <div className="h-10 bg-zinc-800 rounded w-64 mb-2"></div>
            <div className="h-6 bg-zinc-800 rounded w-96"></div>
          </div>
          <div className="h-10 w-32 bg-zinc-800 rounded animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-zinc-800 rounded-lg animate-pulse"></div>
          ))}
        </div>
        <div className="h-96 bg-zinc-800 rounded-lg animate-pulse"></div>
      </div>
    );
  }

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
            onClick={loadLogs}
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
                  const EventIcon = eventIcons[log.event_type] || Activity;
                  const responseTime = getResponseTime(log);
                  const responseMs = responseTime !== '-' ? parseInt(responseTime) : 0;

                  return (
                    <TableRow 
                      key={log.id} 
                      className="border-zinc-800 hover:bg-zinc-800/30 transition-colors"
                    >
                      <TableCell className="text-zinc-400 text-sm font-mono">
                        {formatTimestamp(log.created_at)}
                      </TableCell>
                      <TableCell className="text-zinc-200 font-medium">
                        {log.event_data?.customer_name || '-'}
                      </TableCell>
                      <TableCell className="text-zinc-400 text-sm font-mono">
                        {log.event_data?.phone || log.event_data?.whatsapp || '-'}
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
                          <Facebook className="w-4 h-4 text-blue-500" />
                          <span className="text-zinc-400 text-sm">Meta (Facebook)</span>
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
                        {log.event_data?.value || log.event_data?.amount || '-'}
                      </TableCell>
                      <TableCell>
                        <span className={`text-sm font-mono ${
                          responseMs > 0 && responseMs < 200 
                            ? 'text-green-400' 
                            : responseMs >= 200 && responseMs < 1000 
                            ? 'text-yellow-400' 
                            : responseMs >= 1000
                            ? 'text-red-400'
                            : 'text-zinc-500'
                        }`}>
                          {responseTime}
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
