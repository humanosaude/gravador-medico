import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Carregar variáveis de ambiente
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não configuradas!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkLastAttempt() {
  console.log('\n🔍 Buscando última tentativa de compra...\n')

  // Buscar a venda mais recente
  const { data: lastSale, error: saleError } = await supabase
    .from('sales')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (saleError) {
    console.error('❌ Erro ao buscar última venda:', saleError)
    return
  }

  if (!lastSale) {
    console.log('⚠️ Nenhuma venda encontrada')
    return
  }

  console.log('📦 ÚLTIMA VENDA:')
  console.log('=' .repeat(100))
  console.log(`ID: ${lastSale.id}`)
  console.log(`Data: ${new Date(lastSale.created_at).toLocaleString('pt-BR')}`)
  console.log(`Email: ${lastSale.customer_email}`)
  console.log(`Status: ${lastSale.order_status}`)
  console.log(`Gateway: ${lastSale.payment_gateway}`)
  console.log(`Fallback usado: ${lastSale.fallback_used ? 'SIM ✅' : 'NÃO ❌'}`)
  console.log(`Valor: R$ ${(lastSale.amount / 100).toFixed(2)}`)
  console.log(`MP Payment ID: ${lastSale.mercadopago_payment_id || 'N/A'}`)
  console.log(`AppMax Order ID: ${lastSale.appmax_order_id || 'N/A'}`)
  console.log('-'.repeat(100))

  // Buscar tentativas de pagamento - Tentar ambos os nomes de campo
  let attempts = null
  let attemptsError = null
  
  // Tentar com sale_id primeiro
  const { data: attemptsBySale, error: errorSale } = await supabase
    .from('payment_attempts')
    .select('*')
    .eq('sale_id', lastSale.id)
    .order('created_at', { ascending: true })

  if (!errorSale) {
    attempts = attemptsBySale
  } else {
    // Tentar com order_id
    const { data: attemptsByOrder, error: errorOrder } = await supabase
      .from('payment_attempts')
      .select('*')
      .eq('order_id', lastSale.id)
      .order('created_at', { ascending: true })
    
    if (!errorOrder) {
      attempts = attemptsByOrder
    } else {
      attemptsError = errorOrder
    }
  }

  if (attemptsError) {
    console.error('❌ Erro ao buscar tentativas:', attemptsError)
  } else if (attempts && attempts.length > 0) {
    console.log(`\n📊 TENTATIVAS DE PAGAMENTO (${attempts.length}):\n`)
    
    attempts.forEach((attempt, idx) => {
      console.log(`${idx + 1}. ${attempt.provider?.toUpperCase() || 'UNKNOWN'}`)
      console.log(`   ⏱️  ${new Date(attempt.created_at).toLocaleString('pt-BR')}`)
      console.log(`   📍 Status: ${attempt.status}`)
      console.log(`   🔑 Transaction ID: ${attempt.gateway_transaction_id || 'N/A'}`)
      
      if (attempt.rejection_code) {
        console.log(`   ⚠️  Código de recusa: ${attempt.rejection_code}`)
      }
      
      if (attempt.error_message) {
        console.log(`   ❌ Erro: ${attempt.error_message}`)
      }
      
      if (attempt.response_time_ms) {
        console.log(`   ⚡ Tempo: ${attempt.response_time_ms}ms`)
      }
      
      // Mostrar response completa se houver
      if (attempt.raw_response) {
        console.log(`   📦 Response:`)
        try {
          const response = typeof attempt.raw_response === 'string' 
            ? JSON.parse(attempt.raw_response) 
            : attempt.raw_response
          
          console.log(JSON.stringify(response, null, 6).split('\n').map(line => `      ${line}`).join('\n'))
        } catch (e) {
          console.log(`      ${attempt.raw_response}`)
        }
      }
      
      console.log('')
    })
  } else {
    console.log('\n⚠️ Nenhuma tentativa de pagamento registrada!')
    console.log('Isso indica que o erro aconteceu ANTES de tentar processar no gateway.')
  }

  // Se tiver payment_details, mostrar
  if (lastSale.payment_details) {
    console.log('\n💳 DETALHES DO PAGAMENTO:')
    console.log('-'.repeat(100))
    try {
      const details = typeof lastSale.payment_details === 'string' 
        ? JSON.parse(lastSale.payment_details) 
        : lastSale.payment_details
      
      console.log(JSON.stringify(details, null, 2))
    } catch (e) {
      console.log(lastSale.payment_details)
    }
  }

  console.log('\n' + '=' .repeat(100))
  console.log('\n✅ Análise concluída!\n')

  // ANÁLISE DO PROBLEMA
  console.log('🔍 ANÁLISE DO PROBLEMA:')
  console.log('-'.repeat(100))
  
  if (!attempts || attempts.length === 0) {
    console.log('❌ PROBLEMA: Nenhuma tentativa registrada em payment_attempts')
    console.log('   Isso significa que o código não chegou a chamar MP ou AppMax')
    console.log('   Possíveis causas:')
    console.log('   1. Erro de validação ANTES de tentar processar')
    console.log('   2. Erro ao criar pedido no banco')
    console.log('   3. Token MP inválido ou expirado')
    console.log('   4. Erro de configuração (env vars)')
  } else {
    const mpAttempt = attempts.find(a => a.provider === 'mercadopago')
    const appmaxAttempt = attempts.find(a => a.provider === 'appmax')
    
    if (mpAttempt) {
      console.log('✅ Mercado Pago FOI CHAMADO')
      console.log(`   Status: ${mpAttempt.status}`)
      console.log(`   Rejection: ${mpAttempt.rejection_code || 'N/A'}`)
      
      if (mpAttempt.status === 'rejected') {
        console.log('   🔄 MP recusou → Fallback para AppMax foi acionado')
      }
    } else {
      console.log('❌ Mercado Pago NÃO foi chamado')
    }
    
    if (appmaxAttempt) {
      console.log('✅ AppMax FOI CHAMADO')
      console.log(`   Status: ${appmaxAttempt.status}`)
      
      if (appmaxAttempt.status === 'rejected') {
        console.log('   ❌ AppMax também recusou → Ambos falharam')
      }
    }
  }
  
  console.log('\n')
}

checkLastAttempt().catch(console.error)
