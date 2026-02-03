-- =====================================================
-- Tabela para Solicitações de Exclusão de Dados do Facebook
-- =====================================================
-- Esta tabela armazena as solicitações de exclusão de dados
-- recebidas via callback do Facebook/Meta

CREATE TABLE IF NOT EXISTS facebook_data_deletion_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Identificador do usuário no escopo do app (ASID)
  facebook_user_id TEXT NOT NULL,
  
  -- Código de confirmação único para rastreamento
  confirmation_code TEXT NOT NULL UNIQUE,
  
  -- Status da solicitação
  -- pending: aguardando processamento
  -- processing: em processamento
  -- completed: exclusão concluída
  -- failed: falha na exclusão
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  
  -- Detalhes do status (mensagem de erro, descrição, etc.)
  status_details TEXT,
  
  -- Dados excluídos (lista de tipos de dados que foram removidos)
  deleted_data_types TEXT[] DEFAULT '{}',
  
  -- Timestamps
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Metadados da requisição original
  request_metadata JSONB DEFAULT '{}',
  
  -- Índices para consultas
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_fb_deletion_user_id ON facebook_data_deletion_requests(facebook_user_id);
CREATE INDEX IF NOT EXISTS idx_fb_deletion_confirmation_code ON facebook_data_deletion_requests(confirmation_code);
CREATE INDEX IF NOT EXISTS idx_fb_deletion_status ON facebook_data_deletion_requests(status);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_fb_deletion_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_fb_deletion_updated_at ON facebook_data_deletion_requests;
CREATE TRIGGER trigger_update_fb_deletion_updated_at
  BEFORE UPDATE ON facebook_data_deletion_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_fb_deletion_updated_at();

-- RLS (Row Level Security)
ALTER TABLE facebook_data_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Política: Somente administradores podem acessar diretamente
CREATE POLICY "Admin access only" ON facebook_data_deletion_requests
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');

-- Política: API pode inserir/atualizar via service role
CREATE POLICY "Service role full access" ON facebook_data_deletion_requests
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Comentários da tabela
COMMENT ON TABLE facebook_data_deletion_requests IS 'Armazena solicitações de exclusão de dados recebidas via callback do Facebook/Meta';
COMMENT ON COLUMN facebook_data_deletion_requests.facebook_user_id IS 'App-Scoped User ID (ASID) do usuário do Facebook';
COMMENT ON COLUMN facebook_data_deletion_requests.confirmation_code IS 'Código único de confirmação para rastreamento da solicitação';
COMMENT ON COLUMN facebook_data_deletion_requests.status IS 'Status atual da solicitação: pending, processing, completed, failed';
