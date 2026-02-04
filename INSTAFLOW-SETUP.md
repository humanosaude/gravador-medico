# 🚀 InstaFlow - Guia de Configuração

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Variáveis de Ambiente](#variáveis-de-ambiente)
3. [Configuração no Meta Developers](#configuração-no-meta-developers)
4. [Executar Migração SQL](#executar-migração-sql)
5. [Testando a Conexão](#testando-a-conexão)
6. [Próximos Passos](#próximos-passos)

---

## 📱 Visão Geral

O **InstaFlow** é um módulo de automação e gestão de Instagram integrado ao seu dashboard. Com ele você pode:

- ✅ Conectar contas Instagram Business
- 📅 Agendar posts (Feed, Stories, Reels, Carrossel)
- 🤖 Gerar legendas com IA
- 📊 Visualizar métricas e analytics
- 🏷️ Sugerir hashtags baseado em performance

---

## 🔑 Variáveis de Ambiente

Adicione estas variáveis ao seu `.env.local`:

```bash
# ===================================
# INSTAFLOW - INSTAGRAM AUTOMATION
# ===================================

# Facebook App ID (público, pode ser exposto no client)
NEXT_PUBLIC_FACEBOOK_APP_ID=seu_app_id_aqui

# Facebook App Secret (PRIVADO - apenas server-side)
FACEBOOK_APP_SECRET=seu_app_secret_aqui

# URL da aplicação (para OAuth redirect)
# Em produção: https://seudominio.com.br
# Em desenvolvimento: http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 📌 Onde encontrar essas credenciais?

1. Acesse: https://developers.facebook.com/apps
2. Selecione seu app (ou crie um novo)
3. Vá em **Configurações > Básico**
4. Copie o **ID do Aplicativo** e a **Chave Secreta do Aplicativo**

---

## ⚙️ Configuração no Meta Developers

### 1. Criar/Configurar App

Se ainda não tem um app:
1. Acesse https://developers.facebook.com/apps
2. Clique em **Criar aplicativo**
3. Escolha **Business** como tipo
4. Preencha nome e email

### 2. Adicionar Produtos

No painel do app, adicione estes produtos:
- **Facebook Login**
- **Instagram Basic Display** (opcional, para contas pessoais)

### 3. Configurar OAuth Redirect URIs

Em **Facebook Login > Configurações**:

```
# Desenvolvimento
http://localhost:3000/api/social/instagram/callback

# Produção
https://seudominio.com.br/api/social/instagram/callback
```

### 4. Solicitar Permissões

No **App Review**, solicite estas permissões:

| Permissão | Descrição | Status |
|-----------|-----------|--------|
| `instagram_basic` | Informações do perfil | ✅ Padrão |
| `instagram_content_publish` | Publicar posts | 🔒 Requer aprovação |
| `instagram_manage_insights` | Métricas | 🔒 Requer aprovação |
| `pages_show_list` | Listar páginas | ✅ Padrão |
| `pages_read_engagement` | Engajamento | ✅ Padrão |
| `business_management` | Gerenciar negócios | 🔒 Requer aprovação |

### 5. Modo de Desenvolvimento vs Produção

**Modo Desenvolvimento** (padrão):
- Apenas você (admin do app) pode usar
- Todas permissões funcionam imediatamente
- Ótimo para testar

**Modo Produção**:
- Qualquer usuário pode conectar
- Requer aprovação do Facebook
- Submit no App Review

---

## 🗄️ Executar Migração SQL

### Opção 1: Via Supabase Dashboard

1. Acesse: https://app.supabase.com
2. Selecione seu projeto
3. Vá em **SQL Editor**
4. Cole o conteúdo de: `supabase/migrations/20260203_instaflow_tables.sql`
5. Execute

### Opção 2: Via CLI

```bash
# Se tiver Supabase CLI configurado
supabase db push
```

### Criar Storage Bucket

Execute este SQL também:

```sql
-- Criar bucket para mídia do InstaFlow
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'instaflow-media',
  'instaflow-media',
  true,
  52428800, -- 50MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime']
);

-- Política de upload (apenas usuários autenticados)
CREATE POLICY "Users can upload media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'instaflow-media' 
  AND auth.role() = 'authenticated'
);

-- Política de leitura (público)
CREATE POLICY "Public can view media"
ON storage.objects FOR SELECT
USING (bucket_id = 'instaflow-media');
```

---

## 🧪 Testando a Conexão

### 1. Iniciar servidor de desenvolvimento

```bash
npm run dev
# ou
yarn dev
```

### 2. Acessar página de conexão

Acesse: http://localhost:3000/admin/social/connect

### 3. Conectar conta

1. Clique em **"Conectar com Facebook"**
2. Faça login no Facebook
3. Selecione a Página vinculada ao Instagram Business
4. Autorize as permissões

### 4. Verificar sucesso

Após o redirect, você deve ver a mensagem "Conta conectada!" e ser redirecionado para o dashboard.

### Troubleshooting

| Erro | Solução |
|------|---------|
| "Sessão expirada" | Tente novamente, cookies podem ter expirado |
| "Nenhuma conta Instagram Business" | Vincule seu IG a uma Página do Facebook |
| "Invalid redirect_uri" | Verifique se a URI está cadastrada no Meta |
| "App not configured" | Verifique NEXT_PUBLIC_FACEBOOK_APP_ID |

---

## 🚀 Próximos Passos

### Fase 2: Biblioteca de Mídia
- [ ] Upload de arquivos para Supabase Storage
- [ ] CRUD de media_library
- [ ] Grid de thumbnails com filtros/tags

### Fase 3: Calendário e Agendamento
- [ ] Calendário mensal visual
- [ ] Composer de posts
- [ ] Grid preview do feed

### Fase 4: Auto-Posting
- [ ] Worker cron para publicação
- [ ] Publicar via Instagram API
- [ ] Retry em caso de falha

### Fase 5: IA para Conteúdo
- [ ] Gerador de legendas com OpenAI
- [ ] Sugestor de hashtags
- [ ] Variações A/B

### Fase 6: Analytics
- [ ] Sync de métricas
- [ ] Dashboard com gráficos
- [ ] Relatórios PDF

---

## 📁 Estrutura de Arquivos Criados

```
lib/
  instagram/
    auth.ts          # OAuth e autenticação
    api.ts           # Wrapper da Graph API
    types.ts         # Tipos TypeScript
    index.ts         # Exports

app/
  admin/
    social/
      page.tsx             # Dashboard principal
      connect/
        page.tsx           # Conectar conta

  api/
    social/
      instagram/
        auth/
          route.ts         # Iniciar OAuth
        callback/
          route.ts         # Processar callback
        accounts/
          route.ts         # Listar/deletar contas

supabase/
  migrations/
    20260203_instaflow_tables.sql  # Schema do banco
```

---

## 📞 Suporte

Problemas? Verifique:

1. ✅ Variáveis de ambiente configuradas
2. ✅ App do Facebook em modo correto
3. ✅ Redirect URIs cadastradas
4. ✅ Conta Instagram é Business/Creator
5. ✅ IG vinculado a uma Página do Facebook

---

**Última atualização:** 3 de fevereiro de 2026
