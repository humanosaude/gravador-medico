/**
 * =====================================================
 * ANALISADOR DE CAMPANHAS ATIVAS
 * =====================================================
 * 
 * Busca copies de campanhas ativas na Meta API para:
 * - Evitar duplicatas
 * - Verificar similaridade entre copies
 * - Sugerir ângulos diferentes
 * 
 * =====================================================
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// =====================================================
// TIPOS
// =====================================================

export interface ActiveCampaignAd {
  id: string;
  name: string;
  primary_text: string;
  headline: string;
  description: string;
  status: string;
  created_at: string;
}

export interface DuplicationCheckResult {
  isDuplicate: boolean;
  similarity: number;
  matchedAd?: ActiveCampaignAd;
  warning: string | null;
}

// =====================================================
// BUSCAR ANÚNCIOS ATIVOS DA META
// =====================================================

async function getMetaCredentials() {
  try {
    const { data: settings } = await supabase
      .from('integration_settings')
      .select('meta_ad_account_id, meta_access_token')
      .single();
    
    if (settings?.meta_access_token && settings?.meta_ad_account_id) {
      return {
        accessToken: settings.meta_access_token,
        adAccountId: settings.meta_ad_account_id,
      };
    }
  } catch (e) {
    console.warn('[Active Campaigns] Erro ao buscar config do banco:', e);
  }
  
  // Fallback para env
  return {
    accessToken: process.env.META_ACCESS_TOKEN || process.env.FACEBOOK_ACCESS_TOKEN,
    adAccountId: process.env.META_AD_ACCOUNT_ID || process.env.FACEBOOK_AD_ACCOUNT_ID,
  };
}

export async function fetchActiveCampaigns(accountId?: string): Promise<ActiveCampaignAd[]> {
  try {
    console.log('🔍 [Active Campaigns] Buscando anúncios ativos...');

    const creds = await getMetaCredentials();
    const accessToken = creds.accessToken;
    const finalAccountId = accountId || creds.adAccountId;
    
    if (!accessToken) {
      console.warn('⚠️ [Active Campaigns] Access token não configurado');
      return [];
    }

    if (!finalAccountId) {
      console.warn('⚠️ [Active Campaigns] Ad Account ID não configurado');
      return [];
    }

    const response = await fetch(
      `https://graph.facebook.com/v24.0/act_${finalAccountId}/ads?` +
      `fields=id,name,creative{title,body,link_description},status,created_time&` +
      `effective_status=["ACTIVE","PAUSED"]&` +
      `limit=100&` +
      `access_token=${accessToken}`,
      { method: 'GET' }
    );

    const data = await response.json();
    
    if (data.error) {
      console.error('❌ Erro Meta API:', data.error);
      return [];
    }

    const ads: ActiveCampaignAd[] = data.data?.map((ad: any) => ({
      id: ad.id,
      name: ad.name,
      primary_text: ad.creative?.body || '',
      headline: ad.creative?.title || '',
      description: ad.creative?.link_description || '',
      status: ad.status,
      created_at: ad.created_time
    })) || [];

    console.log(`✅ [Active Campaigns] ${ads.length} anúncios encontrados`);
    
    // Salvar no banco para cache
    if (finalAccountId) {
      await saveActiveCampaignsCache(finalAccountId, ads);
    }
    
    return ads;

  } catch (error: any) {
    console.error('❌ [Active Campaigns] Erro:', error.message);
    return [];
  }
}

// =====================================================
// SALVAR CACHE NO SUPABASE
// =====================================================

async function saveActiveCampaignsCache(accountId: string, ads: ActiveCampaignAd[]) {
  try {
    // Deletar registro existente primeiro
    await supabase
      .from('active_campaigns_cache')
      .delete()
      .eq('account_id', accountId);
    
    // Inserir novo
    await supabase.from('active_campaigns_cache').insert({
      account_id: accountId,
      ads_data: ads,
      updated_at: new Date().toISOString()
    });
    
    console.log('💾 [Active Campaigns] Cache salvo no banco');
  } catch (error) {
    console.error('❌ Erro ao salvar cache:', error);
  }
}

// =====================================================
// BUSCAR CACHE DO BANCO (se existir e for recente)
// =====================================================

export async function getActiveCampaignsCache(accountId: string): Promise<ActiveCampaignAd[]> {
  try {
    const { data, error } = await supabase
      .from('active_campaigns_cache')
      .select('ads_data, updated_at')
      .eq('account_id', accountId)
      .single();

    if (error || !data) {
      console.log('⚠️ [Active Campaigns] Cache não encontrado, buscando da API...');
      return fetchActiveCampaigns(accountId);
    }

    // Verificar se cache é recente (menos de 1 hora)
    const updatedAt = new Date(data.updated_at);
    const now = new Date();
    const hoursDiff = (now.getTime() - updatedAt.getTime()) / 1000 / 60 / 60;

    if (hoursDiff > 1) {
      console.log('⏰ [Active Campaigns] Cache expirado, buscando novos dados...');
      return fetchActiveCampaigns(accountId);
    }

    console.log(`✅ [Active Campaigns] Usando cache (${data.ads_data?.length || 0} anúncios)`);
    return data.ads_data as ActiveCampaignAd[];

  } catch (error) {
    console.error('❌ Erro ao buscar cache:', error);
    return [];
  }
}

// =====================================================
// CALCULAR SIMILARIDADE ENTRE TEXTOS (Jaccard)
// =====================================================

function calculateSimilarity(text1: string, text2: string): number {
  // Normalizar textos
  const normalize = (text: string) => 
    text.toLowerCase()
      .replace(/[^\w\s]/g, '') // Remover pontuação
      .replace(/\s+/g, ' ')
      .trim();

  const t1 = normalize(text1);
  const t2 = normalize(text2);
  
  if (!t1 || !t2) return 0;

  // Calcular similaridade (Jaccard)
  const words1 = new Set(t1.split(' ').filter(w => w.length > 2));
  const words2 = new Set(t2.split(' ').filter(w => w.length > 2));

  if (words1.size === 0 || words2.size === 0) return 0;

  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  const similarity = intersection.size / union.size;

  return Math.round(similarity * 100);
}

// =====================================================
// VERIFICAR SE COPY É SIMILAR (> 60%)
// =====================================================

export function checkCopyDuplication(
  newCopy: string,
  activeCampaigns: ActiveCampaignAd[]
): DuplicationCheckResult {
  let maxSimilarity = 0;
  let matchedAd: ActiveCampaignAd | undefined;

  for (const ad of activeCampaigns) {
    // Verificar primary text
    const similarity = calculateSimilarity(newCopy, ad.primary_text);

    if (similarity > maxSimilarity) {
      maxSimilarity = similarity;
      matchedAd = ad;
    }
    
    // Verificar também headline
    const headlineSimilarity = calculateSimilarity(newCopy, ad.headline);
    if (headlineSimilarity > maxSimilarity) {
      maxSimilarity = headlineSimilarity;
      matchedAd = ad;
    }
  }

  const isDuplicate = maxSimilarity > 60; // Threshold: 60% de similaridade

  if (isDuplicate) {
    console.log(`⚠️ [Duplication Check] Copy similar (${maxSimilarity}%) ao anúncio ${matchedAd?.id}`);
  } else {
    console.log(`✅ [Duplication Check] Copy única (${maxSimilarity}% similaridade máxima)`);
  }

  return {
    isDuplicate,
    similarity: maxSimilarity,
    matchedAd,
    warning: isDuplicate 
      ? `⚠️ Copy similar (${maxSimilarity}%) ao anúncio "${matchedAd?.name?.substring(0, 30)}..."` 
      : null
  };
}

// =====================================================
// EXTRAIR ÂNGULOS ÚNICOS DAS CAMPANHAS ATIVAS
// =====================================================

export function extractActiveAngles(activeCampaigns: ActiveCampaignAd[]): string[] {
  const angles: string[] = [];
  
  for (const ad of activeCampaigns.slice(0, 10)) {
    if (ad.primary_text) {
      // Extrair primeira linha (geralmente o gancho)
      const firstLine = ad.primary_text.split('\n')[0];
      if (firstLine && firstLine.length > 10) {
        angles.push(firstLine.substring(0, 80));
      }
    }
  }
  
  return angles;
}

// =====================================================
// GERAR CONTEXTO ANTI-DUPLICATA PARA O PROMPT
// =====================================================

export function generateAntiDuplicationContext(activeCampaigns: ActiveCampaignAd[]): string {
  if (activeCampaigns.length === 0) {
    return '';
  }
  
  const existingCopiesText = activeCampaigns
    .slice(0, 10) // Limitar a 10 exemplos
    .map((ad, i) => `${i + 1}. "${ad.primary_text.substring(0, 150)}..."`)
    .join('\n');
    
  return `
---

## ⚠️ IMPORTANTE: EVITAR DUPLICATAS

**COPIES DE ANÚNCIOS ATIVOS (NÃO REPETIR ESSES ÂNGULOS):**
${existingCopiesText}

**REGRA OBRIGATÓRIA:**
- As novas copies DEVEM ser DIFERENTES das listadas acima
- Use ângulos diferentes, ganchos diferentes, estruturas diferentes
- Se uma copy ativa fala de "economia de tempo", explore "qualidade de vida"
- Se uma copy ativa usa números, experimente histórias ou metáforas
`;
}
