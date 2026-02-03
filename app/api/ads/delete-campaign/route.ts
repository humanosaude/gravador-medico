// =====================================================
// API: DELETE CAMPAIGN - Deletar campanha do banco
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

/**
 * DELETE /api/ads/delete-campaign?id=<campaign_id>
 * Deleta uma campanha do banco de dados
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const metaCampaignId = searchParams.get('meta_campaign_id');

    if (!id && !metaCampaignId) {
      return NextResponse.json({
        success: false,
        error: 'Informe id ou meta_campaign_id'
      }, { status: 400 });
    }

    // Deletar por ID ou meta_campaign_id
    let query = supabaseAdmin
      .from('ads_campaigns')
      .delete();

    if (id) {
      query = query.eq('id', id);
    } else if (metaCampaignId) {
      query = query.eq('meta_campaign_id', metaCampaignId);
    }

    const { error, count } = await query;

    if (error) {
      console.error('❌ Erro ao deletar campanha:', error);
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }

    console.log(`🗑️ Campanha deletada do banco: ${id || metaCampaignId}`);

    return NextResponse.json({
      success: true,
      message: 'Campanha deletada com sucesso',
      deleted: { id, metaCampaignId }
    });

  } catch (error: any) {
    console.error('❌ Erro:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

/**
 * POST /api/ads/delete-campaign
 * Body: { ids: [...] } ou { meta_campaign_ids: [...] }
 * Deleta múltiplas campanhas
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids, meta_campaign_ids, delete_all_test } = body;

    if (delete_all_test) {
      // Deletar todas as campanhas de teste (criadas hoje)
      const today = new Date().toISOString().split('T')[0];
      
      const { data: toDelete, error: listError } = await supabaseAdmin
        .from('ads_campaigns')
        .select('id, meta_campaign_id, name')
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`);

      if (listError) {
        return NextResponse.json({ success: false, error: listError.message }, { status: 500 });
      }

      if (!toDelete || toDelete.length === 0) {
        return NextResponse.json({ success: true, message: 'Nenhuma campanha para deletar', deleted: 0 });
      }

      const idsToDelete = toDelete.map(c => c.id);
      
      const { error: deleteError } = await supabaseAdmin
        .from('ads_campaigns')
        .delete()
        .in('id', idsToDelete);

      if (deleteError) {
        return NextResponse.json({ success: false, error: deleteError.message }, { status: 500 });
      }

      console.log(`🗑️ ${toDelete.length} campanhas de teste deletadas`);
      
      return NextResponse.json({
        success: true,
        message: `${toDelete.length} campanhas deletadas`,
        deleted: toDelete
      });
    }

    if (ids && Array.isArray(ids)) {
      const { error } = await supabaseAdmin
        .from('ads_campaigns')
        .delete()
        .in('id', ids);

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, deleted: ids.length });
    }

    if (meta_campaign_ids && Array.isArray(meta_campaign_ids)) {
      const { error } = await supabaseAdmin
        .from('ads_campaigns')
        .delete()
        .in('meta_campaign_id', meta_campaign_ids);

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, deleted: meta_campaign_ids.length });
    }

    return NextResponse.json({
      success: false,
      error: 'Informe ids, meta_campaign_ids ou delete_all_test: true'
    }, { status: 400 });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
