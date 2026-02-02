# 🎯 Escala Automática de Ads - Configurações Meta

## Visão Geral

Este documento descreve o sistema de configuração de ativos Meta para a IA de Escala Automática de Ads.

## 📁 Arquivos Criados

### Backend

| Arquivo | Descrição |
|---------|-----------|
| `app/api/meta/assets/route.ts` | API para listar e salvar ativos Meta (GET/POST/DELETE) |
| `app/api/system/setup-db/route.ts` | Rota para verificar/criar tabelas |
| `app/api/ads/launch-v2/route.ts` | Lançador V2 com suporte a vídeo e funil |

### Frontend

| Arquivo | Descrição |
|---------|-----------|
| `components/ads/MetaAssetSelector.tsx` | Componente de seleção de ativos |
| `app/admin/ai/settings/page.tsx` | Página de configurações (`/admin/ai/settings`) |

### Banco de Dados

| Tabela | Descrição |
|--------|-----------|
| `integration_settings` | Salva configurações de ativos Meta por usuário |
| `ads_campaigns` | Log de campanhas criadas |
| `ads_creatives` | Log de criativos (imagens/vídeos) |
| `ads_audiences` | Públicos salvos |
| `ads_optimization_logs` | Logs de otimização |
| `ads_optimization_rules` | Regras de otimização customizáveis |

---

## 🔧 Como Usar

### 1. Executar SQL (Obrigatório)

Execute o SQL no Supabase Dashboard:

1. Acesse: https://supabase.com/dashboard/project/egsmraszqnmosmtjuzhx/sql/new
2. Cole o conteúdo de `sql/escala-automatica-v2.sql`
3. Clique em "Run"

### 2. Configurar Ativos Meta

1. Acesse: `/admin/ai/settings`
2. Selecione:
   - **Conta de Anúncio** (obrigatório)
   - **Página do Facebook** (recomendado)
   - **Pixel** (recomendado)
   - **Instagram** (opcional)
3. Clique em "Salvar Configuração Padrão"

### 3. Criar Campanhas

1. Acesse: `/admin/ai/escala-automatica`
2. Faça upload de imagens/vídeos
3. Defina objetivo, orçamento e estágio do funil
4. Clique em "Lançar Campanha"

---

## 📡 API de Assets

### GET /api/meta/assets

Lista todos os ativos disponíveis na BM.

**Response:**
```json
{
  "success": true,
  "data": {
    "adAccounts": [
      { "id": "1559431300891081", "name": "LifsPlan", "currency": "BRL" }
    ],
    "pages": [
      { "id": "991151257411642", "name": "Gravador Médico" }
    ],
    "pixels": [
      { "id": "1430691785287241", "name": "Método Gravador Médico" }
    ],
    "instagramAccounts": [
      { "id": "17841427934480997", "name": "lifsplan" }
    ]
  }
}
```

### POST /api/meta/assets

Salva a configuração selecionada.

**Body:**
```json
{
  "adAccountId": "1559431300891081",
  "adAccountName": "LifsPlan",
  "pageId": "991151257411642",
  "pageName": "Gravador Médico",
  "pixelId": "1430691785287241",
  "pixelName": "Método Gravador Médico"
}
```

---

## 🔒 Segurança

- As configurações são salvas **por usuário** (via `user_id` do Supabase Auth)
- Se não houver configuração, o sistema usa fallback do `.env`
- Se não houver configuração E não houver `.env`, retorna erro amigável

---

## 📊 Fluxo de Dados

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Frontend       │────▶│  /api/meta/     │────▶│  Meta Graph     │
│  MetaSelector   │     │  assets         │     │  API            │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                      │
         ▼                      ▼
┌─────────────────┐     ┌─────────────────┐
│  Salvar         │────▶│  Supabase       │
│  Configuração   │     │  integration_   │
│                 │     │  settings       │
└─────────────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│  Criar          │────▶│  /api/ads/      │
│  Campanha       │     │  launch-v2      │
└─────────────────┘     └─────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  1. Busca config do banco (integration_settings)
│  2. Se não encontrar, usa .env
│  3. Se não tiver nenhum, retorna erro
│  4. Cria campanha na conta selecionada
└─────────────────────────────────────────┘
```

---

## ⚠️ Erros Comuns

| Código | Mensagem | Solução |
|--------|----------|---------|
| `META_NOT_CONFIGURED` | Configuração Meta incompleta | Configure em /admin/ai/settings |
| `PAGE_NOT_CONFIGURED` | Página não configurada | Selecione uma página |
| Token expirado | Token de acesso da Meta não configurado | Renovar token no .env |

---

## 🚀 Próximos Passos

1. [x] Criar rota de assets
2. [x] Criar componente de seleção
3. [x] Criar página de configurações
4. [x] Atualizar launch para ler do banco
5. [ ] Executar SQL no Supabase (manual)
6. [ ] Testar fluxo completo
