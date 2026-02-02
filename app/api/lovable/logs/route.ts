import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET: Buscar logs de e-mails e integração
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || undefined
    const status = searchParams.get('status') || undefined
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100

    // Buscar de email_logs (tabela principal de logs)
    let query = supabaseAdmin
      .from('email_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (action && action !== 'all') {
      query = query.eq('email_type', action)
    }

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      console.error('Erro ao buscar logs:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      )
    }

    // Transformar dados para formato esperado pela página
    const logs = (data || []).map(log => ({
      id: log.id,
      action: log.email_type || 'email',
      status: log.status,
      details: {
        email: log.recipient_email,
        name: log.recipient_name,
        subject: log.subject,
        type: log.email_type,
        order_id: log.order_id,
        opened: log.opened,
        open_count: log.open_count,
        clicked: log.clicked,
        click_count: log.click_count,
        error: log.error_message
      },
      created_at: log.created_at,
      updated_at: log.updated_at
    }))

    console.log(`📊 Email logs encontrados: ${logs.length}`)

    return NextResponse.json({ 
      success: true, 
      logs 
    })
  } catch (error: any) {
    console.error('Error fetching logs:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
