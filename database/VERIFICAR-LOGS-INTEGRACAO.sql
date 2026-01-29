-- =============================================
-- VERIFICAR LOGS DE INTEGRAÇÃO
-- =============================================
-- Para ver se o usuário foi criado no Lovable
-- =============================================

-- 1️⃣ VER ESTRUTURA DA TABELA INTEGRATION_LOGS
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'integration_logs';

-- 2️⃣ VER TODOS OS LOGS RECENTES (últimos 20)
SELECT * FROM public.integration_logs
ORDER BY created_at DESC
LIMIT 20;

-- 3️⃣ VER STATUS ATUAL DA FILA DE PROVISIONING
SELECT 
    pq.id,
    pq.sale_id,
    pq.status as queue_status,
    pq.retry_count,
    pq.last_error,
    pq.completed_at,
    pq.created_at
FROM public.provisioning_queue pq
ORDER BY pq.created_at DESC
LIMIT 20;
