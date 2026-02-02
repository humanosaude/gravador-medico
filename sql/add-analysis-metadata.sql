-- =====================================================
-- SQL ADICIONAL: Coluna de Análise Multimodal
-- =====================================================
-- Execute APENAS se você já executou a migração anterior
-- Esta coluna armazena os dados da análise Vision/Whisper
-- =====================================================

ALTER TABLE ads_creatives
  ADD COLUMN IF NOT EXISTS analysis_metadata JSONB;

COMMENT ON COLUMN ads_creatives.analysis_metadata IS 
  'Metadados da análise multimodal (Vision + Whisper): imageDescription, audioTranscription, analysisType';

-- Verificar
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'ads_creatives' 
  AND column_name = 'analysis_metadata';
