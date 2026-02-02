'use client';

/**
 * Página de Configurações Meta - IA Performance
 * 
 * Rota: /admin/ai/settings
 * 
 * Permite configurar:
 * - Conta de Anúncio padrão
 * - Página do Facebook
 * - Pixel de conversão
 * - Conta do Instagram
 */

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Settings, 
  ArrowLeft, 
  Shield,
  Zap,
  Info
} from 'lucide-react';
import Link from 'next/link';
import MetaAssetSelector from '@/components/ads/MetaAssetSelector';

export default function MetaSettingsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link 
            href="/admin/ai"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para IA Performance
          </Link>
          
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600">
              <Settings className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">
                Configurações Meta Ads
              </h1>
              <p className="text-gray-400 mt-1">
                Configure quais ativos a IA deve usar para criar e gerenciar campanhas
              </p>
            </div>
          </div>
        </motion.div>

        {/* Info Box */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-start gap-3"
        >
          <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="text-blue-300 font-medium mb-1">Por que configurar?</p>
            <p className="text-blue-200/70">
              Se você tem múltiplas contas de anúncio ou páginas na sua Business Manager, 
              é essencial definir qual delas a IA deve usar. Isso garante que as campanhas 
              sejam criadas no lugar certo e com as permissões corretas.
            </p>
          </div>
        </motion.div>

        {/* Main Selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <MetaAssetSelector />
        </motion.div>

        {/* Security Notice */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8 flex items-center gap-4 p-4 bg-gray-900/50 rounded-xl border border-gray-800"
        >
          <Shield className="w-10 h-10 text-green-400 flex-shrink-0" />
          <div>
            <h3 className="text-white font-medium">Segurança</h3>
            <p className="text-gray-400 text-sm">
              Suas configurações são salvas de forma segura e associadas à sua conta. 
              As credenciais de acesso à Meta API são armazenadas apenas no servidor.
            </p>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <Link
            href="/admin/ai/escala-automatica"
            className="p-4 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded-xl transition-colors group"
          >
            <div className="flex items-center gap-3">
              <Zap className="w-6 h-6 text-yellow-400 group-hover:scale-110 transition-transform" />
              <div>
                <h3 className="text-white font-medium">Criar Campanha</h3>
                <p className="text-gray-400 text-sm">Ir para o lançador de anúncios</p>
              </div>
            </div>
          </Link>

          <a
            href="https://business.facebook.com/settings"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded-xl transition-colors group"
          >
            <div className="flex items-center gap-3">
              <Settings className="w-6 h-6 text-blue-400 group-hover:scale-110 transition-transform" />
              <div>
                <h3 className="text-white font-medium">Meta Business Suite</h3>
                <p className="text-gray-400 text-sm">Gerenciar permissões e ativos</p>
              </div>
            </div>
          </a>
        </motion.div>
      </div>
    </div>
  );
}
