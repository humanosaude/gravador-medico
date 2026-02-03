-- =====================================================
-- MIGRATION: Adicionar colunas faltantes em ads_creatives
-- Data: 2026-02-03
-- =====================================================
-- Corrige: "Could not find the 'generated_name' column of 'ads_creatives'"
-- =====================================================

-- 1. Adicionar coluna generated_name (nome padronizado do criativo)
ALTER TABLE ads_creatives 
ADD COLUMN IF NOT EXISTS generated_name TEXT;

-- 2. Adicionar coluna video_analysis (análise JSON do vídeo)
ALTER TABLE ads_creatives 
ADD COLUMN IF NOT EXISTS video_analysis JSONB DEFAULT '{}'::jsonb;

-- 3. Adicionar coluna transcription (transcrição do áudio)
ALTER TABLE ads_creatives 
ADD COLUMN IF NOT EXISTS transcription TEXT;

-- 4. Adicionar coluna video_url (URL do vídeo no Supabase)
ALTER TABLE ads_creatives
ADD COLUMN IF NOT EXISTS video_url TEXT;

-- 5. Adicionar coluna meta_video_id (ID do vídeo na Meta)
ALTER TABLE ads_creatives
ADD COLUMN IF NOT EXISTS meta_video_id TEXT;

-- 6. Adicionar coluna analysis_metadata (metadata da análise multimodal)
ALTER TABLE ads_creatives
ADD COLUMN IF NOT EXISTS analysis_metadata JSONB DEFAULT '{}'::jsonb;

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_ads_creatives_generated_name 
ON ads_creatives(generated_name);

CREATE INDEX IF NOT EXISTS idx_ads_creatives_meta_video_id 
ON ads_creatives(meta_video_id);

CREATE INDEX IF NOT EXISTS idx_ads_creatives_campaign_id 
ON ads_creatives(campaign_id);

-- =====================================================
-- COMENTÁRIOS
-- =====================================================

COMMENT ON COLUMN ads_creatives.generated_name IS 'Nome padronizado gerado automaticamente seguindo taxonomia';
COMMENT ON COLUMN ads_creatives.video_analysis IS 'Resultado da análise multimodal do vídeo (GPT Vision + Whisper)';
COMMENT ON COLUMN ads_creatives.transcription IS 'Transcrição do áudio do vídeo via Whisper';
COMMENT ON COLUMN ads_creatives.meta_video_id IS 'ID do vídeo após upload para Meta Ads';
COMMENT ON COLUMN ads_creatives.analysis_metadata IS 'Metadados extras da análise (tipo, descrição, etc)';
