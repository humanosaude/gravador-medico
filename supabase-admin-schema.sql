-- ========================================
-- SCHEMA PARA DASHBOARD ADMINISTRATIVO
-- Dashboard de Vendas tipo Yampi/Stripe
-- Data: 19/01/2026
-- ========================================

-- 1. TABELA DE PERFIS (estende auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'support')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index para busca rápida por role
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- 2. TABELA DE VENDAS (SALES)
CREATE TABLE IF NOT EXISTS public.sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Identificadores Appmax
  appmax_order_id TEXT UNIQUE NOT NULL,
  appmax_customer_id TEXT,
  
  -- Dados do Cliente
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  customer_cpf TEXT,
  
  -- Dados Financeiros
  total_amount NUMERIC(10,2) NOT NULL,
  discount NUMERIC(10,2) DEFAULT 0,
  subtotal NUMERIC(10,2) NOT NULL,
  
  -- Status e Pagamento
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'refunded', 'cancelled')),
  payment_method TEXT CHECK (payment_method IN ('pix', 'credit_card', 'boleto')),
  
  -- Metadata
  utm_source TEXT,
  utm_campaign TEXT,
  utm_medium TEXT,
  ip_address TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  
  -- Dados extras (JSON para flexibilidade)
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes para performance
CREATE INDEX IF NOT EXISTS idx_sales_status ON public.sales(status);
CREATE INDEX IF NOT EXISTS idx_sales_email ON public.sales(customer_email);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON public.sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_appmax_order_id ON public.sales(appmax_order_id);

-- 3. TABELA DE ITENS DA VENDA (ORDER BUMPS)
CREATE TABLE IF NOT EXISTS public.sales_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL,
  
  -- Dados do Produto
  product_id TEXT NOT NULL, -- ID do produto na Appmax
  product_name TEXT NOT NULL,
  product_type TEXT DEFAULT 'bump' CHECK (product_type IN ('main', 'bump', 'upsell')),
  
  -- Preço
  price NUMERIC(10,2) NOT NULL,
  quantity INTEGER DEFAULT 1,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_items_sale_id ON public.sales_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sales_items_product_id ON public.sales_items(product_id);

-- 4. TABELA DE LOGS DO WEBHOOK (AUDITORIA)
CREATE TABLE IF NOT EXISTS public.webhooks_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Origem
  source TEXT DEFAULT 'appmax',
  event_type TEXT,
  
  -- IP de origem
  ip_address TEXT,
  user_agent TEXT,
  
  -- Payload completo (para debug)
  payload JSONB NOT NULL,
  
  -- Processamento
  processed BOOLEAN DEFAULT FALSE,
  success BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_webhooks_logs_created_at ON public.webhooks_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhooks_logs_processed ON public.webhooks_logs(processed);

-- ========================================
-- ROW LEVEL SECURITY (RLS)
-- ========================================

-- Ativar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhooks_logs ENABLE ROW LEVEL SECURITY;

-- PROFILES: Admins veem tudo, users veem só o próprio
DROP POLICY IF EXISTS "Admins podem ver todos os perfis" ON public.profiles;
CREATE POLICY "Admins podem ver todos os perfis"
  ON public.profiles FOR SELECT
  USING (
    auth.jwt() ->> 'role' = 'admin' OR 
    auth.uid() = id
  );

DROP POLICY IF EXISTS "Admins podem atualizar perfis" ON public.profiles;
CREATE POLICY "Admins podem atualizar perfis"
  ON public.profiles FOR UPDATE
  USING (auth.jwt() ->> 'role' = 'admin' OR auth.uid() = id);

-- SALES: Apenas ADMINs podem ver
DROP POLICY IF EXISTS "Apenas admins podem ver vendas" ON public.sales;
CREATE POLICY "Apenas admins podem ver vendas"
  ON public.sales FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Webhook pode inserir com SERVICE ROLE (ignora RLS)
DROP POLICY IF EXISTS "Service role pode inserir vendas" ON public.sales;
CREATE POLICY "Service role pode inserir vendas"
  ON public.sales FOR INSERT
  WITH CHECK (true); -- Service role bypass RLS

-- SALES_ITEMS: Mesma lógica de sales
DROP POLICY IF EXISTS "Apenas admins podem ver itens" ON public.sales_items;
CREATE POLICY "Apenas admins podem ver itens"
  ON public.sales_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Service role pode inserir itens" ON public.sales_items;
CREATE POLICY "Service role pode inserir itens"
  ON public.sales_items FOR INSERT
  WITH CHECK (true);

-- WEBHOOKS_LOGS: Apenas admins
DROP POLICY IF EXISTS "Apenas admins podem ver logs" ON public.webhooks_logs;
CREATE POLICY "Apenas admins podem ver logs"
  ON public.webhooks_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Service role pode inserir logs" ON public.webhooks_logs;
CREATE POLICY "Service role pode inserir logs"
  ON public.webhooks_logs FOR INSERT
  WITH CHECK (true);

-- ========================================
-- FUNÇÕES ÚTEIS
-- ========================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sales_updated_at ON public.sales;
CREATE TRIGGER update_sales_updated_at
  BEFORE UPDATE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- VIEWS PARA MÉTRICAS (Performance otimizada)
-- ========================================

-- View: Vendas por dia
CREATE OR REPLACE VIEW sales_by_day AS
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_orders,
  COUNT(*) FILTER (WHERE status = 'approved') as paid_orders,
  SUM(total_amount) FILTER (WHERE status = 'approved') as revenue,
  AVG(total_amount) FILTER (WHERE status = 'approved') as avg_ticket
FROM public.sales
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- View: Top produtos
CREATE OR REPLACE VIEW top_products AS
SELECT 
  si.product_name,
  si.product_id,
  COUNT(*) as sales_count,
  SUM(si.price * si.quantity) as total_revenue
FROM public.sales_items si
JOIN public.sales s ON s.id = si.sale_id
WHERE s.status = 'approved'
GROUP BY si.product_name, si.product_id
ORDER BY sales_count DESC;

-- ========================================
-- DADOS INICIAIS (SEED)
-- ========================================

-- Inserir perfil admin (AJUSTE O EMAIL PARA O SEU!)
-- Primeiro você precisa criar um usuário na Auth do Supabase
-- Depois rode este UPDATE com o UUID dele:

-- EXEMPLO (SUBSTITUA pelo seu UUID):
-- INSERT INTO public.profiles (id, email, full_name, role)
-- VALUES (
--   'seu-uuid-do-auth-users-aqui',
--   'seuemail@gmail.com',
--   'Admin Principal',
--   'admin'
-- )
-- ON CONFLICT (id) DO UPDATE SET role = 'admin';

-- ========================================
-- COMENTÁRIOS FINAIS
-- ========================================

COMMENT ON TABLE public.sales IS 'Armazena todas as vendas vindas da Appmax via webhook';
COMMENT ON TABLE public.sales_items IS 'Itens de cada venda (produto principal + order bumps)';
COMMENT ON TABLE public.webhooks_logs IS 'Log completo de todos os webhooks recebidos (auditoria)';
COMMENT ON TABLE public.profiles IS 'Perfis de usuários com controle de roles (admin/user)';

-- ✅ FIM DO SCHEMA
-- Execute este SQL no SQL Editor do Supabase
-- Dashboard > SQL Editor > New Query > Cole este código > Run
