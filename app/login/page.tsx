"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { LogIn, Mail, Lock, AlertCircle, Loader2, Shield, ShieldCheck } from "lucide-react"
import { supabase } from "@/lib/supabase"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      // Login com Supabase Auth
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) throw authError

      // Pegar o redirect da URL ou ir para dashboard
      const redirect = searchParams.get('redirect') || '/admin/dashboard'
      router.push(redirect)
    } catch (err: any) {
      console.error('Erro ao fazer login:', err)
      setError(err.message || 'Email ou senha incorretos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
      
      {/* Gradient Orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md z-10"
      >
        {/* Header com Badge Admin */}
        <div className="text-center mb-8">
          {/* Badge Admin */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-brand-500/20 to-purple-500/20 backdrop-blur-sm border border-brand-500/30 rounded-full px-6 py-2 mb-6"
          >
            <ShieldCheck className="w-5 h-5 text-brand-400" />
            <span className="text-brand-300 font-semibold text-sm">Área Administrativa</span>
          </motion.div>

          <h1 className="text-4xl font-black text-white mb-2">
            Painel Admin
          </h1>
          <p className="text-gray-400">
            Acesso restrito a administradores
          </p>
        </div>

        {/* Card de Login Dark */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-gray-800/50 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-gray-700/50"
        >
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-200 mb-2">
                Email de Administrador
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-11 pr-4 py-3 bg-gray-900/50 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all placeholder:text-gray-500"
                  placeholder="admin@gravadormedico.com"
                />
              </div>
            </div>

            {/* Senha */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-200 mb-2">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-11 pr-4 py-3 bg-gray-900/50 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all placeholder:text-gray-500"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Erro */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-900/30 border border-red-500/50 rounded-lg p-4 flex items-start gap-3"
              >
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-200">{error}</p>
              </motion.div>
            )}

            {/* Botão de Login */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 text-white py-3.5 rounded-lg font-bold shadow-lg shadow-brand-500/30 hover:shadow-brand-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Autenticando...
                </>
              ) : (
                <>
                  <Shield className="w-5 h-5" />
                  Acessar Dashboard
                </>
              )}
            </button>
          </form>

          {/* Informação de Segurança */}
          <div className="mt-6 p-4 bg-gray-900/50 border border-gray-700 rounded-lg">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  <span className="font-semibold text-gray-300">Acesso Restrito:</span> Esta área é exclusiva para administradores autorizados. 
                  Todas as ações são monitoradas e registradas.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-gray-500">
          Problemas de acesso?{" "}
          <a
            href="mailto:suporte@gravadormedico.com.br"
            className="text-brand-400 hover:text-brand-300 font-semibold transition-colors"
          >
            Entre em contato com o suporte
          </a>
        </p>
      </motion.div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
