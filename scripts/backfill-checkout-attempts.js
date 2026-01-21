/* eslint-disable no-console */
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY antes de rodar.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
})

const PAGE_SIZE = Number.parseInt(process.env.BACKFILL_PAGE_SIZE || '200', 10)
const DRY_RUN = process.argv.includes('--dry-run')

const SUCCESS_STATUSES = new Set(['approved', 'paid', 'completed'])
const FAILED_STATUSES = new Set([
  'refused',
  'rejected',
  'failed',
  'denied',
  'canceled',
  'cancelled',
  'expired',
  'chargeback',
  'refunded'
])

function isMissingColumnError(error, column) {
  if (!error?.message) return false
  const message = error.message.toLowerCase()
  return message.includes('column') && message.includes(column.toLowerCase()) && message.includes('does not exist')
}

async function hasColumn(table, column) {
  const { error } = await supabase.from(table).select(column).limit(1)

  if (!error) return true
  if (isMissingColumnError(error, column)) return false

  console.warn(`⚠️ Não foi possível verificar coluna ${table}.${column}:`, error.message)
  return false
}

async function fetchExistingOrderIds(orderIds) {
  if (!orderIds.length) return new Set()

  const { data, error } = await supabase
    .from('checkout_attempts')
    .select('appmax_order_id')
    .in('appmax_order_id', orderIds)

  if (error) {
    console.warn('⚠️ Erro ao buscar appmax_order_id existentes:', error.message)
    return new Set()
  }

  return new Set((data || []).map((row) => row.appmax_order_id).filter(Boolean))
}

function normalizeStatus(status) {
  if (!status) return 'pending'
  return status.toLowerCase()
}

function resolveRecoveryStatus(status) {
  if (SUCCESS_STATUSES.has(status)) return 'recovered'
  if (FAILED_STATUSES.has(status)) return 'abandoned'
  return 'pending'
}

async function insertRows(rows, columns) {
  if (!rows.length) return { inserted: 0 }

  const chunkSize = 100
  let inserted = 0

  for (let i = 0; i < rows.length; i += chunkSize) {
    const batch = rows.slice(i, i + chunkSize)
    let { error } = await supabase.from('checkout_attempts').insert(batch)

    if (error) {
      if (error.message?.includes('total_amount') && columns.hasTotalAmount) {
        const fallback = batch.map((row) => {
          const copy = { ...row }
          delete copy.total_amount
          return copy
        })
        const fallbackResult = await supabase.from('checkout_attempts').insert(fallback)
        error = fallbackResult.error
      }

      if (error && error.message?.includes('appmax_order_id') && columns.hasAppmaxOrderId) {
        const fallback = batch.map((row) => {
          const copy = { ...row }
          delete copy.appmax_order_id
          return copy
        })
        const fallbackResult = await supabase.from('checkout_attempts').insert(fallback)
        error = fallbackResult.error
      }
    }

    if (error) {
      console.error('❌ Erro ao inserir batch:', error.message)
      continue
    }

    inserted += batch.length
  }

  return { inserted }
}

async function run() {
  const columns = {
    hasAppmaxOrderId: await hasColumn('checkout_attempts', 'appmax_order_id'),
    hasTotalAmount: await hasColumn('checkout_attempts', 'total_amount'),
    hasRecoveryStatus: await hasColumn('checkout_attempts', 'recovery_status'),
    hasSaleId: await hasColumn('checkout_attempts', 'sale_id'),
    hasFailureReason: await hasColumn('checkout_attempts', 'failure_reason')
  }

  console.log('ℹ️ Colunas disponíveis:', columns)
  if (!columns.hasAppmaxOrderId) {
    console.warn('⚠️ checkout_attempts.appmax_order_id não existe. Recomendo rodar a migração 09.')
  }

  const salesBaseColumns = ['id', 'customer_email', 'status', 'created_at']
  const salesOptionalColumns = [
    'appmax_order_id',
    'customer_name',
    'customer_phone',
    'customer_cpf',
    'total_amount',
    'subtotal',
    'failure_reason',
    'payment_method',
    'session_id'
  ]

  const salesColumns = []
  for (const column of salesBaseColumns) {
    if (!(await hasColumn('sales', column))) {
      console.error(`❌ Coluna sales.${column} não existe. Não é possível fazer backfill.`)
      return
    }
    salesColumns.push(column)
  }

  for (const column of salesOptionalColumns) {
    if (await hasColumn('sales', column)) salesColumns.push(column)
  }

  let offset = 0
  let totalInserted = 0
  let totalSkipped = 0

  while (true) {
    const { data: sales, error } = await supabase
      .from('sales')
      .select(salesColumns.join(', '))
      .order('created_at', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1)

    if (error) {
      console.error('❌ Erro ao buscar vendas:', error.message)
      break
    }

    if (!sales || sales.length === 0) {
      break
    }

    const orderIds = columns.hasAppmaxOrderId
      ? sales.map((sale) => sale.appmax_order_id).filter(Boolean)
      : []
    const existingOrders = columns.hasAppmaxOrderId ? await fetchExistingOrderIds(orderIds) : new Set()

    const rows = []

    for (const sale of sales) {
      if (!sale.customer_email) {
        totalSkipped += 1
        continue
      }

      if (columns.hasAppmaxOrderId && sale.appmax_order_id && existingOrders.has(sale.appmax_order_id)) {
        totalSkipped += 1
        continue
      }

      const status = normalizeStatus(sale.status)
      const totalAmount = Number(sale.total_amount || sale.subtotal || 0)
      const recoveryStatus = resolveRecoveryStatus(status)
      const sessionId = sale.session_id || (sale.appmax_order_id ? `order_${sale.appmax_order_id}` : `sale_${sale.id}`)

      const row = {
        session_id: sessionId,
        customer_email: sale.customer_email,
        customer_name: sale.customer_name || sale.customer_email.split('@')[0],
        customer_phone: sale.customer_phone || null,
        customer_cpf: sale.customer_cpf || null,
        cart_items: [],
        cart_total: totalAmount,
        payment_method: sale.payment_method || null,
        status,
        created_at: sale.created_at,
        updated_at: sale.created_at,
        metadata: {
          source: 'backfill',
          sale_id: sale.id,
          appmax_order_id: sale.appmax_order_id || null
        }
      }

      if (columns.hasAppmaxOrderId) row.appmax_order_id = sale.appmax_order_id
      if (columns.hasTotalAmount) row.total_amount = totalAmount
      if (columns.hasSaleId) row.sale_id = sale.id
      if (columns.hasFailureReason) row.failure_reason = sale.failure_reason || null
      if (columns.hasRecoveryStatus) {
        row.recovery_status = recoveryStatus
        row.converted_at = SUCCESS_STATUSES.has(status) ? sale.created_at : null
        row.abandoned_at = FAILED_STATUSES.has(status) ? sale.created_at : null
      }

      rows.push(row)
    }

    if (DRY_RUN) {
      console.log(`🧪 Dry-run: batch ${offset}-${offset + PAGE_SIZE - 1} -> ${rows.length} registros`)
    } else {
      const { inserted } = await insertRows(rows, columns)
      totalInserted += inserted
    }

    offset += PAGE_SIZE
  }

  console.log(`✅ Backfill concluído. Inseridos: ${totalInserted}, Ignorados: ${totalSkipped}`)
}

run().catch((error) => {
  console.error('❌ Falha no backfill:', error)
  process.exit(1)
})
