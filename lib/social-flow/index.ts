/**
 * Social Flow - Main Entry Point
 * 
 * Sistema completo de gerenciamento de redes sociais multi-plataforma
 * Inspirado em mLabs, com suporte para:
 * - Instagram, Facebook, Twitter, LinkedIn, YouTube, TikTok, Pinterest
 * 
 * @author Social Flow Team
 * @version 1.0.0
 */

// Types
export * from './types';

// Configuration
export { NETWORK_CONFIGS, getNetworkConfig } from './config';

// Networks
export * from './networks';

// Core Services
export * from './core';

// AI Services
export * from './ai';

// Version info
export const SOCIAL_FLOW_VERSION = '1.0.0';

// Feature flags
export const FEATURES = {
  INSTAGRAM_ENABLED: true,
  FACEBOOK_ENABLED: false, // Aguardando chaves de API
  TWITTER_ENABLED: false,
  LINKEDIN_ENABLED: false,
  YOUTUBE_ENABLED: false,
  TIKTOK_ENABLED: false,
  PINTEREST_ENABLED: false,
  
  AI_CAPTIONS: true,
  AI_HASHTAGS: true,
  AI_IMAGE_ANALYSIS: true,
  
  CROSS_POSTING: true,
  SCHEDULING: true,
  ANALYTICS: true,
  BEST_TIMES: true,
  MEDIA_LIBRARY: true,
  TEAM_WORKFLOW: true,
  REPORTS: true,
};

// Re-export principais classes para uso direto
export { InstagramAuth, InstagramAPI, InstagramPublisher, InstagramAnalytics } from './networks/instagram';
export { universalPublisher } from './core/publisher';
export { analyticsAggregator } from './core/analytics-aggregator';
export { schedulerService } from './core/scheduler';
export { aiCaptionGenerator } from './ai/caption-generator';
export { aiHashtagSuggester } from './ai/hashtag-suggester';
export { aiContentAnalyzer } from './ai/content-analyzer';
