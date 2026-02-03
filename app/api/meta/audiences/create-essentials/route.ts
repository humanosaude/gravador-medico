// =====================================================
// API: CRIAR PÚBLICOS ESSENCIAIS
// =====================================================
// Cria automaticamente todos os públicos essenciais
// da Meta Ads usando templates pré-definidos
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { 
  ESSENTIAL_AUDIENCES, 
  ESSENTIAL_LOOKALIKES,
  prepareAudienceRule,
  AudienceTemplate,
  LookalikeConfig,
  generateAudienceName,
  generateLookalikeName,
  SYSTEM_PREFIX
} from '@/lib/meta/audience-templates';

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 segundos para criar todos os públicos

// =====================================================
// HELPERS
// =====================================================

const API_VERSION = 'v21.0';
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

interface MetaCredentials {
  adAccountId: string;
  accessToken: string;
  pixelId?: string;
  pageId?: string;
  igAccountId?: string;
}

async function getMetaCredentials(): Promise<MetaCredentials> {
  // Buscar configurações do banco
  const { data: settings } = await supabaseAdmin
    .from('integration_settings')
    .select('meta_ad_account_id, meta_pixel_id, meta_page_id, meta_instagram_id')
    .eq('is_default', true)
    .single();

  const adAccountId = settings?.meta_ad_account_id || process.env.META_AD_ACCOUNT_ID;
  const accessToken = process.env.META_ACCESS_TOKEN || process.env.FACEBOOK_ACCESS_TOKEN;
  const pixelId = settings?.meta_pixel_id || process.env.META_PIXEL_ID;
  const pageId = settings?.meta_page_id || process.env.META_PAGE_ID;
  const igAccountId = settings?.meta_instagram_id || process.env.META_INSTAGRAM_ID;

  if (!adAccountId || !accessToken) {
    throw new Error('Credenciais Meta não configuradas');
  }

  return { adAccountId, accessToken, pixelId, pageId, igAccountId };
}

async function createCustomAudience(
  template: AudienceTemplate,
  credentials: MetaCredentials
): Promise<{ id: string; name: string }> {
  const { adAccountId, accessToken, pixelId, pageId, igAccountId } = credentials;

  // Gerar nome padronizado usando a convenção [GDM]
  const standardizedName = generateAudienceName(template);

  // Preparar regra com placeholders substituídos
  const rule = prepareAudienceRule(template, {
    pixel_id: pixelId,
    page_id: pageId,
    ig_account_id: igAccountId
  });

  // Determinar subtype baseado no tipo
  const subtypeMap: Record<string, string> = {
    'WEBSITE': 'WEBSITE',
    'ENGAGEMENT': 'ENGAGEMENT',
    'VIDEO': 'VIDEO',
    'CUSTOMER_LIST': 'CUSTOM',
    'LEAD_FORM': 'CLAIM'
  };

  const formData = new URLSearchParams();
  formData.append('access_token', accessToken);
  formData.append('name', standardizedName); // Usa nome padronizado
  formData.append('subtype', subtypeMap[template.type] || 'CUSTOM');
  formData.append('description', `${template.description} | Template: ${template.id}`);
  formData.append('rule', JSON.stringify(rule));
  formData.append('prefill', 'true');
  formData.append('customer_file_source', 'USER_PROVIDED_ONLY');

  const response = await fetch(
    `${BASE_URL}/act_${adAccountId}/customaudiences`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    }
  );

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message || 'Erro ao criar público');
  }

  return { id: data.id, name: standardizedName };
}

async function createLookalikeAudience(
  config: LookalikeConfig,
  sourceAudienceId: string,
  sourceTemplate: AudienceTemplate,
  credentials: MetaCredentials
): Promise<{ id: string; name: string }> {
  const { adAccountId, accessToken } = credentials;

  // Gerar nome padronizado para lookalike usando a convenção [GDM]
  const standardizedName = generateLookalikeName(config, sourceTemplate);

  const spec = {
    origin: [{ id: sourceAudienceId, type: 'custom_audience' }],
    location_spec: {
      geo_locations: {
        countries: [config.country]
      }
    },
    ratio: config.ratio,
    type: 'similarity'
  };

  const formData = new URLSearchParams();
  formData.append('access_token', accessToken);
  formData.append('name', standardizedName); // Usa nome padronizado
  formData.append('subtype', 'LOOKALIKE');
  formData.append('lookalike_spec', JSON.stringify(spec));

  const response = await fetch(
    `${BASE_URL}/act_${adAccountId}/customaudiences`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    }
  );

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message || 'Erro ao criar lookalike');
  }

  return { id: data.id, name: standardizedName };
}

async function checkAudienceSize(
  audienceId: string,
  accessToken: string
): Promise<{ size: number; isHealthy: boolean }> {
  const response = await fetch(
    `${BASE_URL}/${audienceId}?fields=approximate_count_lower_bound,delivery_status&access_token=${accessToken}`
  );

  const data = await response.json();
  const size = data.approximate_count_lower_bound || 0;

  return {
    size,
    isHealthy: size >= 1000 // Mínimo recomendado pela Meta
  };
}

// =====================================================
// POST: Criar Públicos Essenciais
// =====================================================

export async function POST(req: NextRequest) {
  try {
    console.log('🚀 [Create Essentials] Iniciando criação de públicos essenciais...');

    // 1. Obter credenciais
    const credentials = await getMetaCredentials();
    console.log('✅ Credenciais obtidas:', {
      adAccountId: credentials.adAccountId,
      hasPixel: !!credentials.pixelId,
      hasPage: !!credentials.pageId,
      hasIG: !!credentials.igAccountId
    });

    // 2. Verificar quais públicos já existem
    const { data: existingAudiences } = await supabaseAdmin
      .from('ads_audiences')
      .select('template_id, meta_audience_id, name')
      .not('template_id', 'is', null);

    const existingTemplateIds = new Set(
      existingAudiences?.map(a => a.template_id) || []
    );

    console.log(`📊 ${existingTemplateIds.size} públicos já existem`);

    // 3. Criar públicos personalizados
    const results = {
      created: [] as any[],
      skipped: [] as any[],
      failed: [] as any[],
      lookalikes_created: [] as any[],
      lookalikes_pending: [] as any[]
    };

    // Mapa para guardar IDs dos públicos criados (para lookalikes)
    const createdAudienceMap = new Map<string, string>();

    // Adicionar públicos existentes ao mapa
    existingAudiences?.forEach(a => {
      if (a.template_id && a.meta_audience_id) {
        createdAudienceMap.set(a.template_id, a.meta_audience_id);
      }
    });

    // Filtrar templates essenciais
    const essentialTemplates = ESSENTIAL_AUDIENCES
      .filter(t => t.is_essential)
      .sort((a, b) => a.priority - b.priority);

    console.log(`📋 ${essentialTemplates.length} templates essenciais para processar`);

    for (const template of essentialTemplates) {
      // Verificar dependências (pixel, page, ig)
      if (template.type === 'WEBSITE' && !credentials.pixelId) {
        results.skipped.push({
          template_id: template.id,
          name: template.name,
          reason: 'Pixel não configurado'
        });
        continue;
      }

      if (template.type === 'ENGAGEMENT' && template.rule?.inclusions?.rules?.[0]?.event_sources?.[0]?.type === 'page' && !credentials.pageId) {
        results.skipped.push({
          template_id: template.id,
          name: template.name,
          reason: 'Page ID não configurado'
        });
        continue;
      }

      if (template.type === 'ENGAGEMENT' && template.rule?.inclusions?.rules?.[0]?.event_sources?.[0]?.type === 'ig_business' && !credentials.igAccountId) {
        results.skipped.push({
          template_id: template.id,
          name: template.name,
          reason: 'Instagram não configurado'
        });
        continue;
      }

      // Verificar se já existe
      if (existingTemplateIds.has(template.id)) {
        results.skipped.push({
          template_id: template.id,
          name: template.name,
          reason: 'Já existe'
        });
        continue;
      }

      try {
        // Criar público
        const audience = await createCustomAudience(template, credentials);
        
        console.log(`✅ Público criado: ${template.name} (ID: ${audience.id})`);

        // Salvar no banco
        await supabaseAdmin.from('ads_audiences').upsert({
          meta_audience_id: audience.id,
          template_id: template.id,
          name: template.name,
          audience_type: 'CUSTOM',
          source_type: template.type,
          funnel_stage: template.funnel_stage,
          retention_days: parseInt(template.retention_days),
          is_essential: template.is_essential,
          use_for_exclusion: template.use_for_exclusion || false,
          recommended_for: template.recommended_for,
          is_active: true
        }, { onConflict: 'meta_audience_id' });

        createdAudienceMap.set(template.id, audience.id);

        results.created.push({
          template_id: template.id,
          name: template.name,
          audience_id: audience.id,
          type: template.type
        });

        // Rate limit: aguardar 2s entre criações
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error: any) {
        console.error(`❌ Erro ao criar ${template.name}:`, error.message);
        
        // Se for erro de duplicado, marcar como existente
        if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
          results.skipped.push({
            template_id: template.id,
            name: template.name,
            reason: 'Já existe na Meta'
          });
        } else {
          results.failed.push({
            template_id: template.id,
            name: template.name,
            error: error.message
          });
        }
      }
    }

    // 4. Criar Lookalikes
    console.log('📊 [Create Essentials] Processando Lookalikes...');

    for (const lookalikeConfig of ESSENTIAL_LOOKALIKES) {
      // Verificar se já existe
      const existingLookalike = existingAudiences?.find(
        a => a.template_id === lookalikeConfig.id
      );
      
      if (existingLookalike) {
        results.skipped.push({
          template_id: lookalikeConfig.id,
          name: lookalikeConfig.name,
          reason: 'Já existe'
        });
        continue;
      }

      // Verificar se público base existe
      const sourceAudienceId = createdAudienceMap.get(lookalikeConfig.source_template_id);
      
      if (!sourceAudienceId) {
        results.lookalikes_pending.push({
          template_id: lookalikeConfig.id,
          name: lookalikeConfig.name,
          reason: `Público base não encontrado (${lookalikeConfig.source_template_id})`
        });
        continue;
      }

      try {
        // Verificar tamanho do público base
        const health = await checkAudienceSize(sourceAudienceId, credentials.accessToken);
        
        if (!health.isHealthy) {
          results.lookalikes_pending.push({
            template_id: lookalikeConfig.id,
            name: lookalikeConfig.name,
            reason: `Aguardando público base crescer (atual: ${health.size} pessoas)`
          });
          continue;
        }

        // Buscar template base para gerar nome
        const sourceTemplate = ESSENTIAL_AUDIENCES.find(t => t.id === lookalikeConfig.source_template_id);
        if (!sourceTemplate) {
          results.failed.push({
            template_id: lookalikeConfig.id,
            name: lookalikeConfig.name,
            error: 'Template base não encontrado'
          });
          continue;
        }

        // Criar lookalike
        const lookalike = await createLookalikeAudience(
          lookalikeConfig,
          sourceAudienceId,
          sourceTemplate,
          credentials
        );

        console.log(`✅ Lookalike criado: ${lookalike.name} (ID: ${lookalike.id})`);

        // Salvar no banco
        await supabaseAdmin.from('ads_audiences').upsert({
          meta_audience_id: lookalike.id,
          template_id: lookalikeConfig.id,
          name: lookalike.name, // Usa nome padronizado retornado
          audience_type: 'LOOKALIKE',
          funnel_stage: 'TOPO',
          source_audience_id: sourceAudienceId,
          lookalike_ratio: lookalikeConfig.ratio,
          is_essential: true,
          recommended_for: lookalikeConfig.recommended_for,
          is_active: true
        }, { onConflict: 'meta_audience_id' });

        results.lookalikes_created.push({
          template_id: lookalikeConfig.id,
          name: lookalikeConfig.name,
          audience_id: lookalike.id,
          source_id: sourceAudienceId,
          ratio: lookalikeConfig.ratio
        });

        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error: any) {
        console.error(`❌ Erro ao criar lookalike ${lookalikeConfig.name}:`, error.message);
        
        if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
          results.skipped.push({
            template_id: lookalikeConfig.id,
            name: lookalikeConfig.name,
            reason: 'Já existe na Meta'
          });
        } else {
          results.failed.push({
            template_id: lookalikeConfig.id,
            name: lookalikeConfig.name,
            error: error.message
          });
        }
      }
    }

    console.log('✅ [Create Essentials] Processo concluído!');

    return NextResponse.json({
      success: true,
      summary: {
        audiences_created: results.created.length,
        lookalikes_created: results.lookalikes_created.length,
        skipped: results.skipped.length,
        failed: results.failed.length,
        lookalikes_pending: results.lookalikes_pending.length
      },
      details: results
    });

  } catch (error: any) {
    console.error('[Create Essentials] Erro fatal:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      hint: 'Verifique suas credenciais Meta e configurações de Pixel/Page'
    }, { status: 500 });
  }
}

// =====================================================
// GET: Status dos Públicos Essenciais
// =====================================================

export async function GET(req: NextRequest) {
  try {
    // Buscar públicos do banco
    const { data: audiences, error } = await supabaseAdmin
      .from('ads_audiences')
      .select('*')
      .eq('is_essential', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Organizar por status
    const stats = {
      total: audiences?.length || 0,
      custom: audiences?.filter(a => a.audience_type === 'CUSTOM').length || 0,
      lookalikes: audiences?.filter(a => a.audience_type === 'LOOKALIKE').length || 0,
      templates_available: ESSENTIAL_AUDIENCES.filter(t => t.is_essential).length,
      lookalikes_available: ESSENTIAL_LOOKALIKES.length
    };

    // Verificar quais faltam criar
    const existingIds = new Set(audiences?.map(a => a.template_id) || []);
    
    const missing = {
      audiences: ESSENTIAL_AUDIENCES
        .filter(t => t.is_essential && !existingIds.has(t.id))
        .map(t => ({ id: t.id, name: t.name, type: t.type })),
      lookalikes: ESSENTIAL_LOOKALIKES
        .filter(l => !existingIds.has(l.id))
        .map(l => ({ id: l.id, name: l.name }))
    };

    return NextResponse.json({
      success: true,
      stats,
      audiences: audiences || [],
      missing
    });

  } catch (error: any) {
    console.error('[Get Essentials Status] Erro:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
