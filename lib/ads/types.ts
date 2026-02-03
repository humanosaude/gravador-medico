// =====================================================
// TIPOS PARA O SISTEMA DE ADS AUTOMÁTICO
// =====================================================

// Tipos para geração de copy via OpenAI
export interface GeneratedCopy {
  primaryText: string[];
  headlines: string[];
  imageUrl: string;
  metadata?: {
    analysisType?: 'image' | 'video' | 'video_vision_only' | 'professional_prompt' | 'fallback';
    imageDescription?: string;
    audioTranscription?: string;
    cta?: string;
    professionalPromptUsed?: boolean;
  };
}

// Request para criar campanha
export interface CreateCampaignRequest {
  objective: string; // Ex: "Venda de Curso para Médicos"
  dailyBudget: number; // Em reais
  targetAudience: string; // Ex: "Médicos", "Dentistas"
  images: File[];
  status: 'PAUSED' | 'ACTIVE';
}

// Response da criação de campanha
export interface CreateCampaignResponse {
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

// Métricas de anúncio para otimização
export interface AdMetrics {
  adId: string;
  adName: string;
  adSetId: string;
  campaignId: string;
  status: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  purchases: number;
  purchaseValue: number;
  roas: number;
  cpa: number;
}

// Log de otimização
export interface OptimizationLog {
  id?: string;
  ad_id: string;
  ad_name: string;
  adset_id: string;
  campaign_id: string;
  action_type: 'PAUSE' | 'SCALE' | 'NO_ACTION';
  reason: string;
  metrics_before: {
    spend: number;
    purchases: number;
    roas: number;
    daily_budget?: number;
  };
  metrics_after?: {
    daily_budget?: number;
    status?: string;
  };
  created_at?: string;
}

// Config da Meta Ads API
export interface MetaAdsConfig {
  accessToken: string;
  adAccountId: string;
  pageId: string;
}

// Targeting do Facebook
export interface FacebookTargeting {
  geo_locations: {
    countries: string[];
  };
  age_min: number;
  age_max: number;
  interests?: Array<{
    id: string;
    name: string;
  }>;
  flexible_spec?: Array<{
    interests?: Array<{
      id: string;
      name: string;
    }>;
  }>;
}

// Parâmetros do AdSet
export interface AdSetParams {
  name: string;
  campaign_id: string;
  daily_budget: number; // Em centavos
  billing_event: 'IMPRESSIONS' | 'LINK_CLICKS' | 'APP_INSTALLS';
  optimization_goal: 'OFFSITE_CONVERSIONS' | 'LINK_CLICKS' | 'LANDING_PAGE_VIEWS' | 'IMPRESSIONS' | 'REACH';
  targeting: FacebookTargeting;
  status: 'PAUSED' | 'ACTIVE';
  bid_strategy?: 'LOWEST_COST_WITHOUT_CAP' | 'LOWEST_COST_WITH_BID_CAP' | 'COST_CAP';
  start_time?: string;
  end_time?: string;
  // ✅ NOVO: Promoted Object (obrigatório para OFFSITE_CONVERSIONS)
  // Lista completa Meta API v24.0: AD_IMPRESSION, RATE, TUTORIAL_COMPLETION, CONTACT, CUSTOMIZE_PRODUCT, 
  // DONATE, FIND_LOCATION, SCHEDULE, START_TRIAL, SUBMIT_APPLICATION, SUBSCRIBE, ADD_TO_CART, 
  // ADD_TO_WISHLIST, INITIATED_CHECKOUT, ADD_PAYMENT_INFO, PURCHASE, LEAD, COMPLETE_REGISTRATION, 
  // CONTENT_VIEW, SEARCH, SERVICE_BOOKING_REQUEST, MESSAGING_CONVERSATION_STARTED_7D, etc.
  pixel_id?: string;
  custom_event_type?: 'PURCHASE' | 'LEAD' | 'COMPLETE_REGISTRATION' | 'ADD_TO_CART' | 'INITIATED_CHECKOUT' | 'CONTENT_VIEW' | 'SEARCH' | 'ADD_PAYMENT_INFO' | 'ADD_TO_WISHLIST' | 'CONTACT';
}

// Parâmetros do Campaign
export interface CampaignParams {
  name: string;
  objective: 'OUTCOME_SALES' | 'OUTCOME_LEADS' | 'OUTCOME_TRAFFIC' | 'OUTCOME_AWARENESS' | 'OUTCOME_ENGAGEMENT';
  status: 'PAUSED' | 'ACTIVE';
  special_ad_categories: string[];
  daily_budget?: number;
}

// Parâmetros do Ad Creative
export interface AdCreativeParams {
  name: string;
  object_story_spec: {
    page_id: string;
    link_data?: {
      image_hash?: string;
      link: string;
      message: string;
      name: string; // headline
      description?: string;
      call_to_action: {
        type: 'SHOP_NOW' | 'LEARN_MORE' | 'SIGN_UP' | 'DOWNLOAD' | 'CONTACT_US' | 'SUBSCRIBE';
        value: {
          link: string;
        };
      };
    };
    video_data?: {
      video_id: string;
      message: string;
      title: string;
      call_to_action: {
        type: string;
        value: {
          link: string;
        };
      };
    };
  };
}

// Parâmetros do Ad
export interface AdParams {
  name: string;
  adset_id: string;
  creative: {
    creative_id: string;
  };
  status: 'PAUSED' | 'ACTIVE';
  tracking_specs?: Array<{
    action_type: string[];
    fb_pixel: string[];
  }>;
}

// Interesses pré-mapeados para targeting
export const INTEREST_MAPPINGS: Record<string, Array<{ id: string; name: string }>> = {
  'Médicos': [
    { id: '6003156295572', name: 'Medicine' },
    { id: '6003017949840', name: 'Health care' },
    { id: '6003397425735', name: 'Physicians' },
  ],
  'Dentistas': [
    { id: '6003161481557', name: 'Dentistry' },
    { id: '6003017949840', name: 'Health care' },
  ],
  'Enfermeiros': [
    { id: '6003394593475', name: 'Nursing' },
    { id: '6003017949840', name: 'Health care' },
  ],
  'Saúde': [
    { id: '6003017949840', name: 'Health care' },
    { id: '6003139266461', name: 'Fitness and wellness' },
  ],
  'Empreendedores': [
    { id: '6003384248805', name: 'Entrepreneurship' },
    { id: '6003012317397', name: 'Small business' },
    { id: '6003213636182', name: 'Business' },
  ],
  'Educação': [
    { id: '6003132265711', name: 'Education' },
    { id: '6003370129037', name: 'Online learning' },
  ],
  'Tecnologia': [
    { id: '6003426595248', name: 'Technology' },
    { id: '6003486059947', name: 'Software' },
  ],
  'default': [
    { id: '6003017949840', name: 'Health care' },
    { id: '6003156295572', name: 'Medicine' },
  ],
};
