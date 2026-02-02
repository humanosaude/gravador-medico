// =====================================================
// API: LAUNCH ADS - FÁBRICA DE ANÚNCIOS AUTOMATIZADA
// =====================================================
// Endpoint que orquestra todo o processo:
// 1. Upload de imagens para Supabase
// 2. Geração de copy via OpenAI
// 3. Criação de Campanha, AdSet, Creative e Ad no Facebook
// 
// NOTA: Use /api/ads/launch-v2 para suporte a vídeo e funil
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateCopiesForImages } from '@/lib/ads/copy-generator';
import {
  initializeFacebookApi,
  getMetaConfig,
  uploadImageToMeta,
  createCampaign,
  createAdSet,
  createAdCreative,
  createAd,
  buildTargeting,
} from '@/lib/ads/meta-client';
import type { CreateCampaignResponse, GeneratedCopy } from '@/lib/ads/types';

export const runtime = 'nodejs';
export const maxDuration = 120; // 2 minutos para processar todas as imagens

// =====================================================
// HELPER: Buscar configurações do banco
// =====================================================

interface MetaSettings {
  adAccountId: string;
  pageId: string;
  pixelId?: string;
  accessToken: string;
}

async function getMetaSettingsFromDB(): Promise<MetaSettings | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('integration_settings')
      .select('*')
      .eq('is_default', true)
      .limit(1)
      .single();

    if (error || !data || !data.meta_ad_account_id) {
      return null;
    }

    return {
      adAccountId: data.meta_ad_account_id,
      pageId: data.meta_page_id || process.env.META_PAGE_ID || '',
      pixelId: data.meta_pixel_id || process.env.META_PIXEL_ID,
      accessToken: process.env.META_ACCESS_TOKEN || process.env.FACEBOOK_ACCESS_TOKEN || ''
    };
  } catch {
    return null;
  }
}

// =====================================================
// HELPER: Upload para Supabase Storage
// =====================================================

async function uploadToSupabase(
  file: File,
  index: number
): Promise<string> {
  const timestamp = Date.now();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const fileName = `ads/${timestamp}_${index}_${sanitizedName}`;

  // Converter File para Buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Upload para o bucket 'creatives' (criar se não existir)
  const { data, error } = await supabaseAdmin.storage
    .from('creatives')
    .upload(fileName, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (error) {
    console.error('❌ Erro no upload para Supabase:', error);
    throw new Error(`Falha no upload: ${error.message}`);
  }

  // Obter URL pública
  const { data: urlData } = supabaseAdmin.storage
    .from('creatives')
    .getPublicUrl(fileName);

  console.log('✅ Imagem enviada para Supabase:', urlData.publicUrl);
  return urlData.publicUrl;
}

// =====================================================
// HELPER: Log de campanha no banco
// =====================================================

async function logCampaignCreation(data: {
  campaign_id: string;
  adset_id: string;
  ad_ids: string[];
  objective: string;
  daily_budget: number;
  target_audience: string;
  images_count: number;
  status: 'success' | 'error';
  error_message?: string;
}) {
  try {
    await supabaseAdmin.from('ads_campaigns_log').insert({
      ...data,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('⚠️ Erro ao salvar log de campanha:', error);
    // Não falha a operação principal por causa do log
  }
}

// =====================================================
// POST: Criar campanha completa
// =====================================================

export async function POST(request: NextRequest) {
  console.log('🚀 Iniciando criação de campanha de anúncios...');

  try {
    // 1. Tentar buscar configuração do banco primeiro
    const dbSettings = await getMetaSettingsFromDB();
    
    let metaConfig: MetaSettings;
    
    if (dbSettings) {
      console.log('✅ Usando configurações do banco de dados');
      metaConfig = dbSettings;
    } else {
      console.log('⚠️ Usando configurações do ambiente (.env)');
      const envConfig = getMetaConfig();
      metaConfig = {
        adAccountId: envConfig.adAccountId,
        pageId: envConfig.pageId,
        pixelId: process.env.META_PIXEL_ID,
        accessToken: envConfig.accessToken
      };
    }

    // Validar configuração
    if (!metaConfig.adAccountId || !metaConfig.accessToken) {
      return NextResponse.json({
        success: false,
        error: 'Configuração Meta incompleta. Configure seus ativos em /admin/ai/settings',
        code: 'META_NOT_CONFIGURED'
      }, { status: 400 });
    }

    initializeFacebookApi(metaConfig.accessToken);

    // 2. Parse do FormData
    const formData = await request.formData();
    const objective = formData.get('objective') as string;
    const dailyBudgetStr = formData.get('dailyBudget') as string;
    const targetAudience = formData.get('targetAudience') as string || 'Médicos';
    const statusRaw = formData.get('status') as string || 'PAUSED';
    const status = statusRaw === 'ACTIVE' ? 'ACTIVE' : 'PAUSED';
    const linkUrl = formData.get('linkUrl') as string || process.env.NEXT_PUBLIC_SITE_URL || 'https://gravador-medico.com.br';

    // Obter arquivos de imagem
    const imageFiles: File[] = [];
    formData.forEach((value, key) => {
      if (key.startsWith('image') && value instanceof File) {
        imageFiles.push(value);
      }
    });

    // Validações
    if (!objective) {
      return NextResponse.json(
        { success: false, error: 'Objetivo da campanha é obrigatório' },
        { status: 400 }
      );
    }

    if (imageFiles.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Pelo menos uma imagem é obrigatória' },
        { status: 400 }
      );
    }

    const dailyBudget = parseFloat(dailyBudgetStr);
    if (isNaN(dailyBudget) || dailyBudget < 6) {
      return NextResponse.json(
        { success: false, error: 'Orçamento diário mínimo é R$ 6,00' },
        { status: 400 }
      );
    }

    console.log('📋 Parâmetros recebidos:', {
      objective,
      dailyBudget,
      targetAudience,
      status,
      imagesCount: imageFiles.length,
    });

    // =====================================================
    // ETAPA 1: Upload das imagens para Supabase
    // =====================================================

    console.log('📤 Etapa 1: Upload de imagens para Supabase...');
    const uploadedImageUrls: string[] = [];

    for (let i = 0; i < imageFiles.length; i++) {
      const url = await uploadToSupabase(imageFiles[i], i);
      uploadedImageUrls.push(url);
    }

    console.log(`✅ ${uploadedImageUrls.length} imagens enviadas com sucesso`);

    // =====================================================
    // ETAPA 2: Gerar copy com OpenAI
    // =====================================================

    console.log('🤖 Etapa 2: Gerando copy com OpenAI...');
    const generatedCopies = await generateCopiesForImages(
      uploadedImageUrls,
      objective,
      targetAudience
    );

    console.log(`✅ ${generatedCopies.length} copys geradas com sucesso`);

    // =====================================================
    // ETAPA 3: Criar Campanha no Facebook
    // =====================================================

    console.log('📢 Etapa 3: Criando campanha no Facebook...');
    const timestamp = new Date().toISOString().split('T')[0];
    const campaignName = `[Auto] ${objective} - ${timestamp}`;

    const campaignId = await createCampaign(metaConfig.adAccountId, {
      name: campaignName,
      objective: 'OUTCOME_SALES',
      status: status,
      special_ad_categories: [],
    });

    // =====================================================
    // ETAPA 4: Criar AdSet
    // =====================================================

    console.log('📋 Etapa 4: Criando AdSet...');
    const adSetName = `${campaignName} - ${targetAudience}`;
    const targeting = buildTargeting(targetAudience);

    // Converter orçamento para centavos (API do Facebook usa centavos)
    const dailyBudgetCents = Math.round(dailyBudget * 100);

    const adSetId = await createAdSet(metaConfig.adAccountId, {
      name: adSetName,
      campaign_id: campaignId,
      daily_budget: dailyBudgetCents,
      billing_event: 'IMPRESSIONS',
      optimization_goal: 'OFFSITE_CONVERSIONS',
      targeting: targeting,
      status: status,
      bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
    });

    // =====================================================
    // ETAPA 5: Criar Ad Creatives e Ads
    // =====================================================

    console.log('🎨 Etapa 5: Criando Ad Creatives e Ads...');
    const adCreativeIds: string[] = [];
    const adIds: string[] = [];

    for (let i = 0; i < generatedCopies.length; i++) {
      const copy = generatedCopies[i];
      
      // Upload da imagem para o Facebook
      const imageHash = await uploadImageToMeta(
        copy.imageUrl,
        metaConfig.adAccountId
      );

      // Criar 2 variações de anúncio por imagem (combinando textos)
      for (let j = 0; j < 2; j++) {
        const primaryText = copy.primaryText[j % copy.primaryText.length];
        const headline = copy.headlines[j % copy.headlines.length];
        const creativeName = `Creative_${i + 1}_V${j + 1}`;
        const adName = `${campaignName} - Img${i + 1} V${j + 1}`;

        // Criar Creative
        const creativeId = await createAdCreative(metaConfig.adAccountId, {
          name: creativeName,
          pageId: metaConfig.pageId,
          imageHash: imageHash,
          primaryText: primaryText,
          headline: headline,
          linkUrl: linkUrl,
          ctaType: 'SHOP_NOW',
        });

        adCreativeIds.push(creativeId);

        // Criar Ad
        const adId = await createAd(metaConfig.adAccountId, {
          name: adName,
          adSetId: adSetId,
          creativeId: creativeId,
          status: status,
          pixelId: process.env.META_PIXEL_ID,
        });

        adIds.push(adId);
      }
    }

    console.log('✅ Campanha criada com sucesso!');

    // =====================================================
    // ETAPA 6: Salvar log no banco
    // =====================================================

    await logCampaignCreation({
      campaign_id: campaignId,
      adset_id: adSetId,
      ad_ids: adIds,
      objective: objective,
      daily_budget: dailyBudget,
      target_audience: targetAudience,
      images_count: imageFiles.length,
      status: 'success',
    });

    // =====================================================
    // RESPOSTA DE SUCESSO
    // =====================================================

    const response: CreateCampaignResponse = {
      success: true,
      campaignId: campaignId,
      adSetId: adSetId,
      adCreativeIds: adCreativeIds,
      adIds: adIds,
      details: {
        uploadedImages: uploadedImageUrls,
        generatedCopies: generatedCopies,
      },
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error: any) {
    console.error('❌ Erro ao criar campanha:', error);

    // Log do erro
    await logCampaignCreation({
      campaign_id: 'N/A',
      adset_id: 'N/A',
      ad_ids: [],
      objective: 'N/A',
      daily_budget: 0,
      target_audience: 'N/A',
      images_count: 0,
      status: 'error',
      error_message: error.message,
    });

    // Identificar tipo de erro
    const isMetaError = error.message?.includes('Meta API Error');
    const isOpenAIError = error.message?.includes('OpenAI');

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Erro interno ao criar campanha',
        errorType: isMetaError ? 'meta_api' : isOpenAIError ? 'openai' : 'internal',
      },
      { status: isMetaError ? 502 : 500 }
    );
  }
}

// =====================================================
// GET: Status da API
// =====================================================

export async function GET() {
  try {
    const metaConfig = getMetaConfig();
    
    return NextResponse.json({
      status: 'ok',
      configured: true,
      adAccountId: metaConfig.adAccountId.slice(0, 10) + '...',
      hasPageId: !!metaConfig.pageId,
      hasToken: !!metaConfig.accessToken,
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      configured: false,
      error: error.message,
    }, { status: 503 });
  }
}
