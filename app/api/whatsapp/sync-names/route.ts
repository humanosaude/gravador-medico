// ================================================================
// API: Sincronizar nomes dos contatos do WhatsApp
// ================================================================
// Busca os nomes reais (pushName) de todos os contatos via Evolution API
// ================================================================

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

interface ContactInfo {
  remoteJid: string
  pushName?: string
  name?: string
  verifiedName?: string
  notify?: string
  profilePicUrl?: string
}

export async function POST(request: NextRequest) {
  try {
    const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL
    const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY
    const EVOLUTION_INSTANCE_NAME = process.env.EVOLUTION_INSTANCE_NAME

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !EVOLUTION_INSTANCE_NAME) {
      return NextResponse.json(
        { success: false, message: 'Evolution API não configurada' },
        { status: 500 }
      )
    }

    // 1. Buscar todos os contatos do banco que não têm push_name
    const { data: contacts, error: fetchError } = await supabaseAdmin
      .from('whatsapp_contacts')
      .select('remote_jid, push_name')
      .or('push_name.is.null,push_name.eq.Assistente Virtual')
      .eq('is_group', false)
      .limit(50) // Processar em lotes para não sobrecarregar

    if (fetchError) {
      console.error('❌ Erro ao buscar contatos:', fetchError)
      return NextResponse.json(
        { success: false, message: 'Erro ao buscar contatos' },
        { status: 500 }
      )
    }

    if (!contacts || contacts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nenhum contato para sincronizar',
        updated: 0
      })
    }

    console.log(`📋 [sync-names] Processando ${contacts.length} contatos...`)

    let updatedCount = 0
    const results: { remoteJid: string; name: string | null; status: string }[] = []

    // 2. Para cada contato, buscar o nome via Evolution API
    for (const contact of contacts) {
      const phoneNumber = contact.remote_jid.split('@')[0]
      
      try {
        console.log(`🔍 [sync-names] Buscando: ${phoneNumber}`)
        
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)
        
        const response = await fetch(
          `${EVOLUTION_API_URL}/chat/findContacts/${EVOLUTION_INSTANCE_NAME}`,
          {
            method: 'POST',
            headers: {
              'apikey': EVOLUTION_API_KEY,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ number: phoneNumber }),
            signal: controller.signal
          }
        )
        
        clearTimeout(timeoutId)

        if (!response.ok) {
          console.warn(`⚠️ [sync-names] HTTP ${response.status} para ${phoneNumber}`)
          results.push({ remoteJid: contact.remote_jid, name: null, status: 'api_error' })
          continue
        }

        const data = await response.json()
        const apiContacts: ContactInfo[] = Array.isArray(data) ? data : (data ? [data] : [])
        
        if (apiContacts.length === 0) {
          results.push({ remoteJid: contact.remote_jid, name: null, status: 'not_found' })
          continue
        }

        // Buscar o contato correto
        const targetContact = apiContacts.find(c => c.remoteJid === contact.remote_jid) || apiContacts[0]
        
        // Extrair nome - vários campos possíveis
        const contactName = 
          targetContact.pushName ||
          targetContact.name ||
          targetContact.verifiedName ||
          targetContact.notify ||
          null

        if (contactName && contactName !== 'Assistente Virtual') {
          // 3. Atualizar no banco
          const { error: updateError } = await supabaseAdmin
            .from('whatsapp_contacts')
            .update({ 
              push_name: contactName,
              profile_picture_url: targetContact.profilePicUrl || undefined,
              updated_at: new Date().toISOString()
            })
            .eq('remote_jid', contact.remote_jid)

          if (!updateError) {
            updatedCount++
            console.log(`✅ [sync-names] Atualizado: ${phoneNumber} → "${contactName}"`)
            results.push({ remoteJid: contact.remote_jid, name: contactName, status: 'updated' })
          } else {
            console.error(`❌ [sync-names] Erro ao atualizar ${phoneNumber}:`, updateError)
            results.push({ remoteJid: contact.remote_jid, name: null, status: 'db_error' })
          }
        } else {
          results.push({ remoteJid: contact.remote_jid, name: null, status: 'no_name' })
        }

        // Pequeno delay para não sobrecarregar a API
        await new Promise(resolve => setTimeout(resolve, 200))
        
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          console.warn(`⏱️ [sync-names] Timeout para ${phoneNumber}`)
          results.push({ remoteJid: contact.remote_jid, name: null, status: 'timeout' })
        } else {
          console.error(`❌ [sync-names] Erro para ${phoneNumber}:`, error)
          results.push({ remoteJid: contact.remote_jid, name: null, status: 'error' })
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sincronização concluída`,
      total: contacts.length,
      updated: updatedCount,
      results
    })

  } catch (error) {
    console.error('❌ [sync-names] Erro geral:', error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST para sincronizar os nomes dos contatos',
    description: 'Esta API busca os nomes reais (pushName) dos contatos via Evolution API'
  })
}
