// =====================================================
// API: LAUNCH ADS - FÁBRICA DE ANÚNCIOS V2 (VÍDEO + FUNIL)
// =====================================================
// Endpoint que orquestra todo o processo:
// 1. Upload de imagens/vídeos para Supabase
// 2. Geração de copy via OpenAI
// 3. Configuração de público por estágio de funil
// 4. Criação de Campanha, AdSet, Creative e Ad no Facebook
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateCopiesForImages } from '@/lib/ads/copy-generator';
import { analyzeCreativeForCopy, analyzeMultipleCreatives, analyzeMultipleWithProfessionalPrompt } from '@/lib/ads/creative-analyzer';
import { generateCopywritingPrompt, detectFunnelFromObjective, type PromptGeneratorResult } from '@/lib/ads/prompt-generator';
import {
  initializeFacebookApi,
  getMetaConfig,
  uploadImageToMeta,
  createCampaign,
  createAdSet,
  createAdCreative,
  createAd,
  buildTargeting,
  deleteCampaign,
} from '@/lib/ads/meta-client';
import { getFunnelAudience, type FunnelStage } from '@/lib/meta-audiences';
import { generateAdNames, inferFunnelStage, type NamingInput } from '@/lib/utils/ad-naming';
import type { GeneratedCopy } from '@/lib/ads/types';

export const runtime = 'nodejs';
export const maxDuration = 180; // 3 minutos para vídeos

// =====================================================
// TIPOS
// =====================================================

interface VideoUploadSession {
  video_id: string;
  upload_url: string;
  start_offset: string;
  end_offset: string;
}

interface VideoStatus {
  id: string;
  status: {
    video_status: 'ready' | 'processing' | 'error';
  };
}

// =====================================================
// HELPER: Mapear custom_event_type por funil e objetivo
// =====================================================

// ✅ Tipos válidos de custom_event_type na Meta API v24.0
// Lista completa: AD_IMPRESSION, RATE, TUTORIAL_COMPLETION, CONTACT, CUSTOMIZE_PRODUCT, DONATE, 
// FIND_LOCATION, SCHEDULE, START_TRIAL, SUBMIT_APPLICATION, SUBSCRIBE, ADD_TO_CART, ADD_TO_WISHLIST, 
// INITIATED_CHECKOUT, ADD_PAYMENT_INFO, PURCHASE, LEAD, COMPLETE_REGISTRATION, CONTENT_VIEW, SEARCH, 
// SERVICE_BOOKING_REQUEST, MESSAGING_CONVERSATION_STARTED_7D, LEVEL_ACHIEVED, ACHIEVEMENT_UNLOCKED, 
// SPENT_CREDITS, LISTING_INTERACTION, D2_RETENTION, D7_RETENTION, OTHER
type CustomEventType = 'PURCHASE' | 'LEAD' | 'COMPLETE_REGISTRATION' | 'ADD_TO_CART' | 'INITIATED_CHECKOUT' | 'CONTENT_VIEW' | 'SEARCH' | 'ADD_PAYMENT_INFO' | 'ADD_TO_WISHLIST' | 'CONTACT';

function getCustomEventType(funnelStage: string, objectiveType: string): CustomEventType {
  // ✅ Mapeamento Meta API v24.0 por funil
  
  if (objectiveType === 'OUTCOME_SALES') {
    switch (funnelStage) {
      case 'TOPO':
        return 'CONTENT_VIEW'; // ✅ Visualização de conteúdo (CORRETO para Meta API)
      case 'MEIO':
        return 'ADD_TO_CART'; // Adicionar ao carrinho
      case 'FUNDO':
        return 'PURCHASE'; // Compra
      default:
        return 'PURCHASE';
    }
  }
  
  if (objectiveType === 'OUTCOME_LEADS') {
    switch (funnelStage) {
      case 'TOPO':
        return 'CONTENT_VIEW'; // ✅ CONTENT_VIEW ao invés de PAGE_VIEW
      case 'MEIO':
        return 'LEAD'; // Lead gerado
      case 'FUNDO':
        return 'COMPLETE_REGISTRATION'; // Registro completo
      default:
        return 'LEAD';
    }
  }
  
  // Default para OUTCOME_TRAFFIC ou outros
  return 'CONTENT_VIEW'; // ✅ CONTENT_VIEW ao invés de VIEW_CONTENT
}

// =====================================================
// CONSTANTES
// =====================================================

const META_API_VERSION = 'v21.0';
const META_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;
const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];
const MAX_VIDEO_WAIT_TIME = 60000; // 60 segundos max
const VIDEO_CHECK_INTERVAL = 3000; // Verificar a cada 3 segundos

// =====================================================
// TIPOS
// =====================================================

interface MetaSettings {
  adAccountId: string;
  pageId: string;
  pixelId?: string;
  instagramId?: string;
  accessToken: string;
}

// =====================================================
// HELPER: Buscar configurações do banco
// =====================================================

async function getMetaSettingsFromDB(): Promise<MetaSettings | null> {
  try {
    // Buscar configuração global (sistema single-tenant)
    const { data, error } = await supabaseAdmin
      .from('integration_settings')
      .select('*')
      .eq('is_default', true)
      .eq('setting_key', 'meta_default')
      .limit(1)
      .single();

    if (error || !data) {
      console.log('⚠️ Nenhuma configuração encontrada no banco, usando env...');
      return null;
    }

    // Verificar campos obrigatórios
    if (!data.meta_ad_account_id) {
      console.log('⚠️ Configuração incompleta no banco (sem ad_account_id)');
      return null;
    }

    console.log('✅ Configuração Meta carregada do banco:', {
      adAccountId: data.meta_ad_account_id,
      pageId: data.meta_page_id,
      pixelId: data.meta_pixel_id
    });

    // Normalizar Ad Account ID (remover prefixo 'act_' se existir)
    const rawAdAccountId = data.meta_ad_account_id;
    const normalizedAdAccountId = rawAdAccountId.startsWith('act_') 
      ? rawAdAccountId.replace('act_', '') 
      : rawAdAccountId;

    return {
      adAccountId: normalizedAdAccountId,
      pageId: data.meta_page_id || process.env.META_PAGE_ID || '',
      pixelId: data.meta_pixel_id || process.env.META_PIXEL_ID,
      instagramId: data.meta_instagram_id || data.instagram_actor_id || process.env.META_INSTAGRAM_ID,
      accessToken: process.env.META_ACCESS_TOKEN || process.env.FACEBOOK_ACCESS_TOKEN || ''
    };
  } catch (err) {
    console.error('Erro ao buscar configurações do banco:', err);
    return null;
  }
}

// =====================================================
// HELPERS: Utilidades
// =====================================================

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isVideoFile(file: File | undefined | null): boolean {
  // ✅ Validar se file existe e tem propriedades necessárias
  if (!file) {
    console.warn('⚠️ isVideoFile: file é undefined/null');
    return false;
  }
  
  if (!file.name) {
    console.warn('⚠️ isVideoFile: file.name é undefined');
    return false;
  }
  
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  const isVideo = VIDEO_EXTENSIONS.includes(extension) || (file.type?.startsWith('video/') ?? false);
  
  return isVideo;
}

// =====================================================
// HELPER: Upload para Supabase Storage
// =====================================================

async function uploadToSupabase(
  file: File,
  index: number,
  type: 'image' | 'video'
): Promise<string> {
  const timestamp = Date.now();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const folder = type === 'video' ? 'videos' : 'images';
  const fileName = `ads/${folder}/${timestamp}_${index}_${sanitizedName}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error } = await supabaseAdmin.storage
    .from('creatives')
    .upload(fileName, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (error) {
    console.error(`❌ Erro no upload de ${type} para Supabase:`, error);
    throw new Error(`Falha no upload: ${error.message}`);
  }

  const { data: urlData } = supabaseAdmin.storage
    .from('creatives')
    .getPublicUrl(fileName);

  console.log(`✅ ${type} enviado para Supabase:`, urlData.publicUrl);
  return urlData.publicUrl;
}

// =====================================================
// HELPER: Upload de Vídeo para Meta (Chunked)
// =====================================================

async function startVideoUploadSession(
  adAccountId: string,
  fileSize: number,
  accessToken: string
): Promise<VideoUploadSession> {
  const url = `${META_BASE_URL}/act_${adAccountId}/advideos`;
  
  const params = new URLSearchParams({
    access_token: accessToken,
    upload_phase: 'start',
    file_size: fileSize.toString(),
  });

  const response = await fetch(`${url}?${params.toString()}`, { method: 'POST' });
  const data = await response.json();
  
  if (data.error) {
    throw new Error(`Erro ao iniciar upload de vídeo: ${data.error.message}`);
  }
  return data;
}

async function uploadVideoChunk(
  adAccountId: string,
  session: VideoUploadSession,
  chunk: Buffer,
  startOffset: string,
  accessToken: string
): Promise<{ start_offset: string; end_offset: string }> {
  const url = `${META_BASE_URL}/act_${adAccountId}/advideos`;

  const formData = new FormData();
  formData.append('access_token', accessToken);
  formData.append('upload_phase', 'transfer');
  formData.append('upload_session_id', session.video_id);
  formData.append('start_offset', startOffset);
  formData.append('video_file_chunk', new Blob([new Uint8Array(chunk)]));

  const response = await fetch(url, { method: 'POST', body: formData });
  const data = await response.json();
  
  if (data.error) {
    throw new Error(`Erro ao enviar chunk de vídeo: ${data.error.message}`);
  }
  return data;
}

async function finishVideoUpload(
  adAccountId: string,
  sessionId: string,
  title: string,
  accessToken: string
): Promise<string> {
  const url = `${META_BASE_URL}/act_${adAccountId}/advideos`;

  const params = new URLSearchParams({
    access_token: accessToken,
    upload_phase: 'finish',
    upload_session_id: sessionId,
    title: title,
  });

  const response = await fetch(`${url}?${params.toString()}`, { method: 'POST' });
  const data = await response.json();
  
  if (data.error) {
    throw new Error(`Erro ao finalizar upload de vídeo: ${data.error.message}`);
  }

  console.log('✅ Upload de vídeo concluído, ID:', data.video_id);
  return data.video_id;
}

async function uploadVideoToMeta(
  file: File,
  adAccountId: string,
  accessToken: string
): Promise<string> {
  console.log(`📹 Iniciando upload de vídeo: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const fileSize = buffer.length;

  // 1. Iniciar sessão de upload
  const session = await startVideoUploadSession(adAccountId, fileSize, accessToken);
  console.log('📹 Sessão de upload iniciada:', session.video_id);

  // 2. Upload em chunks de 4MB
  const CHUNK_SIZE = 4 * 1024 * 1024;
  let startOffset = parseInt(session.start_offset);

  while (startOffset < fileSize) {
    const chunkEnd = Math.min(startOffset + CHUNK_SIZE, fileSize);
    const chunk = buffer.slice(startOffset, chunkEnd);

    console.log(`📹 Enviando chunk: ${startOffset} - ${chunkEnd} (${((chunkEnd / fileSize) * 100).toFixed(0)}%)`);

    const result = await uploadVideoChunk(adAccountId, session, chunk, startOffset.toString(), accessToken);
    startOffset = parseInt(result.start_offset);
    await sleep(100);
  }

  // 3. Finalizar upload
  return await finishVideoUpload(adAccountId, session.video_id, file.name, accessToken);
}

// =====================================================
// HELPER: Aguardar vídeo ficar pronto
// =====================================================

async function waitForVideoReady(
  videoId: string,
  accessToken: string,
  maxWaitMs: number = MAX_VIDEO_WAIT_TIME
): Promise<boolean> {
  console.log(`⏳ Aguardando vídeo ${videoId} ficar pronto...`);

  const startTime = Date.now();
  let attempts = 0;

  while (Date.now() - startTime < maxWaitMs) {
    attempts++;

    try {
      const url = `${META_BASE_URL}/${videoId}?fields=status&access_token=${accessToken}`;
      const response = await fetch(url);
      const data: VideoStatus = await response.json();

      if (data.status?.video_status === 'ready') {
        console.log(`✅ Vídeo pronto após ${attempts} verificações`);
        return true;
      }

      if (data.status?.video_status === 'error') {
        console.error('❌ Erro no processamento do vídeo');
        return false;
      }

      console.log(`⏳ Vídeo ainda processando... (tentativa ${attempts})`);
    } catch (error) {
      console.error('⚠️ Erro ao verificar status do vídeo:', error);
    }

    await sleep(VIDEO_CHECK_INTERVAL);
  }

  console.warn(`⚠️ Timeout aguardando vídeo. Continuando...`);
  return true;
}

// =====================================================
// HELPER: Criar AdCreative com Vídeo
// =====================================================

async function createVideoAdCreative(
  adAccountId: string,
  config: {
    name: string;
    pageId: string;
    videoId: string;
    primaryText: string;
    headline: string;
    linkUrl: string;
    ctaType?: string;
  },
  accessToken: string
): Promise<string> {
  const url = `${META_BASE_URL}/act_${adAccountId}/adcreatives`;

  const objectStorySpec = {
    page_id: config.pageId,
    video_data: {
      video_id: config.videoId,
      message: config.primaryText,
      title: config.headline,
      call_to_action: {
        type: config.ctaType || 'LEARN_MORE',
        value: { link: config.linkUrl },
      },
    },
  };

  const params = new URLSearchParams({
    access_token: accessToken,
    name: config.name,
    object_story_spec: JSON.stringify(objectStorySpec),
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(`Erro ao criar ad creative de vídeo: ${data.error.message}`);
  }

  console.log('✅ Video AdCreative criado:', data.id);
  return data.id;
}

// =====================================================
// HELPER: Configurar targeting por estágio de funil
// =====================================================

async function buildFunnelTargeting(
  stage: FunnelStage,
  baseTargeting: unknown
): Promise<Record<string, unknown>> {
  const funnelConfig = await getFunnelAudience(stage);
  
  const targeting: Record<string, unknown> = {
    ...(baseTargeting as Record<string, unknown>),
    ...(funnelConfig.targeting as Record<string, unknown>),
  };

  if (funnelConfig.includeAudiences.length > 0) {
    targeting.custom_audiences = funnelConfig.includeAudiences.map(id => ({ id }));
  }

  if (funnelConfig.excludeAudiences.length > 0) {
    targeting.excluded_custom_audiences = funnelConfig.excludeAudiences.map(id => ({ id }));
  }

  console.log(`📊 Targeting configurado para ${stage}:`, {
    include: funnelConfig.includeAudiences.length,
    exclude: funnelConfig.excludeAudiences.length,
  });

  return targeting;
}

// =====================================================
// HELPER: Log de campanha no banco
// =====================================================

async function logCampaignCreation(data: {
  meta_campaign_id: string;
  meta_adset_id: string;
  name: string;
  strategy: FunnelStage;
  objective: string;
  budget_daily: number;
  status: string;
  custom_audiences?: string[];
  excluded_audiences?: string[];
  targeting?: Record<string, unknown>;
}) {
  try {
    await supabaseAdmin.from('ads_campaigns').insert(data);
  } catch (error) {
    console.error('⚠️ Erro ao salvar log de campanha:', error);
  }
}

async function logCreativeCreation(data: {
  campaign_id: string;
  meta_ad_id: string;
  meta_creative_id: string;
  meta_video_id?: string;
  creative_type: 'IMAGE' | 'VIDEO';
  file_url: string;
  file_name?: string;
  primary_text: string;
  headline: string;
}) {
  try {
    const { data: campaign } = await supabaseAdmin
      .from('ads_campaigns')
      .select('id')
      .eq('meta_campaign_id', data.campaign_id)
      .single();

    if (campaign) {
      await supabaseAdmin.from('ads_creatives').insert({
        ...data,
        campaign_id: campaign.id,
      });
    }
  } catch (error) {
    console.error('⚠️ Erro ao salvar log de creative:', error);
  }
}

// =====================================================
// POST: Criar campanha completa (Vídeo + Funil)
// =====================================================

export async function POST(request: NextRequest) {
  console.log('🚀 Iniciando criação de campanha de anúncios (V2)...');

  try {
    // 1. Tentar buscar configuração do banco de dados primeiro
    const dbSettings = await getMetaSettingsFromDB();
    
    // 2. Fallback para variáveis de ambiente se não houver config no banco
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
        error: 'Configuração Meta incompleta. Por favor, configure seus ativos Meta em /admin/ai/settings antes de criar campanhas.',
        code: 'META_NOT_CONFIGURED'
      }, { status: 400 });
    }

    if (!metaConfig.pageId) {
      return NextResponse.json({
        success: false,
        error: 'Página do Facebook não configurada. Por favor, selecione uma página em /admin/ai/settings.',
        code: 'PAGE_NOT_CONFIGURED'
      }, { status: 400 });
    }

    initializeFacebookApi(metaConfig.accessToken);

    // 3. Parse do FormData
    const formData = await request.formData();
    const objective = formData.get('objective') as string;
    const dailyBudgetStr = formData.get('dailyBudget') as string;
    const targetAudience = formData.get('targetAudience') as string || 'Médicos';
    const funnelStage = (formData.get('funnel_stage') as FunnelStage) || 'TOPO';
    const statusRaw = formData.get('status') as string || 'PAUSED';
    const status = statusRaw === 'ACTIVE' ? 'ACTIVE' : 'PAUSED';
    const linkUrl = formData.get('linkUrl') as string || process.env.NEXT_PUBLIC_SITE_URL || 'https://gravador-medico.com.br';
    const manualCopy = formData.get('copy') as string | null;

    // Novos parâmetros de Targeting (2025)
    const useAdvantagePlus = formData.get('use_advantage_plus') === 'true';
    const audienceStrategy = formData.get('audience_strategy') as string || 'COLD_WINNER';
    const ageMin = parseInt(formData.get('age_min') as string) || 25;
    const ageMax = parseInt(formData.get('age_max') as string) || 55;
    const gender = formData.get('gender') as 'ALL' | 'MALE' | 'FEMALE' || 'ALL';
    const location = formData.get('location') as string || 'BR';

    console.log('🎯 Targeting:', { useAdvantagePlus, audienceStrategy, ageMin, ageMax, gender, location });

    // ✅ Verificar se já tem creative_url (já foi feito upload antes)
    const creativeUrl = formData.get('creative_url') as string | null;
    console.log('🎨 Creative URL recebida:', creativeUrl ? creativeUrl.substring(0, 80) + '...' : 'Nenhuma');

    // Obter arquivos (imagens e vídeos)
    const mediaFiles: File[] = [];
    
    // ✅ LOGS DE DEBUG DETALHADOS
    console.log('📦 [Launch V2] FormData keys:', Array.from(formData.keys()));
    
    formData.forEach((value, key) => {
      if ((key.startsWith('image') || key.startsWith('file') || key.startsWith('video')) && value instanceof File) {
        console.log(`📁 [Launch V2] ${key}:`, {
          name: value.name,
          size: `${(value.size / 1024 / 1024).toFixed(2)} MB`,
          type: value.type
        });
        mediaFiles.push(value);
      }
    });

    // Validações
    if (!objective) {
      return NextResponse.json({ success: false, error: 'Objetivo da campanha é obrigatório' }, { status: 400 });
    }

    // ✅ Só exigir arquivos se NÃO tiver creative_url
    if (mediaFiles.length === 0 && !creativeUrl) {
      return NextResponse.json({ success: false, error: 'Pelo menos um arquivo ou creative_url é obrigatório' }, { status: 400 });
    }

    const dailyBudget = parseFloat(dailyBudgetStr);
    if (isNaN(dailyBudget) || dailyBudget < 6) {
      return NextResponse.json({ success: false, error: 'Orçamento diário mínimo é R$ 6,00' }, { status: 400 });
    }

    // Separar imagens e vídeos
    const imageFiles = mediaFiles.filter(f => !isVideoFile(f));
    const videoFiles = mediaFiles.filter(f => isVideoFile(f));

    console.log('📋 Parâmetros:', { objective, dailyBudget, funnelStage, images: imageFiles.length, videos: videoFiles.length, creativeUrl: !!creativeUrl });

    // =====================================================
    // ETAPA 1: Upload dos arquivos para Supabase
    // =====================================================

    console.log('📤 Etapa 1: Upload para Supabase...');
    const uploadedImages: { url: string; file: File }[] = [];
    const uploadedVideos: { url: string; file: File }[] = [];

    // ✅ Se tiver creative_url, usar ela diretamente (já foi feito upload)
    if (creativeUrl && mediaFiles.length === 0) {
      console.log('🎨 Usando creative_url existente (sem novo upload)');
      // Detectar se é vídeo ou imagem pela extensão
      const isVideo = /\.(mp4|mov|webm|avi)$/i.test(creativeUrl);
      if (isVideo) {
        // Criar um "fake" File para manter compatibilidade
        uploadedVideos.push({ url: creativeUrl, file: new File([], 'video.mp4', { type: 'video/mp4' }) });
      } else {
        uploadedImages.push({ url: creativeUrl, file: new File([], 'image.jpg', { type: 'image/jpeg' }) });
      }
    } else {
      // Upload normal dos arquivos
      for (let i = 0; i < imageFiles.length; i++) {
        const url = await uploadToSupabase(imageFiles[i], i, 'image');
        uploadedImages.push({ url, file: imageFiles[i] });
      }

      for (let i = 0; i < videoFiles.length; i++) {
        const url = await uploadToSupabase(videoFiles[i], i, 'video');
        uploadedVideos.push({ url, file: videoFiles[i] });
      }
    }

    // =====================================================
    // ETAPA 2: SISTEMA DE 2 CAMADAS DE IA
    // =====================================================
    // Camada 1: Gera prompt profissional a partir do objetivo simples
    // Camada 2: Usa o prompt para gerar copy com análise visual
    // =====================================================

    console.log('🤖 Etapa 2: Sistema de 2 Camadas de IA...');
    let generatedCopies: GeneratedCopy[] = [];
    let promptGeneratorResult: PromptGeneratorResult | null = null;
    const useVisionAnalysis = formData.get('use_vision_analysis') !== 'false'; // Default: true
    const useTwoLayerSystem = formData.get('use_two_layer_system') !== 'false'; // Default: true
    
    // 🎯 Prompt customizado gerado na Etapa 1 pelo usuário
    const customPrompt = formData.get('customPrompt') as string | null;

    if (manualCopy) {
      // Copy manual fornecida pelo usuário
      console.log('   📝 Usando copy manual');
      const allUrls = [...uploadedImages.map(i => i.url), ...uploadedVideos.map(v => v.url)];
      generatedCopies = allUrls.map(url => ({
        imageUrl: url,
        primaryText: [manualCopy, manualCopy],
        headlines: [objective, `${objective} - Saiba Mais`],
      }));
    } else if (customPrompt && uploadedImages.length > 0) {
      // 🔥 NOVO: Prompt customizado da Etapa 1 (Sistema de 2 Etapas)
      console.log('   🎯 Usando prompt customizado da Etapa 1...');
      console.log('   📝 Prompt:', customPrompt.substring(0, 100) + '...');
      
      try {
        // Usar o prompt customizado diretamente com Vision
        const imageUrls = uploadedImages.map(img => img.url);
        generatedCopies = await analyzeMultipleWithProfessionalPrompt(
          imageUrls,
          customPrompt
        );
        
        console.log(`   ✅ ${generatedCopies.length} imagens analisadas com prompt customizado`);
        
        // Marcar que usou prompt customizado
        generatedCopies = generatedCopies.map(copy => ({
          ...copy,
          metadata: {
            ...copy.metadata,
            customPromptUsed: true,
            analysisType: 'professional_prompt' as const,
          },
        }));
        
      } catch (error) {
        console.error('   ⚠️ Erro ao usar prompt customizado, usando fallback:', error);
        // Fallback para sistema padrão
        const imageAnalysisParams = uploadedImages.map(img => ({
          mediaUrl: img.url,
          mediaType: 'image' as const,
          objective,
          targetAudience,
        }));
        generatedCopies = await analyzeMultipleCreatives(imageAnalysisParams);
      }
      
    } else if (useTwoLayerSystem && uploadedImages.length > 0) {
      // 🔥 NOVO: Sistema de 2 Camadas de IA
      console.log('   🧠 [Camada 1] Gerando prompt profissional de copywriting...');
      
      try {
        // CAMADA 1: Transformar objetivo simples em prompt estruturado
        promptGeneratorResult = await generateCopywritingPrompt(objective);
        
        console.log('   ✅ [Camada 1] Análise:', {
          funil: promptGeneratorResult.analysis.funnelStage,
          intencao: promptGeneratorResult.analysis.intent,
          angulo: promptGeneratorResult.analysis.copyAngle,
        });
        
        // CAMADA 2: Usar o prompt profissional para gerar copy com Vision
        console.log('   🎨 [Camada 2] Gerando copy com prompt profissional + Vision...');
        
        const imageUrls = uploadedImages.map(img => img.url);
        generatedCopies = await analyzeMultipleWithProfessionalPrompt(
          imageUrls,
          promptGeneratorResult.professionalPrompt
        );
        
        console.log(`   ✅ [Camada 2] ${generatedCopies.length} imagens analisadas com prompt profissional`);
        
        // Atualizar metadata com informações do prompt
        generatedCopies = generatedCopies.map(copy => ({
          ...copy,
          metadata: {
            ...copy.metadata,
            professionalPromptUsed: true,
            analysisType: 'professional_prompt' as const,
          },
        }));
        
      } catch (error) {
        console.error('   ⚠️ Erro no sistema de 2 camadas, usando fallback Vision padrão:', error);
        
        // Fallback para Vision padrão
        const imageAnalysisParams = uploadedImages.map(img => ({
          mediaUrl: img.url,
          mediaType: 'image' as const,
          objective,
          targetAudience,
        }));
        
        generatedCopies = await analyzeMultipleCreatives(imageAnalysisParams);
      }
      
    } else if (useVisionAnalysis && uploadedImages.length > 0) {
      // Modo antigo: Análise visual das imagens com GPT-5.2 Vision
      console.log('   👁️ Analisando imagens com GPT-5.2 Vision (modo legado)...');
      
      const imageAnalysisParams = uploadedImages.map(img => ({
        mediaUrl: img.url,
        mediaType: 'image' as const,
        objective,
        targetAudience,
      }));
      
      generatedCopies = await analyzeMultipleCreatives(imageAnalysisParams);
      console.log(`   ✅ ${generatedCopies.length} imagens analisadas com Vision`);
      
    } else if (uploadedImages.length > 0) {
      // Fallback: geração sem análise visual (modo antigo)
      console.log('   📝 Gerando copy sem análise visual (fallback)');
      generatedCopies = await generateCopiesForImages(uploadedImages.map(i => i.url), objective, targetAudience);
    }

    // 🔥 NOVO: Preparar análise de vídeos para o cron (com buffer de áudio)
    const videoAnalysisData: Array<{
      url: string;
      file: File;
      audioBuffer?: Buffer;
    }> = [];

    if (useVisionAnalysis && uploadedVideos.length > 0) {
      console.log('   🎬 Preparando vídeos para análise multimodal...');
      
      for (const video of uploadedVideos) {
        try {
          // Converter File para Buffer para futura transcrição Whisper
          const arrayBuffer = await video.file.arrayBuffer();
          const audioBuffer = Buffer.from(arrayBuffer);
          
          // Só incluir buffer se for menor que 25MB (limite Whisper)
          const includeAudio = audioBuffer.length < 25 * 1024 * 1024;
          
          videoAnalysisData.push({
            url: video.url,
            file: video.file,
            audioBuffer: includeAudio ? audioBuffer : undefined,
          });
          
          console.log(`   📹 ${video.file.name}: ${includeAudio ? 'com áudio' : 'sem áudio (>25MB)'}`);
        } catch (error) {
          console.error(`   ⚠️ Erro ao preparar vídeo ${video.file.name}:`, error);
          videoAnalysisData.push({ url: video.url, file: video.file });
        }
      }
    }

    // =====================================================
    // ETAPA 3: Criar Campanha no Facebook
    // =====================================================

    console.log('📢 Etapa 3: Criando campanha...');
    
    // 🔥 CORRIGIDO: Usar uploadedVideos/uploadedImages em vez de mediaFiles
    // (mediaFiles fica vazio quando usamos creative_url)
    const firstUploadedMedia = uploadedVideos[0] || uploadedImages[0];
    const isFirstVideo = uploadedVideos.length > 0;
    const firstFileName = firstUploadedMedia?.file?.name || 'creative';
    
    // Mapear audienceStrategy para audienceType da Taxonomia
    const audienceTypeMap: Record<string, NamingInput['audienceType']> = {
      'COLD_WINNER': 'broad',
      'LOOKALIKE_AUTO': 'lookalike',
      'REMARKETING_VIDEO': 'remarketing',
      'REMARKETING_HOT': 'remarketing',
      'INTERESSE': 'interesse',
    };
    
    // Mapear funnelStage para a taxonomia
    const funnelStageMap: Record<string, NamingInput['funnelStage']> = {
      'TOPO': 'topo',
      'MEIO': 'meio',
      'FUNDO': 'fundo',
      'REMARKETING': 'remarketing',
    };
    
    const namingInput: NamingInput = {
      funnelStage: funnelStageMap[funnelStage] || inferFunnelStage(objective, audienceTypeMap[audienceStrategy] || 'broad'),
      objectiveTag: objective.substring(0, 30), // Limitar a 30 chars
      useAdvantagePlus,
      audienceType: audienceTypeMap[audienceStrategy] || 'broad',
      audienceDetails: audienceStrategy === 'LOOKALIKE_AUTO' ? 'Compradores' : 
                       audienceStrategy === 'REMARKETING_VIDEO' ? 'VideoView 50%' :
                       audienceStrategy === 'REMARKETING_HOT' ? 'Visitantes' :
                       audienceStrategy === 'INTERESSE' ? targetAudience : 'Aberto',
      lookalikePercent: 1,
      ageRange: `${ageMin}-${ageMax}`,
      placement: 'auto',
      mediaFormat: isFirstVideo ? 'video' : 'image',
      filename: firstFileName,
      copyVersion: 1,
      launchDate: new Date(),
      // ✅ MELHORADO: Adicionar orçamento e gênero para nomenclatura mais rica
      dailyBudget: dailyBudget,
      gender: gender === 'MALE' ? 'M' : gender === 'FEMALE' ? 'F' : 'ALL',
    };
    
    const generatedNames = generateAdNames(namingInput);
    const campaignName = generatedNames.campaignName;
    const adSetName = generatedNames.adSetName;
    
    console.log('📛 Nomes gerados:');
    console.log(`   Campanha: ${campaignName}`);
    console.log(`   AdSet: ${adSetName}`);

    const campaignId = await createCampaign(metaConfig.adAccountId, {
      name: campaignName,
      objective: 'OUTCOME_SALES',
      status: status,
      special_ad_categories: [],
    });

    // =====================================================
    // ETAPA 4: Configurar targeting por estágio de funil
    // =====================================================

    console.log(`📊 Etapa 4: Configurando targeting ${funnelStage}...`);
    console.log(`   Advantage+: ${useAdvantagePlus}, Estratégia: ${audienceStrategy}`);
    
    let finalTargeting: Record<string, unknown>;
    let includeAudiences: string[] = [];
    let excludeAudiences: string[] = [];

    if (useAdvantagePlus) {
      // Advantage+ Audience - targeting mínimo, Meta otimiza
      console.log('   🤖 Usando Advantage+ Audience (targeting relaxado)');
      finalTargeting = {
        geo_locations: { countries: [location === 'BR' ? 'BR' : location] },
        publisher_platforms: ['facebook', 'instagram'],
        // ✅ CORRIGIDO: 'reels' só funciona em instagram_positions, não em facebook_positions
        facebook_positions: ['feed', 'story'],
        instagram_positions: ['stream', 'story', 'reels'],
        // Advantage+ usa targeting_optimization automaticamente
      };
    } else {
      // Targeting Manual
      console.log('   👤 Usando targeting manual');
      const baseTargeting = buildTargeting(targetAudience);
      
      finalTargeting = {
        ...(baseTargeting as unknown as Record<string, unknown>),
        age_min: ageMin,
        age_max: ageMax,
        geo_locations: location === 'BR' 
          ? { countries: ['BR'] }
          : { regions: [{ key: location }] },
        publisher_platforms: ['facebook', 'instagram'],
      };

      // Adicionar filtro de gênero se não for "ALL"
      if (gender === 'MALE') {
        finalTargeting.genders = [1]; // 1 = Masculino
      } else if (gender === 'FEMALE') {
        finalTargeting.genders = [2]; // 2 = Feminino
      }
    }

    // Processar estratégia de público
    console.log(`   📊 Processando estratégia: ${audienceStrategy}`);
    
    switch (audienceStrategy) {
      case 'COLD_WINNER':
        // Público aberto + exclusão de compradores
        const funnelConfig = await getFunnelAudience('TOPO');
        excludeAudiences = funnelConfig.excludeAudiences;
        console.log(`   ✅ Frio Inteligente: ${excludeAudiences.length} exclusões`);
        break;

      case 'LOOKALIKE_AUTO':
        // Cria LAL 1% dos compradores automaticamente
        try {
          const { createLookalike } = await import('@/lib/meta-audiences');
          
          // Buscar público de compradores
          const { data: purchasers } = await supabaseAdmin
            .from('ads_audiences')
            .select('meta_audience_id')
            .ilike('name', '%Purchase%')
            .eq('is_active', true)
            .limit(1);

          if (purchasers && purchasers[0]) {
            const lalResult = await createLookalike({
              sourceAudienceId: purchasers[0].meta_audience_id,
              country: 'BR',
              ratio: 0.01, // 1%
              name: `LAL 1% Compradores - ${objective.substring(0, 20)}`
            });
            includeAudiences = [lalResult.audienceId];
            console.log(`   ✅ Lookalike criado: ${lalResult.audienceId}`);
          } else {
            console.log('   ⚠️ Nenhum público de compradores encontrado para LAL');
          }
        } catch (e) {
          console.log('   ⚠️ Erro ao criar Lookalike:', e);
        }
        break;

      case 'REMARKETING_VIDEO':
        // Público de VideoView 50%
        const meioConfig = await getFunnelAudience('MEIO');
        includeAudiences = meioConfig.includeAudiences;
        excludeAudiences = meioConfig.excludeAudiences;
        console.log(`   ✅ Remarketing Vídeo: ${includeAudiences.length} públicos`);
        break;

      case 'REMARKETING_HOT':
        // Visitantes site + abandono checkout
        const fundoConfig = await getFunnelAudience('FUNDO');
        includeAudiences = fundoConfig.includeAudiences;
        excludeAudiences = fundoConfig.excludeAudiences;
        console.log(`   ✅ Remarketing Quente: ${includeAudiences.length} públicos`);
        break;
    }

    // Adicionar públicos ao targeting
    if (includeAudiences.length > 0) {
      finalTargeting.custom_audiences = includeAudiences.map(id => ({ id }));
    }
    if (excludeAudiences.length > 0) {
      finalTargeting.excluded_custom_audiences = excludeAudiences.map(id => ({ id }));
    }

    // =====================================================
    // 🔥 SMART DEFAULTS - Melhores práticas da Meta
    // =====================================================
    // Se o frontend não enviar parâmetros, aplicamos defaults inteligentes

    // 1. Placements: Advantage+ (automático) se não especificado
    const usePlacementAdvantage = formData.get('placement_type') !== 'manual';
    if (usePlacementAdvantage) {
      // Advantage+ Placements - deixa a Meta otimizar
      finalTargeting.publisher_platforms = ['facebook', 'instagram', 'audience_network'];
      // ✅ CORRIGIDO v24.0: 'reels' só é válido em instagram_positions, NÃO em facebook_positions
      finalTargeting.facebook_positions = ['feed', 'story', 'marketplace', 'right_hand_column'];
      finalTargeting.instagram_positions = ['stream', 'story', 'reels', 'explore', 'explore_home'];
      console.log('   🔧 Smart Default: Advantage+ Placements ativado');
    }

    // 2. Inventory Filter: Standard (seguro para marcas)
    const inventoryFilter = formData.get('inventory_filter') as string || 'STANDARD';
    // Será aplicado no AdSet

    // 3. Targeting vazio = Broad + Exclusão de compradores
    const hasCustomAudiences = (finalTargeting.custom_audiences as unknown[])?.length > 0;
    if (!hasCustomAudiences && audienceStrategy === 'COLD_WINNER') {
      // Buscar público de compradores para excluir
      try {
        const { data: purchasers } = await supabaseAdmin
          .from('ads_audiences')
          .select('meta_audience_id')
          .or('name.ilike.%purchase%,name.ilike.%comprador%,name.ilike.%buyer%')
          .eq('is_active', true)
          .limit(5);

        if (purchasers && purchasers.length > 0) {
          const existingExcluded = (finalTargeting.excluded_custom_audiences as { id: string }[]) || [];
          const purchaserIds = purchasers.map(p => ({ id: p.meta_audience_id }));
          finalTargeting.excluded_custom_audiences = [...existingExcluded, ...purchaserIds];
          console.log(`   🔧 Smart Default: Excluídos ${purchasers.length} públicos de compradores`);
        }
      } catch (e) {
        console.log('   ⚠️ Não foi possível buscar públicos para exclusão');
      }
    }

    // 4. Bid Strategy padrão
    const bidStrategyRaw = formData.get('bid_strategy') as string || 'LOWEST_COST_WITHOUT_CAP';
    const bidStrategy = bidStrategyRaw as 'LOWEST_COST_WITHOUT_CAP' | 'LOWEST_COST_WITH_BID_CAP' | 'COST_CAP';
    console.log(`   🔧 Smart Default: Bid Strategy = ${bidStrategy}`);

    // =====================================================
    // ETAPA 5: Criar AdSet (com ROLLBACK automático)
    // =====================================================

    console.log('📋 Etapa 5: Criando AdSet...');
    // adSetName já foi gerado na Etapa 3 com a Taxonomia de Nomenclatura
    const dailyBudgetCents = Math.round(dailyBudget * 100);

    // ✅ Determinar custom_event_type baseado no funil
    const customEventType = getCustomEventType(funnelStage, objective);
    console.log(`🎯 Custom Event Type: ${customEventType} (funil: ${funnelStage}, objetivo: ${objective})`);

    let adSetId: string;
    
    try {
      adSetId = await createAdSet(metaConfig.adAccountId, {
        name: adSetName,
        campaign_id: campaignId,
        daily_budget: dailyBudgetCents,
        billing_event: 'IMPRESSIONS',
        optimization_goal: 'OFFSITE_CONVERSIONS',
        targeting: finalTargeting as unknown as Parameters<typeof createAdSet>[1]['targeting'],
        status: status,
        bid_strategy: bidStrategy,
        // ✅ ADICIONAR pixelId e customEventType para promoted_object
        pixel_id: metaConfig.pixelId,
        custom_event_type: customEventType,
      });
    } catch (adSetError) {
      // 🔴 ROLLBACK: Se AdSet falhar, deletar a campanha criada
      console.error('❌ Erro ao criar AdSet. Iniciando ROLLBACK...');
      console.error('   Erro original:', adSetError);
      
      try {
        console.log(`🗑️ ROLLBACK: Deletando campanha órfã ${campaignId}...`);
        const rollbackSuccess = await deleteCampaign(campaignId);
        
        if (rollbackSuccess) {
          console.log(`✅ ROLLBACK: Campanha ${campaignId} deletada com sucesso`);
        } else {
          console.error(`⚠️ ROLLBACK: Falha ao deletar campanha ${campaignId}`);
        }
      } catch (rollbackError) {
        console.error('⚠️ Erro no rollback:', rollbackError);
      }
      
      // Re-lançar o erro original com contexto de rollback
      const errorMessage = adSetError instanceof Error ? adSetError.message : String(adSetError);
      throw new Error(`Falha ao criar AdSet (campanha revertida): ${errorMessage}`);
    }

    await logCampaignCreation({
      meta_campaign_id: campaignId,
      meta_adset_id: adSetId,
      name: campaignName,
      strategy: funnelStage,
      objective,
      budget_daily: dailyBudget,
      status,
      custom_audiences: includeAudiences,
      excluded_audiences: excludeAudiences,
      targeting: finalTargeting,
    });

    // =====================================================
    // ETAPA 6: Processar Vídeos e Imagens
    // =====================================================

    const adIds: string[] = [];
    const creativeIds: string[] = [];

    // 6A: Processar vídeos - PIPELINE ASSÍNCRONO COM ANÁLISE MULTIMODAL
    if (uploadedVideos.length > 0) {
      console.log('📹 Etapa 6A: Analisando e registrando vídeos...');

      for (let i = 0; i < uploadedVideos.length; i++) {
        const { url, file } = uploadedVideos[i];
        const videoData = videoAnalysisData[i];

        try {
          let primaryText = manualCopy || `${objective} - Assista agora`;
          let headline = objective;
          let analysisMetadata: Record<string, unknown> = {};
          
          // 🔥 Gerar nome padronizado para o Video Ad
          const videoNamingInput: NamingInput = {
            ...namingInput,
            mediaFormat: 'video',
            filename: file.name,
            copyVersion: i + 1,
          };
          const videoAdNames = generateAdNames(videoNamingInput);
          const videoCreativeName = videoAdNames.adName;
          console.log(`   📛 Nome do vídeo: ${videoCreativeName}`);

          // 🔥 NOVO: Análise multimodal do vídeo se não tiver copy manual
          if (!manualCopy && useVisionAnalysis) {
            console.log(`   🎬 Analisando vídeo ${i + 1} com Vision + Whisper...`);
            
            try {
              const videoCopy = await analyzeCreativeForCopy({
                mediaUrl: url,
                mediaType: 'video',
                objective,
                targetAudience,
                thumbnailUrl: url, // Usar frame do vídeo como thumbnail
                audioBuffer: videoData?.audioBuffer,
              });
              
              // Usar a primeira copy gerada
              primaryText = videoCopy.primaryText[0] || primaryText;
              headline = videoCopy.headlines[0] || headline;
              
              // Salvar metadata da análise
              analysisMetadata = {
                analysisType: videoCopy.metadata?.analysisType,
                imageDescription: videoCopy.metadata?.imageDescription,
                audioTranscription: videoCopy.metadata?.audioTranscription,
                allPrimaryTexts: videoCopy.primaryText,
                allHeadlines: videoCopy.headlines,
              };
              
              console.log(`   ✅ Vídeo ${i + 1} analisado: ${videoCopy.metadata?.analysisType}`);
            } catch (analysisError) {
              console.log(`   ⚠️ Análise falhou, usando copy padrão:`, analysisError);
            }
          }

          // Salvar no banco com status 'pending' para o cron processar
          const { data: creative, error: insertError } = await supabaseAdmin
            .from('ads_creatives')
            .insert({
              campaign_id: campaignId,
              creative_type: 'VIDEO',
              file_url: url,
              file_name: file.name,
              generated_name: videoCreativeName, // 🔥 Nome padronizado
              primary_text: primaryText,
              headline,
              processing_status: 'pending',
              meta_errors: [],
              // Salvar análise como JSON para referência
              analysis_metadata: Object.keys(analysisMetadata).length > 0 ? analysisMetadata : null,
            })
            .select('id')
            .single();

          if (insertError) {
            console.error(`❌ Erro ao salvar vídeo ${i + 1}:`, insertError);
            continue;
          }

          creativeIds.push(creative.id);
          console.log(`✅ Vídeo ${i + 1} enfileirado para processamento (ID: ${creative.id})`);
        } catch (error) {
          console.error(`❌ Erro ao enfileirar vídeo ${i + 1}:`, error);
        }
      }
    }

    // 6B: Processar imagens
    if (generatedCopies.length > 0 && uploadedImages.length > 0) {
      console.log('🖼️ Etapa 6B: Processando imagens...');

      for (let i = 0; i < Math.min(generatedCopies.length, uploadedImages.length); i++) {
        const copy = generatedCopies[i];
        const imageFile = imageFiles[i];

        try {
          const imageHash = await uploadImageToMeta(copy.imageUrl, metaConfig.adAccountId);

          for (let j = 0; j < 2; j++) {
            const primaryText = copy.primaryText[j % copy.primaryText.length];
            const headline = copy.headlines[j % copy.headlines.length];
            
            // 🔥 Gerar nome padronizado para o Ad
            const adNamingInput: NamingInput = {
              ...namingInput,
              mediaFormat: 'image',
              filename: imageFile?.name || `image-${i + 1}`,
              copyVersion: j + 1,
            };
            const adNames = generateAdNames(adNamingInput);
            const creativeName = adNames.adName;

            const creativeId = await createAdCreative(metaConfig.adAccountId, {
              name: creativeName,
              pageId: metaConfig.pageId,
              imageHash,
              primaryText,
              headline,
              linkUrl,
              ctaType: funnelStage === 'FUNDO' ? 'SHOP_NOW' : 'LEARN_MORE',
            });
            creativeIds.push(creativeId);

            const adId = await createAd(metaConfig.adAccountId, {
              name: creativeName,
              adSetId: adSetId,
              creativeId: creativeId,
              status,
              campaignName: campaignName,  // 🔥 Para UTMs
              adSetName: adSetName,        // 🔥 Para UTMs
            });
            adIds.push(adId);
            
            console.log(`   📛 Ad criado: ${creativeName}`);

            await logCreativeCreation({
              campaign_id: campaignId,
              meta_ad_id: adId,
              meta_creative_id: creativeId,
              creative_type: 'IMAGE',
              file_url: copy.imageUrl,
              file_name: imageFile?.name,
              primary_text: primaryText,
              headline,
            });
          }

          console.log(`✅ Imagem ${i + 1} processada`);
        } catch (error) {
          console.error(`❌ Erro ao processar imagem ${i + 1}:`, error);
        }
      }
    }

    // =====================================================
    // VALIDAÇÃO RIGOROSA: Verificar se pelo menos 1 Ad foi criado
    // =====================================================
    
    const hasImages = uploadedImages.length > 0;
    const hasVideos = uploadedVideos.length > 0;
    
    // Para campanhas de IMAGEM: deve ter pelo menos 1 Ad criado
    // Para campanhas de VÍDEO: aceita 0 Ads (serão criados pelo cron após encoding)
    if (hasImages && !hasVideos && adIds.length === 0) {
      // 🔴 FALHA CRÍTICA: Campanha de imagem sem nenhum anúncio criado
      console.error('❌ FALHA CRÍTICA: Nenhum anúncio de imagem foi criado!');
      
      // Rollback: deletar campanha órfã
      console.log(`🗑️ ROLLBACK: Deletando campanha órfã ${campaignId}...`);
      const rollbackSuccess = await deleteCampaign(campaignId);
      console.log(`   ${rollbackSuccess ? '✅' : '⚠️'} Rollback ${rollbackSuccess ? 'concluído' : 'falhou'}`);
      
      return NextResponse.json({
        success: false,
        error: 'Nenhum anúncio foi criado. Verifique os criativos enviados.',
        rollbackExecuted: rollbackSuccess,
        campaignId: rollbackSuccess ? null : campaignId,
      }, { status: 400 });
    }
    
    // Para campanhas MISTAS (imagem + vídeo): deve ter pelo menos 1 Ad de imagem
    if (hasImages && hasVideos && adIds.length === 0) {
      console.warn('⚠️ Campanha mista sem anúncios de imagem - vídeos em processamento');
      // Não faz rollback pois vídeos serão processados
    }

    // =====================================================
    // RESPOSTA FINAL
    // =====================================================

    console.log('🎉 Campanha criada com sucesso!');
    
    // ✅ Mensagens corrigidas: campanha aparece IMEDIATAMENTE no Meta Ads
    let message = '';
    if (hasImages && hasVideos) {
      message = `Campanha criada! ${adIds.length} anúncios de imagem ativos. ${uploadedVideos.length} vídeo(s) em processamento. Já visível no Meta Ads Manager!`;
    } else if (hasVideos) {
      message = `Campanha criada! ${uploadedVideos.length} vídeo(s) em processamento. Já visível no Meta Ads Manager - anúncios entrarão em revisão automática.`;
    } else {
      message = `Campanha criada com ${adIds.length} anúncios! Já visível no Meta Ads Manager.`;
    }

    return NextResponse.json({
      success: true,
      data: {
        campaign: { id: campaignId, name: campaignName, funnelStage },
        adset: { id: adSetId, dailyBudget },
        creatives: creativeIds.length,
        ads: { count: adIds.length, ids: adIds },
        media: { 
          images: uploadedImages.length, 
          videos: uploadedVideos.length,
          videosProcessing: hasVideos ? uploadedVideos.length : 0
        },
        // Informações do Sistema de 2 Camadas de IA
        aiSystem: promptGeneratorResult ? {
          twoLayerUsed: true,
          analysis: promptGeneratorResult.analysis,
          promptPreview: promptGeneratorResult.professionalPrompt.substring(0, 300) + '...',
        } : {
          twoLayerUsed: false,
          fallback: 'vision_standard',
        },
      },
      message,
    });

  } catch (error: any) {
    console.error('❌ Erro ao criar campanha:', error);
    
    // Extrair informações detalhadas do erro Meta
    let errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    let errorDetails = '';
    
    if (error.response) {
      try {
        const errorData = await error.response.json();
        errorDetails = JSON.stringify(errorData, null, 2);
        console.error('📋 Detalhes do erro Meta:', errorDetails);
      } catch (e) {
        // Ignorar erro ao parsear
      }
    }
    
    // Se for erro da Meta API, incluir código e fbtrace
    if (errorMessage.includes('Meta API Error')) {
      console.error('🔍 Erro Meta API detectado');
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: `Meta API Error [undefined]: ${errorMessage}`,
        details: errorDetails || undefined
      },
      { status: 500 }
    );
  }
}

// =====================================================
// GET: Listar campanhas recentes
// =====================================================

export async function GET() {
  try {
    const { data: campaigns, error } = await supabaseAdmin
      .from('ads_campaigns')
      .select('*, ads_creatives (*)')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, campaigns });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Erro ao buscar campanhas' }, { status: 500 });
  }
}
