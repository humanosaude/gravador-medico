-- =============================================
-- GRAVADOR MÉDICO - SCHEMA COMPLETO V2.0
-- =============================================
-- Arquitetura para Dashboard Admin completo
-- Suporta: Vendas, Clientes, Produtos, CRM, Relatórios
-- =============================================

-- ========================================
-- 0. FUNÇÃO: Trigger para updated_at
-- ========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 1. TABELA: customers (Clientes)
-- ========================================
CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Identificadores externos
  appmax_customer_id TEXT UNIQUE, -- ID do cliente na Appmax
  
  -- Dados pessoais
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  cpf TEXT,
  
  -- Endereço
  address_street TEXT,
  address_number TEXT,
  address_complement TEXT,
  address_neighborhood TEXT,
  address_city TEXT,
  address_state TEXT,
  address_zipcode TEXT,
  address_country TEXT DEFAULT 'Brasil',
  
  -- Métricas agregadas (desnormalizadas para performance)
  total_orders INTEGER DEFAULT 0,
  total_spent NUMERIC(10,2) DEFAULT 0,
  average_order_value NUMERIC(10,2) DEFAULT 0,
  last_purchase_at TIMESTAMP WITH TIME ZONE,
  first_purchase_at TIMESTAMP WITH TIME ZONE,
  
  -- Status e segmentação
  status TEXT DEFAULT 'active', -- active, inactive, blocked
  segment TEXT, -- vip, regular, new
  tags TEXT[], -- array de tags para filtros
  
  -- Origem
  utm_source TEXT,
  utm_campaign TEXT,
  utm_medium TEXT,
  acquisition_channel TEXT, -- organic, paid, referral
  
  -- Metadata
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para customers
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_appmax_id ON customers(appmax_customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_segment ON customers(segment);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 2. TABELA: products (Produtos)
-- ========================================
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Identificadores
  sku TEXT UNIQUE NOT NULL, -- SKU único
  appmax_product_id TEXT UNIQUE, -- ID do produto na Appmax
  
  -- Informações básicas
  name TEXT NOT NULL,
  description TEXT,
  category TEXT, -- subscription, course, ebook, etc.
  type TEXT, -- main, bump, upsell, addon
  
  -- Preços
  price NUMERIC(10,2) NOT NULL,
  cost NUMERIC(10,2), -- custo do produto
  compare_at_price NUMERIC(10,2), -- preço "de"
  
  -- Estoque e status
  stock_quantity INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  
  -- Métricas (desnormalizadas)
  total_sales INTEGER DEFAULT 0,
  total_revenue NUMERIC(10,2) DEFAULT 0,
  
  -- SEO e Mídia
  image_url TEXT,
  slug TEXT UNIQUE,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para products
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_appmax_id ON products(appmax_product_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 3. TABELA: sales (Vendas) - ATUALIZADA
-- ========================================
-- OBS: Esta tabela já existe, vamos apenas adicionar colunas faltantes
-- Se a tabela não existir, será criada. Se existir, pula a criação.

DO $$ 
BEGIN
  -- Criar tabela se não existir
  IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'sales') THEN
    CREATE TABLE sales (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      
      -- Relacionamentos
      customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
      
      -- Identificadores externos
      appmax_order_id TEXT UNIQUE NOT NULL,
      appmax_customer_id TEXT,
      
      -- Dados do cliente (desnormalizados para histórico)
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      customer_phone TEXT,
      customer_cpf TEXT,
      
      -- Valores
      total_amount NUMERIC(10,2) NOT NULL,
      subtotal NUMERIC(10,2) NOT NULL,
      discount NUMERIC(10,2) DEFAULT 0,
      shipping_cost NUMERIC(10,2) DEFAULT 0,
      tax NUMERIC(10,2) DEFAULT 0,
      
      -- Status e pagamento
      status TEXT NOT NULL,
      failure_reason TEXT,
      payment_method TEXT,
      payment_status TEXT,
      installments INTEGER DEFAULT 1,
      
      -- Tracking e origem
      utm_source TEXT,
      utm_campaign TEXT,
      utm_medium TEXT,
      ip_address TEXT,
      session_id TEXT,
      
      -- Datas importantes
      paid_at TIMESTAMP WITH TIME ZONE,
      refunded_at TIMESTAMP WITH TIME ZONE,
      canceled_at TIMESTAMP WITH TIME ZONE,
      
      -- Metadata
      metadata JSONB DEFAULT '{}'::jsonb,
      
      -- Timestamps
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  END IF;
  
  -- Adicionar colunas que podem estar faltando (se a tabela já existia)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales' AND column_name='customer_id') THEN
    ALTER TABLE sales ADD COLUMN customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales' AND column_name='shipping_cost') THEN
    ALTER TABLE sales ADD COLUMN shipping_cost NUMERIC(10,2) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales' AND column_name='tax') THEN
    ALTER TABLE sales ADD COLUMN tax NUMERIC(10,2) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales' AND column_name='payment_status') THEN
    ALTER TABLE sales ADD COLUMN payment_status TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales' AND column_name='installments') THEN
    ALTER TABLE sales ADD COLUMN installments INTEGER DEFAULT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales' AND column_name='failure_reason') THEN
    ALTER TABLE sales ADD COLUMN failure_reason TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales' AND column_name='refunded_at') THEN
    ALTER TABLE sales ADD COLUMN refunded_at TIMESTAMP WITH TIME ZONE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales' AND column_name='canceled_at') THEN
    ALTER TABLE sales ADD COLUMN canceled_at TIMESTAMP WITH TIME ZONE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales' AND column_name='session_id') THEN
    ALTER TABLE sales ADD COLUMN session_id TEXT;
  END IF;
  
END $$;

-- Índices para sales
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_appmax_order_id ON sales(appmax_order_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer_email ON sales(customer_email);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);
CREATE INDEX IF NOT EXISTS idx_sales_payment_method ON sales(payment_method);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_paid_at ON sales(paid_at);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_sales_updated_at ON sales;
CREATE TRIGGER update_sales_updated_at
  BEFORE UPDATE ON sales
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 4. TABELA: sales_items (Itens da Venda)
-- ========================================
CREATE TABLE IF NOT EXISTS sales_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Relacionamentos
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  
  -- Identificador externo
  product_sku TEXT,
  
  -- Dados do produto (desnormalizados para histórico)
  product_name TEXT NOT NULL,
  product_type TEXT, -- main, bump, upsell
  
  -- Valores
  price NUMERIC(10,2) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  discount NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) GENERATED ALWAYS AS ((price * quantity) - discount) STORED,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraint para garantir unicidade
  UNIQUE(sale_id, product_sku)
);

-- Índices para sales_items
CREATE INDEX IF NOT EXISTS idx_sales_items_sale_id ON sales_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sales_items_product_id ON sales_items(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_items_product_sku ON sales_items(product_sku);

-- ========================================
-- 5. TABELA: crm_contacts (Contatos CRM)
-- ========================================
CREATE TABLE IF NOT EXISTS crm_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Relacionamento (opcional)
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  
  -- Dados pessoais
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  position TEXT,
  
  -- Status do funil
  stage TEXT NOT NULL DEFAULT 'lead', -- lead, contact, qualification, proposal, negotiation, won, lost
  source TEXT, -- website, appmax, manual, import
  
  -- Valor estimado
  estimated_value NUMERIC(10,2),
  probability INTEGER CHECK (probability >= 0 AND probability <= 100), -- 0-100%
  
  -- Datas importantes
  last_contact_at TIMESTAMP WITH TIME ZONE,
  next_followup_at TIMESTAMP WITH TIME ZONE,
  converted_at TIMESTAMP WITH TIME ZONE,
  lost_at TIMESTAMP WITH TIME ZONE,
  
  -- Notas e tags
  notes TEXT,
  tags TEXT[],
  
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

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_crm_contacts_updated_at ON crm_contacts;
CREATE TRIGGER update_crm_contacts_updated_at
  BEFORE UPDATE ON crm_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 6. TABELA: crm_activities (Atividades CRM)
-- ========================================
CREATE TABLE IF NOT EXISTS crm_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Relacionamentos
  contact_id UUID REFERENCES crm_contacts(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  
  -- Tipo de atividade
  type TEXT NOT NULL, -- call, email, meeting, note, task, sale
  title TEXT NOT NULL,
  description TEXT,
  
  -- Status (para tasks)
  status TEXT DEFAULT 'pending', -- pending, completed, canceled
  
  -- Datas
  due_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
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
CREATE INDEX IF NOT EXISTS idx_crm_activities_due_date ON crm_activities(due_date);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_crm_activities_updated_at ON crm_activities;
CREATE TRIGGER update_crm_activities_updated_at
  BEFORE UPDATE ON crm_activities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 7. VIEWS ANALÍTICAS
-- ========================================
-- OBS: Views criadas DEPOIS de todas as tabelas existirem

-- View: Resumo de vendas por cliente
CREATE OR REPLACE VIEW customer_sales_summary AS
SELECT 
  c.id as customer_id,
  c.name,
  c.email,
  c.phone,
  c.segment,
  c.status,
  COUNT(s.id) as total_orders,
  COALESCE(SUM(s.total_amount), 0) as total_spent,
  COALESCE(AVG(s.total_amount), 0) as average_order_value,
  MAX(s.created_at) as last_purchase_at,
  MIN(s.created_at) as first_purchase_at
FROM customers c
LEFT JOIN sales s ON c.id = s.customer_id AND s.status IN ('approved', 'paid', 'completed')
GROUP BY c.id, c.name, c.email, c.phone, c.segment, c.status;

-- View: Resumo de vendas por produto
CREATE OR REPLACE VIEW product_sales_summary AS
SELECT 
  p.id as product_id,
  p.sku,
  p.name,
  p.category,
  p.price,
  p.is_active,
  COUNT(DISTINCT CASE WHEN s.status IN ('approved', 'paid', 'completed') THEN si.sale_id END) as total_orders,
  COALESCE(SUM(CASE WHEN s.status IN ('approved', 'paid', 'completed') THEN si.quantity ELSE 0 END), 0) as total_quantity_sold,
  COALESCE(SUM(CASE WHEN s.status IN ('approved', 'paid', 'completed') THEN si.total ELSE 0 END), 0) as total_revenue,
  COALESCE(AVG(CASE WHEN s.status IN ('approved', 'paid', 'completed') THEN si.price END), 0) as average_price
FROM products p
LEFT JOIN sales_items si ON p.id = si.product_id
LEFT JOIN sales s ON si.sale_id = s.id
GROUP BY p.id, p.sku, p.name, p.category, p.price, p.is_active;

-- View: Funil de vendas CRM
CREATE OR REPLACE VIEW crm_funnel_summary AS
SELECT 
  stage,
  COUNT(*) as total_contacts,
  SUM(COALESCE(estimated_value, 0)) as total_value,
  AVG(probability) as avg_probability
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

-- View: Vendas por dia
CREATE OR REPLACE VIEW sales_by_day AS
SELECT 
  DATE(created_at) as sale_date,
  COUNT(*) as total_orders,
  SUM(total_amount) as total_revenue,
  AVG(total_amount) as avg_order_value,
  COUNT(DISTINCT customer_email) as unique_customers
FROM sales
WHERE status IN ('approved', 'paid', 'completed')
GROUP BY DATE(created_at)
ORDER BY sale_date DESC;

-- View: Vendas por origem (UTM)
CREATE OR REPLACE VIEW sales_by_source AS
SELECT 
  COALESCE(utm_source, 'direct') as source,
  COALESCE(utm_campaign, 'none') as campaign,
  COALESCE(utm_medium, 'none') as medium,
  COUNT(*) as total_orders,
  SUM(total_amount) as total_revenue,
  AVG(total_amount) as avg_order_value
FROM sales
WHERE status IN ('approved', 'paid', 'completed')
GROUP BY utm_source, utm_campaign, utm_medium
ORDER BY total_revenue DESC;

-- ========================================
-- 8. RLS POLICIES
-- ========================================

-- Habilitar RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_activities ENABLE ROW LEVEL SECURITY;

-- Políticas permissivas (ajustar conforme necessidade de auth)
DROP POLICY IF EXISTS "Permitir leitura de customers" ON customers;
CREATE POLICY "Permitir leitura de customers" ON customers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir escrita de customers" ON customers;
CREATE POLICY "Permitir escrita de customers" ON customers FOR ALL USING (true);

DROP POLICY IF EXISTS "Permitir leitura de products" ON products;
CREATE POLICY "Permitir leitura de products" ON products FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir escrita de products" ON products;
CREATE POLICY "Permitir escrita de products" ON products FOR ALL USING (true);

DROP POLICY IF EXISTS "Permitir leitura de sales" ON sales;
CREATE POLICY "Permitir leitura de sales" ON sales FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir escrita de sales" ON sales;
CREATE POLICY "Permitir escrita de sales" ON sales FOR ALL USING (true);

DROP POLICY IF EXISTS "Permitir leitura de sales_items" ON sales_items;
CREATE POLICY "Permitir leitura de sales_items" ON sales_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir escrita de sales_items" ON sales_items;
CREATE POLICY "Permitir escrita de sales_items" ON sales_items FOR ALL USING (true);

DROP POLICY IF EXISTS "Permitir leitura de crm_contacts" ON crm_contacts;
CREATE POLICY "Permitir leitura de crm_contacts" ON crm_contacts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir escrita de crm_contacts" ON crm_contacts;
CREATE POLICY "Permitir escrita de crm_contacts" ON crm_contacts FOR ALL USING (true);

DROP POLICY IF EXISTS "Permitir leitura de crm_activities" ON crm_activities;
CREATE POLICY "Permitir leitura de crm_activities" ON crm_activities FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir escrita de crm_activities" ON crm_activities;
CREATE POLICY "Permitir escrita de crm_activities" ON crm_activities FOR ALL USING (true);

-- ========================================
-- FIM DO SCHEMA
-- ========================================
