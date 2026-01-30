"use client"

import { useState, useEffect, useRef } from "react"
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
import SecureCardForm, { SecureCardFormHandle } from '@/components/SecureCardForm'
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
  AlertTriangle,
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

  // Card data - Etapa 3 (para fallback AppMax - mantemos alguns campos)
  const [cardData, setCardData] = useState({
    number: "",
    holderName: "",
    expiry: "", // Formato MM/AA
    cvv: "",
    installments: 1,
  })
  
  // 🔒 Secure Fields (Mercado Pago PCI Compliance)
  const secureCardFormRef = useRef<SecureCardFormHandle>(null)
  const [secureCardToken, setSecureCardToken] = useState<string | null>(null)
  const [secureCardReady, setSecureCardReady] = useState(false)
  
  // 🔄 Fallback AppMax - Modal de retentativa
  const [showAppmaxFallback, setShowAppmaxFallback] = useState(false)
  const [appmaxCardData, setAppmaxCardData] = useState({
    number: "",
    holderName: "",
    expiry: "",
    cvv: "",
    installments: 1
  })
  const [appmaxLoading, setAppmaxLoading] = useState(false)
  const [mpErrorMessage, setMpErrorMessage] = useState("")
  
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

    // 2️⃣ POLLING DE SEGURANÇA (Fallback a cada 5 segundos - menos agressivo)
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
    }, 5000) // Verifica a cada 5 segundos (menos agressivo para evitar rate limit)

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
      
      // 🔐 TOKENIZAÇÃO SEGURA - Se for cartão, usa Secure Fields (PCI Compliant)
      if (paymentMethod === 'credit') {
        console.log('🔐 Gerando token via Secure Fields...')
        
        // Gera token no momento do submit
        if (!secureCardFormRef.current) {
          throw new Error('Formulário de cartão não está pronto. Tente novamente.')
        }
        
        const tokenData = await secureCardFormRef.current.generateToken()
        
        if (!tokenData || !tokenData.token) {
          throw new Error('Por favor, preencha os dados do cartão corretamente.')
        }
        
        console.log('✅ Token gerado:', tokenData.token.substring(0, 20) + '...')
        
        payload.mpToken = tokenData.token
        payload.installments = tokenData.installments || cardData.installments
        
        // Atualiza device_id se retornado do Secure Fields
        if (tokenData.deviceId) {
          payload.device_id = tokenData.deviceId
        }
        
        // ⚠️ IMPORTANTE: Com Secure Fields, NÃO temos mais acesso aos dados brutos do cartão
        // O fallback AppMax não funcionará mais para novos pagamentos - isso é esperado para PCI Compliance
        // Os dados do cartão nunca passam pelo nosso servidor
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
      
      // 🔄 FALLBACK APPMAX: Se for erro de cartão de crédito, oferece tentar processador alternativo
      const errorMsg = error.message || ''
      const isCardError = paymentMethod === 'credit' && (
        errorMsg.includes('recusado') ||
        errorMsg.includes('rejected') ||
        errorMsg.includes('declined') ||
        errorMsg.includes('insufficient') ||
        errorMsg.includes('card') ||
        errorMsg.includes('cartão') ||
        errorMsg.includes('token') ||
        errorMsg.includes('cc_rejected') ||
        errorMsg.includes('bad_request')
      )
      
      if (isCardError) {
        console.log('🔄 Oferecendo fallback AppMax...')
        setMpErrorMessage(formatPaymentError(error))
        setAppmaxCardData({
          number: "",
          holderName: "",
          expiry: "",
          cvv: "",
          installments: cardData.installments || 1
        })
        setShowAppmaxFallback(true)
        setLoading(false)
      } else {
        alert(formatPaymentError(error))
        setLoading(false)
      }
    }
  }
  
  // 🔄 FALLBACK: Processar pagamento via AppMax
  const handleAppmaxFallback = async () => {
    setAppmaxLoading(true)
    
    try {
      console.log('🔄 Processando pagamento via AppMax (fallback)...')
      
      // Validar dados do cartão
      if (!appmaxCardData.number || !appmaxCardData.holderName || !appmaxCardData.expiry || !appmaxCardData.cvv) {
        throw new Error('Por favor, preencha todos os dados do cartão')
      }
      
      // Extrair mês e ano
      const [expMonth, expYear] = appmaxCardData.expiry.split('/')
      
      // Mapeia os índices dos order bumps selecionados
      const selectedBumpProducts = selectedOrderBumps.map(index => ({
        product_id: orderBumps[index].id,
        quantity: 1
      }))
      
      const sessionId = localStorage.getItem('analytics_session_id') || `session_${Date.now()}`
      
      const payload = {
        customer: {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          cpf: formData.cpf.replace(/\D/g, ''),
          documentType: formData.documentType,
        },
        amount: total,
        payment_method: 'credit_card',
        orderBumps: selectedBumpProducts,
        discount: cupomDiscount > 0 ? cupomDiscount : undefined,
        coupon_code: appliedCupom || undefined,
        session_id: sessionId,
        // Força usar AppMax direto
        force_gateway: 'appmax',
        // Dados do cartão para AppMax
        appmax_data: {
          payment_method: 'credit_card',
          card_data: {
            number: appmaxCardData.number.replace(/\s/g, ''),
            holder_name: appmaxCardData.holderName,
            exp_month: expMonth,
            exp_year: `20${expYear}`,
            cvv: appmaxCardData.cvv,
            installments: appmaxCardData.installments || 1,
          },
          order_bumps: selectedBumpProducts,
        }
      }
      
      const response = await fetch('/api/checkout/enterprise', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Idempotency-Key': `appmax_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        },
        body: JSON.stringify(payload)
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Erro ao processar pagamento')
      }
      
      if (result.success) {
        await markCartAsRecovered(result.order_id)
        window.location.href = `/obrigado?email=${encodeURIComponent(formData.email)}&order_id=${result.order_id}`
      } else {
        throw new Error(result.error || 'Pagamento recusado')
      }
      
    } catch (error: any) {
      console.error('❌ Erro AppMax fallback:', error)
      alert(`Erro no processador alternativo: ${error.message}`)
    } finally {
      setAppmaxLoading(false)
    }
  }
  
  // Formatar número do cartão
  const formatCardNumberFallback = (value: string) => {
    const v = value.replace(/\D/g, '').slice(0, 16)
    const parts = []
    for (let i = 0; i < v.length; i += 4) {
      parts.push(v.slice(i, i + 4))
    }
    return parts.join(' ')
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

                    {/* Formulário de Cartão - Secure Fields (PCI Compliant) */}
                    {paymentMethod === "credit" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-4"
                      >
                        <SecureCardForm
                          ref={secureCardFormRef}
                          amount={total}
                          cpf={formData.cpf.replace(/\D/g, '')}
                          documentType={formData.documentType}
                          disabled={loading}
                          onTokenReady={(tokenData) => {
                            console.log('🔐 Token Secure Fields pronto:', tokenData.token.substring(0, 20) + '...')
                            setSecureCardToken(tokenData.token)
                            setCardData(prev => ({ ...prev, installments: tokenData.installments }))
                            setSecureCardReady(true)
                          }}
                          onError={(errorMessage) => {
                            console.error('❌ Erro Secure Fields:', errorMessage)
                            alert(`Erro no cartão: ${errorMessage}`)
                          }}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Parcelamento em até {maxInstallments}x • Taxa: 2,49% a.m.
                        </p>
                        <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 p-2 rounded-lg">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/>
                          </svg>
                          <span>Pagamento seguro com Mercado Pago - Seus dados estão protegidos</span>
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

      {/* Tela de Sucesso PIX - Estilo Kirvano */}
      <AnimatePresence>
        {pixData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white z-40 overflow-y-auto"
          >
            {/* Conteúdo PIX - Estilo Kirvano */}
            <div className="min-h-screen pt-24 pb-8 px-4">
              <div className="container mx-auto max-w-md">
                
                {/* QR Code no topo */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center mb-6 mt-8"
                >
                  <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm mb-4">
                    <img
                      src={`data:image/png;base64,${pixData.qrCode}`}
                      alt="QR Code PIX"
                      className="w-40 h-40"
                    />
                  </div>
                  
                  {/* Valor */}
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    Pague R$ {total.toFixed(2).replace('.', ',')} via Pix
                  </h1>
                  <p className="text-gray-500 text-center text-sm px-4">
                    Copie o código ou use a câmera para ler o QR Code e realize o pagamento no app do seu banco.
                  </p>
                </motion.div>

                {/* Card principal */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4"
                >
                  {/* Código Copia e Cola */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-gray-500 text-sm font-mono truncate mb-3">
                      {pixData.emv.substring(0, 40)}...
                    </p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(pixData.emv)
                        alert("✅ Código PIX copiado!")
                      }}
                      className="w-full bg-gray-900 hover:bg-gray-800 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors"
                    >
                      <Copy className="w-5 h-5" />
                      Copiar
                    </button>
                  </div>

                  {/* Botão Confirmar pagamento */}
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch(`/api/checkout/check-payment?order_id=${pixData.orderId}`)
                        const data = await response.json()
                        
                        if (data.is_paid) {
                          await markCartAsRecovered(pixData.orderId)
                          router.push(`/obrigado?email=${encodeURIComponent(formData.email)}&order_id=${pixData.orderId}`)
                        } else {
                          alert("⏳ Pagamento ainda não detectado. Aguarde alguns segundos após pagar e tente novamente.")
                        }
                      } catch (error) {
                        alert("Erro ao verificar pagamento. Tente novamente.")
                      }
                    }}
                    className="w-full bg-white hover:bg-gray-50 text-gray-900 font-bold py-3 px-6 rounded-xl border-2 border-gray-200 flex items-center justify-center gap-2 transition-colors"
                  >
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    Confirmar pagamento
                  </button>

                  {/* Botão WhatsApp */}
                  <button
                    onClick={() => {
                      const message = `🎯 *Código PIX - Gravador Médico*\n\n💰 Valor: R$ ${total.toFixed(2).replace('.', ',')}\n\n📋 *Código Copia e Cola:*\n${pixData.emv}\n\n⏱️ Este código expira em 30 minutos.\n\n📱 Cole no app do seu banco para pagar!`
                      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
                      window.open(whatsappUrl, '_blank')
                    }}
                    className="w-full bg-white hover:bg-gray-50 text-gray-900 font-bold py-3 px-6 rounded-xl border-2 border-gray-200 flex items-center justify-center gap-2 transition-colors"
                  >
                    <svg className="w-5 h-5 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    Enviar por WhatsApp
                  </button>

                  {/* Contador de expiração */}
                  <div className={`rounded-xl p-4 flex items-center justify-center gap-2 border-2 border-dashed ${pixTimeLeft <= 300 ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
                    <Clock className={`w-5 h-5 ${pixTimeLeft <= 300 ? 'text-red-500' : 'text-gray-500'}`} />
                    <span className={`font-bold ${pixTimeLeft <= 300 ? 'text-red-600' : 'text-gray-700'}`}>
                      Código expira em
                    </span>
                    <div className="flex gap-1">
                      <span className="bg-gray-900 text-white font-mono font-bold px-2 py-1 rounded text-lg">
                        {String(Math.floor(pixTimeLeft / 60)).padStart(2, '0').charAt(0)}
                      </span>
                      <span className="bg-gray-900 text-white font-mono font-bold px-2 py-1 rounded text-lg">
                        {String(Math.floor(pixTimeLeft / 60)).padStart(2, '0').charAt(1)}
                      </span>
                      <span className="font-bold text-gray-900 text-lg">:</span>
                      <span className="bg-gray-900 text-white font-mono font-bold px-2 py-1 rounded text-lg">
                        {String(pixTimeLeft % 60).padStart(2, '0').charAt(0)}
                      </span>
                      <span className="bg-gray-900 text-white font-mono font-bold px-2 py-1 rounded text-lg">
                        {String(pixTimeLeft % 60).padStart(2, '0').charAt(1)}
                      </span>
                    </div>
                  </div>
                </motion.div>

                {/* Instruções */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mt-6 bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4"
                >
                  {/* Passo 1 */}
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">Acesse seu banco</p>
                      <p className="text-sm text-gray-500">Abra o app do seu banco, é rapidinho.</p>
                    </div>
                  </div>

                  {/* Passo 2 */}
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-gray-600" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M7.5 3.5a2 2 0 012-2h5a2 2 0 012 2v1a1 1 0 01-1 1h-7a1 1 0 01-1-1v-1zM5 7.5a1 1 0 011-1h12a1 1 0 011 1v11a2 2 0 01-2 2H7a2 2 0 01-2-2v-11zM10 11a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1zm0 4a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">Escolha a opção Pix</p>
                      <p className="text-sm text-gray-500">Selecione "Pix Copia e Cola" ou "Ler QR code".</p>
                    </div>
                  </div>

                  {/* Passo 3 */}
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-gray-600" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">Conclua o pagamento</p>
                      <p className="text-sm text-gray-500">Cole o código ou leia o QR code.</p>
                    </div>
                  </div>
                </motion.div>

                {/* Aguardando + Número do pedido */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="mt-6 text-center"
                >
                  <div className="inline-flex items-center gap-2 text-gray-500 mb-2">
                    <div className="w-2 h-2 bg-brand-600 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-brand-600 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    <div className="w-2 h-2 bg-brand-600 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                    <span className="ml-2 text-sm">Aguardando pagamento...</span>
                  </div>
                  <p className="text-xs text-gray-400">
                    Pedido #{pixData.orderId.substring(0, 8)}
                  </p>
                </motion.div>

              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🔄 MODAL FALLBACK APPMAX - Retentativa com processador alternativo */}
      <AnimatePresence>
        {showAppmaxFallback && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowAppmaxFallback(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-5 rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Processador Alternativo</h3>
                    <p className="text-sm text-white/80">Tente novamente com outro processador</p>
                  </div>
                </div>
              </div>
              
              {/* Mensagem de erro original */}
              <div className="p-5 border-b border-gray-100">
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-red-800 text-sm">Pagamento não aprovado</p>
                      <p className="text-xs text-red-600 mt-1">{mpErrorMessage}</p>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-3 text-center">
                  Você pode tentar novamente usando nosso processador alternativo.
                </p>
              </div>
              
              {/* Formulário de cartão */}
              <div className="p-5 space-y-4">
                {/* Número do cartão */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Número do Cartão *
                  </label>
                  <input
                    type="text"
                    value={appmaxCardData.number}
                    onChange={(e) => setAppmaxCardData({ ...appmaxCardData, number: formatCardNumberFallback(e.target.value) })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-brand-500 focus:outline-none transition-colors"
                    placeholder="0000 0000 0000 0000"
                    maxLength={19}
                  />
                </div>
                
                {/* Nome no cartão */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Nome no Cartão *
                  </label>
                  <input
                    type="text"
                    value={appmaxCardData.holderName}
                    onChange={(e) => setAppmaxCardData({ ...appmaxCardData, holderName: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-brand-500 focus:outline-none transition-colors"
                    placeholder="NOME COMO NO CARTÃO"
                  />
                </div>
                
                {/* Validade e CVV */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">
                      Validade *
                    </label>
                    <input
                      type="text"
                      value={appmaxCardData.expiry}
                      onChange={(e) => {
                        let value = e.target.value.replace(/\D/g, '').slice(0, 4)
                        if (value.length >= 2) {
                          value = value.slice(0, 2) + '/' + value.slice(2)
                        }
                        setAppmaxCardData({ ...appmaxCardData, expiry: value })
                      }}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-brand-500 focus:outline-none transition-colors"
                      placeholder="MM/AA"
                      maxLength={5}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">
                      CVV *
                    </label>
                    <input
                      type="text"
                      value={appmaxCardData.cvv}
                      onChange={(e) => setAppmaxCardData({ ...appmaxCardData, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-brand-500 focus:outline-none transition-colors"
                      placeholder="123"
                      maxLength={4}
                    />
                  </div>
                </div>
                
                {/* Parcelas */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Parcelas *
                  </label>
                  <select
                    value={appmaxCardData.installments}
                    onChange={(e) => setAppmaxCardData({ ...appmaxCardData, installments: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-brand-500 focus:outline-none transition-colors bg-white"
                  >
                    {parcelasDisponiveis.map((parcela) => (
                      <option key={parcela.numero} value={parcela.numero}>
                        {parcela.numero}x de R$ {parcela.valorParcela.toFixed(2).replace('.', ',')}
                        {parcela.numero === 1 ? ' sem juros' : ` (Total: R$ ${parcela.valorTotal.toFixed(2).replace('.', ',')})`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* Botões */}
              <div className="p-5 border-t border-gray-100 space-y-3">
                <button
                  onClick={handleAppmaxFallback}
                  disabled={appmaxLoading}
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {appmaxLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5" />
                      Tentar Novamente
                    </>
                  )}
                </button>
                
                <button
                  onClick={() => setShowAppmaxFallback(false)}
                  className="w-full py-3 text-gray-500 hover:text-gray-700 font-medium transition-colors"
                >
                  Cancelar
                </button>
                
                {/* Badge de segurança */}
                <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                  <Lock className="w-3 h-3" />
                  <span>Pagamento seguro e criptografado</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}
