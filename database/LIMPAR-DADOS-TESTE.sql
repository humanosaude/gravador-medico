-- =============================================
-- LIMPEZA: Remover Dados de Teste
-- =============================================
-- Execute este script no Supabase SQL Editor
-- Remove dados fictícios mantendo apenas dados reais
-- =============================================

-- 🗑️ Remover dados de teste de abandoned_carts
DELETE FROM public.abandoned_carts
WHERE customer_email LIKE 'teste%@example.com';

-- 🗑️ Remover vendas de teste (se existirem)
DELETE FROM public.sales
WHERE customer_email LIKE 'teste%@example.com'
   OR customer_name LIKE 'Cliente Teste%';

-- 🗑️ Remover clientes de teste (se existirem)
DELETE FROM public.customers
WHERE email LIKE 'teste%@example.com'
   OR name LIKE 'Cliente Teste%';

-- ✅ Verificar o que sobrou
SELECT 
    'abandoned_carts' as tabela,
    COUNT(*) as total_real
FROM public.abandoned_carts

UNION ALL

SELECT 
    'sales' as tabela,
    COUNT(*) as total_real
FROM public.sales

UNION ALL

SELECT 
    'customers' as tabela,
    COUNT(*) as total_real
FROM public.customers;

-- 📋 Mostrar carrinhos abandonados reais (se houver)
SELECT 
    id,
    customer_email,
    customer_name,
    total_amount,
    status,
    created_at
FROM public.abandoned_carts
ORDER BY created_at DESC
LIMIT 10;
