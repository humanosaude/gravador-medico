// =====================================================
// CRON: PROCESS VIDEOS - Worker de Processamento Assíncrono
// =====================================================
// Este worker processa vídeos pendentes em background:
// 1. Busca vídeos com processing_status = 'pending'
// 2. Faz upload para Meta
// 3. Aguarda processamento
// 4. Cria o Ad
// 5. Atualiza status para 'ready' ou 'error'
// 
// Executado via Vercel Cron Jobs ou chamada manual
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutos para processar múltiplos vídeos

// =====================================================
// CONSTANTES
// =====================================================

const META_API_VERSION = 'v21.0';
const META_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;
const VIDEO_CHECK_INTERVAL = 3000;
const MAX_VIDEO_WAIT_TIME = 120000; // 2 minutos por vídeo

// =====================================================
// TIPOS
// =====================================================

interface PendingVideo {
  id: string;
  campaign_id: string;
  file_url: string;
  file_name: string | null;
  primary_text: string;
  headline: string;
  meta_adset_id?: string;
  processing_status: string;
  meta_errors: unknown[] | null;
}

interface VideoUploadSession {
  video_id: string;
  upload_url: string;
  start_offset: string;
  end_offset: string;
}

interface CampaignData {
  id: string;
  meta_campaign_id: string;
  meta_adset_id: string;
  strategy: string;
  status: string;
}

// =====================================================
// HELPERS
// =====================================================

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getMetaSettings() {
  const { data } = await supabaseAdmin
    .from('integration_settings')
    .select('*')
    .eq('is_default', true)
    .limit(1)
    .single();

  if (!data) {
    throw new Error('Configurações Meta não encontradas');
  }

  return {
    adAccountId: data.meta_ad_account_id,
    pageId: data.meta_page_id,
    instagramActorId: data.meta_instagram_actor_id,
    accessToken: process.env.META_ACCESS_TOKEN || process.env.FACEBOOK_ACCESS_TOKEN || ''
  };
}

async function downloadFile(url: string): Promise<Buffer> {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function getFileSize(url: string): Promise<number> {
  const response = await fetch(url, { method: 'HEAD' });
  const contentLength = response.headers.get('content-length');
  return contentLength ? parseInt(contentLength) : 0;
}

// =====================================================
// META VIDEO UPLOAD (Chunked)
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
    throw new Error(`Erro ao iniciar upload: ${data.error.message}`);
  }
  return data;
}

async function uploadVideoChunk(
  adAccountId: string,
  sessionId: string,
  chunk: Buffer,
  startOffset: string,
  accessToken: string
): Promise<{ start_offset: string; end_offset: string }> {
  const url = `${META_BASE_URL}/act_${adAccountId}/advideos`;

  const formData = new FormData();
  formData.append('access_token', accessToken);
  formData.append('upload_phase', 'transfer');
  formData.append('upload_session_id', sessionId);
  formData.append('start_offset', startOffset);
  formData.append('video_file_chunk', new Blob([new Uint8Array(chunk)]));

  const response = await fetch(url, { method: 'POST', body: formData });
  const data = await response.json();
  
  if (data.error) {
    throw new Error(`Erro ao enviar chunk: ${data.error.message}`);
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
    throw new Error(`Erro ao finalizar upload: ${data.error.message}`);
  }

  return data.video_id;
}

async function uploadVideoToMeta(
  fileBuffer: Buffer,
  fileName: string,
  adAccountId: string,
  accessToken: string
): Promise<string> {
  console.log(`📹 Iniciando upload de vídeo: ${fileName} (${(fileBuffer.length / 1024 / 1024).toFixed(2)}MB)`);

  const fileSize = fileBuffer.length;

  // 1. Iniciar sessão
  const session = await startVideoUploadSession(adAccountId, fileSize, accessToken);
  console.log('📹 Sessão iniciada:', session.video_id);

  // 2. Upload em chunks de 4MB
  const CHUNK_SIZE = 4 * 1024 * 1024;
  let startOffset = parseInt(session.start_offset);

  while (startOffset < fileSize) {
    const chunkEnd = Math.min(startOffset + CHUNK_SIZE, fileSize);
    const chunk = fileBuffer.slice(startOffset, chunkEnd);

    console.log(`📹 Chunk: ${startOffset} - ${chunkEnd} (${((chunkEnd / fileSize) * 100).toFixed(0)}%)`);

    const result = await uploadVideoChunk(adAccountId, session.video_id, chunk, startOffset.toString(), accessToken);
    startOffset = parseInt(result.start_offset);
    await sleep(100);
  }

  // 3. Finalizar
  return await finishVideoUpload(adAccountId, session.video_id, fileName, accessToken);
}

async function waitForVideoReady(
  videoId: string,
  accessToken: string
): Promise<{ ready: boolean; error?: string }> {
  console.log(`⏳ Aguardando vídeo ${videoId}...`);

  const startTime = Date.now();

  while (Date.now() - startTime < MAX_VIDEO_WAIT_TIME) {
    try {
      const url = `${META_BASE_URL}/${videoId}?fields=status&access_token=${accessToken}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.status?.video_status === 'ready') {
        console.log(`✅ Vídeo ${videoId} pronto!`);
        return { ready: true };
      }

      if (data.status?.video_status === 'error') {
        return { ready: false, error: 'Video processing failed' };
      }

      console.log(`⏳ Status: ${data.status?.video_status || 'processing'}...`);
    } catch (error) {
      console.error('⚠️ Erro ao verificar status:', error);
    }

    await sleep(VIDEO_CHECK_INTERVAL);
  }

  return { ready: false, error: 'Timeout waiting for video' };
}

// =====================================================
// CRIAR AD COM VÍDEO
// =====================================================

async function createVideoAdCreative(
  adAccountId: string,
  pageId: string,
  instagramActorId: string | null,
  videoId: string,
  config: { name: string; primaryText: string; headline: string; linkUrl: string; ctaType: string },
  accessToken: string
): Promise<string> {
  const url = `${META_BASE_URL}/act_${adAccountId}/adcreatives`;

  const objectStorySpec: Record<string, unknown> = {
    page_id: pageId,
    video_data: {
      video_id: videoId,
      message: config.primaryText,
      title: config.headline,
      call_to_action: {
        type: config.ctaType,
        value: { link: config.linkUrl },
      },
    },
  };

  // Se tiver Instagram Actor ID, adiciona para suportar Feed/Stories/Reels
  if (instagramActorId) {
    objectStorySpec.instagram_actor_id = instagramActorId;
  }

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
    throw new Error(`Erro ao criar creative: ${data.error.message}`);
  }

  return data.id;
}

async function createAd(
  adAccountId: string,
  adSetId: string,
  creativeId: string,
  name: string,
  status: string,
  accessToken: string
): Promise<string> {
  const url = `${META_BASE_URL}/act_${adAccountId}/ads`;

  const params = new URLSearchParams({
    access_token: accessToken,
    name: name,
    adset_id: adSetId,
    creative: JSON.stringify({ creative_id: creativeId }),
    status: status,
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(`Erro ao criar ad: ${data.error.message}`);
  }

  return data.id;
}

// =====================================================
// PROCESSAR UM VÍDEO PENDENTE
// =====================================================

async function processVideo(
  video: PendingVideo,
  campaign: CampaignData,
  settings: { adAccountId: string; pageId: string; instagramActorId?: string; accessToken: string }
): Promise<{ success: boolean; error?: string; videoId?: string; adId?: string }> {
  console.log(`\n🎬 Processando vídeo: ${video.file_name || video.id}`);

  try {
    // 1. Download do arquivo do Supabase
    console.log('📥 Baixando arquivo...');
    const fileBuffer = await downloadFile(video.file_url);

    // 2. Upload para Meta
    console.log('📤 Enviando para Meta...');
    const metaVideoId = await uploadVideoToMeta(
      fileBuffer,
      video.file_name || `video_${video.id}`,
      settings.adAccountId,
      settings.accessToken
    );

    // 3. Aguardar processamento
    const waitResult = await waitForVideoReady(metaVideoId, settings.accessToken);
    if (!waitResult.ready) {
      throw new Error(waitResult.error || 'Video processing failed');
    }

    // 4. Criar AdCreative
    console.log('🎨 Criando creative...');
    const creativeId = await createVideoAdCreative(
      settings.adAccountId,
      settings.pageId,
      settings.instagramActorId || null,
      metaVideoId,
      {
        name: `Video_${video.id}_${campaign.strategy}`,
        primaryText: video.primary_text,
        headline: video.headline,
        linkUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://gravador-medico.com.br',
        ctaType: campaign.strategy === 'FUNDO' ? 'SHOP_NOW' : 'LEARN_MORE',
      },
      settings.accessToken
    );

    // 5. Criar Ad
    console.log('📢 Criando anúncio...');
    const adId = await createAd(
      settings.adAccountId,
      campaign.meta_adset_id,
      creativeId,
      `${campaign.strategy} - Video ${video.id}`,
      campaign.status,
      settings.accessToken
    );

    // 6. Atualizar registro no banco
    await supabaseAdmin
      .from('ads_creatives')
      .update({
        video_id: metaVideoId,
        meta_creative_id: creativeId,
        meta_ad_id: adId,
        processing_status: 'ready',
        processed_at: new Date().toISOString(),
      })
      .eq('id', video.id);

    console.log(`✅ Vídeo processado! Ad ID: ${adId}`);
    return { success: true, videoId: metaVideoId, adId };

  } catch (error) {
    console.error(`❌ Erro ao processar vídeo ${video.id}:`, error);

    // Atualizar status para erro
    await supabaseAdmin
      .from('ads_creatives')
      .update({
        processing_status: 'error',
        meta_errors: [{ error: error instanceof Error ? error.message : 'Unknown error', timestamp: new Date().toISOString() }],
      })
      .eq('id', video.id);

    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// =====================================================
// POST: Processar vídeos pendentes (Cron Job)
// =====================================================

export async function POST(request: NextRequest) {
  console.log('🔄 Iniciando processamento de vídeos pendentes...');

  // Verificar autorização (para Vercel Cron)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Buscar configurações Meta
    const settings = await getMetaSettings();

    // 2. Buscar vídeos pendentes (máximo 5 por execução)
    const { data: pendingVideos, error } = await supabaseAdmin
      .from('ads_creatives')
      .select(`
        id,
        campaign_id,
        file_url,
        file_name,
        primary_text,
        headline,
        processing_status,
        meta_errors
      `)
      .eq('creative_type', 'VIDEO')
      .eq('processing_status', 'pending')
      .order('created_at', { ascending: true })
      .limit(5);

    if (error) {
      throw new Error(`Erro ao buscar vídeos: ${error.message}`);
    }

    if (!pendingVideos || pendingVideos.length === 0) {
      console.log('✅ Nenhum vídeo pendente para processar');
      return NextResponse.json({ success: true, processed: 0, message: 'No pending videos' });
    }

    console.log(`📹 Encontrados ${pendingVideos.length} vídeos pendentes`);

    const results: { id: string; success: boolean; error?: string }[] = [];

    // 3. Processar cada vídeo
    for (const video of pendingVideos as PendingVideo[]) {
      // Buscar dados da campanha
      const { data: campaign } = await supabaseAdmin
        .from('ads_campaigns')
        .select('id, meta_campaign_id, meta_adset_id, strategy, status')
        .eq('id', video.campaign_id)
        .single();

      if (!campaign) {
        console.error(`❌ Campanha não encontrada para vídeo ${video.id}`);
        results.push({ id: video.id, success: false, error: 'Campaign not found' });
        continue;
      }

      const result = await processVideo(video, campaign as CampaignData, settings);
      results.push({ id: video.id, ...result });

      // Pequeno delay entre vídeos para não sobrecarregar a API
      await sleep(1000);
    }

    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;

    console.log(`\n🎉 Processamento concluído: ${successCount} sucesso, ${errorCount} erros`);

    return NextResponse.json({
      success: true,
      processed: pendingVideos.length,
      results: {
        success: successCount,
        errors: errorCount,
        details: results,
      },
    });

  } catch (error) {
    console.error('❌ Erro no processamento:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// =====================================================
// GET: Status dos vídeos pendentes
// =====================================================

export async function GET() {
  try {
    const { data: pending } = await supabaseAdmin
      .from('ads_creatives')
      .select('id, file_name, processing_status, created_at')
      .eq('creative_type', 'VIDEO')
      .eq('processing_status', 'pending')
      .order('created_at', { ascending: true });

    const { data: processing } = await supabaseAdmin
      .from('ads_creatives')
      .select('id, file_name, processing_status, created_at')
      .eq('creative_type', 'VIDEO')
      .eq('processing_status', 'processing')
      .order('created_at', { ascending: true });

    const { data: recent } = await supabaseAdmin
      .from('ads_creatives')
      .select('id, file_name, processing_status, processed_at, meta_errors')
      .eq('creative_type', 'VIDEO')
      .in('processing_status', ['ready', 'error'])
      .order('processed_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      success: true,
      queue: {
        pending: pending?.length || 0,
        processing: processing?.length || 0,
      },
      pendingVideos: pending,
      processingVideos: processing,
      recentlyProcessed: recent,
    });

  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
