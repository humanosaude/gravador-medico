import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendWelcomeEmail } from '@/lib/email'

// Endpoint temporário para enviar emails manualmente
// Remover após uso!
export async function GET() {
  const results = []

  // 1. CAROLINA - buscar dados e enviar email
  try {
    // Buscar dados da Carolina no Lovable
    const carolinaEmail = 'carolinaoliveiralucas@hotmail.com'
    
    // Buscar venda da Carolina
    const { data: carolinaSale } = await supabaseAdmin
      .from('sales')
      .select('*')
      .ilike('customer_email', '%carol%')
      .eq('order_status', 'paid')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (carolinaSale) {
      // Buscar credenciais do Lovable
      const lovableUrl = process.env.LOVABLE_EDGE_FUNCTION_URL || 'https://acouwzdniytqhaesgtpr.supabase.co/functions/v1/admin-user-manager'
      const lovableKey = process.env.LOVABLE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
      
      // Tentar buscar usuário existente
      const searchResponse = await fetch(`${lovableUrl}?action=get-user&email=${encodeURIComponent(carolinaEmail)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${lovableKey}`,
          'Content-Type': 'application/json'
        }
      })

      let password = ''
      
      // Se não conseguir buscar a senha, resetar
      const resetResponse = await fetch(lovableUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'reset-password',
          email: carolinaEmail
        })
      })

      const resetData = await resetResponse.json()
      
      if (resetData.password) {
        password = resetData.password
      } else if (resetData.new_password) {
        password = resetData.new_password
      } else {
        // Gerar senha temporária
        password = 'Gravador' + Math.random().toString(36).slice(-6)
        
        // Atualizar senha
        await fetch(lovableUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'update-password',
            email: carolinaEmail,
            password: password
          })
        })
      }

      // Enviar email
      const emailResult = await sendWelcomeEmail({
        to: carolinaEmail,
        customerName: carolinaSale.customer_name || 'Carolina',
        userEmail: carolinaEmail,
        userPassword: password,
        orderId: carolinaSale.id,
        orderValue: carolinaSale.total_amount || 97,
        paymentMethod: carolinaSale.payment_gateway || 'Cartão'
      })

      results.push({
        customer: 'Carolina',
        email: carolinaEmail,
        password: password,
        emailSent: emailResult.success,
        error: emailResult.error
      })
    } else {
      results.push({
        customer: 'Carolina',
        error: 'Venda não encontrada'
      })
    }
  } catch (error: any) {
    results.push({
      customer: 'Carolina',
      error: error.message
    })
  }

  // 2. SILAS - buscar dados, resetar senha e enviar email
  try {
    const silasEmail = await getSilasEmail()
    
    // Buscar venda do Silas
    const { data: silasSale } = await supabaseAdmin
      .from('sales')
      .select('*')
      .ilike('customer_name', '%silas%')
      .eq('order_status', 'paid')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (silasSale) {
      const email = silasSale.customer_email
      
      const lovableUrl = process.env.LOVABLE_EDGE_FUNCTION_URL || 'https://acouwzdniytqhaesgtpr.supabase.co/functions/v1/admin-user-manager'
      const lovableKey = process.env.LOVABLE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
      
      // Gerar nova senha
      const newPassword = 'Gravador' + Math.random().toString(36).slice(-6)
      
      // Resetar senha no Lovable
      const resetResponse = await fetch(lovableUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'update-password',
          email: email,
          password: newPassword
        })
      })

      const resetData = await resetResponse.json()

      // Enviar email
      const emailResult = await sendWelcomeEmail({
        to: email,
        customerName: silasSale.customer_name || 'Dr. Silas Negrão',
        userEmail: email,
        userPassword: newPassword,
        orderId: silasSale.id,
        orderValue: silasSale.total_amount || 97,
        paymentMethod: silasSale.payment_gateway || 'Cartão'
      })

      results.push({
        customer: 'Silas',
        email: email,
        password: newPassword,
        passwordReset: resetData,
        emailSent: emailResult.success,
        error: emailResult.error
      })
    } else {
      results.push({
        customer: 'Silas',
        error: 'Venda não encontrada'
      })
    }
  } catch (error: any) {
    results.push({
      customer: 'Silas',
      error: error.message
    })
  }

  return NextResponse.json({
    success: true,
    message: 'Emails processados',
    results
  })
}

async function getSilasEmail(): Promise<string> {
  const { data } = await supabaseAdmin
    .from('sales')
    .select('customer_email')
    .ilike('customer_name', '%silas%')
    .limit(1)
    .single()
  
  return data?.customer_email || ''
}
