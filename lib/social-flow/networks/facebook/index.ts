/**
 * Social Flow - Facebook Network
 * 
 * Estrutura preparada para integração com Facebook Pages API
 * 
 * Documentação: https://developers.facebook.com/docs/pages-api
 */

import { SocialAccount, Post, MediaItem } from '../../types';

// Placeholder - implementar quando houver chaves de API
export class FacebookAuth {
  constructor() {
    console.warn('Facebook integration not yet configured');
  }

  getAuthorizationUrl(state: string): string {
    throw new Error('Facebook integration not configured. Add FACEBOOK_APP_ID and FACEBOOK_APP_SECRET to env.');
  }

  async exchangeCodeForToken(code: string): Promise<any> {
    throw new Error('Facebook integration not configured');
  }

  async completeAuthFlow(code: string): Promise<any> {
    throw new Error('Facebook integration not configured');
  }
}

export class FacebookAPI {
  constructor(account: SocialAccount) {
    console.warn('Facebook API not yet configured');
  }

  async getPages(): Promise<any[]> {
    return [];
  }

  async getPageInsights(pageId: string): Promise<any> {
    return null;
  }

  async publishPost(pageId: string, content: any): Promise<any> {
    throw new Error('Facebook API not configured');
  }
}

export class FacebookPublisher {
  constructor(account: SocialAccount) {
    console.warn('Facebook Publisher not yet configured');
  }

  async publish(post: Post): Promise<any> {
    throw new Error('Facebook Publisher not configured');
  }
}

export class FacebookAnalytics {
  constructor(account: SocialAccount) {
    console.warn('Facebook Analytics not yet configured');
  }

  async getPageAnalytics(): Promise<any> {
    return null;
  }
}

export const facebookAuth = new FacebookAuth();
