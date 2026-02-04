'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
  Youtube,
  Clock,
  Eye,
  Edit,
  Trash2,
  Loader2,
  Image as ImageIcon,
  Video,
  Images,
  MoreVertical,
  X,
  Check,
} from 'lucide-react';

// =====================================================
// TIPOS
// =====================================================

interface ScheduledPost {
  id: string;
  account_id: string;
  network: string;
  account_name: string;
  account_username: string;
  caption?: string;
  media_urls?: string[];
  media_type: 'image' | 'video' | 'carousel' | 'text';
  scheduled_for: string;
  status: 'scheduled' | 'published' | 'failed' | 'draft';
  created_at: string;
}

interface NetworkAccount {
  id: string;
  network: string;
  account_name: string;
  account_username: string;
  profile_picture_url?: string;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  posts: ScheduledPost[];
}

// =====================================================
// ÍCONES DAS REDES
// =====================================================

const networkIcons: Record<string, React.ReactNode> = {
  instagram: <Instagram className="w-3 h-3" />,
  facebook: <Facebook className="w-3 h-3" />,
  twitter: <Twitter className="w-3 h-3" />,
  linkedin: <Linkedin className="w-3 h-3" />,
  youtube: <Youtube className="w-3 h-3" />,
  tiktok: (
    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
    </svg>
  ),
  pinterest: (
    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0a12 12 0 00-4.37 23.17c-.1-.94-.2-2.4.04-3.44l1.4-5.96s-.37-.73-.37-1.82c0-1.7.99-2.98 2.22-2.98 1.05 0 1.56.79 1.56 1.73 0 1.05-.67 2.63-1.02 4.1-.29 1.22.62 2.22 1.82 2.22 2.19 0 3.87-2.3 3.87-5.64 0-2.95-2.12-5.01-5.14-5.01-3.5 0-5.56 2.63-5.56 5.35 0 1.06.41 2.2.92 2.82.1.12.12.23.08.35l-.34 1.4c-.06.23-.18.28-.42.17-1.56-.73-2.54-3-2.54-4.83 0-3.93 2.86-7.54 8.24-7.54 4.33 0 7.69 3.08 7.69 7.2 0 4.3-2.71 7.76-6.47 7.76-1.26 0-2.45-.66-2.86-1.44l-.78 2.96c-.28 1.08-1.04 2.44-1.55 3.27A12 12 0 1012 0z" />
    </svg>
  ),
};

const networkColors: Record<string, string> = {
  instagram: 'bg-gradient-to-br from-purple-500 to-pink-500',
  facebook: 'bg-blue-600',
  twitter: 'bg-sky-500',
  linkedin: 'bg-blue-700',
  youtube: 'bg-red-600',
  tiktok: 'bg-black',
  pinterest: 'bg-red-500',
};

const mediaTypeIcons: Record<string, React.ReactNode> = {
  image: <ImageIcon className="w-3 h-3" />,
  video: <Video className="w-3 h-3" />,
  carousel: <Images className="w-3 h-3" />,
  text: null,
};

// =====================================================
// COMPONENTES
// =====================================================

function PostPreviewModal({
  post,
  onClose,
  onDelete,
}: {
  post: ScheduledPost;
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl max-w-lg w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className={`p-1.5 rounded-lg text-white ${networkColors[post.network]}`}>
              {networkIcons[post.network]}
            </div>
            <div>
              <div className="font-medium text-white">{post.account_name}</div>
              <div className="text-xs text-gray-400">@{post.account_username}</div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-700 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {/* Mídia */}
          {post.media_urls && post.media_urls.length > 0 && (
            <div className="mb-4">
              {post.media_type === 'carousel' ? (
                <div className="grid grid-cols-2 gap-2">
                  {post.media_urls.map((url, index) => (
                    <img
                      key={index}
                      src={url}
                      alt={`Mídia ${index + 1}`}
                      className="rounded-lg object-cover aspect-square"
                    />
                  ))}
                </div>
              ) : post.media_type === 'video' ? (
                <video
                  src={post.media_urls[0]}
                  controls
                  className="w-full rounded-lg"
                />
              ) : (
                <img
                  src={post.media_urls[0]}
                  alt="Mídia"
                  className="w-full rounded-lg"
                />
              )}
            </div>
          )}

          {/* Caption */}
          {post.caption && (
            <p className="text-gray-300 whitespace-pre-wrap">{post.caption}</p>
          )}

          {/* Info */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-700 text-sm text-gray-400">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {new Date(post.scheduled_for).toLocaleString('pt-BR', {
                dateStyle: 'short',
                timeStyle: 'short',
              })}
            </div>
            <div className={`px-2 py-0.5 rounded-full text-xs ${
              post.status === 'scheduled' ? 'bg-blue-500/20 text-blue-400' :
              post.status === 'published' ? 'bg-green-500/20 text-green-400' :
              post.status === 'failed' ? 'bg-red-500/20 text-red-400' :
              'bg-gray-500/20 text-gray-400'
            }`}>
              {post.status === 'scheduled' ? 'Agendado' :
               post.status === 'published' ? 'Publicado' :
               post.status === 'failed' ? 'Falhou' : 'Rascunho'}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-700">
          <Link
            href={`/admin/social/flow/create?edit=${post.id}`}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            <Edit className="w-4 h-4" />
            Editar
          </Link>
          <button
            onClick={() => {
              onDelete(post.id);
              onClose();
            }}
            className="flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
}

function CalendarCell({
  day,
  onSelectPost,
}: {
  day: CalendarDay;
  onSelectPost: (post: ScheduledPost) => void;
}) {
  const maxVisible = 3;
  const hasMore = day.posts.length > maxVisible;
  const visiblePosts = day.posts.slice(0, maxVisible);

  return (
    <div
      className={`min-h-[120px] border-r border-b border-gray-700 p-2 ${
        !day.isCurrentMonth ? 'bg-gray-800/30' : ''
      } ${day.isToday ? 'bg-blue-900/20' : ''}`}
    >
      <div className={`text-sm font-medium mb-2 ${
        !day.isCurrentMonth ? 'text-gray-600' : day.isToday ? 'text-blue-400' : 'text-gray-400'
      }`}>
        {day.date.getDate()}
      </div>

      <div className="space-y-1">
        {visiblePosts.map((post) => (
          <button
            key={post.id}
            onClick={() => onSelectPost(post)}
            className={`w-full text-left p-1.5 rounded text-xs flex items-center gap-1.5 hover:opacity-80 transition-opacity ${networkColors[post.network]} text-white`}
          >
            {networkIcons[post.network]}
            <span className="truncate flex-1">
              {post.caption?.slice(0, 20) || 'Sem legenda'}
            </span>
            {mediaTypeIcons[post.media_type]}
          </button>
        ))}
        {hasMore && (
          <div className="text-xs text-gray-500 pl-1">
            +{day.posts.length - maxVisible} mais
          </div>
        )}
      </div>
    </div>
  );
}

function ListView({
  posts,
  onSelectPost,
  onDeletePost,
}: {
  posts: ScheduledPost[];
  onSelectPost: (post: ScheduledPost) => void;
  onDeletePost: (id: string) => void;
}) {
  // Agrupar por data
  const groupedPosts = posts.reduce((acc: Record<string, ScheduledPost[]>, post) => {
    const date = new Date(post.scheduled_for).toLocaleDateString('pt-BR');
    if (!acc[date]) acc[date] = [];
    acc[date].push(post);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(groupedPosts).map(([date, dayPosts]) => (
        <div key={date}>
          <h3 className="text-sm font-medium text-gray-400 mb-3">{date}</h3>
          <div className="space-y-2">
            {dayPosts.map((post) => (
              <div
                key={post.id}
                className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors"
              >
                <div className="flex items-start gap-4">
                  {/* Mídia thumbnail */}
                  {post.media_urls && post.media_urls.length > 0 ? (
                    <img
                      src={post.media_urls[0]}
                      alt="Preview"
                      className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                      {mediaTypeIcons[post.media_type] || <ImageIcon className="w-6 h-6 text-gray-500" />}
                    </div>
                  )}

                  {/* Conteúdo */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`p-1 rounded text-white ${networkColors[post.network]}`}>
                        {networkIcons[post.network]}
                      </div>
                      <span className="text-sm text-gray-300">@{post.account_username}</span>
                      <span className="text-xs text-gray-500">•</span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(post.scheduled_for).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    {post.caption && (
                      <p className="text-sm text-gray-300 line-clamp-2">{post.caption}</p>
                    )}
                  </div>

                  {/* Status & Ações */}
                  <div className="flex items-center gap-2">
                    <div className={`px-2 py-1 rounded-full text-xs ${
                      post.status === 'scheduled' ? 'bg-blue-500/20 text-blue-400' :
                      post.status === 'published' ? 'bg-green-500/20 text-green-400' :
                      post.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {post.status === 'scheduled' ? 'Agendado' :
                       post.status === 'published' ? 'Publicado' :
                       post.status === 'failed' ? 'Falhou' : 'Rascunho'}
                    </div>
                    <button
                      onClick={() => onSelectPost(post)}
                      className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <Eye className="w-4 h-4 text-gray-400" />
                    </button>
                    <Link
                      href={`/admin/social/flow/create?edit=${post.id}`}
                      className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4 text-gray-400" />
                    </Link>
                    <button
                      onClick={() => onDeletePost(post.id)}
                      className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {posts.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Nenhum post agendado</h3>
          <p className="text-gray-400 mb-4">
            Agende seu primeiro post para vê-lo aqui
          </p>
          <Link
            href="/admin/social/flow/create"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Criar Post
          </Link>
        </div>
      )}
    </div>
  );
}

// =====================================================
// PÁGINA PRINCIPAL
// =====================================================

export default function SocialFlowCalendarPage() {
  const supabase = createClientComponentClient();
  
  // Estado
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<ScheduledPost | null>(null);
  const [accounts, setAccounts] = useState<NetworkAccount[]>([]);
  const [selectedNetwork, setSelectedNetwork] = useState<string>('all');

  // Gerar dias do calendário
  const generateCalendarDays = useCallback((): CalendarDay[] => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const startDay = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const days: CalendarDay[] = [];
    
    // Dias do mês anterior
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthLastDay - i);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: date.getTime() === today.getTime(),
        posts: getPostsForDate(date),
      });
    }
    
    // Dias do mês atual
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      days.push({
        date,
        isCurrentMonth: true,
        isToday: date.getTime() === today.getTime(),
        posts: getPostsForDate(date),
      });
    }
    
    // Dias do próximo mês para completar 6 semanas
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(year, month + 1, i);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: date.getTime() === today.getTime(),
        posts: getPostsForDate(date),
      });
    }
    
    return days;
  }, [currentDate, posts]);

  // Obter posts para uma data específica
  const getPostsForDate = (date: Date): ScheduledPost[] => {
    return posts.filter((post) => {
      const postDate = new Date(post.scheduled_for);
      return (
        postDate.getDate() === date.getDate() &&
        postDate.getMonth() === date.getMonth() &&
        postDate.getFullYear() === date.getFullYear()
      );
    });
  };

  // Carregar posts agendados
  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/social-flow/scheduled');
      const data = await response.json();

      if (data.success && data.posts) {
        let filteredPosts = data.posts;
        if (selectedNetwork !== 'all') {
          filteredPosts = filteredPosts.filter((p: ScheduledPost) => p.network === selectedNetwork);
        }
        setPosts(filteredPosts);
      }
    } catch (error) {
      console.error('Erro ao carregar posts:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedNetwork]);

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

  // Deletar post
  const deletePost = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este post?')) return;

    try {
      const response = await fetch(`/api/social-flow/scheduled?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setPosts(posts.filter((p) => p.id !== id));
      }
    } catch (error) {
      console.error('Erro ao excluir post:', error);
    }
  };

  // Navegação do calendário
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Efeitos
  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  // Dados do calendário
  const calendarDays = generateCalendarDays();
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  // Redes únicas das contas
  const networks = [...new Set(accounts.map((a) => a.network))];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#101A1E] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-400">Carregando calendário...</p>
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
              <Calendar className="w-7 h-7 text-blue-500" />
              Calendário de Posts
            </h1>
            <p className="text-gray-400">Visualize e gerencie seus posts agendados</p>
          </div>
        </div>

        {/* Controles */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Navegação do mês */}
            <div className="flex items-center gap-2">
              <button
                onClick={goToPreviousMonth}
                className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="min-w-[180px] text-center">
                <h2 className="text-lg font-semibold">
                  {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </h2>
              </div>
              <button
                onClick={goToNextMonth}
                className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <button
              onClick={goToToday}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-sm"
            >
              Hoje
            </button>
          </div>

          <div className="flex items-center gap-4">
            {/* Filtro de rede */}
            <select
              value={selectedNetwork}
              onChange={(e) => setSelectedNetwork(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="all">Todas as redes</option>
              {networks.map((network) => (
                <option key={network} value={network}>
                  {network.charAt(0).toUpperCase() + network.slice(1)}
                </option>
              ))}
            </select>

            {/* Toggle de visualização */}
            <div className="flex items-center bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
              <button
                onClick={() => setView('calendar')}
                className={`px-4 py-2 text-sm transition-colors ${
                  view === 'calendar' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Calendário
              </button>
              <button
                onClick={() => setView('list')}
                className={`px-4 py-2 text-sm transition-colors ${
                  view === 'list' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Lista
              </button>
            </div>

            {/* Botão criar */}
            <Link
              href="/admin/social/flow/create"
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Criar Post
            </Link>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      {view === 'calendar' ? (
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
          {/* Cabeçalho dos dias da semana */}
          <div className="grid grid-cols-7 border-b border-gray-700">
            {weekDays.map((day) => (
              <div
                key={day}
                className="p-3 text-center text-sm font-medium text-gray-400 border-r border-gray-700 last:border-r-0"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Dias do calendário */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, index) => (
              <CalendarCell
                key={index}
                day={day}
                onSelectPost={setSelectedPost}
              />
            ))}
          </div>
        </div>
      ) : (
        <ListView
          posts={posts}
          onSelectPost={setSelectedPost}
          onDeletePost={deletePost}
        />
      )}

      {/* Legenda */}
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <span className="text-sm text-gray-400">Redes:</span>
        {Object.entries(networkColors).map(([network, color]) => (
          <div key={network} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded ${color}`} />
            <span className="text-xs text-gray-400 capitalize">{network}</span>
          </div>
        ))}
      </div>

      {/* Modal de preview */}
      {selectedPost && (
        <PostPreviewModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          onDelete={deletePost}
        />
      )}
    </div>
  );
}
