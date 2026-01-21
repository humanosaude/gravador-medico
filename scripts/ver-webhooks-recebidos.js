#!/usr/bin/env node
/**
 * 🔍 Ver Webhooks Recebidos da Appmax
 * Mostra os últimos 10 webhooks para entender o formato exato
 */

const fs = require('fs')
const path = require('path')

// Ler .env.local manualmente
const envPath = path.join(__dirname, '..', '.env.local')
const envContent = fs.readFileSync(envPath, 'utf8')
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=')
  if (key && valueParts.length) {
    process.env[key.trim()] = valueParts.join('=').trim()
  }
})

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function verWebhooks() {
  console.log('\n🔍 BUSCANDO WEBHOOKS RECEBIDOS...\n')
  
  const { data, error } = await supabase
    .from('webhooks_logs')
    .select('*')
    .eq('endpoint', '/api/webhook/appmax')
    .order('created_at', { ascending: false })
    .limit(10)
  
  if (error) {
    console.error('❌ Erro:', error)
    return
  }
  
  if (!data || data.length === 0) {
    console.log('⚠️ Nenhum webhook encontrado')
    return
  }
  
  console.log(`📊 Total de webhooks: ${data.length}\n`)
  
  data.forEach((webhook, index) => {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    console.log(`📋 WEBHOOK #${index + 1}`)
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    console.log(`⏰ Data: ${new Date(webhook.created_at).toLocaleString('pt-BR')}`)
    console.log(`📊 Status: ${webhook.response_status}`)
    console.log(`⏱️ Tempo: ${webhook.processing_time_ms}ms`)
    console.log(`\n📦 PAYLOAD COMPLETO:`)
    console.log(JSON.stringify(webhook.payload, null, 2))
    
    if (webhook.error) {
      console.log(`\n❌ Erro: ${webhook.error}`)
    }
  })
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
}

verWebhooks()
