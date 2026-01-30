-- =====================================================
-- INTERNAL METRICS - Camada SQL Blindada
-- =====================================================
-- Hub de Métricas Centralizado
-- Funções SECURITY DEFINER para acesso seguro aos dados
-- Timezone: America/Sao_Paulo
-- 
-- Autor: Sistema
-- Data: 2026-01-29
-- =====================================================

-- =====================================================
-- 0️⃣ PRÉ-REQUISITO: Garantir coluna deleted_at existe
-- =====================================================

-- Adicionar coluna deleted_at na tabela sales (se não existir)
ALTER TABLE sales ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_sales_deleted_at ON sales(deleted_at);

-- =====================================================
-- 1️⃣ FUNÇÕES HELPER DE TIMEZONE
-- =====================================================

-- Helper para converter timestamps para São Paulo
CREATE OR REPLACE FUNCTION to_sao_paulo(ts TIMESTAMP WITH TIME ZONE)
RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE SQL IMMUTABLE
AS $$
  SELECT ts AT TIME ZONE 'America/Sao_Paulo'
$$;

-- Helper para obter início do dia em São Paulo
CREATE OR REPLACE FUNCTION start_of_day_sp(target_date DATE DEFAULT CURRENT_DATE)
RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE SQL IMMUTABLE
AS $$
  SELECT (target_date::TEXT || ' 00:00:00')::TIMESTAMP AT TIME ZONE 'America/Sao_Paulo'
$$;

-- Helper para obter fim do dia em São Paulo
CREATE OR REPLACE FUNCTION end_of_day_sp(target_date DATE DEFAULT CURRENT_DATE)
RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE SQL IMMUTABLE
AS $$
  SELECT (target_date::TEXT || ' 23:59:59.999')::TIMESTAMP AT TIME ZONE 'America/Sao_Paulo'
$$;

-- =====================================================
-- 2️⃣ GET_GATEWAY_SALES - Dados Financeiros Reais
-- =====================================================
-- Fonte da verdade para vendas/receita
-- Esta é a definição canônica de "Venda Confirmada"
-- Usada tanto no Dashboard quanto no CAPI
-- =====================================================

CREATE OR REPLACE FUNCTION get_gateway_sales(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_status TEXT DEFAULT 'approved'
)
RETURNS TABLE (
  total_sales BIGINT,
  total_revenue NUMERIC,
  avg_ticket NUMERIC,
  sales_by_day JSONB,
  sales_by_gateway JSONB,
  sales_by_product JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start TIMESTAMP WITH TIME ZONE;
  v_end TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Default: últimos 30 dias
  v_start := COALESCE(
    start_of_day_sp(p_start_date),
    start_of_day_sp((CURRENT_DATE - INTERVAL '30 days')::DATE)
  );
  v_end := COALESCE(
    end_of_day_sp(p_end_date),
    end_of_day_sp(CURRENT_DATE)
  );

  RETURN QUERY
  WITH filtered_sales AS (
    SELECT 
      s.id,
      s.created_at,
      s.total_amount AS amount,
      COALESCE(s.payment_gateway, 'unknown') AS gateway,
      'Gravador Médico' AS product_name,
      s.order_status AS status
    FROM sales s
    WHERE 
      s.deleted_at IS NULL
      AND s.created_at >= v_start
      AND s.created_at <= v_end
      AND (
        p_status = 'all' 
        OR s.order_status = p_status 
        OR (p_status = 'approved' AND s.order_status IN ('approved', 'paid', 'authorized'))
      )
  ),
  totals AS (
    SELECT 
      COUNT(*) AS total,
      COALESCE(SUM(amount), 0) AS revenue,
      COALESCE(AVG(amount), 0) AS avg_ticket
    FROM filtered_sales
  ),
  by_day AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'date', day::DATE,
        'sales', count,
        'revenue', revenue
      ) ORDER BY day
    ) AS data
    FROM (
      SELECT 
        DATE_TRUNC('day', created_at AT TIME ZONE 'America/Sao_Paulo') AS day,
        COUNT(*) AS count,
        SUM(amount) AS revenue
      FROM filtered_sales
      GROUP BY day
    ) daily
  ),
  gateway_stats AS (
    SELECT 
      gateway,
      COUNT(*) AS count,
      SUM(amount) AS revenue
    FROM filtered_sales
    GROUP BY gateway
  ),
  gateway_total AS (
    SELECT SUM(count) AS total FROM gateway_stats
  ),
  by_gateway AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'gateway', g.gateway,
        'sales', g.count,
        'revenue', g.revenue,
        'percentage', ROUND(g.count * 100.0 / NULLIF(gt.total, 0), 2)
      ) ORDER BY g.count DESC
    ) AS data
    FROM gateway_stats g
    CROSS JOIN gateway_total gt
  ),
  by_product AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'product', product_name,
        'sales', count,
        'revenue', revenue,
        'avg_price', ROUND(revenue / NULLIF(count, 0), 2)
      ) ORDER BY revenue DESC
    ) AS data
    FROM (
      SELECT 
        product_name,
        COUNT(*) AS count,
        SUM(amount) AS revenue
      FROM filtered_sales
      GROUP BY product_name
      ORDER BY SUM(amount) DESC
      LIMIT 10
    ) products
  )
  SELECT 
    t.total,
    t.revenue,
    ROUND(t.avg_ticket, 2),
    COALESCE(d.data, '[]'::JSONB),
    COALESCE(g.data, '[]'::JSONB),
    COALESCE(p.data, '[]'::JSONB)
  FROM totals t
  CROSS JOIN by_day d
  CROSS JOIN by_gateway g
  CROSS JOIN by_product p;
END;
$$;

-- =====================================================
-- 3️⃣ GET_CHECKOUT_FUNNEL - Dados de Navegação
-- =====================================================
-- Eventos do site para montar funil de conversão
-- Compatível com analytics_events e abandoned_carts
-- =====================================================

CREATE OR REPLACE FUNCTION get_checkout_funnel(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  page_views BIGINT,
  product_views BIGINT,
  add_to_cart BIGINT,
  checkout_started BIGINT,
  checkout_completed BIGINT,
  purchase_confirmed BIGINT,
  funnel_stages JSONB,
  drop_rates JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start TIMESTAMP WITH TIME ZONE;
  v_end TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Default: últimos 30 dias
  v_start := COALESCE(
    start_of_day_sp(p_start_date),
    start_of_day_sp((CURRENT_DATE - INTERVAL '30 days')::DATE)
  );
  v_end := COALESCE(
    end_of_day_sp(p_end_date),
    end_of_day_sp(CURRENT_DATE)
  );

  RETURN QUERY
  WITH event_counts AS (
    -- Visitantes únicos (sessions)
    SELECT 
      'page_view' AS event_type,
      COUNT(DISTINCT session_id) AS unique_count
    FROM analytics_visits
    WHERE created_at >= v_start AND created_at <= v_end
    
    UNION ALL
    
    -- Eventos de produto/carrinho da tabela analytics_events (se existir)
    SELECT 
      event_type,
      COUNT(*) AS unique_count
    FROM analytics_events
    WHERE created_at >= v_start AND created_at <= v_end
      AND event_type IN ('view_product', 'add_to_cart', 'begin_checkout', 'purchase')
    GROUP BY event_type
  ),
  checkout_data AS (
    -- Carrinhos iniciados (sem compra = abandonados)
    SELECT 
      COUNT(*) AS started,
      COUNT(*) FILTER (WHERE status = 'recovered') AS recovered,
      COUNT(*) FILTER (WHERE status = 'abandoned') AS abandoned
    FROM abandoned_carts
    WHERE created_at >= v_start AND created_at <= v_end
  ),
  sales_data AS (
    -- Vendas confirmadas (mesma definição do Gateway)
    SELECT COUNT(*) AS confirmed
    FROM sales
    WHERE created_at >= v_start AND created_at <= v_end
      AND deleted_at IS NULL
      AND order_status IN ('approved', 'paid', 'authorized')
  ),
  calculated AS (
    SELECT
      COALESCE((SELECT unique_count FROM event_counts WHERE event_type = 'page_view'), 0)::BIGINT AS pv,
      COALESCE((SELECT unique_count FROM event_counts WHERE event_type = 'view_product'), 0)::BIGINT AS product,
      COALESCE((SELECT unique_count FROM event_counts WHERE event_type = 'add_to_cart'), 0)::BIGINT AS cart,
      COALESCE((SELECT started FROM checkout_data), 0)::BIGINT AS checkout_start,
      COALESCE((SELECT recovered FROM checkout_data), 0)::BIGINT AS checkout_complete,
      COALESCE((SELECT confirmed FROM sales_data), 0)::BIGINT AS purchase
  )
  SELECT
    c.pv,
    c.product,
    c.cart,
    c.checkout_start,
    c.checkout_complete,
    c.purchase,
    -- Funil estruturado
    jsonb_build_array(
      jsonb_build_object('stage', 'Visitantes', 'count', c.pv, 'percentage', 100),
      jsonb_build_object('stage', 'Viram Produto', 'count', c.product, 'percentage', 
        CASE WHEN c.pv > 0 THEN ROUND(c.product * 100.0 / c.pv, 1) ELSE 0 END),
      jsonb_build_object('stage', 'Add ao Carrinho', 'count', c.cart, 'percentage', 
        CASE WHEN c.pv > 0 THEN ROUND(c.cart * 100.0 / c.pv, 1) ELSE 0 END),
      jsonb_build_object('stage', 'Iniciou Checkout', 'count', c.checkout_start, 'percentage', 
        CASE WHEN c.pv > 0 THEN ROUND(c.checkout_start * 100.0 / c.pv, 1) ELSE 0 END),
      jsonb_build_object('stage', 'Comprou', 'count', c.purchase, 'percentage', 
        CASE WHEN c.pv > 0 THEN ROUND(c.purchase * 100.0 / c.pv, 1) ELSE 0 END)
    )::JSONB,
    -- Taxas de abandono entre etapas
    jsonb_build_object(
      'view_to_product', CASE WHEN c.pv > 0 THEN ROUND((c.pv - c.product) * 100.0 / c.pv, 1) ELSE 0 END,
      'product_to_cart', CASE WHEN c.product > 0 THEN ROUND((c.product - c.cart) * 100.0 / c.product, 1) ELSE 0 END,
      'cart_to_checkout', CASE WHEN c.cart > 0 THEN ROUND((c.cart - c.checkout_start) * 100.0 / c.cart, 1) ELSE 0 END,
      'checkout_to_purchase', CASE WHEN c.checkout_start > 0 THEN ROUND((c.checkout_start - c.purchase) * 100.0 / c.checkout_start, 1) ELSE 0 END,
      'overall_conversion', CASE WHEN c.pv > 0 THEN ROUND(c.purchase * 100.0 / c.pv, 2) ELSE 0 END
    )::JSONB
  FROM calculated c;
END;
$$;

-- =====================================================
-- 4️⃣ GET_SALES_FOR_CAPI - Mesma definição de Venda
-- =====================================================
-- Retorna dados formatados para disparo no Meta CAPI
-- REGRA DE OURO: Usa a mesma lógica de get_gateway_sales
-- =====================================================

CREATE OR REPLACE FUNCTION get_sales_for_capi(
  p_sale_id UUID DEFAULT NULL,
  p_since_minutes INTEGER DEFAULT 5
)
RETURNS TABLE (
  sale_id UUID,
  order_id TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  customer_name TEXT,
  total_amount NUMERIC,
  product_name TEXT,
  product_ids TEXT[],
  gateway TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  event_id TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id AS sale_id,
    COALESCE(s.appmax_order_id, s.id::TEXT) AS order_id,
    COALESCE(s.customer_email, c.email) AS customer_email,
    COALESCE(s.customer_phone, c.phone) AS customer_phone,
    COALESCE(s.customer_name, c.name) AS customer_name,
    s.total_amount AS total_amount,
    'Gravador Médico'::TEXT AS product_name,
    ARRAY['gravador_medico']::TEXT[] AS product_ids,
    s.payment_gateway,
    s.created_at,
    -- Event ID = ID da venda para deduplicação
    COALESCE(s.appmax_order_id, s.id::TEXT) AS event_id
  FROM sales s
  LEFT JOIN customers c ON s.customer_id = c.id
  WHERE 
    s.deleted_at IS NULL
    AND s.order_status IN ('approved', 'paid', 'authorized')
    AND (
      -- Buscar por ID específico
      (p_sale_id IS NOT NULL AND s.id = p_sale_id)
      OR
      -- Ou vendas recentes (para processamento em lote)
      (p_sale_id IS NULL AND s.created_at >= NOW() - (p_since_minutes || ' minutes')::INTERVAL)
    );
END;
$$;

-- =====================================================
-- 5️⃣ GET_ANALYTICS_SUMMARY - KPIs Consolidados
-- =====================================================
-- Resumo para cards principais do dashboard
-- Inclui comparação com período anterior
-- =====================================================

CREATE OR REPLACE FUNCTION get_analytics_summary(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  -- Período atual
  visitors BIGINT,
  unique_sessions BIGINT,
  total_sales BIGINT,
  total_revenue NUMERIC,
  avg_ticket NUMERIC,
  conversion_rate NUMERIC,
  -- Período anterior (comparação)
  prev_visitors BIGINT,
  prev_sales BIGINT,
  prev_revenue NUMERIC,
  -- Variações percentuais
  visitors_change NUMERIC,
  sales_change NUMERIC,
  revenue_change NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start TIMESTAMP WITH TIME ZONE;
  v_end TIMESTAMP WITH TIME ZONE;
  v_duration INTERVAL;
  v_prev_start TIMESTAMP WITH TIME ZONE;
  v_prev_end TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Default: últimos 30 dias
  v_start := COALESCE(
    start_of_day_sp(p_start_date),
    start_of_day_sp((CURRENT_DATE - INTERVAL '30 days')::DATE)
  );
  v_end := COALESCE(
    end_of_day_sp(p_end_date),
    end_of_day_sp(CURRENT_DATE)
  );
  
  -- Calcular período anterior com mesma duração
  v_duration := v_end - v_start;
  v_prev_start := v_start - v_duration;
  v_prev_end := v_start - INTERVAL '1 second';

  RETURN QUERY
  WITH current_period AS (
    SELECT
      (SELECT COUNT(DISTINCT session_id) FROM analytics_visits 
       WHERE created_at >= v_start AND created_at <= v_end) AS visitors,
      (SELECT COUNT(DISTINCT session_id) FROM analytics_visits 
       WHERE created_at >= v_start AND created_at <= v_end) AS sessions,
      (SELECT COUNT(*) FROM sales 
       WHERE created_at >= v_start AND created_at <= v_end 
       AND deleted_at IS NULL AND order_status IN ('approved', 'paid', 'authorized')) AS sales,
      (SELECT COALESCE(SUM(total_amount), 0) FROM sales 
       WHERE created_at >= v_start AND created_at <= v_end 
       AND deleted_at IS NULL AND order_status IN ('approved', 'paid', 'authorized')) AS revenue
  ),
  previous_period AS (
    SELECT
      (SELECT COUNT(DISTINCT session_id) FROM analytics_visits 
       WHERE created_at >= v_prev_start AND created_at <= v_prev_end) AS visitors,
      (SELECT COUNT(*) FROM sales 
       WHERE created_at >= v_prev_start AND created_at <= v_prev_end 
       AND deleted_at IS NULL AND order_status IN ('approved', 'paid', 'authorized')) AS sales,
      (SELECT COALESCE(SUM(total_amount), 0) FROM sales 
       WHERE created_at >= v_prev_start AND created_at <= v_prev_end 
       AND deleted_at IS NULL AND order_status IN ('approved', 'paid', 'authorized')) AS revenue
  )
  SELECT
    c.visitors::BIGINT,
    c.sessions::BIGINT,
    c.sales::BIGINT,
    c.revenue,
    ROUND(c.revenue / NULLIF(c.sales, 0), 2) AS avg_ticket,
    ROUND(c.sales * 100.0 / NULLIF(c.visitors, 0), 2) AS conversion_rate,
    -- Período anterior
    p.visitors::BIGINT,
    p.sales::BIGINT,
    p.revenue,
    -- Variações
    ROUND((c.visitors - p.visitors) * 100.0 / NULLIF(p.visitors, 0), 1),
    ROUND((c.sales - p.sales) * 100.0 / NULLIF(p.sales, 0), 1),
    ROUND((c.revenue - p.revenue) * 100.0 / NULLIF(p.revenue, 0), 1)
  FROM current_period c
  CROSS JOIN previous_period p;
END;
$$;

-- =====================================================
-- 6️⃣ ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índice para buscas por período em sales
CREATE INDEX IF NOT EXISTS idx_sales_created_at_order_status 
ON sales(created_at, order_status) 
WHERE deleted_at IS NULL;

-- Índice para analytics_visits por sessão e data
CREATE INDEX IF NOT EXISTS idx_analytics_visits_session_date 
ON analytics_visits(session_id, created_at);

-- Índice para abandoned_carts por status e data
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_status_date 
ON abandoned_carts(status, created_at);

-- =====================================================
-- 7️⃣ GRANTS - Permissões para API
-- =====================================================

-- Garantir que o service role pode executar
GRANT EXECUTE ON FUNCTION get_gateway_sales TO service_role;
GRANT EXECUTE ON FUNCTION get_checkout_funnel TO service_role;
GRANT EXECUTE ON FUNCTION get_sales_for_capi TO service_role;
GRANT EXECUTE ON FUNCTION get_analytics_summary TO service_role;
GRANT EXECUTE ON FUNCTION to_sao_paulo TO service_role;
GRANT EXECUTE ON FUNCTION start_of_day_sp TO service_role;
GRANT EXECUTE ON FUNCTION end_of_day_sp TO service_role;

-- Authenticated users podem ver agregados (sem dados individuais)
GRANT EXECUTE ON FUNCTION get_gateway_sales TO authenticated;
GRANT EXECUTE ON FUNCTION get_checkout_funnel TO authenticated;
GRANT EXECUTE ON FUNCTION get_analytics_summary TO authenticated;

-- =====================================================
-- COMENTÁRIOS DE DOCUMENTAÇÃO
-- =====================================================

COMMENT ON FUNCTION get_gateway_sales IS 
  'Retorna métricas financeiras do gateway. Fonte da verdade para receita.';

COMMENT ON FUNCTION get_checkout_funnel IS 
  'Retorna dados do funil de conversão do checkout. Compatível com analytics_events.';

COMMENT ON FUNCTION get_sales_for_capi IS 
  'Retorna vendas formatadas para disparo no Meta CAPI. MESMA definição de venda aprovada.';

COMMENT ON FUNCTION get_analytics_summary IS 
  'Retorna KPIs consolidados com comparação de período anterior.';

-- =====================================================
-- VERIFICAÇÃO
-- =====================================================

SELECT 
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE 'get_%'
ORDER BY routine_name;
