/**
 * 🔍 Health Check - Meta Ads Configuration
 * 
 * Verifica se todas as configurações do Meta Ads estão corretas:
 * - Access Token válido
 * - Ad Account ID configurado
 * - Pixel ID configurado
 * - Permissões corretas
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

interface HealthCheckResult {
  status: 'ok' | 'warning' | 'error';
  message: string;
  details?: any;
}

interface HealthCheckResponse {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    accessToken: HealthCheckResult;
    adAccountId: HealthCheckResult;
    pixelId: HealthCheckResult;
    apiConnection: HealthCheckResult;
    pixelEvents: HealthCheckResult;
  };
  config: {
    adAccountId: string | null;
    pixelId: string | null;
    hasAccessToken: boolean;
    source: 'database' | 'environment';
  };
}

export async function GET(request: NextRequest) {
  const checks: HealthCheckResponse['checks'] = {
    accessToken: { status: 'error', message: 'Não verificado' },
    adAccountId: { status: 'error', message: 'Não verificado' },
    pixelId: { status: 'error', message: 'Não verificado' },
    apiConnection: { status: 'error', message: 'Não verificado' },
    pixelEvents: { status: 'error', message: 'Não verificado' },
  };

  let adAccountId: string | null = null;
  let pixelId: string | null = null;
  let configSource: 'database' | 'environment' = 'environment';

  // 1. Verificar Access Token
  const accessToken = process.env.META_ACCESS_TOKEN || process.env.FACEBOOK_ACCESS_TOKEN;
  
  if (!accessToken) {
    checks.accessToken = {
      status: 'error',
      message: 'META_ACCESS_TOKEN ou FACEBOOK_ACCESS_TOKEN não configurado nas variáveis de ambiente'
    };
  } else {
    checks.accessToken = {
      status: 'ok',
      message: 'Access Token configurado',
      details: { length: accessToken.length, prefix: accessToken.substring(0, 10) + '...' }
    };
  }

  // 2. Buscar configurações do banco
  try {
    const { data: settings, error } = await supabaseAdmin
      .from('integration_settings')
      .select('meta_ad_account_id, meta_pixel_id')
      .single();

    if (settings?.meta_ad_account_id) {
      adAccountId = settings.meta_ad_account_id;
      configSource = 'database';
    }
    
    if (settings?.meta_pixel_id) {
      pixelId = settings.meta_pixel_id;
    }
  } catch (error) {
    console.warn('⚠️ Erro ao buscar settings do banco:', error);
  }

  // 3. Fallback para variáveis de ambiente
  if (!adAccountId) {
    adAccountId = process.env.META_AD_ACCOUNT_ID || process.env.FACEBOOK_AD_ACCOUNT_ID || null;
    configSource = 'environment';
  }
  
  if (!pixelId) {
    pixelId = process.env.FACEBOOK_PIXEL_ID || null;
  }

  // 4. Verificar Ad Account ID
  if (!adAccountId) {
    checks.adAccountId = {
      status: 'error',
      message: 'Ad Account ID não configurado (nem no banco nem nas variáveis de ambiente)'
    };
  } else {
    checks.adAccountId = {
      status: 'ok',
      message: `Ad Account ID configurado (fonte: ${configSource})`,
      details: { adAccountId }
    };
  }

  // 5. Verificar Pixel ID
  if (!pixelId) {
    checks.pixelId = {
      status: 'warning',
      message: 'Pixel ID não configurado - eventos de conversão não serão rastreados'
    };
  } else {
    checks.pixelId = {
      status: 'ok',
      message: 'Pixel ID configurado',
      details: { pixelId }
    };
  }

  // 6. Testar conexão com API (se temos credenciais)
  if (accessToken && adAccountId) {
    try {
      const testUrl = `https://graph.facebook.com/v21.0/act_${adAccountId}?` + new URLSearchParams({
        access_token: accessToken,
        fields: 'id,name,account_status,currency'
      });

      const response = await fetch(testUrl, { cache: 'no-store' });
      const data = await response.json();

      if (data.error) {
        checks.apiConnection = {
          status: 'error',
          message: `Erro na API: ${data.error.message}`,
          details: { code: data.error.code, type: data.error.type }
        };
      } else {
        const statusMap: Record<number, string> = {
          1: 'ACTIVE',
          2: 'DISABLED',
          3: 'UNSETTLED',
          7: 'PENDING_RISK_REVIEW',
          8: 'PENDING_SETTLEMENT',
          9: 'IN_GRACE_PERIOD',
          100: 'PENDING_CLOSURE',
          101: 'CLOSED',
          201: 'ANY_ACTIVE',
          202: 'ANY_CLOSED'
        };

        checks.apiConnection = {
          status: 'ok',
          message: 'Conexão com Meta API funcionando',
          details: {
            accountId: data.id,
            accountName: data.name,
            accountStatus: statusMap[data.account_status] || data.account_status,
            currency: data.currency
          }
        };
      }
    } catch (error: any) {
      checks.apiConnection = {
        status: 'error',
        message: `Erro de conexão: ${error.message}`
      };
    }
  }

  // 7. Verificar eventos do Pixel (se configurado)
  if (accessToken && pixelId) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const pixelUrl = `https://graph.facebook.com/v21.0/${pixelId}/stats?` + new URLSearchParams({
        access_token: accessToken,
        aggregation: 'event',
        start_time: today,
        end_time: today
      });

      const response = await fetch(pixelUrl, { cache: 'no-store' });
      const data = await response.json();

      if (data.error) {
        checks.pixelEvents = {
          status: 'warning',
          message: `Não foi possível verificar eventos: ${data.error.message}`,
          details: { code: data.error.code }
        };
      } else {
        const events = data.data || [];
        const purchaseEvents = events.find((e: any) => e.event === 'Purchase');
        
        checks.pixelEvents = {
          status: events.length > 0 ? 'ok' : 'warning',
          message: events.length > 0 
            ? `Pixel recebendo eventos (${events.length} tipos hoje)` 
            : 'Nenhum evento recebido hoje',
          details: {
            totalEventTypes: events.length,
            events: events.map((e: any) => ({ event: e.event, count: e.count })),
            hasPurchaseEvents: !!purchaseEvents
          }
        };
      }
    } catch (error: any) {
      checks.pixelEvents = {
        status: 'warning',
        message: `Erro ao verificar eventos: ${error.message}`
      };
    }
  }

  // 8. Calcular status geral
  const statuses = Object.values(checks).map(c => c.status);
  let overall: 'healthy' | 'degraded' | 'unhealthy';

  if (statuses.every(s => s === 'ok')) {
    overall = 'healthy';
  } else if (statuses.some(s => s === 'error')) {
    overall = 'unhealthy';
  } else {
    overall = 'degraded';
  }

  const response: HealthCheckResponse = {
    overall,
    timestamp: new Date().toISOString(),
    checks,
    config: {
      adAccountId,
      pixelId,
      hasAccessToken: !!accessToken,
      source: configSource
    }
  };

  return NextResponse.json(response, {
    status: overall === 'unhealthy' ? 503 : 200
  });
}
