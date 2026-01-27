import { useState, useEffect } from 'react'

declare global {
  interface Window {
    MercadoPago: any
  }
}

export function useMercadoPago() {
  const [mp, setMp] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const initMercadoPago = async () => {
      try {
        // Aguarda o script carregar
        let attempts = 0
        while (!window.MercadoPago && attempts < 50) {
          await new Promise(resolve => setTimeout(resolve, 100))
          attempts++
        }

        if (!window.MercadoPago) {
          throw new Error('Mercado Pago SDK não carregou')
        }

        const publicKey = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY
        if (!publicKey) {
          throw new Error('Chave pública do Mercado Pago não configurada')
        }

        const mercadopago = new window.MercadoPago(publicKey, {
          locale: 'pt-BR'
        })

        setMp(mercadopago)
        setLoading(false)
      } catch (err: any) {
        console.error('Erro ao inicializar Mercado Pago:', err)
        setError(err.message)
        setLoading(false)
      }
    }

    initMercadoPago()
  }, [])

  /**
   * Tokeniza dados do cartão
   */
  const createCardToken = async (cardData: {
    cardNumber: string
    cardholderName: string
    cardExpirationMonth: string
    cardExpirationYear: string
    securityCode: string
    identificationType: string
    identificationNumber: string
  }) => {
    if (!mp) {
      throw new Error('Mercado Pago não inicializado')
    }

    try {
      const token = await mp.createCardToken({
        cardNumber: cardData.cardNumber.replace(/\s/g, ''),
        cardholderName: cardData.cardholderName,
        cardExpirationMonth: cardData.cardExpirationMonth,
        cardExpirationYear: cardData.cardExpirationYear,
        securityCode: cardData.securityCode,
        identificationType: cardData.identificationType,
        identificationNumber: cardData.identificationNumber.replace(/\D/g, ''),
      })

      return token
    } catch (error: any) {
      console.error('Erro ao criar token:', error)
      throw new Error(error.message || 'Erro ao processar cartão')
    }
  }

  /**
   * Valida número do cartão
   */
  const validateCardNumber = (cardNumber: string): boolean => {
    const cleaned = cardNumber.replace(/\s/g, '')
    return cleaned.length >= 13 && cleaned.length <= 19
  }

  /**
   * Valida CVV
   */
  const validateCVV = (cvv: string): boolean => {
    return cvv.length >= 3 && cvv.length <= 4
  }

  /**
   * Identifica bandeira do cartão
   */
  const getCardBrand = async (cardNumber: string) => {
    if (!mp) return null

    try {
      const cleaned = cardNumber.replace(/\s/g, '')
      if (cleaned.length < 6) return null

      const paymentMethodId = await mp.getPaymentMethods({
        bin: cleaned.substring(0, 6)
      })

      return paymentMethodId.results[0] || null
    } catch (error) {
      console.error('Erro ao identificar bandeira:', error)
      return null
    }
  }

  return {
    mp,
    loading,
    error,
    createCardToken,
    validateCardNumber,
    validateCVV,
    getCardBrand,
  }
}
