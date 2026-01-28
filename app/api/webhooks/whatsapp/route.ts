// ================================================================
// WEBHOOK: Evolution API v2 - MESSAGES_UPSERT
// ================================================================
// Endpoint: POST /api/webhooks/whatsapp
// Recebe eventos de mensagens da Evolution API e salva no banco
// ================================================================

import { NextRequest, NextResponse } from 'next/server'
import {
  upsertWhatsAppMessage,
  upsertWhatsAppContact,
  messageExists,
  updateWhatsAppMessageStatus
} from '@/lib/whatsapp-db'
import { syncConversationHistory } from '@/lib/whatsapp-sync'
import type { CreateMessageInput } from '@/lib/types/whatsapp'

// ================================================================
// Mapear status da Evolution API para nosso schema
// ================================================================
function mapEvolutionStatus(evolutionStatus?: string): 'sent' | 'delivered' | 'read' | 'error' | undefined {
  if (!evolutionStatus) return undefined
  
  const status = evolutionStatus.toUpperCase()
  
  if (status === 'PENDING' || status === 'SENT') return 'sent'
  if (status === 'SERVER_ACK' || status === 'DELIVERY_ACK') return 'delivered'
  if (status === 'READ' || status === 'PLAYED') return 'read'
  if (status === 'ERROR' || status === 'FAILED') return 'error'
  
  return 'sent' // default
}

function normalizeFromMeValue(value: unknown): boolean {
  // IMPORTANTE: Apenas retorna true se o valor for explicitamente true
  // Qualquer outro valor (false, undefined, null, 0, '') retorna false
  const result = value === true || value === 'true' || value === 1 || value === '1'
  console.log('🔍 [normalizeFromMeValue] input:', value, 'type:', typeof value, '-> output:', result)
  return result
}

function resolveMessageType(message: any, fallback?: string) {
  if (fallback) return fallback
  if (!message || typeof message !== 'object') return 'unknown'

  if (message.conversation || message.extendedTextMessage) return 'text'
  if (message.imageMessage) return 'image'
  if (message.videoMessage) return 'video'
  if (message.audioMessage) return 'audio'
  if (message.documentMessage) return 'document'
  if (message.stickerMessage) return 'sticker'
  if (message.locationMessage) return 'location'
  if (message.contactMessage) return 'contact'

  return Object.keys(message)[0] || 'unknown'
}

function extractWebhookMessage(payload: any) {
  const data = payload?.data

  if (!data) return null

  if (data.key) {
    return {
      key: data.key,
      message: data.message,
      messageType: data.messageType,
      messageTimestamp: data.messageTimestamp,
      pushName: data.pushName,
      status: data.status,
      rawData: data
    }
  }

  if (Array.isArray(data.messages) && data.messages.length > 0) {
    const first = data.messages[0]
    return {
      key: first.key,
      message: first.message,
      messageType: first.messageType ?? data.messageType,
      messageTimestamp: first.messageTimestamp ?? data.messageTimestamp,
      pushName: first.pushName ?? data.pushName,
      status: first.status ?? data.status,
      rawData: first
    }
  }

  if (data.message?.key) {
    const first = data.message
    return {
      key: first.key,
      message: first.message ?? first,
      messageType: first.messageType ?? data.messageType,
      messageTimestamp: first.messageTimestamp ?? data.messageTimestamp,
      pushName: first.pushName ?? data.pushName,
      status: first.status ?? data.status,
      rawData: first
    }
  }

  return null
}

function normalizeRemoteJid(remoteJid: string, remoteJidAlt?: string | null) {
  if (remoteJid?.endsWith('@lid') && remoteJidAlt) {
    return remoteJidAlt
  }

  return remoteJid
}

async function syncConversationIfPossible(remoteJid: string, limit = 20): Promise<boolean> {
  const apiUrl = process.env.EVOLUTION_API_URL
  const apiKey = process.env.EVOLUTION_API_KEY
  const instanceName = process.env.EVOLUTION_INSTANCE_NAME

  if (!apiUrl || !apiKey || !instanceName) {
    console.warn('[webhook] Evolution API not configured, skipping sync')
    return false
  }

  try {
    await syncConversationHistory({ apiUrl, apiKey, instanceName }, remoteJid, limit)
    return true
  } catch (error) {
    console.warn('[webhook] Failed to sync conversation:', error)
    return false
  }
}

/**
 * Busca a foto de perfil E o nome do contato usando endpoint correto Evolution v2
 * 
 * ESTRATÉGIA DEFINITIVA (confirmada via fetchInstances):
 * 1. Tenta extrair do próprio payload da mensagem
 * 2. Usa POST /chat/findContacts/{instance} com body {number: xxx} (CONFIRMADO FUNCIONANDO)
 * 3. BUSCA O CONTATO ESPECÍFICO no array (não pega o primeiro)
 * 4. Se falhar, retorna null e NÃO TRAVA o processo
 * 
 * IMPORTANTE: 
 * - Body usa apenas o número (sem @s.whatsapp.net)
 * - Resposta é ARRAY - precisa encontrar o contato correto por remoteJid
 * - Campo da foto: "profilePicUrl" ou "profilePictureUrl"
 * - Campo do nome: "pushName" ou "name"
 * - Mensagem SEMPRE será salva, mesmo sem foto/nome
 */
async function fetchContactInfo(
  remoteJid: string, 
  participant: string | undefined,
  messagePayload?: any
): Promise<{ profilePictureUrl: string | null; pushName: string | null }> {
  const defaultResult = { profilePictureUrl: null, pushName: null }
  
  // Wrapper try-catch global para garantir que NUNCA trava
  try {
    const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL
    const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY
    const EVOLUTION_INSTANCE_NAME = process.env.EVOLUTION_INSTANCE_NAME

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !EVOLUTION_INSTANCE_NAME) {
      console.warn('⚠️ [fetchContactInfo] Variáveis de ambiente não configuradas')
      return defaultResult
    }

    // ================================================================
    // ESTRATÉGIA 1: Verificar se os dados já vêm no payload da mensagem
    // ================================================================
    let photoFromPayload: string | null = null
    let nameFromPayload: string | null = null
    
    if (messagePayload) {
      photoFromPayload = 
        messagePayload.profilePictureUrl ||
        messagePayload.profilePicUrl ||
        messagePayload.picture ||
        messagePayload.imgUrl ||
        null
        
      nameFromPayload = 
        messagePayload.pushName ||
        messagePayload.name ||
        messagePayload.verifiedName ||
        null

      if (photoFromPayload && nameFromPayload) {
        console.log(`✅ [fetchContactInfo] Dados encontrados no payload: ${nameFromPayload}`)
        return { profilePictureUrl: photoFromPayload, pushName: nameFromPayload }
      }
    }

    // ================================================================
    // ESTRATÉGIA 2: POST /chat/findContacts (VALIDADO via terminal)
    // Busca foto E nome do contato do WhatsApp
    // ================================================================
    
    // 🎯 IDENTIFICAR REMETENTE CORRETO
    const isGroup = remoteJid.includes('@g.us')
    const actualSenderJid = isGroup && participant ? participant : remoteJid
    const phoneNumber = actualSenderJid.split('@')[0]
    
    const url = `${EVOLUTION_API_URL}/chat/findContacts/${EVOLUTION_INSTANCE_NAME}`
    const requestBody = { number: phoneNumber }
    
    console.log(`📸 [fetchContactInfo] Buscando info: ${phoneNumber} (${isGroup ? 'grupo' : 'privado'})`)
    
    // Timeout de 5 segundos para não travar o webhook
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': EVOLUTION_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.error(`❌ [fetchContactInfo] Erro HTTP ${response.status}`)
      return { profilePictureUrl: photoFromPayload, pushName: nameFromPayload }
    }

    const data = await response.json()
    console.log(`📋 [fetchContactInfo] Resposta da API:`, JSON.stringify(data).substring(0, 500))
    
    const contacts = Array.isArray(data) ? data : (data ? [data] : [])
    
    if (contacts.length === 0) {
      console.log(`⚠️ [fetchContactInfo] Nenhum contato retornado para ${phoneNumber}`)
      return { profilePictureUrl: photoFromPayload, pushName: nameFromPayload }
    }
    
    // 🎯 BUSCAR CONTATO ESPECÍFICO (não pegar o primeiro!)
    // Tenta encontrar pelo remoteJid exato, ou pega o primeiro se não encontrar
    const targetContact = contacts.find((c: any) => c.remoteJid === actualSenderJid) || contacts[0]
    
    console.log(`📋 [fetchContactInfo] Contato encontrado:`, JSON.stringify(targetContact).substring(0, 300))
    
    // Extrair foto
    const photoUrl = 
      targetContact.profilePicUrl ||
      targetContact.profilePictureUrl || 
      targetContact.picture ||
      targetContact.imgUrl ||
      photoFromPayload ||
      null
      
    // Extrair nome - vários campos possíveis
    const contactName = 
      targetContact.pushName ||
      targetContact.name ||
      targetContact.verifiedName ||
      targetContact.notify ||
      targetContact.displayName ||
      nameFromPayload ||
      null

    if (photoUrl || contactName) {
      console.log(`✅ [fetchContactInfo] Dados obtidos - Nome: "${contactName}", Foto: ${photoUrl ? 'sim' : 'não'}`)
    }
    
    return { 
      profilePictureUrl: photoUrl, 
      pushName: contactName 
    }
    
  } catch (error) {
    // CRÍTICO: Mesmo com erro, retorna objeto vazio para não travar o webhook
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('⏱️ [fetchContactInfo] Timeout - continuando sem dados')
    } else {
      console.error('❌ [fetchContactInfo] Erro (não crítico):', error)
    }
    return defaultResult
  }
}

/**
 * Extrai conteúdo e tipo da mensagem do payload da Evolution API
 */
function extractMessageContent(message: any, messageType: string) {
  let content: string | undefined
  let media_url: string | undefined
  let caption: string | undefined
  let type: CreateMessageInput['message_type'] = 'text'

  // Texto simples
  if (message.conversation) {
    content = message.conversation
    type = 'text'
  }
  // Texto estendido (resposta, etc)
  else if (message.extendedTextMessage?.text) {
    content = message.extendedTextMessage.text
    type = 'text'
  }
  // Imagem
  else if (message.imageMessage) {
    media_url =
      message.imageMessage.url ||
      message.imageMessage.mediaUrl ||
      message.imageMessage.directPath
    const imageBase64 =
      message.imageMessage.base64 ||
      message.imageMessage.data
    const imageMime =
      message.imageMessage.mimetype ||
      message.imageMessage.mimeType
    if (!media_url && typeof imageBase64 === 'string') {
      media_url = imageBase64.startsWith('data:')
        ? imageBase64
        : imageMime
        ? `data:${imageMime};base64,${imageBase64}`
        : imageBase64
    }
    caption = message.imageMessage.caption
    content = caption || '[Imagem]'
    type = 'image'
  }
  // Vídeo
  else if (message.videoMessage) {
    media_url =
      message.videoMessage.url ||
      message.videoMessage.mediaUrl ||
      message.videoMessage.directPath
    const videoBase64 =
      message.videoMessage.base64 ||
      message.videoMessage.data
    const videoMime =
      message.videoMessage.mimetype ||
      message.videoMessage.mimeType
    if (!media_url && typeof videoBase64 === 'string') {
      media_url = videoBase64.startsWith('data:')
        ? videoBase64
        : videoMime
        ? `data:${videoMime};base64,${videoBase64}`
        : videoBase64
    }
    caption = message.videoMessage.caption
    content = caption || '[Vídeo]'
    type = 'video'
  }
  // Áudio
  else if (message.audioMessage) {
    media_url =
      message.audioMessage.url ||
      message.audioMessage.mediaUrl ||
      message.audioMessage.directPath ||
      message.audioMessage.audioUrl
    const audioBase64 =
      message.audioMessage.base64 ||
      message.audioMessage.data
    const audioMime =
      message.audioMessage.mimetype ||
      message.audioMessage.mimeType
    if (!media_url && typeof audioBase64 === 'string') {
      media_url = audioBase64.startsWith('data:')
        ? audioBase64
        : audioMime
        ? `data:${audioMime};base64,${audioBase64}`
        : audioBase64
    }
    content = '[Áudio]'
    type = 'audio'
  }
  // Documento
  else if (message.documentMessage) {
    media_url =
      message.documentMessage.url ||
      message.documentMessage.mediaUrl ||
      message.documentMessage.directPath
    const documentBase64 =
      message.documentMessage.base64 ||
      message.documentMessage.data
    const documentMime =
      message.documentMessage.mimetype ||
      message.documentMessage.mimeType
    if (!media_url && typeof documentBase64 === 'string') {
      media_url = documentBase64.startsWith('data:')
        ? documentBase64
        : documentMime
        ? `data:${documentMime};base64,${documentBase64}`
        : documentBase64
    }
    caption = message.documentMessage.caption
    content = message.documentMessage.fileName || '[Documento]'
    type = 'document'
  }
  // Sticker
  else if (message.stickerMessage) {
    media_url =
      message.stickerMessage.url ||
      message.stickerMessage.mediaUrl ||
      message.stickerMessage.directPath
    const stickerBase64 =
      message.stickerMessage.base64 ||
      message.stickerMessage.data
    const stickerMime =
      message.stickerMessage.mimetype ||
      message.stickerMessage.mimeType
    if (!media_url && typeof stickerBase64 === 'string') {
      media_url = stickerBase64.startsWith('data:')
        ? stickerBase64
        : stickerMime
        ? `data:${stickerMime};base64,${stickerBase64}`
        : stickerBase64
    }
    content = '[Sticker]'
    type = 'sticker'
  }
  // Localização
  else if (message.locationMessage) {
    content = `📍 Localização: ${message.locationMessage.degreesLatitude}, ${message.locationMessage.degreesLongitude}`
    type = 'location'
  }
  // Contato
  else if (message.contactMessage) {
    content = `👤 Contato: ${message.contactMessage.displayName || 'Sem nome'}`
    type = 'contact'
  }
  // Tipo desconhecido
  else {
    content = `[${messageType}]`
  }

  return { content, media_url, caption, type }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()

    // Aceitar tanto "event" quanto "type" (n8n pode enviar "type")
    const event = payload?.event || payload?.type
    const isUpdateEvent = event === 'messages.update'

    if (event !== 'messages.upsert' && event !== 'messages.update') {
      console.log('⚠️ Webhook ignorado - evento inválido:', {
        event,
        receivedPayload: payload
      })
      return NextResponse.json({ 
        success: true, 
        message: 'Evento ignorado (nao e messages.upsert/update)' 
      })
    }

    const extracted = extractWebhookMessage(payload)

    if (!extracted?.key) {
      console.warn('⚠️ Webhook sem payload de mensagem:', {
        event,
        instance: payload?.instance
      })
      return NextResponse.json({
        success: true,
        message: 'Payload sem chave de mensagem'
      })
    }

    const rawKey = extracted.key as any
    
    // 🔍 DEBUG: Log completo do rawKey para diagnóstico
    console.log('🔍 [DEBUG RAW KEY]:', JSON.stringify(rawKey, null, 2))
    
    const key = {
      id: rawKey?.id,
      remoteJid: rawKey?.remoteJid || rawKey?.remote_jid,
      remoteJidAlt: rawKey?.remoteJidAlt || rawKey?.remote_jid_alt,
      fromMe: rawKey?.fromMe ?? rawKey?.from_me,
      participant: rawKey?.participant || rawKey?.participantJid
    }
    
    // 🔍 DEBUG: Log do fromMe especificamente
    console.log('🔍 [DEBUG fromMe] rawKey.fromMe:', rawKey?.fromMe, 'typeof:', typeof rawKey?.fromMe)
    console.log('🔍 [DEBUG fromMe] key.fromMe após extração:', key.fromMe, 'typeof:', typeof key.fromMe)

    if (!key.remoteJid || !key.id) {
      console.warn('⚠️ Webhook com key incompleta:', {
        event,
        instance: payload?.instance,
        key: rawKey
      })
      return NextResponse.json({
        success: true,
        message: 'Payload sem remoteJid ou id'
      })
    }

    const message = extracted.message
    const messageType = resolveMessageType(message, extracted.messageType)
    const messageTimestamp = extracted.messageTimestamp
    const pushName = extracted.pushName
    const status = extracted.status

    console.log('📥 Webhook recebido:', {
      event,
      instance: payload?.instance,
      remoteJid: key.remoteJid,
      remoteJidAlt: key.remoteJidAlt,
      fromMe: key.fromMe,
      messageType,
      fullKey: key
    })
    
    console.log('🔍 [DEBUG from_me] Valor recebido:', key.fromMe, typeof key.fromMe)

    const normalizedRemoteJid = normalizeRemoteJid(key.remoteJid, key.remoteJidAlt)

    // Verificar se mensagem já existe (evitar duplicatas)
    const exists = await messageExists(key.id)
    if (exists) {
      console.log('⚠️ Mensagem já existe:', key.id)
      if (isUpdateEvent && status) {
        try {
          await updateWhatsAppMessageStatus(key.id, mapEvolutionStatus(status) || 'sent')
        } catch (updateError) {
          console.warn('⚠️ Falha ao atualizar status da mensagem:', updateError)
        }
      }
      return NextResponse.json({ 
        success: true, 
        message: 'Mensagem já existe' 
      })
    }

    const hasMessagePayload =
      message && typeof message === 'object' && Object.keys(message).length > 0
    const hasMessageType = typeof messageType === 'string' && messageType.length > 0

    if (isUpdateEvent && (!hasMessagePayload || !hasMessageType)) {
      const synced = await syncConversationIfPossible(normalizedRemoteJid, 30)
      return NextResponse.json({
        success: true,
        message: synced
          ? 'Update sem payload completo, sincronizacao executada'
          : 'Update sem payload completo, sync ignorado'
      })
    }

    // Extrair conteúdo da mensagem
    const { content, media_url, caption, type } = extractMessageContent(message, messageType)

    // ================================================================
    // PASSO 1: Buscar foto E nome do contato (NÃO CRÍTICO - nunca trava)
    // Usa endpoint /chat/findContacts confirmado via teste curl
    // IMPORTANTE: Passa participant para identificar remetente em grupos
    // ================================================================
    const contactInfo = await fetchContactInfo(
      normalizedRemoteJid,
      key.participant,  // Para mensagens de grupo
      extracted.rawData ?? payload?.data ?? payload
    )
    
    const profilePictureUrl = contactInfo.profilePictureUrl
    const fetchedPushName = contactInfo.pushName
    
    if (profilePictureUrl) {
      console.log(`✅ Foto obtida: ${profilePictureUrl.substring(0, 50)}...`)
    }
    if (fetchedPushName) {
      console.log(`✅ Nome obtido: ${fetchedPushName}`)
    }

    // ================================================================
    // PASSO 2: UPSERT do contato PRIMEIRO (resolver FK constraint)
    // GARANTIA: Sempre salva o contato, mesmo sem foto
    // ⚠️ IMPORTANTE: Só atualiza push_name se a mensagem é DO CLIENTE (from_me=false)
    //    Se from_me=true, o pushName seria o nome da instância, não do cliente
    // ================================================================
    
    // 🔧 CORREÇÃO: Determinar from_me ANTES de salvar contato
    const fromMeValue = key.fromMe
    const fromMeBoolean = normalizeFromMeValue(fromMeValue)
    
    // 🎯 PRIORIDADE DE NOMES:
    // 1. Nome buscado via API (fetchedPushName) - mais confiável
    // 2. Nome do payload do webhook (pushName) - pode ser incorreto se from_me=true
    const bestPushName = fetchedPushName || pushName
    
    try {
      console.log(`🔍 [ANTES UPSERT] Contato: ${normalizedRemoteJid}, pushName webhook: "${pushName}", pushName API: "${fetchedPushName}", from_me: ${fromMeBoolean}`)
      
      // ⚠️ Só atualiza push_name se:
      // 1. A mensagem veio DO CLIENTE (não de mim), OU
      // 2. O nome foi obtido via API (fetchedPushName) - sempre confiável
      const shouldUpdatePushName = 
        (fetchedPushName && fetchedPushName !== 'Assistente Virtual') ||
        (!fromMeBoolean && bestPushName && bestPushName !== 'Assistente Virtual')
      
      const contactData = {
        remote_jid: normalizedRemoteJid,
        push_name: shouldUpdatePushName ? bestPushName : undefined,
        profile_picture_url: profilePictureUrl || undefined,
        is_group: normalizedRemoteJid.includes('@g.us')
      }
      
      console.log(`📤 [ENVIANDO UPSERT] shouldUpdatePushName: ${shouldUpdatePushName}, nome: "${contactData.push_name}"`)
      
      const savedContact = await upsertWhatsAppContact(contactData)
      
      console.log(`📥 [RESULTADO UPSERT]`, JSON.stringify({
        remote_jid: savedContact.remote_jid,
        name: savedContact.name,
        push_name: savedContact.push_name
      }, null, 2))
      
      console.log(`✅ Contato salvo: ${normalizedRemoteJid}`)
    } catch (contactError) {
      console.error('❌ Erro ao salvar contato:', contactError)
      throw contactError
    }

    // ================================================================
    // PASSO 3: INSERT da mensagem (agora o FK existe)
    // ================================================================
    // 🔧 fromMeBoolean já foi calculado acima no PASSO 2
    
    console.log('🔍 [DEBUG CONVERSÃO] from_me original:', fromMeValue, typeof fromMeValue)
    console.log('🔍 [DEBUG CONVERSÃO] from_me convertido:', fromMeBoolean, typeof fromMeBoolean)
    
    const messageInput: CreateMessageInput = {
      message_id: key.id,
      remote_jid: normalizedRemoteJid,
      content,
      message_type: type,
      media_url,
      caption,
      from_me: fromMeBoolean,
      timestamp: typeof messageTimestamp === 'number'
        ? new Date(messageTimestamp * 1000).toISOString()
        : new Date().toISOString(),
      status: mapEvolutionStatus(status),
      raw_payload: extracted.rawData ?? payload?.data ?? payload
    }
    
    console.log('🔍 [DEBUG SAVE] Salvando mensagem com from_me:', messageInput.from_me, typeof messageInput.from_me)

    const savedMessage = await upsertWhatsAppMessage(messageInput)
    console.log(`✅ Mensagem salva: ${savedMessage.id}, from_me final: ${savedMessage.from_me}`)

    return NextResponse.json({
      success: true,
      message: 'Mensagem processada com sucesso',
      messageId: savedMessage.id,
      hasProfilePicture: !!profilePictureUrl
    })

  } catch (error) {
    console.error('❌ Erro ao processar webhook:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

// Permitir GET para health check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    webhook: 'whatsapp-evolution-api-v2',
    timestamp: new Date().toISOString()
  })
}
