'use client';

// =====================================================
// ADS LAUNCHER PRO - COCKPIT COM FASES BLOQUEADAS
// =====================================================
// Sistema de criação de campanhas com fases sequenciais:
// FASE 1: Formato → FASE 2: Upload + Análise → FASE 3: Objetivo → FASE 4: Copys
// Cada fase só desbloqueia após completar a anterior.
// Modelo de IA: GPT-5.2 Vision
// =====================================================

import { useState, useCallback, useRef, useEffect } from 'react';
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
  Edit3,
  Save,
  X,
  Smartphone,
  Monitor,
  Grid3X3,
  MapPin,
  Users,
  Hash,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import CampaignSummaryModal from '@/app/admin/ai/escala-automatica/components/CampaignSummaryModal';

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
  transcription?: string; // ✅ Transcrição do áudio (Whisper)
  frame_count?: number;   // ✅ Quantidade de frames analisados
}

interface CopyVariation {
  id: number;
  primary_text: string;
  headline: string;
  cta: string;
  predicted_performance: number;
  performance_label: string;
  reasoning: string;
  duplicationCheck?: {
    isDuplicate: boolean;
    similarity: number;
    warning: string | null;
  };
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

// Split Testing Options
const SPLIT_LOCATIONS = [
  { value: 'BR', label: '🇧🇷 Brasil', code: 'BR' },
  { value: 'PT', label: '🇵🇹 Portugal', code: 'PT' },
  { value: 'US', label: '🇺🇸 EUA', code: 'US' },
  { value: 'MX', label: '🇲🇽 México', code: 'MX' },
  { value: 'AR', label: '🇦🇷 Argentina', code: 'AR' },
];

const SPLIT_GENDERS = [
  { value: 'ALL', label: '👥 Todos', code: null },
  { value: 'MALE', label: '👨 Masculino', code: 1 },
  { value: 'FEMALE', label: '👩 Feminino', code: 2 },
];

const SPLIT_AGE_RANGES = [
  { value: '18-24', label: '18-24', min: 18, max: 24 },
  { value: '25-34', label: '25-34', min: 25, max: 34 },
  { value: '35-44', label: '35-44', min: 35, max: 44 },
  { value: '45-54', label: '45-54', min: 45, max: 54 },
  { value: '55-65', label: '55-65', min: 55, max: 65 },
  { value: '25-54', label: '25-54 (amplo)', min: 25, max: 54 },
];

const SPLIT_INTERESTS = [
  { value: 'SAUDE', label: '🏥 Saúde', interest_id: '6003012756699' },
  { value: 'MEDICINA', label: '⚕️ Medicina', interest_id: '6003107028665' },
  { value: 'TECNOLOGIA', label: '💻 Tecnologia', interest_id: '6003171943882' },
  { value: 'EMPREENDEDORISMO', label: '📈 Empreendedorismo', interest_id: '6003384117778' },
  { value: 'PRODUTIVIDADE', label: '⚡ Produtividade', interest_id: '6003139268610' },
  { value: 'NEGOCIOS', label: '💼 Negócios', interest_id: '6003273511882' },
];

// =====================================================
// HELPER: Obter Token do Cookie
// =====================================================

const getAuthToken = (): string => {
  if (typeof document === 'undefined') return '';
  
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'auth_token') {
      return decodeURIComponent(value);
    }
  }
  return '';
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
    { id: 4, name: 'Copys', description: 'Escolher variação', isCompleted: false, isActive: false, isLocked: true }
  ]);
  const [currentPhase, setCurrentPhase] = useState(1);

  // Fase 1
  const [format, setFormat] = useState<CreativeFormat | null>(null);
  
  // Fase 2
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [creativeUrl, setCreativeUrl] = useState('');
  const [isVideoCreative, setIsVideoCreative] = useState(false); // ✅ Rastrear tipo do criativo
  const [analysis, setAnalysis] = useState<CreativeAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStep, setAnalysisStep] = useState('');
  
  // Fase 3
  const [objectiveType, setObjectiveType] = useState<ObjectiveType>('TRAFEGO');
  const [funnelStage, setFunnelStage] = useState('TOPO');
  const [additionalContext, setAdditionalContext] = useState('');
  const [isGeneratingCopies, setIsGeneratingCopies] = useState(false);
  const [copiesProgress, setCopiesProgress] = useState(0);
  const [copiesStep, setCopiesStep] = useState('');
  
  // Fase 4
  const [copies, setCopies] = useState<{ variations: CopyVariation[]; generation_notes: string } | null>(null);
  const [selectedVariation, setSelectedVariation] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewFormat, setPreviewFormat] = useState<'FEED' | 'STORIES' | 'REELS'>('FEED');

  // Editor de Copy
  const [isEditing, setIsEditing] = useState(false);
  const [editingVariationId, setEditingVariationId] = useState<number | null>(null);
  const [editedPrimaryText, setEditedPrimaryText] = useState('');
  const [editedHeadline, setEditedHeadline] = useState('');
  const [editedCta, setEditedCta] = useState('');
  const [refinementInstructions, setRefinementInstructions] = useState('');
  const [isRefining, setIsRefining] = useState(false);

  // Configurações
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [dailyBudget, setDailyBudget] = useState('30');
  const [linkUrl, setLinkUrl] = useState('');
  const [publishStatus, setPublishStatus] = useState<'PAUSED' | 'ACTIVE'>('PAUSED');
  const [useAdvantagePlus, setUseAdvantagePlus] = useState(true);
  const [audienceStrategy, setAudienceStrategy] = useState('COLD_WINNER');

  // Split Testing (Geração Matricial de AdSets)
  const [enableSplitTesting, setEnableSplitTesting] = useState(false);
  const [selectedLocations, setSelectedLocations] = useState<string[]>(['BR']);
  const [selectedGenders, setSelectedGenders] = useState<string[]>(['ALL']);
  const [selectedAgeRanges, setSelectedAgeRanges] = useState<string[]>(['25-54']);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [generatedAdSets, setGeneratedAdSets] = useState<{
    location: string;
    gender: string;
    ageRange: string;
    interest?: string;
    name: string;
  }[]>([]);

  // Publicação
  const [status, setStatus] = useState<LaunchStatus>('idle');
  const [result, setResult] = useState<CampaignResult | null>(null);
  
  // Modal de Resumo da Campanha
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [campaignSummary, setCampaignSummary] = useState<{
    campaignId: string;
    campaignName: string;
    adSetId: string;
    adSetName: string;
    adIds: string[];
    budget: number;
    objective: string;
    status: 'PAUSED' | 'ACTIVE';
    adAccountId?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const successAlertRef = useRef<HTMLDivElement>(null);

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

    const isVideo = file.type.startsWith('video/');
    setIsVideoCreative(isVideo); // ✅ Rastrear tipo do criativo

    const uploadedFile: UploadedFile = {
      id: Date.now().toString(),
      file,
      preview: URL.createObjectURL(file),
      type: isVideo ? 'video' : 'image',
    };
    setFiles([uploadedFile]);
    setIsAnalyzing(true);
    setAnalysisProgress(0);
    setAnalysisStep('Enviando criativo...');

    // Simular progresso durante análise
    const progressInterval = setInterval(() => {
      setAnalysisProgress(prev => {
        if (prev < 15) {
          setAnalysisStep('📤 Enviando arquivo...');
          return prev + 3;
        } else if (prev < 40) {
          setAnalysisStep('🔍 Analisando elementos visuais...');
          return prev + 2;
        } else if (prev < 65) {
          setAnalysisStep('🧠 IA processando cores e composição...');
          return prev + 1.5;
        } else if (prev < 85) {
          setAnalysisStep('💡 Gerando recomendações...');
          return prev + 1;
        } else if (prev < 95) {
          setAnalysisStep('✨ Finalizando análise...');
          return prev + 0.5;
        }
        return prev;
      });
    }, 200);

    try {
      const token = getAuthToken();
      const formData = new FormData();
      formData.append('format', format);
      formData.append('file', file);

      const response = await fetch('/api/ads/analyze-creative', {
        method: 'POST',
        headers: token ? { 'Authorization': 'Bearer ' + token } : {},
        body: formData
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao analisar criativo');
      }

      const data = await response.json();
      
      if (data.success && data.analysis) {
        setAnalysisProgress(100);
        setAnalysisStep('✅ Análise completa!');
        
        // Pequeno delay para mostrar 100%
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setAnalysis(data.analysis);
        setCreativeUrl(data.creative_url);
        setObjectiveType(data.analysis.recommended_objective);
        
        const objConfig = CAMPAIGN_OBJECTIVES.find(o => o.value === data.analysis.recommended_objective);
        if (objConfig) setFunnelStage(objConfig.funnelStage);
        
        toast.success('✅ Criativo analisado com GPT-5.2 Vision!');
        // NÃO avança automaticamente - usuário precisa clicar em "Continuar"
      } else {
        throw new Error(data.error || 'Análise não retornou dados');
      }
    } catch (error: any) {
      clearInterval(progressInterval);
      console.error('[AdsLauncherPro] Erro na análise:', error);
      toast.error('Erro: ' + error.message);
      setAnalysis(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Avançar da Fase 2 para Fase 3 (manual)
  const handleAdvanceFromPhase2 = () => {
    if (analysis) {
      completePhase(2);
      toast.success('Avançando para escolher objetivo!');
    }
  };

  // Fase 3: Copies
  const handleGenerateCopies = async () => {
    if (!analysis) return;
    setIsGeneratingCopies(true);
    setCopiesProgress(0);
    setCopiesStep('Iniciando geração de copys...');

    // Simular progresso durante geração
    const progressInterval = setInterval(() => {
      setCopiesProgress(prev => {
        if (prev < 20) {
          setCopiesStep('📝 Analisando objetivo da campanha...');
          return prev + 4;
        } else if (prev < 45) {
          setCopiesStep('🎯 Identificando ângulos de persuasão...');
          return prev + 3;
        } else if (prev < 70) {
          setCopiesStep('✍️ Escrevendo variações de copy...');
          return prev + 2;
        } else if (prev < 90) {
          setCopiesStep('🔄 Otimizando para conversão...');
          return prev + 1.5;
        } else if (prev < 98) {
          setCopiesStep('✨ Polindo headlines e CTAs...');
          return prev + 0.5;
        }
        return prev;
      });
    }, 250);

    try {
      const token = getAuthToken();
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

      clearInterval(progressInterval);

      if (!response.ok) throw new Error('Erro ao gerar copys');
      const data = await response.json();
      
      if (data.success && data.variations) {
        setCopiesProgress(100);
        setCopiesStep('✅ Copys geradas com sucesso!');
        
        // Pequeno delay para mostrar 100%
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setCopies({
          variations: data.variations,
          generation_notes: data.generation_notes || 'Copys otimizadas'
        });
        toast.success('3 variações geradas!');
        completePhase(3);
      }
    } catch (error: any) {
      clearInterval(progressInterval);
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

  // Gerar permutações de AdSets (Split Testing)
  const generateAdSetPermutations = () => {
    const permutations: typeof generatedAdSets = [];
    
    for (const location of selectedLocations) {
      for (const gender of selectedGenders) {
        for (const ageRange of selectedAgeRanges) {
          const locationLabel = SPLIT_LOCATIONS.find(l => l.value === location)?.label || location;
          const genderLabel = SPLIT_GENDERS.find(g => g.value === gender)?.label || gender;
          const ageLabel = ageRange;
          
          if (selectedInterests.length > 0) {
            // Com interesses selecionados
            for (const interest of selectedInterests) {
              const interestLabel = SPLIT_INTERESTS.find(i => i.value === interest)?.label || interest;
              permutations.push({
                location,
                gender,
                ageRange,
                interest,
                name: `${locationLabel}_${genderLabel}_${ageLabel}_${interestLabel}`.replace(/[^\w]/g, '_')
              });
            }
          } else {
            // Sem interesses
            permutations.push({
              location,
              gender,
              ageRange,
              name: `${locationLabel}_${genderLabel}_${ageLabel}`.replace(/[^\w]/g, '_')
            });
          }
        }
      }
    }
    
    setGeneratedAdSets(permutations);
    return permutations;
  };

  // Toggle selection helper para multi-select
  const toggleSelection = (
    value: string, 
    currentSelection: string[], 
    setSelection: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    if (currentSelection.includes(value)) {
      setSelection(currentSelection.filter(v => v !== value));
    } else {
      setSelection([...currentSelection, value]);
    }
  };

  // Publicar
  const handlePublishCampaign = async () => {
    if (!selectedVariation || !copies || files.length === 0) return;

    try {
      setStatus('creating');
      toast.loading('Publicando campanha...');

      const selectedCopy = copies.variations.find(v => v.id === selectedVariation);
      if (!selectedCopy) return;

      const token = getAuthToken();
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
      
      // Split Testing - enviar configurações se ativo
      if (enableSplitTesting && generatedAdSets.length > 0) {
        formData.append('enable_split_testing', 'true');
        formData.append('split_testing_adsets', JSON.stringify(generatedAdSets.map(adset => ({
          ...adset,
          location_config: SPLIT_LOCATIONS.find(l => l.value === adset.location),
          gender_config: SPLIT_GENDERS.find(g => g.value === adset.gender),
          age_config: SPLIT_AGE_RANGES.find(a => a.value === adset.ageRange),
          interest_config: adset.interest ? SPLIT_INTERESTS.find(i => i.value === adset.interest) : null
        }))));
      }
      
      if (creativeUrl) formData.append('creative_url', creativeUrl);
      
      // ✅ Só enviar arquivos se NÃO tiver creative_url
      // (evita duplicar upload e exceder limite de 10MB)
      if (!creativeUrl) {
        files.forEach((f, i) => {
          formData.append(f.type === 'video' ? 'video' + i : 'image' + i, f.file);
        });
      }

      const response = await fetch('/api/ads/launch-v2', {
        method: 'POST',
        headers: token ? { 'Authorization': 'Bearer ' + token } : {},
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        setStatus('success');
        setResult(data);
        
        // ✅ Abrir modal de resumo com dados da campanha
        const objectiveLabel = CAMPAIGN_OBJECTIVES.find(o => o.value === objectiveType)?.label || objectiveType;
        const summary = {
          campaignId: data.data?.campaign?.id || '',
          campaignName: data.data?.campaign?.name || objectiveLabel || 'Campanha',
          adSetId: data.data?.adset?.id || '',
          adSetName: `AdSet • R$ ${dailyBudget}/dia`,
          adIds: data.data?.ads?.ids || [],
          budget: parseFloat(dailyBudget),
          objective: objectiveLabel,
          status: publishStatus,
        };
        setCampaignSummary(summary);
        setShowSummaryModal(true);
        
        toast.success(enableSplitTesting ? `${generatedAdSets.length} AdSets criados!` : 'Campanha publicada!');
        
        // ✅ Auto-scroll para alerta de sucesso
        setTimeout(() => {
          successAlertRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      } else {
        throw new Error(data.error || 'Erro ao publicar');
      }
    } catch (error: any) {
      setStatus('error');
      toast.error('Erro: ' + error.message);
    }
  };

  // Editor: Abrir
  const handleOpenEditor = (variationId: number) => {
    if (!copies) return;
    const variation = copies.variations.find((v) => v.id === variationId);
    if (!variation) return;

    setEditingVariationId(variationId);
    setEditedPrimaryText(variation.primary_text);
    setEditedHeadline(variation.headline);
    setEditedCta(variation.cta);
    setIsEditing(true);
  };

  // Editor: Salvar
  const handleSaveEdit = () => {
    if (!editingVariationId || !copies) return;

    const updatedCopies = {
      ...copies,
      variations: copies.variations.map((v) => 
        v.id === editingVariationId
          ? { ...v, primary_text: editedPrimaryText, headline: editedHeadline, cta: editedCta }
          : v
      )
    };

    setCopies(updatedCopies);
    setIsEditing(false);
    toast.success('✅ Copy editada com sucesso!');
  };

  // Editor: Refinar com IA
  const handleRefineWithAI = async () => {
    if (!editingVariationId || !refinementInstructions.trim()) {
      toast.error('Digite instruções de refinamento');
      return;
    }

    setIsRefining(true);
    const token = getAuthToken();

    try {
      const response = await fetch('/api/ads/refine-copy', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': 'Bearer ' + token } : {})
        },
        body: JSON.stringify({
          primary_text: editedPrimaryText,
          headline: editedHeadline,
          cta: editedCta,
          refinement_instructions: refinementInstructions,
          objective_type: objectiveType
        })
      });

      if (!response.ok) throw new Error('Erro ao refinar');

      const data = await response.json();

      if (data.success && data.refined) {
        setEditedPrimaryText(data.refined.primary_text);
        setEditedHeadline(data.refined.headline);
        setEditedCta(data.refined.cta);
        toast.success('🎨 Copy refinada pela IA!');
        setRefinementInstructions('');
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao refinar');
    } finally {
      setIsRefining(false);
    }
  };

  // Reset
  const resetForm = () => {
    setPhases([
      { id: 1, name: 'Formato', description: 'Tipo de anúncio', isCompleted: false, isActive: true, isLocked: false },
      { id: 2, name: 'Criativo', description: 'Upload + Análise IA', isCompleted: false, isActive: false, isLocked: true },
      { id: 3, name: 'Objetivo', description: 'Estratégia', isCompleted: false, isActive: false, isLocked: true },
      { id: 4, name: 'Copys', description: 'Escolher variação', isCompleted: false, isActive: false, isLocked: true }
    ]);
    setCurrentPhase(1);
    setFormat(null);
    setFiles([]);
    setCreativeUrl('');
    setIsVideoCreative(false); // ✅ Resetar tipo do criativo
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
            className="space-y-6">
            
            {/* Header de Sucesso */}
            <div className="bg-green-900/40 rounded-xl p-6 border border-green-700/50">
              <div className="flex items-start gap-4">
                <CheckCircle2 className="w-10 h-10 text-green-400" />
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-green-100">🎉 Campanha Criada com Sucesso!</h3>
                  <p className="text-green-300 mt-1">{result.message}</p>
                  <div className="flex gap-3 mt-4">
                    <Button onClick={resetForm} className="bg-purple-600 hover:bg-purple-700">
                      <Rocket className="w-4 h-4 mr-2" />Criar Nova Campanha
                    </Button>
                    <Button variant="outline" onClick={() => window.open('https://business.facebook.com/adsmanager', '_blank')} className="border-gray-600 text-white hover:text-white hover:bg-gray-700">
                      <ExternalLink className="w-4 h-4 mr-2" />Ver no Meta Ads
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Resumo da Campanha */}
            <Card className="p-6 bg-gray-900/80 border-gray-700">
              <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-400" />
                Resumo da Campanha
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Nome</p>
                  <p className="text-white font-medium mt-1 truncate">{result.data.campaign.name}</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Objetivo</p>
                  <p className="text-white font-medium mt-1">{objectiveType}</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Estágio do Funil</p>
                  <p className="text-white font-medium mt-1">{funnelStage}</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Status</p>
                  <p className={cn("font-medium mt-1", publishStatus === 'ACTIVE' ? 'text-green-400' : 'text-yellow-400')}>
                    {publishStatus === 'ACTIVE' ? '▶️ Ativo' : '⏸️ Pausado'}
                  </p>
                </div>
              </div>
            </Card>

            {/* Resumo do Conjunto de Anúncios (AdSet) */}
            <Card className="p-6 bg-gray-900/80 border-gray-700">
              <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-blue-400" />
                Conjunto de Anúncios (AdSet)
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Orçamento Diário</p>
                  <p className="text-white font-medium mt-1 text-lg">R$ {result.data.adset.dailyBudget}/dia</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Targeting</p>
                  <p className="text-white font-medium mt-1">
                    {useAdvantagePlus ? '⚡ Advantage+' : '🎯 Manual'}
                  </p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Estratégia de Público</p>
                  <p className="text-white font-medium mt-1 text-sm">
                    {audienceStrategy === 'COLD_WINNER' && '❄️ Cold Winner'}
                    {audienceStrategy === 'LOOKALIKE_AUTO' && '👥 Lookalike Auto'}
                    {audienceStrategy === 'REMARKETING_VIDEO' && '📹 Remarketing Vídeo'}
                    {audienceStrategy === 'REMARKETING_HOT' && '🔥 Remarketing Hot'}
                  </p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Link de Destino</p>
                  <p className="text-white font-medium mt-1 text-sm truncate">
                    {linkUrl || 'gravadormedico.com.br'}
                  </p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Formato do Criativo</p>
                  <p className="text-white font-medium mt-1">
                    {format === 'IMAGE' && '🖼️ Imagem'}
                    {format === 'VIDEO' && '🎬 Vídeo'}
                    {format === 'CAROUSEL' && '📚 Carrossel'}
                  </p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Anúncios Criados</p>
                  <p className="text-white font-medium mt-1 text-lg">{result.data.ads.count}</p>
                </div>
              </div>
            </Card>

            {/* Copy Utilizada */}
            {selectedVariation && copies && (
              <Card className="p-6 bg-gray-900/80 border-gray-700">
                <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-yellow-400" />
                  Copy Utilizada (Variação {selectedVariation})
                </h4>
                <div className="space-y-4">
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Primary Text</p>
                    <p className="text-white text-sm whitespace-pre-line">
                      {copies.variations.find(v => v.id === selectedVariation)?.primary_text}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-800/50 rounded-lg p-4">
                      <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Headline</p>
                      <p className="text-white font-semibold">
                        {copies.variations.find(v => v.id === selectedVariation)?.headline}
                      </p>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-4">
                      <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">CTA</p>
                      <Badge className="bg-blue-600 text-white">
                        {copies.variations.find(v => v.id === selectedVariation)?.cta}
                      </Badge>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Dicas de Otimização */}
            <Card className="p-6 bg-amber-900/20 border-amber-700/50">
              <h4 className="text-lg font-semibold text-amber-100 mb-3 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-amber-400" />
                Próximos Passos
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-amber-400">1.</span>
                  <span className="text-amber-200">Aguarde 24-48h para primeiros dados de performance</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-amber-400">2.</span>
                  <span className="text-amber-200">O sistema pausará automaticamente se gastar R$50 sem vendas</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-amber-400">3.</span>
                  <span className="text-amber-200">ROAS {'>'} 3x = budget aumenta 20% automaticamente</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-amber-400">4.</span>
                  <span className="text-amber-200">Use o Auditor para acompanhar otimizações</span>
                </div>
              </div>
            </Card>
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

      {/* FASE 2: Upload + Análise */}
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
                <div className="py-6">
                  <div className="relative w-16 h-16 mx-auto mb-4">
                    <Loader2 className="w-16 h-16 text-purple-400 animate-spin" />
                    <Brain className="w-8 h-8 text-purple-200 absolute inset-0 m-auto" />
                  </div>
                  <p className="text-lg font-semibold text-white mb-2">🤖 Analisando com GPT-5.2 Vision...</p>
                  
                  {/* Barra de Progresso */}
                  <div className="max-w-xs mx-auto mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-purple-300">{analysisStep}</span>
                      <span className="text-sm font-bold text-purple-400">{Math.round(analysisProgress)}%</span>
                    </div>
                    <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-purple-600 via-blue-500 to-purple-600 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${analysisProgress}%` }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                        style={{
                          backgroundSize: '200% 100%',
                          animation: 'shimmer 2s linear infinite'
                        }}
                      />
                    </div>
                    <style jsx>{`
                      @keyframes shimmer {
                        0% { background-position: 200% 0; }
                        100% { background-position: -200% 0; }
                      }
                    `}</style>
                  </div>
                  
                  <p className="text-xs text-gray-500 mt-4">Isso pode levar alguns segundos...</p>
                </div>
              ) : files.length > 0 ? (
                <div>
                  <CheckCircle2 className="w-16 h-16 mx-auto text-green-500 mb-4" />
                  <p className="text-white font-medium">📎 {files[0].file.name}</p>
                  <p className="text-xs text-gray-500 mt-2">Clique para trocar</p>
                  {files[0].type === 'image' && (
                    <img src={files[0].preview} alt="Preview" className="w-32 h-32 object-cover rounded-lg mx-auto mt-4 border border-gray-700" />
                  )}
                  {/* ✅ NOVO: Preview de Vídeo */}
                  {files[0].type === 'video' && (
                    <div className="mt-4 p-4 bg-gray-800 rounded-lg border border-gray-700 max-w-md mx-auto">
                      <div className="flex items-center gap-2 mb-3 text-sm text-purple-300">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        🎬 Preview do Vídeo
                      </div>
                      <video
                        controls
                        className="w-full rounded-lg shadow-lg"
                        style={{ maxHeight: '300px' }}
                        src={files[0].preview}
                      >
                        Seu navegador não suporta o elemento de vídeo.
                      </video>
                      <div className="mt-2 text-xs text-gray-500 flex items-center justify-between">
                        <span>{files[0].file.name}</span>
                        <span>{(files[0].file.size / 1024 / 1024).toFixed(2)} MB</span>
                      </div>
                    </div>
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

          {/* MOSTRAR ANÁLISE SE JÁ FOI FEITA */}
          {analysis && !isAnalyzing && (
            <div className="mt-6 space-y-4">
              <Card className="p-5 bg-gradient-to-br from-purple-900/40 to-blue-900/40 border-purple-500/40">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-purple-500/20 rounded-xl">
                    <Sparkles className="w-6 h-6 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white text-lg mb-3">🤖 Análise GPT-5.2 Vision</h3>
                    
                    {/* Recomendação */}
                    <div className="bg-black/40 rounded-lg p-4 mb-4 border border-purple-500/50">
                      <div className="flex items-center gap-3 mb-2">
                        <TrendingUp className="w-5 h-5 text-green-400" />
                        <span className="text-sm text-gray-400">Recomendação da IA:</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 ml-8">
                        <Badge className="text-base px-3 py-1 bg-purple-500">{analysis.recommended_objective}</Badge>
                        <span className="text-sm text-gray-300">({analysis.recommendation_confidence}% confiança)</span>
                      </div>
                      <p className="text-sm text-gray-300 mt-2 ml-8">💡 {analysis.recommendation_reasoning}</p>
                    </div>

                    {/* Grid de detalhes */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-black/20 rounded-lg p-3">
                        <span className="text-gray-400 text-xs">Elementos Visuais:</span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {analysis.visual_elements.slice(0, 4).map((el, i) => (
                            <Badge key={i} className="text-xs bg-gray-700">{el}</Badge>
                          ))}
                        </div>
                      </div>
                      <div className="bg-black/20 rounded-lg p-3">
                        <span className="text-gray-400 text-xs">Mood/Atmosfera:</span>
                        <div className="mt-1 font-medium text-purple-300">{analysis.mood}</div>
                      </div>
                    </div>

                    {/* Qualidade Visual */}
                    <div className="flex items-center gap-2 text-sm mt-3">
                      <span className="text-gray-400">Qualidade Visual:</span>
                      <div className="flex gap-0.5">
                        {[...Array(10)].map((_, i) => (
                          <div key={i} className={cn("w-4 h-2 rounded-sm",
                            i < analysis.technical_details.visual_quality_score ? 'bg-green-500' : 'bg-gray-700')} />
                        ))}
                      </div>
                      <span className="font-semibold text-white">{analysis.technical_details.visual_quality_score}/10</span>
                    </div>

                    {/* Warnings */}
                    {analysis.warnings && analysis.warnings.length > 0 && (
                      <Alert className="mt-3 bg-yellow-900/20 border-yellow-500/30">
                        <AlertCircle className="h-4 w-4 text-yellow-400" />
                        <AlertDescription className="text-sm text-yellow-300">{analysis.warnings.join(' • ')}</AlertDescription>
                      </Alert>
                    )}

                    {/* ✅ NOVO: Seção de Transcrição do Áudio */}
                    {analysis.format === 'VIDEO' && analysis.transcription && (
                      <div className="mt-4 p-4 bg-gray-800/80 rounded-lg border border-gray-700">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-white flex items-center gap-2">
                            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                            </svg>
                            📝 Transcrição Completa do Áudio
                          </h4>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(analysis.transcription || '');
                              // Feedback visual temporário
                              const btn = document.activeElement as HTMLButtonElement;
                              if (btn) {
                                const originalText = btn.innerHTML;
                                btn.innerHTML = '✓ Copiado!';
                                setTimeout(() => { btn.innerHTML = originalText; }, 2000);
                              }
                            }}
                            className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded flex items-center gap-1 transition-colors text-white"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Copiar
                          </button>
                        </div>
                        
                        <div className="bg-gray-900 p-4 rounded border border-gray-700 max-h-48 overflow-y-auto">
                          <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                            {analysis.transcription}
                          </p>
                        </div>
                        
                        <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                          <span className="inline-flex items-center gap-1">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            Transcrito automaticamente via Whisper AI
                          </span>
                          <span className="text-gray-400">
                            {analysis.transcription.split(/\s+/).filter(w => w.length > 0).length} palavras
                            {analysis.frame_count && ` • ${analysis.frame_count} frames analisados`}
                          </span>
                        </div>
                        
                        {analysis.transcription.includes('não disponível') && (
                          <div className="mt-2 text-xs text-yellow-500 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            FFmpeg necessário para transcrição. Instale com: brew install ffmpeg
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Card>

              {/* BOTÃO CONTINUAR */}
              <div className="flex justify-between items-center pt-2">
                <Button variant="ghost" onClick={() => { setFormat(null); setFiles([]); setAnalysis(null); setCurrentPhase(1); }} className="text-gray-400">
                  ← Voltar
                </Button>
                <Button 
                  onClick={handleAdvanceFromPhase2} 
                  className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 text-lg"
                >
                  Continuar para Objetivo <ChevronRight className="ml-2 w-5 h-5" />
                </Button>
              </div>
            </div>
          )}

          {/* Botão Voltar quando não tem análise ainda */}
          {!analysis && !isAnalyzing && (
            <div className="mt-4">
              <Button variant="ghost" onClick={() => { setFormat(null); setCurrentPhase(1); }} className="text-gray-400">
                ← Voltar
              </Button>
            </div>
          )}
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
                        <Badge key={i} className="text-xs bg-gray-700 border border-gray-600">{el}</Badge>
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

                {/* ✅ Transcrição do Áudio na Fase 3 (versão compacta) */}
                {analysis.format === 'VIDEO' && analysis.transcription && !analysis.transcription.includes('não disponível') && (
                  <div className="mt-4 p-3 bg-blue-900/20 rounded-lg border border-blue-500/30">
                    <div className="flex items-center gap-2 text-sm">
                      <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                      <span className="text-blue-300 font-medium">Áudio transcrito:</span>
                      <span className="text-gray-400 text-xs ml-auto">
                        {analysis.transcription.split(/\s+/).filter(w => w.length > 0).length} palavras
                      </span>
                    </div>
                    <p className="text-sm text-gray-300 mt-2 line-clamp-2">
                      "{analysis.transcription.substring(0, 150)}{analysis.transcription.length > 150 ? '...' : ''}"
                    </p>
                  </div>
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
                rows={2} className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" />
            </div>

            <Button onClick={handleGenerateCopies} disabled={isGeneratingCopies}
              className="w-full bg-purple-600 hover:bg-purple-700 h-12 text-lg">
              {isGeneratingCopies ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Gerando com GPT-5.2...</>
              ) : (
                <><Sparkles className="w-5 h-5 mr-2" />✨ Gerar 3 Variações de Copy</>
              )}
            </Button>
            
            {/* Barra de Progresso de Geração de Copy */}
            {isGeneratingCopies && (
              <div className="mt-4 p-4 bg-gray-800/50 rounded-lg border border-purple-500/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-purple-300 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 animate-pulse" />
                    {copiesStep}
                  </span>
                  <span className="text-sm font-bold text-purple-400">{Math.round(copiesProgress)}%</span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${copiesProgress}%` }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    style={{
                      backgroundSize: '200% 100%',
                      animation: 'shimmer 1.5s linear infinite'
                    }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">GPT-5.2 está criando variações otimizadas...</p>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* FASE 4: Copys */}
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
              <Button onClick={handleGenerateCopies} variant="outline" size="sm" disabled={isGeneratingCopies} className="border-gray-600 text-white hover:text-white hover:bg-gray-700">
                <RefreshCcw className="w-4 h-4 mr-2" />Gerar Novas
              </Button>
            </div>

            {copies.variations.map((variation, index) => (
              <Card key={variation.id}
                className={cn("p-6 transition-all bg-gray-900/80",
                  variation.duplicationCheck?.isDuplicate ? 'border-2 border-yellow-500/50' : // ✅ Destaque para duplicatas
                  selectedVariation === variation.id ? 'border-2 border-purple-500 shadow-lg shadow-purple-500/20' :
                  'border border-gray-700 hover:border-gray-600')}>
                
                {/* ✅ AVISO DE DUPLICATA */}
                {variation.duplicationCheck?.isDuplicate && (
                  <div className="mb-4 p-3 bg-yellow-600/20 border border-yellow-600/50 rounded-lg flex items-start gap-2">
                    <svg className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div className="text-sm">
                      <p className="font-semibold text-yellow-400">⚠️ Copy Similar Detectada</p>
                      <p className="text-yellow-300 mt-1">{variation.duplicationCheck.warning}</p>
                      <p className="text-xs text-yellow-400/70 mt-1">
                        Recomendação: Edite esta copy ou gere novas variações
                      </p>
                    </div>
                  </div>
                )}
                
                {/* ✅ Badge de copy única */}
                {variation.duplicationCheck && !variation.duplicationCheck.isDuplicate && variation.duplicationCheck.similarity > 0 && (
                  <div className="mb-3 inline-flex items-center gap-1 px-2 py-1 bg-green-500/10 border border-green-500/30 rounded text-xs text-green-400">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Copy única ({100 - variation.duplicationCheck.similarity}% original)
                  </div>
                )}
                
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleSelectVariation(variation.id)}>
                    {index === 0 && <Trophy className="w-7 h-7 text-yellow-400" />}
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-white text-lg">Variação {variation.id}</h4>
                        <Badge className={cn(
                          variation.performance_label === 'CAMPEÃ' || variation.performance_label === '🏆 CAMPEÃ' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' :
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
                  <div className="flex items-center gap-2">
                    {selectedVariation === variation.id && <CheckCircle2 className="w-6 h-6 text-purple-400" />}
                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleOpenEditor(variation.id); }}
                      className="border-gray-600 text-gray-300 hover:text-white hover:bg-gray-700">
                      <Edit3 className="w-4 h-4 mr-1" />Editar
                    </Button>
                  </div>
                </div>
                <div className="space-y-3 mb-4 cursor-pointer" onClick={() => handleSelectVariation(variation.id)}>
                  <div>
                    <span className="text-xs text-gray-400 uppercase">Primary Text:</span>
                    <p className="text-sm text-gray-200 mt-1 whitespace-pre-line">{variation.primary_text}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 uppercase">Headline:</span>
                    <p className="text-sm font-semibold text-white mt-1">{variation.headline}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 uppercase">CTA:</span>
                    <Badge className="mt-1 bg-gray-700 border border-gray-600">{variation.cta}</Badge>
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
                    
                    {/* Opções Manuais - Aparecem quando Advantage+ está desativado */}
                    {!useAdvantagePlus && (
                      <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700 space-y-4">
                        <div className="flex items-center gap-2 text-yellow-400 text-sm mb-3">
                          <Settings2 className="w-4 h-4" />
                          <span className="font-medium">Configuração Manual de Targeting</span>
                        </div>
                        
                        {/* Estágio do Funil */}
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">Estágio do Funil de Vendas</label>
                          <div className="grid grid-cols-3 gap-2">
                            {FUNNEL_STAGES.map((stage) => (
                              <button key={stage.value} onClick={() => setFunnelStage(stage.value)}
                                className={cn("p-3 rounded-lg text-center transition",
                                  funnelStage === stage.value 
                                    ? stage.color === 'blue' ? 'bg-blue-500/20 border border-blue-500 text-blue-300'
                                    : stage.color === 'yellow' ? 'bg-yellow-500/20 border border-yellow-500 text-yellow-300'
                                    : 'bg-green-500/20 border border-green-500 text-green-300'
                                    : 'bg-gray-800 border border-gray-700 text-gray-400 hover:border-gray-600')}>
                                <span className="text-xl">{stage.emoji}</span>
                                <div className="text-xs mt-1 font-medium">{stage.value}</div>
                              </button>
                            ))}
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            {FUNNEL_STAGES.find(s => s.value === funnelStage)?.fullDescription}
                          </p>
                        </div>
                        
                        {/* Idade */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Idade Mínima</label>
                            <select className="w-full py-2 px-3 bg-gray-800 border border-gray-700 rounded-lg text-white">
                              <option value="18">18 anos</option>
                              <option value="25">25 anos</option>
                              <option value="30">30 anos</option>
                              <option value="35">35 anos</option>
                              <option value="40">40 anos</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Idade Máxima</label>
                            <select className="w-full py-2 px-3 bg-gray-800 border border-gray-700 rounded-lg text-white">
                              <option value="65">65 anos</option>
                              <option value="55">55 anos</option>
                              <option value="50">50 anos</option>
                              <option value="45">45 anos</option>
                            </select>
                          </div>
                        </div>
                        
                        {/* Gênero */}
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">Gênero</label>
                          <div className="flex gap-2">
                            <button className="flex-1 py-2 px-4 rounded-lg text-sm font-medium bg-purple-500/20 text-purple-300 border border-purple-500">
                              Todos
                            </button>
                            <button className="flex-1 py-2 px-4 rounded-lg text-sm font-medium bg-gray-800 text-gray-400 border border-gray-700">
                              Masculino
                            </button>
                            <button className="flex-1 py-2 px-4 rounded-lg text-sm font-medium bg-gray-800 text-gray-400 border border-gray-700">
                              Feminino
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    
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
                      <p className="text-xs text-gray-500 mt-2">
                        💡 {audienceStrategy === 'COLD_WINNER' && 'Melhor para TOPO de funil - público aberto com exclusões inteligentes'}
                        {audienceStrategy === 'LOOKALIKE_AUTO' && 'Melhor para MEIO de funil - encontra pessoas similares aos compradores'}
                        {audienceStrategy === 'REMARKETING_VIDEO' && 'Melhor para MEIO de funil - engaja quem já assistiu seus vídeos'}
                        {audienceStrategy === 'REMARKETING_HOT' && 'Melhor para FUNDO de funil - converte visitantes quentes'}
                      </p>
                    </div>

                    {/* Split Testing (Geração Matricial de AdSets) */}
                    <div className="p-4 bg-gradient-to-br from-orange-500/10 to-yellow-500/10 rounded-xl border border-orange-500/30">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Grid3X3 className="w-5 h-5 text-orange-400" />
                          <span className="font-semibold text-white">🧪 Geração Matricial (Split Testing)</span>
                        </div>
                        <button
                          onClick={() => {
                            setEnableSplitTesting(!enableSplitTesting);
                            if (!enableSplitTesting) generateAdSetPermutations();
                          }}
                          className={cn("px-4 py-2 rounded-lg text-sm font-medium transition",
                            enableSplitTesting ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-orange-500'
                          )}>
                          {enableSplitTesting ? '✅ Ativado' : 'Ativar'}
                        </button>
                      </div>
                      
                      <p className="text-sm text-gray-400 mb-4">
                        Gere múltiplos AdSets automaticamente para testar diferentes combinações de público.
                      </p>

                      {enableSplitTesting && (
                        <div className="space-y-4">
                          {/* Localização (Multi-select) */}
                          <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                              <MapPin className="w-4 h-4 text-blue-400" />
                              Localização
                            </label>
                            <div className="flex flex-wrap gap-2">
                              {SPLIT_LOCATIONS.map((loc) => (
                                <button key={loc.value}
                                  onClick={() => toggleSelection(loc.value, selectedLocations, setSelectedLocations)}
                                  className={cn("px-3 py-1.5 rounded-lg text-sm font-medium transition",
                                    selectedLocations.includes(loc.value)
                                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500'
                                      : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-blue-500/50'
                                  )}>
                                  {loc.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Gênero (Multi-select) */}
                          <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                              <Users className="w-4 h-4 text-pink-400" />
                              Gênero
                            </label>
                            <div className="flex flex-wrap gap-2">
                              {SPLIT_GENDERS.map((gender) => (
                                <button key={gender.value}
                                  onClick={() => toggleSelection(gender.value, selectedGenders, setSelectedGenders)}
                                  className={cn("px-3 py-1.5 rounded-lg text-sm font-medium transition",
                                    selectedGenders.includes(gender.value)
                                      ? 'bg-pink-500/20 text-pink-300 border border-pink-500'
                                      : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-pink-500/50'
                                  )}>
                                  {gender.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Faixa Etária (Multi-select) */}
                          <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                              <Hash className="w-4 h-4 text-green-400" />
                              Faixa Etária
                            </label>
                            <div className="flex flex-wrap gap-2">
                              {SPLIT_AGE_RANGES.map((age) => (
                                <button key={age.value}
                                  onClick={() => toggleSelection(age.value, selectedAgeRanges, setSelectedAgeRanges)}
                                  className={cn("px-3 py-1.5 rounded-lg text-sm font-medium transition",
                                    selectedAgeRanges.includes(age.value)
                                      ? 'bg-green-500/20 text-green-300 border border-green-500'
                                      : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-green-500/50'
                                  )}>
                                  {age.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Interesses (Multi-select) */}
                          <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                              <Target className="w-4 h-4 text-purple-400" />
                              Interesses (Opcional)
                            </label>
                            <div className="flex flex-wrap gap-2">
                              {SPLIT_INTERESTS.map((interest) => (
                                <button key={interest.value}
                                  onClick={() => toggleSelection(interest.value, selectedInterests, setSelectedInterests)}
                                  className={cn("px-3 py-1.5 rounded-lg text-sm font-medium transition",
                                    selectedInterests.includes(interest.value)
                                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500'
                                      : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-purple-500/50'
                                  )}>
                                  {interest.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Gerar Preview */}
                          <div className="pt-4 border-t border-gray-700">
                            <Button onClick={generateAdSetPermutations} variant="outline" size="sm"
                              className="w-full border-orange-500/50 text-orange-300 hover:bg-orange-500/10">
                              <Grid3X3 className="w-4 h-4 mr-2" />
                              Gerar {selectedLocations.length * selectedGenders.length * selectedAgeRanges.length * Math.max(1, selectedInterests.length)} AdSets
                            </Button>
                          </div>

                          {/* Preview dos AdSets Gerados */}
                          {generatedAdSets.length > 0 && (
                            <div className="mt-4 p-3 bg-gray-900/50 rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-300">
                                  📋 {generatedAdSets.length} AdSets Serão Criados:
                                </span>
                              </div>
                              <div className="max-h-32 overflow-y-auto space-y-1">
                                {generatedAdSets.slice(0, 10).map((adset, i) => (
                                  <div key={i} className="text-xs text-gray-400 flex items-center gap-1">
                                    <span className="text-green-400">✓</span> {adset.name}
                                  </div>
                                ))}
                                {generatedAdSets.length > 10 && (
                                  <div className="text-xs text-gray-500 italic">
                                    ... e mais {generatedAdSets.length - 10} AdSets
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>

          {/* Ações */}
          {selectedVariation && (
            <div className="flex gap-3">
              <Button onClick={() => setShowPreview(!showPreview)} variant="outline" className="flex-1 border-gray-600 text-white hover:text-white hover:bg-gray-700">
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
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-white text-lg">📱 Preview do Anúncio</h3>
                    {/* Format Tabs */}
                    <div className="flex gap-1 p-1 bg-gray-800 rounded-lg">
                      <button onClick={() => setPreviewFormat('FEED')}
                        className={cn("px-3 py-1.5 rounded text-sm font-medium transition flex items-center gap-1",
                          previewFormat === 'FEED' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white')}>
                        <Monitor className="w-4 h-4" />Feed
                      </button>
                      <button onClick={() => setPreviewFormat('STORIES')}
                        className={cn("px-3 py-1.5 rounded text-sm font-medium transition flex items-center gap-1",
                          previewFormat === 'STORIES' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white')}>
                        <Smartphone className="w-4 h-4" />Stories
                      </button>
                      <button onClick={() => setPreviewFormat('REELS')}
                        className={cn("px-3 py-1.5 rounded text-sm font-medium transition flex items-center gap-1",
                          previewFormat === 'REELS' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white')}>
                        <Video className="w-4 h-4" />Reels
                      </button>
                    </div>
                  </div>

                  {/* Format Info */}
                  <div className="text-xs text-gray-400 mb-4 text-center">
                    {previewFormat === 'FEED' && '📐 Feed: 1080x1080px (1:1) ou 1080x1350px (4:5)'}
                    {previewFormat === 'STORIES' && '📐 Stories: 1080x1920px (9:16) - Tela cheia vertical'}
                    {previewFormat === 'REELS' && '📐 Reels: 1080x1920px (9:16) - Vídeo vertical'}
                  </div>

                  {/* Preview Container */}
                  <div className={cn("mx-auto transition-all",
                    previewFormat === 'FEED' ? 'max-w-md' : 'max-w-[280px]')}>
                    
                    {/* FEED Preview */}
                    {previewFormat === 'FEED' && (
                      <div className="bg-white rounded-xl overflow-hidden shadow-2xl">
                        <div className="p-3 flex items-center gap-2 border-b border-gray-200">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500"></div>
                          <div>
                            <div className="font-semibold text-sm text-gray-900">Gravador Médico</div>
                            <div className="text-xs text-gray-500">Patrocinado · 📍</div>
                          </div>
                        </div>
                        <div className="p-3 text-sm text-gray-900 leading-relaxed whitespace-pre-line">
                          {copies.variations.find(v => v.id === selectedVariation)?.primary_text}
                        </div>
                        {/* ✅ Creative: Usar creativeUrl (Supabase) para vídeo e imagem */}
                        {(files[0] || creativeUrl) && (
                          (isVideoCreative || files[0]?.type === 'video') ? 
                            <video 
                              src={creativeUrl || files[0]?.preview} 
                              className="w-full aspect-square object-cover bg-black" 
                              controls 
                              playsInline
                              preload="auto"
                              muted
                              onLoadedData={(e) => {
                                const video = e.currentTarget;
                                video.muted = false;
                              }}
                            >
                              <source src={creativeUrl || files[0]?.preview} type="video/mp4" />
                              Seu navegador não suporta vídeo.
                            </video> :
                            <img src={creativeUrl || files[0]?.preview} alt="Criativo" className="w-full aspect-square object-cover" />
                        )}
                        {!files[0] && !creativeUrl && (
                          <div className="w-full aspect-square bg-gray-800 flex items-center justify-center">
                            <span className="text-gray-500">Nenhum criativo</span>
                          </div>
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
                    )}

                    {/* STORIES Preview */}
                    {previewFormat === 'STORIES' && (
                      <div className="bg-black rounded-3xl overflow-hidden shadow-2xl relative" style={{ aspectRatio: '9/16' }}>
                        {/* ✅ Creative Full Screen - Usar creativeUrl (Supabase) */}
                        {(files[0] || creativeUrl) && (
                          (isVideoCreative || files[0]?.type === 'video') ? 
                            <video 
                              src={creativeUrl || files[0]?.preview} 
                              className="w-full h-full object-cover" 
                              autoPlay 
                              muted 
                              loop 
                              playsInline
                              controls
                              preload="auto"
                            >
                              <source src={creativeUrl || files[0]?.preview} type="video/mp4" />
                            </video> :
                            <img src={creativeUrl || files[0]?.preview} alt="Criativo" className="w-full h-full object-cover" />
                        )}
                        {!files[0] && !creativeUrl && (
                          <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                            <span className="text-gray-500">Nenhum criativo</span>
                          </div>
                        )}
                        {/* Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/70"></div>
                        {/* Top Bar */}
                        <div className="absolute top-4 left-4 right-4 flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 ring-2 ring-white"></div>
                          <div className="flex-1">
                            <div className="text-white text-xs font-semibold">Gravador Médico</div>
                            <div className="text-white/70 text-[10px]">Patrocinado</div>
                          </div>
                          <div className="text-white text-lg">×</div>
                        </div>
                        {/* Bottom CTA */}
                        <div className="absolute bottom-4 left-4 right-4 space-y-2">
                          <p className="text-white text-xs leading-relaxed line-clamp-3">
                            {copies.variations.find(v => v.id === selectedVariation)?.primary_text.split('\n')[0]}
                          </p>
                          <button className="w-full bg-white text-black font-semibold py-2 rounded-full text-sm">
                            {copies.variations.find(v => v.id === selectedVariation)?.cta}
                          </button>
                          <div className="flex justify-center gap-1 pt-2">
                            <ChevronUp className="w-5 h-5 text-white/70" />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* REELS Preview */}
                    {previewFormat === 'REELS' && (
                      <div className="bg-black rounded-3xl overflow-hidden shadow-2xl relative" style={{ aspectRatio: '9/16' }}>
                        {/* ✅ Creative Full Screen - Usar creativeUrl (Supabase) */}
                        {(files[0] || creativeUrl) && (
                          (isVideoCreative || files[0]?.type === 'video') ? 
                            <video 
                              src={creativeUrl || files[0]?.preview} 
                              className="w-full h-full object-cover" 
                              autoPlay 
                              muted 
                              loop 
                              playsInline
                              controls
                              preload="auto"
                            >
                              <source src={creativeUrl || files[0]?.preview} type="video/mp4" />
                            </video> :
                            <img src={creativeUrl || files[0]?.preview} alt="Criativo" className="w-full h-full object-cover" />
                        )}
                        {!files[0] && !creativeUrl && (
                          <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                            <span className="text-gray-500">Nenhum criativo</span>
                          </div>
                        )}
                        {/* Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80"></div>
                        {/* Right Side Icons */}
                        <div className="absolute right-3 bottom-24 space-y-4">
                          <div className="flex flex-col items-center">
                            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">❤️</div>
                            <span className="text-white text-xs mt-1">2.4K</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">💬</div>
                            <span className="text-white text-xs mt-1">128</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">📤</div>
                          </div>
                        </div>
                        {/* Bottom Content */}
                        <div className="absolute bottom-4 left-4 right-16 space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500"></div>
                            <span className="text-white text-sm font-semibold">Gravador Médico</span>
                            <span className="text-white/60 text-xs">• Patrocinado</span>
                          </div>
                          <p className="text-white text-xs leading-relaxed line-clamp-2">
                            {copies.variations.find(v => v.id === selectedVariation)?.primary_text.split('\n')[0]}
                          </p>
                          <button className="bg-white text-black font-semibold py-1.5 px-4 rounded-lg text-xs mt-2">
                            {copies.variations.find(v => v.id === selectedVariation)?.cta}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Device Toggle */}
                  <div className="flex justify-center gap-4 mt-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Smartphone className="w-4 h-4" /> Mobile
                    </span>
                    <span className="flex items-center gap-1 opacity-50">
                      <Monitor className="w-4 h-4" /> Desktop
                    </span>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Modal Editor de Copy */}
          <AnimatePresence>
            {isEditing && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                  className="bg-gray-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                        <Edit3 className="w-6 h-6 text-purple-400" />
                        <h3 className="text-xl font-bold text-white">Editor de Copy</h3>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-white">
                        <X className="w-5 h-5" />
                      </Button>
                    </div>

                    {/* Refinamento com IA */}
                    <Card className="p-4 bg-purple-900/20 border-purple-500/30 mb-6">
                      <div className="flex items-start gap-3 mb-3">
                        <Sparkles className="w-5 h-5 text-purple-400 flex-shrink-0 mt-1" />
                        <div className="flex-1">
                          <h4 className="font-semibold text-white mb-2">🤖 Refinar com IA</h4>
                          <Textarea
                            placeholder="Ex: 'Deixar mais direto', 'Adicionar senso de urgência', 'Quebrar em linhas curtas', 'Remover emojis'"
                            value={refinementInstructions}
                            onChange={(e) => setRefinementInstructions(e.target.value)}
                            rows={2}
                            className="mb-2 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                          />
                          <Button onClick={handleRefineWithAI} disabled={isRefining || !refinementInstructions.trim()}
                            size="sm" className="bg-purple-600 hover:bg-purple-700">
                            {isRefining ? (
                              <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Refinando...</>
                            ) : (
                              <><Sparkles className="w-4 h-4 mr-1" />Refinar Agora</>
                            )}
                          </Button>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 ml-8">
                        💡 <strong>Dicas:</strong> &quot;Mais curto&quot;, &quot;CTA mais direto&quot;, &quot;Adicionar número específico&quot;, &quot;Trocar emoji&quot;
                      </div>
                    </Card>

                    {/* Editor Manual */}
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-300 mb-2 block">
                          Primary Text
                          <span className="text-gray-500 text-xs ml-2">(2-4 linhas, máx 15 palavras/linha)</span>
                        </label>
                        <Textarea
                          value={editedPrimaryText}
                          onChange={(e) => setEditedPrimaryText(e.target.value)}
                          rows={6}
                          className="font-mono text-sm bg-gray-800 border-gray-700 text-white"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-300 mb-2 block">
                          Headline
                          <span className={cn("text-xs ml-2", editedHeadline.length > 27 ? 'text-red-400' : 'text-gray-500')}>
                            ({editedHeadline.length}/27 caracteres)
                          </span>
                        </label>
                        <input
                          type="text"
                          value={editedHeadline}
                          onChange={(e) => setEditedHeadline(e.target.value)}
                          maxLength={40}
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-300 mb-2 block">CTA</label>
                        <input
                          type="text"
                          value={editedCta}
                          onChange={(e) => setEditedCta(e.target.value)}
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                        />
                      </div>
                    </div>

                    {/* Botões de Ação */}
                    <div className="flex gap-3 mt-6">
                      <Button variant="outline" onClick={() => setIsEditing(false)} className="flex-1 border-gray-600 text-white">
                        <X className="w-4 h-4 mr-2" />Cancelar
                      </Button>
                      <Button onClick={handleSaveEdit} className="flex-1 bg-green-600 hover:bg-green-700">
                        <Save className="w-4 h-4 mr-2" />Salvar Alterações
                      </Button>
                    </div>
                  </div>
                </motion.div>
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
      
      {/* Modal de Resumo da Campanha */}
      <CampaignSummaryModal
        isOpen={showSummaryModal}
        onClose={() => setShowSummaryModal(false)}
        summary={campaignSummary}
      />
    </div>
  );
}
