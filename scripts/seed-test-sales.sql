-- Script para inserir vendas de teste no Supabase
-- Execute no SQL Editor do Supabase: https://supabase.com/dashboard/project/egsmraszqnmosmtjuzhx/sql

-- Limpar dados de teste anteriores (opcional)
DELETE FROM sales WHERE appmax_order_id LIKE 'TEST-%';

-- Inserir 5 vendas de teste (últimos 7 dias)
INSERT INTO sales (
  appmax_order_id,
  customer_name,
  customer_email,
  customer_phone,
  subtotal,
  total_amount,
  discount,
  status,
  payment_method,
  created_at
) VALUES
  ('TEST-001', 'João Silva', 'joao@email.com', '21999999999', 36.00, 36.00, 0, 'approved', 'credit_card', NOW() - INTERVAL '1 day'),
  ('TEST-002', 'Maria Santos', 'maria@email.com', '21988888888', 36.00, 36.00, 0, 'approved', 'pix', NOW() - INTERVAL '2 days'),
  ('TEST-003', 'Pedro Costa', 'pedro@email.com', '21977777777', 36.00, 36.00, 0, 'approved', 'credit_card', NOW() - INTERVAL '3 days'),
  ('TEST-004', 'Ana Oliveira', 'ana@email.com', '21966666666', 36.00, 36.00, 0, 'pending', 'boleto', NOW() - INTERVAL '4 days'),
  ('TEST-005', 'Carlos Pereira', 'carlos@email.com', '21955555555', 36.00, 36.00, 0, 'approved', 'credit_card', NOW() - INTERVAL '5 days')
ON CONFLICT (appmax_order_id) DO NOTHING;


-- Verificar inserção
SELECT 
  appmax_order_id,
  customer_name,
  status,
  total_amount,
  created_at
FROM sales 
WHERE appmax_order_id LIKE 'TEST-%'
ORDER BY created_at DESC;
