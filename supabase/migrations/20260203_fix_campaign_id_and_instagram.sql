-- =====================================================
-- MIGRATION: Corrigir tipo de campaign_id em ads_creatives
-- Data: 2026-02-03
-- =====================================================
-- Corrige: BUG #2 - "invalid input syntax for type uuid"
-- =====================================================

-- =====================================================
-- PARTE 1: CORRIGIR ads_creatives.campaign_id (UUID → TEXT)
-- =====================================================

-- 1. Remover constraint de foreign key (se existir)
ALTER TABLE ads_creatives
DROP CONSTRAINT IF EXISTS ads_creatives_campaign_id_fkey;

-- 2. Alterar tipo da coluna de UUID para TEXT
-- (Meta Campaign IDs são strings numéricas, não UUIDs)
ALTER TABLE ads_creatives 
ALTER COLUMN campaign_id TYPE TEXT USING campaign_id::TEXT;

-- 3. Adicionar coluna meta_ad_id (ID do Ad criado na Meta)
ALTER TABLE ads_creatives
ADD COLUMN IF NOT EXISTS meta_ad_id TEXT;

-- 4. Adicionar coluna meta_creative_id (ID do AdCreative na Meta)
ALTER TABLE ads_creatives
ADD COLUMN IF NOT EXISTS meta_creative_id TEXT;

-- 5. Adicionar coluna meta_video_id (ID do Video na Meta)
ALTER TABLE ads_creatives
ADD COLUMN IF NOT EXISTS meta_video_id TEXT;

-- =====================================================
-- NOTA SOBRE INSTAGRAM:
-- A tabela integration_settings já tem meta_instagram_id
-- Não é necessário criar outra coluna
-- =====================================================

-- =====================================================
-- ÍNDICES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_ads_creatives_campaign_id 
ON ads_creatives(campaign_id);

CREATE INDEX IF NOT EXISTS idx_ads_creatives_meta_ad_id 
ON ads_creatives(meta_ad_id);

CREATE INDEX IF NOT EXISTS idx_ads_creatives_meta_creative_id 
ON ads_creatives(meta_creative_id);

CREATE INDEX IF NOT EXISTS idx_ads_creatives_meta_video_id 
ON ads_creatives(meta_video_id);

-- =====================================================
-- COMENTÁRIOS
-- =====================================================

COMMENT ON COLUMN ads_creatives.campaign_id IS 'Meta Campaign ID (string numérica, ex: 120238875428630657)';
COMMENT ON COLUMN ads_creatives.meta_ad_id IS 'ID do Ad criado na Meta Ads';
COMMENT ON COLUMN ads_creatives.meta_creative_id IS 'ID do AdCreative criado na Meta Ads';
COMMENT ON COLUMN ads_creatives.meta_video_id IS 'ID do Video após upload para Meta Ads';
