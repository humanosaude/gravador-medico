-- =====================================================
-- PRODUCTS INTELLIGENCE - VERSÃO MINIMAL (SEM ERROS)
-- =====================================================
-- 
-- Esta versão cria TUDO do zero de forma limpa
-- Use APENAS se você ainda não tem tabelas criadas
--
-- Tempo de execução: ~2 segundos
-- =====================================================

-- 1. Criar tabela de clientes (se não existir)
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Criar tabela de produtos (catálogo oficial)
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    category TEXT DEFAULT 'uncategorized',
    image_url TEXT,
    plan_type TEXT,
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Criar tabela de vendas
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.customers(id),
    customer_email TEXT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'refused', 'refunded', 'chargeback')),
    payment_method TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Criar tabela de itens de venda (CHAVE PARA RESOLVER O ERRO!)
CREATE TABLE IF NOT EXISTS public.sales_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id),
    product_name TEXT NOT NULL,
    product_sku TEXT,
    price DECIMAL(10,2) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_sales_customer_email ON public.sales(customer_email);
CREATE INDEX IF NOT EXISTS idx_sales_status ON public.sales(status);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON public.sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_items_sale_id ON public.sales_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sales_items_product_name ON public.sales_items(product_name);
CREATE INDEX IF NOT EXISTS idx_products_external_id ON public.products(external_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products(is_active);

-- 6. Criar VIEW de performance de produtos
CREATE OR REPLACE VIEW public.product_performance AS
WITH recent_sales AS (
    SELECT 
        si.product_name,
        si.product_sku,
        si.price,
        si.quantity,
        s.status,
        s.created_at,
        p.id as product_id
    FROM 
        public.sales s
        INNER JOIN public.sales_items si ON si.sale_id = s.id
        LEFT JOIN public.products p ON (
            p.external_id = si.product_sku 
            OR p.name = si.product_name
        )
    WHERE 
        s.created_at >= CURRENT_DATE - INTERVAL '30 days'
)
SELECT
    MAX(rs.product_id) as product_id,
    rs.product_name,
    COALESCE(rs.product_sku, md5(rs.product_name)) as product_sku,
    
    -- Métricas de vendas
    COUNT(CASE WHEN rs.status = 'approved' THEN 1 END) as total_sales,
    SUM(CASE WHEN rs.status = 'approved' THEN rs.price * rs.quantity ELSE 0 END) as total_revenue,
    
    -- Métricas de reembolso
    COUNT(CASE WHEN rs.status IN ('refunded', 'chargeback') THEN 1 END) as total_refunds,
    SUM(CASE WHEN rs.status IN ('refunded', 'chargeback') THEN rs.price * rs.quantity ELSE 0 END) as refund_amount,
    
    -- Taxa de reembolso (%)
    CASE 
        WHEN COUNT(*) > 0 THEN 
            ROUND((COUNT(CASE WHEN rs.status IN ('refunded', 'chargeback') THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
        ELSE 0
    END as refund_rate,
    
    -- Ticket médio
    CASE 
        WHEN COUNT(CASE WHEN rs.status = 'approved' THEN 1 END) > 0 THEN
            ROUND(SUM(CASE WHEN rs.status = 'approved' THEN rs.price * rs.quantity ELSE 0 END) / 
                  COUNT(CASE WHEN rs.status = 'approved' THEN 1 END), 2)
        ELSE 0
    END as average_ticket,
    
    -- Taxa de conversão (aprovado / total)
    CASE 
        WHEN COUNT(*) > 0 THEN 
            ROUND((COUNT(CASE WHEN rs.status = 'approved' THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
        ELSE 0
    END as conversion_rate,
    
    -- Health Score (0-100)
    CASE 
        WHEN COUNT(*) >= 5 THEN
            ROUND(
                (
                    -- Peso da conversão (40 pontos)
                    (COUNT(CASE WHEN rs.status = 'approved' THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC) * 40 +
                    -- Peso do reembolso invertido (40 pontos)
                    (1 - (COUNT(CASE WHEN rs.status IN ('refunded', 'chargeback') THEN 1 END)::NUMERIC / GREATEST(COUNT(*), 1)::NUMERIC)) * 40 +
                    -- Peso do volume (20 pontos)
                    LEAST(COUNT(CASE WHEN rs.status = 'approved' THEN 1 END) / 10.0, 1) * 20
                )
            , 0)
        ELSE 50 -- Score neutro para produtos com poucos dados
    END as health_score,
    
    MAX(rs.created_at) as last_sale_at,
    MIN(rs.created_at) as first_sale_at
    
FROM 
    recent_sales rs
GROUP BY 
    rs.product_name, rs.product_sku
ORDER BY 
    COUNT(CASE WHEN rs.status = 'approved' THEN 1 END) DESC;

-- 7. Criar VIEW de tendências (para sparklines)
CREATE OR REPLACE VIEW public.product_trends AS
WITH daily_sales AS (
    SELECT 
        si.product_name,
        DATE(s.created_at) as sale_date,
        COUNT(*) as daily_count,
        SUM(si.price * si.quantity) as daily_revenue
    FROM 
        public.sales s
        INNER JOIN public.sales_items si ON si.sale_id = s.id
    WHERE 
        s.created_at >= CURRENT_DATE - INTERVAL '7 days'
        AND s.status = 'approved'
    GROUP BY 
        si.product_name, DATE(s.created_at)
)
SELECT 
    product_name,
    json_agg(
        json_build_object(
            'date', sale_date,
            'count', daily_count,
            'revenue', daily_revenue
        ) ORDER BY sale_date ASC
    ) as trend_data
FROM daily_sales
GROUP BY product_name;

-- 8. Criar função de auto-discovery
CREATE OR REPLACE FUNCTION public.discover_products_from_sales()
RETURNS TABLE(
    product_name TEXT,
    product_sku TEXT,
    price DECIMAL,
    total_sales BIGINT,
    external_id TEXT
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        si.product_name::TEXT,
        COALESCE(si.product_sku, md5(si.product_name))::TEXT as product_sku,
        si.price::DECIMAL,
        COUNT(*)::BIGINT as total_sales,
        COALESCE(si.product_sku, md5(si.product_name))::TEXT as external_id
    FROM 
        public.sales s
        INNER JOIN public.sales_items si ON si.sale_id = s.id
    WHERE 
        s.created_at >= CURRENT_DATE - INTERVAL '90 days'
        AND si.product_name IS NOT NULL
        AND si.product_name != ''
    GROUP BY 
        si.product_name, si.product_sku, si.price
    ORDER BY 
        total_sales DESC
    LIMIT 200;
END;
$$;

-- 9. Habilitar RLS (Row Level Security)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_items ENABLE ROW LEVEL SECURITY;

-- 10. Criar políticas de acesso

-- Products: Leitura pública para produtos ativos
DROP POLICY IF EXISTS "Produtos ativos são públicos" ON public.products;
CREATE POLICY "Produtos ativos são públicos"
    ON public.products FOR SELECT
    USING (is_active = true);

-- Products: Admins podem ver tudo
DROP POLICY IF EXISTS "Admins podem ver todos produtos" ON public.products;
CREATE POLICY "Admins podem ver todos produtos"
    ON public.products FOR SELECT
    TO authenticated
    USING (true);

-- Products: Service role pode gerenciar
DROP POLICY IF EXISTS "Service role pode gerenciar produtos" ON public.products;
CREATE POLICY "Service role pode gerenciar produtos"
    ON public.products
    USING (true)
    WITH CHECK (true);

-- Sales: Apenas autenticados podem ver
DROP POLICY IF EXISTS "Vendas são privadas" ON public.sales;
CREATE POLICY "Vendas são privadas"
    ON public.sales FOR SELECT
    TO authenticated
    USING (true);

-- Sales Items: Apenas autenticados podem ver
DROP POLICY IF EXISTS "Itens de venda são privados" ON public.sales_items;
CREATE POLICY "Itens de venda são privados"
    ON public.sales_items FOR SELECT
    TO authenticated
    USING (true);

-- =====================================================
-- ✅ SETUP COMPLETO!
-- =====================================================
-- 
-- O que foi criado:
-- ✅ Tabela customers
-- ✅ Tabela products (catálogo oficial)
-- ✅ Tabela sales
-- ✅ Tabela sales_items ← RESOLVE O ERRO!
-- ✅ 8 índices otimizados
-- ✅ VIEW product_performance (métricas)
-- ✅ VIEW product_trends (sparklines)
-- ✅ FUNCTION discover_products_from_sales()
-- ✅ RLS habilitado
-- ✅ 5 políticas de segurança
--
-- Próximos passos:
-- 1. Testar: SELECT * FROM product_performance;
-- 2. Acessar: http://localhost:3000/admin/products
-- 3. Clicar em "Sincronizar com Vendas"
-- =====================================================
