-- =============================================
-- GRAVADOR MÉDICO - SCHEMA INCREMENTAL
-- =============================================
-- Adiciona tabelas de Checkout e CRM
-- SEGURO: Não recria tabelas existentes
-- =============================================

-- ========================================
-- 1. TABELA: checkout_attempts
-- ========================================
-- Rastreia tentativas de checkout (PIX, Cartão, Boleto)
-- Usado para: Recuperação de carrinho, análise de abandono, chargeback

CREATE TABLE IF NOT EXISTS checkout_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Relacionamentos
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  sale_id UUID REFERENCES sales(id) ON DELETE SET NULL, -- Se converter em venda
  
  -- Identificadores
  session_id TEXT NOT NULL, -- ID da sessão do usuário
  
  -- Dados do cliente (capturados no checkout)
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,
  customer_cpf TEXT,
  
  -- Carrinho
  cart_items JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array de produtos
  cart_total NUMERIC(10,2) NOT NULL,
  
  -- Método de pagamento selecionado
  payment_method TEXT, -- pix, credit_card, boleto
  
  -- Status do checkout
  status TEXT NOT NULL DEFAULT 'abandoned', -- abandoned, pending, completed, failed
  
  -- PIX específico
  pix_code TEXT, -- Código PIX gerado
  pix_qr_code TEXT, -- URL do QR Code
  pix_expires_at TIMESTAMP WITH TIME ZONE, -- Expiração do PIX
  
  -- Tracking
  utm_source TEXT,
  utm_campaign TEXT,
  utm_medium TEXT,
  ip_address TEXT,
  user_agent TEXT,
  
  -- Recuperação
  recovery_sent_at TIMESTAMP WITH TIME ZONE, -- Data do envio da recuperação
  recovery_channel TEXT, -- email, whatsapp, sms
  recovery_clicked_at TIMESTAMP WITH TIME ZONE, -- Usuário clicou no link
  
  -- Conversão
  converted_at TIMESTAMP WITH TIME ZONE, -- Quando virou venda
  abandoned_at TIMESTAMP WITH TIME ZONE, -- Quando foi abandonado
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para checkout_attempts
CREATE INDEX IF NOT EXISTS idx_checkout_attempts_customer_id ON checkout_attempts(customer_id);
CREATE INDEX IF NOT EXISTS idx_checkout_attempts_sale_id ON checkout_attempts(sale_id);
CREATE INDEX IF NOT EXISTS idx_checkout_attempts_session_id ON checkout_attempts(session_id);
CREATE INDEX IF NOT EXISTS idx_checkout_attempts_customer_email ON checkout_attempts(customer_email);
CREATE INDEX IF NOT EXISTS idx_checkout_attempts_status ON checkout_attempts(status);
CREATE INDEX IF NOT EXISTS idx_checkout_attempts_payment_method ON checkout_attempts(payment_method);
CREATE INDEX IF NOT EXISTS idx_checkout_attempts_created_at ON checkout_attempts(created_at);
CREATE INDEX IF NOT EXISTS idx_checkout_attempts_pix_expires_at ON checkout_attempts(pix_expires_at);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_checkout_attempts_updated_at ON checkout_attempts;
CREATE TRIGGER update_checkout_attempts_updated_at
  BEFORE UPDATE ON checkout_attempts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 2. TABELA: recovery_attempts
-- ========================================
-- Rastreia tentativas de recuperação de vendas
-- WhatsApp, Email, SMS para carrinhos abandonados

CREATE TABLE IF NOT EXISTS recovery_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Relacionamentos
  checkout_attempt_id UUID REFERENCES checkout_attempts(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  
  -- Tipo de recuperação
  channel TEXT NOT NULL, -- email, whatsapp, sms
  type TEXT NOT NULL, -- abandoned_cart, pix_expiring, order_incomplete
  
  -- Conteúdo
  subject TEXT, -- Assunto (email) ou título (WhatsApp)
  message TEXT NOT NULL, -- Corpo da mensagem
  
  -- Links e CTAs
  recovery_url TEXT, -- Link único para retornar ao checkout
  cta_text TEXT, -- Texto do botão
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, delivered, read, clicked, converted, failed
  
  -- Tracking
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  converted_at TIMESTAMP WITH TIME ZONE, -- Virou venda
  failed_at TIMESTAMP WITH TIME ZONE,
  
  -- Motivo de falha
  failure_reason TEXT,
  
  -- Métricas
  open_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para recovery_attempts
CREATE INDEX IF NOT EXISTS idx_recovery_attempts_checkout_id ON recovery_attempts(checkout_attempt_id);
CREATE INDEX IF NOT EXISTS idx_recovery_attempts_customer_id ON recovery_attempts(customer_id);
CREATE INDEX IF NOT EXISTS idx_recovery_attempts_channel ON recovery_attempts(channel);
CREATE INDEX IF NOT EXISTS idx_recovery_attempts_status ON recovery_attempts(status);
CREATE INDEX IF NOT EXISTS idx_recovery_attempts_created_at ON recovery_attempts(created_at);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_recovery_attempts_updated_at ON recovery_attempts;
CREATE TRIGGER update_recovery_attempts_updated_at
  BEFORE UPDATE ON recovery_attempts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 3. TABELA: crm_contacts
-- ========================================
-- Contatos do CRM (Leads e Clientes)

CREATE TABLE IF NOT EXISTS crm_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Relacionamento (opcional)
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  
  -- Dados pessoais
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  position TEXT, -- cargo
  
  -- Status do funil
  stage TEXT NOT NULL DEFAULT 'lead', -- lead, contact, qualification, proposal, negotiation, won, lost
  source TEXT, -- website, appmax, checkout, manual, import
  
  -- Valor estimado
  estimated_value NUMERIC(10,2),
  probability INTEGER CHECK (probability >= 0 AND probability <= 100), -- 0-100%
  
  -- Datas importantes
  last_contact_at TIMESTAMP WITH TIME ZONE,
  next_followup_at TIMESTAMP WITH TIME ZONE,
  converted_at TIMESTAMP WITH TIME ZONE, -- Virou cliente
  lost_at TIMESTAMP WITH TIME ZONE,
  lost_reason TEXT, -- Motivo da perda
  
  -- Segmentação
  tags TEXT[], -- Array de tags
  lead_score INTEGER DEFAULT 0, -- Pontuação do lead (0-100)
  
  -- Notas e histórico
  notes TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para crm_contacts
CREATE INDEX IF NOT EXISTS idx_crm_contacts_customer_id ON crm_contacts(customer_id);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_email ON crm_contacts(email);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_stage ON crm_contacts(stage);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_source ON crm_contacts(source);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_next_followup_at ON crm_contacts(next_followup_at);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_lead_score ON crm_contacts(lead_score);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_crm_contacts_updated_at ON crm_contacts;
CREATE TRIGGER update_crm_contacts_updated_at
  BEFORE UPDATE ON crm_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 4. TABELA: crm_activities
-- ========================================
-- Atividades e interações do CRM

CREATE TABLE IF NOT EXISTS crm_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Relacionamentos
  contact_id UUID REFERENCES crm_contacts(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  
  -- Tipo de atividade
  type TEXT NOT NULL, -- call, email, meeting, note, task, sale, whatsapp
  title TEXT NOT NULL,
  description TEXT,
  
  -- Status (para tasks)
  status TEXT DEFAULT 'pending', -- pending, completed, canceled
  priority TEXT DEFAULT 'medium', -- low, medium, high, urgent
  
  -- Datas
  due_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Resultado (para calls/meetings)
  outcome TEXT, -- success, no_answer, voicemail, rescheduled
  
  -- Duração (em minutos)
  duration INTEGER, -- Para calls/meetings
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para crm_activities
CREATE INDEX IF NOT EXISTS idx_crm_activities_contact_id ON crm_activities(contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_customer_id ON crm_activities(customer_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_type ON crm_activities(type);
CREATE INDEX IF NOT EXISTS idx_crm_activities_status ON crm_activities(status);
CREATE INDEX IF NOT EXISTS idx_crm_activities_priority ON crm_activities(priority);
CREATE INDEX IF NOT EXISTS idx_crm_activities_due_date ON crm_activities(due_date);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_crm_activities_updated_at ON crm_activities;
CREATE TRIGGER update_crm_activities_updated_at
  BEFORE UPDATE ON crm_activities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 5. RLS POLICIES
-- ========================================

-- Habilitar RLS
ALTER TABLE checkout_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE recovery_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_activities ENABLE ROW LEVEL SECURITY;

-- Políticas permissivas (ajustar conforme necessidade)
DROP POLICY IF EXISTS "Permitir leitura de checkout_attempts" ON checkout_attempts;
CREATE POLICY "Permitir leitura de checkout_attempts" ON checkout_attempts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir escrita de checkout_attempts" ON checkout_attempts;
CREATE POLICY "Permitir escrita de checkout_attempts" ON checkout_attempts FOR ALL USING (true);

DROP POLICY IF EXISTS "Permitir leitura de recovery_attempts" ON recovery_attempts;
CREATE POLICY "Permitir leitura de recovery_attempts" ON recovery_attempts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir escrita de recovery_attempts" ON recovery_attempts;
CREATE POLICY "Permitir escrita de recovery_attempts" ON recovery_attempts FOR ALL USING (true);

DROP POLICY IF EXISTS "Permitir leitura de crm_contacts" ON crm_contacts;
CREATE POLICY "Permitir leitura de crm_contacts" ON crm_contacts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir escrita de crm_contacts" ON crm_contacts;
CREATE POLICY "Permitir escrita de crm_contacts" ON crm_contacts FOR ALL USING (true);

DROP POLICY IF EXISTS "Permitir leitura de crm_activities" ON crm_activities;
CREATE POLICY "Permitir leitura de crm_activities" ON crm_activities FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir escrita de crm_activities" ON crm_activities;
CREATE POLICY "Permitir escrita de crm_activities" ON crm_activities FOR ALL USING (true);

-- ========================================
-- 6. VIEWS ANALÍTICAS
-- ========================================

-- View: Resumo de carrinhos abandonados
CREATE OR REPLACE VIEW abandoned_carts_summary AS
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_abandoned,
  COUNT(CASE WHEN recovery_sent_at IS NOT NULL THEN 1 END) as recovery_sent,
  COUNT(CASE WHEN recovery_clicked_at IS NOT NULL THEN 1 END) as recovery_clicked,
  COUNT(CASE WHEN converted_at IS NOT NULL THEN 1 END) as recovered,
  SUM(cart_total) as total_value_abandoned,
  SUM(CASE WHEN converted_at IS NOT NULL THEN cart_total ELSE 0 END) as total_value_recovered,
  ROUND(
    CASE 
      WHEN COUNT(CASE WHEN recovery_sent_at IS NOT NULL THEN 1 END) > 0 
      THEN (COUNT(CASE WHEN converted_at IS NOT NULL THEN 1 END)::NUMERIC / COUNT(CASE WHEN recovery_sent_at IS NOT NULL THEN 1 END) * 100)
      ELSE 0 
    END, 2
  ) as recovery_rate
FROM checkout_attempts
WHERE status = 'abandoned'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- View: Funil CRM
CREATE OR REPLACE VIEW crm_funnel_summary AS
SELECT 
  stage,
  COUNT(*) as total_contacts,
  SUM(COALESCE(estimated_value, 0)) as total_value,
  AVG(COALESCE(probability, 0)) as avg_probability,
  AVG(lead_score) as avg_lead_score
FROM crm_contacts
WHERE stage NOT IN ('won', 'lost')
GROUP BY stage
ORDER BY 
  CASE stage
    WHEN 'lead' THEN 1
    WHEN 'contact' THEN 2
    WHEN 'qualification' THEN 3
    WHEN 'proposal' THEN 4
    WHEN 'negotiation' THEN 5
  END;

-- View: Performance de recuperação por canal
CREATE OR REPLACE VIEW recovery_performance_by_channel AS
SELECT 
  channel,
  COUNT(*) as total_sent,
  COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered,
  COUNT(CASE WHEN status = 'read' THEN 1 END) as read,
  COUNT(CASE WHEN status = 'clicked' THEN 1 END) as clicked,
  COUNT(CASE WHEN status = 'converted' THEN 1 END) as converted,
  ROUND(
    CASE 
      WHEN COUNT(*) > 0 
      THEN (COUNT(CASE WHEN status = 'delivered' THEN 1 END)::NUMERIC / COUNT(*) * 100)
      ELSE 0 
    END, 2
  ) as delivery_rate,
  ROUND(
    CASE 
      WHEN COUNT(CASE WHEN status = 'delivered' THEN 1 END) > 0 
      THEN (COUNT(CASE WHEN status = 'read' THEN 1 END)::NUMERIC / COUNT(CASE WHEN status = 'delivered' THEN 1 END) * 100)
      ELSE 0 
    END, 2
  ) as open_rate,
  ROUND(
    CASE 
      WHEN COUNT(CASE WHEN status = 'read' THEN 1 END) > 0 
      THEN (COUNT(CASE WHEN status = 'clicked' THEN 1 END)::NUMERIC / COUNT(CASE WHEN status = 'read' THEN 1 END) * 100)
      ELSE 0 
    END, 2
  ) as click_rate,
  ROUND(
    CASE 
      WHEN COUNT(CASE WHEN status = 'clicked' THEN 1 END) > 0 
      THEN (COUNT(CASE WHEN status = 'converted' THEN 1 END)::NUMERIC / COUNT(CASE WHEN status = 'clicked' THEN 1 END) * 100)
      ELSE 0 
    END, 2
  ) as conversion_rate
FROM recovery_attempts
GROUP BY channel
ORDER BY total_sent DESC;

-- ========================================
-- FIM DO SCHEMA INCREMENTAL
-- ========================================

-- ✅ PRÓXIMOS PASSOS:
-- 1. Copie TODO este conteúdo
-- 2. Cole no Supabase SQL Editor
-- 3. Execute
-- 4. Verifique com: SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
