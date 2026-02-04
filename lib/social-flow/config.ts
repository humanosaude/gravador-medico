/**
 * Social Flow - Network Configurations
 * Configurações completas de cada rede social suportada
 */

import { NetworkConfig, SocialNetwork } from './types';

// =======================
// INSTAGRAM
// =======================
export const INSTAGRAM_CONFIG: NetworkConfig = {
  id: 'instagram',
  name: 'Instagram',
  icon: 'Instagram',
  color: '#E4405F',
  bgColor: 'bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500',
  borderColor: 'border-pink-500',
  maxHashtags: 30,
  maxMentions: 20,
  maxCaptionLength: 2200,
  supportsScheduling: true,
  supportsAnalytics: true,
  supportsStories: true,
  supportsReels: true,
  supportsDMs: true,
  requiresBusinessAccount: true,
  oauthScopes: [
    'instagram_basic',
    'instagram_content_publish',
    'instagram_manage_comments',
    'instagram_manage_insights',
    'instagram_manage_messages',
    'pages_show_list',
    'pages_read_engagement',
    'business_management',
  ],
  postTypes: [
    {
      id: 'feed',
      name: 'Post no Feed',
      icon: 'Image',
      description: 'Imagem ou vídeo no feed principal',
      maxMediaCount: 1,
      allowedMediaTypes: ['image', 'video'],
      aspectRatios: ['1:1', '4:5', '1.91:1'],
      maxDurationSeconds: 60,
      maxFileSizeMB: 100,
    },
    {
      id: 'carousel',
      name: 'Carrossel',
      icon: 'LayoutGrid',
      description: 'Até 10 imagens ou vídeos',
      maxMediaCount: 10,
      allowedMediaTypes: ['image', 'video'],
      aspectRatios: ['1:1', '4:5'],
      maxDurationSeconds: 60,
      maxFileSizeMB: 100,
    },
    {
      id: 'reel',
      name: 'Reels',
      icon: 'Film',
      description: 'Vídeo vertical de até 15 minutos',
      maxMediaCount: 1,
      allowedMediaTypes: ['video'],
      aspectRatios: ['9:16'],
      maxDurationSeconds: 900,
      maxFileSizeMB: 100,
    },
    {
      id: 'story',
      name: 'Stories',
      icon: 'Circle',
      description: 'Conteúdo temporário de 24h',
      maxMediaCount: 1,
      allowedMediaTypes: ['image', 'video'],
      aspectRatios: ['9:16'],
      maxDurationSeconds: 15,
      maxFileSizeMB: 30,
    },
  ],
};

// =======================
// FACEBOOK
// =======================
export const FACEBOOK_CONFIG: NetworkConfig = {
  id: 'facebook',
  name: 'Facebook',
  icon: 'Facebook',
  color: '#1877F2',
  bgColor: 'bg-blue-600',
  borderColor: 'border-blue-500',
  maxHashtags: 30,
  maxMentions: 50,
  maxCaptionLength: 63206,
  supportsScheduling: true,
  supportsAnalytics: true,
  supportsStories: true,
  supportsReels: true,
  supportsDMs: true,
  requiresBusinessAccount: false,
  oauthScopes: [
    'pages_show_list',
    'pages_read_engagement',
    'pages_manage_posts',
    'pages_read_user_content',
    'pages_manage_metadata',
    'pages_manage_engagement',
    'business_management',
  ],
  postTypes: [
    {
      id: 'post',
      name: 'Post',
      icon: 'FileText',
      description: 'Post de texto, imagem ou vídeo',
      maxMediaCount: 10,
      allowedMediaTypes: ['image', 'video'],
      aspectRatios: ['1:1', '4:5', '16:9', '1.91:1'],
      maxDurationSeconds: 240 * 60,
      maxFileSizeMB: 4096,
    },
    {
      id: 'reel',
      name: 'Reels',
      icon: 'Film',
      description: 'Vídeo vertical curto',
      maxMediaCount: 1,
      allowedMediaTypes: ['video'],
      aspectRatios: ['9:16'],
      maxDurationSeconds: 90,
      maxFileSizeMB: 1024,
    },
    {
      id: 'story',
      name: 'Stories',
      icon: 'Circle',
      description: 'Conteúdo temporário',
      maxMediaCount: 1,
      allowedMediaTypes: ['image', 'video'],
      aspectRatios: ['9:16'],
      maxDurationSeconds: 20,
      maxFileSizeMB: 100,
    },
    {
      id: 'link',
      name: 'Link Post',
      icon: 'Link',
      description: 'Compartilhar um link com preview',
      maxMediaCount: 1,
      allowedMediaTypes: ['image'],
      aspectRatios: ['1.91:1'],
      maxFileSizeMB: 8,
    },
  ],
};

// =======================
// TWITTER / X
// =======================
export const TWITTER_CONFIG: NetworkConfig = {
  id: 'twitter',
  name: 'X (Twitter)',
  icon: 'Twitter',
  color: '#000000',
  bgColor: 'bg-black',
  borderColor: 'border-gray-700',
  maxHashtags: 10,
  maxMentions: 50,
  maxCaptionLength: 280,
  supportsScheduling: true,
  supportsAnalytics: true,
  supportsStories: false,
  supportsReels: false,
  supportsDMs: true,
  requiresBusinessAccount: false,
  oauthScopes: [
    'tweet.read',
    'tweet.write',
    'users.read',
    'offline.access',
    'dm.read',
    'dm.write',
  ],
  postTypes: [
    {
      id: 'tweet',
      name: 'Tweet',
      icon: 'MessageSquare',
      description: 'Post de até 280 caracteres',
      maxMediaCount: 4,
      allowedMediaTypes: ['image', 'video', 'gif'],
      aspectRatios: ['16:9', '1:1'],
      maxDurationSeconds: 140,
      maxFileSizeMB: 512,
    },
    {
      id: 'thread',
      name: 'Thread',
      icon: 'MessageCircle',
      description: 'Sequência de tweets conectados',
      maxMediaCount: 4,
      allowedMediaTypes: ['image', 'video', 'gif'],
      aspectRatios: ['16:9', '1:1'],
      maxDurationSeconds: 140,
      maxFileSizeMB: 512,
    },
    {
      id: 'poll',
      name: 'Enquete',
      icon: 'BarChart2',
      description: 'Tweet com enquete interativa',
      maxMediaCount: 0,
      allowedMediaTypes: [],
      aspectRatios: [],
      maxFileSizeMB: 0,
    },
  ],
};

// =======================
// LINKEDIN
// =======================
export const LINKEDIN_CONFIG: NetworkConfig = {
  id: 'linkedin',
  name: 'LinkedIn',
  icon: 'Linkedin',
  color: '#0A66C2',
  bgColor: 'bg-blue-700',
  borderColor: 'border-blue-600',
  maxHashtags: 30,
  maxMentions: 30,
  maxCaptionLength: 3000,
  supportsScheduling: true,
  supportsAnalytics: true,
  supportsStories: false,
  supportsReels: false,
  supportsDMs: true,
  requiresBusinessAccount: false,
  oauthScopes: [
    'r_liteprofile',
    'r_emailaddress',
    'w_member_social',
    'r_organization_social',
    'w_organization_social',
    'rw_organization_admin',
  ],
  postTypes: [
    {
      id: 'post',
      name: 'Post',
      icon: 'FileText',
      description: 'Texto, imagem ou vídeo',
      maxMediaCount: 9,
      allowedMediaTypes: ['image', 'video'],
      aspectRatios: ['1:1', '4:5', '16:9', '1.91:1'],
      maxDurationSeconds: 600,
      maxFileSizeMB: 5120,
    },
    {
      id: 'document',
      name: 'Documento',
      icon: 'FileText',
      description: 'PDF como carrossel',
      maxMediaCount: 1,
      allowedMediaTypes: ['document'],
      aspectRatios: ['1:1.29'],
      maxFileSizeMB: 100,
    },
    {
      id: 'article',
      name: 'Artigo',
      icon: 'BookOpen',
      description: 'Artigo longo com formatação',
      maxMediaCount: 10,
      allowedMediaTypes: ['image'],
      aspectRatios: ['16:9'],
      maxFileSizeMB: 10,
    },
    {
      id: 'carousel',
      name: 'Carrossel',
      icon: 'LayoutGrid',
      description: 'Múltiplas imagens',
      maxMediaCount: 9,
      allowedMediaTypes: ['image'],
      aspectRatios: ['1:1', '4:5'],
      maxFileSizeMB: 10,
    },
  ],
};

// =======================
// YOUTUBE
// =======================
export const YOUTUBE_CONFIG: NetworkConfig = {
  id: 'youtube',
  name: 'YouTube',
  icon: 'Youtube',
  color: '#FF0000',
  bgColor: 'bg-red-600',
  borderColor: 'border-red-500',
  maxHashtags: 15,
  maxMentions: 0,
  maxCaptionLength: 5000,
  supportsScheduling: true,
  supportsAnalytics: true,
  supportsStories: false,
  supportsReels: false,
  supportsDMs: false,
  requiresBusinessAccount: false,
  oauthScopes: [
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/youtube.force-ssl',
    'https://www.googleapis.com/auth/yt-analytics.readonly',
  ],
  postTypes: [
    {
      id: 'video',
      name: 'Vídeo',
      icon: 'Video',
      description: 'Vídeo completo para o canal',
      maxMediaCount: 1,
      allowedMediaTypes: ['video'],
      aspectRatios: ['16:9'],
      maxDurationSeconds: 43200, // 12 horas
      maxFileSizeMB: 256000, // 256GB
    },
    {
      id: 'short',
      name: 'Shorts',
      icon: 'Film',
      description: 'Vídeo vertical de até 60s',
      maxMediaCount: 1,
      allowedMediaTypes: ['video'],
      aspectRatios: ['9:16'],
      maxDurationSeconds: 60,
      maxFileSizeMB: 256000,
    },
  ],
};

// =======================
// TIKTOK
// =======================
export const TIKTOK_CONFIG: NetworkConfig = {
  id: 'tiktok',
  name: 'TikTok',
  icon: 'Music',
  color: '#000000',
  bgColor: 'bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500',
  borderColor: 'border-pink-500',
  maxHashtags: 30,
  maxMentions: 20,
  maxCaptionLength: 2200,
  supportsScheduling: true,
  supportsAnalytics: true,
  supportsStories: false,
  supportsReels: false,
  supportsDMs: true,
  requiresBusinessAccount: false,
  oauthScopes: [
    'user.info.basic',
    'video.list',
    'video.publish',
    'video.upload',
  ],
  postTypes: [
    {
      id: 'video',
      name: 'Vídeo',
      icon: 'Video',
      description: 'Vídeo vertical de até 10 minutos',
      maxMediaCount: 1,
      allowedMediaTypes: ['video'],
      aspectRatios: ['9:16'],
      maxDurationSeconds: 600,
      maxFileSizeMB: 287,
    },
  ],
};

// =======================
// PINTEREST
// =======================
export const PINTEREST_CONFIG: NetworkConfig = {
  id: 'pinterest',
  name: 'Pinterest',
  icon: 'Pin',
  color: '#E60023',
  bgColor: 'bg-red-700',
  borderColor: 'border-red-600',
  maxHashtags: 20,
  maxMentions: 0,
  maxCaptionLength: 500,
  supportsScheduling: true,
  supportsAnalytics: true,
  supportsStories: false,
  supportsReels: false,
  supportsDMs: false,
  requiresBusinessAccount: false,
  oauthScopes: [
    'boards:read',
    'boards:write',
    'pins:read',
    'pins:write',
    'user_accounts:read',
  ],
  postTypes: [
    {
      id: 'pin',
      name: 'Pin',
      icon: 'Pin',
      description: 'Imagem ou vídeo com link',
      maxMediaCount: 1,
      allowedMediaTypes: ['image', 'video'],
      aspectRatios: ['2:3', '1:1'],
      maxDurationSeconds: 60,
      maxFileSizeMB: 32,
    },
    {
      id: 'idea_pin',
      name: 'Idea Pin',
      icon: 'Lightbulb',
      description: 'Pin com múltiplas páginas',
      maxMediaCount: 20,
      allowedMediaTypes: ['image', 'video'],
      aspectRatios: ['9:16'],
      maxDurationSeconds: 60,
      maxFileSizeMB: 32,
    },
  ],
};

// =======================
// MAPA DE CONFIGURAÇÕES
// =======================

export const NETWORK_CONFIGS: Record<SocialNetwork, NetworkConfig> = {
  instagram: INSTAGRAM_CONFIG,
  facebook: FACEBOOK_CONFIG,
  twitter: TWITTER_CONFIG,
  linkedin: LINKEDIN_CONFIG,
  youtube: YOUTUBE_CONFIG,
  tiktok: TIKTOK_CONFIG,
  pinterest: PINTEREST_CONFIG,
};

// =======================
// HELPERS
// =======================

export function getNetworkConfig(network: SocialNetwork): NetworkConfig {
  return NETWORK_CONFIGS[network];
}

export function getNetworkColor(network: SocialNetwork): string {
  return NETWORK_CONFIGS[network].color;
}

export function getNetworkName(network: SocialNetwork): string {
  return NETWORK_CONFIGS[network].name;
}

export function getAllNetworks(): SocialNetwork[] {
  return Object.keys(NETWORK_CONFIGS) as SocialNetwork[];
}

export function getActiveNetworks(): SocialNetwork[] {
  // Por enquanto, apenas Instagram está ativo com chaves
  // Outras redes estão prontas para conexão futura
  return ['instagram'];
}

export function isNetworkActive(network: SocialNetwork): boolean {
  return getActiveNetworks().includes(network);
}

// Redes que requerem conta Business/Creator
export function requiresBusinessAccount(network: SocialNetwork): boolean {
  return NETWORK_CONFIGS[network].requiresBusinessAccount;
}

// Validar formato de mídia para uma rede
export function isValidMediaFormat(
  network: SocialNetwork,
  postType: string,
  mediaType: string,
  aspectRatio?: string
): { valid: boolean; error?: string } {
  const config = NETWORK_CONFIGS[network];
  const postTypeConfig = config.postTypes.find(pt => pt.id === postType);
  
  if (!postTypeConfig) {
    return { valid: false, error: `Tipo de post "${postType}" não suportado no ${config.name}` };
  }
  
  if (!postTypeConfig.allowedMediaTypes.includes(mediaType as any)) {
    return { 
      valid: false, 
      error: `Tipo de mídia "${mediaType}" não permitido para ${postTypeConfig.name}` 
    };
  }
  
  if (aspectRatio && !postTypeConfig.aspectRatios.includes(aspectRatio)) {
    return { 
      valid: false, 
      error: `Proporção "${aspectRatio}" não suportada. Use: ${postTypeConfig.aspectRatios.join(', ')}` 
    };
  }
  
  return { valid: true };
}

// Rate limits por rede
export const RATE_LIMITS: Record<SocialNetwork, {
  postsPerDay: number;
  requestsPerHour: number;
  commentsPerHour: number;
}> = {
  instagram: {
    postsPerDay: 25,
    requestsPerHour: 200,
    commentsPerHour: 100,
  },
  facebook: {
    postsPerDay: 50,
    requestsPerHour: 200,
    commentsPerHour: 200,
  },
  twitter: {
    postsPerDay: 100,
    requestsPerHour: 300,
    commentsPerHour: 100,
  },
  linkedin: {
    postsPerDay: 50,
    requestsPerHour: 100,
    commentsPerHour: 50,
  },
  youtube: {
    postsPerDay: 6,
    requestsPerHour: 1000,
    commentsPerHour: 50,
  },
  tiktok: {
    postsPerDay: 50,
    requestsPerHour: 100,
    commentsPerHour: 50,
  },
  pinterest: {
    postsPerDay: 50,
    requestsPerHour: 200,
    commentsPerHour: 0,
  },
};
