'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
  Youtube,
  Image as ImageIcon,
  Video,
  X,
  Plus,
  Calendar,
  Clock,
  Sparkles,
  Hash,
  Send,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle,
  Upload,
  Trash2,
  GripVertical,
  Eye,
} from 'lucide-react';

interface Account {
  id: string;
  network: string;
  account_name: string;
  account_username: string;
  profile_picture_url?: string;
  is_active: boolean;
}

interface MediaItem {
  id: string;
  file: File;
  preview: string;
  type: 'image' | 'video';
  uploading?: boolean;
  uploaded?: boolean;
  url?: string;
}

const networkIcons: Record<string, any> = {
  instagram: Instagram,
  facebook: Facebook,
  twitter: Twitter,
  linkedin: Linkedin,
  youtube: Youtube,
  tiktok: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
    </svg>
  ),
  pinterest: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z" />
    </svg>
  ),
};

const networkColors: Record<string, string> = {
  instagram: 'from-purple-600 via-pink-600 to-orange-500',
  facebook: 'from-blue-600 to-blue-700',
  twitter: 'from-sky-400 to-sky-500',
  linkedin: 'from-blue-700 to-blue-800',
  youtube: 'from-red-600 to-red-700',
  tiktok: 'from-gray-900 to-black',
  pinterest: 'from-red-600 to-red-700',
};

const networkLimits: Record<string, { caption: number; hashtags: number; media: number }> = {
  instagram: { caption: 2200, hashtags: 30, media: 10 },
  facebook: { caption: 63206, hashtags: 30, media: 10 },
  twitter: { caption: 280, hashtags: 10, media: 4 },
  linkedin: { caption: 3000, hashtags: 30, media: 20 },
  youtube: { caption: 5000, hashtags: 15, media: 1 },
  tiktok: { caption: 2200, hashtags: 100, media: 1 },
  pinterest: { caption: 500, hashtags: 20, media: 1 },
};

export default function CreatePostPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [hashtagInput, setHashtagInput] = useState('');
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [isScheduled, setIsScheduled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [generatingCaption, setGeneratingCaption] = useState(false);
  const [generatingHashtags, setGeneratingHashtags] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const response = await fetch('/api/social-flow/accounts');
      if (response.ok) {
        const data = await response.json();
        setAccounts(data.accounts || []);
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAccount = (accountId: string) => {
    setSelectedAccounts((prev) =>
      prev.includes(accountId)
        ? prev.filter((id) => id !== accountId)
        : [...prev, accountId]
    );
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newMedia: MediaItem[] = [];
    
    Array.from(files).forEach((file) => {
      const isVideo = file.type.startsWith('video/');
      const preview = URL.createObjectURL(file);
      
      newMedia.push({
        id: Math.random().toString(36).substr(2, 9),
        file,
        preview,
        type: isVideo ? 'video' : 'image',
      });
    });

    setMedia((prev) => [...prev, ...newMedia]);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeMedia = (id: string) => {
    setMedia((prev) => {
      const item = prev.find((m) => m.id === id);
      if (item) {
        URL.revokeObjectURL(item.preview);
      }
      return prev.filter((m) => m.id !== id);
    });
  };

  const addHashtag = () => {
    const tag = hashtagInput.trim().replace(/^#/, '');
    if (tag && !hashtags.includes(tag)) {
      setHashtags([...hashtags, tag]);
    }
    setHashtagInput('');
  };

  const removeHashtag = (tag: string) => {
    setHashtags(hashtags.filter((t) => t !== tag));
  };

  const generateCaption = async () => {
    if (!media.length) {
      setError('Adicione uma imagem para gerar legenda');
      return;
    }

    setGeneratingCaption(true);
    setError(null);

    try {
      const response = await fetch('/api/social-flow/ai/caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: media[0].preview,
          tone: 'professional',
          language: 'pt-BR',
        }),
      });

      const data = await response.json();
      
      if (data.caption) {
        setCaption(data.caption);
      } else {
        throw new Error(data.error || 'Falha ao gerar legenda');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGeneratingCaption(false);
    }
  };

  const generateHashtags = async () => {
    setGeneratingHashtags(true);
    setError(null);

    try {
      const response = await fetch('/api/social-flow/ai/hashtags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: caption || 'general content',
          count: 15,
          language: 'pt-BR',
        }),
      });

      const data = await response.json();
      
      if (data.hashtags) {
        const newTags = data.hashtags
          .map((h: any) => (typeof h === 'string' ? h : h.tag).replace(/^#/, ''))
          .filter((t: string) => !hashtags.includes(t));
        setHashtags([...hashtags, ...newTags.slice(0, 15)]);
      } else {
        throw new Error(data.error || 'Falha ao gerar hashtags');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGeneratingHashtags(false);
    }
  };

  const saveDraft = async () => {
    if (!selectedAccounts.length) {
      setError('Selecione pelo menos uma conta');
      return;
    }

    setSavingDraft(true);
    setError(null);

    try {
      const response = await fetch('/api/social-flow/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: selectedAccounts[0],
          content: caption,
          hashtags,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccess('Rascunho salvo com sucesso!');
        setTimeout(() => router.push('/admin/social/flow'), 2000);
      } else {
        throw new Error(data.error || 'Falha ao salvar rascunho');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingDraft(false);
    }
  };

  const publishPost = async () => {
    if (!selectedAccounts.length) {
      setError('Selecione pelo menos uma conta');
      return;
    }

    if (!caption && !media.length) {
      setError('Adicione conteúdo ou mídia ao post');
      return;
    }

    setPublishing(true);
    setError(null);

    try {
      // TODO: Upload de mídia primeiro
      const mediaUrls = media.map((m) => m.preview); // Temporário

      const response = await fetch('/api/social-flow/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountIds: selectedAccounts,
          caption,
          hashtags,
          mediaUrls,
          schedule: isScheduled ? `${scheduleDate}T${scheduleTime}` : undefined,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccess(isScheduled ? 'Post agendado com sucesso!' : 'Post publicado com sucesso!');
        setTimeout(() => router.push('/admin/social/flow'), 2000);
      } else {
        throw new Error(data.error || 'Falha ao publicar');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPublishing(false);
    }
  };

  const getMinLimit = () => {
    const selected = accounts.filter((a) => selectedAccounts.includes(a.id));
    if (!selected.length) return networkLimits.instagram;
    
    return {
      caption: Math.min(...selected.map((a) => networkLimits[a.network]?.caption || 2200)),
      hashtags: Math.min(...selected.map((a) => networkLimits[a.network]?.hashtags || 30)),
      media: Math.min(...selected.map((a) => networkLimits[a.network]?.media || 10)),
    };
  };

  const limits = getMinLimit();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#101A1E] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#101A1E]">
      {/* Header */}
      <div className="border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-white">Criar Post</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={saveDraft}
              disabled={savingDraft}
              className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg px-4 py-2 text-white transition-colors disabled:opacity-50"
            >
              {savingDraft ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar Rascunho
            </button>
            
            <button
              onClick={publishPost}
              disabled={publishing || !selectedAccounts.length}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-lg px-6 py-2 text-white font-medium transition-all disabled:opacity-50"
            >
              {publishing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isScheduled ? (
                <Calendar className="w-4 h-4" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {isScheduled ? 'Agendar' : 'Publicar'}
            </button>
          </div>
        </div>
      </div>

      {/* Mensagens */}
      {error && (
        <div className="mx-6 mt-4 bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <span className="text-red-400">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-4 h-4 text-red-400" />
          </button>
        </div>
      )}
      
      {success && (
        <div className="mx-6 mt-4 bg-green-500/10 border border-green-500/30 rounded-lg p-3 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-400" />
          <span className="text-green-400">{success}</span>
        </div>
      )}

      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conteúdo Principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Seleção de Contas */}
          <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-4">
            <h2 className="text-white font-medium mb-4">Publicar em</h2>
            {accounts.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-gray-400 text-sm mb-2">Nenhuma conta conectada</p>
                <button
                  onClick={() => router.push('/admin/social/flow/connect')}
                  className="text-blue-400 text-sm hover:text-blue-300"
                >
                  Conectar conta
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                {accounts.map((account) => {
                  const NetworkIcon = networkIcons[account.network] || Instagram;
                  const gradient = networkColors[account.network];
                  const isSelected = selectedAccounts.includes(account.id);
                  
                  return (
                    <button
                      key={account.id}
                      onClick={() => toggleAccount(account.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                        {account.profile_picture_url ? (
                          <img
                            src={account.profile_picture_url}
                            alt=""
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <NetworkIcon className="w-4 h-4 text-white" />
                        )}
                      </div>
                      <span className="text-white text-sm">{account.account_name}</span>
                      {isSelected && <CheckCircle className="w-4 h-4 text-blue-400" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Mídia */}
          <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-medium">Mídia</h2>
              <span className="text-gray-400 text-sm">
                {media.length}/{limits.media} arquivos
              </span>
            </div>
            
            {media.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mb-4">
                {media.map((item, index) => (
                  <div
                    key={item.id}
                    className="relative aspect-square rounded-lg overflow-hidden bg-gray-900 group"
                  >
                    {item.type === 'video' ? (
                      <video
                        src={item.preview}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img
                        src={item.preview}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        onClick={() => removeMedia(item.id)}
                        className="bg-red-500 rounded-full p-2 hover:bg-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-white" />
                      </button>
                    </div>
                    <div className="absolute top-2 left-2">
                      <span className="bg-black/70 text-white text-xs px-2 py-1 rounded">
                        {index + 1}
                      </span>
                    </div>
                    {item.type === 'video' && (
                      <div className="absolute top-2 right-2">
                        <Video className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {media.length < limits.media && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-600 rounded-lg p-8 flex flex-col items-center justify-center hover:border-gray-500 hover:bg-gray-800/30 transition-all"
              >
                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                <p className="text-gray-400 text-sm">Clique ou arraste para adicionar</p>
                <p className="text-gray-500 text-xs mt-1">JPG, PNG, GIF, MP4 (max 100MB)</p>
              </button>
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Legenda */}
          <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-medium">Legenda</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={generateCaption}
                  disabled={generatingCaption}
                  className="flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300 transition-colors disabled:opacity-50"
                >
                  {generatingCaption ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  Gerar com IA
                </button>
                <span className={`text-xs ${caption.length > limits.caption ? 'text-red-400' : 'text-gray-400'}`}>
                  {caption.length}/{limits.caption}
                </span>
              </div>
            </div>
            
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Escreva sua legenda aqui..."
              className="w-full bg-gray-900/50 border border-gray-700 rounded-lg p-3 text-white placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[150px]"
            />
          </div>

          {/* Hashtags */}
          <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-medium">Hashtags</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={generateHashtags}
                  disabled={generatingHashtags}
                  className="flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300 transition-colors disabled:opacity-50"
                >
                  {generatingHashtags ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  Sugerir
                </button>
                <span className="text-xs text-gray-400">
                  {hashtags.length}/{limits.hashtags}
                </span>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2 mb-3">
              {hashtags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full text-sm"
                >
                  #{tag}
                  <button onClick={() => removeHashtag(tag)}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={hashtagInput}
                  onChange={(e) => setHashtagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addHashtag()}
                  placeholder="Adicionar hashtag"
                  className="w-full bg-gray-900/50 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={addHashtag}
                className="bg-gray-700 hover:bg-gray-600 rounded-lg px-4 py-2 text-white transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Agendamento */}
          <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-medium">Agendamento</h2>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isScheduled}
                  onChange={(e) => setIsScheduled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
              </label>
            </div>
            
            {isScheduled && (
              <div className="space-y-3">
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Data</label>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-sm mb-1 block">Horário</label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Preview */}
          <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-4">
            <h2 className="text-white font-medium mb-4 flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Preview
            </h2>
            
            <div className="bg-gray-900 rounded-lg overflow-hidden">
              {/* Mock Instagram Post */}
              <div className="p-3 flex items-center gap-2 border-b border-gray-800">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-pink-600" />
                <span className="text-white text-sm font-medium">username</span>
              </div>
              
              {media.length > 0 ? (
                <div className="aspect-square bg-gray-800">
                  {media[0].type === 'video' ? (
                    <video
                      src={media[0].preview}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src={media[0].preview}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              ) : (
                <div className="aspect-square bg-gray-800 flex items-center justify-center">
                  <ImageIcon className="w-12 h-12 text-gray-600" />
                </div>
              )}
              
              <div className="p-3">
                <p className="text-white text-sm line-clamp-3">
                  {caption || 'Sua legenda aparecerá aqui...'}
                </p>
                {hashtags.length > 0 && (
                  <p className="text-blue-400 text-sm mt-1">
                    {hashtags.slice(0, 5).map((t) => `#${t}`).join(' ')}
                    {hashtags.length > 5 && '...'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
