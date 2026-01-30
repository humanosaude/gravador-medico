# 🔒 BLINDAGEM CRÍTICA - NÃO ALTERAR!

> **ATENÇÃO MÁXIMA**: Este documento contém configurações críticas que foram debugadas e testadas extensivamente. 
> **NUNCA** altere esses arquivos sem consultar este documento primeiro.
> Data da última atualização: 30 de Janeiro de 2026

---

## 🚨 ARQUIVOS BLINDADOS

### 1️⃣ `/app/api/checkout/check-payment/route.ts`
**Função**: Verifica status do pagamento PIX e sincroniza com Mercado Pago

**CRÍTICO - NÃO ALTERAR**:
- Consulta API do MP diretamente quando banco diz `pending`
- Atualiza status, envia email e provisiona acesso automaticamente
- Intervalo de polling é 5 segundos (não diminuir!)

```typescript
// LINHA CRÍTICA - Se status pendente, consulta MP diretamente
if (sale.mercadopago_payment_id && sale.payment_gateway === 'mercadopago') {
  const mpResponse = await fetch(
    `https://api.mercadopago.com/v1/payments/${sale.mercadopago_payment_id}`,
    { headers: { 'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}` } }
  )
  // Se aprovado no MP, atualiza banco + email + provisionamento
}
```

---

### 2️⃣ `/app/api/webhooks/mercadopago-enterprise/route.ts`
**Função**: Recebe notificações do Mercado Pago

**CRÍTICO - NÃO ALTERAR**:
- URL configurada no MP: `https://www.gravadormedico.com.br/api/webhooks/mercadopago-enterprise`
- Deve sempre retornar 200 OK (mesmo em erro)
- Atualiza vendas, envia emails, provisiona acessos

---

### 3️⃣ `/app/checkout/page.tsx`
**Função**: Página de checkout com PIX e Cartão

**LINHAS CRÍTICAS - NÃO ALTERAR**:

```typescript
// POLLING - INTERVALO DE 5 SEGUNDOS (NÃO DIMINUIR!)
}, 5000) // Verifica a cada 5 segundos (menos agressivo para evitar rate limit)

// QR CODE PADDING - NÃO DIMINUIR!
<div className="min-h-screen pt-24 pb-8 px-4">
  <motion.div className="flex flex-col items-center mb-6 mt-8">
```

---

### 4️⃣ `/app/api/checkout/enterprise/route.ts`
**Função**: Processa pagamentos (cartão + PIX)

**CRÍTICO - NÃO ALTERAR**:
- `notification_url` para PIX: `/api/webhooks/mercadopago-enterprise`
- `notification_url` para Cartão: `/api/webhooks/mercadopago`
- Salva `mercadopago_payment_id` no banco (essencial para sync)
- `external_reference: order.id` (essencial para rastreamento)

---

### 5️⃣ `/middleware.ts`
**Função**: Headers de segurança e CSP

**CRÍTICO - NÃO ALTERAR**:
```typescript
// CSP - Secure Fields do Mercado Pago
frame-src: 'self' https://secure-fields.mercadopago.com ...
connect-src: 'self' https://secure-fields.mercadopago.com ...
```

---

### 6️⃣ `/components/SecureCardForm.tsx`
**Função**: Formulário de cartão PCI Compliant

**CRÍTICO - NÃO ALTERAR**:
- Usa `cardForm()` do SDK do MP (iframes seguros)
- Container do issuer DEVE ser `<select>` (não `<div>`)
- `autoMount: true` para parcelas funcionarem

---

## 📊 CONFIGURAÇÕES DO MERCADO PAGO

### Painel MP → Desenvolvedores → Webhooks
```
URL de Produção: https://www.gravadormedico.com.br/api/webhooks/mercadopago-enterprise
Eventos Ativados:
  ✅ Pagamentos
  ✅ Alertas de fraude
  ✅ Order (Mercado Pago)
  ✅ Todos os outros
```

### Credenciais (Produção)
```
Public Key: APP_USR-ce68e22a-f34... (no .env.local)
Access Token: APP_USR-8963380272153266-... (no .env.local)
```

---

## 🔧 VARIÁVEIS DE AMBIENTE CRÍTICAS

```bash
# Mercado Pago
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=APP_USR-ce68e22a-f34...
MERCADOPAGO_ACCESS_TOKEN=APP_USR-8963380272153266-012620-b44f7e59d0d47b079c523ee25d19a968-1537908999

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://egsmraszqnmosmtjuzhx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# App
NEXT_PUBLIC_APP_URL=https://www.gravadormedico.com.br
```

---

## ✅ FLUXO DE PAGAMENTO PIX (FUNCIONANDO)

```
1. Cliente gera PIX no checkout
   ↓
2. Venda criada no banco com status='pending', mercadopago_payment_id=XXX
   ↓
3. Cliente paga o PIX no app do banco
   ↓
4. DUAS formas de detectar:
   
   A) WEBHOOK (quando funciona):
      MP envia POST → /api/webhooks/mercadopago-enterprise
      → Atualiza status='paid'
      → Envia email
      → Provisiona acesso
   
   B) POLLING (fallback, sempre funciona):
      Frontend chama GET → /api/checkout/check-payment?order_id=XXX
      → API consulta MP diretamente
      → Se approved no MP, atualiza tudo
      → Retorna is_paid=true
      → Frontend redireciona para /obrigado
```

---

## 🚫 O QUE NÃO FAZER

1. ❌ **NÃO diminuir intervalo de polling** (mínimo 5 segundos)
2. ❌ **NÃO remover consulta à API do MP** no check-payment
3. ❌ **NÃO alterar URL do webhook** no painel do MP
4. ❌ **NÃO mudar `<select>` para `<div>`** no SecureCardForm
5. ❌ **NÃO remover `autoMount: true`** do cardForm
6. ❌ **NÃO diminuir padding do QR Code** (pt-24, mt-8)
7. ❌ **NÃO remover `mercadopago_payment_id`** do update/insert

---

## 🔄 ANTES DE QUALQUER ALTERAÇÃO

1. **Leia este documento inteiro**
2. **Verifique se o arquivo está na lista de blindados**
3. **Se estiver, NÃO altere sem testar em ambiente de desenvolvimento**
4. **Faça backup do arquivo antes de qualquer alteração**
5. **Teste o fluxo completo de PIX após alterações**

---

## 📞 TESTE RÁPIDO DE SAÚDE

```bash
# 1. Testar se webhook está respondendo
curl -X POST "https://www.gravadormedico.com.br/api/webhooks/mercadopago-enterprise" \
  -H "Content-Type: application/json" \
  -d '{"action":"payment.created","data":{"id":"123456"}}'
# Deve retornar: OK

# 2. Testar check-payment
curl "https://www.gravadormedico.com.br/api/checkout/check-payment?order_id=SEU_ORDER_ID"
# Deve retornar JSON com status

# 3. Verificar vendas no Supabase
# Dashboard → Tabela sales → Ver status
```

---

## 📅 HISTÓRICO DE PROBLEMAS RESOLVIDOS

| Data | Problema | Solução | Arquivo |
|------|----------|---------|---------|
| 30/01/2026 | Webhook retornando 500 | Testado em modo produção (não teste) | webhook-enterprise |
| 30/01/2026 | Pagamento não detectado | check-payment consulta MP diretamente | check-payment |
| 30/01/2026 | Rate limit 429 | Polling de 3s → 5s | checkout/page.tsx |
| 30/01/2026 | QR Code cortado | Aumentado padding pt-24 mt-8 | checkout/page.tsx |
| 30/01/2026 | Parcelas não apareciam | autoMount: true no cardForm | SecureCardForm |
| 30/01/2026 | Issuer element error | Mudou div → select | SecureCardForm |
| 30/01/2026 | CSP bloqueando iframes | Adicionado secure-fields.mercadopago.com | middleware.ts |

---

**🔒 ESTE DOCUMENTO É SUA GARANTIA DE QUE O SISTEMA FUNCIONA. PRESERVE-O!**
