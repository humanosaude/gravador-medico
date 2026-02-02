# 🚀 Migração Alta Escala - EXECUTAR AGORA

## Passo 1: Acesse o Supabase Dashboard

1. Abra: https://supabase.com/dashboard/project/egsmraszqnmosmtjuzhx/sql/new
2. Faça login se necessário

## Passo 2: Execute o SQL abaixo

Copie e cole o SQL abaixo no editor SQL do Supabase e clique em "Run":

```sql
-- =====================================================
-- MIGRAÇÃO: Alta Escala Meta Ads 2025
-- =====================================================

-- 1. Adicionar colunas Instagram Actor em integration_settings
ALTER TABLE integration_settings 
  ADD COLUMN IF NOT EXISTS instagram_actor_id TEXT,
  ADD COLUMN IF NOT EXISTS instagram_actor_name TEXT;

-- 2. Adicionar colunas para pipeline assíncrono em ads_creatives
ALTER TABLE ads_creatives
  ADD COLUMN IF NOT EXISTS video_id TEXT,
  ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS meta_errors JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS analysis_metadata JSONB; -- Dados da análise Vision/Whisper

-- 3. Criar índice para busca de vídeos pendentes
CREATE INDEX IF NOT EXISTS idx_ads_creatives_pending 
  ON ads_creatives(processing_status) 
  WHERE processing_status = 'pending';

-- 4. Criar tabela de logs de otimização de IA
CREATE TABLE IF NOT EXISTS ads_optimization_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES ads_campaigns(id) ON DELETE CASCADE,
  action_taken TEXT NOT NULL,
  analysis_result JSONB,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Índice para buscar logs por campanha
CREATE INDEX IF NOT EXISTS idx_optimization_logs_campaign 
  ON ads_optimization_logs(campaign_id, created_at DESC);

-- 6. Verificar resultado
SELECT 'integration_settings' as tabela, column_name 
FROM information_schema.columns 
WHERE table_name = 'integration_settings' 
  AND column_name IN ('instagram_actor_id', 'instagram_actor_name')
UNION ALL
SELECT 'ads_creatives' as tabela, column_name 
FROM information_schema.columns 
WHERE table_name = 'ads_creatives' 
  AND column_name IN ('video_id', 'processing_status', 'meta_errors', 'processed_at', 'retry_count');
```

## Passo 3: Verificar resultado

Após executar, você deve ver uma tabela com:
- `integration_settings` | `instagram_actor_id`
- `integration_settings` | `instagram_actor_name`
- `ads_creatives` | `video_id`
- `ads_creatives` | `processing_status`
- `ads_creatives` | `meta_errors`
- `ads_creatives` | `processed_at`
- `ads_creatives` | `retry_count`

## ✅ Passo 2: CRON_SECRET

O `CRON_SECRET` já está configurado no `.env.local`:
```
CRON_SECRET="cron-secret-2026-gravador-medico-secure"
```

**Adicione também no Vercel:**
1. Acesse: https://vercel.com/your-project/settings/environment-variables
2. Adicione: `CRON_SECRET` = `cron-secret-2026-gravador-medico-secure`

## 🚀 Próximo Passo: Deploy

Após executar a migração, faça deploy no Vercel para ativar o cron job de processamento de vídeos.
