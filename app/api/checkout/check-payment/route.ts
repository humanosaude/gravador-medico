import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendPurchaseConfirmationEmail } from '@/lib/email'
import { processProvisioningQueue } from '@/lib/provisioning-worker'

/**
 * 🔍 API para verificar status de pagamento PIX
 * 
 * O cliente usa esta API para polling e saber se o pagamento foi aprovado
 * 
 * AGORA: Se o banco local diz "pending" mas o MP diz "approved",
 * esta API atualiza o banco, envia email e provisiona acesso!
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('order_id')
    const paymentId = searchParams.get('payment_id')

    if (!orderId && !paymentId) {
      return NextResponse.json({
        success: false,
        error: 'order_id ou payment_id é obrigatório'
      }, { status: 400 })
    }

    console.log(`🔍 Verificando status: order_id=${orderId}, payment_id=${paymentId}`)

    // Buscar pelo order_id (UUID) ou mercadopago_payment_id
    let query = supabaseAdmin
      .from('sales')
      .select('*')

    if (orderId) {
      query = query.eq('id', orderId)
    } else if (paymentId) {
      query = query.eq('mercadopago_payment_id', paymentId)
    }

    const { data: sale, error } = await query.maybeSingle()

    if (error) {
      console.error('❌ Erro ao buscar venda:', error)
      return NextResponse.json({
        success: false,
        error: 'Erro ao verificar pagamento'
      }, { status: 500 })
    }

    if (!sale) {
      return NextResponse.json({
        success: false,
        status: 'not_found',
        message: 'Pedido não encontrado'
      })
    }

    // Verificar se já está pago no banco local
    const isPaidLocally = sale.status === 'paid' || sale.status === 'approved' || 
                          sale.order_status === 'paid' || sale.order_status === 'approved'

    if (isPaidLocally) {
      console.log(`✅ Pedido ${orderId} já está pago no banco local`)
      return NextResponse.json({
        success: true,
        order_id: sale.id,
        status: sale.status,
        order_status: sale.order_status,
        is_paid: true,
        mercadopago_payment_id: sale.mercadopago_payment_id
      })
    }

    // =====================================================
    // 🔄 BANCO LOCAL DIZ "PENDING" - VERIFICAR NO MP!
    // =====================================================
    
    if (sale.mercadopago_payment_id && sale.payment_gateway === 'mercadopago') {
      console.log(`🔍 Verificando status no Mercado Pago: ${sale.mercadopago_payment_id}`)
      
      try {
        const mpResponse = await fetch(
          `https://api.mercadopago.com/v1/payments/${sale.mercadopago_payment_id}`,
          {
            headers: {
              'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`
            }
          }
        )

        if (mpResponse.ok) {
          const mpPayment = await mpResponse.json()
          console.log(`📊 Status no MP: ${mpPayment.status}`)

          // =====================================================
          // 🎉 PAGAMENTO APROVADO NO MP - ATUALIZAR TUDO!
          // =====================================================
          
          if (mpPayment.status === 'approved') {
            console.log(`🎉 Pagamento aprovado no MP! Atualizando banco...`)

            // 1️⃣ Atualizar status da venda
            await supabaseAdmin
              .from('sales')
              .update({
                order_status: 'paid',
                status: 'paid',
                updated_at: new Date().toISOString()
              })
              .eq('id', sale.id)

            console.log(`✅ Venda ${sale.id} atualizada para PAID`)

            // 2️⃣ Limpar carrinho abandonado
            if (sale.customer_email) {
              try {
                await supabaseAdmin
                  .from('abandoned_carts')
                  .delete()
                  .eq('customer_email', sale.customer_email)
                console.log(`🗑️ Carrinho abandonado limpo`)
              } catch (cartError) {
                console.warn('⚠️ Erro ao limpar carrinho abandonado:', cartError)
              }
            }

            // 3️⃣ Enviar email de confirmação
            if (sale.customer_email) {
              try {
                console.log(`📧 Enviando email de confirmação para ${sale.customer_email}...`)
                await sendPurchaseConfirmationEmail({
                  to: sale.customer_email,
                  customerName: sale.customer_name || 'Cliente',
                  orderId: sale.id,
                  orderValue: parseFloat(sale.total_amount) || mpPayment.transaction_amount || 0,
                  paymentMethod: 'mercadopago'
                })
                console.log(`✅ Email de confirmação enviado!`)
              } catch (emailError: any) {
                console.error('⚠️ Erro ao enviar email:', emailError.message)
              }
            }

            // 4️⃣ Adicionar à fila de provisionamento
            const { data: existingQueue } = await supabaseAdmin
              .from('provisioning_queue')
              .select('id')
              .eq('sale_id', sale.id)
              .maybeSingle()

            if (!existingQueue) {
              const { error: enqueueError } = await supabaseAdmin
                .from('provisioning_queue')
                .insert({ sale_id: sale.id, status: 'pending' })

              if (enqueueError) {
                console.error('❌ Erro ao enfileirar provisionamento:', enqueueError)
              } else {
                console.log(`✅ Pedido ${sale.id} adicionado à fila de provisionamento`)
              }
            }

            // 5️⃣ Processar fila imediatamente
            try {
              console.log('⚙️ Processando fila de provisionamento...')
              const result = await processProvisioningQueue()
              console.log('✅ Provisionamento concluído:', result)
            } catch (provisioningError: any) {
              console.error('⚠️ Erro ao processar fila:', provisioningError.message)
            }

            // Retornar como pago
            return NextResponse.json({
              success: true,
              order_id: sale.id,
              status: 'paid',
              order_status: 'paid',
              is_paid: true,
              mercadopago_payment_id: sale.mercadopago_payment_id,
              synced_from_mp: true
            })
          }
        }
      } catch (mpError: any) {
        console.error('⚠️ Erro ao verificar MP:', mpError.message)
        // Continuar e retornar status do banco local
      }
    }

    // Retornar status atual (ainda pendente)
    console.log(`📊 Status do pedido ${orderId}: status=${sale.status}, order_status=${sale.order_status}, isPaid=false`)

    return NextResponse.json({
      success: true,
      order_id: sale.id,
      status: sale.status,
      order_status: sale.order_status,
      is_paid: false,
      mercadopago_payment_id: sale.mercadopago_payment_id
    })

  } catch (error: any) {
    console.error('❌ Erro no check-payment:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
