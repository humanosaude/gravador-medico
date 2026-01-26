import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import type { CouponUsageRequest, CouponUsageResponse } from '@/lib/types/coupon'

export async function POST(request: NextRequest) {
  try {
    const body: CouponUsageRequest = await request.json()
    const { code } = body

    if (!code) {
      return NextResponse.json<CouponUsageResponse>(
        {
          success: false,
          message: 'Código do cupom é obrigatório',
        },
        { status: 400 }
      )
    }

    // Incrementar uso do cupom usando função RPC
    const { data, error } = await supabaseAdmin
      .rpc('increment_coupon_usage', { 
        p_code: code.toUpperCase() 
      })

    if (error) {
      console.error('Erro ao incrementar uso do cupom:', error)
      return NextResponse.json<CouponUsageResponse>(
        {
          success: false,
          message: 'Erro ao registrar uso do cupom',
        },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json<CouponUsageResponse>(
        {
          success: false,
          message: 'Cupom não encontrado ou inativo',
        },
        { status: 404 }
      )
    }

    return NextResponse.json<CouponUsageResponse>(
      {
        success: true,
        message: 'Uso do cupom registrado com sucesso',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erro ao incrementar cupom:', error)
    return NextResponse.json<CouponUsageResponse>(
      {
        success: false,
        message: 'Erro interno ao registrar uso do cupom',
      },
      { status: 500 }
    )
  }
}
