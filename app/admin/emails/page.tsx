'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Mail, Search, Eye, RefreshCw, CheckCircle2, XCircle, Clock, Send, TrendingUp, BarChart3 } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface EmailLog {
  id: string
  email_id: string | null
  recipient_email: string
  recipient_name: string | null
  subject: string
  html_content: string | null
  email_type: string
  status: string
  opened: boolean
  open_count: number
  first_opened_at: string | null
  order_id: string | null
  created_at: string
  sent_at: string | null
  error_message: string | null
  user_agent: string | null
  device_type: string | null
  browser: string | null
  os: string | null
}

interface EmailStats {
  total: number
  sent: number
  opened: number
  failed: number
  open_rate: number
}

export default function EmailManagementPage() {
  const [emails, setEmails] = useState<EmailLog[]>([])
  const [stats, setStats] = useState<EmailStats>({
    total: 0,
    sent: 0,
    opened: 0,
    failed: 0,
    open_rate: 0,
  })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [selectedEmail, setSelectedEmail] = useState<EmailLog | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    loadEmails()
  }, [statusFilter, typeFilter])

  async function loadEmails() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (typeFilter !== 'all') params.append('type', typeFilter)
      if (search) params.append('search', search)

      const response = await fetch(`/api/admin/emails?${params}`)
      const data = await response.json()

      if (data.success) {
        setEmails(data.emails || [])
        setStats(data.stats || stats)
      }
    } catch (error) {
      console.error('Erro ao carregar e-mails:', error)
    } finally {
      setLoading(false)
    }
  }

  function getStatusBadge(status: string) {
    const variants: Record<string, { label: string; variant: any; icon: any }> = {
      sent: { label: 'Enviado', variant: 'default', icon: Send },
      delivered: { label: 'Entregue', variant: 'success', icon: CheckCircle2 },
      opened: { label: 'Aberto', variant: 'success', icon: Eye },
      failed: { label: 'Falhou', variant: 'destructive', icon: XCircle },
      pending: { label: 'Pendente', variant: 'secondary', icon: Clock },
    }

    const config = variants[status] || variants.pending
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    )
  }

  function getTypeBadge(type: string) {
    const types: Record<string, { label: string; color: string }> = {
      welcome: { label: '🎉 Boas-vindas', color: 'bg-blue-100 text-blue-700' },
      pix_pending: { label: '⏳ PIX Pendente', color: 'bg-yellow-100 text-yellow-700' },
      password_reset: { label: '🔑 Reset Senha', color: 'bg-purple-100 text-purple-700' },
      abandoned_cart: { label: '🛒 Carrinho', color: 'bg-orange-100 text-orange-700' },
    }

    const config = types[type] || { label: type, color: 'bg-gray-100 text-gray-700' }

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <div className="p-8 space-y-8">
        {/* Header com gradiente */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 via-pink-500 to-orange-500 p-8 text-white shadow-2xl">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <Mail className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-4xl font-black tracking-tight">
                  Gerenciamento de E-mails
                </h1>
                <p className="text-white/90 text-lg mt-1">
                  Visualize, monitore e analise todos os e-mails enviados pelo sistema
                </p>
              </div>
            </div>
          </div>
          {/* Decoração */}
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        </div>

        {/* Stats Cards com gradiente */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {/* Total Enviados */}
          <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gray-800/50 backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-gray-500 to-gray-700 opacity-10"></div>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="p-3 bg-gradient-to-br from-gray-500 to-gray-700 rounded-xl">
                  <Mail className="w-6 h-6 text-white" />
                </div>
              </div>
              <CardDescription className="text-sm font-medium text-gray-400 mt-4">
                Total Enviados
              </CardDescription>
              <CardTitle className="text-4xl font-black text-white">
                {stats.total}
              </CardTitle>
            </CardHeader>
          </Card>

          {/* Entregues */}
          <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gray-800/50 backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-emerald-700 opacity-10"></div>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-700 rounded-xl">
                  <CheckCircle2 className="w-6 h-6 text-white" />
                </div>
              </div>
              <CardDescription className="text-sm font-medium text-gray-400 mt-4">
                Entregues
              </CardDescription>
              <CardTitle className="text-4xl font-black bg-gradient-to-br from-green-400 to-emerald-500 bg-clip-text text-transparent">
                {stats.sent}
              </CardTitle>
            </CardHeader>
          </Card>

          {/* Abertos */}
          <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gray-800/50 backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-700 opacity-10"></div>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-700 rounded-xl">
                  <Eye className="w-6 h-6 text-white" />
                </div>
              </div>
              <CardDescription className="text-sm font-medium text-gray-400 mt-4">
                Abertos
              </CardDescription>
              <CardTitle className="text-4xl font-black bg-gradient-to-br from-blue-400 to-indigo-500 bg-clip-text text-transparent">
                {stats.opened}
              </CardTitle>
            </CardHeader>
          </Card>

          {/* Taxa de Abertura */}
          <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gray-800/50 backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-700 opacity-10"></div>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-700 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
              </div>
              <CardDescription className="text-sm font-medium text-gray-400 mt-4">
                Taxa de Abertura
              </CardDescription>
              <CardTitle className="text-4xl font-black bg-gradient-to-br from-purple-400 to-pink-500 bg-clip-text text-transparent">
                {stats.open_rate.toFixed(1)}%
              </CardTitle>
            </CardHeader>
          </Card>

          {/* Falhas */}
          <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gray-800/50 backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500 to-rose-700 opacity-10"></div>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="p-3 bg-gradient-to-br from-red-500 to-rose-700 rounded-xl">
                  <XCircle className="w-6 h-6 text-white" />
                </div>
              </div>
              <CardDescription className="text-sm font-medium text-gray-400 mt-4">
                Falhas
              </CardDescription>
              <CardTitle className="text-4xl font-black bg-gradient-to-br from-red-400 to-rose-500 bg-clip-text text-transparent">
                {stats.failed}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Filters com estilo moderno */}
        <Card className="border-0 shadow-lg bg-gray-800/50 backdrop-blur-sm border-gray-700">
          <CardHeader className="border-b bg-gray-800/70 border-gray-700">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <CardTitle className="text-xl text-white">Filtros de Busca</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Buscar por e-mail ou pedido..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 h-11 bg-gray-900 border-gray-700 text-white placeholder-gray-500 focus:border-blue-500"
                />
              </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-11 bg-gray-900 border-gray-700 text-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="sent">Enviados</SelectItem>
                <SelectItem value="opened">Abertos</SelectItem>
                <SelectItem value="failed">Falhas</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-11 bg-gray-900 border-gray-700 text-white">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Tipos</SelectItem>
                <SelectItem value="welcome">Boas-vindas</SelectItem>
                <SelectItem value="pix_pending">PIX Pendente</SelectItem>
                <SelectItem value="password_reset">Reset Senha</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              onClick={loadEmails} 
              variant="outline" 
              className="h-11 bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-0 hover:from-blue-600 hover:to-indigo-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Email List com visual moderno */}
      <Card className="border-0 shadow-lg bg-gray-800/50 backdrop-blur-sm border-gray-700">
        <CardHeader className="border-b bg-gray-800/70 border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl text-white">Histórico de E-mails</CardTitle>
              <CardDescription className="mt-1 text-gray-400">
                {emails.length} e-mail(s) encontrado(s)
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="px-4 py-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                <span className="text-white font-bold">{emails.length}</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-500" />
              <p className="text-gray-400 mt-4 font-medium">Carregando e-mails...</p>
            </div>
          ) : emails.length === 0 ? (
            <div className="text-center py-12">
              <div className="p-4 bg-gray-700 rounded-full w-fit mx-auto">
                <Mail className="w-12 h-12 text-gray-500" />
              </div>
              <p className="text-gray-400 mt-4 font-medium">Nenhum e-mail encontrado</p>
              <p className="text-gray-500 text-sm mt-2">Tente ajustar os filtros de busca</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-900/50 hover:bg-gray-900/50 border-gray-700">
                    <TableHead className="font-bold text-gray-300">Destinatário</TableHead>
                    <TableHead className="font-bold text-gray-300">Assunto</TableHead>
                    <TableHead className="font-bold text-gray-300">Tipo</TableHead>
                    <TableHead className="font-bold text-gray-300">Status</TableHead>
                    <TableHead className="font-bold text-gray-300">Abertura</TableHead>
                    <TableHead className="font-bold text-gray-300">Data</TableHead>
                    <TableHead className="font-bold text-gray-300">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {emails.map((email) => (
                    <TableRow key={email.id} className="hover:bg-gray-800/50 transition-colors border-gray-700">
                      <TableCell>
                        <div>
                          <p className="font-semibold text-white">{email.recipient_name || 'N/A'}</p>
                          <p className="text-sm text-gray-400">{email.recipient_email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate font-medium text-gray-300">{email.subject}</TableCell>
                      <TableCell>{getTypeBadge(email.email_type)}</TableCell>
                      <TableCell>{getStatusBadge(email.status)}</TableCell>
                      <TableCell>
                        {email.opened ? (
                          <div className="text-sm">
                            <Badge variant="success" className="mb-1">
                              ✓ {email.open_count}x
                            </Badge>
                            {email.first_opened_at && (
                              <p className="text-xs text-gray-400">
                                {format(new Date(email.first_opened_at), "dd/MM 'às' HH:mm", {
                                  locale: ptBR,
                                })}
                              </p>
                            )}
                            {email.device_type && (
                              <p className="text-xs text-gray-500">
                                {email.device_type} · {email.browser}
                              </p>
                            )}
                          </div>
                        ) : (
                          <Badge variant="default" className="bg-gray-700 text-gray-300">Não aberto</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm font-medium text-gray-300">
                        {format(new Date(email.created_at), 'dd/MM/yy HH:mm', { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedEmail(email)
                            setShowPreview(true)
                          }}
                          className="hover:bg-blue-900/30 hover:text-blue-400 text-white"
                        >
                          <Eye className="w-4 h-4 text-white" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white">📧 Visualização do E-mail</DialogTitle>
          </DialogHeader>
          {selectedEmail && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6 text-sm">
                <div className="space-y-1">
                  <p className="font-semibold text-gray-400">Destinatário</p>
                  <p className="font-medium text-white">{selectedEmail.recipient_email}</p>
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-gray-400">Status</p>
                  {getStatusBadge(selectedEmail.status)}
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-gray-400">Assunto</p>
                  <p className="font-medium text-white">{selectedEmail.subject}</p>
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-gray-400">Tipo</p>
                  {getTypeBadge(selectedEmail.email_type)}
                </div>
                {selectedEmail.order_id && (
                  <div className="space-y-1">
                    <p className="font-semibold text-gray-400">Pedido</p>
                    <p className="font-mono text-xs bg-gray-800 px-2 py-1 rounded inline-block text-gray-300">{selectedEmail.order_id}</p>
                  </div>
                )}
                {selectedEmail.opened && (
                  <div className="space-y-1">
                    <p className="font-semibold text-gray-400">Tracking</p>
                    <p className="font-medium text-white">
                      Aberto {selectedEmail.open_count}x · {selectedEmail.device_type} ·{' '}
                      {selectedEmail.browser}
                    </p>
                  </div>
                )}
              </div>

              {selectedEmail.error_message && (
                <div className="bg-red-900/20 border-2 border-red-800 rounded-xl p-4">
                  <p className="font-bold text-red-400 mb-2 flex items-center gap-2">
                    <XCircle className="w-5 h-5" />
                    Erro no envio:
                  </p>
                  <p className="text-sm text-red-300 font-medium">{selectedEmail.error_message}</p>
                </div>
              )}

              {selectedEmail.html_content && (
                <div className="border-2 border-gray-700 rounded-xl overflow-hidden shadow-lg">
                  <div className="bg-gray-800/70 px-6 py-3 border-b-2 border-gray-700">
                    <p className="text-sm font-bold text-gray-300">📩 Conteúdo do E-mail</p>
                  </div>
                  <div className="p-4 bg-gray-900">
                    <iframe
                      srcDoc={selectedEmail.html_content}
                      className="w-full h-96 border-0 rounded bg-white"
                      title="Email Preview"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </div>
  )
}
