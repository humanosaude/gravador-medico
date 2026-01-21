# ✅ CHECKLIST: Executar SQL no Supabase (Passo a Passo)

## 📋 Copie este SQL e Execute no Supabase:

```sql
-- =============================================
-- SCRIPT COMPLETO: Limpar + Atualizar Carrinhos
-- =============================================
-- Cole TUDO no SQL Editor do Supabase e clique RUN
-- =============================================

-- 🗑️ PARTE 1: LIMPAR DADOS DE TESTE
DELETE FROM public.abandoned_carts
WHERE customer_email LIKE 'teste%@example.com'
   OR customer_email LIKE 'carrinho_%@temp.local';

DELETE FROM public.sales
WHERE customer_email LIKE 'teste%@example.com'
   OR customer_name LIKE 'Cliente Teste%';

DELETE FROM public.customers
WHERE email LIKE 'teste%@example.com'
   OR name LIKE 'Cliente Teste%';

-- ✅ PARTE 2: ADICIONAR COLUNAS NECESSÁRIAS
ALTER TABLE public.abandoned_carts 
ADD COLUMN IF NOT EXISTS customer_cpf TEXT,
ADD COLUMN IF NOT EXISTS step TEXT,
ADD COLUMN IF NOT EXISTS product_id TEXT,
ADD COLUMN IF NOT EXISTS order_bumps JSONB,
ADD COLUMN IF NOT EXISTS discount_code TEXT,
ADD COLUMN IF NOT EXISTS cart_value NUMERIC;

-- ✅ PARTE 3: ATUALIZAR CONSTRAINT DE STATUS
ALTER TABLE public.abandoned_carts 
DROP CONSTRAINT IF EXISTS abandoned_carts_status_check;

ALTER TABLE public.abandoned_carts 
ADD CONSTRAINT abandoned_carts_status_check 
CHECK (status IN ('abandoned', 'recovered', 'expired', 'form_filled', 'payment_started'));

-- ✅ PARTE 4: CRIAR ÍNDICES
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_cpf ON public.abandoned_carts(customer_cpf);
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_step ON public.abandoned_carts(step);
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_product ON public.abandoned_carts(product_id);
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_cart_value ON public.abandoned_carts(cart_value);

-- ✅ PARTE 5: VERIFICAÇÃO FINAL
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'abandoned_carts'
ORDER BY ordinal_position;
```

---

## 🎯 PASSO A PASSO (COM IMAGENS MENTAIS):

### **1️⃣ Acesse o Supabase:**
```
1. Abra navegador
2. Vá para: https://supabase.com/dashboard
3. Faça login
4. Selecione seu projeto: "gravador-medico" (ou similar)
```

### **2️⃣ Abra o SQL Editor:**
```
No menu lateral ESQUERDO:
┌─────────────────────┐
│ 🏠 Home             │
│ 📊 Table Editor     │
│ 🔧 SQL Editor    ← CLIQUE AQUI
│ 📝 Database         │
│ 🔐 Authentication   │
└─────────────────────┘
```

### **3️⃣ Cole o SQL:**
```
1. Clique em "+ New query" (botão verde, canto superior direito)
2. Apague qualquer código que aparecer
3. COLE todo o SQL acima (do PARTE 1 ao PARTE 5)
4. Clique no botão "RUN" ▶️ (canto inferior direito)
```

### **4️⃣ Aguarde a Execução:**
```
Você verá mensagens tipo:
✅ Success. No rows returned
✅ Rows updated: X
✅ Table structure returned
```

### **5️⃣ Verifique os Resultados:**
```
Role até o final dos resultados.
Deve aparecer uma tabela mostrando as colunas:

column_name       | data_type | is_nullable
------------------|-----------|--------------
id                | uuid      | NO
customer_email    | text      | NO
customer_name     | text      | YES
customer_phone    | text      | YES
customer_cpf      | text      | YES  ← NOVA
step              | text      | YES  ← NOVA
product_id        | text      | YES  ← NOVA
order_bumps       | jsonb     | YES  ← NOVA
discount_code     | text      | YES  ← NOVA
cart_value        | numeric   | YES  ← NOVA
...
```

---

## ❓ Se Der Erro:

### **Erro: "column already exists"**
```
✅ Isso é NORMAL! Significa que a coluna já existe.
   O script usa IF NOT EXISTS, então pode executar sem medo.
```

### **Erro: "constraint already exists"**
```
✅ Normal! Execute mesmo assim, ele vai substituir.
```

### **Erro: "permission denied"**
```
❌ Você não tem permissão de admin.
   Solução: Use a conta de admin do Supabase.
```

---

## 🧪 TESTAR DEPOIS:

### **1. Teste no Checkout:**
```bash
# No navegador:
http://localhost:3000/checkout

# Preencha SÓ O NOME:
Nome: João Teste

# Clique FORA do campo (Tab ou outro campo)

# Abra Console (F12):
💾 Salvando carrinho abandonado...
✅ Carrinho abandonado salvo: <uuid>
```

### **2. Verificar no Supabase:**
```sql
-- Cole isso no SQL Editor:
SELECT * FROM abandoned_carts 
WHERE customer_email LIKE 'carrinho_%@temp.local'
ORDER BY created_at DESC;

-- Deve mostrar 1 registro com:
-- customer_name: "João Teste"
-- customer_email: "carrinho_session_...@temp.local"
```

### **3. Verificar na Dashboard:**
```
http://localhost:3000/admin/dashboard

Card "Carrinhos Abandonados" deve mostrar: 1
```

---

## 📸 PRINTSCREEN DO RESULTADO ESPERADO:

Após executar o SQL, você deve ver algo assim no Supabase:

```
Results

 column_name       | data_type | is_nullable 
-------------------|-----------|-------------
 id                | uuid      | NO
 customer_email    | text      | NO
 customer_name     | text      | YES
 customer_phone    | text      | YES
 items             | jsonb     | YES
 total_amount      | numeric   | YES
 status            | text      | YES
 recovery_link     | text      | YES
 session_id        | text      | YES
 source            | text      | YES
 utm_campaign      | text      | YES
 utm_medium        | text      | YES
 utm_source        | text      | YES
 customer_cpf      | text      | YES    ← ✅ NOVA
 step              | text      | YES    ← ✅ NOVA
 product_id        | text      | YES    ← ✅ NOVA
 order_bumps       | jsonb     | YES    ← ✅ NOVA
 discount_code     | text      | YES    ← ✅ NOVA
 cart_value        | numeric   | YES    ← ✅ NOVA
 created_at        | timestamp | YES
 updated_at        | timestamp | YES

(18 rows)
```

---

## ⏱️ Tempo Estimado:
- **Copiar SQL:** 10 segundos
- **Abrir Supabase:** 30 segundos  
- **Executar SQL:** 5 segundos
- **Verificar:** 15 segundos

**TOTAL: ~1 minuto** ⚡

---

## 🆘 Precisa de Ajuda?

Se tiver **qualquer erro**, me mande:
1. **Print da mensagem de erro**
2. **Qual PARTE deu erro** (1, 2, 3, 4 ou 5)
3. Eu ajusto o SQL e te mando a versão corrigida!

---

**Pronto para copiar e colar?** 📋✨
