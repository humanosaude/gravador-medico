import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// =====================================================
// API: Alert Rules - CRUD para regras de alerta
// Rota: /api/ads/alert-rules
// =====================================================

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface AlertRule {
  id?: string;
  user_id?: string;
  rule_name: string;
  rule_type: 'sangria' | 'cpa_alto' | 'roas_baixo' | 'escala' | 'custom';
  metric: 'cpa' | 'roas' | 'spend' | 'ctr' | 'cpc' | 'purchases';
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq';
  threshold: number;
  action_type: 'pause' | 'alert' | 'scale' | 'notify';
  priority: 'high' | 'medium' | 'low';
  is_active?: boolean;
  apply_to_campaigns?: string[] | null;
}

// =====================================================
// GET - Listar regras
// =====================================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'default-user';
    const activeOnly = searchParams.get('activeOnly') === 'true';

    let query = supabase
      .from('ads_alert_rules')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Alert Rules] Erro ao buscar:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      
      // Tabela não existe - retornar array vazio para não quebrar UI
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.warn('[Alert Rules] Tabela não existe, retornando array vazio');
        return NextResponse.json({
          rules: [],
          count: 0,
          warning: 'Sistema de alertas não configurado. Execute o SQL de setup.'
        });
      }
      
      // Erro de permissão
      if (error.code === '42501') {
        return NextResponse.json(
          { error: 'Permissão negada ao acessar regras de alerta' },
          { status: 403 }
        );
      }
      
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      rules: data || [],
      count: data?.length || 0
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
    console.error('[Alert Rules] Erro inesperado:', {
      message: errorMessage,
      stack: err instanceof Error ? err.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json(
      { 
        error: 'Erro interno ao buscar regras',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}

// =====================================================
// POST - Criar nova regra
// =====================================================
export async function POST(request: NextRequest) {
  try {
    const body: AlertRule = await request.json();

    // Validação básica
    if (!body.rule_name || !body.metric || !body.operator || body.threshold === undefined) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: rule_name, metric, operator, threshold' },
        { status: 400 }
      );
    }

    const userId = body.user_id || 'default-user';

    // Verificar se já existe regra do mesmo tipo
    const { data: existing } = await supabase
      .from('ads_alert_rules')
      .select('id')
      .eq('user_id', userId)
      .eq('rule_type', body.rule_type)
      .single();

    if (existing) {
      // Atualizar existente
      const { data, error } = await supabase
        .from('ads_alert_rules')
        .update({
          rule_name: body.rule_name,
          metric: body.metric,
          operator: body.operator,
          threshold: body.threshold,
          action_type: body.action_type,
          priority: body.priority,
          is_active: body.is_active ?? true,
          apply_to_campaigns: body.apply_to_campaigns,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        console.error('[Alert Rules] Erro ao atualizar:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        message: 'Regra atualizada com sucesso',
        rule: data,
        updated: true
      });
    }

    // Criar nova
    const { data, error } = await supabase
      .from('ads_alert_rules')
      .insert({
        user_id: userId,
        rule_name: body.rule_name,
        rule_type: body.rule_type || 'custom',
        metric: body.metric,
        operator: body.operator,
        threshold: body.threshold,
        action_type: body.action_type || 'alert',
        priority: body.priority || 'medium',
        is_active: body.is_active ?? true,
        apply_to_campaigns: body.apply_to_campaigns
      })
      .select()
      .single();

    if (error) {
      console.error('[Alert Rules] Erro ao criar:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Regra criada com sucesso',
      rule: data,
      created: true
    }, { status: 201 });
  } catch (err) {
    console.error('[Alert Rules] Erro inesperado:', err);
    return NextResponse.json(
      { error: 'Erro interno ao criar regra' },
      { status: 500 }
    );
  }
}

// =====================================================
// PATCH - Atualizar regra existente
// =====================================================
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { error: 'ID da regra é obrigatório' },
        { status: 400 }
      );
    }

    // Preparar dados para atualização
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };

    // Campos atualizáveis
    const allowedFields = [
      'rule_name', 'rule_type', 'metric', 'operator', 
      'threshold', 'action_type', 'priority', 'is_active', 
      'apply_to_campaigns'
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    const { data, error } = await supabase
      .from('ads_alert_rules')
      .update(updateData)
      .eq('id', body.id)
      .select()
      .single();

    if (error) {
      console.error('[Alert Rules] Erro ao atualizar:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Regra atualizada com sucesso',
      rule: data
    });
  } catch (err) {
    console.error('[Alert Rules] Erro inesperado:', err);
    return NextResponse.json(
      { error: 'Erro interno ao atualizar regra' },
      { status: 500 }
    );
  }
}

// =====================================================
// DELETE - Excluir regra
// =====================================================
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID da regra é obrigatório' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('ads_alert_rules')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Alert Rules] Erro ao excluir:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Regra excluída com sucesso',
      deleted: true
    });
  } catch (err) {
    console.error('[Alert Rules] Erro inesperado:', err);
    return NextResponse.json(
      { error: 'Erro interno ao excluir regra' },
      { status: 500 }
    );
  }
}
