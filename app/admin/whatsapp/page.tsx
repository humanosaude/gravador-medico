// ================================================================
// Página: WhatsApp Inbox (Admin)
// ================================================================
// Tela completa estilo WhatsApp Web com lista de conversas e chat
// ================================================================

'use client'

import { useEffect, useState, useRef } from 'react'
import type { ChangeEvent, ClipboardEvent } from 'react'
import { supabaseAdmin } from '@/lib/supabase'
import {
  getWhatsAppConversations,
  getWhatsAppMessages,
  markConversationAsRead,
  getWhatsAppStats
} from '@/lib/whatsapp-db'
import type { WhatsAppConversation, WhatsAppMessage } from '@/lib/types/whatsapp'
import ChatLayout from '@/components/whatsapp/ChatLayout'
import ContactList from '@/components/whatsapp/ContactList'
import MessageBubble from '@/components/whatsapp/MessageBubble'
import { Send, Search, RefreshCw, MessageSquare, Mic, StopCircle, Trash2, Paperclip, X, Image as ImageIcon, FileText, Smile, Sticker } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useNotifications } from '@/components/NotificationProvider'
import { useSearchParams } from 'next/navigation'

type FilterType = 'all' | 'unread' | 'favorites' | 'groups'

const normalizeFromMe = (value: unknown) =>
  value === true || value === 'true' || value === 1 || value === '1'

const EMOJIS = [
  '😀', '😁', '😂', '🤣', '😊', '😍', '🥰', '😘',
  '😎', '🤔', '😴', '😭', '😡', '👍', '🙏', '👏',
  '🔥', '🎉', '✨', '💯', '✅', '❌', '❤️', '💚',
  '💙', '👀', '👉', '👈', '💬', '📌', '📎', '🧡'
]

export default function WhatsAppInboxPage() {
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([])
  const [selectedRemoteJid, setSelectedRemoteJid] = useState<string | null>(null)
  const [messages, setMessages] = useState<WhatsAppMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [stats, setStats] = useState({ totalContacts: 0, totalMessages: 0, totalUnread: 0 })
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordedAudio, setRecordedAudio] = useState<{ blob: Blob; url: string } | null>(null)
  const [recordingError, setRecordingError] = useState<string | null>(null)
  const [sendingAudio, setSendingAudio] = useState(false)
  const [replyTo, setReplyTo] = useState<WhatsAppMessage | null>(null)
  const [pendingAttachment, setPendingAttachment] = useState<File | null>(null)
  const [pendingAttachmentPreview, setPendingAttachmentPreview] = useState<string | null>(null)
  const [sendingMedia, setSendingMedia] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false)
  const [attachmentAccept, setAttachmentAccept] = useState('')

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const lastMessageTimestampRef = useRef<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingStreamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const emojiPickerRef = useRef<HTMLDivElement | null>(null)
  const attachmentMenuRef = useRef<HTMLDivElement | null>(null)
  const { addNotification } = useNotifications()
  const searchParams = useSearchParams()

  // Auto-abrir chat se vier da notificação
  useEffect(() => {
    const chatParam = searchParams.get('chat')
    if (chatParam) {
      setSelectedRemoteJid(decodeURIComponent(chatParam))
    }
  }, [searchParams])

  // Carregar conversas
  useEffect(() => {
    loadConversations()
    loadStats()
  }, [])

  // Carregar mensagens quando selecionar conversa
  useEffect(() => {
    if (selectedRemoteJid) {
      loadMessages(selectedRemoteJid)
      markAsRead(selectedRemoteJid)
      setReplyTo(null)
      clearAttachment()
      setRecordedAudio(null)
    }
  }, [selectedRemoteJid])

  // Auto-scroll para última mensagem
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    lastMessageTimestampRef.current = messages[messages.length - 1]?.timestamp ?? null
  }, [messages])

  useEffect(() => {
    return () => {
      if (recordedAudio?.url) {
        URL.revokeObjectURL(recordedAudio.url)
      }
    }
  }, [recordedAudio?.url])

  useEffect(() => {
    return () => {
      if (pendingAttachmentPreview) {
        URL.revokeObjectURL(pendingAttachmentPreview)
      }
    }
  }, [pendingAttachmentPreview])

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
      if (recordingStreamRef.current) {
        recordingStreamRef.current.getTracks().forEach((track) => track.stop())
        recordingStreamRef.current = null
      }
    }
  }, [])

  // ================================================================
  // REALTIME: Escutar novas mensagens e atualizações de contatos
  // ================================================================
  useEffect(() => {
    console.log('🔌 Conectando ao Supabase Realtime...')
    
    const channel = supabaseAdmin
      .channel('whatsapp-realtime-inbox')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_messages'
        },
        (payload) => {
          console.log('📩 Nova mensagem recebida via Realtime:', payload.new)
          
          const newMessage = payload.new as WhatsAppMessage
          const fromMe = normalizeFromMe(newMessage.from_me)
          
          // 🔔 Criar notificação se NÃO for mensagem enviada por mim
          if (!fromMe) {
            const contact = conversations.find(c => c.remote_jid === newMessage.remote_jid)
            const contactName =
              contact?.name || contact?.push_name || newMessage.remote_jid.split('@')[0]

            addNotification({
              type: 'whatsapp_message',
              title: contactName,
              message: newMessage.content || '[Mídia]',
              metadata: {
                whatsapp_remote_jid: newMessage.remote_jid,
                whatsapp_message_id: newMessage.id,
                profile_picture_url: contact?.profile_picture_url
              }
            })
          }
          
          // Se a mensagem pertence ao chat atual aberto
          if (newMessage.remote_jid === selectedRemoteJid) {
            console.log('✅ Mensagem do chat atual - Adicionando ao estado')
            setMessages((prev) => {
              // Evitar duplicatas
              const exists = prev.some(
                (msg) =>
                  msg.id === newMessage.id ||
                  (newMessage.message_id && msg.message_id === newMessage.message_id)
              )
              if (exists) return prev
              if (fromMe) {
                const incomingTs = Date.parse(newMessage.timestamp)
                let replaced = false
                const next = prev.map((msg) => {
                  if (replaced) return msg
                  if (
                    (msg.id.startsWith('optimistic-') || msg.id.startsWith('contact-fallback-')) &&
                    msg.from_me &&
                    msg.remote_jid === newMessage.remote_jid &&
                    msg.content === newMessage.content
                  ) {
                    const msgTs = Date.parse(msg.timestamp)
                    if (
                      !Number.isNaN(incomingTs) &&
                      !Number.isNaN(msgTs) &&
                      Math.abs(msgTs - incomingTs) <= 15000
                    ) {
                      replaced = true
                      return newMessage
                    }
                  }
                  return msg
                })
                if (replaced) return next
              }
              return [...prev, newMessage]
            })
            
            // Scroll automático para a nova mensagem
            setTimeout(() => scrollToBottom(), 100)
          }
          
          // Atualizar lista de conversas (sidebar) para mostrar última mensagem
          loadConversations()
          loadStats()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'whatsapp_messages'
        },
        (payload) => {
          const updatedMessage = payload.new as WhatsAppMessage

          if (updatedMessage.remote_jid === selectedRemoteJid) {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === updatedMessage.id ||
                (updatedMessage.message_id && msg.message_id === updatedMessage.message_id)
                  ? { ...msg, ...updatedMessage }
                  : msg
              )
            )
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'whatsapp_contacts'
        },
        (payload) => {
          console.log('🔄 Contato atualizado via Realtime:', payload.new)
          
          // Atualizar lista de conversas para refletir mudanças
          setConversations((prev) => {
            const updated = prev.map((conv) => {
              if (conv.remote_jid === (payload.new as any).remote_jid) {
                return { ...conv, ...payload.new } as WhatsAppConversation
              }
              return conv
            })
            
            // Reordenar por última mensagem
            return updated.sort((a, b) => {
              const dateA = a.last_message_timestamp ? new Date(a.last_message_timestamp).getTime() : 0
              const dateB = b.last_message_timestamp ? new Date(b.last_message_timestamp).getTime() : 0
              return dateB - dateA
            })
          })
          
          loadStats()

          const updatedContact = payload.new as WhatsAppConversation
          if (
            updatedContact.remote_jid === selectedRemoteJid &&
            updatedContact.last_message_from_me &&
            updatedContact.last_message_timestamp
          ) {
            const incomingTime = Date.parse(updatedContact.last_message_timestamp)
            if (!Number.isNaN(incomingTime)) {
              setMessages((prev) => {
                const alreadyInChat = prev.some((msg) => {
                  if (!msg.from_me || msg.remote_jid !== updatedContact.remote_jid) return false
                  const msgTime = Date.parse(msg.timestamp)
                  if (Number.isNaN(msgTime)) return false
                  const closeInTime = Math.abs(msgTime - incomingTime) <= 2000
                  const sameContent = updatedContact.last_message_content
                    ? msg.content === updatedContact.last_message_content
                    : true
                  return closeInTime && sameContent
                })

                if (alreadyInChat) return prev

                const syntheticMessage: WhatsAppMessage = {
                  id: `contact-fallback-${updatedContact.remote_jid}-${incomingTime}`,
                  remote_jid: updatedContact.remote_jid,
                  content: updatedContact.last_message_content || '[Mídia]',
                  message_type: 'text',
                  from_me: true,
                  timestamp: updatedContact.last_message_timestamp,
                  status: 'sent',
                  created_at: updatedContact.last_message_timestamp
                }

                return [...prev, syntheticMessage]
              })
            }
          }

          if (updatedContact.remote_jid === selectedRemoteJid && updatedContact.last_message_timestamp) {
            const lastTimestamp = lastMessageTimestampRef.current
            const incomingTime = Date.parse(updatedContact.last_message_timestamp)
            const lastTime = lastTimestamp ? Date.parse(lastTimestamp) : null

            if (!Number.isNaN(incomingTime) && (!lastTime || incomingTime > lastTime)) {
              void refreshMessagesQuietly(selectedRemoteJid)
            }
          }

        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_contacts'
        },
        (payload) => {
          console.log('➕ Novo contato adicionado via Realtime:', payload.new)
          
          // Adicionar novo contato à lista se não existir
          setConversations((prev) => {
            const exists = prev.some(conv => conv.remote_jid === (payload.new as any).remote_jid)
            if (exists) return prev
            
            return [payload.new as WhatsAppConversation, ...prev]
          })
          
          loadStats()
        }
      )
      .subscribe((status) => {
        console.log('📡 Status da conexão Realtime:', status)
        if (status === 'SUBSCRIBED') {
          console.log('✅ Conectado ao Supabase Realtime!')
        }
      })

    // Cleanup: Remover canal ao desmontar componente
    return () => {
      console.log('🔌 Desconectando do Supabase Realtime...')
      supabaseAdmin.removeChannel(channel)
    }
  }, [selectedRemoteJid]) // Re-subscribe quando mudar o chat selecionado

  async function loadConversations() {
    try {
      const data = await getWhatsAppConversations()
      setConversations(data)
      setLoading(false)
    } catch (error) {
      console.error('❌ Erro ao carregar conversas:', error)
      setLoading(false)
    }
  }

  async function loadMessages(remoteJid: string) {
    setLoadingMessages(true)
    try {
      try {
        await fetch('/api/whatsapp/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'sync-conversation',
            remoteJid,
            messagesLimit: 200
          })
        })
      } catch (syncError) {
        console.warn('⚠️ Falha ao sincronizar conversa (não crítico):', syncError)
      }

      console.log('📥 [loadMessages] Carregando mensagens para:', remoteJid)
      const data = await getWhatsAppMessages(remoteJid, 200)
      console.log('📥 [loadMessages] Mensagens recebidas:', data.length, 'mensagens')
      console.log('📥 [loadMessages] Detalhes:', {
        total: data.length,
        fromMe: data.filter(m => m.from_me).length,
        fromThem: data.filter(m => !m.from_me).length,
        primeiras3: data.slice(0, 3).map(m => ({
          id: m.id.substring(0, 8),
          content: m.content?.substring(0, 30),
          from_me: m.from_me
        }))
      })
      setMessages(data)
    } catch (error) {
      console.error('❌ Erro ao carregar mensagens:', error)
    } finally {
      setLoadingMessages(false)
    }
  }

  async function refreshMessagesQuietly(remoteJid: string) {
    try {
      const data = await getWhatsAppMessages(remoteJid, 200)
      setMessages((prev) => {
        const cleaned = prev.filter(
          (msg) =>
            !msg.id.startsWith('optimistic-') && !msg.id.startsWith('contact-fallback-')
        )
        const byKey = new Map<string, WhatsAppMessage>()
        for (const msg of cleaned) {
          byKey.set(msg.message_id || msg.id, msg)
        }
        for (const msg of data) {
          byKey.set(msg.message_id || msg.id, msg)
        }
        return Array.from(byKey.values()).sort((a, b) => {
          const timeA = Date.parse(a.timestamp)
          const timeB = Date.parse(b.timestamp)
          return timeA - timeB
        })
      })
    } catch (error) {
      console.warn('⚠️ Falha ao atualizar mensagens em background:', error)
    }
  }

  async function markAsRead(remoteJid: string) {
    try {
      await markConversationAsRead(remoteJid)
      // Atualizar localmente
      setConversations((prev) =>
        prev.map((c) =>
          c.remote_jid === remoteJid ? { ...c, unread_count: 0 } : c
        )
      )
      loadStats()
    } catch (error) {
      console.error('❌ Erro ao marcar como lida:', error)
    }
  }

  async function loadStats() {
    try {
      const data = await getWhatsAppStats()
      setStats(data)
    } catch (error) {
      console.error('❌ Erro ao carregar stats:', error)
    }
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  function updateConversationPreview(
    remoteJid: string,
    content: string,
    fromMe: boolean,
    timestamp: string
  ) {
    setConversations((prev) =>
      prev.map((conv) => {
        if (conv.remote_jid !== remoteJid) return conv
        const convTime = conv.last_message_timestamp
          ? new Date(conv.last_message_timestamp).getTime()
          : null
        const msgTime = new Date(timestamp).getTime()
        if (convTime && convTime !== msgTime) return conv
        return {
          ...conv,
          last_message_content: content,
          last_message_from_me: fromMe
        }
      })
    )
  }

  async function startRecording() {
    if (isRecording || sendingAudio || sending) return
    if (recordedAudio) return

    setRecordingError(null)

    if (!navigator?.mediaDevices?.getUserMedia) {
      setRecordingError('Gravacao nao suportada neste navegador.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      recordingStreamRef.current = stream

      const options: MediaRecorderOptions = {}
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        options.mimeType = 'audio/webm;codecs=opus'
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        options.mimeType = 'audio/webm'
      }

      const recorder = new MediaRecorder(stream, options)
      audioChunksRef.current = []

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || 'audio/webm'
        })
        audioChunksRef.current = []
        setIsRecording(false)

        if (recordingStreamRef.current) {
          recordingStreamRef.current.getTracks().forEach((track) => track.stop())
          recordingStreamRef.current = null
        }

        if (blob.size > 0) {
          const url = URL.createObjectURL(blob)
          setRecordedAudio({ blob, url })
        }
      }

      recorder.start()
      mediaRecorderRef.current = recorder
      setIsRecording(true)
    } catch (error) {
      console.error('❌ Erro ao iniciar gravacao:', error)
      setRecordingError('Nao foi possivel acessar o microfone.')
    }
  }

  function stopRecording() {
    if (!mediaRecorderRef.current) return
    if (mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
  }

  function discardRecording() {
    if (recordedAudio?.url) {
      URL.revokeObjectURL(recordedAudio.url)
    }
    setRecordedAudio(null)
  }

  const selectedConversation = conversations.find(
    (c) => c.remote_jid === selectedRemoteJid
  )

  const typingWindowMs = 8000
  const typingActive =
    !!selectedConversation?.is_typing &&
    !!selectedConversation?.typing_updated_at &&
    Date.now() - new Date(selectedConversation.typing_updated_at).getTime() < typingWindowMs

  const presenceLabel = selectedConversation
    ? typingActive
      ? 'digitando...'
      : selectedConversation.is_online
      ? 'online'
      : selectedConversation.last_seen_at
      ? `visto por ultimo ${formatDistanceToNow(new Date(selectedConversation.last_seen_at), {
          addSuffix: true,
          locale: ptBR
        })}`
      : `${messages.length} mensagens`
    : ''

  const recordingLocked = sending || sendingAudio || sendingMedia || (!!recordedAudio && !isRecording)

  function formatPreviewText(message: WhatsAppMessage) {
    if (message.content) return message.content
    if (message.message_type === 'image') return '[Imagem]'
    if (message.message_type === 'video') return '[Vídeo]'
    if (message.message_type === 'audio') return '[Áudio]'
    if (message.message_type === 'document') return message.caption || '[Documento]'
    if (message.message_type === 'sticker') return '[Sticker]'
    return '[Mensagem]'
  }

  function handleReplyMessage(message: WhatsAppMessage) {
    if (!message.message_id) {
      alert('Mensagem sem ID para responder.')
      return
    }
    setReplyTo(message)
  }

  function setAttachment(file: File) {
    if (pendingAttachmentPreview) {
      URL.revokeObjectURL(pendingAttachmentPreview)
    }
    setPendingAttachment(file)

    if (file.type.startsWith('image/')) {
      setPendingAttachmentPreview(URL.createObjectURL(file))
    } else {
      setPendingAttachmentPreview(null)
    }
  }

  function clearAttachment() {
    if (pendingAttachmentPreview) {
      URL.revokeObjectURL(pendingAttachmentPreview)
    }
    setPendingAttachment(null)
    setPendingAttachmentPreview(null)
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) {
      setAttachment(file)
    }
    event.target.value = ''
  }

  function handlePaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const items = event.clipboardData?.items
    if (!items) return

    for (const item of Array.from(items)) {
      if (item.kind === 'file') {
        const file = item.getAsFile()
        if (file) {
          setAttachment(file)
          event.preventDefault()
          break
        }
      }
    }
  }

  // Enviar mensagem
  async function handleSendMessage() {
    if (pendingAttachment) {
      await handleSendMedia()
      return
    }

    if (!newMessage.trim() || !selectedRemoteJid || sending) return

    if (replyTo && !replyTo.message_id) {
      alert('Mensagem selecionada para resposta sem ID.')
      return
    }

    const messageText = newMessage.trim()
    const optimisticId = `optimistic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const optimisticTimestamp = new Date().toISOString()
    const optimisticMessage: WhatsAppMessage = {
      id: optimisticId,
      remote_jid: selectedRemoteJid,
      content: messageText,
      message_type: 'text',
      from_me: true,
      timestamp: optimisticTimestamp,
      status: 'sent',
      created_at: optimisticTimestamp
    }

    setMessages((prev) => [...prev, optimisticMessage])
    setNewMessage('')
    setTimeout(() => scrollToBottom(), 0)

    setSending(true)
    try {
      const response = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          remoteJid: selectedRemoteJid,
          message: messageText,
          quotedMessageId: replyTo?.message_id
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Erro ao enviar mensagem')
      }

      const payload = await response.json()
      const apiMessage = payload?.data
      const messageId = apiMessage?.key?.id
      const messageTimestamp = apiMessage?.messageTimestamp
      const updatedTimestamp =
        typeof messageTimestamp === 'number'
          ? new Date(messageTimestamp * 1000).toISOString()
          : optimisticTimestamp
      const mediaUrl =
        apiMessage?.message?.audioMessage?.url ||
        apiMessage?.message?.audioMessage?.mediaUrl ||
        apiMessage?.message?.audioMessage?.directPath

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === optimisticId
            ? {
                ...msg,
                message_id: messageId || msg.message_id,
                timestamp: updatedTimestamp,
                media_url: mediaUrl || msg.media_url,
                raw_payload: apiMessage || msg.raw_payload
              }
            : msg
        )
      )

      console.log('✅ Mensagem enviada com sucesso')
      setReplyTo(null)
    } catch (error) {
      setMessages((prev) => prev.filter((msg) => msg.id !== optimisticId))
      setNewMessage(messageText)
      console.error('❌ Erro ao enviar mensagem:', error)
      alert('Erro ao enviar mensagem. Tente novamente.')
    } finally {
      setSending(false)
    }
  }

  function inferMediaType(file: File) {
    if (file.type === 'image/webp') return 'sticker'
    if (file.type.startsWith('image/')) return 'image'
    if (file.type.startsWith('video/')) return 'video'
    return 'document'
  }

  async function handleSendMedia() {
    if (!pendingAttachment || !selectedRemoteJid || sendingMedia) return

    if (pendingAttachment.type.startsWith('audio/')) {
      alert('Para audio, use o gravador integrado.')
      return
    }

    const mediatype = inferMediaType(pendingAttachment)
    const caption = newMessage.trim()
    const optimisticPreviewUrl = URL.createObjectURL(pendingAttachment)
    const optimisticId = `optimistic-media-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`
    const optimisticTimestamp = new Date().toISOString()
    const messageType =
      mediatype === 'image'
        ? 'image'
        : mediatype === 'video'
        ? 'video'
        : mediatype === 'sticker'
        ? 'sticker'
        : 'document'
    const fallbackContent =
      mediatype === 'image'
        ? '[Imagem]'
        : mediatype === 'video'
        ? '[Vídeo]'
        : mediatype === 'sticker'
        ? '[Sticker]'
        : pendingAttachment.name || '[Documento]'
    const optimisticMessage: WhatsAppMessage = {
      id: optimisticId,
      remote_jid: selectedRemoteJid,
      content: caption || fallbackContent,
      message_type: messageType,
      media_url: optimisticPreviewUrl,
      caption: caption || undefined,
      from_me: true,
      timestamp: optimisticTimestamp,
      status: 'sent',
      created_at: optimisticTimestamp
    }

    setMessages((prev) => [...prev, optimisticMessage])
    updateConversationPreview(
      selectedRemoteJid,
      optimisticMessage.content || '[Mídia]',
      true,
      optimisticTimestamp
    )
    setNewMessage('')
    setSendingMedia(true)
    setTimeout(() => scrollToBottom(), 0)

    try {
      const formData = new FormData()
      formData.append('remoteJid', selectedRemoteJid)
      formData.append('file', pendingAttachment)
      if (caption) formData.append('caption', caption)
      formData.append('mediatype', mediatype)
      formData.append('mimetype', pendingAttachment.type)

      const response = await fetch('/api/whatsapp/send-media', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Erro ao enviar midia')
      }

      const payload = await response.json()
      const apiMessage = payload?.data
      const messageId = apiMessage?.key?.id
      const messageTimestamp = apiMessage?.messageTimestamp
      const updatedTimestamp =
        typeof messageTimestamp === 'number'
          ? new Date(messageTimestamp * 1000).toISOString()
          : optimisticTimestamp

      let mediaUrl: string | undefined
      if (mediatype === 'image') {
        mediaUrl =
          apiMessage?.message?.imageMessage?.url ||
          apiMessage?.message?.imageMessage?.mediaUrl ||
          apiMessage?.message?.imageMessage?.directPath
      } else if (mediatype === 'video') {
        mediaUrl =
          apiMessage?.message?.videoMessage?.url ||
          apiMessage?.message?.videoMessage?.mediaUrl ||
          apiMessage?.message?.videoMessage?.directPath
      } else if (mediatype === 'sticker') {
        mediaUrl =
          apiMessage?.message?.stickerMessage?.url ||
          apiMessage?.message?.stickerMessage?.mediaUrl ||
          apiMessage?.message?.stickerMessage?.directPath
      } else {
        mediaUrl =
          apiMessage?.message?.documentMessage?.url ||
          apiMessage?.message?.documentMessage?.mediaUrl ||
          apiMessage?.message?.documentMessage?.directPath
      }

      if (mediaUrl && optimisticPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(optimisticPreviewUrl)
      }

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === optimisticId
            ? {
                ...msg,
                message_id: messageId || msg.message_id,
                timestamp: updatedTimestamp,
                media_url: mediaUrl || msg.media_url,
                raw_payload: apiMessage || msg.raw_payload
              }
            : msg
        )
      )

      updateConversationPreview(
        selectedRemoteJid,
        optimisticMessage.content || '[Mídia]',
        true,
        updatedTimestamp
      )
      clearAttachment()
      setReplyTo(null)
    } catch (error) {
      setMessages((prev) => prev.filter((msg) => msg.id !== optimisticId))
      if (optimisticPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(optimisticPreviewUrl)
      }
      console.error('❌ Erro ao enviar midia:', error)
      alert('Erro ao enviar midia. Tente novamente.')
    } finally {
      setSendingMedia(false)
    }
  }

  async function handleSendAudio() {
    if (!recordedAudio || !selectedRemoteJid || sendingAudio) return

    const optimisticId = `optimistic-audio-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`
    const optimisticTimestamp = new Date().toISOString()
    const optimisticMessage: WhatsAppMessage = {
      id: optimisticId,
      remote_jid: selectedRemoteJid,
      content: '[Áudio]',
      message_type: 'audio',
      from_me: true,
      timestamp: optimisticTimestamp,
      status: 'sent',
      created_at: optimisticTimestamp
    }

    setMessages((prev) => [...prev, optimisticMessage])
    updateConversationPreview(selectedRemoteJid, '[Áudio]', true, optimisticTimestamp)
    setTimeout(() => scrollToBottom(), 0)

    setSendingAudio(true)
    try {
      const formData = new FormData()
      formData.append('remoteJid', selectedRemoteJid)
      formData.append('file', recordedAudio.blob, 'audio.webm')
      formData.append('encoding', 'true')
      formData.append('delay', '1200')

      const response = await fetch('/api/whatsapp/send-audio', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Erro ao enviar audio')
      }

      const payload = await response.json()
      const apiMessage = payload?.data
      const messageId = apiMessage?.key?.id
      const messageTimestamp = apiMessage?.messageTimestamp
      const updatedTimestamp =
        typeof messageTimestamp === 'number'
          ? new Date(messageTimestamp * 1000).toISOString()
          : optimisticTimestamp

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === optimisticId
            ? {
                ...msg,
                message_id: messageId || msg.message_id,
                timestamp: updatedTimestamp,
                raw_payload: apiMessage || msg.raw_payload
              }
            : msg
        )
      )

      updateConversationPreview(selectedRemoteJid, '[Áudio]', true, updatedTimestamp)
      setRecordedAudio(null)
      setReplyTo(null)
    } catch (error) {
      setMessages((prev) => prev.filter((msg) => msg.id !== optimisticId))
      console.error('❌ Erro ao enviar audio:', error)
      alert('Erro ao enviar audio. Tente novamente.')
    } finally {
      setSendingAudio(false)
    }
  }

  async function handleDeleteMessage(message: WhatsAppMessage) {
    if (!message.message_id) {
      alert('Mensagem sem ID para apagar.')
      return
    }

    const confirmed = window.confirm('Apagar esta mensagem para todos?')
    if (!confirmed) return

    const previousSnapshot = { ...message }
    const deletedContent = '[Mensagem apagada]'
    const fromMeNormalized = normalizeFromMe(message.from_me)

    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === message.id || msg.message_id === message.message_id
          ? {
              ...msg,
              content: deletedContent,
              message_type: 'text',
              media_url: undefined,
              caption: undefined
            }
          : msg
      )
    )

    updateConversationPreview(message.remote_jid, deletedContent, fromMeNormalized, message.timestamp)

    try {
      const response = await fetch('/api/whatsapp/delete-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId: message.message_id,
          messageDbId: message.id,
          remoteJid: message.remote_jid,
          fromMe: fromMeNormalized,
          participant: message.raw_payload?.key?.participant
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Erro ao apagar mensagem')
      }
    } catch (error) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === message.id || msg.message_id === message.message_id
            ? previousSnapshot
            : msg
        )
      )
      updateConversationPreview(
        previousSnapshot.remote_jid,
        previousSnapshot.content || '[Mídia]',
        !!previousSnapshot.from_me,
        previousSnapshot.timestamp
      )
      console.error('❌ Erro ao apagar mensagem:', error)
      alert('Erro ao apagar mensagem. Tente novamente.')
    }
  }

  async function handleEditMessage(message: WhatsAppMessage) {
    if (!message.message_id) {
      alert('Mensagem sem ID para editar.')
      return
    }

    const currentContent = message.content || ''
    const nextContent = window.prompt('Editar mensagem', currentContent)

    if (nextContent === null) return

    const trimmed = nextContent.trim()
    if (!trimmed) {
      alert('A mensagem nao pode ficar vazia.')
      return
    }

    if (trimmed === currentContent) return

    const previousSnapshot = { ...message }

    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === message.id || msg.message_id === message.message_id
          ? { ...msg, content: trimmed }
          : msg
      )
    )

    const fromMeNormalized = normalizeFromMe(message.from_me)

    updateConversationPreview(message.remote_jid, trimmed, fromMeNormalized, message.timestamp)

    try {
      const response = await fetch('/api/whatsapp/update-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId: message.message_id,
          messageDbId: message.id,
          remoteJid: message.remote_jid,
          fromMe: fromMeNormalized,
          content: trimmed
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Erro ao editar mensagem')
      }
    } catch (error) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === message.id || msg.message_id === message.message_id
            ? previousSnapshot
            : msg
        )
      )
      updateConversationPreview(
        previousSnapshot.remote_jid,
        previousSnapshot.content || '[Mídia]',
        !!previousSnapshot.from_me,
        previousSnapshot.timestamp
      )
      console.error('❌ Erro ao editar mensagem:', error)
      alert('Erro ao editar mensagem. Tente novamente.')
    }
  }

  // Aplicar filtros
  let filteredConversations = conversations.filter((c) => {
    const name = c.name || c.push_name || c.remote_jid
    const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase())
    
    if (!matchesSearch) return false
    
    // Filtro por tipo
    if (activeFilter === 'unread') {
      return c.unread_count > 0
    }
    if (activeFilter === 'favorites') {
      return false // TODO: Implementar favoritos no banco
    }
    if (activeFilter === 'groups') {
      return c.remote_jid.includes('@g.us')
    }
    
    return true // 'all'
  })

  return (
    <ChatLayout
      sidebar={
        <>
          {/* Header da sidebar - Estilo WhatsApp */}
          <div className="h-[60px] bg-[#202c33] border-b border-gray-700 px-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Avatar do usuário */}
              <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-gray-300" />
              </div>
            </div>

            {/* Ícones de ação */}
            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  await loadConversations()
                  await loadStats()
                  if (selectedRemoteJid) {
                    await loadMessages(selectedRemoteJid)
                  }
                }}
                className="p-2 hover:bg-gray-700 rounded-full transition-colors"
                title="Atualizar conversas"
              >
                <RefreshCw className="w-5 h-5 text-gray-300 hover:text-white" />
              </button>
            </div>
          </div>

          {/* Busca - Estilo WhatsApp */}
          <div className="px-3 py-2 bg-[#111b21]">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Pesquisar ou começar uma nova conversa"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-2 bg-[#202c33] text-white text-sm rounded-lg focus:outline-none placeholder-gray-500"
              />
            </div>
          </div>

          {/* Filtros - Estilo WhatsApp */}
          <div className="px-3 py-2 bg-[#111b21] border-b border-gray-800">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  activeFilter === 'all'
                    ? 'bg-[#00a884] text-white'
                    : 'bg-[#2a3942] text-gray-300 hover:bg-[#374952]'
                }`}
              >
                Tudo
              </button>
              <button
                onClick={() => setActiveFilter('unread')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  activeFilter === 'unread'
                    ? 'bg-[#00a884] text-white'
                    : 'bg-[#2a3942] text-gray-300 hover:bg-[#374952]'
                }`}
              >
                Não lidas
              </button>
              <button
                onClick={() => setActiveFilter('favorites')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  activeFilter === 'favorites'
                    ? 'bg-[#00a884] text-white'
                    : 'bg-[#2a3942] text-gray-300 hover:bg-[#374952]'
                }`}
              >
                Favoritas
              </button>
              <button
                onClick={() => setActiveFilter('groups')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  activeFilter === 'groups'
                    ? 'bg-[#00a884] text-white'
                    : 'bg-[#2a3942] text-gray-300 hover:bg-[#374952]'
                }`}
              >
                Grupos
              </button>
            </div>
          </div>

          {/* Lista de conversas */}
          <div className="flex-1 overflow-y-auto bg-[#111b21]">
            {loading ? (
              <div className="p-8 text-center text-gray-400">
                <div className="flex flex-col items-center gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin" />
                  <p className="text-sm">Carregando conversas...</p>
                </div>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhuma conversa encontrada</p>
              </div>
            ) : (
              <ContactList
                conversations={filteredConversations}
                selectedRemoteJid={selectedRemoteJid || undefined}
                onSelectConversation={setSelectedRemoteJid}
              />
            )}
          </div>
        </>
      }
    >
      {selectedConversation ? (
        <div className="flex flex-col h-full min-h-0">
          {/* Header do chat - Estilo WhatsApp */}
          <div className="h-[60px] bg-[#202c33] border-b border-gray-700 px-4 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              {/* Avatar */}
              {selectedConversation.profile_picture_url ? (
                <img
                  src={selectedConversation.profile_picture_url}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#6b7c85] flex items-center justify-center text-white font-bold text-sm">
                  {(selectedConversation.name?.[0] || selectedConversation.push_name?.[0] || '?').toUpperCase()}
                </div>
              )}
              
              {/* Nome e info */}
              <div>
                <h3 className="font-medium text-white text-[16px]">
                  {selectedConversation.name ||
                    selectedConversation.push_name ||
                    selectedConversation.remote_jid}
                </h3>
                <p className="text-xs text-gray-400">
                  {presenceLabel}
                </p>
              </div>
            </div>

            {/* Ícones de ação */}
            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-gray-700 rounded-full transition-colors">
                <Search className="w-5 h-5 text-gray-300" />
              </button>
            </div>
          </div>

          {/* Área de mensagens - Background WhatsApp */}
          <div
            className="flex-1 overflow-y-auto p-4 bg-[#0b141a] min-h-0 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent hover:scrollbar-thumb-white/20"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='400' height='400' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='pattern' x='0' y='0' width='40' height='40' patternUnits='userSpaceOnUse'%3E%3Cpath d='M0 20 Q10 10 20 20 T40 20' stroke='%23ffffff' stroke-width='0.3' fill='none' opacity='0.05'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='400' height='400' fill='url(%23pattern)'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'repeat',
              backgroundSize: '400px 400px'
            }}
          >
            {loadingMessages ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-2 text-gray-400">
                  <RefreshCw className="w-6 h-6 animate-spin" />
                  <p className="text-sm">Carregando mensagens...</p>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-400">
                  <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhuma mensagem ainda</p>
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    onDelete={handleDeleteMessage}
                    onEdit={handleEditMessage}
                    onReply={handleReplyMessage}
                  />
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input de mensagem - Estilo WhatsApp */}
          <div className="bg-[#202c33] border-t border-gray-700 px-4 py-3 flex-shrink-0">
            <div className="flex flex-col gap-2">
              {replyTo && (
                <div className="flex items-center justify-between gap-3 bg-[#1f2a30] rounded-lg px-3 py-2 text-xs text-gray-200">
                  <div className="min-w-0">
                    <div className="text-[11px] text-emerald-300">Respondendo</div>
                    <div className="truncate">{formatPreviewText(replyTo)}</div>
                  </div>
                  <button
                    onClick={() => setReplyTo(null)}
                    className="p-1 rounded-full hover:bg-white/10 transition"
                    title="Cancelar resposta"
                  >
                    <X className="w-4 h-4 text-gray-300" />
                  </button>
                </div>
              )}

              {pendingAttachment && (
                <div className="flex items-center gap-3 bg-[#1f2a30] rounded-lg px-3 py-2">
                  {pendingAttachmentPreview ? (
                    <img
                      src={pendingAttachmentPreview}
                      alt="Preview"
                      className="w-12 h-12 object-cover rounded-md"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-md bg-[#2a3942] flex items-center justify-center">
                      {pendingAttachment.type.startsWith('image/') ? (
                        <ImageIcon className="w-5 h-5 text-gray-300" />
                      ) : (
                        <FileText className="w-5 h-5 text-gray-300" />
                      )}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-200 truncate">{pendingAttachment.name}</div>
                    <div className="text-xs text-gray-400">
                      {(pendingAttachment.size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                  <button
                    onClick={clearAttachment}
                    className="p-1 rounded-full hover:bg-white/10 transition"
                    title="Remover anexo"
                  >
                    <X className="w-4 h-4 text-gray-300" />
                  </button>
                </div>
              )}

              {recordedAudio && (
                <div className="flex items-center gap-2 bg-[#2a3942] rounded-lg px-3 py-2">
                  <audio controls src={recordedAudio.url} className="flex-1" />
                  <button
                    onClick={handleSendAudio}
                    disabled={sendingAudio}
                    className="p-2 bg-[#00a884] text-white rounded-full hover:bg-[#00a884]/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Enviar audio"
                  >
                    {sendingAudio ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={discardRecording}
                    disabled={sendingAudio}
                    className="p-2 rounded-full hover:bg-white/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Descartar gravacao"
                  >
                    <Trash2 className="w-4 h-4 text-gray-300" />
                  </button>
                </div>
              )}

              {isRecording && (
                <div className="flex items-center gap-2 text-xs text-red-400 px-1">
                  <span className="animate-pulse">●</span>
                  Gravando audio...
                  <button
                    onClick={stopRecording}
                    className="ml-1 inline-flex items-center gap-1 text-gray-300 hover:text-white"
                  >
                    <StopCircle className="w-4 h-4" />
                    Parar
                  </button>
                </div>
              )}

              {recordingError && (
                <div className="text-xs text-red-400 px-1">{recordingError}</div>
              )}

              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 rounded-full hover:bg-white/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Anexar arquivo"
                  disabled={sending || sendingMedia || isRecording}
                >
                  <Paperclip className="w-5 h-5 text-gray-300" />
                </button>
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={recordingLocked}
                  className="p-2 rounded-full hover:bg-white/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  title={isRecording ? 'Parar gravacao' : 'Gravar audio'}
                >
                  {isRecording ? (
                    <StopCircle className="w-5 h-5 text-red-400" />
                  ) : (
                    <Mic className="w-5 h-5 text-gray-300" />
                  )}
                </button>
                <textarea
                  rows={1}
                  placeholder="Escrever uma mensagem (Enter envia, Shift/Ctrl+Enter quebra linha)"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onPaste={handlePaste}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                  disabled={sending || sendingMedia || isRecording}
                  className="flex-1 px-4 py-2 bg-[#2a3942] text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00a884] disabled:opacity-50 disabled:cursor-not-allowed placeholder-gray-500 resize-none min-h-[40px] max-h-[120px]"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={sending || sendingMedia || (!newMessage.trim() && !pendingAttachment)}
                  className="p-2 bg-[#00a884] text-white rounded-full hover:bg-[#00a884]/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending || sendingMedia ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Estado vazio - Estilo WhatsApp
        <div className="flex-1 flex items-center justify-center bg-[#222e35] border-l border-gray-700">
          <div className="text-center text-gray-400">
            <div className="w-48 h-48 mx-auto mb-6 bg-[#202c33] rounded-full flex items-center justify-center">
              <MessageSquare className="w-24 h-24 opacity-20" />
            </div>
            <h3 className="text-2xl font-light mb-2 text-gray-300">WhatsApp Inbox</h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              Selecione uma conversa à esquerda para visualizar as mensagens
            </p>
          </div>
        </div>
      )}
    </ChatLayout>
  )
}
