"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import useEmblaCarousel from 'embla-carousel-react'
import Autoplay from 'embla-carousel-autoplay'
import {
  Check,
  Clock,
  Lock,
  Shield,
  CreditCard,
  Gift,
  Zap,
  Star,
  AlertCircle,
  Sparkles,
  User,
  Mail,
  Phone,
  FileText,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  MessageSquare,
  Wallet,
  X,
  ChevronRight,
} from "lucide-react"

export default function CheckoutPage() {
  const router = useRouter()
  
  // Estados principais
  const [currentStep, setCurrentStep] = useState(1) // 1: Dados, 2: Order Bumps, 3: Pagamento
  const [timeLeft, setTimeLeft] = useState(15 * 60) // 15 minutos
  const [selectedOrderBumps, setSelectedOrderBumps] = useState<number[]>([])
  const [paymentMethod, setPaymentMethod] = useState<"credit" | "pix">("credit")
  const [loading, setLoading] = useState(false)
  const [pixQrCode, setPixQrCode] = useState("")
  const [orderId, setOrderId] = useState("")
  
  // Form data - Etapa 1
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    cpf: "",
  })

  // Card data - Etapa 3
  const [cardData, setCardData] = useState({
    number: "",
    holderName: "",
    expMonth: "",
    expYear: "",
    cvv: "",
    installments: 1,
  })

  // Depoimentos carousel
  const [emblaRef] = useEmblaCarousel(
    { loop: true, align: 'start', skipSnaps: false },
    [Autoplay({ delay: 3000, stopOnInteraction: false })]
  )

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // Order Bumps
  const orderBumps = [
    {
      id: "32989468", // ID do produto na Appmax
      title: "🎯 Pacote VIP: Consultoria Personalizada",
      description: "30 minutos de consultoria individual para otimizar seu método + Setup completo feito por especialista",
      originalPrice: 497,
      price: 147,
      discount: 70,
      highlight: "MAIS VENDIDO",
      badge: "LIMITADO",
    },
    {
      id: "32989503", // ID do produto na Appmax
      title: "📚 Biblioteca Premium: 50+ Modelos Prontos",
      description: "Modelos de prontuários para 20+ especialidades + Scripts de anamnese otimizados + Atualizações vitalícias",
      originalPrice: 297,
      price: 97,
      discount: 67,
      highlight: "ECONOMIZE HORAS",
      badge: "EXCLUSIVO",
    },
    {
      id: "32989520", // ID do produto na Appmax
      title: "⚡ Treinamento Avançado + Suporte Prioritário",
      description: "3 meses de suporte prioritário via WhatsApp + Acesso ao grupo VIP de médicos + Treinamento ao vivo semanal",
      originalPrice: 397,
      price: 127,
      discount: 68,
      highlight: "ACELERE RESULTADOS",
      badge: "PREMIUM",
    },
  ]

  // Depoimentos
  const testimonials = [
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
  ]

  // Cálculos
  const basePrice = 36
  const orderBumpsTotal = selectedOrderBumps.reduce((acc, idx) => acc + orderBumps[idx].price, 0)
  const subtotal = basePrice + orderBumpsTotal
  const total = subtotal // Sem desconto PIX - desconto via cupom Appmax

  // Validações
  const isStep1Valid = () => {
    return formData.name && formData.email && formData.cpf && formData.cpf.replace(/\D/g, '').length === 11
  }

  const isStep3Valid = () => {
    if (paymentMethod === "pix") return true
    return cardData.number && cardData.holderName && cardData.expMonth && cardData.expYear && cardData.cvv
  }

  // Formatação
  const formatCPF = (value: string): string => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1')
  }

  const formatPhone = (value: string): string => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1')
  }

  const formatCardNumber = (value: string): string => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{4})(\d)/, '$1 $2')
      .replace(/(\d{4})(\d)/, '$1 $2')
      .replace(/(\d{4})(\d)/, '$1 $2')
      .replace(/(\d{4})\d+?$/, '$1')
  }

  const toggleOrderBump = (index: number) => {
    setSelectedOrderBumps((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    )
  }

  // Checkout
  const handleCheckout = async () => {
    setLoading(true)
    
    try {
      // Mapeia os índices dos order bumps selecionados para os IDs dos produtos
      const selectedBumpProducts = selectedOrderBumps.map(index => ({
        product_id: orderBumps[index].id,
        quantity: 1
      }))
      
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          cpf: formData.cpf.replace(/\D/g, ''),
          paymentMethod: paymentMethod,
          orderBumps: selectedBumpProducts, // Envia os IDs dos produtos
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao processar pagamento')
      }

      // Processa resposta da API
      if (result.success) {
        if (paymentMethod === 'pix') {
          // Se a API retornou uma URL de redirecionamento (comportamento padrão Appmax)
          // redireciona diretamente para a página de pagamento PIX da Appmax
          if (result.redirect_url) {
            console.log('🔗 Redirecionando para página PIX Appmax:', result.redirect_url)
            window.location.href = result.redirect_url
            return
          }
          
          // Se não retornou nem URL nem QR Code, erro
          console.error('❌ Resposta da API:', result)
          throw new Error('API não retornou URL de pagamento PIX')
        } else if (paymentMethod === 'credit') {
          // Mostra resultado do cartão
          window.location.href = `/success/credit?order_id=${result.order_id}&status=${result.status}`
        } else {
          throw new Error('Método de pagamento inválido')
        }
      }
    } catch (error: any) {
      console.error('Erro no checkout:', error)
      alert(error.message || 'Erro ao processar pagamento')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-brand-50">
      
      {/* Banner de Escassez no Topo */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-red-600 via-red-500 to-orange-500 text-white shadow-2xl">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* Contador */}
            <div className="flex items-center gap-3">
              <Clock className="w-6 h-6 animate-pulse" />
              <div className="flex items-baseline gap-2">
                <span className="text-sm md:text-base font-bold">Oferta expira em:</span>
                <span className="text-3xl md:text-4xl font-black tabular-nums tracking-tight">
                  {formatTime(timeLeft)}
                </span>
              </div>
            </div>

            {/* Infos importantes */}
            <div className="flex items-center gap-4 md:gap-6 text-xs md:text-sm">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span className="font-semibold">Compra 100% Segura</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                <span className="font-semibold hidden sm:inline">Acesso Imediato</span>
              </div>
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4" />
                <span className="font-semibold hidden md:inline">4 Bônus Grátis</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="h-1 bg-white/20">
          <motion.div
            className="h-full bg-white shadow-lg"
            initial={{ width: "100%" }}
            animate={{ width: `${(timeLeft / (15 * 60)) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Espaçamento para o banner fixo */}
      <div className="h-20 md:h-24"></div>

      {/* Main Content */}
      <div className="container mx-auto max-w-7xl px-4 py-8 md:py-12">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 md:mb-12"
        >
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-brand-500 to-brand-600 text-white px-6 py-2 rounded-full text-sm font-bold mb-4 shadow-lg">
            <Lock className="w-4 h-4" />
            <span>Checkout Seguro SSL</span>
          </div>
          
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 mb-3">
            Complete seu Pedido
          </h1>
          <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto">
            Você está a um passo de economizar <span className="text-brand-600 font-bold">3 horas por dia</span> com o Método Gravador Médico
          </p>
        </motion.div>

        {/* Progress Steps */}
        <div className="max-w-3xl mx-auto mb-12">
          <div className="flex items-center justify-between">
            {[
              { number: 1, label: "Seus Dados", icon: User },
              { number: 2, label: "Ofertas Extras", icon: Gift },
              { number: 3, label: "Pagamento", icon: CreditCard },
            ].map((step, index) => (
              <div key={step.number} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ 
                      scale: currentStep >= step.number ? 1 : 0.8,
                      opacity: currentStep >= step.number ? 1 : 0.5 
                    }}
                    className={`w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center font-black text-lg md:text-xl transition-all ${
                      currentStep > step.number
                        ? "bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg"
                        : currentStep === step.number
                        ? "bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-xl ring-4 ring-brand-200"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {currentStep > step.number ? (
                      <Check className="w-6 h-6 md:w-8 md:h-8" />
                    ) : (
                      <step.icon className="w-5 h-5 md:w-6 md:h-6" />
                    )}
                  </motion.div>
                  <p className={`mt-2 text-xs md:text-sm font-bold text-center ${
                    currentStep >= step.number ? "text-brand-600" : "text-gray-400"
                  }`}>
                    {step.label}
                  </p>
                </div>
                
                {index < 2 && (
                  <div className={`h-1 flex-1 mx-2 rounded-full transition-all ${
                    currentStep > step.number ? "bg-green-500" : "bg-gray-200"
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Left Column - Forms */}
          <div className="lg:col-span-2 space-y-6">
            
            <AnimatePresence mode="wait">
              
              {/* ETAPA 1: DADOS PESSOAIS */}
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="bg-white rounded-3xl shadow-xl p-6 md:p-8 border-2 border-brand-100"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-gray-900">Seus Dados</h2>
                      <p className="text-sm text-gray-600">Preencha suas informações básicas</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-2">
                        Nome Completo *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-brand-500 focus:outline-none transition-colors"
                        placeholder="Dr. João Silva"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-2">
                        Email *
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-brand-500 focus:outline-none transition-colors"
                        placeholder="seu@email.com"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-900 mb-2">
                          Telefone
                        </label>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-brand-500 focus:outline-none transition-colors"
                          placeholder="(11) 99999-9999"
                          maxLength={15}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-900 mb-2">
                          CPF *
                        </label>
                        <input
                          type="text"
                          value={formData.cpf}
                          onChange={(e) => setFormData({ ...formData, cpf: formatCPF(e.target.value) })}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-brand-500 focus:outline-none transition-colors"
                          placeholder="000.000.000-00"
                          maxLength={14}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => isStep1Valid() && setCurrentStep(2)}
                    disabled={!isStep1Valid()}
                    className="w-full mt-6 bg-gradient-to-r from-brand-600 to-brand-500 text-white py-4 rounded-xl font-black text-lg hover:from-brand-700 hover:to-brand-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                  >
                    <span>Continuar</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </motion.div>
              )}

              {/* ETAPA 2: ORDER BUMPS */}
              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-6"
                >
                  <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8 border-2 border-brand-100">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                        <Gift className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-black text-gray-900">Ofertas Especiais</h2>
                        <p className="text-sm text-gray-600">Aproveite estas ofertas exclusivas por tempo limitado!</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {orderBumps.map((bump, index) => (
                        <button
                          key={index}
                          onClick={() => toggleOrderBump(index)}
                          className={`w-full text-left transition-all ${
                            selectedOrderBumps.includes(index)
                              ? "bg-gradient-to-br from-brand-50 to-brand-100 border-2 border-brand-500 shadow-lg scale-[1.02]"
                              : "bg-white border-2 border-gray-200 hover:border-brand-300 hover:shadow-md"
                          } rounded-2xl p-6 relative overflow-hidden group`}
                        >
                          {/* Badge */}
                          <div className="absolute top-4 right-4">
                            <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                              {bump.badge}
                            </div>
                          </div>

                          {/* Checkbox */}
                          <div className="absolute top-4 left-4">
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                              selectedOrderBumps.includes(index)
                                ? "bg-brand-600 border-brand-600"
                                : "border-gray-300 group-hover:border-brand-400"
                            }`}>
                              {selectedOrderBumps.includes(index) && (
                                <Check className="w-4 h-4 text-white" />
                              )}
                            </div>
                          </div>

                          <div className="pl-8 pr-20">
                            <div className="mb-2">
                              <span className="inline-block bg-gradient-to-r from-orange-100 to-red-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold mb-2">
                                {bump.highlight}
                              </span>
                            </div>
                            
                            <h3 className="text-lg font-black text-gray-900 mb-2">
                              {bump.title}
                            </h3>
                            
                            <p className="text-sm text-gray-600 mb-4">
                              {bump.description}
                            </p>

                            <div className="flex items-center gap-3">
                              <div className="text-gray-400 line-through text-sm">
                                R$ {bump.originalPrice}
                              </div>
                              <div className="text-2xl font-black text-brand-600">
                                R$ {bump.price}
                              </div>
                              <div className="bg-red-100 text-red-600 px-2 py-1 rounded-lg text-xs font-bold">
                                -{bump.discount}%
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setCurrentStep(1)}
                      className="flex-1 bg-gray-100 text-gray-700 py-4 rounded-xl font-bold hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
                    >
                      <ArrowLeft className="w-5 h-5" />
                      <span>Voltar</span>
                    </button>
                    
                    <button
                      onClick={() => setCurrentStep(3)}
                      className="flex-[2] bg-gradient-to-r from-brand-600 to-brand-500 text-white py-4 rounded-xl font-black text-lg hover:from-brand-700 hover:to-brand-600 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                    >
                      <span>Ir para Pagamento</span>
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ETAPA 3: PAGAMENTO */}
              {currentStep === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-6"
                >
                  <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8 border-2 border-brand-100">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-black text-gray-900">Pagamento</h2>
                        <p className="text-sm text-gray-600">Escolha a forma de pagamento</p>
                      </div>
                    </div>

                    {/* Seletor de Método */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <button
                        onClick={() => setPaymentMethod("credit")}
                        className={`p-6 rounded-xl border-2 transition-all ${
                          paymentMethod === "credit"
                            ? "border-brand-500 bg-brand-50 shadow-lg"
                            : "border-gray-200 hover:border-brand-300"
                        }`}
                      >
                        <CreditCard className="w-8 h-8 mx-auto mb-2 text-brand-600" />
                        <div className="text-sm font-bold text-gray-900">Cartão de Crédito</div>
                        <div className="text-xs text-gray-600 mt-1">Em até 12x sem juros</div>
                      </button>
                      
                      <button
                        onClick={() => setPaymentMethod("pix")}
                        className={`p-6 rounded-xl border-2 transition-all relative ${
                          paymentMethod === "pix"
                            ? "border-brand-500 bg-brand-50 shadow-lg"
                            : "border-gray-200 hover:border-brand-300"
                        }`}
                      >
                        <Wallet className="w-8 h-8 mx-auto mb-2 text-brand-600" />
                        <div className="text-sm font-bold text-gray-900">PIX</div>
                        <div className="text-xs text-gray-600 mt-1">Pagamento instantâneo</div>
                      </button>
                    </div>

                    {/* Formulário de Cartão */}
                    {paymentMethod === "credit" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-4"
                      >
                        <div>
                          <label className="block text-sm font-bold text-gray-900 mb-2">
                            Número do Cartão *
                          </label>
                          <input
                            type="text"
                            value={cardData.number}
                            onChange={(e) => setCardData({ ...cardData, number: formatCardNumber(e.target.value) })}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-brand-500 focus:outline-none transition-colors"
                            placeholder="0000 0000 0000 0000"
                            maxLength={19}
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-bold text-gray-900 mb-2">
                            Nome no Cartão *
                          </label>
                          <input
                            type="text"
                            value={cardData.holderName}
                            onChange={(e) => setCardData({ ...cardData, holderName: e.target.value.toUpperCase() })}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-brand-500 focus:outline-none transition-colors"
                            placeholder="NOME COMO NO CARTÃO"
                            required
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-bold text-gray-900 mb-2">
                              Mês *
                            </label>
                            <input
                              type="text"
                              value={cardData.expMonth}
                              onChange={(e) => setCardData({ ...cardData, expMonth: e.target.value.replace(/\D/g, '').slice(0, 2) })}
                              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-brand-500 focus:outline-none transition-colors"
                              placeholder="12"
                              maxLength={2}
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-bold text-gray-900 mb-2">
                              Ano *
                            </label>
                            <input
                              type="text"
                              value={cardData.expYear}
                              onChange={(e) => setCardData({ ...cardData, expYear: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-brand-500 focus:outline-none transition-colors"
                              placeholder="2028"
                              maxLength={4}
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-bold text-gray-900 mb-2">
                              CVV *
                            </label>
                            <input
                              type="text"
                              value={cardData.cvv}
                              onChange={(e) => setCardData({ ...cardData, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-brand-500 focus:outline-none transition-colors"
                              placeholder="123"
                              maxLength={4}
                              required
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Mensagem PIX */}
                    {paymentMethod === "pix" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="bg-brand-50 border-2 border-brand-200 rounded-xl p-4"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-brand-600 flex items-center justify-center flex-shrink-0">
                            <Zap className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 mb-1">Pagamento via PIX</p>
                            <p className="text-sm text-gray-600">
                              Após clicar em finalizar, você receberá o QR Code para pagamento instantâneo.
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setCurrentStep(2)}
                      className="flex-1 bg-gray-100 text-gray-700 py-4 rounded-xl font-bold hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
                    >
                      <ArrowLeft className="w-5 h-5" />
                      <span>Voltar</span>
                    </button>
                    
                    <button
                      onClick={handleCheckout}
                      disabled={loading || !isStep3Valid()}
                      className="flex-[2] bg-gradient-to-r from-green-600 to-green-500 text-white py-4 rounded-xl font-black text-lg hover:from-green-700 hover:to-green-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                    >
                      {loading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Processando...</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-5 h-5" />
                          <span>Finalizar Compra Segura</span>
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>

            {/* Depoimentos */}
            <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8 border-2 border-brand-100">
              <h3 className="text-xl font-black text-gray-900 mb-6 text-center">
                O que médicos estão dizendo
              </h3>
              
              <div className="overflow-hidden" ref={emblaRef}>
                <div className="flex">
                  {testimonials.map((testimonial, index) => (
                    <div
                      key={index}
                      className="flex-[0_0_100%] min-w-0 px-2"
                    >
                      <div className={`bg-gradient-to-br ${testimonial.bgColor} rounded-2xl p-6 border-2 border-brand-100`}>
                        <p className="text-gray-800 text-base leading-relaxed mb-4 italic">
                          "{testimonial.text}"
                        </p>
                        <div className="flex flex-col gap-1">
                          <p className="text-brand-600 font-bold">{testimonial.specialty}</p>
                          <p className="text-gray-700 text-sm">{testimonial.gender}, {testimonial.age}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* Right Column - Resumo do Pedido */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl shadow-xl p-6 border-2 border-brand-100"
              >
                <h3 className="text-xl font-black text-gray-900 mb-6">Resumo do Pedido</h3>

                {/* Produto Principal */}
                <div className="mb-6 pb-6 border-b-2 border-gray-100">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-brand-500 to-brand-600 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 mb-1">Método Gravador Médico</h4>
                      <p className="text-sm text-gray-600">Sistema Completo + 4 Bônus</p>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="text-gray-400 line-through text-sm">R$ 938</div>
                        <div className="text-2xl font-black text-brand-600">R$ {basePrice}</div>
                      </div>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="mt-4 space-y-2">
                    {[
                      "Acesso Imediato e Vitalício",
                      "4 Bônus Exclusivos Inclusos",
                      "Garantia de 7 Dias",
                      "Suporte por 30 Dias",
                    ].map((feature, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-brand-600 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Order Bumps Selecionados */}
                {selectedOrderBumps.length > 0 && (
                  <div className="mb-6 pb-6 border-b-2 border-gray-100">
                    <h4 className="font-bold text-gray-900 mb-3">Extras Selecionados:</h4>
                    {selectedOrderBumps.map((idx) => (
                      <div key={idx} className="flex items-center justify-between mb-3 text-sm">
                        <span className="text-gray-700">{orderBumps[idx].title.substring(0, 30)}...</span>
                        <span className="font-bold text-brand-600">R$ {orderBumps[idx].price}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Totais */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between text-gray-700">
                    <span>Subtotal</span>
                    <span className="font-bold">R$ {subtotal.toFixed(2)}</span>
                  </div>

                  <div className="pt-3 border-t-2 border-gray-100">
                    <div className="flex items-center justify-between text-2xl font-black">
                      <span className="text-gray-900">Total</span>
                      <span className="text-brand-600">R$ {total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Selos de Segurança */}
                <div className="space-y-3 pt-6 border-t-2 border-gray-100">
                  {[
                    { icon: Shield, text: "Compra 100% Segura SSL" },
                    { icon: Lock, text: "Seus dados protegidos" },
                    { icon: CheckCircle2, text: "Garantia de 7 dias" },
                  ].map((item, index) => (
                    <div key={index} className="flex items-center gap-3 text-sm text-gray-600">
                      <item.icon className="w-5 h-5 text-brand-600 flex-shrink-0" />
                      <span>{item.text}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>

        </div>
      </div>

      {/* Modal PIX */}
      <AnimatePresence>
        {pixQrCode && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full relative"
            >
              <button
                onClick={() => setPixQrCode("")}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>

              <div className="text-center">
                <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Wallet className="w-8 h-8 text-brand-600" />
                </div>
                
                <h2 className="text-2xl font-black text-gray-900 mb-2">
                  Pague com PIX
                </h2>
                
                <p className="text-gray-600 mb-6">
                  Escaneie o QR Code abaixo com o app do seu banco
                </p>

                <div className="bg-white p-4 rounded-xl border-2 border-gray-200 mb-6">
                  <img
                    src={pixQrCode}
                    alt="QR Code PIX"
                    className="w-full h-auto"
                  />
                </div>

                <div className="flex items-center justify-center gap-2 text-sm text-gray-600 mb-4">
                  <Clock className="w-4 h-4" />
                  <span>Aguardando pagamento...</span>
                </div>

                <div className="flex justify-center gap-1">
                  <div className="w-2 h-2 bg-brand-600 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-brand-600 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-2 h-2 bg-brand-600 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}
