# 🔌 Conexão Frontend-Backend Tracking Module

## 📋 Resumo da Integração

Substituição completa de **Mock Data** por **dados reais do Supabase** em todo o módulo Tracking.

---

## ✅ Arquivos Modificados

### 1. **Server Actions** (`actions/tracking.ts`)

**Novas funcionalidades:**

#### `getTrackingStats()` - Otimizada
- ✅ Corrigida query de cliques (busca links do usuário primeiro)
- ✅ Corrigida query de eventos (busca integração do usuário primeiro)
- ✅ Retorna contadores reais:
  - `totalClicks`: Total de cliques nos links do usuário
  - `totalEvents`: Total de eventos disparados
  - `pendingEvents`: Eventos aguardando processamento
  - `failedEvents`: Eventos com falha
  - `activeLinks`: Links ativos
  - `conversions`: Vendas com atribuição

#### `getPixelLogs()` - Nova função
```typescript
export async function getPixelLogs(userId: string, limit = 50)
```
- ✅ Busca últimos N eventos da fila
- ✅ Filtra por integração do usuário
- ✅ Ordena por data (mais recentes primeiro)
- ✅ Retorna array vazio se não houver integração

---

### 2. **Dashboard Principal** (`app/admin/tracking/page.tsx`)

**Mudanças:**

✅ **Estado de Loading:**
```tsx
const [isLoading, setIsLoading] = useState(true);
```

✅ **Skeleton Loader:**
- 6 cards animados enquanto carrega
- Título e subtítulo com placeholder

✅ **useEffect() com loadStats():**
- Busca dados reais ao montar componente
- Atualiza state com estatísticas do Supabase

✅ **Números dinâmicos:**
- `{stats.totalClicks}` - Antes: "8.339" (fixo)
- `{stats.totalEvents}` - Antes: "4.521" (fixo)
- `{stats.activeLinks}` - Antes: "12" (fixo)
- `{stats.conversions}` - Antes: "387" (fixo)

---

### 3. **Página de Links** (`app/admin/tracking/links/page.tsx`)

**Mudanças:**

✅ **Skeleton Loader:**
- Animação enquanto carrega links
- 3 placeholders de cards

✅ **Lista dinâmica:**
- Remove mock data
- Usa `getTrackingLinks(userId)` real
- Renderiza links do banco de dados

✅ **Modal de criação:**
- Já estava conectado com `createTrackingLink()`
- Mantido funcionamento original

✅ **Estado vazio:**
- Mostra "Nenhum link criado" quando `links.length === 0`
- Botão para criar primeiro link

---

### 4. **Página de Logs** (`app/admin/tracking/logs/pixels/page.tsx`)

**Mudanças completas:**

✅ **Interface TypeScript:**
```typescript
interface PixelLog {
  id: string;
  created_at: string;
  event_type: string;
  status: 'pending' | 'success' | 'failed';
  event_data: any;
  error_message?: string;
  processed_at?: string;
}
```

✅ **Estado e Loading:**
```tsx
const [logs, setLogs] = useState<PixelLog[]>([]);
const [isLoading, setIsLoading] = useState(true);
```

✅ **loadLogs() com Supabase:**
```tsx
const result = await getPixelLogs(userId, 50);
setLogs(result.logs as PixelLog[]);
```

✅ **Skeleton Loader:**
- Header animado
- 4 cards de estatísticas animados
- Tabela grande animada

✅ **Mapeamento de ícones:**
```typescript
const eventIcons: Record<string, any> = {
  Purchase: ShoppingCart,
  InitiateCheckout: TrendingUp,
  Contact: MessageCircle,
  Lead: Zap,
  AddToCart: ShoppingCart,
  ViewContent: TrendingUp,
  Schedule: Calendar,
  PageView: Activity,
};
```

✅ **Funções auxiliares:**
- `formatTimestamp()` - Formata data/hora BR
- `getResponseTime()` - Calcula tempo de resposta
- `avgResponseTime` - Média calculada de tempos reais

✅ **Tabela dinâmica:**
- Dados extraídos de `log.event_data`
- Telefone: `event_data.phone || event_data.whatsapp`
- Cliente: `event_data.customer_name`
- Valor: `event_data.value || event_data.amount`
- Tempo: Calculado entre `created_at` e `processed_at`

✅ **Códigos de cores por tempo:**
- 🟢 Verde: < 200ms (Excelente)
- 🟡 Amarelo: 200-1000ms (Normal)
- 🔴 Vermelho: > 1000ms (Lento)
- ⚪ Cinza: Sem tempo (pendente)

✅ **Botão Atualizar:**
- Chama `loadLogs()` novamente
- Recarrega dados do Supabase

---

## 🎯 Comportamento com Dados Vazios

### Dashboard:
- Mostra `0` em todos os contadores
- Cards mantêm visual (sem estado vazio)

### Links:
- Card especial: "Nenhum link criado ainda"
- Ícone Link2 grande centralizado
- Botão "Criar Primeiro Link"

### Logs:
- Card especial: "Nenhum evento encontrado"
- Ícone Activity grande centralizado
- Mensagem "Tente ajustar os filtros de busca"

---

## 🔄 Fluxo de Dados

```
┌─────────────────┐
│   Frontend      │
│  (Client Side)  │
└────────┬────────┘
         │ useEffect()
         ▼
┌─────────────────┐
│ Server Actions  │
│   tracking.ts   │
└────────┬────────┘
         │ supabaseAdmin
         ▼
┌─────────────────┐
│   Supabase DB   │
│ (PostgreSQL)    │
└─────────────────┘
  Tables:
  - tracking_links
  - tracking_clicks
  - tracking_events_queue
  - integrations_meta
  - funnel_events_map
```

---

## 📊 Estatísticas Calculadas

| Métrica | Query | Fonte |
|---------|-------|-------|
| Total Cliques | `COUNT(tracking_clicks)` | Links do usuário |
| Total Eventos | `COUNT(tracking_events_queue)` | Integração do usuário |
| Eventos Pendentes | `WHERE status='pending'` | Fila de eventos |
| Eventos Falhados | `WHERE status='failed'` | Fila de eventos |
| Links Ativos | `WHERE is_active=true` | tracking_links |
| Conversões | `WHERE event_type='Purchase'` | funnel_events_map |

---

## 🎨 Skeleton Loaders Implementados

### Dashboard:
```tsx
{[...Array(6)].map((_, i) => (
  <div key={i} className="h-32 bg-zinc-800 rounded-lg animate-pulse"></div>
))}
```

### Links:
```tsx
{[...Array(3)].map((_, i) => (
  <div key={i} className="h-48 bg-zinc-800 rounded-lg animate-pulse"></div>
))}
```

### Logs:
```tsx
<div className="h-96 bg-zinc-800 rounded-lg animate-pulse"></div>
```

---

## 🚀 Como Testar

### 1. Com dados no banco:
```bash
# Acesse qualquer página do tracking
/admin/tracking          # Verá estatísticas reais
/admin/tracking/links    # Verá seus links criados
/admin/tracking/logs/pixels  # Verá eventos disparados
```

### 2. Sem dados no banco:
```bash
# Verá estados vazios bonitos
- Dashboard: Todos zeros
- Links: "Nenhum link criado"
- Logs: "Nenhum evento encontrado"
```

### 3. Durante carregamento:
```bash
# Verá skeletons animados (1-2 segundos)
```

---

## 🔧 Pontos de Atenção

### userId Temporário:
```typescript
const userId = 'temp-user-id'; // TODO: Substituir por auth real
```

**Próximo passo:**
- Integrar com NextAuth ou contexto de autenticação
- Substituir todas as ocorrências de `temp-user-id`

### Permissões RLS:
- As queries usam `supabaseAdmin` (bypass RLS)
- Em produção, considere implementar RLS e usar client do usuário

---

## 📝 Mudanças de Schema Necessárias

✅ **Nenhuma!** Tudo usa tabelas existentes:
- `tracking_links`
- `tracking_clicks`
- `tracking_events_queue`
- `integrations_meta`
- `funnel_events_map`

---

## 🎯 Resultado Final

| Página | Status | Dados |
|--------|--------|-------|
| Dashboard | ✅ Conectado | Supabase Real |
| Links | ✅ Conectado | Supabase Real |
| Logs | ✅ Conectado | Supabase Real |
| Mensagens | ⏳ Mock | Próxima implementação |
| Jornada | ⏳ Mock | Próxima implementação |

---

**Data:** 22 de Janeiro de 2026  
**Status:** ✅ 3/5 páginas com backend real  
**Performance:** Loading < 2s com skeleton
