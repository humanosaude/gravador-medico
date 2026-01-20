# 🎯 GUIA DE EXECUÇÃO - ADICIONAR CHECKOUT + CRM

## ✅ O que você já tem (FUNCIONANDO)
- `customers`
- `products`
- `sales`
- `sales_items`
- `sales_by_day` (view)

---

## 🚀 PRÓXIMO PASSO: Adicionar Checkout + CRM

### 1️⃣ Execute o Script Incremental

**Arquivo:** `database/04-add-checkout-crm-tables.sql`

**Como executar:**
1. Abra o Supabase SQL Editor
2. Copie **TODO** o conteúdo do arquivo `04-add-checkout-crm-tables.sql`
3. Cole no editor
4. Clique em **RUN**

### 2️⃣ O que será criado

**4 Novas Tabelas:**
- ✅ `checkout_attempts` - Rastreia tentativas de checkout (PIX, Cartão, Boleto)
- ✅ `recovery_attempts` - Tentativas de recuperação (WhatsApp, Email, SMS)
- ✅ `crm_contacts` - Contatos do CRM (Leads e Clientes)
- ✅ `crm_activities` - Atividades do CRM (Calls, Emails, Meetings, Tasks)

**3 Novas Views:**
- ✅ `abandoned_carts_summary` - Resumo de carrinhos abandonados
- ✅ `crm_funnel_summary` - Funil de vendas CRM
- ✅ `recovery_performance_by_channel` - Performance de recuperação por canal

---

## 🔍 Verificar Instalação

Após executar, rode esta query no Supabase:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

**Você deve ver 8 tabelas:**
1. checkout_attempts ✅
2. crm_activities ✅
3. crm_contacts ✅
4. customers ✅
5. products ✅
6. recovery_attempts ✅
7. sales ✅
8. sales_items ✅

---

## 📊 Testar as Views

```sql
-- Carrinhos abandonados (ainda vazio)
SELECT * FROM abandoned_carts_summary;

-- Funil CRM (ainda vazio)
SELECT * FROM crm_funnel_summary;

-- Performance de recuperação (ainda vazio)
SELECT * FROM recovery_performance_by_channel;
```

---

## 💡 CASOS DE USO

### Checkout Attempts
- **Quando usar:** Capturar checkout iniciado mas não finalizado
- **Exemplo:** Usuário gerou PIX mas não pagou
- **Recuperação:** Enviar WhatsApp com link de pagamento

### Recovery Attempts
- **Quando usar:** Tentar recuperar carrinho abandonado
- **Canais:** Email, WhatsApp, SMS
- **Tracking:** Entregue → Lido → Clicado → Convertido

### CRM Contacts
- **Quando usar:** Gestão de leads e clientes
- **Funil:** Lead → Contato → Qualificação → Proposta → Negociação → Ganho/Perdido
- **Lead Score:** Pontuação automática do lead (0-100)

### CRM Activities
- **Quando usar:** Registrar interações com leads/clientes
- **Tipos:** Ligação, Email, Reunião, Tarefa, WhatsApp
- **Tracking:** Pendente → Concluído → Cancelado

---

## ⚠️ IMPORTANTE

- ✅ **SEGURO:** Script usa `CREATE TABLE IF NOT EXISTS` - não recria tabelas existentes
- ✅ **IDEMPOTENTE:** Pode executar múltiplas vezes sem erros
- ✅ **INCREMENTAL:** Adiciona apenas o que falta

---

## 🎉 APÓS EXECUTAR

Me avise que executou e vou te mostrar:
1. ✅ Como integrar com Webhook (capturar checkout abandonado)
2. ✅ Como criar recuperação automática de PIX
3. ✅ Como usar o CRM no Dashboard
4. ✅ Views prontas para relatórios

---

**Dúvidas?** Me chama que te ajudo! 🚀
