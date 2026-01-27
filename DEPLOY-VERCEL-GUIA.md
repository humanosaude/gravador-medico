# 🚀 GUIA COMPLETO DE DEPLOY NA VERCEL

## ✅ PRÉ-REQUISITOS CONFIRMADOS

- ✅ Código no GitHub: `humanosaude/gravador-medico`
- ✅ Login Admin funcionando
- ✅ Sistema testado em localhost
- ✅ 22 variáveis de ambiente documentadas
- ✅ Commit atual: `9d5f36a`

---

## 📋 PASSO 1: IMPORTAR PROJETO NA VERCEL

### 1.1 Acesse a Vercel
```
https://vercel.com/new
```

### 1.2 Importe o Repositório
1. Clique em **"Import Git Repository"**
2. Se necessário, conecte sua conta GitHub
3. Busque: `humanosaude/gravador-medico`
4. Clique em **"Import"**

### 1.3 Configurações do Projeto
- **Framework Preset**: Next.js (detectado automaticamente)
- **Root Directory**: `./` (padrão)
- **Build Command**: `npm run build` (padrão)
- **Output Directory**: `.next` (padrão)

**⚠️ NÃO FAÇA DEPLOY AINDA!** Primeiro adicione as variáveis de ambiente.

---

## 🔐 PASSO 2: ADICIONAR VARIÁVEIS DE AMBIENTE

### 2.1 Na tela de configuração, clique em "Environment Variables"

### 2.2 Adicione TODAS as 22 variáveis abaixo:

#### 📦 SUPABASE (3 variáveis)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://egsmraszqnmosmtjuzhx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnc21yYXN6cW5tb3NtdGp1emh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY5NzMzMDcsImV4cCI6MjA1MjU0OTMwN30.3RTQeY-4aLm0qLLOUF-nvEkWXa-DqCbj5nEy3j48gG8
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnc21yYXN6cW5tb3NtdGp1emh4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjk3MzMwNywiZXhwIjoyMDUyNTQ5MzA3fQ.5_I7uZ-iJb6AKoY3SzHJGLa6EwzYB8EjSp2qj3bQ4sY
```

#### 💳 MERCADO PAGO (3 variáveis)
```bash
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=APP_USR-d60d0e71-5c06-4cfb-aff9-d97beb6a2c3f
MERCADOPAGO_ACCESS_TOKEN=APP_USR-3234567890123456-012345-abcdef1234567890abcdef1234567890-123456789
MERCADOPAGO_WEBHOOK_SECRET=seu-webhook-secret-aqui
```

#### 📱 APPMAX (3 variáveis)
```bash
APPMAX_TOKEN=D2555D74-9B58764C-3F04CB59-14BF2F64
APPMAX_PRODUCT_ID=32880073
APPMAX_API_KEY=B6C99C65-4FAE30A5-BB3DFD79-CCEDE0B7
```

#### 🔒 CLOUDFLARE TURNSTILE (2 variáveis)
```bash
NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4AAAAAAAzJLQDJL0aXxxxxx
TURNSTILE_SECRET_KEY=0x4AAAAAAAzJLQDJL0aXxxxxxxxxxxxxxxx
```

#### 🤖 LOVABLE (4 variáveis)
```bash
LOVABLE_API_SECRET=webhook-appmax-2026-secure-key
LOVABLE_API_URL=https://acouwzdniytqhaesgtpr.supabase.co/functions/v1
LOVABLE_EDGE_FUNCTION_URL=https://acouwzdniytqhaesgtpr.supabase.co/functions/v1/admin-user-manager
NEXT_PUBLIC_APP_URL=https://seu-projeto.vercel.app
```
**⚠️ IMPORTANTE**: Deixe `NEXT_PUBLIC_APP_URL` como placeholder. Você vai atualizar após o deploy.

#### 🔑 WEBHOOK SECRETS (2 variáveis)
```bash
APPMAX_WEBHOOK_SECRET=seu-secret-aqui-use-uuid-v4
MERCADOPAGO_WEBHOOK_SECRET_KEY=seu-secret-aqui-use-uuid-v4
```

#### ⚙️ APP CONFIG (3 variáveis)
```bash
JWT_SECRET=seu-jwt-secret-super-seguro-minimo-32-caracteres-aleatorios
CRON_SECRET=seu-cron-secret-use-uuid-v4
NEXT_PUBLIC_APP_URL=https://seu-projeto.vercel.app
```
**⚠️ IMPORTANTE**: Deixe como placeholder. Atualizar após deploy.

#### 📧 EMAIL/RESEND (2 variáveis - OPCIONAL)
```bash
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=noreply@seudominio.com
```

---

## 🎯 PASSO 3: FAZER O DEPLOY

### 3.1 Revise as Configurações
- ✅ Framework: Next.js
- ✅ 22 variáveis adicionadas
- ✅ Branch: `main`

### 3.2 Clique em "Deploy"
- Aguarde 2-3 minutos
- Você verá os logs de build em tempo real

### 3.3 Deploy Concluído
Anote a URL gerada (exemplo):
```
https://gravador-medico-abc123.vercel.app
```

---

## 🔄 PASSO 4: ATUALIZAR VARIÁVEIS PÓS-DEPLOY

### 4.1 Acesse Settings → Environment Variables

### 4.2 Atualize estas 2 variáveis com a URL real:

```bash
NEXT_PUBLIC_APP_URL=https://gravador-medico-abc123.vercel.app
```

Mude AMBAS as ocorrências:
- Na seção "APP CONFIG"
- Na seção "LOVABLE"

### 4.3 Fazer Redeploy
1. Vá em **Deployments**
2. Clique nos **três pontos** do último deploy
3. Clique em **"Redeploy"**
4. Aguarde 1-2 minutos

---

## 🧪 PASSO 5: TESTAR O DEPLOY

### 5.1 Teste o Login Admin
```
https://gravador-medico-abc123.vercel.app/login
```

**Credenciais**: Suas credenciais de admin do Supabase

✅ **Esperado**: Login funcional, redirect para dashboard

### 5.2 Teste o Checkout
```
https://gravador-medico-abc123.vercel.app/checkout-test
```

**Dados de teste**:
- Nome: APRO
- CPF: 123.456.789-09
- Cartão: 5031 4332 1540 6351
- Validade: 11/25
- CVV: 123

✅ **Esperado**: Checkout funcional, Mercado Pago sem timeout

---

## 🔔 PASSO 6: CONFIGURAR WEBHOOKS (IMPORTANTE)

### 6.1 Webhook Mercado Pago
1. Acesse: https://www.mercadopago.com.br/developers/panel/app
2. Vá em **"Webhooks"**
3. Adicione URL:
   ```
   https://gravador-medico-abc123.vercel.app/api/webhooks/mercadopago-v3
   ```
4. Selecione evento: **"payment"**
5. Copie o **Secret** gerado
6. Atualize na Vercel: `MERCADOPAGO_WEBHOOK_SECRET`
7. Faça **Redeploy**

### 6.2 Webhook AppMax
1. Entre em contato com suporte AppMax
2. Informe URL:
   ```
   https://gravador-medico-abc123.vercel.app/api/webhooks/appmax-v2
   ```
3. Peça para configurar notificações de: `payment.approved`, `payment.rejected`

---

## 🎛️ PASSO 7: CONFIGURAÇÕES ADICIONAIS (OPCIONAL)

### 7.1 Domínio Customizado
1. Vá em **Settings → Domains**
2. Adicione: `gravadormedico.com.br`
3. Configure DNS conforme instruções

### 7.2 Analytics
1. Vá em **Settings → Analytics**
2. Ative **Vercel Analytics**

### 7.3 Logs
1. Vá em **Deployments → Logs**
2. Monitore erros em tempo real

---

## ✅ CHECKLIST FINAL

### Antes do Deploy
- ✅ Código commitado no GitHub
- ✅ 22 variáveis de ambiente prontas
- ✅ Login testado em localhost
- ✅ Checkout testado em localhost

### Durante o Deploy
- ⬜ Projeto importado na Vercel
- ⬜ 22 variáveis adicionadas
- ⬜ Deploy executado com sucesso
- ⬜ URL anotada

### Pós-Deploy
- ⬜ `NEXT_PUBLIC_APP_URL` atualizada
- ⬜ Redeploy executado
- ⬜ Login testado em produção
- ⬜ Checkout testado em produção
- ⬜ Webhook Mercado Pago configurado
- ⬜ Webhook AppMax solicitado

---

## 🚨 TROUBLESHOOTING

### Erro: "Build Failed"
**Causa**: Variável de ambiente faltando
**Solução**: Revise todas as 22 variáveis, redeploy

### Erro: "Login não funciona"
**Causa**: `JWT_SECRET` não configurado
**Solução**: Adicione `JWT_SECRET` com 32+ caracteres

### Erro: "Mercado Pago timeout"
**Causa**: Em localhost é normal (HTTPS local)
**Solução**: Em produção Vercel funciona perfeitamente

### Erro: "Supabase connection failed"
**Causa**: Chaves Supabase incorretas
**Solução**: Verifique URL e keys no dashboard Supabase

---

## 📞 SUPORTE

Se encontrar problemas:
1. Veja logs no Vercel: **Deployments → Function Logs**
2. Veja logs no Supabase: **Logs Explorer**
3. Veja console do navegador: **F12 → Console**

---

## 🎉 DEPLOY COMPLETO!

Após seguir todos os passos:
- ✅ Aplicação online na Vercel
- ✅ Login funcionando
- ✅ Checkout funcionando
- ✅ Webhooks configurados
- ✅ Sistema pronto para produção!

**Próximo passo**: Marketing e vendas! 🚀
