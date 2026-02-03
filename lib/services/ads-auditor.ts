// =====================================================
// ADS AUDITOR SERVICE
// =====================================================
// Motor de regras que analisa campanhas e gera recomendações
// Roda a cada 30 minutos via Cron Job
// =====================================================

import { supabaseAdmin } from '@/lib/supabase';

// =====================================================
// TIPOS
// =====================================================

interface Campaign {
  id: string;
  meta_campaign_id: string;
  name: string;
  status: string;
  objective: string;
  budget_daily: number;
}

interface CampaignInsights {
  campaign_id: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  purchases: number;
  purchase_value: number;
  cpa: number | null;
  roas: number | null;
  frequency: number;
  reach: number;
}

interface AlertRule {
  id: string;
  metric: string;
  condition: string;
  value: number;
  time_window: string;
  action_suggested: string;
  priority: string;
  name: string;
}

interface UserSettings {
  max_cpa: number | null;
  min_roas: number | null;
  max_frequency: number | null;
  min_ctr: number | null;
  max_spend_without_purchase: number;
  auto_pause_bleeders: boolean;
  auto_scale_winners: boolean;
  scale_increment_percent: number;
}

interface Recommendation {
  campaign_id: string | null;
  meta_campaign_id: string;
  type: 'ALERT' | 'OPPORTUNITY' | 'WARNING' | 'INFO';
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  category: 'budget' | 'performance' | 'creative' | 'audience' | 'technical';
  title: string;
  message: string;
  action_type: string | null;
  action_params: Record<string, unknown> | null;
  triggered_by_rule: string | null;
  metrics_snapshot: Record<string, unknown>;
}

interface AuditResult {
  campaigns_analyzed: number;
  alerts_generated: number;
  opportunities_found: number;
  errors_count: number;
  recommendations: Recommendation[];
}

// =====================================================
// CONSTANTES
// =====================================================

const META_API_VERSION = 'v21.0';
const META_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

// =====================================================
// CLASSE PRINCIPAL
// =====================================================

export class AdsAuditor {
  private accessToken: string;
  private adAccountId: string;
  private auditRunId: string;
  private settings: UserSettings | null = null;
  private rules: AlertRule[] = [];

  constructor(accessToken: string, adAccountId: string) {
    this.accessToken = accessToken;
    this.adAccountId = adAccountId;
    this.auditRunId = crypto.randomUUID();
  }

  // =====================================================
  // MÉTODO PRINCIPAL: Executar Auditoria
  // =====================================================

  async runAudit(): Promise<AuditResult> {
    const startTime = Date.now();
    console.log(`🔍 [${this.auditRunId}] Iniciando auditoria...`);

    const result: AuditResult = {
      campaigns_analyzed: 0,
      alerts_generated: 0,
      opportunities_found: 0,
      errors_count: 0,
      recommendations: [],
    };

    try {
      // 1. Registrar início da auditoria
      await this.logAuditStart();

      // 2. Carregar configurações e regras
      await this.loadSettings();
      await this.loadRules();

      // 3. Buscar campanhas ativas
      const campaigns = await this.getActiveCampaigns();
      result.campaigns_analyzed = campaigns.length;

      if (campaigns.length === 0) {
        console.log('📭 Nenhuma campanha ativa para auditar');
        await this.logAuditComplete(result, startTime);
        return result;
      }

      console.log(`📊 Analisando ${campaigns.length} campanhas...`);

      // 4. Para cada campanha, buscar insights e aplicar regras
      for (const campaign of campaigns) {
        try {
          const insights = await this.getCampaignInsights(campaign.meta_campaign_id);
          
          if (!insights) {
            console.log(`⚠️ Sem insights para ${campaign.name}`);
            continue;
          }

          // Salvar snapshot para histórico
          await this.saveInsightsSnapshot(campaign, insights);

          // Aplicar motor de regras
          const recommendations = await this.applyRules(campaign, insights);
          
          for (const rec of recommendations) {
            result.recommendations.push(rec);
            if (rec.type === 'ALERT' || rec.type === 'WARNING') {
              result.alerts_generated++;
            } else {
              result.opportunities_found++;
            }
          }

        } catch (error) {
          console.error(`❌ Erro ao analisar ${campaign.name}:`, error);
          result.errors_count++;
        }
      }

      // 5. Salvar recomendações no banco
      await this.saveRecommendations(result.recommendations);

      // 6. Registrar conclusão
      await this.logAuditComplete(result, startTime);

      console.log(`✅ [${this.auditRunId}] Auditoria concluída:`, {
        campanhas: result.campaigns_analyzed,
        alertas: result.alerts_generated,
        oportunidades: result.opportunities_found,
      });

      return result;

    } catch (error) {
      console.error(`❌ [${this.auditRunId}] Erro na auditoria:`, error);
      await this.logAuditError(error);
      throw error;
    }
  }

  // =====================================================
  // CARREGAR CONFIGURAÇÕES
  // =====================================================

  private async loadSettings(): Promise<void> {
    const { data } = await supabaseAdmin
      .from('ads_user_settings')
      .select('*')
      .limit(1)
      .single();

    this.settings = data || {
      max_cpa: 80,
      min_roas: 2,
      max_frequency: 3,
      min_ctr: 0.5,
      max_spend_without_purchase: 50,
      auto_pause_bleeders: false,
      auto_scale_winners: false,
      scale_increment_percent: 20,
    };
  }

  private async loadRules(): Promise<void> {
    const { data } = await supabaseAdmin
      .from('ads_alert_rules')
      .select('*')
      .eq('is_active', true);

    this.rules = data || [];
    console.log(`📋 ${this.rules.length} regras carregadas`);
  }

  // =====================================================
  // BUSCAR CAMPANHAS ATIVAS
  // =====================================================

  private async getActiveCampaigns(): Promise<Campaign[]> {
    // Primeiro, buscar do banco local
    const { data: localCampaigns } = await supabaseAdmin
      .from('ads_campaigns')
      .select('id, meta_campaign_id, name, status, objective, budget_daily')
      .eq('status', 'ACTIVE');

    if (localCampaigns && localCampaigns.length > 0) {
      return localCampaigns;
    }

    // Fallback: buscar diretamente da Meta
    try {
      const url = `${META_BASE_URL}/act_${this.adAccountId}/campaigns`;
      const params = new URLSearchParams({
        access_token: this.accessToken,
        fields: 'id,name,status,objective,daily_budget',
        filtering: JSON.stringify([
          { field: 'effective_status', operator: 'IN', value: ['ACTIVE'] }
        ]),
        limit: '100',
      });

      const response = await fetch(`${url}?${params}`);
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      return (data.data || []).map((c: any) => ({
        id: c.id,
        meta_campaign_id: c.id,
        name: c.name,
        status: c.status,
        objective: c.objective,
        budget_daily: c.daily_budget ? c.daily_budget / 100 : 0,
      }));
    } catch (error) {
      console.error('Erro ao buscar campanhas da Meta:', error);
      return [];
    }
  }

  // =====================================================
  // BUSCAR INSIGHTS DE CAMPANHA
  // =====================================================

  private async getCampaignInsights(campaignId: string): Promise<CampaignInsights | null> {
    try {
      const url = `${META_BASE_URL}/${campaignId}/insights`;
      const params = new URLSearchParams({
        access_token: this.accessToken,
        fields: [
          'spend',
          'impressions',
          'reach',
          'clicks',
          'ctr',
          'cpc',
          'cpm',
          'frequency',
          'actions',
          'action_values',
        ].join(','),
        date_preset: 'today',
      });

      const response = await fetch(`${url}?${params}`);
      const data = await response.json();

      if (data.error || !data.data?.[0]) {
        return null;
      }

      const insight = data.data[0];
      
      // Extrair ações de compra
      const purchases = this.extractAction(insight.actions, 'purchase');
      const purchaseValue = this.extractActionValue(insight.action_values, 'purchase');
      const spend = parseFloat(insight.spend || '0');

      return {
        campaign_id: campaignId,
        spend,
        impressions: parseInt(insight.impressions || '0'),
        clicks: parseInt(insight.clicks || '0'),
        ctr: parseFloat(insight.ctr || '0'),
        cpc: parseFloat(insight.cpc || '0'),
        cpm: parseFloat(insight.cpm || '0'),
        purchases,
        purchase_value: purchaseValue,
        cpa: purchases > 0 ? spend / purchases : null,
        roas: spend > 0 ? purchaseValue / spend : null,
        frequency: parseFloat(insight.frequency || '0'),
        reach: parseInt(insight.reach || '0'),
      };
    } catch (error) {
      console.error(`Erro ao buscar insights de ${campaignId}:`, error);
      return null;
    }
  }

  private extractAction(actions: any[], actionType: string): number {
    if (!actions) return 0;
    const action = actions.find(a => a.action_type === actionType);
    return action ? parseInt(action.value) : 0;
  }

  private extractActionValue(actionValues: any[], actionType: string): number {
    if (!actionValues) return 0;
    const action = actionValues.find(a => a.action_type === actionType);
    return action ? parseFloat(action.value) : 0;
  }

  // =====================================================
  // MOTOR DE REGRAS
  // =====================================================

  private async applyRules(
    campaign: Campaign,
    insights: CampaignInsights
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // =====================================================
    // REGRA CRÍTICA: Sangria (Gasto sem vendas)
    // =====================================================
    if (
      insights.spend >= (this.settings?.max_spend_without_purchase || 50) &&
      insights.purchases === 0
    ) {
      recommendations.push({
        campaign_id: campaign.id,
        meta_campaign_id: campaign.meta_campaign_id,
        type: 'ALERT',
        priority: 'CRITICAL',
        category: 'budget',
        title: '🩸 Sangria Detectada',
        message: `Campanha "${campaign.name}" gastou R$ ${insights.spend.toFixed(2)} hoje sem nenhuma venda. Recomendamos pausar imediatamente.`,
        action_type: 'pause',
        action_params: { campaign_id: campaign.meta_campaign_id },
        triggered_by_rule: null,
        metrics_snapshot: {
          spend: insights.spend,
          purchases: insights.purchases,
          impressions: insights.impressions,
          clicks: insights.clicks,
        },
      });
    }

    // =====================================================
    // REGRA: CPA Alto
    // =====================================================
    if (
      insights.cpa &&
      this.settings?.max_cpa &&
      insights.cpa > this.settings.max_cpa
    ) {
      recommendations.push({
        campaign_id: campaign.id,
        meta_campaign_id: campaign.meta_campaign_id,
        type: 'WARNING',
        priority: 'HIGH',
        category: 'performance',
        title: '📈 CPA Acima do Limite',
        message: `CPA de R$ ${insights.cpa.toFixed(2)} está ${((insights.cpa / this.settings.max_cpa - 1) * 100).toFixed(0)}% acima do seu limite de R$ ${this.settings.max_cpa.toFixed(2)}`,
        action_type: 'review',
        action_params: null,
        triggered_by_rule: null,
        metrics_snapshot: {
          cpa: insights.cpa,
          max_cpa: this.settings.max_cpa,
          spend: insights.spend,
          purchases: insights.purchases,
        },
      });
    }

    // =====================================================
    // REGRA: ROAS Baixo
    // =====================================================
    if (
      insights.roas !== null &&
      this.settings?.min_roas &&
      insights.roas < this.settings.min_roas &&
      insights.spend >= 20 // Só alertar se gastou algo significativo
    ) {
      recommendations.push({
        campaign_id: campaign.id,
        meta_campaign_id: campaign.meta_campaign_id,
        type: 'ALERT',
        priority: insights.roas < 1 ? 'HIGH' : 'MEDIUM',
        category: 'performance',
        title: '📉 ROAS Abaixo do Mínimo',
        message: `ROAS de ${insights.roas.toFixed(2)}x está abaixo do seu mínimo de ${this.settings.min_roas}x. ${insights.roas < 1 ? 'Você está perdendo dinheiro!' : 'Considere otimizar.'}`,
        action_type: insights.roas < 1 ? 'pause' : 'review',
        action_params: insights.roas < 1 ? { campaign_id: campaign.meta_campaign_id } : null,
        triggered_by_rule: null,
        metrics_snapshot: {
          roas: insights.roas,
          min_roas: this.settings.min_roas,
          spend: insights.spend,
          revenue: insights.purchase_value,
        },
      });
    }

    // =====================================================
    // OPORTUNIDADE: ROAS Excelente - Escalar
    // =====================================================
    if (
      insights.roas !== null &&
      insights.roas >= 3 &&
      insights.spend >= 30 // Já gastou um valor significativo
    ) {
      recommendations.push({
        campaign_id: campaign.id,
        meta_campaign_id: campaign.meta_campaign_id,
        type: 'OPPORTUNITY',
        priority: 'MEDIUM',
        category: 'budget',
        title: '🚀 Oportunidade de Escala',
        message: `ROAS de ${insights.roas.toFixed(2)}x! Considere aumentar o orçamento em ${this.settings?.scale_increment_percent || 20}%.`,
        action_type: 'scale_up',
        action_params: {
          campaign_id: campaign.meta_campaign_id,
          current_budget: campaign.budget_daily,
          new_budget: campaign.budget_daily * (1 + (this.settings?.scale_increment_percent || 20) / 100),
          increment_percent: this.settings?.scale_increment_percent || 20,
        },
        triggered_by_rule: null,
        metrics_snapshot: {
          roas: insights.roas,
          spend: insights.spend,
          revenue: insights.purchase_value,
          purchases: insights.purchases,
        },
      });
    }

    // =====================================================
    // REGRA: Frequência Alta (Fadiga de Audiência)
    // =====================================================
    if (
      insights.frequency >= (this.settings?.max_frequency || 3) &&
      insights.impressions >= 1000
    ) {
      recommendations.push({
        campaign_id: campaign.id,
        meta_campaign_id: campaign.meta_campaign_id,
        type: 'WARNING',
        priority: 'MEDIUM',
        category: 'audience',
        title: '😴 Fadiga de Audiência',
        message: `Frequência de ${insights.frequency.toFixed(1)} indica que as mesmas pessoas estão vendo o anúncio repetidamente. Considere expandir o público ou criar novos criativos.`,
        action_type: 'review',
        action_params: null,
        triggered_by_rule: null,
        metrics_snapshot: {
          frequency: insights.frequency,
          reach: insights.reach,
          impressions: insights.impressions,
        },
      });
    }

    // =====================================================
    // REGRA: CTR Baixo
    // =====================================================
    if (
      insights.ctr < (this.settings?.min_ctr || 0.5) &&
      insights.impressions >= 1000
    ) {
      recommendations.push({
        campaign_id: campaign.id,
        meta_campaign_id: campaign.meta_campaign_id,
        type: 'INFO',
        priority: 'LOW',
        category: 'creative',
        title: '👆 CTR Pode Melhorar',
        message: `CTR de ${insights.ctr.toFixed(2)}% está abaixo de ${this.settings?.min_ctr || 0.5}%. Considere testar novos criativos ou copies.`,
        action_type: 'review',
        action_params: null,
        triggered_by_rule: null,
        metrics_snapshot: {
          ctr: insights.ctr,
          clicks: insights.clicks,
          impressions: insights.impressions,
        },
      });
    }

    // =====================================================
    // Aplicar regras customizadas do usuário
    // =====================================================
    for (const rule of this.rules) {
      const shouldTrigger = this.evaluateRule(rule, insights);
      
      if (shouldTrigger) {
        const existingRec = recommendations.find(r => 
          r.action_type === rule.action_suggested && 
          r.category === this.getCategoryFromMetric(rule.metric)
        );

        // Não duplicar recomendações similares
        if (!existingRec) {
          recommendations.push({
            campaign_id: campaign.id,
            meta_campaign_id: campaign.meta_campaign_id,
            type: this.getTypeFromAction(rule.action_suggested),
            priority: rule.priority as any,
            category: this.getCategoryFromMetric(rule.metric),
            title: `📌 ${rule.name}`,
            message: `Regra "${rule.name}" disparada: ${rule.metric} ${this.getConditionText(rule.condition)} ${rule.value}`,
            action_type: rule.action_suggested,
            action_params: rule.action_suggested === 'pause' ? { campaign_id: campaign.meta_campaign_id } : null,
            triggered_by_rule: rule.id,
            metrics_snapshot: {
              [rule.metric]: (insights as any)[rule.metric],
              rule_threshold: rule.value,
            },
          });
        }
      }
    }

    return recommendations;
  }

  private evaluateRule(rule: AlertRule, insights: CampaignInsights): boolean {
    const value = (insights as any)[rule.metric];
    if (value === null || value === undefined) return false;

    switch (rule.condition) {
      case 'gt': return value > rule.value;
      case 'lt': return value < rule.value;
      case 'gte': return value >= rule.value;
      case 'lte': return value <= rule.value;
      case 'eq': return value === rule.value;
      default: return false;
    }
  }

  private getConditionText(condition: string): string {
    const texts: Record<string, string> = {
      gt: '>',
      lt: '<',
      gte: '≥',
      lte: '≤',
      eq: '=',
    };
    return texts[condition] || condition;
  }

  private getTypeFromAction(action: string): 'ALERT' | 'OPPORTUNITY' | 'WARNING' | 'INFO' {
    if (action === 'pause') return 'ALERT';
    if (action === 'scale_up') return 'OPPORTUNITY';
    if (action === 'review') return 'WARNING';
    return 'INFO';
  }

  private getCategoryFromMetric(metric: string): 'budget' | 'performance' | 'creative' | 'audience' | 'technical' {
    if (['spend', 'cpa'].includes(metric)) return 'budget';
    if (['roas', 'ctr', 'cpc'].includes(metric)) return 'performance';
    if (['frequency'].includes(metric)) return 'audience';
    return 'performance';
  }

  // =====================================================
  // SALVAR DADOS
  // =====================================================

  private async saveInsightsSnapshot(
    campaign: Campaign,
    insights: CampaignInsights
  ): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const hour = new Date().getHours();

    try {
      await supabaseAdmin
        .from('ads_insights_snapshot')
        .upsert({
          campaign_id: campaign.id,
          meta_campaign_id: campaign.meta_campaign_id,
          date_start: today,
          date_stop: today,
          snapshot_hour: hour,
          impressions: insights.impressions,
          reach: insights.reach,
          clicks: insights.clicks,
          spend: insights.spend,
          cpm: insights.cpm,
          cpc: insights.cpc,
          ctr: insights.ctr,
          purchases: insights.purchases,
          purchase_value: insights.purchase_value,
          cpa: insights.cpa,
          roas: insights.roas,
          frequency: insights.frequency,
        }, {
          onConflict: 'meta_campaign_id,date_start,date_stop,snapshot_hour',
        });
    } catch (error) {
      console.error('Erro ao salvar snapshot:', error);
    }
  }

  private async saveRecommendations(recommendations: Recommendation[]): Promise<void> {
    if (recommendations.length === 0) return;

    try {
      const { error } = await supabaseAdmin
        .from('ads_recommendations')
        .insert(recommendations.map(r => ({
          ...r,
          status: 'PENDING',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Expira em 24h
        })));

      if (error) {
        console.error('Erro ao salvar recomendações:', error);
      } else {
        console.log(`💾 ${recommendations.length} recomendações salvas`);
      }
    } catch (error) {
      console.error('Erro ao salvar recomendações:', error);
    }
  }

  // =====================================================
  // LOGGING
  // =====================================================

  private async logAuditStart(): Promise<void> {
    try {
      await supabaseAdmin
        .from('ads_audit_log')
        .insert({
          audit_run_id: this.auditRunId,
          started_at: new Date().toISOString(),
          status: 'running',
        });
    } catch (error) {
      console.error('Erro ao registrar início da auditoria:', error);
    }
  }

  private async logAuditComplete(result: AuditResult, startTime: number): Promise<void> {
    try {
      await supabaseAdmin
        .from('ads_audit_log')
        .update({
          campaigns_analyzed: result.campaigns_analyzed,
          alerts_generated: result.alerts_generated,
          opportunities_found: result.opportunities_found,
          errors_count: result.errors_count,
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - startTime,
          status: 'completed',
        })
        .eq('audit_run_id', this.auditRunId);
    } catch (error) {
      console.error('Erro ao registrar conclusão:', error);
    }
  }

  private async logAuditError(error: unknown): Promise<void> {
    try {
      await supabaseAdmin
        .from('ads_audit_log')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Erro desconhecido',
          completed_at: new Date().toISOString(),
        })
        .eq('audit_run_id', this.auditRunId);
    } catch (e) {
      console.error('Erro ao registrar falha:', e);
    }
  }
}

// =====================================================
// FUNÇÃO EXPORTADA PARA USO DIRETO
// =====================================================

export async function runCampaignAudit(): Promise<AuditResult> {
  // Buscar credenciais do banco
  const { data: settings } = await supabaseAdmin
    .from('integration_settings')
    .select('meta_ad_account_id, meta_access_token')
    .eq('is_default', true)
    .single();

  // Busca do banco, com fallback para env
  const adAccountId = settings?.meta_ad_account_id || process.env.META_AD_ACCOUNT_ID || process.env.FACEBOOK_AD_ACCOUNT_ID;
  const accessToken = settings?.meta_access_token || process.env.META_ACCESS_TOKEN || process.env.FACEBOOK_ACCESS_TOKEN;

  if (!adAccountId || !accessToken) {
    throw new Error('Credenciais Meta não configuradas');
  }

  const auditor = new AdsAuditor(accessToken, adAccountId);
  return auditor.runAudit();
}
