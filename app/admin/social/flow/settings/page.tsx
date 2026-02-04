'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import {
  ArrowLeft,
  Settings,
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
  Youtube,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  Trash2,
  RefreshCw,
  Bell,
  Clock,
  Shield,
  Zap,
  Link as LinkIcon,
  ExternalLink,
  Copy,
  Check,
  Key,
  Globe,
  User,
} from 'lucide-react';

// =====================================================
// TIPOS
// =====================================================

interface ConnectedAccount {
  id: string;
  network: string;
  account_name: string;
  account_username: string;
  profile_picture_url?: string;
  is_active: boolean;
  connection_status: 'connected' | 'expired' | 'error';
  token_expires_at?: string;
  last_sync_at?: string;
  error_message?: string;
}

interface NotificationSettings {
  post_published: boolean;
  post_failed: boolean;
  token_expiring: boolean;
  weekly_report: boolean;
  email_notifications: boolean;
  push_notifications: boolean;
}

interface SchedulingSettings {
  timezone: string;
  default_times: string[];
  auto_schedule: boolean;
  best_time_suggestions: boolean;
}

interface AISettings {
  auto_caption: boolean;
  auto_hashtags: boolean;
  caption_tone: 'casual' | 'professional' | 'creative' | 'informative';
  max_hashtags: number;
  language: string;
}

// =====================================================
// ÍCONES DAS REDES
// =====================================================

const networkIcons: Record<string, React.ReactNode> = {
  instagram: <Instagram className="w-5 h-5" />,
  facebook: <Facebook className="w-5 h-5" />,
  twitter: <Twitter className="w-5 h-5" />,
  linkedin: <Linkedin className="w-5 h-5" />,
  youtube: <Youtube className="w-5 h-5" />,
  tiktok: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
    </svg>
  ),
  pinterest: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0a12 12 0 00-4.37 23.17c-.1-.94-.2-2.4.04-3.44l1.4-5.96s-.37-.73-.37-1.82c0-1.7.99-2.98 2.22-2.98 1.05 0 1.56.79 1.56 1.73 0 1.05-.67 2.63-1.02 4.1-.29 1.22.62 2.22 1.82 2.22 2.19 0 3.87-2.3 3.87-5.64 0-2.95-2.12-5.01-5.14-5.01-3.5 0-5.56 2.63-5.56 5.35 0 1.06.41 2.2.92 2.82.1.12.12.23.08.35l-.34 1.4c-.06.23-.18.28-.42.17-1.56-.73-2.54-3-2.54-4.83 0-3.93 2.86-7.54 8.24-7.54 4.33 0 7.69 3.08 7.69 7.2 0 4.3-2.71 7.76-6.47 7.76-1.26 0-2.45-.66-2.86-1.44l-.78 2.96c-.28 1.08-1.04 2.44-1.55 3.27A12 12 0 1012 0z" />
    </svg>
  ),
};

const networkColors: Record<string, string> = {
  instagram: 'text-pink-500 bg-pink-500/10',
  facebook: 'text-blue-500 bg-blue-500/10',
  twitter: 'text-sky-500 bg-sky-500/10',
  linkedin: 'text-blue-600 bg-blue-600/10',
  youtube: 'text-red-500 bg-red-500/10',
  tiktok: 'text-white bg-gray-800',
  pinterest: 'text-red-600 bg-red-600/10',
};

// =====================================================
// TIMEZONES
// =====================================================

const timezones = [
  { value: 'America/Sao_Paulo', label: 'Brasília (GMT-3)' },
  { value: 'America/New_York', label: 'Nova York (GMT-5)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (GMT-8)' },
  { value: 'Europe/London', label: 'Londres (GMT+0)' },
  { value: 'Europe/Paris', label: 'Paris (GMT+1)' },
  { value: 'Asia/Tokyo', label: 'Tóquio (GMT+9)' },
  { value: 'Australia/Sydney', label: 'Sydney (GMT+11)' },
];

// =====================================================
// COMPONENTES
// =====================================================

function AccountCard({
  account,
  onDisconnect,
  onRefresh,
}: {
  account: ConnectedAccount;
  onDisconnect: () => void;
  onRefresh: () => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleRefresh = async () => {
    setLoading(true);
    await onRefresh();
    setLoading(false);
  };

  const getStatusBadge = () => {
    switch (account.connection_status) {
      case 'connected':
        return (
          <span className="flex items-center gap-1 text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">
            <CheckCircle className="w-3 h-3" />
            Conectado
          </span>
        );
      case 'expired':
        return (
          <span className="flex items-center gap-1 text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full">
            <AlertCircle className="w-3 h-3" />
            Token expirado
          </span>
        );
      case 'error':
        return (
          <span className="flex items-center gap-1 text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-full">
            <AlertCircle className="w-3 h-3" />
            Erro
          </span>
        );
    }
  };

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
      <div className="flex items-start gap-4">
        {account.profile_picture_url ? (
          <img
            src={account.profile_picture_url}
            alt={account.account_name}
            className="w-12 h-12 rounded-full"
          />
        ) : (
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${networkColors[account.network]}`}>
            {networkIcons[account.network]}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium">{account.account_name}</span>
            {getStatusBadge()}
          </div>
          <div className="text-sm text-gray-400">@{account.account_username}</div>
          {account.last_sync_at && (
            <div className="text-xs text-gray-500 mt-1">
              Última sincronização: {new Date(account.last_sync_at).toLocaleString('pt-BR')}
            </div>
          )}
          {account.error_message && (
            <div className="text-xs text-red-400 mt-1">{account.error_message}</div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
            title="Atualizar token"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onDisconnect}
            className="p-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors"
            title="Desconectar"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function SettingsSection({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
      <div className="flex items-start gap-4 mb-6">
        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
          {icon}
        </div>
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="text-sm text-gray-400">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <div>
        <div className="font-medium text-sm">{label}</div>
        {description && <div className="text-xs text-gray-500">{description}</div>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors ${
          checked ? 'bg-blue-600' : 'bg-gray-600'
        }`}
      >
        <span
          className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
            checked ? 'translate-x-5' : ''
          }`}
        />
      </button>
    </label>
  );
}

// =====================================================
// PÁGINA PRINCIPAL
// =====================================================

export default function SocialFlowSettingsPage() {
  
  
  // Estado
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  
  const [notifications, setNotifications] = useState<NotificationSettings>({
    post_published: true,
    post_failed: true,
    token_expiring: true,
    weekly_report: false,
    email_notifications: true,
    push_notifications: false,
  });

  const [scheduling, setScheduling] = useState<SchedulingSettings>({
    timezone: 'America/Sao_Paulo',
    default_times: ['09:00', '12:00', '18:00'],
    auto_schedule: false,
    best_time_suggestions: true,
  });

  const [aiSettings, setAISettings] = useState<AISettings>({
    auto_caption: false,
    auto_hashtags: true,
    caption_tone: 'casual',
    max_hashtags: 15,
    language: 'pt-BR',
  });

  // Carregar dados
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Carregar contas
      const { data: accountsData } = await supabase
        .from('social_accounts')
        .select('*')
        .order('created_at', { ascending: false });

      if (accountsData) {
        setAccounts(accountsData);
      }

      // Carregar configurações do usuário
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: settings } = await supabase
          .from('user_settings')
          .select('social_flow_settings')
          .eq('user_id', user.id)
          .single();

        if (settings?.social_flow_settings) {
          const s = settings.social_flow_settings;
          if (s.notifications) setNotifications(s.notifications);
          if (s.scheduling) setScheduling(s.scheduling);
          if (s.ai) setAISettings(s.ai);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Salvar configurações
  const saveSettings = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          social_flow_settings: {
            notifications,
            scheduling,
            ai: aiSettings,
          },
          updated_at: new Date().toISOString(),
        });

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  // Desconectar conta
  const disconnectAccount = async (id: string) => {
    if (!confirm('Tem certeza que deseja desconectar esta conta?')) return;

    try {
      await supabase
        .from('social_accounts')
        .delete()
        .eq('id', id);

      setAccounts(accounts.filter((a) => a.id !== id));
    } catch (error) {
      console.error('Erro ao desconectar:', error);
    }
  };

  // Atualizar token
  const refreshToken = async (id: string) => {
    try {
      const response = await fetch('/api/social-flow/accounts/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: id }),
      });

      if (response.ok) {
        loadData();
      }
    } catch (error) {
      console.error('Erro ao atualizar token:', error);
    }
  };

  // Adicionar horário padrão
  const addDefaultTime = () => {
    if (scheduling.default_times.length < 6) {
      setScheduling({
        ...scheduling,
        default_times: [...scheduling.default_times, '12:00'],
      });
    }
  };

  // Remover horário padrão
  const removeDefaultTime = (index: number) => {
    setScheduling({
      ...scheduling,
      default_times: scheduling.default_times.filter((_, i) => i !== index),
    });
  };

  // Efeito
  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#101A1E] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-400">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#101A1E] text-white p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/social/flow"
              className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-3">
                <Settings className="w-7 h-7 text-blue-500" />
                Configurações
              </h1>
              <p className="text-gray-400">Gerencie suas preferências do Social Flow</p>
            </div>
          </div>

          <button
            onClick={saveSettings}
            disabled={saving}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg transition-colors ${
              saved
                ? 'bg-green-600 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            } disabled:opacity-50`}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <Check className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? 'Salvando...' : saved ? 'Salvo!' : 'Salvar'}
          </button>
        </div>
      </div>

      <div className="max-w-4xl space-y-6">
        {/* Contas Conectadas */}
        <SettingsSection
          title="Contas Conectadas"
          description="Gerencie suas redes sociais conectadas"
          icon={<LinkIcon className="w-5 h-5" />}
        >
          <div className="space-y-4">
            {accounts.length > 0 ? (
              accounts.map((account) => (
                <AccountCard
                  key={account.id}
                  account={account}
                  onDisconnect={() => disconnectAccount(account.id)}
                  onRefresh={() => refreshToken(account.id)}
                />
              ))
            ) : (
              <p className="text-gray-400 text-center py-4">
                Nenhuma conta conectada
              </p>
            )}

            <Link
              href="/admin/social/flow/connect"
              className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-gray-700 hover:border-gray-600 rounded-xl transition-colors text-gray-400 hover:text-white"
            >
              <span className="text-xl">+</span>
              Conectar nova rede
            </Link>
          </div>
        </SettingsSection>

        {/* Notificações */}
        <SettingsSection
          title="Notificações"
          description="Configure quando você quer ser notificado"
          icon={<Bell className="w-5 h-5" />}
        >
          <div className="space-y-4">
            <Toggle
              checked={notifications.post_published}
              onChange={(checked) => setNotifications({ ...notifications, post_published: checked })}
              label="Post publicado"
              description="Notificar quando um post for publicado com sucesso"
            />
            <Toggle
              checked={notifications.post_failed}
              onChange={(checked) => setNotifications({ ...notifications, post_failed: checked })}
              label="Falha na publicação"
              description="Notificar quando um post falhar ao publicar"
            />
            <Toggle
              checked={notifications.token_expiring}
              onChange={(checked) => setNotifications({ ...notifications, token_expiring: checked })}
              label="Token expirando"
              description="Notificar quando um token estiver prestes a expirar"
            />
            <Toggle
              checked={notifications.weekly_report}
              onChange={(checked) => setNotifications({ ...notifications, weekly_report: checked })}
              label="Relatório semanal"
              description="Receber resumo semanal de performance"
            />

            <div className="border-t border-gray-700 pt-4 mt-4">
              <h4 className="font-medium mb-3">Canais de notificação</h4>
              <div className="space-y-3">
                <Toggle
                  checked={notifications.email_notifications}
                  onChange={(checked) => setNotifications({ ...notifications, email_notifications: checked })}
                  label="E-mail"
                />
                <Toggle
                  checked={notifications.push_notifications}
                  onChange={(checked) => setNotifications({ ...notifications, push_notifications: checked })}
                  label="Push (navegador)"
                />
              </div>
            </div>
          </div>
        </SettingsSection>

        {/* Agendamento */}
        <SettingsSection
          title="Agendamento"
          description="Configure preferências de agendamento"
          icon={<Clock className="w-5 h-5" />}
        >
          <div className="space-y-4">
            {/* Timezone */}
            <div>
              <label className="block text-sm font-medium mb-2">Fuso horário</label>
              <select
                value={scheduling.timezone}
                onChange={(e) => setScheduling({ ...scheduling, timezone: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
              >
                {timezones.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Horários padrão */}
            <div>
              <label className="block text-sm font-medium mb-2">Horários padrão de publicação</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {scheduling.default_times.map((time, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 bg-gray-700 rounded-lg px-3 py-1.5"
                  >
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => {
                        const newTimes = [...scheduling.default_times];
                        newTimes[index] = e.target.value;
                        setScheduling({ ...scheduling, default_times: newTimes });
                      }}
                      className="bg-transparent border-none focus:outline-none text-sm w-20"
                    />
                    <button
                      onClick={() => removeDefaultTime(index)}
                      className="text-gray-400 hover:text-red-400"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {scheduling.default_times.length < 6 && (
                  <button
                    onClick={addDefaultTime}
                    className="px-3 py-1.5 border border-dashed border-gray-600 rounded-lg text-sm text-gray-400 hover:border-gray-500 hover:text-white transition-colors"
                  >
                    + Adicionar
                  </button>
                )}
              </div>
            </div>

            <Toggle
              checked={scheduling.auto_schedule}
              onChange={(checked) => setScheduling({ ...scheduling, auto_schedule: checked })}
              label="Agendamento automático"
              description="Usar melhores horários automaticamente"
            />
            <Toggle
              checked={scheduling.best_time_suggestions}
              onChange={(checked) => setScheduling({ ...scheduling, best_time_suggestions: checked })}
              label="Sugestões de melhor horário"
              description="Mostrar sugestões baseadas em analytics"
            />
          </div>
        </SettingsSection>

        {/* IA */}
        <SettingsSection
          title="Inteligência Artificial"
          description="Configure as funcionalidades de IA"
          icon={<Zap className="w-5 h-5" />}
        >
          <div className="space-y-4">
            <Toggle
              checked={aiSettings.auto_caption}
              onChange={(checked) => setAISettings({ ...aiSettings, auto_caption: checked })}
              label="Gerar legenda automaticamente"
              description="Usar IA para sugerir legendas ao criar posts"
            />
            <Toggle
              checked={aiSettings.auto_hashtags}
              onChange={(checked) => setAISettings({ ...aiSettings, auto_hashtags: checked })}
              label="Sugerir hashtags"
              description="Receber sugestões de hashtags relevantes"
            />

            {/* Tom da legenda */}
            <div>
              <label className="block text-sm font-medium mb-2">Tom das legendas</label>
              <select
                value={aiSettings.caption_tone}
                onChange={(e) => setAISettings({ ...aiSettings, caption_tone: e.target.value as AISettings['caption_tone'] })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
              >
                <option value="casual">Casual / Informal</option>
                <option value="professional">Profissional</option>
                <option value="creative">Criativo / Divertido</option>
                <option value="informative">Informativo / Educativo</option>
              </select>
            </div>

            {/* Máximo de hashtags */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Máximo de hashtags: {aiSettings.max_hashtags}
              </label>
              <input
                type="range"
                min="5"
                max="30"
                value={aiSettings.max_hashtags}
                onChange={(e) => setAISettings({ ...aiSettings, max_hashtags: parseInt(e.target.value) })}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>5</span>
                <span>30</span>
              </div>
            </div>

            {/* Idioma */}
            <div>
              <label className="block text-sm font-medium mb-2">Idioma das sugestões</label>
              <select
                value={aiSettings.language}
                onChange={(e) => setAISettings({ ...aiSettings, language: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
              >
                <option value="pt-BR">Português (Brasil)</option>
                <option value="en-US">English (US)</option>
                <option value="es">Español</option>
              </select>
            </div>
          </div>
        </SettingsSection>

        {/* Zona de Perigo */}
        <SettingsSection
          title="Zona de Perigo"
          description="Ações irreversíveis"
          icon={<Shield className="w-5 h-5" />}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-red-900/20 border border-red-800/50 rounded-lg">
              <div>
                <h4 className="font-medium text-red-400">Excluir todos os dados</h4>
                <p className="text-sm text-gray-400">
                  Remove todas as contas, posts e configurações
                </p>
              </div>
              <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">
                Excluir tudo
              </button>
            </div>
          </div>
        </SettingsSection>
      </div>
    </div>
  );
}
