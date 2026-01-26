import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import type { Coupon, CouponFormData } from '@/lib/types/coupon'

// GET - Listar todos os cupons
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('active') === 'true'

    let query = supabaseAdmin
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false })

    if (activeOnly) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query

    if (error) {
      console.error('Erro ao buscar cupons:', error)
      return NextResponse.json(
        { error: 'Erro ao buscar cupons' },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    console.error('Erro ao buscar cupons:', error)
    return NextResponse.json(
      { error: 'Erro interno ao buscar cupons' },
      { status: 500 }
    )
  }
}

// POST - Criar novo cupom
export async function POST(request: NextRequest) {
  try {
    const body: CouponFormData = await request.json()
    
    // Validações básicas
    if (!body.code || !body.type || !body.value) {
      return NextResponse.json(
        { error: 'Código, tipo e valor são obrigatórios' },
        { status: 400 }
      )
    }

    if (body.value <= 0) {
      return NextResponse.json(
        { error: 'Valor deve ser maior que zero' },
        { status: 400 }
      )
    }

    if (body.type === 'percent' && body.value > 100) {
      return NextResponse.json(
        { error: 'Porcentagem não pode ser maior que 100%' },
        { status: 400 }
      )
    }

    // Preparar dados para inserção (sempre uppercase)
    const couponData = {
      code: body.code.toUpperCase().trim(),
      type: body.type,
      value: body.value,
      min_order_value: body.min_order_value || 0,
      usage_limit: body.usage_limit || null,
      expiration_date: body.expiration_date || null,
      description: body.description || null,
      is_active: body.is_active !== undefined ? body.is_active : true,
    }

    const { data, error } = await supabaseAdmin
      .from('coupons')
      .insert([couponData])
      .select()
      .single()

    if (error) {
      // Verificar erro de código duplicado
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Já existe um cupom com este código' },
          { status: 409 }
        )
      }
      
      console.error('Erro ao criar cupom:', error)
      return NextResponse.json(
        { error: 'Erro ao criar cupom' },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar cupom:', error)
    return NextResponse.json(
      { error: 'Erro interno ao criar cupom' },
      { status: 500 }
    )
  }
}
