-- ============================================
-- CRIAR VIEWS E TABELAS FALTANTES
-- Execute este script no SQL Editor do Supabase
-- ============================================

-- 1. View de Clientes (Corrige o erro na página Clientes)
CREATE OR REPLACE VIEW public.customer_sales_summary AS
SELECT 
    c.email,
    c.name,
    COUNT(DISTINCT s.id) as total_orders,
    COALESCE(SUM(s.total_amount), 0) as total_spent,
    MAX(s.created_at) as last_purchase,
    MIN(s.created_at) as first_purchase
FROM public.customers c
LEFT JOIN public.sales s ON s.customer_id = c.id
GROUP BY c.email, c.name;

-- 2. Tabela de Carrinhos Abandonados (Corrige o erro na página Carrinhos)
CREATE TABLE IF NOT EXISTS public.abandoned_carts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    customer_email text,
    customer_name text,
    items jsonb DEFAULT '[]'::jsonb,
    total_amount numeric DEFAULT 0,
    status text DEFAULT 'abandoned' CHECK (status IN ('abandoned', 'recovered', 'expired')),
    recovery_link text,
    session_id text
);

-- 3. Adicionar coluna recovery_status em checkout_attempts se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'checkout_attempts' 
        AND column_name = 'recovery_status'
    ) THEN
        ALTER TABLE public.checkout_attempts 
        ADD COLUMN recovery_status text DEFAULT 'pending' 
        CHECK (recovery_status IN ('pending', 'abandoned', 'recovered'));
    END IF;
END $$;

-- 4. Liberar acesso (RLS)
ALTER TABLE public.abandoned_carts ENABLE ROW LEVEL SECURITY;

-- Política para leitura pública
DROP POLICY IF EXISTS "Public read abandoned_carts" ON public.abandoned_carts;
CREATE POLICY "Public read abandoned_carts" 
ON public.abandoned_carts 
FOR SELECT 
USING (true);

-- Política para inserção pública
DROP POLICY IF EXISTS "Public insert abandoned_carts" ON public.abandoned_carts;
CREATE POLICY "Public insert abandoned_carts" 
ON public.abandoned_carts 
FOR INSERT 
WITH CHECK (true);

-- Política para atualização pública
DROP POLICY IF EXISTS "Public update abandoned_carts" ON public.abandoned_carts;
CREATE POLICY "Public update abandoned_carts" 
ON public.abandoned_carts 
FOR UPDATE 
USING (true);

-- 5. Índices para performance
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_email ON public.abandoned_carts(customer_email);
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_status ON public.abandoned_carts(status);
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_created ON public.abandoned_carts(created_at DESC);

-- 6. Function para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 7. Trigger para abandoned_carts
DROP TRIGGER IF EXISTS update_abandoned_carts_updated_at ON public.abandoned_carts;
CREATE TRIGGER update_abandoned_carts_updated_at 
    BEFORE UPDATE ON public.abandoned_carts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VERIFICAÇÃO: Execute isso depois para confirmar
-- ============================================
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('abandoned_carts', 'customer_sales_summary');
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='abandoned_carts';
