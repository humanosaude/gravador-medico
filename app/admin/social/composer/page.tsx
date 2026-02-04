'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft,
  ImageIcon, 
  Film, 
  Sparkles, 
  Images,
  Clock,
  Calendar,
  MapPin,
  AtSign,
  Hash,
  MessageSquare,
  Wand2,
  Send,
  Save,
  Eye,
  Upload,
  X,
  Plus,
  Instagram,
  ChevronDown,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

type PostType = 'feed' | 'reel' | 'story' | 'carousel';

interface InstagramAccount {
  id: string;
  username: string;
  profile_picture_url?: string;
}

interface MediaFile {
  id: string;
  file: File;
  preview: string;
  type: 'image' | 'video';
}

export default function ComposerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<InstagramAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<InstagramAccount | null>(null);
  
  // Post data
  const [postType, setPostType] = useState<PostType>('feed');
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [firstComment, setFirstComment] = useState('');
  const [location, setLocation] = useState('');
  const [taggedUsers, setTaggedUsers] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [scheduledFor, setScheduledFor] = useState<string>('');
  const [scheduledTime, setScheduledTime] = useState<string>('18:00');
  
  // UI states
  const [showPreview, setShowPreview] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showAccountPicker, setShowAccountPicker] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const response = await fetch('/api/social/instagram/accounts');
      const data = await response.json();
      if (data.accounts?.length > 0) {
        setAccounts(data.accounts);
        setSelectedAccount(data.accounts[0]);
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newMedia: MediaFile[] = Array.from(files).map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: URL.createObjectURL(file),
      type: file.type.startsWith('video/') ? 'video' : 'image',
    }));

    if (postType === 'carousel') {
      setMediaFiles(prev => [...prev, ...newMedia].slice(0, 10));
    } else {
      setMediaFiles(newMedia.slice(0, 1));
    }
  };

  const removeMedia = (id: string) => {
    setMediaFiles(prev => prev.filter(m => m.id !== id));
  };

  const addTag = () => {
    if (newTag && !taggedUsers.includes(newTag)) {
      setTaggedUsers(prev => [...prev, newTag.replace('@', '')]);
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setTaggedUsers(prev => prev.filter(t => t !== tag));
  };

  const generateCaption = async () => {
    if (!mediaFiles.length) {
      alert('Adicione uma imagem ou vídeo primeiro');
      return;
    }

    setGenerating(true);
    try {
      // TODO: Implement AI caption generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      setCaption('✨ Nova publicação incrível!\n\nConteúdo relevante para seus seguidores.\n\n#marketing #digital');
    } catch (error) {
      console.error('Error generating caption:', error);
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async (status: 'draft' | 'scheduled') => {
    if (!selectedAccount) {
      alert('Selecione uma conta');
      return;
    }

    if (!mediaFiles.length) {
      alert('Adicione pelo menos uma mídia');
      return;
    }

    if (status === 'scheduled' && !scheduledFor) {
      alert('Selecione uma data para agendamento');
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('account_id', selectedAccount.id);
      formData.append('post_type', postType);
      formData.append('caption', caption);
      formData.append('hashtags', hashtags);
      formData.append('first_comment', firstComment);
      formData.append('location', location);
      formData.append('tagged_users', JSON.stringify(taggedUsers));
      formData.append('status', status);
      
      if (scheduledFor) {
        const dateTime = new Date(`${scheduledFor}T${scheduledTime}`);
        formData.append('scheduled_for', dateTime.toISOString());
      }

      mediaFiles.forEach((media, index) => {
        formData.append(`media_${index}`, media.file);
      });

      const response = await fetch('/api/social/instagram/posts', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        router.push('/admin/social/calendar');
      }
    } catch (error) {
      console.error('Error saving post:', error);
    } finally {
      setSaving(false);
    }
  };

  const handlePublishNow = async () => {
    if (!confirm('Publicar agora? O post será publicado imediatamente.')) return;
    setPublishing(true);
    // TODO: Implement immediate publish
    setTimeout(() => {
      setPublishing(false);
      router.push('/admin/social');
    }, 2000);
  };

  const getMaxChars = () => {
    return postType === 'story' ? 125 : 2200;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#101A1E] p-6">
        <Skeleton className="h-10 w-48 mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[600px]" />
          <Skeleton className="h-[600px]" />
        </div>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="min-h-screen bg-[#101A1E] p-6 flex items-center justify-center">
        <Card className="bg-gray-800/50 border-gray-700/50 max-w-md w-full text-center p-8">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Nenhuma conta conectada</h2>
          <p className="text-gray-400 mb-4">
            Você precisa conectar uma conta Instagram Business para criar posts.
          </p>
          <Link href="/admin/social/connect">
            <Button className="bg-purple-600 hover:bg-purple-700 text-white">
              Conectar conta Instagram
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#101A1E] p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/social">
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Criar Post</h1>
            <p className="text-sm text-gray-400">Crie e agende seu conteúdo</p>
          </div>
        </div>

        {/* Account Picker */}
        <div className="relative">
          <button
            onClick={() => setShowAccountPicker(!showAccountPicker)}
            className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg border border-gray-700 hover:bg-gray-700/50 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-gray-700 overflow-hidden">
              {selectedAccount?.profile_picture_url ? (
                <img src={selectedAccount.profile_picture_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <Instagram className="w-full h-full p-1.5 text-gray-500" />
              )}
            </div>
            <span className="text-white text-sm">@{selectedAccount?.username}</span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>

          {showAccountPicker && (
            <div className="absolute top-full right-0 mt-2 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
              {accounts.map(account => (
                <button
                  key={account.id}
                  onClick={() => {
                    setSelectedAccount(account);
                    setShowAccountPicker(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-700/50 transition-colors ${
                    selectedAccount?.id === account.id ? 'bg-purple-600/20' : ''
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden">
                    {account.profile_picture_url ? (
                      <img src={account.profile_picture_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Instagram className="w-full h-full p-2 text-gray-500" />
                    )}
                  </div>
                  <span className="text-white">@{account.username}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Editor */}
        <div className="space-y-6">
          {/* Post Type */}
          <Card className="bg-gray-800/50 border-gray-700/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm">Tipo de Post</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { type: 'feed', label: 'Feed', icon: ImageIcon, color: 'blue' },
                  { type: 'reel', label: 'Reel', icon: Film, color: 'red' },
                  { type: 'story', label: 'Story', icon: Sparkles, color: 'green' },
                  { type: 'carousel', label: 'Carrossel', icon: Images, color: 'purple' },
                ].map(item => {
                  const Icon = item.icon;
                  const isSelected = postType === item.type;
                  return (
                    <button
                      key={item.type}
                      onClick={() => {
                        setPostType(item.type as PostType);
                        if (item.type !== 'carousel') {
                          setMediaFiles(prev => prev.slice(0, 1));
                        }
                      }}
                      className={`flex flex-col items-center gap-2 p-4 rounded-lg transition-all ${
                        isSelected
                          ? `bg-${item.color}-600/20 ring-2 ring-${item.color}-500`
                          : 'bg-gray-700/50 hover:bg-gray-700'
                      }`}
                    >
                      <Icon className={`w-6 h-6 ${isSelected ? `text-${item.color}-400` : 'text-gray-400'}`} />
                      <span className={`text-sm ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Media Upload */}
          <Card className="bg-gray-800/50 border-gray-700/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white text-sm">Mídia</CardTitle>
                {postType === 'carousel' && (
                  <span className="text-xs text-gray-500">{mediaFiles.length}/10</span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {mediaFiles.length > 0 ? (
                <div className={`grid gap-2 ${postType === 'carousel' ? 'grid-cols-3' : 'grid-cols-1'}`}>
                  {mediaFiles.map(media => (
                    <div key={media.id} className="relative aspect-square bg-gray-700 rounded-lg overflow-hidden group">
                      {media.type === 'video' ? (
                        <video src={media.preview} className="w-full h-full object-cover" />
                      ) : (
                        <img src={media.preview} alt="" className="w-full h-full object-cover" />
                      )}
                      <button
                        onClick={() => removeMedia(media.id)}
                        className="absolute top-2 right-2 w-6 h-6 bg-black/70 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  ))}
                  {postType === 'carousel' && mediaFiles.length < 10 && (
                    <label className="aspect-square bg-gray-700/50 rounded-lg border-2 border-dashed border-gray-600 flex items-center justify-center cursor-pointer hover:border-purple-500 transition-colors">
                      <input
                        type="file"
                        accept="image/*,video/*"
                        multiple
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <Plus className="w-8 h-8 text-gray-500" />
                    </label>
                  )}
                </div>
              ) : (
                <label className="block aspect-video bg-gray-700/30 rounded-lg border-2 border-dashed border-gray-600 cursor-pointer hover:border-purple-500 transition-colors">
                  <input
                    type="file"
                    accept={postType === 'reel' ? 'video/*' : 'image/*,video/*'}
                    multiple={postType === 'carousel'}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="w-full h-full flex flex-col items-center justify-center">
                    <Upload className="w-12 h-12 text-gray-500 mb-3" />
                    <p className="text-gray-400 mb-1">Arraste ou clique para adicionar</p>
                    <p className="text-xs text-gray-600">
                      {postType === 'reel' ? 'Apenas vídeo' : 'Imagem ou vídeo'}
                      {postType === 'carousel' && ' (até 10)'}
                    </p>
                  </div>
                </label>
              )}
            </CardContent>
          </Card>

          {/* Caption */}
          <Card className="bg-gray-800/50 border-gray-700/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white text-sm">Legenda</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={generateCaption}
                  disabled={generating}
                  className="text-purple-400 hover:text-purple-300"
                >
                  {generating ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Wand2 className="w-4 h-4 mr-1" />
                  )}
                  Gerar com IA
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Escreva sua legenda..."
                maxLength={getMaxChars()}
                className="w-full h-32 bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-500">
                  {caption.length}/{getMaxChars()} caracteres
                </span>
                <div className="flex items-center gap-2">
                  <button className="p-1.5 hover:bg-gray-700 rounded transition-colors">
                    <Hash className="w-4 h-4 text-gray-400" />
                  </button>
                  <button className="p-1.5 hover:bg-gray-700 rounded transition-colors">
                    <AtSign className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Options */}
          <Card className="bg-gray-800/50 border-gray-700/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm">Opções adicionais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Hashtags */}
              <div>
                <label className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                  <Hash className="w-4 h-4" />
                  Hashtags (primeiro comentário)
                </label>
                <Input
                  value={hashtags}
                  onChange={(e) => setHashtags(e.target.value)}
                  placeholder="#marketing #digital #socialmedia"
                  className="bg-gray-700/50 border-gray-600 text-white"
                />
              </div>

              {/* First Comment */}
              <div>
                <label className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                  <MessageSquare className="w-4 h-4" />
                  Primeiro comentário
                </label>
                <Input
                  value={firstComment}
                  onChange={(e) => setFirstComment(e.target.value)}
                  placeholder="Comentário automático após publicar"
                  className="bg-gray-700/50 border-gray-600 text-white"
                />
              </div>

              {/* Location */}
              <div>
                <label className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                  <MapPin className="w-4 h-4" />
                  Localização
                </label>
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Adicionar localização"
                  className="bg-gray-700/50 border-gray-600 text-white"
                />
              </div>

              {/* Tagged Users */}
              <div>
                <label className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                  <AtSign className="w-4 h-4" />
                  Marcar pessoas
                </label>
                <div className="flex gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addTag()}
                    placeholder="@username"
                    className="bg-gray-700/50 border-gray-600 text-white"
                  />
                  <Button onClick={addTag} variant="outline" className="border-gray-600">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {taggedUsers.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {taggedUsers.map(tag => (
                      <Badge key={tag} className="bg-purple-600/20 text-purple-400 flex items-center gap-1">
                        @{tag}
                        <button onClick={() => removeTag(tag)}>
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Preview & Schedule */}
        <div className="space-y-6">
          {/* Preview */}
          <Card className="bg-gray-800/50 border-gray-700/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm">Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-900 rounded-xl overflow-hidden max-w-sm mx-auto">
                {/* Instagram Header */}
                <div className="flex items-center gap-3 p-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 p-0.5">
                    <div className="w-full h-full rounded-full bg-gray-900 flex items-center justify-center overflow-hidden">
                      {selectedAccount?.profile_picture_url ? (
                        <img src={selectedAccount.profile_picture_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Instagram className="w-4 h-4 text-gray-500" />
                      )}
                    </div>
                  </div>
                  <span className="text-white text-sm font-medium">{selectedAccount?.username}</span>
                </div>

                {/* Media */}
                <div className="aspect-square bg-gray-800">
                  {mediaFiles.length > 0 ? (
                    mediaFiles[0].type === 'video' ? (
                      <video src={mediaFiles[0].preview} className="w-full h-full object-cover" controls />
                    ) : (
                      <img src={mediaFiles[0].preview} alt="" className="w-full h-full object-cover" />
                    )
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-16 h-16 text-gray-700" />
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="p-3 space-y-2">
                  <div className="flex items-center gap-4">
                    <button className="text-white"><ImageIcon className="w-6 h-6" /></button>
                    <button className="text-white"><MessageSquare className="w-6 h-6" /></button>
                    <button className="text-white"><Send className="w-6 h-6" /></button>
                  </div>
                  
                  {/* Caption Preview */}
                  {caption && (
                    <p className="text-white text-sm">
                      <span className="font-medium">{selectedAccount?.username}</span>{' '}
                      {caption.slice(0, 100)}
                      {caption.length > 100 && '...'}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Schedule */}
          <Card className="bg-gray-800/50 border-gray-700/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Agendamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Data</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type="date"
                      value={scheduledFor}
                      onChange={(e) => setScheduledFor(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="pl-10 bg-gray-700/50 border-gray-600 text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Horário</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="pl-10 bg-gray-700/50 border-gray-600 text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Best Time Suggestion */}
              <div className="p-3 bg-purple-600/10 rounded-lg border border-purple-600/30">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span className="text-sm text-purple-400 font-medium">Melhor horário sugerido</span>
                </div>
                <p className="text-xs text-gray-400">
                  Seus seguidores estão mais ativos às <strong className="text-white">18:00</strong> nas quartas-feiras
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card className="bg-gray-800/50 border-gray-700/50">
            <CardContent className="p-4 space-y-3">
              <Button
                onClick={() => handleSave('scheduled')}
                disabled={saving || !mediaFiles.length || !scheduledFor}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Calendar className="w-4 h-4 mr-2" />
                )}
                Agendar publicação
              </Button>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => handleSave('draft')}
                  disabled={saving || !mediaFiles.length}
                  variant="outline"
                  className="border-gray-600 text-gray-300 hover:bg-gray-700/50"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Salvar rascunho
                </Button>
                <Button
                  onClick={handlePublishNow}
                  disabled={publishing || !mediaFiles.length}
                  variant="outline"
                  className="border-green-600 text-green-400 hover:bg-green-600/20"
                >
                  {publishing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Publicar agora
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
