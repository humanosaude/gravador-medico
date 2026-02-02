'use client';

// =====================================================
// ADS LAUNCHER PRO - COCKPIT DE CONTROLE PROFISSIONAL
// =====================================================
// Interface avançada para criação de campanhas com:
// - Configuração de IA (GPT-5.2)
// - Meta Advantage+ vs Segmentação Manual
// - Estratégias de Público (Lookalike, Remarketing, etc)
// - Pipeline assíncrono de vídeos
// - Sistema de 2 Etapas: Gerar Prompt → Publicar
// =====================================================

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  Image as ImageIcon,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Rocket,
  Target,
  DollarSign,
  Users,
  Sparkles,
  ExternalLink,
  Film,
  Brain,
  Zap,
  Settings2,
  ChevronDown,
  ChevronUp,
  Link2,
  Eye,
  Globe,
  UserCheck,
  RefreshCcw,
  Video,
  TrendingUp,
  ShoppingCart,
  Crosshair,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import AdPreviewCard, { type AdPreviewData } from './AdPreviewCard';

// =====================================================
// TIPOS
// =====================================================

interface UploadedFile {
  id: string;
  file: File;
  preview: string;
  type: 'image' | 'video';
}

interface CampaignResult {
  success: boolean;
  data?: {
    campaign: { id: string; name: string; funnelStage: string };
    adset: { id: string; dailyBudget: number };
    creatives: number;
    ads: { count: number; ids: string[] };
    media: { images: number; videos: number; videosProcessing?: number };
  };
  message?: string;
  error?: string;
}

type LaunchStatus = 'idle' | 'uploading' | 'generating' | 'creating' | 'success' | 'error';

// =====================================================
// CONFIGURAÇÕES
// =====================================================

const AUDIENCE_STRATEGIES = [
  {
    value: 'COLD_WINNER',
    label: '🧊 Frio Inteligente (Winner)',
    description: 'Público aberto + Exclusão de compradores',
    icon: Globe,
    color: 'text-blue-400',
  },
  {
    value: 'LOOKALIKE_AUTO',
    label: '👥 Lookalike Automático',
    description: 'Cria LAL 1% dos compradores automaticamente',
    icon: UserCheck,
    color: 'text-purple-400',
  },
  {
    value: 'REMARKETING_VIDEO',
    label: '🎬 Remarketing Vídeo',
    description: 'Pessoas que assistiram 50% dos seus vídeos',
    icon: Video,
    color: 'text-pink-400',
  },
  {
    value: 'REMARKETING_HOT',
    label: '🔥 Remarketing Quente',
    description: 'Visitantes site 30D + Abandonos checkout',
    icon: ShoppingCart,
    color: 'text-orange-400',
  },
];

const FUNNEL_STAGES = [
  { value: 'TOPO', label: '🔵 Topo', description: 'Alcance e Awareness' },
  { value: 'MEIO', label: '🟡 Meio', description: 'Engajamento e Consideração' },
  { value: 'FUNDO', label: '🟢 Fundo', description: 'Conversão e Vendas' },
];

const BRAZILIAN_STATES = [
  { value: 'BR', label: '🇧🇷 Brasil Todo' },
  { value: 'SP', label: 'São Paulo' },
  { value: 'RJ', label: 'Rio de Janeiro' },
  { value: 'MG', label: 'Minas Gerais' },
  { value: 'RS', label: 'Rio Grande do Sul' },
  { value: 'PR', label: 'Paraná' },
  { value: 'SC', label: 'Santa Catarina' },
  { value: 'BA', label: 'Bahia' },
  { value: 'DF', label: 'Distrito Federal' },
  { value: 'GO', label: 'Goiás' },
  { value: 'PE', label: 'Pernambuco' },
  { value: 'CE', label: 'Ceará' },
];

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export default function AdsLauncherPro() {
  // Estados Básicos
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [objective, setObjective] = useState('');
  const [dailyBudget, setDailyBudget] = useState('30');
  const [linkUrl, setLinkUrl] = useState('');
  const [publishStatus, setPublishStatus] = useState<'PAUSED' | 'ACTIVE'>('PAUSED');
  const [status, setStatus] = useState<LaunchStatus>('idle');
  const [result, setResult] = useState<CampaignResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Estados de Targeting
  const [useAdvantagePlus, setUseAdvantagePlus] = useState(true);
  const [ageMin, setAgeMin] = useState('25');
  const [ageMax, setAgeMax] = useState('55');
  const [gender, setGender] = useState<'ALL' | 'MALE' | 'FEMALE'>('ALL');
  const [location, setLocation] = useState('BR');

  // Estados de Estratégia
  const [audienceStrategy, setAudienceStrategy] = useState('COLD_WINNER');
  const [funnelStage, setFunnelStage] = useState('TOPO');

  // Estados de Preview
  const [showPreview, setShowPreview] = useState(false);
  const [previews, setPreviews] = useState<AdPreviewData[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);

  // Estados do Sistema de 2 Etapas (Meta-Prompt)
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [promptGenerated, setPromptGenerated] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // =====================================================
  // HANDLERS
  // =====================================================

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      file => file.type.startsWith('image/') || file.type.startsWith('video/')
    );
    addFiles(droppedFiles);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files));
    }
  }, []);

  const addFiles = (newFiles: File[]) => {
    const uploadedFiles: UploadedFile[] = newFiles.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      preview: URL.createObjectURL(file),
      type: file.type.startsWith('video/') ? 'video' : 'image',
    }));
    setFiles(prev => [...prev, ...uploadedFiles].slice(0, 10));
  };

  const removeFile = (id: string) => {
    setFiles(prev => {
      const removed = prev.find(f => f.id === id);
      if (removed) URL.revokeObjectURL(removed.preview);
      return prev.filter(f => f.id !== id);
    });
    // Reset preview quando arquivos mudam
    setPreviewReady(false);
    setPreviews([]);
  };

  // =====================================================
  // SISTEMA DE 2 ETAPAS: GERAR PROMPT COM IA
  // =====================================================

  const handleGeneratePrompt = async () => {
    if (!objective.trim()) return;

    setIsGeneratingPrompt(true);
    
    try {
      const response = await fetch('/api/ads/generate-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objective,
          funnelStage,
          audienceStrategy,
          targetAudience: 'Profissionais da saúde',
          productName: 'Gravador Médico',
        }),
      });

      const data = await response.json();
      
      if (data.success && data.prompt) {
        setGeneratedPrompt(data.prompt);
        setPromptGenerated(true);
      } else {
        // Fallback com prompt básico
        setGeneratedPrompt(`Crie 3 anúncios persuasivos para: ${objective}\n\nFoco: ${funnelStage === 'TOPO' ? 'Awareness e alcance' : funnelStage === 'MEIO' ? 'Engajamento e consideração' : 'Conversão e vendas'}\n\nPúblico: Profissionais da saúde interessados em otimização de tempo`);
        setPromptGenerated(true);
      }
    } catch (error) {
      console.error('Erro ao gerar prompt:', error);
      // Fallback
      setGeneratedPrompt(`Crie 3 anúncios persuasivos para: ${objective}\n\nFoco: ${funnelStage === 'TOPO' ? 'Awareness e alcance' : funnelStage === 'MEIO' ? 'Engajamento e consideração' : 'Conversão e vendas'}`);
      setPromptGenerated(true);
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

  // =====================================================
  // GERAR PRÉVIAS COM IA
  // =====================================================

  const generatePreviews = async () => {
    if (files.length === 0 || !objective) return;

    setPreviewLoading(true);
    setShowPreview(true);

    try {
      // Primeiro, upload temporário para Supabase
      const mediaUrls: Array<{ url: string; type: 'image' | 'video' }> = [];
      
      for (const file of files) {
        // Upload para Supabase storage
        const formData = new FormData();
        formData.append('file', file.file);
        
        const uploadRes = await fetch('/api/upload-temp', {
          method: 'POST',
          body: formData,
        });
        
        if (uploadRes.ok) {
          const { url } = await uploadRes.json();
          mediaUrls.push({ url, type: file.type });
        } else {
          // Fallback: usar preview local (pode não funcionar com Vision)
          mediaUrls.push({ url: file.preview, type: file.type });
        }
      }

      // Gerar previews com a API
      const response = await fetch('/api/ads/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaUrls,
          objective,
          targetAudience: 'Profissionais da saúde',
        }),
      });

      const data = await response.json();

      if (data.success && data.previews) {
        const previewData: AdPreviewData[] = data.previews.map((p: any) => ({
          pageName: 'Gravador Médico',
          primaryText: p.primaryText,
          headline: p.headline,
          mediaUrl: p.mediaUrl,
          mediaType: p.mediaType || 'image',
          ctaText: funnelStage === 'FUNDO' ? 'Comprar Agora' : 'Saiba Mais',
          linkUrl: linkUrl || 'gravador-medico.com.br',
        }));

        setPreviews(previewData);
        setPreviewReady(true);
        setCurrentPreviewIndex(0);
      }
    } catch (error) {
      console.error('Erro ao gerar prévias:', error);
      // Fallback com dados básicos
      const fallbackPreviews: AdPreviewData[] = files.map(f => ({
        pageName: 'Gravador Médico',
        primaryText: `🎯 ${objective} - Descubra como milhares de profissionais estão transformando suas carreiras!`,
        headline: objective.split(' ').slice(0, 4).join(' '),
        mediaUrl: f.preview,
        mediaType: f.type,
        ctaText: 'Saiba Mais',
        linkUrl: linkUrl || 'gravador-medico.com.br',
      }));
      setPreviews(fallbackPreviews);
      setPreviewReady(true);
    } finally {
      setPreviewLoading(false);
    }
  };

  const regenerateCurrentPreview = async () => {
    if (currentPreviewIndex >= files.length) return;
    
    setPreviewLoading(true);
    
    try {
      const file = files[currentPreviewIndex];
      const response = await fetch('/api/ads/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaUrls: [{ url: file.preview, type: file.type }],
          objective,
          targetAudience: 'Profissionais da saúde',
        }),
      });

      const data = await response.json();
      
      if (data.success && data.previews?.[0]) {
        setPreviews(prev => {
          const newPreviews = [...prev];
          newPreviews[currentPreviewIndex] = {
            ...newPreviews[currentPreviewIndex],
            primaryText: data.previews[0].primaryText,
            headline: data.previews[0].headline,
          };
          return newPreviews;
        });
      }
    } catch (error) {
      console.error('Erro ao regenerar:', error);
    } finally {
      setPreviewLoading(false);
    }
  };

  // =====================================================
  // SUBMISSÃO (ETAPA 2)
  // =====================================================

  const handleLaunch = async () => {
    if (files.length === 0 || !objective) return;

    try {
      setStatus('uploading');
      setResult(null);

      const formData = new FormData();
      
      // Dados básicos
      formData.append('objective', objective);
      formData.append('dailyBudget', dailyBudget);
      formData.append('status', publishStatus);
      formData.append('funnel_stage', funnelStage);
      if (linkUrl) formData.append('linkUrl', linkUrl);

      // Prompt gerado na Etapa 1 (se existir)
      if (promptGenerated && generatedPrompt) {
        formData.append('customPrompt', generatedPrompt);
      }

      // Targeting
      formData.append('use_advantage_plus', String(useAdvantagePlus));
      formData.append('audience_strategy', audienceStrategy);
      
      if (!useAdvantagePlus) {
        formData.append('age_min', ageMin);
        formData.append('age_max', ageMax);
        formData.append('gender', gender);
        formData.append('location', location);
      }

      // Arquivos
      files.forEach((f, i) => {
        formData.append(f.type === 'video' ? `video${i}` : `image${i}`, f.file);
      });

      setStatus('generating');

      const response = await fetch('/api/ads/launch-v2', {
        method: 'POST',
        body: formData,
      });

      setStatus('creating');
      const data = await response.json();

      if (data.success) {
        setStatus('success');
        setResult(data);
      } else {
        setStatus('error');
        setResult(data);
      }
    } catch (error: unknown) {
      setStatus('error');
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  };

  const resetForm = () => {
    setFiles([]);
    setObjective('');
    setDailyBudget('30');
    setStatus('idle');
    setResult(null);
    setGeneratedPrompt('');
    setPromptGenerated(false);
  };

  const isProcessing = ['uploading', 'generating', 'creating'].includes(status);

  // =====================================================
  // RENDERIZAÇÃO
  // =====================================================

  return (
    <div className="space-y-6">
      {/* Header Principal */}
      <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur">
              <Rocket className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Cockpit de Anúncios</h1>
              <p className="text-purple-100">Crie campanhas otimizadas com IA em segundos</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-lg backdrop-blur">
            <Brain className="w-5 h-5 text-green-300" />
            <span className="text-white font-medium">GPT-5.2 Vision</span>
          </div>
        </div>
      </div>

      {/* Status de Processamento */}
      <AnimatePresence>
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-purple-900/50 rounded-xl p-6 border border-purple-700/50 backdrop-blur"
          >
            <div className="flex items-center gap-4">
              <div className="relative">
                <Loader2 className="w-10 h-10 text-purple-400 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Brain className="w-5 h-5 text-purple-200" />
                </div>
              </div>
              <div>
                <p className="text-lg font-semibold text-purple-100">
                  {status === 'uploading' && '📤 Enviando arquivos...'}
                  {status === 'generating' && '🤖 GPT-5.2 Vision gerando copys otimizadas...'}
                  {status === 'creating' && '🚀 Criando campanha no Meta...'}
                </p>
                <p className="text-purple-300">
                  {status === 'uploading' && files.some(f => f.type === 'video')
                    ? 'Vídeos serão processados em background'
                    : 'Aguarde alguns segundos...'}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Resultado Sucesso */}
      <AnimatePresence>
        {status === 'success' && result?.data && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-green-900/40 rounded-xl p-6 border border-green-700/50"
          >
            <div className="flex items-start gap-4">
              <CheckCircle2 className="w-10 h-10 text-green-400" />
              <div className="flex-1">
                <h3 className="text-xl font-bold text-green-100">
                  🎉 Campanha Criada com Sucesso!
                </h3>
                <p className="text-green-300 mt-1">{result.message}</p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <p className="text-sm text-gray-400">Campanha</p>
                    <p className="text-white font-medium truncate">{result.data.campaign.name}</p>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <p className="text-sm text-gray-400">Orçamento</p>
                    <p className="text-white font-medium">R$ {result.data.adset.dailyBudget}/dia</p>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <p className="text-sm text-gray-400">Anúncios</p>
                    <p className="text-white font-medium">{result.data.ads.count} criados</p>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <p className="text-sm text-gray-400">Mídia</p>
                    <p className="text-white font-medium">
                      {result.data.media.images} img, {result.data.media.videos} vid
                    </p>
                  </div>
                </div>

                {result.data.media.videosProcessing && result.data.media.videosProcessing > 0 && (
                  <div className="mt-4 p-3 bg-yellow-900/30 border border-yellow-700/50 rounded-lg flex items-center gap-3">
                    <RefreshCcw className="w-5 h-5 text-yellow-400 animate-spin" />
                    <p className="text-yellow-200">
                      {result.data.media.videosProcessing} vídeo(s) processando em background. 
                      Serão publicados automaticamente em até 10 minutos.
                    </p>
                  </div>
                )}

                <div className="flex gap-3 mt-6">
                  <a
                    href="https://business.facebook.com/adsmanager"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Ver no Ads Manager
                  </a>
                  <button
                    onClick={resetForm}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
                  >
                    Nova Campanha
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Resultado Erro */}
      <AnimatePresence>
        {status === 'error' && result && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-red-900/40 rounded-xl p-6 border border-red-700/50"
          >
            <div className="flex items-start gap-4">
              <AlertCircle className="w-10 h-10 text-red-400" />
              <div>
                <h3 className="text-xl font-bold text-red-100">❌ Erro ao Criar Campanha</h3>
                <p className="text-red-300 mt-2">{result.error}</p>
                <button
                  onClick={() => setStatus('idle')}
                  className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
                >
                  Tentar Novamente
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Formulário Principal */}
      {status === 'idle' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna 1: Upload e Objetivo */}
          <div className="lg:col-span-2 space-y-6">
            {/* Card de Upload */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-800 flex items-center gap-3">
                <Upload className="w-5 h-5 text-purple-400" />
                <h3 className="font-semibold text-white">Criativos</h3>
              </div>
              
              <div className="p-6">
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all',
                    isDragging
                      ? 'border-purple-500 bg-purple-900/30'
                      : 'border-gray-700 hover:border-purple-500 hover:bg-gray-800/50'
                  )}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <div className="flex items-center justify-center gap-4 mb-4">
                    <ImageIcon className="w-10 h-10 text-blue-400" />
                    <span className="text-2xl text-gray-500">+</span>
                    <Film className="w-10 h-10 text-pink-400" />
                  </div>
                  <p className="text-lg font-medium text-white">
                    Arraste imagens ou vídeos
                  </p>
                  <p className="text-sm text-gray-400 mt-2">
                    JPG, PNG, WebP, MP4, MOV • Máx 10 arquivos
                  </p>
                </div>

                {/* Previews */}
                {files.length > 0 && (
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 mt-4">
                    {files.map(file => (
                      <div key={file.id} className="relative group aspect-square rounded-lg overflow-hidden bg-gray-800">
                        {file.type === 'video' ? (
                          <div className="relative w-full h-full">
                            <video src={file.preview} className="w-full h-full object-cover" muted />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                              <Film className="w-6 h-6 text-white" />
                            </div>
                          </div>
                        ) : (
                          <img src={file.preview} alt="" className="w-full h-full object-cover" />
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); removeFile(file.id); }}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Card de Objetivo */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-800 flex items-center gap-3">
                <Target className="w-5 h-5 text-purple-400" />
                <h3 className="font-semibold text-white">Objetivo da Campanha</h3>
              </div>
              <div className="p-6 space-y-4">
                <input
                  type="text"
                  value={objective}
                  onChange={(e) => {
                    setObjective(e.target.value);
                    // Reset prompt quando objetivo muda
                    setPromptGenerated(false);
                    setGeneratedPrompt('');
                  }}
                  placeholder="Ex: Venda do Gravador Médico para Cardiologistas"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                
                {/* Botão Gerar Prompt com IA */}
                <button
                  onClick={handleGeneratePrompt}
                  disabled={!objective.trim() || isGeneratingPrompt}
                  className={cn(
                    'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all',
                    objective.trim() && !isGeneratingPrompt
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700'
                      : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  )}
                >
                  {isGeneratingPrompt ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      GPT-5.2 gerando prompt profissional...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      🎯 Gerar Prompt com IA (Etapa 1)
                    </>
                  )}
                </button>

                {/* Área do Prompt Gerado - Editável */}
                <AnimatePresence>
                  {promptGenerated && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-green-400 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" />
                          Prompt Gerado - Edite se necessário:
                        </label>
                        <button
                          onClick={handleGeneratePrompt}
                          disabled={isGeneratingPrompt}
                          className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
                        >
                          <RefreshCcw className="w-3 h-3" />
                          Regenerar
                        </button>
                      </div>
                      <textarea
                        value={generatedPrompt}
                        onChange={(e) => setGeneratedPrompt(e.target.value)}
                        rows={6}
                        className="w-full px-4 py-3 bg-gray-800 border border-green-600/50 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                        placeholder="O prompt profissional aparecerá aqui..."
                      />
                      <p className="text-xs text-gray-500">
                        💡 Você pode editar o prompt antes de publicar. Na Etapa 2, este prompt será usado para gerar as copys finais.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <p className="text-sm text-gray-400">
                  {promptGenerated 
                    ? '✅ Prompt pronto! Ajuste se quiser e clique em Publicar (Etapa 2)'
                    : 'Digite o objetivo e clique para gerar um prompt profissional com GPT-5.2 Vision'
                  }
                </p>
              </div>
            </div>

            {/* Card de Estratégia de Público */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-800 flex items-center gap-3">
                <Crosshair className="w-5 h-5 text-purple-400" />
                <h3 className="font-semibold text-white">Estratégia de Público</h3>
              </div>
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {AUDIENCE_STRATEGIES.map(strategy => (
                  <button
                    key={strategy.value}
                    onClick={() => setAudienceStrategy(strategy.value)}
                    className={cn(
                      'p-4 rounded-xl border text-left transition-all',
                      audienceStrategy === strategy.value
                        ? 'border-purple-500 bg-purple-900/30'
                        : 'border-gray-700 hover:border-gray-600 bg-gray-800/50'
                    )}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <strategy.icon className={cn('w-5 h-5', strategy.color)} />
                      <span className="font-medium text-white">{strategy.label}</span>
                    </div>
                    <p className="text-sm text-gray-400">{strategy.description}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Coluna 2: Configurações */}
          <div className="space-y-6">
            {/* Card Funil */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-800 flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-purple-400" />
                <h3 className="font-semibold text-white">Estágio do Funil</h3>
              </div>
              <div className="p-4 space-y-2">
                {FUNNEL_STAGES.map(stage => (
                  <button
                    key={stage.value}
                    onClick={() => setFunnelStage(stage.value)}
                    className={cn(
                      'w-full p-3 rounded-lg border text-left transition-all',
                      funnelStage === stage.value
                        ? 'border-purple-500 bg-purple-900/30'
                        : 'border-gray-700 hover:border-gray-600'
                    )}
                  >
                    <span className="font-medium text-white">{stage.label}</span>
                    <span className="text-sm text-gray-400 ml-2">{stage.description}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Card Orçamento */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-800 flex items-center gap-3">
                <DollarSign className="w-5 h-5 text-green-400" />
                <h3 className="font-semibold text-white">Orçamento Diário</h3>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">R$</span>
                  <input
                    type="number"
                    value={dailyBudget}
                    onChange={(e) => setDailyBudget(e.target.value)}
                    min="6"
                    className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white text-xl font-bold text-center focus:ring-2 focus:ring-purple-500"
                  />
                  <span className="text-gray-400">/dia</span>
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">Mínimo: R$ 6,00</p>
              </div>
            </div>

            {/* Card Targeting */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Settings2 className="w-5 h-5 text-purple-400" />
                  <h3 className="font-semibold text-white">Targeting</h3>
                </div>
                <button
                  onClick={() => setUseAdvantagePlus(!useAdvantagePlus)}
                  className={cn(
                    'relative w-12 h-6 rounded-full transition-colors',
                    useAdvantagePlus ? 'bg-purple-600' : 'bg-gray-600'
                  )}
                >
                  <div className={cn(
                    'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform',
                    useAdvantagePlus ? 'translate-x-7' : 'translate-x-1'
                  )} />
                </button>
              </div>
              <div className="p-4">
                <div className={cn(
                  'p-3 rounded-lg mb-4',
                  useAdvantagePlus ? 'bg-purple-900/30 border border-purple-700/50' : 'bg-gray-800'
                )}>
                  <div className="flex items-center gap-2">
                    <Zap className={cn('w-4 h-4', useAdvantagePlus ? 'text-purple-400' : 'text-gray-500')} />
                    <span className={cn('font-medium', useAdvantagePlus ? 'text-purple-300' : 'text-gray-400')}>
                      {useAdvantagePlus ? 'Advantage+ Ativo' : 'Segmentação Manual'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {useAdvantagePlus
                      ? 'A Meta otimiza o público automaticamente com IA'
                      : 'Você define idade, gênero e localização'}
                  </p>
                </div>

                {/* Campos Manuais */}
                <AnimatePresence>
                  {!useAdvantagePlus && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="space-y-4 overflow-hidden"
                    >
                      {/* Idade */}
                      <div>
                        <label className="text-sm text-gray-400 mb-2 block">Idade</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={ageMin}
                            onChange={(e) => setAgeMin(e.target.value)}
                            min="18"
                            max="65"
                            className="w-20 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-center"
                          />
                          <span className="text-gray-500">até</span>
                          <input
                            type="number"
                            value={ageMax}
                            onChange={(e) => setAgeMax(e.target.value)}
                            min="18"
                            max="65"
                            className="w-20 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-center"
                          />
                        </div>
                      </div>

                      {/* Gênero */}
                      <div>
                        <label className="text-sm text-gray-400 mb-2 block">Gênero</label>
                        <div className="flex gap-2">
                          {[
                            { value: 'ALL', label: 'Todos' },
                            { value: 'MALE', label: 'Homens' },
                            { value: 'FEMALE', label: 'Mulheres' },
                          ].map(g => (
                            <button
                              key={g.value}
                              onClick={() => setGender(g.value as 'ALL' | 'MALE' | 'FEMALE')}
                              className={cn(
                                'flex-1 py-2 rounded-lg border text-sm transition',
                                gender === g.value
                                  ? 'border-purple-500 bg-purple-900/30 text-white'
                                  : 'border-gray-700 text-gray-400 hover:border-gray-600'
                              )}
                            >
                              {g.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Localização */}
                      <div>
                        <label className="text-sm text-gray-400 mb-2 block">Localização</label>
                        <select
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                        >
                          {BRAZILIAN_STATES.map(state => (
                            <option key={state.value} value={state.value}>
                              {state.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Opções Avançadas */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-800/50 transition"
              >
                <span className="text-gray-400 text-sm">Opções Avançadas</span>
                {showAdvanced ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>
              
              <AnimatePresence>
                {showAdvanced && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 pt-0 space-y-4">
                      {/* URL de Destino */}
                      <div>
                        <label className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                          <Link2 className="w-4 h-4" />
                          URL de Destino
                        </label>
                        <input
                          type="url"
                          value={linkUrl}
                          onChange={(e) => setLinkUrl(e.target.value)}
                          placeholder="https://..."
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 text-sm"
                        />
                      </div>

                      {/* Status */}
                      <div>
                        <label className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                          <Eye className="w-4 h-4" />
                          Status ao Publicar
                        </label>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setPublishStatus('PAUSED')}
                            className={cn(
                              'flex-1 py-2 rounded-lg border text-sm transition',
                              publishStatus === 'PAUSED'
                                ? 'border-yellow-500 bg-yellow-900/30 text-yellow-300'
                                : 'border-gray-700 text-gray-400'
                            )}
                          >
                            ⏸️ Pausado
                          </button>
                          <button
                            onClick={() => setPublishStatus('ACTIVE')}
                            className={cn(
                              'flex-1 py-2 rounded-lg border text-sm transition',
                              publishStatus === 'ACTIVE'
                                ? 'border-green-500 bg-green-900/30 text-green-300'
                                : 'border-gray-700 text-gray-400'
                            )}
                          >
                            ▶️ Ativo
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Botões de Ação */}
            <div className="space-y-3">
              {/* Botão Gerar Prévias */}
              {!previewReady && (
                <button
                  onClick={generatePreviews}
                  disabled={files.length === 0 || !objective || previewLoading}
                  className={cn(
                    'w-full py-4 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-3 shadow-lg',
                    files.length === 0 || !objective
                      ? 'bg-gray-700 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 hover:shadow-blue-500/25'
                  )}
                >
                  {previewLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Gerando Prévias...
                    </>
                  ) : (
                    <>
                      <Eye className="w-5 h-5" />
                      Gerar Prévias com IA
                      {files.length > 0 && (
                        <span className="px-2 py-0.5 bg-white/20 rounded-full text-sm">
                          {files.length} arquivo{files.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </>
                  )}
                </button>
              )}

              {/* Botão Publicar (só aparece após prévias prontas) */}
              {previewReady && (
                <button
                  onClick={handleLaunch}
                  disabled={isProcessing}
                  className={cn(
                    'w-full py-4 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-3 shadow-lg',
                    isProcessing
                      ? 'bg-gray-700 cursor-not-allowed'
                      : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 hover:shadow-green-500/25'
                  )}
                >
                  <Rocket className="w-5 h-5" />
                  🚀 Publicar Campanha
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              )}

              {/* Botão para ver/esconder preview */}
              {previewReady && (
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="w-full py-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 transition-colors flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  {showPreview ? 'Ocultar Prévia' : 'Ver Prévia'}
                </button>
              )}
            </div>

            {/* Painel de Preview */}
            <AnimatePresence>
              {showPreview && previews.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-6 border-t border-gray-700 pt-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-semibold flex items-center gap-2">
                      <Eye className="w-5 h-5 text-blue-400" />
                      Prévia do Anúncio
                    </h3>
                    {previews.length > 1 && (
                      <div className="flex items-center gap-2">
                        {previews.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => setCurrentPreviewIndex(idx)}
                            className={cn(
                              'w-8 h-8 rounded-full text-sm font-medium transition-colors',
                              idx === currentPreviewIndex
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                            )}
                          >
                            {idx + 1}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-center">
                    <AdPreviewCard
                      preview={previews[currentPreviewIndex]}
                      variant="feed"
                      onRegenerate={regenerateCurrentPreview}
                      isLoading={previewLoading}
                    />
                  </div>

                  <p className="text-center text-gray-400 text-sm mt-4">
                    💡 Clique em &quot;Gerar nova copy&quot; se quiser outra versão
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
