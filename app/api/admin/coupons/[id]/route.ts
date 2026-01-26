import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import type { CouponFormData } from '@/lib/types/coupon'

// GET - Buscar cupom específico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const { data, error } = await supabaseAdmin
      .from('coupons')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: 'Cupom não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    console.error('Erro ao buscar cupom:', error)
    return NextResponse.json(
      { error: 'Erro interno ao buscar cupom' },
      { status: 500 }
    )
  }
}

// PATCH - Atualizar cupom
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body: Partial<CouponFormData> = await request.json()

    // Validações
    if (body.value !== undefined && body.value <= 0) {
      return NextResponse.json(
        { error: 'Valor deve ser maior que zero' },
        { status: 400 }
      )
    }

    if (body.type === 'percent' && body.value && body.value > 100) {
      return NextResponse.json(
        { error: 'Porcentagem não pode ser maior que 100%' },
        { status: 400 }
      )
    }

    // Preparar dados para atualização
    const updateData: any = {}
    
    if (body.code) updateData.code = body.code.toUpperCase().trim()
    if (body.type) updateData.type = body.type
    if (body.value !== undefined) updateData.value = body.value
    if (body.min_order_value !== undefined) updateData.min_order_value = body.min_order_value
    if (body.usage_limit !== undefined) updateData.usage_limit = body.usage_limit
    if (body.expiration_date !== undefined) updateData.expiration_date = body.expiration_date
    if (body.description !== undefined) updateData.description = body.description
    if (body.is_active !== undefined) updateData.is_active = body.is_active

    const { data, error } = await supabaseAdmin
      .from('coupons')
      .update(updateData)
      .eq('id', id)
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
      
      console.error('Erro ao atualizar cupom:', error)
      return NextResponse.json(
        { error: 'Erro ao atualizar cupom' },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Cupom não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    console.error('Erro ao atualizar cupom:', error)
    return NextResponse.json(
      { error: 'Erro interno ao atualizar cupom' },
      { status: 500 }
    )
  }
}

// DELETE - Deletar cupom (soft delete - apenas desativa)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // Soft delete - apenas desativa o cupom
    const { data, error } = await supabaseAdmin
      .from('coupons')
      .update({ is_active: false })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Erro ao deletar cupom:', error)
      return NextResponse.json(
        { error: 'Erro ao deletar cupom' },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Cupom não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { message: 'Cupom desativado com sucesso' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erro ao deletar cupom:', error)
    return NextResponse.json(
      { error: 'Erro interno ao deletar cupom' },
      { status: 500 }
    )
  }
}
