// =====================================================
// API: META AUDIENCES
// =====================================================
// Lista Custom Audiences e Lookalikes da conta Meta
// =====================================================

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

// =====================================================
// TIPOS
// =====================================================

interface AudienceData {
  id: string;
  name: string;
  approximate_count: number | null;
  subtype: string;
  delivery_status: {
    code: number;
    description: string;
  } | null;
  time_created: string;
  time_updated: string;
  data_source?: {
    type: string;
    sub_type?: string;
  };
  lookalike_spec?: {
    ratio: number;
    country: string;
    origin: { id: string; name: string }[];
  };
  operation_status?: {
    code: number;
    description: string;
  };
}

// =====================================================
// HELPERS
// =====================================================

async function getMetaCredentials() {
  const { data: settings } = await supabaseAdmin
    .from('integration_settings')
    .select('meta_ad_account_id')
    .eq('is_default', true)
    .single();

  const adAccountId = settings?.meta_ad_account_id || process.env.META_AD_ACCOUNT_ID;
  const accessToken = process.env.META_ACCESS_TOKEN || process.env.FACEBOOK_ACCESS_TOKEN;

  if (!adAccountId || !accessToken) {
    throw new Error('Meta credentials not configured');
  }

  return { adAccountId, accessToken };
}

function getDeliveryStatusDescription(code: number): string {
  const statuses: Record<number, string> = {
    100: 'Ativo',
    200: 'Aviso',
    300: 'Preenchendo',
    400: 'Expirado',
    500: 'Erro',
    600: 'Não disponível',
  };
  return statuses[Math.floor(code / 100) * 100] || 'Desconhecido';
}

function getAudienceTypeLabel(subtype: string): string {
  const types: Record<string, string> = {
    'CUSTOM': 'Personalizado',
    'WEBSITE': 'Pixel - Site',
    'LOOKALIKE': 'Lookalike',
    'ENGAGEMENT': 'Engajamento',
    'VIDEO': 'Vídeo',
    'IG_BUSINESS': 'Instagram',
    'FB_EVENT': 'Evento FB',
    'OFFLINE': 'Offline',
    'DATA_SET': 'Lista de Clientes',
    'APP': 'App',
    'CLAIM': 'Cadastros',
  };
  return types[subtype] || subtype;
}

// =====================================================
// GET: Listar Audiences
// =====================================================

export async function GET() {
  try {
    // 1. Tentar obter credenciais
    let credentials;
    try {
      credentials = await getMetaCredentials();
    } catch (credError) {
      console.error('[Meta Audiences] Credenciais não configuradas:', credError);
      return NextResponse.json({
        success: false,
        error: 'Meta não configurado',
        message: 'Configure suas credenciais Meta primeiro',
        redirect: '/ia-performance/settings',
        audiences: [],
        stats: { total: 0, lookalikes: 0, ready: 0, filling: 0 }
      }, { status: 400 });
    }
    
    const { adAccountId, accessToken } = credentials;

    // 2. Buscar via API direta (mais campos disponíveis)
    const url = new URL(`https://graph.facebook.com/v21.0/act_${adAccountId}/customaudiences`);
    url.searchParams.set('access_token', accessToken);
    url.searchParams.set('fields', [
      'id',
      'name',
      'approximate_count',
      'subtype',
      'delivery_status',
      'time_created',
      'time_updated',
      'data_source',
      'lookalike_spec',
      'operation_status',
    ].join(','));
    url.searchParams.set('limit', '100');

    console.log('[Meta Audiences] Buscando públicos da conta:', adAccountId);

    const response = await fetch(url.toString());
    const data = await response.json();

    // 3. Verificar erros da Meta API
    if (data.error) {
      console.error('[Meta Audiences] Erro da Meta API:', {
        code: data.error.code,
        type: data.error.type,
        message: data.error.message,
        fbtrace_id: data.error.fbtrace_id
      });
      
      // Token expirado ou inválido
      if (data.error.code === 190) {
        return NextResponse.json({
          success: false,
          error: 'Token Meta expirado',
          message: 'Seu token de acesso expirou. Regenere em developers.facebook.com',
          redirect: '/ia-performance/settings',
          audiences: [],
          stats: { total: 0, lookalikes: 0, ready: 0, filling: 0 }
        }, { status: 401 });
      }
      
      // Permissão negada
      if (data.error.code === 200 || data.error.code === 10) {
        return NextResponse.json({
          success: false,
          error: 'Permissão negada',
          message: 'Seu token não tem permissão para acessar públicos. Verifique as permissões do app.',
          audiences: [],
          stats: { total: 0, lookalikes: 0, ready: 0, filling: 0 }
        }, { status: 403 });
      }
      
      throw new Error(data.error.message);
    }

    // 4. Processar e enriquecer dados
    const audiences: AudienceData[] = (data.data || []).map((aud: any) => ({
      id: aud.id,
      name: aud.name,
      approximate_count: aud.approximate_count,
      subtype: aud.subtype,
      subtypeLabel: getAudienceTypeLabel(aud.subtype),
      delivery_status: aud.delivery_status ? {
        code: aud.delivery_status.code,
        description: getDeliveryStatusDescription(aud.delivery_status.code),
      } : null,
      operation_status: aud.operation_status ? {
        code: aud.operation_status.code,
        description: aud.operation_status.description,
      } : null,
      time_created: aud.time_created,
      time_updated: aud.time_updated,
      data_source: aud.data_source,
      lookalike_spec: aud.lookalike_spec,
      isLookalike: aud.subtype === 'LOOKALIKE',
      isReady: aud.delivery_status?.code < 300 || aud.approximate_count > 1000,
    }));

    // 5. Ordenar: Prontos primeiro, depois por data de criação
    audiences.sort((a, b) => {
      const aReady = (a as any).isReady ? 1 : 0;
      const bReady = (b as any).isReady ? 1 : 0;
      if (aReady !== bReady) return bReady - aReady;
      return new Date(b.time_created).getTime() - new Date(a.time_created).getTime();
    });

    // 6. Estatísticas
    const stats = {
      total: audiences.length,
      lookalikes: audiences.filter((a: any) => a.isLookalike).length,
      ready: audiences.filter((a: any) => a.isReady).length,
      filling: audiences.filter((a: any) => !a.isReady).length,
    };
    
    console.log('[Meta Audiences] Sucesso:', stats);

    return NextResponse.json({
      success: true,
      audiences,
      stats,
    });
  } catch (error) {
    console.error('[Meta Audiences] Erro fatal:', {
      message: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      hint: 'Verifique suas credenciais Meta e configurações',
      audiences: [],
      stats: { total: 0, lookalikes: 0, ready: 0, filling: 0 }
    }, { status: 500 });
  }
}
