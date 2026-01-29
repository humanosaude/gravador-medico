-- =============================================
-- 🔧 CORRIGIR NOMES "GRAVADOR MEDICO" NO WHATSAPP
-- =============================================
-- Execute este SQL no Supabase para limpar nomes incorretos
-- =============================================

-- 1️⃣ Ver quantos contatos têm o nome incorreto
SELECT 
    remote_jid,
    push_name,
    name,
    profile_picture_url IS NOT NULL as has_photo
FROM whatsapp_contacts
WHERE push_name ILIKE '%gravador%'
   OR push_name ILIKE '%assistente%'
   OR name ILIKE '%gravador%';

-- 2️⃣ LIMPAR push_name incorreto (coloca NULL para forçar mostrar número)
UPDATE whatsapp_contacts
SET push_name = NULL
WHERE push_name ILIKE '%gravador%'
   OR push_name ILIKE '%assistente%';

-- 3️⃣ LIMPAR name incorreto também (se existir)
UPDATE whatsapp_contacts
SET name = NULL
WHERE name ILIKE '%gravador%';

-- 4️⃣ Verificar resultado
SELECT 
    remote_jid,
    push_name,
    name
FROM whatsapp_contacts
ORDER BY updated_at DESC
LIMIT 20;
