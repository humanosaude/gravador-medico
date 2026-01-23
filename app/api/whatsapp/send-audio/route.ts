// ================================================================
// API: Enviar audio WhatsApp via Evolution API
// ================================================================

import { NextRequest, NextResponse } from 'next/server'
import { upsertWhatsAppMessage } from '@/lib/whatsapp-db'

function mapEvolutionStatus(
  evolutionStatus?: string
): 'sent' | 'delivered' | 'read' | 'error' | undefined {
  if (!evolutionStatus) return undefined

  const status = evolutionStatus.toUpperCase()

  if (status === 'PENDING' || status === 'SENT') return 'sent'
  if (status === 'SERVER_ACK' || status === 'DELIVERY_ACK') return 'delivered'
  if (status === 'READ' || status === 'PLAYED') return 'read'
  if (status === 'ERROR' || status === 'FAILED') return 'error'

  return 'sent'
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const remoteJid = formData.get('remoteJid')
    const file = formData.get('file')
    const audioBase64 = formData.get('audio')
    const delay = formData.get('delay')
    const encoding = formData.get('encoding')

    if (!remoteJid || typeof remoteJid !== 'string') {
      return NextResponse.json(
        { success: false, message: 'remoteJid e obrigatorio' },
        { status: 400 }
      )
    }

    if (!file && !(audioBase64 && typeof audioBase64 === 'string')) {
      return NextResponse.json(
        { success: false, message: 'audio (arquivo ou base64) e obrigatorio' },
        { status: 400 }
      )
    }

    const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL
    const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY
    const EVOLUTION_INSTANCE_NAME = process.env.EVOLUTION_INSTANCE_NAME

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !EVOLUTION_INSTANCE_NAME) {
      throw new Error('Variaveis de ambiente da Evolution API nao configuradas')
    }

    const url = `${EVOLUTION_API_URL}/message/sendWhatsAppAudio/${EVOLUTION_INSTANCE_NAME}`

    let audioPayload: string | null = null

    if (audioBase64 && typeof audioBase64 === 'string') {
      audioPayload = audioBase64
    }

    if (!audioPayload && file instanceof File) {
      const buffer = Buffer.from(await file.arrayBuffer())
      audioPayload = buffer.toString('base64')
    }

    if (!audioPayload) {
      return NextResponse.json(
        { success: false, message: 'audio invalido' },
        { status: 400 }
      )
    }

    const bodyPayload: Record<string, unknown> = {
      number: remoteJid,
      audio: audioPayload,
      encoding: encoding === 'false' ? false : true
    }

    if (delay && typeof delay === 'string') {
      bodyPayload.delay = Number(delay) || delay
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        apikey: EVOLUTION_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bodyPayload)
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('❌ Erro da Evolution API:', error)
      throw new Error(`Erro ao enviar audio: ${response.statusText}`)
    }

    const data = await response.json()

    try {
      const mediaUrl =
        data?.message?.audioMessage?.url ||
        data?.message?.mediaUrl ||
        data?.message?.audioMessage?.directPath

      const messageTimestamp = data?.messageTimestamp
      const timestamp =
        typeof messageTimestamp === 'number'
          ? new Date(messageTimestamp * 1000).toISOString()
          : new Date().toISOString()

      await upsertWhatsAppMessage({
        message_id: data?.key?.id,
        remote_jid: data?.key?.remoteJid || remoteJid,
        content: '[Áudio]',
        message_type: 'audio',
        media_url: mediaUrl || undefined,
        from_me: true,
        timestamp,
        status: mapEvolutionStatus(data?.status),
        raw_payload: data
      })
    } catch (dbError) {
      console.error('❌ Erro ao salvar audio no banco (nao-fatal):', dbError)
    }

    return NextResponse.json({
      success: true,
      message: 'Audio enviado com sucesso',
      data
    })
  } catch (error) {
    console.error('❌ Erro ao enviar audio:', error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}
