/**
 * InstaFlow - Instagram OAuth Authentication
 * 
 * Fluxo de autenticação via Facebook Login para Instagram Business
 * 
 * Referências:
 * - https://developers.facebook.com/docs/instagram-api/getting-started
 * - https://developers.facebook.com/docs/facebook-login/guides/advanced/manual-flow
 */

// =====================================================
// TYPES
// =====================================================

export interface InstagramAccount {
  id: string;
  instagram_business_account_id: string;
  username: string;
  name?: string;
  profile_picture_url?: string;
  biography?: string;
  followers_count: number;
  follows_count: number;
  media_count: number;
  facebook_page_id: string;
  facebook_page_name?: string;
}

export interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: {
    id: string;
    username?: string;
    name?: string;
    profile_picture_url?: string;
  };
}

export interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

export interface LongLivedTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number; // Em segundos (60 dias = 5184000)
}

export interface TokenDebugInfo {
  app_id: string;
  type: string;
  application: string;
  data_access_expires_at: number;
  expires_at: number;
  is_valid: boolean;
  scopes: string[];
  user_id: string;
}

// =====================================================
// CONFIGURAÇÕES
// =====================================================

const FACEBOOK_APP_ID = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID!;
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET!;
const GRAPH_API_VERSION = 'v18.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

// Permissões necessárias para Instagram Business
export const REQUIRED_PERMISSIONS = [
  'instagram_basic',              // Informações básicas da conta
  'instagram_content_publish',    // Publicar posts
  'instagram_manage_insights',    // Métricas e analytics
  'pages_show_list',              // Listar páginas do Facebook
  'pages_read_engagement',        // Engajamento das páginas
  'business_management',          // Gerenciar negócios
  'pages_manage_posts',           // Gerenciar posts das páginas
];

// =====================================================
// FUNÇÕES DE AUTENTICAÇÃO
// =====================================================

/**
 * Gera a URL de login do Facebook OAuth
 */
export function getOAuthLoginUrl(redirectUri: string, state?: string): string {
  const params = new URLSearchParams({
    client_id: FACEBOOK_APP_ID,
    redirect_uri: redirectUri,
    scope: REQUIRED_PERMISSIONS.join(','),
    response_type: 'code',
    state: state || generateState(),
  });

  return `https://www.facebook.com/${GRAPH_API_VERSION}/dialog/oauth?${params.toString()}`;
}

/**
 * Gera um state aleatório para proteção CSRF
 */
export function generateState(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

/**
 * Troca o código de autorização por um access token de curta duração
 */
export async function exchangeCodeForToken(
  code: string,
  redirectUri: string
): Promise<OAuthTokenResponse> {
  const params = new URLSearchParams({
    client_id: FACEBOOK_APP_ID,
    client_secret: FACEBOOK_APP_SECRET,
    redirect_uri: redirectUri,
    code,
  });

  const response = await fetch(
    `${GRAPH_API_BASE}/oauth/access_token?${params.toString()}`,
    { method: 'GET' }
  );

  if (!response.ok) {
    const error = await response.json();
    console.error('[InstaFlow] Error exchanging code:', error);
    throw new Error(error.error?.message || 'Failed to exchange code for token');
  }

  return response.json();
}

/**
 * Converte token de curta duração em token de longa duração (60 dias)
 */
export async function getLongLivedToken(
  shortLivedToken: string
): Promise<LongLivedTokenResponse> {
  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: FACEBOOK_APP_ID,
    client_secret: FACEBOOK_APP_SECRET,
    fb_exchange_token: shortLivedToken,
  });

  const response = await fetch(
    `${GRAPH_API_BASE}/oauth/access_token?${params.toString()}`,
    { method: 'GET' }
  );

  if (!response.ok) {
    const error = await response.json();
    console.error('[InstaFlow] Error getting long-lived token:', error);
    throw new Error(error.error?.message || 'Failed to get long-lived token');
  }

  return response.json();
}

/**
 * Obtém Page Access Token de longa duração para uma página
 */
export async function getPageAccessToken(
  userAccessToken: string,
  pageId: string
): Promise<string> {
  const response = await fetch(
    `${GRAPH_API_BASE}/${pageId}?fields=access_token&access_token=${userAccessToken}`,
    { method: 'GET' }
  );

  if (!response.ok) {
    const error = await response.json();
    console.error('[InstaFlow] Error getting page access token:', error);
    throw new Error(error.error?.message || 'Failed to get page access token');
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Valida e obtém informações sobre um token
 */
export async function debugToken(accessToken: string): Promise<TokenDebugInfo> {
  const appAccessToken = `${FACEBOOK_APP_ID}|${FACEBOOK_APP_SECRET}`;
  
  const response = await fetch(
    `${GRAPH_API_BASE}/debug_token?input_token=${accessToken}&access_token=${appAccessToken}`,
    { method: 'GET' }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to debug token');
  }

  const data = await response.json();
  return data.data;
}

/**
 * Verifica se o token ainda é válido
 */
export async function isTokenValid(accessToken: string): Promise<boolean> {
  try {
    const debug = await debugToken(accessToken);
    return debug.is_valid && debug.expires_at > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

// =====================================================
// FUNÇÕES DE DESCOBERTA DE CONTAS
// =====================================================

/**
 * Lista todas as páginas do Facebook do usuário
 */
export async function getUserPages(accessToken: string): Promise<FacebookPage[]> {
  const response = await fetch(
    `${GRAPH_API_BASE}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username,name,profile_picture_url}&access_token=${accessToken}`,
    { method: 'GET' }
  );

  if (!response.ok) {
    const error = await response.json();
    console.error('[InstaFlow] Error getting user pages:', error);
    throw new Error(error.error?.message || 'Failed to get user pages');
  }

  const data = await response.json();
  return data.data || [];
}

/**
 * Obtém detalhes completos de uma conta Instagram Business
 */
export async function getInstagramAccountDetails(
  instagramAccountId: string,
  accessToken: string
): Promise<InstagramAccount | null> {
  const fields = [
    'id',
    'username',
    'name',
    'profile_picture_url',
    'biography',
    'website',
    'followers_count',
    'follows_count',
    'media_count',
  ].join(',');

  const response = await fetch(
    `${GRAPH_API_BASE}/${instagramAccountId}?fields=${fields}&access_token=${accessToken}`,
    { method: 'GET' }
  );

  if (!response.ok) {
    const error = await response.json();
    console.error('[InstaFlow] Error getting Instagram account:', error);
    return null;
  }

  const data = await response.json();
  
  return {
    id: data.id,
    instagram_business_account_id: data.id,
    username: data.username,
    name: data.name,
    profile_picture_url: data.profile_picture_url,
    biography: data.biography,
    followers_count: data.followers_count || 0,
    follows_count: data.follows_count || 0,
    media_count: data.media_count || 0,
    facebook_page_id: '', // Será preenchido depois
    facebook_page_name: '',
  };
}

/**
 * Descobre todas as contas Instagram Business conectadas às páginas do usuário
 */
export async function discoverInstagramAccounts(
  accessToken: string
): Promise<InstagramAccount[]> {
  const pages = await getUserPages(accessToken);
  const accounts: InstagramAccount[] = [];

  for (const page of pages) {
    if (page.instagram_business_account) {
      const details = await getInstagramAccountDetails(
        page.instagram_business_account.id,
        page.access_token
      );

      if (details) {
        accounts.push({
          ...details,
          facebook_page_id: page.id,
          facebook_page_name: page.name,
        });
      }
    }
  }

  return accounts;
}

// =====================================================
// FLUXO COMPLETO DE CONEXÃO
// =====================================================

export interface ConnectionResult {
  success: boolean;
  account?: InstagramAccount;
  pageAccessToken?: string;
  tokenExpiresAt?: Date;
  error?: string;
}

/**
 * Processa o callback do OAuth e retorna os dados da conta
 */
export async function processOAuthCallback(
  code: string,
  redirectUri: string
): Promise<ConnectionResult> {
  try {
    // 1. Trocar código por token de curta duração
    console.log('[InstaFlow] Exchanging code for token...');
    const tokenResponse = await exchangeCodeForToken(code, redirectUri);

    // 2. Converter para token de longa duração
    console.log('[InstaFlow] Getting long-lived token...');
    const longLivedToken = await getLongLivedToken(tokenResponse.access_token);

    // 3. Descobrir contas Instagram
    console.log('[InstaFlow] Discovering Instagram accounts...');
    const accounts = await discoverInstagramAccounts(longLivedToken.access_token);

    if (accounts.length === 0) {
      return {
        success: false,
        error: 'Nenhuma conta Instagram Business encontrada. Certifique-se de que sua conta Instagram está conectada a uma Página do Facebook como conta Business.',
      };
    }

    // 4. Por enquanto, usar a primeira conta encontrada
    const account = accounts[0];

    // 5. Obter Page Access Token de longa duração para a página
    console.log('[InstaFlow] Getting page access token...');
    const pageAccessToken = await getPageAccessToken(
      longLivedToken.access_token,
      account.facebook_page_id
    );

    // 6. Calcular data de expiração (60 dias)
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setSeconds(tokenExpiresAt.getSeconds() + longLivedToken.expires_in);

    console.log('[InstaFlow] Connection successful!', {
      username: account.username,
      followers: account.followers_count,
    });

    return {
      success: true,
      account,
      pageAccessToken,
      tokenExpiresAt,
    };
  } catch (error) {
    console.error('[InstaFlow] Connection error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido ao conectar',
    };
  }
}

// =====================================================
// RENOVAÇÃO DE TOKEN
// =====================================================

/**
 * Renova um token de longa duração antes de expirar
 * Deve ser chamado antes do token expirar (recomendado: 7 dias antes)
 */
export async function refreshLongLivedToken(
  currentToken: string
): Promise<LongLivedTokenResponse> {
  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: FACEBOOK_APP_ID,
    client_secret: FACEBOOK_APP_SECRET,
    fb_exchange_token: currentToken,
  });

  const response = await fetch(
    `${GRAPH_API_BASE}/oauth/access_token?${params.toString()}`,
    { method: 'GET' }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to refresh token');
  }

  return response.json();
}

/**
 * Verifica se o token precisa ser renovado (menos de 7 dias para expirar)
 */
export function shouldRefreshToken(expiresAt: Date): boolean {
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  return expiresAt < sevenDaysFromNow;
}
