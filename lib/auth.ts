import { getUserByEmail } from './supabase'
import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
)

/**
 * Gera um token JWT para o usuário
 */
export async function generateToken(email: string): Promise<string> {
  const token = await new SignJWT({ email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d') // Token válido por 7 dias
    .sign(JWT_SECRET)

  return token
}

/**
 * Verifica e decodifica um token JWT
 */
export async function verifyToken(token: string): Promise<{ email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as { email: string }
  } catch (error) {
    console.error('Erro ao verificar token:', error)
    return null
  }
}

/**
 * Autentica um usuário com validação de senha bcrypt
 */
export async function authenticateUser(email: string, password: string): Promise<boolean> {
  try {
    // Buscar usuário no Supabase
    const user = await getUserByEmail(email)
    
    if (!user) {
      return false
    }

    // Verificar se tem acesso
    if (!user.has_access) {
      return false
    }

    // Verificar senha hash (bcrypt)
    if (!user.password_hash) {
      // Se não tem password_hash, rejeita (segurança)
      console.warn(`Usuário ${email} sem password_hash configurado`)
      return false
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash)
    
    if (!isValidPassword) {
      return false
    }
    
    return true
  } catch (error) {
    console.error('Erro ao autenticar usuário:', error)
    return false
  }
}

/**
 * Obtém usuário a partir do token
 */
export async function getUserFromToken(token: string) {
  const payload = await verifyToken(token)
  
  if (!payload) {
    return null
  }

  const user = await getUserByEmail(payload.email)
  return user
}
