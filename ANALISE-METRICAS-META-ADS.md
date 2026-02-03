# 📊 ANÁLISE COMPLETA: Métricas do Meta Ads Dashboard

**Data da Análise**: 3 de Fevereiro de 2026

---

## 🔴 PROBLEMAS IDENTIFICADOS E CORRIGIDOS

### 1. COMPRAS TRIPLICADAS (CORRIGIDO ✅)

**Problema**: O dashboard mostrava 9 compras quando na verdade eram apenas 3.

**Causa**: O Meta retorna **múltiplas versões do mesmo evento de compra**:
```json
{"action_type":"purchase","value":"3"},           // Versão 1
{"action_type":"omni_purchase","value":"3"},      // Versão 2
{"action_type":"offsite_conversion.fb_pixel_purchase","value":"3"}  // Versão 3
```

Todas representam a **MESMA transação**, mas o código somava todas: `3 + 3 + 3 = 9`

**Correção aplicada em**:
- `/lib/meta-marketing.ts`
- `/lib/analytics-hub/external/meta-connector.ts`

```typescript
// ANTES (errado - contava duplicatas)
ACTION_TYPES.purchases = ['purchase', 'omni_purchase', 'offsite_conversion.fb_pixel_purchase']

// DEPOIS (correto - conta apenas uma vez)
ACTION_TYPES.purchases = ['offsite_conversion.fb_pixel_purchase']
```

---

### 2. ROAS SEMPRE ZERO (EM INVESTIGAÇÃO ⚠️)

**Problema**: ROAS nunca carrega, sempre mostra 0.

**Causa**: A Meta API **não está retornando `action_values`** (valores monetários das conversões).

**Verificação direta na API**:
```bash
# Pedimos action_values...
curl "https://graph.facebook.com/.../insights?fields=action_values..."

# Mas a resposta NÃO inclui action_values:
{"campaign_name":"...", "spend":"69.53", ...}  # action_values ausente!
```

**Possíveis causas**:
1. ❌ Eventos de Purchase enviados **sem valor** (`value: 0`)
2. ❌ Configuração de valor no Pixel/CAPI incorreta
3. ❌ Conversões não associadas a um valor no Events Manager

**Verificação do CAPI** (código está correto):
```typescript
// lib/tracking/core.ts - trackPurchase envia value corretamente
custom_data: {
  value: sale.totalAmount,  // ✅ Valor está sendo enviado
  currency: 'BRL',
  order_id: sale.orderId,
}
```

**Próximos passos**:
1. Verificar no Facebook Events Manager se os eventos Purchase têm valor
2. Verificar se o Pixel do browser está enviando valor
3. Verificar se há delay na atribuição de valores pelo Meta

---

### 3. O QUE CADA MÉTRICA REPRESENTA

| Métrica | Fonte | Descrição | Evento Meta |
|---------|-------|-----------|-------------|
| **Compras** | Meta Ads API | Compras **atribuídas aos anúncios** pelo Meta | `offsite_conversion.fb_pixel_purchase` |
| **Receita** | Meta Ads API | Valor total das compras atribuídas (requer `action_values`) | soma dos `action_values` de purchase |
| **Leads** | Meta Ads API | Leads gerados pelos anúncios | `offsite_conversion.fb_pixel_lead` |
| **ROAS** | Calculado | Receita ÷ Gasto | `totalPurchaseValue / totalSpend` |
| **CPA** | Calculado | Custo por Aquisição (Gasto ÷ Compras) | `totalSpend / totalPurchases` |

---

## 📊 DADOS REAIS DE HOJE (03/02/2026)

### Dados do Meta Ads API (por campanha):

| Campanha | Gasto | Compras (fb_pixel) | Impressões | Cliques |
|----------|-------|-------------------|------------|---------|
| GM - UGC Teste | R$ 69.53 | 3 | 2.688 | 77 |
| LOW TICKET | R$ 14.77 | 0 | 478 | 13 |
| WHATSAPP | R$ 4.76 | 0 | 225 | 4 |
| **TOTAL** | **R$ 89.06** | **3** | **3.391** | **94** |

### Dados do Pixel (eventos recebidos):

| Evento | Contagem | Observação |
|--------|----------|------------|
| Purchase | 6 | ⚠️ Mais que o reportado em Ads (possível deduplicação) |
| InitiateCheckout | 12 | - |
| Lead | 4 | - |
| PageView | ~700 | - |

---

## ⚠️ DISCREPÂNCIA: PIXEL vs ADS

- **Pixel recebeu**: 6 eventos de Purchase
- **Ads reporta**: 3 compras atribuídas

**Explicação**: O Meta faz **deduplicação** e **atribuição**:
1. Alguns Purchase podem não estar dentro da janela de atribuição (7 dias click, 1 dia view)
2. Alguns Purchase podem ser orgânicos (não vieram de anúncios)
3. Deduplicação por `event_id` remove duplicatas

---

## 🔧 RECOMENDAÇÕES

### Para ROAS funcionar:

1. **Verificar Events Manager**:
   - Acesse: `business.facebook.com/events_manager/`
   - Clique no Pixel → Eventos → Purchase
   - Verifique se tem "Valor" associado aos eventos

2. **Verificar se o valor está chegando**:
   - Use o Meta Pixel Helper (extensão Chrome)
   - Faça uma compra de teste
   - Verifique se o evento Purchase tem `value` > 0

3. **Verificar configuração CAPI**:
   - Em `/admin/ai/settings`, verifique se Pixel ID está correto
   - Verifique se `META_ACCESS_TOKEN` tem permissão de enviar eventos

### Para métricas precisas:

1. ✅ **Usar apenas `offsite_conversion.fb_pixel_*`** (já corrigido)
2. ⚠️ **Aguardar 24-48h** para dados do Meta se estabilizarem
3. ✅ **Comparar com dashboard de vendas** do seu sistema

---

## 📋 RESUMO DAS CORREÇÕES APLICADAS

| Arquivo | Correção |
|---------|----------|
| `lib/meta-marketing.ts` | ACTION_TYPES agora usa apenas `offsite_conversion.fb_pixel_*` |
| `lib/analytics-hub/external/meta-connector.ts` | Mesma correção |

**Resultado esperado após correção**:
- ✅ Compras: 3 (não mais 9)
- ✅ Leads: 1-2 (não mais duplicados)
- ⚠️ ROAS: Ainda 0 (aguardando `action_values` do Meta)
