-- =============================================
-- PRODUCTS INTELLIGENCE SYSTEM
-- =============================================
-- Sistema de Inteligência de Produtos para SaaS
-- Auto-discovery de produtos + Performance Analytics
-- =============================================

-- 1️⃣ TABELA DE PRODUTOS (Catálogo Oficial)
-- =============================================
CREATE TABLE IF NOT EXISTS public.products (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    -- IDs Externos
    external_id text UNIQUE, -- ID do produto na Appmax
    appmax_product_id text, -- ID alternativo da Appmax
    
    -- Dados Básicos
    name text NOT NULL,
    description text,
    price numeric DEFAULT 0,
    image_url text,
    
    -- Categorização
    category text DEFAULT 'subscription', -- 'subscription', 'one_time', 'service', 'upsell'
    plan_type text, -- 'monthly', 'annual', 'lifetime', 'trial'
    
    -- Estado
    is_active boolean DEFAULT true,
    is_featured boolean DEFAULT false,
    
    -- Checkout
    checkout_url text,
    appmax_checkout_id text,
    
    -- Upsell/Cross-sell
    upsell_products jsonb DEFAULT '[]'::jsonb, -- Array de IDs de produtos relacionados
    order_bump_config jsonb DEFAULT '{}'::jsonb,
    
    -- Metadata
    metadata jsonb DEFAULT '{}'::jsonb,
    tags text[] DEFAULT '{}'
);

-- 2️⃣ VIEW DE PERFORMANCE DE PRODUTOS (A Mágica)
-- =============================================
-- Extrai métricas de vendas do JSONB e calcula KPIs críticos
CREATE OR REPLACE VIEW public.product_performance AS
WITH sales_items AS (
    -- Explode o array de itens das vendas
    SELECT 
        s.id as sale_id,
        s.created_at,
        s.status,
        item->>'title' as product_name,
        (item->>'unit_price')::numeric as price,
        (item->>'quantity')::int as quantity,
        s.customer_email
    FROM 
        public.sales s,
        jsonb_array_elements(s.items) as item
    WHERE 
        s.created_at > (now() - interval '30 days') -- Performance dos últimos 30 dias
        AND s.items IS NOT NULL
),
product_stats AS (
    SELECT 
        product_name,
        
        -- Vendas
        COUNT(DISTINCT sale_id) FILTER (WHERE status IN ('paid', 'approved')) as total_sales,
        COUNT(DISTINCT customer_email) FILTER (WHERE status IN ('paid', 'approved')) as unique_customers,
        
        -- Receita
        SUM(price * COALESCE(quantity, 1)) FILTER (WHERE status IN ('paid', 'approved')) as total_revenue,
        AVG(price) FILTER (WHERE status IN ('paid', 'approved')) as avg_price,
        
        -- Reembolsos (MÉTRICA CRÍTICA)
        COUNT(DISTINCT sale_id) FILTER (WHERE status = 'refunded') as total_refunds,
        SUM(price * COALESCE(quantity, 1)) FILTER (WHERE status = 'refunded') as refunded_revenue,
        
        -- Falhas
        COUNT(DISTINCT sale_id) FILTER (WHERE status = 'failed') as failed_attempts,
        
        -- Última venda
        MAX(created_at) FILTER (WHERE status IN ('paid', 'approved')) as last_sale_at
    FROM 
        sales_items
    GROUP BY 
        product_name
)
SELECT 
    product_name,
    total_sales,
    unique_customers,
    total_revenue,
    avg_price,
    total_refunds,
    refunded_revenue,
    failed_attempts,
    last_sale_at,
    
    -- Taxa de Reembolso (%)
    CASE 
        WHEN total_sales > 0 
        THEN ROUND((total_refunds::numeric / total_sales::numeric) * 100, 2)
        ELSE 0 
    END as refund_rate,
    
    -- Taxa de Conversão (considerando falhas)
    CASE 
        WHEN (total_sales + failed_attempts) > 0 
        THEN ROUND((total_sales::numeric / (total_sales + failed_attempts)::numeric) * 100, 2)
        ELSE 0 
    END as conversion_rate,
    
    -- Score de Saúde (0-100)
    -- Fórmula: Base 100, perde pontos por reembolso alto e conversão baixa
    LEAST(100, GREATEST(0, 
        100 
        - (CASE WHEN total_sales > 0 THEN (total_refunds::numeric / total_sales::numeric) * 50 ELSE 0 END) -- Perde até 50 pontos por reembolso
        - (CASE WHEN (total_sales + failed_attempts) > 0 THEN (failed_attempts::numeric / (total_sales + failed_attempts)::numeric) * 30 ELSE 0 END) -- Perde até 30 pontos por falha
    ))::int as health_score
FROM 
    product_stats
ORDER BY 
    total_revenue DESC NULLS LAST;

-- 3️⃣ VIEW DE TENDÊNCIAS (7 Dias)
-- =============================================
-- Para os mini-gráficos (sparklines)
CREATE OR REPLACE VIEW public.product_trends AS
WITH daily_sales AS (
    SELECT 
        item->>'title' as product_name,
        DATE(s.created_at) as sale_date,
        COUNT(*) FILTER (WHERE s.status IN ('paid', 'approved')) as sales_count,
        SUM((item->>'unit_price')::numeric * (item->>'quantity')::int) FILTER (WHERE s.status IN ('paid', 'approved')) as daily_revenue
    FROM 
        public.sales s,
        jsonb_array_elements(s.items) as item
    WHERE 
        s.created_at > (now() - interval '7 days')
        AND s.items IS NOT NULL
    GROUP BY 
        product_name, 
        DATE(s.created_at)
)
SELECT 
    product_name,
    jsonb_agg(
        jsonb_build_object(
            'date', sale_date,
            'sales', sales_count,
            'revenue', daily_revenue
        ) ORDER BY sale_date ASC
    ) as trend_data,
    
    -- Direção da tendência (baseado em regressão linear simples)
    CASE 
        WHEN AVG(sales_count) OVER (PARTITION BY product_name ORDER BY sale_date ROWS BETWEEN 3 PRECEDING AND CURRENT ROW) >
             AVG(sales_count) OVER (PARTITION BY product_name ORDER BY sale_date ROWS BETWEEN 6 PRECEDING AND 3 PRECEDING)
        THEN 'up'
        ELSE 'down'
    END as trend_direction
FROM 
    daily_sales
GROUP BY 
    product_name, sale_date;

-- 4️⃣ FUNÇÃO: AUTO-DISCOVERY DE PRODUTOS
-- =============================================
-- Varre as vendas e cria produtos automaticamente
CREATE OR REPLACE FUNCTION discover_products_from_sales()
RETURNS TABLE (
    discovered_count int,
    products_created jsonb
) AS $$
DECLARE
    product_record RECORD;
    created_products jsonb := '[]'::jsonb;
    counter int := 0;
BEGIN
    -- Loop por produtos únicos extraídos das vendas
    FOR product_record IN
        SELECT DISTINCT
            item->>'title' as name,
            (item->>'unit_price')::numeric as price,
            item->>'product_id' as external_id
        FROM 
            public.sales,
            jsonb_array_elements(items) as item
        WHERE 
            items IS NOT NULL
            AND item->>'title' IS NOT NULL
    LOOP
        -- Upsert: Insere se não existir, atualiza preço se mudou
        INSERT INTO public.products (name, price, external_id, category)
        VALUES (
            product_record.name,
            product_record.price,
            product_record.external_id,
            'subscription' -- Default, pode ser refinado depois
        )
        ON CONFLICT (external_id) 
        DO UPDATE SET 
            price = EXCLUDED.price,
            updated_at = NOW()
        RETURNING name, price INTO product_record;
        
        -- Adiciona ao array de produtos criados
        created_products := created_products || jsonb_build_object(
            'name', product_record.name,
            'price', product_record.price
        );
        
        counter := counter + 1;
    END LOOP;
    
    RETURN QUERY SELECT counter, created_products;
END;
$$ LANGUAGE plpgsql;

-- 5️⃣ CONSTRAINT UNIQUE (Para UPSERT funcionar)
-- =============================================
-- Garante que external_id seja único para permitir ON CONFLICT
DO $$ 
BEGIN
    ALTER TABLE public.products ADD CONSTRAINT products_external_id_key UNIQUE (external_id);
EXCEPTION
    WHEN duplicate_object THEN NULL; -- Ignora se já existir
END $$;

-- 6️⃣ ÍNDICES DE PERFORMANCE
-- =============================================
CREATE INDEX IF NOT EXISTS idx_products_external_id ON public.products(external_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_featured ON public.products(is_featured) WHERE is_featured = true;

-- Para extração rápida de itens do JSONB
CREATE INDEX IF NOT EXISTS idx_sales_items_gin ON public.sales USING gin(items);

-- 6️⃣ ROW LEVEL SECURITY
-- =============================================
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Público pode ler produtos ativos
DROP POLICY IF EXISTS "Public read active products" ON public.products;
CREATE POLICY "Public read active products" 
ON public.products FOR SELECT 
USING (is_active = true);

-- Autenticados podem ler todos
DROP POLICY IF EXISTS "Authenticated read all products" ON public.products;
CREATE POLICY "Authenticated read all products" 
ON public.products FOR SELECT 
TO authenticated 
USING (true);

-- Apenas service_role pode modificar
DROP POLICY IF EXISTS "Service role manage products" ON public.products;
CREATE POLICY "Service role manage products" 
ON public.products FOR ALL 
TO service_role 
USING (true);

-- 7️⃣ TRIGGER: AUTO-UPDATE TIMESTAMP
-- =============================================
DROP TRIGGER IF EXISTS trigger_products_updated_at ON public.products;
CREATE TRIGGER trigger_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 8️⃣ SEED INICIAL (Opcional - Comentado)
-- =============================================
-- Descomente e ajuste conforme seus produtos reais
/*
INSERT INTO public.products (name, price, category, plan_type, is_featured, checkout_url) VALUES
('Gravador Médico Pro - Mensal', 97.00, 'subscription', 'monthly', true, 'https://pay.appmax.com.br/...'),
('Gravador Médico Pro - Anual', 970.00, 'subscription', 'annual', true, 'https://pay.appmax.com.br/...'),
('Transcritor IA - Add-on', 47.00, 'upsell', 'monthly', false, 'https://pay.appmax.com.br/...')
ON CONFLICT (external_id) DO NOTHING;
*/

-- 9️⃣ VERIFICAÇÃO
-- =============================================
SELECT 
    'products' as table_name,
    COUNT(*) as total_records
FROM public.products
UNION ALL
SELECT 
    'product_performance' as view_name,
    COUNT(*) as total_records
FROM public.product_performance;

-- 🔟 EXEMPLOS DE USO
-- =============================================

-- Descobrir produtos automaticamente das vendas
-- SELECT * FROM discover_products_from_sales();

-- Ver performance de produtos
-- SELECT * FROM product_performance ORDER BY health_score ASC LIMIT 5;

-- Produto com maior taxa de reembolso (ALERTA)
-- SELECT 
--     product_name, 
--     refund_rate,
--     total_sales,
--     total_refunds
-- FROM product_performance 
-- WHERE total_sales > 5 -- Mínimo de vendas para ser relevante
-- ORDER BY refund_rate DESC 
-- LIMIT 1;

-- ✅ CONCLUÍDO
-- Execute este SQL no Supabase para ativar o sistema de produtos
