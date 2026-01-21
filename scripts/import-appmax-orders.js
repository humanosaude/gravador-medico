/* eslint-disable no-console */
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const appmaxToken = process.env.APPMAX_API_TOKEN
const appmaxApiUrl = process.env.APPMAX_API_URL || 'https://admin.appmax.com.br/api/v3'

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.')
  process.exit(1)
}

if (!appmaxToken) {
  console.error('Missing APPMAX_API_TOKEN.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
})

const PAGE_SIZE = Number.parseInt(process.env.APPMAX_PAGE_SIZE || '50', 10)
const MAX_PAGES = Number.parseInt(process.env.APPMAX_MAX_PAGES || '0', 10)
const DRY_RUN = process.argv.includes('--dry-run')

let customersAvailable = true
let customerColumns = null
let salesColumns = null

function isMissingColumnError(error, column) {
  if (!error?.message) return false
  const message = error.message.toLowerCase()
  return message.includes('column') && message.includes(column.toLowerCase()) && message.includes('does not exist')
}

async function hasColumn(table, column) {
  const { error } = await supabase.from(table).select(column).limit(1)

  if (!error) return true
  if (isMissingColumnError(error, column)) return false

  console.warn(`Could not verify ${table}.${column}:`, error.message)
  return false
}

async function detectColumns(table, columnNames) {
  const results = {}
  for (const column of columnNames) {
    results[column] = await hasColumn(table, column)
  }
  return results
}

function filterPayload(payload, columnMap) {
  const filtered = {}
  for (const [key, value] of Object.entries(payload)) {
    if (columnMap?.[key]) {
      filtered[key] = value
    }
  }
  return filtered
}

function toNumber(value) {
  if (value === null || value === undefined || value === '') return 0
  const normalized = typeof value === 'string' ? value.replace(',', '.') : value
  const num = Number(normalized)
  return Number.isFinite(num) ? num : 0
}

function mapStatus(rawStatus) {
  if (!rawStatus) return 'pending'
  const status = String(rawStatus).toLowerCase()
  const map = {
    aprovado: 'approved',
    approved: 'approved',
    pago: 'paid',
    paid: 'paid',
    pendente: 'pending',
    pending: 'pending',
    cancelado: 'cancelled',
    cancelled: 'cancelled',
    canceled: 'canceled',
    recusado: 'refused',
    refused: 'refused',
    reembolsado: 'refunded',
    refunded: 'refunded',
    chargeback: 'chargeback'
  }
  return map[status] || 'pending'
}

function mapFailureReason(rawStatus) {
  if (!rawStatus) return null
  const status = String(rawStatus).toLowerCase()
  const map = {
    recusado: 'Pagamento recusado',
    refused: 'Pagamento recusado',
    rejected: 'Pagamento recusado',
    failed: 'Pagamento recusado',
    cancelado: 'Pedido cancelado',
    cancelled: 'Pedido cancelado',
    canceled: 'Pedido cancelado',
    expirado: 'Expirado',
    expired: 'Expirado',
    reembolsado: 'Estornado',
    refunded: 'Estornado',
    chargeback: 'Chargeback'
  }
  return map[status] || null
}

async function fetchOrderPage(page) {
  const url = new URL(`${appmaxApiUrl}/order`)
  url.searchParams.set('page', String(page))
  url.searchParams.set('per_page', String(PAGE_SIZE))

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'access-token': appmaxToken,
    }
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Failed to fetch Appmax orders page ${page}: ${response.status} ${text.slice(0, 120)}`)
  }

  return response.json()
}

async function fetchOrderDetail(orderId) {
  const response = await fetch(`${appmaxApiUrl}/order/${orderId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'access-token': appmaxToken,
    }
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Failed to fetch Appmax order ${orderId}: ${response.status} ${text.slice(0, 120)}`)
  }

  return response.json()
}

async function upsertCustomer(customer) {
  if (!customersAvailable) return null

  const email = customer.email || null
  if (!email) return null

  const name = customer.fullname || [customer.firstname, customer.lastname].filter(Boolean).join(' ') || email.split('@')[0]
  const phone = customer.telephone || null
  const cpf = customer.document_number || null
  const appmaxCustomerId = customer.id ? String(customer.id) : null

  const payload = filterPayload({
    email,
    name,
    phone,
    cpf,
    status: 'active'
  }, customerColumns || {})

  if (customerColumns?.appmax_customer_id) {
    payload.appmax_customer_id = appmaxCustomerId
  }

  const { data, error } = await supabase
    .from('customers')
    .upsert(payload, {
      onConflict: 'email',
      ignoreDuplicates: false
    })
    .select('id')
    .single()

  if (error) {
    const message = error.message || ''
    if (message.includes('Could not find the table') || message.includes('relation') || message.includes('does not exist')) {
      customersAvailable = false
      console.warn('customers table/view not available; continuing without customer_id.')
      return null
    }
    console.warn('Failed to upsert customer:', message)
    return null
  }

  return data?.id || null
}

async function upsertSale(payload) {
  const { error } = await supabase
    .from('sales')
    .upsert(payload, { onConflict: 'appmax_order_id', ignoreDuplicates: false })

  if (error) {
    throw error
  }
}

async function run() {
  customerColumns = await detectColumns('customers', [
    'email',
    'name',
    'phone',
    'cpf',
    'appmax_customer_id',
    'status'
  ])

  salesColumns = await detectColumns('sales', [
    'appmax_order_id',
    'appmax_customer_id',
    'customer_id',
    'customer_name',
    'customer_email',
    'customer_phone',
    'customer_cpf',
    'total_amount',
    'subtotal',
    'discount',
    'status',
    'failure_reason',
    'payment_method',
    'installments',
    'paid_at',
    'refunded_at',
    'canceled_at',
    'created_at',
    'updated_at'
  ])

  const requiredSalesColumns = ['appmax_order_id', 'customer_name', 'customer_email', 'total_amount', 'subtotal', 'status']
  const missingRequired = requiredSalesColumns.filter((column) => !salesColumns?.[column])
  if (missingRequired.length > 0) {
    console.error(`Missing required sales columns: ${missingRequired.join(', ')}`)
    process.exit(1)
  }

  console.log(`Starting Appmax import. dry-run=${DRY_RUN}, page_size=${PAGE_SIZE}`)

  let processed = 0
  let skipped = 0
  let errors = 0

  const firstPage = await fetchOrderPage(1)
  const meta = firstPage?.data || {}
  const lastPage = Number.isFinite(meta.last_page) ? meta.last_page : 1
  const finalPage = MAX_PAGES > 0 ? Math.min(lastPage, MAX_PAGES) : lastPage

  const pages = [firstPage]
  for (let page = 2; page <= finalPage; page += 1) {
    pages.push(await fetchOrderPage(page))
  }

  for (const pageData of pages) {
    const list = Array.isArray(pageData?.data?.data) ? pageData.data.data : []
    for (const order of list) {
      const orderId = order?.id ? String(order.id) : null
      if (!orderId) {
        skipped += 1
        continue
      }

      try {
        const detail = await fetchOrderDetail(orderId)
        const detailData = detail?.data || detail
        const customer = detailData?.customer || {}
        const email = customer.email || detailData?.customer_email || detailData?.email || null

        if (!email) {
          skipped += 1
          continue
        }

        const status = mapStatus(detailData?.status || order?.status)
        const failureReason = mapFailureReason(detailData?.status || order?.status)
        const totalAmount = toNumber(detailData?.total || detailData?.full_payment_amount || detailData?.total_products)
        const subtotal = toNumber(detailData?.total_products || detailData?.total || totalAmount)
        const discount = toNumber(detailData?.discount || 0)
        const createdAt = detailData?.created_at || order?.created_at || new Date().toISOString()
        const updatedAt = detailData?.updated_at || detailData?.updated_at || createdAt

        const customerId = DRY_RUN ? null : await upsertCustomer(customer)

        const basePayload = {
          appmax_order_id: orderId,
          appmax_customer_id: detailData?.customer_id ? String(detailData.customer_id) : null,
          customer_id: customerId,
          customer_name: customer.fullname || [customer.firstname, customer.lastname].filter(Boolean).join(' ') || email.split('@')[0],
          customer_email: email,
          customer_phone: customer.telephone || null,
          customer_cpf: customer.document_number || null,
          total_amount: totalAmount,
          subtotal,
          discount,
          status,
          failure_reason: failureReason,
          payment_method: detailData?.payment_type || detailData?.payment_method || null,
          installments: detailData?.installments || null,
          paid_at: detailData?.paid_at || null,
          refunded_at: detailData?.refunded_at || null,
          canceled_at: detailData?.canceled_at || null,
          created_at: createdAt,
          updated_at: updatedAt
        }

        const payload = filterPayload(basePayload, salesColumns || {})

        if (!DRY_RUN) {
          await upsertSale(payload)
        }

        processed += 1
      } catch (error) {
        errors += 1
        console.warn(`Failed to import order ${orderId}:`, error.message || error)
      }
    }
  }

  console.log(`Appmax import finished. processed=${processed}, skipped=${skipped}, errors=${errors}`)
}

run().catch((error) => {
  console.error('Fatal error during Appmax import:', error)
  process.exit(1)
})
