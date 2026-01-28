-- =============================================
-- 🧹 LIMPEZA DE DADOS ANTIGOS
-- =============================================
-- Remove todos os dados anteriores a 28/01/2026
-- Tabelas afetadas: sales, sales_items, customers, orders, 
-- abandoned_carts, payment_attempts, webhook_logs
-- =============================================
-- Data: 28/01/2026
-- =============================================

-- A data de corte - manter apenas dados a partir desta data
-- 2026-01-28 00:00:00 (início do dia 28/01/2026)

-- IMPORTANTE: Execute cada bloco separadamente no Supabase SQL Editor
-- se encontrar erros de autorização

-- =============================================
-- 1. DELETAR SALES_ITEMS (dependem de sales)
-- =============================================
DELETE FROM public.sales_items
WHERE sale_id IN (
    SELECT id FROM public.sales 
    WHERE created_at < '2026-01-28 00:00:00'::timestamptz
);

-- =============================================
-- 2. DELETAR VENDAS (SALES) ANTIGAS
-- =============================================
DELETE FROM public.sales
WHERE created_at < '2026-01-28 00:00:00'::timestamptz;

-- =============================================
-- 3. DELETAR PAYMENT_ATTEMPTS (dependem de orders)
-- =============================================
DELETE FROM public.payment_attempts
WHERE order_id IN (
    SELECT id FROM public.orders 
    WHERE created_at < '2026-01-28 00:00:00'::timestamptz
);

-- =============================================
-- 4. DELETAR ORDERS (PEDIDOS) ANTIGOS
-- =============================================
DELETE FROM public.orders
WHERE created_at < '2026-01-28 00:00:00'::timestamptz;

-- =============================================
-- 5. DELETAR CARRINHOS ABANDONADOS ANTIGOS
-- =============================================
DELETE FROM public.abandoned_carts
WHERE created_at < '2026-01-28 00:00:00'::timestamptz;

-- =============================================
-- 6. DELETAR ATIVIDADES CRM ANTIGAS
-- =============================================
DELETE FROM public.crm_activities
WHERE created_at < '2026-01-28 00:00:00'::timestamptz;

-- =============================================
-- 7. DELETAR CONTATOS CRM ANTIGOS
-- =============================================
DELETE FROM public.crm_contacts
WHERE created_at < '2026-01-28 00:00:00'::timestamptz;

-- =============================================
-- 8. DELETAR CLIENTES SEM VENDAS RECENTES
-- =============================================
-- Primeiro, identificar clientes que não têm vendas a partir de 28/01/2026
DELETE FROM public.customers
WHERE created_at < '2026-01-28 00:00:00'::timestamptz
  AND id NOT IN (
    SELECT DISTINCT customer_id 
    FROM public.sales 
    WHERE customer_id IS NOT NULL 
      AND created_at >= '2026-01-28 00:00:00'::timestamptz
  );

-- =============================================
-- 9. DELETAR WEBHOOK_LOGS ANTIGOS
-- =============================================
DELETE FROM public.webhook_logs
WHERE created_at < '2026-01-28 00:00:00'::timestamptz;

-- =============================================
-- 10. DELETAR INTEGRATION_LOGS ANTIGOS (se existir)
-- =============================================
DELETE FROM public.integration_logs
WHERE created_at < '2026-01-28 00:00:00'::timestamptz;

-- =============================================
-- 📊 VERIFICAR RESULTADO DA LIMPEZA
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
UNION ALL
SELECT 'crm_contacts', COUNT(*) FROM public.crm_contacts
UNION ALL
SELECT 'crm_activities', COUNT(*) FROM public.crm_activities
ORDER BY tabela;

-- =============================================
-- ✅ SCRIPT EXECUTADO COM SUCESSO!
-- =============================================
