"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import Image from "next/image"
import { Shield, Lock, Eye, Database, UserCheck, FileText, Headphones, MessageCircle, User } from "lucide-react"

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-brand-100">
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
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center">
              <Shield className="w-6 h-6 text-brand-600" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                Política de Privacidade
              </h1>
              <p className="text-gray-600 mt-1">
                Última atualização: Janeiro de 2026
              </p>
            </div>
          </div>

          <div className="prose prose-lg max-w-none space-y-6 text-gray-700">
            {/* Introdução */}
            <section>
              <p className="text-lg leading-relaxed">
                O <strong>Gravador Médico</strong> respeita sua privacidade e está comprometido em proteger seus dados pessoais. 
                Esta política descreve como coletamos, usamos e protegemos suas informações.
              </p>
            </section>

            {/* Coleta de Dados */}
            <section className="mt-8">
              <div className="flex items-center gap-2 mb-3">
                <Database className="w-5 h-5 text-brand-600" />
                <h2 className="text-2xl font-bold text-gray-900 m-0">1. Dados Coletados</h2>
              </div>
              <p>Coletamos as seguintes informações:</p>
              <ul className="space-y-2 mt-3">
                <li><strong>Dados de Cadastro:</strong> Nome, e-mail, telefone e CPF</li>
                <li><strong>Dados de Pagamento:</strong> Processados por plataformas terceiras seguras (Appmax/Mercado Pago)</li>
                <li><strong>Dados de Uso:</strong> Informações sobre como você utiliza o método e a plataforma</li>
                <li><strong>Dados Técnicos:</strong> Endereço IP, tipo de dispositivo e navegador</li>
              </ul>
            </section>

            {/* Uso dos Dados */}
            <section className="mt-8">
              <div className="flex items-center gap-2 mb-3">
                <Eye className="w-5 h-5 text-brand-600" />
                <h2 className="text-2xl font-bold text-gray-900 m-0">2. Como Usamos Seus Dados</h2>
              </div>
              <ul className="space-y-2">
                <li>Processar sua compra e fornecer acesso ao produto</li>
                <li>Enviar atualizações, conteúdo e suporte técnico</li>
                <li>Melhorar nossos produtos e serviços</li>
                <li>Cumprir obrigações legais e fiscais</li>
                <li>Comunicar novidades, ofertas e atualizações (com seu consentimento)</li>
              </ul>
            </section>

            {/* Proteção */}
            <section className="mt-8">
              <div className="flex items-center gap-2 mb-3">
                <Lock className="w-5 h-5 text-brand-600" />
                <h2 className="text-2xl font-bold text-gray-900 m-0">3. Proteção de Dados</h2>
              </div>
              <p>Implementamos medidas de segurança para proteger suas informações:</p>
              <ul className="space-y-2 mt-3">
                <li>Criptografia SSL/TLS em todas as transmissões de dados</li>
                <li>Servidores seguros com acesso restrito</li>
                <li>Backups regulares e proteção contra perda de dados</li>
                <li>Conformidade com a LGPD (Lei Geral de Proteção de Dados)</li>
              </ul>
            </section>

            {/* Compartilhamento */}
            <section className="mt-8">
              <div className="flex items-center gap-2 mb-3">
                <UserCheck className="w-5 h-5 text-brand-600" />
                <h2 className="text-2xl font-bold text-gray-900 m-0">4. Compartilhamento de Dados</h2>
              </div>
              <p>Seus dados não são vendidos. Compartilhamos apenas quando necessário:</p>
              <ul className="space-y-2 mt-3">
                <li><strong>Processadores de Pagamento:</strong> Para processar transações financeiras</li>
                <li><strong>Provedores de Hospedagem:</strong> Para armazenamento seguro de dados</li>
                <li><strong>Ferramentas de E-mail:</strong> Para comunicação e envio de conteúdo</li>
                <li><strong>Autoridades:</strong> Quando exigido por lei</li>
              </ul>
            </section>

            {/* Direitos */}
            <section className="mt-8">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-5 h-5 text-brand-600" />
                <h2 className="text-2xl font-bold text-gray-900 m-0">5. Seus Direitos (LGPD)</h2>
              </div>
              <p>Você tem direito a:</p>
              <ul className="space-y-2 mt-3">
                <li>Confirmar se tratamos seus dados pessoais</li>
                <li>Acessar seus dados</li>
                <li>Corrigir dados incompletos, inexatos ou desatualizados</li>
                <li>Solicitar anonimização, bloqueio ou eliminação de dados</li>
                <li>Revogar consentimento</li>
                <li>Portabilidade de dados para outro fornecedor</li>
              </ul>
              <p className="mt-4">
                Para exercer seus direitos, entre em contato: <a href="mailto:suporte@gravadormedico.com.br" className="text-brand-600 hover:text-brand-700 font-semibold">suporte@gravadormedico.com.br</a>
              </p>
            </section>

            {/* Cookies */}
            <section className="mt-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-3">6. Cookies</h2>
              <p>
                Utilizamos cookies para melhorar sua experiência. Você pode desativar cookies nas configurações 
                do seu navegador, mas isso pode afetar funcionalidades do site.
              </p>
            </section>

            {/* Alterações */}
            <section className="mt-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-3">7. Alterações na Política</h2>
              <p>
                Podemos atualizar esta política periodicamente. Mudanças significativas serão comunicadas por e-mail 
                ou através de aviso em nosso site.
              </p>
            </section>

            {/* Contato */}
            <section className="mt-8 p-6 bg-brand-50 rounded-xl">
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Contato</h2>
              <p className="mb-2">Para dúvidas sobre esta política, entre em contato:</p>
              <ul className="space-y-1">
                <li><strong>E-mail:</strong> <a href="mailto:suporte@gravadormedico.com.br" className="text-brand-600 hover:text-brand-700">suporte@gravadormedico.com.br</a></li>
                <li><strong>WhatsApp:</strong> <a href="https://wa.me/5521981470758" target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:text-brand-700">+55 21 98147-0758</a></li>
              </ul>
            </section>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
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
    </div>
  )
}
