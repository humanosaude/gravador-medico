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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Mail, Search, Eye, RefreshCw, CheckCircle2, XCircle, Clock, Send, TrendingUp, BarChart3, MousePointerClick, Copy, Check } from 'lucide-react'
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
  delivered_at: string | null
  error_message: string | null
  user_agent: string | null
  device_type: string | null
  browser: string | null
  os: string | null
  from_email: string | null
  from_name: string | null
  metadata: any
}

interface TimelineEvent {
  id: string
  event_type: string
  created_at: string
  icon?: string
  label?: string
  color?: string
  details?: any
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
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])
  const [loadingTimeline, setLoadingTimeline] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    loadEmails()
  }, [statusFilter, typeFilter])

  // Carregar timeline quando selecionar um email
  useEffect(() => {
    if (selectedEmail && showPreview) {
      loadTimeline(selectedEmail.id)
    }
  }, [selectedEmail, showPreview])

  async function loadTimeline(emailId: string) {
    setLoadingTimeline(true)
    try {
      const response = await fetch(`/api/admin/emails/${emailId}/events`)
      const data = await response.json()
      if (data.success) {
        setTimeline(data.timeline || [])
      }
    } catch (error) {
      console.error('Erro ao carregar timeline:', error)
    } finally {
      setLoadingTimeline(false)
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

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

      {/* Email Preview Dialog - Estilo Resend */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-5xl h-[90vh] bg-gray-900 border-gray-700 p-0 flex flex-col overflow-hidden">
          {selectedEmail && (
            <div className="flex flex-col h-full overflow-hidden">
              {/* Header do Email */}
              <div className="border-b border-gray-700 p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl">
                    <Mail className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-400">Email</p>
                    <h2 className="text-2xl font-bold text-white">{selectedEmail.recipient_email}</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(selectedEmail.email_id || selectedEmail.id)}
                      className="border-gray-600 text-gray-300 hover:bg-gray-800"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      <span className="ml-2 text-xs font-mono">{selectedEmail.email_id?.slice(0, 8) || selectedEmail.id.slice(0, 8)}...</span>
                    </Button>
                  </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-4 gap-6 mt-6 text-sm">
                  <div>
                    <p className="text-gray-500 mb-1">FROM</p>
                    <p className="text-gray-300">{selectedEmail.from_name || 'Gravador Médico'} &lt;{selectedEmail.from_email || 'suporte@gravadormedico.com.br'}&gt;</p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">SUBJECT</p>
                    <p className="text-gray-300 truncate">{selectedEmail.subject}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">TO</p>
                    <p className="text-gray-300">{selectedEmail.recipient_email}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">ID</p>
                    <p className="text-gray-300 font-mono text-xs truncate">{selectedEmail.email_id || selectedEmail.id}</p>
                  </div>
                </div>
              </div>

              {/* Timeline de Eventos */}
              <div className="border-b border-gray-700 p-6">
                <p className="text-gray-400 text-sm font-medium mb-4">EMAIL EVENTS</p>
                <div className="flex items-center gap-4">
                  {loadingTimeline ? (
                    <RefreshCw className="w-5 h-5 animate-spin text-gray-500" />
                  ) : timeline.length > 0 ? (
                    timeline.map((event, index) => (
                      <div key={event.id} className="flex items-center">
                        {index > 0 && <div className="w-12 h-0.5 bg-gray-700 mx-2" />}
                        <div className="flex flex-col items-center">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            event.color === 'green' ? 'bg-emerald-500/20 text-emerald-400' :
                            event.color === 'blue' ? 'bg-blue-500/20 text-blue-400' :
                            event.color === 'purple' ? 'bg-purple-500/20 text-purple-400' :
                            event.color === 'red' ? 'bg-red-500/20 text-red-400' :
                            'bg-gray-700 text-gray-400'
                          }`}>
                            {event.event_type === 'sent' && <Send className="w-4 h-4" />}
                            {event.event_type === 'delivered' && <CheckCircle2 className="w-4 h-4" />}
                            {event.event_type === 'opened' && <Eye className="w-4 h-4" />}
                            {event.event_type === 'clicked' && <MousePointerClick className="w-4 h-4" />}
                            {event.event_type === 'bounced' && <XCircle className="w-4 h-4" />}
                            {event.event_type === 'spam' && <XCircle className="w-4 h-4" />}
                          </div>
                          <p className={`text-xs mt-2 font-medium ${
                            event.color === 'green' ? 'text-emerald-400' :
                            event.color === 'blue' ? 'text-blue-400' :
                            event.color === 'purple' ? 'text-purple-400' :
                            event.color === 'red' ? 'text-red-400' :
                            'text-gray-400'
                          }`}>
                            {event.label || event.event_type}
                          </p>
                          <p className="text-xs text-gray-500">
                            {format(new Date(event.created_at), "dd/MM, HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <>
                      {/* Timeline padrão baseada no status */}
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full bg-gray-700 text-gray-400 flex items-center justify-center">
                          <Send className="w-4 h-4" />
                        </div>
                        <p className="text-xs mt-2 font-medium text-gray-400">Sent</p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(selectedEmail.sent_at || selectedEmail.created_at), "dd/MM, HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                      {(selectedEmail.status === 'delivered' || selectedEmail.status === 'sent' || selectedEmail.opened) && (
                        <>
                          <div className="w-12 h-0.5 bg-gray-700 mx-2" />
                          <div className="flex flex-col items-center">
                            <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                              <CheckCircle2 className="w-4 h-4" />
                            </div>
                            <p className="text-xs mt-2 font-medium text-emerald-400">Delivered</p>
                            <p className="text-xs text-gray-500">
                              {format(new Date(selectedEmail.delivered_at || selectedEmail.sent_at || selectedEmail.created_at), "dd/MM, HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                        </>
                      )}
                      {selectedEmail.opened && (
                        <>
                          <div className="w-12 h-0.5 bg-gray-700 mx-2" />
                          <div className="flex flex-col items-center">
                            <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
                              <Eye className="w-4 h-4" />
                            </div>
                            <p className="text-xs mt-2 font-medium text-blue-400">Opened</p>
                            <p className="text-xs text-gray-500">
                              {selectedEmail.first_opened_at ? format(new Date(selectedEmail.first_opened_at), "dd/MM, HH:mm", { locale: ptBR }) : '-'}
                            </p>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Tabs de Conteúdo */}
              <div className="flex-1 min-h-0 overflow-hidden">
                <Tabs defaultValue="preview" className="h-full flex flex-col">
                  <TabsList className="bg-gray-800 border-b border-gray-700 rounded-none px-6 py-0 h-auto flex-shrink-0">
                    <TabsTrigger value="preview" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 rounded-none py-3 px-4">
                      Preview
                    </TabsTrigger>
                    <TabsTrigger value="details" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 rounded-none py-3 px-4">
                      Detalhes
                    </TabsTrigger>
                    <TabsTrigger value="html" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 rounded-none py-3 px-4">
                      HTML
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="preview" className="flex-1 min-h-0 overflow-auto p-0 m-0">
                    {selectedEmail.html_content ? (
                      <div className="bg-gray-100 p-4 min-h-full">
                        <div className="max-w-[600px] mx-auto shadow-lg">
                          <iframe
                            srcDoc={selectedEmail.html_content}
                            className="w-full min-h-[600px] h-auto border-0 bg-white rounded-lg"
                            title="Email Preview"
                            style={{ height: '100%', minHeight: '600px' }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-100 p-4 min-h-full overflow-auto">
                        <div className="max-w-[600px] mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
                          {/* Header simulado do email */}
                          <div className="bg-gradient-to-r from-teal-500 to-teal-600 p-8 text-center">
                            <span className="text-4xl">🎙️</span>
                            <h2 className="text-2xl font-bold text-white mt-4">Bem-vindo ao Gravador Médico!</h2>
                            <p className="text-teal-100 mt-2">Seu acesso está pronto para uso</p>
                          </div>
                          
                          {/* Corpo do email simulado */}
                          <div className="p-8">
                            <p className="text-gray-700 mb-4">
                              Olá, <strong>{selectedEmail.recipient_name || 'Cliente'}</strong>! 👋
                            </p>
                            <p className="text-gray-600 mb-6">
                              Sua compra foi confirmada com sucesso! Abaixo estão suas credenciais de acesso.
                            </p>
                            
                            {/* Box de credenciais */}
                            <div className="bg-teal-50 border border-teal-200 rounded-lg p-6 mb-6">
                              <h3 className="text-teal-700 font-semibold mb-4">🔐 Suas Credenciais</h3>
                              <div className="space-y-3">
                                <div>
                                  <p className="text-sm text-gray-500">E-mail</p>
                                  <p className="font-mono bg-white px-3 py-2 rounded border text-gray-700">
                                    {selectedEmail.metadata?.user_email || selectedEmail.recipient_email}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-500">Senha</p>
                                  <p className="font-mono bg-white px-3 py-2 rounded border text-gray-400">
                                    ••••••••••
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Botão */}
                            <div className="text-center mb-6">
                              <span className="inline-block bg-teal-500 text-white px-8 py-3 rounded-lg font-semibold">
                                Acessar Plataforma →
                              </span>
                            </div>

                            {/* Detalhes do pedido */}
                            <div className="bg-gray-50 rounded-lg p-4 text-sm">
                              <h4 className="font-semibold text-gray-700 mb-3">📋 Detalhes do Pedido</h4>
                              <div className="space-y-2">
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Pedido</span>
                                  <span className="font-medium text-gray-700">#{selectedEmail.order_id?.slice(0, 8).toUpperCase() || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Valor</span>
                                  <span className="font-medium text-green-600">
                                    {selectedEmail.metadata?.order_value 
                                      ? `R$ ${Number(selectedEmail.metadata.order_value).toFixed(2)}`
                                      : 'N/A'
                                    }
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Pagamento</span>
                                  <span className="font-medium text-gray-700">
                                    {selectedEmail.metadata?.payment_method?.toUpperCase() || 'N/A'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Footer */}
                          <div className="bg-gray-50 px-8 py-4 text-center border-t">
                            <p className="text-sm text-gray-500">suporte@gravadormedico.com.br</p>
                            <p className="text-xs text-gray-400 mt-2">© 2026 Gravador Médico</p>
                          </div>
                        </div>
                        <p className="text-center text-xs text-gray-400 mt-4">
                          ⚠️ Preview simulado - HTML original não foi salvo
                        </p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="details" className="flex-1 min-h-0 overflow-auto p-6 m-0">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-gray-400 uppercase">Informações do Email</h3>
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs text-gray-500">Tipo</p>
                            {getTypeBadge(selectedEmail.email_type)}
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Status</p>
                            {getStatusBadge(selectedEmail.status)}
                          </div>
                          {selectedEmail.order_id && (
                            <div>
                              <p className="text-xs text-gray-500">Pedido</p>
                              <code className="text-sm bg-gray-800 px-2 py-1 rounded text-gray-300">{selectedEmail.order_id}</code>
                            </div>
                          )}
                          <div>
                            <p className="text-xs text-gray-500">Enviado em</p>
                            <p className="text-gray-300">{format(new Date(selectedEmail.created_at), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-gray-400 uppercase">Tracking</h3>
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs text-gray-500">Aberturas</p>
                            <p className="text-gray-300">{selectedEmail.open_count || 0}x</p>
                          </div>
                          {selectedEmail.first_opened_at && (
                            <div>
                              <p className="text-xs text-gray-500">Primeira Abertura</p>
                              <p className="text-gray-300">{format(new Date(selectedEmail.first_opened_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                            </div>
                          )}
                          {selectedEmail.device_type && (
                            <div>
                              <p className="text-xs text-gray-500">Dispositivo</p>
                              <p className="text-gray-300">{selectedEmail.device_type} • {selectedEmail.browser} • {selectedEmail.os}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {selectedEmail.error_message && (
                        <div className="col-span-2">
                          <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
                            <p className="text-sm font-semibold text-red-400 mb-2 flex items-center gap-2">
                              <XCircle className="w-4 h-4" />
                              Erro no Envio
                            </p>
                            <p className="text-sm text-red-300">{selectedEmail.error_message}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="html" className="flex-1 min-h-0 overflow-auto p-0 m-0">
                    <pre className="p-6 text-xs text-gray-400 overflow-auto min-h-full bg-gray-950">
                      <code>{selectedEmail.html_content || 'HTML não disponível'}</code>
                    </pre>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </div>
  )
}
