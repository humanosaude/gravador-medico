// =====================================================
// TIPOS TYPESCRIPT - SISTEMA DE CUPONS
// =====================================================

export type CouponType = 'percent' | 'fixed'

export interface Coupon {
  id: string
  code: string
  type: CouponType
  value: number
  min_order_value: number
  usage_limit: number | null
  usage_count: number
  expiration_date: string | null
  is_active: boolean
  description: string | null
  created_at: string
  updated_at: string
  created_by: string | null
}

export interface CouponFormData {
  code: string
  type: CouponType
  value: number
  min_order_value?: number
  usage_limit?: number | null
  expiration_date?: string | null
  description?: string
  is_active?: boolean
}

export interface CouponValidationRequest {
  code: string
  cartTotal: number
}

export interface CouponValidationResponse {
  valid: boolean
  coupon?: {
    code: string
    type: CouponType
    value: number
  }
  discountAmount?: number
  newTotal?: number
  errorMessage?: string
}

export interface CouponUsageRequest {
  code: string
  orderId?: string
}

export interface CouponUsageResponse {
  success: boolean
  message: string
}
