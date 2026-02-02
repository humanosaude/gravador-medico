'use client';

// =====================================================
// ADS LAUNCHER - COMPONENTE DE CRIAÇÃO DE CAMPANHAS
// =====================================================
// Interface para upload de criativos e lançamento automático
// de campanhas no Facebook Ads via API
// =====================================================

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  Image as ImageIcon,
  Video,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Rocket,
  Target,
  DollarSign,
  Users,
  Zap,
  Eye,
  Link2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Copy,
  ExternalLink,
  Film,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// =====================================================
// TIPOS
// =====================================================

interface UploadedFile {
  id: string;
  file: File;
  preview: string;
  type: 'image' | 'video';
}

interface GeneratedCopy {
  primaryText: string[];
  headlines: string[];
  imageUrl: string;
}

interface CampaignResult {
  success: boolean;
  campaignId?: string;
  adSetId?: string;
  adCreativeIds?: string[];
  adIds?: string[];
  error?: string;
  details?: {
    uploadedImages: string[];
    generatedCopies: GeneratedCopy[];
  };
}

type LaunchStatus = 'idle' | 'uploading' | 'generating' | 'creating' | 'success' | 'error';

// =====================================================
// AUDIENCE OPTIONS
// =====================================================

const AUDIENCE_OPTIONS = [
  { value: 'Médicos', label: '👨‍⚕️ Médicos', description: 'Profissionais de medicina' },
  { value: 'Dentistas', label: '🦷 Dentistas', description: 'Odontologistas e ortodontistas' },
  { value: 'Enfermeiros', label: '👩‍⚕️ Enfermeiros', description: 'Profissionais de enfermagem' },
  { value: 'Saúde', label: '❤️ Saúde Geral', description: 'Interessados em saúde e bem-estar' },
  { value: 'Empreendedores', label: '💼 Empreendedores', description: 'Donos de negócios e startups' },
  { value: 'Educação', label: '📚 Educação', description: 'Estudantes e educadores' },
  { value: 'Tecnologia', label: '💻 Tecnologia', description: 'Profissionais de TI' },
];

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export default function AdsLauncher() {
  // Estados
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [objective, setObjective] = useState('');
  const [dailyBudget, setDailyBudget] = useState('20');
  const [targetAudience, setTargetAudience] = useState('Médicos');
  const [linkUrl, setLinkUrl] = useState('');
  const [publishStatus, setPublishStatus] = useState<'PAUSED' | 'ACTIVE'>('PAUSED');
  const [status, setStatus] = useState<LaunchStatus>('idle');
  const [result, setResult] = useState<CampaignResult | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // =====================================================
  // HANDLERS DE DRAG & DROP
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
      const selectedFiles = Array.from(e.target.files);
      addFiles(selectedFiles);
    }
  }, []);

  const addFiles = (newFiles: File[]) => {
    const uploadedFiles: UploadedFile[] = newFiles.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      preview: URL.createObjectURL(file),
      type: file.type.startsWith('video/') ? 'video' : 'image',
    }));

    setFiles(prev => [...prev, ...uploadedFiles].slice(0, 10)); // Máximo 10 arquivos
  };

  const removeFile = (id: string) => {
    setFiles(prev => {
      const updated = prev.filter(f => f.id !== id);
      // Revogar URL do preview para liberar memória
      const removed = prev.find(f => f.id === id);
      if (removed) URL.revokeObjectURL(removed.preview);
      return updated;
    });
  };

  // =====================================================
  // HANDLER DE SUBMISSÃO
  // =====================================================

  const handleLaunch = async () => {
    if (files.length === 0 || !objective) return;

    try {
      setStatus('uploading');
      setResult(null);

      // Criar FormData
      const formData = new FormData();
      formData.append('objective', objective);
      formData.append('dailyBudget', dailyBudget);
      formData.append('targetAudience', targetAudience);
      formData.append('status', publishStatus);
      if (linkUrl) formData.append('linkUrl', linkUrl);

      // Adicionar imagens
      files.forEach((uploadedFile, index) => {
        formData.append(`image${index}`, uploadedFile.file);
      });

      setStatus('generating');

      // Chamar API
      const response = await fetch('/api/ads/launch', {
        method: 'POST',
        body: formData,
      });

      setStatus('creating');

      const data: CampaignResult = await response.json();

      if (data.success) {
        setStatus('success');
        setResult(data);
      } else {
        setStatus('error');
        setResult(data);
      }
    } catch (error: any) {
      setStatus('error');
      setResult({
        success: false,
        error: error.message || 'Erro ao criar campanha',
      });
    }
  };

  const resetForm = () => {
    setFiles([]);
    setObjective('');
    setDailyBudget('20');
    setTargetAudience('Médicos');
    setLinkUrl('');
    setPublishStatus('PAUSED');
    setStatus('idle');
    setResult(null);
  };

  // =====================================================
  // RENDERIZAÇÃO
  // =====================================================

  const isProcessing = ['uploading', 'generating', 'creating'].includes(status);

  return (
    <div className="bg-gray-900 rounded-2xl shadow-lg border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg">
            <Rocket className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Lançar Nova Campanha</h2>
            <p className="text-purple-100 text-sm">
              Suba imagens ou vídeos e deixe a IA criar tudo
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Status de Processamento */}
        <AnimatePresence>
          {isProcessing && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-purple-900/30 rounded-xl p-4 border border-purple-700/50"
            >
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                <div>
                  <p className="font-medium text-purple-100">
                    {status === 'uploading' && '📤 Enviando arquivos para a nuvem...'}
                    {status === 'generating' && '🤖 Gerando copys com IA...'}
                    {status === 'creating' && '🚀 Criando campanha no Facebook...'}
                  </p>
                  <p className="text-sm text-purple-300">
                    {status === 'uploading' && files.some(f => f.type === 'video') 
                      ? 'Vídeos podem demorar um pouco mais...'
                      : 'Isso pode levar alguns segundos'}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Resultado de Sucesso */}
        <AnimatePresence>
          {status === 'success' && result && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-green-900/30 rounded-xl p-6 border border-green-700/50"
            >
              <div className="flex items-start gap-4">
                <CheckCircle2 className="w-8 h-8 text-green-400 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-green-100">
                    🎉 Campanha Criada com Sucesso!
                  </h3>
                  <div className="mt-3 space-y-2 text-sm text-green-200">
                    <p><strong>Campaign ID:</strong> {result.campaignId}</p>
                    <p><strong>AdSet ID:</strong> {result.adSetId}</p>
                    <p><strong>Anúncios criados:</strong> {result.adIds?.length || 0}</p>
                  </div>
                  
                  {/* Copys Geradas */}
                  {result.details?.generatedCopies && result.details.generatedCopies.length > 0 && (
                    <div className="mt-4 p-4 bg-gray-800/50 rounded-lg">
                      <h4 className="font-semibold text-green-100 mb-2">
                        📝 Copys Geradas:
                      </h4>
                      {result.details.generatedCopies.slice(0, 2).map((copy, i) => (
                        <div key={i} className="mb-3 text-sm">
                          <p className="font-medium text-gray-300">Criativo {i + 1}:</p>
                          <p className="text-green-300 italic">
                            "{copy.headlines[0]}"
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 flex gap-3">
                    <a
                      href={`https://business.facebook.com/adsmanager/manage/campaigns?act=${process.env.NEXT_PUBLIC_META_AD_ACCOUNT_ID}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Ver no Ads Manager
                    </a>
                    <button
                      onClick={resetForm}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Criar Nova Campanha
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Resultado de Erro */}
        <AnimatePresence>
          {status === 'error' && result && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-red-900/30 rounded-xl p-6 border border-red-700/50"
            >
              <div className="flex items-start gap-4">
                <AlertCircle className="w-8 h-8 text-red-400 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-red-100">
                    ❌ Erro ao Criar Campanha
                  </h3>
                  <p className="mt-2 text-red-300">
                    {result.error}
                  </p>
                  <button
                    onClick={() => setStatus('idle')}
                    className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Tentar Novamente
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Formulário (escondido durante processamento/resultado) */}
        {status === 'idle' && (
          <>
            {/* Área de Drag & Drop */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all',
                isDragging
                  ? 'border-purple-500 bg-purple-900/30'
                  : 'border-gray-500 hover:border-purple-400 hover:bg-gray-800/50'
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
              
              <div className="flex items-center justify-center gap-3 mb-4">
                <ImageIcon className={cn(
                  'w-10 h-10',
                  isDragging ? 'text-purple-400' : 'text-white'
                )} />
                <span className="text-2xl text-white">+</span>
                <Film className={cn(
                  'w-10 h-10',
                  isDragging ? 'text-purple-400' : 'text-white'
                )} />
              </div>
              
              <p className="text-lg font-medium text-white">
                {isDragging ? 'Solte os arquivos aqui' : 'Arraste imagens ou vídeos'}
              </p>
              <p className="text-sm text-gray-300 mt-2">
                📷 JPG, PNG, WebP • 🎬 MP4, MOV • Máximo 10 arquivos
              </p>
            </div>

            {/* Preview das Imagens e Vídeos */}
            {files.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="relative group aspect-square rounded-lg overflow-hidden bg-gray-800"
                  >
                    {file.type === 'video' ? (
                      <div className="relative w-full h-full">
                        <video
                          src={file.preview}
                          className="w-full h-full object-cover"
                          muted
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <Film className="w-8 h-8 text-white" />
                        </div>
                      </div>
                    ) : (
                      <img
                        src={file.preview}
                        alt={file.file.name}
                        className="w-full h-full object-cover"
                      />
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(file.id);
                      }}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
                      <div className="flex items-center gap-1">
                        {file.type === 'video' ? (
                          <Film className="w-3 h-3 text-purple-300" />
                        ) : (
                          <ImageIcon className="w-3 h-3 text-blue-300" />
                        )}
                        <p className="text-xs text-white truncate">
                          {file.file.name}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Campos do Formulário */}
            <div className="space-y-4">
              {/* Objetivo da Campanha */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                  <Target className="w-4 h-4" />
                  Objetivo da Campanha *
                </label>
                <input
                  type="text"
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  placeholder="Ex: Venda de Curso de Medicina, Lançamento de Produto..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-600 bg-gray-800 text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Público Alvo e Orçamento */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                    <Users className="w-4 h-4" />
                    Público Alvo
                  </label>
                  <select
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-600 bg-gray-800 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    {AUDIENCE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                    <DollarSign className="w-4 h-4" />
                    Orçamento Diário (R$)
                  </label>
                  <input
                    type="number"
                    value={dailyBudget}
                    onChange={(e) => setDailyBudget(e.target.value)}
                    min="6"
                    step="1"
                    className="w-full px-4 py-3 rounded-xl border border-gray-600 bg-gray-800 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-300 mt-1">Mínimo: R$ 6,00</p>
                </div>
              </div>

              {/* Opções Avançadas */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-2 text-sm font-medium text-purple-400 hover:text-purple-300"
                >
                  {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  Opções Avançadas
                </button>

                <AnimatePresence>
                  {showAdvanced && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-4 space-y-4">
                        {/* URL de Destino */}
                        <div>
                          <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                            <Link2 className="w-4 h-4" />
                            URL de Destino (opcional)
                          </label>
                          <input
                            type="url"
                            value={linkUrl}
                            onChange={(e) => setLinkUrl(e.target.value)}
                            placeholder="https://seusite.com.br/checkout"
                            className="w-full px-4 py-3 rounded-xl border border-gray-600 bg-gray-800 text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          />
                        </div>

                        {/* Status de Publicação */}
                        <div>
                          <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                            <Eye className="w-4 h-4" />
                            Status ao Publicar
                          </label>
                          <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                value="PAUSED"
                                checked={publishStatus === 'PAUSED'}
                                onChange={() => setPublishStatus('PAUSED')}
                                className="text-purple-600 focus:ring-purple-500"
                              />
                              <span className="text-gray-300">
                                ⏸️ Pausado (revisar antes)
                              </span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                value="ACTIVE"
                                checked={publishStatus === 'ACTIVE'}
                                onChange={() => setPublishStatus('ACTIVE')}
                                className="text-purple-600 focus:ring-purple-500"
                              />
                              <span className="text-gray-300">
                                ▶️ Ativo (publicar direto)
                              </span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Botão de Ação */}
            <button
              onClick={handleLaunch}
              disabled={files.length === 0 || !objective || isProcessing}
              className={cn(
                'w-full py-4 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-3',
                files.length === 0 || !objective
                  ? 'bg-gray-600 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-lg hover:shadow-xl'
              )}
            >
              <Sparkles className="w-5 h-5" />
              Gerar e Publicar Campanha
              {files.length > 0 && (
                <span className="px-2 py-0.5 bg-white/20 rounded-full text-sm">
                  {files.length} {files.length === 1 ? 'arquivo' : 'arquivos'}
                </span>
              )}
            </button>

            {/* Info */}
            <div className="text-center text-sm text-gray-300">
              <p>
                💡 A IA irá gerar automaticamente os textos de anúncio otimizados para conversão
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
