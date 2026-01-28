-- =============================================
-- 🔍 BUSCAR LOGS DE CHECKOUT - ANÁLISE COMPLETA
-- =============================================
-- Execute estas queries no Supabase SQL Editor
-- =============================================

-- 1️⃣ VER TODOS OS LOGS (últimos 20)
SELECT 
  created_at::timestamp(0) as hora,
  gateway,
  status,
  order_id,
  http_status,
  error_message
FROM checkout_logs
ORDER BY created_at DESC
LIMIT 20;


-- 2️⃣ VER ÚLTIMO ERRO COMPLETO
SELECT 
  created_at,
  gateway,
  status,
  order_id,
  http_status,
  error_message,
  error_cause,
  payload_sent,
  error_response
FROM checkout_logs
WHERE status = 'ERROR'
ORDER BY created_at DESC
LIMIT 1;


-- 3️⃣ ERROS 402 DO MERCADO PAGO (ANÁLISE DETALHADA)
SELECT 
  created_at,
  order_id,
  payload_sent->>'transaction_amount' as valor,
  payload_sent->>'payer_email' as email,
  payload_sent->>'payer_cpf' as cpf,
  payload_sent->>'has_token' as tem_token,
  error_response->>'status' as status_mp,
  error_response->>'status_detail' as detalhe,
  error_response->>'message' as mensagem,
  error_response->'cause' as causa,
  payload_sent,
  error_response
FROM checkout_logs
WHERE gateway = 'mercadopago'
  AND http_status = 402
ORDER BY created_at DESC;


-- 4️⃣ COMPARAR SUCESSO VS ERRO (Mercado Pago)
-- Sucessos
SELECT 
  'SUCESSO' as tipo,
  created_at,
  order_id,
  payload_sent->>'transaction_amount' as valor,
  payload_sent->>'payer_email' as email,
  response_data->>'id' as payment_id,
  response_data->>'status' as status_mp
FROM checkout_logs
WHERE gateway = 'mercadopago'
  AND status = 'SUCCESS'
ORDER BY created_at DESC
LIMIT 3;

-- Erros
SELECT 
  'ERRO' as tipo,
  created_at,
  order_id,
  payload_sent->>'transaction_amount' as valor,
  payload_sent->>'payer_email' as email,
  error_response->>'status_detail' as motivo,
  error_message
FROM checkout_logs
WHERE gateway = 'mercadopago'
  AND status = 'ERROR'
ORDER BY created_at DESC
LIMIT 3;


-- 5️⃣ ESTATÍSTICAS
SELECT 
  gateway,
  status,
  COUNT(*) as total,
  ROUND(COUNT(*)::decimal / SUM(COUNT(*)) OVER () * 100, 2) || '%' as percentual
FROM checkout_logs
GROUP BY gateway, status
ORDER BY gateway, status;


-- 6️⃣ TIMELINE DE TENTATIVAS (últimas 24h)
SELECT 
  created_at::timestamp(0) as hora,
  gateway,
  status,
  CASE 
    WHEN status = 'SUCCESS' THEN '✅'
    WHEN status = 'ERROR' THEN '❌'
    ELSE '🔄'
  END as emoji,
  order_id,
  COALESCE(error_message, 'OK') as resultado
FROM checkout_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;


-- 7️⃣ ANÁLISE DE ERROS MAIS COMUNS
SELECT 
  gateway,
  error_message,
  http_status,
  COUNT(*) as ocorrencias
FROM checkout_logs
WHERE status = 'ERROR'
GROUP BY gateway, error_message, http_status
ORDER BY ocorrencias DESC;


-- 8️⃣ VER PAYLOAD COMPLETO DO ÚLTIMO ERRO 402
SELECT 
  '========== ÚLTIMO ERRO 402 ==========' as titulo,
  created_at,
  order_id,
  jsonb_pretty(payload_sent) as "📦 PAYLOAD ENVIADO",
  jsonb_pretty(error_response) as "❌ RESPOSTA DE ERRO"
FROM checkout_logs
WHERE http_status = 402
ORDER BY created_at DESC
LIMIT 1;
