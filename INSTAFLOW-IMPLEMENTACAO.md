# InstaFlow - Módulo de Automação Instagram

## ✅ Status da Implementação

### Fase 1: Infraestrutura Base ✅ COMPLETO

#### 1. Schema do Banco de Dados
- **Arquivo**: `supabase/migrations/20260203_instaflow_tables.sql`
- **Tabelas criadas**:
  - `instagram_accounts` - Contas conectadas
  - `instaflow_media_library` - Biblioteca de mídia
  - `instaflow_scheduled_posts` - Posts agendados
  - `instaflow_post_analytics` - Analytics por post
  - `instaflow_account_analytics` - Analytics da conta
  - `instaflow_templates` - Templates de legendas
  - `instaflow_hashtags` - Grupos de hashtags
  - `instaflow_activity_log` - Log de atividades

#### 2. OAuth e API do Instagram
- **Arquivos**: `lib/instagram/`
  - `auth.ts` - Fluxo OAuth do Facebook/Instagram
  - `api.ts` - Wrapper da Instagram Graph API
  - `types.ts` - Tipos TypeScript
  - `index.ts` - Exportações

#### 3. Páginas do Dashboard
- **Arquivos**: `app/admin/social/`
  - `page.tsx` - Dashboard principal
  - `connect/page.tsx` - Conectar contas
  - `calendar/page.tsx` - Calendário de posts
  - `library/page.tsx` - Biblioteca de mídia
  - `analytics/page.tsx` - Analytics
  - `settings/page.tsx` - Configurações
  - `composer/page.tsx` - Criar posts
  - `approval/page.tsx` - Fluxo de aprovação ✅

#### 4. APIs REST
- **Arquivos**: `app/api/social/instagram/`
  - `auth/route.ts` - Iniciar OAuth
  - `callback/route.ts` - Callback do OAuth
  - `accounts/route.ts` - CRUD de contas
  - `stats/route.ts` - Estatísticas rápidas
  - `posts/route.ts` - CRUD de posts
  - `sync/route.ts` - Sincronização com Instagram
  - `media/route.ts` - Biblioteca de mídia
  - `media/upload/route.ts` - Upload de mídia
  - `analytics/route.ts` - Dados de analytics
  - `settings/route.ts` - Configurações
  - `approval/route.ts` - API de aprovação ✅

---

### Fase 2: Funcionalidades IA ✅ COMPLETO

#### 1. Gerador de Legendas com IA
- **Arquivo**: `lib/ai/caption-generator.ts`
- **Funções**:
  - `generateCaptionVariations()` - Gera 3 variações de legenda
  - `analyzeSentiment()` - Análise de sentimento
  - `improveCaption()` - Melhora legenda existente

#### 2. Sugestor de Hashtags
- **Arquivo**: `lib/ai/hashtag-suggester.ts`
- **Funções**:
  - `suggestHashtags()` - Sugere hashtags otimizadas
  - `analyzeHashtagPerformance()` - Analisa performance
  - `groupHashtags()` - Agrupa por categoria
  - `formatHashtagsForComment()` - Formata para comentário

#### 3. Calculador de Melhores Horários
- **Arquivo**: `lib/ai/best-times.ts`
- **Funções**:
  - `calculateBestTimesFromHistory()` - Calcula com dados históricos
  - `suggestBestTimesWithAI()` - Sugere com IA (sem dados)
  - `formatTimeSlot()` - Formata para exibição

#### 4. Gerador de Insights
- **Arquivo**: `lib/ai/insights-generator.ts`
- **Funções**:
  - `generateInsightReport()` - Relatório completo com IA
  - `analyzePost()` - Análise de post individual
  - `generateCompetitorComparison()` - Comparação com competidores
  - `predictMetrics()` - Previsão de métricas

#### 5. APIs de IA
- **Arquivos**: `app/api/social/instagram/ai/`
  - `caption/route.ts` - API de legendas
  - `hashtags/route.ts` - API de hashtags
  - `best-times/route.ts` - API de melhores horários

---

### Fase 3: Workers (Background Jobs) ✅ COMPLETO

#### 1. Publish Scheduler
- **Arquivo**: `lib/workers/publish-scheduler.ts`
- **Funcionalidades**:
  - Verifica posts agendados a cada 5 min
  - Publica automaticamente no horário
  - Posta primeiro comentário (hashtags)
  - Retry automático em caso de falha

#### 2. Analytics Fetcher
- **Arquivo**: `lib/workers/analytics-fetcher.ts`
- **Funcionalidades**:
  - Busca métricas 2x ao dia
  - Atualiza analytics de posts
  - Calcula variação de seguidores

#### 3. Best Times Calculator
- **Arquivo**: `lib/workers/best-times-calculator.ts`
- **Funcionalidades**:
  - Recalcula semanalmente
  - Baseado em dados históricos
  - Salva nas configurações

#### 4. Report Sender
- **Arquivo**: `lib/workers/report-sender.ts`
- **Funcionalidades**:
  - Gera relatório semanal
  - Usa IA para insights
  - Envia por email (Resend)

#### 5. Cron Jobs APIs
- **Arquivos**: `app/api/cron/`
  - `instaflow-publish/route.ts` - Publicação (*/5 min)
  - `instaflow-analytics/route.ts` - Analytics (2x/dia)
  - `instaflow-best-times/route.ts` - Melhores horários (semanal)
  - `instaflow-reports/route.ts` - Relatórios (segundas)

---

## 📋 Configuração

### Variáveis de Ambiente Necessárias

```env
# Facebook/Instagram OAuth
NEXT_PUBLIC_FACEBOOK_APP_ID=seu_app_id
FACEBOOK_APP_SECRET=seu_app_secret

# OpenAI (para funcionalidades IA)
OPENAI_API_KEY=sk-...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# Cron Jobs
CRON_SECRET=um_secret_seguro

# Email (opcional)
RESEND_API_KEY=re_xxx
```

### Configurar Vercel Cron

O arquivo `vercel.cron.json` já está configurado:

```json
{
  "crons": [
    {
      "path": "/api/cron/instaflow-publish",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cron/instaflow-analytics",
      "schedule": "0 6,18 * * *"
    },
    {
      "path": "/api/cron/instaflow-best-times",
      "schedule": "0 3 * * 0"
    },
    {
      "path": "/api/cron/instaflow-reports",
      "schedule": "0 9 * * 1"
    }
  ]
}
```

### Executar SQL no Supabase

1. Acesse o Supabase Dashboard
2. Vá em SQL Editor
3. Cole e execute o conteúdo de `supabase/migrations/20260203_instaflow_tables.sql`

### Criar Storage Bucket

Execute no SQL Editor do Supabase:

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('instaflow-media', 'instaflow-media', true)
ON CONFLICT (id) DO NOTHING;

-- Policy para upload
CREATE POLICY "Users can upload media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'instaflow-media');

-- Policy para visualização
CREATE POLICY "Anyone can view media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'instaflow-media');

-- Policy para delete
CREATE POLICY "Users can delete own media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'instaflow-media');
```

---

## 🚀 Funcionalidades Implementadas

### ✅ Conexão de Contas
- OAuth com Facebook/Instagram
- Suporte a múltiplas contas
- Token refresh automático
- Desconectar contas

### ✅ Agendamento de Posts
- Posts únicos e em lote
- Suporte a Imagem, Vídeo, Carrossel, Reels
- Primeiro comentário automático
- Preview antes de publicar
- Publicação automática via cron

### ✅ Biblioteca de Mídia
- Upload de imagens e vídeos
- Organização por pastas
- Busca e filtros
- Reutilização de mídia

### ✅ Analytics
- Métricas de conta (seguidores, engajamento)
- Métricas por post
- Gráficos de evolução
- Comparação de períodos

### ✅ Funcionalidades IA
- Geração de legendas (3 variações)
- Sugestão de hashtags otimizadas
- Melhores horários para postar
- Relatórios com insights automáticos

### ✅ Fluxo de Aprovação
- Status: pendente, aprovado, rejeitado
- Comentários internos
- Solicitação de alterações
- Histórico de ações

### ✅ Relatórios Automáticos
- Relatório semanal por email
- Insights gerados por IA
- Benchmarks do setor
- Recomendações de ações

---

## 📁 Estrutura de Arquivos Criados

```
lib/
├── instagram/
│   ├── auth.ts
│   ├── api.ts
│   ├── types.ts
│   └── index.ts
├── ai/
│   ├── caption-generator.ts
│   ├── hashtag-suggester.ts
│   ├── best-times.ts
│   └── insights-generator.ts
└── workers/
    ├── publish-scheduler.ts
    ├── analytics-fetcher.ts
    ├── best-times-calculator.ts
    └── report-sender.ts

app/
├── admin/
│   └── social/
│       ├── page.tsx
│       ├── connect/page.tsx
│       ├── calendar/page.tsx
│       ├── library/page.tsx
│       ├── analytics/page.tsx
│       ├── settings/page.tsx
│       ├── composer/page.tsx
│       └── approval/page.tsx
└── api/
    ├── social/
    │   └── instagram/
    │       ├── auth/route.ts
    │       ├── callback/route.ts
    │       ├── accounts/route.ts
    │       ├── stats/route.ts
    │       ├── posts/route.ts
    │       ├── sync/route.ts
    │       ├── media/route.ts
    │       ├── media/upload/route.ts
    │       ├── analytics/route.ts
    │       ├── settings/route.ts
    │       ├── approval/route.ts
    │       └── ai/
    │           ├── caption/route.ts
    │           ├── hashtags/route.ts
    │           └── best-times/route.ts
    └── cron/
        ├── instaflow-publish/route.ts
        ├── instaflow-analytics/route.ts
        ├── instaflow-best-times/route.ts
        └── instaflow-reports/route.ts

supabase/
└── migrations/
    └── 20260203_instaflow_tables.sql

vercel.cron.json
```

---

## ⚠️ Próximos Passos (Opcionais)

### 1. Calendário Drag & Drop
- Implementar reagendamento via arrastar e soltar
- Biblioteca sugerida: `@dnd-kit/core`

### 2. Preview de Post
- Mockup do feed do Instagram
- Suporte a múltiplas imagens

### 3. Respostas a Comentários
- Inbox unificado
- Respostas automáticas com IA

### 4. Stories
- Publicação de Stories
- Templates de Stories

### 5. DM Automation
- Respostas automáticas
- Sequências de mensagens

---

## 🎯 Rodmap Inspirado no mLabs

| Feature | Status |
|---------|--------|
| Multi-conta | ✅ |
| Agendamento | ✅ |
| Calendário | ✅ |
| Biblioteca de mídia | ✅ |
| Analytics | ✅ |
| IA para legendas | ✅ |
| IA para hashtags | ✅ |
| Melhores horários | ✅ |
| Fluxo de aprovação | ✅ |
| Relatórios automáticos | ✅ |
| Drag & Drop | ⏳ |
| Preview Feed | ⏳ |
| Inbox/Comentários | ⏳ |
| Stories | ⏳ |
| DM Automation | ⏳ |

---

**Desenvolvido para InstaFlow** 🚀
