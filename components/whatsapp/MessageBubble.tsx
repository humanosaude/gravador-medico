// ================================================================
// Message Bubble - Balão de mensagem (estilo WhatsApp)
// ================================================================

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { WhatsAppMessage } from '@/lib/types/whatsapp'
import { 
  CheckCheck, 
  Check, 
  Clock, 
  Pencil, 
  Trash2, 
  Play, 
  Pause, 
  Reply, 
  ChevronDown,
  Copy,
  Star,
  Forward,
  Smile
} from 'lucide-react'

const audioCache = new Map<string, string>()
const mediaCache = new Map<string, string>()

interface MessageBubbleProps {
  message: WhatsAppMessage
  onDelete?: (message: WhatsAppMessage) => void
  onEdit?: (message: WhatsAppMessage) => void
  onReply?: (message: WhatsAppMessage) => void
}

function formatAudioTime(seconds: number) {
  if (!Number.isFinite(seconds)) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function getQuotedPreview(message: WhatsAppMessage) {
  const rawMessage =
    message.raw_payload?.message ||
    message.raw_payload?.message?.message ||
    message.raw_payload

  const contextInfo =
    rawMessage?.extendedTextMessage?.contextInfo ||
    rawMessage?.imageMessage?.contextInfo ||
    rawMessage?.videoMessage?.contextInfo ||
    rawMessage?.audioMessage?.contextInfo ||
    rawMessage?.documentMessage?.contextInfo ||
    rawMessage?.stickerMessage?.contextInfo

  const quoted = contextInfo?.quotedMessage
  if (!quoted) return null

  if (quoted.conversation) return quoted.conversation
  if (quoted.extendedTextMessage?.text) return quoted.extendedTextMessage.text
  if (quoted.imageMessage) return '[Imagem]'
  if (quoted.videoMessage) return '[Vídeo]'
  if (quoted.audioMessage) return '[Áudio]'
  if (quoted.documentMessage) return '[Documento]'
  if (quoted.stickerMessage) return '[Sticker]'

  return '[Mensagem]'
}

function useResolvedMediaUrl(message: WhatsAppMessage, enabled: boolean) {
  const cacheKey = message.message_id || message.id
  const [mediaUrl, setMediaUrl] = useState<string | null>(message.media_url ?? null)
  const [loading, setLoading] = useState(false)
  const [hasError, setHasError] = useState(false)
  const requestedRef = useRef(false)
  const [triedOriginalUrl, setTriedOriginalUrl] = useState(false)

  useEffect(() => {
    requestedRef.current = false
    setHasError(false)
    setLoading(false)
    setTriedOriginalUrl(false)
  }, [cacheKey])

  const fetchBase64 = useCallback(async () => {
    if (!message.message_id || loading) return
    setLoading(true)
    setHasError(false)

    try {
      console.log('📸 [Media] Buscando base64 para:', message.message_id)
      const response = await fetch('/api/whatsapp/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId: message.message_id,
          remoteJid: message.remote_jid,
          fromMe: message.from_me
        })
      })

      if (!response.ok) {
        console.error('📸 [Media] Erro na resposta:', response.status)
        throw new Error('Falha ao buscar midia')
      }

      const payload = await response.json()
      const dataUrl = payload?.dataUrl
      if (!dataUrl || typeof dataUrl !== 'string') {
        console.error('📸 [Media] DataUrl não encontrado:', payload)
        throw new Error('Midia indisponivel')
      }

      console.log('📸 [Media] Base64 obtido com sucesso')
      mediaCache.set(cacheKey, dataUrl)
      setMediaUrl(dataUrl)
    } catch (err) {
      console.error('📸 [Media] Erro ao buscar:', err)
      setHasError(true)
    } finally {
      setLoading(false)
    }
  }, [cacheKey, loading, message.from_me, message.message_id, message.remote_jid])

  // Função para tentar carregar a URL original e fallback para base64
  const handleImageError = useCallback(() => {
    if (!triedOriginalUrl) {
      console.log('📸 [Media] URL original falhou, tentando base64...')
      setTriedOriginalUrl(true)
      setMediaUrl(null) // Limpar para mostrar loading
      void fetchBase64()
    } else {
      setHasError(true)
    }
  }, [triedOriginalUrl, fetchBase64])

  useEffect(() => {
    if (!enabled) {
      setMediaUrl(message.media_url ?? null)
      return
    }

    // Primeiro verificar cache
    const cachedMedia = mediaCache.get(cacheKey)
    if (cachedMedia) {
      setMediaUrl(cachedMedia)
      return
    }

    // Se tem media_url do banco, usar (pode ser URL do WhatsApp ou data:)
    if (message.media_url) {
      // Se já é base64, usar diretamente
      if (message.media_url.startsWith('data:')) {
        setMediaUrl(message.media_url)
        return
      }
      
      // Se é URL do WhatsApp, tentar usar mas pode expirar
      // O componente vai chamar refetch via onError se falhar
      setMediaUrl(message.media_url)
      return
    }

    // Sem URL, buscar via API
    if (message.message_id && !requestedRef.current) {
      requestedRef.current = true
      void fetchBase64()
    }
  }, [cacheKey, enabled, fetchBase64, message.media_url, message.message_id])

  return { mediaUrl, loading, hasError, refetch: fetchBase64, handleImageError }
}

export default function MessageBubble({ message, onDelete, onEdit, onReply }: MessageBubbleProps) {
  // ✅ SEMPRE usar a coluna from_me (confiável), NUNCA o raw_payload
  const fromMeValue = message.from_me as unknown as boolean | string | number
  const isFromMe =
    fromMeValue === true ||
    fromMeValue === 'true' ||
    fromMeValue === 1 ||
    fromMeValue === '1'
  
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [reactionsOpen, setReactionsOpen] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState<'top' | 'bottom'>('bottom')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const dropdownButtonRef = useRef<HTMLButtonElement>(null)
  const reactionsRef = useRef<HTMLDivElement>(null)

  // Detectar posição do dropdown quando abre
  useEffect(() => {
    if (dropdownOpen && dropdownButtonRef.current) {
      const rect = dropdownButtonRef.current.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const spaceBelow = viewportHeight - rect.bottom
      const spaceAbove = rect.top
      
      // Se tiver menos de 200px abaixo, abre para cima
      if (spaceBelow < 200 && spaceAbove > spaceBelow) {
        setDropdownPosition('top')
      } else {
        setDropdownPosition('bottom')
      }
    }
  }, [dropdownOpen])

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: any) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false)
      }
      if (reactionsRef.current && !reactionsRef.current.contains(event.target)) {
        setReactionsOpen(false)
      }
    }

    if (dropdownOpen || reactionsOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [dropdownOpen, reactionsOpen])
  
  // Debug - remover depois
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 [MessageBubble]', {
      id: message.id?.substring(0, 8),
      content: message.content?.substring(0, 30),
      from_me_raw: message.from_me,
      from_me_type: typeof message.from_me,
      isFromMe,
      side: isFromMe ? 'DIREITA (você)' : 'ESQUERDA (cliente)'
    })
  }
  
  const isDeleted = message.content === '[Mensagem apagada]'
  // Permite editar: mensagens suas, de texto (ou sem tipo definido mas com conteúdo de texto)
  const isTextMessage = 
    message.message_type === 'text' || 
    (!message.message_type && message.content && !message.media_url)
  const canEdit =
    isFromMe &&
    !isDeleted &&
    isTextMessage &&
    typeof onEdit === 'function'
  const canDelete = isFromMe && !isDeleted && typeof onDelete === 'function'
  const canReply = !isDeleted && typeof onReply === 'function' && !!message.message_id
  const quotedPreview = getQuotedPreview(message)
  const shouldRenderText =
    message.content &&
    !(message.message_type === 'audio' && message.content === '[Áudio]')

  const handleCopyText = () => {
    if (message.content) {
      navigator.clipboard.writeText(message.content)
      setDropdownOpen(false)
    }
  }

  return (
    <div
      className={`group flex items-end gap-1 mb-2 ${isFromMe ? 'justify-end' : 'justify-start'}`}
    >
      {/* Botão de Reações - À ESQUERDA para mensagens ENVIADAS (verde) */}
      {isFromMe && (
        <div className="relative" ref={reactionsRef}>
          <button
            type="button"
            onClick={() => setReactionsOpen(!reactionsOpen)}
            className="mb-1 p-1.5 rounded-full hover:bg-[#202c33] transition-opacity opacity-0 group-hover:opacity-100"
            title="Reagir"
          >
            <Smile className="w-4 h-4 text-gray-400" />
          </button>

          {/* Popup de Reações - Acima do botão */}
          {reactionsOpen && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#233138] rounded-full shadow-lg border border-gray-700 px-3 py-2 flex items-center gap-2 z-50">
              <button onClick={() => { console.log('👍'); setReactionsOpen(false); }} className="text-2xl hover:scale-125 transition-transform">👍</button>
              <button onClick={() => { console.log('❤️'); setReactionsOpen(false); }} className="text-2xl hover:scale-125 transition-transform">❤️</button>
              <button onClick={() => { console.log('😂'); setReactionsOpen(false); }} className="text-2xl hover:scale-125 transition-transform">😂</button>
              <button onClick={() => { console.log('😮'); setReactionsOpen(false); }} className="text-2xl hover:scale-125 transition-transform">😮</button>
              <button onClick={() => { console.log('😢'); setReactionsOpen(false); }} className="text-2xl hover:scale-125 transition-transform">😢</button>
              <button onClick={() => { console.log('🙏'); setReactionsOpen(false); }} className="text-2xl hover:scale-125 transition-transform">🙏</button>
              <button onClick={() => { console.log('+'); setReactionsOpen(false); }} className="text-xl text-gray-400 hover:text-white transition-colors">+</button>
            </div>
          )}
        </div>
      )}

      {/* Balão da Mensagem */}
      <div
        className={`relative max-w-[65%] px-3 pt-2 pb-2 rounded-md shadow-sm ${
          isFromMe
            ? 'bg-[#005c4b] text-white rounded-br-sm'
            : 'bg-[#202c33] text-white rounded-bl-sm'
        }`}
      >
        {/* Dropdown no topo direito (dentro do balão) */}
        <div className="absolute top-0 right-1 z-10" ref={dropdownRef}>
          <button
            ref={dropdownButtonRef}
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className={`p-1 rounded hover:bg-white/10 transition-opacity ${
              dropdownOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
            title="Mais opções"
          >
            <ChevronDown className="w-3.5 h-3.5 text-gray-300" />
          </button>

          {/* Menu Dropdown - Posição dinâmica baseada no espaço disponível */}
          {dropdownOpen && (
            <div className={`absolute right-0 w-48 bg-[#233138] rounded-md shadow-lg border border-gray-700 py-1 z-50 ${
              dropdownPosition === 'bottom' ? 'top-full mt-1' : 'bottom-full mb-1'
            }`}>
              {canReply && (
                <button
                  type="button"
                  onClick={() => {
                    onReply?.(message)
                    setDropdownOpen(false)
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/10 flex items-center gap-3"
                >
                  <Reply className="w-4 h-4" />
                  <span>Responder</span>
                </button>
              )}
              
              {message.content && (
                <button
                  type="button"
                  onClick={handleCopyText}
                  className="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/10 flex items-center gap-3"
                >
                  <Copy className="w-4 h-4" />
                  <span>Copiar</span>
                </button>
              )}
              
              <button
                type="button"
                onClick={() => setDropdownOpen(false)}
                className="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/10 flex items-center gap-3"
              >
                <Star className="w-4 h-4" />
                <span>Favoritar</span>
              </button>

              {canEdit && (
                <>
                  <div className="h-px bg-gray-700 my-1" />
                  <button
                    type="button"
                    onClick={() => {
                      onEdit?.(message)
                      setDropdownOpen(false)
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/10 flex items-center gap-3"
                  >
                    <Pencil className="w-4 h-4" />
                    <span>Editar</span>
                  </button>
                </>
              )}

              {canDelete && (
                <button
                  type="button"
                  onClick={() => {
                    onDelete?.(message)
                    setDropdownOpen(false)
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-white/10 flex items-center gap-3"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Apagar</span>
                </button>
              )}
            </div>
          )}
        </div>

        {quotedPreview && (
          <div className="mb-2 rounded-md bg-black/20 px-2 py-1 text-xs text-gray-200">
            <div className="text-[11px] text-emerald-200">Respondendo</div>
            <div className="truncate">{quotedPreview}</div>
          </div>
        )}

        {/* Mídia (se houver) */}
        <MessageMedia message={message} />

        {/* Conteúdo de texto (WhatsApp style - timestamp na última linha) */}
        {shouldRenderText && (
          <p className={`text-[14.2px] whitespace-pre-wrap break-words leading-[19px] ${
            isDeleted ? 'text-gray-300 italic' : ''
          }`}>
            {message.content}
            {/* Espaço reservado para timestamp (invisível mas ocupa espaço) */}
            <span className="inline-block w-[65px] h-[16px]" />
          </p>
        )}

        {/* Timestamp posicionado absolutamente no canto inferior direito */}
        <div className="absolute bottom-1 right-2 flex items-center gap-1">
          <span
            className={`text-[11px] ${
              isFromMe ? 'text-gray-300' : 'text-gray-400'
            }`}
          >
            {format(new Date(message.timestamp), 'HH:mm', { locale: ptBR })}
          </span>
          {isFromMe && <MessageStatus status={message.status} />}
        </div>
      </div>

      {/* Botão de Reações - À DIREITA para mensagens RECEBIDAS (cinza) */}
      {!isFromMe && (
        <div className="relative" ref={reactionsRef}>
          <button
            type="button"
            onClick={() => setReactionsOpen(!reactionsOpen)}
            className="mb-1 p-1.5 rounded-full hover:bg-[#202c33] transition-opacity opacity-0 group-hover:opacity-100"
            title="Reagir"
          >
            <Smile className="w-4 h-4 text-gray-400" />
          </button>

          {/* Popup de Reações - Acima do botão */}
          {reactionsOpen && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#233138] rounded-full shadow-lg border border-gray-700 px-3 py-2 flex items-center gap-2 z-50">
              <button onClick={() => { console.log('👍'); setReactionsOpen(false); }} className="text-2xl hover:scale-125 transition-transform">👍</button>
              <button onClick={() => { console.log('❤️'); setReactionsOpen(false); }} className="text-2xl hover:scale-125 transition-transform">❤️</button>
              <button onClick={() => { console.log('😂'); setReactionsOpen(false); }} className="text-2xl hover:scale-125 transition-transform">😂</button>
              <button onClick={() => { console.log('😮'); setReactionsOpen(false); }} className="text-2xl hover:scale-125 transition-transform">😮</button>
              <button onClick={() => { console.log('😢'); setReactionsOpen(false); }} className="text-2xl hover:scale-125 transition-transform">😢</button>
              <button onClick={() => { console.log('🙏'); setReactionsOpen(false); }} className="text-2xl hover:scale-125 transition-transform">🙏</button>
              <button onClick={() => { console.log('+'); setReactionsOpen(false); }} className="text-xl text-gray-400 hover:text-white transition-colors">+</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Renderiza mídia (imagem, vídeo, etc)
 */
function MessageMedia({
  message
}: {
  message: WhatsAppMessage
}) {
  const { message_type: type, caption } = message
  const isMedia =
    type === 'image' || type === 'video' || type === 'document' || type === 'sticker'
  const { mediaUrl, loading, hasError, refetch, handleImageError } = useResolvedMediaUrl(message, isMedia)

  if (type === 'audio') {
    return <AudioMessage message={message} />
  }

  if (!isMedia) {
    return null
  }

  if (type === 'image') {
    if (!mediaUrl) {
      return (
        <div className="mb-2 text-xs text-gray-300">
          {loading ? (
            <div className="flex items-center gap-2">
              <span className="animate-spin">⏳</span>
              <span>Carregando imagem...</span>
            </div>
          ) : hasError ? (
            <button
              type="button"
              onClick={refetch}
              className="underline hover:text-white"
            >
              🔄 Recarregar imagem
            </button>
          ) : (
            'Imagem indisponível'
          )}
        </div>
      )
    }
    return (
      <div className="mb-2">
        <a
          href={mediaUrl}
          target="_blank"
          rel="noopener noreferrer"
          download
        >
          <img
            src={mediaUrl}
            alt={caption || 'Imagem'}
            className="rounded-lg max-w-[280px] max-h-[280px] w-auto h-auto object-contain"
            onError={handleImageError}
          />
        </a>
      </div>
    )
  }

  if (type === 'video') {
    if (!mediaUrl) {
      return (
        <div className="mb-2 text-xs text-gray-300">
          {loading ? (
            <div className="flex items-center gap-2">
              <span className="animate-spin">⏳</span>
              <span>Carregando vídeo...</span>
            </div>
          ) : hasError ? (
            <button
              type="button"
              onClick={refetch}
              className="underline hover:text-white"
            >
              🔄 Recarregar vídeo
            </button>
          ) : (
            'Vídeo indisponível'
          )}
        </div>
      )
    }
    return (
      <div className="mb-2">
        <video
          controls
          className="rounded-lg max-w-[280px] max-h-[280px]"
          onError={handleImageError}
        >
          <source src={mediaUrl} />
        </video>
      </div>
    )
  }

  if (type === 'document') {
    if (!mediaUrl) {
      return (
        <div className="mb-2 text-xs text-gray-300">
          {loading ? 'Carregando mídia...' : hasError ? (
            <button
              type="button"
              onClick={refetch}
              className="underline"
            >
              Recarregar documento
            </button>
          ) : (
            'Documento indisponível'
          )}
        </div>
      )
    }
    return (
      <div className="mb-2">
        <a
          href={mediaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm underline"
          download
        >
          📄 {caption || message.content || 'Documento'}
        </a>
      </div>
    )
  }

  if (type === 'sticker') {
    if (!mediaUrl) {
      return (
        <div className="mb-2 text-xs text-gray-300">
          {loading ? 'Carregando mídia...' : hasError ? (
            <button
              type="button"
              onClick={refetch}
              className="underline"
            >
              Recarregar figurinha
            </button>
          ) : (
            'Figurinha indisponível'
          )}
        </div>
      )
    }
    return (
      <div className="mb-2">
        <img
          src={mediaUrl}
          alt="Sticker"
          className="w-32 h-32 object-contain"
          onError={() => {
            if (!loading && !hasError) {
              void refetch()
            }
          }}
        />
      </div>
    )
  }

  return null
}

function AudioMessage({ message }: { message: WhatsAppMessage }) {
  const cacheKey = message.message_id || message.id
  const [audioSrc, setAudioSrc] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const fallbackTriedRef = useRef(false)

  useEffect(() => {
    const cached = audioCache.get(cacheKey)
    if (cached) {
      setAudioSrc(cached)
      return
    }

    if (message.media_url) {
      setAudioSrc(message.media_url)
      return
    }

    if (message.message_id) {
      void fetchBase64()
    }
  }, [cacheKey, message.media_url, message.message_id])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime)
    const handleLoaded = () => setDuration(audio.duration || 0)
    const handleEnded = () => setIsPlaying(false)
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleError = () => {
      if (!fallbackTriedRef.current && message.message_id) {
        fallbackTriedRef.current = true
        void fetchBase64()
      } else {
        setHasError(true)
      }
    }

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('loadedmetadata', handleLoaded)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('error', handleError)

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('loadedmetadata', handleLoaded)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('error', handleError)
    }
  }, [audioSrc, message.message_id])

  const fetchBase64 = async () => {
    if (!message.message_id || loading) return
    setLoading(true)
    setHasError(false)

    try {
      const response = await fetch('/api/whatsapp/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId: message.message_id,
          remoteJid: message.remote_jid,
          fromMe: message.from_me
        })
      })

      if (!response.ok) {
        throw new Error('Falha ao buscar midia')
      }

      const payload = await response.json()
      const dataUrl = payload?.dataUrl
      if (!dataUrl || typeof dataUrl !== 'string') {
        throw new Error('Midia indisponivel')
      }

      audioCache.set(cacheKey, dataUrl)
      setAudioSrc(dataUrl)
    } catch {
      setHasError(true)
    } finally {
      setLoading(false)
    }
  }

  const handleTogglePlay = () => {
    if (!audioRef.current) return
    if (!audioSrc) {
      void fetchBase64()
      return
    }

    if (audioRef.current.paused) {
      void audioRef.current.play()
    } else {
      audioRef.current.pause()
    }
  }

  const handleSeek = (event: MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return
    const rect = event.currentTarget.getBoundingClientRect()
    const percent = (event.clientX - rect.left) / rect.width
    audioRef.current.currentTime = percent * duration
  }

  const progress = duration ? (currentTime / duration) * 100 : 0

  return (
    <div className="mb-2">
      <div className="flex items-center gap-3 min-w-[200px]">
        <button
          type="button"
          onClick={handleTogglePlay}
          className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center hover:bg-white/25 transition"
          title={isPlaying ? 'Pausar' : 'Tocar'}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 text-white" />
          ) : (
            <Play className="w-4 h-4 text-white ml-0.5" />
          )}
        </button>

        <div className="flex-1">
          <div
            className="h-1 rounded-full bg-white/20 relative cursor-pointer"
            onClick={handleSeek}
          >
            <div
              className="absolute left-0 top-0 h-1 rounded-full bg-white"
              style={{ width: `${progress}%` }}
            />
            <div
              className="absolute top-1/2 h-2 w-2 rounded-full bg-white -translate-y-1/2"
              style={{ left: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-gray-200 mt-1">
            <span>{formatAudioTime(isPlaying ? currentTime : duration || currentTime)}</span>
            <span>{loading ? 'Carregando...' : hasError ? 'Audio indisponivel' : 'Áudio'}</span>
          </div>
        </div>
      </div>

      {audioSrc && (
        <audio ref={audioRef} src={audioSrc} preload="metadata" />
      )}
    </div>
  )
}

/**
 * Ícone de status da mensagem (enviada, entregue, lida)
 */
function MessageStatus({ status }: { status?: WhatsAppMessage['status'] }) {
  if (status === 'read') {
    return <CheckCheck className="w-4 h-4 text-[#53bdeb]" />
  }

  if (status === 'delivered') {
    return <CheckCheck className="w-4 h-4 text-gray-300" />
  }

  if (status === 'sent') {
    return <Check className="w-4 h-4 text-gray-300" />
  }

  // Pendente
  return <Clock className="w-4 h-4 text-gray-400" />
}
