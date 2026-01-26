'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Image from 'next/image'

export default function WhatsAppFloating() {
  const pathname = usePathname()
  const [showBalloon, setShowBalloon] = useState(false)
  const [showPulse, setShowPulse] = useState(true)
  const phoneNumber = '5521986451821'
  const message = encodeURIComponent(
    'Olá! Vi o Gravador Médico e gostaria de saber mais. Pode me ajudar?'
  )

  // Não mostrar o WhatsApp em páginas de admin, dashboard ou login
  const shouldHide = pathname?.startsWith('/admin') || 
                     pathname?.startsWith('/dashboard') || 
                     pathname?.startsWith('/login')

  if (shouldHide) {
    return null
  }

  useEffect(() => {
    // Pulso para após 5 segundos
    const pulseTimer = setTimeout(() => {
      setShowPulse(false)
    }, 5000)

    // Ciclo de animação do balão
    // Abre após 5 segundos
    const timer1 = setTimeout(() => {
      setShowBalloon(true)
    }, 5000)

    // Fecha após 10 segundos (5s aberto + 10s = 15s total)
    const timer2 = setTimeout(() => {
      setShowBalloon(false)
    }, 15000)

    // Abre após 20 segundos (15s + 5s = 20s total)
    const timer3 = setTimeout(() => {
      setShowBalloon(true)
    }, 20000)

    // Fecha após 30 segundos (20s + 10s = 30s total)
    const timer4 = setTimeout(() => {
      setShowBalloon(false)
    }, 30000)

    // Loop infinito: reinicia o ciclo a cada 40 segundos
    const loopInterval = setInterval(() => {
      // Abre
      setShowBalloon(true)
      
      // Fecha após 10 segundos
      setTimeout(() => {
        setShowBalloon(false)
      }, 10000)
      
      // Abre novamente após 20 segundos
      setTimeout(() => {
        setShowBalloon(true)
      }, 20000)
      
      // Fecha após 30 segundos
      setTimeout(() => {
        setShowBalloon(false)
      }, 30000)
    }, 40000) // Repete o ciclo completo a cada 40 segundos

    return () => {
      clearTimeout(pulseTimer)
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
      clearTimeout(timer4)
      clearInterval(loopInterval)
    }
  }, [])

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
      {/* Balão de mensagem */}
      <div
        className={`
          transition-all duration-500 ease-out
          ${showBalloon 
            ? 'opacity-100 translate-x-0' 
            : 'opacity-0 translate-x-8 pointer-events-none'
          }
        `}
      >
        <div className="relative">
          {/* Seta do balão */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full">
            <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[12px] border-l-white border-b-[8px] border-b-transparent drop-shadow-lg" />
          </div>
          
          {/* Conteúdo do balão */}
          <div className="bg-white rounded-2xl shadow-2xl px-5 py-3 max-w-[220px] border border-gray-100">
            <p className="text-sm font-medium text-gray-800">
              Dúvidas? Clique aqui! 👋
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Estamos online agora
            </p>
          </div>
        </div>
      </div>

      {/* Botão WhatsApp */}
      <a
        href={`https://wa.me/${phoneNumber}?text=${message}`}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative"
        aria-label="Falar no WhatsApp"
      >
        {/* Pulso animado - para após 5 segundos */}
        {showPulse && (
          <div className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75" />
        )}
        
        {/* Botão principal */}
        <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-green-600 hover:from-green-500 hover:to-green-700 shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group-hover:scale-110">
          <Image
            src="/images/whatsapp_logo.png"
            alt="WhatsApp"
            width={40}
            height={40}
            className="drop-shadow-md"
          />
        </div>
      </a>
    </div>
  )
}
