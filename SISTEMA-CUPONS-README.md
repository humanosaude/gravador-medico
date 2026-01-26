# Sistema de Cupons de Desconto

Sistema completo de gerenciamento de cupons de desconto integrado com Supabase.

## 🚀 Funcionalidades

- ✅ Gerenciamento completo de cupons via painel admin
- ✅ Validação em tempo real no checkout
- ✅ Tipos de desconto: Porcentagem e Valor Fixo
- ✅ Limite de uso e controle de quantidade
- ✅ Data de expiração
- ✅ Valor mínimo do pedido
- ✅ Incremento automático de uso após pagamento
- ✅ Interface moderna com Shadcn UI

## 📋 Instalação

### 1. Executar Migration no Supabase

Execute o script SQL no Supabase:

```bash
# Copie o conteúdo de database/09-create-coupons-table.sql
# Cole no Supabase SQL Editor e execute
```

Ou via Supabase CLI:

```bash
supabase db push
```

### 2. Verificar Tabela Criada

A migration cria:
- Tabela `coupons` com todos os campos
- Índices para performance
- Funções RPC para validação e incremento
- Policies de segurança (RLS)
- Cupons de exemplo (ADMGM e DESCONTOGC)

## 🎯 Como Usar

### Acessar Painel Admin

```
https://seusite.com/admin/cupons
```

### Criar Novo Cupom

1. Clique em "Novo Cupom"
2. Preencha os dados:
   - **Código**: Nome do cupom (sempre em MAIÚSCULAS)
   - **Tipo**: Porcentagem (%) ou Valor Fixo (R$)
   - **Valor**: Quantidade de desconto
   - **Valor Mínimo**: Valor mínimo do pedido (opcional)
   - **Limite de Uso**: Quantas vezes pode ser usado (opcional)
   - **Data de Expiração**: Quando expira (opcional)
   - **Descrição**: Nota interna sobre o cupom
3. Salvar

### No Checkout

O cliente digita o código do cupom e clica em "Aplicar":
- Sistema valida em tempo real
- Mostra mensagens de erro claras
- Aplica desconto automaticamente
- Incrementa uso após pagamento confirmado

## 🔧 APIs Disponíveis

### Validar Cupom

```typescript
POST /api/checkout/validate-coupon
Body: { code: string, cartTotal: number }
Response: { valid: boolean, discountAmount?: number, newTotal?: number, errorMessage?: string }
```

### Incrementar Uso

```typescript
POST /api/coupons/increment
Body: { code: string, orderId?: string }
Response: { success: boolean, message: string }
```

### CRUD de Cupons (Admin)

```typescript
// Listar todos
GET /api/admin/coupons
GET /api/admin/coupons?active=true

// Buscar específico
GET /api/admin/coupons/[id]

// Criar
POST /api/admin/coupons
Body: CouponFormData

// Atualizar
PATCH /api/admin/coupons/[id]
Body: Partial<CouponFormData>

// Deletar (soft delete)
DELETE /api/admin/coupons/[id]
```

## 📊 Estatísticas

O painel admin mostra:
- Total de cupons cadastrados
- Cupons ativos
- Total de usos de todos os cupons

## 🔒 Segurança

- RLS (Row Level Security) ativado
- Apenas admins podem criar/editar cupons
- Validação server-side obrigatória
- Cupons sempre em MAIÚSCULAS
- Proteção contra valores negativos
- Valor mínimo garantido de R$ 0,10

## 📁 Arquivos Criados

```
database/
  └── 09-create-coupons-table.sql    # Migration do banco

lib/types/
  └── coupon.ts                       # Tipos TypeScript

app/api/
  ├── checkout/validate-coupon/
  │   └── route.ts                    # Validação de cupom
  ├── coupons/increment/
  │   └── route.ts                    # Incrementar uso
  └── admin/coupons/
      ├── route.ts                    # Listar e criar
      └── [id]/route.ts               # CRUD específico

app/admin/cupons/
  └── page.tsx                        # Painel admin

app/checkout/
  └── page.tsx                        # Integrado com Supabase
```

## ⚠️ Importante

- Cupons hardcoded foram **removidos** do código
- Agora todos os cupons vêm do banco de dados
- Para criar novos cupons, use o painel `/admin/cupons`
- O webhook/obrigado já incrementa o uso automaticamente

## 🎉 Migração dos Cupons Existentes

Os cupons `ADMGM` e `DESCONTOGC` foram automaticamente migrados para o banco na execução do script SQL.

## 📞 Suporte

Em caso de dúvidas, consulte a documentação do Supabase ou entre em contato com o desenvolvedor.
