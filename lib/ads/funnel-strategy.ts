// =====================================================
// FUNNEL STRATEGY - Estratégias Inteligentes por Funil
// =====================================================
// Define configurações completas de AdSet baseadas em:
// - Estágio do Funil (TOPO, MEIO, FUNDO)
// - Objetivo (TRAFEGO, CONVERSAO, REMARKETING)
// =====================================================

export type FunnelStage = 'TOPO' | 'MEIO' | 'FUNDO';
export type ObjectiveType = 'TRAFEGO' | 'CONVERSAO' | 'REMARKETING' | 'LEADS' | 'ENGAJAMENTO';

export interface FunnelStrategy {
  // Configuração do AdSet
  optimization_goal: string;
  billing_event: string;
  bid_strategy: string;
  bid_amount?: number; // Centavos (ex: 3000 = R$ 30,00)
  
  // Pixel/Conversão
  promoted_object?: {
    pixel_id: string;
    custom_event_type: string;
  };
  
  // Atribuição
  attribution_spec?: Array<{
    event_type: string;
    window_days: number;
  }>;
  
  // Targeting
  targeting: {
    age_min?: number;
    age_max?: number;
    use_custom_audiences: boolean;
    audience_types: ('ENGAGERS' | 'VISITORS' | 'ADD_TO_CART' | 'BUYERS')[];
    exclude_buyers: boolean;
    use_interests: boolean;
    interests?: Array<{ id: string; name: string }>;
  };
  
  // Orçamento
  budget_multiplier: number; // 1.0 = normal, 1.5 = 50% a mais
  
  // CTA recomendado
  recommended_cta: string;
  
  // Metadata
  description: string;
  recommended_duration_days: number;
}

export interface AudienceIds {
  engagers30d?: string;
  visitors90d?: string;
  addToCart?: string;
  buyers?: string[];
}

// Interesses padrão para médicos/saúde
const HEALTH_INTERESTS = [
  { id: '6003107902433', name: 'Health' },
  { id: '6003020834693', name: 'Medicine' },
  { id: '6003139220179', name: 'Medical device' },
  { id: '6003384248805', name: 'Healthcare' },
  { id: '6003397425735', name: 'Medical equipment' }
];

/**
 * Retorna a estratégia completa baseada no funil + objetivo
 * 
 * @param funnelStage - TOPO, MEIO, FUNDO
 * @param objective - TRAFEGO, CONVERSAO, REMARKETING, LEADS
 * @param pixelId - ID do Pixel Meta
 * @returns FunnelStrategy completa
 */
export function getFunnelStrategy(
  funnelStage: FunnelStage,
  objective: ObjectiveType,
  pixelId: string
): FunnelStrategy {
  
  const strategyKey = `${funnelStage}_${objective}`;
  
  console.log(`🎯 [FunnelStrategy] Buscando estratégia: ${strategyKey}`);
  
  const strategies: Record<string, FunnelStrategy> = {
    
    // ========================================
    // TOPO DE FUNIL - Público Frio
    // ========================================
    
    'TOPO_TRAFEGO': {
      optimization_goal: 'LINK_CLICKS',
      billing_event: 'IMPRESSIONS',
      bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
      
      // Sem pixel para tráfego puro
      promoted_object: undefined,
      attribution_spec: [
        { event_type: 'CLICK_THROUGH', window_days: 1 },
        { event_type: 'VIEW_THROUGH', window_days: 1 }
      ],
      
      targeting: {
        age_min: 25,
        // age_max omitido = Advantage+ expande automaticamente
        use_custom_audiences: false,
        audience_types: [],
        exclude_buyers: true,
        use_interests: false
      },
      
      budget_multiplier: 1.0,
      recommended_cta: 'LEARN_MORE',
      description: 'Gerar tráfego frio para remarketing',
      recommended_duration_days: 7
    },
    
    'TOPO_CONVERSAO': {
      optimization_goal: 'OFFSITE_CONVERSIONS',
      billing_event: 'IMPRESSIONS',
      bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
      
      promoted_object: {
        pixel_id: pixelId,
        custom_event_type: 'PURCHASE'
      },
      
      attribution_spec: [
        { event_type: 'CLICK_THROUGH', window_days: 7 },
        { event_type: 'VIEW_THROUGH', window_days: 1 }
      ],
      
      targeting: {
        age_min: 25,
        age_max: 55,
        use_custom_audiences: false,
        audience_types: [],
        exclude_buyers: true,
        use_interests: true,
        interests: HEALTH_INTERESTS
      },
      
      budget_multiplier: 1.5, // 50% a mais (conversão em público frio é mais cara)
      recommended_cta: 'SHOP_NOW',
      description: 'Conversão direta em público frio com interesses',
      recommended_duration_days: 14
    },
    
    'TOPO_LEADS': {
      optimization_goal: 'OFFSITE_CONVERSIONS',
      billing_event: 'IMPRESSIONS',
      bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
      
      promoted_object: {
        pixel_id: pixelId,
        custom_event_type: 'LEAD'
      },
      
      attribution_spec: [
        { event_type: 'CLICK_THROUGH', window_days: 7 },
        { event_type: 'VIEW_THROUGH', window_days: 1 }
      ],
      
      targeting: {
        age_min: 25,
        age_max: 60,
        use_custom_audiences: false,
        audience_types: [],
        exclude_buyers: false,
        use_interests: true,
        interests: HEALTH_INTERESTS
      },
      
      budget_multiplier: 1.2,
      recommended_cta: 'CONTACT_US',
      description: 'Capturar leads em público frio',
      recommended_duration_days: 14
    },
    
    'TOPO_ENGAJAMENTO': {
      optimization_goal: 'POST_ENGAGEMENT',
      billing_event: 'IMPRESSIONS',
      bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
      
      promoted_object: undefined,
      attribution_spec: undefined,
      
      targeting: {
        age_min: 25,
        use_custom_audiences: false,
        audience_types: [],
        exclude_buyers: false,
        use_interests: true,
        interests: HEALTH_INTERESTS
      },
      
      budget_multiplier: 0.8,
      recommended_cta: 'LIKE_PAGE',
      description: 'Gerar engajamento para criar audiência',
      recommended_duration_days: 7
    },
    
    // ========================================
    // MEIO DE FUNIL - Público Morno
    // ========================================
    
    'MEIO_TRAFEGO': {
      optimization_goal: 'LINK_CLICKS',
      billing_event: 'IMPRESSIONS',
      bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
      
      promoted_object: {
        pixel_id: pixelId,
        custom_event_type: 'CONTENT_VIEW'
      },
      
      attribution_spec: [
        { event_type: 'CLICK_THROUGH', window_days: 7 },
        { event_type: 'VIEW_THROUGH', window_days: 1 }
      ],
      
      targeting: {
        age_min: 25,
        use_custom_audiences: true,
        audience_types: ['ENGAGERS'],
        exclude_buyers: true,
        use_interests: false
      },
      
      budget_multiplier: 0.8, // 20% menos (público menor, mais qualificado)
      recommended_cta: 'LEARN_MORE',
      description: 'Reengajar quem interagiu nos últimos 30 dias',
      recommended_duration_days: 7
    },
    
    'MEIO_CONVERSAO': {
      optimization_goal: 'OFFSITE_CONVERSIONS',
      billing_event: 'IMPRESSIONS',
      bid_strategy: 'COST_CAP',
      bid_amount: 5000, // R$ 50,00 por conversão
      
      promoted_object: {
        pixel_id: pixelId,
        custom_event_type: 'ADD_TO_CART'
      },
      
      attribution_spec: [
        { event_type: 'CLICK_THROUGH', window_days: 7 },
        { event_type: 'VIEW_THROUGH', window_days: 1 }
      ],
      
      targeting: {
        age_min: 25,
        use_custom_audiences: true,
        audience_types: ['VISITORS'],
        exclude_buyers: true,
        use_interests: false
      },
      
      budget_multiplier: 1.2,
      recommended_cta: 'SHOP_NOW',
      description: 'Converter visitantes do site em compradores',
      recommended_duration_days: 14
    },
    
    'MEIO_LEADS': {
      optimization_goal: 'OFFSITE_CONVERSIONS',
      billing_event: 'IMPRESSIONS',
      bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
      
      promoted_object: {
        pixel_id: pixelId,
        custom_event_type: 'LEAD'
      },
      
      attribution_spec: [
        { event_type: 'CLICK_THROUGH', window_days: 7 },
        { event_type: 'VIEW_THROUGH', window_days: 1 }
      ],
      
      targeting: {
        age_min: 25,
        use_custom_audiences: true,
        audience_types: ['ENGAGERS', 'VISITORS'],
        exclude_buyers: false,
        use_interests: false
      },
      
      budget_multiplier: 1.0,
      recommended_cta: 'CONTACT_US',
      description: 'Capturar leads de quem já conhece a marca',
      recommended_duration_days: 14
    },
    
    'MEIO_REMARKETING': {
      optimization_goal: 'OFFSITE_CONVERSIONS',
      billing_event: 'IMPRESSIONS',
      bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
      
      promoted_object: {
        pixel_id: pixelId,
        custom_event_type: 'CONTENT_VIEW'
      },
      
      attribution_spec: [
        { event_type: 'CLICK_THROUGH', window_days: 7 },
        { event_type: 'VIEW_THROUGH', window_days: 1 }
      ],
      
      targeting: {
        age_min: 25,
        use_custom_audiences: true,
        audience_types: ['VISITORS'],
        exclude_buyers: true,
        use_interests: false
      },
      
      budget_multiplier: 0.9,
      recommended_cta: 'LEARN_MORE',
      description: 'Remarketing para visitantes do site',
      recommended_duration_days: 14
    },
    
    // ========================================
    // FUNDO DE FUNIL - Público Quente
    // ========================================
    
    'FUNDO_TRAFEGO': {
      optimization_goal: 'LANDING_PAGE_VIEWS',
      billing_event: 'IMPRESSIONS',
      bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
      
      promoted_object: {
        pixel_id: pixelId,
        custom_event_type: 'CONTENT_VIEW'
      },
      
      attribution_spec: [
        { event_type: 'CLICK_THROUGH', window_days: 7 },
        { event_type: 'VIEW_THROUGH', window_days: 1 }
      ],
      
      targeting: {
        age_min: 25,
        use_custom_audiences: true,
        audience_types: ['ADD_TO_CART'],
        exclude_buyers: true,
        use_interests: false
      },
      
      budget_multiplier: 0.6, // Público muito pequeno
      recommended_cta: 'SHOP_NOW',
      description: 'Trazer de volta quem abandonou o carrinho',
      recommended_duration_days: 7
    },
    
    'FUNDO_CONVERSAO': {
      optimization_goal: 'OFFSITE_CONVERSIONS',
      billing_event: 'IMPRESSIONS',
      bid_strategy: 'COST_CAP',
      bid_amount: 3000, // R$ 30,00 (público quente converte mais barato)
      
      promoted_object: {
        pixel_id: pixelId,
        custom_event_type: 'PURCHASE'
      },
      
      attribution_spec: [
        { event_type: 'CLICK_THROUGH', window_days: 7 },
        { event_type: 'VIEW_THROUGH', window_days: 1 }
      ],
      
      targeting: {
        age_min: 25,
        use_custom_audiences: true,
        audience_types: ['ADD_TO_CART'],
        exclude_buyers: true,
        use_interests: false
      },
      
      budget_multiplier: 0.7, // Público menor, mas converte melhor
      recommended_cta: 'SHOP_NOW',
      description: 'Finalizar compra de quem adicionou ao carrinho',
      recommended_duration_days: 7
    },
    
    'FUNDO_REMARKETING': {
      optimization_goal: 'OFFSITE_CONVERSIONS',
      billing_event: 'IMPRESSIONS',
      bid_strategy: 'COST_CAP',
      bid_amount: 2500, // R$ 25,00 (muito quente)
      
      promoted_object: {
        pixel_id: pixelId,
        custom_event_type: 'PURCHASE'
      },
      
      attribution_spec: [
        { event_type: 'CLICK_THROUGH', window_days: 7 },
        { event_type: 'VIEW_THROUGH', window_days: 1 }
      ],
      
      targeting: {
        age_min: 25,
        use_custom_audiences: true,
        audience_types: ['VISITORS', 'ADD_TO_CART'],
        exclude_buyers: true,
        use_interests: false
      },
      
      budget_multiplier: 1.0,
      recommended_cta: 'SHOP_NOW',
      description: 'Remarketing agressivo para quem demonstrou interesse',
      recommended_duration_days: 30
    },
    
    'FUNDO_LEADS': {
      optimization_goal: 'OFFSITE_CONVERSIONS',
      billing_event: 'IMPRESSIONS',
      bid_strategy: 'COST_CAP',
      bid_amount: 2000, // R$ 20,00
      
      promoted_object: {
        pixel_id: pixelId,
        custom_event_type: 'LEAD'
      },
      
      attribution_spec: [
        { event_type: 'CLICK_THROUGH', window_days: 7 },
        { event_type: 'VIEW_THROUGH', window_days: 1 }
      ],
      
      targeting: {
        age_min: 25,
        use_custom_audiences: true,
        audience_types: ['VISITORS', 'ADD_TO_CART'],
        exclude_buyers: false,
        use_interests: false
      },
      
      budget_multiplier: 0.8,
      recommended_cta: 'CONTACT_US',
      description: 'Capturar leads de público muito quente',
      recommended_duration_days: 14
    }
  };
  
  // Buscar estratégia ou fallback
  let strategy = strategies[strategyKey];
  
  if (!strategy) {
    // Fallbacks inteligentes
    const fallbackKey = `${funnelStage}_TRAFEGO`;
    strategy = strategies[fallbackKey];
    
    if (!strategy) {
      strategy = strategies['TOPO_TRAFEGO'];
    }
    
    console.warn(`⚠️ [FunnelStrategy] Estratégia "${strategyKey}" não encontrada, usando fallback: ${fallbackKey || 'TOPO_TRAFEGO'}`);
  }
  
  console.log(`✅ [FunnelStrategy] Estratégia selecionada:`, {
    key: strategyKey,
    optimization_goal: strategy.optimization_goal,
    has_pixel: !!strategy.promoted_object,
    bid_strategy: strategy.bid_strategy,
    budget_multiplier: strategy.budget_multiplier,
    description: strategy.description
  });
  
  return strategy;
}

/**
 * Constrói o targeting completo baseado na estratégia e IDs de audiência
 */
export function buildStrategyTargeting(
  strategy: FunnelStrategy,
  audienceIds: AudienceIds,
  baseLocation: string = 'BR'
): Record<string, unknown> {
  
  const targeting: Record<string, unknown> = {
    geo_locations: { countries: [baseLocation] },
  };
  
  // Idade
  if (strategy.targeting.age_min) {
    targeting.age_min = strategy.targeting.age_min;
  }
  if (strategy.targeting.age_max) {
    targeting.age_max = strategy.targeting.age_max;
  }
  
  // Públicos personalizados
  if (strategy.targeting.use_custom_audiences && strategy.targeting.audience_types.length > 0) {
    const customAudiences: string[] = [];
    
    for (const type of strategy.targeting.audience_types) {
      switch (type) {
        case 'ENGAGERS':
          if (audienceIds.engagers30d) customAudiences.push(audienceIds.engagers30d);
          break;
        case 'VISITORS':
          if (audienceIds.visitors90d) customAudiences.push(audienceIds.visitors90d);
          break;
        case 'ADD_TO_CART':
          if (audienceIds.addToCart) customAudiences.push(audienceIds.addToCart);
          break;
      }
    }
    
    if (customAudiences.length > 0) {
      targeting.custom_audiences = customAudiences.map(id => ({ id }));
      console.log(`📊 [Targeting] Públicos incluídos: ${customAudiences.length}`);
    }
  }
  
  // Exclusões (compradores)
  if (strategy.targeting.exclude_buyers && audienceIds.buyers && audienceIds.buyers.length > 0) {
    targeting.excluded_custom_audiences = audienceIds.buyers.map(id => ({ id }));
    console.log(`🚫 [Targeting] Compradores excluídos: ${audienceIds.buyers.length}`);
  }
  
  // Interesses
  if (strategy.targeting.use_interests && strategy.targeting.interests) {
    targeting.flexible_spec = [
      {
        interests: strategy.targeting.interests
      }
    ];
    console.log(`🎯 [Targeting] Interesses aplicados: ${strategy.targeting.interests.length}`);
  }
  
  // Posicionamentos Advantage+
  targeting.publisher_platforms = ['facebook', 'instagram', 'audience_network'];
  targeting.facebook_positions = ['feed', 'story', 'marketplace', 'right_hand_column'];
  targeting.instagram_positions = ['stream', 'story', 'reels', 'explore', 'explore_home'];
  
  return targeting;
}

/**
 * Calcula orçamento ajustado baseado na estratégia
 */
export function calculateAdjustedBudget(
  baseBudget: number,
  strategy: FunnelStrategy
): { adjusted: number; multiplier: number; reason: string } {
  const adjusted = Math.round(baseBudget * strategy.budget_multiplier);
  
  let reason = '';
  if (strategy.budget_multiplier > 1) {
    reason = `+${Math.round((strategy.budget_multiplier - 1) * 100)}% (${strategy.description})`;
  } else if (strategy.budget_multiplier < 1) {
    reason = `-${Math.round((1 - strategy.budget_multiplier) * 100)}% (público menor)`;
  } else {
    reason = 'Sem ajuste';
  }
  
  console.log(`💰 [Budget] R$${baseBudget} → R$${adjusted} (${strategy.budget_multiplier}x) - ${reason}`);
  
  return {
    adjusted,
    multiplier: strategy.budget_multiplier,
    reason
  };
}

/**
 * Retorna resumo legível da estratégia para logs/UI
 */
export function getStrategyDescription(
  funnelStage: FunnelStage,
  objective: ObjectiveType
): string {
  const descriptions: Record<string, string> = {
    'TOPO_TRAFEGO': '🌊 Tráfego frio - Gerar visitantes para remarketing',
    'TOPO_CONVERSAO': '💰 Conversão fria - Vender para quem não conhece',
    'TOPO_LEADS': '📱 Leads frios - Capturar contatos de desconhecidos',
    'TOPO_ENGAJAMENTO': '❤️ Engajamento - Criar audiência orgânica',
    'MEIO_TRAFEGO': '🔄 Reengajamento - Trazer de volta quem interagiu',
    'MEIO_CONVERSAO': '🛒 Conversão morna - Vender para visitantes',
    'MEIO_LEADS': '📲 Leads mornos - Capturar contatos de interessados',
    'MEIO_REMARKETING': '👀 Remarketing leve - Lembrar quem visitou',
    'FUNDO_TRAFEGO': '🔥 Tráfego quente - Recuperar carrinhos abandonados',
    'FUNDO_CONVERSAO': '🎯 Conversão quente - Fechar vendas de carrinhos',
    'FUNDO_REMARKETING': '⚡ Remarketing agressivo - Última chance de conversão',
    'FUNDO_LEADS': '📞 Leads quentes - Contatos prontos para comprar'
  };
  
  return descriptions[`${funnelStage}_${objective}`] || `${funnelStage} + ${objective}`;
}
