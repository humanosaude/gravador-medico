-- ================================================================
-- CORREÇÃO AUTOMÁTICA: Marcar mensagens enviadas como from_me=true
-- ================================================================
-- Baseado nos logs e IDs reais do banco
-- ================================================================

-- 1. Ver situação ANTES
SELECT 
  '⚠️ ANTES DA CORREÇÃO' as status,
  from_me,
  COUNT(*) as total,
  STRING_AGG(DISTINCT LEFT(message_id, 4), ', ') as prefixos_ids
FROM whatsapp_messages
GROUP BY from_me
ORDER BY from_me DESC;

-- 2. CORREÇÃO PRINCIPAL - IDs que começam com esses padrões são ENVIADOS
UPDATE whatsapp_messages
SET from_me = true
WHERE from_me = false
  AND message_id IS NOT NULL
  AND (
    -- Padrões identificados nos logs
    message_id LIKE '3EB%'   -- Mensagens enviadas
    OR message_id LIKE 'BAE%'   -- Mensagens enviadas
    OR message_id LIKE '3EE%'   -- Mensagens enviadas  
    OR message_id LIKE '3EF%'   -- Mensagens enviadas
    OR message_id LIKE '3A%'    -- Mensagens enviadas
    OR message_id LIKE '2551%'  -- Mensagens enviadas (automation)
  );

-- 3. Ver situação DEPOIS
SELECT 
  '✅ DEPOIS DA CORREÇÃO' as status,
  from_me,
  COUNT(*) as total,
  STRING_AGG(DISTINCT LEFT(message_id, 4), ', ') as prefixos_ids
FROM whatsapp_messages
GROUP BY from_me
ORDER BY from_me DESC;

-- 4. Ver últimas 30 mensagens corrigidas
SELECT 
  LEFT(message_id, 20) as msg_id,
  LEFT(content, 40) as conteudo,
  from_me,
  to_char(timestamp, 'DD/MM HH24:MI') as quando
FROM whatsapp_messages
ORDER BY timestamp DESC
LIMIT 30;

-- 5. Verificar se há algum padrão não corrigido
SELECT 
  '🔍 IDs que ainda estão com from_me=false:' as analise,
  LEFT(message_id, 4) as prefixo,
  COUNT(*) as total,
  STRING_AGG(LEFT(content, 30), ' | ') as exemplos
FROM whatsapp_messages
WHERE from_me = false
  AND message_id IS NOT NULL
GROUP BY LEFT(message_id, 4)
ORDER BY total DESC;
