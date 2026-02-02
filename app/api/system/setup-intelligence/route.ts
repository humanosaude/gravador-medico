// =====================================================
// API: SETUP INTELLIGENCE MODULE
// =====================================================
// Cria tabelas e configurações iniciais do módulo de IA
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { readFileSync } from 'fs';
import { join } from 'path';

export const runtime = 'nodejs';

// =====================================================
// POST: Setup do módulo de inteligência
// =====================================================

export async function POST(request: NextRequest) {
  console.log('🧠 Iniciando setup do módulo de inteligência...');

  try {
    // Verificar se tabelas já existem
    const { data: existingTables } = await supabaseAdmin
      .from('ads_alert_rules')
      .select('id')
      .limit(1);

    if (existingTables !== null) {
      console.log('✅ Tabelas já existem');
      return NextResponse.json({
        success: true,
        message: 'Módulo de inteligência já configurado',
        status: 'already_setup',
      });
    }
  } catch {
    // Tabela não existe, vamos criar
    console.log('📦 Tabelas não encontradas, criando...');
  }

  try {
    // Criar tabelas via SQL direto
    // Nota: Em produção, execute o SQL diretamente no Supabase Dashboard
    
    // Por agora, vamos apenas verificar e criar regras padrão se as tabelas existirem
    const setupResult = await setupDefaultRules();

    return NextResponse.json({
      success: true,
      message: 'Módulo de inteligência configurado',
      data: setupResult,
    });
  } catch (error) {
    console.error('❌ Erro no setup:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
}

// =====================================================
// GET: Verificar status do módulo
// =====================================================

export async function GET() {
  try {
    const checks = {
      alert_rules: false,
      insights_snapshot: false,
      recommendations: false,
      user_settings: false,
      audit_log: false,
    };

    // Verificar cada tabela
    for (const table of Object.keys(checks)) {
      try {
        const { error } = await supabaseAdmin
          .from(`ads_${table}`)
          .select('id')
          .limit(1);
        
        checks[table as keyof typeof checks] = !error;
      } catch {
        checks[table as keyof typeof checks] = false;
      }
    }

    const allReady = Object.values(checks).every(v => v);

    return NextResponse.json({
      success: true,
      ready: allReady,
      tables: checks,
      message: allReady 
        ? 'Módulo de inteligência operacional' 
        : 'Execute o SQL em sql/intelligence-module.sql no Supabase',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Erro ao verificar status' },
      { status: 500 }
    );
  }
}

// =====================================================
// HELPER: Criar regras padrão
// =====================================================

async function setupDefaultRules() {
  const defaultRules = [
    {
      metric: 'spend',
      condition: 'gt',
      value: 50,
      time_window: 'today',
      action_suggested: 'pause',
      priority: 'HIGH',
      name: 'Sangria: Gasto sem vendas',
      description: 'Pausa campanhas que gastaram mais de R$50 hoje sem nenhuma compra',
    },
    {
      metric: 'cpa',
      condition: 'gt',
      value: 100,
      time_window: 'last_3d',
      action_suggested: 'review',
      priority: 'MEDIUM',
      name: 'CPA Alto',
      description: 'Alerta quando CPA ultrapassa R$100 nos últimos 3 dias',
    },
    {
      metric: 'roas',
      condition: 'lt',
      value: 1,
      time_window: 'last_7d',
      action_suggested: 'pause',
      priority: 'HIGH',
      name: 'ROAS Negativo',
      description: 'Pausa campanhas com ROAS abaixo de 1 na última semana',
    },
    {
      metric: 'roas',
      condition: 'gt',
      value: 3,
      time_window: 'last_3d',
      action_suggested: 'scale_up',
      priority: 'LOW',
      name: 'Oportunidade de Escala',
      description: 'Sugere escalar campanhas com ROAS acima de 3',
    },
    {
      metric: 'frequency',
      condition: 'gt',
      value: 4,
      time_window: 'last_7d',
      action_suggested: 'review',
      priority: 'MEDIUM',
      name: 'Frequência Alta',
      description: 'Alerta quando frequência passa de 4 (fadiga de audiência)',
    },
    {
      metric: 'ctr',
      condition: 'lt',
      value: 0.5,
      time_window: 'last_3d',
      action_suggested: 'review',
      priority: 'LOW',
      name: 'CTR Baixo',
      description: 'Revisar criativos com CTR abaixo de 0.5%',
    },
  ];

  let insertedCount = 0;

  for (const rule of defaultRules) {
    try {
      const { error } = await supabaseAdmin
        .from('ads_alert_rules')
        .insert({
          ...rule,
          is_active: true,
        });

      if (!error) insertedCount++;
    } catch (e) {
      console.log(`Regra "${rule.name}" já pode existir`);
    }
  }

  // Criar configurações padrão
  try {
    await supabaseAdmin
      .from('ads_user_settings')
      .upsert({
        max_cpa: 80,
        min_roas: 2,
        max_frequency: 3,
        min_ctr: 0.5,
        max_spend_without_purchase: 50,
        notify_critical: true,
        notify_high: true,
        auto_pause_bleeders: false,
        auto_scale_winners: false,
        scale_increment_percent: 20,
      }, {
        onConflict: 'user_id',
      });
  } catch (e) {
    console.log('Configurações padrão podem já existir');
  }

  return {
    rules_created: insertedCount,
    default_settings: true,
  };
}
