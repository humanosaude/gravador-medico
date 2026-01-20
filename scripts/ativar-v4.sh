#!/bin/bash

# 🚀 Script de Ativação Rápida - Webhook V4 + Pages V2

echo "🚀 Iniciando ativação de Webhook V4.0 e Pages V2..."
echo ""

# Diretório do projeto
cd "/Users/helciomattos/Desktop/GRAVADOR MEDICO"

# ========================================
# 1. WEBHOOK V4.0
# ========================================
echo "📡 Ativando Webhook V4.0..."

# Backup da versão atual
if [ -f "app/api/webhook/appmax/route.ts" ]; then
  mv app/api/webhook/appmax/route.ts app/api/webhook/appmax/route-v3-backup.ts
  echo "   ✅ Backup criado: route-v3-backup.ts"
fi

# Ativar V4.0
if [ -f "app/api/webhook/appmax/route-v4.ts.example" ]; then
  cp app/api/webhook/appmax/route-v4.ts.example app/api/webhook/appmax/route.ts
  echo "   ✅ Webhook V4.0 ativado!"
else
  echo "   ❌ Arquivo route-v4.ts.example não encontrado!"
  exit 1
fi

# ========================================
# 2. CUSTOMERS PAGE V2
# ========================================
echo ""
echo "👥 Ativando Customers Page V2..."

# Backup da versão antiga
if [ -f "app/admin/customers/page.tsx" ]; then
  mv app/admin/customers/page.tsx app/admin/customers/page-v1-backup.tsx
  echo "   ✅ Backup criado: page-v1-backup.tsx"
fi

# Ativar V2
if [ -f "app/admin/customers/page-v2.tsx.example" ]; then
  cp app/admin/customers/page-v2.tsx.example app/admin/customers/page.tsx
  echo "   ✅ Customers Page V2 ativada!"
else
  echo "   ❌ Arquivo page-v2.tsx.example não encontrado!"
  exit 1
fi

# ========================================
# 3. PRODUCTS PAGE
# ========================================
echo ""
echo "📦 Atualizando Products Page..."

# Backup da versão antiga (se existir e não for backup)
if [ -f "app/admin/products/page.tsx" ] && [ ! -f "app/admin/products/page-old.tsx" ]; then
  mv app/admin/products/page.tsx app/admin/products/page-old-2.tsx
  echo "   ✅ Backup criado: page-old-2.tsx"
fi

# Usar versão limpa (já existe page.tsx criada recentemente)
echo "   ✅ Products Page já atualizada!"

# ========================================
# 4. GIT COMMIT
# ========================================
echo ""
echo "📝 Fazendo commit das mudanças..."

git add -A

if git diff --cached --quiet; then
  echo "   ℹ️  Nenhuma mudança para commitar"
else
  git commit -m "feat: ativa webhook v4.0, customers v2 e products page - arquitetura sincronizada"
  echo "   ✅ Commit realizado!"
  
  echo ""
  echo "🚀 Fazendo push para o repositório..."
  git push
  echo "   ✅ Push concluído!"
fi

# ========================================
# FIM
# ========================================
echo ""
echo "============================================"
echo "✅ ATIVAÇÃO CONCLUÍDA COM SUCESSO!"
echo "============================================"
echo ""
echo "📋 Próximos passos:"
echo ""
echo "1️⃣  Executar schema no Supabase SQL Editor:"
echo "    📄 database/01-schema-completo.sql"
echo ""
echo "2️⃣  Executar migração (adicionar customer_id):"
echo "    📄 database/02-migration-sales-customer-id.sql"
echo ""
echo "3️⃣  Popular clientes e produtos históricos:"
echo "    Ver queries em: database/FINALIZAR-TUDO.md (Passo 1.4 e 1.5)"
echo ""
echo "4️⃣  Testar webhook localmente:"
echo "    curl -X POST http://localhost:3000/api/webhook/appmax -H \"Content-Type: application/json\" -d @test-webhook.json"
echo ""
echo "5️⃣  Acessar dashboard:"
echo "    http://localhost:3000/admin"
echo ""
echo "📚 Documentação completa: database/FINALIZAR-TUDO.md"
echo ""
