# ✅ MUDANÇAS APLICADAS: Carrinhos Abandonados com Dados Parciais

## 🎯 O que mudou:

### **ANTES:** 
- ❌ Só salvava carrinho se tivesse **email completo** (mínimo 5 caracteres)
- ❌ Não capturava dados parciais (usuário que preenche só nome ou telefone)

### **AGORA:**
- ✅ Salva carrinho com **QUALQUER campo preenchido** (nome, email, telefone ou CPF)
- ✅ Captura dados parciais progressivamente
- ✅ Se usuário preencher só NOME e sair → salva
- ✅ Se depois voltar e adicionar EMAIL → atualiza o mesmo carrinho
- ✅ Rastreamento por `session_id` (não perde dados mesmo sem email)

---

## 📝 Mudanças nos Arquivos:

### 1️⃣ **`app/checkout/page.tsx`**

#### handleSaveAbandonedCart():
```typescript
// ANTES:
if (!formData.email || formData.email.length < 5) return

// AGORA:
const hasAnyData = formData.name || formData.email || formData.phone || formData.cpf
if (!hasAnyData) return

// Se não tiver email, usa temporário baseado na sessão
const sessionId = sessionStorage.getItem('session_id') || `session_${Date.now()}`
const emailToSave = formData.email || `carrinho_${sessionId}@temp.local`
```

#### Campos com onBlur (salvamento automático):
```typescript
✅ Nome     → onBlur={handleSaveAbandonedCart}
✅ Email    → onBlur={handleSaveAbandonedCart}
✅ Telefone → onBlur={handleSaveAbandonedCart}
✅ CPF      → onBlur={handleSaveAbandonedCart}
```

---

### 2️⃣ **`lib/abandonedCart.ts`**

#### Busca por session_id (prioridade):
```typescript
// ANTES: Buscava por email OU session
.or(`customer_email.eq.${data.customer_email},session_id.eq.${sessionId}`)

// AGORA: Busca SEMPRE por session_id (permite dados parciais)
.eq('session_id', sessionId)
```

#### Session_id persistente:
```typescript
// Garante que session_id seja salvo no sessionStorage
if (!sessionStorage.getItem('session_id')) {
  sessionStorage.setItem('session_id', sessionId)
}
```

---

## 🗄️ Banco de Dados (SQL a executar):

### Novas Colunas:
```sql
customer_cpf     TEXT
step             TEXT
product_id       TEXT
order_bumps      JSONB
discount_code    TEXT
cart_value       NUMERIC
```

### Índices para Performance:
```sql
idx_abandoned_carts_cpf
idx_abandoned_carts_step
idx_abandoned_carts_product
idx_abandoned_carts_cart_value
```

---

## 🧪 Como Testar:

### Teste 1: Só Nome
1. Abra http://localhost:3000/checkout
2. Digite **só o nome**: "João Silva"
3. Clique fora do campo
4. Console deve mostrar: `💾 Salvando carrinho abandonado...`
5. **Feche a aba**
6. Dashboard deve mostrar: **1 carrinho abandonado**

### Teste 2: Nome + Email
1. Abra checkout novamente (MESMA SESSÃO)
2. Preencha nome: "João Silva"
3. Preencha email: "joao@teste.com"
4. Clique fora
5. Console: `✅ Carrinho atualizado: <uuid>`
6. **Feche a aba**
7. Dashboard ainda mostra: **1 carrinho** (mesmo registro atualizado)

### Teste 3: Só Telefone
1. Nova aba anônima
2. Preencha só telefone: "(11) 99999-9999"
3. Clique fora
4. Console: `💾 Salvando carrinho abandonado...`
5. Feche
6. Dashboard: **2 carrinhos**

---

## 🔍 Verificar no Supabase:

```sql
-- Ver carrinhos com dados parciais
SELECT 
    customer_name,
    customer_email,
    customer_phone,
    customer_cpf,
    cart_value,
    created_at
FROM abandoned_carts
WHERE customer_email LIKE 'carrinho_%@temp.local'  -- Email temporário
   OR customer_name IS NOT NULL
ORDER BY created_at DESC;
```

---

## 📊 Estrutura dos Dados Salvos:

### Exemplo: Usuário preencheu só NOME e TELEFONE

```json
{
  "id": "uuid-123",
  "customer_name": "João Silva",
  "customer_email": "carrinho_session_1234567890@temp.local",  ← Email temporário
  "customer_phone": "(11) 99999-9999",
  "customer_cpf": null,
  "step": "form_filled",
  "status": "abandoned",
  "product_id": "32991339",
  "cart_value": 197.00,
  "session_id": "session_1234567890",
  "created_at": "2026-01-20T23:30:00Z"
}
```

### Depois que adiciona EMAIL:

```json
{
  "id": "uuid-123",  ← MESMO ID (atualizado)
  "customer_name": "João Silva",
  "customer_email": "joao@teste.com",  ← Agora email real
  "customer_phone": "(11) 99999-9999",
  "customer_cpf": "123.456.789-00",
  "step": "form_filled",
  "status": "abandoned",
  "cart_value": 197.00,
  "session_id": "session_1234567890",
  "updated_at": "2026-01-20T23:35:00Z"  ← Timestamp atualizado
}
```

---

## ⚙️ Comportamento Técnico:

### 1. Primeiro Acesso (Dados Parciais):
```
Usuário preenche: Nome
↓
onBlur dispara
↓
handleSaveAbandonedCart() verifica: hasAnyData = true
↓
Gera session_id: "session_1737413000123"
↓
Email temporário: "carrinho_session_1737413000123@temp.local"
↓
saveAbandonedCart() busca por session_id: NÃO encontra
↓
INSERT no banco com dados parciais
↓
Salva abandoned_cart_id no sessionStorage
```

### 2. Segundo Acesso (Atualização):
```
Usuário adiciona: Email
↓
onBlur dispara
↓
Recupera session_id do sessionStorage
↓
saveAbandonedCart() busca por session_id: ENCONTRA registro existente
↓
UPDATE no banco (substitui email temporário pelo real)
↓
Mantém mesmo ID, só atualiza campos
```

---

## 🎯 Próximos Passos:

### Dashboard:
- ✅ Card mostra total de carrinhos (incluindo parciais)
- ✅ Filtro por status: `abandoned`
- ✅ Fallback se filtro de data não retornar

### Email de Recuperação (futuro):
- Enviar apenas para carrinhos com **email real** (não `@temp.local`)
- Filtro: `WHERE customer_email NOT LIKE 'carrinho_%@temp.local'`

### Analytics:
- Taxa de preenchimento parcial vs completo
- Quais campos são abandonados mais cedo
- Tempo médio para abandono

---

## ⚠️ Observações Importantes:

### Email Temporário:
- Formato: `carrinho_session_TIMESTAMP@temp.local`
- Necessário para não violar constraint `NOT NULL` no banco
- Substituído automaticamente quando email real for preenchido
- **NÃO enviar emails de recuperação** para endereços `@temp.local`

### Session ID:
- Gerado uma vez e salvo no `sessionStorage`
- Persiste durante toda a sessão do navegador
- Se usuário fechar e reabrir: nova sessão = novo carrinho
- Se apenas trocar de aba: mesma sessão = atualiza carrinho

### Limpeza de Dados:
- Carrinhos com email `@temp.local` podem ser limpos depois de X dias
- Sugestão: DELETE após 7 dias sem atualização

---

**Status:** ✅ Código atualizado  
**Pendente:** Executar `database/SCRIPT-FINAL-CARRINHOS.sql` no Supabase  
**Servidor:** http://localhost:3000 (rodando)
