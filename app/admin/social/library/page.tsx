'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  ImageIcon, 
  Film, 
  Upload, 
  Search, 
  Filter, 
  Grid3X3, 
  List, 
  Folder, 
  FolderPlus,
  Trash2,
  Download,
  Tag,
  MoreHorizontal,
  X,
  Check,
  Plus,
  Eye,
  FileImage,
  FileVideo
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

interface MediaItem {
  id: string;
  file_name: string;
  file_url: string;
  file_type: 'image' | 'video';
  file_size: number;
  width?: number;
  height?: number;
  duration_seconds?: number;
  thumbnail_url?: string;
  folder: string;
  tags: string[];
  uploaded_at: string;
}

type ViewMode = 'grid' | 'list';

const FOLDERS = [
  { id: 'all', name: 'Todos', icon: Folder },
  { id: 'general', name: 'Geral', icon: Folder },
  { id: 'posts', name: 'Posts', icon: FileImage },
  { id: 'reels', name: 'Reels', icon: FileVideo },
  { id: 'stories', name: 'Stories', icon: ImageIcon },
];

export default function LibraryPage() {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedFolder, setSelectedFolder] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    loadMedia();
  }, [selectedFolder]);

  const loadMedia = async () => {
    setLoading(true);
    try {
      const folder = selectedFolder === 'all' ? '' : `&folder=${selectedFolder}`;
      const response = await fetch(`/api/social/instagram/media?${folder}`);
      const data = await response.json();
      setMedia(data.media || []);
    } catch (error) {
      console.error('Error loading media:', error);
      // Mock data for demo
      setMedia([
        {
          id: '1',
          file_name: 'post-janeiro.jpg',
          file_url: '/placeholder-image.jpg',
          file_type: 'image',
          file_size: 1024000,
          width: 1080,
          height: 1080,
          folder: 'posts',
          tags: ['janeiro', 'promocao'],
          uploaded_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleFiles(e.dataTransfer.files);
    }
  }, []);

  const handleFiles = async (files: FileList) => {
    setUploading(true);
    setUploadProgress(0);
    
    const totalFiles = files.length;
    let uploaded = 0;
    
    for (const file of Array.from(files)) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', selectedFolder === 'all' ? 'general' : selectedFolder);
        
        await fetch('/api/social/instagram/media/upload', {
          method: 'POST',
          body: formData,
        });
        
        uploaded++;
        setUploadProgress((uploaded / totalFiles) * 100);
      } catch (error) {
        console.error('Error uploading file:', error);
      }
    }
    
    setUploading(false);
    setUploadProgress(0);
    loadMedia();
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const toggleSelectItem = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedItems.length === filteredMedia.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredMedia.map(m => m.id));
    }
  };

  const deleteSelected = async () => {
    if (!confirm(`Excluir ${selectedItems.length} item(s)?`)) return;
    
    try {
      await Promise.all(
        selectedItems.map(id => 
          fetch(`/api/social/instagram/media/${id}`, { method: 'DELETE' })
        )
      );
      setSelectedItems([]);
      loadMedia();
    } catch (error) {
      console.error('Error deleting files:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
    if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return bytes + ' B';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const filteredMedia = media.filter(item => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        item.file_name.toLowerCase().includes(query) ||
        item.tags.some(t => t.toLowerCase().includes(query))
      );
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#101A1E] p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
            <ImageIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Biblioteca de Mídia</h1>
            <p className="text-sm text-gray-400">
              {media.length} arquivos • {formatFileSize(media.reduce((acc, m) => acc + m.file_size, 0))} total
            </p>
          </div>
        </div>

        <label className="cursor-pointer">
          <input
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={handleFileInput}
            className="hidden"
          />
          <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white">
            <Upload className="w-4 h-4 mr-2" />
            Upload
          </Button>
        </label>
      </div>

      <div className="flex gap-6">
        {/* Sidebar - Folders */}
        <Card className="bg-gray-800/50 border-gray-700/50 w-64 flex-shrink-0 h-fit">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm text-gray-300">Pastas</CardTitle>
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white p-1 h-auto">
                <FolderPlus className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-2">
            {FOLDERS.map((folder) => {
              const Icon = folder.icon;
              const count = folder.id === 'all' 
                ? media.length 
                : media.filter(m => m.folder === folder.id).length;
              
              return (
                <button
                  key={folder.id}
                  onClick={() => setSelectedFolder(folder.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    selectedFolder === folder.id
                      ? 'bg-purple-600/20 text-purple-400'
                      : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="flex-1 text-left text-sm">{folder.name}</span>
                  <span className="text-xs text-gray-500">{count}</span>
                </button>
              );
            })}
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="flex-1">
          {/* Toolbar */}
          <Card className="bg-gray-800/50 border-gray-700/50 mb-4">
            <CardContent className="p-3">
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Buscar por nome ou tag..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-500"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {selectedItems.length > 0 && (
                    <>
                      <span className="text-sm text-gray-400">
                        {selectedItems.length} selecionado(s)
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={deleteSelected}
                        className="border-red-600 text-red-400 hover:bg-red-600/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <div className="w-px h-6 bg-gray-700" />
                    </>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={selectAll}
                    className="text-gray-400 hover:text-white"
                  >
                    {selectedItems.length === filteredMedia.length ? (
                      <X className="w-4 h-4" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                  </Button>

                  <div className="flex items-center gap-1 bg-gray-700/50 rounded-lg p-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewMode('grid')}
                      className={viewMode === 'grid' 
                        ? 'bg-gray-600 text-white p-2 h-auto' 
                        : 'text-gray-400 hover:text-white p-2 h-auto'
                      }
                    >
                      <Grid3X3 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewMode('list')}
                      className={viewMode === 'list' 
                        ? 'bg-gray-600 text-white p-2 h-auto' 
                        : 'text-gray-400 hover:text-white p-2 h-auto'
                      }
                    >
                      <List className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upload Progress */}
          {uploading && (
            <div className="mb-4 p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
              <div className="flex items-center gap-3 mb-2">
                <Upload className="w-5 h-5 text-purple-400 animate-pulse" />
                <span className="text-sm text-gray-300">Enviando arquivos...</span>
                <span className="text-sm text-gray-500 ml-auto">{Math.round(uploadProgress)}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Drop Zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`relative transition-all ${dragActive ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-[#101A1E]' : ''}`}
          >
            {dragActive && (
              <div className="absolute inset-0 bg-purple-600/20 border-2 border-dashed border-purple-500 rounded-xl z-10 flex items-center justify-center">
                <div className="text-center">
                  <Upload className="w-12 h-12 text-purple-400 mx-auto mb-2" />
                  <p className="text-lg font-medium text-white">Solte os arquivos aqui</p>
                  <p className="text-sm text-gray-400">Imagens e vídeos</p>
                </div>
              </div>
            )}

            {loading ? (
              <div className={viewMode === 'grid' 
                ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'
                : 'space-y-2'
              }>
                {[...Array(8)].map((_, i) => (
                  <Skeleton key={i} className={viewMode === 'grid' ? 'aspect-square' : 'h-16'} />
                ))}
              </div>
            ) : filteredMedia.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <ImageIcon className="w-8 h-8 text-gray-600" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">Nenhuma mídia encontrada</h3>
                <p className="text-gray-400 mb-4">
                  {searchQuery ? 'Tente outra busca' : 'Faça upload de imagens ou vídeos para começar'}
                </p>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                  <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Upload de mídia
                  </Button>
                </label>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredMedia.map((item) => (
                  <div
                    key={item.id}
                    className={`relative group aspect-square bg-gray-800 rounded-xl overflow-hidden cursor-pointer transition-all hover:ring-2 hover:ring-purple-500/50 ${
                      selectedItems.includes(item.id) ? 'ring-2 ring-purple-500' : ''
                    }`}
                    onClick={() => setPreviewItem(item)}
                  >
                    {item.file_type === 'video' ? (
                      <div className="w-full h-full flex items-center justify-center bg-gray-900">
                        <Film className="w-12 h-12 text-gray-600" />
                      </div>
                    ) : (
                      <img
                        src={item.file_url}
                        alt={item.file_name}
                        className="w-full h-full object-cover"
                      />
                    )}
                    
                    {/* Video Badge */}
                    {item.file_type === 'video' && (
                      <div className="absolute top-2 left-2 bg-black/70 px-2 py-1 rounded text-xs text-white">
                        <Film className="w-3 h-3 inline mr-1" />
                        {item.duration_seconds && `${Math.round(item.duration_seconds)}s`}
                      </div>
                    )}
                    
                    {/* Selection Checkbox */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelectItem(item.id);
                      }}
                      className={`absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                        selectedItems.includes(item.id)
                          ? 'bg-purple-600 border-purple-600'
                          : 'border-white/50 bg-black/30 opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      {selectedItems.includes(item.id) && (
                        <Check className="w-4 h-4 text-white" />
                      )}
                    </button>
                    
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                      <div className="w-full">
                        <p className="text-sm text-white truncate">{item.file_name}</p>
                        <p className="text-xs text-gray-400">
                          {formatFileSize(item.file_size)} • {formatDate(item.uploaded_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredMedia.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-4 p-3 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-700/50 transition-colors ${
                      selectedItems.includes(item.id) ? 'ring-2 ring-purple-500' : ''
                    }`}
                    onClick={() => setPreviewItem(item)}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelectItem(item.id);
                      }}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                        selectedItems.includes(item.id)
                          ? 'bg-purple-600 border-purple-600'
                          : 'border-gray-600'
                      }`}
                    >
                      {selectedItems.includes(item.id) && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </button>
                    
                    {/* Thumbnail */}
                    <div className="w-14 h-14 bg-gray-700 rounded-lg overflow-hidden flex-shrink-0">
                      {item.file_type === 'video' ? (
                        <div className="w-full h-full flex items-center justify-center">
                          <Film className="w-6 h-6 text-gray-500" />
                        </div>
                      ) : (
                        <img
                          src={item.file_url}
                          alt={item.file_name}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{item.file_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className="bg-gray-700 text-gray-300 text-xs">
                          {item.file_type}
                        </Badge>
                        {item.width && item.height && (
                          <span className="text-xs text-gray-500">
                            {item.width}x{item.height}
                          </span>
                        )}
                        <span className="text-xs text-gray-500">
                          {formatFileSize(item.file_size)}
                        </span>
                      </div>
                    </div>
                    
                    {/* Tags */}
                    <div className="flex items-center gap-1">
                      {item.tags.slice(0, 2).map((tag) => (
                        <Badge key={tag} className="bg-purple-600/20 text-purple-400 text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {item.tags.length > 2 && (
                        <span className="text-xs text-gray-500">+{item.tags.length - 2}</span>
                      )}
                    </div>
                    
                    {/* Date */}
                    <span className="text-xs text-gray-500 flex-shrink-0">
                      {formatDate(item.uploaded_at)}
                    </span>
                    
                    {/* Actions */}
                    <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white p-2 h-auto">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {previewItem && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewItem(null)}
        >
          <div 
            className="relative max-w-4xl w-full max-h-[90vh] flex gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Media */}
            <div className="flex-1 bg-gray-900 rounded-xl overflow-hidden">
              {previewItem.file_type === 'video' ? (
                <video
                  src={previewItem.file_url}
                  controls
                  className="w-full h-full object-contain"
                />
              ) : (
                <img
                  src={previewItem.file_url}
                  alt={previewItem.file_name}
                  className="w-full h-full object-contain"
                />
              )}
            </div>
            
            {/* Info Panel */}
            <Card className="w-80 bg-gray-800 border-gray-700 flex-shrink-0">
              <CardHeader className="border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-sm truncate pr-2">
                    {previewItem.file_name}
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setPreviewItem(null)}
                    className="text-gray-400 hover:text-white p-1 h-auto"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Tipo</p>
                  <Badge className="bg-gray-700 text-gray-300">
                    {previewItem.file_type === 'image' ? 'Imagem' : 'Vídeo'}
                  </Badge>
                </div>
                
                {previewItem.width && previewItem.height && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Dimensões</p>
                    <p className="text-sm text-white">{previewItem.width} x {previewItem.height}</p>
                  </div>
                )}
                
                <div>
                  <p className="text-xs text-gray-500 mb-1">Tamanho</p>
                  <p className="text-sm text-white">{formatFileSize(previewItem.file_size)}</p>
                </div>
                
                <div>
                  <p className="text-xs text-gray-500 mb-1">Pasta</p>
                  <p className="text-sm text-white capitalize">{previewItem.folder}</p>
                </div>
                
                <div>
                  <p className="text-xs text-gray-500 mb-1">Upload</p>
                  <p className="text-sm text-white">{formatDate(previewItem.uploaded_at)}</p>
                </div>
                
                {previewItem.tags.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-2">Tags</p>
                    <div className="flex flex-wrap gap-1">
                      {previewItem.tags.map((tag) => (
                        <Badge key={tag} className="bg-purple-600/20 text-purple-400 text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="pt-4 border-t border-gray-700 space-y-2">
                  <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white">
                    <ImageIcon className="w-4 h-4 mr-2" />
                    Usar em post
                  </Button>
                  <Button variant="outline" className="w-full border-gray-600 text-gray-300 hover:bg-gray-700/50">
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                  <Button variant="outline" className="w-full border-red-600 text-red-400 hover:bg-red-600/20">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
