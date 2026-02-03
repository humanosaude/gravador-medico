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
import { getOptimizationConfig, getCampaignObjective, getRecommendedCTA, requiresPixel } from '@/lib/ads/optimization-config';
import { 
  getFunnelStrategy, 
  buildStrategyTargeting, 
  calculateAdjustedBudget, 
  getStrategyDescription,
  type FunnelStage as FunnelStageType,
  type ObjectiveType,
  type AudienceIds 
} from '@/lib/ads/funnel-strategy';

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

// ✅ CORRIGIDO: Mapear optimization_goal corretamente
type OptimizationGoal = 'OFFSITE_CONVERSIONS' | 'LINK_CLICKS' | 'LANDING_PAGE_VIEWS' | 'REACH' | 'IMPRESSIONS';

interface AdSetGoalConfig {
  optimization_goal: OptimizationGoal;
  custom_event_type?: CustomEventType;
  use_pixel: boolean;
}

/**
 * ✅ CORRIGIDO: Determinar configuração do AdSet baseado no objetivo
 * - TRÁFEGO: LINK_CLICKS (sem pixel/promoted_object)
 * - CONVERSÃO/VENDAS: OFFSITE_CONVERSIONS + pixel + evento
 */
function getAdSetConfig(funnelStage: string, objectiveType: string): AdSetGoalConfig {
  // ✅ Para TRÁFEGO - usar LINK_CLICKS (não precisa de pixel/evento)
  if (objectiveType === 'OUTCOME_TRAFFIC' || objectiveType.includes('TRAFEGO') || objectiveType.includes('TRAFFIC')) {
    return {
      optimization_goal: 'LINK_CLICKS',
      use_pixel: false,
      // custom_event_type não é necessário para LINK_CLICKS
    };
  }
  
  // ✅ Para VENDAS - usar OFFSITE_CONVERSIONS + pixel + evento
  if (objectiveType === 'OUTCOME_SALES' || objectiveType.includes('CONVERSAO') || objectiveType.includes('SALES')) {
    let eventType: CustomEventType = 'PURCHASE';
    
    switch (funnelStage) {
      case 'TOPO':
        eventType = 'CONTENT_VIEW';
        break;
      case 'MEIO':
        eventType = 'ADD_TO_CART';
        break;
      case 'FUNDO':
        eventType = 'PURCHASE';
        break;
    }
    
    return {
      optimization_goal: 'OFFSITE_CONVERSIONS',
      custom_event_type: eventType,
      use_pixel: true,
    };
  }
  
  // ✅ Para LEADS - usar OFFSITE_CONVERSIONS + pixel + LEAD
  if (objectiveType === 'OUTCOME_LEADS' || objectiveType.includes('LEAD')) {
    let eventType: CustomEventType = 'LEAD';
    
    switch (funnelStage) {
      case 'TOPO':
        eventType = 'CONTENT_VIEW';
        break;
      case 'MEIO':
        eventType = 'LEAD';
        break;
      case 'FUNDO':
        eventType = 'COMPLETE_REGISTRATION';
        break;
    }
    
    return {
      optimization_goal: 'OFFSITE_CONVERSIONS',
      custom_event_type: eventType,
      use_pixel: true,
    };
  }
  
  // Default: LINK_CLICKS (mais seguro, não requer pixel)
  return {
    optimization_goal: 'LINK_CLICKS',
    use_pixel: false,
  };
}

// ✅ DEPRECATED: Manter para compatibilidade
function getCustomEventType(funnelStage: string, objectiveType: string): CustomEventType {
  const config = getAdSetConfig(funnelStage, objectiveType);
  return config.custom_event_type || 'CONTENT_VIEW';
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
// HELPER: Download de Vídeo do Supabase
// =====================================================

async function downloadVideoFromUrl(url: string): Promise<Buffer> {
  console.log('⬇️ Baixando vídeo do Supabase:', url);
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const sizeMB = (buffer.length / 1024 / 1024).toFixed(2);
    console.log(`✅ Vídeo baixado: ${sizeMB} MB (${buffer.length} bytes)`);
    
    if (buffer.length === 0) {
      throw new Error('Vídeo baixado está vazio (0 bytes)!');
    }
    
    return buffer;
    
  } catch (error: any) {
    console.error('❌ Erro ao baixar vídeo:', error.message);
    throw new Error(`Falha no download do vídeo: ${error.message}`);
  }
}

// =====================================================
// HELPER: Extrair Thumbnail do Vídeo (FFmpeg)
// =====================================================

async function extractThumbnailFromVideo(videoBuffer: Buffer): Promise<Buffer> {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const fs = await import('fs/promises');
  const path = await import('path');
  
  const execAsync = promisify(exec);
  
  const tempVideoPath = path.join('/tmp', `video-thumb-${Date.now()}.mp4`);
  const tempThumbPath = path.join('/tmp', `thumb-${Date.now()}.jpg`);
  
  console.log('🖼️ Extraindo thumbnail do vídeo...');
  
  try {
    // Salvar vídeo temporariamente
    await fs.writeFile(tempVideoPath, videoBuffer);
    
    // Extrair frame aos 1 segundo (FFmpeg)
    await execAsync(
      `ffmpeg -i "${tempVideoPath}" -ss 00:00:01 -vframes 1 -q:v 2 -y "${tempThumbPath}"`,
      { timeout: 30000 }
    );
    
    // Ler thumbnail
    const thumbnailBuffer = await fs.readFile(tempThumbPath);
    
    const sizeMB = (thumbnailBuffer.length / 1024 / 1024).toFixed(2);
    console.log(`✅ Thumbnail extraída: ${sizeMB} MB`);
    
    // Limpar arquivos temporários
    await fs.unlink(tempVideoPath).catch(() => {});
    await fs.unlink(tempThumbPath).catch(() => {});
    
    return thumbnailBuffer;
    
  } catch (error: any) {
    console.error('❌ Erro ao extrair thumbnail:', error.message);
    // Limpar em caso de erro
    const fs2 = await import('fs/promises');
    await fs2.unlink(tempVideoPath).catch(() => {});
    await fs2.unlink(tempThumbPath).catch(() => {});
    throw error;
  }
}

// =====================================================
// HELPER: Upload de Thumbnail para Meta (Ad Image)
// =====================================================

async function uploadThumbnailToMeta(
  thumbnailBuffer: Buffer,
  adAccountId: string,
  accessToken: string
): Promise<string> {
  console.log('📤 Fazendo upload da thumbnail para Meta...');
  
  const url = `${META_BASE_URL}/act_${adAccountId}/adimages`;
  
  // Converter Buffer para ArrayBuffer para compatibilidade com Blob
  const arrayBuffer = thumbnailBuffer.buffer.slice(
    thumbnailBuffer.byteOffset, 
    thumbnailBuffer.byteOffset + thumbnailBuffer.byteLength
  ) as ArrayBuffer;
  const blob = new Blob([arrayBuffer], { type: 'image/jpeg' });
  
  const formData = new FormData();
  formData.append('filename', blob, 'thumbnail.jpg');
  formData.append('access_token', accessToken);
  
  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  });
  
  const data = await response.json();
  
  if (data.error) {
    console.error('❌ Erro ao fazer upload da thumbnail:', data.error);
    throw new Error(`Upload da thumbnail falhou: ${data.error.message}`);
  }
  
  // O Meta retorna { images: { "thumbnail.jpg": { hash: "xxx" } } }
  const imageHash = data.images?.['thumbnail.jpg']?.hash;
  
  if (!imageHash) {
    console.error('❌ Meta não retornou image_hash:', data);
    throw new Error('Meta não retornou image_hash para a thumbnail');
  }
  
  console.log(`✅ Thumbnail uploaded. Hash: ${imageHash}`);
  return imageHash;
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

// =====================================================
// HELPER: Upload de vídeo para Meta (CORRIGIDO)
// - Vídeos < 10MB: Upload DIRETO (sem chunks)
// - Vídeos > 10MB: Resumable upload (com chunks)
// =====================================================

async function uploadVideoToMeta(
  fileOrBuffer: File | Buffer,
  adAccountId: string,
  accessToken: string,
  fileName: string = 'video.mp4'
): Promise<string> {
  let buffer: Buffer;
  let displayName: string;
  
  // Suportar tanto File quanto Buffer
  if (Buffer.isBuffer(fileOrBuffer)) {
    buffer = fileOrBuffer;
    displayName = fileName;
  } else {
    // É um File
    const file = fileOrBuffer as File;
    displayName = file.name || fileName;
    
    if (file.size === 0) {
      throw new Error(`Arquivo de vídeo está vazio (0 bytes)! Use downloadVideoFromUrl para baixar primeiro.`);
    }
    
    const arrayBuffer = await file.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
  }
  
  const fileSize = buffer.length;
  const fileSizeMB = (fileSize / 1024 / 1024).toFixed(2);
  
  if (fileSize === 0) {
    throw new Error('Buffer de vídeo está vazio (0 bytes)!');
  }

  console.log(`📹 Iniciando upload de vídeo: ${displayName} (${fileSizeMB}MB)`);

  // =====================================================
  // ✅ VÍDEOS PEQUENOS (< 10MB): Upload DIRETO
  // =====================================================
  if (fileSize < 10 * 1024 * 1024) {
    console.log('📤 Usando upload DIRETO (vídeo < 10MB)...');
    
    try {
      // Criar FormData com o vídeo como source
      // Converter Buffer para ArrayBuffer para compatibilidade com Blob
      const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
      const blob = new Blob([arrayBuffer], { type: 'video/mp4' });
      
      const formData = new FormData();
      formData.append('source', blob, displayName);
      formData.append('access_token', accessToken);
      formData.append('title', displayName);
      
      const uploadUrl = `${META_BASE_URL}/act_${adAccountId}/advideos`;
      console.log(`📤 Enviando para: ${uploadUrl}`);
      
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
        // NÃO adicionar Content-Type - FormData define automaticamente com boundary
      });
      
      const responseText = await uploadResponse.text();
      console.log(`📥 Resposta da Meta (status ${uploadResponse.status}):`, responseText.substring(0, 500));
      
      let result;
      try {
        result = JSON.parse(responseText);
      } catch {
        throw new Error(`Resposta inválida da Meta: ${responseText}`);
      }
      
      if (result.error) {
        console.error('❌ Erro da Meta no upload direto:');
        console.error('   Código:', result.error.code);
        console.error('   Mensagem:', result.error.message);
        console.error('   Tipo:', result.error.type);
        throw new Error(`Upload direto falhou: ${result.error.message}`);
      }
      
      if (!result.id) {
        throw new Error(`API não retornou ID do vídeo. Resposta: ${JSON.stringify(result)}`);
      }
      
      console.log(`✅ Upload direto concluído! Video ID: ${result.id}`);
      
      // Aguardar 3 segundos para processamento inicial do Meta
      await sleep(3000);
      
      return result.id;
      
    } catch (error) {
      console.error('❌ Erro no upload direto:', error);
      throw error;
    }
  }

  // =====================================================
  // ✅ VÍDEOS GRANDES (>= 10MB): Resumable upload
  // =====================================================
  console.log('📤 Usando RESUMABLE upload (vídeo >= 10MB)...');
  
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
  return await finishVideoUpload(adAccountId, session.video_id, displayName, accessToken);
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
// HELPER: Obter Page Access Token
// =====================================================
// O Page Access Token é necessário para criar AdCreatives
// quando o app está em modo de desenvolvimento
// Isso evita o erro 1885183

function getPageAccessToken(): string {
  // Primeiro tenta o Page Access Token específico
  const pageToken = process.env.META_PAGE_ACCESS_TOKEN;
  if (pageToken) {
    console.log('🔑 Usando META_PAGE_ACCESS_TOKEN para criação de AdCreative');
    return pageToken;
  }
  
  // Fallback para o token principal
  const mainToken = process.env.META_ACCESS_TOKEN || process.env.FACEBOOK_ACCESS_TOKEN || '';
  console.log('🔑 Usando token principal (fallback)');
  return mainToken;
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
    imageHash?: string; // ✅ Thumbnail opcional
  },
  accessToken: string
): Promise<string> {
  const url = `${META_BASE_URL}/act_${adAccountId}/adcreatives`;

  // ✅ Usar Page Access Token para evitar erro de Development Mode
  const creativeAccessToken = getPageAccessToken();

  // ✅ Construir video_data com thumbnail se disponível
  const videoData: Record<string, unknown> = {
    video_id: config.videoId,
    message: config.primaryText,
    title: config.headline,
    link_description: config.headline,
    call_to_action: {
      type: config.ctaType || 'LEARN_MORE',
      value: { link: config.linkUrl },
    },
  };
  
  // ✅ Adicionar thumbnail se disponível
  if (config.imageHash) {
    videoData.image_hash = config.imageHash;
    console.log('   🖼️ Usando thumbnail customizada (image_hash)');
  }
  
  const objectStorySpec = {
    page_id: config.pageId,
    video_data: videoData,
  };
  
  console.log('🎨 Criando Video AdCreative...');
  console.log('   URL:', url);
  console.log('   Page ID:', config.pageId);
  console.log('   Video ID:', config.videoId);
  console.log('   CTA Type:', config.ctaType);
  console.log('   Image Hash:', config.imageHash || 'não especificado');
  console.log('   Token Type:', process.env.META_PAGE_ACCESS_TOKEN ? 'Page Token' : 'User Token');

  const params = new URLSearchParams({
    access_token: creativeAccessToken,
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
    console.error('❌ Erro da API Meta ao criar AdCreative:');
    console.error('   Código:', data.error.code);
    console.error('   Subcode:', data.error.error_subcode);
    console.error('   Mensagem:', data.error.message);
    console.error('   User Message:', data.error.error_user_msg);
    console.error('   Tipo:', data.error.type);
    console.error('   Erro completo:', JSON.stringify(data.error, null, 2));
    throw new Error(`Erro ao criar ad creative de vídeo: ${data.error.error_user_msg || data.error.message}`);
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
    const funnelStage = (formData.get('funnel_stage') as FunnelStageType) || 'TOPO';
    const statusRaw = formData.get('status') as string || 'PAUSED';
    const status = statusRaw === 'ACTIVE' ? 'ACTIVE' : 'PAUSED';
    const linkUrl = formData.get('linkUrl') as string || process.env.NEXT_PUBLIC_SITE_URL || 'https://gravador-medico.com.br';
    const manualCopy = formData.get('copy') as string | null;
    
    // ✅ NOVO: Extrair objective_type do frontend (TRAFEGO, CONVERSAO, REMARKETING, LEADS)
    const objectiveTypeRaw = formData.get('objective_type') as string || 'TRAFEGO';
    const objectiveType = objectiveTypeRaw.toUpperCase() as ObjectiveType;
    
    // ✅ NOVO: Obter estratégia inteligente baseada em funil + objetivo
    console.log(`\n🧠 ====== ESTRATÉGIA INTELIGENTE ======`);
    console.log(`   Funil: ${funnelStage} | Objetivo: ${objectiveType}`);
    console.log(`   Descrição: ${getStrategyDescription(funnelStage, objectiveType)}`);
    
    const funnelStrategy = getFunnelStrategy(funnelStage, objectiveType, metaConfig.pixelId || '');
    
    // ✅ NOVO: CTA dinâmico baseado na estratégia
    const recommendedCTA = funnelStrategy.recommended_cta;
    console.log(`🎯 CTA recomendado: ${recommendedCTA}`);

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

    // =====================================================
    // ETAPA 5: Criar AdSet (com ESTRATÉGIA DE FUNIL)
    // =====================================================

    console.log('\n📋 Etapa 5: Criando AdSet com ESTRATÉGIA INTELIGENTE...');
    console.log(`🧠 Estratégia: ${funnelStage} + ${objectiveType}`);
    console.log(`   Descrição: ${funnelStrategy.description}`);
    
    // ✅ NOVO: Calcular orçamento ajustado pela estratégia
    const budgetResult = calculateAdjustedBudget(dailyBudget, funnelStrategy);
    const adjustedBudgetCents = Math.round(budgetResult.adjusted * 100);
    console.log(`💰 Orçamento: R$${dailyBudget} → R$${budgetResult.adjusted} (${budgetResult.reason})`);
    
    // ✅ NOVO: Buscar IDs de audiências personalizadas do banco
    let audienceIds: AudienceIds = {};
    try {
      const { data: audiences } = await supabaseAdmin
        .from('custom_audiences')
        .select('meta_audience_id, audience_type')
        .eq('is_active', true);
      
      if (audiences && audiences.length > 0) {
        audienceIds = {
          engagers30d: audiences.find(a => a.audience_type === 'ENGAGEMENT')?.meta_audience_id,
          visitors90d: audiences.find(a => a.audience_type === 'WEBSITE_VISITORS')?.meta_audience_id,
          addToCart: audiences.find(a => a.audience_type === 'ADD_TO_CART')?.meta_audience_id,
          buyers: audiences.filter(a => a.audience_type === 'PURCHASERS').map(a => a.meta_audience_id)
        };
        console.log(`📊 Audiências encontradas:`, {
          engagers: !!audienceIds.engagers30d,
          visitors: !!audienceIds.visitors90d,
          addToCart: !!audienceIds.addToCart,
          buyers: audienceIds.buyers?.length || 0
        });
      }
    } catch (e) {
      console.log('   ⚠️ Não foi possível buscar audiências personalizadas');
    }
    
    // ✅ NOVO: Construir targeting baseado na estratégia de funil
    const strategyTargeting = buildStrategyTargeting(funnelStrategy, audienceIds, location);
    
    // Mesclar targeting da estratégia com exclusões já configuradas
    const strategyExcluded = (strategyTargeting.excluded_custom_audiences as { id: string }[]) || [];
    const existingExcluded = (finalTargeting.excluded_custom_audiences as { id: string }[]) || [];
    const allExcluded = [...strategyExcluded, ...existingExcluded];
    
    const mergedTargeting: Record<string, unknown> = {
      ...strategyTargeting,
    };
    
    if (allExcluded.length > 0) {
      mergedTargeting.excluded_custom_audiences = allExcluded;
    }
    
    console.log(`🎯 Targeting aplicado:`, {
      age_min: mergedTargeting.age_min,
      age_max: mergedTargeting.age_max,
      custom_audiences: (mergedTargeting.custom_audiences as any[])?.length || 0,
      excluded_audiences: (mergedTargeting.excluded_custom_audiences as any[])?.length || 0,
      has_interests: !!(mergedTargeting.flexible_spec as any[])?.length
    });

    let adSetId: string;
    
    try {
      const adSetParams: Parameters<typeof createAdSet>[1] = {
        name: adSetName,
        campaign_id: campaignId,
        daily_budget: adjustedBudgetCents, // ✅ Orçamento ajustado pela estratégia
        billing_event: funnelStrategy.billing_event as any,
        optimization_goal: funnelStrategy.optimization_goal as any,
        targeting: mergedTargeting as unknown as Parameters<typeof createAdSet>[1]['targeting'],
        status: status,
        bid_strategy: funnelStrategy.bid_strategy as any,
      };
      
      // ✅ Adicionar bid_amount se a estratégia definir (COST_CAP)
      if (funnelStrategy.bid_amount) {
        (adSetParams as any).bid_amount = funnelStrategy.bid_amount;
        console.log(`   💵 Bid Amount: R$${(funnelStrategy.bid_amount / 100).toFixed(2)} por conversão`);
      }
      
      // ✅ Adicionar promoted_object para CONVERSAO/LEADS
      if (funnelStrategy.promoted_object) {
        adSetParams.pixel_id = funnelStrategy.promoted_object.pixel_id;
        adSetParams.custom_event_type = funnelStrategy.promoted_object.custom_event_type as any;
        console.log(`   📊 Pixel + Evento: ${funnelStrategy.promoted_object.pixel_id} / ${funnelStrategy.promoted_object.custom_event_type}`);
      } else {
        console.log(`   🔗 Sem pixel (objetivo: ${funnelStrategy.optimization_goal})`);
      }

      // ✅ Adicionar attribution_spec se disponível
      if (funnelStrategy.attribution_spec) {
        (adSetParams as any).attribution_spec = funnelStrategy.attribution_spec;
        console.log(`   📈 Attribution Spec configurado`);
      }
      
      console.log('\n📋 AdSet Payload Final:', JSON.stringify({
        name: adSetParams.name,
        optimization_goal: adSetParams.optimization_goal,
        billing_event: adSetParams.billing_event,
        bid_strategy: adSetParams.bid_strategy,
        daily_budget: `R$${(adjustedBudgetCents / 100).toFixed(2)}`,
        has_promoted_object: !!funnelStrategy.promoted_object,
        has_attribution: !!funnelStrategy.attribution_spec
      }, null, 2));
      
      adSetId = await createAdSet(metaConfig.adAccountId, adSetParams);
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

    // ✅ REMOVIDO: logCampaignCreation movido para DEPOIS de criar ads
    // Agora só salvamos campanhas que concluíram com sucesso

    // =====================================================
    // ETAPA 6: Processar Vídeos e Imagens
    // =====================================================

    const adIds: string[] = [];
    const creativeIds: string[] = [];

    // 6A: Processar vídeos - UPLOAD PARA META + CRIAR AD CREATIVE + AD
    if (uploadedVideos.length > 0) {
      console.log('📹 Etapa 6A: Processando vídeos (upload + criação de anúncios)...');

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

          // 🔥 Análise multimodal do vídeo se não tiver copy manual
          if (!manualCopy && useVisionAnalysis) {
            console.log(`   🎬 Analisando vídeo ${i + 1} com Vision + Whisper...`);
            
            try {
              const videoCopy = await analyzeCreativeForCopy({
                mediaUrl: url,
                mediaType: 'video',
                objective,
                targetAudience,
                thumbnailUrl: url,
                audioBuffer: videoData?.audioBuffer,
              });
              
              primaryText = videoCopy.primaryText[0] || primaryText;
              headline = videoCopy.headlines[0] || headline;
              
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

          // =====================================================
          // 🔥 NOVO: Upload do vídeo para a Meta + Criar Ad
          // =====================================================
          
          console.log(`   📤 Fazendo upload do vídeo ${i + 1} para a Meta...`);
          
          // 🔥 CORREÇÃO: Se o arquivo está vazio (veio de creative_url), baixar do Supabase primeiro
          let videoBuffer: Buffer | null = null;
          let metaVideoId: string;
          
          if (file.size === 0) {
            console.log(`   ⬇️ Arquivo vazio detectado, baixando do Supabase: ${url}`);
            videoBuffer = await downloadVideoFromUrl(url);
            metaVideoId = await uploadVideoToMeta(videoBuffer, metaConfig.adAccountId, metaConfig.accessToken, file.name || 'video.mp4');
          } else {
            // Arquivo real com conteúdo - converter para Buffer
            const arrayBuffer = await file.arrayBuffer();
            videoBuffer = Buffer.from(arrayBuffer);
            metaVideoId = await uploadVideoToMeta(videoBuffer, metaConfig.adAccountId, metaConfig.accessToken, file.name);
          }
          console.log(`   ✅ Vídeo uploaded. Meta Video ID: ${metaVideoId}`);
          
          // 2. Aguardar vídeo ficar pronto
          console.log(`   ⏳ Aguardando vídeo ficar pronto (timeout: 30s)...`);
          const videoReady = await waitForVideoReady(metaVideoId, metaConfig.accessToken, 30000); // 30s timeout
          if (!videoReady) {
            console.warn(`   ⚠️ Timeout aguardando vídeo ${i + 1}, mas continuando...`);
          } else {
            console.log(`   ✅ Vídeo está pronto para uso`);
          }
          
          // ✅ 2.5 NOVO: Extrair thumbnail e fazer upload
          let thumbnailHash: string | undefined;
          if (videoBuffer) {
            try {
              console.log(`   🖼️ Extraindo thumbnail do vídeo...`);
              const thumbnailBuffer = await extractThumbnailFromVideo(videoBuffer);
              thumbnailHash = await uploadThumbnailToMeta(thumbnailBuffer, metaConfig.adAccountId, metaConfig.accessToken);
              console.log(`   ✅ Thumbnail pronta. Hash: ${thumbnailHash}`);
            } catch (thumbError) {
              console.warn(`   ⚠️ Erro ao extrair thumbnail, continuando sem:`, thumbError);
              // Continuar sem thumbnail - Meta pode rejeitar ou aceitar
            }
          }
          
          // 3. Criar AdCreative com o vídeo
          console.log(`   🎨 Criando AdCreative para vídeo ${i + 1}...`);
          console.log(`   📝 Parâmetros do AdCreative:`, JSON.stringify({
            name: videoCreativeName,
            pageId: metaConfig.pageId,
            videoId: metaVideoId,
            primaryText: primaryText.substring(0, 50) + '...',
            headline: headline.substring(0, 30) + '...',
            linkUrl: linkUrl,
            ctaType: recommendedCTA,
            imageHash: thumbnailHash || 'não especificado',
          }, null, 2));
          
          const videoCreativeId = await createVideoAdCreative(
            metaConfig.adAccountId,
            {
              name: videoCreativeName,
              pageId: metaConfig.pageId,
              videoId: metaVideoId,
              primaryText: primaryText,
              headline: headline,
              linkUrl: linkUrl, // ✅ URL do site obrigatória
              ctaType: recommendedCTA, // ✅ CTA dinâmico baseado no objetivo
              imageHash: thumbnailHash, // ✅ Thumbnail extraída
            },
            metaConfig.accessToken
          );
          creativeIds.push(videoCreativeId);
          console.log(`   ✅ AdCreative criado com sucesso: ${videoCreativeId}`);
          
          // 4. Criar Ad vinculado ao AdSet
          console.log(`   📢 Criando Ad para vídeo ${i + 1}...`);
          const videoAdId = await createAd(metaConfig.adAccountId, {
            name: videoCreativeName,
            adSetId: adSetId,
            creativeId: videoCreativeId,
            status,
            campaignName: campaignName,
            adSetName: adSetName,
          });
          adIds.push(videoAdId);
          console.log(`   ✅ Ad criado: ${videoAdId}`);

          // 5. Salvar no banco para histórico
          const { data: creative, error: insertError } = await supabaseAdmin
            .from('ads_creatives')
            .insert({
              campaign_id: campaignId,
              creative_type: 'VIDEO',
              file_url: url,
              file_name: file.name,
              generated_name: videoCreativeName,
              primary_text: primaryText,
              headline,
              processing_status: 'completed', // ✅ Já processado
              meta_video_id: metaVideoId,
              meta_creative_id: videoCreativeId,
              meta_ad_id: videoAdId,
              meta_errors: [],
              analysis_metadata: Object.keys(analysisMetadata).length > 0 ? analysisMetadata : null,
            })
            .select('id')
            .single();

          if (insertError) {
            console.error(`   ⚠️ Erro ao salvar no banco (ad já criado):`, insertError.message);
          }

          console.log(`✅ Vídeo ${i + 1} processado com sucesso! Ad ID: ${videoAdId}`);
        } catch (error) {
          console.error(`❌ Erro ao processar vídeo ${i + 1}:`);
          if (error instanceof Error) {
            console.error(`   📛 Mensagem: ${error.message}`);
            console.error(`   📛 Stack: ${error.stack}`);
          } else {
            console.error(`   📛 Erro completo:`, error);
          }
          // Não re-lançar o erro para continuar com outros vídeos
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
    
    // ✅ CORRIGIDO: Agora verifica se QUALQUER Ad foi criado (imagem OU vídeo)
    if ((hasImages || hasVideos) && adIds.length === 0) {
      // 🔴 FALHA CRÍTICA: Nenhum anúncio criado
      console.error('❌ FALHA CRÍTICA: Nenhum anúncio foi criado!');
      
      // Rollback: deletar campanha órfã
      console.log(`🗑️ ROLLBACK: Deletando campanha órfã ${campaignId}...`);
      const rollbackSuccess = await deleteCampaign(campaignId);
      console.log(`   ${rollbackSuccess ? '✅' : '⚠️'} Rollback ${rollbackSuccess ? 'concluído' : 'falhou'}`);
      
      return NextResponse.json({
        success: false,
        error: 'Nenhum anúncio foi criado. Verifique os criativos enviados e tente novamente.',
        rollbackExecuted: rollbackSuccess,
        campaignId: rollbackSuccess ? null : campaignId,
      }, { status: 400 });
    }

    // =====================================================
    // RESPOSTA FINAL
    // =====================================================

    console.log('🎉 Campanha criada com sucesso!');
    
    // ✅ NOVO: Só salvar no banco APÓS confirmar que pelo menos 1 ad foi criado
    console.log('💾 Salvando campanha no banco (campanha válida com ads)...');
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
    // ✅ CORRIGIDO: Buscar campanhas sem JOIN (foreign key removida)
    const { data: campaigns, error } = await supabaseAdmin
      .from('ads_campaigns')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Buscar criativos separadamente se necessário
    const campaignsWithCreatives = await Promise.all(
      (campaigns || []).map(async (campaign) => {
        const { data: creatives } = await supabaseAdmin
          .from('ads_creatives')
          .select('*')
          .eq('campaign_id', campaign.meta_campaign_id)
          .limit(10);
        
        return {
          ...campaign,
          ads_creatives: creatives || []
        };
      })
    );

    return NextResponse.json({ success: true, campaigns: campaignsWithCreatives });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Erro ao buscar campanhas' }, { status: 500 });
  }
}
