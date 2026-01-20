-- Verificar TODAS as vendas no banco
SELECT 
  id,
  appmax_order_id,
  customer_name,
  total_amount,
  status,
  created_at
FROM sales
ORDER BY created_at DESC
LIMIT 20;

-- Contar vendas por tipo
SELECT 
  CASE 
    WHEN appmax_order_id LIKE 'TEST-%' THEN 'Test Data'
    ELSE 'Real Data'
  END as tipo,
  COUNT(*) as quantidade,
  SUM(total_amount) as total_value
FROM sales
GROUP BY tipo;
