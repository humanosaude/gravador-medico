-- =====================================================
-- MIGRAÇÃO: Alta Escala e Compliance Meta 2025
-- Executar no Supabase Dashboard
-- =====================================================

-- =====================================================
-- ETAPA 1: Adicionar campos instagram_actor à integration_settings
-- =====================================================

-- Adicionar colunas para Instagram Actor ID (essencial para anúncios no Instagram)
ALTER TABLE integration_settings 
  ADD COLUMN IF NOT EXISTS instagram_actor_id TEXT,
  ADD COLUMN IF NOT EXISTS instagram_actor_name TEXT;

-- Comentário para documentação
COMMENT ON COLUMN integration_settings.instagram_actor_id IS 'ID do Instagram Business vinculado à página (para publicar anúncios no feed/stories)';
COMMENT ON COLUMN integration_settings.instagram_actor_name IS 'Username do Instagram vinculado';

-- =====================================================
-- ETAPA 2: Atualizar tabela ads_creatives para suporte assíncrono
-- =====================================================

-- Adicionar campos para pipeline assíncrono de vídeos
ALTER TABLE ads_creatives
  ADD COLUMN IF NOT EXISTS video_id TEXT,
  ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'pending' 
    CHECK (processing_status IN ('pending', 'processing', 'ready', 'error')),
  ADD COLUMN IF NOT EXISTS meta_errors JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

-- Índice para buscar vídeos pendentes (usado pelo cron)
CREATE INDEX IF NOT EXISTS idx_ads_creatives_pending 
  ON ads_creatives(processing_status) 
  WHERE processing_status = 'pending';

-- Índice para buscar por video_id
CREATE INDEX IF NOT EXISTS idx_ads_creatives_video_id 
  ON ads_creatives(video_id) 
  WHERE video_id IS NOT NULL;

-- Comentários
COMMENT ON COLUMN ads_creatives.video_id IS 'ID do vídeo na Meta após upload';
COMMENT ON COLUMN ads_creatives.processing_status IS 'Status do processamento: PENDING → UPLOADING → PROCESSING → READY/FAILED';
COMMENT ON COLUMN ads_creatives.meta_errors IS 'Histórico de erros da API Meta (JSON array)';
COMMENT ON COLUMN ads_creatives.retry_count IS 'Número de tentativas de processamento';

-- =====================================================
-- ETAPA 3: Criar tabela de fila de processamento de vídeos
-- =====================================================

CREATE TABLE IF NOT EXISTS video_processing_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creative_id UUID REFERENCES ads_creatives(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL,
  ad_account_id TEXT NOT NULL,
  campaign_id UUID REFERENCES ads_campaigns(id) ON DELETE SET NULL,
  
  -- Dados para criação do anúncio
  creative_data JSONB NOT NULL, -- { primaryText, headline, description, etc }
  targeting_data JSONB,
  
  -- Status e controle
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'checking', 'creating_ad', 'completed', 'failed')),
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 5,
  last_checked_at TIMESTAMPTZ,
  next_check_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Resultado
  meta_ad_id TEXT,
  meta_creative_id TEXT,
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para o cron
CREATE INDEX IF NOT EXISTS idx_video_queue_status ON video_processing_queue(status) WHERE status IN ('queued', 'checking');
CREATE INDEX IF NOT EXISTS idx_video_queue_next_check ON video_processing_queue(next_check_at) WHERE status IN ('queued', 'checking');

-- RLS
ALTER TABLE video_processing_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access video_queue" 
  ON video_processing_queue FOR ALL TO service_role USING (true);

-- Trigger updated_at
DROP TRIGGER IF EXISTS update_video_queue_updated_at ON video_processing_queue;
CREATE TRIGGER update_video_queue_updated_at
  BEFORE UPDATE ON video_processing_queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================

SELECT 
  'integration_settings' as tabela,
  COUNT(*) as colunas_adicionadas
FROM information_schema.columns 
WHERE table_name = 'integration_settings' 
  AND column_name IN ('instagram_actor_id', 'instagram_actor_name')

UNION ALL

SELECT 
  'ads_creatives' as tabela,
  COUNT(*) as colunas_adicionadas
FROM information_schema.columns 
WHERE table_name = 'ads_creatives' 
  AND column_name IN ('video_id', 'processing_status', 'meta_errors', 'retry_count')

UNION ALL

SELECT 
  'video_processing_queue' as tabela,
  COUNT(*) as colunas
FROM information_schema.columns 
WHERE table_name = 'video_processing_queue';
