'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import {
  ArrowLeft,
  FileText,
  Plus,
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
  Youtube,
  Clock,
  Edit,
  Trash2,
  Loader2,
  Image as ImageIcon,
  Video,
  Images,
  Search,
  Filter,
  ChevronDown,
  Calendar,
  Send,
  Copy,
  MoreVertical,
  X,
  Check,
} from 'lucide-react';

// =====================================================
// TIPOS
// =====================================================

interface DraftPost {
  id: string;
  account_id?: string;
  networks?: string[];
  network?: string;
  account_name?: string;
  account_username?: string;
  caption?: string;
  media_urls?: string[];
  media_type: 'image' | 'video' | 'carousel' | 'text';
  hashtags?: string[];
  created_at: string;
  updated_at: string;
}

interface NetworkAccount {
  id: string;
  network: string;
  account_name: string;
  account_username: string;
  profile_picture_url?: string;
}

// =====================================================
// ÍCONES DAS REDES
// =====================================================

const networkIcons: Record<string, React.ReactNode> = {
  instagram: <Instagram className="w-4 h-4" />,
  facebook: <Facebook className="w-4 h-4" />,
  twitter: <Twitter className="w-4 h-4" />,
  linkedin: <Linkedin className="w-4 h-4" />,
  youtube: <Youtube className="w-4 h-4" />,
  tiktok: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
    </svg>
  ),
  pinterest: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
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

const mediaTypeIcons: Record<string, React.ReactNode> = {
  image: <ImageIcon className="w-4 h-4" />,
  video: <Video className="w-4 h-4" />,
  carousel: <Images className="w-4 h-4" />,
  text: <FileText className="w-4 h-4" />,
};

// =====================================================
// COMPONENTES
// =====================================================

function DraftCard({
  draft,
  onEdit,
  onDelete,
  onDuplicate,
  onSchedule,
  onPublishNow,
}: {
  draft: DraftPost;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onSchedule: () => void;
  onPublishNow: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const networks = draft.networks || (draft.network ? [draft.network] : []);

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden hover:border-gray-600 transition-colors group">
      {/* Mídia Preview */}
      {draft.media_urls && draft.media_urls.length > 0 ? (
        <div className="relative aspect-square bg-gray-900">
          {draft.media_type === 'video' ? (
            <video
              src={draft.media_urls[0]}
              className="w-full h-full object-cover"
              muted
            />
          ) : draft.media_type === 'carousel' ? (
            <div className="relative w-full h-full">
              <img
                src={draft.media_urls[0]}
                alt="Preview"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2 right-2 bg-black/70 px-2 py-1 rounded text-xs flex items-center gap-1">
                <Images className="w-3 h-3" />
                {draft.media_urls.length}
              </div>
            </div>
          ) : (
            <img
              src={draft.media_urls[0]}
              alt="Preview"
              className="w-full h-full object-cover"
            />
          )}
          {/* Overlay com ações rápidas */}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              onClick={onEdit}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
              title="Editar"
            >
              <Edit className="w-5 h-5" />
            </button>
            <button
              onClick={onSchedule}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
              title="Agendar"
            >
              <Calendar className="w-5 h-5" />
            </button>
            <button
              onClick={onPublishNow}
              className="p-2 bg-blue-600 hover:bg-blue-700 rounded-full transition-colors"
              title="Publicar agora"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="aspect-square bg-gray-900 flex items-center justify-center">
          <div className="text-center text-gray-500">
            {mediaTypeIcons[draft.media_type] || <FileText className="w-8 h-8 mx-auto mb-2" />}
            <p className="text-xs mt-2">Sem mídia</p>
          </div>
        </div>
      )}

      {/* Conteúdo */}
      <div className="p-4">
        {/* Redes */}
        <div className="flex items-center gap-2 mb-3">
          {networks.length > 0 ? (
            networks.map((network) => (
              <div
                key={network}
                className={`p-1.5 rounded ${networkColors[network]}`}
                title={network}
              >
                {networkIcons[network]}
              </div>
            ))
          ) : (
            <span className="text-xs text-gray-500">Nenhuma rede selecionada</span>
          )}
        </div>

        {/* Caption */}
        <p className="text-sm text-gray-300 line-clamp-3 mb-3">
          {draft.caption || <span className="text-gray-500 italic">Sem legenda</span>}
        </p>

        {/* Hashtags */}
        {draft.hashtags && draft.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {draft.hashtags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded"
              >
                #{tag}
              </span>
            ))}
            {draft.hashtags.length > 3 && (
              <span className="text-xs text-gray-500">+{draft.hashtags.length - 3}</span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-700">
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date(draft.updated_at).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: 'short',
            })}
          </span>

          {/* Menu de ações */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 hover:bg-gray-700 rounded transition-colors"
            >
              <MoreVertical className="w-4 h-4 text-gray-400" />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 bottom-full mb-2 w-40 bg-gray-700 border border-gray-600 rounded-lg shadow-xl z-50 py-1">
                  <button
                    onClick={() => {
                      onEdit();
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-600 transition-colors flex items-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Editar
                  </button>
                  <button
                    onClick={() => {
                      onDuplicate();
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-600 transition-colors flex items-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    Duplicar
                  </button>
                  <button
                    onClick={() => {
                      onSchedule();
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-600 transition-colors flex items-center gap-2"
                  >
                    <Calendar className="w-4 h-4" />
                    Agendar
                  </button>
                  <button
                    onClick={() => {
                      onPublishNow();
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-600 transition-colors flex items-center gap-2 text-blue-400"
                  >
                    <Send className="w-4 h-4" />
                    Publicar agora
                  </button>
                  <div className="border-t border-gray-600 my-1" />
                  <button
                    onClick={() => {
                      onDelete();
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-600 transition-colors flex items-center gap-2 text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                    Excluir
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ScheduleModal({
  draft,
  onClose,
  onSchedule,
}: {
  draft: DraftPost;
  onClose: () => void;
  onSchedule: (date: string) => void;
}) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('12:00');

  const handleSchedule = () => {
    if (date && time) {
      const scheduledFor = `${date}T${time}:00`;
      onSchedule(scheduledFor);
    }
  };

  // Definir data mínima como hoje
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl max-w-md w-full">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h3 className="font-semibold">Agendar Publicação</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-700 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Preview */}
          <div className="flex items-start gap-3 p-3 bg-gray-700/50 rounded-lg">
            {draft.media_urls?.[0] && (
              <img
                src={draft.media_urls[0]}
                alt="Preview"
                className="w-12 h-12 rounded-lg object-cover"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-300 line-clamp-2">
                {draft.caption || 'Sem legenda'}
              </p>
            </div>
          </div>

          {/* Data */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Data
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={today}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Hora */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Horário
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSchedule}
            disabled={!date || !time}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            Agendar
          </button>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// PÁGINA PRINCIPAL
// =====================================================

export default function SocialFlowDraftsPage() {
  
  
  // Estado
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<DraftPost[]>([]);
  const [search, setSearch] = useState('');
  const [filterNetwork, setFilterNetwork] = useState<string>('all');
  const [filterMedia, setFilterMedia] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'oldest'>('recent');
  const [accounts, setAccounts] = useState<NetworkAccount[]>([]);
  const [scheduleModal, setScheduleModal] = useState<DraftPost | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Carregar rascunhos
  const loadDrafts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/social-flow/drafts');
      const data = await response.json();

      if (data.success && data.drafts) {
        setDrafts(data.drafts);
      }
    } catch (error) {
      console.error('Erro ao carregar rascunhos:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Carregar contas
  const loadAccounts = useCallback(async () => {
    const { data } = await supabase
      .from('social_accounts')
      .select('id, network, account_name, account_username, profile_picture_url')
      .eq('is_active', true);
    
    if (data) {
      setAccounts(data);
    }
  }, [supabase]);

  // Deletar rascunho
  const deleteDraft = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este rascunho?')) return;

    setActionLoading(id);
    try {
      const response = await fetch(`/api/social-flow/drafts?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setDrafts(drafts.filter((d) => d.id !== id));
      }
    } catch (error) {
      console.error('Erro ao excluir rascunho:', error);
    } finally {
      setActionLoading(null);
    }
  };

  // Duplicar rascunho
  const duplicateDraft = async (draft: DraftPost) => {
    setActionLoading(draft.id);
    try {
      const response = await fetch('/api/social-flow/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...draft,
          id: undefined,
          caption: `${draft.caption || ''} (cópia)`,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setDrafts([data.draft, ...drafts]);
      }
    } catch (error) {
      console.error('Erro ao duplicar rascunho:', error);
    } finally {
      setActionLoading(null);
    }
  };

  // Agendar rascunho
  const scheduleDraft = async (draft: DraftPost, scheduledFor: string) => {
    setActionLoading(draft.id);
    try {
      const response = await fetch('/api/social-flow/scheduled', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draft_id: draft.id,
          scheduled_for: scheduledFor,
        }),
      });

      if (response.ok) {
        // Remover do estado de rascunhos
        setDrafts(drafts.filter((d) => d.id !== draft.id));
        setScheduleModal(null);
        alert('Post agendado com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao agendar rascunho:', error);
      alert('Erro ao agendar post');
    } finally {
      setActionLoading(null);
    }
  };

  // Publicar agora
  const publishNow = async (draft: DraftPost) => {
    if (!confirm('Tem certeza que deseja publicar este post agora?')) return;

    setActionLoading(draft.id);
    try {
      const response = await fetch('/api/social-flow/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draft_id: draft.id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setDrafts(drafts.filter((d) => d.id !== draft.id));
        alert('Post publicado com sucesso!');
      } else {
        alert(`Erro ao publicar: ${data.error}`);
      }
    } catch (error) {
      console.error('Erro ao publicar rascunho:', error);
      alert('Erro ao publicar post');
    } finally {
      setActionLoading(null);
    }
  };

  // Filtrar e ordenar rascunhos
  const filteredDrafts = drafts
    .filter((draft) => {
      // Filtro de busca
      if (search) {
        const searchLower = search.toLowerCase();
        if (
          !draft.caption?.toLowerCase().includes(searchLower) &&
          !draft.hashtags?.some((tag) => tag.toLowerCase().includes(searchLower))
        ) {
          return false;
        }
      }

      // Filtro de rede
      if (filterNetwork !== 'all') {
        const networks = draft.networks || (draft.network ? [draft.network] : []);
        if (!networks.includes(filterNetwork)) {
          return false;
        }
      }

      // Filtro de mídia
      if (filterMedia !== 'all' && draft.media_type !== filterMedia) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(a.updated_at).getTime();
      const dateB = new Date(b.updated_at).getTime();
      return sortBy === 'recent' ? dateB - dateA : dateA - dateB;
    });

  // Redes únicas
  const networks = [...new Set(accounts.map((a) => a.network))];

  // Efeitos
  useEffect(() => {
    loadAccounts();
    loadDrafts();
  }, [loadAccounts, loadDrafts]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#101A1E] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-400">Carregando rascunhos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#101A1E] text-white p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Link
            href="/admin/social/flow"
            className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <FileText className="w-7 h-7 text-blue-500" />
              Rascunhos
            </h1>
            <p className="text-gray-400">
              {drafts.length} rascunho{drafts.length !== 1 ? 's' : ''} salvos
            </p>
          </div>
        </div>

        {/* Filtros e busca */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Busca */}
          <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por legenda ou hashtag..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Filtro de rede */}
          <select
            value={filterNetwork}
            onChange={(e) => setFilterNetwork(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
          >
            <option value="all">Todas as redes</option>
            {networks.map((network) => (
              <option key={network} value={network}>
                {network.charAt(0).toUpperCase() + network.slice(1)}
              </option>
            ))}
          </select>

          {/* Filtro de mídia */}
          <select
            value={filterMedia}
            onChange={(e) => setFilterMedia(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
          >
            <option value="all">Todos os tipos</option>
            <option value="image">Imagens</option>
            <option value="video">Vídeos</option>
            <option value="carousel">Carrosséis</option>
            <option value="text">Texto</option>
          </select>

          {/* Ordenação */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'recent' | 'oldest')}
            className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
          >
            <option value="recent">Mais recentes</option>
            <option value="oldest">Mais antigos</option>
          </select>

          {/* Botão criar */}
          <Link
            href="/admin/social/flow/create"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo Rascunho
          </Link>
        </div>
      </div>

      {/* Grid de rascunhos */}
      {filteredDrafts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredDrafts.map((draft) => (
            <DraftCard
              key={draft.id}
              draft={draft}
              onEdit={() => {
                window.location.href = `/admin/social/flow/create?draft=${draft.id}`;
              }}
              onDelete={() => deleteDraft(draft.id)}
              onDuplicate={() => duplicateDraft(draft)}
              onSchedule={() => setScheduleModal(draft)}
              onPublishNow={() => publishNow(draft)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">
            {search || filterNetwork !== 'all' || filterMedia !== 'all'
              ? 'Nenhum rascunho encontrado'
              : 'Nenhum rascunho salvo'}
          </h3>
          <p className="text-gray-400 mb-6">
            {search || filterNetwork !== 'all' || filterMedia !== 'all'
              ? 'Tente ajustar os filtros de busca'
              : 'Comece criando seu primeiro post'}
          </p>
          <Link
            href="/admin/social/flow/create"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Criar Post
          </Link>
        </div>
      )}

      {/* Modal de agendamento */}
      {scheduleModal && (
        <ScheduleModal
          draft={scheduleModal}
          onClose={() => setScheduleModal(null)}
          onSchedule={(date) => scheduleDraft(scheduleModal, date)}
        />
      )}
    </div>
  );
}
