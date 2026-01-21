/**
 * =============================================
 * HELPERS - Queries Dashboard
 * =============================================
 * Funções reutilizáveis para queries do dashboard
 * com filtros de data padronizados (UTC)
 * =============================================
 */

import { SupabaseClient } from '@supabase/supabase-js'

// ========================================
// 1. Helper: Criar range de datas UTC
// ========================================
export function createDateRange(startDate: string, endDate: string) {
  const startIso = `${startDate}T00:00:00.000Z`
  const endIso = `${endDate}T23:59:59.999Z`
  
  return { startIso, endIso }
}

// ========================================
// 2. Helper: Query base para vendas
// ========================================
export function buildSalesQuery(
  supabase: SupabaseClient,
  startDate: string,
  endDate: string,
  additionalFilters?: {
    status?: string[]
    customer_id?: string
    product_id?: string
  }
) {
  const { startIso, endIso } = createDateRange(startDate, endDate)
  
  let query = supabase
    .from('sales')
    .select('*')
    .gte('created_at', startIso)
    .lte('created_at', endIso)
  
  // Status padrão: vendas aprovadas
  if (additionalFilters?.status) {
    query = query.in('status', additionalFilters.status)
  } else {
    query = query.in('status', ['approved', 'paid', 'completed'])
  }
  
  // Filtros adicionais
  if (additionalFilters?.customer_id) {
    query = query.eq('customer_id', additionalFilters.customer_id)
  }
  
  return query
}

// ========================================
// 3. Fetch: Clientes com métricas
// ========================================
export async function fetchCustomersWithMetrics(
  supabase: SupabaseClient,
  startDate: string,
  endDate: string
) {
  try {
    const { startIso, endIso } = createDateRange(startDate, endDate)
    
    // ✅ CORREÇÃO: Buscar diretamente da tabela customers + sales
    const { data: customers, error } = await supabase
      .from('customers')
      .select(`
        *,
        sales:sales!customer_id (
          id,
          total_amount,
          status,
          created_at
        )
      `)
    
    if (error) {
      console.error('Erro ao buscar clientes:', error)
      // Fallback: buscar só customers sem métricas
      const { data: fallback } = await supabase
        .from('customers')
        .select('*')
      return { data: fallback || [], error }
    }
    
    // Calcular métricas manualmente
    const customersWithMetrics = customers?.map(customer => {
      const sales = customer.sales || []
      const totalOrders = sales.length
      const totalSpent = sales.reduce((sum: number, sale: any) => sum + (sale.total_amount || 0), 0)
      const lastPurchase = sales.length > 0 
        ? new Date(Math.max(...sales.map((s: any) => new Date(s.created_at).getTime())))
        : null
      
      return {
        ...customer,
        total_orders: totalOrders,
        total_spent: totalSpent,
        last_purchase: lastPurchase
      }
    })
    
    return { data: customersWithMetrics || [], error: null }
    
  } catch (error) {
    console.error('❌ Erro ao buscar clientes:', error)
    return { data: [], error }
  }
}

// ========================================
// 4. Fetch: Produtos com métricas
// ========================================
export async function fetchProductsWithMetrics(
  supabase: SupabaseClient,
  startDate?: string,
  endDate?: string
) {
  try {
    // Usar a view analítica
    const { data: products, error } = await supabase
      .from('product_sales_summary')
      .select('*')
      .order('total_revenue', { ascending: false })
    
    if (error) throw error
    
    return { data: products || [], error: null }
    
  } catch (error) {
    console.error('❌ Erro ao buscar produtos:', error)
    return { data: [], error }
  }
}

// ========================================
// 5. Fetch: Funil CRM
// ========================================
export async function fetchCRMFunnel(
  supabase: SupabaseClient
) {
  try {
    // Usar a view analítica
    const { data: funnel, error } = await supabase
      .from('crm_funnel_summary')
      .select('*')
    
    if (error) throw error
    
    return { data: funnel || [], error: null }
    
  } catch (error) {
    console.error('❌ Erro ao buscar funil CRM:', error)
    return { data: [], error }
  }
}

// ========================================
// 5.1 Fetch: Atividades CRM de um contato
// ========================================
export async function fetchCRMActivities(
  supabase: SupabaseClient,
  contactId?: string,
  limit: number = 50
) {
  try {
    let query = supabase
      .from('crm_activities')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (contactId) {
      query = query.eq('contact_id', contactId)
    }
    
    const { data, error } = await query
    
    if (error) throw error
    
    return { data: data || [], error: null }
    
  } catch (error) {
    console.error('❌ Erro ao buscar atividades CRM:', error)
    return { data: [], error }
  }
}

// ========================================
// 6. Fetch: Contatos CRM com filtros
// ========================================
export async function fetchCRMContacts(
  supabase: SupabaseClient,
  filters?: {
    stage?: string
    source?: string
    search?: string
  }
) {
  try {
    let query = supabase
      .from('crm_contacts')
      .select(`
        *,
        customer:customers(name, email, phone)
      `)
      .order('created_at', { ascending: false })
    
    if (filters?.stage) {
      query = query.eq('stage', filters.stage)
    }
    
    if (filters?.source) {
      query = query.eq('source', filters.source)
    }
    
    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`)
    }
    
    const { data, error } = await query
    
    if (error) throw error
    
    return { data: data || [], error: null }
    
  } catch (error) {
    console.error('❌ Erro ao buscar contatos CRM:', error)
    return { data: [], error }
  }
}

// ========================================
// 7. Fetch: Vendas por dia (relatórios)
// ========================================
export async function fetchSalesByDay(
  supabase: SupabaseClient,
  startDate: string,
  endDate: string
) {
  try {
    const { startIso, endIso } = createDateRange(startDate, endDate)
    
    const { data, error } = await supabase
      .from('sales_by_day')
      .select('*')
      .gte('sale_date', startDate)
      .lte('sale_date', endDate)
      .order('sale_date', { ascending: true })
    
    if (error) throw error
    
    return { data: data || [], error: null }
    
  } catch (error) {
    console.error('❌ Erro ao buscar vendas por dia:', error)
    return { data: [], error }
  }
}

// ========================================
// 8. Fetch: Métricas gerais do dashboard
// ========================================
export async function fetchDashboardMetrics(
  supabase: SupabaseClient,
  startDate: string,
  endDate: string
) {
  try {
    const { startIso, endIso } = createDateRange(startDate, endDate)
    
    // Buscar vendas do período
    const { data: sales, error } = await supabase
      .from('sales')
      .select('total_amount, customer_email, created_at')
      .in('status', ['approved', 'paid', 'completed'])
      .gte('created_at', startIso)
      .lte('created_at', endIso)
    
    if (error) throw error
    
    const totalRevenue = (sales || []).reduce((sum, s) => sum + Number(s.total_amount), 0)
    const totalOrders = (sales || []).length
    const uniqueCustomers = new Set((sales || []).map(s => s.customer_email)).size
    const averageTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0
    
    return {
      data: {
        totalRevenue,
        totalOrders,
        totalCustomers: uniqueCustomers,
        averageTicket,
      },
      error: null
    }
    
  } catch (error) {
    console.error('❌ Erro ao buscar métricas:', error)
    return {
      data: {
        totalRevenue: 0,
        totalOrders: 0,
        totalCustomers: 0,
        averageTicket: 0,
      },
      error
    }
  }
}

// ========================================
// 9. Fetch: Top produtos por receita
// ========================================
export async function fetchTopProducts(
  supabase: SupabaseClient,
  startDate: string,
  endDate: string,
  limit: number = 10
) {
  try {
    const { startIso, endIso } = createDateRange(startDate, endDate)
    
    // Query com JOIN
    const { data, error } = await supabase
      .from('sales_items')
      .select(`
        product_name,
        product_sku,
        price,
        quantity,
        total,
        sales!inner(created_at, status)
      `)
      .in('sales.status', ['approved', 'paid', 'completed'])
      .gte('sales.created_at', startIso)
      .lte('sales.created_at', endIso)
    
    if (error) throw error
    
    // Agrupar por produto
    const grouped = (data || []).reduce((acc: any[], item) => {
      const existing = acc.find(p => p.sku === item.product_sku)
      if (existing) {
        existing.quantity += item.quantity
        existing.revenue += Number(item.total)
        existing.orders++
      } else {
        acc.push({
          name: item.product_name,
          sku: item.product_sku,
          quantity: item.quantity,
          revenue: Number(item.total),
          orders: 1,
        })
      }
      return acc
    }, [])
    
    // Ordenar por receita e limitar
    const topProducts = grouped
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit)
    
    return { data: topProducts || [], error: null }
    
  } catch (error) {
    console.error('❌ Erro ao buscar top produtos:', error)
    return { data: [], error }
  }
}

// ========================================
// 10. Fetch: Vendas por fonte (UTM) - usando VIEW
// ========================================
export async function fetchSalesBySource(
  supabase: SupabaseClient,
  startDate: string,
  endDate: string
) {
  try {
    const { startIso, endIso } = createDateRange(startDate, endDate)
    
    const { data, error } = await supabase
      .from('sales_by_source')
      .select('*')
      .gte('first_sale', startDate)
      .lte('first_sale', endDate)
      .order('total_revenue', { ascending: false })
    
    if (error) throw error
    
    return { data: data || [], error: null }
    
  } catch (error) {
    console.error('❌ Erro ao buscar vendas por fonte:', error)
    return { data: [], error }
  }
}
