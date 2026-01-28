-- =============================================
-- CONSULTAR LOGS DE CHECKOUT
-- =============================================

-- 1. Ver todos os logs (mais recentes primeiro)
SELECT 
  created_at,
  order_id,
  gateway,
  status,
  error_message,
  http_status
FROM checkout_logs
ORDER BY created_at DESC
LIMIT 20;

-- 2. Ver payload e resposta completos do último erro
SELECT 
  created_at,
  order_id,
  gateway,
  status,
  payload_sent,
  error_response,
  error_message,
  error_cause,
  http_status
FROM checkout_logs
WHERE status = 'ERROR'
ORDER BY created_at DESC
LIMIT 1;

-- 3. Ver erros 402 do Mercado Pago
SELECT 
  created_at,
  order_id,
  payload_sent->>'transaction_amount' as valor,
  payload_sent->>'payer_email' as email,
  error_response,
  error_message
FROM checkout_logs
WHERE gateway = 'mercadopago'
  AND http_status = 402
ORDER BY created_at DESC;

-- 4. Comparar sucesso vs erro (ver diferença no payload)
SELECT 
  status,
  payload_sent,
  response_data,
  error_response
FROM checkout_logs
WHERE gateway = 'mercadopago'
ORDER BY created_at DESC
LIMIT 5;

-- 5. Taxa de sucesso por gateway (últimos 7 dias)
SELECT 
  gateway,
  status,
  COUNT(*) as total,
  ROUND(COUNT(*)::decimal / SUM(COUNT(*)) OVER (PARTITION BY gateway) * 100, 2) as percentual
FROM checkout_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY gateway, status
ORDER BY gateway, status;
