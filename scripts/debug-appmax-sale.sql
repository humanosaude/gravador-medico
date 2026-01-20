-- Verificar EXATAMENTE como está a venda real da Appmax
SELECT 
  appmax_order_id,
  customer_name,
  customer_email,
  total_amount,
  subtotal,
  status,
  payment_method,
  created_at,
  updated_at,
  -- Verificar se está dentro dos últimos 7 dias
  CASE 
    WHEN created_at >= NOW() - INTERVAL '7 days' THEN 'Dentro do período'
    ELSE 'Fora do período'
  END as filtro_7_dias
FROM sales
WHERE appmax_order_id NOT LIKE 'TEST-%'
ORDER BY created_at DESC;
