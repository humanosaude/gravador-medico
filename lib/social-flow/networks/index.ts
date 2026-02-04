/**
 * Social Flow - Networks Index
 * 
 * Exporta todas as integrações de redes sociais
 */

// Instagram (Implementado)
export * from './instagram';

// Facebook (Estrutura pronta)
export * from './facebook';

// Twitter/X (Estrutura pronta)
export * from './twitter';

// LinkedIn (Estrutura pronta)
export * from './linkedin';

// YouTube (Estrutura pronta)
export * from './youtube';

// TikTok (Estrutura pronta)
export * from './tiktok';

// Pinterest (Estrutura pronta)
export * from './pinterest';

// Network Factory
import { SocialAccount, SocialNetwork } from '../types';
import { InstagramAPI, InstagramPublisher, InstagramAnalytics, InstagramAuth } from './instagram';
import { FacebookAuth, FacebookAPI, FacebookPublisher, FacebookAnalytics } from './facebook';
import { TwitterAuth, TwitterAPI, TwitterPublisher, TwitterAnalytics } from './twitter';
import { LinkedInAuth, LinkedInAPI, LinkedInPublisher, LinkedInAnalytics } from './linkedin';
import { YouTubeAuth, YouTubeAPI, YouTubePublisher, YouTubeAnalytics } from './youtube';
import { TikTokAuth, TikTokAPI, TikTokPublisher, TikTokAnalytics } from './tiktok';
import { PinterestAuth, PinterestAPI, PinterestPublisher, PinterestAnalytics } from './pinterest';

/**
 * Factory para criar instâncias de Auth por rede
 */
export function getAuthForNetwork(network: SocialNetwork) {
  switch (network) {
    case 'instagram':
      return new InstagramAuth();
    case 'facebook':
      return new FacebookAuth();
    case 'twitter':
      return new TwitterAuth();
    case 'linkedin':
      return new LinkedInAuth();
    case 'youtube':
      return new YouTubeAuth();
    case 'tiktok':
      return new TikTokAuth();
    case 'pinterest':
      return new PinterestAuth();
    default:
      throw new Error(`Network not supported: ${network}`);
  }
}

/**
 * Factory para criar instâncias de API por rede
 */
export function getAPIForAccount(account: SocialAccount) {
  switch (account.network) {
    case 'instagram':
      return new InstagramAPI(account);
    case 'facebook':
      return new FacebookAPI(account);
    case 'twitter':
      return new TwitterAPI(account);
    case 'linkedin':
      return new LinkedInAPI(account);
    case 'youtube':
      return new YouTubeAPI(account);
    case 'tiktok':
      return new TikTokAPI(account);
    case 'pinterest':
      return new PinterestAPI(account);
    default:
      throw new Error(`Network not supported: ${account.network}`);
  }
}

/**
 * Factory para criar instâncias de Publisher por rede
 */
export function getPublisherForAccount(account: SocialAccount) {
  switch (account.network) {
    case 'instagram':
      return new InstagramPublisher(account);
    case 'facebook':
      return new FacebookPublisher(account);
    case 'twitter':
      return new TwitterPublisher(account);
    case 'linkedin':
      return new LinkedInPublisher(account);
    case 'youtube':
      return new YouTubePublisher(account);
    case 'tiktok':
      return new TikTokPublisher(account);
    case 'pinterest':
      return new PinterestPublisher(account);
    default:
      throw new Error(`Network not supported: ${account.network}`);
  }
}

/**
 * Factory para criar instâncias de Analytics por rede
 */
export function getAnalyticsForAccount(account: SocialAccount) {
  switch (account.network) {
    case 'instagram':
      return new InstagramAnalytics(account);
    case 'facebook':
      return new FacebookAnalytics(account);
    case 'twitter':
      return new TwitterAnalytics(account);
    case 'linkedin':
      return new LinkedInAnalytics(account);
    case 'youtube':
      return new YouTubeAnalytics(account);
    case 'tiktok':
      return new TikTokAnalytics(account);
    case 'pinterest':
      return new PinterestAnalytics(account);
    default:
      throw new Error(`Network not supported: ${account.network}`);
  }
}

/**
 * Verifica se uma rede está configurada (tem chaves de API)
 */
export function isNetworkConfigured(network: SocialNetwork): boolean {
  switch (network) {
    case 'instagram':
      return !!(process.env.NEXT_PUBLIC_FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET);
    case 'facebook':
      return !!(process.env.NEXT_PUBLIC_FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET);
    case 'twitter':
      return !!(process.env.TWITTER_CLIENT_ID && process.env.TWITTER_CLIENT_SECRET);
    case 'linkedin':
      return !!(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET);
    case 'youtube':
      return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
    case 'tiktok':
      return !!(process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET);
    case 'pinterest':
      return !!(process.env.PINTEREST_APP_ID && process.env.PINTEREST_APP_SECRET);
    default:
      return false;
  }
}

/**
 * Lista redes configuradas
 */
export function getConfiguredNetworks(): SocialNetwork[] {
  const networks: SocialNetwork[] = [
    'instagram', 'facebook', 'twitter', 'linkedin', 
    'youtube', 'tiktok', 'pinterest'
  ];
  
  return networks.filter(isNetworkConfigured);
}
