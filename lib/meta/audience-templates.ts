/**
 * Templates de Públicos Essenciais Meta Ads
 * 
 * Sistema de configuração de públicos pré-definidos para automação
 */

// ============================================
// TIPOS
// ============================================

export type AudienceType = 
  | 'WEBSITE'        // Visitantes do site (Pixel)
  | 'CUSTOMER_LIST'  // Lista de clientes (CSV/Email)
  | 'ENGAGEMENT'     // Engajamento (curtidas, comentários)
  | 'LOOKALIKE'      // Público similar
  | 'VIDEO'          // Assistiu vídeos
  | 'LEAD_FORM';     // Respondeu formulário

export type AudienceRetention = '7' | '14' | '30' | '60' | '90' | '180' | '365';

export type CampaignObjective = 'TRAFFIC' | 'CONVERSION' | 'REMARKETING' | 'ACQUISITION';

export interface AudienceTemplate {
  id: string;
  name: string;
  type: AudienceType;
  description: string;
  retention_days: AudienceRetention;
  rule: any; // Regras específicas da Meta API
  recommended_for: CampaignObjective[];
  is_essential: boolean;
  priority: number; // Ordem de criação (menor = primeiro)
  funnel_stage: 'TOPO' | 'MEIO' | 'FUNDO';
  use_for_exclusion?: boolean; // Usar para excluir de campanhas
}

export interface LookalikeConfig {
  id: string;
  name: string;
  source_template_id: string; // ID do template base
  ratio: number; // 0.01 = 1%, 0.03 = 3%, etc
  country: string;
  description: string;
  recommended_for: CampaignObjective[];
  priority: number;
}

// ============================================
// TEMPLATES DE PÚBLICOS ESSENCIAIS
// ============================================

export const ESSENTIAL_AUDIENCES: AudienceTemplate[] = [
  // === PÚBLICOS DE WEBSITE (PIXEL) - FUNDO DE FUNIL ===
  
  {
    id: 'all-visitors-180d',
    name: 'Todos os Visitantes do Site (180 dias)',
    type: 'WEBSITE',
    description: 'Base completa de visitantes - usar para remarketing geral',
    retention_days: '180',
    rule: {
      inclusions: {
        operator: 'or',
        rules: [
          {
            event_sources: [{ type: 'pixel', id: '{{PIXEL_ID}}' }],
            retention_seconds: 15552000, // 180 dias
            filter: { 
              operator: 'or', 
              filters: [{ field: 'url', operator: 'i_contains', value: '/' }] 
            }
          }
        ]
      }
    },
    recommended_for: ['REMARKETING'],
    is_essential: true,
    priority: 1,
    funnel_stage: 'MEIO'
  },
  
  {
    id: 'visitors-30d',
    name: 'Visitantes Recentes (30 dias)',
    type: 'WEBSITE',
    description: 'Público quente - maior probabilidade de conversão',
    retention_days: '30',
    rule: {
      inclusions: {
        operator: 'or',
        rules: [
          {
            event_sources: [{ type: 'pixel', id: '{{PIXEL_ID}}' }],
            retention_seconds: 2592000, // 30 dias
            filter: { 
              operator: 'or', 
              filters: [{ field: 'url', operator: 'i_contains', value: '/' }] 
            }
          }
        ]
      }
    },
    recommended_for: ['REMARKETING', 'CONVERSION'],
    is_essential: true,
    priority: 2,
    funnel_stage: 'FUNDO'
  },

  {
    id: 'visitors-7d',
    name: 'Visitantes Ultra Recentes (7 dias)',
    type: 'WEBSITE',
    description: 'Público muito quente - prioridade máxima de conversão',
    retention_days: '7',
    rule: {
      inclusions: {
        operator: 'or',
        rules: [
          {
            event_sources: [{ type: 'pixel', id: '{{PIXEL_ID}}' }],
            retention_seconds: 604800, // 7 dias
            filter: { 
              operator: 'or', 
              filters: [{ field: 'url', operator: 'i_contains', value: '/' }] 
            }
          }
        ]
      }
    },
    recommended_for: ['CONVERSION'],
    is_essential: true,
    priority: 3,
    funnel_stage: 'FUNDO'
  },
  
  {
    id: 'checkout-abandoners-30d',
    name: 'Abandonou Checkout (30 dias)',
    type: 'WEBSITE',
    description: 'CRÍTICO - Alta intenção de compra, não finalizou',
    retention_days: '30',
    rule: {
      inclusions: {
        operator: 'or',
        rules: [
          {
            event_sources: [{ type: 'pixel', id: '{{PIXEL_ID}}' }],
            retention_seconds: 2592000,
            filter: { 
              operator: 'and', 
              filters: [
                { field: 'event', operator: 'eq', value: 'InitiateCheckout' }
              ]
            }
          }
        ]
      },
      exclusions: {
        operator: 'or',
        rules: [
          {
            event_sources: [{ type: 'pixel', id: '{{PIXEL_ID}}' }],
            retention_seconds: 2592000,
            filter: { field: 'event', operator: 'eq', value: 'Purchase' }
          }
        ]
      }
    },
    recommended_for: ['CONVERSION'],
    is_essential: true,
    priority: 4,
    funnel_stage: 'FUNDO'
  },

  {
    id: 'add-to-cart-30d',
    name: 'Adicionou ao Carrinho (30 dias)',
    type: 'WEBSITE',
    description: 'Demonstrou interesse claro - não finalizou compra',
    retention_days: '30',
    rule: {
      inclusions: {
        operator: 'or',
        rules: [
          {
            event_sources: [{ type: 'pixel', id: '{{PIXEL_ID}}' }],
            retention_seconds: 2592000,
            filter: { 
              operator: 'and', 
              filters: [
                { field: 'event', operator: 'eq', value: 'AddToCart' }
              ]
            }
          }
        ]
      },
      exclusions: {
        operator: 'or',
        rules: [
          {
            event_sources: [{ type: 'pixel', id: '{{PIXEL_ID}}' }],
            retention_seconds: 2592000,
            filter: { field: 'event', operator: 'eq', value: 'Purchase' }
          }
        ]
      }
    },
    recommended_for: ['CONVERSION'],
    is_essential: true,
    priority: 5,
    funnel_stage: 'FUNDO'
  },
  
  {
    id: 'purchasers-180d',
    name: 'Compradores (180 dias)',
    type: 'WEBSITE',
    description: 'Para EXCLUIR de campanhas de aquisição',
    retention_days: '180',
    rule: {
      inclusions: {
        operator: 'or',
        rules: [
          {
            event_sources: [{ type: 'pixel', id: '{{PIXEL_ID}}' }],
            retention_seconds: 15552000,
            filter: { field: 'event', operator: 'eq', value: 'Purchase' }
          }
        ]
      }
    },
    recommended_for: [],
    is_essential: true,
    priority: 6,
    funnel_stage: 'FUNDO',
    use_for_exclusion: true
  },

  {
    id: 'purchasers-30d',
    name: 'Compradores Recentes (30 dias)',
    type: 'WEBSITE',
    description: 'Para excluir de remarketing agressivo',
    retention_days: '30',
    rule: {
      inclusions: {
        operator: 'or',
        rules: [
          {
            event_sources: [{ type: 'pixel', id: '{{PIXEL_ID}}' }],
            retention_seconds: 2592000,
            filter: { field: 'event', operator: 'eq', value: 'Purchase' }
          }
        ]
      }
    },
    recommended_for: [],
    is_essential: true,
    priority: 7,
    funnel_stage: 'FUNDO',
    use_for_exclusion: true
  },

  {
    id: 'high-intent-3min',
    name: 'Tempo no Site > 3 minutos (90 dias)',
    type: 'WEBSITE',
    description: 'Público altamente qualificado - interesse demonstrado',
    retention_days: '90',
    rule: {
      inclusions: {
        operator: 'or',
        rules: [
          {
            event_sources: [{ type: 'pixel', id: '{{PIXEL_ID}}' }],
            retention_seconds: 7776000, // 90 dias
            filter: { 
              operator: 'and', 
              filters: [
                { field: 'url', operator: 'i_contains', value: '/' }
              ]
            },
            aggregation: {
              type: 'time_spent',
              method: 'percentile',
              operator: 'gte',
              value: 180 // 3 minutos
            }
          }
        ]
      }
    },
    recommended_for: ['CONVERSION', 'REMARKETING'],
    is_essential: false,
    priority: 8,
    funnel_stage: 'MEIO'
  },

  // === PÚBLICOS DE ENGAJAMENTO - MEIO DE FUNIL ===
  
  {
    id: 'page-engagement-365d',
    name: 'Engajamento com a Página FB (365 dias)',
    type: 'ENGAGEMENT',
    description: 'Curtiu, comentou ou compartilhou posts no Facebook',
    retention_days: '365',
    rule: {
      inclusions: {
        operator: 'or',
        rules: [
          { 
            event_sources: [{ type: 'page', id: '{{PAGE_ID}}' }], 
            retention_seconds: 31536000 
          }
        ]
      }
    },
    recommended_for: ['TRAFFIC', 'REMARKETING'],
    is_essential: true,
    priority: 9,
    funnel_stage: 'MEIO'
  },

  {
    id: 'video-viewers-75pct',
    name: 'Assistiu 75%+ dos Vídeos (365 dias)',
    type: 'VIDEO',
    description: 'Engajamento profundo com conteúdo em vídeo',
    retention_days: '365',
    rule: {
      inclusions: {
        operator: 'or',
        rules: [
          {
            event_sources: [{ type: 'page', id: '{{PAGE_ID}}' }],
            retention_seconds: 31536000,
            filter: { 
              operator: 'and',
              filters: [
                { field: 'event', operator: 'eq', value: 'video_watched_75_percent' }
              ]
            }
          }
        ]
      }
    },
    recommended_for: ['REMARKETING', 'CONVERSION'],
    is_essential: false,
    priority: 10,
    funnel_stage: 'MEIO'
  },

  {
    id: 'video-viewers-25pct',
    name: 'Assistiu 25%+ dos Vídeos (365 dias)',
    type: 'VIDEO',
    description: 'Interesse inicial em conteúdo em vídeo',
    retention_days: '365',
    rule: {
      inclusions: {
        operator: 'or',
        rules: [
          {
            event_sources: [{ type: 'page', id: '{{PAGE_ID}}' }],
            retention_seconds: 31536000,
            filter: { 
              operator: 'and',
              filters: [
                { field: 'event', operator: 'eq', value: 'video_watched_25_percent' }
              ]
            }
          }
        ]
      }
    },
    recommended_for: ['TRAFFIC', 'REMARKETING'],
    is_essential: false,
    priority: 11,
    funnel_stage: 'MEIO'
  },

  {
    id: 'ig-engagement-365d',
    name: 'Engajamento no Instagram (365 dias)',
    type: 'ENGAGEMENT',
    description: 'Curtiu, comentou ou salvou posts no Instagram',
    retention_days: '365',
    rule: {
      inclusions: {
        operator: 'or',
        rules: [
          { 
            event_sources: [{ type: 'ig_business', id: '{{IG_ACCOUNT_ID}}' }], 
            retention_seconds: 31536000 
          }
        ]
      }
    },
    recommended_for: ['TRAFFIC', 'REMARKETING'],
    is_essential: true,
    priority: 12,
    funnel_stage: 'MEIO'
  },

  {
    id: 'ig-profile-visit-90d',
    name: 'Visitou Perfil Instagram (90 dias)',
    type: 'ENGAGEMENT',
    description: 'Demonstrou interesse visitando o perfil',
    retention_days: '90',
    rule: {
      inclusions: {
        operator: 'or',
        rules: [
          { 
            event_sources: [{ type: 'ig_business', id: '{{IG_ACCOUNT_ID}}' }], 
            retention_seconds: 7776000,
            filter: {
              operator: 'and',
              filters: [
                { field: 'event', operator: 'eq', value: 'ig_profile_visit' }
              ]
            }
          }
        ]
      }
    },
    recommended_for: ['REMARKETING', 'CONVERSION'],
    is_essential: false,
    priority: 13,
    funnel_stage: 'MEIO'
  }
];

// ============================================
// CONFIGURAÇÕES DE LOOKALIKES
// ============================================

export const ESSENTIAL_LOOKALIKES: LookalikeConfig[] = [
  {
    id: 'lal-purchasers-1pct',
    name: 'Lookalike de Compradores - 1%',
    source_template_id: 'purchasers-180d',
    ratio: 0.01,
    country: 'BR',
    description: 'Público frio de alta qualidade - mais parecido com compradores',
    recommended_for: ['CONVERSION', 'ACQUISITION'],
    priority: 1
  },
  {
    id: 'lal-purchasers-3pct',
    name: 'Lookalike de Compradores - 3%',
    source_template_id: 'purchasers-180d',
    ratio: 0.03,
    country: 'BR',
    description: 'Escalada com qualidade - volume maior mantendo relevância',
    recommended_for: ['CONVERSION', 'TRAFFIC', 'ACQUISITION'],
    priority: 2
  },
  {
    id: 'lal-purchasers-5pct',
    name: 'Lookalike de Compradores - 5%',
    source_template_id: 'purchasers-180d',
    ratio: 0.05,
    country: 'BR',
    description: 'Volume máximo com qualidade - para escalar campanhas',
    recommended_for: ['TRAFFIC', 'ACQUISITION'],
    priority: 3
  },
  {
    id: 'lal-checkout-1pct',
    name: 'Lookalike de Checkout - 1%',
    source_template_id: 'checkout-abandoners-30d',
    ratio: 0.01,
    country: 'BR',
    description: 'Similar a quem demonstrou alta intenção de compra',
    recommended_for: ['CONVERSION'],
    priority: 4
  },
  {
    id: 'lal-high-intent-1pct',
    name: 'Lookalike de Alto Interesse - 1%',
    source_template_id: 'high-intent-3min',
    ratio: 0.01,
    country: 'BR',
    description: 'Similar a quem passou mais tempo no site',
    recommended_for: ['TRAFFIC', 'CONVERSION'],
    priority: 5
  },
  {
    id: 'lal-ig-engagement-1pct',
    name: 'Lookalike de Engajamento IG - 1%',
    source_template_id: 'ig-engagement-365d',
    ratio: 0.01,
    country: 'BR',
    description: 'Similar a quem engajou no Instagram',
    recommended_for: ['TRAFFIC', 'ACQUISITION'],
    priority: 6
  }
];

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

/**
 * Retorna templates de públicos filtrados
 */
export function getAudienceTemplates(options?: {
  essential_only?: boolean;
  funnel_stage?: 'TOPO' | 'MEIO' | 'FUNDO';
  type?: AudienceType;
}): AudienceTemplate[] {
  let templates = [...ESSENTIAL_AUDIENCES];

  if (options?.essential_only) {
    templates = templates.filter(t => t.is_essential);
  }

  if (options?.funnel_stage) {
    templates = templates.filter(t => t.funnel_stage === options.funnel_stage);
  }

  if (options?.type) {
    templates = templates.filter(t => t.type === options.type);
  }

  return templates.sort((a, b) => a.priority - b.priority);
}

/**
 * Retorna públicos recomendados para um objetivo específico
 */
export function getRecommendedAudiences(objective: CampaignObjective): {
  include: AudienceTemplate[];
  exclude: AudienceTemplate[];
} {
  const include = ESSENTIAL_AUDIENCES.filter(
    t => t.recommended_for.includes(objective)
  );

  const exclude = ESSENTIAL_AUDIENCES.filter(t => t.use_for_exclusion);

  return { include, exclude };
}

/**
 * Retorna lookalikes filtrados
 */
export function getLookalikeConfigs(options?: {
  source_template_id?: string;
}): LookalikeConfig[] {
  let configs = [...ESSENTIAL_LOOKALIKES];

  if (options?.source_template_id) {
    configs = configs.filter(l => l.source_template_id === options.source_template_id);
  }

  return configs.sort((a, b) => a.priority - b.priority);
}

/**
 * Prepara a regra do template substituindo placeholders
 */
export function prepareAudienceRule(
  template: AudienceTemplate,
  config: {
    pixel_id?: string;
    page_id?: string;
    ig_account_id?: string;
  }
): any {
  let ruleString = JSON.stringify(template.rule);

  if (config.pixel_id) {
    ruleString = ruleString.replace(/\{\{PIXEL_ID\}\}/g, config.pixel_id);
  }
  if (config.page_id) {
    ruleString = ruleString.replace(/\{\{PAGE_ID\}\}/g, config.page_id);
  }
  if (config.ig_account_id) {
    ruleString = ruleString.replace(/\{\{IG_ACCOUNT_ID\}\}/g, config.ig_account_id);
  }

  return JSON.parse(ruleString);
}

// ============================================
// CONVENÇÃO DE NOMENCLATURA PARA PÚBLICOS
// ============================================

/**
 * Prefixo padrão para identificar públicos criados pelo sistema
 * [GDM] = Gravador Médico (sistema)
 */
export const SYSTEM_PREFIX = '[GDM]';

/**
 * Mapeamento de tipos de público para siglas
 */
const TYPE_LABELS: Record<AudienceType, string> = {
  'WEBSITE': 'WEB',
  'CUSTOMER_LIST': 'LIST',
  'ENGAGEMENT': 'ENG',
  'LOOKALIKE': 'LAL',
  'VIDEO': 'VID',
  'LEAD_FORM': 'LEAD',
};

/**
 * Mapeamento de estágios de funil
 */
const FUNNEL_LABELS: Record<string, string> = {
  'TOPO': 'T',
  'MEIO': 'M', 
  'FUNDO': 'F',
};

/**
 * Gera nome padronizado para público criado pelo sistema
 * Formato: [GDM] [FUNIL] TIPO - Descrição (Xd)
 * 
 * Exemplos:
 * - [GDM] [F] WEB - Visitantes 30d
 * - [GDM] [T] LAL - Compradores 1%
 * - [GDM] [M] ENG - Instagram 365d
 * 
 * @param template - Template do público
 * @param options - Opções adicionais (ex: ratio para lookalike)
 */
export function generateAudienceName(
  template: AudienceTemplate,
  options?: {
    lookalike_ratio?: number;
    custom_suffix?: string;
  }
): string {
  const prefix = SYSTEM_PREFIX;
  const funnel = `[${FUNNEL_LABELS[template.funnel_stage] || 'M'}]`;
  const type = TYPE_LABELS[template.type] || template.type;
  
  // Extrai descrição curta do nome do template
  let shortDesc = template.name
    .replace(/Todos os /gi, '')
    .replace(/do Site /gi, '')
    .replace(/ do Site/gi, '')
    .replace(/ \(.*\)/g, '') // Remove parênteses
    .replace(/dias/gi, 'd')
    .trim();
  
  // Adiciona retenção se não estiver no nome
  if (!shortDesc.includes('d') && template.retention_days) {
    shortDesc = `${shortDesc} ${template.retention_days}d`;
  }
  
  // Para lookalikes, adiciona ratio
  if (options?.lookalike_ratio) {
    const percentage = Math.round(options.lookalike_ratio * 100);
    shortDesc = `${shortDesc} ${percentage}%`;
  }
  
  // Adiciona sufixo customizado se houver
  if (options?.custom_suffix) {
    shortDesc = `${shortDesc} ${options.custom_suffix}`;
  }

  return `${prefix} ${funnel} ${type} - ${shortDesc}`;
}

/**
 * Gera nome padronizado para lookalike
 * Formato: [GDM] [FUNIL] LAL - Base X%
 * 
 * @param config - Configuração do lookalike
 * @param sourceTemplate - Template do público base
 */
export function generateLookalikeName(
  config: LookalikeConfig,
  sourceTemplate: AudienceTemplate
): string {
  const prefix = SYSTEM_PREFIX;
  // Lookalikes geralmente são TOPO de funil
  const funnel = '[T]';
  const percentage = Math.round(config.ratio * 100);
  
  // Simplifica nome do público base
  let baseName = sourceTemplate.name
    .replace(/Todos os /gi, '')
    .replace(/do Site /gi, '')
    .replace(/ do Site/gi, '')
    .replace(/ \(.*\)/g, '')
    .replace(/dias/gi, 'd')
    .substring(0, 30) // Limita tamanho
    .trim();
  
  return `${prefix} ${funnel} LAL - ${baseName} ${percentage}%`;
}

/**
 * Verifica se um público foi criado pelo sistema
 */
export function isSystemAudience(audienceName: string): boolean {
  return audienceName.startsWith(SYSTEM_PREFIX);
}

/**
 * Extrai informações de um nome padronizado
 */
export function parseAudienceName(name: string): {
  isSystemAudience: boolean;
  funnelStage?: string;
  type?: string;
  description?: string;
} | null {
  if (!name.startsWith(SYSTEM_PREFIX)) {
    return { isSystemAudience: false };
  }

  const match = name.match(/\[GDM\] \[([TMF])\] ([A-Z]+) - (.+)/);
  if (!match) {
    return { isSystemAudience: true };
  }

  const funnelMap: Record<string, string> = { 'T': 'TOPO', 'M': 'MEIO', 'F': 'FUNDO' };
  
  return {
    isSystemAudience: true,
    funnelStage: funnelMap[match[1]],
    type: match[2],
    description: match[3],
  };
}

export default {
  ESSENTIAL_AUDIENCES,
  ESSENTIAL_LOOKALIKES,
  getAudienceTemplates,
  getRecommendedAudiences,
  getLookalikeConfigs,
  prepareAudienceRule,
  // Nomenclatura
  SYSTEM_PREFIX,
  generateAudienceName,
  generateLookalikeName,
  isSystemAudience,
  parseAudienceName,
};
