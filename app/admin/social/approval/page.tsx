'use client';

import { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  MessageSquare, 
  Eye,
  Send,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Film,
  Layers,
  User,
  Calendar,
  Edit3,
  AlertTriangle
} from 'lucide-react';

interface PendingPost {
  id: string;
  account: {
    username: string;
    profile_picture_url: string;
  };
  content_type: string;
  caption: string;
  hashtags: string[];
  media_urls: string[];
  scheduled_for: string;
  created_by: {
    name: string;
    email: string;
  };
  created_at: string;
  status: 'pending_approval' | 'approved' | 'rejected' | 'changes_requested';
  comments: Array<{
    id: string;
    user: string;
    message: string;
    created_at: string;
  }>;
}

export default function ApprovalPage() {
  const [posts, setPosts] = useState<PendingPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<PendingPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending_approval' | 'changes_requested'>('pending_approval');
  const [commentText, setCommentText] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);

  useEffect(() => {
    fetchPendingPosts();
  }, [filter]);

  const fetchPendingPosts = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/social/instagram/approval?status=${filter}`);
      const data = await response.json();
      setPosts(data.posts || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (postId: string, action: 'approve' | 'reject' | 'request_changes', comment?: string) => {
    setActionLoading(true);
    try {
      const response = await fetch('/api/social/instagram/approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, action, comment }),
      });

      if (response.ok) {
        await fetchPendingPosts();
        setSelectedPost(null);
        setCommentText('');
      }
    } catch (error) {
      console.error('Error performing action:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const addComment = async (postId: string) => {
    if (!commentText.trim()) return;

    try {
      await fetch('/api/social/instagram/approval/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, message: commentText }),
      });

      setCommentText('');
      await fetchPendingPosts();
      
      // Atualizar post selecionado
      if (selectedPost) {
        const updated = posts.find(p => p.id === postId);
        if (updated) setSelectedPost(updated);
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const getContentIcon = (type: string) => {
    switch (type) {
      case 'video':
      case 'reels':
        return <Film className="w-4 h-4" />;
      case 'carousel':
        return <Layers className="w-4 h-4" />;
      default:
        return <ImageIcon className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">
            <CheckCircle className="w-3 h-3" /> Aprovado
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs">
            <XCircle className="w-3 h-3" /> Rejeitado
          </span>
        );
      case 'changes_requested':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs">
            <AlertTriangle className="w-3 h-3" /> Alterações
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs">
            <Clock className="w-3 h-3" /> Pendente
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Fluxo de Aprovação</h1>
            <p className="text-gray-400">Revise e aprove posts antes da publicação</p>
          </div>

          {/* Filtros */}
          <div className="flex gap-2">
            {[
              { value: 'pending_approval', label: 'Pendentes' },
              { value: 'changes_requested', label: 'Alterações' },
              { value: 'all', label: 'Todos' },
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value as any)}
                className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                  filter === f.value
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de Posts */}
          <div className="lg:col-span-2 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
              </div>
            ) : posts.length === 0 ? (
              <div className="bg-gray-800/50 rounded-xl p-12 text-center">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                <h3 className="text-lg font-medium mb-2">Nenhum post pendente</h3>
                <p className="text-gray-400">Todos os posts foram revisados</p>
              </div>
            ) : (
              posts.map((post) => (
                <div
                  key={post.id}
                  onClick={() => setSelectedPost(post)}
                  className={`bg-gray-800/50 rounded-xl p-4 cursor-pointer transition-all hover:bg-gray-800 border-2 ${
                    selectedPost?.id === post.id
                      ? 'border-purple-500'
                      : 'border-transparent'
                  }`}
                >
                  <div className="flex gap-4">
                    {/* Preview da mídia */}
                    <div className="w-24 h-24 bg-gray-700 rounded-lg overflow-hidden flex-shrink-0">
                      {post.media_urls?.[0] ? (
                        <img
                          src={post.media_urls[0]}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500">
                          <ImageIcon className="w-8 h-8" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm text-gray-400">@{post.account.username}</span>
                        {getContentIcon(post.content_type)}
                        {getStatusBadge(post.status)}
                      </div>

                      <p className="text-sm text-gray-300 line-clamp-2 mb-2">
                        {post.caption || 'Sem legenda'}
                      </p>

                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(post.scheduled_for).toLocaleString('pt-BR')}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {post.created_by?.name || 'Usuário'}
                        </span>
                        {post.comments?.length > 0 && (
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            {post.comments.length}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Painel de Detalhes */}
          <div className="lg:col-span-1">
            {selectedPost ? (
              <div className="bg-gray-800/50 rounded-xl overflow-hidden sticky top-6">
                {/* Preview da mídia */}
                <div className="relative aspect-square bg-gray-900">
                  {selectedPost.media_urls?.length > 0 ? (
                    <>
                      <img
                        src={selectedPost.media_urls[previewIndex]}
                        alt="Preview"
                        className="w-full h-full object-contain"
                      />
                      
                      {selectedPost.media_urls.length > 1 && (
                        <>
                          <button
                            onClick={() => setPreviewIndex(Math.max(0, previewIndex - 1))}
                            className="absolute left-2 top-1/2 -translate-y-1/2 p-1 bg-black/50 rounded-full"
                            disabled={previewIndex === 0}
                          >
                            <ChevronLeft className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => setPreviewIndex(Math.min(selectedPost.media_urls.length - 1, previewIndex + 1))}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 bg-black/50 rounded-full"
                            disabled={previewIndex === selectedPost.media_urls.length - 1}
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                            {selectedPost.media_urls.map((_, i) => (
                              <div
                                key={i}
                                className={`w-2 h-2 rounded-full ${
                                  i === previewIndex ? 'bg-white' : 'bg-white/30'
                                }`}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500">
                      <ImageIcon className="w-16 h-16" />
                    </div>
                  )}
                </div>

                <div className="p-4 space-y-4">
                  {/* Caption */}
                  <div>
                    <h4 className="text-xs text-gray-500 uppercase mb-2">Legenda</h4>
                    <p className="text-sm whitespace-pre-wrap">
                      {selectedPost.caption || 'Sem legenda'}
                    </p>
                  </div>

                  {/* Hashtags */}
                  {selectedPost.hashtags?.length > 0 && (
                    <div>
                      <h4 className="text-xs text-gray-500 uppercase mb-2">Hashtags</h4>
                      <div className="flex flex-wrap gap-1">
                        {selectedPost.hashtags.map((tag, i) => (
                          <span
                            key={i}
                            className="text-xs bg-gray-700 px-2 py-1 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Agendamento */}
                  <div>
                    <h4 className="text-xs text-gray-500 uppercase mb-2">Agendado para</h4>
                    <p className="text-sm">
                      {new Date(selectedPost.scheduled_for).toLocaleString('pt-BR', {
                        weekday: 'long',
                        day: '2-digit',
                        month: 'long',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>

                  {/* Comentários */}
                  {selectedPost.comments?.length > 0 && (
                    <div>
                      <h4 className="text-xs text-gray-500 uppercase mb-2">
                        Comentários ({selectedPost.comments.length})
                      </h4>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {selectedPost.comments.map((comment) => (
                          <div key={comment.id} className="text-sm bg-gray-700/50 p-2 rounded">
                            <p className="text-xs text-gray-400 mb-1">{comment.user}</p>
                            <p>{comment.message}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Input de comentário */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Adicionar comentário..."
                      className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      onClick={() => addComment(selectedPost.id)}
                      className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Ações */}
                  {selectedPost.status === 'pending_approval' && (
                    <div className="flex gap-2 pt-4 border-t border-gray-700">
                      <button
                        onClick={() => handleAction(selectedPost.id, 'reject')}
                        disabled={actionLoading}
                        className="flex-1 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors flex items-center justify-center gap-2"
                      >
                        <XCircle className="w-4 h-4" />
                        Rejeitar
                      </button>
                      <button
                        onClick={() => handleAction(selectedPost.id, 'request_changes', commentText)}
                        disabled={actionLoading}
                        className="flex-1 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition-colors flex items-center justify-center gap-2"
                      >
                        <Edit3 className="w-4 h-4" />
                        Alterações
                      </button>
                      <button
                        onClick={() => handleAction(selectedPost.id, 'approve')}
                        disabled={actionLoading}
                        className="flex-1 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Aprovar
                      </button>
                    </div>
                  )}

                  {selectedPost.status === 'changes_requested' && (
                    <div className="flex gap-2 pt-4 border-t border-gray-700">
                      <button
                        onClick={() => handleAction(selectedPost.id, 'approve')}
                        disabled={actionLoading}
                        className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Aprovar Alterações
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-gray-800/50 rounded-xl p-8 text-center">
                <Eye className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                <h3 className="text-lg font-medium mb-2">Selecione um post</h3>
                <p className="text-gray-400 text-sm">
                  Clique em um post para ver os detalhes e realizar ações
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
