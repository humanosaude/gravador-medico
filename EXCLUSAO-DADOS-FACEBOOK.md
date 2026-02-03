# 📋 Exclusão de Dados do Facebook - Implementação Completa

## 📌 Visão Geral

Esta implementação atende aos requisitos da Meta/Facebook para **Data Deletion Callback**, permitindo que usuários solicitem a exclusão de seus dados quando removerem o app do Facebook.

## 🔧 Componentes Criados

### 1. API Endpoint (`/api/facebook/data-deletion`)

**Arquivo:** `app/api/facebook/data-deletion/route.ts`

Este endpoint:
- ✅ Recebe o callback `signed_request` do Facebook (POST)
- ✅ Valida a assinatura usando HMAC-SHA256
- ✅ Registra a solicitação no banco de dados
- ✅ Processa a exclusão dos dados do usuário
- ✅ Retorna URL de status e código de confirmação
- ✅ Permite verificar status da solicitação (GET)

### 2. Página de Status (`/exclusao-dados`)

**Arquivo:** `app/exclusao-dados/page.tsx`

Esta página:
- ✅ Exibe instruções sobre como solicitar exclusão de dados
- ✅ Permite verificar status de uma solicitação existente
- ✅ Mostra informações sobre dados coletados
- ✅ Design responsivo e consistente com o site

### 3. Tabela do Banco de Dados

**Arquivo:** `supabase/migrations/20260203_facebook_data_deletion.sql`

Tabela `facebook_data_deletion_requests` com:
- `facebook_user_id`: ID do usuário no escopo do app
- `confirmation_code`: Código único de confirmação
- `status`: pending, processing, completed, failed
- `deleted_data_types`: Tipos de dados excluídos
- Timestamps e metadados

---

## ⚙️ Configuração Necessária

### 1. Variável de Ambiente

Adicione ao seu `.env.local`:

```bash
# Facebook App Secret - OBRIGATÓRIO para validar callbacks
FACEBOOK_APP_SECRET=seu-app-secret-aqui
```

**Onde encontrar:**
1. Acesse [Facebook Developers](https://developers.facebook.com/apps)
2. Selecione seu app
3. Vá em **Configurações > Básico**
4. Copie o **Chave Secreta do Aplicativo**

### 2. Executar Migração SQL

Execute o SQL no Supabase:

```bash
# Via Supabase CLI
supabase db push

# Ou execute manualmente no SQL Editor do Supabase Dashboard
```

### 3. Configurar URL no Facebook

1. Acesse seu app no [Facebook Developers](https://developers.facebook.com/apps)
2. Vá em **Configurações > Básico**
3. Role até **Exclusão de dados do usuário**
4. Selecione **URL de retorno de chamada de solicitação de exclusão de dados**
5. Insira: `https://www.gravadormedico.com.br/api/facebook/data-deletion`
6. Salve as alterações

---

## 🔄 Fluxo de Funcionamento

```
┌─────────────────┐
│  Usuário remove │
│  app no Facebook│
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ Facebook envia POST     │
│ para /api/facebook/     │
│ data-deletion           │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ API valida signed_request│
│ com FACEBOOK_APP_SECRET │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Registra solicitação    │
│ no banco de dados       │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Processa exclusão de    │
│ dados do usuário        │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Retorna JSON com URL    │
│ de status e código      │
└─────────────────────────┘
```

---

## 📊 Status das Solicitações

| Status | Descrição |
|--------|-----------|
| `pending` | Aguardando processamento |
| `processing` | Em processamento |
| `completed` | Exclusão concluída |
| `failed` | Erro na exclusão |

---

## 🔒 Dados Excluídos

A implementação atual processa:

1. **Leads**: Registros da tabela `leads` com o `facebook_user_id`
2. **Analytics**: Eventos da tabela `analytics_events`
3. **Pedidos**: Anonimização (não exclusão) de dados em `orders`
   - Nome → "DADOS EXCLUÍDOS"
   - Email → "deleted@excluded.com"
   - Telefone e CPF → null

> ⚠️ **Importante**: Dados financeiros são anonimizados (não excluídos) para manter a integridade contábil.

---

## 🧪 Como Testar

### Teste Manual

1. Entre no app com Login do Facebook
2. Acesse [Configurações de Apps e Sites](https://www.facebook.com/settings?tab=applications)
3. Remova o app "Gravador Médico"
4. Clique em "Exibir apps e sites removidos"
5. Clique em "Exibir" ao lado do app
6. Clique em "Enviar solicitação"

### Verificar Status

Acesse:
```
https://www.gravadormedico.com.br/exclusao-dados?code=SEU-CODIGO
```

---

## 📝 URLs Importantes

| Recurso | URL |
|---------|-----|
| Endpoint de Callback | `https://www.gravadormedico.com.br/api/facebook/data-deletion` |
| Página de Status | `https://www.gravadormedico.com.br/exclusao-dados` |
| Política de Privacidade | `https://www.gravadormedico.com.br/politica-privacidade` |

---

## ❓ FAQ

**P: Preciso enviar comprovante de exclusão?**
R: Não, o Facebook não exige comprovante.

**P: Quanto tempo para processar?**
R: A exclusão é processada imediatamente. O status pode ser verificado a qualquer momento.

**P: O que acontece se o endpoint falhar?**
R: O Facebook tentará novamente. Erros são logados e o status fica como `failed`.

---

## 📎 Referências

- [Documentação Oficial do Facebook](https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback)
- [Termos da Plataforma Meta](https://developers.facebook.com/docs/apps/platform-terms)
- [LGPD - Lei Geral de Proteção de Dados](http://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)

---

## ✅ Checklist de Deploy

- [ ] Adicionar `FACEBOOK_APP_SECRET` ao `.env.local`
- [ ] Adicionar `FACEBOOK_APP_SECRET` às variáveis do Vercel
- [ ] Executar migração SQL no Supabase
- [ ] Configurar URL no Facebook Developers
- [ ] Testar callback manualmente
- [ ] Verificar logs de erro

---

*Última atualização: 3 de fevereiro de 2026*
