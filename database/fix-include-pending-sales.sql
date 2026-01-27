-- ========================================
-- FIX: Incluir vendas em processamento nas métricas
-- ========================================
-- Atualiza as views e funções para mostrar também vendas pendentes/processando
-- Data: 27/01/2026
-- ========================================

-- =====================================================
-- 1. ATUALIZAR get_analytics_period
-- =====================================================
-- Incluir vendas em processamento além de pagas

-- ✅ DROP com CASCADE para remover dependências
DROP FUNCTION IF EXISTS public.get_analytics_period(timestamp with time zone, timestamp with time zone) CASCADE;
DROP FUNCTION IF EXISTS public.get_analytics_period(timestamp, timestamp) CASCADE;
DROP FUNCTION IF EXISTS public.get_analytics_period() CASCADE;

-- Criar nova versão com campos adicionais
CREATE OR REPLACE FUNCTION public.get_analytics_period(
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '30 days',
    end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE (
    unique_visitors BIGINT,
    total_sales BIGINT,
    pending_sales BIGINT,
    paid_sales BIGINT,
    total_revenue NUMERIC,
    conversion_rate NUMERIC,
    average_order_value NUMERIC
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH period_visits AS (
        SELECT
            COUNT(DISTINCT session_id) as unique_visitors
        FROM public.analytics_visits
        WHERE created_at BETWEEN start_date AND end_date
    ),
    period_sales AS (
        SELECT
            -- Total de vendas (incluindo pending e processing)
            COUNT(*) as total_sales,
            COUNT(*) FILTER (WHERE order_status IN ('pending', 'processing', 'fraud_analysis')) as pending_sales,
            COUNT(*) FILTER (WHERE order_status IN ('paid', 'provisioning', 'active')) as paid_sales,
            COALESCE(SUM(total_amount) FILTER (WHERE order_status IN ('paid', 'provisioning', 'active')), 0) as total_revenue
        FROM public.sales
        WHERE created_at BETWEEN start_date AND end_date
        AND order_status NOT IN ('failed', 'cancelled', 'draft')
    )
    SELECT
        pv.unique_visitors,
        ps.total_sales,
        ps.pending_sales,
        ps.paid_sales,
        ps.total_revenue,
        CASE 
            WHEN pv.unique_visitors > 0 
            THEN ROUND((ps.paid_sales::numeric / pv.unique_visitors::numeric) * 100, 2)
            ELSE 0 
        END as conversion_rate,
        CASE 
            WHEN ps.paid_sales > 0 
            THEN ROUND(ps.total_revenue / ps.paid_sales, 2)
            ELSE 0 
        END as average_order_value
    FROM period_visits pv, period_sales ps;
END;
$$;

-- =====================================================
-- 2. CRIAR VIEW: sales_overview
-- =====================================================
-- Visão geral de todas as vendas por status

CREATE OR REPLACE VIEW public.sales_overview AS
SELECT 
    COUNT(*) as total_vendas,
    COUNT(*) FILTER (WHERE order_status IN ('paid', 'provisioning', 'active')) as vendas_pagas,
    COUNT(*) FILTER (WHERE order_status IN ('pending', 'processing')) as vendas_pendentes,
    COUNT(*) FILTER (WHERE order_status = 'fraud_analysis') as em_analise_fraude,
    COUNT(*) FILTER (WHERE order_status = 'failed') as vendas_falhas,
    COUNT(*) FILTER (WHERE order_status IN ('cancelled', 'refunded')) as vendas_canceladas,
    
    -- Valores
    COALESCE(SUM(total_amount) FILTER (WHERE order_status IN ('paid', 'provisioning', 'active')), 0) as receita_paga,
    COALESCE(SUM(total_amount) FILTER (WHERE order_status IN ('pending', 'processing')), 0) as receita_pendente,
    COALESCE(SUM(total_amount) FILTER (WHERE order_status = 'fraud_analysis'), 0) as receita_em_analise,
    
    -- Médias
    COALESCE(AVG(total_amount) FILTER (WHERE order_status IN ('paid', 'provisioning', 'active')), 0) as ticket_medio_pago,
    
    -- Por gateway
    COUNT(*) FILTER (WHERE payment_gateway = 'mercadopago' AND order_status IN ('paid', 'provisioning', 'active')) as mp_vendas,
    COUNT(*) FILTER (WHERE payment_gateway = 'appmax' AND order_status IN ('paid', 'provisioning', 'active')) as appmax_vendas,
    COALESCE(SUM(total_amount) FILTER (WHERE payment_gateway = 'mercadopago' AND order_status IN ('paid', 'provisioning', 'active')), 0) as mp_receita,
    COALESCE(SUM(total_amount) FILTER (WHERE payment_gateway = 'appmax' AND order_status IN ('paid', 'provisioning', 'active')), 0) as appmax_receita
FROM public.sales;

-- =====================================================
-- 3. COMENTÁRIOS
-- =====================================================

COMMENT ON FUNCTION public.get_analytics_period IS 'Retorna métricas do período incluindo vendas pendentes e em processamento';
COMMENT ON VIEW public.sales_overview IS 'Visão consolidada de todas as vendas por status e gateway';

-- =====================================================
-- ✅ VERIFICAÇÃO
-- =====================================================

SELECT '✅ Views atualizadas para incluir vendas pendentes!' as status;

-- Testar
SELECT * FROM sales_overview;
SELECT * FROM get_analytics_period(NOW() - INTERVAL '7 days', NOW());
