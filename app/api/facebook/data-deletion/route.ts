import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

/**
 * Facebook Data Deletion Callback Endpoint
 * 
 * Este endpoint recebe solicitações de exclusão de dados do Facebook
 * quando um usuário remove o app e solicita a exclusão de seus dados.
 * 
 * Requisitos:
 * - HTTPS (obrigatório)
 * - Validação de assinatura da solicitação
 * - Retorno de URL de status e código de confirmação
 * 
 * @see https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback
 */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Gerar código de confirmação único
function generateConfirmationCode(): string {
  return `DEL-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`
}

// Decodificar base64 URL-safe
function base64UrlDecode(input: string): Buffer {
  // Converter de base64 URL-safe para base64 padrão
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/')
  return Buffer.from(base64, 'base64')
}

// Analisar signed_request do Facebook
function parseSignedRequest(signedRequest: string, appSecret: string): { user_id: string; algorithm: string; issued_at: number; expires?: number } | null {
  try {
    const [encodedSig, payload] = signedRequest.split('.', 2)
    
    if (!encodedSig || !payload) {
      console.error('Formato inválido de signed_request')
      return null
    }

    // Decodificar assinatura e payload
    const sig = base64UrlDecode(encodedSig)
    const data = JSON.parse(base64UrlDecode(payload).toString('utf8'))

    // Verificar algoritmo
    if (data.algorithm?.toUpperCase() !== 'HMAC-SHA256') {
      console.error('Algoritmo não suportado:', data.algorithm)
      return null
    }

    // Verificar assinatura
    const expectedSig = crypto
      .createHmac('sha256', appSecret)
      .update(payload)
      .digest()

    if (!crypto.timingSafeEqual(sig, expectedSig)) {
      console.error('Assinatura inválida!')
      return null
    }

    return data
  } catch (error) {
    console.error('Erro ao analisar signed_request:', error)
    return null
  }
}

// Processar exclusão de dados do usuário
async function processDataDeletion(userId: string, confirmationCode: string): Promise<boolean> {
  try {
    console.log(`[DATA-DELETION] Iniciando exclusão para usuário: ${userId}`)
    
    // Lista de tipos de dados que serão excluídos
    const deletedDataTypes: string[] = []
    
    // 1. Buscar e excluir dados de leads/contatos associados ao Facebook ID
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('id')
      .eq('facebook_user_id', userId)
    
    if (!leadsError && leads && leads.length > 0) {
      await supabase
        .from('leads')
        .delete()
        .eq('facebook_user_id', userId)
      deletedDataTypes.push('leads')
      console.log(`[DATA-DELETION] Excluídos ${leads.length} leads`)
    }

    // 2. Buscar e excluir dados de analytics/tracking
    const { data: tracking, error: trackingError } = await supabase
      .from('analytics_events')
      .select('id')
      .eq('facebook_user_id', userId)
    
    if (!trackingError && tracking && tracking.length > 0) {
      await supabase
        .from('analytics_events')
        .delete()
        .eq('facebook_user_id', userId)
      deletedDataTypes.push('analytics')
      console.log(`[DATA-DELETION] Excluídos ${tracking.length} eventos de analytics`)
    }

    // 3. Buscar e excluir dados de checkout/pedidos (anonimizar em vez de excluir)
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id')
      .eq('facebook_user_id', userId)
    
    if (!ordersError && orders && orders.length > 0) {
      // Anonimizar dados pessoais mantendo registros financeiros
      await supabase
        .from('orders')
        .update({
          customer_name: 'DADOS EXCLUÍDOS',
          customer_email: 'deleted@excluded.com',
          customer_phone: null,
          customer_cpf: null,
          facebook_user_id: null,
          notes: `Dados anonimizados por solicitação do usuário. Código: ${confirmationCode}`
        })
        .eq('facebook_user_id', userId)
      deletedDataTypes.push('orders (anonimizados)')
      console.log(`[DATA-DELETION] Anonimizados ${orders.length} pedidos`)
    }

    // 4. Atualizar status da solicitação
    await supabase
      .from('facebook_data_deletion_requests')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        deleted_data_types: deletedDataTypes,
        status_details: deletedDataTypes.length > 0 
          ? `Dados excluídos com sucesso: ${deletedDataTypes.join(', ')}`
          : 'Nenhum dado encontrado para este usuário'
      })
      .eq('confirmation_code', confirmationCode)

    console.log(`[DATA-DELETION] Exclusão concluída. Tipos excluídos: ${deletedDataTypes.join(', ')}`)
    return true
  } catch (error) {
    console.error('[DATA-DELETION] Erro na exclusão:', error)
    
    // Atualizar status como falha
    await supabase
      .from('facebook_data_deletion_requests')
      .update({
        status: 'failed',
        status_details: `Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      })
      .eq('confirmation_code', confirmationCode)

    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    // Obter app secret
    const appSecret = process.env.FACEBOOK_APP_SECRET
    
    if (!appSecret) {
      console.error('[DATA-DELETION] FACEBOOK_APP_SECRET não configurado')
      return NextResponse.json(
        { error: 'Configuração incompleta' },
        { status: 500 }
      )
    }

    // Obter signed_request do body
    const formData = await request.formData()
    const signedRequest = formData.get('signed_request') as string

    if (!signedRequest) {
      console.error('[DATA-DELETION] signed_request não encontrado')
      return NextResponse.json(
        { error: 'signed_request é obrigatório' },
        { status: 400 }
      )
    }

    // Analisar e validar signed_request
    const data = parseSignedRequest(signedRequest, appSecret)

    if (!data || !data.user_id) {
      console.error('[DATA-DELETION] signed_request inválido ou user_id ausente')
      return NextResponse.json(
        { error: 'Solicitação inválida' },
        { status: 400 }
      )
    }

    const userId = data.user_id
    const confirmationCode = generateConfirmationCode()
    
    // URL base do site
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.gravadormedico.com.br'
    const statusUrl = `${baseUrl}/exclusao-dados?code=${confirmationCode}`

    console.log(`[DATA-DELETION] Solicitação recebida para usuário: ${userId}`)
    console.log(`[DATA-DELETION] Código de confirmação: ${confirmationCode}`)

    // Registrar solicitação no banco de dados
    const { error: insertError } = await supabase
      .from('facebook_data_deletion_requests')
      .insert({
        facebook_user_id: userId,
        confirmation_code: confirmationCode,
        status: 'processing',
        request_metadata: {
          algorithm: data.algorithm,
          issued_at: data.issued_at,
          expires: data.expires,
          requested_from: request.headers.get('origin') || 'unknown'
        }
      })

    if (insertError) {
      console.error('[DATA-DELETION] Erro ao registrar solicitação:', insertError)
      return NextResponse.json(
        { error: 'Erro ao processar solicitação' },
        { status: 500 }
      )
    }

    // Processar exclusão de dados em background
    // Em produção, isso poderia ser uma fila (Queue) para processamento assíncrono
    processDataDeletion(userId, confirmationCode).catch(console.error)

    // Retornar resposta conforme especificação do Facebook
    return NextResponse.json({
      url: statusUrl,
      confirmation_code: confirmationCode
    })

  } catch (error) {
    console.error('[DATA-DELETION] Erro geral:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// Endpoint GET para verificar status (usado pela página de status)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const confirmationCode = searchParams.get('code')

    if (!confirmationCode) {
      return NextResponse.json(
        { error: 'Código de confirmação é obrigatório' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('facebook_data_deletion_requests')
      .select('*')
      .eq('confirmation_code', confirmationCode)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: 'Solicitação não encontrada' },
        { status: 404 }
      )
    }

    // Retornar dados (sem expor informações sensíveis)
    return NextResponse.json({
      confirmation_code: data.confirmation_code,
      status: data.status,
      status_details: data.status_details,
      deleted_data_types: data.deleted_data_types,
      requested_at: data.requested_at,
      completed_at: data.completed_at
    })

  } catch (error) {
    console.error('[DATA-DELETION] Erro ao buscar status:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar status' },
      { status: 500 }
    )
  }
}
