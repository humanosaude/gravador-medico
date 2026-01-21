-- =============================================
-- SCRIPT FINAL: Limpar Testes + Atualizar Estrutura
-- =============================================
-- Execute TUDO de uma vez no Supabase SQL Editor
-- =============================================

-- 🗑️ PARTE 1: LIMPAR DADOS DE TESTE
-- =============================================

DELETE FROM public.abandoned_carts
WHERE customer_email LIKE 'teste%@example.com'
   OR customer_email LIKE 'carrinho_%@temp.local';

DELETE FROM public.sales
WHERE customer_email LIKE 'teste%@example.com'
   OR customer_name LIKE 'Cliente Teste%';

DELETE FROM public.customers
WHERE email LIKE 'teste%@example.com'
   OR name LIKE 'Cliente Teste%';

-- ✅ PARTE 2: ATUALIZAR ESTRUTURA ABANDONED_CARTS
-- =============================================

-- Adicionar colunas necessárias
ALTER TABLE public.abandoned_carts 
ADD COLUMN IF NOT EXISTS customer_cpf TEXT,
ADD COLUMN IF NOT EXISTS step TEXT,
ADD COLUMN IF NOT EXISTS product_id TEXT,
ADD COLUMN IF NOT EXISTS order_bumps JSONB,
ADD COLUMN IF NOT EXISTS discount_code TEXT,
ADD COLUMN IF NOT EXISTS cart_value NUMERIC,
ADD COLUMN IF NOT EXISTS utm_source TEXT,
ADD COLUMN IF NOT EXISTS utm_medium TEXT,
ADD COLUMN IF NOT EXISTS utm_campaign TEXT;

-- Remover constraint de status (permitir mais valores)
ALTER TABLE public.abandoned_carts 
DROP CONSTRAINT IF EXISTS abandoned_carts_status_check;

-- Adicionar novo constraint mais flexível
ALTER TABLE public.abandoned_carts 
ADD CONSTRAINT abandoned_carts_status_check 
CHECK (status IN ('abandoned', 'recovered', 'expired', 'form_filled', 'payment_started'));

-- Atualizar total_amount baseado em cart_value (quando aplicável)
UPDATE public.abandoned_carts 
SET total_amount = COALESCE(cart_value, total_amount)
WHERE total_amount = 0 OR total_amount IS NULL;

-- ✅ PARTE 3: CRIAR ÍNDICES PARA PERFORMANCE
-- =============================================

CREATE INDEX IF NOT EXISTS idx_abandoned_carts_cpf ON public.abandoned_carts(customer_cpf);
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_step ON public.abandoned_carts(step);
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_product ON public.abandoned_carts(product_id);
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_cart_value ON public.abandoned_carts(cart_value);

-- ✅ PARTE 4: VERIFICAÇÃO
-- =============================================

-- Ver estrutura da tabela
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'abandoned_carts'
ORDER BY ordinal_position;

-- Contar registros reais (após limpeza)
SELECT 
    'Total de carrinhos reais' as descricao,
    COUNT(*) as quantidade
FROM public.abandoned_carts
WHERE customer_email NOT LIKE 'teste%@example.com'
  AND customer_email NOT LIKE 'carrinho_%@temp.local';

-- ✅ CONCLUÍDO
-- =============================================
-- Agora teste no checkout:
-- 1. Preencha QUALQUER campo (nome, email, telefone ou CPF)
-- 2. Clique FORA do campo (onBlur)
-- 3. Feche a página sem finalizar
-- 4. Verifique na dashboard: deve aparecer 1 carrinho abandonado
-- =============================================
