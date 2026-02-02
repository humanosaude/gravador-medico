// =====================================================
// CLIENTE META MARKETING API
// =====================================================
// Wrapper para o facebook-nodejs-business-sdk com tratamento de erros
// =====================================================

// @ts-ignore - O pacote facebook-nodejs-business-sdk não tem tipos oficiais
import bizSdk from 'facebook-nodejs-business-sdk';
import type {
  CampaignParams,
  AdSetParams,
  AdCreativeParams,
  AdParams,
  AdMetrics,
  FacebookTargeting,
  MetaAdsConfig,
} from './types';
import { INTEREST_MAPPINGS } from './types';

const { 
  AdAccount, 
  Campaign, 
  AdSet, 
  AdCreative, 
  Ad,
  AdImage,
  FacebookAdsApi
} = bizSdk;

// =====================================================
// CONFIGURAÇÃO
// =====================================================

let apiInstance: typeof FacebookAdsApi | null = null;

export function initializeFacebookApi(accessToken: string): void {
  if (!apiInstance) {
    apiInstance = FacebookAdsApi.init(accessToken);
    // apiInstance.setDebug(true); // Descomente para debug
  }
}

export function getMetaConfig(): MetaAdsConfig {
  const accessToken = process.env.META_ACCESS_TOKEN;
  const adAccountId = process.env.META_AD_ACCOUNT_ID;
  const pageId = process.env.META_PAGE_ID;

  if (!accessToken || !adAccountId || !pageId) {
    throw new Error('Configuração Meta incompleta. Verifique META_ACCESS_TOKEN, META_AD_ACCOUNT_ID e META_PAGE_ID');
  }

  return {
    accessToken,
    adAccountId: adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`,
    pageId,
  };
}

// =====================================================
// TRATAMENTO DE ERROS
// =====================================================

export interface MetaApiError {
  code: number;
  message: string;
  type: string;
  fbtrace_id?: string;
  is_transient?: boolean;
}

export function handleMetaError(error: any): never {
  console.error('❌ Meta API Error:', error);

  // Erros comuns do Facebook
  const errorCode = error?.error?.code || error?.code;
  const errorMessage = error?.error?.message || error?.message || 'Erro desconhecido';

  const errorMap: Record<number, string> = {
    190: 'Token de acesso expirado ou inválido. Renove o token no Business Manager.',
    100: 'Parâmetro inválido na requisição. Verifique os campos enviados.',
    200: 'Permissão negada. Verifique as permissões do token.',
    294: 'Conta de anúncios não encontrada ou sem permissão.',
    368: 'Limite de requisições atingido. Aguarde alguns minutos.',
    1487: 'O anúncio foi rejeitado pelas políticas do Facebook.',
    1815131: 'Orçamento abaixo do mínimo permitido (R$ 6,00/dia).',
    2446: 'Campanha pausada por violação de políticas.',
  };

  const friendlyMessage = errorMap[errorCode] || errorMessage;

  throw new Error(`Meta API Error [${errorCode}]: ${friendlyMessage}`);
}

// =====================================================
// UPLOAD DE IMAGEM
// =====================================================

export async function uploadImageToMeta(
  imageUrl: string,
  adAccountId: string
): Promise<string> {
  try {
    const account = new AdAccount(adAccountId);
    
    // Upload via URL
    const result = await account.createAdImage(
      [],
      {
        url: imageUrl,
      }
    );

    // O resultado vem como um objeto com o hash
    const imageData = result._data || result;
    const imagesObj = imageData.images || {};
    const firstImage = Object.values(imagesObj)[0] as { hash?: string } | undefined;
    const hash = firstImage?.hash;

    if (!hash) {
      throw new Error('Não foi possível obter o hash da imagem');
    }

    console.log('✅ Imagem enviada para Meta. Hash:', hash);
    return hash;
  } catch (error) {
    handleMetaError(error);
  }
}

// =====================================================
// CRIAR CAMPANHA
// =====================================================

export async function createCampaign(
  adAccountId: string,
  params: CampaignParams
): Promise<string> {
  try {
    const account = new AdAccount(adAccountId);
    
    const campaignData = {
      name: params.name,
      objective: params.objective,
      status: params.status,
      special_ad_categories: params.special_ad_categories || [],
    };

    console.log('📢 Criando campanha:', campaignData);

    const result = await account.createCampaign(
      [Campaign.Fields.id, Campaign.Fields.name],
      campaignData
    );

    const campaignId = result._data?.id || result.id;
    console.log('✅ Campanha criada. ID:', campaignId);
    
    return campaignId;
  } catch (error) {
    handleMetaError(error);
  }
}

// =====================================================
// CRIAR ADSET
// =====================================================

export function buildTargeting(audienceKeyword: string): FacebookTargeting {
  // Encontrar interesses baseados no público-alvo
  const interests = INTEREST_MAPPINGS[audienceKeyword] || INTEREST_MAPPINGS['default'];

  return {
    geo_locations: {
      countries: ['BR'], // Brasil
    },
    age_min: 25,
    age_max: 55,
    flexible_spec: [
      {
        interests: interests,
      },
    ],
  };
}

export async function createAdSet(
  adAccountId: string,
  params: AdSetParams
): Promise<string> {
  try {
    const account = new AdAccount(adAccountId);

    const adSetData = {
      name: params.name,
      campaign_id: params.campaign_id,
      daily_budget: params.daily_budget, // Em centavos
      billing_event: params.billing_event,
      optimization_goal: params.optimization_goal,
      targeting: params.targeting,
      status: params.status,
      bid_strategy: params.bid_strategy || 'LOWEST_COST_WITHOUT_CAP',
    };

    console.log('📋 Criando AdSet:', adSetData);

    const result = await account.createAdSet(
      [AdSet.Fields.id, AdSet.Fields.name],
      adSetData
    );

    const adSetId = result._data?.id || result.id;
    console.log('✅ AdSet criado. ID:', adSetId);

    return adSetId;
  } catch (error) {
    handleMetaError(error);
  }
}

// =====================================================
// CRIAR AD CREATIVE
// =====================================================

export async function createAdCreative(
  adAccountId: string,
  params: {
    name: string;
    pageId: string;
    imageHash: string;
    primaryText: string;
    headline: string;
    linkUrl: string;
    ctaType?: 'SHOP_NOW' | 'LEARN_MORE' | 'SIGN_UP' | 'DOWNLOAD';
  }
): Promise<string> {
  try {
    const account = new AdAccount(adAccountId);

    const creativeData = {
      name: params.name,
      object_story_spec: {
        page_id: params.pageId,
        link_data: {
          image_hash: params.imageHash,
          link: params.linkUrl,
          message: params.primaryText,
          name: params.headline,
          call_to_action: {
            type: params.ctaType || 'SHOP_NOW',
            value: {
              link: params.linkUrl,
            },
          },
        },
      },
    };

    console.log('🎨 Criando Ad Creative:', creativeData);

    const result = await account.createAdCreative(
      [AdCreative.Fields.id, AdCreative.Fields.name],
      creativeData
    );

    const creativeId = result._data?.id || result.id;
    console.log('✅ Ad Creative criado. ID:', creativeId);

    return creativeId;
  } catch (error) {
    handleMetaError(error);
  }
}

// =====================================================
// CRIAR AD
// =====================================================

export async function createAd(
  adAccountId: string,
  params: {
    name: string;
    adSetId: string;
    creativeId: string;
    status: 'PAUSED' | 'ACTIVE';
    pixelId?: string;
    campaignName?: string;
    adSetName?: string;
  }
): Promise<string> {
  try {
    const account = new AdAccount(adAccountId);

    // 🔥 UTMs Automáticos - Rastreamento completo
    const campaignNameSafe = encodeURIComponent(params.campaignName || 'campaign');
    const adSetNameSafe = encodeURIComponent(params.adSetName || 'adset');
    const adNameSafe = encodeURIComponent(params.name || 'ad');
    
    const urlTags = `utm_source=facebook&utm_medium=cpc&utm_campaign=${campaignNameSafe}&utm_content=${adNameSafe}&utm_term=${adSetNameSafe}`;

    const adData: any = {
      name: params.name,
      adset_id: params.adSetId,
      creative: {
        creative_id: params.creativeId,
      },
      status: params.status,
      // 🔥 NOVO: UTMs injetados automaticamente
      url_tags: urlTags,
    };

    // Adicionar tracking de pixel se disponível
    if (params.pixelId) {
      adData.tracking_specs = [
        {
          'action.type': ['offsite_conversion'],
          fb_pixel: [params.pixelId],
        },
      ];
    }

    console.log('📣 Criando Ad:', adData);

    const result = await account.createAd(
      [Ad.Fields.id, Ad.Fields.name],
      adData
    );

    const adId = result._data?.id || result.id;
    console.log('✅ Ad criado. ID:', adId);

    return adId;
  } catch (error) {
    handleMetaError(error);
  }
}

// =====================================================
// LISTAR ADS ATIVOS
// =====================================================

export async function getActiveAds(adAccountId: string): Promise<any[]> {
  try {
    const account = new AdAccount(adAccountId);

    const ads = await account.getAds(
      [
        Ad.Fields.id,
        Ad.Fields.name,
        Ad.Fields.status,
        Ad.Fields.adset_id,
        Ad.Fields.campaign_id,
      ],
      {
        filtering: [
          {
            field: 'effective_status',
            operator: 'IN',
            value: ['ACTIVE', 'PENDING_REVIEW', 'PREAPPROVED'],
          },
        ],
        limit: 100,
      }
    );

    return ads;
  } catch (error) {
    handleMetaError(error);
  }
}

// =====================================================
// OBTER MÉTRICAS DE ADS
// =====================================================

export async function getAdInsights(
  adAccountId: string,
  datePreset: string = 'last_7d'
): Promise<AdMetrics[]> {
  try {
    const account = new AdAccount(adAccountId);

    const insights = await account.getInsights(
      [
        'ad_id',
        'ad_name',
        'adset_id',
        'campaign_id',
        'spend',
        'impressions',
        'clicks',
        'ctr',
        'actions',
        'action_values',
      ],
      {
        level: 'ad',
        date_preset: datePreset,
        filtering: [
          {
            field: 'ad.effective_status',
            operator: 'IN',
            value: ['ACTIVE'],
          },
        ],
      }
    );

    return insights.map((insight: any) => {
      const data = insight._data || insight;
      
      // Extrair purchases das actions
      const actions = data.actions || [];
      const purchaseAction = actions.find(
        (a: any) => a.action_type === 'purchase' || a.action_type === 'omni_purchase'
      );
      const purchases = purchaseAction ? parseInt(purchaseAction.value, 10) : 0;

      // Extrair valor de purchase das action_values
      const actionValues = data.action_values || [];
      const purchaseValue = actionValues.find(
        (a: any) => a.action_type === 'purchase' || a.action_type === 'omni_purchase'
      );
      const revenue = purchaseValue ? parseFloat(purchaseValue.value) : 0;

      const spend = parseFloat(data.spend || '0');
      const roas = spend > 0 ? revenue / spend : 0;
      const cpa = purchases > 0 ? spend / purchases : 0;

      return {
        adId: data.ad_id,
        adName: data.ad_name,
        adSetId: data.adset_id,
        campaignId: data.campaign_id,
        status: 'ACTIVE',
        spend,
        impressions: parseInt(data.impressions || '0', 10),
        clicks: parseInt(data.clicks || '0', 10),
        ctr: parseFloat(data.ctr || '0'),
        purchases,
        purchaseValue: revenue,
        roas,
        cpa,
      };
    });
  } catch (error) {
    handleMetaError(error);
  }
}

// =====================================================
// ATUALIZAR STATUS DO AD
// =====================================================

export async function updateAdStatus(
  adId: string,
  status: 'PAUSED' | 'ACTIVE'
): Promise<boolean> {
  try {
    const ad = new Ad(adId);
    
    await ad.update(
      [Ad.Fields.id],
      { status }
    );

    console.log(`✅ Ad ${adId} atualizado para ${status}`);
    return true;
  } catch (error) {
    handleMetaError(error);
  }
}

// =====================================================
// ATUALIZAR ORÇAMENTO DO ADSET
// =====================================================

export async function updateAdSetBudget(
  adSetId: string,
  newDailyBudget: number // Em centavos
): Promise<boolean> {
  try {
    const adSet = new AdSet(adSetId);
    
    await adSet.update(
      [AdSet.Fields.id],
      { daily_budget: newDailyBudget }
    );

    console.log(`✅ AdSet ${adSetId} orçamento atualizado para ${newDailyBudget / 100} BRL`);
    return true;
  } catch (error) {
    handleMetaError(error);
  }
}

// =====================================================
// OBTER DETALHES DO ADSET
// =====================================================

export async function getAdSetDetails(adSetId: string): Promise<any> {
  try {
    const adSet = new AdSet(adSetId);
    
    const result = await adSet.get([
      AdSet.Fields.id,
      AdSet.Fields.name,
      AdSet.Fields.daily_budget,
      AdSet.Fields.status,
    ]);

    return result._data || result;
  } catch (error) {
    handleMetaError(error);
  }
}
