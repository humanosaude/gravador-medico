'use client';

// =====================================================
// ADS LAUNCHER PRO - COCKPIT COM FASES BLOQUEADAS
// =====================================================
// Sistema de criação de campanhas com fases sequenciais:
// FASE 1: Formato → FASE 2: Upload + Análise → FASE 3: Objetivo → FASE 4: Copies
// Cada fase só desbloqueia após completar a anterior.
// Modelo de IA: GPT-5.2 Vision
// =====================================================

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  Image as ImageIcon,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Rocket,
  Target,
  DollarSign,
  Sparkles,
  ExternalLink,
  Brain,
  Zap,
  Settings2,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Link2,
  Eye,
  Globe,
  UserCheck,
  RefreshCcw,
  Video,
  TrendingUp,
  ShoppingCart,
  Trophy,
  Lightbulb,
  Lock,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

// =====================================================
// TIPOS
// =====================================================

type CreativeFormat = 'IMAGE' | 'VIDEO' | 'CAROUSEL';
type ObjectiveType = 'TRAFEGO' | 'CONVERSAO' | 'REMARKETING';
type LaunchStatus = 'idle' | 'uploading' | 'analyzing' | 'generating' | 'creating' | 'success' | 'error';

interface Phase {
  id: number;
  name: string;
  description: string;
  isCompleted: boolean;
  isActive: boolean;
  isLocked: boolean;
}

interface UploadedFile {
  id: string;
  file: File;
  preview: string;
  type: 'image' | 'video';
}

interface CreativeAnalysis {
  format: 'IMAGE' | 'VIDEO' | 'CAROUSEL';
  visual_elements: string[];
  colors: string[];
  text_in_image: string | null;
  mood: string;
  recommended_objective: ObjectiveType;
  recommendation_confidence: number;
  recommendation_reasoning: string;
  recommended_angles: string[];
  copywriting_suggestions: string[];
  technical_details: {
    has_people: boolean;
    has_product: boolean;
    has_text_overlay: boolean;
    is_professional_photo: boolean;
    visual_quality_score: number;
  };
  warnings: string[];
  optimization_tips: string[];
}

interface CopyVariation {
  id: number;
  primary_text: string;
  headline: string;
  cta: string;
  predicted_performance: number;
  performance_label: string;
  reasoning: string;
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

// =====================================================
// CONFIGURAÇÕES
// =====================================================

const FUNNEL_STAGES = [
  { 
    value: 'TOPO', 
    label: '🔵 Topo de Funil', 
    emoji: '🔵',
    description: 'Alcance e Awareness',
    fullDescription: 'Pessoas que ainda não conhecem seu produto. Objetivo: gerar tráfego e criar audiência para remarketing.',
    color: 'blue'
  },
  { 
    value: 'MEIO', 
    label: '🟡 Meio de Funil', 
    emoji: '🟡',
    description: 'Engajamento e Consideração',
    fullDescription: 'Pessoas que já viram seu conteúdo. Objetivo: engajar e nutrir leads com mais informações.',
    color: 'yellow'
  },
  { 
    value: 'FUNDO', 
    label: '🟢 Fundo de Funil', 
    emoji: '🟢',
    description: 'Conversão e Vendas',
    fullDescription: 'Pessoas prontas para comprar. Objetivo: conversão direta com oferta clara.',
    color: 'green'
  },
];

const CAMPAIGN_OBJECTIVES: Array<{
  value: ObjectiveType;
  label: string;
  emoji: string;
  description: string;
  funnelStage: string;
  color: string;
  borderColor: string;
  bgColor: string;
}> = [
  {
    value: 'TRAFEGO',
    label: 'Tráfego',
    emoji: '🌊',
    description: 'Gerar visitantes para remarketing',
    funnelStage: 'TOPO',
    color: 'text-blue-400',
    borderColor: 'border-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    value: 'CONVERSAO',
    label: 'Conversão',
    emoji: '💰',
    description: 'Vendas diretas do produto',
    funnelStage: 'FUNDO',
    color: 'text-green-400',
    borderColor: 'border-green-500',
    bgColor: 'bg-green-500/10',
  },
  {
    value: 'REMARKETING',
    label: 'Remarketing',
    emoji: '🎯',
    description: 'Converter quem já visitou',
    funnelStage: 'MEIO',
    color: 'text-purple-400',
    borderColor: 'border-purple-500',
    bgColor: 'bg-purple-500/10',
  },
];

const AUDIENCE_STRATEGIES = [
  {
    value: 'COLD_WINNER',
    label: '🧊 Frio Inteligente',
    description: 'Público aberto + Exclusão de compradores',
  },
  {
    value: 'LOOKALIKE_AUTO',
    label: '👥 Lookalike Automático',
    description: 'Cria LAL 1% dos compradores',
  },
  {
    value: 'REMARKETING_VIDEO',
    label: '🎬 Remarketing Vídeo',
    description: 'Assistiram 50% dos vídeos',
  },
  {
    value: 'REMARKETING_HOT',
    label: '🔥 Remarketing Quente',
    description: 'Visitantes site + Abandonos',
  },
];

// =====================================================
// HELPER: Obter Token
// =====================================================

const getAuthToken = async (): Promise<string> => {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || '';
  } catch {
    return '';
  }
};

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export default function AdsLauncherPro() {
  // Controle de Fases
  const [phases, setPhases] = useState<Phase[]>([
    { id: 1, name: 'Formato', description: 'Tipo de anúncio', isCompleted: false, isActive: true, isLocked: false },
    { id: 2, name: 'Criativo', description: 'Upload + Análise IA', isCompleted: false, isActive: false, isLocked: true },
    { id: 3, name: 'Objetivo', description: 'Estratégia', isCompleted: false, isActive: false, isLocked: true },
    { id: 4, name: 'Copies', description: 'Escolher variação', isCompleted: false, isActive: false, isLocked: true }
  ]);
  const [currentPhase, setCurrentPhase] = useState(1);

  // Fase 1
  const [format, setFormat] = useState<CreativeFormat | null>(null);
  
  // Fase 2
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [creativeUrl, setCreativeUrl] = useState('');
  const [analysis, setAnalysis] = useState<CreativeAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  // Fase 3
  const [objectiveType, setObjectiveType] = useState<ObjectiveType>('TRAFEGO');
  const [funnelStage, setFunnelStage] = useState('TOPO');
  const [additionalContext, setAdditionalContext] = useState('');
  const [isGeneratingCopies, setIsGeneratingCopies] = useState(false);
  
  // Fase 4
  const [copies, setCopies] = useState<{ variations: CopyVariation[]; generation_notes: string } | null>(null);
  const [selectedVariation, setSelectedVariation] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Configurações
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [dailyBudget, setDailyBudget] = useState('30');
  const [linkUrl, setLinkUrl] = useState('');
  const [publishStatus, setPublishStatus] = useState<'PAUSED' | 'ACTIVE'>('PAUSED');
  const [useAdvantagePlus, setUseAdvantagePlus] = useState(true);
  const [audienceStrategy, setAudienceStrategy] = useState('COLD_WINNER');

  // Publicação
  const [status, setStatus] = useState<LaunchStatus>('idle');
  const [result, setResult] = useState<CampaignResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helpers
  const completePhase = (phaseId: number) => {
    setPhases(prev => prev.map(p => {
      if (p.id === phaseId) return { ...p, isCompleted: true, isActive: false };
      if (p.id === phaseId + 1) return { ...p, isActive: true, isLocked: false };
      return p;
    }));
    if (phaseId < 4) setCurrentPhase(phaseId + 1);
  };

  const isPhaseUnlocked = (phaseId: number) => {
    const phase = phases.find(p => p.id === phaseId);
    return phase && !phase.isLocked;
  };

  const goToPhase = (phaseId: number) => {
    if (isPhaseUnlocked(phaseId) || phases.find(p => p.id === phaseId)?.isCompleted) {
      setCurrentPhase(phaseId);
    }
  };

  // Fase 1: Formato
  const handleSelectFormat = (selectedFormat: CreativeFormat) => {
    setFormat(selectedFormat);
    toast.success('Formato selecionado: ' + (selectedFormat === 'IMAGE' ? 'Imagem' : selectedFormat === 'VIDEO' ? 'Vídeo' : 'Carrossel'));
    completePhase(1);
  };

  // Fase 2: Upload
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
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) handleFileUpload(droppedFiles[0]);
  }, [format]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  const handleFileUpload = async (file: File) => {
    if (!format) return;

    const uploadedFile: UploadedFile = {
      id: Date.now().toString(),
      file,
      preview: URL.createObjectURL(file),
      type: file.type.startsWith('video/') ? 'video' : 'image',
    };
    setFiles([uploadedFile]);
    setIsAnalyzing(true);

    try {
      const token = await getAuthToken();
      const formData = new FormData();
      formData.append('format', format);
      formData.append('file', file);

      const response = await fetch('/api/ads/analyze-creative', {
        method: 'POST',
        headers: token ? { 'Authorization': 'Bearer ' + token } : {},
        body: formData
      });

      if (!response.ok) throw new Error('Erro ao analisar');

      const data = await response.json();
      
      if (data.success && data.analysis) {
        setAnalysis(data.analysis);
        setCreativeUrl(data.creative_url);
        setObjectiveType(data.analysis.recommended_objective);
        
        const objConfig = CAMPAIGN_OBJECTIVES.find(o => o.value === data.analysis.recommended_objective);
        if (objConfig) setFunnelStage(objConfig.funnelStage);
        
        toast.success('Criativo analisado com GPT-5.2!');
        completePhase(2);
      }
    } catch (error: any) {
      toast.error('Erro: ' + error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Fase 3: Copies
  const handleGenerateCopies = async () => {
    if (!analysis) return;
    setIsGeneratingCopies(true);

    try {
      const token = await getAuthToken();
      const response = await fetch('/api/ads/generate-copies', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': 'Bearer ' + token } : {})
        },
        body: JSON.stringify({
          objective_type: objectiveType,
          creative_analysis: analysis,
          additional_context: additionalContext || undefined,
          funnel_stage: funnelStage
        })
      });

      if (!response.ok) throw new Error('Erro ao gerar copies');
      const data = await response.json();
      
      if (data.success && data.variations) {
        setCopies({
          variations: data.variations,
          generation_notes: data.generation_notes || 'Copies otimizadas'
        });
        toast.success('3 variações geradas!');
        completePhase(3);
      }
    } catch (error: any) {
      toast.error('Erro: ' + error.message);
    } finally {
      setIsGeneratingCopies(false);
    }
  };

  // Fase 4: Selecionar
  const handleSelectVariation = (variationId: number) => {
    setSelectedVariation(variationId);
    setShowPreview(true);
    toast.success('Variação selecionada!');
  };

  // Publicar
  const handlePublishCampaign = async () => {
    if (!selectedVariation || !copies || files.length === 0) return;

    try {
      setStatus('creating');
      toast.loading('Publicando campanha...');

      const selectedCopy = copies.variations.find(v => v.id === selectedVariation);
      if (!selectedCopy) return;

      const token = await getAuthToken();
      const formData = new FormData();
      
      formData.append('objective', 'Campanha ' + objectiveType + ' - Gravador Médico');
      formData.append('objective_type', objectiveType);
      formData.append('dailyBudget', dailyBudget);
      formData.append('status', publishStatus);
      formData.append('funnel_stage', funnelStage);
      if (linkUrl) formData.append('linkUrl', linkUrl);
      
      formData.append('primary_text', selectedCopy.primary_text);
      formData.append('headline', selectedCopy.headline);
      formData.append('cta', selectedCopy.cta);
      
      formData.append('use_advantage_plus', String(useAdvantagePlus));
      formData.append('audience_strategy', audienceStrategy);
      
      if (creativeUrl) formData.append('creative_url', creativeUrl);
      files.forEach((f, i) => {
        formData.append(f.type === 'video' ? 'video' + i : 'image' + i, f.file);
      });

      const response = await fetch('/api/ads/launch-v2', {
        method: 'POST',
        headers: token ? { 'Authorization': 'Bearer ' + token } : {},
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        setStatus('success');
        setResult(data);
        toast.success('Campanha publicada!');
      } else {
        throw new Error(data.error || 'Erro ao publicar');
      }
    } catch (error: any) {
      setStatus('error');
      toast.error('Erro: ' + error.message);
    }
  };

  // Reset
  const resetForm = () => {
    setPhases([
      { id: 1, name: 'Formato', description: 'Tipo de anúncio', isCompleted: false, isActive: true, isLocked: false },
      { id: 2, name: 'Criativo', description: 'Upload + Análise IA', isCompleted: false, isActive: false, isLocked: true },
      { id: 3, name: 'Objetivo', description: 'Estratégia', isCompleted: false, isActive: false, isLocked: true },
      { id: 4, name: 'Copies', description: 'Escolher variação', isCompleted: false, isActive: false, isLocked: true }
    ]);
    setCurrentPhase(1);
    setFormat(null);
    setFiles([]);
    setCreativeUrl('');
    setAnalysis(null);
    setObjectiveType('TRAFEGO');
    setFunnelStage('TOPO');
    setAdditionalContext('');
    setCopies(null);
    setSelectedVariation(null);
    setShowPreview(false);
    setStatus('idle');
    setResult(null);
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur">
              <Rocket className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Cockpit de Anúncios</h1>
              <p className="text-purple-100">Sistema inteligente de criação de campanhas</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-lg backdrop-blur border border-white/20">
            <Brain className="w-5 h-5 text-green-300" />
            <span className="text-white font-medium">GPT-5.2 Vision</span>
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-gray-900/80 rounded-xl p-4 border border-gray-700">
        <div className="flex items-center gap-2">
          {phases.map((phase, index) => (
            <div key={phase.id} className="flex items-center flex-1">
              <button
                onClick={() => goToPhase(phase.id)}
                disabled={phase.isLocked && !phase.isCompleted}
                className={cn(
                  "relative flex items-center justify-center w-12 h-12 rounded-full text-sm font-bold transition-all",
                  phase.isCompleted ? 'bg-green-500 text-white cursor-pointer hover:bg-green-600' :
                  phase.isActive ? 'bg-purple-500 text-white ring-4 ring-purple-500/30' :
                  phase.isLocked ? 'bg-gray-700 text-gray-500 cursor-not-allowed' :
                  'bg-gray-600 text-gray-400 cursor-pointer hover:bg-gray-500'
                )}
              >
                {phase.isCompleted ? <CheckCircle2 className="w-6 h-6" /> :
                 phase.isLocked ? <Lock className="w-5 h-5" /> : phase.id}
              </button>
              <div className="ml-3 flex-1 min-w-0">
                <div className={cn("text-sm font-semibold truncate",
                  phase.isActive ? 'text-purple-400' : 
                  phase.isCompleted ? 'text-green-400' : 'text-gray-500'
                )}>{phase.name}</div>
                <div className="text-xs text-gray-500 truncate">{phase.description}</div>
              </div>
              {index < phases.length - 1 && (
                <ChevronRight className={cn("w-5 h-5 mx-2 flex-shrink-0",
                  phase.isCompleted ? 'text-green-400' : 'text-gray-600'
                )} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Success Result */}
      <AnimatePresence>
        {status === 'success' && result?.data && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-green-900/40 rounded-xl p-6 border border-green-700/50">
            <div className="flex items-start gap-4">
              <CheckCircle2 className="w-10 h-10 text-green-400" />
              <div className="flex-1">
                <h3 className="text-xl font-bold text-green-100">🎉 Campanha Criada com Sucesso!</h3>
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
                    <p className="text-sm text-gray-400">Estágio</p>
                    <p className="text-white font-medium">{result.data.campaign.funnelStage}</p>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <Button onClick={resetForm} className="bg-purple-600 hover:bg-purple-700">
                    <Rocket className="w-4 h-4 mr-2" />Criar Nova Campanha
                  </Button>
                  <Button variant="outline" onClick={() => window.open('https://business.facebook.com/adsmanager', '_blank')}>
                    <ExternalLink className="w-4 h-4 mr-2" />Ver no Meta Ads
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FASE 1: Formato */}
      {currentPhase === 1 && status !== 'success' && (
        <Card className="p-8 bg-gray-900/80 border-gray-700">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold text-lg">1</div>
            <div>
              <h2 className="text-xl font-semibold text-white">Escolha o Formato do Anúncio</h2>
              <p className="text-sm text-gray-400">Selecione o tipo de criativo</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button onClick={() => handleSelectFormat('IMAGE')}
              className="p-8 border-2 border-gray-700 rounded-xl hover:border-purple-500 hover:bg-purple-500/5 transition-all group text-center">
              <ImageIcon className="w-16 h-16 mx-auto mb-4 text-purple-400 group-hover:scale-110 transition" />
              <div className="font-semibold text-white text-lg">Imagem</div>
              <div className="text-sm text-gray-400 mt-2">Foto estática única</div>
              <div className="text-xs text-gray-500 mt-1">JPG, PNG, WebP</div>
            </button>
            <button onClick={() => handleSelectFormat('VIDEO')}
              className="p-8 border-2 border-gray-700 rounded-xl hover:border-blue-500 hover:bg-blue-500/5 transition-all group text-center">
              <Video className="w-16 h-16 mx-auto mb-4 text-blue-400 group-hover:scale-110 transition" />
              <div className="font-semibold text-white text-lg">Vídeo</div>
              <div className="text-sm text-gray-400 mt-2">Vídeo até 60s</div>
              <div className="text-xs text-gray-500 mt-1">MP4, MOV</div>
            </button>
            <button onClick={() => handleSelectFormat('CAROUSEL')}
              className="p-8 border-2 border-gray-700 rounded-xl hover:border-green-500 hover:bg-green-500/5 transition-all group text-center">
              <Layers className="w-16 h-16 mx-auto mb-4 text-green-400 group-hover:scale-110 transition" />
              <div className="font-semibold text-white text-lg">Carrossel</div>
              <div className="text-sm text-gray-400 mt-2">Múltiplas imagens</div>
              <div className="text-xs text-gray-500 mt-1">2-10 imagens</div>
            </button>
          </div>
        </Card>
      )}

      {/* FASE 2: Upload */}
      {currentPhase === 2 && isPhaseUnlocked(2) && status !== 'success' && (
        <Card className="p-8 bg-gray-900/80 border-gray-700">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold text-lg">2</div>
            <div>
              <h2 className="text-xl font-semibold text-white">Upload do Criativo</h2>
              <p className="text-sm text-gray-400">GPT-5.2 Vision analisará automaticamente</p>
            </div>
          </div>

          <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
            className={cn("border-2 border-dashed rounded-xl p-12 text-center transition-all",
              isDragging ? 'border-purple-500 bg-purple-500/10' : 'border-gray-700 hover:border-gray-600')}>
            <input ref={fileInputRef} type="file"
              accept={format === 'IMAGE' ? 'image/*' : format === 'VIDEO' ? 'video/*' : 'image/*'}
              onChange={handleFileSelect} className="hidden" id="file-upload" disabled={isAnalyzing} />
            <label htmlFor="file-upload" className="cursor-pointer block">
              {isAnalyzing ? (
                <div>
                  <div className="relative w-16 h-16 mx-auto mb-4">
                    <Loader2 className="w-16 h-16 text-purple-400 animate-spin" />
                    <Brain className="w-8 h-8 text-purple-200 absolute inset-0 m-auto" />
                  </div>
                  <p className="text-lg font-semibold text-white mb-2">🤖 Analisando com GPT-5.2...</p>
                  <p className="text-sm text-gray-400">Identificando elementos, cores e mood</p>
                </div>
              ) : files.length > 0 ? (
                <div>
                  <CheckCircle2 className="w-16 h-16 mx-auto text-green-500 mb-4" />
                  <p className="text-white font-medium">📎 {files[0].file.name}</p>
                  <p className="text-xs text-gray-500 mt-2">Clique para trocar</p>
                  {files[0].type === 'image' && (
                    <img src={files[0].preview} alt="Preview" className="w-32 h-32 object-cover rounded-lg mx-auto mt-4 border border-gray-700" />
                  )}
                </div>
              ) : (
                <>
                  <Upload className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                  <p className="text-white font-medium">Clique ou arraste o arquivo</p>
                  <p className="text-sm text-gray-400 mt-2">
                    {format === 'IMAGE' ? 'JPG, PNG, WebP' : format === 'VIDEO' ? 'MP4, MOV' : 'Múltiplas imagens'}
                  </p>
                </>
              )}
            </label>
          </div>
          <div className="mt-4">
            <Button variant="ghost" onClick={() => { setFormat(null); setCurrentPhase(1); }} className="text-gray-400">
              ← Voltar
            </Button>
          </div>
        </Card>
      )}

      {/* FASE 3: Objetivo */}
      {currentPhase === 3 && isPhaseUnlocked(3) && analysis && status !== 'success' && (
        <div className="space-y-6">
          {/* Análise IA */}
          <Card className="p-6 bg-gradient-to-br from-purple-900/30 to-blue-900/30 border-purple-500/30">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-purple-500/20 rounded-xl">
                <Sparkles className="w-8 h-8 text-purple-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-white text-lg mb-3">🤖 Análise GPT-5.2 Vision</h3>
                <div className="bg-black/40 rounded-lg p-4 mb-4 border-2 border-purple-500/50">
                  <div className="flex items-center gap-3 mb-2">
                    <TrendingUp className="w-6 h-6 text-green-400" />
                    <div>
                      <span className="text-sm text-gray-400">Recomendação da IA:</span>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className="text-base px-3 py-1 bg-purple-500">{analysis.recommended_objective}</Badge>
                        <span className="text-sm text-gray-300">({analysis.recommendation_confidence}% confiança)</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-300 ml-9">💡 {analysis.recommendation_reasoning}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div className="bg-black/20 rounded-lg p-3">
                    <span className="text-gray-400">Elementos:</span>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {analysis.visual_elements.slice(0, 4).map((el, i) => (
                        <Badge key={i} variant="outline" className="text-xs border-gray-600">{el}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="bg-black/20 rounded-lg p-3">
                    <span className="text-gray-400">Mood:</span>
                    <div className="mt-2 font-medium text-purple-300">{analysis.mood}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-400">Qualidade:</span>
                  <div className="flex gap-1">
                    {[...Array(10)].map((_, i) => (
                      <div key={i} className={cn("w-6 h-2 rounded",
                        i < analysis.technical_details.visual_quality_score ? 'bg-green-500' : 'bg-gray-700')} />
                    ))}
                  </div>
                  <span className="font-semibold text-white">{analysis.technical_details.visual_quality_score}/10</span>
                </div>
                {analysis.warnings && analysis.warnings.length > 0 && (
                  <Alert className="mt-4 bg-yellow-900/20 border-yellow-500/30">
                    <AlertCircle className="h-4 w-4 text-yellow-400" />
                    <AlertDescription className="text-sm text-yellow-300">{analysis.warnings.join(' • ')}</AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          </Card>

          {/* Funil */}
          <Card className="p-6 bg-gray-900/80 border-gray-700">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-400" />Estágio do Funil de Vendas
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {FUNNEL_STAGES.map((stage) => (
                <button key={stage.value} onClick={() => setFunnelStage(stage.value)}
                  className={cn("p-4 rounded-xl border-2 transition-all text-left",
                    funnelStage === stage.value ? 'border-purple-500 bg-purple-500/10' : 'border-gray-700 hover:border-gray-600')}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{stage.emoji}</span>
                    <span className="font-semibold text-white">{stage.label.replace(stage.emoji + ' ', '')}</span>
                  </div>
                  <p className="text-sm text-gray-400">{stage.fullDescription}</p>
                </button>
              ))}
            </div>

            <h4 className="font-semibold text-white mb-3">Objetivo da Campanha</h4>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {CAMPAIGN_OBJECTIVES.map((obj) => (
                <button key={obj.value} onClick={() => { setObjectiveType(obj.value); setFunnelStage(obj.funnelStage); }}
                  className={cn("p-4 rounded-xl border-2 transition-all relative",
                    objectiveType === obj.value ? obj.borderColor + ' ' + obj.bgColor : 'border-gray-700 hover:border-gray-600')}>
                  {analysis.recommended_objective === obj.value && (
                    <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">Recomendado</div>
                  )}
                  <div className="text-3xl mb-2">{obj.emoji}</div>
                  <div className="font-semibold text-white text-sm">{obj.label}</div>
                  <div className="text-xs text-gray-400 mt-1">{obj.description}</div>
                </button>
              ))}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">Contexto Adicional (opcional)</label>
              <Textarea placeholder="Ex: Destacar facilidade de uso, Mencionar promoção..."
                value={additionalContext} onChange={(e) => setAdditionalContext(e.target.value)}
                rows={2} className="bg-gray-800 border-gray-700" />
            </div>

            <Button onClick={handleGenerateCopies} disabled={isGeneratingCopies}
              className="w-full bg-purple-600 hover:bg-purple-700 h-12 text-lg">
              {isGeneratingCopies ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Gerando com GPT-5.2...</>
              ) : (
                <><Sparkles className="w-5 h-5 mr-2" />✨ Gerar 3 Variações de Copy</>
              )}
            </Button>
          </Card>
        </div>
      )}

      {/* FASE 4: Copies */}
      {currentPhase === 4 && isPhaseUnlocked(4) && copies && status !== 'success' && (
        <div className="space-y-6">
          <Card className="p-4 bg-blue-900/20 border-blue-500/30">
            <div className="flex items-start gap-2 text-sm">
              <Lightbulb className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-blue-300">Estratégia GPT-5.2:</span>{' '}
                <span className="text-gray-300">{copies.generation_notes}</span>
              </div>
            </div>
          </Card>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white text-lg">Escolha a Copy do Anúncio</h3>
              <Button onClick={handleGenerateCopies} variant="outline" size="sm" disabled={isGeneratingCopies} className="border-gray-600">
                <RefreshCcw className="w-4 h-4 mr-2" />Gerar Novas
              </Button>
            </div>

            {copies.variations.map((variation, index) => (
              <Card key={variation.id} onClick={() => handleSelectVariation(variation.id)}
                className={cn("p-6 cursor-pointer transition-all bg-gray-900/80",
                  selectedVariation === variation.id ? 'border-2 border-purple-500 shadow-lg shadow-purple-500/20' :
                  'border border-gray-700 hover:border-gray-600')}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {index === 0 && <Trophy className="w-7 h-7 text-yellow-400" />}
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-white text-lg">Variação {variation.id}</h4>
                        <Badge className={cn(
                          variation.performance_label === 'CAMPEÃ' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' :
                          variation.performance_label === 'Alternativa' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
                          'bg-gray-500/20 text-gray-300 border-gray-500/30'
                        )}>{variation.performance_label}</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <TrendingUp className="w-4 h-4 text-green-400" />
                        <span className="text-green-400 font-semibold">{variation.predicted_performance}%</span>
                        <span className="text-gray-500">chance de alta performance</span>
                      </div>
                    </div>
                  </div>
                  {selectedVariation === variation.id && <CheckCircle2 className="w-6 h-6 text-purple-400" />}
                </div>
                <div className="space-y-3 mb-4">
                  <div>
                    <span className="text-xs text-gray-400 uppercase">Primary Text:</span>
                    <p className="text-sm text-gray-200 mt-1">{variation.primary_text}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 uppercase">Headline:</span>
                    <p className="text-sm font-semibold text-white mt-1">{variation.headline}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 uppercase">CTA:</span>
                    <Badge variant="outline" className="mt-1 border-gray-600">{variation.cta}</Badge>
                  </div>
                </div>
                <div className="bg-black/30 rounded-lg p-3 text-xs text-gray-300 border border-gray-700/50">
                  <span className="text-purple-400 font-semibold">💡 Por quê?</span> {variation.reasoning}
                </div>
              </Card>
            ))}
          </div>

          {/* Config Avançadas */}
          <Card className="p-4 bg-gray-900/80 border-gray-700">
            <button onClick={() => setShowAdvanced(!showAdvanced)} className="w-full flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-gray-400" />
                <span className="font-medium">Configurações Avançadas</span>
              </div>
              {showAdvanced ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            <AnimatePresence>
              {showAdvanced && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="pt-4 space-y-4 border-t border-gray-700 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Orçamento Diário (R$)</label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                          <input type="number" value={dailyBudget} onChange={(e) => setDailyBudget(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white" placeholder="30" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Link de Destino</label>
                        <div className="relative">
                          <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                          <input type="url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white" placeholder="https://..." />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                        <div className="flex gap-2">
                          <button onClick={() => setPublishStatus('PAUSED')}
                            className={cn("flex-1 py-2 px-4 rounded-lg text-sm font-medium transition",
                              publishStatus === 'PAUSED' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500' :
                              'bg-gray-800 text-gray-400 border border-gray-700')}>⏸️ Pausado</button>
                          <button onClick={() => setPublishStatus('ACTIVE')}
                            className={cn("flex-1 py-2 px-4 rounded-lg text-sm font-medium transition",
                              publishStatus === 'ACTIVE' ? 'bg-green-500/20 text-green-300 border border-green-500' :
                              'bg-gray-800 text-gray-400 border border-gray-700')}>▶️ Ativo</button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Targeting</label>
                        <button onClick={() => setUseAdvantagePlus(!useAdvantagePlus)}
                          className={cn("w-full py-2 px-4 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2",
                            useAdvantagePlus ? 'bg-purple-500/20 text-purple-300 border border-purple-500' :
                            'bg-gray-800 text-gray-400 border border-gray-700')}>
                          <Zap className="w-4 h-4" />{useAdvantagePlus ? 'Advantage+ Ativo' : 'Manual'}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Estratégia de Público</label>
                      <div className="grid grid-cols-2 gap-2">
                        {AUDIENCE_STRATEGIES.map((strategy) => (
                          <button key={strategy.value} onClick={() => setAudienceStrategy(strategy.value)}
                            className={cn("p-3 rounded-lg text-left transition text-sm",
                              audienceStrategy === strategy.value ? 'bg-purple-500/20 border border-purple-500' :
                              'bg-gray-800 border border-gray-700 hover:border-gray-600')}>
                            <div className="font-medium text-white">{strategy.label}</div>
                            <div className="text-xs text-gray-400 mt-1">{strategy.description}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>

          {/* Ações */}
          {selectedVariation && (
            <div className="flex gap-3">
              <Button onClick={() => setShowPreview(!showPreview)} variant="outline" className="flex-1 border-gray-600">
                <Eye className="w-4 h-4 mr-2" />{showPreview ? 'Ocultar' : '👁️ Ver'} Preview
              </Button>
              <Button onClick={handlePublishCampaign} disabled={status === 'creating'}
                className="flex-1 bg-green-600 hover:bg-green-700 h-12 text-lg">
                {status === 'creating' ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Publicando...</> :
                  <><Rocket className="w-5 h-5 mr-2" />🚀 Publicar Campanha</>}
              </Button>
            </div>
          )}

          {/* Preview */}
          <AnimatePresence>
            {showPreview && selectedVariation && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                <Card className="p-6 bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
                  <h3 className="font-semibold text-white mb-4 text-lg">📱 Preview do Anúncio</h3>
                  <div className="bg-white rounded-xl overflow-hidden max-w-md mx-auto shadow-2xl">
                    <div className="p-3 flex items-center gap-2 border-b border-gray-200">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500"></div>
                      <div>
                        <div className="font-semibold text-sm text-gray-900">Gravador Médico</div>
                        <div className="text-xs text-gray-500">Patrocinado · 📍</div>
                      </div>
                    </div>
                    <div className="p-3 text-sm text-gray-900 leading-relaxed">
                      {copies.variations.find(v => v.id === selectedVariation)?.primary_text}
                    </div>
                    {files[0] && (
                      files[0].type === 'video' ? <video src={files[0].preview} className="w-full" controls /> :
                      <img src={creativeUrl || files[0].preview} alt="Criativo" className="w-full object-cover" />
                    )}
                    <div className="p-3 bg-gray-50 border-t border-gray-200">
                      <div className="text-xs text-gray-500 uppercase">gravadormedico.com.br</div>
                      <div className="font-semibold text-base text-gray-900 mt-1">
                        {copies.variations.find(v => v.id === selectedVariation)?.headline}
                      </div>
                    </div>
                    <div className="p-3 border-t border-gray-200">
                      <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition">
                        {copies.variations.find(v => v.id === selectedVariation)?.cta}
                      </button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Fases Bloqueadas */}
      {!isPhaseUnlocked(currentPhase) && currentPhase > 1 && status !== 'success' && (
        <div className="text-center py-12 text-gray-500">
          <Lock className="w-12 h-12 mx-auto mb-3 text-gray-600" />
          <p className="text-sm">Complete a fase anterior para desbloquear</p>
        </div>
      )}
    </div>
  );
}
