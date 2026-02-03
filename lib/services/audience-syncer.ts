/**
 * =====================================================
 * AUDIENCE SYNCER - Sincronização de Públicos Meta
 * =====================================================
 * 
 * Sistema de sincronização automática de públicos:
 * 1. Públicos de Pixel/Social (PageView, Checkout, IG Engajamento)
 * 2. Públicos de Database (Compradores, Abandonos via Customer Match)
 * 3. Fábrica de Lookalikes (1% e 5%)
 * 
 * Arquitetura:
 * - Cron diário às 03:00 AM para sync incremental
 * - Hash SHA-256 obrigatório para Customer Match (GDPR/LGPD)
 * - Normalização de dados antes do hash
 */

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// =====================================================
// CONFIGURAÇÃO
// =====================================================

const META_API_VERSION = 'v21.0';
const META_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// =====================================================
// TIPOS
// =====================================================

interface MetaConfig {
  accessToken: string;
  adAccountId: string;
  pixelId?: string;
  instagramActorId?: string;
}

interface CustomerData {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  country?: string;
}

interface HashedCustomerData {
  EMAIL?: string;
  PHONE?: string;
  FN?: string;
  LN?: string;
  COUNTRY?: string;
}

interface AudienceInfo {
  id: string;
  name: string;
  approximate_count?: number;
  subtype?: string;
}

interface SyncResult {
  success: boolean;
  audiencesCreated: string[];
  audiencesUpdated: string[];
  lookalikesCreated: string[];
  errors: string[];
  stats: {
    purchasersCount: number;
    abandonedCount: number;
    totalSynced: number;
  };
}

// =====================================================
// HELPERS: NORMALIZAÇÃO E HASH
// =====================================================

/**
 * Normaliza email para hash (lowercase, trim)
 */
function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Normaliza telefone brasileiro para formato E.164
 * Remove +55, espaços, parênteses, traços
 * Mantém apenas dígitos, adiciona 55 se necessário
 */
function normalizePhone(phone: string): string {
  // Remove tudo exceto dígitos
  let cleaned = phone.replace(/\D/g, '');
  
  // Se começar com 55, remove (vamos adicionar depois)
  if (cleaned.startsWith('55')) {
    cleaned = cleaned.substring(2);
  }
  
  // Se começar com 0, remove
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  
  // Deve ter 10 ou 11 dígitos (DDD + número)
  if (cleaned.length < 10 || cleaned.length > 11) {
    return '';
  }
  
  // Adiciona código do país (55 para Brasil)
  return `55${cleaned}`;
}

/**
 * Hash SHA-256 para Meta Customer Match
 */
function sha256Hash(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

/**
 * Prepara dados do cliente para Customer Match
 * Normaliza e aplica hash SHA-256
 */
function prepareCustomerData(customer: CustomerData): HashedCustomerData | null {
  const hashed: HashedCustomerData = {};
  let hasData = false;
  
  if (customer.email) {
    const normalized = normalizeEmail(customer.email);
    if (normalized && normalized.includes('@')) {
      hashed.EMAIL = sha256Hash(normalized);
      hasData = true;
    }
  }
  
  if (customer.phone) {
    const normalized = normalizePhone(customer.phone);
    if (normalized) {
      hashed.PHONE = sha256Hash(normalized);
      hasData = true;
    }
  }
  
  if (customer.firstName) {
    const normalized = customer.firstName.toLowerCase().trim();
    if (normalized) {
      hashed.FN = sha256Hash(normalized);
    }
  }
  
  if (customer.lastName) {
    const normalized = customer.lastName.toLowerCase().trim();
    if (normalized) {
      hashed.LN = sha256Hash(normalized);
    }
  }
  
  if (customer.country) {
    hashed.COUNTRY = sha256Hash(customer.country.toLowerCase().trim());
  } else {
    // Default para Brasil
    hashed.COUNTRY = sha256Hash('br');
  }
  
  return hasData ? hashed : null;
}

// =====================================================
// HELPERS: META API
// =====================================================

/**
 * Busca configuração Meta do banco de dados
 */
async function getMetaConfig(): Promise<MetaConfig | null> {
  try {
    const { data, error } = await supabase
      .from('integration_settings')
      .select('*')
      .eq('is_default', true)
      .single();
    
    if (error || !data) {
      console.log('[AudienceSyncer] Usando config do ambiente');
      return {
        accessToken: process.env.META_ACCESS_TOKEN || process.env.FACEBOOK_ACCESS_TOKEN || '',
        adAccountId: process.env.META_AD_ACCOUNT_ID || process.env.FACEBOOK_AD_ACCOUNT_ID || '',
        pixelId: process.env.META_PIXEL_ID,
        instagramActorId: process.env.META_INSTAGRAM_ID,
      };
    }
    
    // Busca do banco, com fallback para env se não tiver token
    return {
      accessToken: data.meta_access_token || process.env.META_ACCESS_TOKEN || process.env.FACEBOOK_ACCESS_TOKEN || '',
      adAccountId: data.meta_ad_account_id || process.env.FACEBOOK_AD_ACCOUNT_ID || '',
      pixelId: data.meta_pixel_id,
      instagramActorId: data.meta_instagram_id,
    };
  } catch (err) {
    console.error('[AudienceSyncer] Erro ao buscar config:', err);
    return null;
  }
}

/**
 * Lista públicos existentes na conta
 */
async function listExistingAudiences(config: MetaConfig): Promise<AudienceInfo[]> {
  try {
    const url = `${META_BASE_URL}/act_${config.adAccountId}/customaudiences`;
    const params = new URLSearchParams({
      access_token: config.accessToken,
      fields: 'id,name,approximate_count,subtype',
      limit: '500',
    });
    
    const response = await fetch(`${url}?${params}`);
    const data = await response.json();
    
    if (data.error) {
      console.error('[AudienceSyncer] Erro ao listar públicos:', data.error);
      return [];
    }
    
    return data.data || [];
  } catch (err) {
    console.error('[AudienceSyncer] Erro ao listar públicos:', err);
    return [];
  }
}

/**
 * Cria público de Website (Pixel)
 */
async function createWebsiteAudience(
  config: MetaConfig,
  name: string,
  eventName: string,
  retentionDays: number
): Promise<string | null> {
  if (!config.pixelId) {
    console.error('[AudienceSyncer] Pixel ID não configurado');
    return null;
  }
  
  try {
    const url = `${META_BASE_URL}/act_${config.adAccountId}/customaudiences`;
    
    const rule = {
      inclusions: {
        operator: 'or',
        rules: [{
          event_sources: [{ id: config.pixelId, type: 'pixel' }],
          retention_seconds: retentionDays * 24 * 60 * 60,
          filter: {
            operator: 'and',
            filters: [{
              field: 'event',
              operator: 'eq',
              value: eventName,
            }],
          },
        }],
      },
    };
    
    const params = new URLSearchParams({
      access_token: config.accessToken,
      name,
      subtype: 'WEBSITE',
      rule: JSON.stringify(rule),
      retention_days: retentionDays.toString(),
      customer_file_source: 'USER_PROVIDED_ONLY',
    });
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    
    const data = await response.json();
    
    if (data.error) {
      console.error(`[AudienceSyncer] Erro ao criar público ${name}:`, data.error);
      return null;
    }
    
    console.log(`[AudienceSyncer] ✅ Público criado: ${name} (${data.id})`);
    return data.id;
  } catch (err) {
    console.error(`[AudienceSyncer] Erro ao criar público ${name}:`, err);
    return null;
  }
}

/**
 * Cria público de Instagram Engagement
 */
async function createInstagramAudience(
  config: MetaConfig,
  name: string,
  retentionDays: number
): Promise<string | null> {
  if (!config.instagramActorId) {
    console.error('[AudienceSyncer] Instagram Actor ID não configurado');
    return null;
  }
  
  try {
    const url = `${META_BASE_URL}/act_${config.adAccountId}/customaudiences`;
    
    const rule = {
      inclusions: {
        operator: 'or',
        rules: [{
          object_id: config.instagramActorId,
          event_sources: [{ 
            id: config.instagramActorId, 
            type: 'ig_business' 
          }],
          retention_seconds: retentionDays * 24 * 60 * 60,
        }],
      },
    };
    
    const params = new URLSearchParams({
      access_token: config.accessToken,
      name,
      subtype: 'ENGAGEMENT',
      rule: JSON.stringify(rule),
      prefill: 'true',
    });
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    
    const data = await response.json();
    
    if (data.error) {
      console.error(`[AudienceSyncer] Erro ao criar público IG ${name}:`, data.error);
      return null;
    }
    
    console.log(`[AudienceSyncer] ✅ Público IG criado: ${name} (${data.id})`);
    return data.id;
  } catch (err) {
    console.error(`[AudienceSyncer] Erro ao criar público IG ${name}:`, err);
    return null;
  }
}

/**
 * Cria público de Customer Match (dados do banco)
 */
async function createCustomerMatchAudience(
  config: MetaConfig,
  name: string,
  description: string
): Promise<string | null> {
  try {
    const url = `${META_BASE_URL}/act_${config.adAccountId}/customaudiences`;
    
    const params = new URLSearchParams({
      access_token: config.accessToken,
      name,
      description,
      subtype: 'CUSTOM',
      customer_file_source: 'PARTNER_PROVIDED_ONLY',
    });
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    
    const data = await response.json();
    
    if (data.error) {
      // Verifica se é erro de ToS (Terms of Service)
      if (data.error.code === 2650 || data.error.message?.includes('Terms of Service')) {
        console.error('[AudienceSyncer] ❌ Erro de ToS: Aceite os termos de Custom Audience no Business Manager');
      }
      console.error(`[AudienceSyncer] Erro ao criar Customer Match ${name}:`, data.error);
      return null;
    }
    
    console.log(`[AudienceSyncer] ✅ Customer Match criado: ${name} (${data.id})`);
    return data.id;
  } catch (err) {
    console.error(`[AudienceSyncer] Erro ao criar Customer Match ${name}:`, err);
    return null;
  }
}

/**
 * Adiciona usuários a um público Customer Match
 */
async function addUsersToAudience(
  config: MetaConfig,
  audienceId: string,
  customers: HashedCustomerData[]
): Promise<boolean> {
  if (customers.length === 0) {
    console.log('[AudienceSyncer] Nenhum cliente para adicionar');
    return true;
  }
  
  try {
    const url = `${META_BASE_URL}/${audienceId}/users`;
    
    // Formatar dados para a API
    const schema = ['EMAIL', 'PHONE', 'FN', 'LN', 'COUNTRY'];
    const data = customers.map(c => [
      c.EMAIL || '',
      c.PHONE || '',
      c.FN || '',
      c.LN || '',
      c.COUNTRY || '',
    ]);
    
    // Enviar em lotes de 10.000
    const BATCH_SIZE = 10000;
    let totalAdded = 0;
    
    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, i + BATCH_SIZE);
      
      const payload = {
        payload: {
          schema,
          data: batch,
        },
      };
      
      const params = new URLSearchParams({
        access_token: config.accessToken,
        payload: JSON.stringify(payload.payload),
      });
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });
      
      const result = await response.json();
      
      if (result.error) {
        console.error(`[AudienceSyncer] Erro ao adicionar usuários:`, result.error);
        return false;
      }
      
      totalAdded += batch.length;
      console.log(`[AudienceSyncer] Adicionados ${totalAdded}/${customers.length} usuários`);
    }
    
    console.log(`[AudienceSyncer] ✅ ${totalAdded} usuários adicionados ao público`);
    return true;
  } catch (err) {
    console.error('[AudienceSyncer] Erro ao adicionar usuários:', err);
    return false;
  }
}

/**
 * Cria Lookalike a partir de um público base
 */
async function createLookalike(
  config: MetaConfig,
  sourceAudienceId: string,
  sourceAudienceName: string,
  ratio: number // 0.01 = 1%, 0.05 = 5%
): Promise<string | null> {
  try {
    const url = `${META_BASE_URL}/act_${config.adAccountId}/customaudiences`;
    const percentLabel = Math.round(ratio * 100);
    const name = `LAL ${percentLabel}% - ${sourceAudienceName}`;
    
    const params = new URLSearchParams({
      access_token: config.accessToken,
      name,
      subtype: 'LOOKALIKE',
      origin_audience_id: sourceAudienceId,
      lookalike_spec: JSON.stringify({
        type: 'similarity',
        country: 'BR',
        ratio,
      }),
    });
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    
    const data = await response.json();
    
    if (data.error) {
      // Ignora se já existe
      if (data.error.code === 2654) {
        console.log(`[AudienceSyncer] LAL ${percentLabel}% já existe para ${sourceAudienceName}`);
        return null;
      }
      console.error(`[AudienceSyncer] Erro ao criar LAL:`, data.error);
      return null;
    }
    
    console.log(`[AudienceSyncer] ✅ LAL criado: ${name} (${data.id})`);
    return data.id;
  } catch (err) {
    console.error('[AudienceSyncer] Erro ao criar LAL:', err);
    return null;
  }
}

// =====================================================
// QUERIES DO BANCO DE DADOS
// =====================================================

/**
 * Busca compradores do banco de dados
 */
async function fetchPurchasers(onlyRecent: boolean = false): Promise<CustomerData[]> {
  try {
    let query = supabase
      .from('sales')
      .select('email, phone, customer_name')
      .eq('status', 'paid');
    
    if (onlyRecent) {
      // Últimas 24 horas
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      query = query.gte('created_at', yesterday.toISOString());
    }
    
    const { data, error } = await query.limit(50000);
    
    if (error) {
      console.error('[AudienceSyncer] Erro ao buscar compradores:', error);
      return [];
    }
    
    return (data || []).map(sale => {
      // Separar nome em primeiro e último nome
      const nameParts = (sale.customer_name || '').trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      return {
        email: sale.email,
        phone: sale.phone,
        firstName,
        lastName,
        country: 'br',
      };
    });
  } catch (err) {
    console.error('[AudienceSyncer] Erro ao buscar compradores:', err);
    return [];
  }
}

/**
 * Busca abandonos de carrinho do banco de dados
 */
async function fetchAbandonedCarts(): Promise<CustomerData[]> {
  try {
    // Buscar carrinhos abandonados (não convertidos)
    const { data: carts, error: cartsError } = await supabase
      .from('carts')
      .select('email, phone, customer_name')
      .eq('status', 'abandoned')
      .limit(50000);
    
    const abandonedFromCarts = (carts || []).map(cart => {
      const nameParts = (cart.customer_name || '').trim().split(' ');
      return {
        email: cart.email,
        phone: cart.phone,
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        country: 'br',
      };
    });
    
    // Também buscar de leads se houver
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('email, phone, name')
      .limit(50000);
    
    const abandonedFromLeads = (leads || []).map(lead => {
      const nameParts = (lead.name || '').trim().split(' ');
      return {
        email: lead.email,
        phone: lead.phone,
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        country: 'br',
      };
    });
    
    // Combinar e remover duplicatas por email
    const combined = [...abandonedFromCarts, ...abandonedFromLeads];
    const unique = Array.from(
      new Map(combined.filter(c => c.email).map(c => [c.email, c])).values()
    );
    
    return unique;
  } catch (err) {
    console.error('[AudienceSyncer] Erro ao buscar abandonos:', err);
    return [];
  }
}

// =====================================================
// FUNÇÕES PRINCIPAIS
// =====================================================

/**
 * Garante que os públicos padrão de Pixel/Social existem
 */
export async function ensureStandardAudiences(): Promise<{
  created: string[];
  existing: string[];
  errors: string[];
}> {
  console.log('[AudienceSyncer] 🔍 Verificando públicos padrão...');
  
  const config = await getMetaConfig();
  if (!config || !config.accessToken || !config.adAccountId) {
    return { created: [], existing: [], errors: ['Configuração Meta não encontrada'] };
  }
  
  const existing = await listExistingAudiences(config);
  const existingNames = new Set(existing.map(a => a.name));
  
  const created: string[] = [];
  const alreadyExisting: string[] = [];
  const errors: string[] = [];
  
  // Definir públicos padrão
  const standardAudiences = [
    { name: 'IG - Engajamento 365D', type: 'instagram', retention: 365 },
    { name: 'Site - Visitantes 30D', type: 'website', event: 'PageView', retention: 30 },
    { name: 'Site - Checkout 14D', type: 'website', event: 'InitiateCheckout', retention: 14 },
    { name: 'Site - AddToCart 30D', type: 'website', event: 'AddToCart', retention: 30 },
    { name: 'Site - Purchase 180D', type: 'website', event: 'Purchase', retention: 180 },
  ];
  
  for (const audience of standardAudiences) {
    if (existingNames.has(audience.name)) {
      alreadyExisting.push(audience.name);
      console.log(`[AudienceSyncer] ✓ Já existe: ${audience.name}`);
      continue;
    }
    
    let audienceId: string | null = null;
    
    if (audience.type === 'instagram') {
      audienceId = await createInstagramAudience(config, audience.name, audience.retention);
    } else if (audience.type === 'website' && audience.event) {
      audienceId = await createWebsiteAudience(config, audience.name, audience.event, audience.retention);
    }
    
    if (audienceId) {
      created.push(audience.name);
      
      // Salvar no banco
      await supabase.from('ads_audiences').upsert({
        name: audience.name,
        meta_audience_id: audienceId,
        type: audience.type === 'instagram' ? 'ENGAGEMENT' : 'WEBSITE',
        source: audience.type === 'instagram' ? 'instagram' : 'pixel',
        is_active: true,
        auto_sync: false,
      }, { onConflict: 'meta_audience_id' });
    } else {
      errors.push(`Falha ao criar: ${audience.name}`);
    }
  }
  
  console.log(`[AudienceSyncer] ✅ Verificação concluída: ${created.length} criados, ${alreadyExisting.length} existentes`);
  
  return { created, existing: alreadyExisting, errors };
}

/**
 * Sincroniza públicos de Customer Match do banco de dados
 */
export async function syncDatabaseAudiences(incrementalOnly: boolean = false): Promise<{
  purchasersCount: number;
  abandonedCount: number;
  audiencesUpdated: string[];
  errors: string[];
}> {
  console.log(`[AudienceSyncer] 🔄 Sincronizando públicos do banco (incremental: ${incrementalOnly})...`);
  
  const config = await getMetaConfig();
  if (!config || !config.accessToken || !config.adAccountId) {
    return { purchasersCount: 0, abandonedCount: 0, audiencesUpdated: [], errors: ['Configuração Meta não encontrada'] };
  }
  
  const existing = await listExistingAudiences(config);
  const existingMap = new Map(existing.map(a => [a.name, a.id]));
  
  const audiencesUpdated: string[] = [];
  const errors: string[] = [];
  
  // ===== COMPRADORES =====
  const purchasersAudienceName = '[DB] Compradores (Auto)';
  let purchasersAudienceId: string | undefined = existingMap.get(purchasersAudienceName);
  
  if (!purchasersAudienceId) {
    const newId = await createCustomerMatchAudience(
      config,
      purchasersAudienceName,
      'Clientes que compraram - sincronizado automaticamente do banco de dados'
    );
    purchasersAudienceId = newId || undefined;
    
    if (purchasersAudienceId) {
      await supabase.from('ads_audiences').upsert({
        name: purchasersAudienceName,
        meta_audience_id: purchasersAudienceId,
        type: 'CUSTOM',
        source: 'database',
        is_active: true,
        auto_sync: true,
      }, { onConflict: 'meta_audience_id' });
    }
  }
  
  const purchasers = await fetchPurchasers(incrementalOnly);
  const hashedPurchasers = purchasers
    .map(p => prepareCustomerData(p))
    .filter((p): p is HashedCustomerData => p !== null);
  
  if (purchasersAudienceId && hashedPurchasers.length > 0) {
    const success = await addUsersToAudience(config, purchasersAudienceId, hashedPurchasers);
    if (success) {
      audiencesUpdated.push(purchasersAudienceName);
      
      // Atualizar sync timestamp
      await supabase.from('ads_audiences')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('meta_audience_id', purchasersAudienceId);
    } else {
      errors.push(`Falha ao sincronizar ${purchasersAudienceName}`);
    }
  }
  
  // ===== ABANDONOS =====
  const abandonedAudienceName = '[DB] Abandonos (Auto)';
  let abandonedAudienceId: string | undefined = existingMap.get(abandonedAudienceName);
  
  if (!abandonedAudienceId) {
    const newAudienceId = await createCustomerMatchAudience(
      config,
      abandonedAudienceName,
      'Carrinhos abandonados e leads - sincronizado automaticamente'
    );
    abandonedAudienceId = newAudienceId ?? undefined;
    
    if (abandonedAudienceId) {
      await supabase.from('ads_audiences').upsert({
        name: abandonedAudienceName,
        meta_audience_id: abandonedAudienceId,
        type: 'CUSTOM',
        source: 'database',
        is_active: true,
        auto_sync: true,
      }, { onConflict: 'meta_audience_id' });
    }
  }
  
  const abandoned = await fetchAbandonedCarts();
  const hashedAbandoned = abandoned
    .map(a => prepareCustomerData(a))
    .filter((a): a is HashedCustomerData => a !== null);
  
  if (abandonedAudienceId && hashedAbandoned.length > 0) {
    const success = await addUsersToAudience(config, abandonedAudienceId, hashedAbandoned);
    if (success) {
      audiencesUpdated.push(abandonedAudienceName);
      
      await supabase.from('ads_audiences')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('meta_audience_id', abandonedAudienceId);
    } else {
      errors.push(`Falha ao sincronizar ${abandonedAudienceName}`);
    }
  }
  
  console.log(`[AudienceSyncer] ✅ Sync DB concluído: ${hashedPurchasers.length} compradores, ${hashedAbandoned.length} abandonos`);
  
  return {
    purchasersCount: hashedPurchasers.length,
    abandonedCount: hashedAbandoned.length,
    audiencesUpdated,
    errors,
  };
}

/**
 * Cria Lookalikes para públicos base
 */
export async function ensureLookalikes(): Promise<{
  created: string[];
  errors: string[];
}> {
  console.log('[AudienceSyncer] 🎯 Verificando Lookalikes...');
  
  const config = await getMetaConfig();
  if (!config || !config.accessToken || !config.adAccountId) {
    return { created: [], errors: ['Configuração Meta não encontrada'] };
  }
  
  const existing = await listExistingAudiences(config);
  const existingNames = new Set(existing.map(a => a.name));
  
  const created: string[] = [];
  const errors: string[] = [];
  
  // Públicos base que devem ter LALs
  const seedAudiences = [
    { name: '[DB] Compradores (Auto)', minSize: 100 },
    { name: 'Site - Purchase 180D', minSize: 100 },
  ];
  
  for (const seed of seedAudiences) {
    const sourceAudience = existing.find(a => a.name === seed.name);
    if (!sourceAudience) {
      console.log(`[AudienceSyncer] Público base não encontrado: ${seed.name}`);
      continue;
    }
    
    // Verificar tamanho mínimo
    if ((sourceAudience.approximate_count || 0) < seed.minSize) {
      console.log(`[AudienceSyncer] Público ${seed.name} muito pequeno (${sourceAudience.approximate_count})`);
      continue;
    }
    
    // Criar LAL 1%
    const lal1Name = `LAL 1% - ${seed.name}`;
    if (!existingNames.has(lal1Name)) {
      const lalId = await createLookalike(config, sourceAudience.id, seed.name, 0.01);
      if (lalId) {
        created.push(lal1Name);
        
        await supabase.from('ads_audiences').upsert({
          name: lal1Name,
          meta_audience_id: lalId,
          type: 'LOOKALIKE',
          source: 'lookalike',
          parent_audience_id: sourceAudience.id,
          is_active: true,
          auto_sync: false,
        }, { onConflict: 'meta_audience_id' });
      }
    }
    
    // Criar LAL 5%
    const lal5Name = `LAL 5% - ${seed.name}`;
    if (!existingNames.has(lal5Name)) {
      const lalId = await createLookalike(config, sourceAudience.id, seed.name, 0.05);
      if (lalId) {
        created.push(lal5Name);
        
        await supabase.from('ads_audiences').upsert({
          name: lal5Name,
          meta_audience_id: lalId,
          type: 'LOOKALIKE',
          source: 'lookalike',
          parent_audience_id: sourceAudience.id,
          is_active: true,
          auto_sync: false,
        }, { onConflict: 'meta_audience_id' });
      }
    }
  }
  
  console.log(`[AudienceSyncer] ✅ Lookalikes: ${created.length} criados`);
  
  return { created, errors };
}

/**
 * Executa sincronização completa
 */
export async function runFullSync(): Promise<SyncResult> {
  console.log('[AudienceSyncer] 🚀 Iniciando sincronização completa...');
  const startTime = Date.now();
  
  const result: SyncResult = {
    success: true,
    audiencesCreated: [],
    audiencesUpdated: [],
    lookalikesCreated: [],
    errors: [],
    stats: {
      purchasersCount: 0,
      abandonedCount: 0,
      totalSynced: 0,
    },
  };
  
  try {
    // 1. Garantir públicos padrão
    const standardResult = await ensureStandardAudiences();
    result.audiencesCreated.push(...standardResult.created);
    result.errors.push(...standardResult.errors);
    
    // 2. Sincronizar públicos do banco
    const dbResult = await syncDatabaseAudiences(false);
    result.audiencesUpdated.push(...dbResult.audiencesUpdated);
    result.errors.push(...dbResult.errors);
    result.stats.purchasersCount = dbResult.purchasersCount;
    result.stats.abandonedCount = dbResult.abandonedCount;
    result.stats.totalSynced = dbResult.purchasersCount + dbResult.abandonedCount;
    
    // 3. Criar Lookalikes
    const lalResult = await ensureLookalikes();
    result.lookalikesCreated.push(...lalResult.created);
    result.errors.push(...lalResult.errors);
    
    result.success = result.errors.length === 0;
    
  } catch (err) {
    result.success = false;
    result.errors.push(err instanceof Error ? err.message : 'Erro desconhecido');
  }
  
  const duration = Date.now() - startTime;
  console.log(`[AudienceSyncer] 🏁 Sincronização concluída em ${duration}ms`);
  console.log(`   Públicos criados: ${result.audiencesCreated.length}`);
  console.log(`   Públicos atualizados: ${result.audiencesUpdated.length}`);
  console.log(`   Lookalikes criados: ${result.lookalikesCreated.length}`);
  console.log(`   Total sincronizado: ${result.stats.totalSynced} usuários`);
  
  return result;
}

/**
 * Executa sincronização incremental (apenas novos do dia)
 */
export async function runIncrementalSync(): Promise<SyncResult> {
  console.log('[AudienceSyncer] 📈 Iniciando sincronização incremental...');
  
  const result: SyncResult = {
    success: true,
    audiencesCreated: [],
    audiencesUpdated: [],
    lookalikesCreated: [],
    errors: [],
    stats: {
      purchasersCount: 0,
      abandonedCount: 0,
      totalSynced: 0,
    },
  };
  
  try {
    // Apenas sincronizar novos compradores do dia
    const dbResult = await syncDatabaseAudiences(true);
    result.audiencesUpdated.push(...dbResult.audiencesUpdated);
    result.errors.push(...dbResult.errors);
    result.stats.purchasersCount = dbResult.purchasersCount;
    result.stats.totalSynced = dbResult.purchasersCount;
    
    result.success = result.errors.length === 0;
  } catch (err) {
    result.success = false;
    result.errors.push(err instanceof Error ? err.message : 'Erro desconhecido');
  }
  
  return result;
}
