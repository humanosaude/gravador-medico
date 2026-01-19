/**
 * Integração com APPMAX - Gateway de Pagamento Próprio
 * Documentação: https://docs.appmax.com.br/api/
 * 
 * IMPORTANTE: O token vai NO CORPO da requisição como "access-token"
 * 
 * Fluxo:
 * 1. Criar Cliente (Customer) -> retorna customer_id
 * 2. Criar Pedido (Order) -> retorna order_id  
 * 3. Processar Pagamento (Payment) -> retorna status
 */

// Configuração da Appmax - ENDPOINT OFICIAL V3
const APPMAX_API_URL = 'https://admin.appmax.com.br/api/v3'
const APPMAX_API_TOKEN = process.env.APPMAX_API_TOKEN || ''
const APPMAX_PRODUCT_ID = process.env.APPMAX_PRODUCT_ID || '32991339'

interface UTMParams {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_content?: string
  utm_term?: string
}

export interface AppmaxCustomer {
  name: string
  email: string
  phone?: string
  cpf?: string
  address?: {
    zipcode?: string
    street?: string
    number?: string
    complement?: string
    neighborhood?: string
    city?: string
    state?: string
  }
}

export interface AppmaxOrderBump {
  product_id: string
  quantity: number
}

export interface AppmaxOrderRequest {
  customer: AppmaxCustomer
  product_id: string
  quantity: number
  payment_method: 'credit_card' | 'pix' | 'boleto'
  order_bumps?: AppmaxOrderBump[]
  utm_params?: UTMParams
  card_data?: {
    number: string
    holder_name: string
    exp_month: string
    exp_year: string
    cvv: string
    installments?: number
  }
}

export interface AppmaxOrderResponse {
  success: boolean
  order_id: string
  status: 'pending' | 'approved' | 'rejected'
  payment_url?: string
  pix_qr_code?: string
  pix_qr_code_base64?: string
  boleto_url?: string
  message?: string
}

/**
 * Cria um pedido na Appmax via API
 * Fluxo completo: Cliente -> Pedido -> Pagamento
 */
export async function createAppmaxOrder(data: AppmaxOrderRequest): Promise<AppmaxOrderResponse> {
  try {
    // ETAPA 1: Criar Cliente
    const customerResponse = await fetch(`${APPMAX_API_URL}/customer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        'access-token': APPMAX_API_TOKEN,
        firstname: data.customer.name.split(' ')[0],
        lastname: data.customer.name.split(' ').slice(1).join(' ') || data.customer.name.split(' ')[0],
        email: data.customer.email,
        telephone: data.customer.phone?.replace(/\D/g, '') || '',
        postcode: data.customer.address?.zipcode?.replace(/\D/g, '') || '',
        address_street: data.customer.address?.street || '',
        address_street_number: data.customer.address?.number || '',
        address_street_complement: data.customer.address?.complement || '',
        address_street_district: data.customer.address?.neighborhood || '',
        address_city: data.customer.address?.city || '',
        address_state: data.customer.address?.state || '',
        ip: '127.0.0.1', // TODO: pegar IP real do cliente
        tracking: data.utm_params || {},
      }),
    })

    // Captura resposta como texto primeiro para debug
    const customerResponseText = await customerResponse.text()
    
    if (!customerResponse.ok) {
      console.error('❌ Erro ao criar cliente:', {
        status: customerResponse.status,
        statusText: customerResponse.statusText,
        body: customerResponseText.substring(0, 500),
      })
      
      try {
        const error = JSON.parse(customerResponseText)
        throw new Error(error.message || 'Erro ao criar cliente na Appmax')
      } catch (e) {
        throw new Error(`Erro ao criar cliente: ${customerResponse.status} - ${customerResponseText.substring(0, 200)}`)
      }
    }

    let customerResult
    try {
      customerResult = JSON.parse(customerResponseText)
    } catch (e) {
      console.error('❌ Resposta não é JSON:', customerResponseText.substring(0, 500))
      throw new Error(`Resposta inválida da API: ${customerResponseText.substring(0, 300)}`)
    }
    
    // Log completo da resposta para debug
    console.log('📥 Resposta completa da API (customer):', JSON.stringify(customerResult, null, 2))
    
    // A API pode retornar em vários formatos:
    // { success: true, data: { id: 123 } }
    // { customer_id: 123 }
    // { id: 123 }
    const customerId = customerResult.data?.id || 
                       customerResult.data?.customer_id ||
                       customerResult.customer_id || 
                       customerResult.id

    if (!customerId) {
      console.error('❌ customer_id não retornado. Resposta:', JSON.stringify(customerResult))
      throw new Error(`customer_id não encontrado. API retornou: ${JSON.stringify(customerResult).substring(0, 300)}`)
    }

    console.log('✅ Cliente criado:', customerId)

    // ETAPA 2: Criar Pedido
    // Calcula o total do carrinho
    let cartTotal = 36.00 // Produto principal

    const products = [
      {
        sku: APPMAX_PRODUCT_ID,
        name: 'Gravador Médico - Acesso Vitalício',
        qty: 1,
        digital_product: 1, // INFOPRODUTO
      },
    ]

    // Adiciona order bumps
    if (data.order_bumps && data.order_bumps.length > 0) {
      for (const bump of data.order_bumps) {
        const bumpPrice = bump.product_id === '32989468' ? 147.00 : 97.00
        cartTotal += bumpPrice
        
        products.push({
          sku: bump.product_id,
          name: `Order Bump ${bump.product_id}`,
          qty: bump.quantity,
          digital_product: 1, // INFOPRODUTO
        })
      }
    }

    console.log('📦 Criando pedido com total:', cartTotal)

    const orderResponse = await fetch(`${APPMAX_API_URL}/order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        'access-token': APPMAX_API_TOKEN,
        total: cartTotal, // Envia total do carrinho (API calcula preço unitário)
        products,
        customer_id: customerId,
        shipping: 0, // Produto digital - sem frete
        discount: 0,
        freight_type: 'Sedex', // Requerido mesmo para produto digital
      }),
    })

    const orderResponseText = await orderResponse.text()
    console.log('📥 Resposta completa da API (order):', orderResponseText.substring(0, 500))

    if (!orderResponse.ok) {
      console.error('❌ Erro ao criar pedido:', orderResponseText)
      try {
        const error = JSON.parse(orderResponseText)
        throw new Error(error.message || 'Erro ao criar pedido na Appmax')
      } catch (e) {
        throw new Error(`Erro ao criar pedido: ${orderResponse.status} - ${orderResponseText.substring(0, 200)}`)
      }
    }

    let orderResult
    try {
      orderResult = JSON.parse(orderResponseText)
    } catch (e) {
      console.error('❌ Resposta order não é JSON:', orderResponseText)
      throw new Error('Resposta inválida da API Appmax ao criar pedido')
    }

    const orderId = orderResult.data?.id || orderResult.order_id || orderResult.id
    
    if (!orderId) {
      console.error('❌ order_id não retornado:', orderResult)
      throw new Error('API Appmax não retornou order_id')
    }

    console.log('✅ Pedido criado:', orderId)

    // ETAPA 3: Processar Pagamento
    let paymentResponse
    
    if (data.payment_method === 'pix') {
      paymentResponse = await fetch(`${APPMAX_API_URL}/payment/pix`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          'access-token': APPMAX_API_TOKEN,
          cart: {
            order_id: orderId,
          },
          customer: {
            customer_id: customerId,
          },
          payment: {
            pix: {
              document_number: data.customer.cpf?.replace(/\D/g, '') || '',
            },
          },
        }),
      })
    } else if (data.payment_method === 'credit_card' && data.card_data) {
      paymentResponse = await fetch(`${APPMAX_API_URL}/payment/credit-card`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          'access-token': APPMAX_API_TOKEN,
          cart: {
            order_id: orderId,
          },
          customer: {
            customer_id: customerId,
          },
          payment: {
            CreditCard: {
              number: data.card_data.number,
              cvv: data.card_data.cvv,
              month: parseInt(data.card_data.exp_month),
              year: parseInt(data.card_data.exp_year),
              document_number: data.customer.cpf?.replace(/\D/g, '') || '',
              name: data.card_data.holder_name,
              installments: data.card_data.installments || 1,
              soft_descriptor: 'GRAVADOR MEDICO',
            },
          },
        }),
      })
    } else {
      throw new Error('Método de pagamento não suportado')
    }

    if (!paymentResponse.ok) {
      const error = await paymentResponse.json()
      throw new Error(error.message || 'Erro ao processar pagamento na Appmax')
    }

    const paymentResult = await paymentResponse.json()
    
    return {
      success: paymentResult.success || true,
      order_id: orderId.toString(),
      status: paymentResult.status || 'pending',
      payment_url: paymentResult.payment_url,
      pix_qr_code: paymentResult.pix_qr_code,
      pix_qr_code_base64: paymentResult.pix_qr_code_base64,
      boleto_url: paymentResult.boleto_url,
    }
  } catch (error: any) {
    console.error('Erro ao criar pedido na Appmax:', error)
    return {
      success: false,
      order_id: '',
      status: 'rejected',
      message: error.message || 'Erro ao processar pagamento',
    }
  }
}

/**
 * Busca informações de um pedido na Appmax
 * Nota: A documentação não especifica endpoint de consulta de pedido
 * Você precisará verificar no painel Appmax se existe essa opção
 */
export async function getAppmaxOrder(orderId: string) {
  try {
    // Endpoint presumido - pode não existir na API v3
    const response = await fetch(`${APPMAX_API_URL}/order/${orderId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        'access-token': APPMAX_API_TOKEN,
        order_id: orderId,
      }),
    })

    if (!response.ok) {
      throw new Error('Pedido não encontrado')
    }

    return await response.json()
  } catch (error) {
    console.error('Erro ao buscar pedido na Appmax:', error)
    return null
  }
}

/**
 * Valida se um email tem acesso ao produto (via API da APPMAX)
 * Nota: Verificar no painel se existe endpoint para validar acesso
 */
export async function validateAppmaxAccess(email: string): Promise<boolean> {
  try {
    const response = await fetch(`${APPMAX_API_URL}/v1/customers/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${APPMAX_API_TOKEN}`,
      },
      body: JSON.stringify({
        email,
        product_id: APPMAX_PRODUCT_ID,
      }),
    })

    if (!response.ok) {
      return false
    }

    const result = await response.json()
    return result.has_access === true
  } catch (error) {
    console.error('Erro ao validar acesso APPMAX:', error)
    return false
  }
}

/**
 * Gera o link de checkout da APPMAX (fallback)
 */
export function generateCheckoutLink(utmParams?: UTMParams): string {
  const baseUrl = 'https://gravadormedico1768482029857.carrinho.app/one-checkout/ocmdf/32991339'
  
  if (!utmParams) {
    return baseUrl
  }
  
  const params = new URLSearchParams()
  
  if (utmParams.utm_source) params.append('utm_source', utmParams.utm_source)
  if (utmParams.utm_medium) params.append('utm_medium', utmParams.utm_medium)
  if (utmParams.utm_campaign) params.append('utm_campaign', utmParams.utm_campaign)
  if (utmParams.utm_content) params.append('utm_content', utmParams.utm_content)
  if (utmParams.utm_term) params.append('utm_term', utmParams.utm_term)
  
  const queryString = params.toString()
  return queryString ? `${baseUrl}?${queryString}` : baseUrl
}
