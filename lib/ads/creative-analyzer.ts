// =====================================================
// ANALISADOR MULTIMODAL DE CRIATIVOS
// =====================================================
// Usa GPT-5.2 Vision para imagens e Whisper + Vision para vídeos
// Gera copy altamente contextualizada baseada no conteúdo real
// =====================================================

import OpenAI from 'openai';
import type { GeneratedCopy } from './types';
// ✅ IMPORTAR funções do video-analyzer que já extraem áudio corretamente
import { 
  extractAudioFromVideo, 
  transcribeAudioWithWhisper, 
  extractFramesFromVideo,
  analyzeFramesWithGPT as analyzeFramesWithGPTFromVideoAnalyzer
} from '@/lib/video-analyzer';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// =====================================================
// TIPOS
// =====================================================

interface CreativeAnalysisResult {
  imageDescription: string;
  audioTranscription?: string;
  primaryTexts: string[];
  headlines: string[];
  analysisType: 'image' | 'video' | 'video_vision_only';
}

interface AnalyzeCreativeParams {
  mediaUrl: string;
  mediaType: 'image' | 'video';
  objective: string;
  targetAudience: string;
  thumbnailUrl?: string; // Para vídeos
  audioBuffer?: Buffer;  // Para transcrição Whisper
}

// =====================================================
// TRANSCRIÇÃO DE VÍDEO (Whisper via FFmpeg)
// =====================================================

/**
 * Transcreve o áudio de um vídeo usando FFmpeg + Whisper API
 * ✅ CORRIGIDO: Extrai MP3 primeiro, depois envia ao Whisper
 * @param videoBuffer - Buffer do arquivo de vídeo
 * @param fileName - Nome do arquivo original
 * @returns Transcrição do áudio ou null se falhar
 */
export async function transcribeVideoAudio(
  videoBuffer: Buffer,
  fileName: string
): Promise<string | null> {
  console.log(`🎤 [transcribeVideoAudio] Processando: ${fileName}`);

  // Criar arquivo temporário do vídeo
  const tempDir = os.tmpdir();
  const videoPath = path.join(tempDir, `video-${Date.now()}.mp4`);
  
  try {
    // 1. Salvar vídeo em arquivo temporário
    await fs.writeFile(videoPath, videoBuffer);
    console.log(`   📁 Vídeo salvo temporariamente: ${videoPath}`);
    
    // 2. Extrair áudio para MP3 usando FFmpeg
    const audioPath = await extractAudioFromVideo(videoPath);
    
    if (!audioPath) {
      console.log('   ⚠️ Falha ao extrair áudio (FFmpeg não disponível)');
      return null;
    }
    
    // 3. Transcrever MP3 com Whisper
    const transcription = await transcribeAudioWithWhisper(audioPath);
    
    // 4. Limpar arquivos temporários
    await fs.unlink(videoPath).catch(() => {});
    await fs.unlink(audioPath).catch(() => {});
    
    if (transcription && transcription !== '[Transcrição não disponível]') {
      console.log(`   ✅ Transcrição obtida: ${transcription.substring(0, 100)}...`);
      return transcription;
    }
    
    return null;
  } catch (error) {
    console.error('❌ Erro na transcrição:', error);
    
    // Limpar arquivo temporário em caso de erro
    await fs.unlink(videoPath).catch(() => {});
    
    return null;
  }
}

// =====================================================
// ANÁLISE VISUAL (GPT-5.2 Vision)
// =====================================================

/**
 * Analisa uma imagem e gera copy contextualizada
 * @param imageUrl - URL pública da imagem
 * @param objective - Objetivo da campanha
 * @param targetAudience - Público-alvo
 * @returns Descrição da imagem + copies geradas
 */
export async function analyzeImageForCopy(
  imageUrl: string,
  objective: string,
  targetAudience: string
): Promise<CreativeAnalysisResult> {
  console.log(`👁️ Analisando imagem com Vision: ${imageUrl.substring(0, 50)}...`);

  const systemPrompt = `Você é um copywriter especialista em anúncios de alta conversão para Facebook/Instagram.
Sua missão é analisar a imagem fornecida e criar textos de anúncio ALTAMENTE CONTEXTUALIZADOS.

IMPORTANTE: Suas copies devem fazer referência DIRETA ao que aparece na imagem.
- Se há uma pessoa, descreva características relevantes
- Se há um produto, destaque-o
- Se há uma ação sendo executada, conecte com o benefício
- Use elementos visuais para criar ganchos emocionais`;

  const userPrompt = `ANALISE ESTA IMAGEM e crie copy de anúncio contextualizada.

CONTEXTO DA CAMPANHA:
- Objetivo: ${objective}
- Público-alvo: ${targetAudience}

TAREFA:
1. Descreva brevemente o que você vê na imagem
2. Gere 3 opções de Primary Text (80-150 chars) que façam REFERÊNCIA DIRETA à imagem
3. Gere 3 opções de Headline (20-40 chars) conectando imagem + objetivo

REGRAS:
- Primary Text deve começar com gancho emocional ou problema
- Use emojis estrategicamente (máximo 2 por texto)
- Headlines devem ser diretas e impactantes
- CONECTE o visual ao benefício do produto/serviço

FORMATO (JSON):
{
  "imageDescription": "descrição do que aparece na imagem",
  "primaryTexts": ["texto1...", "texto2...", "texto3..."],
  "headlines": ["headline1", "headline2", "headline3"]
}

Responda APENAS com o JSON.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-5.2', // Modelo mais recente (Dezembro 2025) - Suporta Vision
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: userPrompt },
            { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } },
          ],
        },
      ],
      temperature: 0.8, // GPT-5.2 se beneficia de mais criatividade
      max_completion_tokens: 800,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('Sem resposta da OpenAI');

    const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleanContent);

    console.log('✅ Análise de imagem concluída:', parsed.imageDescription);

    return {
      imageDescription: parsed.imageDescription,
      primaryTexts: parsed.primaryTexts,
      headlines: parsed.headlines,
      analysisType: 'image',
    };
  } catch (error) {
    console.error('❌ Erro na análise de imagem:', error);
    
    // Fallback: copy genérica
    return {
      imageDescription: 'Imagem não analisada',
      primaryTexts: [
        `🎯 Descubra como ${objective.toLowerCase()} pode transformar sua carreira. Resultados comprovados!`,
        `⚡ A solução que ${targetAudience.toLowerCase()} esperavam para ${objective.toLowerCase()}. Não perca!`,
        `💡 Milhares de ${targetAudience.toLowerCase()} já transformaram suas vidas. E você?`,
      ],
      headlines: [
        `${objective.split(' ')[0]} para ${targetAudience}`,
        'Transforme sua Carreira',
        'Resultados Comprovados',
      ],
      analysisType: 'image',
    };
  }
}

// =====================================================
// ANÁLISE DE VÍDEO (FFmpeg + Whisper + Vision)
// =====================================================

/**
 * Analisa um vídeo usando FFmpeg para extrair frames + Whisper para áudio
 * ✅ CORRIGIDO: Extrai frames JPEG para Vision, extrai MP3 para Whisper
 * @param params - Parâmetros incluindo URL, thumbnail e buffer de áudio
 * @returns Copy contextualizada baseada no vídeo
 */
export async function analyzeVideoForCopy(params: {
  videoUrl: string;
  thumbnailUrl: string;
  audioBuffer?: Buffer;
  fileName: string;
  objective: string;
  targetAudience: string;
}): Promise<CreativeAnalysisResult> {
  const { videoUrl, audioBuffer, fileName, objective, targetAudience } = params;
  
  console.log(`🎬 [analyzeVideoForCopy] Analisando vídeo: ${fileName}`);

  let transcription: string | null = null;
  let frameBase64Images: string[] = [];
  
  // Criar arquivo temporário do vídeo se tiver buffer
  const tempDir = os.tmpdir();
  const videoPath = path.join(tempDir, `analyze-video-${Date.now()}.mp4`);
  
  try {
    // 1. Se tiver buffer, salvar e extrair frames + áudio
    if (audioBuffer && audioBuffer.length > 0) {
      await fs.writeFile(videoPath, audioBuffer);
      console.log(`   📁 Vídeo salvo para análise: ${videoPath}`);
      
      // 1a. Extrair áudio e transcrever
      const audioPath = await extractAudioFromVideo(videoPath);
      if (audioPath) {
        transcription = await transcribeAudioWithWhisper(audioPath);
        await fs.unlink(audioPath).catch(() => {});
        console.log(`   ✅ Transcrição: ${transcription ? 'OK' : 'Falhou'}`);
      }
      
      // 1b. Extrair frames para análise visual
      const framePaths = await extractFramesFromVideo(videoPath, 0.5, 3); // 3 frames
      
      if (framePaths.length > 0) {
        // Converter frames para base64
        for (const framePath of framePaths) {
          const frameBuffer = await fs.readFile(framePath);
          frameBase64Images.push(`data:image/jpeg;base64,${frameBuffer.toString('base64')}`);
          await fs.unlink(framePath).catch(() => {}); // Limpar
        }
        console.log(`   📸 ${frameBase64Images.length} frames extraídos para Vision`);
      }
      
      // Limpar vídeo temporário
      await fs.unlink(videoPath).catch(() => {});
    }
  } catch (extractError) {
    console.error('   ⚠️ Erro na extração (continuando sem):', extractError);
    await fs.unlink(videoPath).catch(() => {});
  }

  // 2. Preparar prompt para GPT Vision
  const systemPrompt = `Você é um copywriter especialista em anúncios de vídeo para Facebook/Instagram.
Sua missão é criar copies ALTAMENTE CONTEXTUALIZADAS baseadas no conteúdo do vídeo.

${transcription ? `
TRANSCRIÇÃO DO ÁUDIO DO VÍDEO:
"${transcription}"

Use trechos ou referências ao que é dito no vídeo para criar copies mais autênticas e envolventes.
` : 'Não foi possível transcrever o áudio. Use apenas a análise visual dos frames.'}`;

  const userPrompt = `ANALISE ${frameBase64Images.length > 0 ? 'OS FRAMES DESTE VÍDEO' : 'ESTE VÍDEO'}${transcription ? ' e considere a transcrição do áudio acima' : ''}.

CONTEXTO DA CAMPANHA:
- Objetivo: ${objective}
- Público-alvo: ${targetAudience}

TAREFA:
1. Descreva o que você vê nos frames/thumbnail
2. ${transcription ? 'Conecte o visual com o que é dito no áudio' : 'Crie uma narrativa baseada no visual'}
3. Gere 3 Primary Texts (80-150 chars) que ${transcription ? 'referenciem o áudio' : 'conectem com o visual'}
4. Gere 3 Headlines (20-40 chars) impactantes

REGRAS ESPECIAIS PARA VÍDEO:
- ${transcription ? 'Use citações ou referências ao áudio: "Como eu disse no vídeo..."' : 'Foque no visual'}
- Crie curiosidade para assistir
- Conecte o gancho visual ao benefício

FORMATO (JSON):
{
  "imageDescription": "descrição do que aparece no vídeo",
  "audioContext": "${transcription ? 'resumo do áudio' : 'não disponível'}",
  "primaryTexts": ["texto1...", "texto2...", "texto3..."],
  "headlines": ["headline1", "headline2", "headline3"]
}

Responda APENAS com o JSON.`;

  try {
    // Construir conteúdo com frames ou fallback para análise de texto
    const contentParts: any[] = [{ type: 'text', text: userPrompt }];
    
    if (frameBase64Images.length > 0) {
      // ✅ Usar frames extraídos (JPEG)
      for (const base64Image of frameBase64Images) {
        contentParts.push({
          type: 'image_url',
          image_url: { url: base64Image, detail: 'low' } // low para economizar tokens
        });
      }
    } else if (params.thumbnailUrl && !params.thumbnailUrl.endsWith('.mp4')) {
      // ✅ CORRIGIDO: Só usar thumbnailUrl se for imagem (não MP4)
      console.log('   ⚠️ Sem frames, usando thumbnail como imagem');
      contentParts.push({
        type: 'image_url',
        image_url: { url: params.thumbnailUrl, detail: 'low' }
      });
    } else {
      // ❌ Sem frames e sem thumbnail de imagem - análise apenas por texto
      console.log('   ⚠️ Sem frames extraídos e sem thumbnail. Analisando apenas por transcrição.');
      // Não adiciona imagem - GPT Vision não aceita MP4
    }
    
    const response = await openai.chat.completions.create({
      model: 'gpt-5.2',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: contentParts },
      ],
      temperature: 0.8,
      max_completion_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('Sem resposta da OpenAI');

    const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleanContent);

    console.log('✅ Análise de vídeo concluída:', {
      thumbnail: parsed.imageDescription,
      audioUsed: !!transcription,
    });

    return {
      imageDescription: parsed.imageDescription,
      audioTranscription: transcription || undefined,
      primaryTexts: parsed.primaryTexts,
      headlines: parsed.headlines,
      analysisType: transcription ? 'video' : 'video_vision_only',
    };
  } catch (error) {
    console.error('❌ Erro na análise de vídeo:', error);
    
    // Fallback
    return {
      imageDescription: 'Thumbnail não analisada',
      primaryTexts: [
        `🎬 Assista ao vídeo e descubra como ${objective.toLowerCase()}. Milhares já transformaram suas vidas!`,
        `▶️ Neste vídeo, explico exatamente como ${targetAudience.toLowerCase()} podem ${objective.toLowerCase()}.`,
        `📹 O segredo que todo ${targetAudience.toLowerCase()} precisa saber está neste vídeo. Assista!`,
      ],
      headlines: [
        'Assista Agora',
        `Segredo para ${targetAudience}`,
        'Não Perca Este Vídeo',
      ],
      analysisType: 'video_vision_only',
    };
  }
}

// =====================================================
// FUNÇÃO PRINCIPAL: Analisa criativo e gera copy
// =====================================================

/**
 * Analisa qualquer tipo de criativo (imagem ou vídeo) e gera copy contextualizada
 * @param params - Parâmetros do criativo
 * @returns GeneratedCopy com textos contextualizados
 */
export async function analyzeCreativeForCopy(
  params: AnalyzeCreativeParams
): Promise<GeneratedCopy> {
  const { mediaUrl, mediaType, objective, targetAudience, thumbnailUrl, audioBuffer } = params;

  let result: CreativeAnalysisResult;

  if (mediaType === 'image') {
    result = await analyzeImageForCopy(mediaUrl, objective, targetAudience);
  } else {
    // Vídeo: usar thumbnail para análise visual
    const thumbUrl = thumbnailUrl || mediaUrl; // fallback para URL do vídeo
    
    result = await analyzeVideoForCopy({
      videoUrl: mediaUrl,
      thumbnailUrl: thumbUrl,
      audioBuffer,
      fileName: mediaUrl.split('/').pop() || 'video.mp4',
      objective,
      targetAudience,
    });
  }

  return {
    imageUrl: mediaUrl,
    primaryText: result.primaryTexts,
    headlines: result.headlines,
    metadata: {
      analysisType: result.analysisType,
      imageDescription: result.imageDescription,
      audioTranscription: result.audioTranscription,
    },
  };
}

// =====================================================
// HELPER: Gerar thumbnail de vídeo
// =====================================================

/**
 * Extrai frame do vídeo ou usa thumbnail da Meta
 * Para simplificar, usamos a URL do vídeo no Supabase como referência
 * A Meta gera thumbnails automaticamente após upload
 */
export async function getVideoThumbnailUrl(
  videoId: string,
  accessToken: string
): Promise<string | null> {
  try {
    const url = `https://graph.facebook.com/v21.0/${videoId}?fields=thumbnails&access_token=${accessToken}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.thumbnails?.data?.[0]?.uri) {
      return data.thumbnails.data[0].uri;
    }
    
    return null;
  } catch (error) {
    console.error('❌ Erro ao buscar thumbnail:', error);
    return null;
  }
}

// =====================================================
// HELPER: Processar múltiplos criativos
// =====================================================

/**
 * Analisa múltiplos criativos em paralelo (com limit de concorrência)
 */
export async function analyzeMultipleCreatives(
  creatives: AnalyzeCreativeParams[],
  maxConcurrency: number = 3
): Promise<GeneratedCopy[]> {
  const results: GeneratedCopy[] = [];
  
  // Processar em batches para não sobrecarregar a API
  for (let i = 0; i < creatives.length; i += maxConcurrency) {
    const batch = creatives.slice(i, i + maxConcurrency);
    const batchResults = await Promise.all(
      batch.map(creative => analyzeCreativeForCopy(creative))
    );
    results.push(...batchResults);
    
    // Pequeno delay entre batches
    if (i + maxConcurrency < creatives.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return results;
}

// =====================================================
// CAMADA 2: Análise com Prompt Profissional
// =====================================================

/**
 * Analisa imagem usando um prompt profissional pré-gerado (Camada 2 do sistema)
 * Este método recebe o prompt da Camada 1 e usa para gerar copy mais precisa
 * 
 * @param imageUrl - URL da imagem a analisar
 * @param professionalPrompt - Prompt estruturado gerado pela Camada 1
 * @returns Copy gerada seguindo as instruções do prompt profissional
 */
export async function analyzeWithProfessionalPrompt(
  imageUrl: string,
  professionalPrompt: string
): Promise<{
  primary_text: string;
  headline: string;
  cta: string;
}> {
  console.log('🎨 [IA Layer 2] Gerando copy com prompt profissional...');

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-5.2', // Modelo mais recente (Dezembro 2025) - Suporta Vision + JSON
      messages: [
        {
          role: 'system',
          content: 'Você é um copywriter especialista em anúncios de performance. Siga EXATAMENTE as instruções do prompt fornecido. Responda APENAS com JSON válido.',
        },
        {
          role: 'user',
          content: [
            { 
              type: 'text', 
              text: professionalPrompt 
            },
            { 
              type: 'image_url', 
              image_url: { url: imageUrl, detail: 'high' } 
            },
          ],
        },
      ],
      temperature: 0.7,
      max_completion_tokens: 1000,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('Sem resposta da OpenAI');

    const parsed = JSON.parse(content);

    console.log('✅ [IA Layer 2] Copy gerada:', {
      headline: parsed.headline?.substring(0, 50),
      cta: parsed.cta,
    });

    return {
      primary_text: parsed.primary_text || parsed.primaryText || '',
      headline: parsed.headline || '',
      cta: parsed.cta || 'Saiba Mais',
    };
  } catch (error) {
    console.error('❌ [IA Layer 2] Erro ao gerar copy:', error);
    
    // Fallback
    return {
      primary_text: '🎯 Médico, você perde horas digitando prontuários?\n\nO Gravador Médico transcreve suas consultas automaticamente com IA.\n\nMais de 2.000 médicos já economizam 15h/semana.\n\nTeste grátis por 7 dias.',
      headline: 'Prontuário pronto em segundos',
      cta: 'Começar Teste Grátis',
    };
  }
}

/**
 * Analisa múltiplos criativos usando o prompt profissional (Camada 2)
 * 
 * @param imageUrls - Array de URLs das imagens
 * @param professionalPrompt - Prompt estruturado gerado pela Camada 1
 * @returns Array de GeneratedCopy para cada imagem
 */
export async function analyzeMultipleWithProfessionalPrompt(
  imageUrls: string[],
  professionalPrompt: string
): Promise<GeneratedCopy[]> {
  console.log(`🎨 [IA Layer 2] Analisando ${imageUrls.length} imagens com prompt profissional...`);
  
  const results: GeneratedCopy[] = [];
  
  for (const imageUrl of imageUrls) {
    try {
      const copy = await analyzeWithProfessionalPrompt(imageUrl, professionalPrompt);
      
      results.push({
        imageUrl,
        primaryText: [copy.primary_text],
        headlines: [copy.headline],
        metadata: {
          cta: copy.cta,
          analysisType: 'professional_prompt',
        },
      });
    } catch (error) {
      console.error(`❌ Erro ao analisar imagem ${imageUrl}:`, error);
      
      // Fallback para esta imagem
      results.push({
        imageUrl,
        primaryText: ['🎯 Médico, economize 15h/semana com transcrição automática de consultas. Teste grátis!'],
        headlines: ['Prontuário pronto em segundos'],
        metadata: {
          cta: 'Começar Teste Grátis',
          analysisType: 'fallback',
        },
      });
    }
    
    // Pequeno delay entre chamadas
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return results;
}
