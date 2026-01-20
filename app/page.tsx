"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { motion, useScroll, useTransform, useMotionValue, useSpring, AnimatePresence } from "framer-motion"
import useEmblaCarousel from 'embla-carousel-react'
import Autoplay from 'embla-carousel-autoplay'
import { generateCheckoutLink } from '@/lib/appmax'
import {
  Sparkles,
  Clock,
  CheckCircle2,
  Shield,
  Smartphone,
  Brain,
  Zap,
  Gift,
  Star,
  ChevronRight,
  Play,
  Users,
  TrendingUp,
  BarChart3,
  MessageSquare,
  FileCheck,
  Headphones,
  Video,
  ArrowRight,
  Check,
  Menu,
  Mic,
  Wand2,
  Lock,
  Rocket,
  Award,
  Infinity as InfinityIcon,
  Download,
  Globe,
  ChevronLeft,
  Youtube,
  Instagram,
  Megaphone,
  Share2,
  CreditCard,
  Package,
  WifiOff,
  FileText,
  Laptop,
  Tablet,
  Watch,
  Monitor,
  MessageCircle as WhatsappIcon,
  MessageCircle,
  Users2,
  ShoppingCart,
  User,
  Phone,
  FolderOpen,
  ChevronDown,
  ShieldCheck,
  HelpCircle,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"

// Componente de partículas flutuantes
const FloatingParticles = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 bg-brand-400/30 rounded-full"
          initial={{
            x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
            y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1000),
          }}
          animate={{
            x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
            y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1000),
          }}
          transition={{
            duration: Math.random() * 10 + 20,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}
    </div>
  )
}

// Componente de ícone 3D flutuante - MOBILE FRIENDLY
const FloatingIcon = ({ icon: Icon, delay = 0, duration = 3, className = "" }: any) => {
  return (
    <motion.div
      animate={{
        y: [0, -15, 0],
        rotateY: [0, 180, 360],
      }}
      transition={{
        duration,
        repeat: Infinity,
        delay,
        ease: "easeInOut",
      }}
      className={`absolute ${className}`}
    >
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-400 to-brand-300 rounded-xl blur-lg opacity-40" />
        <div className="relative bg-gradient-to-br from-brand-500 to-brand-300 p-2 sm:p-3 md:p-4 rounded-xl shadow-2xl border-2 border-white/50">
          <Icon className="w-4 h-4 sm:w-6 sm:h-6 md:w-8 md:h-8 text-white" />
        </div>
      </div>
    </motion.div>
  )
}

// Componente de card 3D com hover effect
const Card3D = ({ children, className = "" }: any) => {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  
  const rotateX = useSpring(useTransform(y, [-100, 100], [5, -5]))
  const rotateY = useSpring(useTransform(x, [-100, 100], [-5, 5]))

  return (
    <motion.div
      style={{ rotateX, rotateY, transformPerspective: 1000 }}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        x.set(e.clientX - rect.left - rect.width / 2)
        y.set(e.clientY - rect.top - rect.height / 2)
      }}
      onMouseLeave={() => {
        x.set(0)
        y.set(0)
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null)
  
  // Carousel com autoplay infinito
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { 
      loop: true, 
      align: 'start',
      dragFree: true,
    },
    [Autoplay({ delay: 3000, stopOnInteraction: false })]
  )
  
  const [selectedIndex, setSelectedIndex] = useState(0)
  const { scrollY } = useScroll()
  
  // Contagem regressiva de acessos (50 para 0 em 7 dias)
  const [remainingAccess, setRemainingAccess] = useState(50)
  
  useEffect(() => {
    // Data de início (você pode ajustar para quando começou a campanha)
    const startDate = new Date('2026-01-16T00:00:00') // Data de hoje
    const endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000) // +7 dias
    
    const updateRemainingAccess = () => {
      const now = new Date()
      const totalDuration = endDate.getTime() - startDate.getTime()
      const elapsed = now.getTime() - startDate.getTime()
      
      if (elapsed >= totalDuration) {
        setRemainingAccess(0)
        return
      }
      
      // Calcula quantos acessos restam baseado no tempo decorrido
      const remaining = Math.max(0, Math.floor(50 - (elapsed / totalDuration) * 50))
      setRemainingAccess(remaining)
    }
    
    updateRemainingAccess()
    // Atualiza a cada hora
    const interval = setInterval(updateRemainingAccess, 60 * 60 * 1000)
    
    return () => clearInterval(interval)
  }, [])
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }
    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setSelectedIndex(emblaApi.selectedScrollSnap())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    onSelect()
    emblaApi.on('select', onSelect)
    return () => {
      emblaApi.off('select', onSelect)
    }
  }, [emblaApi, onSelect])

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi])
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi])

  // Função para ir ao checkout customizado
  const handleCheckout = () => {
    // Capturar UTM params se existirem
    const urlParams = new URLSearchParams(window.location.search)
    const utmParams = new URLSearchParams()
    
    if (urlParams.get('utm_source')) utmParams.set('utm_source', urlParams.get('utm_source')!)
    if (urlParams.get('utm_medium')) utmParams.set('utm_medium', urlParams.get('utm_medium')!)
    if (urlParams.get('utm_campaign')) utmParams.set('utm_campaign', urlParams.get('utm_campaign')!)
    
    // Redirecionar para nosso checkout customizado
    const checkoutUrl = `/checkout${utmParams.toString() ? '?' + utmParams.toString() : ''}`
    window.location.href = checkoutUrl
  }

  // Função para scroll suave até a seção de preço
  const scrollToCheckout = () => {
    const checkoutSection = document.getElementById('checkout')
    if (checkoutSection) {
      checkoutSection.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  return (
    <>
      <div className="min-h-screen bg-white text-gray-900 overflow-hidden">
      
      {/* WhatsApp Floating Button */}
      <motion.a
        href="https://wa.me/5521981470758?text=Olá!%20Tenho%20interesse%20no%20Gravador%20Médico.%20Gostaria%20de%20tirar%20algumas%20dúvidas."
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 bg-[#25D366] hover:bg-[#20BA5A] text-white rounded-full p-2.5 shadow-2xl transition-all duration-300 group"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1, type: "spring" }}
      >
        <Image 
          src="/images/whatsapp_logo.png" 
          alt="WhatsApp" 
          width={48} 
          height={48}
          className="w-11 h-11 md:w-12 md:h-12"
        />
        <motion.div
          className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          1
        </motion.div>
      </motion.a>

      {/* Animated grid background */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(16,185,129,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />

      {/* HEADER FUTURISTA */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-white/90 border-b border-brand-100 shadow-sm"
      >
        <div className="container mx-auto px-4 py-3 md:py-4 flex items-center justify-between max-w-7xl">
          <motion.a 
            href="https://www.gravadormedico.com.br/"
            className="flex items-center cursor-pointer"
            whileHover={{ scale: 1.05 }}
          >
            <Image
              src="/images/LOGO GRAVADOR MEDICO - 180X50.png"
              alt="GravadorMédico"
              width={180}
              height={50}
              className="h-12 md:h-14 w-auto"
              priority
            />
          </motion.a>
          
          <nav className="hidden md:flex items-center gap-6 lg:gap-8">
            {[
              { label: "Benefícios", id: "beneficios" },
              { label: "Como Funciona", id: "como-funciona" },
              { label: "Bônus", id: "bonus" },
              { label: "Garantia", id: "garantia" }
            ].map((item) => (
              <motion.a
                key={item.id}
                href={`#${item.id}`}
                className="text-gray-700 hover:text-brand-600 font-medium transition-colors relative group text-sm lg:text-base"
                whileHover={{ scale: 1.05 }}
              >
                {item.label}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-brand-500 to-brand-500 group-hover:w-full transition-all duration-300" />
              </motion.a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-4">
            {/* Login button for existing customers */}
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <a
                href="https://gravadormedico.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-brand-600 hover:text-brand-700 font-semibold transition-colors text-sm lg:text-base group"
              >
                <User className="w-4 h-4 lg:w-5 lg:h-5 group-hover:rotate-12 transition-transform" />
                <span>Entrar</span>
              </a>
            </motion.div>
            
            {/* CTA button to checkout */}
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <a
                href="#checkout"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-brand-500 to-brand-300 text-white px-4 lg:px-6 py-2 lg:py-3 rounded-full font-bold shadow-lg shadow-brand-500/30 hover:shadow-brand-500/50 transition-all text-sm lg:text-base"
              >
                <ShoppingCart className="w-4 h-4 lg:w-5 lg:h-5" />
                Começar Agora
              </a>
            </motion.div>
          </div>

          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden"
          >
            <Menu className="w-6 h-6 text-brand-600" />
          </button>
        </div>
      </motion.header>

      {/* MOBILE MENU */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-50 md:hidden"
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            
            {/* Menu Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute right-0 top-0 bottom-0 w-80 bg-white shadow-2xl"
            >
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="absolute inset-0 bg-brand-500 rounded-xl blur opacity-50" />
                      <div className="relative bg-gradient-to-br from-brand-500 to-brand-300 p-2 rounded-xl shadow-lg">
                        <Smartphone className="w-5 h-5 text-white" />
                      </div>
                    </div>
                    <span className="text-lg font-black bg-gradient-to-r from-brand-500 to-brand-300 bg-clip-text text-transparent">
                      Gravador Médico
                    </span>
                  </div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronRight className="w-6 h-6 text-gray-600" />
                  </button>
                </div>

                {/* Menu Items */}
                <nav className="flex-1 overflow-y-auto p-6">
                  <div className="space-y-2">
                    {[
                      { label: "Benefícios", id: "beneficios" },
                      { label: "Como Funciona", id: "como-funciona" },
                      { label: "Bônus", id: "bonus" },
                      { label: "Garantia", id: "garantia" }
                    ].map((item) => (
                      <a
                        key={item.id}
                        href={`#${item.id}`}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-brand-50 hover:text-brand-600 rounded-lg font-medium transition-all"
                      >
                        {item.label}
                      </a>
                    ))}
                  </div>

                  <div className="mt-8 space-y-3">
                    {/* Login */}
                    <a
                      href="https://gravadormedico.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-center gap-2 w-full px-6 py-3 border-2 border-brand-500 text-brand-600 rounded-full font-bold hover:bg-brand-50 transition-all"
                    >
                      <User className="w-5 h-5" />
                      Entrar
                    </a>

                    {/* CTA */}
                    <a
                      href="#checkout"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-brand-500 to-brand-300 text-white px-6 py-3 rounded-full font-bold shadow-lg"
                    >
                      <ShoppingCart className="w-5 h-5" />
                      Começar Agora
                    </a>
                  </div>
                </nav>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HERO SECTION */}
      <section className="relative min-h-screen flex items-center justify-center px-4 pt-24 md:pt-32 pb-12 md:pb-20 bg-white">
        
        {/* Ícones 3D flutuantes - MOBILE FRIENDLY */}
        <div className="absolute inset-0">
          <div className="relative w-full h-full">
            {/* Mobile - 4 ícones */}
            <div className="block sm:hidden">
              <div className="absolute top-24 left-4">
                <FloatingIcon icon={Mic} delay={0} duration={4} />
              </div>
              <div className="absolute top-32 right-6">
                <FloatingIcon icon={Brain} delay={0.5} duration={3.5} />
              </div>
              <div className="absolute bottom-32 left-8">
                <FloatingIcon icon={FileCheck} delay={1} duration={4} />
              </div>
              <div className="absolute bottom-24 right-4">
                <FloatingIcon icon={Shield} delay={1.5} duration={3.5} />
              </div>
            </div>

            {/* Tablet - 6 ícones */}
            <div className="hidden sm:block lg:hidden">
              <div className="absolute top-20 left-10">
                <FloatingIcon icon={Mic} delay={0} duration={4} />
              </div>
              <div className="absolute top-32 right-16">
                <FloatingIcon icon={Brain} delay={0.5} duration={3.5} />
              </div>
              <div className="absolute bottom-40 left-16">
                <FloatingIcon icon={Smartphone} delay={1} duration={4.5} />
              </div>
              <div className="absolute bottom-28 right-12">
                <FloatingIcon icon={FileCheck} delay={1.5} duration={3} />
              </div>
              <div className="absolute top-1/3 left-6">
                <FloatingIcon icon={Zap} delay={2} duration={3.8} />
              </div>
              <div className="absolute top-1/2 right-8">
                <FloatingIcon icon={Shield} delay={2.5} duration={4.2} />
              </div>
            </div>

            {/* Desktop - todos os ícones */}
            <div className="hidden lg:block">
              <div className="absolute top-20 left-20">
                <FloatingIcon icon={Mic} delay={0} duration={4} />
              </div>
              <div className="absolute top-40 right-32">
                <FloatingIcon icon={Brain} delay={0.5} duration={3.5} />
              </div>
              <div className="absolute bottom-40 left-40">
                <FloatingIcon icon={Smartphone} delay={1} duration={4.5} />
              </div>
              <div className="absolute bottom-32 right-20">
                <FloatingIcon icon={FileCheck} delay={1.5} duration={3} />
              </div>
              <div className="absolute top-1/3 left-10">
                <FloatingIcon icon={Zap} delay={2} duration={3.8} />
              </div>
              <div className="absolute top-1/2 right-10">
                <FloatingIcon icon={Shield} delay={2.5} duration={4.2} />
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="text-center space-y-6 md:space-y-8">
            
            {/* Badge persuasivo */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-brand-50 to-brand-50 border-2 border-brand-200 px-4 md:px-6 py-2 md:py-3 rounded-full backdrop-blur-xl shadow-lg"
            >
              <Smartphone className="w-4 h-4 md:w-5 md:h-5 text-brand-600" />
              <span className="text-brand-700 font-semibold text-sm md:text-base">Somente para iOS • 1 Toque</span>
            </motion.div>

            {/* Headline principal - BIG IDEA */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-4 md:space-y-6"
            >
              <h1 className="text-[2.5rem] sm:text-5xl md:text-5xl lg:text-6xl xl:text-7xl font-black leading-[1.1] px-2">
                <span className="inline-block text-gray-900">
                  Prontuário pronto
                </span>
                <br />
                <span className="inline-block bg-gradient-to-r from-brand-600 via-brand-500 to-brand-600 bg-clip-text text-transparent animate-gradient">
                  enquanto conversa
                </span>
              </h1>
            </motion.div>

            {/* Sub-headline - PROBLEMA CENTRAL */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="space-y-3 md:space-y-4"
            >
              <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-900 max-w-3xl mx-auto font-bold px-4 leading-tight">
                O problema não é o prontuário.{" "}
                <span className="text-red-600">É a digitação.</span>
              </p>
              <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 max-w-3xl mx-auto font-light px-4 leading-relaxed">
                Transforme consultas em documentação completa sem digitar uma palavra.<br className="hidden sm:block" />{" "}
                <span className="text-brand-600 font-semibold">Conversa = Prontuário.</span>
              </p>
            </motion.div>

            {/* Mockup 3D futurista */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 }}
              className="my-8 md:my-16 relative"
            >
              <div className="relative max-w-3xl mx-auto">
                
                {/* Card principal */}
                <Card3D className="relative bg-gradient-to-br from-white via-brand-50/50 to-white rounded-2xl md:rounded-3xl p-6 md:p-12 lg:p-16 backdrop-blur-xl border-2 border-brand-200 shadow-2xl">
                  <div className="relative">
                    
                    <div className="relative flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6 lg:gap-12">
                      {/* iPhone mockup */}
                      <motion.div
                        animate={{ y: [0, -10, 0] }}
                        transition={{ duration: 3, repeat: Infinity }}
                        className="relative"
                      >
                        <div className="relative w-40 h-64 sm:w-44 sm:h-72 md:w-48 md:h-80 bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl md:rounded-3xl p-2 md:p-3 border-2 border-gray-700 shadow-2xl">
                          <div className="w-full h-full bg-gradient-to-br from-brand-50 to-white rounded-xl md:rounded-2xl flex flex-col items-center justify-center gap-3 md:gap-4 p-4 md:p-6">
                            <motion.div
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            >
                              <Mic className="w-12 h-12 md:w-16 md:h-16 text-brand-600" />
                            </motion.div>
                            <div className="flex gap-1">
                              {[...Array(5)].map((_, i) => (
                                <motion.div
                                  key={i}
                                  className="w-1.5 md:w-2 bg-brand-500 rounded-full"
                                  animate={{ 
                                    height: [16, Math.random() * 30 + 15, 16] 
                                  }}
                                  transition={{
                                    duration: 0.5,
                                    repeat: Infinity,
                                    delay: i * 0.1,
                                  }}
                                />
                              ))}
                            </div>
                            <p className="text-brand-600 text-xs md:text-sm font-semibold">Gravando...</p>
                          </div>
                        </div>
                      </motion.div>

                      {/* Arrow */}
                      <div className="relative">
                        <motion.div
                          animate={{ x: [0, 10, 0], rotate: [0, 0, 0] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          <ArrowRight className="w-10 h-10 md:w-16 md:h-16 text-brand-600" />
                        </motion.div>
                      </div>

                      {/* Document mockup */}
                      <motion.div
                        animate={{ y: [0, -10, 0] }}
                        transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
                        className="relative"
                      >
                        <div className="relative w-48 sm:w-52 md:w-56 bg-white rounded-xl md:rounded-2xl p-4 md:p-6 shadow-2xl border-2 border-brand-200">
                          <div className="space-y-2 md:space-y-3">
                            <div className="flex items-center gap-2 mb-3 md:mb-4">
                              <FileCheck className="w-6 h-6 md:w-8 md:h-8 text-brand-600" />
                              <span className="text-gray-900 font-bold text-xs md:text-sm">Prontuário Gerado</span>
                            </div>
                            {[...Array(6)].map((_, i) => (
                              <motion.div
                                key={i}
                                initial={{ width: 0 }}
                                animate={{ width: "100%" }}
                                transition={{ delay: i * 0.2 + 1, duration: 0.5 }}
                                className="h-1.5 md:h-2 bg-gradient-to-r from-brand-200 to-brand-300 rounded-full"
                                style={{ width: `${100 - i * 15}%` }}
                              />
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  </div>
                </Card3D>
              </div>
            </motion.div>

            {/* SEÇÃO 3D DO MOCKUP - INOVADORA */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="my-16 md:my-24"
            >
              <div className="relative">
                {/* Fundo animado com gradiente */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-brand-50/50 to-transparent" />

                <div className="relative container mx-auto max-w-6xl px-4">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-12 md:gap-16">
                    
                    {/* Lado esquerdo - Texto */}
                    <motion.div
                      initial={{ opacity: 0, x: -50 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8 }}
                      className="flex-1 text-center md:text-left"
                    >
                      <h2 className="text-3xl md:text-4xl lg:text-5xl font-black mb-6 leading-tight">
                        <span className="bg-gradient-to-r from-brand-500 to-brand-300 bg-clip-text text-transparent">
                          Tudo que você precisa em um só lugar
                        </span>
                      </h2>
                      
                      <p className="text-base md:text-lg text-gray-600 mb-8 leading-relaxed">
                        Método completo, profissional e pronto para usar.<br />
                        <span className="text-brand-600 font-semibold">Sem complicação.</span>
                      </p>

                      <div className="flex flex-col gap-4">
                        {[
                          { icon: CheckCircle2, text: "Instalação em 5 minutos" },
                          { icon: Smartphone, text: "Somente para iOS" },
                          { icon: Zap, text: "Funciona offline" },
                        ].map((item, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.2 }}
                            className="flex items-center gap-3"
                          >
                            <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-brand-300 rounded-full flex items-center justify-center flex-shrink-0">
                              <item.icon className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-lg md:text-xl text-gray-700 font-medium">{item.text}</span>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>

                    {/* Lado direito - Mockup 3D com animação */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="flex-1 relative"
                    >
                      <motion.div
                        animate={{
                          y: [0, -20, 0],
                        }}
                        transition={{
                          duration: 8,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                        className="relative"
                      >
                        {/* Mockup */}
                        <div className="relative z-10">
                          <Image 
                            src="/images/mockup-2-gravador-medico.jpeg"
                            alt="Método Gravador Médico"
                            width={600}
                            height={500}
                            className="w-full h-auto drop-shadow-2xl"
                            style={{ mixBlendMode: 'multiply' }}
                            priority
                          />
                        </div>
                      </motion.div>
                    </motion.div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Price Box Premium - FORMATO NOVO */}
            <motion.div
              id="checkout"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="max-w-2xl mx-auto"
            >
              <Card3D className="relative group">
                <div className="relative bg-white rounded-2xl md:rounded-3xl border-4 border-brand-500 shadow-2xl overflow-hidden">
                  
                  {/* Header verde */}
                  <div className="bg-gradient-to-br from-brand-600 to-brand-500 text-white text-center py-5 px-4">
                    <h3 className="text-2xl md:text-3xl lg:text-4xl font-black mb-2">GRAVADOR MÉDICO</h3>
                    <p className="text-base md:text-lg font-medium">Método Completo + Bônus</p>
                  </div>

                  {/* Conteúdo */}
                  <div className="p-5 md:p-7 space-y-5">
                    
                    {/* Preços */}
                    <div className="text-center space-y-2">
                      <p className="text-gray-500 text-lg line-through">De: R$ 197</p>
                      <div className="flex items-baseline justify-center gap-2">
                        <span className="text-xl md:text-2xl text-gray-700 font-semibold">Por apenas:</span>
                        <span className="text-5xl md:text-6xl font-black text-gray-900">R$ 36</span>
                      </div>
                      <p className="text-gray-600 text-base">Pagamento único ou 8x de R$ 5,40</p>
                    </div>

                    {/* Lista de benefícios */}
                    <div className="space-y-2.5">
                      {[
                        'Método completo de transcrição automática',
                        'Configuração do Atalho Mágico no iPhone',
                        'Prompt IA personalizado para prontuários',
                        '4 Bônus Exclusivos para Potencializar seu Método',
                        'Acesso vitalício com atualizações gratuitas',
                        'Garantia incondicional de 7 dias'
                      ].map((item, index) => (
                        <div key={index} className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-100 flex items-center justify-center mt-0.5">
                            <Check className="w-3.5 h-3.5 text-brand-600" />
                          </div>
                          <p className="text-gray-700 text-sm md:text-base leading-snug text-left">{item}</p>
                        </div>
                      ))}
                    </div>

                    {/* CTA Principal */}
                    <button
                      onClick={handleCheckout}
                      className="w-full"
                    >
                      <motion.div
                        animate={{ scale: [1, 1.02, 1] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        className="bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 text-white py-4 md:py-5 rounded-xl text-xl md:text-2xl font-black shadow-lg transition-all"
                      >
                        COMPRAR AGORA - R$ 36
                      </motion.div>
                    </button>

                    {/* Trust badges */}
                    <div className="flex items-center justify-center gap-4 pt-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Shield className="w-5 h-5" />
                        <span>Compra segura</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Zap className="w-5 h-5" />
                        <span>Acesso imediato</span>
                      </div>
                    </div>

                    {/* Garantia */}
                    <div className="text-center pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-center gap-2 text-brand-600">
                        <Shield className="w-5 h-5" />
                        <span className="font-bold">Garantia incondicional de 7 dias</span>
                      </div>
                    </div>

                    {/* Bônus limitado */}
                    <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">🎁</div>
                        <div className="flex-1">
                          <p className="text-orange-800 font-bold text-sm md:text-base leading-relaxed">
                            <span className="font-black">BÔNUS LIMITADO:</span> 4 Bônus Exclusivos (Ultrapersonalização + Mensagens + Avançado + Organização)<br />
                            <span className="bg-orange-200 px-2 py-0.5 rounded mt-1 inline-block">Apenas {remainingAccess} acessos restantes</span>
                          </p>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </Card3D>
            </motion.div>

          </div>
        </div>
      </section>

      {/* SEÇÃO: ESTATÍSTICAS IMPACTANTES */}
      <section className="relative py-6 md:py-8 lg:py-10 px-4 bg-white">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-4 md:mb-6"
          >
            <div className="bg-gradient-to-br from-brand-50 via-brand-100 to-brand-50 rounded-lg md:rounded-xl lg:rounded-2xl p-4 md:p-6 lg:p-7 border-2 border-brand-200 shadow-xl">
              <motion.h3
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="text-base sm:text-sm md:text-base lg:text-xl font-black text-center text-gray-900 mb-3 md:mb-5 lg:mb-6 px-2 leading-tight"
              >
                Médico, existe uma coisa que dinheiro não compra:{" "}
                <span className="text-red-600">Tempo</span>
              </motion.h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 }}
                  className="bg-white rounded-md md:rounded-lg p-3 md:p-4 border-2 border-brand-200 hover:border-brand-400 transition-colors shadow-lg"
                >
                  <div className="flex items-center justify-center mb-2 md:mb-3">
                    <div className="bg-red-100 rounded-full p-2 md:p-2.5">
                      <Clock className="w-4 h-4 md:w-5 md:h-5 text-red-600" />
                    </div>
                  </div>
                  <h4 className="text-2xl sm:text-2xl md:text-3xl font-black text-red-600 text-center mb-1">
                    10h+
                  </h4>
                  <p className="text-xs md:text-sm text-gray-700 text-center font-semibold leading-snug">
                    65% dos médicos gastam <span className="text-red-600">por semana</span> com burocracia
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 }}
                  className="bg-white rounded-md md:rounded-lg p-3 md:p-4 border-2 border-brand-200 hover:border-brand-400 transition-colors shadow-lg"
                >
                  <div className="flex items-center justify-center mb-2 md:mb-3">
                    <div className="bg-orange-100 rounded-full p-2 md:p-2.5">
                      <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-orange-600" />
                    </div>
                  </div>
                  <h4 className="text-2xl sm:text-2xl md:text-3xl font-black text-orange-600 text-center mb-1">
                    38h
                  </h4>
                  <p className="text-xs md:text-sm text-gray-700 text-center font-semibold leading-snug">
                    Economize <span className="text-orange-600">por mês</span> em registros clínicos
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.5 }}
                  className="bg-white rounded-md md:rounded-lg p-3 md:p-4 border-2 border-brand-200 hover:border-brand-400 transition-colors shadow-lg"
                >
                  <div className="flex items-center justify-center mb-2 md:mb-3">
                    <div className="bg-yellow-100 rounded-full p-2 md:p-2.5">
                      <Zap className="w-4 h-4 md:w-5 md:h-5 text-yellow-600" />
                    </div>
                  </div>
                  <h4 className="text-2xl sm:text-2xl md:text-3xl font-black text-yellow-600 text-center mb-1">
                    80%
                  </h4>
                  <p className="text-xs md:text-sm text-gray-700 text-center font-semibold leading-snug">
                    Redução do tempo <span className="text-yellow-600">gasto digitando</span>
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.6 }}
                  className="bg-white rounded-md md:rounded-lg p-3 md:p-4 border-2 border-brand-200 hover:border-brand-400 transition-colors shadow-lg"
                >
                  <div className="flex items-center justify-center mb-2 md:mb-3">
                    <div className="bg-brand-100 rounded-full p-2 md:p-2.5">
                      <Award className="w-4 h-4 md:w-5 md:h-5 text-brand-600" />
                    </div>
                  </div>
                  <h4 className="text-2xl sm:text-2xl md:text-3xl font-black text-brand-600 text-center mb-1">
                    5h
                  </h4>
                  <p className="text-xs md:text-sm text-gray-700 text-center font-semibold leading-snug">
                    Recupere <span className="text-brand-600">por dia</span> que eram roubadas
                  </p>
                </motion.div>
              </div>

              <motion.p
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.7 }}
                className="text-center text-gray-700 text-base md:text-lg lg:text-xl mt-6 md:mt-8 font-semibold px-4"
              >
                <span className="text-brand-600">Medicina do jeito que sempre foi</span> — só que sem digitar
              </motion.p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* SEÇÃO BENEFÍCIOS COM CARDS E MOCKUPS */}
      <section id="beneficios" className="relative py-12 md:py-20 lg:py-24 px-4 bg-white">
        <div className="container mx-auto max-w-7xl">
          
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-8 md:mb-16"
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black mb-4 md:mb-6 px-4 leading-tight">
              <span className="bg-gradient-to-r from-gray-900 to-brand-700 bg-clip-text text-transparent">
                O que muda na sua rotina médica
              </span>
            </h2>
            <p className="text-sm md:text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto px-4">
              Benefícios reais que você vai sentir já na primeira semana
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {[
              {
                icon: Clock,
                title: "Saia do consultório no horário",
                description: "Acabe com as horas extras digitando prontuários. Termine seu expediente e vá para casa descansar ou estar com sua família.",
                gradient: "from-brand-500 to-brand-600",
              },
              {
                icon: Brain,
                title: "Foque 100% no paciente",
                description: "Pare de dividir atenção entre o computador e o paciente. Olhe nos olhos, ouça de verdade, crie conexão genuína.",
                gradient: "from-brand-600 to-brand-500",
              },
              {
                icon: Users,
                title: "Atenda mais sem se esgotar",
                description: "Recupere 2-3 horas por dia que gastava digitando. Use esse tempo para atender mais ou simplesmente viver melhor.",
                gradient: "from-brand-500 to-brand-600",
              },
              {
                icon: FileCheck,
                title: "Prontuários completos e organizados",
                description: "Documentação técnica impecável em todos os atendimentos. Sem pressa, sem erros de digitação, sem esquecer detalhes.",
                gradient: "from-brand-600 to-brand-500",
              },
              {
                icon: Shield,
                title: "Trabalhe com tranquilidade",
                description: "Seus dados ficam no seu iPhone, sincronizados no seu iCloud. Privacidade LGPD garantida. Você no controle total.",
                gradient: "from-brand-300 to-brand-500",
              },
              {
                icon: Zap,
                title: "Configure em 5 minutos",
                description: "Não precisa ser expert em tecnologia. Método guiado passo a passo. Se você usa WhatsApp, você consegue usar.",
                gradient: "from-brand-500 to-brand-600",
              },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
              >
                <Card3D className="h-full group">
                  <div className="relative h-full bg-white backdrop-blur-xl rounded-2xl p-6 md:p-8 border-2 border-gray-100 hover:border-brand-300 transition-all duration-500 overflow-hidden shadow-lg hover:shadow-2xl flex flex-col">
                    
                    {/* Loading bar effect */}
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: "100%" }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.15 + 0.3, duration: 0.8 }}
                      className={`absolute top-0 left-0 h-1 bg-gradient-to-r ${item.gradient}`}
                    />
                    
                    {/* Glow effect */}
                    <div className={`absolute inset-0 bg-gradient-to-r ${item.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />
                    
                    {/* Card image */}
                    <div className="mb-6 relative overflow-hidden rounded-xl">
                      {index === 0 ? (
                        <Image 
                          src="/images/CARD-CONSULTORIO-HORARIO.png"
                          alt={item.title}
                          width={400}
                          height={300}
                          className="w-full h-48 object-cover"
                        />
                      ) : index === 1 ? (
                        <Image 
                          src="/images/FOQUE-PACIENTE.png"
                          alt={item.title}
                          width={400}
                          height={300}
                          className="w-full h-48 object-cover"
                        />
                      ) : index === 2 ? (
                        <Image 
                          src="/images/ATENDA-MAIS.png"
                          alt={item.title}
                          width={400}
                          height={300}
                          className="w-full h-48 object-cover"
                        />
                      ) : index === 3 ? (
                        <Image 
                          src="/images/PRONTUARIOS-COMPLETOS.png"
                          alt={item.title}
                          width={400}
                          height={300}
                          className="w-full h-48 object-cover"
                        />
                      ) : index === 4 ? (
                        <Image 
                          src="/images/TRABALHE-TRANQUILIDADE.png"
                          alt={item.title}
                          width={400}
                          height={300}
                          className="w-full h-48 object-cover"
                        />
                      ) : index === 5 ? (
                        <Image 
                          src="/images/CONFIGURE-5MINUTOS.png"
                          alt={item.title}
                          width={400}
                          height={300}
                          className="w-full h-48 object-cover"
                        />
                      ) : (
                        <div className={`w-full h-48 bg-gradient-to-br ${item.gradient} opacity-10 rounded-xl flex items-center justify-center`}>
                          <item.icon className="w-16 h-16 text-gray-400" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <p className="text-gray-400 text-sm font-medium">Mockup Image</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Floating icon */}
                    <div className="mb-4">
                      <div className={`inline-flex bg-gradient-to-br ${item.gradient} p-2.5 md:p-3 rounded-lg shadow-md`}>
                        <item.icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
                      </div>
                    </div>

                    <h3 className="text-base md:text-lg font-bold text-gray-900 mb-3 group-hover:text-brand-600 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-base md:text-lg text-gray-600 leading-relaxed flex-1">
                      {item.description}
                    </p>

                    {/* Decorative corner */}
                    <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-brand-100/50 to-transparent rounded-bl-3xl" />
                  </div>
                </Card3D>
              </motion.div>
            ))}
          </div>

          {/* CTA após benefícios */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
            className="text-center mt-16"
          >
            <motion.button
              onClick={scrollToCheckout}
              animate={{ 
                scale: [1, 1.03, 1]
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="group relative inline-flex items-center gap-3 bg-gradient-to-r from-[#5DBEA3] via-[#80D4C3] to-[#5DBEA3] bg-[length:200%_100%] animate-gradient text-white px-10 sm:px-14 py-5 sm:py-6 rounded-full text-xl sm:text-2xl font-black shadow-2xl hover:shadow-[#5DBEA3]/50 transition-all whitespace-nowrap"
            >
              <Mic className="w-6 h-6 flex-shrink-0" />
              <span>Quero Esses Benefícios</span>
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform flex-shrink-0" />
            </motion.button>
            <p className="text-base text-gray-600 mt-4 font-semibold">Apenas R$ 36 • Acesso imediato</p>
          </motion.div>

        </div>
      </section>

      {/* SEÇÃO: PARA QUEM É ESTE MÉTODO */}
      <section className="relative py-12 md:py-20 lg:py-24 px-4 bg-brand-500">
        <div className="container mx-auto max-w-7xl relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-8 md:mb-16"
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="inline-block mb-6"
            >
              <div className="bg-white/20 backdrop-blur-sm px-6 py-3 rounded-full border-2 border-white/40">
                <p className="text-white font-black text-xl">Perfil Ideal</p>
              </div>
            </motion.div>

            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white mb-6 px-4 leading-tight">
              Este método é para você se...
            </h2>
            <p className="text-lg md:text-xl text-white/90 max-w-3xl mx-auto px-4 leading-relaxed">
              Reconheça-se neste perfil e descubra por que centenas de médicos<br />
              já transformaram sua rotina
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              whileHover={{ scale: 1.03, y: -5 }}
              className="bg-white rounded-2xl p-8 shadow-2xl border-2 border-white/20"
            >
              <div className="flex items-center justify-center mb-6">
                <div className="bg-gradient-to-br from-brand-500 to-brand-300 rounded-full p-4">
                  <Smartphone className="w-10 h-10 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-4 text-center">
                <span className="text-brand-600">▸</span> Você usa iPhone
              </h3>
              <p className="text-gray-700 text-center leading-relaxed">
                Quem sempre está com o médico? <span className="font-bold text-brand-600">O iPhone.</span> Se você já tem um, tem 80% da solução na mão.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              whileHover={{ scale: 1.03, y: -5 }}
              className="bg-white rounded-2xl p-8 shadow-2xl border-2 border-white/20"
            >
              <div className="flex items-center justify-center mb-6">
                <div className="bg-gradient-to-br from-brand-500 to-brand-300 rounded-full p-4">
                  <Users className="w-10 h-10 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-4 text-center">
                <span className="text-brand-600">▸</span> Agenda sempre cheia
              </h3>
              <p className="text-gray-700 text-center leading-relaxed">
                Você tem pacientes, tem demanda, mas o tempo escorre entre consultas e <span className="font-bold text-red-600">horas digitando</span>.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              whileHover={{ scale: 1.03, y: -5 }}
              className="bg-white rounded-2xl p-8 shadow-2xl border-2 border-white/20"
            >
              <div className="flex items-center justify-center mb-6">
                <div className="bg-gradient-to-br from-brand-500 to-brand-300 rounded-full p-4">
                  <Brain className="w-10 h-10 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-4 text-center">
                <span className="text-brand-600">▸</span> Odeia digitar
              </h3>
              <p className="text-gray-700 text-center leading-relaxed">
                Você estudou para <span className="font-bold text-brand-600">cuidar de pessoas</span>, não para ser digitador profissional de prontuário.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              whileHover={{ scale: 1.03, y: -5 }}
              className="bg-white rounded-2xl p-8 shadow-2xl border-2 border-white/20"
            >
              <div className="flex items-center justify-center mb-6">
                <div className="bg-gradient-to-br from-brand-500 to-brand-300 rounded-full p-4">
                  <Shield className="w-10 h-10 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-4 text-center">
                <span className="text-brand-600">▸</span> Tentou outros métodos
              </h3>
              <p className="text-gray-700 text-center leading-relaxed">
                Já testou softwares complexos que prometiam tudo e <span className="font-bold text-red-600">entregaram frustração</span>. Este é diferente.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
              whileHover={{ scale: 1.03, y: -5 }}
              className="bg-white rounded-2xl p-8 shadow-2xl border-2 border-white/20"
            >
              <div className="flex items-center justify-center mb-6">
                <div className="bg-gradient-to-br from-brand-500 to-brand-300 rounded-full p-4">
                  <Clock className="w-10 h-10 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-4 text-center">
                <span className="text-brand-600">▸</span> Quer mais tempo livre
              </h3>
              <p className="text-gray-700 text-center leading-relaxed">
                Sair no horário, ter fim de semana de verdade, e <span className="font-bold text-brand-600">não levar trabalho pra casa</span>.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6 }}
              whileHover={{ scale: 1.03, y: -5 }}
              className="bg-white rounded-2xl p-8 shadow-2xl border-2 border-white/20"
            >
              <div className="flex items-center justify-center mb-6">
                <div className="bg-gradient-to-br from-brand-500 to-brand-300 rounded-full p-4">
                  <Users2 className="w-10 h-10 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-4 text-center">
                <span className="text-brand-600">▸</span> Quer atender melhor
              </h3>
              <p className="text-gray-700 text-center leading-relaxed">
                Manter contato visual, <span className="font-bold text-brand-600">escuta ativa</span>, e criar vínculo genuíno com cada paciente.
              </p>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="mt-12 md:mt-16 text-center"
          >
            <div className="bg-white rounded-2xl p-6 md:p-10 border-2 border-brand-200 shadow-2xl max-w-3xl mx-auto">
              <p className="text-2xl md:text-3xl lg:text-4xl font-black text-gray-900 leading-relaxed">
                Se você se identificou com <span className="text-[#5DBEA3] font-black">pelo menos 3 desses pontos</span>,
                este método foi feito especialmente para você!
              </p>
            </div>
          </motion.div>

          {/* CTA após identificação */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="text-center mt-10 md:mt-12"
          >
            <motion.button
              onClick={scrollToCheckout}
              animate={{ 
                scale: [1, 1.03, 1]
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="group relative inline-flex items-center gap-3 bg-gradient-to-r from-[#5DBEA3] via-[#80D4C3] to-[#5DBEA3] bg-[length:200%_100%] animate-gradient text-white px-10 sm:px-14 py-5 sm:py-6 rounded-full text-xl sm:text-2xl font-black shadow-2xl hover:shadow-[#5DBEA3]/50 transition-all whitespace-nowrap"
            >
              <Mic className="w-6 h-6 flex-shrink-0" />
              <span>Quero Todos Esses Recursos</span>
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform flex-shrink-0" />
            </motion.button>
            <p className="text-base text-white mt-4 font-semibold">Apenas R$ 36 • Acesso imediato</p>
          </motion.div>
        </div>
      </section>

      {/* SEÇÃO FEATURES PREMIUM EM PORTUGUÊS */}
      <section id="como-funciona" className="relative py-12 md:py-20 lg:py-24 px-4 bg-brand-500">
        <div className="container mx-auto max-w-7xl">
          
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10 md:mb-16"
          >
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ duration: 4, repeat: Infinity }}
              className="inline-block mb-6"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-white rounded-2xl blur-2xl opacity-40" />
                <div className="relative bg-white px-6 py-3 rounded-2xl">
                  <h3 className="text-brand-600 font-black text-xl">Recursos</h3>
                </div>
              </div>
            </motion.div>
            
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black mb-6 px-4 leading-tight">
              <span className="text-white">
                Como o método funciona
              </span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
            {[
              {
                icon: Zap,
                title: "Transcrição ultrarrápida",
                description: "Transcreva 1 hora de áudio ou vídeo em apenas 30 segundos com precisão médica.",
                gradient: "from-brand-600 to-brand-500",
                customContent: "zap-mic",
              },
              {
                icon: Users,
                title: "Separação de vozes",
                description: "Cada participante é automaticamente identificado e rotulado, ideal para consultas e reuniões.",
                gradient: "from-brand-500 to-brand-600",
                customContent: "users-voices",
              },
              {
                icon: MessageCircle,
                title: "Converse com suas notas",
                description: "Transforme suas notas em assistente inteligente. Faça perguntas e obtenha insights instantâneos.",
                gradient: "from-brand-300 to-brand-500",
                customContent: "chat-bubbles",
              },
              {
                icon: Globe,
                title: "Upload de qualquer arquivo",
                description: "Arquivos, vídeos, podcasts, conteúdo do YouTube, Voice Memos, gravações do Zoom, posts do Instagram.",
                gradient: "from-brand-500 to-brand-600",
                customContent: "social-image",
              },
              {
                icon: FileText,
                title: "Compartilhe e exporte",
                description: "PDF polido para apresentações ou DOC editável para continuar trabalhando. Você escolhe.",
                gradient: "from-brand-600 to-brand-500",
                customContent: "document-3d",
              },
              {
                icon: Lock,
                title: "100% Privado",
                description: "Sincronização no seu iCloud, nada é armazenado em nossos servidores. Seus dados são seus.",
                gradient: "from-gray-600 to-gray-800",
                customContent: "lock-3d",
              },
              {
                icon: WifiOff,
                title: "Gravação offline",
                description: "Funciona sem internet. Nunca perca um momento importante, mesmo sem sinal.",
                gradient: "from-brand-400 to-brand-600",
                customContent: "wifi-off",
              },
              {
                icon: Smartphone,
                title: "Grave usando iPhone ou Mac",
                description: "Use o dispositivo que você já tem. iPhone, iPad ou Mac. Método nativo Apple, seguro e confiável.",
                gradient: "from-brand-500 to-brand-600",
                customContent: "apple-devices",
              },
              {
                icon: MessageCircle,
                title: "Personalize para sua especialidade",
                description: "Configure o formato do prontuário exatamente como você precisa. Anamnese, evolução, prescrição do seu jeito.",
                gradient: "from-brand-600 to-brand-500",
                customContent: "personalize-specialty",
              },
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 60, rotateX: -15 }}
                whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08, duration: 0.6 }}
                whileHover={{ 
                  y: -10,
                  rotateY: 5,
                  transition: { duration: 0.3 }
                }}
                style={{ transformStyle: "preserve-3d" }}
                className="group"
              >
                <div className="relative h-full bg-white rounded-3xl p-6 md:p-8 pt-10 md:pt-12 border border-gray-200 hover:border-gray-300 transition-all shadow-lg hover:shadow-2xl overflow-visible flex flex-col">
                  
                  {/* Animated gradient glow on hover */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500 rounded-3xl`} />
                  
                  {/* Top accent bar */}
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: "100%" }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.08 + 0.3, duration: 0.8 }}
                    className={`absolute top-0 left-0 h-1 bg-gradient-to-r ${feature.gradient}`}
                  />

                  {/* Mockup area with custom content */}
                  <div className="relative mb-6 aspect-[4/3] bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl overflow-hidden flex items-center justify-center group-hover:scale-[1.02] transition-transform duration-500">
                    <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-10`} />
                    
                    {/* Custom content based on feature */}
                    {feature.customContent === "clock-timer" ? (
                      <div className="relative flex items-center justify-center gap-3">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                          className="relative"
                        >
                          <div className="absolute inset-0 bg-brand-500 rounded-full blur-xl opacity-40" />
                          <Clock className="w-20 h-20 text-brand-600 relative z-10" />
                        </motion.div>
                        <div className="flex flex-col gap-1">
                          <motion.div
                            animate={{ width: ["0%", "100%"] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="h-2 bg-gradient-to-r from-brand-500 to-brand-600 rounded-full"
                            style={{ width: "60px" }}
                          />
                          <motion.div
                            animate={{ width: ["0%", "100%"] }}
                            transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
                            className="h-2 bg-gradient-to-r from-brand-500 to-brand-600 rounded-full"
                            style={{ width: "80px" }}
                          />
                          <motion.div
                            animate={{ width: ["0%", "100%"] }}
                            transition={{ duration: 2, repeat: Infinity, delay: 0.6 }}
                            className="h-2 bg-gradient-to-r from-brand-500 to-brand-600 rounded-full"
                            style={{ width: "100px" }}
                          />
                        </div>
                      </div>
                    ) : feature.customContent === "users-voices" ? (
                      <div className="relative flex items-center justify-center gap-2">
                        {[
                          { name: "Dr.", color: "from-blue-500 to-blue-600", delay: 0 },
                          { name: "Pac.", color: "from-brand-400 to-brand-600", delay: 0.2 },
                          { name: "Enf.", color: "from-purple-500 to-purple-600", delay: 0.4 },
                        ].map((user, i) => (
                          <motion.div
                            key={i}
                            animate={{ 
                              y: [0, -10, 0],
                              scale: [1, 1.1, 1]
                            }}
                            transition={{ duration: 2, repeat: Infinity, delay: user.delay }}
                            className="relative flex flex-col items-center"
                          >
                            <div className={`absolute inset-0 bg-gradient-to-br ${user.color} rounded-full blur-lg opacity-40`} />
                            <div className={`relative bg-gradient-to-br ${user.color} p-3 rounded-full shadow-xl mb-1`}>
                              <Users className="w-6 h-6 text-white" />
                            </div>
                            <span className="text-xs font-bold text-gray-600">{user.name}</span>
                          </motion.div>
                        ))}
                      </div>
                    ) : feature.customContent === "wand-options" ? (
                      <div className="relative grid grid-cols-3 gap-2 p-4">
                        {[
                          { icon: "📝", label: "Resumir" },
                          { icon: "✨", label: "Melhorar" },
                          { icon: "🎯", label: "Clareza" },
                          { icon: "📊", label: "Técnico" },
                          { icon: "💼", label: "Formal" },
                          { icon: "🔍", label: "Detalhes" },
                        ].map((option, i) => (
                          <motion.div
                            key={i}
                            initial={{ scale: 0, rotate: -180 }}
                            whileInView={{ scale: 1, rotate: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.08 }}
                            whileHover={{ scale: 1.15, rotate: 5 }}
                            className="relative bg-white rounded-lg p-2 shadow-md hover:shadow-xl transition-all cursor-pointer border border-brand-200"
                          >
                            <div className="text-2xl mb-1">{option.icon}</div>
                            <p className="text-[10px] font-semibold text-gray-700">{option.label}</p>
                          </motion.div>
                        ))}
                      </div>
                    ) : feature.customContent === "personalize-specialty" ? (
                      <div className="relative grid grid-cols-2 gap-3 p-4">
                        {[
                          { title: "Anamnese", icon: "📋", color: "from-blue-400 to-blue-600" },
                          { title: "Evolução", icon: "📈", color: "from-brand-400 to-brand-600" },
                          { title: "Prescrição", icon: "💊", color: "from-purple-400 to-purple-600" },
                          { title: "Atestado", icon: "📄", color: "from-orange-400 to-orange-600" },
                        ].map((item, i) => (
                          <motion.div
                            key={i}
                            initial={{ scale: 0, rotate: -90 }}
                            whileInView={{ scale: 1, rotate: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            whileHover={{ scale: 1.1, y: -5 }}
                            className={`relative bg-gradient-to-br ${item.color} rounded-xl p-4 shadow-lg cursor-pointer`}
                          >
                            <div className="text-3xl mb-2">{item.icon}</div>
                            <p className="text-white font-bold text-sm">{item.title}</p>
                          </motion.div>
                        ))}
                      </div>
                    ) : feature.customContent === "social-image" ? (
                      <div className="relative w-full h-full">
                        <div className="absolute inset-0 bg-gradient-to-br from-brand-500/10 to-brand-500/10 rounded-xl" />
                        <Image 
                          src="/images/redes-gravadormedico.webp" 
                          alt="Redes Sociais"
                          fill
                          className="object-contain p-4 rounded-xl"
                        />
                      </div>
                    ) : feature.customContent === "wifi-off" ? (
                      <WifiOff className="w-24 h-24 text-brand-500 relative z-10" />
                    ) : feature.customContent === "document-3d" ? (
                      <div className="flex gap-3">
                        <motion.div
                          animate={{ y: [0, -10, 0] }}
                          transition={{ duration: 2, repeat: Infinity, delay: 0 }}
                          className="relative"
                        >
                          <div className="absolute inset-0 bg-orange-500 rounded-lg blur-lg opacity-40" />
                          <div className="relative bg-white p-4 rounded-lg shadow-2xl border-2 border-orange-200">
                            <FileText className="w-12 h-12 text-orange-500" />
                          </div>
                        </motion.div>
                        <motion.div
                          animate={{ y: [0, -10, 0] }}
                          transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
                          className="relative"
                        >
                          <div className="absolute inset-0 bg-red-500 rounded-lg blur-lg opacity-40" />
                          <div className="relative bg-white p-4 rounded-lg shadow-2xl border-2 border-red-200">
                            <FileText className="w-12 h-12 text-red-500" />
                          </div>
                        </motion.div>
                      </div>
                    ) : feature.customContent === "lock-3d" ? (
                      <motion.div
                        animate={{ 
                          rotateY: [0, 360],
                          scale: [1, 1.1, 1]
                        }}
                        transition={{ duration: 4, repeat: Infinity }}
                        className="relative"
                      >
                        <div className="absolute inset-0 bg-gray-700 rounded-2xl blur-2xl opacity-40" />
                        <div className="relative bg-gradient-to-br from-gray-700 to-gray-900 p-8 rounded-2xl shadow-2xl">
                          <Lock className="w-16 h-16 text-white" />
                        </div>
                      </motion.div>
                    ) : feature.customContent === "apple-devices" ? (
                      <div className="flex items-center justify-center gap-2 flex-wrap px-4">
                        {[
                          { Icon: Smartphone, color: "text-brand-500", bg: "from-brand-100 to-brand-200" },
                          { Icon: Tablet, color: "text-brand-600", bg: "from-brand-100 to-brand-200" },
                          { Icon: Laptop, color: "text-brand-500", bg: "from-brand-100 to-brand-200" },
                          { Icon: Watch, color: "text-brand-600", bg: "from-brand-100 to-brand-200" },
                        ].map(({ Icon, color, bg }, i) => (
                          <motion.div
                            key={i}
                            animate={{ y: [0, -8, 0] }}
                            transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                            className="relative"
                          >
                            <div className={`absolute inset-0 bg-gradient-to-br ${bg} rounded-xl blur-md opacity-60`} />
                            <div className={`relative bg-gradient-to-br ${bg} p-3 rounded-xl shadow-xl`}>
                              <Icon className={`w-8 h-8 ${color}`} />
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    ) : feature.customContent === "flags" ? (
                      <div className="grid grid-cols-4 gap-2 p-4">
                        {["🇧🇷", "🇺🇸", "🇬🇧", "🇪🇸", "🇫🇷", "🇩🇪", "🇮🇹", "🇯🇵", "🇨🇳", "🇰🇷", "🇷🇺", "🇮🇳"].map((flag, i) => (
                          <motion.div
                            key={i}
                            initial={{ scale: 0, rotate: -180 }}
                            whileInView={{ scale: 1, rotate: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.05 }}
                            whileHover={{ scale: 1.3 }}
                            className="text-3xl cursor-pointer"
                          >
                            {flag}
                          </motion.div>
                        ))}
                      </div>
                    ) : feature.customContent === "zap-mic" ? (
                      <div className="relative flex items-center gap-4">
                        <motion.div
                          animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="relative"
                        >
                          <div className="absolute inset-0 bg-yellow-500 rounded-full blur-xl opacity-50" />
                          <Zap className="w-16 h-16 text-yellow-500 fill-yellow-500 relative z-10" />
                        </motion.div>
                        <motion.div
                          animate={{ y: [0, -5, 0] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                          className="relative"
                        >
                          <div className="absolute inset-0 bg-brand-500 rounded-xl blur-lg opacity-40" />
                          <div className="relative bg-gradient-to-br from-brand-500 to-brand-600 p-4 rounded-xl shadow-xl">
                            <Mic className="w-12 h-12 text-white" />
                          </div>
                        </motion.div>
                      </div>
                    ) : feature.customContent === "chat-bubbles" ? (
                      <div className="relative w-full h-full flex items-center justify-center p-4">
                        <motion.div
                          animate={{ y: [0, -8, 0] }}
                          transition={{ duration: 2, repeat: Infinity, delay: 0 }}
                          className="absolute left-6 top-8"
                        >
                          <div className="relative bg-brand-500 text-white p-3 rounded-2xl rounded-tl-none shadow-xl max-w-[120px]">
                            <p className="text-xs font-semibold">Como foi a consulta?</p>
                            <MessageCircle className="absolute -bottom-1 -right-1 w-4 h-4 text-brand-600" />
                          </div>
                        </motion.div>
                        <motion.div
                          animate={{ y: [0, -8, 0] }}
                          transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
                          className="absolute right-6 bottom-8"
                        >
                          <div className="relative bg-blue-500 text-white p-3 rounded-2xl rounded-tr-none shadow-xl max-w-[120px]">
                            <p className="text-xs font-semibold">Paciente melhorou muito!</p>
                            <MessageCircle className="absolute -bottom-1 -left-1 w-4 h-4 text-blue-600" />
                          </div>
                        </motion.div>
                      </div>
                    ) : (
                      <>
                        <feature.icon className="w-20 h-20 text-gray-300 relative z-10" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <p className="text-gray-400 text-sm font-medium">Mockup Preview</p>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Floating icon badge - ajustado para não cortar */}
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className="absolute -top-3 -right-3 z-20"
                  >
                    <div className="relative">
                      <div className={`absolute inset-0 bg-gradient-to-r ${feature.gradient} rounded-xl blur-lg opacity-50`} />
                      <div className={`relative bg-gradient-to-br ${feature.gradient} p-2.5 rounded-xl shadow-xl`}>
                        <feature.icon className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  </motion.div>

                  {/* Content */}
                  <div className="relative z-10 flex-1 flex flex-col">
                    <h3 className="text-base md:text-lg font-bold text-gray-900 mb-3 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:bg-clip-text group-hover:from-gray-900 group-hover:to-blue-600 transition-all">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 text-base leading-relaxed flex-1">
                      {feature.description}
                    </p>
                  </div>

                  {/* Bottom shine effect */}
                  <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </motion.div>
            ))}
          </div>

          {/* CTA após seção de recursos */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
            className="text-center mt-16"
          >
            <motion.button
              onClick={scrollToCheckout}
              animate={{ 
                scale: [1, 1.03, 1]
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="group relative inline-flex items-center gap-3 bg-gradient-to-r from-[#5DBEA3] via-[#80D4C3] to-[#5DBEA3] bg-[length:200%_100%] animate-gradient text-white px-10 sm:px-14 py-5 sm:py-6 rounded-full text-xl sm:text-2xl font-black shadow-2xl hover:shadow-[#5DBEA3]/50 transition-all whitespace-nowrap"
            >
              <Mic className="w-6 h-6 flex-shrink-0" />
              <span>Quero Todos Esses Recursos</span>
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform flex-shrink-0" />
            </motion.button>
            <p className="text-base text-white mt-4 font-semibold">Apenas R$ 36 • Acesso imediato</p>
          </motion.div>

        </div>
      </section>

      {/* SEÇÃO: ESPECIALIDADES MÉDICAS PRIORITÁRIAS */}
      <section className="relative py-12 md:py-20 lg:py-24 px-4 bg-white">
        <div className="container mx-auto max-w-7xl">
          
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-8 md:mb-16"
          >
            <motion.div
              animate={{ 
                scale: [1, 1.05, 1],
                rotate: [0, 2, -2, 0]
              }}
              transition={{ duration: 4, repeat: Infinity }}
              className="inline-block mb-6"
            >
              <div className="bg-gradient-to-r from-brand-500 to-brand-300 px-6 py-3 rounded-full shadow-xl">
                <p className="text-white font-black text-lg">Especialidades</p>
              </div>
            </motion.div>

            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black mb-6 px-4 leading-tight">
              <span className="bg-gradient-to-r from-brand-600 via-brand-500 to-brand-600 bg-clip-text text-transparent">
                Funciona para sua especialidade
              </span>
            </h2>
            <p className="text-lg md:text-xl lg:text-2xl text-gray-700 max-w-3xl mx-auto px-4 leading-relaxed">
              Prontuários personalizados para cada área médica<br />
              com casos de uso específicos
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {[
              {
                specialty: "Ginecologia",
                color: "from-[#5DBEA3] to-[#80D4C3]",
                useCase: "Anamnese + Procedimentos",
                description: "Histórico menstrual, antecedentes obstétricos, exame especular, colposcopia. Documente preventivos, USG e procedimentos ginecológicos.",
                features: ["Anamnese completa", "Exames ginecológicos", "Controle pré-natal"]
              },
              {
                specialty: "Ortopedia",
                color: "from-[#5DBEA3] to-[#80D4C3]",
                useCase: "Exame Físico + Laudos",
                description: "Inspeção, palpação, mobilidade articular, testes especiais. Registre fraturas, luxações, lesões esportivas. Documente com precisão cada detalhe.",
                features: ["Exame físico detalhado", "Testes ortopédicos", "Evolução pós-operatória"]
              },
              {
                specialty: "Clínica Geral",
                color: "from-[#5DBEA3] to-[#80D4C3]",
                useCase: "Atendimento Completo",
                description: "Da queixa principal ao plano terapêutico. Anamnese, exame físico, hipóteses diagnósticas, prescrição. Tudo documentado automaticamente.",
                features: ["Consulta integral", "Múltiplas queixas", "Follow-up contínuo"]
              },
              {
                specialty: "Pediatria",
                color: "from-[#5DBEA3] to-[#80D4C3]",
                useCase: "Histórico + Evolução",
                description: "Desenvolvimento neuropsicomotor, crescimento, vacinação, alimentação. Acompanhe cada fase do desenvolvimento infantil.",
                features: ["Puericultura", "Marcos desenvolvimento", "Orientação familiar"]
              },
              {
                specialty: "Dermatologia",
                color: "from-[#5DBEA3] to-[#80D4C3]",
                useCase: "Lesões + Procedimentos",
                description: "Descrição precisa de lesões, dermatoscopia, biopsias. Registre características, localização e evolução de lesões cutâneas. Acompanhamento detalhado e completo.",
                features: ["Descrição lesões", "Procedimentos estéticos", "Seguimento oncológico"]
              },
              {
                specialty: "Psiquiatria",
                color: "from-[#5DBEA3] to-[#80D4C3]",
                useCase: "Avaliação Mental",
                description: "Exame do estado mental, humor, pensamento, comportamento. Documente sessões terapêuticas, ajustes medicamentosos e evolução do tratamento.",
                features: ["Psicopatologia", "Evolução terapêutica", "Risco suicídio"]
              },
              {
                specialty: "Endocrinologia",
                color: "from-[#5DBEA3] to-[#80D4C3]",
                useCase: "Metabólico + Hormonal",
                description: "Diabetes, tireoide, obesidade, distúrbios hormonais. Acompanhamento metabólico e ajuste de doses com registro completo. Controle detalhado da evolução.",
                features: ["Controle glicêmico", "Função tireoidiana", "Manejo obesidade"]
              },
              {
                specialty: "Cardiologia",
                color: "from-[#5DBEA3] to-[#80D4C3]",
                useCase: "Risco Cardiovascular",
                description: "Hipertensão, insuficiência cardíaca, arritmias. Registre sintomas, exame cardiovascular, estratificação de risco. Acompanhamento completo e detalhado.",
                features: ["Avaliação cardíaca", "Fatores risco", "Monitoramento HAS"]
              },
              {
                specialty: "Outras Especialidades",
                color: "from-[#5DBEA3] to-[#80D4C3]",
                useCase: "100% Personalizável",
                description: "Neurologia, Oftalmologia, Urologia, Gastroenterologia e mais. Configure o prontuário exatamente como sua especialidade precisa. Totalmente adaptável ao seu formato.",
                features: ["Totalmente adaptável", "Qualquer área", "Seu formato"]
              },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -8, scale: 1.02 }}
                className="group h-full"
              >
                <Card3D className="h-full">
                  <div className="relative bg-white rounded-2xl p-6 md:p-8 border-2 border-gray-200 hover:border-brand-400 transition-all duration-300 shadow-lg hover:shadow-2xl h-full flex flex-col min-h-[420px]">

                    {/* Nome da especialidade */}
                    <h3 className="text-2xl md:text-3xl font-black text-gray-900 mb-4 text-center">
                      {item.specialty}
                    </h3>

                    {/* Descrição */}
                    <p className="text-gray-700 leading-relaxed mb-4 text-center min-h-[96px] flex-shrink-0">
                      {item.description}
                    </p>

                    {/* Badge de caso de uso */}
                    <div className="mb-4 flex-shrink-0">
                      <div className={`bg-gradient-to-r ${item.color} px-4 py-2.5 rounded-full text-center`}>
                        <p className="text-white text-sm font-bold">{item.useCase}</p>
                      </div>
                    </div>

                    {/* Features específicas */}
                    <div className="space-y-2 pt-4 border-t border-gray-200 flex-shrink-0">
                      {item.features.map((feature, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${item.color}`} />
                          <span className="text-sm text-gray-600 font-medium">{feature}</span>
                        </div>
                      ))}
                    </div>

                    {/* Hover effect gradient */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-0 group-hover:opacity-5 transition-opacity rounded-2xl pointer-events-none`} />
                  </div>
                </Card3D>
              </motion.div>
            ))}
          </div>

          {/* CTA no final */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-16 text-center"
          >
            <div className="bg-white rounded-2xl p-6 md:p-10 border-2 border-brand-200 shadow-xl max-w-3xl mx-auto">
              <h3 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">
                Não encontrou sua especialidade?
              </h3>
              <p className="text-xl text-gray-700 mb-8">
                O Gravador Médico é <span className="text-brand-600 font-bold">100% personalizável</span>. 
                Configure o formato do prontuário exatamente como você precisa!
              </p>
              <motion.button
                animate={{ 
                  scale: [1, 1.03, 1]
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                onClick={scrollToCheckout}
                className="inline-flex items-center gap-3 bg-gradient-to-r from-[#5DBEA3] via-[#80D4C3] to-[#5DBEA3] bg-[length:200%_100%] animate-gradient text-white px-10 md:px-14 py-5 md:py-6 rounded-full text-xl md:text-2xl font-black shadow-2xl hover:shadow-[#5DBEA3]/50 transition-all"
              >
                <Wand2 className="w-6 h-6" />
                Personalizar para minha especialidade
                <ArrowRight className="w-6 h-6" />
              </motion.button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* BÔNUS COM MOCKUPS */}
      <section id="bonus" className="relative py-12 md:py-20 lg:py-24 px-4 bg-white">
        <div className="container mx-auto max-w-7xl">
          
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-8 md:mb-16"
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black mb-4 md:mb-6 px-4 leading-tight">
              <span className="bg-gradient-to-r from-brand-500 to-brand-300 bg-clip-text text-transparent">
                Bônus Exclusivos
              </span>
            </h2>
            <p className="text-base md:text-xl lg:text-2xl text-gray-700 px-4 max-w-4xl mx-auto leading-relaxed">
              Além do Método Gravador Médico, você recebe acesso imediato a ferramentas que ampliam, personalizam e escalam o seu uso no dia a dia clínico.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-4 md:gap-6 max-w-6xl mx-auto">
            {[
              {
                icon: Award,
                number: 1,
                title: "Ultrapersonalização",
                subtitle: "Prontuário do Seu Jeito",
                description: "Transforme o prontuário em uma extensão da sua identidade profissional. Configure seu nome, CRM, endereço, especialidade, estrutura preferida e observações padrão que aparecem automaticamente em cada prontuário gerado.",
                benefits: [
                  "Personalizador de prompt para prontuários",
                  "Estrutura ajustável por especialidade",
                  "Padronização profissional automática",
                  "Consistência em todas as consultas"
                ],
                value: "R$ 297",
                mockup: "personalization",
              },
              {
                icon: MessageSquare,
                number: 2,
                title: "Mensagens Inteligentes",
                subtitle: "Gerador de Mensagens para Acompanhamento",
                description: "Da consulta direto para mensagens prontas, humanas e estratégicas. Transforme a transcrição da consulta em textos prontos para comunicação com pacientes e equipe — sem você precisar pensar no que escrever.",
                benefits: [
                  "Agradecimento pós-consulta",
                  "Pedido de avaliação no Google",
                  "Agendamento de retorno",
                  "Orientações resumidas ao paciente",
                  "Comunicação interna com equipe"
                ],
                value: "R$ 197",
                mockup: "messages",
              },
              {
                icon: Video,
                number: 3,
                title: "Uso Avançado",
                subtitle: "Modo Expandido do Gravador Médico",
                description: "O método começa na consulta, mas não termina nela. Aprenda a explorar todo o potencial do Gravador Médico para transcrever consultas online, organizar aulas, registrar ideias clínicas, criar resumos profissionais e apoiar produção de conteúdo.",
                benefits: [
                  "Transcrever Google Meet e Zoom",
                  "Organizar aulas e congressos",
                  "Registrar ideias clínicas por voz",
                  "Resumos de conteúdos longos",
                  "Produção de conteúdo educativo"
                ],
                value: "R$ 147",
                mockup: "advanced",
              },
              {
                icon: FolderOpen,
                number: 4,
                title: "Organização Definitiva",
                subtitle: "Organização Automática & Backup Profissional",
                description: "Seu histórico clínico organizado para o resto da carreira. Aprenda como exportar, organizar e armazenar suas transcrições e prontuários de forma profissional, segura e fácil de consultar.",
                benefits: [
                  "Organizar prontuários por data",
                  "Criar histórico clínico estruturado",
                  "Salvar documentos no Google Drive",
                  "Manter backup seguro e acessível",
                  "Evitar perda de informações"
                ],
                value: "R$ 127",
                mockup: "drive",
              },
            ].map((bonus, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
              >
                <Card3D className="h-full group">
                  <div className="relative h-full bg-white backdrop-blur-xl rounded-2xl p-6 md:p-8 border-2 border-brand-200 hover:border-brand-400 transition-all overflow-hidden shadow-lg hover:shadow-2xl">
                    
                    {/* Glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-brand-500 to-brand-300 opacity-0 group-hover:opacity-5 transition-opacity" />

                    {/* Bonus badge */}
                    <div className="absolute top-4 right-4 bg-gradient-to-r from-brand-600 to-brand-400 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg z-10">
                      Bônus {index + 1}
                    </div>

                    {/* Mockup visual */}
                    <div className="mb-6">
                      <div className="w-full h-48 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl flex items-center justify-center overflow-hidden relative p-4">
                        {bonus.mockup === "personalization" ? (
                          <div className="w-full space-y-2">
                            {[
                              { label: "Nome", icon: "👨‍⚕️", value: "Dr(a). João Silva" },
                              { label: "CRM", icon: "🏥", value: "12345-SP" },
                              { label: "Endereço", icon: "📍", value: "Rua das Flores, 123" },
                            ].map((field, i) => (
                              <motion.div
                                key={i}
                                initial={{ x: -50, opacity: 0 }}
                                whileInView={{ x: 0, opacity: 1 }}
                                transition={{ delay: i * 0.15 }}
                                viewport={{ once: true }}
                                className="bg-white rounded-lg p-2 shadow-md flex items-center gap-2"
                              >
                                <span className="text-xl">{field.icon}</span>
                                <div className="flex-1">
                                  <p className="text-[10px] text-gray-500 font-semibold">{field.label}</p>
                                  <p className="text-xs text-gray-800 font-bold">{field.value}</p>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        ) : bonus.mockup === "advanced" ? (
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { icon: "▶️", name: "YouTube", color: "from-red-400 to-red-600" },
                              { icon: "📹", name: "Meet", color: "from-brand-400 to-brand-600" },
                              { icon: "💬", name: "WhatsApp", color: "from-brand-400 to-brand-600" },
                              { icon: "📸", name: "Instagram", color: "from-pink-400 to-purple-600" },
                              { icon: "📱", name: "Telegram", color: "from-blue-400 to-blue-600" },
                              { icon: "🎙️", name: "Podcast", color: "from-purple-400 to-purple-600" },
                            ].map((app, i) => (
                              <motion.div
                                key={i}
                                initial={{ scale: 0, rotate: -180 }}
                                whileInView={{ scale: 1, rotate: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                whileHover={{ scale: 1.15, y: -3 }}
                                className={`bg-gradient-to-br ${app.color} rounded-xl p-2 shadow-lg cursor-pointer flex flex-col items-center justify-center`}
                              >
                                <span className="text-2xl mb-1">{app.icon}</span>
                                <p className="text-white text-[9px] font-bold text-center">{app.name}</p>
                              </motion.div>
                            ))}
                          </div>
                        ) : bonus.mockup === "messages" ? (
                          <div className="relative w-full flex flex-col items-center gap-3">
                            <motion.div
                              animate={{ scale: [1, 1.1, 1] }}
                              transition={{ duration: 2, repeat: Infinity }}
                              className="relative bg-gradient-to-br from-brand-400 to-brand-600 p-4 rounded-2xl shadow-xl"
                            >
                              <MessageSquare className="w-12 h-12 text-white" />
                            </motion.div>
                            <motion.div
                              initial={{ y: 20, opacity: 0 }}
                              animate={{ y: 0, opacity: 1 }}
                              transition={{ delay: 0.3 }}
                              className="bg-white rounded-lg p-3 shadow-lg max-w-[200px]"
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-2 h-2 bg-brand-500 rounded-full animate-pulse" />
                                <p className="text-xs font-bold text-gray-700">Gerando mensagens...</p>
                              </div>
                              <p className="text-[10px] text-gray-600">Acompanhamento paciente</p>
                            </motion.div>
                          </div>
                        ) : (
                          <div className="relative w-full flex flex-col items-center gap-3">
                            <div className="relative">
                              <img src="/images/drive-icon.png" alt="Google Drive" className="w-16 h-16" />
                            </div>
                            <div className="grid grid-cols-2 gap-2 w-full">
                              {["📅 2025-01", "📅 2025-02", "📅 2025-03", "📅 2025-04"].map((folder, i) => (
                                <motion.div
                                  key={i}
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ delay: i * 0.1 }}
                                  className="bg-blue-100 rounded-lg p-2 text-center"
                                >
                                  <p className="text-[10px] font-bold text-blue-700">{folder}</p>
                                </motion.div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Icon */}
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      className="mb-4 inline-block"
                    >
                      <div className="relative">
                        <div className="absolute inset-0 bg-yellow-500 rounded-xl blur-lg opacity-30" />
                        <div className="relative bg-gradient-to-br from-yellow-400 to-orange-500 p-3 rounded-xl shadow-lg">
                          <bonus.icon className="w-8 h-8 text-white" />
                        </div>
                      </div>
                    </motion.div>

                    <div className="mb-4">
                      <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
                        {bonus.title}
                      </h3>
                      <p className="text-base md:text-lg font-semibold text-brand-600 mb-3">
                        {bonus.subtitle}
                      </p>
                      <p className="text-base text-gray-700 leading-relaxed mb-4">
                        {bonus.description}
                      </p>
                      
                      {/* Lista de benefícios */}
                      <div className="space-y-2 mb-4">
                        {bonus.benefits.map((benefit, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <Check className="w-5 h-5 text-brand-600 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-gray-600">{benefit}</p>
                          </div>
                        ))}
                      </div>

                      <p className="text-brand-600 text-base font-bold">
                        Valor real: {bonus.value} • Hoje: <span className="text-yellow-600">GRÁTIS</span>
                      </p>
                    </div>
                  </div>
                </Card3D>
              </motion.div>
            ))}
          </div>

          {/* Total value */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="text-center mt-12 md:mt-16"
          >
            <Card3D>
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="inline-block bg-gradient-to-br from-white via-brand-50 to-white rounded-2xl p-8 md:p-10 border-4 border-brand-300 shadow-2xl cursor-pointer"
              >
                <p className="text-lg md:text-2xl text-gray-600 mb-3 font-semibold">Valor Total dos Bônus:</p>
                <motion.p 
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-3xl md:text-4xl lg:text-5xl font-black text-yellow-600 line-through mb-4"
                >
                  R$ 768
                </motion.p>
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: "100%" }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  className="h-2 bg-gradient-to-r from-brand-500 to-brand-500 rounded-full mb-6"
                />
                <motion.p 
                  animate={{ 
                    textShadow: [
                      "0 0 20px rgba(16,185,129,0.5)",
                      "0 0 40px rgba(16,185,129,0.8)",
                      "0 0 20px rgba(16,185,129,0.5)"
                    ]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-3xl md:text-4xl text-brand-600 font-black"
                >
                  GRÁTIS para você HOJE!
                </motion.p>
                <p className="text-base md:text-lg text-gray-700 font-bold mt-4">
                  De R$ 247 por apenas R$ 36
                </p>
              </motion.div>
            </Card3D>
          </motion.div>

          {/* CTA após bônus */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mt-12 md:mt-16"
          >
            <motion.button
              onClick={scrollToCheckout}
              animate={{ 
                scale: [1, 1.03, 1]
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="group relative inline-flex items-center gap-3 bg-gradient-to-r from-[#5DBEA3] via-[#80D4C3] to-[#5DBEA3] bg-[length:200%_100%] animate-gradient text-white px-10 sm:px-14 py-5 sm:py-6 rounded-full text-xl sm:text-2xl font-black shadow-2xl hover:shadow-[#5DBEA3]/50 transition-all"
            >
              <Mic className="w-6 h-6 flex-shrink-0" />
              <span>Começar agora</span>
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform flex-shrink-0" />
            </motion.button>
            <p className="text-base text-white mt-4 font-semibold">Sistema completo + 4 bônus • R$ 36</p>
          </motion.div>

        </div>
      </section>

      {/* DEPOIMENTOS COM CARROSSEL INFINITO AUTOMÁTICO */}
      <section className="relative py-12 md:py-20 lg:py-24 bg-white overflow-hidden">
        <div className="container mx-auto max-w-7xl px-4 mb-12">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              className="inline-block mb-6 px-8 py-3 bg-gradient-to-r from-brand-100 to-brand-100 rounded-full"
            >
              <p className="text-gray-900 font-bold text-lg">
                Usado por centenas de médicos
                <span className="text-gray-600 text-sm block">(em todo o Brasil)</span>
              </p>
            </motion.div>
            
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4 text-gray-900">
              O que médicos estão dizendo
            </h2>
          </motion.div>
        </div>

        {/* Carrossel de largura total com autoplay infinito */}
        <div className="relative w-full">
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex">
              {/* Duplicar array para efeito loop infinito */}
              {[...Array(2)].map((_, arrayIndex) => (
                [
                  {
                    specialty: "Cardiologista",
                    age: "45 anos",
                    gender: "Médica",
                    text: "...economizo pelo menos 3 horas por dia em digitação, meus pacientes também adoram.",
                    bgColor: "from-white to-brand-50",
                  },
                  {
                    specialty: "Pediatra",
                    age: "38 anos",
                    gender: "Médico",
                    text: "Já recomendamos o Gravador Médico para vários colegas da nossa equipe.",
                    bgColor: "from-white to-brand-50",
                  },
                  {
                    specialty: "Psiquiatra",
                    age: "42 anos",
                    gender: "Médica",
                    text: "Me permite focar totalmente no paciente, ao invés de ficar digitando no prontuário durante a consulta.",
                    bgColor: "from-white to-brand-50",
                  },
                  {
                    specialty: "Clínico Geral",
                    age: "51 anos",
                    gender: "Médico",
                    text: "Está documentando enquanto eu e o paciente conversamos e gerando notas precisas e detalhadas como se eu tivesse escrito.",
                    bgColor: "from-white to-brand-50",
                  },
                  {
                    specialty: "Ortopedista",
                    age: "39 anos",
                    gender: "Médica",
                    text: "Consigo atender mais pacientes sem comprometer a qualidade do atendimento. Revolucionou minha prática!",
                    bgColor: "from-white to-brand-50",
                  },
                  {
                    specialty: "Dermatologista",
                    age: "47 anos",
                    gender: "Médico",
                    text: "A transcrição é tão precisa que parece que eu mesmo escrevi. Economia de tempo impressionante!",
                    bgColor: "from-white to-brand-50",
                  },
                ].map((testimonial, index) => (
                  <div
                    key={`${arrayIndex}-${index}`}
                    className="flex-[0_0_90%] sm:flex-[0_0_60%] md:flex-[0_0_45%] lg:flex-[0_0_30%] min-w-0 px-3 py-2"
                  >
                    <motion.div
                      whileHover={{ y: -8, scale: 1.02 }}
                      transition={{ duration: 0.3 }}
                      className="h-full"
                    >
                      <div className={`relative h-full min-h-[240px] bg-gradient-to-br ${testimonial.bgColor} backdrop-blur-xl rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all border-2 border-white`}>
                        
                        {/* Testimonial text */}
                        <p className="text-gray-800 text-lg leading-relaxed mb-8 font-medium italic relative z-10 min-h-[80px]">
                          "{testimonial.text}"
                        </p>

                        {/* Author info - sem avatar */}
                        <div className="flex flex-col gap-1">
                          <p className="text-brand-600 font-bold text-base">{testimonial.specialty}</p>
                          <p className="text-gray-700 font-semibold text-sm">{testimonial.gender}, {testimonial.age}</p>
                        </div>

                        {/* Quote decoration */}
                        <div className="absolute top-4 right-4 opacity-10">
                          <MessageSquare className="w-12 h-12 text-purple-600" />
                        </div>
                      </div>
                    </motion.div>
                  </div>
                ))
              ))}
            </div>
          </div>

          {/* "View More" button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mt-12"
          >
          </motion.div>
        </div>

      </section>

      {/* GARANTIA */}
      <section id="garantia" className="relative py-12 md:py-20 lg:py-24 px-4 bg-white">
        <div className="container mx-auto max-w-3xl">
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <Card3D className="group">
              <div className="relative bg-gradient-to-br from-brand-50 to-brand-50 backdrop-blur-xl rounded-2xl md:rounded-3xl p-6 md:p-10 border-2 border-brand-200 text-center overflow-hidden shadow-2xl">
                
                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-brand-500 to-brand-500 opacity-0 group-hover:opacity-5 transition-opacity" />

                {/* Shield icon */}
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="relative inline-block mb-6"
                >
                  <div className="absolute inset-0 bg-brand-500 rounded-full blur-2xl opacity-30" />
                  <div className="relative bg-gradient-to-br from-brand-500 to-brand-300 p-5 md:p-6 rounded-full shadow-xl">
                    <Shield className="w-12 h-12 md:w-16 md:h-16 text-white" />
                  </div>
                </motion.div>

                <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4 md:mb-6 px-2">
                  <span className="bg-gradient-to-r from-brand-500 to-brand-300 bg-clip-text text-transparent">
                    Garantia de 7 Dias
                  </span>
                </h2>

                <p className="text-base md:text-lg text-gray-700 leading-relaxed mb-4 md:mb-6 max-w-2xl mx-auto px-2">
                  Teste o método. Experimente. Configure em 5 minutos. Grave sua primeira consulta. Use durante uma semana inteira.
                </p>

                <p className="text-base md:text-lg text-gray-700 leading-relaxed mb-6 md:mb-8 max-w-2xl mx-auto px-2">
                  Se não ficar satisfeito, por qualquer motivo, é só entrar em contato. Devolvemos 100% do seu dinheiro.
                </p>

                <div className="inline-block bg-brand-100 border-2 border-brand-300 rounded-xl p-4 md:p-5">
                  <p className="text-brand-700 text-sm md:text-base font-bold">
                    Sem perguntas. Sem burocracia. Rápido e simples.
                  </p>
                </div>

                {/* CTA após Garantia */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 }}
                  className="mt-8"
                >
                  <motion.button
                    onClick={scrollToCheckout}
                    animate={{ 
                      scale: [1, 1.03, 1]
                    }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="group relative inline-flex items-center gap-3 bg-gradient-to-r from-[#5DBEA3] via-[#80D4C3] to-[#5DBEA3] bg-[length:200%_100%] animate-gradient text-white px-10 sm:px-14 py-5 sm:py-6 rounded-full text-xl sm:text-2xl font-black shadow-2xl hover:shadow-[#5DBEA3]/50 transition-all whitespace-nowrap"
                  >
                    <Mic className="w-6 h-6 flex-shrink-0" />
                    <span>Testar sem risco</span>
                    <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform flex-shrink-0" />
                  </motion.button>
                  <p className="text-base text-gray-600 mt-4 font-semibold">Garantia total • Apenas R$ 36</p>
                </motion.div>
              </div>
            </Card3D>
          </motion.div>

        </div>
      </section>

      {/* CTA FINAL */}
      <section className="relative py-12 md:py-20 lg:py-24 px-4 bg-white">
        <div className="container mx-auto max-w-3xl">
          
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center space-y-12"
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black leading-tight px-4">
              <span className="bg-gradient-to-r from-gray-900 to-brand-700 bg-clip-text text-transparent">
                Seja o médico que<br />você sempre quis ser
              </span>
            </h2>

            <p className="text-lg md:text-xl lg:text-2xl text-gray-700 leading-relaxed max-w-2xl mx-auto px-4">
              Mais tempo para ouvir. Mais atenção para cuidar. Mais energia para o que realmente importa: seus pacientes.
            </p>

            <Card3D className="group max-w-2xl mx-auto">
              <div className="relative bg-white rounded-2xl md:rounded-3xl border-4 border-brand-500 shadow-2xl overflow-hidden">
                
                {/* Header verde */}
                <div className="bg-gradient-to-br from-brand-600 to-brand-500 text-white text-center py-5 px-4">
                  <h3 className="text-2xl md:text-3xl lg:text-4xl font-black mb-2">GRAVADOR MÉDICO</h3>
                  <p className="text-base md:text-lg font-medium">Método Completo + Bônus</p>
                </div>

                {/* Conteúdo */}
                <div className="p-5 md:p-7 space-y-5">
                  
                  {/* Preços */}
                  <div className="text-center space-y-2">
                    <p className="text-gray-500 text-lg line-through">De: R$ 197</p>
                    <div className="flex items-baseline justify-center gap-2">
                      <span className="text-xl md:text-2xl text-gray-700 font-semibold">Por apenas:</span>
                      <span className="text-5xl md:text-6xl font-black text-gray-900">R$ 36</span>
                    </div>
                    <p className="text-gray-600 text-base">Pagamento único ou 8x de R$ 5,40</p>
                  </div>

                  {/* Lista de benefícios */}
                  <div className="space-y-2.5">
                    {[
                      'Método completo de transcrição automática',
                      'Configuração do Atalho Mágico no iPhone',
                      'Prompt IA personalizado para prontuários',
                      '4 Bônus Exclusivos para Potencializar seu Método',
                      'Acesso vitalício com atualizações gratuitas',
                      'Garantia incondicional de 7 dias'
                    ].map((item, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-100 flex items-center justify-center mt-0.5">
                          <Check className="w-3.5 h-3.5 text-brand-600" />
                        </div>
                        <p className="text-gray-700 text-sm md:text-base leading-snug text-left">{item}</p>
                      </div>
                    ))}
                  </div>

                  {/* CTA Principal */}
                  <button
                    onClick={handleCheckout}
                    className="w-full"
                  >
                    <motion.div
                      animate={{ scale: [1, 1.02, 1] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      className="bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 text-white py-4 md:py-5 rounded-xl text-xl md:text-2xl font-black shadow-lg transition-all"
                    >
                      COMPRAR AGORA - R$ 36
                    </motion.div>
                  </button>

                  {/* Trust badges */}
                  <div className="flex items-center justify-center gap-4 pt-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Shield className="w-5 h-5" />
                      <span>Compra segura</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Zap className="w-5 h-5" />
                      <span>Acesso imediato</span>
                    </div>
                  </div>

                  {/* Garantia */}
                  <div className="text-center pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-center gap-2 text-brand-600">
                      <Shield className="w-5 h-5" />
                      <span className="font-bold">Garantia incondicional de 7 dias</span>
                    </div>
                  </div>

                  {/* Bônus limitado */}
                  <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">🎁</div>
                      <div className="flex-1">
                        <p className="text-orange-800 font-bold text-sm md:text-base leading-relaxed">
                          <span className="font-black">BÔNUS LIMITADO:</span> 4 Bônus Exclusivos (Ultrapersonalização + Mensagens + Avançado + Organização)<br />
                          <span className="bg-orange-200 px-2 py-0.5 rounded mt-1 inline-block">Apenas {remainingAccess} acessos restantes</span>
                        </p>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </Card3D>

            <p className="text-gray-500 text-sm px-4">
              Pagamento 100% seguro • Seus dados estão protegidos com criptografia SSL
            </p>
          </motion.div>

        </div>
      </section>

      {/* FAQ */}
      <section className="relative py-12 md:py-20 lg:py-24 px-4 bg-white">
        <div className="container mx-auto max-w-6xl">
          
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12 md:mb-16"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4 px-4">
              <span className="bg-gradient-to-r from-gray-900 to-brand-700 bg-clip-text text-transparent">
                Perguntas Frequentes
              </span>
            </h2>
          </motion.div>

          {/* Grid de 4 cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {[
              {
                icon: Smartphone,
                question: "Funciona em Android?",
                answer: "Não. O método funciona apenas em dispositivos Apple (iPhone, iPad e Mac) porque usa os Atalhos da Apple e a integração nativa com o iOS. Se você tem Android, infelizmente esse método não vai funcionar."
              },
              {
                icon: WifiOff,
                question: "Precisa de internet para funcionar?",
                answer: "Para configurar o método pela primeira vez, sim. Mas depois de configurado, você pode gravar consultas offline sem problema. As gravações ficam salvas no seu dispositivo e são processadas quando você conectar na internet novamente."
              },
              {
                icon: Shield,
                question: "Meus dados ficam seguros? É LGPD?",
                answer: "Sim. Todas as gravações ficam armazenadas apenas no seu dispositivo até você decidir processá-las. O processamento é feito de forma criptografada e os dados são tratados conforme LGPD. Você tem controle total sobre suas informações."
              },
              {
                icon: HelpCircle,
                question: "É difícil de instalar?",
                answer: "Não. A instalação é guiada passo a passo e leva cerca de 5 minutos. Você instala os Atalhos gratuitos da Apple, personaliza seu prompt médico com seus dados, e está pronto para começar a gravar. Não precisa de conhecimento técnico."
              }
            ].map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="bg-gradient-to-br from-white to-brand-50/30 rounded-2xl p-6 md:p-8 shadow-lg hover:shadow-xl transition-all border-2 border-brand-200 h-full">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center">
                      <faq.icon className="w-6 h-6 text-brand-600" />
                    </div>
                    <h3 className="text-lg md:text-xl font-bold text-gray-900 leading-tight">
                      {faq.question}
                    </h3>
                  </div>
                  <p className="text-gray-700 leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Card final em largura total */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
          >
            <div className="bg-gradient-to-br from-white to-brand-50/30 rounded-2xl p-8 md:p-10 shadow-lg border-2 border-brand-200 text-center">
              <h3 className="text-2xl md:text-3xl font-black text-gray-900 mb-4">
                E se eu não gostar?
              </h3>
              <p className="text-lg md:text-xl text-gray-700 leading-relaxed">
                Você tem 7 dias de garantia incondicional. Teste o método, configure, use nas suas consultas. Se não ficar satisfeito por qualquer motivo, é só entrar em contato que devolvemos 100% do seu dinheiro.
              </p>
            </div>
          </motion.div>

        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative mt-20 bg-gradient-to-br from-brand-600 via-brand-500 to-brand-600 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:64px_64px]" />
        
        <div className="relative max-w-4xl mx-auto px-4 py-16">
          <div className="flex flex-col items-center gap-8 text-center">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-white/20 rounded-xl blur-xl"></div>
                <div className="relative bg-white p-3 rounded-xl shadow-lg">
                  <Image
                    src="/images/novo-icon-gravadormedico.png"
                    alt="Gravador Médico"
                    width={32}
                    height={32}
                    className="w-8 h-8"
                  />
                </div>
              </div>
              <span className="text-2xl font-black text-white">
                Gravador Médico
              </span>
            </div>
            
            <p className="text-white font-semibold max-w-2xl mx-auto text-base px-4">
              Revolucione sua prática médica com inteligência artificial. Economize tempo, melhore a qualidade dos seus prontuários e foque no que realmente importa: seus pacientes.
            </p>

            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="inline-block"
            >
              <a
                href="https://wa.me/5521981470758?text=Olá!%20Preciso%20de%20suporte%20com%20o%20Gravador%20Médico."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 px-8 py-4 bg-white border-2 border-white text-brand-600 rounded-2xl font-bold text-lg hover:bg-brand-50 transition-all shadow-md hover:shadow-lg"
              >
                <Headphones className="w-6 h-6" />
                <span>Falar com Suporte</span>
              </a>
            </motion.div>

            <div className="flex items-center justify-center gap-8 text-sm text-white font-semibold flex-wrap">
              <Link href="/termos-de-uso" target="_blank" className="hover:text-brand-100 transition-colors">Termos de Uso</Link>
              <Link href="/politica-privacidade" target="_blank" className="hover:text-brand-100 transition-colors">Política de Privacidade</Link>
              <Link href="/contato" className="hover:text-brand-100 transition-colors">Contato</Link>
            </div>

            <p className="text-white font-semibold text-sm">
              © 2026 Gravador Médico. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
      
      <style jsx global>{`
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
        @keyframes shine {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shine {
          animation: shine 2s infinite;
        }
      `}</style>
      </div>
    </>
  )
}
