// ================================================================
// Message Bubble - Balão de mensagem (estilo WhatsApp)
// ================================================================

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { WhatsAppMessage } from '@/lib/types/whatsapp'
import { CheckCheck, Check, Clock, Pencil, Trash2, Play, Pause, Reply } from 'lucide-react'

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

  useEffect(() => {
    requestedRef.current = false
    setHasError(false)
    setLoading(false)
  }, [cacheKey])

  const fetchBase64 = useCallback(async () => {
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

      mediaCache.set(cacheKey, dataUrl)
      setMediaUrl(dataUrl)
    } catch {
      setHasError(true)
    } finally {
      setLoading(false)
    }
  }, [cacheKey, loading, message.from_me, message.message_id, message.remote_jid])

  useEffect(() => {
    if (!enabled) {
      setMediaUrl(message.media_url ?? null)
      return
    }

    if (message.media_url) {
      setMediaUrl(message.media_url)
      return
    }

    const cached = mediaCache.get(cacheKey)
    if (cached) {
      setMediaUrl(cached)
      return
    }

    if (message.message_id && !requestedRef.current) {
      requestedRef.current = true
      void fetchBase64()
    }
  }, [cacheKey, enabled, fetchBase64, message.media_url, message.message_id])

  return { mediaUrl, loading, hasError, refetch: fetchBase64 }
}

export default function MessageBubble({ message, onDelete, onEdit, onReply }: MessageBubbleProps) {
  const rawFromMeValue = message?.raw_payload?.key?.fromMe as
    | boolean
    | string
    | number
    | undefined
    | null

  const rawFromMeNormalized =
    rawFromMeValue === true ||
    rawFromMeValue === 'true' ||
    rawFromMeValue === 1 ||
    rawFromMeValue === '1'

  const fromMeValue = message.from_me as unknown as boolean | string | number
  const fromMeNormalized =
    fromMeValue === true ||
    fromMeValue === 'true' ||
    fromMeValue === 1 ||
    fromMeValue === '1'

  const hasRawFromMe = rawFromMeValue !== undefined && rawFromMeValue !== null
  const isFromMe = hasRawFromMe ? rawFromMeNormalized : fromMeNormalized
  const isDeleted = message.content === '[Mensagem apagada]'
  const canEdit =
    isFromMe &&
    !isDeleted &&
    message.message_type === 'text' &&
    typeof onEdit === 'function'
  const canDelete = isFromMe && !isDeleted && typeof onDelete === 'function'
  const canReply = !isDeleted && typeof onReply === 'function' && !!message.message_id
  const quotedPreview = getQuotedPreview(message)
  const shouldRenderText =
    message.content &&
    !(message.message_type === 'audio' && message.content === '[Áudio]')

  return (
    <div
      className={`group flex mb-2 ${isFromMe ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[65%] px-2 py-1.5 rounded-md shadow-sm ${
          isFromMe
            ? 'bg-[#005c4b] text-white rounded-br-sm'
            : 'bg-[#202c33] text-white rounded-bl-sm'
        }`}
      >
        {quotedPreview && (
          <div className="mb-2 rounded-md bg-black/20 px-2 py-1 text-xs text-gray-200">
            <div className="text-[11px] text-emerald-200">Respondendo</div>
            <div className="truncate">{quotedPreview}</div>
          </div>
        )}

        {/* Mídia (se houver) */}
        <MessageMedia message={message} />

        {/* Conteúdo de texto */}
        {shouldRenderText && (
          <p
            className={`text-[14.2px] whitespace-pre-wrap break-words leading-[19px] ${
              isDeleted ? 'text-gray-300 italic' : ''
            }`}
          >
            {message.content}
          </p>
        )}

        {/* Timestamp + Status */}
        <div className="flex items-center justify-end gap-1 mt-1">
          <span
            className={`text-[11px] ${
              isFromMe ? 'text-gray-300' : 'text-gray-400'
            }`}
          >
            {format(new Date(message.timestamp), 'HH:mm', { locale: ptBR })}
          </span>

          {(canReply || canEdit || canDelete) && (
            <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              {canReply && (
                <button
                  type="button"
                  onClick={() => onReply?.(message)}
                  title="Responder"
                  className="p-0.5 rounded hover:bg-white/10"
                >
                  <Reply className="w-3.5 h-3.5 text-gray-300" />
                </button>
              )}
              {canEdit && (
                <button
                  type="button"
                  onClick={() => onEdit?.(message)}
                  title="Editar mensagem"
                  className="p-0.5 rounded hover:bg-white/10"
                >
                  <Pencil className="w-3.5 h-3.5 text-gray-300" />
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  onClick={() => onDelete?.(message)}
                  title="Apagar para todos"
                  className="p-0.5 rounded hover:bg-white/10"
                >
                  <Trash2 className="w-3.5 h-3.5 text-gray-300" />
                </button>
              )}
            </div>
          )}

          {isFromMe && <MessageStatus status={message.status} />}
        </div>
      </div>
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
  const { mediaUrl, loading, hasError, refetch } = useResolvedMediaUrl(message, isMedia)

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
          {loading ? 'Carregando mídia...' : hasError ? (
            <button
              type="button"
              onClick={refetch}
              className="underline"
            >
              Recarregar imagem
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
            className="rounded-lg max-w-full h-auto"
            onError={() => {
              if (!loading && !hasError) {
                void refetch()
              }
            }}
          />
        </a>
      </div>
    )
  }

  if (type === 'video') {
    if (!mediaUrl) {
      return (
        <div className="mb-2 text-xs text-gray-300">
          {loading ? 'Carregando mídia...' : hasError ? (
            <button
              type="button"
              onClick={refetch}
              className="underline"
            >
              Recarregar vídeo
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
          className="rounded-lg max-w-full"
          onError={() => {
            if (!loading && !hasError) {
              void refetch()
            }
          }}
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
