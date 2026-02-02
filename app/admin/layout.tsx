"use client"

import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Users, 
  User,
  Settings, 
  LogOut,
  Menu,
  X,
  BarChart3,
  Package,
  Bell,
  ChevronDown,
  Search,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  ShoppingBag,
  CheckCircle2,
  Clock,
  MessageSquare,
  MessageCircle,
  MousePointerClick,
  Link,
  MessageSquareDashed,
  Footprints,
  Activity,
  Webhook,
  Ticket,
  Mail,
  ExternalLink,
  Heart,
  CreditCard,
  Megaphone,
  Facebook,
  Brain
} from 'lucide-react'
import NotificationBell from '@/components/NotificationBell'
import { WhatsAppNotificationProvider } from '@/components/WhatsAppNotificationProvider'
import { NotificationProvider } from '@/components/NotificationProvider'
import AIFloatingWidget from '@/components/ai/AIFloatingWidget'

const automationItems = [
  { 
    icon: ShoppingBag, 
    label: 'Carrinhos Abandonados', 
    href: '/admin/abandoned-carts',
    badge: null
  },
  { 
    icon: Clock, 
    label: 'Sala de Recuperação', 
    href: '/admin/recovery',
    badge: null
  },
  // TRACKING (integrado à Automação)
  { 
    icon: LayoutDashboard, 
    label: 'Tracking Dashboard', 
    href: '/admin/tracking',
    badge: null
  },
  { 
    icon: Link, 
    label: 'Links Rastreáveis', 
    href: '/admin/tracking/links',
    badge: null
  },
  { 
    icon: MessageSquareDashed, 
    label: 'Mensagens Rastreáveis', 
    href: '/admin/tracking/messages',
    badge: null
  },
  { 
    icon: Footprints, 
    label: 'Jornada de Compra', 
    href: '/admin/tracking/journey',
    badge: null
  },
  { 
    icon: Activity, 
    label: 'Disparos de Pixel', 
    href: '/admin/tracking/logs/pixels',
    badge: null
  },
  { 
    icon: Webhook, 
    label: 'Disparos de Webhook', 
    href: '/admin/tracking/logs/webhooks',
    badge: null
  },
  { 
    icon: Settings, 
    label: 'Config. Tracking', 
    href: '/admin/tracking/settings',
    badge: null
  },
  // WEBHOOKS (logs de integrações)
  { 
    icon: Bell, 
    label: 'Webhooks', 
    href: '/admin/webhooks',
    badge: null
  },
]

const lovableItems = [
  { 
    icon: Users, 
    label: 'Gerenciar Usuários', 
    href: '/admin/lovable/users',
    badge: null
  },
  { 
    icon: Mail, 
    label: 'Logs de Integração', 
    href: '/admin/lovable/emails',
    badge: null
  },
  { 
    icon: ExternalLink, 
    label: 'Abrir Lovable App', 
    href: 'https://gravador-medico.lovable.app',
    badge: null,
    external: true
  },
]

// Menu de Catálogo (Produtos + Cupons)
const catalogItems = [
  { 
    icon: Package, 
    label: 'Produtos', 
    href: '/admin/products',
    badge: null
  },
  { 
    icon: Ticket, 
    label: 'Cupons', 
    href: '/admin/cupons',
    badge: null
  },
]

// Menu de Meta Ads (Estilo VIGA)
const metaAdsItems = [
  { 
    icon: LayoutDashboard, 
    label: 'Visão Geral', 
    href: '/admin/ads',
    badge: null
  },
  { 
    icon: Megaphone, 
    label: 'Campanhas', 
    href: '/admin/ads/campanhas',
    badge: null
  },
  { 
    icon: Package, 
    label: 'Criativos', 
    href: '/admin/ads/criativos',
    badge: null
  },
  { 
    icon: Activity, 
    label: 'Engajamento', 
    href: '/admin/ads/engajamento',
    badge: null
  },
  { 
    icon: TrendingUp, 
    label: 'Histórico', 
    href: '/admin/ads/historico',
    badge: null
  },
]

// Menu Demográfico (sub-submenu de Meta Ads)
const demograficoItems = [
  { 
    icon: Users, 
    label: 'Gênero', 
    href: '/admin/ads/demografico/genero',
    badge: null
  },
  { 
    icon: Clock, 
    label: 'Idade', 
    href: '/admin/ads/demografico/idade',
    badge: null
  },
  { 
    icon: BarChart3, 
    label: 'Plataforma', 
    href: '/admin/ads/demografico/plataforma',
    badge: null
  },
]

// Menu de AI Performance
const aiPerformanceItems = [
  { 
    icon: LayoutDashboard, 
    label: 'Dashboard IA', 
    href: '/admin/ai',
    badge: null
  },
  { 
    icon: TrendingUp, 
    label: 'Escala Automática', 
    href: '/admin/ai/escala-automatica',
    badge: null
  },
  { 
    icon: Bell, 
    label: 'Regras de Alerta', 
    href: '/admin/ai/rules',
    badge: null
  },
  { 
    icon: Users, 
    label: 'Públicos', 
    href: '/admin/ai/audiences',
    badge: null
  },
  { 
    icon: Settings, 
    label: 'Configurações Meta', 
    href: '/admin/ai/settings',
    badge: null
  },
]

// Menu de Gestão (CRM, Clientes, Produtos, Cupons, Pagamentos, Relatórios)
const gestaoItems = [
  { 
    icon: Users, 
    label: 'CRM', 
    href: '/admin/crm',
    badge: null
  },
  { 
    icon: Users, 
    label: 'Clientes', 
    href: '/admin/customers',
    badge: null
  },
  { 
    icon: Package, 
    label: 'Produtos', 
    href: '/admin/products',
    badge: null
  },
  { 
    icon: Ticket, 
    label: 'Cupons', 
    href: '/admin/cupons',
    badge: null
  },
  { 
    icon: CreditCard, 
    label: 'Pagamentos', 
    href: '/admin/payments',
    badge: null
  },
  { 
    icon: BarChart3, 
    label: 'Relatórios', 
    href: '/admin/reports',
    badge: null
  },
]

const menuItems = [
  //  ANALYTICS (Separado com destaque)
  { 
    icon: BarChart3, 
    label: 'Analytics', 
    href: '/admin/analytics',
    badge: 'GA4',
    highlight: true
  },
  
  // 🧠 AI PERFORMANCE (Motor de IA para tráfego pago - com submenu)
  { 
    label: 'AI Performance', 
    icon: Brain,
    items: aiPerformanceItems,
    badge: 'IA',
    highlight: true
  },
  
  // � AUTOMAÇÃO
  { 
    label: 'Automação', 
    icon: Sparkles,
    items: automationItems
  },
  
  // ⚙️ CONFIGURAÇÕES
  { 
    icon: Settings, 
    label: 'Configurações', 
    href: '/admin/settings',
    badge: null
  },
  
  // � E-MAILS (Standalone - destaque)
  { 
    icon: Mail, 
    label: 'E-mails', 
    href: '/admin/emails',
    badge: null,
    highlight: true
  },
  
  // �👥 GESTÃO (CRM, Clientes)
  { 
    label: 'Gestão', 
    icon: Users,
    items: gestaoItems
  },
  
  // � LOVABLE
  { 
    label: 'Lovable', 
    icon: Heart,
    items: lovableItems
  },
  
  // 📢 META ADS (Submenu expandível estilo VIGA)
  { 
    label: 'Meta Ads', 
    icon: Facebook,
    items: metaAdsItems,
    badge: 'Meta',
    highlight: true,
    subItems: demograficoItems  // Sub-submenu demográfico
  },
  
  //  VENDAS (Standalone - destaque)
  { 
    icon: ShoppingCart, 
    label: 'Vendas', 
    href: '/admin/sales',
    badge: null,
    highlight: true
  },
  
  // 📊 VISÃO GERAL
  { 
    icon: LayoutDashboard, 
    label: 'Visão Geral', 
    href: '/admin/dashboard',
    badge: null
  },
  
  // 💬 WHATSAPP (Acesso rápido)
  { 
    icon: MessageSquare, 
    label: 'WhatsApp', 
    href: '/admin/whatsapp',
    badge: null,
    highlight: true
  },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const notificationsRef = useRef<HTMLDivElement>(null)
  
  // Contadores de notificações
  const [notifications, setNotifications] = useState({
    abandonedCarts: 0,
    pendingOrders: 0,
    approvedOrders: 0,
  })
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    menuItems.forEach((item) => {
      if ('items' in item && item.items) {
        initial[item.label] = item.items.some((child) => child.href === pathname)
      }
    })
    return initial
  })

  // Verificar autenticação e role de admin
  useEffect(() => {
    checkAuth()
  }, [])

  // Buscar todas as notificações
  useEffect(() => {
    if (isAdmin) {
      loadNotifications()
      // Atualiza a cada 30 segundos
      const interval = setInterval(loadNotifications, 30000)
      return () => clearInterval(interval)
    }
  }, [isAdmin])

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false)
      }
    }

    if (notificationsOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [notificationsOpen])

  useEffect(() => {
    setOpenGroups((prev) => {
      const next = { ...prev }
      menuItems.forEach((item) => {
        if ('items' in item && item.items) {
          if (item.items.some((child) => child.href === pathname)) {
            next[item.label] = true
          }
        }
      })
      return next
    })
  }, [pathname])

  const loadNotifications = async () => {
    try {
      const response = await fetch('/api/admin/notifications', {
        credentials: 'include'
      })

      if (!response.ok) {
        return
      }

      const data = await response.json()
      setNotifications({
        abandonedCarts: data.abandonedCarts || 0,
        pendingOrders: data.pendingOrders || 0,
        approvedOrders: data.approvedOrders || 0
      })
    } catch (error) {
      console.error('Erro ao buscar notificações:', error)
    }
  }

  const checkAuth = async () => {
    try {
      // Verificar sessão via cookie HttpOnly
      const response = await fetch('/api/auth/me', {
        credentials: 'include'
      })

      if (!response.ok) {
        router.push('/login?redirect=/admin/dashboard')
        return
      }

      const data = await response.json()
      
      // Verificar se é admin
      if (data.user.role !== 'admin') {
        console.error('❌ Acesso negado - Usuário não é admin')
        setIsAdmin(false)
        setLoading(false)
        return
      }

      setIsAdmin(true)
      setUserEmail(data.user.email || null)
      setLoading(false)
    } catch (error) {
      console.error('Erro ao verificar auth:', error)
      router.push('/login')
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    router.push('/')
  }

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [label]: !prev[label],
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Verificando permissões...</p>
        </div>
      </div>
    )
  }

  // Se não é admin, mostrar mensagem de acesso negado
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
            {/* Ícone */}
            <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
              <ShieldAlert className="w-10 h-10 text-red-600" />
            </div>

            {/* Título */}
            <h1 className="text-3xl font-black text-gray-900 mb-3">
              Acesso Negado
            </h1>

            {/* Mensagem */}
            <p className="text-gray-600 mb-6 leading-relaxed">
              Você não tem permissão para acessar o painel administrativo. 
              Entre em contato com o administrador do sistema.
            </p>

            {/* Detalhes técnicos */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm text-gray-500 mb-2">
                <span className="font-semibold">Email:</span> {userEmail || 'Não autenticado'}
              </p>
              <p className="text-sm text-gray-500">
                <span className="font-semibold">Status:</span> Sem permissões de administrador
              </p>
            </div>

            {/* Botões de ação */}
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/')}
                className="flex-1 bg-gradient-to-r from-brand-500 to-brand-600 text-white font-bold py-3 px-6 rounded-lg hover:shadow-lg transition-all"
              >
                Voltar ao Site
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 bg-gray-200 text-gray-700 font-bold py-3 px-6 rounded-lg hover:bg-gray-300 transition-all"
              >
                Fazer Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <NotificationProvider>
      <div className="h-[100dvh] bg-gradient-to-br from-gray-900 via-gray-800 to-black flex relative overflow-hidden">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:z-40">
        <div className="flex flex-col h-full bg-gradient-to-b from-gray-900 to-gray-800 overflow-y-auto shadow-2xl">
          {/* Logo - Clicável para ir para Visão Geral */}
          <button 
            onClick={() => router.push('/admin/dashboard')}
            className="flex items-center flex-shrink-0 px-6 py-6 border-b border-gray-700 hover:bg-gray-800/50 transition-colors cursor-pointer w-full text-left"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden">
              <img 
                src="/images/novo-icon-gravadormedico.png" 
                alt="Gravador Médico" 
                className="w-full h-full object-contain"
              />
            </div>
            <div className="ml-3">
              <h1 className="text-xl font-black text-white">Admin Panel</h1>
              <p className="text-xs text-gray-400">Gravador Médico</p>
            </div>
          </button>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1">
            {menuItems.map((item) => {
              if ('items' in item && item.items) {
                const isGroupActive = item.items.some((child) => pathname === child.href)
                const Icon = item.icon
                const isOpen = !!openGroups[item.label]

                return (
                  <div key={item.label} className="space-y-1">
                    <button
                      onClick={() => toggleGroup(item.label)}
                      className={`w-full flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all ${
                        item.label === 'Meta Ads'
                          ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30'
                          : isGroupActive
                          ? 'bg-gray-800/70 text-white'
                          : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                      }`}
                    >
                      <Icon className="w-5 h-5 mr-3" />
                      <span className="flex-1 text-left">{item.label}</span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isOpen && item.items && (
                      <div className="ml-6 space-y-1">
                        {item.items.map((child) => {
                          const isActive = pathname === child.href
                          const ChildIcon = child.icon
                          const isExternal = (child as any).external

                          if (isExternal) {
                            return (
                              <a
                                key={child.href}
                                href={child.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all text-gray-400 hover:bg-gray-700/50 hover:text-white"
                              >
                                <ChildIcon className="w-4 h-4 mr-3" />
                                <span className="flex-1 text-left">{child.label}</span>
                                <ExternalLink className="w-3 h-3 ml-2 opacity-50" />
                              </a>
                            )
                          }

                          return (
                            <button
                              key={child.href}
                              onClick={() => router.push(child.href)}
                              className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                                isActive
                                  ? 'bg-gradient-to-r from-brand-500/70 to-brand-600/70 text-white'
                                  : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'
                              }`}
                            >
                              <ChildIcon className="w-4 h-4 mr-3" />
                              <span className="flex-1 text-left">{child.label}</span>
                              {child.badge && (
                                <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                  {child.badge}
                                </span>
                              )}
                            </button>
                          )
                        })}
                        
                        {/* Renderizar subItems (Demográfico dentro de Meta Ads) */}
                        {item.subItems && item.subItems.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-gray-700/50">
                            <button
                              onClick={() => toggleGroup('Demográfico')}
                              className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                                pathname.includes('/admin/ads/demografico')
                                  ? 'bg-gray-800/70 text-white'
                                  : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'
                              }`}
                            >
                              <Users className="w-4 h-4 mr-3" />
                              <span className="flex-1 text-left">Demográfico</span>
                              <ChevronDown className={`w-3 h-3 transition-transform ${openGroups['Demográfico'] ? 'rotate-180' : ''}`} />
                            </button>
                            
                            {openGroups['Demográfico'] && (
                              <div className="ml-6 mt-1 space-y-1">
                                {item.subItems.map((subItem) => {
                                  const isSubActive = pathname === subItem.href
                                  const SubIcon = subItem.icon
                                  
                                  return (
                                    <button
                                      key={subItem.href}
                                      onClick={() => router.push(subItem.href)}
                                      className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                                        isSubActive
                                          ? 'bg-gradient-to-r from-brand-500/70 to-brand-600/70 text-white'
                                          : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'
                                      }`}
                                    >
                                      <SubIcon className="w-4 h-4 mr-3" />
                                      <span className="flex-1 text-left">{subItem.label}</span>
                                    </button>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              }

              const isActive = pathname === item.href
              const Icon = item.icon

              return (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className={`w-full flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all ${
                    item.label === 'WhatsApp'
                      ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg shadow-green-500/30'
                      : isActive
                      ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-lg shadow-brand-500/50'
                      : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>

          {/* User Info */}
          <div className="flex-shrink-0 border-t border-gray-700 p-4">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-semibold text-white truncate">{userEmail}</p>
                <p className="text-xs text-gray-400">Administrador</p>
              </div>
              <button
                onClick={() => router.push('/admin/profile')}
                className="mr-1 p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                title="Perfil"
              >
                <User className="w-5 h-5" />
              </button>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                title="Sair"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          
          {/* Sidebar */}
          <div className="fixed inset-y-0 left-0 w-full max-w-xs bg-gradient-to-b from-gray-900 to-gray-800 shadow-2xl">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-6 border-b border-gray-700">
                <button 
                  onClick={() => {
                    router.push('/admin/dashboard')
                    setSidebarOpen(false)
                  }}
                  className="flex items-center hover:opacity-80 transition-opacity"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden">
                    <img 
                      src="/images/novo-icon-gravadormedico.png" 
                      alt="Gravador Médico"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="ml-3">
                    <h1 className="text-xl font-black text-white">Admin Panel</h1>
                    <p className="text-xs text-gray-400">Gravador Médico</p>
                  </div>
                </button>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Navigation */}
              <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                {menuItems.map((item) => {
                  if ('items' in item && item.items) {
                    const isGroupActive = item.items.some((child) => pathname === child.href)
                    const Icon = item.icon
                    const isOpen = !!openGroups[item.label]

                    return (
                      <div key={item.label} className="space-y-1">
                        <button
                          onClick={() => toggleGroup(item.label)}
                          className={`w-full flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all ${
                            isGroupActive
                              ? 'bg-gray-800/70 text-white'
                              : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                          }`}
                        >
                          <Icon className="w-5 h-5 mr-3" />
                          <span className="flex-1 text-left">{item.label}</span>
                          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isOpen && item.items && (
                          <div className="ml-6 space-y-1">
                            {item.items.map((child) => {
                              const isActive = pathname === child.href
                              const ChildIcon = child.icon
                              const isExternal = (child as any).external

                              if (isExternal) {
                                return (
                                  <a
                                    key={child.href}
                                    href={child.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all text-gray-400 hover:bg-gray-700/50 hover:text-white"
                                  >
                                    <ChildIcon className="w-4 h-4 mr-3" />
                                    <span className="flex-1 text-left">{child.label}</span>
                                    <ExternalLink className="w-3 h-3 ml-2 opacity-50" />
                                  </a>
                                )
                              }

                              return (
                                <button
                                  key={child.href}
                                  onClick={() => {
                                    router.push(child.href)
                                    setSidebarOpen(false)
                                  }}
                                  className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                                    isActive
                                      ? 'bg-gradient-to-r from-brand-500/70 to-brand-600/70 text-white'
                                      : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'
                                  }`}
                                >
                                  <ChildIcon className="w-4 h-4 mr-3" />
                                  <span className="flex-1 text-left">{child.label}</span>
                                </button>
                              )
                            })}
                            
                            {/* Renderizar subItems (Demográfico dentro de Meta Ads) - Mobile */}
                            {item.subItems && item.subItems.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-gray-700/50">
                                <button
                                  onClick={() => toggleGroup('Demográfico')}
                                  className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                                    pathname.includes('/admin/ads/demografico')
                                      ? 'bg-gray-800/70 text-white'
                                      : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'
                                  }`}
                                >
                                  <Users className="w-4 h-4 mr-3" />
                                  <span className="flex-1 text-left">Demográfico</span>
                                  <ChevronDown className={`w-3 h-3 transition-transform ${openGroups['Demográfico'] ? 'rotate-180' : ''}`} />
                                </button>
                                
                                {openGroups['Demográfico'] && (
                                  <div className="ml-6 mt-1 space-y-1">
                                    {item.subItems.map((subItem) => {
                                      const isSubActive = pathname === subItem.href
                                      const SubIcon = subItem.icon
                                      
                                      return (
                                        <button
                                          key={subItem.href}
                                          onClick={() => {
                                            router.push(subItem.href)
                                            setSidebarOpen(false)
                                          }}
                                          className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                                            isSubActive
                                              ? 'bg-gradient-to-r from-brand-500/70 to-brand-600/70 text-white'
                                              : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'
                                          }`}
                                        >
                                          <SubIcon className="w-4 h-4 mr-3" />
                                          <span className="flex-1 text-left">{subItem.label}</span>
                                        </button>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  }

                  const isActive = pathname === item.href
                  const Icon = item.icon

                  return (
                    <button
                      key={item.href}
                      onClick={() => {
                        router.push(item.href)
                        setSidebarOpen(false)
                      }}
                      className={`w-full flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-lg'
                          : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                      }`}
                    >
                      <Icon className="w-5 h-5 mr-3" />
                      <span className="flex-1 text-left">{item.label}</span>
                    </button>
                  )
                })}
              </nav>

              {/* User Info */}
              <div className="border-t border-gray-700 p-4">
                <div className="flex items-center">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white truncate">{userEmail}</p>
                    <p className="text-xs text-gray-400">Administrador</p>
                  </div>
                  <button
                    onClick={() => {
                      router.push('/admin/profile')
                      setSidebarOpen(false)
                    }}
                    className="mr-1 p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg"
                    title="Perfil"
                  >
                    <User className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleLogout}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:pl-64 min-h-0 min-w-0">
        {/* Top Bar */}
        <div className="sticky top-0 z-40 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 shadow-xl">
          <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Search Bar */}
            <div className="hidden sm:flex flex-1 max-w-lg ml-4">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  placeholder="Buscar vendas, clientes..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 placeholder:text-gray-500"
                />
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-4 ml-auto">
              {/* Sino de Notificações do Chat/WhatsApp */}
              <NotificationBell />
              
              {/* Notificações Dropdown */}
              <div className="relative" ref={notificationsRef}>
                <button 
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg relative"
                >
                  <Bell className="w-6 h-6" />
                  {(notifications.abandonedCarts + notifications.pendingOrders + notifications.approvedOrders) > 0 && (
                    <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center font-bold">
                      {(notifications.abandonedCarts + notifications.pendingOrders + notifications.approvedOrders) > 9 ? '9+' : (notifications.abandonedCarts + notifications.pendingOrders + notifications.approvedOrders)}
                    </span>
                  )}
                </button>

                {/* Dropdown de Notificações */}
                {notificationsOpen && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl z-50">
                    <div className="p-4 border-b border-gray-700">
                      <h3 className="text-white font-semibold">Notificações</h3>
                      <p className="text-xs text-gray-400 mt-1">Últimas 24 horas</p>
                    </div>
                    <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                      {/* Pedidos Aprovados */}
                      {notifications.approvedOrders > 0 && (
                        <div
                          onClick={() => {
                            setNotificationsOpen(false)
                            router.push('/admin/sales')
                          }}
                          className="p-3 bg-green-900/20 border border-green-700 rounded-lg cursor-pointer hover:bg-green-900/30 transition"
                        >
                          <div className="flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-white font-medium text-sm">
                                {notifications.approvedOrders} {notifications.approvedOrders === 1 ? 'pedido aprovado' : 'pedidos aprovados'}
                              </p>
                              <p className="text-gray-400 text-xs mt-1">
                                Vendas confirmadas hoje
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Pedidos Pendentes */}
                      {notifications.pendingOrders > 0 && (
                        <div
                          onClick={() => {
                            setNotificationsOpen(false)
                            router.push('/admin/sales')
                          }}
                          className="p-3 bg-blue-900/20 border border-blue-700 rounded-lg cursor-pointer hover:bg-blue-900/30 transition"
                        >
                          <div className="flex items-start gap-3">
                            <Clock className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-white font-medium text-sm">
                                {notifications.pendingOrders} {notifications.pendingOrders === 1 ? 'pedido pendente' : 'pedidos pendentes'}
                              </p>
                              <p className="text-gray-400 text-xs mt-1">
                                Aguardando pagamento
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Carrinhos Abandonados */}
                      {notifications.abandonedCarts > 0 && (
                        <div
                          onClick={() => {
                            setNotificationsOpen(false)
                            router.push('/admin/abandoned-carts')
                          }}
                          className="p-3 bg-amber-900/20 border border-amber-700 rounded-lg cursor-pointer hover:bg-amber-900/30 transition"
                        >
                          <div className="flex items-start gap-3">
                            <ShoppingBag className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-white font-medium text-sm">
                                {notifications.abandonedCarts} {notifications.abandonedCarts === 1 ? 'carrinho abandonado' : 'carrinhos abandonados'}
                              </p>
                              <p className="text-gray-400 text-xs mt-1">
                                Clique para recuperar vendas
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Sem notificações */}
                      {notifications.abandonedCarts === 0 && notifications.pendingOrders === 0 && notifications.approvedOrders === 0 && (
                        <div className="text-center py-8 text-gray-400">
                          <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
                          <p className="text-sm">Nenhuma notificação</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <main className={`flex-1 min-h-0 min-w-0 ${pathname === '/admin/whatsapp' ? 'p-0 overflow-hidden' : 'p-4 sm:p-6 lg:p-8 overflow-auto'}`}>
          <div className={pathname === '/admin/whatsapp' ? 'h-full min-h-0 overflow-hidden' : 'min-w-0 w-full'}>
            <WhatsAppNotificationProvider>
              {children}
            </WhatsAppNotificationProvider>
          </div>
        </main>
        
        {/* AI Floating Widget - Disponível em todas as páginas admin */}
        <AIFloatingWidget />
      </div>
      </div>
    </NotificationProvider>
  )
}
