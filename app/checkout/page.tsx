"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import useEmblaCarousel from 'embla-carousel-react'
import Autoplay from 'embla-carousel-autoplay'
import { saveAbandonedCart, markCartAsRecovered } from '@/lib/abandonedCart'
import { supabase } from '@/lib/supabase'
import { useMercadoPago } from '@/hooks/useMercadoPago'
import { validateCPF, formatCPF } from '@/lib/cpf'
import { validateCNPJ, formatCNPJ, consultarCNPJ } from '@/lib/cnpj-api'
import { useAutoSave } from '@/hooks/useAutoSave'
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
  Copy,
  Building2,
  Loader2,
  Search,
  ShieldCheck,
} from "lucide-react"

export default function CheckoutPage() {
  const router = useRouter()
  const { mp, loading: mpLoading, createCardToken, getDeviceId } = useMercadoPago()
  
  // Estados principais
  const [currentStep, setCurrentStep] = useState(1) // 1: Dados, 2: Order Bumps, 3: Pagamento
  const [timeLeft, setTimeLeft] = useState(15 * 60) // 15 minutos
  const [selectedOrderBumps, setSelectedOrderBumps] = useState<number[]>([])
  const [paymentMethod, setPaymentMethod] = useState<"credit" | "pix">("credit")
  const [loading, setLoading] = useState(false)
  const [pixQrCode, setPixQrCode] = useState("")
  const [orderId, setOrderId] = useState("")
  
  // 🔥 IDEMPOTENCY KEY - Gerado uma vez e mantido durante toda a sessão
  const [idempotencyKey] = useState(() => crypto.randomUUID())
  
  // Cupom system
  const [cupomInput, setCupomInput] = useState("")
  const [appliedCupom, setAppliedCupom] = useState<string | null>(null)
  const [cupomError, setCupomError] = useState("")
  const [cupomDiscount, setCupomDiscount] = useState(0) // Armazena o valor do desconto
  
  // Form data - Etapa 1
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    cpf: "",
    documentType: "CPF" as "CPF" | "CNPJ",
    companyName: "", // Razão Social (quando CNPJ)
  })

  // Estado para busca de CNPJ
  const [cnpjLoading, setCnpjLoading] = useState(false)
  const [cnpjError, setCnpjError] = useState("")

  // Erros de validação
  const [formErrors, setFormErrors] = useState({
    name: "",
    email: "",
    phone: "",
    cpf: "",
  })

  // Card data - Etapa 3
  const [cardData, setCardData] = useState({
    number: "",
    holderName: "",
    expiry: "", // Formato MM/AA
    cvv: "",
    installments: 1,
  })
  
  // Estado para dados PIX
  const [pixData, setPixData] = useState<{
    qrCode: string
    emv: string
    orderId: string
    expiresAt?: number // Timestamp de expiração
  } | null>(null)
  
  // Contador de tempo do PIX (30 minutos = 1800 segundos)
  const [pixTimeLeft, setPixTimeLeft] = useState(30 * 60)

  // Depoimentos carousel
  const [emblaRef] = useEmblaCarousel(
    { loop: true, align: 'start', skipSnaps: false },
    [Autoplay({ delay: 3000, stopOnInteraction: false })]
  )

  // Cálculos de preço (precisam vir antes do auto-save)
  const basePrice = 36
  const orderBumpsTotal = selectedOrderBumps.reduce((acc, idx) => acc + orderBumps[idx].price, 0)
  const subtotal = basePrice + orderBumpsTotal
  const total = subtotal - cupomDiscount

  // 🔥 AUTO-SAVE: Salva dados enquanto usuário digita (Shadow Save)
  const autoSaveData = {
    customer_name: formData.name,
    customer_email: formData.email,
    customer_phone: formData.phone,
    customer_cpf: formData.cpf,
    cart_total: total,
    payment_method: paymentMethod,
    // Não salvar dados de cartão (PCI DSS)
  }

  const { loadDraft, clearDraft, sessionId } = useAutoSave(autoSaveData, {
    enabled: currentStep <= 2, // Só salva nas etapas 1 e 2
    debounceMs: 1000, // 1 segundo após parar de digitar
    onSaveSuccess: () => {
      console.log('💾 [Checkout] Dados salvos automaticamente')
    },
    onSaveError: (error) => {
      console.error('❌ [Checkout] Erro no auto-save:', error)
    }
  })

  // 🔥 NÍVEL 1: Auto-fill com dados do Supabase (se usuário logado)
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
          // Busca dados extras na tabela profiles (se existir)
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()

          // Determina tipo de documento baseado no tamanho
          const document = profile?.document || profile?.cpf || ''
          const cleanDoc = document.replace(/\D/g, '')
          const docType = cleanDoc.length === 14 ? 'CNPJ' : 'CPF'

          // Preenche formulário automaticamente
          setFormData({
            name: profile?.full_name || user.user_metadata?.full_name || '',
            email: user.email || '',
            phone: profile?.phone || '',
            cpf: document,
            documentType: docType as "CPF" | "CNPJ",
            companyName: profile?.company_name || ''
          })

          console.log('✅ Dados do usuário carregados automaticamente')
        }
      } catch (error) {
        console.log('ℹ️ Usuário não logado - campos vazios')
      }
    }

    loadUserData()
  }, [])

  // 🔥 NÍVEL 2: Recuperar draft salvo (Shadow Save Recovery)
  useEffect(() => {
    const recoverDraft = async () => {
      try {
        const savedDraft = await loadDraft()
        
        if (savedDraft) {
          console.log('📋 [Checkout] Draft encontrado! Recuperando dados...')
          
          // Preenche apenas campos que ainda estão vazios
          setFormData(prev => ({
            name: prev.name || savedDraft.customer_name || '',
            email: prev.email || savedDraft.customer_email || '',
            phone: prev.phone || savedDraft.customer_phone || '',
            cpf: prev.cpf || savedDraft.customer_cpf || '',
            documentType: prev.documentType,
            companyName: prev.companyName
          }))

          if (savedDraft.payment_method) {
            setPaymentMethod(savedDraft.payment_method as "credit" | "pix")
          }

          console.log('✅ [Checkout] Dados recuperados do auto-save!')
        }
      } catch (error) {
        console.error('❌ [Checkout] Erro ao recuperar draft:', error)
      }
    }

    // Aguarda um pouco para não conflitar com o carregamento do usuário
    const timer = setTimeout(recoverDraft, 500)
    return () => clearTimeout(timer)
  }, [loadDraft])

  // Countdown timer (oferta)
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // 🕐 PIX COUNTDOWN: Contador de tempo para expiração do PIX
  useEffect(() => {
    if (!pixData) return // Só ativa quando PIX for gerado
    
    // Reseta o contador quando um novo PIX é gerado
    setPixTimeLeft(30 * 60)
    
    const pixTimer = setInterval(() => {
      setPixTimeLeft((prev) => {
        if (prev <= 0) {
          clearInterval(pixTimer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    
    return () => clearInterval(pixTimer)
  }, [pixData?.orderId]) // Reinicia quando novo PIX é gerado

  // 🎯 REALTIME + POLLING: Escuta pagamento aprovado no Supabase
  useEffect(() => {
    if (!pixData?.orderId) return // Só ativa se tiver PIX gerado

    console.log('👂 Escutando pagamento do pedido:', pixData.orderId)

    // 1️⃣ Realtime (WebSocket - Método principal)
    // 🔥 CORREÇÃO: Buscar por `id` (UUID) pois é isso que o /api/checkout/enterprise retorna
    const channel = supabase
      .channel(`payment-${pixData.orderId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Escuta INSERT, UPDATE e DELETE
          schema: 'public',
          table: 'sales',
          filter: `id=eq.${pixData.orderId}`,
        },
        (payload: any) => {
          console.log('🔔 Mudança detectada no banco:', payload)
          
          const record = payload.new || payload.old
          if (record && (record.status === 'approved' || record.status === 'paid')) {
            console.log('✅ Pagamento APROVADO via Realtime! Redirecionando...')
            
            // 🗑️ Limpar draft (checkout concluído com sucesso)
            clearDraft().catch(err => console.error('❌ Erro ao limpar draft:', err))
            
            // Redireciona para página de obrigado
            router.push(`/obrigado?email=${encodeURIComponent(formData.email)}&order_id=${pixData.orderId}`)
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Status da conexão Realtime:', status)
      })

    // 2️⃣ POLLING DE SEGURANÇA (Fallback a cada 3 segundos)
    // 🔥 Usa API dedicada para garantir acesso aos dados
    const pollingInterval = setInterval(async () => {
      console.log('🔍 Polling: Verificando status do pagamento via API...')
      
      try {
        const response = await fetch(`/api/checkout/check-payment?order_id=${pixData.orderId}`)
        const result = await response.json()
        
        console.log('📊 Polling resultado:', result)

        if (result.is_paid) {
          console.log('✅ Pagamento APROVADO via Polling! Redirecionando...')
          
          // Para o interval imediatamente
          clearInterval(pollingInterval)
          
          // 🎯 Remover carrinho abandonado ao confirmar pagamento
          await markCartAsRecovered(pixData.orderId)
          
          // 🗑️ Limpar draft (checkout concluído com sucesso)
          clearDraft().catch(err => console.error('❌ Erro ao limpar draft:', err))
          
          // Redireciona para página de obrigado
          router.push(`/obrigado?email=${encodeURIComponent(formData.email)}&order_id=${pixData.orderId}`)
        } else {
          console.log(`📊 Polling: Status atual = ${result.status} (aguardando pagamento)`)
        }
      } catch (err) {
        console.error('❌ Erro no polling:', err)
      }
    }, 3000) // Verifica a cada 3 segundos

    // Cleanup ao desmontar
    return () => {
      console.log('🔌 Desconectando Realtime e Polling')
      clearInterval(pollingInterval)
      supabase.removeChannel(channel)
    }
  }, [pixData?.orderId, formData.email, router])

  // 🎯 CAPTURA AUTOMÁTICA: Salva carrinho quando usuário sai da página
  // O status fica como 'pending' - um cron job marcará como 'abandoned' após 5 minutos
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // ✅ Marca como ABANDONADO quando o cliente sai da página sem comprar
      if (formData.email && formData.email.length >= 5) {
        handleSaveAbandonedCart(true)
      }
    }

    // ✅ Salva como PENDING quando muda de aba/fecha tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && formData.email && formData.email.length >= 5) {
        handleSaveAbandonedCart(true)
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [formData.email, formData.name, formData.phone, formData.cpf, selectedOrderBumps, appliedCupom, currentStep])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // Cupons disponíveis - MIGRADO PARA SUPABASE
  // Os cupons agora são gerenciados via banco de dados (/admin/cupons)

  // Order Bumps
  const orderBumps = [
    {
      id: "32989503", // Implementação Assistida
      title: "🚀 Implementação Assistida",
      description: "Instalação completa do sistema + Configuração personalizada + 1 hora de treinamento individual",
      originalPrice: 297,
      price: 97,
      discount: 67,
      highlight: "ECONOMIZE TEMPO",
      badge: "EXCLUSIVO",
    },
    // TEMPORARIAMENTE OCULTOS - Aguardando criação dos produtos
    // {
    //   id: "32989468", // Conteúdo Infinito Instagram
    //   title: "🎯 Conteúdo Infinito para Instagram",
    //   description: "Templates prontos + Calendário editorial + Ideias infinitas de posts para suas redes sociais",
    //   originalPrice: 97,
    //   price: 29.90,
    //   discount: 69,
    //   highlight: "MAIS VENDIDO",
    //   badge: "LIMITADO",
    // },
    // {
    //   id: "32989520", // Análise Inteligente
    //   title: "⚡ Análise Inteligente de Consultas",
    //   description: "IA que analisa seus atendimentos + Sugestões de melhoria + Relatórios automáticos de performance",
    //   originalPrice: 197,
    //   price: 39.90,
    //   discount: 80,
    //   highlight: "TECNOLOGIA IA",
    //   badge: "PREMIUM",
    // },
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

  // Calcula parcelas com JUROS SIMPLES - Lógica Appmax
  // Taxa: 2.49% ao mês (0.0249)
  // 1x: SEM JUROS (valor original)
  // 2x+: Com juros simples
  // Fórmula: ValorTotalComJuros = ValorOriginal * (1 + (0.0249 * NumeroParcelas))
  // ValorParcela = ValorTotalComJuros / NumeroParcelas
  // IMPORTANTE: Cupom é aplicado ANTES do cálculo de parcelas
  const calculateInstallments = () => {
    const TAXA_JUROS = 0.0249 // 2.49% ao mês
    const MAX_PARCELAS = 12
    
    const parcelas = []
    
    for (let numParcelas = 1; numParcelas <= MAX_PARCELAS; numParcelas++) {
      let valorTotalComJuros
      let valorParcela
      
      if (numParcelas === 1) {
        // 1x SEM JUROS - valor original
        valorTotalComJuros = total
        valorParcela = total
      } else {
        // 2x ou mais - aplica juros simples
        valorTotalComJuros = total * (1 + (TAXA_JUROS * numParcelas))
        valorParcela = valorTotalComJuros / numParcelas
      }
      
      parcelas.push({
        numero: numParcelas,
        valorParcela: Number(valorParcela.toFixed(2)),
        valorTotal: Number(valorTotalComJuros.toFixed(2))
      })
    }
    
    return parcelas
  }
  
  const parcelasDisponiveis = calculateInstallments()
  const maxInstallments = parcelasDisponiveis.length
  const creditAllowed = parcelasDisponiveis.length > 0

  useEffect(() => {
    if (parcelasDisponiveis.length === 0) return
    const hasCurrent = parcelasDisponiveis.some((parcela) => parcela.numero === cardData.installments)
    if (!hasCurrent) {
      setCardData((prev) => ({ ...prev, installments: parcelasDisponiveis[0].numero }))
    }
  }, [parcelasDisponiveis, cardData.installments])

  // Validações
  const isStep1Valid = () => {
    const docClean = formData.cpf.replace(/\D/g, '')
    const phoneClean = formData.phone.replace(/\D/g, '')
    
    // Telefone obrigatório (mínimo 10 dígitos: DDD + número)
    const isPhoneValid = phoneClean.length >= 10
    
    // Valida baseado no tipo de documento
    if (formData.documentType === 'CNPJ') {
      return (
        formData.name && 
        formData.email && 
        formData.cpf && 
        formData.companyName && // Razão Social obrigatória para CNPJ
        isPhoneValid &&
        docClean.length === 14 && 
        validateCNPJ(docClean) && 
        !formErrors.cpf
      )
    }
    
    return (
      formData.name && 
      formData.email && 
      formData.cpf && 
      isPhoneValid &&
      docClean.length === 11 && 
      validateCPF(docClean) && 
      !formErrors.cpf
    )
  }

  // Função para buscar dados do CNPJ
  const handleCNPJLookup = async () => {
    const cnpjClean = formData.cpf.replace(/\D/g, '')
    
    if (cnpjClean.length !== 14) {
      setCnpjError('Digite o CNPJ completo para consultar')
      return
    }

    if (!validateCNPJ(cnpjClean)) {
      setCnpjError('CNPJ inválido')
      return
    }

    setCnpjLoading(true)
    setCnpjError('')

    try {
      const result = await consultarCNPJ(cnpjClean)
      
      if (result.success && result.data) {
        setFormData(prev => ({
          ...prev,
          companyName: result.data!.razaoSocial,
          // Se quiser preencher o nome do responsável com o nome fantasia
          // name: result.data!.nomeFantasia || prev.name,
        }))
        setCnpjError('')
        console.log('✅ Dados do CNPJ carregados:', result.data)
      } else {
        setCnpjError(result.error || 'Não foi possível consultar o CNPJ')
      }
    } catch (error) {
      console.error('Erro ao consultar CNPJ:', error)
      setCnpjError('Erro ao consultar CNPJ. Preencha manualmente.')
    } finally {
      setCnpjLoading(false)
    }
  }

  const isStep3Valid = () => {
    if (paymentMethod === "pix") return true
    // Verifica se expiry tem formato MM/AA (5 caracteres)
    return cardData.number && cardData.holderName && cardData.expiry.length === 5 && cardData.cvv
  }

  const formatPaymentError = (error: any) => {
    const rawMessage = typeof error === 'string' ? error : error?.message || ''
    let message = rawMessage

    const jsonStart = rawMessage.indexOf('{')
    if (jsonStart >= 0) {
      try {
        const parsed = JSON.parse(rawMessage.slice(jsonStart))
        message = parsed.text || parsed.error || parsed.message || rawMessage
      } catch {
        message = rawMessage
      }
    }

    const normalized = message.toLowerCase()

    if (normalized.includes('cpf inválido')) {
      return 'CPF inválido. Verifique o número e tente novamente.'
    }

    if (normalized.includes('dados obrigatórios')) {
      return 'Preencha nome, e-mail e CPF para continuar.'
    }

    if (normalized.includes('token') && normalized.includes('appmax')) {
      return 'Configuração do pagamento incompleta. Verifique as credenciais do gateway.'
    }

    return message || 'Erro ao processar pagamento. Tente novamente.'
  }

  // Aplicar cupom - ATUALIZADO PARA USAR SUPABASE
  const applyCupom = async () => {
    const cupomUpper = cupomInput.toUpperCase().trim()
    
    if (!cupomUpper) {
      setCupomError("Digite um cupom")
      return
    }
    
    try {
      setCupomError("Validando...")
      
      const response = await fetch('/api/checkout/validate-coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          code: cupomUpper, 
          cartTotal: subtotal 
        }),
      })
      
      const data = await response.json()
      
      if (response.ok && data.valid) {
        setAppliedCupom(cupomUpper)
        setCupomDiscount(data.discountAmount || 0) // Salva o valor do desconto
        setCupomError("")
        setCupomInput("")
      } else {
        setCupomError(data.errorMessage || "Cupom inválido")
        setAppliedCupom(null)
        setCupomDiscount(0)
      }
    } catch (error) {
      console.error('Erro ao validar cupom:', error)
      setCupomError("Erro ao validar cupom. Tente novamente.")
      setAppliedCupom(null)
      setCupomDiscount(0)
    }
  }

  // Remover cupom
  const removeCupom = () => {
    setAppliedCupom(null)
    setCupomInput("")
    setCupomError("")
    setCupomDiscount(0)
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

  // 🎯 CARRINHO ABANDONADO: Salva automaticamente quando usuário preenche dados
  // markAsAbandoned = true apenas quando cliente SAIR da página (beforeunload/visibilitychange)
  const handleSaveAbandonedCart = async (markAsAbandoned: boolean | React.FocusEvent = false) => {
    // Se for um evento (onBlur), ignora o parâmetro e usa false
    const shouldMarkAbandoned = typeof markAsAbandoned === 'boolean' ? markAsAbandoned : false
    
    // ✅ Salva com QUALQUER dado preenchido (mesmo parcial)
    const hasAnyData = formData.name || formData.email || formData.phone || formData.cpf
    
    if (!hasAnyData) {
      console.log('⚠️ Nenhum dado preenchido ainda, não salvando carrinho')
      return
    }

    // Gerar email temporário se não tiver (para não violar constraint)
    const sessionId = sessionStorage.getItem('session_id') || `session_${Date.now()}`
    const emailToSave = formData.email || `carrinho_${sessionId}@temp.local`

    console.log(shouldMarkAbandoned ? '🚨 Marcando como ABANDONADO...' : '💾 Salvando carrinho (pending)...', {
      name: formData.name,
      email: emailToSave,
      phone: formData.phone,
      cpf: formData.cpf
    })

    const selectedBumpProducts = selectedOrderBumps.map(index => ({
      product_id: orderBumps[index].id,
      name: orderBumps[index].title,
      price: orderBumps[index].price
    }))

    await saveAbandonedCart({
      customer_name: formData.name || undefined,
      customer_email: emailToSave,
      customer_phone: formData.phone || undefined,
      customer_cpf: formData.cpf || undefined,
      document_type: formData.documentType, // CPF ou CNPJ
      step: currentStep === 1 ? 'form_filled' : currentStep === 3 ? 'payment_started' : 'form_filled',
      product_id: process.env.NEXT_PUBLIC_APPMAX_PRODUCT_ID || '32991339',
      order_bumps: selectedBumpProducts,
      discount_code: appliedCupom || undefined,
      cart_value: total,
      markAsAbandoned: shouldMarkAbandoned, // ✅ Só marca abandoned quando cliente sai
    })
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
      
      // Prepara payload base
      const sessionId =
        (typeof window !== 'undefined' && localStorage.getItem('analytics_session_id')) ||
        (typeof window !== 'undefined' && sessionStorage.getItem('session_id')) ||
        `session_${Date.now()}`

      const utmParams = {
        utm_source: typeof window !== 'undefined' ? sessionStorage.getItem('utm_source') || undefined : undefined,
        utm_medium: typeof window !== 'undefined' ? sessionStorage.getItem('utm_medium') || undefined : undefined,
        utm_campaign: typeof window !== 'undefined' ? sessionStorage.getItem('utm_campaign') || undefined : undefined,
        utm_content: typeof window !== 'undefined' ? sessionStorage.getItem('utm_content') || undefined : undefined,
        utm_term: typeof window !== 'undefined' ? sessionStorage.getItem('utm_term') || undefined : undefined,
      }

      // 🔒 Obter Device ID para análise antifraude (obrigatório MP)
      const deviceId = getDeviceId()

      // Formato enterprise: customer object + amount
      const payload: any = {
        customer: {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          cpf: formData.cpf.replace(/\D/g, ''),
          documentType: formData.documentType, // CPF ou CNPJ
          companyName: formData.documentType === 'CNPJ' ? formData.companyName : undefined, // Razão Social
        },
        amount: total,
        payment_method: paymentMethod === 'credit' ? 'credit_card' : 'pix',
        orderBumps: selectedBumpProducts,
        discount: cupomDiscount > 0 ? cupomDiscount : undefined,
        coupon_code: appliedCupom || undefined,
        session_id: sessionId,
        utm_params: utmParams,
        device_id: deviceId, // 🔒 Device ID para antifraude MP
      }
      
      // 🔐 TOKENIZAÇÃO SEGURA - Se for cartão, tokeniza com Mercado Pago
      if (paymentMethod === 'credit') {
        console.log('🔐 Tokenizando cartão com Mercado Pago...')
        
        // Extrair mês e ano do formato MM/AA
        const [expMonth, expYear] = cardData.expiry.split('/')
        
        const token = await createCardToken({
          cardNumber: cardData.number,
          cardholderName: cardData.holderName || formData.name,
          cardExpirationMonth: expMonth,
          cardExpirationYear: expYear, // Já está em 2 dígitos (AA)
          securityCode: cardData.cvv,
          identificationType: formData.documentType, // CPF ou CNPJ
          identificationNumber: formData.cpf,
        })

        console.log('✅ Token gerado:', token.id)
        
        payload.mpToken = token.id
        payload.installments = cardData.installments
        
        // 🔄 CASCATA: Enviar dados do cartão para AppMax como fallback
        // AppMax não usa tokens do Mercado Pago, precisa dos dados brutos
        payload.appmax_data = {
          payment_method: 'credit_card',
          card_data: {
            number: cardData.number.replace(/\s/g, ''),
            holder_name: cardData.holderName || formData.name,
            exp_month: expMonth,
            exp_year: `20${expYear}`, // AppMax aceita 4 dígitos (20AA)
            cvv: cardData.cvv,
            installments: cardData.installments || 1,
          },
          order_bumps: selectedBumpProducts,
        }
      }
      
      const response = await fetch('/api/checkout/enterprise', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey // 🔥 Previne cobranças duplicadas
        },
        body: JSON.stringify({
          ...payload,
          idempotencyKey // Também envia no body para compatibilidade
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao processar pagamento')
      }

      // Processa resposta da API
      if (result.success) {
        // Incrementar uso do cupom se houver
        if (appliedCupom) {
          try {
            await fetch('/api/coupons/increment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                code: appliedCupom,
                orderId: result.order_id 
              }),
            })
            console.log('✅ Uso do cupom incrementado')
          } catch (error) {
            console.error('Erro ao incrementar cupom:', error)
            // Não bloqueia o fluxo se falhar
          }
        }
        
        if (paymentMethod === 'pix') {
          // Armazena dados do PIX para exibir nativamente
          if (result.pix_qr_code && result.pix_emv) {
            console.log('✅ PIX gerado com sucesso')
            
            setPixData({
              qrCode: result.pix_qr_code,
              emv: result.pix_emv,
              orderId: result.order_id
            })
            setLoading(false)
            return
          }
          
          // Se não retornou dados do PIX, erro
          console.error('❌ Resposta da API:', result)
          throw new Error('API não retornou dados do PIX')
        } else if (paymentMethod === 'credit') {
          // 🎯 Marcar carrinho como recuperado
          await markCartAsRecovered(result.order_id)
          
          // Redireciona para página de obrigado
          window.location.href = `/obrigado?email=${encodeURIComponent(formData.email)}&order_id=${result.order_id}`
        } else {
          throw new Error('Método de pagamento inválido')
        }
      }
    } catch (error: any) {
      console.error('Erro no checkout:', error)
      alert(formatPaymentError(error))
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-brand-50">
      
      {/* Banner de Escassez no Topo */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-red-600 via-red-500 to-orange-500 text-white shadow-2xl">
        <div className="container mx-auto px-4 py-3 md:py-4">
          <div className="flex items-center justify-center md:justify-between gap-4 flex-wrap">
            {/* Contador - Centralizado no mobile */}
            <div className="flex items-center gap-2 md:gap-3">
              <Clock className="w-5 h-5 md:w-6 md:h-6 animate-pulse" />
              <div className="flex items-baseline gap-2">
                <span className="text-sm md:text-base font-bold">Oferta expira em:</span>
                <span className="text-2xl md:text-4xl font-black tabular-nums tracking-tight">
                  {formatTime(timeLeft)}
                </span>
              </div>
            </div>

            {/* Infos importantes - APENAS DESKTOP */}
            <div className="hidden md:flex items-center gap-4 md:gap-6 text-xs md:text-sm">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span className="font-semibold">Compra 100% Segura</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                <span className="font-semibold">Acesso Imediato</span>
              </div>
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4" />
                <span className="font-semibold">4 Bônus Grátis</span>
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
      <div className="h-16 md:h-24"></div>

      {/* Main Content */}
      <div className="container mx-auto max-w-7xl px-3 sm:px-4 py-6 md:py-12 pt-12 md:pt-16">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 md:mb-12"
        >
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-brand-500 to-brand-600 text-white px-4 sm:px-6 py-2 rounded-full text-xs sm:text-sm font-bold mb-4 shadow-lg">
            <Lock className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>Checkout Seguro SSL</span>
          </div>
          
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-gray-900 mb-3 px-4">
            Complete seu Pedido
          </h1>
          <p className="text-xs sm:text-sm md:text-base lg:text-lg text-gray-600 max-w-2xl mx-auto px-4 leading-tight">
            Economize <span className="text-brand-600 font-bold whitespace-nowrap">3h/dia</span> com o Método Gravador Médico
          </p>
        </motion.div>

        {/* Progress Steps */}
        <div className="max-w-3xl mx-auto mb-12">
          <div className="flex items-center justify-between">
            {[
              { number: 1, label: "Seus Dados", icon: User },
              { number: 2, label: "Complementos", icon: Gift },
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
          <div className="lg:col-span-2 space-y-6 min-w-0 order-2 lg:order-1">
            
            <AnimatePresence mode="wait">
              
              {/* ETAPA 1: DADOS PESSOAIS */}
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="bg-white rounded-2xl md:rounded-3xl shadow-xl p-4 sm:p-6 md:p-8 border-2 border-brand-100 overflow-hidden"
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

                  <div className="space-y-4 min-w-0">
                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-2">
                        Nome Completo *
                      </label>
                      <input
                        type="text"
                        name="name"
                        autoComplete="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        onBlur={handleSaveAbandonedCart}
                        className="w-full max-w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-xl focus:border-brand-500 focus:outline-none transition-colors text-sm md:text-base box-border"
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
                        name="email"
                        autoComplete="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        onBlur={handleSaveAbandonedCart}
                        className="w-full max-w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-xl focus:border-brand-500 focus:outline-none transition-colors text-sm md:text-base box-border"
                        placeholder="seu@email.com"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0">
                      <div className="min-w-0">
                        <label className="block text-sm font-bold text-gray-900 mb-2">
                          Telefone *
                        </label>
                        <input
                          type="tel"
                          name="phone"
                          autoComplete="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                          onBlur={handleSaveAbandonedCart}
                          className="w-full max-w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-xl focus:border-brand-500 focus:outline-none transition-colors text-sm md:text-base box-border"
                          placeholder="(11) 99999-9999"
                          maxLength={15}
                          required
                        />
                      </div>

                      {/* SELETOR CPF/CNPJ - DESATIVADO TEMPORARIAMENTE POR QUESTÕES FISCAIS
                          Para reativar, descomente este bloco e comente o campo CPF fixo abaixo
                      
                      <div className="min-w-0">
                        <label className="block text-sm font-bold text-gray-900 mb-2">
                          Tipo de Documento *
                        </label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, documentType: 'CPF', cpf: '', companyName: '' })
                              setFormErrors({ ...formErrors, cpf: '' })
                              setCnpjError('')
                            }}
                            className={`flex-1 py-2.5 sm:py-3 px-3 rounded-xl border-2 font-semibold text-sm transition-all ${
                              formData.documentType === 'CPF'
                                ? 'bg-brand-50 border-brand-500 text-brand-700'
                                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                            }`}
                          >
                            CPF
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, documentType: 'CNPJ', cpf: '', companyName: '' })
                              setFormErrors({ ...formErrors, cpf: '' })
                              setCnpjError('')
                            }}
                            className={`flex-1 py-2.5 sm:py-3 px-3 rounded-xl border-2 font-semibold text-sm transition-all ${
                              formData.documentType === 'CNPJ'
                                ? 'bg-brand-50 border-brand-500 text-brand-700'
                                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                            }`}
                          >
                            CNPJ
                          </button>
                        </div>
                      </div>
                    </div>
                    FIM DO SELETOR CPF/CNPJ DESATIVADO */}
                    </div>

                    {/* Campo CPF - Versão simplificada (apenas CPF) */}
                    <div className="min-w-0">
                      <label className="block text-sm font-bold text-gray-900 mb-2">
                        CPF *
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          name="cpf"
                          autoComplete="off"
                          value={formData.cpf}
                          onChange={(e) => {
                            const formatted = formatCPF(e.target.value)
                            setFormData({ ...formData, cpf: formatted })
                            if (formErrors.cpf) {
                              setFormErrors({ ...formErrors, cpf: "" })
                            }
                          }}
                          onBlur={(e) => {
                            handleSaveAbandonedCart()
                            const doc = e.target.value.replace(/\D/g, '')
                            if (doc.length === 11 && !validateCPF(doc)) {
                              setFormErrors({ ...formErrors, cpf: "CPF inválido" })
                            } else if (doc.length > 0 && doc.length < 11) {
                              setFormErrors({ ...formErrors, cpf: "CPF incompleto" })
                            } else {
                              setFormErrors({ ...formErrors, cpf: "" })
                            }
                          }}
                          className={`w-full max-w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 ${
                            formErrors.cpf ? 'border-red-500' : 'border-gray-200'
                          } rounded-xl focus:border-brand-500 focus:outline-none transition-colors text-sm md:text-base box-border`}
                          placeholder="000.000.000-00"
                          maxLength={14}
                          required
                        />
                      </div>
                      {formErrors.cpf && (
                        <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          {formErrors.cpf}
                        </p>
                      )}
                    </div>

                    {/* CAMPO CPF/CNPJ COM CONSULTA AUTOMÁTICA - DESATIVADO TEMPORARIAMENTE
                    <div className="min-w-0">
                      <label className="block text-sm font-bold text-gray-900 mb-2">
                        {formData.documentType === 'CNPJ' ? 'CNPJ *' : 'CPF *'}
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          name="document"
                          autoComplete="off"
                          value={formData.cpf}
                          onChange={async (e) => {
                            const formatted = formData.documentType === 'CNPJ' 
                              ? formatCNPJ(e.target.value) 
                              : formatCPF(e.target.value)
                            setFormData({ ...formData, cpf: formatted })
                            // Limpa erro ao digitar
                            if (formErrors.cpf) {
                              setFormErrors({ ...formErrors, cpf: "" })
                            }
                            
                            // 🔥 CONSULTA AUTOMÁTICA: Quando CNPJ completo (14 dígitos)
                            const docClean = formatted.replace(/\D/g, '')
                            if (formData.documentType === 'CNPJ' && docClean.length === 14) {
                              // Valida antes de consultar
                              if (validateCNPJ(docClean)) {
                                setCnpjLoading(true)
                                setCnpjError('')
                                try {
                                  const result = await consultarCNPJ(docClean)
                                  if (result.success && result.data) {
                                    setFormData(prev => ({
                                      ...prev,
                                      cpf: formatted,
                                      companyName: result.data!.razaoSocial,
                                    }))
                                    console.log('✅ Razão Social preenchida automaticamente:', result.data.razaoSocial)
                                  } else {
                                    setCnpjError(result.error || 'Não foi possível consultar')
                                  }
                                } catch (error) {
                                  setCnpjError('Erro ao consultar CNPJ')
                                } finally {
                                  setCnpjLoading(false)
                                }
                                }
                              }
                            }}
                            onBlur={(e) => {
                              handleSaveAbandonedCart()
                              const doc = e.target.value.replace(/\D/g, '')
                              
                              if (formData.documentType === 'CNPJ') {
                                // Valida CNPJ
                                if (doc.length === 14 && !validateCNPJ(doc)) {
                                  setFormErrors({ ...formErrors, cpf: "CNPJ inválido" })
                                } else if (doc.length > 0 && doc.length < 14) {
                                  setFormErrors({ ...formErrors, cpf: "CNPJ incompleto" })
                                } else {
                                  setFormErrors({ ...formErrors, cpf: "" })
                                }
                              } else {
                                // Valida CPF
                                if (doc.length === 11 && !validateCPF(doc)) {
                                  setFormErrors({ ...formErrors, cpf: "CPF inválido" })
                                } else if (doc.length > 0 && doc.length < 11) {
                                  setFormErrors({ ...formErrors, cpf: "CPF incompleto" })
                                } else {
                                  setFormErrors({ ...formErrors, cpf: "" })
                                }
                              }
                            }}
                            className={`w-full max-w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 ${
                              formErrors.cpf ? 'border-red-500' : 'border-gray-200'
                            } rounded-xl focus:border-brand-500 focus:outline-none transition-colors text-sm md:text-base box-border`}
                            placeholder={formData.documentType === 'CNPJ' ? "00.000.000/0000-00" : "000.000.000-00"}
                            maxLength={formData.documentType === 'CNPJ' ? 18 : 14}
                            required
                          />
                          {cnpjLoading && (
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                              <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
                            </div>
                          )}
                        </div>
                        {formErrors.cpf && (
                          <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" />
                            {formErrors.cpf}
                          </p>
                        )}
                        {cnpjError && !formErrors.cpf && (
                          <p className="text-amber-600 text-xs mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {cnpjError}
                          </p>
                        )}
                    </div>

                    {formData.documentType === 'CNPJ' && (
                      <div className="min-w-0">
                        <label className="block text-sm font-bold text-gray-900 mb-2">
                          <Building2 className="w-4 h-4 inline mr-1" />
                          Razão Social *
                        </label>
                        <input
                          type="text"
                          name="companyName"
                          autoComplete="organization"
                          value={formData.companyName}
                          onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                          onBlur={handleSaveAbandonedCart}
                          className="w-full max-w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-xl focus:border-brand-500 focus:outline-none transition-colors text-sm md:text-base box-border"
                          placeholder="Nome da empresa conforme CNPJ"
                          required
                        />
                        {cnpjLoading && (
                          <p className="text-xs text-brand-600 mt-1 flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Buscando dados do CNPJ...
                          </p>
                        )}
                        {!cnpjLoading && !formData.companyName && (
                          <p className="text-xs text-gray-500 mt-1">
                            Preenchido automaticamente ao digitar o CNPJ completo
                          </p>
                        )}
                      </div>
                    )}
                    FIM DO CAMPO CPF/CNPJ COM CONSULTA AUTOMÁTICA - DESATIVADO */}
                  </div>

                  <button
                    onClick={() => isStep1Valid() && setCurrentStep(2)}
                    disabled={!isStep1Valid()}
                    className="w-full mt-4 md:mt-6 bg-gradient-to-r from-brand-600 to-brand-500 text-white py-3 md:py-4 rounded-xl font-black text-base md:text-lg hover:from-brand-700 hover:to-brand-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                  >
                    <span>Continuar</span>
                    <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
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
                  <div className="bg-white rounded-2xl md:rounded-3xl shadow-xl p-4 sm:p-6 md:p-8 border-2 border-brand-100">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                        <Gift className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl md:text-2xl font-black text-gray-900">Complementos</h2>
                        <p className="text-xs md:text-sm text-gray-600">Aproveite estas ofertas exclusivas por tempo limitado!</p>
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
                  <div className="bg-white rounded-2xl md:rounded-3xl shadow-xl p-4 sm:p-6 md:p-8 border-2 border-brand-100">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl md:text-2xl font-black text-gray-900">Pagamento</h2>
                        <p className="text-xs md:text-sm text-gray-600">Escolha a forma de pagamento</p>
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
                            name="cardnumber"
                            autoComplete="cc-number"
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
                            name="ccname"
                            autoComplete="cc-name"
                            value={cardData.holderName}
                            onChange={(e) => setCardData({ ...cardData, holderName: e.target.value.toUpperCase() })}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-brand-500 focus:outline-none transition-colors"
                            placeholder="NOME COMO NO CARTÃO"
                            required
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-bold text-gray-900 mb-2">
                              Validade *
                            </label>
                            <input
                              type="text"
                              name="cc-exp"
                              autoComplete="cc-exp"
                              value={cardData.expiry}
                              onChange={(e) => {
                                // Formatar como MM/AA
                                let value = e.target.value.replace(/\D/g, '').slice(0, 4)
                                if (value.length >= 2) {
                                  value = value.slice(0, 2) + '/' + value.slice(2)
                                }
                                setCardData({ ...cardData, expiry: value })
                              }}
                              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-brand-500 focus:outline-none transition-colors"
                              placeholder="MM/AA"
                              maxLength={5}
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-bold text-gray-900 mb-2">
                              CVV *
                            </label>
                            <input
                              type="text"
                              name="cc-csc"
                              autoComplete="cc-csc"
                              value={cardData.cvv}
                              onChange={(e) => setCardData({ ...cardData, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-brand-500 focus:outline-none transition-colors"
                              placeholder="123"
                              maxLength={4}
                              required
                            />
                          </div>
                        </div>

                        {/* Parcelas */}
                        <div>
                          <label className="block text-sm font-bold text-gray-900 mb-2">
                            Parcelas *
                          </label>
                          <select
                            value={cardData.installments}
                            onChange={(e) => setCardData({ ...cardData, installments: parseInt(e.target.value) })}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-brand-500 focus:outline-none transition-colors bg-white"
                            required
                          >
                            {parcelasDisponiveis.length > 0 ? (
                              parcelasDisponiveis.map((parcela) => (
                                <option key={parcela.numero} value={parcela.numero}>
                                  {parcela.numero}x de R$ {parcela.valorParcela.toFixed(2).replace('.', ',')}
                                  {parcela.numero === 1 ? ' sem juros' : ` (Total: R$ ${parcela.valorTotal.toFixed(2).replace('.', ',')})`}
                                </option>
                              ))
                            ) : (
                              <option value="">Sem opções</option>
                            )}
                          </select>
                          <p className="text-xs text-gray-500 mt-1">
                            Parcelamento em até {maxInstallments}x • Taxa: 2,49% a.m.
                          </p>
                        </div>
                      </motion.div>
                    )}

                    {/* Mensagem PIX com dados do recebedor */}
                    {paymentMethod === "pix" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="bg-gradient-to-br from-brand-50 to-green-50 border-2 border-brand-200 rounded-xl p-4 space-y-3"
                      >
                        {/* Informação principal */}
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

                        {/* DADOS DO RECEBEDOR - COMENTADO (manter salvo para uso futuro)
                        <div className="bg-white/80 rounded-lg p-3 border border-brand-100">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                            VOCÊ PAGARÁ PARA
                          </p>
                          <p className="font-bold text-gray-900 text-sm">
                            HDM CONSULTORIA IMOBILIARIA E SEGUROS LTDA
                          </p>
                          <p className="text-xs text-brand-600 mb-3">
                            Empresa gestora de tecnologia e processamento de pagamentos
                          </p>
                          
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <p className="text-gray-500">CNPJ</p>
                              <p className="font-medium text-gray-800">50.216.907/0001-60</p>
                            </div>
                            <div>
                              <p className="text-gray-500">INSTITUIÇÃO</p>
                              <p className="font-medium text-gray-800">MERCADO PAGO</p>
                            </div>
                          </div>
                        </div>
                        */}

                        {/* Selo de segurança */}
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <ShieldCheck className="w-4 h-4 text-green-600" />
                          <span>Pagamento instantâneo e 100% seguro</span>
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
            <div className="bg-white rounded-2xl md:rounded-3xl shadow-xl p-4 sm:p-6 md:p-8 border-2 border-brand-100">
              <h3 className="text-lg md:text-xl font-black text-gray-900 mb-6 text-center">
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
          <div className="lg:col-span-1 order-1 lg:order-2">
            <div className="sticky top-24">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl md:rounded-3xl shadow-xl p-4 sm:p-6 border-2 border-brand-100"
              >
                <h3 className="text-xl md:text-2xl font-black text-gray-900 mb-4 md:mb-6">Resumo do Pedido</h3>

                {/* Produto Principal */}
                <div className="mb-4 md:mb-6 pb-4 md:pb-6 border-b-2 border-gray-100">
                  <div className="flex items-start gap-3 md:gap-4">
                    <div className="w-14 h-14 md:w-20 md:h-20 bg-gradient-to-br from-brand-500 to-brand-600 rounded-xl flex items-center justify-center flex-shrink-0">
                      <img 
                        src="/images/novo-icon-gravadormedico.png" 
                        alt="Gravador Médico" 
                        className="w-9 h-9 md:w-12 md:h-12 object-contain"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-base md:text-lg text-gray-900 mb-1">Método Gravador Médico</h4>
                      <p className="text-sm md:text-base text-gray-600 leading-relaxed">
                        Sistema Completo<br />+ 4 Bônus
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="text-gray-400 line-through text-sm md:text-base">R$ 938</div>
                        <div className="text-2xl md:text-3xl font-black text-brand-600">R$ {basePrice}</div>
                      </div>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="mt-3 md:mt-4 space-y-2">
                    {[
                      "Acesso Imediato e Vitalício",
                      "4 Bônus Exclusivos Inclusos",
                      "Garantia de 7 Dias",
                      "Suporte por 30 Dias",
                    ].map((feature, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm md:text-base">
                        <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 text-brand-600 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Order Bumps Selecionados */}
                {selectedOrderBumps.length > 0 && (
                  <div className="mb-4 md:mb-6 pb-4 md:pb-6 border-b-2 border-gray-100">
                    <h4 className="font-bold text-sm md:text-base text-gray-900 mb-3">Extras Selecionados:</h4>
                    {selectedOrderBumps.map((idx) => (
                      <div key={idx} className="flex items-center justify-between mb-2 md:mb-3 text-xs md:text-sm">
                        <span className="text-gray-700 truncate pr-2">{orderBumps[idx].title.substring(0, 25)}...</span>
                        <span className="font-bold text-brand-600 whitespace-nowrap">R$ {orderBumps[idx].price}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Campo Cupom */}
                <div className="mb-4 md:mb-6 pb-4 md:pb-6 border-b-2 border-gray-100">
                  <h4 className="font-bold text-sm md:text-base text-gray-900 mb-3">Possui cupom de desconto?</h4>
                  
                  {appliedCupom ? (
                    <div className="bg-green-50 border-2 border-green-500 rounded-xl p-3 md:p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 text-green-600" />
                          <span className="font-bold text-green-900 text-sm md:text-base">{appliedCupom}</span>
                        </div>
                        <button
                          onClick={removeCupom}
                          className="text-green-700 hover:text-green-900 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-xs md:text-sm text-green-700 font-semibold">
                        Você economizou R$ {cupomDiscount.toFixed(2)}! 🎉
                      </p>
                    </div>
                  ) : (
                    <div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={cupomInput}
                          onChange={(e) => {
                            setCupomInput(e.target.value.toUpperCase())
                            setCupomError("")
                          }}
                          onKeyPress={(e) => e.key === 'Enter' && applyCupom()}
                          placeholder="Digite seu cupom"
                          className="flex-1 px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:border-brand-500 focus:outline-none transition-colors"
                        />
                        <button
                          onClick={applyCupom}
                          className="px-4 py-2 bg-brand-600 text-white text-sm font-bold rounded-lg hover:bg-brand-700 transition-colors whitespace-nowrap"
                        >
                          Aplicar
                        </button>
                      </div>
                      {cupomError && (
                        <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {cupomError}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Totais */}
                <div className="space-y-2 md:space-y-3 mb-4 md:mb-6">
                  <div className="flex items-center justify-between text-sm md:text-base text-gray-700">
                    <span>Subtotal</span>
                    <span className="font-bold">R$ {subtotal.toFixed(2)}</span>
                  </div>
                  
                  {cupomDiscount > 0 && (
                    <div className="flex items-center justify-between text-sm md:text-base text-green-600">
                      <span className="font-semibold">Desconto</span>
                      <span className="font-bold">- R$ {cupomDiscount.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="pt-2 md:pt-3 border-t-2 border-gray-100">
                    <div className="flex items-center justify-between text-xl md:text-2xl font-black">
                      <span className="text-gray-900">Total</span>
                      <span className="text-brand-600">R$ {total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Selos de Segurança */}
                <div className="space-y-2 md:space-y-3 pt-4 md:pt-6 border-t-2 border-gray-100">
                  {[
                    { icon: Shield, text: "Compra 100% Segura SSL" },
                    { icon: Lock, text: "Seus dados protegidos" },
                    { icon: CheckCircle2, text: "Garantia de 7 dias" },
                  ].map((item, index) => (
                    <div key={index} className="flex items-center gap-2 md:gap-3 text-xs md:text-sm text-gray-600">
                      <item.icon className="w-4 h-4 md:w-5 md:h-5 text-brand-600 flex-shrink-0" />
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

      {/* Tela de Sucesso PIX - Nativa */}
      <AnimatePresence>
        {pixData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gradient-to-br from-brand-50 via-white to-brand-50 z-40 overflow-y-auto"
          >
            {/* Mantém o Header do checkout */}
            <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-red-600 via-red-500 to-orange-500 text-white shadow-2xl">
              <div className="container mx-auto px-4 py-4">
                <div className="flex items-center justify-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="font-bold">Compra 100% Segura</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    <span className="font-bold">Acesso Imediato</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Gift className="w-5 h-5" />
                    <span className="font-bold">4 Bônus Grátis</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Conteúdo PIX */}
            <div className="min-h-screen pt-28 md:pt-24 pb-12 px-4">
              <div className="container mx-auto max-w-2xl">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center mb-8"
                >
                  <div className="inline-flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-full text-lg font-bold mb-4 shadow-lg">
                    <CheckCircle2 className="w-6 h-6" />
                    <span>Pedido Reservado!</span>
                  </div>
                  <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-3">
                    Complete seu Pagamento
                  </h1>
                  <p className="text-gray-600 text-lg">
                    Efetue o pagamento via PIX para confirmar seu acesso
                  </p>
                </motion.div>

                {/* Card PIX */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white rounded-3xl shadow-2xl p-6 md:p-8 border-4 border-brand-100"
                >
                  {/* Pix Copia e Cola - PRIMEIRO */}
                  <div className="mb-8">
                    <h3 className="text-xl font-black text-gray-900 mb-4 text-center">
                      Pix Copia e Cola
                    </h3>
                    <div className="relative">
                      <input
                        type="text"
                        value={pixData.emv}
                        readOnly
                        className="w-full px-4 py-4 pr-12 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm font-mono text-gray-700 focus:outline-none focus:border-brand-500 transition-colors"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(pixData.emv)
                          alert("Código PIX copiado!")
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-200 rounded-lg transition-colors group"
                      >
                        <Copy className="w-5 h-5 text-gray-600 group-hover:text-brand-600" />
                      </button>
                    </div>
                    <p className="text-sm text-gray-600 mt-3 text-center">
                      Copie o código e cole no app do seu banco
                    </p>
                  </div>

                  {/* Separador */}
                  <div className="relative my-8">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t-2 border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-white text-gray-500 font-bold">OU</span>
                    </div>
                  </div>

                  {/* QR Code - DEPOIS */}
                  <div className="flex flex-col items-center mb-8">
                    <h3 className="text-xl font-black text-gray-900 mb-4">
                      Escaneie o QR Code
                    </h3>
                    <div className="bg-white p-4 rounded-2xl border-4 border-gray-100 shadow-lg">
                      <img
                        src={`data:image/png;base64,${pixData.qrCode}`}
                        alt="QR Code PIX"
                        className="w-64 h-64 md:w-72 md:h-72"
                      />
                    </div>
                    <p className="text-sm text-gray-600 mt-4 text-center">
                      Abra o app do seu banco e escaneie o código
                    </p>
                  </div>

                  {/* ⏱️ CONTADOR DE EXPIRAÇÃO PIX */}
                  <div className={`rounded-2xl p-4 mb-6 text-center ${pixTimeLeft <= 300 ? 'bg-red-100 border-2 border-red-300' : 'bg-amber-100 border-2 border-amber-300'}`}>
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Clock className={`w-6 h-6 ${pixTimeLeft <= 300 ? 'text-red-600 animate-pulse' : 'text-amber-600'}`} />
                      <span className={`text-lg font-black ${pixTimeLeft <= 300 ? 'text-red-700' : 'text-amber-700'}`}>
                        {pixTimeLeft <= 0 ? (
                          'PIX EXPIRADO'
                        ) : (
                          <>
                            Expira em {String(Math.floor(pixTimeLeft / 60)).padStart(2, '0')}:{String(pixTimeLeft % 60).padStart(2, '0')}
                          </>
                        )}
                      </span>
                    </div>
                    <p className={`text-sm ${pixTimeLeft <= 300 ? 'text-red-600' : 'text-amber-600'}`}>
                      {pixTimeLeft <= 0 ? 'Gere um novo PIX para continuar' : 'Complete o pagamento antes do tempo acabar'}
                    </p>
                  </div>

                  {/* Informações */}
                  <div className="bg-brand-50 rounded-2xl p-6 space-y-3">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-gray-900">Pagamento detectado automaticamente</p>
                        <p className="text-sm text-gray-600">Assim que pagar, você será redirecionado</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Shield className="w-5 h-5 text-brand-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-gray-900">Pagamento 100% seguro</p>
                        <p className="text-sm text-gray-600">Seus dados estão protegidos</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Zap className="w-5 h-5 text-brand-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-gray-900">Acesso instantâneo</p>
                        <p className="text-sm text-gray-600">Receba tudo por email assim que confirmar</p>
                      </div>
                    </div>
                  </div>

                  {/* Ordem */}
                  <div className="mt-6 pt-6 border-t-2 border-gray-100">
                    <p className="text-sm text-gray-500 text-center">
                      Pedido #{pixData.orderId}
                    </p>
                  </div>
                </motion.div>

                {/* Aguardando pagamento */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="mt-8 text-center"
                >
                  <div className="inline-flex items-center gap-2 text-gray-600">
                    <div className="w-2 h-2 bg-brand-600 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-brand-600 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    <div className="w-2 h-2 bg-brand-600 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                    <span className="ml-2 font-semibold">Aguardando pagamento...</span>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}
