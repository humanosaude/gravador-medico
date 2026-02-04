/**
 * InstaFlow - Report Sender Worker
 * 
 * Gera e envia relatórios periódicos por email
 * Deve ser executado semanalmente (segunda-feira de manhã)
 */

import { createClient } from '@supabase/supabase-js';
import { generateInsightReport, AccountMetrics, PostMetrics } from '@/lib/ai/insights-generator';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Resend para envio de emails
const RESEND_API_KEY = process.env.RESEND_API_KEY;

export interface ReportResult {
  userId: string;
  accountId: string;
  success: boolean;
  reportId?: string;
  error?: string;
}

/**
 * Busca usuários que habilitaram relatórios semanais
 */
async function getUsersWithWeeklyReports(): Promise<any[]> {
  const { data, error } = await supabase
    .from('instaflow_settings')
    .select(`
      user_id,
      account_id,
      settings,
      instagram_accounts!inner(
        id,
        username,
        is_active
      )
    `)
    .eq('instagram_accounts.is_active', true);

  if (error) {
    console.error('Error fetching settings:', error);
    return [];
  }

  // Filtrar apenas quem habilitou relatórios semanais
  return (data || []).filter(s => 
    s.settings?.notifications?.weekly_report !== false
  );
}

/**
 * Busca métricas da conta para o relatório
 */
async function getAccountMetricsForReport(accountId: string): Promise<AccountMetrics | null> {
  // Período: últimos 7 dias
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Buscar analytics da conta
  const { data: analytics } = await supabase
    .from('instaflow_account_analytics')
    .select('*')
    .eq('account_id', accountId)
    .gte('date', sevenDaysAgo.toISOString().split('T')[0])
    .order('date', { ascending: true });

  if (!analytics || analytics.length === 0) return null;

  const latestDay = analytics[analytics.length - 1];
  const firstDay = analytics[0];

  // Calcular crescimento de seguidores
  const followersGrowth = firstDay.followers_count > 0
    ? ((latestDay.followers_count - firstDay.followers_count) / firstDay.followers_count) * 100
    : 0;

  // Buscar posts do período
  const { data: posts } = await supabase
    .from('instaflow_scheduled_posts')
    .select(`
      id,
      content_type,
      instaflow_post_analytics(
        reach,
        engagement,
        impressions
      )
    `)
    .eq('account_id', accountId)
    .eq('status', 'published')
    .gte('published_at', sevenDaysAgo.toISOString());

  // Calcular médias
  const postsWithAnalytics = (posts || []).filter(p => p.instaflow_post_analytics?.[0]);
  const totalPosts = postsWithAnalytics.length;

  let totalReach = 0;
  let totalEngagement = 0;
  let totalImpressions = 0;
  const contentTypeCounts: Record<string, { count: number; engagement: number }> = {};

  postsWithAnalytics.forEach(p => {
    const a = p.instaflow_post_analytics[0];
    totalReach += a.reach || 0;
    totalEngagement += a.engagement || 0;
    totalImpressions += a.impressions || 0;

    if (!contentTypeCounts[p.content_type]) {
      contentTypeCounts[p.content_type] = { count: 0, engagement: 0 };
    }
    contentTypeCounts[p.content_type].count++;
    contentTypeCounts[p.content_type].engagement += a.engagement || 0;
  });

  // Top content types
  const topContentTypes = Object.entries(contentTypeCounts)
    .map(([type, data]) => ({
      type,
      performance: data.count > 0 ? Math.round((data.engagement / data.count) * 10) : 0,
    }))
    .sort((a, b) => b.performance - a.performance);

  return {
    followers: latestDay.followers_count,
    followersGrowth,
    posts: totalPosts,
    avgEngagementRate: totalPosts > 0 
      ? (totalEngagement / totalPosts / latestDay.followers_count) * 100 
      : 0,
    avgReach: totalPosts > 0 ? totalReach / totalPosts : 0,
    avgImpressions: totalPosts > 0 ? totalImpressions / totalPosts : 0,
    topContentTypes,
    bestTimes: [],
    period: 'últimos 7 dias',
  };
}

/**
 * Busca posts recentes para análise
 */
async function getRecentPostsForReport(accountId: string): Promise<PostMetrics[]> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: posts } = await supabase
    .from('instaflow_scheduled_posts')
    .select(`
      id,
      content_type,
      caption,
      hashtags,
      published_at,
      instaflow_post_analytics(
        reach,
        impressions,
        engagement,
        saves,
        shares,
        comments
      )
    `)
    .eq('account_id', accountId)
    .eq('status', 'published')
    .gte('published_at', sevenDaysAgo.toISOString())
    .order('published_at', { ascending: false })
    .limit(10);

  return (posts || [])
    .filter(p => p.instaflow_post_analytics?.[0])
    .map(p => {
      const a = p.instaflow_post_analytics[0];
      return {
        type: p.content_type,
        caption: p.caption || '',
        hashtags: p.hashtags || [],
        reach: a.reach || 0,
        impressions: a.impressions || 0,
        engagement: a.engagement || 0,
        saves: a.saves || 0,
        shares: a.shares || 0,
        comments: a.comments || 0,
        postedAt: new Date(p.published_at),
      };
    });
}

/**
 * Gera HTML do relatório
 */
function generateReportHtml(
  username: string,
  metrics: AccountMetrics,
  insights: any
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: white; }
    .header { background: linear-gradient(135deg, #833AB4, #FD1D1D, #FCB045); padding: 30px; color: white; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 30px; }
    .metric-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 30px; }
    .metric-box { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
    .metric-value { font-size: 28px; font-weight: bold; color: #1a1a1a; }
    .metric-label { font-size: 12px; color: #666; text-transform: uppercase; margin-top: 5px; }
    .section { margin-bottom: 30px; }
    .section h2 { font-size: 18px; color: #1a1a1a; border-bottom: 2px solid #833AB4; padding-bottom: 10px; }
    .insight-card { background: #f0f7ff; padding: 15px; border-radius: 8px; margin-bottom: 10px; border-left: 4px solid #0066cc; }
    .highlight { background: #e8f5e9; border-left-color: #4caf50; }
    .concern { background: #fff3e0; border-left-color: #ff9800; }
    .footer { background: #1a1a1a; padding: 20px; text-align: center; color: #999; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Relatório Semanal</h1>
      <p>@${username} - ${metrics.period}</p>
    </div>
    
    <div class="content">
      <div class="metric-grid">
        <div class="metric-box">
          <div class="metric-value">${metrics.followers.toLocaleString()}</div>
          <div class="metric-label">Seguidores</div>
        </div>
        <div class="metric-box">
          <div class="metric-value">${metrics.followersGrowth > 0 ? '+' : ''}${metrics.followersGrowth.toFixed(1)}%</div>
          <div class="metric-label">Crescimento</div>
        </div>
        <div class="metric-box">
          <div class="metric-value">${metrics.posts}</div>
          <div class="metric-label">Posts</div>
        </div>
        <div class="metric-box">
          <div class="metric-value">${metrics.avgEngagementRate.toFixed(2)}%</div>
          <div class="metric-label">Engajamento</div>
        </div>
      </div>

      <div class="section">
        <h2>📝 Resumo</h2>
        <p>${insights.summary}</p>
      </div>

      ${insights.highlights?.length > 0 ? `
      <div class="section">
        <h2>🌟 Destaques</h2>
        ${insights.highlights.map((h: string) => `
          <div class="insight-card highlight">
            <p style="margin: 0;">${h}</p>
          </div>
        `).join('')}
      </div>
      ` : ''}

      ${insights.concerns?.length > 0 ? `
      <div class="section">
        <h2>⚠️ Pontos de Atenção</h2>
        ${insights.concerns.map((c: string) => `
          <div class="insight-card concern">
            <p style="margin: 0;">${c}</p>
          </div>
        `).join('')}
      </div>
      ` : ''}

      ${insights.actionItems?.length > 0 ? `
      <div class="section">
        <h2>🎯 Ações Recomendadas</h2>
        ${insights.actionItems.map((a: any) => `
          <div class="insight-card">
            <p style="margin: 0;"><strong>${a.action}</strong></p>
            <p style="margin: 5px 0 0 0; font-size: 13px; color: #666;">Impacto: ${a.impact}</p>
          </div>
        `).join('')}
      </div>
      ` : ''}

      <div class="section">
        <h2>📈 Estratégia de Conteúdo</h2>
        <p>${insights.contentStrategy || 'Continue postando consistentemente e monitorando métricas.'}</p>
      </div>
    </div>
    
    <div class="footer">
      <p>Este relatório foi gerado automaticamente pelo InstaFlow</p>
      <p>© ${new Date().getFullYear()} InstaFlow - Todos os direitos reservados</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Envia email via Resend
 */
async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.log('RESEND_API_KEY not configured, skipping email');
    return false;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'InstaFlow <reports@seudominio.com>',
        to: [to],
        subject,
        html,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

/**
 * Gera e envia relatório para um usuário
 */
async function generateAndSendReport(setting: any): Promise<ReportResult> {
  const { user_id, account_id, instagram_accounts } = setting;

  try {
    // Buscar email do usuário
    const { data: userData } = await supabase
      .from('users')
      .select('email')
      .eq('id', user_id)
      .single();

    if (!userData?.email) {
      return {
        userId: user_id,
        accountId: account_id,
        success: false,
        error: 'User email not found',
      };
    }

    // Buscar métricas
    const metrics = await getAccountMetricsForReport(account_id);
    if (!metrics) {
      return {
        userId: user_id,
        accountId: account_id,
        success: false,
        error: 'No metrics available',
      };
    }

    // Buscar posts recentes
    const recentPosts = await getRecentPostsForReport(account_id);

    // Gerar insights com IA
    const insights = await generateInsightReport(
      metrics,
      recentPosts,
      instagram_accounts.username
    );

    // Gerar HTML
    const html = generateReportHtml(
      instagram_accounts.username,
      metrics,
      insights
    );

    // Salvar relatório no banco
    const { data: report, error: saveError } = await supabase
      .from('instaflow_reports')
      .insert({
        user_id,
        account_id,
        report_type: 'weekly',
        data: {
          metrics,
          insights,
        },
        generated_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (saveError) {
      console.error('Error saving report:', saveError);
    }

    // Enviar email
    const emailSent = await sendEmail(
      userData.email,
      `📊 Relatório Semanal - @${instagram_accounts.username}`,
      html
    );

    if (!emailSent) {
      console.log('Email not sent (may be disabled or error)');
    }

    return {
      userId: user_id,
      accountId: account_id,
      success: true,
      reportId: report?.id,
    };
  } catch (error: any) {
    console.error(`Error generating report for ${account_id}:`, error);
    
    return {
      userId: user_id,
      accountId: account_id,
      success: false,
      error: error.message,
    };
  }
}

/**
 * Worker principal
 */
export async function runReportSender(): Promise<{
  processed: number;
  success: number;
  failed: number;
}> {
  console.log('Starting report sender...');

  const settings = await getUsersWithWeeklyReports();
  
  if (settings.length === 0) {
    console.log('No users with weekly reports enabled');
    return { processed: 0, success: 0, failed: 0 };
  }

  let success = 0;
  let failed = 0;

  for (const setting of settings) {
    const result = await generateAndSendReport(setting);
    
    if (result.success) {
      success++;
    } else {
      failed++;
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log(`Report sender completed: ${success} success, ${failed} failed`);

  return {
    processed: settings.length,
    success,
    failed,
  };
}

/**
 * Handler para API Route ou Edge Function
 */
export async function handleReportCron(
  authHeader?: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const result = await runReportSender();
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Report sender error:', error);
    return { success: false, error: error.message };
  }
}
