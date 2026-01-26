import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import type { CouponValidationRequest, CouponValidationResponse } from '@/lib/types/coupon'

export async function POST(request: NextRequest) {
  try {
    const body: CouponValidationRequest = await request.json()
    const { code, cartTotal } = body

    // Validações básicas
    if (!code || !cartTotal) {
      return NextResponse.json<CouponValidationResponse>(
        {
          valid: false,
          errorMessage: 'Código do cupom e valor do carrinho são obrigatórios',
        },
        { status: 400 }
      )
    }

    if (cartTotal <= 0) {
      return NextResponse.json<CouponValidationResponse>(
        {
          valid: false,
          errorMessage: 'Valor do carrinho inválido',
        },
        { status: 400 }
      )
    }

    // Buscar cupom (case insensitive)
    const { data: coupon, error: fetchError } = await supabase
      .from('coupons')
      .select('*')
      .ilike('code', code.toUpperCase())
      .single()

    if (fetchError || !coupon) {
      return NextResponse.json<CouponValidationResponse>(
        {
          valid: false,
          errorMessage: 'Cupom não encontrado',
        },
        { status: 404 }
      )
    }

    // Verificar se está ativo
    if (!coupon.is_active) {
      return NextResponse.json<CouponValidationResponse>(
        {
          valid: false,
          errorMessage: 'Cupom desativado',
        },
        { status: 400 }
      )
    }

    // Verificar expiração
    if (coupon.expiration_date) {
      const expirationDate = new Date(coupon.expiration_date)
      const now = new Date()
      
      if (expirationDate < now) {
        return NextResponse.json<CouponValidationResponse>(
          {
            valid: false,
            errorMessage: 'Cupom expirado',
          },
          { status: 400 }
        )
      }
    }

    // Verificar limite de uso
    if (coupon.usage_limit !== null && coupon.usage_count >= coupon.usage_limit) {
      return NextResponse.json<CouponValidationResponse>(
        {
          valid: false,
          errorMessage: 'Limite de uso atingido',
        },
        { status: 400 }
      )
    }

    // Verificar valor mínimo do pedido
    if (cartTotal < coupon.min_order_value) {
      return NextResponse.json<CouponValidationResponse>(
        {
          valid: false,
          errorMessage: `Valor mínimo do pedido: R$ ${coupon.min_order_value.toFixed(2)}`,
        },
        { status: 400 }
      )
    }

    // Calcular desconto
    let discountAmount = 0
    if (coupon.type === 'percent') {
      discountAmount = (cartTotal * coupon.value) / 100
    } else {
      discountAmount = coupon.value
    }

    // Garantir que desconto não seja maior que o valor do carrinho
    discountAmount = Math.min(discountAmount, cartTotal)

    // Garantir que sempre sobre pelo menos R$ 0,10
    const newTotal = Math.max(cartTotal - discountAmount, 0.10)
    discountAmount = cartTotal - newTotal

    return NextResponse.json<CouponValidationResponse>(
      {
        valid: true,
        coupon: {
          code: coupon.code,
          type: coupon.type,
          value: coupon.value,
        },
        discountAmount: parseFloat(discountAmount.toFixed(2)),
        newTotal: parseFloat(newTotal.toFixed(2)),
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erro ao validar cupom:', error)
    return NextResponse.json<CouponValidationResponse>(
      {
        valid: false,
        errorMessage: 'Erro ao validar cupom',
      },
      { status: 500 }
    )
  }
}
