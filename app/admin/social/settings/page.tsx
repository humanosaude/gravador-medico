'use client';

import { useState, useEffect } from 'react';
import { 
  Settings, 
  Instagram, 
  Bell, 
  Clock, 
  Shield, 
  Trash2, 
  RefreshCw,
  Globe,
  User,
  Key,
  AlertTriangle,
  Check,
  ExternalLink,
  LogOut,
  Plus,
  MoreHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

interface InstagramAccount {
  id: string;
  username: string;
  name?: string;
  profile_picture_url?: string;
  followers_count: number;
  connection_status: 'connected' | 'expired' | 'error';
  token_expires_at?: string;
  token_scopes?: string[];
  created_at: string;
}

interface NotificationSettings {
  email_on_publish: boolean;
  email_on_fail: boolean;
  email_on_approval: boolean;
  email_weekly_report: boolean;
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<InstagramAccount[]>([]);
  const [notifications, setNotifications] = useState<NotificationSettings>({
    email_on_publish: true,
    email_on_fail: true,
    email_on_approval: true,
    email_weekly_report: false,
  });
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/social/instagram/accounts');
      const data = await response.json();
      setAccounts(data.accounts || []);
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async (accountId: string) => {
    if (!confirm('Tem certeza que deseja desconectar esta conta? Todos os posts agendados serão cancelados.')) {
      return;
    }
    
    setDisconnecting(accountId);
    try {
      await fetch(`/api/social/instagram/accounts?id=${accountId}`, {
        method: 'DELETE',
      });
      setAccounts(prev => prev.filter(a => a.id !== accountId));
    } catch (error) {
      console.error('Error disconnecting account:', error);
    } finally {
      setDisconnecting(null);
    }
  };

  const handleRefreshToken = async (accountId: string) => {
    try {
      await fetch(`/api/social/instagram/sync?accountId=${accountId}`, {
        method: 'POST',
      });
      await loadSettings();
    } catch (error) {
      console.error('Error refreshing token:', error);
    }
  };

  const saveNotifications = async () => {
    setSaving(true);
    try {
      await fetch('/api/social/instagram/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notifications }),
      });
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const getTokenStatus = (account: InstagramAccount) => {
    if (account.connection_status === 'error') {
      return { color: 'bg-red-500', text: 'Erro', textColor: 'text-red-400' };
    }
    if (account.connection_status === 'expired') {
      return { color: 'bg-yellow-500', text: 'Expirado', textColor: 'text-yellow-400' };
    }
    if (account.token_expires_at) {
      const expiresIn = new Date(account.token_expires_at).getTime() - Date.now();
      const daysLeft = Math.floor(expiresIn / (1000 * 60 * 60 * 24));
      if (daysLeft < 7) {
        return { color: 'bg-yellow-500', text: `Expira em ${daysLeft}d`, textColor: 'text-yellow-400' };
      }
    }
    return { color: 'bg-green-500', text: 'Conectado', textColor: 'text-green-400' };
  };

  const ToggleSwitch = ({ 
    checked, 
    onChange, 
    label, 
    description 
  }: { 
    checked: boolean; 
    onChange: (value: boolean) => void;
    label: string;
    description: string;
  }) => (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm text-white">{label}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors ${
          checked ? 'bg-purple-600' : 'bg-gray-700'
        }`}
      >
        <span
          className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#101A1E] p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Configurações</h1>
            <p className="text-sm text-gray-400">
              Gerencie suas contas e preferências
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Accounts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Connected Accounts */}
          <Card className="bg-gray-800/50 border-gray-700/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Instagram className="w-5 h-5" />
                    Contas Conectadas
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Gerencie suas contas Instagram Business
                  </CardDescription>
                </div>
                <Link href="/admin/social/connect">
                  <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[...Array(2)].map((_, i) => (
                    <Skeleton key={i} className="h-24 bg-gray-700/50" />
                  ))}
                </div>
              ) : accounts.length === 0 ? (
                <div className="text-center py-8">
                  <Instagram className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-500 mb-4">Nenhuma conta conectada</p>
                  <Link href="/admin/social/connect">
                    <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                      Conectar conta Instagram
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {accounts.map((account) => {
                    const status = getTokenStatus(account);
                    return (
                      <div 
                        key={account.id}
                        className="flex items-center gap-4 p-4 bg-gray-700/30 rounded-lg"
                      >
                        {/* Avatar */}
                        <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
                          {account.profile_picture_url ? (
                            <img 
                              src={account.profile_picture_url} 
                              alt={account.username}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <User className="w-6 h-6 text-gray-500" />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-white font-medium">@{account.username}</h3>
                            <div className={`w-2 h-2 rounded-full ${status.color}`} />
                            <span className={`text-xs ${status.textColor}`}>{status.text}</span>
                          </div>
                          {account.name && (
                            <p className="text-sm text-gray-400 truncate">{account.name}</p>
                          )}
                          <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                            <span>{account.followers_count.toLocaleString()} seguidores</span>
                            <span>Conectado em {formatDate(account.created_at)}</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRefreshToken(account.id)}
                            className="border-gray-600 text-gray-300 hover:bg-gray-700/50"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDisconnect(account.id)}
                            disabled={disconnecting === account.id}
                            className="border-red-600 text-red-400 hover:bg-red-600/20"
                          >
                            {disconnecting === account.id ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <LogOut className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Permissions */}
          <Card className="bg-gray-800/50 border-gray-700/50">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Permissões
              </CardTitle>
              <CardDescription className="text-gray-400">
                Permissões concedidas para cada conta
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { name: 'instagram_basic', description: 'Informações básicas do perfil', granted: true },
                  { name: 'instagram_content_publish', description: 'Publicar conteúdo', granted: true },
                  { name: 'instagram_manage_insights', description: 'Ver métricas e analytics', granted: true },
                  { name: 'pages_show_list', description: 'Listar páginas do Facebook', granted: true },
                  { name: 'pages_read_engagement', description: 'Ler engajamento das páginas', granted: true },
                  { name: 'business_management', description: 'Gerenciar negócios', granted: false },
                ].map((perm) => (
                  <div 
                    key={perm.name}
                    className="flex items-center justify-between py-2 border-b border-gray-700/50 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        perm.granted ? 'bg-green-500/20' : 'bg-gray-700'
                      }`}>
                        {perm.granted ? (
                          <Check className="w-4 h-4 text-green-400" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-gray-500" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-white font-mono">{perm.name}</p>
                        <p className="text-xs text-gray-500">{perm.description}</p>
                      </div>
                    </div>
                    <Badge className={perm.granted ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-500'}>
                      {perm.granted ? 'Concedida' : 'Não concedida'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Settings */}
        <div className="space-y-6">
          {/* Notifications */}
          <Card className="bg-gray-800/50 border-gray-700/50">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notificações
              </CardTitle>
              <CardDescription className="text-gray-400">
                Configure quando receber alertas
              </CardDescription>
            </CardHeader>
            <CardContent className="divide-y divide-gray-700/50">
              <ToggleSwitch
                checked={notifications.email_on_publish}
                onChange={(v) => setNotifications(prev => ({ ...prev, email_on_publish: v }))}
                label="Post publicado"
                description="Receba email quando um post for publicado"
              />
              <ToggleSwitch
                checked={notifications.email_on_fail}
                onChange={(v) => setNotifications(prev => ({ ...prev, email_on_fail: v }))}
                label="Falha na publicação"
                description="Receba email quando um post falhar"
              />
              <ToggleSwitch
                checked={notifications.email_on_approval}
                onChange={(v) => setNotifications(prev => ({ ...prev, email_on_approval: v }))}
                label="Aprovação pendente"
                description="Receba email quando houver posts aguardando aprovação"
              />
              <ToggleSwitch
                checked={notifications.email_weekly_report}
                onChange={(v) => setNotifications(prev => ({ ...prev, email_weekly_report: v }))}
                label="Relatório semanal"
                description="Receba um resumo semanal de performance"
              />
              
              <div className="pt-4">
                <Button 
                  onClick={saveNotifications}
                  disabled={saving}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {saving ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 mr-2" />
                  )}
                  Salvar preferências
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Time Zone */}
          <Card className="bg-gray-800/50 border-gray-700/50">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Fuso Horário
              </CardTitle>
              <CardDescription className="text-gray-400">
                Define o horário padrão para agendamentos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <select 
                className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                defaultValue="America/Sao_Paulo"
              >
                <option value="America/Sao_Paulo">Brasília (GMT-3)</option>
                <option value="America/Manaus">Manaus (GMT-4)</option>
                <option value="America/Noronha">Fernando de Noronha (GMT-2)</option>
                <option value="America/Rio_Branco">Rio Branco (GMT-5)</option>
              </select>
              <p className="text-xs text-gray-500 mt-2">
                Horário atual: {new Date().toLocaleTimeString('pt-BR')}
              </p>
            </CardContent>
          </Card>

          {/* Auto-posting */}
          <Card className="bg-gray-800/50 border-gray-700/50">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Publicação Automática
              </CardTitle>
              <CardDescription className="text-gray-400">
                Configurações de agendamento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">
                  Horário padrão para posts
                </label>
                <Input 
                  type="time" 
                  defaultValue="18:00"
                  className="bg-gray-700 border-gray-600 text-white h-12 [color-scheme:dark]"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-2 block">
                  Intervalo mínimo entre posts (horas)
                </label>
                <Input 
                  type="number" 
                  defaultValue="4"
                  min="1"
                  max="24"
                  className="bg-gray-700 border-gray-600 text-white h-12"
                />
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="bg-red-900/20 border-red-700/50">
            <CardHeader>
              <CardTitle className="text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Zona de Perigo
              </CardTitle>
              <CardDescription className="text-gray-400">
                Ações irreversíveis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full border-red-600 text-red-400 hover:bg-red-600/20"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir todos os rascunhos
              </Button>
              <Button
                variant="outline"
                className="w-full border-red-600 text-red-400 hover:bg-red-600/20"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir biblioteca de mídia
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
