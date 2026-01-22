/**
 * Server Actions para Tracking e Atribuição
 * Funções assíncronas que rodam no servidor
 */

'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { 
  TrackingClickInsert, 
  TrackingLinkInsert, 
  TrackingLinkUpdate,
  IntegrationMetaInsert,
  IntegrationMetaUpdate,
  TrackingEventsQueueInsert,
} from '@/lib/types/tracking';
import { generateRefCode } from '@/lib/tracking-utils';
import { headers } from 'next/headers';

// ============================================================================
// TRACKING DE CLIQUES
// ============================================================================

interface TrackClickParams {
  linkId: string;
  refCode: string;
  eventId: string;
  userAgent?: string;
  referer?: string | null;
}

export async function trackClick({
  linkId,
  refCode,
  eventId,
  userAgent,
  referer,
}: TrackClickParams) {
  try {
    // Captura IP do usuário
    const headersList = await headers();
    const ipAddress = 
      headersList.get('x-forwarded-for')?.split(',')[0] || 
      headersList.get('x-real-ip') || 
      null;

    // Salva o clique na tabela tracking_clicks
    const clickData: TrackingClickInsert = {
      link_id: linkId,
      ref_code: refCode,
      event_id: eventId,
      ip_address: ipAddress,
      user_agent: userAgent,
      referer: referer,
    };

    const { data: click, error: clickError } = await supabaseAdmin
      .from('tracking_clicks')
      .insert(clickData)
      .select()
      .single();

    if (clickError) {
      console.error('Erro ao salvar clique:', clickError);
      throw new Error('Falha ao salvar clique');
    }

    // Busca integração do Meta para enfileirar evento
    const { data: link } = await supabaseAdmin
      .from('tracking_links')
      .select('user_id')
      .eq('id', linkId)
      .single();

    if (link) {
      const { data: integration } = await supabaseAdmin
        .from('integrations_meta')
        .select('id')
        .eq('user_id', link.user_id)
        .eq('is_active', true)
        .single();

      // Se existe integração ativa, enfileira evento ViewContent
      if (integration) {
        const eventData: TrackingEventsQueueInsert = {
          integration_id: integration.id,
          event_id: eventId,
          event_type: 'ViewContent',
          event_data: {
            ref_code: refCode,
            link_id: linkId,
            ip_address: ipAddress,
            user_agent: userAgent,
          },
          status: 'pending',
        };

        await supabaseAdmin
          .from('tracking_events_queue')
          .insert(eventData);
      }
    }

    return { success: true, click };
  } catch (error) {
    console.error('Erro em trackClick:', error);
    return { success: false, error: 'Falha ao registrar clique' };
  }
}

// ============================================================================
// CRUD DE LINKS RASTREÁVEIS
// ============================================================================

export async function createTrackingLink(data: TrackingLinkInsert) {
  try {
    // Verifica se o slug já existe
    const { data: existing } = await supabaseAdmin
      .from('tracking_links')
      .select('id')
      .eq('slug', data.slug)
      .single();

    if (existing) {
      return { success: false, error: 'Slug já está em uso' };
    }

    // Cria o link
    const { data: link, error } = await supabaseAdmin
      .from('tracking_links')
      .insert(data)
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar link:', error);
      throw new Error('Falha ao criar link');
    }

    return { success: true, link };
  } catch (error) {
    console.error('Erro em createTrackingLink:', error);
    return { success: false, error: 'Falha ao criar link rastreável' };
  }
}

export async function updateTrackingLink(id: string, data: TrackingLinkUpdate) {
  try {
    const { data: link, error } = await supabaseAdmin
      .from('tracking_links')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar link:', error);
      throw new Error('Falha ao atualizar link');
    }

    return { success: true, link };
  } catch (error) {
    console.error('Erro em updateTrackingLink:', error);
    return { success: false, error: 'Falha ao atualizar link' };
  }
}

export async function deleteTrackingLink(id: string) {
  try {
    const { error } = await supabaseAdmin
      .from('tracking_links')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao deletar link:', error);
      throw new Error('Falha ao deletar link');
    }

    return { success: true };
  } catch (error) {
    console.error('Erro em deleteTrackingLink:', error);
    return { success: false, error: 'Falha ao deletar link' };
  }
}

export async function getTrackingLinks(userId: string) {
  try {
    const { data: links, error } = await supabaseAdmin
      .from('tracking_links')
      .select(`
        *,
        clicks:tracking_clicks(count)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar links:', error);
      throw new Error('Falha ao buscar links');
    }

    return { success: true, links };
  } catch (error) {
    console.error('Erro em getTrackingLinks:', error);
    return { success: false, error: 'Falha ao buscar links' };
  }
}

// ============================================================================
// INTEGRAÇÃO META (PIXEL)
// ============================================================================

export async function saveIntegration(data: IntegrationMetaInsert) {
  try {
    // Verifica se já existe integração para este usuário
    const { data: existing } = await supabaseAdmin
      .from('integrations_meta')
      .select('id')
      .eq('user_id', data.user_id)
      .single();

    let result;

    if (existing) {
      // Atualiza integração existente
      const updateData: IntegrationMetaUpdate = {
        access_token: data.access_token,
        pixel_id: data.pixel_id,
        test_event_code: data.test_event_code,
        is_active: data.is_active ?? true,
      };

      result = await supabaseAdmin
        .from('integrations_meta')
        .update(updateData)
        .eq('id', existing.id)
        .select()
        .single();
    } else {
      // Cria nova integração
      result = await supabaseAdmin
        .from('integrations_meta')
        .insert(data)
        .select()
        .single();
    }

    if (result.error) {
      console.error('Erro ao salvar integração:', result.error);
      throw new Error('Falha ao salvar integração');
    }

    return { success: true, integration: result.data };
  } catch (error) {
    console.error('Erro em saveIntegration:', error);
    return { success: false, error: 'Falha ao salvar integração do Meta' };
  }
}

export async function getIntegration(userId: string) {
  try {
    const { data: integration, error } = await supabaseAdmin
      .from('integrations_meta')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
      console.error('Erro ao buscar integração:', error);
      throw new Error('Falha ao buscar integração');
    }

    return { success: true, integration: integration || null };
  } catch (error) {
    console.error('Erro em getIntegration:', error);
    return { success: false, error: 'Falha ao buscar integração' };
  }
}

export async function toggleIntegration(userId: string, isActive: boolean) {
  try {
    const { data: integration, error } = await supabaseAdmin
      .from('integrations_meta')
      .update({ is_active: isActive })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar status da integração:', error);
      throw new Error('Falha ao atualizar integração');
    }

    return { success: true, integration };
  } catch (error) {
    console.error('Erro em toggleIntegration:', error);
    return { success: false, error: 'Falha ao atualizar status da integração' };
  }
}

// ============================================================================
// ESTATÍSTICAS E DASHBOARD
// ============================================================================

export async function getTrackingStats(userId: string) {
  try {
    // Busca links do usuário
    const { data: userLinks } = await supabaseAdmin
      .from('tracking_links')
      .select('id')
      .eq('user_id', userId);

    const linkIds = userLinks?.map(l => l.id) || [];

    // Total de cliques
    const { count: totalClicks } = await supabaseAdmin
      .from('tracking_clicks')
      .select('id', { count: 'exact', head: true })
      .in('link_id', linkIds.length > 0 ? linkIds : ['']);

    // Busca integração do usuário
    const { data: integration } = await supabaseAdmin
      .from('integrations_meta')
      .select('id')
      .eq('user_id', userId)
      .single();

    const integrationId = integration?.id || '';

    // Total de eventos
    const { count: totalEvents } = await supabaseAdmin
      .from('tracking_events_queue')
      .select('id', { count: 'exact', head: true })
      .eq('integration_id', integrationId);

    // Eventos pendentes
    const { count: pendingEvents } = await supabaseAdmin
      .from('tracking_events_queue')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .eq('integration_id', integrationId);

    // Eventos com falha
    const { count: failedEvents } = await supabaseAdmin
      .from('tracking_events_queue')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'failed')
      .eq('integration_id', integrationId);

    // Links ativos
    const { count: activeLinks } = await supabaseAdmin
      .from('tracking_links')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_active', true);

    // Conversões (eventos de Purchase)
    const { count: conversions } = await supabaseAdmin
      .from('funnel_events_map')
      .select('id', { count: 'exact', head: true })
      .eq('event_type', 'Purchase')
      .not('sale_id', 'is', null);

    return {
      success: true,
      stats: {
        totalClicks: totalClicks || 0,
        totalEvents: totalEvents || 0,
        pendingEvents: pendingEvents || 0,
        failedEvents: failedEvents || 0,
        activeLinks: activeLinks || 0,
        conversions: conversions || 0,
      },
    };
  } catch (error) {
    console.error('Erro em getTrackingStats:', error);
    return {
      success: false,
      error: 'Falha ao buscar estatísticas',
      stats: {
        totalClicks: 0,
        totalEvents: 0,
        pendingEvents: 0,
        failedEvents: 0,
        activeLinks: 0,
        conversions: 0,
      },
    };
  }
}

// ============================================================================
// LOGS DE EVENTOS
// ============================================================================

export async function getPixelLogs(userId: string, limit = 50) {
  try {
    // Busca integração do usuário
    const { data: integration } = await supabaseAdmin
      .from('integrations_meta')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!integration) {
      return { success: true, logs: [] };
    }

    // Busca últimos eventos
    const { data: logs, error } = await supabaseAdmin
      .from('tracking_events_queue')
      .select('*')
      .eq('integration_id', integration.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Erro ao buscar logs:', error);
      throw new Error('Falha ao buscar logs');
    }

    return { success: true, logs: logs || [] };
  } catch (error) {
    console.error('Erro em getPixelLogs:', error);
    return { success: false, error: 'Falha ao buscar logs de eventos', logs: [] };
  }
}
