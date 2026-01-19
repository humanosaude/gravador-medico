'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Check, Copy, Clock } from 'lucide-react'

function PixSuccessContent() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get('order_id')
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Lê QR Code do sessionStorage
  useEffect(() => {
    const savedQrCode = sessionStorage.getItem('pix_qr_code')
    if (savedQrCode) {
      setQrCode(savedQrCode)
      // Limpa após ler
      sessionStorage.removeItem('pix_qr_code')
    }
  }, [])

  const copyToClipboard = () => {
    if (qrCode) {
      navigator.clipboard.writeText(qrCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-brand-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl p-8 md:p-12">
        
        {/* Success Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
            <Check className="w-10 h-10 text-green-600" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-black text-center text-gray-900 mb-2">
          Pedido Criado com Sucesso!
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Pedido #{orderId}
        </p>

        {/* Alert Box */}
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-800 mb-1">
                Aguardando Pagamento PIX
              </h3>
              <p className="text-sm text-yellow-700">
                O pagamento PIX é processado em até 5 minutos. Após a confirmação, 
                você receberá um email com os dados de acesso.
              </p>
            </div>
          </div>
        </div>

        {/* QR Code */}
        {qrCode && (
          <div className="space-y-6">
            <div className="flex flex-col items-center">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Escaneie o QR Code
              </h2>
              <div className="bg-white p-4 rounded-xl border-4 border-brand-500 shadow-lg">
                <QRCodeSVG
                  value={qrCode}
                  size={256}
                  level="H"
                  includeMargin={true}
                />
              </div>
            </div>

            {/* Pix Copy Paste */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Ou copie o código PIX:
              </h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={qrCode}
                  readOnly
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg font-mono text-sm bg-gray-50"
                />
                <button
                  onClick={copyToClipboard}
                  className="px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
                >
                  {copied ? (
                    <>
                      <Check className="w-5 h-5" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5" />
                      Copiar
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-brand-50 rounded-xl p-6 space-y-3">
              <h3 className="font-bold text-brand-900 mb-3">
                Como pagar com PIX:
              </h3>
              <ol className="space-y-2 text-sm text-gray-700">
                <li className="flex gap-2">
                  <span className="font-bold text-brand-600">1.</span>
                  Abra o app do seu banco
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-brand-600">2.</span>
                  Escolha pagar com PIX QR Code ou Pix Copia e Cola
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-brand-600">3.</span>
                  Escaneie o QR Code ou cole o código acima
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-brand-600">4.</span>
                  Confirme o pagamento de R$ 36,00
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-brand-600">5.</span>
                  Pronto! Você receberá um email com acesso em até 5 minutos
                </li>
              </ol>
            </div>

            {/* Back Button */}
            <div className="text-center pt-4">
              <a
                href="/"
                className="text-brand-600 hover:text-brand-700 font-semibold underline"
              >
                ← Voltar para o site
              </a>
            </div>
          </div>
        )}

        {!qrCode && (
          <div className="text-center text-red-600">
            <p>Erro ao gerar QR Code PIX. Entre em contato com o suporte.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function PixSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Carregando...</div>
      </div>
    }>
      <PixSuccessContent />
    </Suspense>
  )
}
