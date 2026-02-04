/**
 * 📊 API ROUTE - Dashboard Consolidado - Contas Conectadas
 * 
 * GET: Lista contas conectadas do usuário
 * POST: Conecta nova conta
 * DELETE: Desconecta conta
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// =====================================================
// TIPOS
// =====================================================

interface ConnectedAccount {
  id: string;
  platform: 'meta' | 'google_ads' | 'google_analytics';
  account_id: string;
  account_name: string;
  is_active: boolean;
  connection_status: string;
  last_synced_at: string | null;
  metadata: Record<string, any>;
}

// =====================================================
// GET - LISTAR CONTAS
// =====================================================

export async function GET(request: NextRequest) {
  try {
    // Por enquanto, retornar contas demo
    // TODO: Implementar autenticação e busca real

    const demoAccounts: ConnectedAccount[] = [
      {
        id: 'demo-meta-001',
        platform: 'meta',
        account_id: '123456789',
        account_name: 'Gravador Médico - Meta Ads',
        is_active: true,
        connection_status: 'connected',
        last_synced_at: new Date().toISOString(),
        metadata: {
          ad_account_id: '123456789',
          business_id: '987654321',
          timezone: 'America/Sao_Paulo'
        }
      },
      {
        id: 'demo-gads-001',
        platform: 'google_ads',
        account_id: '234-567-8901',
        account_name: 'Gravador Médico - Google Ads',
        is_active: false,
        connection_status: 'disconnected',
        last_synced_at: null,
        metadata: {
          customer_id: '2345678901',
          currency: 'BRL'
        }
      },
      {
        id: 'demo-ga-001',
        platform: 'google_analytics',
        account_id: 'GA-12345678',
        account_name: 'Gravador Médico - GA4',
        is_active: false,
        connection_status: 'disconnected',
        last_synced_at: null,
        metadata: {
          property_id: '12345678',
          stream_id: 'web-stream-1'
        }
      }
    ];

    return NextResponse.json({
      success: true,
      accounts: demoAccounts,
      total: demoAccounts.length,
      active: demoAccounts.filter(a => a.is_active).length
    });

  } catch (error) {
    console.error('❌ [Accounts] Erro:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro ao buscar contas conectadas'
    }, { status: 500 });
  }
}

// =====================================================
// POST - CONECTAR NOVA CONTA
// =====================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { platform, account_id, account_name, access_token, refresh_token, metadata } = body;

    if (!platform || !account_id) {
      return NextResponse.json({
        success: false,
        error: 'Platform e account_id são obrigatórios'
      }, { status: 400 });
    }

    // TODO: Implementar inserção real no Supabase
    // Por enquanto, apenas simular sucesso

    console.log('📊 [Accounts] Nova conta conectada:', { platform, account_id, account_name });

    return NextResponse.json({
      success: true,
      message: 'Conta conectada com sucesso',
      account: {
        id: `new-${platform}-${Date.now()}`,
        platform,
        account_id,
        account_name: account_name || `${platform} Account`,
        is_active: true,
        connection_status: 'connected',
        last_synced_at: new Date().toISOString(),
        metadata: metadata || {}
      }
    });

  } catch (error) {
    console.error('❌ [Accounts] Erro ao conectar:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro ao conectar conta'
    }, { status: 500 });
  }
}

// =====================================================
// DELETE - DESCONECTAR CONTA
// =====================================================

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('id');

    if (!accountId) {
      return NextResponse.json({
        success: false,
        error: 'ID da conta é obrigatório'
      }, { status: 400 });
    }

    // TODO: Implementar deleção real no Supabase
    console.log('📊 [Accounts] Conta desconectada:', accountId);

    return NextResponse.json({
      success: true,
      message: 'Conta desconectada com sucesso'
    });

  } catch (error) {
    console.error('❌ [Accounts] Erro ao desconectar:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro ao desconectar conta'
    }, { status: 500 });
  }
}
