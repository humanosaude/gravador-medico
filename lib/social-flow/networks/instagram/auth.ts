/**
 * Social Flow - Instagram Authentication
 * 
 * Implementa OAuth 2.0 para Instagram Business/Creator accounts
 * via Facebook Graph API
 */

import { SocialAccount, SocialNetwork } from '../../types';

const FACEBOOK_APP_ID = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID!;
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET!;
const GRAPH_API_VERSION = 'v21.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

// Permissões necessárias para Instagram Business/Creator
const INSTAGRAM_SCOPES = [
  // Permissões básicas
  'instagram_basic',
  'instagram_manage_insights',
  
  // Permissões de conteúdo
  'instagram_content_publish',
  'instagram_manage_comments',
  
  // Permissões de páginas (necessárias para Instagram Business)
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_posts',
  'business_management',
  
  // Permissões públicas
  'public_profile',
];

export interface InstagramAuthConfig {
  appId: string;
  appSecret: string;
  redirectUri: string;
}

export interface TokenExchangeResult {
  accessToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface LongLivedTokenResult {
  accessToken: string;
  expiresIn: number; // Geralmente 60 dias
  tokenType: string;
}

export interface InstagramBusinessAccount {
  id: string;
  username: string;
  name?: string;
  profilePictureUrl?: string;
  followersCount?: number;
  followsCount?: number;
  mediaCount?: number;
  biography?: string;
  website?: string;
  igId?: string; // Instagram app-scoped ID
}

export interface FacebookPage {
  id: string;
  name: string;
  accessToken: string;
  instagramBusinessAccountId?: string;
}

export class InstagramAuth {
  private config: InstagramAuthConfig;

  constructor(config?: Partial<InstagramAuthConfig>) {
    this.config = {
      appId: config?.appId || FACEBOOK_APP_ID,
      appSecret: config?.appSecret || FACEBOOK_APP_SECRET,
      redirectUri: config?.redirectUri || this.getDefaultRedirectUri(),
    };
  }

  /**
   * Obtém a URL de redirecionamento padrão
   */
  private getDefaultRedirectUri(): string {
    const baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return `${baseUrl}/api/social/callback/instagram`;
  }

  /**
   * Gera a URL de autorização OAuth
   */
  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.appId,
      redirect_uri: this.config.redirectUri,
      scope: INSTAGRAM_SCOPES.join(','),
      response_type: 'code',
      state: state,
      // auth_type: 'rerequest', // Descomente para forçar reautorização
    });

    return `https://www.facebook.com/${GRAPH_API_VERSION}/dialog/oauth?${params}`;
  }

  /**
   * Troca o código de autorização por um token de acesso
   */
  async exchangeCodeForToken(code: string): Promise<TokenExchangeResult> {
    const params = new URLSearchParams({
      client_id: this.config.appId,
      client_secret: this.config.appSecret,
      redirect_uri: this.config.redirectUri,
      code: code,
    });

    const response = await fetch(
      `${GRAPH_API_BASE}/oauth/access_token?${params}`,
      { method: 'GET' }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Token exchange failed: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in || 3600,
      tokenType: data.token_type || 'bearer',
    };
  }

  /**
   * Troca um token de curta duração por um de longa duração (60 dias)
   */
  async exchangeForLongLivedToken(shortLivedToken: string): Promise<LongLivedTokenResult> {
    const params = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: this.config.appId,
      client_secret: this.config.appSecret,
      fb_exchange_token: shortLivedToken,
    });

    const response = await fetch(
      `${GRAPH_API_BASE}/oauth/access_token?${params}`,
      { method: 'GET' }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Long-lived token exchange failed: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in || 5184000, // 60 dias em segundos
      tokenType: data.token_type || 'bearer',
    };
  }

  /**
   * Renova um token de longa duração (deve ser feito antes de expirar)
   */
  async refreshLongLivedToken(longLivedToken: string): Promise<LongLivedTokenResult> {
    // Para tokens de longa duração, o processo é o mesmo
    return this.exchangeForLongLivedToken(longLivedToken);
  }

  /**
   * Obtém as páginas do Facebook do usuário
   */
  async getFacebookPages(userAccessToken: string): Promise<FacebookPage[]> {
    const response = await fetch(
      `${GRAPH_API_BASE}/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${userAccessToken}`,
      { method: 'GET' }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to get Facebook pages: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    
    return (data.data || []).map((page: any) => ({
      id: page.id,
      name: page.name,
      accessToken: page.access_token,
      instagramBusinessAccountId: page.instagram_business_account?.id,
    }));
  }

  /**
   * Obtém a conta Instagram Business conectada a uma página do Facebook
   */
  async getInstagramBusinessAccount(
    pageAccessToken: string,
    instagramAccountId: string
  ): Promise<InstagramBusinessAccount> {
    const fields = [
      'id',
      'username',
      'name',
      'profile_picture_url',
      'followers_count',
      'follows_count',
      'media_count',
      'biography',
      'website',
      'ig_id',
    ].join(',');

    const response = await fetch(
      `${GRAPH_API_BASE}/${instagramAccountId}?fields=${fields}&access_token=${pageAccessToken}`,
      { method: 'GET' }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to get Instagram account: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();

    return {
      id: data.id,
      username: data.username,
      name: data.name,
      profilePictureUrl: data.profile_picture_url,
      followersCount: data.followers_count,
      followsCount: data.follows_count,
      mediaCount: data.media_count,
      biography: data.biography,
      website: data.website,
      igId: data.ig_id,
    };
  }

  /**
   * Fluxo completo de autenticação do Instagram
   * Retorna informações prontas para salvar no banco
   */
  async completeAuthFlow(code: string): Promise<{
    account: InstagramBusinessAccount;
    accessToken: string;
    tokenExpiresAt: Date;
    facebookPageId: string;
    facebookPageToken: string;
  }> {
    // 1. Trocar código por token de curta duração
    const shortLivedToken = await this.exchangeCodeForToken(code);

    // 2. Trocar por token de longa duração
    const longLivedToken = await this.exchangeForLongLivedToken(shortLivedToken.accessToken);

    // 3. Obter páginas do Facebook
    const pages = await this.getFacebookPages(longLivedToken.accessToken);

    // 4. Encontrar página com conta Instagram Business
    const pageWithInstagram = pages.find(p => p.instagramBusinessAccountId);
    
    if (!pageWithInstagram || !pageWithInstagram.instagramBusinessAccountId) {
      throw new Error(
        'Nenhuma conta Instagram Business encontrada. ' +
        'Certifique-se de que sua conta Instagram está vinculada a uma página do Facebook.'
      );
    }

    // 5. Obter detalhes da conta Instagram
    const instagramAccount = await this.getInstagramBusinessAccount(
      pageWithInstagram.accessToken,
      pageWithInstagram.instagramBusinessAccountId
    );

    // 6. Calcular data de expiração
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setSeconds(tokenExpiresAt.getSeconds() + longLivedToken.expiresIn);

    return {
      account: instagramAccount,
      accessToken: pageWithInstagram.accessToken, // Usar token da página
      tokenExpiresAt,
      facebookPageId: pageWithInstagram.id,
      facebookPageToken: pageWithInstagram.accessToken,
    };
  }

  /**
   * Valida se um token ainda é válido
   */
  async validateToken(accessToken: string): Promise<{
    isValid: boolean;
    expiresAt?: Date;
    scopes?: string[];
    error?: string;
  }> {
    try {
      const response = await fetch(
        `${GRAPH_API_BASE}/debug_token?input_token=${accessToken}&access_token=${this.config.appId}|${this.config.appSecret}`,
        { method: 'GET' }
      );

      if (!response.ok) {
        const error = await response.json();
        return {
          isValid: false,
          error: error.error?.message || 'Token validation failed',
        };
      }

      const data = await response.json();
      const tokenData = data.data;

      if (!tokenData.is_valid) {
        return {
          isValid: false,
          error: tokenData.error?.message || 'Token is not valid',
        };
      }

      return {
        isValid: true,
        expiresAt: tokenData.expires_at 
          ? new Date(tokenData.expires_at * 1000) 
          : undefined,
        scopes: tokenData.scopes,
      };
    } catch (error: any) {
      return {
        isValid: false,
        error: error.message,
      };
    }
  }

  /**
   * Revoga um token de acesso
   */
  async revokeToken(accessToken: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${GRAPH_API_BASE}/me/permissions?access_token=${accessToken}`,
        { method: 'DELETE' }
      );

      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Converte dados da API para formato SocialAccount
   */
  toSocialAccount(
    userId: string,
    account: InstagramBusinessAccount,
    accessToken: string,
    tokenExpiresAt: Date,
    facebookPageId: string
  ): Partial<SocialAccount> {
    return {
      user_id: userId,
      network: 'instagram' as SocialNetwork,
      platform_account_id: account.id,
      username: account.username,
      display_name: account.name || account.username,
      profile_picture_url: account.profilePictureUrl,
      access_token: accessToken,
      token_expires_at: tokenExpiresAt.toISOString(),
      is_active: true,
      connection_status: 'connected',
      auxiliary_ids: {
        facebookPageId,
        igId: account.igId || '',
      },
      followers_count: account.followersCount || 0,
      following_count: account.followsCount || 0,
      posts_count: account.mediaCount || 0,
    };
  }
}

// Singleton para uso em APIs
export const instagramAuth = new InstagramAuth();
