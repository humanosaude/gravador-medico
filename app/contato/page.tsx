"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import Image from "next/image"
import { Mail, MessageCircle, Phone, Clock, HeadphonesIcon } from "lucide-react"

export default function Contact() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-brand-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <Image
              src="/images/LOGO GRAVADOR MEDICO - 180X50.png"
              alt="Gravador Médico"
              width={180}
              height={50}
              className="h-10 w-auto"
            />
          </Link>
          <Link
            href="/"
            className="text-brand-600 hover:text-brand-700 font-semibold transition-colors"
          >
            Voltar ao Início
          </Link>
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
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <HeadphonesIcon className="w-8 h-8 text-brand-600" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              Entre em Contato
            </h1>
            <p className="text-lg text-gray-600">
              Estamos aqui para ajudar! Escolha o melhor canal para falar conosco.
            </p>
          </div>

          {/* Contact Cards */}
          <div className="grid md:grid-cols-2 gap-6 mb-10">
            {/* WhatsApp Card */}
            <motion.a
              href="https://wa.me/5521981470758?text=Olá!%20Gostaria%20de%20tirar%20algumas%20dúvidas%20sobre%20o%20Gravador%20Médico."
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="block p-6 bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-xl hover:shadow-lg transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">WhatsApp</h3>
                  <p className="text-gray-700 mb-3">
                    Resposta rápida e atendimento personalizado
                  </p>
                  <p className="text-green-700 font-semibold text-lg">
                    +55 21 98147-0758
                  </p>
                  <span className="inline-block mt-3 text-sm text-green-600 font-medium">
                    Clique para conversar →
                  </span>
                </div>
              </div>
            </motion.a>

            {/* Email Card */}
            <motion.a
              href="mailto:suporte@gravadormedico.com.br"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="block p-6 bg-gradient-to-br from-brand-50 to-brand-100 border-2 border-brand-200 rounded-xl hover:shadow-lg transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-brand-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Mail className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">E-mail</h3>
                  <p className="text-gray-700 mb-3">
                    Para dúvidas detalhadas e suporte técnico
                  </p>
                  <p className="text-brand-700 font-semibold text-sm md:text-base break-all">
                    suporte@gravadormedico.com.br
                  </p>
                  <span className="inline-block mt-3 text-sm text-brand-600 font-medium">
                    Clique para enviar e-mail →
                  </span>
                </div>
              </div>
            </motion.a>
          </div>

          {/* Info Sections */}
          <div className="space-y-6">
            {/* Horário */}
            <div className="p-6 bg-gray-50 rounded-xl">
              <div className="flex items-start gap-3">
                <Clock className="w-6 h-6 text-brand-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Horário de Atendimento</h3>
                  <ul className="space-y-1 text-gray-700">
                    <li><strong>Segunda a Sexta:</strong> 9h às 18h</li>
                    <li><strong>Sábados:</strong> 9h às 13h</li>
                    <li><strong>Domingos e Feriados:</strong> Fechado</li>
                  </ul>
                  <p className="text-sm text-gray-600 mt-3">
                    * Respostas por e-mail podem levar até 24 horas úteis
                  </p>
                </div>
              </div>
            </div>

            {/* Telefone */}
            <div className="p-6 bg-blue-50 rounded-xl">
              <div className="flex items-start gap-3">
                <Phone className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Telefone (mesmo do WhatsApp)</h3>
                  <p className="text-blue-700 font-semibold text-xl">+55 21 98147-0758</p>
                  <p className="text-sm text-gray-600 mt-2">
                    Preferimos atendimento via WhatsApp para melhor registro e agilidade
                  </p>
                </div>
              </div>
            </div>

            {/* Motivos de Contato */}
            <div className="p-6 bg-gradient-to-br from-brand-50 to-white rounded-xl border border-brand-100">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Como Podemos Ajudar?</h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-brand-500 rounded-full"></div>
                  <span className="text-gray-700">Dúvidas sobre o produto</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-brand-500 rounded-full"></div>
                  <span className="text-gray-700">Suporte técnico</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-brand-500 rounded-full"></div>
                  <span className="text-gray-700">Problemas de acesso</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-brand-500 rounded-full"></div>
                  <span className="text-gray-700">Solicitação de reembolso</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-brand-500 rounded-full"></div>
                  <span className="text-gray-700">Atualizações e novidades</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-brand-500 rounded-full"></div>
                  <span className="text-gray-700">Feedback e sugestões</span>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Final */}
          <div className="mt-10 text-center">
            <p className="text-gray-600 mb-6">
              Tem uma pergunta? Não hesite em nos contatar. Estamos aqui para garantir sua melhor experiência!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.a
                href="https://wa.me/5521981470758?text=Olá!%20Preciso%20de%20ajuda."
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-full font-bold shadow-lg transition-all"
              >
                <MessageCircle className="w-5 h-5" />
                Falar no WhatsApp
              </motion.a>
              <motion.a
                href="mailto:suporte@gravadormedico.com.br"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-8 py-3 rounded-full font-bold shadow-lg transition-all"
              >
                <Mail className="w-5 h-5" />
                Enviar E-mail
              </motion.a>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="py-8 text-center text-gray-600 text-sm">
        <p>© 2026 Gravador Médico. Todos os direitos reservados.</p>
      </footer>
    </div>
  )
}
