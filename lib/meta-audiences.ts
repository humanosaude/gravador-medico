/**
 * Meta Audiences API - Fábrica de Públicos
 * 
 * Gerencia Custom Audiences e Lookalikes para estratégias de funil
 * TOPO: Broad/Interesses (sem custom audience)
 * MEIO: Envolvimento (Video View, Instagram, Page)
 * FUNDO: Site (Pixel events: PageView, AddToCart, Purchase)
 */

import { createClient } from '@supabase/supabase-js';

// Supabase para cache de audiences e configurações
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// =====================================================
// CONFIG: Buscar credenciais do banco ou env
// =====================================================

interface MetaConfig {
  accessToken: string;
  adAccountId: string;
  pixelId?: string;
  pageId?: string;
  instagramId?: string;
}

let cachedConfig: MetaConfig | null = null;
let configCacheTime: number = 0;
const CONFIG_CACHE_TTL = 60000; // 1 minuto

async function getMetaConfig(): Promise<MetaConfig | null> {
  // Verifica cache
  if (cachedConfig && Date.now() - configCacheTime < CONFIG_CACHE_TTL) {
    return cachedConfig;
  }

  // Access token SEMPRE vem das variáveis de ambiente (segurança)
  const accessToken = process.env.META_ACCESS_TOKEN || process.env.FACEBOOK_ACCESS_TOKEN;
  
  if (!accessToken) {
    console.error('❌ Access token Meta não configurado nas variáveis de ambiente');
    return null;
  }

  try {
    // 1. Tentar buscar account_id do banco de dados (integration_settings)
    const { data: settings } = await supabaseAdmin
      .from('integration_settings')
      .select('meta_ad_account_id, meta_pixel_id, meta_page_id, meta_instagram_id')
      .single();

    if (settings?.meta_ad_account_id) {
      cachedConfig = {
        accessToken: accessToken,
        adAccountId: settings.meta_ad_account_id,
        pixelId: settings.meta_pixel_id || process.env.META_PIXEL_ID,
        pageId: settings.meta_page_id || process.env.META_PAGE_ID,
        instagramId: settings.meta_instagram_id || process.env.META_INSTAGRAM_ID,
      };
      configCacheTime = Date.now();
      return cachedConfig;
    }
  } catch (error) {
    console.error('⚠️ Erro ao buscar config do banco:', error);
  }

  // 2. Fallback para variáveis de ambiente
  const envAccountId = process.env.META_AD_ACCOUNT_ID || process.env.FACEBOOK_AD_ACCOUNT_ID;

  if (envAccountId) {
    cachedConfig = {
      accessToken: accessToken,
      adAccountId: envAccountId,
      pixelId: process.env.META_PIXEL_ID,
      pageId: process.env.META_PAGE_ID,
      instagramId: process.env.META_INSTAGRAM_ID,
    };
    configCacheTime = Date.now();
    return cachedConfig;
  }

  return null;
}

const API_VERSION = 'v21.0';
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

// ============================================
// TIPOS
// ============================================

export type FunnelStage = 'TOPO' | 'MEIO' | 'FUNDO';

export interface AudienceConfig {
  id: string;
  name: string;
  type: 'CUSTOM' | 'LOOKALIKE' | 'SAVED';
  approximateSize?: number;
}

export interface FunnelAudienceResult {
  includeAudiences: string[];
  excludeAudiences: string[];
  targeting?: Record<string, unknown>;
}

export interface VideoViewAudienceConfig {
  videoId: string;
  videoName?: string;
  retentionSeconds: number; // 3, 10, 15, 30, 60, 95 (95% = quase tudo)
  retentionDays?: number; // Padrão 365
}

export interface LookalikeConfig {
  sourceAudienceId: string;
  country: string; // 'BR', 'US', etc
  ratio: number; // 0.01 = 1%, 0.03 = 3%, 0.05 = 5%
  name?: string;
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

async function metaApiCall<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'DELETE' = 'GET',
  body?: Record<string, unknown>
): Promise<T> {
  const config = await getMetaConfig();
  if (!config) {
    throw new Error('Meta credentials not configured');
  }

  const url = `${BASE_URL}${endpoint}`;
  
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (method === 'GET') {
    const params = new URLSearchParams({ access_token: config.accessToken });
    if (body) {
      Object.entries(body).forEach(([key, value]) => {
        params.append(key, typeof value === 'string' ? value : JSON.stringify(value));
      });
    }
    const response = await fetch(`${url}?${params.toString()}`, options);
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data;
  }

  if (method === 'POST') {
    const formData = new URLSearchParams();
    formData.append('access_token', config.accessToken);
    if (body) {
      Object.entries(body).forEach(([key, value]) => {
        formData.append(key, typeof value === 'string' ? value : JSON.stringify(value));
      });
    }
    options.body = formData.toString();
    options.headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
  }

  const response = await fetch(url, options);
  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return data;
}

/**
 * Verifica se um público existe e está ativo na Meta
 * Retorna null se não existir ou estiver inválido
 * 
 * @param audienceId - ID do público na Meta
 * @returns Informações do público ou null
 */
export async function validateAudience(
  audienceId: string
): Promise<{ id: string; name: string; isValid: boolean } | null> {
  try {
    const response = await metaApiCall<{ 
      id: string; 
      name: string; 
      operation_status?: { code: number; description: string };
      approximate_count_lower_bound?: number;
    }>(
      `/${audienceId}`,
      'GET',
      { fields: 'id,name,operation_status,approximate_count_lower_bound' }
    );

    // Verificar se o público está funcional
    const isValid = !response.operation_status || response.operation_status.code === 200;
    
    return {
      id: response.id,
      name: response.name,
      isValid
    };
  } catch (error) {
    console.warn(`⚠️ Público ${audienceId} não encontrado ou inválido:`, error);
    return null;
  }
}

/**
 * Busca um público de forma segura - não falha se não existir
 * Ideal para uso em produção onde públicos podem ser deletados
 * 
 * @param audienceId - ID do público
 * @returns ID do público se existir e for válido, undefined caso contrário
 */
export async function safeGetAudience(
  audienceId: string | null | undefined
): Promise<string | undefined> {
  if (!audienceId) return undefined;
  
  const validation = await validateAudience(audienceId);
  return validation?.isValid ? validation.id : undefined;
}

/**
 * Filtra lista de públicos, removendo os inválidos
 * Usa cache local para evitar chamadas repetidas à API
 * 
 * @param audienceIds - Lista de IDs de públicos
 * @returns Lista apenas com IDs válidos
 */
const audienceValidationCache = new Map<string, { valid: boolean; checkedAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

export async function filterValidAudiences(
  audienceIds: string[]
): Promise<string[]> {
  const now = Date.now();
  const validIds: string[] = [];

  for (const id of audienceIds) {
    // Verificar cache primeiro
    const cached = audienceValidationCache.get(id);
    if (cached && (now - cached.checkedAt) < CACHE_TTL) {
      if (cached.valid) validIds.push(id);
      continue;
    }

    // Validar e cachear
    const validation = await validateAudience(id);
    const isValid = validation?.isValid ?? false;
    
    audienceValidationCache.set(id, { valid: isValid, checkedAt: now });
    
    if (isValid) {
      validIds.push(id);
    } else {
      console.log(`⚠️ Público ${id} removido da lista (inválido ou deletado)`);
    }
  }

  return validIds;
}

// ============================================
// FUNÇÕES PRINCIPAIS
// ============================================

/**
 * Cria um Custom Audience de pessoas que viram um vídeo
 * 
 * @param config - Configuração do público
 * @returns ID do público criado
 * 
 * Retention options:
 * - video_watched_3_seconds
 * - video_watched_10_seconds  
 * - video_watched_15_seconds
 * - video_watched_30_seconds
 * - video_watched_60_seconds
 * - video_watched_95_percent
 */
export async function createVideoViewAudience(
  config: VideoViewAudienceConfig
): Promise<{ audienceId: string; name: string }> {
  const metaConfig = await getMetaConfig();
  if (!metaConfig) {
    throw new Error('Meta credentials not configured');
  }

  const { videoId, videoName, retentionSeconds, retentionDays = 365 } = config;

  // Mapear segundos para o campo da API
  let retentionField: string;
  if (retentionSeconds <= 3) retentionField = 'video_watched_3_seconds';
  else if (retentionSeconds <= 10) retentionField = 'video_watched_10_seconds';
  else if (retentionSeconds <= 15) retentionField = 'video_watched_15_seconds';
  else if (retentionSeconds <= 30) retentionField = 'video_watched_30_seconds';
  else if (retentionSeconds <= 60) retentionField = 'video_watched_60_seconds';
  else retentionField = 'video_watched_95_percent';

  const audienceName = videoName 
    ? `VideoView ${retentionSeconds}s - ${videoName}` 
    : `VideoView ${retentionSeconds}s - ${videoId}`;

  const rule = {
    inclusions: {
      operator: 'or',
      rules: [
        {
          event_sources: [
            {
              id: metaConfig.pageId,
              type: 'page'
            }
          ],
          retention_seconds: retentionDays * 24 * 60 * 60,
          filter: {
            operator: 'and',
            filters: [
              {
                field: 'event',
                operator: 'eq',
                value: retentionField
              },
              {
                field: 'video_id',
                operator: 'eq',
                value: videoId
              }
            ]
          }
        }
      ]
    }
  };

  const response = await metaApiCall<{ id: string }>(
    `/act_${metaConfig.adAccountId}/customaudiences`,
    'POST',
    {
      name: audienceName,
      subtype: 'ENGAGEMENT',
      description: `Pessoas que viram ${retentionSeconds}s do vídeo`,
      rule: JSON.stringify(rule),
      prefill: true
    }
  );

  // Salvar no banco
  await supabaseAdmin.from('ads_audiences').upsert({
    meta_audience_id: response.id,
    name: audienceName,
    audience_type: 'CUSTOM',
    source_type: 'VIDEO_VIEW',
    funnel_stage: 'MEIO',
    retention_days: retentionDays,
    is_active: true
  }, { onConflict: 'meta_audience_id' });

  console.log(`✅ Público de VideoView criado: ${response.id}`);
  return { audienceId: response.id, name: audienceName };
}

/**
 * Cria um público Lookalike baseado em outro público
 * 
 * @param config - Configuração do lookalike
 * @returns ID do público criado
 */
export async function createLookalike(
  config: LookalikeConfig
): Promise<{ audienceId: string; name: string }> {
  const metaConfig = await getMetaConfig();
  if (!metaConfig) {
    throw new Error('Meta credentials not configured');
  }

  const { sourceAudienceId, country, ratio, name } = config;

  const percentLabel = Math.round(ratio * 100);
  const audienceName = name || `LAL ${percentLabel}% - ${sourceAudienceId}`;

  const spec = {
    origin: [{ id: sourceAudienceId, type: 'custom_audience' }],
    location_spec: {
      geo_locations: {
        countries: [country]
      }
    },
    ratio: ratio
  };

  const response = await metaApiCall<{ id: string }>(
    `/act_${metaConfig.adAccountId}/customaudiences`,
    'POST',
    {
      name: audienceName,
      subtype: 'LOOKALIKE',
      lookalike_spec: JSON.stringify(spec)
    }
  );

  // Salvar no banco
  await supabaseAdmin.from('ads_audiences').upsert({
    meta_audience_id: response.id,
    name: audienceName,
    audience_type: 'LOOKALIKE',
    funnel_stage: 'TOPO',
    lookalike_ratio: ratio,
    is_active: true
  }, { onConflict: 'meta_audience_id' });

  console.log(`✅ Lookalike criado: ${response.id} (${percentLabel}%)`);
  return { audienceId: response.id, name: audienceName };
}

/**
 * Cria um público de envolvimento com a página do Instagram
 */
export async function createInstagramEngagementAudience(
  retentionDays: number = 365
): Promise<{ audienceId: string; name: string }> {
  const metaConfig = await getMetaConfig();
  if (!metaConfig?.instagramId) {
    throw new Error('META_INSTAGRAM_ID não configurado');
  }

  const audienceName = `Instagram Engagement ${retentionDays}D`;

  const rule = {
    inclusions: {
      operator: 'or',
      rules: [
        {
          event_sources: [{ id: metaConfig.instagramId, type: 'ig_business' }],
          retention_seconds: retentionDays * 24 * 60 * 60,
          filter: {
            operator: 'or',
            filters: [
              { field: 'event', operator: 'eq', value: 'ig_profile_visit' },
              { field: 'event', operator: 'eq', value: 'ig_cta_clicked' },
              { field: 'event', operator: 'eq', value: 'ig_comment' },
              { field: 'event', operator: 'eq', value: 'ig_like' },
              { field: 'event', operator: 'eq', value: 'ig_save' },
              { field: 'event', operator: 'eq', value: 'ig_share' }
            ]
          }
        }
      ]
    }
  };

  const response = await metaApiCall<{ id: string }>(
    `/act_${metaConfig.adAccountId}/customaudiences`,
    'POST',
    {
      name: audienceName,
      subtype: 'ENGAGEMENT',
      description: 'Pessoas que interagiram com o perfil do Instagram',
      rule: JSON.stringify(rule),
      prefill: true
    }
  );

  await supabaseAdmin.from('ads_audiences').upsert({
    meta_audience_id: response.id,
    name: audienceName,
    audience_type: 'CUSTOM',
    source_type: 'INSTAGRAM',
    funnel_stage: 'MEIO',
    retention_days: retentionDays,
    is_active: true
  }, { onConflict: 'meta_audience_id' });

  return { audienceId: response.id, name: audienceName };
}

/**
 * Cria um público baseado em eventos do Pixel (Website)
 */
export async function createPixelAudience(
  eventName: 'PageView' | 'ViewContent' | 'AddToCart' | 'InitiateCheckout' | 'Purchase',
  retentionDays: number = 30
): Promise<{ audienceId: string; name: string }> {
  const metaConfig = await getMetaConfig();
  if (!metaConfig?.pixelId) {
    throw new Error('META_PIXEL_ID não configurado');
  }

  const audienceName = `Pixel ${eventName} ${retentionDays}D`;

  const rule = {
    inclusions: {
      operator: 'or',
      rules: [
        {
          event_sources: [{ id: metaConfig.pixelId, type: 'pixel' }],
          retention_seconds: retentionDays * 24 * 60 * 60,
          filter: {
            operator: 'and',
            filters: [
              { field: 'event', operator: 'eq', value: eventName }
            ]
          }
        }
      ]
    }
  };

  const response = await metaApiCall<{ id: string }>(
    `/act_${metaConfig.adAccountId}/customaudiences`,
    'POST',
    {
      name: audienceName,
      subtype: 'WEBSITE',
      description: `Pessoas que dispararam evento ${eventName} nos últimos ${retentionDays} dias`,
      rule: JSON.stringify(rule),
      prefill: true
    }
  );

  // Determinar estágio do funil baseado no evento
  let funnelStage: FunnelStage = 'MEIO';
  if (['AddToCart', 'InitiateCheckout', 'Purchase'].includes(eventName)) {
    funnelStage = 'FUNDO';
  }

  await supabaseAdmin.from('ads_audiences').upsert({
    meta_audience_id: response.id,
    name: audienceName,
    audience_type: 'CUSTOM',
    source_type: 'WEBSITE',
    funnel_stage: funnelStage,
    retention_days: retentionDays,
    is_active: true
  }, { onConflict: 'meta_audience_id' });

  return { audienceId: response.id, name: audienceName };
}

/**
 * Retorna públicos baseados no estágio do funil
 * 
 * TOPO: Retorna null - usar broad/interesses
 * MEIO: Retorna públicos de Envolvimento (VideoView + Instagram)
 * FUNDO: Retorna públicos de Site (PageView 30D, AddToCart)
 * 
 * IMPORTANTE: Valida públicos antes de retornar para evitar erros de públicos deletados
 */
export async function getFunnelAudience(
  stage: FunnelStage,
  options: { validateAudiences?: boolean } = {}
): Promise<FunnelAudienceResult> {
  const { validateAudiences: shouldValidate = true } = options;

  // Buscar públicos do banco de dados
  const { data: audiences } = await supabaseAdmin
    .from('ads_audiences')
    .select('*')
    .eq('funnel_stage', stage)
    .eq('is_active', true);

  // Buscar público de compradores para exclusão
  const { data: purchasers } = await supabaseAdmin
    .from('ads_audiences')
    .select('meta_audience_id')
    .eq('source_type', 'WEBSITE')
    .ilike('name', '%Purchase%')
    .eq('is_active', true)
    .limit(1);

  // Validar público de compradores (se existir)
  let purchaserAudienceId: string | undefined;
  if (purchasers?.[0]?.meta_audience_id) {
    purchaserAudienceId = shouldValidate 
      ? await safeGetAudience(purchasers[0].meta_audience_id)
      : purchasers[0].meta_audience_id;
  }

  switch (stage) {
    case 'TOPO':
      // Broad targeting - sem custom audiences
      // NOTA: Exclusões são opcionais e não bloqueiam se falharem
      return {
        includeAudiences: [],
        excludeAudiences: purchaserAudienceId ? [purchaserAudienceId] : [],
        targeting: {
          // Interesses amplos podem ser adicionados aqui
          geo_locations: { countries: ['BR'] },
          age_min: 25,
          age_max: 65,
          publisher_platforms: ['facebook', 'instagram'],
          // ✅ CORRIGIDO: 'reels' só funciona em instagram_positions
          facebook_positions: ['feed', 'story'],
          instagram_positions: ['stream', 'story', 'reels']
        }
      };

    case 'MEIO':
      // Envolvimento: VideoView + Instagram
      let meioAudiences = audiences?.map(a => a.meta_audience_id) || [];
      
      // Validar públicos para remover os que foram deletados
      if (shouldValidate && meioAudiences.length > 0) {
        meioAudiences = await filterValidAudiences(meioAudiences);
      }
      
      // Se não houver públicos salvos, criar automaticamente
      if (meioAudiences.length === 0) {
        console.log('⚠️ Nenhum público MEIO encontrado. Considere criar VideoView ou Instagram audiences.');
      }

      return {
        includeAudiences: meioAudiences,
        excludeAudiences: purchaserAudienceId ? [purchaserAudienceId] : [],
        targeting: {
          geo_locations: { countries: ['BR'] },
          publisher_platforms: ['facebook', 'instagram']
        }
      };

    case 'FUNDO':
      // Site: PageView, AddToCart, ViewContent
      let fundoAudiences = audiences?.map(a => a.meta_audience_id) || [];

      // Validar públicos para remover os que foram deletados
      if (shouldValidate && fundoAudiences.length > 0) {
        fundoAudiences = await filterValidAudiences(fundoAudiences);
      }

      // Excluir compradores recentes (últimos 7 dias) - SEM BLOQUEAR SE FALHAR
      // NOTA: Exclusões deprecated não devem impedir a criação de ads
      let excludeIds: string[] = [];
      
      try {
        const { data: recentPurchasers } = await supabaseAdmin
          .from('ads_audiences')
          .select('meta_audience_id')
          .eq('source_type', 'WEBSITE')
          .ilike('name', '%Purchase%7D%')
          .eq('is_active', true)
          .limit(1);

        // Validar exclusões (opcional - não falha se não existir)
        for (const p of recentPurchasers || []) {
          const validId = await safeGetAudience(p.meta_audience_id);
          if (validId) excludeIds.push(validId);
        }
      } catch (e) {
        console.log('⚠️ Não foi possível buscar públicos de exclusão:', e);
        // Continua sem exclusões - não bloqueia a criação
      }

      if (purchaserAudienceId) excludeIds.push(purchaserAudienceId);

      return {
        includeAudiences: fundoAudiences,
        excludeAudiences: [...new Set(excludeIds)],
        targeting: {
          geo_locations: { countries: ['BR'] },
          publisher_platforms: ['facebook', 'instagram']
        }
      };

    default:
      return {
        includeAudiences: [],
        excludeAudiences: []
      };
  }
}

/**
 * Lista todos os Custom Audiences da conta
 */
export async function listAllAudiences(): Promise<AudienceConfig[]> {
  const metaConfig = await getMetaConfig();
  if (!metaConfig) {
    throw new Error('Meta credentials not configured');
  }

  const response = await metaApiCall<{ 
    data: Array<{ 
      id: string; 
      name: string; 
      subtype: string;
      approximate_count_lower_bound?: number;
      approximate_count_upper_bound?: number;
    }> 
  }>(
    `/act_${metaConfig.adAccountId}/customaudiences`,
    'GET',
    { fields: 'id,name,subtype,approximate_count_lower_bound,approximate_count_upper_bound' }
  );

  return response.data.map(a => ({
    id: a.id,
    name: a.name,
    type: a.subtype === 'LOOKALIKE' ? 'LOOKALIKE' : 'CUSTOM',
    approximateSize: a.approximate_count_upper_bound
  }));
}

/**
 * Sincroniza públicos da Meta com o banco de dados local
 */
export async function syncAudiencesToDatabase(): Promise<{ synced: number }> {
  const audiences = await listAllAudiences();
  
  let synced = 0;
  for (const audience of audiences) {
    // Determinar estágio do funil pelo nome
    let funnelStage: FunnelStage | null = null;
    let sourceType: string | null = null;

    if (audience.name.toLowerCase().includes('video')) {
      funnelStage = 'MEIO';
      sourceType = 'VIDEO_VIEW';
    } else if (audience.name.toLowerCase().includes('instagram')) {
      funnelStage = 'MEIO';
      sourceType = 'INSTAGRAM';
    } else if (audience.name.toLowerCase().includes('pixel') || audience.name.toLowerCase().includes('website')) {
      funnelStage = 'FUNDO';
      sourceType = 'WEBSITE';
    } else if (audience.type === 'LOOKALIKE') {
      funnelStage = 'TOPO';
    }

    const { error } = await supabaseAdmin.from('ads_audiences').upsert({
      meta_audience_id: audience.id,
      name: audience.name,
      audience_type: audience.type,
      source_type: sourceType,
      funnel_stage: funnelStage,
      approximate_size: audience.approximateSize,
      is_active: true
    }, { onConflict: 'meta_audience_id' });

    if (!error) synced++;
  }

  console.log(`✅ Sincronizados ${synced} públicos`);
  return { synced };
}

/**
 * Cria os públicos padrão do funil se não existirem
 */
export async function ensureDefaultAudiences(): Promise<void> {
  console.log('🔄 Verificando públicos padrão do funil...');

  // 1. Público de compradores (para exclusão)
  try {
    const { data: existingPurchase } = await supabaseAdmin
      .from('ads_audiences')
      .select('id')
      .ilike('name', '%Purchase%')
      .limit(1);

    if (!existingPurchase?.length) {
      await createPixelAudience('Purchase', 180);
      console.log('✅ Criado público de compradores (180 dias)');
    }
  } catch (e) {
    console.log('⚠️ Não foi possível criar público de Purchase:', e);
  }

  // 2. Público de AddToCart (FUNDO)
  try {
    const { data: existingCart } = await supabaseAdmin
      .from('ads_audiences')
      .select('id')
      .ilike('name', '%AddToCart%')
      .limit(1);

    if (!existingCart?.length) {
      await createPixelAudience('AddToCart', 30);
      console.log('✅ Criado público de AddToCart (30 dias)');
    }
  } catch (e) {
    console.log('⚠️ Não foi possível criar público de AddToCart:', e);
  }

  // 3. Público de PageView (FUNDO)
  try {
    const { data: existingPageView } = await supabaseAdmin
      .from('ads_audiences')
      .select('id')
      .ilike('name', '%PageView%')
      .limit(1);

    if (!existingPageView?.length) {
      await createPixelAudience('PageView', 30);
      console.log('✅ Criado público de PageView (30 dias)');
    }
  } catch (e) {
    console.log('⚠️ Não foi possível criar público de PageView:', e);
  }

  console.log('✅ Verificação de públicos concluída');
}

// ============================================
// EXPORTS
// ============================================

export const MetaAudiences = {
  // Criação de públicos
  createVideoViewAudience,
  createLookalike,
  createInstagramEngagementAudience,
  createPixelAudience,
  
  // Consulta de públicos
  getFunnelAudience,
  listAllAudiences,
  
  // Validação e segurança (NOVO 2025)
  validateAudience,
  safeGetAudience,
  filterValidAudiences,
  
  // Sincronização
  syncAudiencesToDatabase,
  ensureDefaultAudiences
};

export default MetaAudiences;
