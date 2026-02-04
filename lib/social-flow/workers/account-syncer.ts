/**
 * Social Flow Worker - Account Syncer
 * 
 * Sincroniza dados das contas com as redes sociais.
 * Deve ser executado diariamente.
 */

import { createClient } from '@supabase/supabase-js';
import { SocialNetwork, SocialAccount } from '../types';
import { getAuthForNetwork, isNetworkConfigured } from '../networks';

export interface SyncResult {
  accountId: string;
  network: SocialNetwork;
  success: boolean;
  updated?: {
    username?: boolean;
    name?: boolean;
    profilePicture?: boolean;
    followers?: boolean;
    following?: boolean;
    posts?: boolean;
  };
  error?: string;
}

export interface AccountSyncerReport {
  processedAt: string;
  totalAccounts: number;
  totalSuccess: number;
  totalFailed: number;
  results: SyncResult[];
}

/**
 * Sincroniza todas as contas ativas
 */
export async function syncAllAccounts(): Promise<AccountSyncerReport> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const results: SyncResult[] = [];
  const now = new Date();

  console.log(`[AccountSyncer] Starting at ${now.toISOString()}`);

  try {
    // Buscar contas ativas
    const { data: accounts, error } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('is_active', true)
      .not('access_token', 'is', null)
      .limit(100);

    if (error) {
      console.error('[AccountSyncer] Error fetching accounts:', error);
      throw error;
    }

    if (!accounts?.length) {
      console.log('[AccountSyncer] No accounts to sync');
      return {
        processedAt: now.toISOString(),
        totalAccounts: 0,
        totalSuccess: 0,
        totalFailed: 0,
        results: [],
      };
    }

    console.log(`[AccountSyncer] Found ${accounts.length} accounts to sync`);

    // Processar cada conta
    for (const account of accounts) {
      // Verificar se a rede está configurada
      if (!isNetworkConfigured(account.network)) {
        results.push({
          accountId: account.id,
          network: account.network,
          success: false,
          error: 'Network not configured',
        });
        continue;
      }

      try {
        const auth = getAuthForNetwork(account.network);
        
        if (!auth || !auth.getAccountInfo) {
          results.push({
            accountId: account.id,
            network: account.network,
            success: false,
            error: 'Account info not available for this network',
          });
          continue;
        }

        // Buscar informações atualizadas da conta
        const accountInfo = await auth.getAccountInfo(account.access_token);

        if (!accountInfo) {
          results.push({
            accountId: account.id,
            network: account.network,
            success: false,
            error: 'Failed to fetch account info',
          });
          continue;
        }

        // Comparar e atualizar
        const updates: Record<string, any> = {
          updated_at: now.toISOString(),
        };
        const updated: SyncResult['updated'] = {};

        // Username
        if (accountInfo.username && accountInfo.username !== account.account_username) {
          updates.account_username = accountInfo.username;
          updated.username = true;
        }

        // Nome
        if (accountInfo.name && accountInfo.name !== account.account_name) {
          updates.account_name = accountInfo.name;
          updated.name = true;
        }

        // Foto de perfil
        if (accountInfo.profilePictureUrl && accountInfo.profilePictureUrl !== account.profile_picture_url) {
          updates.profile_picture_url = accountInfo.profilePictureUrl;
          updated.profilePicture = true;
        }

        // Seguidores
        if (accountInfo.followersCount !== undefined && accountInfo.followersCount !== account.followers_count) {
          updates.followers_count = accountInfo.followersCount;
          updated.followers = true;
        }

        // Seguindo
        if (accountInfo.followingCount !== undefined && accountInfo.followingCount !== account.following_count) {
          updates.following_count = accountInfo.followingCount;
          updated.following = true;
        }

        // Posts
        if (accountInfo.mediaCount !== undefined && accountInfo.mediaCount !== account.posts_count) {
          updates.posts_count = accountInfo.mediaCount;
          updated.posts = true;
        }

        // Aplicar atualizações
        if (Object.keys(updates).length > 1) { // Mais que apenas updated_at
          await supabase
            .from('social_accounts')
            .update(updates)
            .eq('id', account.id);
        }

        results.push({
          accountId: account.id,
          network: account.network,
          success: true,
          updated,
        });

        const changesCount = Object.values(updated).filter(Boolean).length;
        if (changesCount > 0) {
          console.log(`[AccountSyncer] Synced ${account.account_name}: ${changesCount} changes`);
        }
      } catch (syncError: any) {
        console.error(`[AccountSyncer] Error syncing account ${account.id}:`, syncError);
        
        results.push({
          accountId: account.id,
          network: account.network,
          success: false,
          error: syncError.message,
        });

        // Marcar erro na conta
        await supabase
          .from('social_accounts')
          .update({
            last_error: syncError.message,
            last_error_at: now.toISOString(),
          })
          .eq('id', account.id);
      }

      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    const report: AccountSyncerReport = {
      processedAt: now.toISOString(),
      totalAccounts: accounts.length,
      totalSuccess: results.filter((r) => r.success).length,
      totalFailed: results.filter((r) => !r.success).length,
      results,
    };

    console.log(`[AccountSyncer] Completed: ${report.totalSuccess} success, ${report.totalFailed} failed`);

    return report;
  } catch (error: any) {
    console.error('[AccountSyncer] Fatal error:', error);
    throw error;
  }
}

/**
 * Sincroniza uma conta específica
 */
export async function syncAccount(accountId: string): Promise<SyncResult> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const now = new Date();

  const { data: account, error } = await supabase
    .from('social_accounts')
    .select('*')
    .eq('id', accountId)
    .single();

  if (error || !account) {
    return {
      accountId,
      network: 'instagram',
      success: false,
      error: 'Account not found',
    };
  }

  if (!isNetworkConfigured(account.network)) {
    return {
      accountId: account.id,
      network: account.network,
      success: false,
      error: 'Network not configured',
    };
  }

  if (!account.access_token) {
    return {
      accountId: account.id,
      network: account.network,
      success: false,
      error: 'No access token',
    };
  }

  try {
    const auth = getAuthForNetwork(account.network);
    
    if (!auth || !auth.getAccountInfo) {
      return {
        accountId: account.id,
        network: account.network,
        success: false,
        error: 'Account info not available',
      };
    }

    const accountInfo = await auth.getAccountInfo(account.access_token);

    if (!accountInfo) {
      return {
        accountId: account.id,
        network: account.network,
        success: false,
        error: 'Failed to fetch account info',
      };
    }

    const updates: Record<string, any> = {
      updated_at: now.toISOString(),
    };

    if (accountInfo.username) updates.account_username = accountInfo.username;
    if (accountInfo.name) updates.account_name = accountInfo.name;
    if (accountInfo.profilePictureUrl) updates.profile_picture_url = accountInfo.profilePictureUrl;
    if (accountInfo.followersCount !== undefined) updates.followers_count = accountInfo.followersCount;
    if (accountInfo.followingCount !== undefined) updates.following_count = accountInfo.followingCount;
    if (accountInfo.mediaCount !== undefined) updates.posts_count = accountInfo.mediaCount;

    await supabase
      .from('social_accounts')
      .update(updates)
      .eq('id', account.id);

    return {
      accountId: account.id,
      network: account.network,
      success: true,
    };
  } catch (syncError: any) {
    await supabase
      .from('social_accounts')
      .update({
        last_error: syncError.message,
        last_error_at: now.toISOString(),
      })
      .eq('id', account.id);

    return {
      accountId: account.id,
      network: account.network,
      success: false,
      error: syncError.message,
    };
  }
}

/**
 * Remove contas inativas ou com tokens expirados há muito tempo
 */
export async function cleanupInactiveAccounts(): Promise<{
  removed: number;
  deactivated: number;
}> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Desativar contas com tokens expirados há mais de 30 dias
  const { data: expiredAccounts } = await supabase
    .from('social_accounts')
    .update({ is_active: false })
    .eq('is_active', true)
    .lt('token_expires_at', thirtyDaysAgo.toISOString())
    .select('id');

  // Contar contas sem posts há muito tempo (opcional - pode ser configurado)
  // Por segurança, não removemos automaticamente, apenas desativamos

  return {
    removed: 0,
    deactivated: expiredAccounts?.length || 0,
  };
}
