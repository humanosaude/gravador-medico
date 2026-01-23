// ================================================================
// API: Apagar mensagem (para todos) via Evolution API
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
    const { messageId, messageDbId, remoteJid, fromMe, participant } =
      await request.json()
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

    if (!messageId || !remoteJid || !hasFromMe) {
      return NextResponse.json(
        { success: false, message: 'messageId, remoteJid e fromMe sao obrigatorios' },
        { status: 400 }
      )
    }

    const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL
    const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY
    const EVOLUTION_INSTANCE_NAME = process.env.EVOLUTION_INSTANCE_NAME

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !EVOLUTION_INSTANCE_NAME) {
      throw new Error('Variaveis de ambiente da Evolution API nao configuradas')
    }

    const url = `${EVOLUTION_API_URL}/chat/deleteMessageForEveryone/${EVOLUTION_INSTANCE_NAME}`

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        apikey: EVOLUTION_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        id: messageId,
        fromMe: fromMeNormalized,
        remoteJid,
        participant
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('❌ Erro da Evolution API:', error)
      throw new Error(`Erro ao apagar mensagem: ${response.statusText}`)
    }

    const data = await response.json()

    if (messageDbId) {
      try {
        const deletedContent = '[Mensagem apagada]'

        await updateWhatsAppMessageContent({
          id: messageDbId,
          content: deletedContent,
          message_type: 'text',
          media_url: null,
          caption: null
        })

        const latest = await getLatestWhatsAppMessage(remoteJid)
        const latestMatch =
          latest &&
          (latest.id === messageDbId || (latest.message_id && latest.message_id === messageId))

        if (latestMatch) {
          await updateWhatsAppContactLastMessage({
            remote_jid: remoteJid,
            last_message_content: deletedContent,
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
      message: 'Mensagem apagada com sucesso',
      data
    })
  } catch (error) {
    console.error('❌ Erro ao apagar mensagem:', error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}
