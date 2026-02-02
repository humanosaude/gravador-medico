"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Home, Compass, Wrench, ShoppingBag, User, FileText, BarChart3, ShoppingCart, MessageSquare, MessageCircle, Target, Ticket, Users, Mail, CreditCard, DollarSign, Brain, Megaphone, Rocket, Bell, Settings, UsersRound } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"
import NotificationBell from "./NotificationBell"

interface NavItem {
  id: string
  icon: React.ReactNode
  href: string
  label: string
  description: string
  separator?: boolean // Para adicionar separador visual
}

export default function DockSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const [expandedItem, setExpandedItem] = useState<string | null>(null)

  const navItems: NavItem[] = [
    {
      id: "home",
      icon: <Home className="w-6 h-6" />,
      href: "/dashboard",
      label: "Visão Geral",
      description: "Seu centro de comando",
    },
    // ═══════════════════════════════════════
    // ITENS PRINCIPAIS (STANDALONE)
    // ═══════════════════════════════════════
    {
      id: "sales",
      icon: <DollarSign className="w-6 h-6" />,
      href: "/admin/sales",
      label: "Vendas",
      description: "Central de vendas",
      separator: true,
    },
    {
      id: "emails",
      icon: <Mail className="w-6 h-6" />,
      href: "/admin/emails",
      label: "E-mails",
      description: "Gestão de e-mails",
    },
    // ═══════════════════════════════════════
    // FERRAMENTAS DE ANÁLISE
    // ═══════════════════════════════════════
    {
      id: "payments",
      icon: <CreditCard className="w-6 h-6" />,
      href: "/admin/payments",
      label: "Pagamentos",
      description: "Análise MP + AppMax",
      separator: true,
    },
    {
      id: "analytics",
      icon: <BarChart3 className="w-6 h-6" />,
      href: "/dashboard/analytics",
      label: "Analytics",
      description: "Dados e estatísticas",
    },
    {
      id: "tracking",
      icon: <Target className="w-6 h-6" />,
      href: "/admin/tracking",
      label: "Tracking",
      description: "Rastreamento e atribuição",
    },
    // ═══════════════════════════════════════
    // IA & ANÚNCIOS
    // ═══════════════════════════════════════
    {
      id: "ads",
      icon: <Megaphone className="w-6 h-6" />,
      href: "/admin/ads",
      label: "Anúncios",
      description: "Lançador de Ads IA",
      separator: true,
    },
    {
      id: "ai-performance",
      icon: <Brain className="w-6 h-6" />,
      href: "/admin/ai",
      label: "Dashboard IA",
      description: "Análise inteligente",
    },
    {
      id: "escala-automatica",
      icon: <Rocket className="w-6 h-6" />,
      href: "/admin/ai/escala-automatica",
      label: "Escala Automática",
      description: "Cockpit de controle",
    },
    {
      id: "alertas",
      icon: <Bell className="w-6 h-6" />,
      href: "/admin/ai/rules",
      label: "Regras de Alerta",
      description: "Configurar CPA/ROAS",
    },
    {
      id: "audiences",
      icon: <UsersRound className="w-6 h-6" />,
      href: "/admin/ai/audiences",
      label: "Públicos",
      description: "Gerenciar audiências",
    },
    {
      id: "meta-settings",
      icon: <Settings className="w-6 h-6" />,
      href: "/admin/ai/settings",
      label: "Config Meta",
      description: "Tokens e contas",
    },
    // ═══════════════════════════════════════
    // GESTÃO
    // ═══════════════════════════════════════
    {
      id: "cupons",
      icon: <Ticket className="w-6 h-6" />,
      href: "/admin/cupons",
      label: "Cupons",
      description: "Gerenciar descontos",
      separator: true,
    },
    {
      id: "lovable-users",
      icon: <Users className="w-6 h-6" />,
      href: "/admin/lovable/users",
      label: "Usuários",
      description: "Gerenciar usuários Lovable",
    },
    {
      id: "abandoned-carts",
      icon: <ShoppingCart className="w-6 h-6" />,
      href: "/dashboard/abandoned-carts",
      label: "Carrinhos",
      description: "Recuperar vendas",
    },
    // ═══════════════════════════════════════
    // COMUNICAÇÃO
    // ═══════════════════════════════════════
    {
      id: "whatsapp",
      icon: <MessageSquare className="w-6 h-6" />,
      href: "/dashboard/whatsapp",
      label: "WhatsApp",
      description: "Inbox de conversas",
      separator: true,
    },
    {
      id: "chat",
      icon: <MessageCircle className="w-6 h-6" />,
      href: "/admin/chat",
      label: "Chat Interno",
      description: "Conversar com admins",
    },
    // ═══════════════════════════════════════
    // CONFIGURAÇÃO
    // ═══════════════════════════════════════
    {
      id: "templates",
      icon: <FileText className="w-6 h-6" />,
      href: "/dashboard/templates",
      label: "Templates",
      description: "Prompts por especialidade",
      separator: true,
    },
    {
      id: "store",
      icon: <ShoppingBag className="w-6 h-6" />,
      href: "/dashboard/store",
      label: "Loja",
      description: "Produtos premium",
    },
  ]

  const handleNavClick = (href: string) => {
    if (href.startsWith("#")) {
      // Se não estiver no dashboard, navega primeiro
      if (pathname !== "/dashboard") {
        router.push("/dashboard" + href)
      } else {
        // Já está no dashboard, faz scroll
        setTimeout(() => {
          const element = document.querySelector(href)
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "start" })
          }
        }, 100)
      }
    } else {
      router.push(href)
    }
  }

  const handleProfileClick = () => {
    router.push("/dashboard/profile")
  }

  return (
    <motion.aside
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="hidden lg:block fixed left-6 top-6 bottom-6 z-50"
    >
      {/* Dock Container - Expande ao hover */}
      <motion.div
        animate={{
          width: expandedItem ? "240px" : "80px",
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
  className="relative h-full rounded-3xl bg-gradient-to-br from-brand-800 to-brand-900 backdrop-blur-2xl border border-brand-700 shadow-2xl overflow-visible"
      >
  {/* Subtle Glow */}
  <div className="absolute inset-0 bg-gradient-to-b from-brand-500/5 to-brand-500/5 pointer-events-none" />

        <div className="relative h-full flex flex-col items-center py-8">
          {/* Logo - Clicável para Visão Geral */}
          <motion.button
            onClick={() => router.push('/dashboard')}
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
            className="mb-12 cursor-pointer"
            title="Visão Geral"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-lg hover:shadow-brand-500/30 transition-shadow">
              <span className="text-2xl font-bold text-white">G</span>
            </div>
          </motion.button>

          {/* Navigation Items */}
          <nav className="flex-1 flex flex-col items-center gap-6">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href.startsWith("#") && false)

              return (
                <motion.button
                  key={item.id}
                  onClick={() => handleNavClick(item.href)}
                  onMouseEnter={() => {
                    setHoveredItem(item.id)
                    setExpandedItem(item.id)
                  }}
                  onMouseLeave={() => {
                    setHoveredItem(null)
                    setExpandedItem(null)
                  }}
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.95 }}
                  className="relative group w-full"
                >
                  <div className="flex items-center gap-4 px-4">
                    {/* Active Indicator */}
                    {isActive && (
                      <motion.div
                        layoutId="activeNav"
                        className="absolute -left-8 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-blue-500 to-purple-600 rounded-r-full"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}

                    {/* Icon Container */}
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                        isActive
              ? "bg-brand-700 text-white"
                : "text-gray-300 hover:text-white hover:bg-brand-800"
                      }`}
                    >
                      {item.icon}
                    </div>

                    {/* Expanded Content */}
                    <AnimatePresence>
                      {expandedItem === item.id && (
                        <motion.div
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: "auto" }}
                          exit={{ opacity: 0, width: 0 }}
                          className="overflow-hidden whitespace-nowrap"
                        >
                          <div className="text-left">
                            <div className="text-sm font-bold text-white">{item.label}</div>
                            <div className="text-xs text-gray-300">{item.description}</div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.button>
              )
            })}
          </nav>

          {/* Notification Bell */}
          <div className="mb-4">
            <NotificationBell />
          </div>

          {/* User Avatar */}
          <motion.button
            onClick={handleProfileClick}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="mt-auto"
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center ring-2 ring-gray-200">
              <User className="w-6 h-6 text-white" />
            </div>
          </motion.button>
        </div>
      </motion.div>
    </motion.aside>
  )
}
