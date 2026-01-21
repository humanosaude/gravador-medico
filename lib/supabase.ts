import { createClient } from '@supabase/supabase-js'

// .trim() remove caracteres invisíveis como %0A que quebram WebSocket/Realtime
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Cliente público (com RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Cliente admin (ignora RLS - APENAS para webhook/backend)
export const supabaseAdmin = supabaseServiceRoleKey 
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : supabase // Fallback para o cliente normal se não tiver service role

// Tipos
export interface User {
  id: string
  email: string
  name?: string
  password_hash?: string
  appmax_customer_id?: string
  has_access: boolean
  role?: string
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  email: string
  full_name?: string
  role: 'user' | 'admin' | 'support'
  created_at: string
  updated_at: string
}

export interface Sale {
  id: string
  appmax_order_id: string
  appmax_customer_id?: string
  customer_name: string
  customer_email: string
  customer_phone?: string
  customer_cpf?: string
  total_amount: number
  discount: number
  subtotal: number
  status: 'pending' | 'approved' | 'rejected' | 'refunded' | 'cancelled'
  failure_reason?: string
  payment_method: 'pix' | 'credit_card' | 'boleto'
  utm_source?: string
  utm_campaign?: string
  utm_medium?: string
  ip_address?: string
  created_at: string
  updated_at: string
  paid_at?: string
  metadata?: Record<string, any>
}

export interface SaleItem {
  id: string
  sale_id: string
  product_id: string
  product_name: string
  product_type: 'main' | 'bump' | 'upsell'
  price: number
  quantity: number
  created_at: string
}

/**
 * Cria ou atualiza um usuário após compra na APPMAX
 */
export async function createOrUpdateUser(data: {
  email: string
  name?: string
  appmax_customer_id?: string
}) {
  const { data: user, error } = await supabase
    .from('users')
    .upsert({
      email: data.email,
      name: data.name,
      appmax_customer_id: data.appmax_customer_id,
      has_access: true,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'email'
    })
    .select()
    .single()

  if (error) {
    console.error('Erro ao criar/atualizar usuário:', error)
    throw error
  }

  return user
}

/**
 * Busca usuário por email
 */
export async function getUserByEmail(email: string) {
  const client = supabaseServiceRoleKey ? supabaseAdmin : supabase
  const { data, error } = await client
    .from('users')
    .select('*')
    .eq('email', email)
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 = not found
    console.error('Erro ao buscar usuário:', error)
    throw error
  }

  return data
}

/**
 * Verifica se usuário tem acesso
 */
export async function checkUserAccess(email: string): Promise<boolean> {
  const user = await getUserByEmail(email)
  return user?.has_access || false
}
