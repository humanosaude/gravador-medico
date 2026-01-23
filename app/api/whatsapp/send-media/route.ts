// ================================================================
// API: Enviar midia (imagem/video/documento) via Evolution API
// ================================================================

import { NextRequest, NextResponse } from 'next/server'
import { upsertWhatsAppMessage } from '@/lib/whatsapp-db'

function inferMediaType(mimetype: string | undefined) {
  if (!mimetype) return 'document'
  if (mimetype === 'image/webp') return 'sticker'
  if (mimetype.startsWith('image/')) return 'image'
  if (mimetype.startsWith('video/')) return 'video'
  return 'document'
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const remoteJid = formData.get('remoteJid')
    const file = formData.get('file')
    const caption = formData.get('caption')
    const mediatypeInput = formData.get('mediatype')
    const mimetypeInput = formData.get('mimetype')

    if (!remoteJid || typeof remoteJid !== 'string') {
      return NextResponse.json(
        { success: false, message: 'remoteJid e obrigatorio' },
        { status: 400 }
      )
    }

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, message: 'arquivo e obrigatorio' },
        { status: 400 }
      )
    }

    const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL
    const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY
    const EVOLUTION_INSTANCE_NAME = process.env.EVOLUTION_INSTANCE_NAME

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !EVOLUTION_INSTANCE_NAME) {
      throw new Error('Variaveis de ambiente da Evolution API nao configuradas')
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const base64 = buffer.toString('base64')
    const mimetype = typeof mimetypeInput === 'string' ? mimetypeInput : file.type
    const mediatype =
      typeof mediatypeInput === 'string' && mediatypeInput
        ? mediatypeInput
        : inferMediaType(mimetype)

    const url = `${EVOLUTION_API_URL}/message/sendMedia/${EVOLUTION_INSTANCE_NAME}`

    const payload: Record<string, unknown> = {
      number: remoteJid,
      mediatype,
      mimetype: mimetype || undefined,
      media: base64,
      fileName: file.name
    }

    if (caption && typeof caption === 'string' && caption.trim()) {
      payload.caption = caption.trim()
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        apikey: EVOLUTION_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('❌ Erro da Evolution API:', error)
      throw new Error(`Erro ao enviar midia: ${response.statusText}`)
    }

    const data = await response.json()

    try {
      const messageTimestamp = data?.messageTimestamp
      const timestamp =
        typeof messageTimestamp === 'number'
          ? new Date(messageTimestamp * 1000).toISOString()
          : new Date().toISOString()

      let mediaUrl: string | undefined
      if (mediatype === 'image') {
        mediaUrl =
          data?.message?.imageMessage?.url ||
          data?.message?.imageMessage?.mediaUrl ||
          data?.message?.imageMessage?.directPath
      } else if (mediatype === 'video') {
        mediaUrl =
          data?.message?.videoMessage?.url ||
          data?.message?.videoMessage?.mediaUrl ||
          data?.message?.videoMessage?.directPath
      } else if (mediatype === 'sticker') {
        mediaUrl =
          data?.message?.stickerMessage?.url ||
          data?.message?.stickerMessage?.mediaUrl ||
          data?.message?.stickerMessage?.directPath
      } else {
        mediaUrl =
          data?.message?.documentMessage?.url ||
          data?.message?.documentMessage?.mediaUrl ||
          data?.message?.documentMessage?.directPath
      }

      const contentLabel =
        mediatype === 'image'
          ? '[Imagem]'
          : mediatype === 'video'
          ? '[Vídeo]'
          : mediatype === 'sticker'
          ? '[Sticker]'
          : file.name || '[Documento]'

      await upsertWhatsAppMessage({
        message_id: data?.key?.id,
        remote_jid: data?.key?.remoteJid || remoteJid,
        content: typeof caption === 'string' && caption.trim() ? caption.trim() : contentLabel,
        message_type:
          mediatype === 'image'
            ? 'image'
            : mediatype === 'video'
            ? 'video'
            : mediatype === 'sticker'
            ? 'sticker'
            : 'document',
        media_url: mediaUrl || undefined,
        caption: typeof caption === 'string' && caption.trim() ? caption.trim() : undefined,
        from_me: true,
        timestamp,
        raw_payload: data
      })
    } catch (dbError) {
      console.error('❌ Erro ao salvar midia no banco (nao-fatal):', dbError)
    }

    return NextResponse.json({
      success: true,
      message: 'Midia enviada com sucesso',
      data
    })
  } catch (error) {
    console.error('❌ Erro ao enviar midia:', error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}
