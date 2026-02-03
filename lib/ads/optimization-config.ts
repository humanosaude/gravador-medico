// =====================================================
// OPTIMIZATION CONFIG - Configurações Dinâmicas por Objetivo
// =====================================================
// Define optimization_goal, billing_event, promoted_object, attribution_spec
// baseado no objetivo escolhido pelo usuário
// =====================================================

export type ObjectiveType = 'TRAFEGO' | 'CONVERSAO' | 'LEADS' | 'ENGAJAMENTO' | 'ALCANCE';

export interface OptimizationConfig {
  optimization_goal: string;
  billing_event: string;
  promoted_object?: {
    pixel_id: string;
    custom_event_type: string;
  };
  attribution_spec?: Array<{
    event_type: string;
    window_days: number;
  }>;
  bid_strategy: string;
  description: string;
}

/**
 * Retorna a configuração de otimização correta baseada no objetivo
 * 
 * @param objective - TRAFEGO, CONVERSAO, LEADS, ENGAJAMENTO, ALCANCE
 * @param pixelId - ID do Pixel Meta (obrigatório para CONVERSAO e LEADS)
 * @param funnelStage - TOPO, MEIO, FUNDO (opcional, ajusta evento de conversão)
 */
export function getOptimizationConfig(
  objective: string,
  pixelId: string,
  funnelStage?: string
): OptimizationConfig {
  
  // Normalizar objetivo
  const normalizedObjective = objective.toUpperCase()
    .replace('TRAFFIC', 'TRAFEGO')
    .replace('CONVERSION', 'CONVERSAO')
    .replace('OUTCOME_TRAFFIC', 'TRAFEGO')
    .replace('OUTCOME_SALES', 'CONVERSAO')
    .replace('OUTCOME_LEADS', 'LEADS')
    .replace('OUTCOME_ENGAGEMENT', 'ENGAJAMENTO')
    .replace('OUTCOME_AWARENESS', 'ALCANCE');
  
  console.log(`🎯 getOptimizationConfig: objetivo=${normalizedObjective}, pixelId=${pixelId}, funil=${funnelStage}`);
  
  // =====================================================
  // CONFIGURAÇÕES POR OBJETIVO
  // =====================================================
  
  const configs: Record<string, OptimizationConfig> = {
    
    // ✅ TRÁFEGO - Maximizar clicks no link
    'TRAFEGO': {
      optimization_goal: 'LINK_CLICKS',
      billing_event: 'IMPRESSIONS',
      // promoted_object: NÃO USAR para tráfego
      attribution_spec: [
        { event_type: 'CLICK_THROUGH', window_days: 1 },
        { event_type: 'VIEW_THROUGH', window_days: 1 }
      ],
      bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
      description: 'Otimizado para clicks no link (sem conversão)'
    },
    
    // ✅ CONVERSÃO - Maximizar compras no site
    'CONVERSAO': {
      optimization_goal: 'OFFSITE_CONVERSIONS',
      billing_event: 'IMPRESSIONS',
      promoted_object: {
        pixel_id: pixelId,
        custom_event_type: getConversionEventByFunnel(funnelStage)
      },
      attribution_spec: [
        { event_type: 'CLICK_THROUGH', window_days: 7 },
        { event_type: 'VIEW_THROUGH', window_days: 1 }
      ],
      bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
      description: 'Otimizado para conversões no site (Pixel)'
    },
    
    // ✅ LEADS - Maximizar leads/contatos
    'LEADS': {
      optimization_goal: 'OFFSITE_CONVERSIONS',
      billing_event: 'IMPRESSIONS',
      promoted_object: {
        pixel_id: pixelId,
        custom_event_type: 'LEAD'
      },
      attribution_spec: [
        { event_type: 'CLICK_THROUGH', window_days: 7 },
        { event_type: 'VIEW_THROUGH', window_days: 1 }
      ],
      bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
      description: 'Otimizado para captura de leads'
    },
    
    // ✅ ENGAJAMENTO - Maximizar interações
    'ENGAJAMENTO': {
      optimization_goal: 'POST_ENGAGEMENT',
      billing_event: 'IMPRESSIONS',
      // promoted_object: NÃO USAR para engajamento
      attribution_spec: undefined,
      bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
      description: 'Otimizado para curtidas, comentários, compartilhamentos'
    },
    
    // ✅ ALCANCE - Maximizar pessoas alcançadas
    'ALCANCE': {
      optimization_goal: 'REACH',
      billing_event: 'IMPRESSIONS',
      // promoted_object: NÃO USAR para alcance
      attribution_spec: undefined,
      bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
      description: 'Otimizado para máximo alcance'
    }
  };
  
  // Fallback: TRÁFEGO se objetivo não reconhecido
  const config = configs[normalizedObjective] || configs['TRAFEGO'];
  
  console.log(`✅ Config selecionada: ${config.description}`);
  console.log(`   optimization_goal: ${config.optimization_goal}`);
  console.log(`   promoted_object: ${config.promoted_object ? JSON.stringify(config.promoted_object) : 'N/A'}`);
  
  return config;
}

/**
 * Determina o evento de conversão baseado no estágio do funil
 */
function getConversionEventByFunnel(funnelStage?: string): string {
  switch (funnelStage?.toUpperCase()) {
    case 'TOPO':
      return 'CONTENT_VIEW'; // Visualização de conteúdo
    case 'MEIO':
      return 'ADD_TO_CART'; // Adição ao carrinho
    case 'FUNDO':
    default:
      return 'PURCHASE'; // Compra (padrão)
  }
}

/**
 * Mapeia objetivo da campanha Meta para objetivo de otimização
 */
export function getCampaignObjective(objective: string): string {
  const mapping: Record<string, string> = {
    'TRAFEGO': 'OUTCOME_TRAFFIC',
    'CONVERSAO': 'OUTCOME_SALES',
    'LEADS': 'OUTCOME_LEADS',
    'ENGAJAMENTO': 'OUTCOME_ENGAGEMENT',
    'ALCANCE': 'OUTCOME_AWARENESS'
  };
  
  const normalized = objective.toUpperCase()
    .replace('TRAFFIC', 'TRAFEGO')
    .replace('CONVERSION', 'CONVERSAO');
  
  return mapping[normalized] || 'OUTCOME_TRAFFIC';
}

/**
 * Retorna CTA recomendado baseado no objetivo
 */
export function getRecommendedCTA(objective: string): string {
  const mapping: Record<string, string> = {
    'TRAFEGO': 'LEARN_MORE',
    'CONVERSAO': 'SHOP_NOW',
    'LEADS': 'CONTACT_US',
    'ENGAJAMENTO': 'LIKE_PAGE',
    'ALCANCE': 'LEARN_MORE'
  };
  
  const normalized = objective.toUpperCase()
    .replace('TRAFFIC', 'TRAFEGO')
    .replace('CONVERSION', 'CONVERSAO');
  
  return mapping[normalized] || 'LEARN_MORE';
}

/**
 * Valida se o objetivo requer Pixel configurado
 */
export function requiresPixel(objective: string): boolean {
  const normalized = objective.toUpperCase()
    .replace('TRAFFIC', 'TRAFEGO')
    .replace('CONVERSION', 'CONVERSAO');
  
  return ['CONVERSAO', 'LEADS'].includes(normalized);
}
