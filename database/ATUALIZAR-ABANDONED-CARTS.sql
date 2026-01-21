-- =============================================
-- ATUALIZAR ESTRUTURA: abandoned_carts
-- =============================================
-- Adiciona colunas necessárias para compatibilidade
-- =============================================

-- Adicionar colunas que podem estar faltando
ALTER TABLE public.abandoned_carts 
ADD COLUMN IF NOT EXISTS customer_cpf TEXT,
ADD COLUMN IF NOT EXISTS step TEXT,
ADD COLUMN IF NOT EXISTS product_id TEXT,
ADD COLUMN IF NOT EXISTS order_bumps JSONB,
ADD COLUMN IF NOT EXISTS discount_code TEXT,
ADD COLUMN IF NOT EXISTS cart_value NUMERIC;

-- Atualizar items para total_amount (compatibilidade)
UPDATE public.abandoned_carts 
SET total_amount = cart_value 
WHERE total_amount = 0 AND cart_value IS NOT NULL;

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_cpf ON public.abandoned_carts(customer_cpf);
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_step ON public.abandoned_carts(step);
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_product ON public.abandoned_carts(product_id);

-- Verificar estrutura final
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'abandoned_carts'
ORDER BY ordinal_position;

-- Verificar dados atuais (sem dados de teste)
SELECT 
    id,
    customer_email,
    customer_name,
    customer_phone,
    customer_cpf,
    step,
    status,
    cart_value,
    total_amount,
    created_at
FROM public.abandoned_carts
WHERE customer_email NOT LIKE 'teste%@example.com'
ORDER BY created_at DESC
LIMIT 10;
