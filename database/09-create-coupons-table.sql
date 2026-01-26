-- =====================================================
-- SISTEMA DE CUPONS DE DESCONTO
-- =====================================================
-- Criado em: 26/01/2026
-- Descrição: Tabela para gerenciar cupons de desconto
-- =====================================================

-- 1. Criar tabela de cupons
CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('percent', 'fixed')),
    value DECIMAL(10, 2) NOT NULL CHECK (value > 0),
    min_order_value DECIMAL(10, 2) DEFAULT 0,
    usage_limit INTEGER DEFAULT NULL, -- NULL = ilimitado
    usage_count INTEGER DEFAULT 0 NOT NULL,
    expiration_date TIMESTAMP WITH TIME ZONE DEFAULT NULL, -- NULL = sem expiração
    is_active BOOLEAN DEFAULT true NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    -- Constraints
    CONSTRAINT usage_count_positive CHECK (usage_count >= 0),
    CONSTRAINT usage_limit_valid CHECK (usage_limit IS NULL OR usage_limit > 0)
);

-- 2. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_is_active ON public.coupons(is_active);
CREATE INDEX IF NOT EXISTS idx_coupons_expiration_date ON public.coupons(expiration_date);

-- 3. Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_coupons_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Criar trigger para updated_at
DROP TRIGGER IF EXISTS trigger_update_coupons_updated_at ON public.coupons;
CREATE TRIGGER trigger_update_coupons_updated_at
    BEFORE UPDATE ON public.coupons
    FOR EACH ROW
    EXECUTE FUNCTION update_coupons_updated_at();

-- 5. Função para validar cupom (pode ser usada no banco também)
CREATE OR REPLACE FUNCTION validate_coupon(
    p_code VARCHAR(50),
    p_order_value DECIMAL(10, 2)
)
RETURNS TABLE(
    is_valid BOOLEAN,
    discount_amount DECIMAL(10, 2),
    error_message TEXT
) AS $$
DECLARE
    v_coupon RECORD;
    v_discount DECIMAL(10, 2);
BEGIN
    -- Buscar cupom (sempre uppercase)
    SELECT * INTO v_coupon
    FROM public.coupons
    WHERE UPPER(code) = UPPER(p_code);
    
    -- Cupom não existe
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 0.00::DECIMAL, 'Cupom não encontrado';
        RETURN;
    END IF;
    
    -- Verificar se está ativo
    IF NOT v_coupon.is_active THEN
        RETURN QUERY SELECT false, 0.00::DECIMAL, 'Cupom desativado';
        RETURN;
    END IF;
    
    -- Verificar expiração
    IF v_coupon.expiration_date IS NOT NULL AND v_coupon.expiration_date < NOW() THEN
        RETURN QUERY SELECT false, 0.00::DECIMAL, 'Cupom expirado';
        RETURN;
    END IF;
    
    -- Verificar limite de uso
    IF v_coupon.usage_limit IS NOT NULL AND v_coupon.usage_count >= v_coupon.usage_limit THEN
        RETURN QUERY SELECT false, 0.00::DECIMAL, 'Limite de uso atingido';
        RETURN;
    END IF;
    
    -- Verificar valor mínimo do pedido
    IF p_order_value < v_coupon.min_order_value THEN
        RETURN QUERY SELECT false, 0.00::DECIMAL, 
            'Valor mínimo do pedido: R$ ' || v_coupon.min_order_value;
        RETURN;
    END IF;
    
    -- Calcular desconto
    IF v_coupon.type = 'percent' THEN
        v_discount := (p_order_value * v_coupon.value) / 100;
    ELSE
        v_discount := v_coupon.value;
    END IF;
    
    -- Garantir que desconto não seja maior que o valor do pedido
    v_discount := LEAST(v_discount, p_order_value);
    
    RETURN QUERY SELECT true, v_discount, 'Cupom válido'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- 6. Função para incrementar uso do cupom
CREATE OR REPLACE FUNCTION increment_coupon_usage(p_code VARCHAR(50))
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.coupons
    SET usage_count = usage_count + 1
    WHERE UPPER(code) = UPPER(p_code)
    AND is_active = true;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- 7. Habilitar RLS (Row Level Security)
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- 8. Policies de acesso
-- Policy: Todos podem ler cupons ativos (para validação no checkout)
DROP POLICY IF EXISTS "Allow public read active coupons" ON public.coupons;
CREATE POLICY "Allow public read active coupons"
    ON public.coupons
    FOR SELECT
    USING (is_active = true);

-- Policy: Apenas admins podem inserir cupons
DROP POLICY IF EXISTS "Allow admin insert coupons" ON public.coupons;
CREATE POLICY "Allow admin insert coupons"
    ON public.coupons
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

-- Policy: Apenas admins podem atualizar cupons
DROP POLICY IF EXISTS "Allow admin update coupons" ON public.coupons;
CREATE POLICY "Allow admin update coupons"
    ON public.coupons
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

-- Policy: Apenas admins podem deletar cupons
DROP POLICY IF EXISTS "Allow admin delete coupons" ON public.coupons;
CREATE POLICY "Allow admin delete coupons"
    ON public.coupons
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

-- 9. Inserir cupons de exemplo (migrar os existentes)
INSERT INTO public.coupons (code, type, value, description, is_active, usage_limit)
VALUES 
    ('ADMGM', 'fixed', 35.00, 'Desconto fixo de R$ 35,00', true, NULL),
    ('DESCONTOGC', 'percent', 70.00, '70% de desconto no total', true, NULL)
ON CONFLICT (code) DO NOTHING;

-- 10. Comentários na tabela
COMMENT ON TABLE public.coupons IS 'Tabela de cupons de desconto do sistema';
COMMENT ON COLUMN public.coupons.code IS 'Código do cupom (sempre uppercase)';
COMMENT ON COLUMN public.coupons.type IS 'Tipo: percent (porcentagem) ou fixed (valor fixo)';
COMMENT ON COLUMN public.coupons.value IS 'Valor do desconto (% ou R$)';
COMMENT ON COLUMN public.coupons.min_order_value IS 'Valor mínimo do pedido para usar o cupom';
COMMENT ON COLUMN public.coupons.usage_limit IS 'Limite de uso (NULL = ilimitado)';
COMMENT ON COLUMN public.coupons.usage_count IS 'Quantidade de vezes que foi usado';
COMMENT ON COLUMN public.coupons.expiration_date IS 'Data de expiração (NULL = sem expiração)';
COMMENT ON COLUMN public.coupons.is_active IS 'Se o cupom está ativo';

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================
