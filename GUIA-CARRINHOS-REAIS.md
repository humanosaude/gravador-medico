# 🧹 GUIA: Remover Dados de Teste e Habilitar Carrinhos Reais

## 📋 O que vamos fazer:

1. ✅ Limpar dados de teste (vendas e carrinhos fictícios)
2. ✅ Atualizar estrutura da tabela `abandoned_carts`
3. ✅ Verificar integração com checkout
4. ✅ Testar carrinho abandonado real

---

## 🗑️ PASSO 1: Limpar Dados de Teste

### No Supabase SQL Editor:

**Execute em sequência:**

```sql
-- 1️⃣ LIMPAR DADOS DE TESTE
DELETE FROM public.abandoned_carts
WHERE customer_email LIKE 'teste%@example.com';

DELETE FROM public.sales
WHERE customer_email LIKE 'teste%@example.com'
   OR customer_name LIKE 'Cliente Teste%';

DELETE FROM public.customers
WHERE email LIKE 'teste%@example.com'
   OR name LIKE 'Cliente Teste%';

-- Verificar
SELECT 'abandoned_carts', COUNT(*) FROM abandoned_carts
UNION ALL SELECT 'sales', COUNT(*) FROM sales
UNION ALL SELECT 'customers', COUNT(*) FROM customers;
```

---

## 🔧 PASSO 2: Atualizar Estrutura da Tabela

**Execute este SQL para adicionar colunas necessárias:**

```sql
ALTER TABLE public.abandoned_carts 
ADD COLUMN IF NOT EXISTS customer_cpf TEXT,
ADD COLUMN IF NOT EXISTS step TEXT,
ADD COLUMN IF NOT EXISTS product_id TEXT,
ADD COLUMN IF NOT EXISTS order_bumps JSONB,
ADD COLUMN IF NOT EXISTS discount_code TEXT,
ADD COLUMN IF NOT EXISTS cart_value NUMERIC;

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_cpf ON public.abandoned_carts(customer_cpf);
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_step ON public.abandoned_carts(step);
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_product ON public.abandoned_carts(product_id);
```

---

## 🔍 PASSO 3: Verificar se o Código Está Ativo

### Checklist de Integração:

✅ **Arquivo:** `lib/abandonedCart.ts`
- Função `saveAbandonedCart()` existe
- Salva na tabela `abandoned_carts`

✅ **Arquivo:** `app/checkout/page.tsx`
- Importa `saveAbandonedCart`
- Chama em `onBlur` dos campos de email/telefone
- Chama quando preenche dados pessoais

### Como funciona:

1. **Usuário acessa checkout**
2. **Preenche EMAIL** → Salva carrinho automaticamente
3. **Preenche TELEFONE** → Atualiza carrinho
4. **Sai da página SEM finalizar** → Carrinho fica como `abandoned`
5. **Se finalizar compra** → Carrinho muda para `recovered`

---

## 🧪 PASSO 4: Testar Carrinho Abandonado Real

### Teste Manual:

1. **Abra uma aba anônima:** Cmd+Shift+N (Chrome) ou Cmd+Shift+P (Safari)

2. **Acesse o checkout:**
   ```
   http://localhost:3000/checkout
   ```

3. **Preencha o formulário:**
   - Nome: `Teste Real`
   - Email: `seuemailreal@gmail.com` (use um real)
   - Telefone: `(11) 99999-9999`
   - CPF: `123.456.789-00`

4. **IMPORTANTE:** Clique FORA do campo de email (onBlur) para disparar o salvamento

5. **Feche a aba SEM finalizar a compra**

6. **Verifique no Supabase:**
   ```sql
   SELECT * FROM abandoned_carts 
   WHERE customer_email = 'seuemailreal@gmail.com'
   ORDER BY created_at DESC;
   ```

7. **Verifique na Dashboard:**
   - Acesse: http://localhost:3000/admin/dashboard
   - Card "Carrinhos Abandonados" deve mostrar **1**

---

## 🔍 Debug: Console do Navegador

Ao preencher o formulário, você deve ver no console:

```
✅ Carrinho abandonado salvo: <uuid>
```

Ou se for atualização:

```
✅ Carrinho atualizado: <uuid>
```

### Se não aparecer nada:

1. Abra DevTools (F12)
2. Aba **Console**
3. Preencha email e clique fora
4. Procure por erros em vermelho

**Erros comuns:**

- ❌ `column "customer_cpf" does not exist` → Execute PASSO 2
- ❌ `null value in column "items"` → Execute PASSO 2
- ❌ Nenhum log → Verifique se clicou FORA do campo (onBlur)

---

## 📊 PASSO 5: Verificar Dashboard

Após criar um carrinho abandonado real:

### No Navegador:
1. Acesse: http://localhost:3000/admin/dashboard
2. Abra Console (F12)
3. Procure por: `🛒 Carrinhos encontrados: 1`

### Card deve mostrar:
```
┌──────────────────────────────┐
│ 🛒 Carrinhos Abandonados     │
│                              │
│        1                     │
│                              │
└──────────────────────────────┘
```

---

## 🎯 Campos Salvos Automaticamente

Quando o usuário preenche o checkout, salvamos:

| Campo | Descrição |
|-------|-----------|
| `customer_name` | Nome completo |
| `customer_email` | Email (obrigatório) |
| `customer_phone` | Telefone com máscara |
| `customer_cpf` | CPF formatado |
| `step` | Etapa: `form_filled`, `payment_started`, `payment_pending` |
| `product_id` | ID do produto principal |
| `order_bumps` | Array de produtos extras selecionados |
| `discount_code` | Cupom aplicado (se houver) |
| `cart_value` | Valor total do carrinho |
| `status` | `abandoned` (muda para `recovered` se comprar) |
| `session_id` | ID único da sessão |
| `utm_source` | Origem da campanha |
| `utm_medium` | Meio da campanha |
| `utm_campaign` | Nome da campanha |

---

## ⚠️ Observações Importantes

### 1. Email é obrigatório
O carrinho SÓ é salvo se o email tiver pelo menos 5 caracteres.

### 2. onBlur é o gatilho
O salvamento acontece quando o usuário **SAI** do campo (blur), não ao digitar.

### 3. Atualização automática
Se o usuário voltar e modificar dados, o carrinho é ATUALIZADO (não duplicado).

### 4. Session ID
Usamos `sessionStorage` para rastrear a sessão do usuário.

---

## 🧹 Remover Console Logs (Opcional)

Após confirmar que funciona, você pode limpar os logs:

### No arquivo `lib/abandonedCart.ts`:

Remover linhas:
- `console.log('✅ Carrinho atualizado:', existing.id)`
- `console.log('✅ Carrinho abandonado salvo:', newCart.id)`
- `console.error(...)` (manter apenas em desenvolvimento)

### No arquivo `app/admin/dashboard/page.tsx`:

Remover linhas:
- `console.log('🛒 Buscando carrinhos abandonados...')`
- `console.log('🛒 Carrinhos encontrados:', ...)`
- `console.log('🛒 Dados dos carrinhos:', ...)`

---

## 📝 Checklist Final

- [ ] Executar SQL de limpeza (PASSO 1)
- [ ] Executar SQL de estrutura (PASSO 2)
- [ ] Testar carrinho abandonado real (PASSO 4)
- [ ] Verificar no Supabase que o registro foi criado
- [ ] Verificar na dashboard que o card mostra 1
- [ ] Remover console logs (opcional)

---

## 🎉 Próximos Passos

Depois de tudo funcionando:

1. ✅ Configurar email de recuperação automática
2. ✅ Criar workflow no n8n/Zapier para notificar carrinhos abandonados
3. ✅ Adicionar timeout (ex: 30 minutos sem ação = abandonado definitivo)
4. ✅ Analytics: rastrear taxa de recuperação

---

**Criado em:** 20/01/2026  
**Status:** Pronto para execução  
**Servidor:** http://localhost:3000 (ativo)
