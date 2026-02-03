/**
 * =====================================================
 * CLEANUP DE CAMPANHAS ÓRFÃS
 * =====================================================
 * 
 * Deleta campanhas que foram criadas mas falharam no AdSet/Ads
 * (campanhas PAUSADAS sem AdSets ativos)
 * 
 * =====================================================
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    console.log('🧹 [Cleanup] Iniciando limpeza de campanhas órfãs...');
    
    // Buscar configuração Meta
    const { data: config, error: configError } = await supabaseAdmin
      .from('meta_ads_config')
      .select('access_token, ad_account_id')
      .single();

    if (configError || !config) {
      return NextResponse.json({
        success: false,
        error: 'Configuração Meta não encontrada'
      }, { status: 400 });
    }

    const accessToken = config.access_token;
    const adAccountId = config.ad_account_id;

    // Buscar todas as campanhas PAUSADAS
    const campaignsResponse = await fetch(
      `https://graph.facebook.com/v24.0/act_${adAccountId}/campaigns?` +
      `fields=id,name,status,effective_status,created_time,adsets{id,name,status}` +
      `&filtering=[{"field":"effective_status","operator":"IN","value":["PAUSED"]}]` +
      `&limit=100` +
      `&access_token=${accessToken}`
    );

    const campaignsData = await campaignsResponse.json();

    if (campaignsData.error) {
      console.error('❌ [Cleanup] Erro ao buscar campanhas:', campaignsData.error);
      return NextResponse.json({
        success: false,
        error: campaignsData.error.message
      }, { status: 400 });
    }

    const campaigns = campaignsData.data || [];
    console.log(`📊 [Cleanup] Encontradas ${campaigns.length} campanhas PAUSADAS`);

    // Identificar órfãs: campanhas sem AdSets ou com AdSets vazios
    const today = new Date();
    const orphans: any[] = [];

    for (const campaign of campaigns) {
      // Verificar se foi criada nas últimas 24 horas
      const createdTime = new Date(campaign.created_time);
      const hoursDiff = (today.getTime() - createdTime.getTime()) / (1000 * 60 * 60);
      
      // Campanhas criadas pelo sistema (nome específico) nas últimas 24h
      const isSystemCampaign = campaign.name.includes('[ASC+][IA]') || 
                               campaign.name.includes('• TOPO •') ||
                               campaign.name.includes('• MEIO •') ||
                               campaign.name.includes('• FUNDO •');
      
      // Verificar se tem AdSets
      const hasAdSets = campaign.adsets && campaign.adsets.data && campaign.adsets.data.length > 0;
      
      // Campanha órfã: criada pelo sistema, pausada, sem AdSets ou recente com erro
      if (isSystemCampaign && !hasAdSets && hoursDiff < 24) {
        orphans.push({
          id: campaign.id,
          name: campaign.name,
          created_time: campaign.created_time,
          status: campaign.effective_status,
          reason: 'Sem AdSets (provável falha na criação)'
        });
      }
    }

    console.log(`🗑️ [Cleanup] Identificadas ${orphans.length} campanhas órfãs para deletar`);

    // Deletar campanhas órfãs
    const deleted: string[] = [];
    const errors: { id: string; error: string }[] = [];

    for (const orphan of orphans) {
      try {
        console.log(`🗑️ [Cleanup] Deletando: ${orphan.name} (${orphan.id})`);
        
        const deleteResponse = await fetch(
          `https://graph.facebook.com/v24.0/${orphan.id}?access_token=${accessToken}`,
          { method: 'DELETE' }
        );

        const deleteResult = await deleteResponse.json();

        if (deleteResult.success) {
          deleted.push(orphan.id);
          console.log(`✅ [Cleanup] Deletada: ${orphan.id}`);
        } else if (deleteResult.error) {
          errors.push({ id: orphan.id, error: deleteResult.error.message });
          console.error(`❌ [Cleanup] Erro ao deletar ${orphan.id}:`, deleteResult.error.message);
        }
      } catch (error: any) {
        errors.push({ id: orphan.id, error: error.message });
        console.error(`❌ [Cleanup] Exceção ao deletar ${orphan.id}:`, error.message);
      }
    }

    console.log(`✅ [Cleanup] Limpeza concluída: ${deleted.length}/${orphans.length} deletadas`);

    return NextResponse.json({
      success: true,
      summary: {
        totalPaused: campaigns.length,
        orphansFound: orphans.length,
        deleted: deleted.length,
        errors: errors.length
      },
      orphans: orphans.map(o => ({ id: o.id, name: o.name, reason: o.reason })),
      deletedIds: deleted,
      errors: errors
    });

  } catch (error: any) {
    console.error('💥 [Cleanup] Erro fatal:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

// GET: Apenas listar órfãs sem deletar
export async function GET(request: Request) {
  try {
    console.log('🔍 [Cleanup] Listando campanhas órfãs...');
    
    const { data: config } = await supabaseAdmin
      .from('meta_ads_config')
      .select('access_token, ad_account_id')
      .single();

    if (!config) {
      return NextResponse.json({ success: false, error: 'Config não encontrada' }, { status: 400 });
    }

    const response = await fetch(
      `https://graph.facebook.com/v24.0/act_${config.ad_account_id}/campaigns?` +
      `fields=id,name,status,effective_status,created_time,adsets{id}` +
      `&filtering=[{"field":"effective_status","operator":"IN","value":["PAUSED"]}]` +
      `&limit=100` +
      `&access_token=${config.access_token}`
    );

    const data = await response.json();
    const campaigns = data.data || [];

    // Filtrar órfãs
    const today = new Date();
    const orphans = campaigns.filter((c: any) => {
      const createdTime = new Date(c.created_time);
      const hoursDiff = (today.getTime() - createdTime.getTime()) / (1000 * 60 * 60);
      const isSystem = c.name.includes('[ASC+][IA]') || c.name.includes('• TOPO •');
      const hasAdSets = c.adsets?.data?.length > 0;
      
      return isSystem && !hasAdSets && hoursDiff < 24;
    });

    return NextResponse.json({
      success: true,
      totalPaused: campaigns.length,
      orphansFound: orphans.length,
      orphans: orphans.map((o: any) => ({
        id: o.id,
        name: o.name,
        created_time: o.created_time,
        hasAdSets: o.adsets?.data?.length > 0
      }))
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
