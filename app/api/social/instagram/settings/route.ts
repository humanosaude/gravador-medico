import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET - Obter configurações
export async function GET(request: NextRequest) {
  try {
    const supabase = supabaseAdmin;
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Por enquanto, retornar configurações padrão
    // Em uma implementação real, isso viria de uma tabela de configurações
    const settings = {
      notifications: {
        email_on_publish: true,
        email_on_fail: true,
        email_on_approval: true,
        email_weekly_report: false,
      },
      timezone: 'America/Sao_Paulo',
      default_post_time: '18:00',
      min_post_interval_hours: 4,
    };

    return NextResponse.json({ settings });

  } catch (error) {
    console.error('Error in settings GET:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// POST - Salvar configurações
export async function POST(request: NextRequest) {
  try {
    const supabase = supabaseAdmin;
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { notifications, timezone, default_post_time, min_post_interval_hours } = body;

    // Em uma implementação real, salvaria em uma tabela de configurações
    // Por agora, apenas retornamos sucesso
    console.log('Settings saved for user:', user.id, {
      notifications,
      timezone,
      default_post_time,
      min_post_interval_hours
    });

    return NextResponse.json({ 
      success: true,
      message: 'Configurações salvas com sucesso'
    });

  } catch (error) {
    console.error('Error in settings POST:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
