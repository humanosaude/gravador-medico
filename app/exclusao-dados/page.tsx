"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import Image from "next/image"
import { useSearchParams } from "next/navigation"
import { 
  Shield, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Loader2,
  User,
  FileText,
  HelpCircle,
  MessageCircle
} from "lucide-react"

interface DeletionStatus {
  confirmation_code: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  status_details: string | null
  deleted_data_types: string[]
  requested_at: string
  completed_at: string | null
}

const statusConfig = {
  pending: {
    icon: Clock,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    title: 'Aguardando Processamento',
    description: 'Sua solicitação foi recebida e está aguardando processamento.'
  },
  processing: {
    icon: Loader2,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    title: 'Em Processamento',
    description: 'Estamos processando a exclusão dos seus dados. Isso pode levar alguns minutos.'
  },
  completed: {
    icon: CheckCircle2,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    title: 'Exclusão Concluída',
    description: 'Todos os seus dados foram excluídos com sucesso de nossos sistemas.'
  },
  failed: {
    icon: AlertCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    title: 'Erro na Exclusão',
    description: 'Ocorreu um erro durante a exclusão. Nossa equipe foi notificada e resolverá o problema.'
  }
}

export default function DataDeletionPage() {
  const searchParams = useSearchParams()
  const code = searchParams.get('code')
  
  const [status, setStatus] = useState<DeletionStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (code) {
      fetchStatus(code)
    } else {
      setLoading(false)
    }
  }, [code])

  const fetchStatus = async (confirmationCode: string) => {
    try {
      const response = await fetch(`/api/facebook/data-deletion?code=${confirmationCode}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Solicitação não encontrada. Verifique o código de confirmação.')
        } else {
          setError('Erro ao buscar status da solicitação.')
        }
        return
      }

      const data = await response.json()
      setStatus(data)
    } catch (err) {
      setError('Erro ao conectar com o servidor.')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      dateStyle: 'long',
      timeStyle: 'short'
    })
  }

  const renderStatusContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-12 h-12 text-brand-600 animate-spin mb-4" />
          <p className="text-gray-600">Buscando status da solicitação...</p>
        </div>
      )
    }

    if (error) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-800 mb-2">Erro</h3>
          <p className="text-red-600">{error}</p>
        </div>
      )
    }

    if (!code) {
      return renderInstructions()
    }

    if (!status) {
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
          <HelpCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">Solicitação Não Encontrada</h3>
          <p className="text-yellow-600">
            Não encontramos uma solicitação com o código fornecido. 
            Verifique se digitou corretamente.
          </p>
        </div>
      )
    }

    const config = statusConfig[status.status]
    const StatusIcon = config.icon

    return (
      <div className="space-y-6">
        {/* Status Card */}
        <div className={`${config.bgColor} border rounded-xl p-6`}>
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-full bg-white flex items-center justify-center ${config.color}`}>
              <StatusIcon className={`w-7 h-7 ${status.status === 'processing' ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <h3 className={`text-xl font-bold ${config.color}`}>{config.title}</h3>
              <p className="text-gray-700">{config.description}</p>
            </div>
          </div>
        </div>

        {/* Detalhes */}
        <div className="bg-gray-50 rounded-xl p-6 space-y-4">
          <h4 className="font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Detalhes da Solicitação
          </h4>
          
          <div className="grid gap-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-gray-600">Código de Confirmação</span>
              <span className="font-mono font-semibold text-brand-600">{status.confirmation_code}</span>
            </div>
            
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-gray-600">Data da Solicitação</span>
              <span className="font-medium">{formatDate(status.requested_at)}</span>
            </div>
            
            {status.completed_at && (
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-gray-600">Data de Conclusão</span>
                <span className="font-medium">{formatDate(status.completed_at)}</span>
              </div>
            )}
            
            {status.status_details && (
              <div className="py-2">
                <span className="text-gray-600 block mb-1">Observações</span>
                <span className="text-gray-800">{status.status_details}</span>
              </div>
            )}
            
            {status.deleted_data_types && status.deleted_data_types.length > 0 && (
              <div className="py-2">
                <span className="text-gray-600 block mb-2">Tipos de Dados Excluídos</span>
                <div className="flex flex-wrap gap-2">
                  {status.deleted_data_types.map((type, index) => (
                    <span 
                      key={index}
                      className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium"
                    >
                      {type}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const renderInstructions = () => (
    <div className="space-y-8">
      {/* Introdução */}
      <section>
        <p className="text-lg text-gray-700 leading-relaxed">
          O <strong>Gravador Médico</strong> está comprometido com a proteção dos seus dados pessoais. 
          De acordo com as leis de proteção de dados (LGPD) e as políticas da plataforma Meta, 
          você tem o direito de solicitar a exclusão de todas as informações que coletamos sobre você.
        </p>
      </section>

      {/* Como solicitar */}
      <section className="bg-brand-50 rounded-xl p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Trash2 className="w-6 h-6 text-brand-600" />
          Como Solicitar a Exclusão dos Seus Dados
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 bg-brand-600 text-white rounded-full flex items-center justify-center font-bold shrink-0">
              1
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">Via Facebook</h4>
              <p className="text-gray-600">
                Acesse suas <a href="https://www.facebook.com/settings?tab=applications" target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">configurações do Facebook</a>,
                encontre o app "Gravador Médico", clique em "Remover" e depois em "Enviar solicitação de exclusão".
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 bg-brand-600 text-white rounded-full flex items-center justify-center font-bold shrink-0">
              2
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">Via E-mail</h4>
              <p className="text-gray-600">
                Envie um e-mail para <a href="mailto:privacidade@gravadormedico.com.br" className="text-brand-600 hover:underline">privacidade@gravadormedico.com.br</a> 
                com o assunto "Solicitação de Exclusão de Dados" incluindo seu nome e e-mail cadastrado.
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 bg-brand-600 text-white rounded-full flex items-center justify-center font-bold shrink-0">
              3
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">Via WhatsApp</h4>
              <p className="text-gray-600">
                Entre em contato pelo nosso <a href="https://wa.me/5521981470758?text=Olá!%20Gostaria%20de%20solicitar%20a%20exclusão%20dos%20meus%20dados." target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">WhatsApp</a> 
                solicitando a exclusão dos seus dados.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Dados que coletamos */}
      <section>
        <h3 className="text-xl font-bold text-gray-900 mb-4">Dados que Podemos Ter Coletado</h3>
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { icon: User, title: 'Dados de Perfil', desc: 'Nome, e-mail e foto de perfil do Facebook' },
            { icon: FileText, title: 'Dados de Uso', desc: 'Interações com nosso site e aplicativo' },
            { icon: MessageCircle, title: 'Comunicações', desc: 'Histórico de conversas e suporte' },
            { icon: Shield, title: 'Dados de Pagamento', desc: 'Informações de transações (anonimizados)' },
          ].map((item, index) => (
            <div key={index} className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
              <item.icon className="w-5 h-5 text-brand-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-gray-900">{item.title}</h4>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Prazo */}
      <section className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
        <h3 className="text-lg font-bold text-yellow-800 mb-2 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Prazo de Processamento
        </h3>
        <p className="text-yellow-700">
          Sua solicitação será processada em até <strong>15 dias úteis</strong>. 
          Você receberá uma confirmação por e-mail quando a exclusão for concluída.
        </p>
      </section>

      {/* Verificar status */}
      <section className="bg-gray-100 rounded-xl p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Verificar Status de uma Solicitação</h3>
        <p className="text-gray-600 mb-4">
          Se você já fez uma solicitação de exclusão via Facebook, pode verificar o status usando o código de confirmação que recebeu.
        </p>
        <form 
          onSubmit={(e) => {
            e.preventDefault()
            const formData = new FormData(e.currentTarget)
            const inputCode = formData.get('code') as string
            if (inputCode) {
              window.location.href = `/exclusao-dados?code=${inputCode}`
            }
          }}
          className="flex gap-3"
        >
          <input
            type="text"
            name="code"
            placeholder="Digite seu código de confirmação"
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
          />
          <button
            type="submit"
            className="bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            Verificar
          </button>
        </form>
      </section>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-brand-100">
      {/* WhatsApp Floating Button */}
      <motion.a
        href="https://wa.me/5521981470758?text=Olá!%20Gostaria%20de%20solicitar%20a%20exclusão%20dos%20meus%20dados."
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
      </motion.a>

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <Image
              src="/images/LOGO GRAVADOR MEDICO - 180X50.png"
              alt="Gravador Médico"
              width={180}
              height={50}
              className="h-12 md:h-14 w-auto"
            />
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="https://gravadormedico.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-brand-600 hover:text-brand-700 font-semibold transition-colors"
            >
              <User className="w-4 h-4" />
              Entrar
            </Link>
            <Link
              href="/"
              className="text-gray-600 hover:text-gray-900 font-semibold transition-colors"
            >
              Voltar ao Início
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl p-8 md:p-12"
        >
          {/* Title */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                Exclusão de Dados
              </h1>
              <p className="text-gray-600 mt-1">
                Gerencie seus dados pessoais
              </p>
            </div>
          </div>

          {renderStatusContent()}
        </motion.div>

        {/* Links relacionados */}
        <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm">
          <Link href="/politica-privacidade" className="text-brand-600 hover:underline">
            Política de Privacidade
          </Link>
          <span className="text-gray-300">•</span>
          <Link href="/termos-de-uso" className="text-brand-600 hover:underline">
            Termos de Uso
          </Link>
          <span className="text-gray-300">•</span>
          <Link href="/contato" className="text-brand-600 hover:underline">
            Fale Conosco
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 py-8 mt-12">
        <div className="max-w-6xl mx-auto px-4 text-center text-gray-600">
          <p>© 2026 Gravador Médico. Todos os direitos reservados.</p>
          <p className="mt-2 text-sm">
            Em conformidade com a LGPD (Lei Geral de Proteção de Dados) e políticas da Meta.
          </p>
        </div>
      </footer>
    </div>
  )
}
