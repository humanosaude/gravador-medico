# 🚀 Escala Automática de Ads - Documentação

## Visão Geral

Sistema completo para criar e otimizar campanhas no Facebook Ads usando inteligência artificial.

### Funcionalidades

1. **Launcher de Campanhas**: Upload de criativos + geração automática de copy com IA
2. **Auditor de Campanhas**: Monitora e otimiza anúncios automaticamente
3. **Logs de Otimização**: Histórico de todas as decisões tomadas

---

## 📦 Instalação

### 1. Instalar Dependência do Facebook

```bash
npm install facebook-nodejs-business-sdk
```

### 2. Configurar Variáveis de Ambiente

Adicione ao seu `.env.local`:

```env
# Meta/Facebook Ads
META_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxxxxxx
META_AD_ACCOUNT_ID=act_123456789
META_PAGE_ID=123456789
META_PIXEL_ID=123456789  # Opcional

# OpenAI (já deve existir)
OPENAI_API_KEY=sk-xxxxxxxxxxxx

# Cron Secret (para jobs agendados)
CRON_SECRET=sua-chave-secreta-aqui
```

### 3. Criar Tabelas no Supabase

Execute o SQL em `sql/ads-optimization-tables.sql` no Supabase Dashboard.

### 4. Criar Bucket de Storage

No Supabase Dashboard > Storage, crie um bucket chamado `creatives` e configure como público.

---

## 🔑 Obter Credenciais do Facebook

### Access Token de Longa Duração

1. Acesse o [Facebook Business Manager](https://business.facebook.com)
2. Vá em **Configurações do Negócio** > **Usuários do Sistema**
3. Crie ou selecione um usuário do sistema
4. Gere um token com as permissões:
   - `ads_management`
   - `ads_read`
   - `pages_read_engagement`
   - `business_management`

### Ad Account ID

1. No [Ads Manager](https://business.facebook.com/adsmanager)
2. O ID está na URL: `act_XXXXXXXXX`

### Page ID

1. Acesse sua Página do Facebook
2. Vá em **Sobre** > **Transparência da Página**
3. O ID está listado lá, ou use o [Graph API Explorer](https://developers.facebook.com/tools/explorer/)

---

## 🎯 Endpoints da API

### POST `/api/ads/launch`

Cria uma campanha completa com upload de imagens e geração de copy.

**Request (multipart/form-data):**
```
objective: "Venda de Curso de Medicina"
dailyBudget: "50"
targetAudience: "Médicos"
status: "PAUSED"
linkUrl: "https://seusite.com.br/checkout"
image0: [File]
image1: [File]
...
```

**Response:**
```json
{
  "success": true,
  "campaignId": "120212345678901234",
  "adSetId": "120212345678901235",
  "adCreativeIds": ["120212345678901236", "..."],
  "adIds": ["120212345678901237", "..."],
  "details": {
    "uploadedImages": ["https://..."],
    "generatedCopies": [
      {
        "primaryText": ["Texto 1", "Texto 2"],
        "headlines": ["Headline 1", "Headline 2"],
        "imageUrl": "https://..."
      }
    ]
  }
}
```

### GET `/api/ads/launch`

Verifica status da configuração da API.

### POST `/api/ads/optimize`

Executa a otimização automática de campanhas.

**Request (opcional):**
```json
{
  "rules": {
    "pauseSpendThreshold": 50,
    "scaleRoasThreshold": 3,
    "scaleBudgetIncrease": 0.20,
    "maxDailyBudget": 500,
    "datePreset": "last_7d"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Otimização concluída com sucesso",
  "summary": {
    "adsAnalyzed": 15,
    "paused": 3,
    "scaled": 2,
    "noAction": 10
  },
  "logs": [...]
}
```

### GET `/api/ads/optimize`

Retorna logs recentes e estatísticas de otimização.

---

## ⚙️ Regras de Otimização

### Pausa Automática

Se um anúncio gastar mais de **R$ 50** sem nenhuma venda, ele será **pausado**.

```
IF spend > 50 AND purchases == 0 THEN PAUSE
```

### Escala Automática

Se um anúncio tiver **ROAS > 3x**, o budget do AdSet será **aumentado em 20%**.

```
IF roas > 3 THEN budget *= 1.20
```

### Limites de Segurança

- Budget máximo por AdSet: R$ 500/dia
- Só escala se a diferença for significativa (> 5%)

---

## 📂 Estrutura de Arquivos

```
lib/ads/
├── types.ts              # Tipos TypeScript
├── meta-client.ts        # Cliente da Meta Marketing API
├── copy-generator.ts     # Gerador de copy com OpenAI
└── optimize-campaigns.ts # Lógica de otimização

app/api/ads/
├── launch/route.ts       # Endpoint de criação de campanhas
└── optimize/route.ts     # Endpoint de otimização

app/admin/ai/
├── page.tsx              # Página AI Performance (existente)
└── escala-automatica/
    └── page.tsx          # Nova página de Escala Automática

components/ads/
├── index.ts              # Exports
├── AdsLauncher.tsx       # Componente de criação de campanhas
└── OptimizationPanel.tsx # Painel de otimização

sql/
└── ads-optimization-tables.sql  # SQL para criar tabelas
```

---

## 🔄 Cron Job (Vercel)

Para executar a otimização automaticamente, configure um Cron Job na Vercel:

**vercel.json:**
```json
{
  "crons": [
    {
      "path": "/api/ads/optimize",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

Isso executará a otimização a cada 6 horas.

---

## 🎨 Públicos-Alvo Disponíveis

| Público | Interesses do Facebook |
|---------|----------------------|
| Médicos | Medicine, Health care, Physicians |
| Dentistas | Dentistry, Health care |
| Enfermeiros | Nursing, Health care |
| Saúde | Health care, Fitness and wellness |
| Empreendedores | Entrepreneurship, Small business, Business |
| Educação | Education, Online learning |
| Tecnologia | Technology, Software |

---

## 🐛 Troubleshooting

### Erro: "Token de acesso expirado"
→ Gere um novo token no Business Manager

### Erro: "Orçamento abaixo do mínimo"
→ O Facebook exige mínimo de R$ 6,00/dia

### Erro: "Anúncio rejeitado pelas políticas"
→ Verifique se a imagem/texto não viola as políticas do Facebook

### Erro: "Limite de requisições atingido"
→ Aguarde alguns minutos e tente novamente

---

## 📞 Suporte

Para dúvidas ou problemas, verifique:

1. Logs no terminal do servidor
2. Tabela `ads_campaigns_log` no Supabase
3. Tabela `optimization_logs` para histórico de otimizações
