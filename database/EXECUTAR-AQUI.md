# 🚀 EXECUTAR NO SUPABASE - ORDEM CORRETA

## ⚠️ IMPORTANTE: Execute na ORDEM exata abaixo!

---

## PASSO 1: Executar Schema Completo (OBRIGATÓRIO)

**Arquivo:** `database/01-schema-completo.sql`

**O que faz:**
- Cria tabelas: customers, products, sales_items, crm_contacts, crm_activities
- Cria 5 views analíticas
- Cria triggers e funções
- Configura RLS (segurança)

**Como executar:**
1. Abrir Supabase → SQL Editor
2. Copiar TODO o conteúdo de `database/01-schema-completo.sql`
3. Colar no SQL Editor
4. Clicar em **RUN** (ou Ctrl+Enter)

**Resultado esperado:**
```
Success. No rows returned
```

---

## PASSO 2: Migração da Tabela Sales (SOMENTE DEPOIS DO PASSO 1)

**Arquivo:** `database/02-migration-sales-customer-id.sql`

**O que faz:**
- Adiciona coluna `customer_id` na tabela sales existente
- Cria índice para performance
- Adiciona colunas extras (shipping_cost, tax, etc)

**Como executar:**
1. Supabase → SQL Editor (nova aba)
2. Copiar conteúdo de `database/02-migration-sales-customer-id.sql`
3. Colar e clicar em **RUN**

**Resultado esperado:**
```
Success. No rows returned
```

---

## PASSO 3: Popular Dados Históricos (SOMENTE DEPOIS DO PASSO 2)

**Arquivo:** `database/03-popular-dados-historicos.sql`

**O que faz:**
- Migra clientes existentes da tabela sales → customers
- Migra produtos existentes → products
- Cria sales_items a partir das vendas
- Cria contatos CRM automaticamente
- Atualiza métricas (total_orders, total_spent, etc)

**Como executar:**
1. Supabase → SQL Editor (nova aba)
2. Copiar conteúdo de `database/03-popular-dados-historicos.sql`
3. Colar e clicar em **RUN**

**Resultado esperado:**
```
Query 1: Success - X clientes criados
Query 2: Success - Y produtos criados
Query 3: Success - Z vendas vinculadas
...
```

---

## ✅ VERIFICAÇÃO FINAL

Execute no SQL Editor para verificar se tudo funcionou:

```sql
-- 1. Verificar tabelas criadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Deve retornar:
-- crm_activities
-- crm_contacts
-- customers
-- products
-- sales
-- sales_items
-- sessions
-- users

-- 2. Verificar views criadas
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Deve retornar:
-- crm_funnel_summary
-- customer_sales_summary
-- product_sales_summary
-- sales_by_day
-- sales_by_source

-- 3. Verificar dados migrados
SELECT 
  (SELECT COUNT(*) FROM customers) AS total_customers,
  (SELECT COUNT(*) FROM products) AS total_products,
  (SELECT COUNT(*) FROM sales WHERE customer_id IS NOT NULL) AS sales_vinculadas,
  (SELECT COUNT(*) FROM sales_items) AS total_items,
  (SELECT COUNT(*) FROM crm_contacts) AS total_crm_contacts;

-- 4. Ver top 5 clientes
SELECT name, email, total_orders, total_spent 
FROM customer_sales_summary 
ORDER BY total_spent DESC 
LIMIT 5;

-- 5. Ver top 5 produtos
SELECT name, sku, total_orders, total_revenue 
FROM product_sales_summary 
ORDER BY total_revenue DESC 
LIMIT 5;
```

---

## 🐛 RESOLUÇÃO DE ERROS COMUNS

### Erro: "relation customers does not exist"
**Causa:** Você pulou o Passo 1
**Solução:** Execute `01-schema-completo.sql` PRIMEIRO

### Erro: "column customer_id does not exist"
**Causa:** Você pulou o Passo 2
**Solução:** Execute `02-migration-sales-customer-id.sql`

### Erro: "duplicate key violates unique constraint"
**Causa:** Você já executou o script antes
**Solução:** Normal! Significa que os dados já existem

---

## 🎯 ORDEM DE EXECUÇÃO (RESUMO)

```
1️⃣ 01-schema-completo.sql          ← CRIA TUDO (tabelas + views)
        ↓
2️⃣ 02-migration-sales-customer-id.sql  ← ADICIONA customer_id
        ↓
3️⃣ 03-popular-dados-historicos.sql     ← MIGRA DADOS ANTIGOS
        ↓
✅ PRONTO! Agora o dashboard funciona 100%
```

---

## 📝 APÓS EXECUTAR OS 3 PASSOS

O dashboard estará 100% funcional:

- ✅ `/admin/customers` - mostrando clientes da view
- ✅ `/admin/products` - mostrando produtos da view
- ✅ `/admin/sales` - vendas vinculadas a clientes
- ✅ `/admin/crm` - funil de vendas (precisa pequeno ajuste UI)
- ✅ `/admin/reports` - relatórios com gráficos (precisa pequeno ajuste UI)

---

## 🧪 TESTAR WEBHOOK (DEPOIS DOS 3 PASSOS)

Acesse seu terminal e execute:

```bash
curl -X POST https://gravadormedico.vercel.app/api/webhook/appmax \
  -H "Content-Type: application/json" \
  -d '{
    "transaction": "approved",
    "customer": {
      "id": "TEST-FINAL",
      "name": "Teste Sincronização",
      "email": "teste@exemplo.com",
      "phone": "11999999999"
    },
    "products": [{
      "id": "PROD-001",
      "sku": "VP-PRO-2025",
      "name": "VoicePen PRO",
      "price": 297.00,
      "quantity": 1
    }],
    "total": 297.00,
    "order_id": "TEST-WEBHOOK-001"
  }'
```

Depois verifique no Supabase:

```sql
SELECT * FROM customers WHERE email = 'teste@exemplo.com';
SELECT * FROM products WHERE sku = 'VP-PRO-2025';
SELECT * FROM sales WHERE appmax_order_id = 'TEST-WEBHOOK-001';
```

---

🔥 **Execute os 3 passos na ordem e tudo vai funcionar!**
