-- =============================================
-- 🧹 LIMPEZA DE DADOS - HELCIO DUARTE MATTOS
-- =============================================
-- Remove vendas e carrinhos em nome de Helcio
-- =============================================
-- Data: 28/01/2026
-- =============================================

-- =============================================
-- 1. DELETAR SALES_ITEMS das vendas do Helcio
-- =============================================
DELETE FROM public.sales_items
WHERE sale_id IN (
    SELECT id FROM public.sales 
    WHERE customer_name ILIKE '%Helcio%'
       OR customer_name ILIKE '%Hélcio%'
       OR customer_email ILIKE '%helcio%'
);

-- =============================================
-- 2. DELETAR VENDAS (SALES) do Helcio
-- =============================================
DELETE FROM public.sales
WHERE customer_name ILIKE '%Helcio Duarte Mattos%'
   OR customer_name ILIKE '%Helcio Mattos%'
   OR customer_name ILIKE '%Hélcio%'
   OR customer_email ILIKE '%helcio%';

-- =============================================
-- 3. DELETAR CARRINHOS ABANDONADOS do Helcio
-- =============================================
DELETE FROM public.abandoned_carts
WHERE customer_name ILIKE '%Helcio Duarte Mattos%'
   OR customer_name ILIKE '%Helcio Mattos%'
   OR customer_name ILIKE '%Hélcio%'
   OR customer_email ILIKE '%helcio%';

-- =============================================
-- 3.1 DELETAR CARRINHOS ABANDONADOS do Gabriel
-- =============================================
DELETE FROM public.abandoned_carts
WHERE customer_name ILIKE '%Gabriel Arruda Cardoso%'
   OR customer_name ILIKE '%Gabriel Cardoso%'
   OR customer_email ILIKE '%gabriel%cardoso%';

-- =============================================
-- 4. DELETAR ORDERS do Helcio (se existir)
-- =============================================
DELETE FROM public.orders
WHERE customer_name ILIKE '%Helcio Duarte Mattos%'
   OR customer_name ILIKE '%Helcio Mattos%'
   OR customer_name ILIKE '%Hélcio%'
   OR customer_email ILIKE '%helcio%';

-- =============================================
-- 5. DELETAR CUSTOMERS do Helcio (se existir)
-- =============================================
DELETE FROM public.customers
WHERE name ILIKE '%Helcio Duarte Mattos%'
   OR name ILIKE '%Helcio Mattos%'
   OR name ILIKE '%Hélcio%'
   OR email ILIKE '%helcio%';

-- =============================================
-- 📊 VERIFICAR RESULTADO
-- =============================================
SELECT 'sales' as tabela, COUNT(*) as registros FROM public.sales
UNION ALL
SELECT 'sales_items', COUNT(*) FROM public.sales_items
UNION ALL
SELECT 'orders', COUNT(*) FROM public.orders
UNION ALL
SELECT 'customers', COUNT(*) FROM public.customers
UNION ALL
SELECT 'abandoned_carts', COUNT(*) FROM public.abandoned_carts
ORDER BY tabela;

-- =============================================
-- ✅ DADOS DO HELCIO REMOVIDOS!
-- =============================================
