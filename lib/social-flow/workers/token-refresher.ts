/**
 * Social Flow Worker - Token Refresher
 * 
 * Renova tokens de acesso antes que expirem.
 * Deve ser executado a cada 6-12 horas via cron job.
 */

import { createClient } from '@supabase/supabase-js';
import { SocialNetwork, SocialAccount } from '../types';
import { getAuthForNetwork, isNetworkConfigured } from '../networks';

export interface TokenRefreshResult {
  accountId: string;
  network: SocialNetwork;
  success: boolean;
  newExpiresAt?: string;
  error?: string;
}

export interface TokenRefresherReport {
  processedAt: string;
  totalAccounts: number;
  totalRefreshed: number;
  totalFailed: number;
  totalSkipped: number;
  results: TokenRefreshResult[];
}

/**
 * Renova tokens que estão próximos de expirar
 */
export async function refreshTokens(): Promise<TokenRefresherReport> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const results: TokenRefreshResult[] = [];
  const now = new Date();
  let skipped = 0;

  console.log(`[TokenRefresher] Starting at ${now.toISOString()}`);

  try {
    // Buscar contas com tokens que expiram nos próximos 7 dias
    const expirationThreshold = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const { data: accounts, error } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('is_active', true)
      .not('access_token', 'is', null)
      .or(`token_expires_at.is.null,token_expires_at.lt.${expirationThreshold.toISOString()}`)
      .limit(100);

    if (error) {
      console.error('[TokenRefresher] Error fetching accounts:', error);
      throw error;
    }

    if (!accounts?.length) {
      console.log('[TokenRefresher] No tokens to refresh');
      return {
        processedAt: now.toISOString(),
        totalAccounts: 0,
        totalRefreshed: 0,
        totalFailed: 0,
        totalSkipped: 0,
        results: [],
      };
    }

    console.log(`[TokenRefresher] Found ${accounts.length} accounts to check`);

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

      // Verificar se o token ainda é válido por mais de 1 dia
      // (evitar refreshes desnecessários)
      if (account.token_expires_at) {
        const expiresAt = new Date(account.token_expires_at);
        const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        
        if (expiresAt > oneDayFromNow) {
          skipped++;
          continue;
        }
      }

      // Se não há refresh_token, não podemos renovar
      if (!account.refresh_token) {
        // Para alguns casos (como Instagram Long-Lived Token), 
        // podemos usar o próprio access_token para renovar
        if (account.network === 'instagram' && account.access_token) {
          try {
            const auth = getAuthForNetwork(account.network);
            if (!auth) {
              results.push({
                accountId: account.id,
                network: account.network,
                success: false,
                error: 'Auth handler not available',
              });
              continue;
            }

            // Instagram permite renovar o long-lived token
            const newToken = await auth.refreshLongLivedToken(account.access_token);

            if (newToken) {
              const newExpiresAt = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000); // 60 dias

              await supabase
                .from('social_accounts')
                .update({
                  access_token: newToken,
                  token_expires_at: newExpiresAt.toISOString(),
                  updated_at: now.toISOString(),
                })
                .eq('id', account.id);

              results.push({
                accountId: account.id,
                network: account.network,
                success: true,
                newExpiresAt: newExpiresAt.toISOString(),
              });

              console.log(`[TokenRefresher] Refreshed token for ${account.account_name}`);
            } else {
              results.push({
                accountId: account.id,
                network: account.network,
                success: false,
                error: 'Failed to refresh token',
              });
            }
          } catch (refreshError: any) {
            console.error(`[TokenRefresher] Error refreshing Instagram token for ${account.id}:`, refreshError);
            
            results.push({
              accountId: account.id,
              network: account.network,
              success: false,
              error: refreshError.message,
            });

            // Se o token está completamente inválido, desativar a conta
            if (refreshError.message?.includes('invalid') || refreshError.message?.includes('expired')) {
              await supabase
                .from('social_accounts')
                .update({
                  is_active: false,
                  last_error: 'Token expired - reauthorization required',
                  last_error_at: now.toISOString(),
                })
                .eq('id', account.id);
            }
          }
          continue;
        }

        // Para outras redes sem refresh_token
        results.push({
          accountId: account.id,
          network: account.network,
          success: false,
          error: 'No refresh token available',
        });
        continue;
      }

      // Tentar renovar com refresh_token
      try {
        const auth = getAuthForNetwork(account.network);
        
        if (!auth || !auth.refreshToken) {
          results.push({
            accountId: account.id,
            network: account.network,
            success: false,
            error: 'Token refresh not supported for this network',
          });
          continue;
        }

        const newTokens = await auth.refreshToken(account.refresh_token);

        if (newTokens) {
          await supabase
            .from('social_accounts')
            .update({
              access_token: newTokens.accessToken,
              refresh_token: newTokens.refreshToken || account.refresh_token,
              token_expires_at: newTokens.expiresAt?.toISOString(),
              updated_at: now.toISOString(),
            })
            .eq('id', account.id);

          results.push({
            accountId: account.id,
            network: account.network,
            success: true,
            newExpiresAt: newTokens.expiresAt?.toISOString(),
          });

          console.log(`[TokenRefresher] Refreshed token for ${account.account_name}`);
        } else {
          results.push({
            accountId: account.id,
            network: account.network,
            success: false,
            error: 'Token refresh returned null',
          });
        }
      } catch (refreshError: any) {
        console.error(`[TokenRefresher] Error refreshing token for ${account.id}:`, refreshError);
        
        results.push({
          accountId: account.id,
          network: account.network,
          success: false,
          error: refreshError.message,
        });

        // Marcar erro na conta
        await supabase
          .from('social_accounts')
          .update({
            last_error: `Token refresh failed: ${refreshError.message}`,
            last_error_at: now.toISOString(),
          })
          .eq('id', account.id);
      }

      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    const report: TokenRefresherReport = {
      processedAt: now.toISOString(),
      totalAccounts: accounts.length,
      totalRefreshed: results.filter((r) => r.success).length,
      totalFailed: results.filter((r) => !r.success).length,
      totalSkipped: skipped,
      results,
    };

    console.log(`[TokenRefresher] Completed: ${report.totalRefreshed} refreshed, ${report.totalFailed} failed, ${skipped} skipped`);

    return report;
  } catch (error: any) {
    console.error('[TokenRefresher] Fatal error:', error);
    throw error;
  }
}

/**
 * Verifica status dos tokens de todas as contas
 */
export async function checkTokenStatus(): Promise<{
  valid: number;
  expiringSoon: number;
  expired: number;
  noToken: number;
}> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const { data: accounts } = await supabase
    .from('social_accounts')
    .select('id, access_token, token_expires_at')
    .eq('is_active', true);

  let valid = 0;
  let expiringSoon = 0;
  let expired = 0;
  let noToken = 0;

  for (const account of accounts || []) {
    if (!account.access_token) {
      noToken++;
      continue;
    }

    if (!account.token_expires_at) {
      // Assumir válido se não há data de expiração
      valid++;
      continue;
    }

    const expiresAt = new Date(account.token_expires_at);

    if (expiresAt < now) {
      expired++;
    } else if (expiresAt < sevenDaysFromNow) {
      expiringSoon++;
    } else {
      valid++;
    }
  }

  return { valid, expiringSoon, expired, noToken };
}
