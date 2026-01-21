#!/usr/bin/env node

/**
 * 🔍 Script de Diagnóstico: Carrinhos Abandonados
 * 
 * Verifica se a tabela abandoned_carts existe e mostra os dados
 */

const fs = require('fs')
const path = require('path')

// Carregar .env.local manualmente
const envPath = path.join(__dirname, '..', '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=')
    if (key && valueParts.length) {
      process.env[key.trim()] = valueParts.join('=').trim()
    }
  })
}

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Erro: Variáveis de ambiente não configuradas')
  console.log('💡 Verifique se o arquivo .env.local existe\n')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkAbandonedCarts() {
  console.log('═══════════════════════════════════════════════════')
  console.log('🔍 DIAGNÓSTICO: Carrinhos Abandonados')
  console.log('═══════════════════════════════════════════════════\n')
  
  // 1️⃣ Verificar se a tabela existe
  console.log('1️⃣  Verificando tabela abandoned_carts...')
  const { data, error, count } = await supabase
    .from('abandoned_carts')
    .select('*', { count: 'exact' })
  
  if (error) {
    console.error('❌ ERRO:', error.message)
    console.log('\n📋 A tabela provavelmente NÃO EXISTE.\n')
    console.log('📝 SOLUÇÃO:')
    console.log('   1. Acesse: https://supabase.com/dashboard')
    console.log('   2. Vá em: SQL Editor')
    console.log('   3. Execute: database/CORRECAO-FINAL-DASHBOARD.sql')
    console.log('   4. Clique em RUN ▶️\n')
    console.log('═══════════════════════════════════════════════════')
    return
  }

  console.log('✅ Tabela existe!\n')

  // 2️⃣ Contar registros
  console.log('2️⃣  Contando registros...')
  console.log(`📊 Total de registros: ${count || 0}\n`)

  if (!data || data.length === 0) {
    console.log('⚠️  ATENÇÃO: Tabela está VAZIA\n')
    console.log('📝 SOLUÇÃO:')
    console.log('   Execute o SQL novamente para inserir dados de teste')
    console.log('   Ou aguarde carrinhos reais serem abandonados\n')
    console.log('═══════════════════════════════════════════════════')
    return
  }

  // 3️⃣ Mostrar estatísticas por status
  console.log('3️⃣  Estatísticas por Status:')
  const stats = data.reduce((acc, cart) => {
    acc[cart.status] = (acc[cart.status] || 0) + 1
    return acc
  }, {})
  
  Object.entries(stats).forEach(([status, count]) => {
    const emoji = status === 'abandoned' ? '🛒' : status === 'recovered' ? '✅' : '⏰'
    console.log(`   ${emoji} ${status}: ${count}`)
  })
  console.log()

  // 4️⃣ Mostrar primeiros 3 registros
  console.log('4️⃣  Primeiros registros:')
  data.slice(0, 3).forEach((cart, i) => {
    console.log(`\n   ${i + 1}. ID: ${cart.id}`)
    console.log(`      Email: ${cart.customer_email}`)
    console.log(`      Nome: ${cart.customer_name || 'N/A'}`)
    console.log(`      Status: ${cart.status}`)
    console.log(`      Valor: R$ ${cart.total_amount || 0}`)
    console.log(`      Criado: ${new Date(cart.created_at).toLocaleString('pt-BR')}`)
  })
  console.log()

  // 5️⃣ Verificar período atual
  console.log('5️⃣  Verificando últimos 30 dias...')
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  
  const { count: recentCount } = await supabase
    .from('abandoned_carts')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'abandoned')
    .gte('created_at', thirtyDaysAgo.toISOString())

  console.log(`📅 Abandonados nos últimos 30 dias: ${recentCount || 0}`)
  console.log(`   (Este é o valor que aparece na dashboard)\n`)

  // 6️⃣ Resumo final
  console.log('═══════════════════════════════════════════════════')
  console.log('✅ DIAGNÓSTICO COMPLETO!')
  console.log('═══════════════════════════════════════════════════')
  
  if (recentCount > 0) {
    console.log('\n🎉 Tudo funcionando corretamente!')
    console.log(`   A dashboard deve mostrar: ${recentCount} carrinhos abandonados\n`)
  } else {
    console.log('\n⚠️  Nenhum carrinho abandonado nos últimos 30 dias')
    console.log('   Execute o SQL para criar dados de teste\n')
  }
}

// Executar
checkAbandonedCarts()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('\n❌ Erro fatal:', err)
    process.exit(1)
  })
