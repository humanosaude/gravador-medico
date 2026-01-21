# Voice Pen Pro - Dashboard Médico

Plataforma profissional de gravação e transcrição médica com IA + Sistema completo de vendas e analytics.

## 🚀 Tecnologias

- **Next.js 15** (App Router)
- **React 18** + **TypeScript**
- **Tailwind CSS** + **Framer Motion**
- **Supabase** (Database + Auth + RLS)
- **AppMax API** (Checkout + Webhooks)
- **Meta Conversions API** (CAPI)
- **Lucide Icons** + **shadcn/ui**

## 📁 Estrutura do Projeto

```
gravador-medico/
├── app/               # Next.js App Router
│   ├── admin/         # Painel admin (12 páginas)
│   └── api/           # API Routes
├── components/        # 44 componentes React
├── lib/              # Utils e helpers
├── database/         # SQL migrations + schemas
├── docs/             # Documentação consolidada
├── scripts/          # Automação e deploy
└── public/           # Assets estáticos
```

Ver [CLEANUP-REPORT.md](./CLEANUP-REPORT.md) para detalhes da estrutura.

## 📦 Instalação

```bash
# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env.local
# Editar .env.local com suas credenciais

# Rodar em desenvolvimento
npm run dev
```

**Acessos:**
- Site público: `http://localhost:3000`
- Painel admin: `http://localhost:3000/admin/dashboard`
- Login: `http://localhost:3000/login`

## 🎨 Funcionalidades Completas

### ✅ Implementadas:

#### **Dashboard Principal**
- Sidebar lateral com navegação completa
- Logo animado "Voice Pen Pro"
- Menu de navegação interativo
- Área VIP destacada (Loja de Prompts)
- Barra de progresso animada (40% concluída)
- Grid de 4 cards interativos com hover effects

#### **Sistema de Modais Interativos**

**1. SetupGuideModal** (Ver Guia)
- Sistema de **3 ABAS** (Tabs):
  - **Aba Download**: QR Codes simulados para App Store e Play Store
  - **Aba Configuração**: 5 passos detalhados de setup
  - **Aba Concluir**: Mensagem de sucesso animada
- Animações de entrada/saída com Framer Motion
- Feedback visual ao completar configuração

**2. PremiumUnlockModal** (Produtos Premium)
- Modal reutilizável com props dinâmicas
- Exibe benefícios com checkmarks animados
- Preço em destaque com desconto (40% OFF)
- Badge de garantia de 7 dias
- Botão "Desbloquear Agora" com animação hover
- Simulação de redirecionamento de pagamento

#### **Interatividade dos Botões**

**Card "Instalar Gravador"**
- Botão "Ver Guia" → Abre SetupGuideModal
- Navegação por abas funcionais
- QR codes visuais para download

**Card "Copiar Prompt Mestre"**
- Botão "Copiar Agora" → Copia prompt SOAP completo
- Utiliza `navigator.clipboard.writeText()`
- Feedback visual: Botão muda para verde escuro
- Texto: "Copiado com Sucesso!" com ícone de check
- Reset automático após 3 segundos
- Toast notification de confirmação

**Card "Prompt Cardiologia" (Bloqueado)**
- Badge "Premium" em destaque
- Botão "Desbloquear" → Abre PremiumUnlockModal
- Exibe 6 benefícios específicos de cardiologia
- Preço: R$ 29,90 (desconto de R$ 49,90)
- Ícone de coração vermelho personalizado

**Card "Escudo Jurídico" (Bloqueado)**
- Badge "Proteção" em destaque
- Botão "Desbloquear" → Abre PremiumUnlockModal
- Exibe 6 benefícios de proteção legal (LGPD)
- Preço: R$ 49,90
- Ícone de escudo azul personalizado

#### **Animações (Framer Motion)**
- Fade-in sequencial dos cards
- Animação da barra de progresso
- Transições suaves entre estados de botão
- Animações de entrada dos modais
- Hover effects em todos os elementos clicáveis
- Scale effects nos cards

#### **Sistema de Notificações**
- Toast Provider global
- Notificações de sucesso/erro
- Auto-dismiss após 3 segundos
- Animação slide-in from right

## 🔐 Cards do Dashboard

| Card | Status | Ação | Modal |
|------|--------|------|-------|
| **Instalar Gravador** | Disponível | Ver Guia | SetupGuideModal (3 abas) |
| **Copiar Prompt Mestre** | Disponível | Copiar Agora | Toast + Feedback visual |
| **Prompt Cardiologia** | Bloqueado | Desbloquear | PremiumUnlockModal |
| **Escudo Jurídico** | Bloqueado | Desbloquear | PremiumUnlockModal |

## 📁 Estrutura Atualizada

```
/app
  /dashboard
    layout.tsx           # Layout com Sidebar + ToastProvider
    page.tsx            # Página principal com lógica completa
    globals.css         # Estilos globais + animações
/components
  Sidebar.tsx          # Menu lateral + Área VIP
  /modals
    SetupGuideModal.tsx      # Modal de guia com 3 abas
    PremiumUnlockModal.tsx   # Modal de produtos premium
  /ui
    card.tsx           # Componente Card
    button.tsx         # Botão com variantes
    badge.tsx          # Badges (Premium/Proteção)
    dialog.tsx         # Sistema de Dialog
    toast.tsx          # Sistema de notificações
    tabs.tsx           # Sistema de abas (novo)
```

## 🎯 Prompt Mestre (Conteúdo Copiado)

O botão "Copiar Prompt Mestre" copia o seguinte texto:

```
Atue como um escriba médico especialista em documentação clínica. 
Sua missão é transformar gravações de consultas médicas em 
prontuários estruturados, seguindo rigorosamente a metodologia 
SOAP (Subjetivo, Objetivo, Avaliação, Plano).

[... estrutura SOAP completa com diretrizes ...]
```

## 🎨 Design System

- **Cores Primárias**: Azul Royal (#2563EB)
- **Fonte**: Inter (Google Fonts)
- **Estilo**: Clean, Minimalista, Trustworthy
- **Fundo**: Slate-50
- **Sombras**: Suaves e elegantes
- **Bordas**: Arredondadas (rounded-lg)

## 🚀 Próximos Passos

- Integração com backend
- Sistema de autenticação (NextAuth)
- Gateway de pagamento (Stripe/Mercado Pago)
- Painel de analytics
- Biblioteca de prompts expandida
- Sistema de versionamento de prompts

---

**Voice Pen Pro** - Tecnologia a serviço da medicina moderna. 🩺✨
