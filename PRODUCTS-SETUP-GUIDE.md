# 🎯 Guia de Configuração - Produtos Intelligence

## Passo a Passo para Ativação

### 1️⃣ Executar SQL no Supabase

Acesse o **SQL Editor** do Supabase e execute o arquivo completo:

```
database/PRODUCTS-INTELLIGENCE.sql
```

Este SQL irá criar:
- ✅ Tabela `products` (catálogo oficial)
- ✅ View `product_performance` (métricas agregadas)
- ✅ View `product_trends` (sparklines para gráficos)
- ✅ Função `discover_products_from_sales()` (auto-discovery)
- ✅ Índices otimizados (GIN para JSONB)
- ✅ RLS (Row Level Security)
- ✅ Constraint UNIQUE no `external_id`

**Tempo estimado:** 2-3 segundos

---

### 2️⃣ Testar a Sincronização

Após executar o SQL, teste a API de sincronização:

#### Via Terminal (cURL):
```bash
curl -X POST http://localhost:3000/api/admin/products/sync
```

#### Resposta Esperada:
```json
{
  "success": true,
  "message": "15 produtos sincronizados com sucesso",
  "discovered_count": 15,
  "products": [
    {
      "external_id": "123",
      "name": "Gravador Médico Pro - Mensal",
      "price": 97.00,
      "category": "auto-detected"
    }
  ],
  "synced_at": "2026-01-21T..."
}
```

---

### 3️⃣ Acessar a Interface

Navegue para:

```
http://localhost:3000/admin/products
```

**O que você verá:**

📊 **KPI Cards:**
- 🏆 Produto Mais Vendido
- ⚠️ Produto com Maior Reembolso
- 💰 Ticket Médio
- 📊 Health Score Médio

📋 **Tabela de Produtos:**
- Nome do produto
- Preço
- Vendas (últimos 30 dias)
- Receita total
- Taxa de Reembolso (🟢 < 1%, 🟡 < 5%, 🔴 > 5%)
- Taxa de Conversão
- Health Score (0-100)
- Status (Ativo/Inativo)
- Ações (Copiar Link, Editar)

🔄 **Botão "Sincronizar com Vendas":**
- Varre as últimas 200 vendas
- Extrai produtos do JSONB `items`
- Cria automaticamente produtos novos
- Atualiza preços de produtos existentes

---

### 4️⃣ Como Funciona a Auto-Discovery

A sincronização:

1. **Busca vendas** da tabela `sales` (fallback para `checkout_attempts`)
2. **Extrai itens** do campo JSONB `items`
3. **Deduplicada** produtos por `external_id` ou `product_id`
4. **Upsert** na tabela `products`:
   - Se produto não existe → **Cria**
   - Se produto existe → **Atualiza preço**

**Estrutura esperada do JSONB `items`:**
```json
[
  {
    "id": "123",
    "title": "Gravador Médico Pro",
    "unit_price": 97.00,
    "quantity": 1,
    "image_url": "https://..."
  }
]
```

---

### 5️⃣ Métricas de Performance (View)

A `product_performance` calcula automaticamente:

**Métricas Financeiras:**
- `total_sales`: Quantidade de vendas aprovadas
- `total_revenue`: Receita total (R$)
- `avg_price`: Preço médio

**Métricas de Qualidade:**
- `refund_rate`: Taxa de reembolso (%)
- `conversion_rate`: Taxa de conversão checkout → venda (%)
- `health_score`: Pontuação 0-100 baseada em reembolsos e falhas

**Fórmula do Health Score:**
```
Health = 100 
  - (refund_rate * 50)      // Perde até 50 pontos
  - (failure_rate * 30)     // Perde até 30 pontos
```

**Exemplo:**
- Produto com 0% reembolso e 0% falhas = **100**
- Produto com 10% reembolso e 5% falhas = **45**

---

### 6️⃣ Funcionalidades Operacionais

#### Copiar Link do Checkout
Clique no ícone **📋 Copy** para copiar o `checkout_url` do produto.

#### Ativar/Desativar Produto
Clique no badge de status (🟢 Ativo / ⚪ Inativo) para alternar.

#### Editar Produto
Clique no ícone **✏️ Edit** (funcionalidade em construção).

#### Filtros
- **Busca:** Nome do produto
- **Categoria:** subscription, one_time, upsell, auto-detected

---

### 7️⃣ Troubleshooting

#### ❌ Erro: "Nenhum produto encontrado"
**Causa:** Tabela `sales` está vazia.

**Solução:**
1. Verifique se tem vendas: `SELECT COUNT(*) FROM sales`
2. Se não tiver, insira vendas de teste ou aguarde webhooks da Appmax

#### ❌ Erro: "duplicate key value violates unique constraint"
**Causa:** Tentando inserir produto com `external_id` duplicado.

**Solução:** O upsert deve resolver automaticamente. Se persistir:
```sql
-- Limpar duplicatas manualmente
DELETE FROM products 
WHERE id NOT IN (
  SELECT MIN(id) 
  FROM products 
  GROUP BY external_id
);
```

#### ❌ Performance está vazia
**Causa:** View `product_performance` usa dados dos últimos 30 dias.

**Solução:** Aguarde vendas recentes ou ajuste o intervalo no SQL:
```sql
WHERE s.created_at > (now() - interval '90 days') -- Aumentar para 90 dias
```

---

### 8️⃣ Próximos Passos

- [ ] Adicionar Drawer de Edição completo
- [ ] Implementar Sparklines (gráficos de tendência)
- [ ] Configurar Upsells/Order Bumps
- [ ] Exportar relatório de produtos (CSV/Excel)
- [ ] Dashboard de comparação entre produtos

---

## 🎉 Pronto!

Agora você tem um **Product Intelligence Center** completo:

✅ Auto-discovery de produtos
✅ Métricas de performance em tempo real
✅ Health Score automático
✅ Alertas de produtos problemáticos
✅ Interface visual de classe mundial

**Tempo total de setup:** ~5 minutos

---

## 📊 SQL Executado

Arquivo completo:
```
/database/PRODUCTS-INTELLIGENCE.sql
```

Principais objetos criados:
- `public.products` (table)
- `public.product_performance` (view)
- `public.product_trends` (view)
- `discover_products_from_sales()` (function)
- 8 índices otimizados
- 4 políticas RLS

**Próxima vez que fizer deploy:**
Execute novamente o SQL no Supabase de produção!
