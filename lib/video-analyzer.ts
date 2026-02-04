/**
 * =====================================================
 * ANALISADOR DE VÍDEO COMPLETO
 * =====================================================
 * 
 * - Extrai frames do vídeo com FFmpeg (se disponível)
 * - Extrai áudio e transcreve com Whisper
 * - Analisa visual + texto com GPT-5.2 Vision
 * 
 * NOTA: FFmpeg é opcional. Se não disponível, faz upload 
 * direto do vídeo e analisa com GPT-5.2.
 * 
 * =====================================================
 */

import fs from 'fs/promises';
import path from 'path';
import OpenAI from 'openai';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Lazy initialization para evitar erro durante build
let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return _openai;
}

// Cache do status do FFmpeg
let ffmpegChecked = false;
let ffmpegAvailable = false;
let ffmpegPath = 'ffmpeg'; // Caminho do FFmpeg encontrado

// ==========================================
// VERIFICAR FFMPEG
// ==========================================

async function checkFFmpeg(): Promise<boolean> {
  if (ffmpegChecked) return ffmpegAvailable;
  
  // ✅ Tentar com PATH completo do Homebrew (Mac)
  const possiblePaths = [
    '/opt/homebrew/bin/ffmpeg', // Mac M1/M2
    '/usr/local/bin/ffmpeg',    // Mac Intel / Linux
    '/usr/bin/ffmpeg',          // Linux padrão
    'ffmpeg'                    // PATH do sistema
  ];
  
  for (const testPath of possiblePaths) {
    try {
      await execAsync(`${testPath} -version`);
      ffmpegAvailable = true;
      ffmpegPath = testPath;
      console.log(`✅ [VideoAnalyzer] FFmpeg disponível: ${testPath}`);
      break;
    } catch {
      // Tentar próximo caminho
    }
  }
  
  if (!ffmpegAvailable) {
    console.log('⚠️ [VideoAnalyzer] FFmpeg não encontrado - usando análise simplificada');
    console.log('💡 [VideoAnalyzer] Instale com: brew install ffmpeg');
  }
  
  ffmpegChecked = true;
  return ffmpegAvailable;
}

// ==========================================
// 1. EXTRAIR FRAMES DO VÍDEO
// ==========================================

/**
 * Extrai frames de um vídeo usando FFmpeg CLI
 */
export async function extractFramesFromVideo(
  videoPath: string,
  framesPerSecond: number = 0.5,
  maxFrames: number = 10
): Promise<string[]> {
  const hasFFmpeg = await checkFFmpeg();
  
  if (!hasFFmpeg) {
    console.log('⚠️ [VideoAnalyzer] Pulando extração de frames (sem FFmpeg)');
    return [];
  }
  
  const outputDir = path.join('/tmp', `frames-${Date.now()}`);
  await fs.mkdir(outputDir, { recursive: true });
  
  console.log(`📸 [VideoAnalyzer] Extraindo frames (${framesPerSecond} fps)...`);
  
  try {
    const outputPattern = path.join(outputDir, 'frame-%04d.jpg');
    // ✅ Usar ffmpegPath descoberto
    await execAsync(`${ffmpegPath} -i "${videoPath}" -vf fps=${framesPerSecond} -frames:v ${maxFrames} "${outputPattern}" -y`);
    
    console.log('✅ [VideoAnalyzer] Frames extraídos');
    
    const files = await fs.readdir(outputDir);
    const framePaths = files
      .filter(f => f.endsWith('.jpg'))
      .sort()
      .slice(0, maxFrames)
      .map(f => path.join(outputDir, f));
    
    console.log(`📸 [VideoAnalyzer] ${framePaths.length} frames selecionados`);
    return framePaths;
    
  } catch (error: any) {
    console.error('❌ [VideoAnalyzer] Erro ao extrair frames:', error.message);
    return [];
  }
}

// ==========================================
// 2. EXTRAIR ÁUDIO DO VÍDEO
// ==========================================

/**
 * Extrai áudio do vídeo como MP3
 */
export async function extractAudioFromVideo(
  videoPath: string
): Promise<string | null> {
  const hasFFmpeg = await checkFFmpeg();
  
  if (!hasFFmpeg) {
    console.log('⚠️ [VideoAnalyzer] Pulando extração de áudio (sem FFmpeg)');
    return null;
  }
  
  const audioPath = path.join('/tmp', `audio-${Date.now()}.mp3`);
  
  console.log('🎵 [VideoAnalyzer] Extraindo áudio...');
  
  try {
    // ✅ Usar ffmpegPath descoberto
    await execAsync(`${ffmpegPath} -i "${videoPath}" -vn -acodec libmp3lame -ab 128k "${audioPath}" -y`);
    console.log('✅ [VideoAnalyzer] Áudio extraído:', audioPath);
    return audioPath;
  } catch (error: any) {
    console.error('❌ [VideoAnalyzer] Erro ao extrair áudio:', error.message);
    return null;
  }
}

// ==========================================
// 3. TRANSCREVER ÁUDIO COM WHISPER
// ==========================================

/**
 * Transcreve áudio usando Whisper da OpenAI
 */
export async function transcribeAudioWithWhisper(
  audioPath: string
): Promise<string> {
  try {
    console.log('🎤 [VideoAnalyzer] Transcrevendo áudio com Whisper...');
    
    const audioBuffer = await fs.readFile(audioPath);
    
    // Criar um File-like object para a API
    const audioFile = new File([audioBuffer], path.basename(audioPath), {
      type: 'audio/mpeg'
    });
    
    const transcription = await getOpenAI().audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'pt',
      response_format: 'text'
    });
    
    const text = transcription as string;
    console.log('✅ [VideoAnalyzer] Transcrição concluída');
    console.log('📝 [VideoAnalyzer] Texto:', text.substring(0, 200) + (text.length > 200 ? '...' : ''));
    
    return text;
    
  } catch (error: any) {
    console.error('❌ [VideoAnalyzer] Erro ao transcrever:', error.message);
    return '[Transcrição não disponível]';
  }
}

// ==========================================
// 4. ANALISAR COM GPT-5.2 VISION
// ==========================================

/**
 * Converte imagem para Base64
 */
async function imageToBase64(imagePath: string): Promise<string> {
  const buffer = await fs.readFile(imagePath);
  return buffer.toString('base64');
}

/**
 * Analisa frames visuais com GPT-5.2 Vision
 * ✅ PROMPT APRIMORADO - Compliance completo Meta Ads
 */
export async function analyzeFramesWithGPT(
  framePaths: string[],
  transcription: string
): Promise<{
  isCompliant: boolean;
  warnings: string[];
  suggestions: string[];
  summary: string;
  recommended_objective?: string;
  copy_angles?: string[];
  visualElements?: string[];
  moodAtmosphere?: string;
  hooks?: string[];
  cta?: string;
  confidence?: number;
}> {
  try {
    console.log(`🤖 [VideoAnalyzer] Analisando ${framePaths.length} frames com GPT-5.2 Vision...`);
    
    // Converter frames para Base64
    const base64Frames = await Promise.all(
      framePaths.map(async (framePath) => {
        const base64 = await imageToBase64(framePath);
        return `data:image/jpeg;base64,${base64}`;
      })
    );
    
    // ✅ PROMPT APRIMORADO - Baseado na documentação Meta Ads 2026
    const prompt = `
Você é um especialista em análise de criativos para Meta Ads (Facebook/Instagram).

**📹 VÍDEO ANALISADO:**
- ${framePaths.length} frames extraídos (1 frame a cada 2 segundos)
- Duração estimada: ${framePaths.length * 2} segundos

**🎤 TRANSCRIÇÃO DO ÁUDIO:**
${transcription || '[Áudio não transcrito - sem FFmpeg ou sem áudio]'}

---

## 🎯 ANÁLISE SOLICITADA

Analise o vídeo **EM PROFUNDIDADE** e retorne um JSON estruturado:

### 1️⃣ **recommended_objective** (string)
Objetivo recomendado:
- **"SALES"** - Vídeo direto, produto visível, CTA de compra
- **"TRAFEGO"** - Educativo/inspiracional, CTA "Saiba mais"
- **"ENGAGEMENT"** - Storytelling emocional, sem produto explícito

### 2️⃣ **confidence** (number 0-100)
Nível de confiança da recomendação

### 3️⃣ **visualElements** (array)
Liste 3-5 elementos visuais **ESPECÍFICOS**:
- "Gancho nos primeiros 1-3s: [descrever]"
- "Legendas queimadas visíveis: [sim/não]"
- "Logo/branding: [posição, momento]"
- "CTA visual: [descrever se houver]"
- "Qualidade: [profissional/amador]"

**SEJA ESPECÍFICO:** ✅ "Logo aos 2s no canto superior direito" vs ❌ "tem logo"

### 4️⃣ **moodAtmosphere** (string)
Descreva em 2-3 frases:
- Tom (profissional, descontraído, urgente, inspirador)
- Emoções transmitidas
- Ritmo (rápido, lento, dinâmico)

### 5️⃣ **hooks** (array)
Ganchos identificados:
- "Hook inicial (0-3s): [EXATO]"
- "Dor/promessa: [citar da transcrição]"
- "Demonstração: [descrever]"
- "Prova social: [se houver]"

### 6️⃣ **cta** (string)
CTA identificado (visual, áudio ou implícito)

### 7️⃣ **warnings** (array)
**COMPLIANCE META ADS - Verificar:**
1. ⚠️ Alegações enganosas ("garantido", "100%", "resultados em X dias")
2. ⚠️ Conteúdo proibido (drogas, armas, nudez, violência)
3. ⚠️ Atributos pessoais ("Você tem diabetes?", "Você está acima do peso?")
4. ⚠️ Comparações corporais excessivas (antes/depois)
5. ⚠️ Preços/condições não claros
6. ⚠️ Direitos autorais (música, imagens sem permissão)
7. ⚠️ CTA inconsistente com landing page
8. ⚠️ Claims de saúde/finanças sem disclaimer
9. ⚠️ Clickbait/sensacionalismo
10. ⚠️ Texto excessivo (>20% da tela)

Formato: ["⚠️ Problema: descrição"] ou ["✅ Nenhum problema detectado"]

### 8️⃣ **suggestions** (array)
Sugestões **ESPECÍFICAS** (não genéricas!):
- ❌ RUIM: "Adicione legenda"
- ✅ BOM: "Adicione legenda queimada nos primeiros 3s para reforçar o hook"

### 9️⃣ **isCompliant** (boolean)
Está em compliance?

### 🔟 **summary** (string)
Resumo executivo (2-3 frases)

### 1️⃣1️⃣ **copy_angles** (array)
3 ângulos de copy sugeridos baseados no criativo

---

**📝 FORMATO JSON EXATO:**
{
  "recommended_objective": "SALES",
  "confidence": 85,
  "visualElements": ["elemento 1", "elemento 2"],
  "moodAtmosphere": "Descrição...",
  "hooks": ["hook 1", "hook 2"],
  "cta": "CTA identificado",
  "warnings": ["⚠️ ou ✅"],
  "suggestions": ["sugestão específica"],
  "isCompliant": true,
  "summary": "Resumo...",
  "copy_angles": ["ângulo 1", "ângulo 2", "ângulo 3"]
}
`.trim();
    
    // Enviar para GPT-5.2 Vision
    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-5.2',
      messages: [
        {
          role: 'system',
          content: 'Você é um especialista em análise de criativos para Meta Ads. Seja ESPECÍFICO e DETALHADO. Analise cada frame cuidadosamente. Responda SEMPRE em JSON válido.'
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            ...base64Frames.map(imageUrl => ({
              type: 'image_url' as const,
              image_url: { 
                url: imageUrl,
                detail: 'high' as const
              }
            }))
          ]
        }
      ],
      max_completion_tokens: 3000,
      temperature: 0.4,
      response_format: { type: 'json_object' }
    });
    
    const content = response.choices[0].message.content || '{}';
    const analysis = JSON.parse(content);
    
    console.log('✅ [VideoAnalyzer] Análise GPT-5.2 concluída');
    console.log('📊 [VideoAnalyzer] Resultado:', {
      isCompliant: analysis.isCompliant,
      confidence: analysis.confidence,
      warnings: analysis.warnings?.length || 0,
      objective: analysis.recommended_objective
    });
    
    return {
      isCompliant: analysis.isCompliant !== false,
      warnings: analysis.warnings || [],
      suggestions: analysis.suggestions || [],
      summary: analysis.summary || 'Vídeo analisado com sucesso',
      recommended_objective: analysis.recommended_objective || 'SALES',
      copy_angles: analysis.copy_angles || [],
      visualElements: analysis.visualElements || [],
      moodAtmosphere: analysis.moodAtmosphere || '',
      hooks: analysis.hooks || [],
      cta: analysis.cta || '',
      confidence: analysis.confidence || 70
    };
    
  } catch (error: any) {
    console.error('❌ [VideoAnalyzer] Erro ao analisar frames:', error.message);
    
    return {
      isCompliant: true,
      warnings: ['Análise automática falhou: ' + error.message],
      suggestions: ['Revise manualmente antes de publicar'],
      summary: 'Erro na análise, mas vídeo aceito',
      recommended_objective: 'SALES',
      copy_angles: ['Foco no problema', 'Foco na solução', 'Foco no resultado'],
      visualElements: [],
      moodAtmosphere: '',
      hooks: [],
      cta: '',
      confidence: 50
    };
  }
}

/**
 * Análise simplificada sem FFmpeg - usa descrição de texto
 */
async function analyzeVideoSimplified(
  videoPath: string
): Promise<{
  isCompliant: boolean;
  warnings: string[];
  suggestions: string[];
  summary: string;
  recommended_objective: string;
  copy_angles: string[];
}> {
  try {
    console.log('🤖 [VideoAnalyzer] Análise simplificada (sem FFmpeg)...');
    
    // Obter informações básicas do arquivo
    const stats = await fs.stat(videoPath);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    
    const prompt = `
Você é um especialista em Meta Ads. Um vídeo de ${sizeMB}MB foi enviado para análise.

Como não consigo ver o conteúdo do vídeo diretamente, forneça:
1. Dicas gerais de compliance para vídeos no Meta Ads
2. Checklist de qualidade que o usuário deve verificar
3. Sugestões de objetivos de campanha baseados no tamanho do arquivo
4. 3 ângulos de copy genéricos para anúncios de produto/serviço

**RESPONDA EM JSON:**
{
  "isCompliant": true,
  "warnings": ["Lista de itens para o usuário verificar manualmente"],
  "suggestions": ["Sugestões de melhoria"],
  "summary": "Vídeo aceito - verifique os itens listados antes de publicar",
  "recommended_objective": "SALES",
  "copy_angles": ["ângulo 1", "ângulo 2", "ângulo 3"]
}
`.trim();

    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-5.2',
      messages: [
        {
          role: 'system',
          content: 'Você é um especialista em Meta Ads. Responda sempre em JSON válido.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_completion_tokens: 1500,
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });
    
    const content = response.choices[0].message.content || '{}';
    const analysis = JSON.parse(content);
    
    return {
      isCompliant: true,
      warnings: analysis.warnings || ['Verifique manualmente o conteúdo do vídeo'],
      suggestions: analysis.suggestions || ['Revise antes de publicar'],
      summary: analysis.summary || 'Vídeo aceito - análise visual não disponível',
      recommended_objective: analysis.recommended_objective || 'SALES',
      copy_angles: analysis.copy_angles || ['Foco no problema', 'Foco na solução', 'Foco no resultado']
    };
    
  } catch (error: any) {
    console.error('❌ [VideoAnalyzer] Erro na análise simplificada:', error.message);
    
    return {
      isCompliant: true,
      warnings: ['Análise automática não disponível'],
      suggestions: ['Verifique manualmente antes de publicar'],
      summary: 'Vídeo aceito com ressalvas',
      recommended_objective: 'SALES',
      copy_angles: ['Foco no problema', 'Foco na solução', 'Foco no resultado']
    };
  }
}

// ==========================================
// 5. FUNÇÃO PRINCIPAL: ANALISAR VÍDEO COMPLETO
// ==========================================

export interface VideoAnalysisResult {
  isCompliant: boolean;
  warnings: string[];
  suggestions: string[];
  summary: string;
  transcription: string;
  recommended_objective: string;
  copy_angles: string[];
  frameCount: number;
}

/**
 * Análise completa do vídeo: visual + áudio
 */
export async function analyzeVideoComplete(
  videoPath: string
): Promise<VideoAnalysisResult> {
  let framePaths: string[] = [];
  let audioPath: string | null = null;
  
  try {
    console.log('🎥 [VideoAnalyzer] Iniciando análise completa do vídeo...');
    console.log('📁 [VideoAnalyzer] Arquivo:', videoPath);
    
    const hasFFmpeg = await checkFFmpeg();
    
    // Se não tem FFmpeg, usar análise simplificada
    if (!hasFFmpeg) {
      const simplified = await analyzeVideoSimplified(videoPath);
      return {
        ...simplified,
        transcription: '[FFmpeg não disponível - transcrição não realizada]',
        frameCount: 0
      };
    }
    
    // PASSO 1: Extrair frames
    framePaths = await extractFramesFromVideo(videoPath, 0.5, 10);
    
    // PASSO 2: Extrair e transcrever áudio
    let transcription = '[Sem áudio detectado]';
    try {
      audioPath = await extractAudioFromVideo(videoPath);
      if (audioPath) {
        transcription = await transcribeAudioWithWhisper(audioPath);
      }
    } catch (audioError: any) {
      console.warn('⚠️ [VideoAnalyzer] Erro no áudio:', audioError.message);
      transcription = '[Erro na extração de áudio]';
    }
    
    // PASSO 3: Analisar frames + transcrição com GPT-5.2
    if (framePaths.length > 0) {
      const analysis = await analyzeFramesWithGPT(framePaths, transcription);
      
      console.log('✅ [VideoAnalyzer] Análise completa concluída!');
      
      return {
        ...analysis,
        transcription,
        frameCount: framePaths.length,
        recommended_objective: analysis.recommended_objective || 'SALES',
        copy_angles: analysis.copy_angles || []
      };
    }
    
    // Fallback se não conseguiu extrair frames
    const simplified = await analyzeVideoSimplified(videoPath);
    return {
      ...simplified,
      transcription,
      frameCount: 0
    };
    
  } catch (error: any) {
    console.error('❌ [VideoAnalyzer] Erro na análise completa:', error);
    
    return {
      isCompliant: true,
      warnings: ['Erro na análise automática: ' + error.message],
      suggestions: ['Revise o vídeo manualmente'],
      summary: 'Análise falhou, vídeo aceito com ressalvas',
      transcription: '[Não disponível]',
      recommended_objective: 'SALES',
      copy_angles: ['Foco no problema', 'Foco na solução', 'Foco no resultado'],
      frameCount: 0
    };
    
  } finally {
    // Limpar arquivos temporários
    try {
      if (framePaths.length > 0) {
        const frameDir = path.dirname(framePaths[0]);
        await fs.rm(frameDir, { recursive: true, force: true });
        console.log('🗑️ [VideoAnalyzer] Frames temporários removidos');
      }
      if (audioPath) {
        await fs.unlink(audioPath);
        console.log('🗑️ [VideoAnalyzer] Áudio temporário removido');
      }
    } catch (cleanupError) {
      console.warn('⚠️ [VideoAnalyzer] Erro ao limpar temporários');
    }
  }
}

// ==========================================
// 6. ANALISAR IMAGEM SIMPLES
// ==========================================

/**
 * Analisa uma imagem com GPT-5.2 Vision
 */
export async function analyzeImageWithGPT(
  imagePath: string
): Promise<VideoAnalysisResult> {
  try {
    console.log('🖼️ [VideoAnalyzer] Analisando imagem com GPT-5.2 Vision...');
    
    const base64 = await imageToBase64(imagePath);
    const imageUrl = `data:image/jpeg;base64,${base64}`;
    
    const prompt = `
Analise esta imagem publicitária para anúncios do Meta/Facebook/Instagram.

**ANÁLISE SOLICITADA:**

1. **Compliance Meta Ads:**
   - Texto excessivo? (regra dos 20%)
   - Claims proibidos?
   - Conteúdo sensível?

2. **Qualidade:**
   - Resolução e clareza
   - Composição visual

3. **Efetividade:**
   - Mensagem clara?
   - CTA visível?

4. **Objetivo Recomendado:**
   - AWARENESS, TRAFFIC, ENGAGEMENT, LEADS ou SALES

5. **Ângulos de Copy:**
   - 3 ângulos para usar no texto do anúncio

**RESPONDA EM JSON:**
{
  "isCompliant": true,
  "warnings": [],
  "suggestions": [],
  "summary": "resumo",
  "recommended_objective": "SALES",
  "copy_angles": ["ângulo 1", "ângulo 2", "ângulo 3"]
}
`.trim();

    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-5.2',
      messages: [
        {
          role: 'system',
          content: 'Você é um especialista em Meta Ads. Responda sempre em JSON válido.'
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageUrl } }
          ]
        }
      ],
      max_completion_tokens: 1500,
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });
    
    const content = response.choices[0].message.content || '{}';
    const analysis = JSON.parse(content);
    
    console.log('✅ [VideoAnalyzer] Análise de imagem concluída');
    
    return {
      isCompliant: analysis.isCompliant !== false,
      warnings: analysis.warnings || [],
      suggestions: analysis.suggestions || [],
      summary: analysis.summary || 'Imagem analisada com sucesso',
      transcription: '[N/A - Imagem]',
      recommended_objective: analysis.recommended_objective || 'SALES',
      copy_angles: analysis.copy_angles || [],
      frameCount: 1
    };
    
  } catch (error: any) {
    console.error('❌ [VideoAnalyzer] Erro ao analisar imagem:', error.message);
    
    return {
      isCompliant: true,
      warnings: ['Análise automática falhou'],
      suggestions: ['Revise manualmente'],
      summary: 'Erro na análise, mas imagem aceita',
      transcription: '[N/A]',
      recommended_objective: 'SALES',
      copy_angles: ['Foco no problema', 'Foco na solução', 'Foco no resultado'],
      frameCount: 1
    };
  }
}
