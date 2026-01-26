-- =====================================================
-- FORÇAR LIMPEZA TOTAL - VERSÃO HARDCORE
-- =====================================================

-- DELETAR TUDO EM CASCATA
TRUNCATE TABLE public.sales_items CASCADE;
TRUNCATE TABLE public.sales CASCADE;

-- Verificar que está vazio
SELECT 
    (SELECT COUNT(*) FROM public.sales) as pedidos,
    (SELECT COUNT(*) FROM public.sales_items) as itens,
    (SELECT COUNT(*) FROM public.customers) as clientes;

-- =====================================================
-- RESULTADO: Deve retornar 0 pedidos e 0 itens
-- =====================================================
