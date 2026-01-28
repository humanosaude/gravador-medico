-- ================================================================
-- FIX: Corrigir push_name "Assistente Virtual" incorreto
-- ================================================================
-- Problema: Quando você envia mensagens, o webhook estava salvando
-- o seu nome ("Assistente Virtual") como push_name do cliente
-- 
-- Solução: Limpar os push_names incorretos para que o sistema
-- exiba o número formatado até receber uma nova mensagem DO cliente
-- ================================================================

-- 1. Ver quantos contatos estão afetados
SELECT 
  COUNT(*) as total_afetados,
  COUNT(DISTINCT remote_jid) as contatos_unicos
FROM whatsapp_contacts
WHERE push_name = 'Assistente Virtual';

-- 2. ATUALIZAR: Limpar o push_name incorreto
-- Colocando NULL para que o sistema exiba o número formatado
UPDATE whatsapp_contacts
SET 
  push_name = NULL,
  updated_at = NOW()
WHERE push_name = 'Assistente Virtual';

-- 3. Verificar resultado
SELECT 
  remote_jid,
  name,
  push_name,
  last_message_timestamp
FROM whatsapp_contacts
ORDER BY last_message_timestamp DESC
LIMIT 20;

-- ================================================================
-- NOTA: Após executar este SQL, o sistema irá:
-- 1. Exibir o número formatado (ex: (21) 98896-0217) para esses contatos
-- 2. Quando o cliente enviar uma NOVA mensagem, o nome real dele
--    será capturado e salvo corretamente
-- ================================================================
