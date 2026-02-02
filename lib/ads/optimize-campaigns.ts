// =====================================================
// AUDITOR DE CAMPANHAS - OTIMIZAÇÃO AUTOMÁTICA
// =====================================================
// Analisa métricas de anúncios e executa ações:
// - Pausa anúncios com gasto alto sem conversões
// - Escala anúncios com ROAS acima do target
// - Salva logs de todas as decisões
// =====================================================

import { supabaseAdmin } from '@/lib/supabase';
import {
  initializeFacebookApi,
  getMetaConfig,
  getAdInsights,
  updateAdStatus,
  updateAdSetBudget,
  getAdSetDetails,
} from './meta-client';
import type { AdMetrics, OptimizationLog } from './types';

// =====================================================
// CONFIGURAÇÃO DE REGRAS
// =====================================================

export interface OptimizationRules {
  // Regra de pausa: Se spend > X e purchases == 0
  pauseSpendThreshold: number; // Em reais
  
  // Regra de escala: Se ROAS > X
  scaleRoasThreshold: number;
  
  // Percentual de aumento de budget ao escalar
  scaleBudgetIncrease: number; // Ex: 0.20 = 20%
  
  // Budget máximo permitido (para não explodir)
  maxDailyBudget: number; // Em reais
  
  // Período de análise
  datePreset: string; // Ex: 'last_7d', 'last_3d'
}

const DEFAULT_RULES: OptimizationRules = {
  pauseSpendThreshold: 50, // R$ 50
  scaleRoasThreshold: 3, // ROAS > 3x
  scaleBudgetIncrease: 0.20, // +20%
  maxDailyBudget: 500, // R$ 500/dia máximo
  datePreset: 'last_7d',
};

// =====================================================
// TIPOS DE RESULTADO
// =====================================================

export interface OptimizationResult {
  success: boolean;
  adsAnalyzed: number;
  actionsTaken: {
    paused: number;
    scaled: number;
    noAction: number;
  };
  logs: OptimizationLog[];
  errors: string[];
}

// =====================================================
// FUNÇÃO PRINCIPAL DE OTIMIZAÇÃO
// =====================================================

export async function optimizeCampaigns(
  rules: Partial<OptimizationRules> = {}
): Promise<OptimizationResult> {
  const finalRules: OptimizationRules = { ...DEFAULT_RULES, ...rules };
  
  console.log('🔍 Iniciando auditoria de campanhas...');
  console.log('📊 Regras aplicadas:', finalRules);

  const result: OptimizationResult = {
    success: false,
    adsAnalyzed: 0,
    actionsTaken: {
      paused: 0,
      scaled: 0,
      noAction: 0,
    },
    logs: [],
    errors: [],
  };

  try {
    // Inicializar API do Facebook
    const metaConfig = getMetaConfig();
    initializeFacebookApi(metaConfig.accessToken);

    // Buscar insights de todos os anúncios ativos
    console.log('📥 Buscando métricas de anúncios...');
    const adMetrics = await getAdInsights(
      metaConfig.adAccountId,
      finalRules.datePreset
    );

    console.log(`📊 ${adMetrics.length} anúncios encontrados para análise`);
    result.adsAnalyzed = adMetrics.length;

    // Cache de detalhes de AdSets (para evitar múltiplas chamadas)
    const adSetCache: Record<string, any> = {};

    // Analisar cada anúncio
    for (const ad of adMetrics) {
      try {
        const decision = await analyzeAndOptimizeAd(
          ad,
          finalRules,
          adSetCache
        );

        result.logs.push(decision);

        // Contabilizar ações
        switch (decision.action_type) {
          case 'PAUSE':
            result.actionsTaken.paused++;
            break;
          case 'SCALE':
            result.actionsTaken.scaled++;
            break;
          default:
            result.actionsTaken.noAction++;
        }
      } catch (error: any) {
        console.error(`❌ Erro ao analisar ad ${ad.adId}:`, error.message);
        result.errors.push(`Ad ${ad.adId}: ${error.message}`);
      }
    }

    // Salvar logs no Supabase
    if (result.logs.length > 0) {
      await saveOptimizationLogs(result.logs);
    }

    result.success = true;
    console.log('✅ Auditoria concluída!');
    console.log(`📈 Resumo: ${result.actionsTaken.paused} pausados, ${result.actionsTaken.scaled} escalados, ${result.actionsTaken.noAction} sem ação`);

  } catch (error: any) {
    console.error('❌ Erro na auditoria:', error);
    result.errors.push(error.message);
  }

  return result;
}

// =====================================================
// ANALISAR E OTIMIZAR UM ANÚNCIO
// =====================================================

async function analyzeAndOptimizeAd(
  ad: AdMetrics,
  rules: OptimizationRules,
  adSetCache: Record<string, any>
): Promise<OptimizationLog> {
  console.log(`\n🔎 Analisando: ${ad.adName}`);
  console.log(`   Spend: R$ ${ad.spend.toFixed(2)} | Purchases: ${ad.purchases} | ROAS: ${ad.roas.toFixed(2)}`);

  const log: OptimizationLog = {
    ad_id: ad.adId,
    ad_name: ad.adName,
    adset_id: ad.adSetId,
    campaign_id: ad.campaignId,
    action_type: 'NO_ACTION',
    reason: '',
    metrics_before: {
      spend: ad.spend,
      purchases: ad.purchases,
      roas: ad.roas,
    },
  };

  // =====================================================
  // REGRA 1: PAUSAR SE GASTO ALTO SEM CONVERSÕES
  // =====================================================
  if (ad.spend > rules.pauseSpendThreshold && ad.purchases === 0) {
    console.log(`   ⏸️ PAUSANDO: Gasto R$ ${ad.spend.toFixed(2)} sem vendas`);
    
    try {
      await updateAdStatus(ad.adId, 'PAUSED');
      
      log.action_type = 'PAUSE';
      log.reason = `Gasto R$ ${ad.spend.toFixed(2)} > R$ ${rules.pauseSpendThreshold} sem conversões`;
      log.metrics_after = { status: 'PAUSED' };
      
      return log;
    } catch (error: any) {
      throw new Error(`Falha ao pausar: ${error.message}`);
    }
  }

  // =====================================================
  // REGRA 2: ESCALAR SE ROAS ALTO
  // =====================================================
  if (ad.roas > rules.scaleRoasThreshold && ad.purchases > 0) {
    console.log(`   📈 ESCALANDO: ROAS ${ad.roas.toFixed(2)} > ${rules.scaleRoasThreshold}`);
    
    try {
      // Buscar detalhes do AdSet (com cache)
      if (!adSetCache[ad.adSetId]) {
        adSetCache[ad.adSetId] = await getAdSetDetails(ad.adSetId);
      }
      const adSetDetails = adSetCache[ad.adSetId];
      const currentBudget = parseInt(adSetDetails.daily_budget, 10) / 100; // Centavos para reais
      
      // Calcular novo budget
      const newBudget = Math.min(
        currentBudget * (1 + rules.scaleBudgetIncrease),
        rules.maxDailyBudget
      );
      
      // Só escalar se houver diferença significativa
      if (newBudget > currentBudget * 1.05) {
        const newBudgetCents = Math.round(newBudget * 100);
        
        await updateAdSetBudget(ad.adSetId, newBudgetCents);
        
        log.action_type = 'SCALE';
        log.reason = `ROAS ${ad.roas.toFixed(2)} > ${rules.scaleRoasThreshold}. Budget: R$ ${currentBudget.toFixed(2)} → R$ ${newBudget.toFixed(2)} (+${(rules.scaleBudgetIncrease * 100).toFixed(0)}%)`;
        log.metrics_before.daily_budget = currentBudget;
        log.metrics_after = { daily_budget: newBudget };
        
        // Atualizar cache
        adSetCache[ad.adSetId].daily_budget = newBudgetCents.toString();
        
        return log;
      } else {
        log.reason = `ROAS alto (${ad.roas.toFixed(2)}), mas budget já no máximo (R$ ${currentBudget.toFixed(2)})`;
      }
    } catch (error: any) {
      throw new Error(`Falha ao escalar: ${error.message}`);
    }
  }

  // Sem ação necessária
  log.action_type = 'NO_ACTION';
  log.reason = `Métricas dentro dos parâmetros normais. Spend: R$ ${ad.spend.toFixed(2)}, ROAS: ${ad.roas.toFixed(2)}`;
  
  return log;
}

// =====================================================
// SALVAR LOGS NO SUPABASE
// =====================================================

async function saveOptimizationLogs(logs: OptimizationLog[]): Promise<void> {
  console.log(`💾 Salvando ${logs.length} logs de otimização...`);

  const logsToInsert = logs.map(log => ({
    ad_id: log.ad_id,
    ad_name: log.ad_name,
    adset_id: log.adset_id,
    campaign_id: log.campaign_id,
    action_type: log.action_type,
    reason: log.reason,
    metrics_before: log.metrics_before,
    metrics_after: log.metrics_after || null,
    created_at: new Date().toISOString(),
  }));

  const { error } = await supabaseAdmin
    .from('optimization_logs')
    .insert(logsToInsert);

  if (error) {
    console.error('❌ Erro ao salvar logs:', error);
    throw new Error(`Falha ao salvar logs: ${error.message}`);
  }

  console.log('✅ Logs salvos com sucesso');
}

// =====================================================
// FUNÇÃO PARA EXECUÇÃO VIA CRON/BOTÃO
// =====================================================

export async function runOptimization(customRules?: Partial<OptimizationRules>): Promise<OptimizationResult> {
  console.log('\n========================================');
  console.log('🤖 AUDITOR DE CAMPANHAS - INICIANDO');
  console.log('⏰ Horário:', new Date().toISOString());
  console.log('========================================\n');

  const result = await optimizeCampaigns(customRules);

  console.log('\n========================================');
  console.log('📊 RESULTADO DA OTIMIZAÇÃO:');
  console.log(`   ✅ Sucesso: ${result.success}`);
  console.log(`   📈 Anúncios analisados: ${result.adsAnalyzed}`);
  console.log(`   ⏸️ Pausados: ${result.actionsTaken.paused}`);
  console.log(`   🚀 Escalados: ${result.actionsTaken.scaled}`);
  console.log(`   ➖ Sem ação: ${result.actionsTaken.noAction}`);
  if (result.errors.length > 0) {
    console.log(`   ❌ Erros: ${result.errors.length}`);
  }
  console.log('========================================\n');

  return result;
}

// =====================================================
// EXPORTAÇÕES
// =====================================================

export { DEFAULT_RULES };
