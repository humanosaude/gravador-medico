import { supabaseAdmin } from '@/lib/supabase'

/**
 * Script para buscar logs de checkout
 * Execute: npx tsx scripts/check-checkout-logs.ts
 */

async function checkCheckoutLogs() {
  console.log('🔍 Buscando logs de checkout...\n')
  
  try {
    // Buscar todos os logs
    const { data: allLogs, error: allError } = await supabaseAdmin
      .from('checkout_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (allError) {
      console.error('❌ Erro ao buscar logs:', allError)
      return
    }
    
    console.log(`📊 Total de logs encontrados: ${allLogs?.length || 0}\n`)
    
    if (!allLogs || allLogs.length === 0) {
      console.log('⚠️ Nenhum log encontrado. Faça uma compra de teste para gerar logs.')
      return
    }
    
    // Resumo geral
    console.log('=' .repeat(80))
    console.log('RESUMO DOS ÚLTIMOS 10 LOGS')
    console.log('=' .repeat(80))
    
    allLogs.forEach((log, index) => {
      console.log(`\n${index + 1}. ${log.created_at}`)
      console.log(`   Gateway: ${log.gateway}`)
      console.log(`   Status: ${log.status}`)
      console.log(`   Order ID: ${log.order_id || 'N/A'}`)
      console.log(`   HTTP Status: ${log.http_status || 'N/A'}`)
      console.log(`   Error: ${log.error_message || 'N/A'}`)
    })
    
    // Buscar erros especificamente
    const { data: errors, error: errorsError } = await supabaseAdmin
      .from('checkout_logs')
      .select('*')
      .eq('status', 'ERROR')
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (errors && errors.length > 0) {
      console.log('\n\n' + '=' .repeat(80))
      console.log('🔴 ÚLTIMOS ERROS DETALHADOS')
      console.log('=' .repeat(80))
      
      errors.forEach((error, index) => {
        console.log(`\n${index + 1}. ERRO - ${error.created_at}`)
        console.log(`   Gateway: ${error.gateway}`)
        console.log(`   Order ID: ${error.order_id}`)
        console.log(`   HTTP Status: ${error.http_status}`)
        console.log(`   Error Message: ${error.error_message}`)
        console.log(`   Error Cause: ${error.error_cause}`)
        
        console.log('\n   📦 PAYLOAD ENVIADO:')
        console.log(JSON.stringify(error.payload_sent, null, 2))
        
        console.log('\n   ❌ RESPOSTA DE ERRO:')
        console.log(JSON.stringify(error.error_response, null, 2))
        
        console.log('\n' + '-'.repeat(80))
      })
    }
    
    // Buscar sucessos para comparação
    const { data: successes, error: successError } = await supabaseAdmin
      .from('checkout_logs')
      .select('*')
      .eq('status', 'SUCCESS')
      .order('created_at', { ascending: false })
      .limit(2)
    
    if (successes && successes.length > 0) {
      console.log('\n\n' + '=' .repeat(80))
      console.log('✅ ÚLTIMOS SUCESSOS (PARA COMPARAÇÃO)')
      console.log('=' .repeat(80))
      
      successes.forEach((success, index) => {
        console.log(`\n${index + 1}. SUCESSO - ${success.created_at}`)
        console.log(`   Gateway: ${success.gateway}`)
        console.log(`   Order ID: ${success.order_id}`)
        
        console.log('\n   📦 PAYLOAD ENVIADO:')
        console.log(JSON.stringify(success.payload_sent, null, 2))
        
        console.log('\n   ✅ RESPOSTA:')
        console.log(JSON.stringify(success.response_data, null, 2))
        
        console.log('\n' + '-'.repeat(80))
      })
    }
    
    // Estatísticas
    console.log('\n\n' + '=' .repeat(80))
    console.log('📊 ESTATÍSTICAS')
    console.log('=' .repeat(80))
    
    const successCount = allLogs.filter(l => l.status === 'SUCCESS').length
    const errorCount = allLogs.filter(l => l.status === 'ERROR').length
    const mpCount = allLogs.filter(l => l.gateway === 'mercadopago').length
    const appmaxCount = allLogs.filter(l => l.gateway === 'appmax').length
    
    console.log(`\nStatus:`)
    console.log(`  ✅ SUCCESS: ${successCount}`)
    console.log(`  ❌ ERROR: ${errorCount}`)
    console.log(`\nGateway:`)
    console.log(`  💳 Mercado Pago: ${mpCount}`)
    console.log(`  📱 AppMax: ${appmaxCount}`)
    
    // Erros 402 específicos
    const { data: error402, error: error402Error } = await supabaseAdmin
      .from('checkout_logs')
      .select('*')
      .eq('http_status', 402)
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (error402 && error402.length > 0) {
      console.log('\n\n' + '=' .repeat(80))
      console.log('🚨 ERROS 402 (PAYMENT REQUIRED) - MERCADO PAGO')
      console.log('=' .repeat(80))
      
      error402.forEach((err, index) => {
        console.log(`\n${index + 1}. ERRO 402 - ${err.created_at}`)
        console.log(`   Order ID: ${err.order_id}`)
        console.log(`   Mensagem: ${err.error_message}`)
        
        const payload = err.payload_sent as any
        console.log(`\n   Dados do pagamento:`)
        console.log(`   - Valor: R$ ${payload?.transaction_amount}`)
        console.log(`   - Email: ${payload?.payer_email}`)
        console.log(`   - CPF: ${payload?.payer_cpf}`)
        console.log(`   - Token presente: ${payload?.has_token ? 'SIM' : 'NÃO'}`)
        
        const errorResp = err.error_response as any
        console.log(`\n   Resposta MP:`)
        console.log(`   - Status: ${errorResp?.status}`)
        console.log(`   - Status Detail: ${errorResp?.status_detail}`)
        console.log(`   - Message: ${errorResp?.message}`)
        if (errorResp?.cause) {
          console.log(`   - Cause: ${JSON.stringify(errorResp.cause, null, 2)}`)
        }
        
        console.log('\n' + '-'.repeat(80))
      })
    }
    
  } catch (error) {
    console.error('❌ Erro:', error)
  }
}

checkCheckoutLogs()
