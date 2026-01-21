import { supabaseAdmin } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// Tipagem do item que vem da Appmax dentro do JSONB
interface AppmaxItem {
  id?: string | number
  product_id?: string | number
  title?: string
  name?: string
  unit_price?: number | string
  price?: number | string
  quantity?: number
  image_url?: string
}

interface ProductPerformance {
  total_sales: number
  total_revenue: number
  refund_rate: number
  conversion_rate: number
  health_score: number
  unique_customers: number
  last_sale_at: string
}

interface Product {
  id: string
  name: string
  price: number
  is_active: boolean
  category: string
  performance?: ProductPerformance
}

/**
 * POST: Auto-Discovery de Produtos
 * 
 * Varre a tabela de vendas (sales/checkout_attempts), extrai produtos únicos do JSONB `items`
 * e popula a tabela `products` automaticamente (Upsert).
 * 
 * Evita cadastro manual e garante que todos os produtos vendidos estejam catalogados.
 */
export async function POST(request: Request) {
  try {
    const supabase = supabaseAdmin

    // 1️⃣ Buscar as últimas vendas para descobrir produtos
    // Tenta primeiro da tabela sales, depois checkout_attempts
    let sales: any[] = []
    
    const { data: salesData, error: salesError } = await supabase
      .from('sales')
      .select('items')
      .not('items', 'is', null)
      .order('created_at', { ascending: false })
      .limit(200)

    if (!salesError && salesData) {
      sales = salesData
    } else {
      // Fallback para checkout_attempts se sales não tiver dados
      const { data: checkoutData, error: checkoutError } = await supabase
        .from('checkout_attempts')
        .select('items')
        .not('items', 'is', null)
        .order('created_at', { ascending: false })
        .limit(200)
      
      if (!checkoutError && checkoutData) {
        sales = checkoutData
      }
    }

    if (sales.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nenhuma venda encontrada para sincronizar',
        discovered_count: 0,
        products: []
      })
    }

    // 2️⃣ Processar e Deduplicar Produtos
    const productMap = new Map<string, any>()

    sales.forEach((sale) => {
      const items = sale.items as unknown as AppmaxItem[]
      
      if (Array.isArray(items)) {
        items.forEach((item) => {
          // Normaliza o ID (pode vir como 'id' ou 'product_id')
          const externalId = String(item.id || item.product_id || '')
          const productName = item.title || item.name || 'Produto sem nome'
          const productPrice = Number(item.unit_price || item.price || 0)
          
          // Só adiciona se tiver um ID válido
          if (externalId && externalId !== 'null' && externalId !== 'undefined') {
            if (!productMap.has(externalId)) {
              productMap.set(externalId, {
                external_id: externalId,
                name: productName,
                price: productPrice,
                image_url: item.image_url || null,
                is_active: true,
                category: 'auto-detected'
              })
            }
          }
        })
      }
    })

    const productsToUpsert = Array.from(productMap.values())

    if (productsToUpsert.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nenhum produto novo encontrado',
        discovered_count: 0,
        products: []
      })
    }

    // 3️⃣ Upsert no Supabase (Insere novos, Atualiza existentes)
    const { error: upsertError, data: upsertedData } = await supabase
      .from('products')
      .upsert(productsToUpsert, { 
        onConflict: 'external_id',
        ignoreDuplicates: false // Atualiza se já existir
      })
      .select()

    if (upsertError) {
      console.error('❌ Erro ao fazer upsert de produtos:', upsertError)
      return NextResponse.json(
        { 
          error: 'Falha ao sincronizar produtos',
          details: upsertError.message 
        },
        { status: 500 }
      )
    }

    // 4️⃣ Retornar resultado
    return NextResponse.json({
      success: true,
      message: `${productsToUpsert.length} produtos sincronizados com sucesso`,
      discovered_count: productsToUpsert.length,
      products: productsToUpsert,
      synced_at: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('❌ Erro crítico na sincronização:', error)
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        message: error.message 
      },
      { status: 500 }
    )
  }
}

/**
 * GET: Buscar produtos com métricas de performance
 */
export async function GET(request: Request) {
  try {
    const supabase = supabaseAdmin
    const { searchParams } = new URL(request.url)
    
    const includeInactive = searchParams.get('include_inactive') === 'true'
    const category = searchParams.get('category')

    // 1️⃣ Buscar produtos com join na view de performance
    let query = supabase
      .from('products')
      .select(`
        *,
        performance:product_performance!inner(
          total_sales,
          total_revenue,
          refund_rate,
          conversion_rate,
          health_score,
          unique_customers,
          last_sale_at
        )
      `)
      .order('created_at', { ascending: false })

    // Filtros
    if (!includeInactive) {
      query = query.eq('is_active', true)
    }
    if (category) {
      query = query.eq('category', category)
    }

    const { data: products, error } = await query

    if (error) {
      console.error('❌ Erro ao buscar produtos:', error)
      return NextResponse.json(
        { error: 'Falha ao buscar produtos', details: error.message },
        { status: 500 }
      )
    }

    // 2️⃣ Calcular estatísticas globais
    const typedProducts = (products || []) as Product[]
    
    const stats = {
      total_products: typedProducts.length,
      active_products: typedProducts.filter((p: Product) => p.is_active).length,
      total_revenue: typedProducts.reduce((sum: number, p: Product) => sum + (p.performance?.total_revenue || 0), 0),
      avg_health_score: typedProducts.length 
        ? Math.round(typedProducts.reduce((sum: number, p: Product) => sum + (p.performance?.health_score || 0), 0) / typedProducts.length)
        : 0
    }

    return NextResponse.json({
      success: true,
      products: typedProducts,
      stats
    })

  } catch (error: any) {
    console.error('❌ Erro ao buscar produtos:', error)
    return NextResponse.json(
      { error: 'Erro interno', message: error.message },
      { status: 500 }
    )
  }
}
