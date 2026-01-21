# 🛒 Como Corrigir Carrinhos Abandonados

## 📋 Diagnóstico do Problema

Com base nos logs, os **carrinhos abandonados não estão sendo exibidos** porque:

1. ❌ A tabela `abandoned_carts` provavelmente **não existe** no Supabase
2. ❌ Ou está **vazia** (sem dados)
3. ✅ O código já está preparado com debug logs

---

## 🔧 Solução em 3 Passos

### **PASSO 1: Executar SQL no Supabase**

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Clique em **SQL Editor** (menu lateral esquerdo)
4. Cole o conteúdo completo do arquivo: `database/CORRECAO-FINAL-DASHBOARD.sql`
5. Clique em **RUN** (▶️)

**O que este SQL faz:**
- ✅ Cria a tabela `abandoned_carts` (se não existir)
- ✅ Cria a tabela `analytics_visits` (se não existir)
- ✅ Cria views: `customer_sales_summary`, `abandoned_carts_summary`, `sales_by_day`
- ✅ Adiciona índices para performance
- ✅ Configura RLS (Row Level Security)
- ✅ Insere 5 registros de teste em `abandoned_carts`

---

### **PASSO 2: Verificar no Console do Navegador**

1. Abra o navegador em: http://localhost:3000/admin/dashboard
2. Abra o **DevTools** (F12 ou Cmd+Option+I)
3. Vá para a aba **Console**
4. Recarregue a página (Cmd+R ou F5)
5. Procure pelos logs:

```
🛒 Buscando carrinhos abandonados...
🛒 Carrinhos encontrados: X
🛒 Dados dos carrinhos: [...]
```

**Possíveis resultados:**

#### ✅ **SUCESSO** - Se aparecer:
```
🛒 Carrinhos encontrados: 5
🛒 Dados dos carrinhos: [{ id: '...', status: 'abandoned', ... }]
```
→ **Funcionou!** Os carrinhos serão exibidos no card.

#### ❌ **ERRO** - Se aparecer:
```
❌ Erro ao buscar carrinhos: relation "public.abandoned_carts" does not exist
```
→ Execute o PASSO 1 novamente (SQL não foi executado corretamente)

#### ⚠️ **VAZIO** - Se aparecer:
```
🛒 Carrinhos encontrados: 0
🛒 Dados dos carrinhos: []
```
→ Tabela existe mas está vazia. Execute a parte de INSERT do SQL.

---

### **PASSO 3: Verificar o Card na Dashboard**

Após executar o SQL, o card **"Carrinhos Abandonados"** deve mostrar:

```
┌──────────────────────────────┐
│ 🛒 Carrinhos Abandonados     │
│                              │
│        5                     │
│                              │
└──────────────────────────────┘
```

---

## 🔍 Verificação Adicional (Opcional)

Para verificar se os dados foram criados corretamente, execute este SQL no Supabase:

```sql
-- Ver todos os carrinhos abandonados
SELECT * FROM abandoned_carts ORDER BY created_at DESC;

-- Contar por status
SELECT status, COUNT(*) as total 
FROM abandoned_carts 
GROUP BY status;

-- Ver a view summary
SELECT * FROM abandoned_carts_summary;
```

---

## 📊 Estrutura da Tabela `abandoned_carts`

```sql
id               UUID (PK)
customer_email   TEXT
customer_name    TEXT
customer_phone   TEXT
items            JSONB
total_amount     NUMERIC
status           TEXT ('abandoned', 'recovered', 'expired')
recovery_link    TEXT
session_id       TEXT
source           TEXT
utm_campaign     TEXT
utm_medium       TEXT
utm_source       TEXT
created_at       TIMESTAMPTZ
updated_at       TIMESTAMPTZ
```

---

## ❓ Problemas Comuns

### 1. "Tabela já existe" no SQL
**Solução:** O script usa `CREATE TABLE IF NOT EXISTS`, pode executar sem medo.

### 2. "Permission denied"
**Solução:** Verifique se está usando uma conta admin no Supabase.

### 3. Card ainda mostra "0"
**Solução:** 
- Limpe o cache do navegador (Cmd+Shift+R)
- Verifique se o filtro de data está correto
- Os dados de teste têm `created_at` atual, devem aparecer

---

## 🎯 Próximos Passos (Após Corrigir)

Depois que os carrinhos abandonados estiverem funcionando:

1. ✅ Remover console.logs de debug
2. ✅ Testar com diferentes filtros de data
3. ✅ Verificar integração com analytics real
4. ✅ Deploy para produção

---

## 📝 Notas

- Os **5 registros de teste** são criados automaticamente pelo SQL
- Todos têm `status = 'abandoned'` exceto 1 que é `'recovered'`
- O card filtra apenas por `status = 'abandoned'`
- O filtro de data usa o período selecionado na dashboard (padrão: últimos 30 dias)

---

**👨‍💻 Criado por:** Sistema de Dashboard - Gravador Médico
**📅 Data:** 20 de janeiro de 2026
