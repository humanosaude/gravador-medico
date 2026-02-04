'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import {
  ArrowLeft,
  Image as ImageIcon,
  Video,
  Upload,
  FolderOpen,
  Grid,
  List,
  Search,
  Filter,
  Trash2,
  Download,
  Copy,
  Check,
  X,
  Loader2,
  Plus,
  ChevronDown,
  Clock,
  HardDrive,
  Eye,
  MoreVertical,
  FolderPlus,
  Tag,
} from 'lucide-react';

// =====================================================
// TIPOS
// =====================================================

interface MediaItem {
  id: string;
  file_name: string;
  file_url: string;
  file_type: 'image' | 'video';
  file_size?: number;
  mime_type?: string;
  width?: number;
  height?: number;
  duration_seconds?: number;
  thumbnail_url?: string;
  folder?: string;
  tags?: string[];
  alt_text?: string;
  created_at: string;
}

interface Folder {
  name: string;
  count: number;
}

// =====================================================
// COMPONENTES
// =====================================================

function MediaCard({
  item,
  isSelected,
  onSelect,
  onDelete,
  onView,
}: {
  item: MediaItem;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onView: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const copyUrl = async () => {
    await navigator.clipboard.writeText(item.file_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    setShowMenu(false);
  };

  return (
    <div
      className={`group relative bg-gray-800/50 border rounded-lg overflow-hidden transition-all ${
        isSelected ? 'border-blue-500 ring-2 ring-blue-500/30' : 'border-gray-700 hover:border-gray-600'
      }`}
    >
      {/* Preview */}
      <div
        className="relative aspect-square bg-gray-900 cursor-pointer"
        onClick={onSelect}
      >
        {item.file_type === 'video' ? (
          <>
            {item.thumbnail_url ? (
              <img
                src={item.thumbnail_url}
                alt={item.file_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <video
                src={item.file_url}
                className="w-full h-full object-cover"
                muted
              />
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 bg-black/60 rounded-full flex items-center justify-center">
                <Video className="w-6 h-6" />
              </div>
            </div>
            {item.duration_seconds && (
              <div className="absolute bottom-2 right-2 bg-black/70 px-2 py-0.5 rounded text-xs">
                {Math.floor(item.duration_seconds / 60)}:{String(item.duration_seconds % 60).padStart(2, '0')}
              </div>
            )}
          </>
        ) : (
          <img
            src={item.file_url}
            alt={item.file_name}
            className="w-full h-full object-cover"
          />
        )}

        {/* Checkbox de seleção */}
        <div
          className={`absolute top-2 left-2 w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
            isSelected
              ? 'bg-blue-500 border-blue-500'
              : 'border-white/50 group-hover:border-white bg-black/30'
          }`}
        >
          {isSelected && <Check className="w-4 h-4" />}
        </div>

        {/* Overlay de ações */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onView();
            }}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
            title="Visualizar"
          >
            <Eye className="w-5 h-5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              window.open(item.file_url, '_blank');
            }}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
            title="Download"
          >
            <Download className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{item.file_name}</p>
            <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
              <span>{formatFileSize(item.file_size)}</span>
              {item.width && item.height && (
                <>
                  <span>•</span>
                  <span>{item.width}×{item.height}</span>
                </>
              )}
            </div>
          </div>

          {/* Menu */}
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
                    onClick={copyUrl}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-600 transition-colors flex items-center gap-2"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copiado!' : 'Copiar URL'}
                  </button>
                  <button
                    onClick={() => {
                      window.open(item.file_url, '_blank');
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-600 transition-colors flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download
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

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {item.tags.slice(0, 2).map((tag, index) => (
              <span
                key={index}
                className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded"
              >
                {tag}
              </span>
            ))}
            {item.tags.length > 2 && (
              <span className="text-xs text-gray-500">+{item.tags.length - 2}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MediaPreviewModal({
  item,
  onClose,
}: {
  item: MediaItem;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 bg-gray-800 hover:bg-gray-700 rounded-full transition-colors"
      >
        <X className="w-6 h-6" />
      </button>

      <div className="max-w-4xl max-h-[80vh] flex flex-col">
        {item.file_type === 'video' ? (
          <video
            src={item.file_url}
            controls
            autoPlay
            className="max-h-[70vh] rounded-lg"
          />
        ) : (
          <img
            src={item.file_url}
            alt={item.file_name}
            className="max-h-[70vh] object-contain rounded-lg"
          />
        )}

        <div className="mt-4 text-center">
          <p className="font-medium">{item.file_name}</p>
          <p className="text-sm text-gray-400 mt-1">
            {item.width && item.height && `${item.width}×${item.height} • `}
            {item.file_size && `${(item.file_size / (1024 * 1024)).toFixed(2)} MB`}
          </p>
        </div>
      </div>
    </div>
  );
}

function UploadArea({
  onUpload,
  uploading,
}: {
  onUpload: (files: FileList) => void;
  uploading: boolean;
}) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUpload(e.dataTransfer.files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(e.target.files);
    }
  };

  return (
    <div
      className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
        dragActive
          ? 'border-blue-500 bg-blue-500/10'
          : 'border-gray-700 hover:border-gray-600'
      }`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        onChange={handleChange}
        className="hidden"
      />

      {uploading ? (
        <div className="flex flex-col items-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
          <p className="text-gray-300">Enviando arquivos...</p>
        </div>
      ) : (
        <>
          <Upload className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-300 mb-2">
            Arraste arquivos aqui ou{' '}
            <button
              onClick={() => inputRef.current?.click()}
              className="text-blue-400 hover:underline"
            >
              clique para selecionar
            </button>
          </p>
          <p className="text-sm text-gray-500">
            Imagens (JPG, PNG, GIF) e Vídeos (MP4, MOV) até 100MB
          </p>
        </>
      )}
    </div>
  );
}

// =====================================================
// PÁGINA PRINCIPAL
// =====================================================

export default function SocialFlowMediaLibraryPage() {
  
  
  // Estado
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'image' | 'video'>('all');
  const [filterFolder, setFilterFolder] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'name' | 'size'>('recent');
  const [folders, setFolders] = useState<Folder[]>([]);
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);
  const [showUploadArea, setShowUploadArea] = useState(false);

  // Carregar mídia
  const loadMedia = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/social-flow/media');
      const data = await response.json();

      if (data.success && data.media) {
        setMedia(data.media);

        // Extrair pastas únicas
        const folderCounts = data.media.reduce((acc: Record<string, number>, item: MediaItem) => {
          const folder = item.folder || 'Sem pasta';
          acc[folder] = (acc[folder] || 0) + 1;
          return acc;
        }, {});

        setFolders(
          Object.entries(folderCounts).map(([name, count]) => ({
            name,
            count: count as number,
          }))
        );
      }
    } catch (error) {
      console.error('Erro ao carregar mídia:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Upload de arquivos
  const handleUpload = async (files: FileList) => {
    setUploading(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        if (filterFolder !== 'all') {
          formData.append('folder', filterFolder);
        }

        const response = await fetch('/api/social-flow/media', {
          method: 'POST',
          body: formData,
        });

        return response.json();
      });

      const results = await Promise.all(uploadPromises);
      const newMedia = results.filter((r) => r.success).map((r) => r.media);
      
      setMedia([...newMedia, ...media]);
      setShowUploadArea(false);
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      alert('Erro ao fazer upload dos arquivos');
    } finally {
      setUploading(false);
    }
  };

  // Deletar mídia
  const deleteMedia = async (ids: string[]) => {
    if (!confirm(`Tem certeza que deseja excluir ${ids.length} item(s)?`)) return;

    try {
      await Promise.all(
        ids.map((id) =>
          fetch(`/api/social-flow/media?id=${id}`, { method: 'DELETE' })
        )
      );

      setMedia(media.filter((m) => !ids.includes(m.id)));
      setSelectedItems(new Set());
    } catch (error) {
      console.error('Erro ao excluir mídia:', error);
    }
  };

  // Toggle seleção
  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  // Selecionar todos
  const selectAll = () => {
    if (selectedItems.size === filteredMedia.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredMedia.map((m) => m.id)));
    }
  };

  // Filtrar e ordenar
  const filteredMedia = media
    .filter((item) => {
      if (search) {
        const searchLower = search.toLowerCase();
        if (
          !item.file_name.toLowerCase().includes(searchLower) &&
          !item.tags?.some((tag) => tag.toLowerCase().includes(searchLower))
        ) {
          return false;
        }
      }

      if (filterType !== 'all' && item.file_type !== filterType) {
        return false;
      }

      if (filterFolder !== 'all') {
        const itemFolder = item.folder || 'Sem pasta';
        if (itemFolder !== filterFolder) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'name':
          return a.file_name.localeCompare(b.file_name);
        case 'size':
          return (b.file_size || 0) - (a.file_size || 0);
        default:
          return 0;
      }
    });

  // Estatísticas
  const totalSize = media.reduce((acc, m) => acc + (m.file_size || 0), 0);
  const imageCount = media.filter((m) => m.file_type === 'image').length;
  const videoCount = media.filter((m) => m.file_type === 'video').length;

  // Efeito
  useEffect(() => {
    loadMedia();
  }, [loadMedia]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#101A1E] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-400">Carregando biblioteca...</p>
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
              <FolderOpen className="w-7 h-7 text-blue-500" />
              Biblioteca de Mídia
            </h1>
            <p className="text-gray-400">
              {media.length} arquivo{media.length !== 1 ? 's' : ''} • {(totalSize / (1024 * 1024)).toFixed(1)} MB total
            </p>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-bold">{imageCount}</div>
                <div className="text-sm text-gray-400">Imagens</div>
              </div>
            </div>
          </div>
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                <Video className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-bold">{videoCount}</div>
                <div className="text-sm text-gray-400">Vídeos</div>
              </div>
            </div>
          </div>
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10 text-green-400">
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-bold">{(totalSize / (1024 * 1024)).toFixed(1)} MB</div>
                <div className="text-sm text-gray-400">Armazenamento</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Busca */}
          <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou tag..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Filtro de tipo */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as 'all' | 'image' | 'video')}
            className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
          >
            <option value="all">Todos os tipos</option>
            <option value="image">Imagens</option>
            <option value="video">Vídeos</option>
          </select>

          {/* Filtro de pasta */}
          <select
            value={filterFolder}
            onChange={(e) => setFilterFolder(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
          >
            <option value="all">Todas as pastas</option>
            {folders.map((folder) => (
              <option key={folder.name} value={folder.name}>
                {folder.name} ({folder.count})
              </option>
            ))}
          </select>

          {/* Ordenação */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'recent' | 'oldest' | 'name' | 'size')}
            className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
          >
            <option value="recent">Mais recentes</option>
            <option value="oldest">Mais antigos</option>
            <option value="name">Nome (A-Z)</option>
            <option value="size">Tamanho</option>
          </select>

          {/* Toggle de visualização */}
          <div className="flex items-center bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
            <button
              onClick={() => setView('grid')}
              className={`p-2 transition-colors ${
                view === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setView('list')}
              className={`p-2 transition-colors ${
                view === 'list' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>

          {/* Botão upload */}
          <button
            onClick={() => setShowUploadArea(!showUploadArea)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
          >
            <Upload className="w-4 h-4" />
            Upload
          </button>
        </div>

        {/* Área de upload */}
        {showUploadArea && (
          <div className="mt-4">
            <UploadArea onUpload={handleUpload} uploading={uploading} />
          </div>
        )}

        {/* Barra de ações em lote */}
        {selectedItems.size > 0 && (
          <div className="mt-4 flex items-center gap-4 bg-gray-800 border border-gray-700 rounded-lg p-3">
            <span className="text-sm text-gray-300">
              {selectedItems.size} item(s) selecionado(s)
            </span>
            <div className="flex-1" />
            <button
              onClick={() => setSelectedItems(new Set())}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Limpar seleção
            </button>
            <button
              onClick={() => deleteMedia(Array.from(selectedItems))}
              className="flex items-center gap-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Excluir
            </button>
          </div>
        )}
      </div>

      {/* Grid/List de mídia */}
      {filteredMedia.length > 0 ? (
        <div className={view === 'grid' 
          ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'
          : 'space-y-2'
        }>
          {filteredMedia.map((item) => (
            view === 'grid' ? (
              <MediaCard
                key={item.id}
                item={item}
                isSelected={selectedItems.has(item.id)}
                onSelect={() => toggleSelect(item.id)}
                onDelete={() => deleteMedia([item.id])}
                onView={() => setPreviewItem(item)}
              />
            ) : (
              <div
                key={item.id}
                className={`flex items-center gap-4 bg-gray-800/50 border rounded-lg p-3 transition-all ${
                  selectedItems.has(item.id) ? 'border-blue-500' : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <button
                  onClick={() => toggleSelect(item.id)}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                    selectedItems.has(item.id)
                      ? 'bg-blue-500 border-blue-500'
                      : 'border-gray-500 hover:border-gray-400'
                  }`}
                >
                  {selectedItems.has(item.id) && <Check className="w-3 h-3" />}
                </button>
                
                {item.file_type === 'video' ? (
                  <div className="w-16 h-16 bg-gray-900 rounded-lg flex items-center justify-center">
                    <Video className="w-6 h-6 text-gray-500" />
                  </div>
                ) : (
                  <img
                    src={item.file_url}
                    alt={item.file_name}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                )}

                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{item.file_name}</p>
                  <p className="text-sm text-gray-500">
                    {item.file_type === 'image' ? 'Imagem' : 'Vídeo'} • 
                    {item.file_size && ` ${(item.file_size / 1024).toFixed(0)} KB`}
                    {item.width && item.height && ` • ${item.width}×${item.height}`}
                  </p>
                </div>

                <div className="text-sm text-gray-500">
                  {new Date(item.created_at).toLocaleDateString('pt-BR')}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPreviewItem(item)}
                    className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <Eye className="w-4 h-4 text-gray-400" />
                  </button>
                  <button
                    onClick={() => window.open(item.file_url, '_blank')}
                    className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <Download className="w-4 h-4 text-gray-400" />
                  </button>
                  <button
                    onClick={() => deleteMedia([item.id])}
                    className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
            )
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <FolderOpen className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">
            {search || filterType !== 'all' || filterFolder !== 'all'
              ? 'Nenhuma mídia encontrada'
              : 'Biblioteca vazia'}
          </h3>
          <p className="text-gray-400 mb-6">
            {search || filterType !== 'all' || filterFolder !== 'all'
              ? 'Tente ajustar os filtros de busca'
              : 'Faça upload de imagens e vídeos para usar em seus posts'}
          </p>
          <button
            onClick={() => setShowUploadArea(true)}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg transition-colors"
          >
            <Upload className="w-5 h-5" />
            Fazer Upload
          </button>
        </div>
      )}

      {/* Modal de preview */}
      {previewItem && (
        <MediaPreviewModal
          item={previewItem}
          onClose={() => setPreviewItem(null)}
        />
      )}
    </div>
  );
}
