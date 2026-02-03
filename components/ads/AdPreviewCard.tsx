'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { 
  ThumbsUp, 
  MessageCircle, 
  Share2, 
  MoreHorizontal,
  Globe,
  ChevronRight,
  RefreshCw,
  Sparkles,
  AlertTriangle
} from 'lucide-react';

// =====================================================
// TIPOS
// =====================================================

export interface AdPreviewData {
  pageName: string;
  pageAvatar?: string;
  primaryText: string;
  headline: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  ctaText: string;
  linkUrl?: string;
}

interface AdPreviewCardProps {
  preview: AdPreviewData;
  variant?: 'feed' | 'story';
  onRegenerate?: () => void;
  isLoading?: boolean;
}

// =====================================================
// COMPONENTE
// =====================================================

export default function AdPreviewCard({ 
  preview, 
  variant = 'feed',
  onRegenerate,
  isLoading = false
}: AdPreviewCardProps) {
  const [showFullText, setShowFullText] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [videoLoading, setVideoLoading] = useState(true);
  const [videoError, setVideoError] = useState<string>('');
  
  // ✅ Fazer fetch do vídeo e criar blob URL local para evitar CORS
  useEffect(() => {
    if (preview.mediaType === 'video' && preview.mediaUrl) {
      setVideoLoading(true);
      setVideoError('');
      
      fetch(preview.mediaUrl, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit'
      })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.blob();
      })
      .then(blob => {
        const blobUrl = URL.createObjectURL(blob);
        setVideoUrl(blobUrl);
        setVideoLoading(false);
        console.log('✅ Vídeo carregado com sucesso (blob URL)');
      })
      .catch(err => {
        console.error('❌ Erro ao carregar vídeo:', err);
        setVideoError(err.message);
        setVideoLoading(false);
      });
      
      // Cleanup
      return () => {
        if (videoUrl) URL.revokeObjectURL(videoUrl);
      };
    }
  }, [preview.mediaUrl, preview.mediaType]);
  
  // Truncar texto longo
  const truncatedText = preview.primaryText.length > 125
    ? preview.primaryText.substring(0, 125) + '...'
    : preview.primaryText;

  if (variant === 'story') {
    return (
      <div className="relative w-[280px] h-[500px] bg-gray-900 rounded-2xl overflow-hidden border border-gray-700 shadow-xl">
        {/* Background Media */}
        <div className="absolute inset-0">
          {preview.mediaType === 'video' ? (
            <>
              {videoLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
                </div>
              )}
              {videoError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-white p-4">
                  <AlertTriangle className="w-12 h-12 mb-4 text-red-500" />
                  <p className="text-sm text-center">Erro ao carregar vídeo</p>
                  <p className="text-xs text-gray-400 mt-2">{videoError}</p>
                </div>
              )}
              {videoUrl && !videoError && (
                <video 
                  key={videoUrl}
                  src={videoUrl} 
                  className="w-full h-full object-cover"
                  muted
                  loop
                  autoPlay
                  playsInline
                  onLoadedData={() => setVideoLoading(false)}
                  onError={() => setVideoError('Formato incompatível')}
                />
              )}
            </>
          ) : (
            <Image
              src={preview.mediaUrl}
              alt="Ad Preview"
              fill
              className="object-cover"
              unoptimized
            />
          )}
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70" />
        </div>

        {/* Header */}
        <div className="absolute top-4 left-4 right-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
            {preview.pageName.charAt(0)}
          </div>
          <div className="flex-1">
            <p className="text-white font-semibold text-sm drop-shadow-lg">{preview.pageName}</p>
            <p className="text-white/70 text-xs">Patrocinado</p>
          </div>
          <MoreHorizontal className="w-5 h-5 text-white/70" />
        </div>

        {/* CTA Bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <p className="text-white text-sm mb-3 line-clamp-3 drop-shadow-lg">
            {preview.primaryText}
          </p>
          <button className="w-full py-3 bg-white text-gray-900 font-semibold rounded-lg flex items-center justify-center gap-2">
            {preview.ctaText}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Feed variant (default)
  return (
    <div className="w-full max-w-[400px] bg-white rounded-xl overflow-hidden shadow-xl">
      {/* Header */}
      <div className="flex items-center gap-3 p-3 bg-white">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
          {preview.pageAvatar ? (
            <Image 
              src={preview.pageAvatar} 
              alt={preview.pageName}
              width={40}
              height={40}
              className="rounded-full"
            />
          ) : (
            preview.pageName.charAt(0)
          )}
        </div>
        <div className="flex-1">
          <p className="text-gray-900 font-semibold text-sm">{preview.pageName}</p>
          <div className="flex items-center gap-1 text-gray-500 text-xs">
            <span>Patrocinado</span>
            <span>·</span>
            <Globe className="w-3 h-3" />
          </div>
        </div>
        <MoreHorizontal className="w-5 h-5 text-gray-400" />
      </div>

      {/* Text */}
      <div className="px-3 pb-2">
        <p className="text-gray-900 text-sm">
          {showFullText ? preview.primaryText : truncatedText}
          {preview.primaryText.length > 125 && !showFullText && (
            <button 
              onClick={() => setShowFullText(true)}
              className="text-gray-500 ml-1 hover:underline"
            >
              Ver mais
            </button>
          )}
        </p>
      </div>

      {/* Media */}
      <div className="relative aspect-square bg-gray-100">
        {preview.mediaType === 'video' ? (
          <>
            {videoLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
              </div>
            )}
            {videoError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-white p-4">
                <AlertTriangle className="w-12 h-12 mb-4 text-red-500" />
                <p className="text-sm text-center">Erro ao carregar vídeo</p>
                <p className="text-xs text-gray-400 mt-2">{videoError}</p>
              </div>
            )}
            {videoUrl && !videoError && (
              <video 
                key={videoUrl}
                src={videoUrl} 
                className="w-full h-full object-cover"
                controls
                playsInline
                preload="metadata"
                onLoadedData={() => setVideoLoading(false)}
                onError={() => setVideoError('Formato incompatível')}
              />
            )}
          </>
        ) : (
          <Image
            src={preview.mediaUrl}
            alt="Ad Preview"
            fill
            className="object-cover"
            unoptimized
          />
        )}
      </div>

      {/* CTA Card */}
      <div className="bg-gray-50 p-3 flex items-center justify-between border-t border-gray-200">
        <div className="flex-1 min-w-0">
          <p className="text-gray-500 text-xs truncate">{preview.linkUrl || 'seu-site.com.br'}</p>
          <p className="text-gray-900 font-semibold text-sm truncate">{preview.headline}</p>
        </div>
        <button className="ml-3 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold text-sm rounded-md whitespace-nowrap transition-colors">
          {preview.ctaText}
        </button>
      </div>

      {/* Engagement Bar */}
      <div className="flex items-center justify-around py-2 border-t border-gray-200 text-gray-600">
        <button className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 rounded-md transition-colors">
          <ThumbsUp className="w-5 h-5" />
          <span className="text-sm font-medium">Curtir</span>
        </button>
        <button className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 rounded-md transition-colors">
          <MessageCircle className="w-5 h-5" />
          <span className="text-sm font-medium">Comentar</span>
        </button>
        <button className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 rounded-md transition-colors">
          <Share2 className="w-5 h-5" />
          <span className="text-sm font-medium">Enviar</span>
        </button>
      </div>

      {/* Regenerate Button */}
      {onRegenerate && (
        <div className="p-3 bg-gray-50 border-t border-gray-200">
          <button
            onClick={onRegenerate}
            disabled={isLoading}
            className="w-full py-2 flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Gerar nova copy com IA
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
