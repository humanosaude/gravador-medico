"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import Image from "next/image"
import { FileText, CheckCircle2, XCircle, AlertCircle, Scale } from "lucide-react"

export default function TermsOfService() {
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
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center">
              <FileText className="w-6 h-6 text-brand-600" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                Termos de Uso
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
                Ao adquirir e utilizar o <strong>Gravador Médico</strong>, você concorda com os seguintes termos e condições. 
                Leia atentamente antes de prosseguir com a compra.
              </p>
            </section>

            {/* Produto */}
            <section className="mt-8">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-5 h-5 text-brand-600" />
                <h2 className="text-2xl font-bold text-gray-900 m-0">1. Sobre o Produto</h2>
              </div>
              <p>O Gravador Médico é um método educacional que ensina:</p>
              <ul className="space-y-2 mt-3">
                <li>Técnicas de gravação e transcrição automática de consultas médicas</li>
                <li>Configuração do Atalho Mágico no iPhone</li>
                <li>Uso de inteligência artificial para criação de prontuários</li>
                <li>Bônus exclusivos para potencializar o método</li>
              </ul>
              <p className="mt-4 text-sm text-gray-600">
                <strong>Importante:</strong> Este é um produto educacional/informacional digital. Não é um software ou aplicativo.
              </p>
            </section>

            {/* Acesso */}
            <section className="mt-8">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-5 h-5 text-brand-600" />
                <h2 className="text-2xl font-bold text-gray-900 m-0">2. Acesso ao Conteúdo</h2>
              </div>
              <ul className="space-y-2">
                <li>O acesso é <strong>vitalício</strong> após a aprovação do pagamento</li>
                <li>Você receberá login e senha por e-mail em até 24 horas</li>
                <li>O conteúdo é acessado através de nossa plataforma online</li>
                <li>É necessário conexão com internet para acessar o material</li>
                <li>Atualizações futuras são gratuitas para todos os alunos</li>
              </ul>
            </section>

            {/* Garantia */}
            <section className="mt-8">
              <div className="flex items-center gap-2 mb-3">
                <Scale className="w-5 h-5 text-brand-600" />
                <h2 className="text-2xl font-bold text-gray-900 m-0">3. Garantia Incondicional de 7 Dias</h2>
              </div>
              <p>Oferecemos garantia incondicional:</p>
              <ul className="space-y-2 mt-3">
                <li>Você tem <strong>7 dias</strong> para testar o método</li>
                <li>Se não ficar satisfeito por <strong>qualquer motivo</strong>, devolvemos 100% do valor</li>
                <li>Basta enviar um e-mail para: <a href="mailto:suporte@gravadormedico.com.br" className="text-brand-600 hover:text-brand-700">suporte@gravadormedico.com.br</a></li>
                <li>O reembolso é processado em até 7 dias úteis</li>
              </ul>
            </section>

            {/* Uso Permitido */}
            <section className="mt-8">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <h2 className="text-2xl font-bold text-gray-900 m-0">4. Uso Permitido</h2>
              </div>
              <ul className="space-y-2">
                <li>Uso pessoal e profissional do método ensinado</li>
                <li>Aplicação das técnicas em sua rotina médica</li>
                <li>Acesso ao material de qualquer dispositivo com sua conta</li>
              </ul>
            </section>

            {/* Uso Proibido */}
            <section className="mt-8">
              <div className="flex items-center gap-2 mb-3">
                <XCircle className="w-5 h-5 text-red-600" />
                <h2 className="text-2xl font-bold text-gray-900 m-0">5. Uso Proibido</h2>
              </div>
              <p>É estritamente proibido:</p>
              <ul className="space-y-2 mt-3">
                <li>Compartilhar seu login e senha com terceiros</li>
                <li>Copiar, distribuir ou reproduzir o conteúdo</li>
                <li>Revender ou comercializar o método</li>
                <li>Fazer engenharia reversa do conteúdo</li>
                <li>Utilizar o conteúdo para criar produtos concorrentes</li>
              </ul>
              <p className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <strong>⚠️ Violações:</strong> O descumprimento pode resultar no cancelamento imediato do acesso, 
                sem direito a reembolso, e ações legais cabíveis.
              </p>
            </section>

            {/* Responsabilidades */}
            <section className="mt-8">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-5 h-5 text-brand-600" />
                <h2 className="text-2xl font-bold text-gray-900 m-0">6. Responsabilidades do Usuário</h2>
              </div>
              <ul className="space-y-2">
                <li>Manter a confidencialidade de suas credenciais de acesso</li>
                <li>Utilizar o método de acordo com as leis e regulamentações aplicáveis</li>
                <li>Respeitar os direitos autorais e propriedade intelectual</li>
                <li>Informar dados verdadeiros no cadastro</li>
              </ul>
            </section>

            {/* Limitação */}
            <section className="mt-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-3">7. Limitação de Responsabilidade</h2>
              <p>
                O Gravador Médico é um método educacional. Os resultados podem variar de acordo com a aplicação 
                e dedicação de cada profissional. Não garantimos resultados específicos ou aumento de produtividade.
              </p>
              <p className="mt-3">
                Não nos responsabilizamos por danos indiretos, incidentais ou consequenciais decorrentes do uso do método.
              </p>
            </section>

            {/* Propriedade Intelectual */}
            <section className="mt-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-3">8. Propriedade Intelectual</h2>
              <p>
                Todo o conteúdo, incluindo textos, vídeos, imagens, logos e métodos, são propriedade exclusiva 
                do Gravador Médico e protegidos por direitos autorais.
              </p>
            </section>

            {/* Modificações */}
            <section className="mt-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-3">9. Alterações nos Termos</h2>
              <p>
                Reservamos o direito de modificar estes termos a qualquer momento. Alterações significativas 
                serão comunicadas por e-mail. O uso continuado após alterações constitui aceitação dos novos termos.
              </p>
            </section>

            {/* Lei Aplicável */}
            <section className="mt-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-3">10. Lei Aplicável</h2>
              <p>
                Estes termos são regidos pelas leis brasileiras. Eventuais disputas serão resolvidas no foro 
                da comarca do Rio de Janeiro/RJ.
              </p>
            </section>

            {/* Contato */}
            <section className="mt-8 p-6 bg-brand-50 rounded-xl">
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Dúvidas sobre os Termos?</h2>
              <p className="mb-2">Entre em contato com nossa equipe:</p>
              <ul className="space-y-1">
                <li><strong>E-mail:</strong> <a href="mailto:suporte@gravadormedico.com.br" className="text-brand-600 hover:text-brand-700">suporte@gravadormedico.com.br</a></li>
                <li><strong>WhatsApp:</strong> <a href="https://wa.me/5521981470758" target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:text-brand-700">+55 21 98147-0758</a></li>
              </ul>
            </section>
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
