/**
 * InstaFlow - Instagram Automation Suite
 * 
 * Biblioteca principal para automação de Instagram
 */

// Auth
export {
  getOAuthLoginUrl,
  generateState,
  exchangeCodeForToken,
  getLongLivedToken,
  getPageAccessToken,
  debugToken,
  isTokenValid,
  getUserPages,
  getInstagramAccountDetails,
  discoverInstagramAccounts,
  processOAuthCallback,
  refreshLongLivedToken,
  shouldRefreshToken,
  REQUIRED_PERMISSIONS,
  type InstagramAccount,
  type FacebookPage,
  type OAuthTokenResponse,
  type LongLivedTokenResponse,
  type TokenDebugInfo,
  type ConnectionResult,
} from './auth';

// API
export {
  InstagramAPI,
  createInstagramAPI,
  type PostType,
  type MediaType,
  type MediaContainer,
  type PublishedMedia,
  type MediaInsights,
  type AccountInsights,
  type RecentMedia,
  type PublishOptions,
} from './api';

// Types
export * from './types';
