// ================================================================
// API: Buscar base64 de midia recebida via Evolution API
// ================================================================

import { NextRequest, NextResponse } from 'next/server'

type Base64Response = {
  base64?: string
  dataUrl?: string
  mimetype?: string
  mimeType?: string
}

function extractBase64(data: any): Base64Response | null {
  if (!data) return null

  if (typeof data.base64 === 'string') {
    return { base64: data.base64, mimetype: data.mimetype || data.mimeType }
  }

  if (data.data && typeof data.data.base64 === 'string') {
    return { base64: data.data.base64, mimetype: data.data.mimetype || data.data.mimeType }
  }

  if (data.media && typeof data.media.base64 === 'string') {
    return { base64: data.media.base64, mimetype: data.media.mimetype || data.media.mimeType }
  }

  if (data.message && typeof data.message.base64 === 'string') {
    return { base64: data.message.base64, mimetype: data.message.mimetype || data.message.mimeType }
  }

  return null
}

export async function POST(request: NextRequest) {
  try {
    const { messageId, remoteJid, fromMe } = await request.json()

    if (!messageId || typeof messageId !== 'string') {
      return NextResponse.json(
        { success: false, message: 'messageId e obrigatorio' },
        { status: 400 }
      )
    }

    const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL
    const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY
    const EVOLUTION_INSTANCE_NAME = process.env.EVOLUTION_INSTANCE_NAME

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !EVOLUTION_INSTANCE_NAME) {
      throw new Error('Variaveis de ambiente da Evolution API nao configuradas')
    }

    const url = `${EVOLUTION_API_URL}/chat/getBase64FromMediaMessage/${EVOLUTION_INSTANCE_NAME}`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        apikey: EVOLUTION_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: {
          key: {
            id: messageId,
            ...(typeof remoteJid === 'string' ? { remoteJid } : {}),
            ...(typeof fromMe === 'boolean' ? { fromMe } : {})
          }
        }
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('❌ Erro da Evolution API:', error)
      throw new Error(`Erro ao buscar midia: ${response.statusText}`)
    }

    const data = await response.json()
    const extracted = extractBase64(data)

    if (!extracted?.base64) {
      return NextResponse.json(
        { success: false, message: 'Base64 nao encontrado' },
        { status: 404 }
      )
    }

    const base64 = extracted.base64
    const mimetype = extracted.mimetype || 'application/octet-stream'
    const dataUrl = base64.startsWith('data:')
      ? base64
      : `data:${mimetype};base64,${base64}`

    return NextResponse.json({
      success: true,
      base64: base64.startsWith('data:') ? base64.split(',')[1] : base64,
      dataUrl,
      mimetype
    })
  } catch (error) {
    console.error('❌ Erro ao buscar midia:', error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}
