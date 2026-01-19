import { motion } from "framer-motion"
import { CheckCircle2, ArrowRight } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import ClientEffect from "./ClientEffect"

export default function SuccessPage({ params }: { params: { type: string } }) {
  const messages = {
    payment: {
      title: "Pagamento Aprovado!",
      description: "Seu acesso foi liberado com sucesso. Você já pode fazer login e começar a usar o Gravador Médico.",
      cta: "Acessar Dashboard",
      ctaLink: "/login"
    },
    default: {
      title: "Sucesso!",
      description: "Operação realizada com sucesso.",
      cta: "Voltar ao Início",
      ctaLink: "/"
    }
  }

  const content = messages[params.type as keyof typeof messages] || messages.default

  return (
    <>
      <ClientEffect />
      <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-brand-100 flex items-center justify-center p-4">
        {/* Animated background */}
        <div className="fixed inset-0 bg-[linear-gradient(rgba(16,185,129,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative w-full max-w-md text-center"
        >
          {/* Logo */}
          <Link href="/" className="inline-block mb-8">
            <Image
              src="/images/LOGO GRAVADOR MEDICO - 180X50.png"
              alt="GravadorMédico"
              width={180}
              height={50}
              className="h-12 w-auto mx-auto"
              priority
            />
          </Link>

          {/* Success Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100"
          >
            {/* Success Icon */}
            <div className="mb-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 260,
                  damping: 20,
                  delay: 0.2
                }}
                className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mx-auto"
              >
                <CheckCircle2 className="w-8 h-8 text-brand-600" />
              </motion.div>
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              {content.title}
            </h1>

            {/* Description */}
            <p className="text-gray-600 mb-8">
              {content.description}
            </p>

            {/* CTA Button */}
            <Link
              href={content.ctaLink}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 text-white px-6 py-3 rounded-lg font-semibold shadow-lg shadow-brand-500/30 hover:shadow-brand-500/50 transition-all"
            >
              {content.cta}
              <motion.span
                animate={{ x: [0, 4, 0] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                <ArrowRight className="w-5 h-5" />
              </motion.span>
            </Link>
          </motion.div>

          {/* Support Link */}
          <p className="mt-6 text-sm text-gray-600">
            Precisa de ajuda?{" "}
            <a
              href="https://wa.me/5521981470758"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-600 hover:text-brand-700 font-semibold"
            >
              Entre em contato
            </a>
          </p>
        </motion.div>
      </div>
    </>
  )
}
