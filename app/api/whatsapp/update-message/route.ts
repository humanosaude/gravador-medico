// ================================================================
// API: Editar mensagem via Evolution API
// ================================================================

import { NextRequest, NextResponse } from 'next/server'
import {
  getLatestWhatsAppMessage,
  updateWhatsAppContactLastMessage,
  updateWhatsAppMessageContent
} from '@/lib/whatsapp-db'

const normalizeFromMe = (value: unknown) =>
  value === true || value === 'true' || value === 1 || value === '1'

export async function POST(request: NextRequest) {
  try {
    const { messageId, messageDbId, remoteJid, fromMe, content } = await request.json()
    const fromMeNormalized = normalizeFromMe(fromMe)
    const hasFromMe =
      fromMe === true ||
      fromMe === false ||
      fromMe === 1 ||
      fromMe === 0 ||
      fromMe === '1' ||
      fromMe === '0' ||
      fromMe === 'true' ||
      fromMe === 'false'

    if (!messageId || !remoteJid || typeof content !== 'string') {
      return NextResponse.json(
        { success: false, message: 'messageId, remoteJid e content sao obrigatorios' },
        { status: 400 }
      )
    }

    if (!hasFromMe) {
      return NextResponse.json(
        { success: false, message: 'fromMe invalido' },
        { status: 400 }
      )
    }

    const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL
    const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY
    const EVOLUTION_INSTANCE_NAME = process.env.EVOLUTION_INSTANCE_NAME

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !EVOLUTION_INSTANCE_NAME) {
      throw new Error('Variaveis de ambiente da Evolution API nao configuradas')
    }

    const url = `${EVOLUTION_API_URL}/chat/updateMessage/${EVOLUTION_INSTANCE_NAME}`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        apikey: EVOLUTION_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        number: remoteJid,
        text: content,
        key: {
          id: messageId,
          remoteJid,
          fromMe: fromMeNormalized
        }
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('❌ Erro da Evolution API:', error)
      throw new Error(`Erro ao editar mensagem: ${response.statusText}`)
    }

    const data = await response.json()

    if (messageDbId) {
      try {
        await updateWhatsAppMessageContent({
          id: messageDbId,
          content
        })

        const latest = await getLatestWhatsAppMessage(remoteJid)
        const latestMatch =
          latest &&
          (latest.id === messageDbId || (latest.message_id && latest.message_id === messageId))

        if (latestMatch) {
          await updateWhatsAppContactLastMessage({
            remote_jid: remoteJid,
            last_message_content: content,
            last_message_from_me: fromMeNormalized,
            last_message_timestamp: latest.timestamp
          })
        }
      } catch (dbError) {
        console.error('❌ Erro ao atualizar mensagem no banco (nao-fatal):', dbError)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Mensagem editada com sucesso',
      data
    })
  } catch (error) {
    console.error('❌ Erro ao editar mensagem:', error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}
