o-- =====================================================
-- MIGRAÇÃO CORRIGIDA: ads_audiences
-- =====================================================
-- Remove constraint problemática e insere os públicos
-- =====================================================

-- 1. REMOVER a constraint problemática
ALTER TABLE ads_audiences DROP CONSTRAINT IF EXISTS ads_audiences_funnel_stage_check;

-- 2. Adicionar colunas que possam estar faltando
ALTER TABLE ads_audiences ADD COLUMN IF NOT EXISTS meta_audience_id TEXT;
ALTER TABLE ads_audiences ADD COLUMN IF NOT EXISTS template_id TEXT;
ALTER TABLE ads_audiences ADD COLUMN IF NOT EXISTS audience_type TEXT DEFAULT 'CUSTOM';
ALTER TABLE ads_audiences ADD COLUMN IF NOT EXISTS source_type TEXT;
ALTER TABLE ads_audiences ADD COLUMN IF NOT EXISTS funnel_stage TEXT;
ALTER TABLE ads_audiences ADD COLUMN IF NOT EXISTS retention_days INTEGER;
ALTER TABLE ads_audiences ADD COLUMN IF NOT EXISTS is_essential BOOLEAN DEFAULT false;
ALTER TABLE ads_audiences ADD COLUMN IF NOT EXISTS use_for_exclusion BOOLEAN DEFAULT false;
ALTER TABLE ads_audiences ADD COLUMN IF NOT EXISTS recommended_for TEXT[];
ALTER TABLE ads_audiences ADD COLUMN IF NOT EXISTS approximate_size INTEGER DEFAULT 0;
ALTER TABLE ads_audiences ADD COLUMN IF NOT EXISTS delivery_status TEXT;
ALTER TABLE ads_audiences ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE ads_audiences ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

-- 3. Criar índice único para meta_audience_id
DROP INDEX IF EXISTS idx_ads_audiences_meta_id;
CREATE UNIQUE INDEX idx_ads_audiences_meta_id 
ON ads_audiences(meta_audience_id) WHERE meta_audience_id IS NOT NULL;

-- 4. Deletar públicos antigos [GDM] se existirem (para re-inserir limpo)
DELETE FROM ads_audiences WHERE meta_audience_id LIKE '12023886%';

-- 5. Inserir os 9 públicos [GDM]
INSERT INTO ads_audiences 
  (meta_audience_id, template_id, name, audience_type, source_type, funnel_stage, retention_days, is_essential, is_active)
VALUES
  ('120238861678480657', 'all-visitors-180d', '[GDM] [M] WEB - Visitantes 180d', 'CUSTOM', 'WEBSITE', 'MEDIO', 180, true, true),
  ('120238861680500657', 'visitors-30d', '[GDM] [F] WEB - Visitantes Recentes 30d', 'CUSTOM', 'WEBSITE', 'FUNDO', 30, true, true),
  ('120238861684050657', 'visitors-7d', '[GDM] [F] WEB - Visitantes Ultra Recentes 7d', 'CUSTOM', 'WEBSITE', 'FUNDO', 7, true, true),
  ('120238861686910657', 'checkout-abandoners-30d', '[GDM] [F] WEB - Abandonou Checkout', 'CUSTOM', 'WEBSITE', 'FUNDO', 30, true, true),
  ('120238861688810657', 'add-to-cart-30d', '[GDM] [F] WEB - Adicionou ao Carrinho', 'CUSTOM', 'WEBSITE', 'FUNDO', 30, true, true),
  ('120238861690370657', 'purchasers-180d', '[GDM] [F] WEB - Compradores', 'CUSTOM', 'WEBSITE', 'FUNDO', 180, true, true),
  ('120238861691810657', 'purchasers-30d', '[GDM] [F] WEB - Compradores Recentes', 'CUSTOM', 'WEBSITE', 'FUNDO', 30, true, true),
  ('120238861431160657', 'page-engagement-365d', '[GDM] [M] ENG - Engajamento com a Página FB 365d', 'CUSTOM', 'ENGAGEMENT', 'MEDIO', 365, true, true),
  ('120238861434800657', 'ig-engagement-365d', '[GDM] [M] ENG - Engajamento no Instagram 365d', 'CUSTOM', 'ENGAGEMENT', 'MEDIO', 365, true, true);

-- 6. Verificar resultado
SELECT 
  meta_audience_id,
  name,
  source_type,
  funnel_stage,
  approximate_size,
  is_essential
FROM ads_audiences
WHERE is_essential = true
ORDER BY funnel_stage, name;
