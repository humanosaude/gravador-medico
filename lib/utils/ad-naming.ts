/**
 * =====================================================
 * TAXONOMIA DE NOMENCLATURA PARA ANÚNCIOS META
 * =====================================================
 * 
 * Padrões de nomenclatura para fácil identificação no Dashboard:
 * 
 * CAMPANHA: [IA] • {FUNNEL_STAGE} • {OBJECTIVE_TAG} • {DATE}
 * ADSET:    {AUDIENCE_TYPE} • {DETAILS} • {PLACEMENT}
 * AD:       {FORMAT} • {FILENAME_SLUG} • Copy {COPY_VERSION}
 */

// =====================================================
// TIPOS
// =====================================================

export interface NamingInput {
  // Campanha
  funnelStage: 'topo' | 'meio' | 'fundo' | 'remarketing';
  objectiveTag: string; // Ex: "Venda Gravador", "Captação Leads"
  useAdvantagePlus?: boolean;
  
  // AdSet
  audienceType: 'lookalike' | 'interesse' | 'broad' | 'remarketing' | 'custom';
  audienceDetails?: string; // Ex: "Compradores", "Médicos", "VideoView 50%"
  lookalikePercent?: number; // 1, 2, 3...
  ageRange?: string; // "25-55"
  placement?: 'auto' | 'feed' | 'stories' | 'reels';
  
  // Ad
  mediaFormat: 'video' | 'image' | 'carousel';
  filename?: string; // Nome original do arquivo
  copyVersion?: number; // 1, 2, 3...
  
  // Meta
  launchDate?: Date;
}

export interface GeneratedNames {
  campaignName: string;
  adSetName: string;
  adName: string;
}

// =====================================================
// FUNÇÕES HELPERS
// =====================================================

/**
 * Formata data para DD/MM
 */
function formatDate(date: Date = new Date()): string {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${day}/${month}`;
}

/**
 * Gera slug do nome do arquivo (máx 15 chars)
 */
function generateFileSlug(filename?: string): string {
  if (!filename) return 'criativo';
  
  // Remove extensão
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
  
  // Normaliza: lowercase, remove acentos, substitui espaços por hífen
  const normalized = nameWithoutExt
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9-]/g, '-') // Substitui caracteres especiais
    .replace(/-+/g, '-') // Remove hífens duplicados
    .replace(/^-|-$/g, ''); // Remove hífens no início/fim
  
  // Trunca em 15 caracteres
  return normalized.substring(0, 15);
}

/**
 * Mapeia estágio do funil para label
 */
function getFunnelLabel(stage: NamingInput['funnelStage']): string {
  const labels: Record<string, string> = {
    'topo': 'TOPO',
    'meio': 'MEIO',
    'fundo': 'FUNDO',
    'remarketing': 'RMKT'
  };
  return labels[stage] || 'TOPO';
}

/**
 * Mapeia tipo de audiência para label
 */
function getAudienceLabel(input: NamingInput): string {
  switch (input.audienceType) {
    case 'lookalike':
      const percent = input.lookalikePercent || 1;
      const details = input.audienceDetails || 'Base';
      return `LAL ${percent}% (${details})`;
    
    case 'interesse':
      return `Interesse (${input.audienceDetails || 'Geral'})`;
    
    case 'broad':
      return 'Broad (Aberto)';
    
    case 'remarketing':
      return `RMKT (${input.audienceDetails || 'Engajados'})`;
    
    case 'custom':
      return input.audienceDetails || 'Custom';
    
    default:
      return 'Broad (Aberto)';
  }
}

/**
 * Mapeia formato de mídia para label
 */
function getFormatLabel(format: NamingInput['mediaFormat']): string {
  const labels: Record<string, string> = {
    'video': 'VIDEO',
    'image': 'IMG',
    'carousel': 'CAROUSEL'
  };
  return labels[format] || 'IMG';
}

/**
 * Mapeia placement para label
 */
function getPlacementLabel(placement: NamingInput['placement']): string {
  const labels: Record<string, string> = {
    'auto': 'Auto',
    'feed': 'Feed',
    'stories': 'Stories',
    'reels': 'Reels'
  };
  return labels[placement || 'auto'] || 'Auto';
}

// =====================================================
// FUNÇÃO PRINCIPAL
// =====================================================

/**
 * Gera nomes padronizados para Campanha, AdSet e Ad
 * 
 * @example
 * const names = generateAdNames({
 *   funnelStage: 'topo',
 *   objectiveTag: 'Venda Gravador',
 *   useAdvantagePlus: false,
 *   audienceType: 'lookalike',
 *   audienceDetails: 'Compradores',
 *   lookalikePercent: 1,
 *   ageRange: '25-55',
 *   placement: 'auto',
 *   mediaFormat: 'video',
 *   filename: 'prova-social-dr-joao.mp4',
 *   copyVersion: 1
 * });
 * 
 * // Resultado:
 * // {
 * //   campaignName: "[IA] • TOPO • Venda Gravador • 02/02",
 * //   adSetName: "LAL 1% (Compradores) • 25-55 • Auto",
 * //   adName: "VIDEO • prova-social-dr- • Copy V1"
 * // }
 */
export function generateAdNames(input: NamingInput): GeneratedNames {
  const date = formatDate(input.launchDate);
  
  // ═══════════════════════════════════════
  // NOME DA CAMPANHA
  // ═══════════════════════════════════════
  const prefix = input.useAdvantagePlus ? '[ASC+][IA]' : '[IA]';
  const funnelLabel = getFunnelLabel(input.funnelStage);
  const campaignName = `${prefix} • ${funnelLabel} • ${input.objectiveTag} • ${date}`;
  
  // ═══════════════════════════════════════
  // NOME DO ADSET
  // ═══════════════════════════════════════
  const audienceLabel = getAudienceLabel(input);
  const ageRange = input.ageRange || '18-65';
  const placementLabel = getPlacementLabel(input.placement);
  const adSetName = `${audienceLabel} • ${ageRange} • ${placementLabel}`;
  
  // ═══════════════════════════════════════
  // NOME DO AD
  // ═══════════════════════════════════════
  const formatLabel = getFormatLabel(input.mediaFormat);
  const fileSlug = generateFileSlug(input.filename);
  const copyVersion = input.copyVersion || 1;
  const adName = `${formatLabel} • ${fileSlug} • Copy V${copyVersion}`;
  
  return {
    campaignName,
    adSetName,
    adName
  };
}

// =====================================================
// FUNÇÃO DE BATCH (para múltiplos anúncios)
// =====================================================

export interface BatchNamingInput extends Omit<NamingInput, 'filename' | 'copyVersion'> {
  ads: Array<{
    filename?: string;
    copyVersion?: number;
  }>;
}

/**
 * Gera nomes para múltiplos anúncios na mesma campanha/adset
 */
export function generateBatchAdNames(input: BatchNamingInput): {
  campaignName: string;
  adSetName: string;
  adNames: string[];
} {
  const baseNames = generateAdNames({
    ...input,
    filename: input.ads[0]?.filename,
    copyVersion: input.ads[0]?.copyVersion
  });
  
  const adNames = input.ads.map((ad, index) => {
    const formatLabel = getFormatLabel(input.mediaFormat);
    const fileSlug = generateFileSlug(ad.filename);
    const copyVersion = ad.copyVersion || index + 1;
    return `${formatLabel} • ${fileSlug} • Copy V${copyVersion}`;
  });
  
  return {
    campaignName: baseNames.campaignName,
    adSetName: baseNames.adSetName,
    adNames
  };
}

// =====================================================
// FUNÇÃO PARA EXTRAIR INFO DO NOME (parse reverso)
// =====================================================

export interface ParsedAdName {
  isIA: boolean;
  isAdvantagePlus: boolean;
  funnelStage?: string;
  objective?: string;
  date?: string;
}

/**
 * Extrai informações de um nome de campanha padronizado
 */
export function parseCampaignName(name: string): ParsedAdName {
  const isIA = name.includes('[IA]');
  const isAdvantagePlus = name.includes('[ASC+]');
  
  // Extrai partes divididas por " • "
  const parts = name.split(' • ').map(p => p.trim());
  
  return {
    isIA,
    isAdvantagePlus,
    funnelStage: parts[1], // TOPO, MEIO, FUNDO, RMKT
    objective: parts[2],   // Venda Gravador, etc.
    date: parts[3]         // DD/MM
  };
}

// =====================================================
// INFERÊNCIA DE FUNNEL STAGE
// =====================================================

/**
 * Infere o estágio do funil baseado no objetivo e audiência
 */
export function inferFunnelStage(
  objective: string,
  audienceType: NamingInput['audienceType']
): NamingInput['funnelStage'] {
  // Remarketing é sempre RMKT
  if (audienceType === 'remarketing') {
    return 'remarketing';
  }
  
  // Palavras-chave para cada estágio
  const topoKeywords = ['alcance', 'conhecimento', 'awareness', 'tráfego', 'visualização'];
  const meioKeywords = ['engajamento', 'lead', 'consideração', 'cadastro'];
  const fundoKeywords = ['venda', 'conversão', 'compra', 'checkout', 'purchase'];
  
  const lowerObjective = objective.toLowerCase();
  
  if (fundoKeywords.some(k => lowerObjective.includes(k))) {
    return 'fundo';
  }
  if (meioKeywords.some(k => lowerObjective.includes(k))) {
    return 'meio';
  }
  if (topoKeywords.some(k => lowerObjective.includes(k))) {
    return 'topo';
  }
  
  // Lookalike geralmente é meio/fundo
  if (audienceType === 'lookalike') {
    return 'meio';
  }
  
  // Broad geralmente é topo
  if (audienceType === 'broad') {
    return 'topo';
  }
  
  // Default
  return 'topo';
}
